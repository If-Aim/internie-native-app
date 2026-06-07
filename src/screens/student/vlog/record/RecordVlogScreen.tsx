import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "../../../../../AppText";
import { completeMissionClip, getVlogProjectDetail, replaceMissionClip, startVlogEditing, type VlogClipCompleteInput, type VlogResponse } from "../../../../api/vlog";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./RecordVlogScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "RecordVlog">;

type MissionItem = {
    id: string;
    title: string;
    durationText: string;
    background: string;
    composition: string;
    completed: boolean;
    locked: boolean;
    clipId: number | null;
};

type WeekItem = {
    id: string;
    week: number;
    dateText: string;
    completedCount: number;
    totalCount: number;
    description: string;
    missions: MissionItem[];
};

function formatMissionDuration(seconds?: number | null): string {
    const safeSeconds = Number.isFinite(seconds ?? NaN) ? Math.max(0, seconds ?? 0) : 0;

    return `${safeSeconds}초`;
}

function groupMissionsByWeek(missions: VlogResponse[]): WeekItem[] {
    const weekMap = new Map<number, VlogResponse[]>();

    missions.forEach((mission) => {
        const week = mission.week ?? 0;

        if (!weekMap.has(week)) {
            weekMap.set(week, []);
        }

        weekMap.get(week)?.push(mission);
    });

    return Array.from(weekMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([week, weekMissions]) => {
                const sortedMissions = [...weekMissions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const missionItems = sortedMissions.map((mission) => {
                    const missionStatus = mission.missionStatus ?? "AVAILABLE";

                    return {
                        id: mission.missionId ?? `${week}-${mission.order ?? 0}`,
                        title: mission.title ?? "브이로그 미션",
                        durationText: formatMissionDuration(mission.durationSec),
                        background: mission.description ?? "미션 설명이 없습니다.",
                        composition: mission.tip ?? "자유롭게 촬영해주세요.",
                        completed: missionStatus === "COMPLETED",
                        locked: missionStatus === "LOCKED",
                        clipId: mission.lastClipId ?? null,
                    };
                });
                const completedCount = missionItems.filter((mission) => mission.completed).length;

                return {
                    id: `week-${week}`,
                    week,
                    dateText: "",
                    completedCount,
                    totalCount: missionItems.length,
                    description: `${week}주차에 진행할 브이로그 미션입니다.`,
                    missions: missionItems,
                };
            });
}

function BackIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M14 17L9 12L14 7" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d={open ? "M6 15L12 9L18 15" : "M6 9L12 15L18 9"} stroke="#999999" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function CheckCircleIcon({ active }: { active: boolean }): React.ReactElement {
    return (
        <View style={[styles.checkCircle, active ? styles.checkCircleActive : null]}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C13.4121 3 14.7482 3.32519 15.9375 3.90476M19.3125 6.375L11.4375 14.25L9.1875 12" stroke={active ? "#0F6EF7" : "#808080"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        </View>
    );
}

function VideoIcon(): React.ReactElement {
    return (
        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
            <Path d="M12.1056 8.83333H9.35556M15.8753 14.3867L20.5252 16.6771C21.0072 16.9705 21.5131 16.7976 21.5001 16.1856L21.4675 8.09104C21.4263 7.42667 21.0342 7.24539 20.4569 7.55242L15.8622 9.64057M5.25006 18.5H13.6056C14.8482 18.5 15.8556 17.5051 15.8556 16.2778L15.8753 13.4275L15.8556 7.72222C15.8556 6.49492 14.8482 5.5 13.6056 5.5H5.25006C4.00742 5.5 3.00006 6.49492 3.00006 7.72222V16.2778C3.00006 17.5051 4.00742 18.5 5.25006 18.5Z" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function Header({
    onBackClick,
}: {
    onBackClick: () => void;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onBackClick} accessibilityLabel="뒤로가기">
                <BackIcon />
            </Pressable>

            <AppText style={styles.appTitle} />

            <View style={styles.headerRightSpace} />
        </View>
    );
}

export default function RecordVlogScreen({ navigation, route }: Props): React.ReactElement {
    const projectId = route.params.projectId;
    const [title, setTitle] = React.useState(route.params?.title ?? "인턴십A");
    const [subText, setSubText] = React.useState(route.params?.subText ?? "");
    const [progressPercent, setProgressPercent] = React.useState(route.params?.progressPercent ?? 0);
    const [completedMissionCount, setCompletedMissionCount] = React.useState(route.params?.completedMissionCount ?? 0);
    const [totalMissionCount, setTotalMissionCount] = React.useState(route.params?.totalMissionCount ?? 0);
    const [weeks, setWeeks] = React.useState<WeekItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [savingClip, setSavingClip] = React.useState(false);
    const [openedWeekId, setOpenedWeekId] = React.useState<string | null>(null);
    const recordingCompleted = totalMissionCount > 0 && completedMissionCount >= totalMissionCount;

    const [captureResult, setCaptureResult] = React.useState<{
        visible: boolean;
        mission: MissionItem | null;
        thumbnailUri: string | null;
        isFinalMission: boolean;
    }>({
        visible: false,
        mission: null,
        thumbnailUri: null,
        isFinalMission: false,
    });

    React.useEffect(() => {
        void loadProjectDetail();
    }, [projectId]);

    async function loadProjectDetail(): Promise<void> {
        try {
            setLoading(true);

            const detail = await getVlogProjectDetail(projectId);
            const missions = detail.missions ?? [];

            setTitle(detail.title ?? title);
            setProgressPercent(detail.progressPercent ?? 0);
            setCompletedMissionCount(detail.completedMissionCount ?? 0);
            setTotalMissionCount(detail.totalMissionCount ?? 0);
            setWeeks(groupMissionsByWeek(missions));

            if (detail.currentWeek) {
                setSubText(`${detail.currentWeek}주차, `);
            }
        } catch (error) {
            console.error("[RECORD_VLOG] load project error:", error);
            Alert.alert("불러오기 실패", "브이로그 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }

    function createTempClipInput(mission: MissionItem): VlogClipCompleteInput {
        return {
            fileKey: `vlogs/temp/${projectId}/${mission.id}-${Date.now()}.mp4`,
            originalName: `${mission.id}.mp4`,
            contentType: "video/mp4",
            sizeBytes: 0,
            durationSeconds: Number(mission.durationText.replace(/[^0-9]/g, "")) || 0,
            thumbnailKey: null,
        };
    }

    function isFinalMission(missionId: string): boolean {
        const allMissions = weeks.flatMap((week) => week.missions);
        const lastMission = allMissions[allMissions.length - 1];

        return lastMission?.id === missionId;
    }

    function handlePressRecord(mission: MissionItem): void {
        const finalMission = isFinalMission(mission.id);

        setCaptureResult({
            visible: true,
            mission,
            thumbnailUri: null,
            isFinalMission: finalMission,
        });
    }

    async function handleConfirmClip(): Promise<void> {
        if (!captureResult.mission || savingClip) return;

        try {
            setSavingClip(true);

            const input = createTempClipInput(captureResult.mission);

            if (captureResult.mission.completed) {
                await replaceMissionClip(projectId, captureResult.mission.id, input);
            } else {
                await completeMissionClip(projectId, captureResult.mission.id, input);
            }

            setCaptureResult({
                visible: false,
                mission: null,
                thumbnailUri: null,
                isFinalMission: false,
            });

            await loadProjectDetail();
        } catch (error) {
            console.error("[RECORD_VLOG] save clip error:", error);
            Alert.alert("저장 실패", "촬영한 영상을 저장하지 못했습니다.");
        } finally {
            setSavingClip(false);
        }
    }

    function getNextMission(): MissionItem | null {
        const allMissions = weeks.flatMap((week) => week.missions);

        return allMissions.find((mission) => !mission.completed && !mission.locked) ?? allMissions[allMissions.length - 1] ?? null;
    }

    function handlePressHeroRecord(): void {
        const nextMission = getNextMission();

        if (!nextMission) {
            Alert.alert("촬영할 미션이 없습니다.", "등록된 미션이 없습니다.");
            return;
        }

        handlePressRecord(nextMission);
    }

    async function handlePressEdit(): Promise<void> {
        if (!recordingCompleted) {
            Alert.alert("촬영을 완료해주세요.", "모든 공식 미션 영상을 촬영한 뒤 편집을 시작할 수 있습니다.");
            return;
        }

        try {
            await startVlogEditing(projectId);

            navigation.navigate("EditVlog", {
                projectId,
                title,
                subText,
            });
        } catch (error) {
            console.error("[RECORD_VLOG] start editing error:", error);
            Alert.alert("편집 시작 실패", "편집을 시작하지 못했습니다.");
        }
    }

    function toggleWeek(weekId: string): void {
        setOpenedWeekId((prev) => (prev === weekId ? null : weekId));
    }

    function renderMission(mission: MissionItem): React.ReactElement {
        return (
            <View key={mission.id} style={styles.missionCard}>
                <View style={styles.missionTopRow}>
                    <View style={[styles.missionThumb, mission.completed ? styles.missionThumbDone : null]}>
                        {!mission.completed && <VideoIcon />}
                    </View>

                    <View style={styles.missionTitleWrap}>
                        <AppText style={styles.missionTitle}>{mission.title}</AppText>
                        <AppText style={styles.missionDuration}>{mission.durationText}</AppText>
                    </View>
                </View>

                <View style={styles.missionInfoRow}>
                    <View style={styles.missionBadge}>
                        <AppText style={styles.missionBadgeText}>배경</AppText>
                    </View>
                    <AppText style={styles.missionDesc}>{mission.background}</AppText>
                </View>

                <View style={styles.missionInfoRow}>
                    <View style={styles.missionBadge}>
                        <AppText style={styles.missionBadgeText}>구도</AppText>
                    </View>
                    <AppText style={styles.missionDesc}>{mission.composition}</AppText>
                </View>

                <Pressable
                    style={[styles.missionRecordButton, mission.completed ? styles.missionRecordButtonActive : null]}
                    disabled={mission.locked}
                    onPress={() => handlePressRecord(mission)}
                >
                    <AppText style={[styles.missionRecordText, mission.completed ? styles.missionRecordTextActive : null]}>
                        {mission.locked ? "이전 미션을 먼저 완료해주세요" : mission.completed ? "재촬영하기" : "촬영하기"}
                    </AppText>
                </Pressable>
            </View>
        );
    }

    function renderWeek(week: WeekItem): React.ReactElement {
        const open = openedWeekId === week.id;
        const complete = week.completedCount === week.totalCount;

        return (
            <View key={week.id} style={[styles.weekCard, open ? styles.weekCardOpen : null]}>
                <Pressable style={styles.weekHeader} onPress={() => toggleWeek(week.id)}>
                    <CheckCircleIcon active={complete} />

                    <View style={styles.weekTitleWrap}>
                        <AppText style={styles.weekTitle}>{week.week}주차</AppText>
                        <AppText style={styles.weekDate}>{week.dateText}</AppText>
                    </View>

                    <AppText style={styles.weekCount}>{week.completedCount}/{week.totalCount}</AppText>
                    <ChevronIcon open={open} />
                </Pressable>

                {open && (
                    <View style={styles.weekBody}>
                        <AppText style={styles.weekDesc}>{week.description}</AppText>
                        {week.missions.map(renderMission)}
                    </View>
                )}
            </View>
        );
    }

    function renderCaptureResultLayer(): React.ReactElement | null {
        if (!captureResult.visible) return null;

        return (
            <View style={styles.captureOverlay}>
                {captureResult.thumbnailUri ? (
                    <Image source={{ uri: captureResult.thumbnailUri }} style={styles.captureThumbnail} resizeMode="cover" />
                ) : (
                    <View style={styles.captureFallback} />
                )}

                <Pressable style={styles.captureCloseButton} onPress={() => setCaptureResult((prev) => ({ ...prev, visible: false }))}>
                    <AppText style={styles.captureCloseText}>×</AppText>
                </Pressable>

                <View style={styles.captureCenter}>
                    <View style={styles.captureCheckCircle}>
                        <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
                            <Path d="M7 12L10.2 15.2L17 8.4" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </View>
                    <AppText style={styles.captureTitle}>촬영완료!</AppText>
                </View>

                <View style={styles.captureBottom}>
                    <Pressable style={styles.captureAgainButton} onPress={() => setCaptureResult((prev) => ({ ...prev, visible: false }))}>
                        <AppText style={styles.captureAgainText}>다시 촬영하기</AppText>
                    </Pressable>

                    <Pressable style={styles.captureNextButton} onPress={handleConfirmClip} disabled={savingClip}>
                        <AppText style={styles.captureNextText}>{savingClip ? "저장 중..." : captureResult.isFinalMission ? "저장 후 편집하기" : "완료하기"}</AppText>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <Header onBackClick={() => navigation.goBack()} />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.titleRow}>
                    <View style={styles.titleTextWrap}>
                        <AppText style={styles.subText}>{subText}</AppText>
                        <AppText style={styles.title}>{title}</AppText>
                    </View>

                    <View style={styles.progressBadge}>
                        <AppText style={styles.progressText}>{progressPercent}%</AppText>
                    </View>
                </View>

                <View style={styles.heroCard}>
                    <Pressable style={styles.heroRecordButton} onPress={handlePressHeroRecord}>
                        <AppText style={styles.heroRecordText}>지금 촬영하기</AppText>
                    </Pressable>
                </View>

                <AppText style={styles.sectionTitle}>인턴십 일정</AppText>

                <View style={styles.weekList}>
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        weeks.map(renderWeek)
                    )}
                </View>
            </ScrollView>

            {recordingCompleted && (
                <View style={styles.bottomBar}>
                    <Pressable style={styles.editButton} onPress={handlePressEdit}>
                        <AppText style={styles.editButtonText}>편집하기</AppText>
                    </Pressable>
                </View>
            )}

            {renderCaptureResultLayer()}
        </SafeAreaView>
    );
}