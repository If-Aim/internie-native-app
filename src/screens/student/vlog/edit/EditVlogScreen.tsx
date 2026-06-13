import React from "react";
import { ActivityIndicator, Alert, Animated, Easing, Image, PanResponder, PermissionsAndroid, PixelRatio, Platform, Pressable, TextInput, View, useWindowDimensions } from "react-native";
import Video, { type VideoRef } from "react-native-video";
import LinearGradient from "react-native-linear-gradient";
import { createThumbnail } from "react-native-create-thumbnail";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from "react-native-draggable-flatlist";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { launchImageLibrary, type Asset } from "react-native-image-picker";
import RNFS from "react-native-fs";
import { CameraRoll } from "@react-native-camera-roll/camera-roll";

import AppText from "../../../../../AppText";
import { uploadFileToPresignedUrl } from "../../../../api/client";
import { addVlogExtraClip, completeVlogExport, createVlogUploadUrl, excludeVlogEditClip, getVlogClipPlayUrl, getVlogEditing, updateVlogEditClip, waitVlogFinalVideoDone, type VlogClipCompleteInput, type VlogClipResponse, } from "../../../../api/vlog";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./EditVlogScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EditVlog">;

function BackIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M14 17L9 12L14 7" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function PlayIcon(): React.ReactElement {
    return (
        <View style={styles.playIconShadow}>
            <Svg width={72} height={72} viewBox="0 0 72 72" fill="none">
                <Circle cx={36} cy={36} r={32} fill="#BDD8FF" />
                <Path d="M31 25.5V46.5L48 36L31 25.5Z" fill="#FFFFFF" />
            </Svg>
        </View>
    );
}

function DragHandleIcon(): React.ReactElement {
    return (
        <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
            <Circle cx={5.25} cy={3} r={1.3} fill="#D9D9D9" />
            <Circle cx={9.75} cy={3} r={1.3} fill="#D9D9D9" />
            <Circle cx={5.25} cy={7.5} r={1.3} fill="#D9D9D9" />
            <Circle cx={9.75} cy={7.5} r={1.3} fill="#D9D9D9" />
            <Circle cx={5.25} cy={12} r={1.3} fill="#D9D9D9" />
            <Circle cx={9.75} cy={12} r={1.3} fill="#D9D9D9" />
        </Svg>
    );
}

function ExportSavingDots(): React.ReactElement {
    const dotAnimations = React.useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
    const gradientAnimations = React.useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

    React.useEffect(() => {
        const cycleMs = 900;
        const activeMs = 540;
        const delays = [0, 120, 240];

        const animations = dotAnimations.map((dotValue, index) => {
            const gradientValue = gradientAnimations[index];
            const delayMs = delays[index];
            const tailDelayMs = Math.max(0, cycleMs - delayMs - activeMs);

            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delayMs),
                    Animated.parallel([
                        Animated.sequence([
                            Animated.timing(dotValue, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                            Animated.timing(dotValue, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                        ]),
                        Animated.sequence([
                            Animated.timing(gradientValue, { toValue: 1, duration: activeMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                            Animated.timing(gradientValue, { toValue: 0, duration: 1, useNativeDriver: true }),
                        ]),
                    ]),
                    Animated.delay(tailDelayMs),
                ])
            );
        });

        animations.forEach((animation) => animation.start());

        return () => {
            animations.forEach((animation) => animation.stop());
        };
    }, [dotAnimations, gradientAnimations]);

    return (
        <View style={styles.exportDotRow} accessibilityRole="progressbar">
            {dotAnimations.map((dotValue, index) => {
                const gradientValue = gradientAnimations[index];
                const dotStyle = { transform: [{ translateY: dotValue.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }, { scale: dotValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] };
                const gradientStyle = { transform: [{ translateX: gradientValue.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] };

                return (
                    <Animated.View key={`export-dot-${index}`} style={[styles.exportDot, dotStyle]}>
                        <Animated.View style={[styles.exportDotGradient, gradientStyle]}>
                            <LinearGradient colors={["#BDD8FF", "#0166FF", "#BDD8FF"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.exportDotGradientFill} />
                        </Animated.View>
                    </Animated.View>
                );
            })}
        </View>
    );
}

function formatDuration(seconds?: number | null): string {
    const safeSeconds = Number.isFinite(seconds ?? NaN) ? Math.max(0, seconds ?? 0) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
}

function getActualClipDurationText(clip: VlogClipResponse): string {
    return formatDuration(Math.floor(Math.max(0, clip.durationSeconds ?? 0)));
}

function getRecordWeeksText(subText: string): string {
    const matched = subText.match(/\d+/);
    const week = matched?.[0] ?? "8";

    return `${week}주 간의 기록이에요`;
}

function getClipTitle(clip: VlogClipResponse): string {
    return clip.customTitle ?? clip.displayTitle ?? clip.originalTitle ?? "브이로그 클립";
}

function getWeekText(clip: VlogClipResponse): string {
    if (clip.type === "EXTRA") return "추가 영상";
    if (clip.type === "FREE_RECORD") return "자율 촬영";
    if (clip.week) return `${clip.week}주차`;

    return "";
}

function toVideoAssetInput(asset: Asset): Omit<VlogClipCompleteInput, "fileKey"> | null {
    if (!asset.uri) return null;

    return {
        originalName: asset.fileName ?? `extra_${Date.now()}.mp4`,
        contentType: asset.type ?? "video/mp4",
        sizeBytes: asset.fileSize ?? null,
        durationSeconds: Math.ceil(asset.duration ?? 0),
        thumbnailKey: null,
        customTitle: asset.fileName?.replace(/\.[^/.]+$/, "") ?? "추가 영상",
    };
}

function sanitizeFileName(fileName: string): string {
    return fileName.replace(/[\\/:*?"<>|]/g, "_");
}

function toLocalUri(path: string): string {
    if (path.startsWith("file://") || path.startsWith("content://") || path.startsWith("ph://") || path.startsWith("assets-library://")) {
        return path;
    }

    return `file://${path}`;
}

function getHighQualityThumbnailSize(width: number, height: number): { maxWidth: number; maxHeight: number } {
    const pixelRatio = PixelRatio.get();
    const rawWidth = Math.ceil(width * pixelRatio);
    const rawHeight = Math.ceil(height * pixelRatio);
    const longSide = Math.max(rawWidth, rawHeight);
    const scale = longSide > 2560 ? 2560 / longSide : 1;

    return {
        maxWidth: Math.ceil(rawWidth * scale),
        maxHeight: Math.ceil(rawHeight * scale),
    };
}

async function createExtraClipThumbnail(videoUri: string, width: number, height: number): Promise<string | null> {
    const { maxWidth, maxHeight } = getHighQualityThumbnailSize(width, height);

    try {
        const thumbnail = await createThumbnail({
            url: videoUri,
            timeStamp: 300,
            maxWidth,
            maxHeight,
            format: "png",
            cacheName: `extra_thumbnail_${Date.now()}`,
        });

        return toLocalUri(thumbnail.path);
    } catch (error) {
        console.error("[EDIT_VLOG] create extra thumbnail error:", error);
        return null;
    }
}

async function requestSaveVideoPermission(): Promise<boolean> {
    if (Platform.OS !== "android") {
        return true;
    }

    const androidVersion = typeof Platform.Version === "number" ? Platform.Version : Number(Platform.Version);

    if (androidVersion >= 33) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (androidVersion >= 29) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// 만약 위에서 READ_MEDIA_VIDEO 타입 오류가 나면 RN 타입 버전이 낮은 경우임. 그때는 아래처럼 문자열로 처리
// async function requestSaveVideoPermission(): Promise<boolean> {
//     if (Platform.OS !== "android") {
//         return true;
//     }

//     const androidVersion = typeof Platform.Version === "number" ? Platform.Version : Number(Platform.Version);

//     if (androidVersion >= 33) {
//         const granted = await PermissionsAndroid.request("android.permission.READ_MEDIA_VIDEO" as never);
//         return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }

//     if (androidVersion >= 29) {
//         const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
//         return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }

//     const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
//     return granted === PermissionsAndroid.RESULTS.GRANTED;
// }

async function saveVideoUrlToDevice(downloadUrl: string, fileName: string): Promise<void> {
    const hasPermission = await requestSaveVideoPermission();

    if (!hasPermission) {
        throw new Error("영상 저장 권한이 필요합니다.");
    }

    const safeFileName = sanitizeFileName(fileName.endsWith(".mp4") ? fileName : `${fileName}.mp4`);
    const localPath = `${RNFS.CachesDirectoryPath}/${safeFileName}`;

    const result = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: localPath,
    }).promise;

    if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error(`영상 다운로드 실패: ${result.statusCode}`);
    }

    await CameraRoll.save(`file://${localPath}`, {
        type: "video",
    });
}

function Header({
    onBackClick,
}: {
    onBackClick: () => void;
}): React.ReactElement {

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onBackClick} accessibilityLabel="뒤로가기">
                <BackIcon />
            </Pressable>
            <View style={commonStyles.iconbtn} />
        </View>
    );
}

export default function EditVlogScreen({ navigation, route }: Props): React.ReactElement {
    const { width, height } = useWindowDimensions();
    const projectId = route.params.projectId;
    const [title, setTitle] = React.useState(route.params?.title ?? "인턴십 브이로그");
    const [subText, setSubText] = React.useState(route.params?.subText ?? "");
    const [clips, setClips] = React.useState<VlogClipResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [exporting, setExporting] = React.useState(false);

    const previewVideoRef = React.useRef<VideoRef>(null);
    const pendingSeekSecondsRef = React.useRef<number | null>(null);
    const progressOpacity = React.useRef(new Animated.Value(1)).current;
    const [previewProgressWidth, setPreviewProgressWidth] = React.useState(0);
    const [previewClipIndex, setPreviewClipIndex] = React.useState(0);
    const [previewVideoUrl, setPreviewVideoUrl] = React.useState<string | null>(null);
    const [previewPlaying, setPreviewPlaying] = React.useState(false);
    const [previewCurrentSeconds, setPreviewCurrentSeconds] = React.useState(0);
    const [previewDurationSeconds, setPreviewDurationSeconds] = React.useState(0);
    const [addingClip, setAddingClip] = React.useState(false);
    const [editingClipId, setEditingClipId] = React.useState<number | null>(null);
    const [editingTitle, setEditingTitle] = React.useState("");

    const [exportStep, setExportStep] = React.useState<"IDLE" | "LOADING" | "DONE">("IDLE");
    
    React.useEffect(() => {
        Animated.timing(progressOpacity, { toValue: previewPlaying ? 0 : 1, duration: previewPlaying ? 700 : 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, [previewPlaying, progressOpacity]);

    React.useEffect(() => {
        void loadEditing();
    }, [projectId]);

    function handlePressBack(): void {
        Alert.alert(
            "편집을 종료할까요?",
            "영상 순서 변경, 클립 추가 등 편집 진행상태가 저장되지 않을 수 있습니다. 이전 화면으로 이동하시겠습니까?",
            [
                { text: "계속 편집하기", style: "cancel" },
                { text: "이전으로", style: "destructive", onPress: () => navigation.goBack() },
            ]
        );
    }

    async function loadEditing(): Promise<void> {
        try {
            setLoading(true);

            const response = await getVlogEditing(projectId);

            setTitle(response.title ?? title);
            setSubText(response.lastWeek ? `${response.lastWeek}주차` : subText);
            setClips(response.clips ?? []);
        } catch (error) {
            console.error("[EDIT_VLOG] load error:", error);
            Alert.alert("불러오기 실패", "편집 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }

    function getVisibleClips(): VlogClipResponse[] {
        return clips.filter((clip) => clip.includedInFinal !== false);
    }

    function getPreviewElapsedSeconds(visibleClips: VlogClipResponse[]): number {
        const previousSeconds = visibleClips.slice(0, previewClipIndex).reduce((sum, clip) => sum + Math.max(0, clip.durationSeconds ?? 0), 0);
        return previousSeconds + Math.max(0, previewCurrentSeconds);
    }

    async function loadPreviewClipAt(index: number, seekSeconds: number, shouldPlay: boolean): Promise<void> {
        const visibleClips = getVisibleClips();
        const clip = visibleClips[index];

        if (!clip?.clipId) {
            return;
        }

        const safeSeekSeconds = Math.max(0, seekSeconds);

        setPreviewClipIndex(index);
        setPreviewCurrentSeconds(safeSeekSeconds);
        setPreviewDurationSeconds(clip.durationSeconds ?? 0);

        if (previewClipIndex === index && previewVideoUrl) {
            previewVideoRef.current?.seek(safeSeekSeconds);
            setPreviewPlaying(shouldPlay);
            return;
        }

        pendingSeekSecondsRef.current = safeSeekSeconds;

        const response = await getVlogClipPlayUrl(projectId, clip.clipId);

        if (!response.url) {
            throw new Error("영상 재생 URL을 불러오지 못했습니다.");
        }

        setPreviewVideoUrl(response.url);
        setPreviewPlaying(shouldPlay);
    }

    async function handlePressPreview(): Promise<void> {
        const visibleClips = getVisibleClips();
        const clip = visibleClips[previewClipIndex];

        if (!clip?.clipId) {
            Alert.alert("재생할 영상이 없습니다.", "편집에 포함된 클립이 없습니다.");
            return;
        }

        if (previewVideoUrl) {
            setPreviewPlaying((prev) => !prev);
            return;
        }

        try {
            await loadPreviewClipAt(previewClipIndex, previewCurrentSeconds, true);
        } catch (error) {
            console.error("[EDIT_VLOG] play url error:", error);
            Alert.alert("재생 실패", "영상 재생 URL을 불러오지 못했습니다.");
        }
    }

    function handlePreviewEnd(): void {
        const visibleClips = getVisibleClips();
        const nextIndex = previewClipIndex + 1;

        if (nextIndex >= visibleClips.length) {
            setPreviewPlaying(false);
            setPreviewCurrentSeconds(0);
            previewVideoRef.current?.seek(0);
            return;
        }

        loadPreviewClipAt(nextIndex, 0, true).catch((error) => {
            console.error("[EDIT_VLOG] next clip play error:", error);
            setPreviewPlaying(false);
        });
    }

    function getPreviewSeekTarget(locationX: number): { clipIndex: number; clipSeconds: number } | null {
        const visibleClips = getVisibleClips();
        const totalDuration = visibleClips.reduce((sum, clip) => sum + Math.max(0, clip.durationSeconds ?? 0), 0);

        if (previewProgressWidth <= 0 || totalDuration <= 0 || visibleClips.length === 0) {
            return null;
        }

        const ratio = Math.min(1, Math.max(0, locationX / previewProgressWidth));
        const targetSeconds = totalDuration * ratio;
        let accumulatedSeconds = 0;

        for (let index = 0; index < visibleClips.length; index += 1) {
            const clipDuration = Math.max(0, visibleClips[index].durationSeconds ?? 0);
            const isLast = index === visibleClips.length - 1;

            if (targetSeconds <= accumulatedSeconds + clipDuration || isLast) {
                return { clipIndex: index, clipSeconds: Math.min(clipDuration, Math.max(0, targetSeconds - accumulatedSeconds)) };
            }

            accumulatedSeconds += clipDuration;
        }

        return null;
    }

    function previewSeekByLocationX(locationX: number): void {
        const target = getPreviewSeekTarget(locationX);
        const visibleClips = getVisibleClips();

        if (!target) {
            return;
        }

        setPreviewClipIndex(target.clipIndex);
        setPreviewCurrentSeconds(target.clipSeconds);
        setPreviewDurationSeconds(visibleClips[target.clipIndex]?.durationSeconds ?? 0);
    }

    function commitPreviewSeekByLocationX(locationX: number): void {
        const target = getPreviewSeekTarget(locationX);

        if (!target) {
            return;
        }

        loadPreviewClipAt(target.clipIndex, target.clipSeconds, previewPlaying).catch((error) => {
            console.error("[EDIT_VLOG] seek preview error:", error);
            Alert.alert("이동 실패", "해당 구간으로 이동하지 못했습니다.");
        });
    }

    const previewProgressPanResponder = React.useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => previewSeekByLocationX(event.nativeEvent.locationX),
        onPanResponderMove: (event) => previewSeekByLocationX(event.nativeEvent.locationX),
        onPanResponderRelease: (event) => commitPreviewSeekByLocationX(event.nativeEvent.locationX),
        onPanResponderTerminate: (event) => commitPreviewSeekByLocationX(event.nativeEvent.locationX),
    }), [clips, previewProgressWidth, previewPlaying, previewClipIndex, previewVideoUrl]);

    function renderPreviewProgressBars(visibleClips: VlogClipResponse[]): React.ReactElement {
        return (
            <Animated.View
                {...previewProgressPanResponder.panHandlers}
                pointerEvents={previewPlaying ? "none" : "auto"}
                style={[styles.previewProgressRow, { opacity: progressOpacity }]}
                onLayout={(event) => setPreviewProgressWidth(event.nativeEvent.layout.width)}
            >
                {visibleClips.slice(0, 6).map((clip, index) => {
                    const isActive = index === previewClipIndex;
                    const clipDuration = Math.max(0, isActive ? (previewDurationSeconds || clip.durationSeconds || 0) : (clip.durationSeconds || 0));
                    const progress = isActive && clipDuration > 0 ? Math.min(1, previewCurrentSeconds / clipDuration) : index < previewClipIndex ? 1 : 0;

                    return (
                        <View key={`${clip.clipId}-${index}`} style={styles.previewProgressTrack}>
                            <View style={[styles.previewProgressFill, { width: `${progress * 100}%` }]} />
                        </View>
                    );
                })}
            </Animated.View>
        );
    }

    function renderPreviewHeader(): React.ReactElement {
        const visibleClips = clips.filter((clip) => clip.includedInFinal !== false);
        const currentClip = visibleClips[previewClipIndex];
        const totalDurationText = formatDuration(visibleClips.reduce((sum, clip) => sum + (clip.durationSeconds ?? 0), 0));
        const currentTotalSeconds = getPreviewElapsedSeconds(visibleClips);

        return (
            <>
                <View style={styles.titleWrap}>
                    <AppText style={styles.subText}>{subText}</AppText>
                    <AppText style={styles.title}>{title}</AppText>
                </View>

                <View style={styles.previewCard}>
                    {!previewVideoUrl && currentClip?.thumbnailUrl ? (
                        <Image source={{ uri: currentClip.thumbnailUrl }} style={styles.previewThumbnailImage} resizeMode="cover" />
                    ) : null}

                    {previewVideoUrl ? (
                        <Video
                            ref={previewVideoRef}
                            source={{ uri: previewVideoUrl }}
                            style={styles.previewVideo}
                            paused={!previewPlaying}
                            resizeMode="cover"
                            maxBitRate={0}
                            muted={false}
                            repeat={false}
                            progressUpdateInterval={250}
                            onProgress={(data) => setPreviewCurrentSeconds(data.currentTime)}
                            onLoad={(data) => {
                                setPreviewDurationSeconds(data.duration);

                                if (pendingSeekSecondsRef.current != null) {
                                    previewVideoRef.current?.seek(pendingSeekSecondsRef.current);
                                    pendingSeekSecondsRef.current = null;
                                }
                            }}
                            onEnd={handlePreviewEnd}
                        />
                    ) : null}

                    <Pressable style={styles.previewPressLayer} onPress={handlePressPreview} />

                    {renderPreviewProgressBars(visibleClips)}

                    {previewPlaying ? (
                        <View style={styles.previewCenter} pointerEvents="none">
                            <AppText style={styles.previewWeek}>{currentClip ? getWeekText(currentClip) : "브이로그"}</AppText>
                            <AppText style={styles.previewTitle}>{currentClip ? getClipTitle(currentClip) : "클립 없음"}</AppText>
                        </View>
                    ) : (
                        <View style={styles.previewPlayOnlyCenter} pointerEvents="none">
                            <PlayIcon />
                        </View>
                    )}

                    {!previewPlaying ? (
                        <View style={styles.previewTimeRow} pointerEvents="none">
                            <AppText style={styles.previewTime}>{formatDuration(Math.floor(currentTotalSeconds))}</AppText>
                            <AppText style={styles.previewTime}>{totalDurationText}</AppText>
                        </View>
                    ) : null}
                </View>
            </>
        );
    }

    async function handleExcludeClip(clip: VlogClipResponse): Promise<void> {
        if (!clip.clipId) return;

        try {
            await excludeVlogEditClip(projectId, clip.clipId);
            setClips((prev) => prev.filter((item) => item.clipId !== clip.clipId));
        } catch (error) {
            console.error("[EDIT_VLOG] exclude clip error:", error);
            Alert.alert("삭제 실패", "클립을 편집 목록에서 제외하지 못했습니다.");
        }
    }

    async function handleDragEnd(data: VlogClipResponse[]): Promise<void> {
        setClips(data);

        try {
            await Promise.all(data.map((clip, index) => {
                if (!clip.clipId) return Promise.resolve();

                return updateVlogEditClip(projectId, clip.clipId, {
                    displayOrder: index + 1,
                });
            }));
        } catch (error) {
            console.error("[EDIT_VLOG] reorder error:", error);
            Alert.alert("정렬 저장 실패", "클립 순서를 저장하지 못했습니다.");
            await loadEditing();
        }
    }

    async function handleToggleClip(clip: VlogClipResponse): Promise<void> {
        if (clip.clipId == null) return;

        try {
            const updated = await updateVlogEditClip(projectId, clip.clipId, {
                includedInFinal: !(clip.includedInFinal === true),
            });

            setClips((prev) => prev.map((item) => item.clipId === clip.clipId ? updated : item));
        } catch (error) {
            Alert.alert("수정 실패", "클립 포함 여부를 변경하지 못했습니다.");
        }
    }

    function startInlineTitleEdit(clip: VlogClipResponse): void {
        if (!clip.clipId) return;

        setEditingClipId(clip.clipId);
        setEditingTitle(getClipTitle(clip));
    }

    function cancelInlineTitleEdit(): void {
        setEditingClipId(null);
        setEditingTitle("");
    }

    async function submitInlineTitleEdit(clip: VlogClipResponse): Promise<void> {
        if (!clip.clipId) return;

        const trimmedTitle = editingTitle.trim();

        if (!trimmedTitle) {
            cancelInlineTitleEdit();
            return;
        }

        try {
            const updated = await updateVlogEditClip(projectId, clip.clipId, {
                customTitle: trimmedTitle,
            });

            setClips((prev) => prev.map((item) => item.clipId === clip.clipId ? updated : item));
        } catch (error) {
            console.error("[EDIT_VLOG] title edit error:", error);
            Alert.alert("수정 실패", "클립 제목을 수정하지 못했습니다.");
        } finally {
            cancelInlineTitleEdit();
        }
    }

    async function handlePressExport(): Promise<void> {
        if (exporting) return;

        try {
            setExporting(true);
            setExportStep("LOADING");

            const response = await completeVlogExport(projectId, {
                portfolioShared: false,
            });

            const finalVideoId = response.finalVideoId;

            if (!finalVideoId) {
                throw new Error("최종 영상 ID를 받지 못했습니다.");
            }

            const downloadResponse = await waitVlogFinalVideoDone(projectId, finalVideoId, {
                intervalMs: 3000,
                maxTryCount: 60,
            });

            if (!downloadResponse.url) {
                throw new Error("최종 영상 다운로드 URL을 받지 못했습니다.");
            }

            await saveVideoUrlToDevice(
                downloadResponse.url,
                downloadResponse.fileName ?? response.finalVideoTitle ?? `${title} 브이로그.mp4`
            );

            setExportStep("DONE");
        } catch (error) {
            console.error("[EDIT_VLOG] export error:", error);
            setExportStep("IDLE");
            Alert.alert(
                "내보내기 실패",
                error instanceof Error ? error.message : "브이로그를 내보내지 못했습니다."
            );
        } finally {
            setExporting(false);
        }
    }

    async function handlePressAddClip(): Promise<void> {
        if (addingClip) return;

        try {
            setAddingClip(true);

            const result = await launchImageLibrary({
                mediaType: "video",
                selectionLimit: 1,
                includeExtra: false,
            });

            const asset = result.assets?.[0];

            if (!asset?.uri) {
                return;
            }

            const inputBase = toVideoAssetInput(asset);

            if (!inputBase || !inputBase.contentType?.startsWith("video/")) {
                Alert.alert("파일 오류", "영상 파일만 추가할 수 있습니다.");
                return;
            }

            const upload = await createVlogUploadUrl({
                projectId,
                fileName: inputBase.originalName,
                contentType: inputBase.contentType,
                type: "VIDEO",
            });

            if (!upload.uploadUrl || !upload.fileKey) {
                Alert.alert("업로드 실패", "영상 업로드 URL을 발급받지 못했습니다.");
                return;
            }

            await uploadFileToPresignedUrl(upload.uploadUrl, asset.uri, inputBase.contentType);

            const thumbnailUri = await createExtraClipThumbnail(asset.uri, asset.width ?? width, asset.height ?? height);
            let thumbnailKey: string | null = null;

            if (thumbnailUri) {
                const thumbnailFileName = `extra_thumbnail_${Date.now()}.png`;
                const thumbnailUpload = await createVlogUploadUrl({
                    projectId,
                    fileName: thumbnailFileName,
                    contentType: "image/png",
                    type: "THUMBNAIL",
                });

                if (thumbnailUpload.uploadUrl && thumbnailUpload.fileKey) {
                    await uploadFileToPresignedUrl(thumbnailUpload.uploadUrl, thumbnailUri, "image/png");
                    thumbnailKey = thumbnailUpload.fileKey;
                }
            }

            const created = await addVlogExtraClip(projectId, {
                ...inputBase,
                fileKey: upload.fileKey,
                thumbnailKey,
            });

            setClips((prev) => [...prev, created]);
        } catch (error) {
            console.error("[EDIT_VLOG] add clip error:", error);
            Alert.alert("추가 실패", "영상을 추가하지 못했습니다.");
        } finally {
            setAddingClip(false);
        }
    }

    function renderClipItem({ item, drag, isActive }: RenderItemParams<VlogClipResponse>): React.ReactElement {
        return (
            <ScaleDecorator>
                <ReanimatedSwipeable renderRightActions={() => renderRightActions(item)}>
                    <View style={[styles.clipCard, isActive ? styles.clipCardDragging : null]}>
                        <View style={styles.clipThumb}>
                            {item.thumbnailUrl ? (
                                <Image source={{ uri: item.thumbnailUrl }} style={styles.clipThumbImage} resizeMode="cover" />
                            ) : null}
                        </View>

                        <View style={styles.clipTextWrap}>
                            {editingClipId === item.clipId ? (
                                <TextInput
                                    style={styles.clipTitleInput}
                                    value={editingTitle}
                                    onChangeText={setEditingTitle}
                                    autoFocus
                                    maxLength={50}
                                    returnKeyType="done"
                                    onSubmitEditing={() => {
                                        submitInlineTitleEdit(item).catch(console.error);
                                    }}
                                    onBlur={() => {
                                        submitInlineTitleEdit(item).catch(console.error);
                                    }}
                                />
                            ) : (
                                <Pressable onPress={() => startInlineTitleEdit(item)}>
                                    <AppText style={styles.clipTitle} numberOfLines={1}>{getClipTitle(item)}</AppText>
                                </Pressable>
                            )}

                            <AppText style={styles.clipWeek}>{getWeekText(item)}</AppText>
                        </View>

                        <AppText style={styles.clipDuration}>{getActualClipDurationText(item)}</AppText>

                        <Pressable style={styles.dragHandle} onLongPress={drag} delayLongPress={120}>
                            <DragHandleIcon />
                        </Pressable>
                    </View>
                </ReanimatedSwipeable>
            </ScaleDecorator>
        );
    }

    function renderRightActions(clip: VlogClipResponse): React.ReactElement {
        return (
            <Pressable style={styles.deleteActionButton} onPress={() => { handleExcludeClip(clip).catch(console.error); }}>
                <AppText style={styles.deleteActionText}>삭제</AppText>
            </Pressable>
        );
    }

    function renderExportOverlay(): React.ReactElement | null {
        if (exportStep === "IDLE") return null;

        if (exportStep === "LOADING") {
            return (
                <View style={styles.exportOverlay}>
                    <View style={styles.exportLoadingCenter}>
                        <ExportSavingDots />
                        <AppText style={styles.exportLoadingText}>브이로그 저장중</AppText>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.exportOverlay}>
                <View style={styles.exportDoneCenter}>
                    <Image source={require("../../../../assets/images/internie_mascot_normal.png")} style={styles.exportMascot} resizeMode="contain" />

                    <AppText style={styles.exportDoneTitle}>브이로그가{"\n"}저장되었어요</AppText>
                    <AppText style={styles.exportDoneSubText}>{title} {getRecordWeeksText(subText)}</AppText>
                </View>

                <View style={styles.exportDoneBottomBar}>
                    <Pressable
                        style={styles.exportDoneButton}
                        onPress={() => {
                            setExportStep("IDLE");
                            navigation.navigate("RecordVlog", {
                                projectId,
                                title,
                                subText,
                            });
                        }}
                    >
                        <AppText style={styles.exportDoneButtonText}>확인</AppText>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <Header onBackClick={() => navigation.goBack()} />
            <DraggableFlatList
                data={clips.filter((clip) => clip.includedInFinal !== false)}
                keyExtractor={(item, index) => String(item.clipId ?? `clip-${index}`)}
                renderItem={renderClipItem}
                onDragEnd={({ data }) => {
                    handleDragEnd(data).catch(console.error);
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                ListHeaderComponent={renderPreviewHeader()}
                ListEmptyComponent={() => (
                    <View style={styles.loadingWrap}>
                        {loading ? <ActivityIndicator /> : <AppText style={styles.emptyText}>편집할 클립이 없습니다.</AppText>}
                    </View>
                )}
                ListFooterComponent={() => (
                    <Pressable style={styles.addClipButton} onPress={() => { handlePressAddClip().catch(console.error); }} disabled={addingClip}>
                        <AppText style={styles.addClipText}>{addingClip ? "추가 중..." : "촬영 추가하기"}</AppText>
                    </Pressable>
                )}
            />

            <LinearGradient colors={["rgba(255, 255, 255, 0)", "#F0F6FF"]} locations={[0, 0.1469]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.bottomGradientBar}>
                <Pressable
                    style={[styles.exportButton, exporting ? styles.exportButtonDisabled : null]}
                    disabled={exporting}
                    onPress={() => {
                        handlePressExport().catch(console.error);
                    }}
                >
                    <AppText style={styles.exportButtonText}>{exporting ? "내보내는 중" : "내보내기"}</AppText>
                </Pressable>
            </LinearGradient>
            {renderExportOverlay()}
        </SafeAreaView>
    );
}