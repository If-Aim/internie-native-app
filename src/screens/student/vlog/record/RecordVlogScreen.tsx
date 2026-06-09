import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "../../../../../AppText";
import { completeMissionClip, createFreeClip, deleteVlogProject, getVlogProjectDetail, replaceMissionClip, type VlogClipCompleteInput, type VlogResponse } from "../../../../api/vlog";
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
    thumbnailUrl: string | null;
};

type FreeCaptureItem = {
    id: string;
    title: string;
    durationText: string;
    thumbnailUrl: string | null;
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

// 날짜 표시
function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseApiDate(value?: string | null): Date | null {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function formatTodayText(): string {
    const today = new Date();

    return `${today.getMonth() + 1}월 ${today.getDate()}일`;
}

function getCurrentWeekText(startDate?: string | null): string { // 오늘날 기준week 계산
    const start = parseApiDate(startDate);

    if (!start) {
        return `1주차, ${formatTodayText()}`;
    }

    const today = startOfDay(new Date());
    const startDay = startOfDay(start);
    const diffDays = Math.max(0, Math.floor((today.getTime() - startDay.getTime()) / 86400000));
    const week = Math.floor(diffDays / 7) + 1;

    return `${week}주차, ${formatTodayText()}`;
}

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
                        thumbnailUrl: mission.lastClipThumbnailUrl ?? mission.thumbnailUrl ?? null,
                    };
                });
                const completedCount = missionItems.filter((mission) => mission.completed).length;

                return {
                    id: `week-${week}`,
                    week,
                    dateText: formatTodayText(),
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

function ThreeDotIcon(): React.ReactElement {
    return (
        <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
            <Path d="M7.5 4.5C6.67157 4.5 6 3.82843 6 3C6 2.17157 6.67157 1.5 7.5 1.5C8.32843 1.5 9 2.17157 9 3C9 3.82843 8.32843 4.5 7.5 4.5Z" fill="black"/>
            <Path d="M7.5 9C6.67157 9 6 8.32843 6 7.5C6 6.67157 6.67157 6 7.5 6C8.32843 6 9 6.67157 9 7.5C9 8.32843 8.32843 9 7.5 9Z" fill="black"/>
            <Path d="M7.5 13.5C6.67157 13.5 6 12.8284 6 12C6 11.1716 6.67157 10.5 7.5 10.5C8.32843 10.5 9 11.1716 9 12C9 12.8284 8.32843 13.5 7.5 13.5Z" fill="black"/>
        </Svg>
    );
}

function Header({
    onBackClick,
    onMenuClick,
}: {
    onBackClick: () => void;
    onMenuClick: () => void;
}): React.ReactElement {

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onBackClick} accessibilityLabel="뒤로가기">
                <BackIcon />
            </Pressable>

            <AppText style={styles.appTitle} />

            <View style={styles.headerRightSpace} />
            <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel="메뉴">
                <ThreeDotIcon />
            </Pressable>
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

    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [heroThumbnailUrl, setHeroThumbnailUrl] = React.useState<string | null>(null);

    const freeCaptureItem: FreeCaptureItem = {
        id: "free-capture",
        title: "나의 일상을 자유롭게 기록해볼까요?",
        durationText: "6초",
        thumbnailUrl: null,
    };

    const [captureResult, setCaptureResult] = React.useState<{
        visible: boolean;
        mission: MissionItem | null;
        type: "MISSION" | "FREE";
        thumbnailUri: string | null;
        isFinalMission: boolean;
    }>({
        visible: false,
        mission: null,
        type: "MISSION",
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
            setSubText(getCurrentWeekText(detail.startDate));
            setProgressPercent(detail.progressPercent ?? 0);
            setCompletedMissionCount(detail.completedMissionCount ?? 0);
            setTotalMissionCount(detail.totalMissionCount ?? 0);
            setHeroThumbnailUrl(detail.lastClipThumbnailUrl ?? detail.thumbnailUrl ?? null);
            setWeeks(groupMissionsByWeek(missions));
        } catch (error) {
            console.error("[RECORD_VLOG] load project error:", error);
            Alert.alert("불러오기 실패", "브이로그 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteProject(): Promise<void> {
        if (deleting) return;

        try {
            setDeleting(true);

            await deleteVlogProject(projectId);

            setDeleteModalOpen(false);

            Alert.alert("삭제되었습니다.", "브이로그가 삭제되었습니다.", [
                {
                    text: "확인",
                    onPress: () => navigation.goBack(),
                },
            ]);
        } catch (error) {
            console.error("[RECORD_VLOG] delete project error:", error);
            Alert.alert("삭제 실패", "브이로그를 삭제하지 못했습니다.");
        } finally {
            setDeleting(false);
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
            type: "MISSION",
            thumbnailUri: mission.thumbnailUrl,
            isFinalMission: finalMission,
        });
    }

    async function handleConfirmClip(): Promise<void> {
        if (savingClip) return;

        try {
            setSavingClip(true);

            if (captureResult.type === "FREE") {
                const input: VlogClipCompleteInput = {
                    fileKey: `vlogs/temp/${projectId}/free-${Date.now()}.mp4`,
                    originalName: `free-${Date.now()}.mp4`,
                    contentType: "video/mp4",
                    sizeBytes: 0,
                    durationSeconds: 6,
                    thumbnailKey: null,
                    customTitle: "내 자리",
                };

                await createFreeClip(projectId, input);
            } else {
                if (!captureResult.mission) return;

                const input = createTempClipInput(captureResult.mission);

                if (captureResult.mission.completed) {
                    await replaceMissionClip(projectId, captureResult.mission.id, input);
                } else {
                    await completeMissionClip(projectId, captureResult.mission.id, input);
                }
            }

            setCaptureResult({
                visible: false,
                mission: null,
                type: "MISSION",
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

    function handlePressEdit(): void {
        navigation.navigate("EditVlog", {
            projectId,
            title,
            subText,
        });
    }

    function toggleWeek(weekId: string): void {
        setOpenedWeekId((prev) => (prev === weekId ? null : weekId));
    }

    function onboardingComplete(): boolean {
        return weeks.some((week) => week.missions.some((mission) => mission.completed));
    }

    function handlePressFreeCapture(): void {
        setCaptureResult({
            visible: true,
            mission: null,
            type: "FREE",
            thumbnailUri: null,
            isFinalMission: false,
        });
    }

    function renderMission(mission: MissionItem): React.ReactElement {
        return (
            <View key={mission.id} style={styles.missionCard}>
                <View style={styles.missionTopRow}>
                    <View style={[styles.missionThumb, mission.completed ? styles.missionThumbDone : null]}>
                        {mission.thumbnailUrl ? (
                            <Image source={{ uri: mission.thumbnailUrl }} style={styles.missionThumbImage} resizeMode="cover" />
                        ) : (
                            <VideoIcon />
                        )}
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

    function renderFreeCaptureCard(): React.ReactElement {
        return (
            <View style={styles.freeCaptureCard}>
                <View style={styles.weekHeader}>
                    <CheckCircleIcon active={onboardingComplete()} />

                    <View style={styles.weekTitleWrap}>
                        <AppText style={styles.weekTitle}>자율 촬영</AppText>
                    </View>

                    <ChevronIcon open={true} />
                </View>

                <View style={styles.weekBody}>
                    <AppText style={styles.weekDesc}>나의 인턴십 과정을 자유롭게 촬영해보세요. 하루에 2번만 가능해요.</AppText>

                    <View style={styles.missionCard}>
                        <View style={styles.missionTopRow}>
                            <View style={styles.missionThumb}>
                                <VideoIcon />
                            </View>

                            <View style={styles.missionTitleWrap}>
                                <AppText style={styles.missionTitle}>{freeCaptureItem.title}</AppText>
                                <AppText style={styles.missionDuration}>{freeCaptureItem.durationText}</AppText>
                            </View>
                        </View>

                        <Pressable style={styles.missionRecordButtonActive} onPress={handlePressFreeCapture}>
                            <AppText style={styles.missionRecordTextActive}>촬영하기</AppText>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    }

    function renderDeleteModal(): React.ReactElement {
        return (
            <Modal visible={deleteModalOpen} transparent animationType="fade" onRequestClose={() => setDeleteModalOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <Pressable style={styles.modalDim} onPress={() => setDeleteModalOpen(false)} />

                    <View style={styles.deleteModalBox}>
                        <AppText style={styles.deleteModalTitle}>브이로그를 삭제할까요?</AppText>
                        <AppText style={styles.deleteModalDesc}>삭제한 브이로그는 목록에서 사라집니다.</AppText>

                        <View style={styles.deleteModalButtonRow}>
                            <Pressable style={styles.deleteCancelButton} onPress={() => setDeleteModalOpen(false)} disabled={deleting}>
                                <AppText style={styles.deleteCancelText}>취소</AppText>
                            </Pressable>

                            <Pressable
                                style={styles.deleteConfirmButton}
                                disabled={deleting}
                                onPress={() => {
                                    handleDeleteProject().catch(console.error);
                                }}
                            >
                                <AppText style={styles.deleteConfirmText}>{deleting ? "삭제 중..." : "삭제하기"}</AppText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <Header onBackClick={() => navigation.goBack()} onMenuClick={() => setDeleteModalOpen(true)} />

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
                    {heroThumbnailUrl ? (
                        <Image source={{ uri: heroThumbnailUrl }} style={styles.heroThumbnailImage} resizeMode="cover" />
                    ) : null}

                    <Pressable style={styles.heroPlayButton} onPress={handlePressHeroRecord}>
                        <View style={styles.heroPlayTriangle} />
                    </Pressable>
                </View>

                <AppText style={styles.sectionTitle}>인턴십 일정</AppText>

                <View style={styles.weekList}>
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        <>
                            {weeks.map(renderWeek)}
                            {renderFreeCaptureCard()}
                        </>
                    )}
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <Pressable style={styles.editButton} onPress={handlePressEdit}>
                    <AppText style={styles.editButtonText}>편집하기</AppText>
                </Pressable>
            </View>

            {renderCaptureResultLayer()}
            {renderDeleteModal()}
        </SafeAreaView>
    );
}