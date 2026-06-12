import React from "react";
import { ActivityIndicator, Alert, Animated, Easing, Image, PermissionsAndroid, PixelRatio, Platform, Pressable, TextInput, View, useWindowDimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { createThumbnail } from "react-native-create-thumbnail";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Video from "react-native-video";
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
    const dot1 = React.useRef(new Animated.Value(0)).current;
    const dot2 = React.useRef(new Animated.Value(0)).current;
    const dot3 = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const createBounce = (value: Animated.Value, delayMs: number) => Animated.loop(
            Animated.sequence([
                Animated.delay(delayMs),
                Animated.timing(value, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(value, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                Animated.delay(260),
            ])
        );

        const animation1 = createBounce(dot1, 0);
        const animation2 = createBounce(dot2, 120);
        const animation3 = createBounce(dot3, 240);

        animation1.start();
        animation2.start();
        animation3.start();

        return () => {
            animation1.stop();
            animation2.stop();
            animation3.stop();
        };
    }, [dot1, dot2, dot3]);

    const getDotAnimatedStyle = (value: Animated.Value) => ({
        transform: [
            {
                translateY: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -12],
                }),
            },
            {
                scale: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.12],
                }),
            },
        ],
    });

    return (
        <View style={styles.exportDotRow} accessibilityRole="progressbar">
            <Animated.View style={[styles.exportDot, styles.exportDotActive, getDotAnimatedStyle(dot1)]} />
            <Animated.View style={[styles.exportDot, getDotAnimatedStyle(dot2)]} />
            <Animated.View style={[styles.exportDot, getDotAnimatedStyle(dot3)]} />
        </View>
    );
}

function formatDuration(seconds?: number | null): string {
    const safeSeconds = Number.isFinite(seconds ?? NaN) ? Math.max(0, seconds ?? 0) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
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
        void loadEditing();
    }, [projectId]);

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

    async function handlePressPreview(): Promise<void> {
        const visibleClips = clips.filter((clip) => clip.includedInFinal !== false);
        const clip = visibleClips[previewClipIndex];

        if (!clip?.clipId) {
            Alert.alert("재생할 영상이 없습니다.", "편집에 포함된 클립이 없습니다.");
            return;
        }

        if (previewPlaying) {
            setPreviewPlaying(false);
            return;
        }

        try {
            const response = await getVlogClipPlayUrl(projectId, clip.clipId);

            if (!response.url) {
                Alert.alert("재생 실패", "영상 재생 URL을 불러오지 못했습니다.");
                return;
            }

            setPreviewVideoUrl(response.url);
            setPreviewDurationSeconds(clip.durationSeconds ?? 0);
            setPreviewPlaying(true);
        } catch (error) {
            console.error("[EDIT_VLOG] play url error:", error);
            Alert.alert("재생 실패", "영상 재생 URL을 불러오지 못했습니다.");
        }
    }

    function handlePreviewEnd(): void {
        const visibleClips = clips.filter((clip) => clip.includedInFinal !== false);
        const nextIndex = previewClipIndex + 1;

        if (nextIndex >= visibleClips.length) {
            setPreviewPlaying(false);
            setPreviewCurrentSeconds(0);
            return;
        }

        setPreviewClipIndex(nextIndex);
        setPreviewVideoUrl(null);
        setPreviewCurrentSeconds(0);
        setPreviewPlaying(false);
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

    function renderPreviewProgressBars(visibleClips: VlogClipResponse[]): React.ReactElement {
        return (
            <View style={styles.previewProgressRow}>
                {visibleClips.slice(0, 6).map((clip, index) => {
                    const isActive = index === previewClipIndex;
                    const progress = isActive && previewDurationSeconds > 0 ? Math.min(1, previewCurrentSeconds / previewDurationSeconds) : index < previewClipIndex ? 1 : 0;

                    return (
                        <View key={`${clip.clipId}-${index}`} style={styles.previewProgressTrack}>
                            <View style={[styles.previewProgressFill, { width: `${progress * 100}%` }]} />
                        </View>
                    );
                })}
            </View>
        );
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

                        <AppText style={styles.clipDuration}>{Math.max(0, item.durationSeconds ?? 0)}초</AppText>

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
                ListHeaderComponent={() => {
                    const visibleClips = clips.filter((clip) => clip.includedInFinal !== false);
                    const currentClip = visibleClips[previewClipIndex];
                    const totalDurationText = formatDuration(visibleClips.reduce((sum, clip) => sum + (clip.durationSeconds ?? 0), 0));

                    return (
                        <>
                            <View style={styles.titleWrap}>
                                <AppText style={styles.subText}>{subText}</AppText>
                                <AppText style={styles.title}>{title}</AppText>
                            </View>

                            <Pressable style={styles.previewCard} onPress={handlePressPreview}>
                                {previewVideoUrl ? (
                                    <Video
                                        source={{ uri: previewVideoUrl }}
                                        style={styles.previewVideo}
                                        paused={!previewPlaying}
                                        resizeMode="cover"
                                        maxBitRate={0}
                                        muted={false}
                                        onProgress={(data) => setPreviewCurrentSeconds(data.currentTime)}
                                        onLoad={(data) => setPreviewDurationSeconds(data.duration)}
                                        onEnd={handlePreviewEnd}
                                    />
                                ) : null}

                                {!previewPlaying ? renderPreviewProgressBars(visibleClips) : null}

                                <View style={styles.previewCenter}>
                                    <PlayIcon />
                                    <AppText style={styles.previewWeek}>{currentClip ? getWeekText(currentClip) : "브이로그"}</AppText>
                                    <AppText style={styles.previewTitle}>{currentClip ? getClipTitle(currentClip) : "클립 없음"}</AppText>
                                </View>

                                <View style={styles.previewTimeRow}>
                                    <AppText style={styles.previewTime}>{formatDuration(Math.floor(previewCurrentSeconds))}</AppText>
                                    <AppText style={styles.previewTime}>{totalDurationText}</AppText>
                                </View>
                            </Pressable>
                        </>
                    );
                }}
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