import React from "react";
import { ActivityIndicator, Alert, Animated, Easing, Image, Modal, PermissionsAndroid, PixelRatio, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import type { GestureResponderEvent } from "react-native";
import Video, { type VideoRef } from "react-native-video";
import LinearGradient from "react-native-linear-gradient";
import { createThumbnail } from "react-native-create-thumbnail";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from "react-native-draggable-flatlist";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { launchImageLibrary, type Asset } from "react-native-image-picker";
import RNFS from "react-native-fs";

import AppText from "../../../../../AppText";
import { uploadFileToPresignedUrl } from "../../../../api/client";
import { addVlogExtraClip, completeVlogExport, createVlogUploadUrl, excludeVlogEditClip, getVlogClipPlayUrl, getVlogEditing, includeVlogEditClip, updateVlogEditClip, waitVlogFinalVideoDone, type VlogClipCompleteInput, type VlogClipResponse, } from "../../../../api/vlog";
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
                <Path d="M46.9599 34.406C49.0096 35.5483 49.0171 36.9851 46.9599 38.2765L31.0644 48.9968C29.0672 50.0627 27.7107 49.4333 27.5683 47.127L27.5009 24.6897C27.4559 22.5653 29.2058 21.9651 30.8733 22.9837L46.9599 34.406Z" fill="#FFFFFF" />
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
    const wave = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        wave.setValue(0);

        const animation = Animated.loop(
            Animated.timing(wave, {
                toValue: 1,
                duration: 1350,
                easing: Easing.linear,
                useNativeDriver: false,
            })
        );

        animation.start();

        return () => {
            animation.stop();
            wave.stopAnimation();
        };
    }, [wave]);

    const inputRange = Array.from({ length: 17 }, (_, index) => index / 16);
    const phaseGap = 0.24;

    const createTranslateYRange = (dotIndex: number) => {
        const delayRatio = dotIndex * phaseGap;

        return inputRange.map((value) => {
            const shiftedValue = value - delayRatio;
            const waveValue = Math.sin(shiftedValue * Math.PI * 2);
            const normalizedValue = (waveValue + 1) / 2;

            return -26 * normalizedValue;
        });
    };

    const createColorRange = (dotIndex: number) => {
        const delayRatio = dotIndex * phaseGap;

        return inputRange.map((value) => {
            const shiftedValue = value - delayRatio;
            const waveValue = Math.sin(shiftedValue * Math.PI * 2);
            const normalizedValue = (waveValue + 1) / 2;

            if (normalizedValue >= 0.86) return "#0166FF";
            if (normalizedValue >= 0.55) return "#7EB5FF";

            return "#C7DFFF";
        });
    };

    const getDotAnimatedStyle = (dotIndex: number) => ({
        backgroundColor: wave.interpolate({
            inputRange,
            outputRange: createColorRange(dotIndex),
        }),
        transform: [
            {
                translateY: wave.interpolate({
                    inputRange,
                    outputRange: createTranslateYRange(dotIndex),
                }),
            },
            {
                scale: wave.interpolate({
                    inputRange,
                    outputRange: inputRange.map((value) => {
                        const shiftedValue = value - dotIndex * phaseGap;
                        const waveValue = Math.sin(shiftedValue * Math.PI * 2);
                        const normalizedValue = (waveValue + 1) / 2;

                        return 1 + normalizedValue * 0.16;
                    }),
                }),
            },
        ],
    });

    return (
        <View style={styles.exportDotRow} accessibilityRole="progressbar">
            <Animated.View style={[styles.exportDot, getDotAnimatedStyle(0)]} />
            <Animated.View style={[styles.exportDot, getDotAnimatedStyle(1)]} />
            <Animated.View style={[styles.exportDot, getDotAnimatedStyle(2)]} />
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
    const seconds = Math.floor(Math.max(0, clip.durationSeconds ?? 0));

    return `${seconds}초`;
}

function getRecordWeeksText(subText: string): string {
    const weeks = [...subText.matchAll(/(\d+)\s*주차/g)].map((match) => Number(match[1]));
    const week = weeks.length > 0 ? Math.max(...weeks) : 8;

    return `${week}주 간의 기록이에요`;
}

function getClipTitle(clip: VlogClipResponse): string {
    return clip.customTitle ?? clip.displayTitle ?? clip.originalTitle ?? "브이로그 클립";
}

function getWeekText(clip: VlogClipResponse): string {
    if (clip.type === "EXTRA") return "추가 영상";
    if (clip.type === "FREE_RECORD") return "자유 촬영";
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
    const [excludedClips, setExcludedClips] = React.useState<VlogClipResponse[]>([]);
    const [addClipModalOpen, setAddClipModalOpen] = React.useState(false);
    const [includingClipId, setIncludingClipId] = React.useState<number | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [exporting, setExporting] = React.useState(false);

    const previewVideoRef = React.useRef<VideoRef>(null);
    const pendingSeekSecondsRef = React.useRef<number | null>(null);
    const progressOpacity = React.useRef(new Animated.Value(1)).current;
    const [previewProgressWidth, setPreviewProgressWidth] = React.useState(0);
    const [previewVideoLoading, setPreviewVideoLoading] = React.useState(false);
    const [loadedPreviewClipId, setLoadedPreviewClipId] = React.useState<number | null>(null);
    const [previewSeeking, setPreviewSeeking] = React.useState(false);
    const [previewProgressDragging, setPreviewProgressDragging] = React.useState(false);
    const previewSeekingRef = React.useRef(false);
    const previewResumeAfterSeekRef = React.useRef(false);
    const previewLoadRequestIdRef = React.useRef(0);
    const previewProgressTouchRef = React.useRef<View>(null);
    const previewProgressPageXRef = React.useRef(0);
    const previewProgressWidthRef = React.useRef(0);
    const previewLastSeekLocationXRef = React.useRef(0);
    const previewSeekTargetRef = React.useRef<{ clipIndex: number; clipSeconds: number } | null>(null);
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
        const shouldShowProgress = !previewPlaying || previewSeeking || previewVideoLoading;

        Animated.timing(progressOpacity, {
            toValue: shouldShowProgress ? 1 : 0,
            duration: shouldShowProgress ? 180 : 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [previewPlaying, previewSeeking, previewVideoLoading, progressOpacity]);

    React.useEffect(() => {
        void loadEditing();
    }, [projectId]);

    async function loadEditing(): Promise<void> {
        try {
            setLoading(true);

            const response = await getVlogEditing(projectId);

            setTitle(response.title ?? title);
            setSubText(response.lastWeek ? `${response.lastWeek}주차` : subText);
            setClips(response.clips ?? []);
            setExcludedClips(response.excludedClips ?? []);
        } catch (error) {
            console.error("[EDIT_VLOG] load error:", error);
            Alert.alert("불러오기 실패", "편집 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }

    function sortClipsByDisplayOrder(items: VlogClipResponse[]): VlogClipResponse[] {
        return [...items].sort((a, b) => {
            const orderA = a.displayOrder ?? 999999;
            const orderB = b.displayOrder ?? 999999;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            return (a.clipId ?? 0) - (b.clipId ?? 0);
        });
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
        const isSameLoadedClip = loadedPreviewClipId === clip.clipId && !!previewVideoUrl;

        setPreviewClipIndex(index);
        setPreviewCurrentSeconds(safeSeekSeconds);
        setPreviewDurationSeconds(clip.durationSeconds ?? 0);

        if (isSameLoadedClip) {
            previewVideoRef.current?.seek(safeSeekSeconds);
            setPreviewPlaying(shouldPlay);
            return;
        }

        const requestId = previewLoadRequestIdRef.current + 1;

        previewLoadRequestIdRef.current = requestId;
        pendingSeekSecondsRef.current = safeSeekSeconds;
        setPreviewPlaying(false);
        setPreviewVideoLoading(true);
        setPreviewVideoUrl(null);
        setLoadedPreviewClipId(null);

        try {
            const response = await getVlogClipPlayUrl(projectId, clip.clipId);

            if (requestId !== previewLoadRequestIdRef.current) {
                return;
            }

            if (!response.url) {
                throw new Error("영상 재생 URL을 불러오지 못했습니다.");
            }

            setLoadedPreviewClipId(clip.clipId);
            setPreviewVideoUrl(response.url);
            setPreviewPlaying(shouldPlay);
        } finally {
            if (requestId === previewLoadRequestIdRef.current) {
                setPreviewVideoLoading(false);
            }
        }
    }

    async function handlePressPreview(): Promise<void> {
        if (previewVideoLoading) return;

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
        const measuredWidth = previewProgressWidthRef.current || previewProgressWidth;

        if (measuredWidth <= 0 || visibleClips.length === 0) {
            return null;
        }

        const segmentWidth = measuredWidth / visibleClips.length;
        const safeLocationX = Math.max(0, Math.min(locationX, measuredWidth));
        const clipIndex = safeLocationX >= measuredWidth ? visibleClips.length - 1 : Math.floor(safeLocationX / segmentWidth);
        const clip = visibleClips[clipIndex];
        const clipDuration = Math.max(0, clip?.durationSeconds ?? 0);
        const segmentStartX = segmentWidth * clipIndex;
        const segmentRatio = safeLocationX >= measuredWidth ? 1 : Math.max(0, Math.min(1, (safeLocationX - segmentStartX) / segmentWidth));

        return {
            clipIndex,
            clipSeconds: clipDuration * segmentRatio,
        };
    }

    function updatePreviewProgressMeasure(): void {
        requestAnimationFrame(() => {
            previewProgressTouchRef.current?.measureInWindow((x, _y, measuredWidth) => {
                previewProgressPageXRef.current = x;
                previewProgressWidthRef.current = measuredWidth;
                setPreviewProgressWidth(measuredWidth);
            });
        });
    }

    function getPreviewProgressLocationX(event: GestureResponderEvent): number {
        const measuredWidth = previewProgressWidthRef.current || previewProgressWidth;
        const locationX = event.nativeEvent.pageX - previewProgressPageXRef.current;
        const safeLocationX = Math.max(0, Math.min(locationX, measuredWidth));

        previewLastSeekLocationXRef.current = safeLocationX;

        return safeLocationX;
    }

    function handlePreviewSeekStart(event: GestureResponderEvent): void {
        updatePreviewProgressMeasure();

        previewSeekingRef.current = true;
        previewResumeAfterSeekRef.current = previewPlaying;
        previewSeekTargetRef.current = null;

        setPreviewSeeking(true);
        setPreviewProgressDragging(true);
        setPreviewPlaying(false);
        previewSeekByLocationX(getPreviewProgressLocationX(event));
    }

    function handlePreviewSeekEnd(): void {
        setPreviewProgressDragging(false);
        commitPreviewSeekByLocationX();
    }

    function finishPreviewSeek(): void {
        previewSeekingRef.current = false;
        previewSeekTargetRef.current = null;
        setPreviewSeeking(false);
        setPreviewProgressDragging(false);
    }

    function handlePreviewSeekMove(event: GestureResponderEvent): void {
        if (!previewSeekingRef.current) {
            return;
        }

        previewSeekByLocationX(getPreviewProgressLocationX(event));
    }

    function previewSeekByLocationX(locationX: number): void {
        const target = getPreviewSeekTarget(locationX);
        const visibleClips = getVisibleClips();

        if (!target) {
            return;
        }

        const targetClip = visibleClips[target.clipIndex];

        previewSeekTargetRef.current = target;
        setPreviewClipIndex(target.clipIndex);
        setPreviewCurrentSeconds(target.clipSeconds);
        setPreviewDurationSeconds(targetClip?.durationSeconds ?? 0);
    }

    function commitPreviewSeekByLocationX(): void {
        const target = previewSeekTargetRef.current ?? getPreviewSeekTarget(previewLastSeekLocationXRef.current);

        if (!target) {
            finishPreviewSeek();
            return;
        }

        const shouldPlay = previewResumeAfterSeekRef.current;

        loadPreviewClipAt(target.clipIndex, target.clipSeconds, shouldPlay)
                .catch((error) => {
                    console.error("[EDIT_VLOG] seek preview error:", error);
                    Alert.alert("이동 실패", "해당 구간으로 이동하지 못했습니다.");
                })
                .finally(() => {
                    finishPreviewSeek();
                });
    }

    function renderPreviewProgressBars(visibleClips: VlogClipResponse[]): React.ReactElement {
        return (
            <View
                ref={previewProgressTouchRef}
                pointerEvents={previewPlaying && !previewSeeking ? "none" : "auto"}
                style={styles.previewProgressTouchArea}
                onLayout={updatePreviewProgressMeasure}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onStartShouldSetResponderCapture={() => true}
                onMoveShouldSetResponderCapture={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={handlePreviewSeekStart}
                onResponderMove={handlePreviewSeekMove}
                onResponderRelease={handlePreviewSeekEnd}
                onResponderTerminate={handlePreviewSeekEnd}
            >
                <Animated.View pointerEvents="none" style={[styles.previewProgressRow, { opacity: progressOpacity }]}>
                    {visibleClips.map((clip, index) => {
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
            </View>
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
                            onProgress={(data) => {
                                if (previewSeekingRef.current) {
                                    return;
                                }
                                setPreviewCurrentSeconds(data.currentTime);
                            }}
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
                    {previewVideoLoading ? (
                        <View style={styles.previewLoadingOverlay} pointerEvents="none">
                            <ActivityIndicator />
                        </View>
                    ) : null}
                </View>
            </>
        );
    }

    async function handleExcludeClip(clip: VlogClipResponse): Promise<void> {
        if (!clip.clipId) return;

        try {
            const updated = await excludeVlogEditClip(projectId, clip.clipId);

            setClips((prev) => prev.filter((item) => item.clipId !== clip.clipId));
            setExcludedClips((prev) => [updated, ...prev.filter((item) => item.clipId !== clip.clipId)]);

            if (loadedPreviewClipId === clip.clipId) {
                setPreviewVideoUrl(null);
                setLoadedPreviewClipId(null);
                setPreviewPlaying(false);
                setPreviewCurrentSeconds(0);
                setPreviewDurationSeconds(0);
                setPreviewClipIndex(0);
            }
        } catch (error) {
            console.error("[EDIT_VLOG] exclude clip error:", error);
            Alert.alert("삭제 실패", "클립을 편집 목록에서 제외하지 못했습니다.");
        }
    }

    async function handleIncludeExcludedClip(clip: VlogClipResponse): Promise<void> {
        if (!clip.clipId || includingClipId) return;

        try {
            setIncludingClipId(clip.clipId);

            const updated = await includeVlogEditClip(projectId, clip.clipId);

            setExcludedClips((prev) => prev.filter((item) => item.clipId !== clip.clipId));
            setClips((prev) => sortClipsByDisplayOrder([...prev, updated]));
            setAddClipModalOpen(false);
        } catch (error) {
            console.error("[EDIT_VLOG] include clip error:", error);
            Alert.alert("추가 실패", "제외한 영상을 다시 추가하지 못했습니다.");
        } finally {
            setIncludingClipId(null);
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

    function resetToRecordVlog(): void {
        navigation.dispatch(
            CommonActions.reset({
                index: 1,
                routes: [{name: "VlogHome",}, {name: "RecordVlog",params: {projectId, title, subText,},},
                ],
            })
        );
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

    async function handlePressAddGalleryClip(): Promise<void> {
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

    function renderAddClipModal(): React.ReactElement {
        return (
            <Modal visible={addClipModalOpen} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setAddClipModalOpen(false)}>
                <Pressable style={styles.addClipModalBackdrop} onPress={() => setAddClipModalOpen(false)}>
                    <Pressable style={styles.addClipModalBox} onPress={(event) => event.stopPropagation()}>
                        <AppText style={styles.addClipModalTitle}>영상 추가하기</AppText>

                        <Pressable
                            style={styles.addClipModalButton}
                            disabled={addingClip}
                            onPress={() => {
                                setAddClipModalOpen(false);
                                handlePressAddGalleryClip().catch(console.error);
                            }}
                        >
                            <AppText style={styles.addClipModalButtonText}>{addingClip ? "추가 중..." : "내 갤러리에서 추가하기"}</AppText>
                        </Pressable>

                        <Pressable style={styles.addClipModalButton} onPress={() => { setAddClipModalOpen(false); resetToRecordVlog(); }}>
                            <AppText style={styles.addClipModalButtonText}>미션 영상 촬영하러 가기</AppText>
                        </Pressable>

                        <View style={styles.excludedClipSection}>
                            <AppText style={styles.excludedClipTitle}>제외한 영상 다시 추가</AppText>

                            {excludedClips.length === 0 ? (
                                <AppText style={styles.excludedClipEmptyText}>제외한 영상이 없습니다.</AppText>
                            ) : (
                                <ScrollView style={styles.excludedClipList} showsVerticalScrollIndicator={false}>
                                    {excludedClips.map((clip) => (
                                        <Pressable key={`excluded-${clip.clipId}`} style={styles.excludedClipItem} disabled={includingClipId === clip.clipId} onPress={() => { handleIncludeExcludedClip(clip).catch(console.error); }}>
                                            <View style={styles.excludedClipThumb}>
                                                {clip.thumbnailUrl ? (
                                                    <Image source={{ uri: clip.thumbnailUrl }} style={styles.excludedClipThumbImage} resizeMode="cover" />
                                                ) : null}
                                            </View>

                                            <View style={styles.excludedClipTextWrap}>
                                                <AppText style={styles.excludedClipName} numberOfLines={1}>{getClipTitle(clip)}</AppText>
                                                <AppText style={styles.excludedClipMeta}>{getWeekText(clip)} · {getActualClipDurationText(clip)}</AppText>
                                            </View>

                                            <AppText style={styles.excludedClipAddText}>{includingClipId === clip.clipId ? "추가 중" : "추가"}</AppText>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        <Pressable style={styles.addClipModalCancelButton} onPress={() => setAddClipModalOpen(false)}>
                            <AppText style={styles.addClipModalCancelText}>닫기</AppText>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
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
                    <Pressable style={styles.exportDoneButton} onPress={() => { setExportStep("IDLE"); resetToRecordVlog(); }}>
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
                scrollEnabled={!previewSeeking && !previewProgressDragging}
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
                    <Pressable style={styles.addClipButton} onPress={() => setAddClipModalOpen(true)} disabled={addingClip}>
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
            {renderAddClipModal()}
            {renderExportOverlay()}
        </SafeAreaView>
    );
}