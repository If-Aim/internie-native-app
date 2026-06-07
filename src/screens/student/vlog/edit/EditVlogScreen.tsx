import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "../../../../../AppText";
import { completeVlogExport, getVlogEditing, updateVlogEditClip, type VlogClipResponse } from "../../../../api/vlog";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./EditVlogScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EditVlog">;

function BackIcon(): React.ReactElement {
    return (
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18L9 12L15 6" stroke="#05070A" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function PlayIcon(): React.ReactElement {
    return (
        <Svg width={76} height={76} viewBox="0 0 76 76" fill="none">
            <Circle cx={38} cy={38} r={38} fill="#BFD8FF" />
            <Path d="M31 25.5V50.5L51 38L31 25.5Z" fill="#FFFFFF" />
        </Svg>
    );
}

function DragHandleIcon(): React.ReactElement {
    return (
        <Svg width={28} height={36} viewBox="0 0 28 36" fill="none">
            <Circle cx={8} cy={8} r={2.2} fill="#D8D8D8" />
            <Circle cx={18} cy={8} r={2.2} fill="#D8D8D8" />
            <Circle cx={8} cy={18} r={2.2} fill="#D8D8D8" />
            <Circle cx={18} cy={18} r={2.2} fill="#D8D8D8" />
            <Circle cx={8} cy={28} r={2.2} fill="#D8D8D8" />
            <Circle cx={18} cy={28} r={2.2} fill="#D8D8D8" />
        </Svg>
    );
}

function formatDuration(seconds?: number | null): string {
    const safeSeconds = Number.isFinite(seconds ?? NaN) ? Math.max(0, seconds ?? 0) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
}

function getClipTitle(clip: VlogClipResponse): string {
    return clip.customTitle ?? clip.originalTitle ?? "브이로그 클립";
}

function getWeekText(clip: VlogClipResponse): string {
    if (clip.type === "EXTRA") return "추가 영상";
    if (clip.type === "FREE_RECORD") return "자유기록";
    if (clip.week) return `${clip.week}주차`;

    return "";
}

export default function EditVlogScreen({ navigation, route }: Props): React.ReactElement {
    const projectId = route.params.projectId;
    const [title, setTitle] = React.useState(route.params?.title ?? "인턴십 브이로그");
    const [subText, setSubText] = React.useState(route.params?.subText ?? "");
    const [clips, setClips] = React.useState<VlogClipResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [exporting, setExporting] = React.useState(false);

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

    async function handleChangeCaption(clip: VlogClipResponse, caption: string): Promise<void> {
        if (clip.clipId == null) return;

        setClips((prev) => prev.map((item) => item.clipId === clip.clipId ? { ...item, caption } : item));
    }

    async function handleSubmitCaption(clip: VlogClipResponse): Promise<void> {
        if (clip.clipId == null) return;

        try {
            const updated = await updateVlogEditClip(projectId, clip.clipId, {
                caption: clip.caption ?? "",
            });

            setClips((prev) => prev.map((item) => item.clipId === clip.clipId ? updated : item));
        } catch (error) {
            Alert.alert("자막 저장 실패", "자막을 저장하지 못했습니다.");
        }
    }

    async function handlePressExport(): Promise<void> {
        if (exporting) return;

        try {
            setExporting(true);

            await completeVlogExport(projectId, {
                portfolioShared: false,
                finalVideoFileKey: null,
                finalVideoThumbnailKey: null,
                finalVideoDurationSeconds: clips.reduce((sum, clip) => sum + (clip.includedInFinal === false ? 0 : clip.durationSeconds ?? 0), 0),
            });

            Alert.alert("내보내기 완료", "브이로그가 비공개로 저장되었습니다.", [
                {
                    text: "확인",
                    onPress: () => navigation.goBack(),
                },
            ]);
        } catch (error) {
            console.error("[EDIT_VLOG] export error:", error);
            Alert.alert("내보내기 실패", "브이로그를 내보내지 못했습니다.");
        } finally {
            setExporting(false);
        }
    }

    function handlePressAddClip(): void {
        navigation.navigate("SelectClip", {
            projectId,
            title,
        });
    }

    function renderClip(clip: VlogClipResponse): React.ReactElement {
        const disabled = clip.includedInFinal === false;

        return (
            <View key={String(clip.clipId)} style={[styles.clipCard, disabled ? styles.clipCardDisabled : null]}>
                <Pressable style={styles.clipThumb} onPress={() => handleToggleClip(clip)} />

                <View style={styles.clipTextWrap}>
                    <AppText style={styles.clipTitle}>{getClipTitle(clip)}</AppText>
                    <AppText style={styles.clipWeek}>{getWeekText(clip)}</AppText>

                    <TextInput
                        style={styles.captionInput}
                        value={clip.caption ?? ""}
                        onChangeText={(value) => handleChangeCaption(clip, value)}
                        onBlur={() => handleSubmitCaption(clip)}
                        placeholder="자막 입력"
                        placeholderTextColor="#9A9A9A"
                        maxLength={50}
                    />
                </View>

                <AppText style={styles.clipDuration}>{formatDuration(clip.durationSeconds)}</AppText>

                <View style={styles.dragHandle}>
                    <DragHandleIcon />
                </View>
            </View>
        );
    }

    const visibleClips = clips.filter((clip) => clip.includedInFinal !== false);
    const totalDurationText = formatDuration(visibleClips.reduce((sum, clip) => sum + (clip.durationSeconds ?? 0), 0));
    const firstClip = visibleClips[0];

    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="뒤로가기">
                    <BackIcon />
                </Pressable>

                <View style={styles.titleWrap}>
                    <AppText style={styles.subText}>{subText}</AppText>
                    <AppText style={styles.title}>{title}</AppText>
                </View>

                <View style={styles.previewCard}>
                    <View style={styles.previewProgressRow}>
                        {visibleClips.slice(0, 6).map((clip, index) => (
                            <View key={`${clip.clipId}-${index}`} style={[styles.previewProgress, index === 0 ? styles.previewProgressActive : null]} />
                        ))}
                    </View>

                    <View style={styles.previewCenter}>
                        <PlayIcon />
                        <AppText style={styles.previewWeek}>{firstClip ? getWeekText(firstClip) : "브이로그"}</AppText>
                        <AppText style={styles.previewTitle}>{firstClip ? getClipTitle(firstClip) : "클립 없음"}</AppText>
                    </View>

                    <View style={styles.previewTimeRow}>
                        <AppText style={styles.previewTime}>00:00</AppText>
                        <AppText style={styles.previewTime}>{totalDurationText}</AppText>
                    </View>
                </View>

                <View style={styles.clipList}>
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        clips.map(renderClip)
                    )}

                    <Pressable style={styles.addClipButton} onPress={handlePressAddClip}>
                        <AppText style={styles.addClipText}>촬영 추가하기</AppText>
                    </Pressable>
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <Pressable style={[styles.exportButton, exporting ? styles.exportButtonDisabled : null]} onPress={handlePressExport}>
                    <AppText style={styles.exportButtonText}>{exporting ? "내보내는 중" : "내보내기"}</AppText>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}