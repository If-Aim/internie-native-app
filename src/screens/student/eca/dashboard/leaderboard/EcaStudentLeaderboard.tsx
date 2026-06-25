import React from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "@env";

import AppText from "../../../../../../AppText";
import type { StudentStackParamList } from "../../../../../navigation/StudentNavigator";
import { getAccessToken } from "../../../../../auth/tokenStorage";
import { getUserMe } from "../../../../../api/client";
import type { UserMe } from "../../../../../api/client";
import { LEADERBOARD_MISSION_CATEGORY_OPTIONS, getMyLeaderboard, getMyLeaderboardMissionLogs, getMyParticipatingExternalActivities, getMyParticipatingExternalActivity, getStudentLeaderboardCompletedMissions, } from "../../../../../api/ea";
import type { LeaderboardApprovalStatus, LeaderboardCompletedMissionResponse, LeaderboardMissionCategory, LeaderboardRankingResponse, StudentExternalActivityDetailResponse, StudentExternalActivityResponse, StudentLeaderboardLogResponse, StudentLeaderboardResponse, } from "../../../../../api/ea";

import { formatServerKstDateTimeDotForUser } from "../../../../../theme/dateTime";
import EcaStudentApp from "../../EcaStudentApp";
import StudentMobileSideMenu from "../../../StudentSideMenu";
import { commonStyles } from "../../../../../theme/common.Style";
import { styles } from "./EcaStudentLeaderboard.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentLeaderboard">;

type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "leaderboard" | "team-activity";
type MissionLogCategoryFilter = LeaderboardMissionCategory;

type LeaderboardDetailTarget = {
    type: "me" | "student";
    studentId: number;
    name: string;
    rank: number | null;
    totalScore: number;
};

type DetailMissionLog = {
    submissionId: number;
    missionId: number;
    missionName: string;
    category: LeaderboardMissionCategory;
    status: LeaderboardApprovalStatus;
    score: number;
    submittedAt?: string | null;
    reviewedAt?: string | null;
};

const LEADERBOARD_T = "ecaStudent.leaderboardPage";

function getAllMissionLogCategories(): MissionLogCategoryFilter[] {
    return LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => option.value);
}

function formatNumber(value?: number | null): string {
    return Number(value ?? 0).toLocaleString("en-US");
}

function formatOrdinal(value?: number | null): string {
    const rank = Number(value ?? 0);

    if (!rank) return "-";

    const suffix =
        rank % 100 >= 11 && rank % 100 <= 13
            ? "th"
            : rank % 10 === 1
                ? "st"
                : rank % 10 === 2
                    ? "nd"
                    : rank % 10 === 3
                        ? "rd"
                        : "th";

    return `${rank}${suffix}`;
}

function formatPlaceLabel(value: number | null | undefined, t: TFunction): string {
    const rank = Number(value ?? 0);

    if (!rank) return "-";

    return t(`${LEADERBOARD_T}.rank.place`, {
        rank: formatNumber(rank),
        rankOrdinal: formatOrdinal(rank),
        defaultValue: `${formatNumber(rank)} Place`,
    });
}

function formatCategory(value: string | null | undefined, t: TFunction): string {
    if (!value) return t(`${LEADERBOARD_T}.categoryFallback`, { defaultValue: "-" });

    return value
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCategoryLabel(value: LeaderboardMissionCategory | null | undefined, t: TFunction): string {
    if (!value) return t(`${LEADERBOARD_T}.categoryFallback`, { defaultValue: "-" });

    const option = LEADERBOARD_MISSION_CATEGORY_OPTIONS.find((item) => item.value === value);

    return t(`${LEADERBOARD_T}.category.${value}`, {
        defaultValue: option?.label ?? formatCategory(value, t),
    });
}

function getLogStatusLabel(status: LeaderboardApprovalStatus, t: TFunction): string {
    const fallback: Record<LeaderboardApprovalStatus, string> = {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        all: "All",
    };

    return t(`${LEADERBOARD_T}.logStatus.${status}`, {
        defaultValue: fallback[status],
    });
}

function getMissionLogDetailStatusLabel(status: LeaderboardApprovalStatus, t: TFunction): string {
    const fallback: Record<LeaderboardApprovalStatus, string> = {
        approved: "Approved",
        rejected: "Rejected",
        pending: "Pending",
        all: "All",
    };

    return t(`${LEADERBOARD_T}.detail.status.${status}`, {
        defaultValue: fallback[status],
    });
}

function getMissionLogDetailClassName(status: LeaderboardApprovalStatus): "approved" | "rejected" | "pending" {
    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";
    return "pending";
}

function formatMissionLogDetailDate(value?: string | null): string {
    return formatServerKstDateTimeDotForUser(value, "-");
}

function mapMyLogToDetailLog(log: StudentLeaderboardLogResponse): DetailMissionLog {
    return {
        submissionId: log.submissionId,
        missionId: log.missionId,
        missionName: log.missionName,
        category: log.category,
        status: log.status,
        score: log.score ?? 0,
        submittedAt: log.submittedAt ?? null,
        reviewedAt: log.reviewedAt ?? null,
    };
}

function mapCompletedMissionToDetailLog(log: LeaderboardCompletedMissionResponse): DetailMissionLog {
    return {
        submissionId: log.submissionId,
        missionId: log.missionId,
        missionName: log.missionName,
        category: log.category,
        status: "approved",
        score: log.score,
        submittedAt: null,
        reviewedAt: log.completedAt ?? null,
    };
}

function getMyRanking(data: StudentLeaderboardResponse | null): LeaderboardRankingResponse | null {
    if (!data) return null;

    return (
        data.rankings.find((ranking) => ranking.studentId === data.studentId) ??
        data.rankings.find((ranking) => ranking.rank === data.myRank && ranking.totalScore === data.myTotalScore) ??
        null
    );
}

function getProfileImageUrl(profileImage?: string | null): string | null {
    const raw = String(profileImage ?? "").trim();

    if (!raw || raw.toLowerCase().includes("default")) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const origin = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

    return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}

function MenuIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M4 7H20M4 12H20M4 17H20" stroke="#000000" strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function BackIcon(): React.ReactElement {
    return (
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M14 17L9 12L14 7" stroke="#000000" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ChevronRightIcon({ color = "#848484" }: { color?: string }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M10 7L15 12L10 17" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function FilterIcon({ active }: { active: boolean }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="#A0A0A0" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            {active ? <Path d="M20 3A3 3 0 1 0 20 9A3 3 0 0 0 20 3Z" fill="#0166FF" /> : null}
        </Svg>
    );
}

function DocumentIcon({ color }: { color: string }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M7 3H14L19 8V21H7V3Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M14 3V8H19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M10 13H16M10 17H14" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function WarningIcon({ color }: { color: string }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M12 4L21 20H3L12 4Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12 10V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
            <Path d="M12 17H12.01" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
    );
}

function TrendBadge({
    direction,
    value,
}: {
    direction?: LeaderboardRankingResponse["trendDirection"] | null;
    value?: number | null;
}): React.ReactElement {
    if (!direction || direction === "SAME" || !value) {
        return <View style={styles.trendEmpty} />;
    }

    const isUp = direction === "UP";

    return (
        <View style={styles.trendWrap}>
            <View style={isUp ? styles.trendTriangleUp : styles.trendTriangleDown} />
            <AppText style={isUp ? styles.trendTextUp : styles.trendTextDown}>{formatNumber(value)}</AppText>
        </View>
    );
}

function RankingRow({
    ranking,
    onPress,
}: {
    ranking: LeaderboardRankingResponse;
    onPress: () => void;
}): React.ReactElement {
    const isTop = ranking.rank <= 3;

    return (
        <Pressable style={styles.rankingCard} onPress={onPress}>
            <View style={[styles.rankBadge, isTop ? styles.rankBadgeTop : styles.rankBadgeNormal]}>
                <AppText style={[styles.rankBadgeText, isTop ? styles.rankBadgeTextTop : styles.rankBadgeTextNormal]}>
                    {ranking.rank}
                </AppText>
            </View>

            <AppText style={styles.studentName} numberOfLines={1}>
                {ranking.studentName}
            </AppText>

            <TrendBadge direction={ranking.trendDirection} value={ranking.trendValue} />

            <AppText style={styles.scoreText}>{formatNumber(ranking.totalScore)}</AppText>
        </Pressable>
    );
}

function MissionLogRow({
    log,
    onPress,
}: {
    log: DetailMissionLog;
    onPress: () => void;
}): React.ReactElement {
    const { t } = useTranslation();
    const isApproved = log.status === "approved";

    return (
        <Pressable style={styles.logCard} onPress={onPress}>
            <View style={styles.logTextWrap}>
                <AppText style={styles.logTitle} numberOfLines={1}>
                    {log.missionName}
                </AppText>
                <AppText style={styles.logMeta} numberOfLines={1}>
                    {getCategoryLabel(log.category, t)} · {getLogStatusLabel(log.status, t)}
                </AppText>
            </View>

            <View style={[styles.logPoint, isApproved ? styles.logPointActive : styles.logPointInactive]}>
                <AppText style={[styles.logPointText, isApproved ? styles.logPointTextActive : styles.logPointTextInactive]}>
                    +{formatNumber(log.score)}
                </AppText>
            </View>

            <ChevronRightIcon />
        </Pressable>
    );
}

function Header({
    mode = "menu",
    title,
    userProfileImg,
    onMenuClick,
    onBackClick,
    onProfileClick,
}: {
    mode?: "menu" | "back";
    title?: string;
    userProfileImg: string | null;
    onMenuClick?: () => void;
    onBackClick?: () => void;
    onProfileClick: () => void;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            {mode === "back" ? (
                <Pressable style={commonStyles.iconbtn} onPress={onBackClick} accessibilityLabel={t(`${LEADERBOARD_T}.aria.back`)}>
                    <BackIcon />
                </Pressable>
            ) : (
                <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel={t("common.menu")}>
                    <MenuIcon />
                </Pressable>
            )}

            <AppText style={styles.appTitle} numberOfLines={1}>
                {title ?? ""}
            </AppText>

            <Pressable style={styles.profileButton} onPress={onProfileClick} accessibilityLabel={t("menu.profile")}>
                {userProfileImg ? (
                    <View style={styles.profileImageOuter}>
                        <Svg width={32} height={32} viewBox="0 0 32 32">
                            <Path d="M16 16C18.7614 16 21 13.7614 21 11C21 8.23858 18.7614 6 16 6C13.2386 6 11 8.23858 11 11C11 13.7614 13.2386 16 16 16ZM7 27C7.8 22.5 11.3 20 16 20C20.7 20 24.2 22.5 25 27" stroke="#808080" strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                    </View>
                ) : (
                    <View style={styles.profilePlaceholder}>
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                            <Path d="M20 21C20 17.6863 16.4183 15 12 15C7.58172 15 4 17.6863 4 21M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </View>
                )}
            </Pressable>
        </View>
    );
}

export default function EcaStudentLeaderboard({
    route,
    navigation,
}: Props): React.ReactElement {
    const { t } = useTranslation();
    const { externalActivityId } = route.params;

    const [menuOpen, setMenuOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [myActivities, setMyActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [leaderboard, setLeaderboard] = React.useState<StudentLeaderboardResponse | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [errorMessage, setErrorMessage] = React.useState("");

    const [detailTarget, setDetailTarget] = React.useState<LeaderboardDetailTarget | null>(null);
    const [detailLogs, setDetailLogs] = React.useState<DetailMissionLog[]>([]);
    const [isLogLoading, setIsLogLoading] = React.useState(false);
    const [selectedMissionLogCategories, setSelectedMissionLogCategories] = React.useState<MissionLogCategoryFilter[]>(() => getAllMissionLogCategories());
    const [isLogFilterOpen, setIsLogFilterOpen] = React.useState(false);
    const [selectedMissionLog, setSelectedMissionLog] = React.useState<DetailMissionLog | null>(null);

    const userName = (me?.name ?? "").trim() || "User";
    const userEmail = (me?.email ?? "").trim();
    const userRoleSet = Array.isArray(me?.roleSet) ? me.roleSet : [];
    const userProfileImg = getProfileImageUrl(me?.profileImage);

    const myRanking = getMyRanking(leaderboard);
    const displayName = myRanking?.studentName ?? ((me?.name ?? "").trim() || (me?.email ?? "").trim() || t(`${LEADERBOARD_T}.me`, { defaultValue: "Me" }));
    const rankings = leaderboard?.rankings ?? [];

    const filteredDetailLogs = React.useMemo(() => {
        if (selectedMissionLogCategories.length === 0) return [];
        if (selectedMissionLogCategories.length === LEADERBOARD_MISSION_CATEGORY_OPTIONS.length) return detailLogs;

        return detailLogs.filter((log) => selectedMissionLogCategories.includes(log.category));
    }, [detailLogs, selectedMissionLogCategories]);

    React.useEffect(() => {
        let mounted = true;

        async function loadLeaderboard(): Promise<void> {
            setLoading(true);
            setErrorMessage("");

            try {
                const [meData, activityListData, activityData, leaderboardData] = await Promise.all([
                    getUserMe(),
                    getMyParticipatingExternalActivities(),
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyLeaderboard(externalActivityId, { page: 0, size: 20 }),
                ]);

                if (!mounted) return;

                setMe(meData);
                setMyActivities([...activityListData].sort((a, b) => a.externalActivityId - b.externalActivityId));
                setActivity(activityData);
                setLeaderboard(leaderboardData);
            } catch (error) {
                if (!mounted) return;

                console.error(error);
                setActivity(null);
                setLeaderboard(null);
                setErrorMessage(error instanceof Error ? error.message : t(`${LEADERBOARD_T}.error.leaderboardLoadFailed`, { defaultValue: "리더보드 정보를 불러오지 못했습니다." }));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        void loadLeaderboard();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, t]);

    React.useEffect(() => {
        let mounted = true;

        async function loadLogs(): Promise<void> {
            if (!detailTarget) return;

            try {
                setIsLogLoading(true);

                if (detailTarget.type === "me") {
                    const response = await getMyLeaderboardMissionLogs(externalActivityId, {
                        category: null,
                        page: 0,
                        size: 100,
                    });

                    if (!mounted) return;

                    setDetailLogs(response.logs.map(mapMyLogToDetailLog));
                    return;
                }

                const response = await getStudentLeaderboardCompletedMissions(externalActivityId, detailTarget.studentId, {
                    category: null,
                    page: 0,
                    size: 100,
                });

                if (!mounted) return;

                setDetailLogs(response.missions.map(mapCompletedMissionToDetailLog));
            } catch (error) {
                console.error(error);

                if (!mounted) return;

                setDetailLogs([]);
            } finally {
                if (mounted) setIsLogLoading(false);
            }
        }

        void loadLogs();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, detailTarget]);

    function requireAuth(action: () => void): void {
        void getAccessToken().then((token) => {
            if (!token) {
                Alert.alert("로그인이 필요합니다.", "로그인 후 이용할 수 있습니다.");
                return;
            }

            action();
        });
    }

    function moveHome(): void {
        navigation.navigate("StudentHome");
    }

    function moveMyPage(): void {
        navigation.navigate("MyPage");
    }

    function moveVlogHome(): void {
        navigation.navigate("VlogHome");
    }

    function moveActivityMenu(activityId: number, menuKey: ActivityMenuKey): void {
        requireAuth(() => {
            if (menuKey === "dashboard") {
                navigation.navigate("EcaStudentDashboard", { externalActivityId: String(activityId) });
                return;
            }

            if (menuKey === "assignment") {
                navigation.navigate("EcaStudentAssignment", { externalActivityId: String(activityId) });
                return;
            }

            if (menuKey === "attendance") {
                navigation.navigate("EcaStudentMobileAttendance", { externalActivityId: String(activityId) });
                return;
            }

            if (menuKey === "leaderboard") {
                navigation.navigate("EcaStudentLeaderboard", { externalActivityId: String(activityId) });
                return;
            }

            Alert.alert("서비스 준비중입니다.");
        });
    }

    function moveSystemAdmin(): void {
        Alert.alert("앱에서는 관리자 페이지를 지원하지 않습니다.");
    }

    function moveJumpAdmin(): void {
        Alert.alert("앱에서는 관리자 페이지를 지원하지 않습니다.");
    }

    function moveKakaoAdmin(): void {
        Alert.alert("앱에서는 관리자 페이지를 지원하지 않습니다.");
    }

    function openRankingDetail(ranking: LeaderboardRankingResponse): void {
        setSelectedMissionLog(null);
        setSelectedMissionLogCategories(getAllMissionLogCategories());
        setDetailLogs([]);

        setDetailTarget({
            type: leaderboard?.studentId === ranking.studentId ? "me" : "student",
            studentId: ranking.studentId,
            name: ranking.studentName,
            rank: ranking.rank,
            totalScore: ranking.totalScore,
        });
    }

    function openMyDetail(): void {
        if (!leaderboard) return;

        setSelectedMissionLog(null);
        setSelectedMissionLogCategories(getAllMissionLogCategories());
        setDetailLogs([]);

        setDetailTarget({
            type: "me",
            studentId: leaderboard.studentId,
            name: displayName,
            rank: leaderboard.myRank ?? myRanking?.rank ?? null,
            totalScore: leaderboard.myTotalScore,
        });
    }

    function closeDetail(): void {
        setDetailTarget(null);
        setDetailLogs([]);
        setSelectedMissionLog(null);
    }

    function goToLeaderboardMissions(): void {
        navigation.navigate("EcaStudentLeaderboardMission", { externalActivityId });
    }

    function toggleMissionLogCategoryFilter(category: MissionLogCategoryFilter): void {
        setSelectedMissionLogCategories((prev) =>
            prev.includes(category)
                ? prev.filter((item) => item !== category)
                : [...prev, category]
        );
    }

    function selectAllMissionLogCategories(): void {
        setSelectedMissionLogCategories(getAllMissionLogCategories());
    }

    function isAllMissionLogCategorySelected(): boolean {
        return selectedMissionLogCategories.length === LEADERBOARD_MISSION_CATEGORY_OPTIONS.length;
    }

    function openMissionLogDetail(log: DetailMissionLog): void {
        setIsLogFilterOpen(false);
        setSelectedMissionLog(log);
    }

    function handleMissionLogDetailButtonClick(log: DetailMissionLog): void {
        setSelectedMissionLog(null);

        if (log.status === "rejected") {
            goToLeaderboardMissions();
        }
    }

    function renderMissionLogFilterModal(): React.ReactElement {
        return (
            <Modal visible={isLogFilterOpen} transparent animationType="fade" onRequestClose={() => setIsLogFilterOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setIsLogFilterOpen(false)}>
                    <Pressable style={styles.filterSheet} onPress={() => {}}>
                        <Pressable
                            style={[styles.filterOption, isAllMissionLogCategorySelected() ? styles.filterOptionSelected : null]}
                            onPress={selectAllMissionLogCategories}
                        >
                            <AppText style={styles.filterOptionText}>
                                {t(`${LEADERBOARD_T}.filter.all`, { defaultValue: "All" })}
                            </AppText>
                        </Pressable>

                        {LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => {
                            const selected = selectedMissionLogCategories.includes(option.value);

                            return (
                                <Pressable
                                    key={option.value}
                                    style={[styles.filterOption, selected ? styles.filterOptionSelected : null]}
                                    onPress={() => toggleMissionLogCategoryFilter(option.value)}
                                >
                                    <AppText style={styles.filterOptionText}>
                                        {getCategoryLabel(option.value, t)}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>
        );
    }

    function renderMissionLogDetailModal(): React.ReactElement {
        const log = selectedMissionLog;
        const statusClassName = log ? getMissionLogDetailClassName(log.status) : "pending";
        const isRejected = log?.status === "rejected";
        const displayDate = formatMissionLogDetailDate(log?.reviewedAt ?? log?.submittedAt);
        const actionLabel = isRejected
            ? t(`${LEADERBOARD_T}.detail.retry`, { defaultValue: "Retry" })
            : t(`${LEADERBOARD_T}.detail.ok`, { defaultValue: "OK" });

        const activeColor = statusClassName === "approved" ? "#0166FF" : "#808080";

        return (
            <Modal visible={!!log} animationType="slide" onRequestClose={() => setSelectedMissionLog(null)}>
                <SafeAreaView style={styles.detailModalPage}>
                    {log ? (
                        <>
                            <Pressable style={styles.detailBackButton} onPress={() => setSelectedMissionLog(null)}>
                                <BackIcon />
                            </Pressable>

                            <View style={styles.logDetailCard}>
                                <View style={styles.logDetailTop}>
                                    <View style={[
                                        styles.logDetailIcon,
                                        statusClassName === "approved" ? styles.statusBgApproved : styles.statusBgInactive,
                                    ]}>
                                        {log.status === "rejected" ? (
                                            <WarningIcon color={activeColor} />
                                        ) : (
                                            <DocumentIcon color={activeColor} />
                                        )}
                                    </View>

                                    <View style={styles.logDetailTextWrap}>
                                        <AppText style={styles.logDetailTitle} numberOfLines={1}>
                                            {log.missionName}
                                        </AppText>
                                        <AppText style={styles.logDetailDate}>
                                            {displayDate}
                                        </AppText>
                                    </View>

                                    <View style={[
                                        styles.logDetailPoint,
                                        statusClassName === "approved" ? styles.statusBgApproved : styles.statusBgInactive,
                                    ]}>
                                        <AppText style={[
                                            styles.logDetailPointText,
                                            statusClassName === "approved" ? styles.statusTextApproved : styles.statusTextInactive,
                                        ]}>
                                            +{formatNumber(log.score)}
                                        </AppText>
                                    </View>
                                </View>

                                <View style={[
                                    styles.logDetailStatus,
                                    statusClassName === "approved" ? styles.statusBgApproved : styles.statusBgInactive,
                                ]}>
                                    <AppText style={[
                                        styles.logDetailStatusText,
                                        statusClassName === "approved" ? styles.statusTextApproved : styles.statusTextInactive,
                                    ]}>
                                        {getMissionLogDetailStatusLabel(log.status, t)}
                                    </AppText>
                                </View>
                            </View>

                            <Pressable style={styles.detailActionButton} onPress={() => handleMissionLogDetailButtonClick(log)}>
                                <AppText style={styles.detailActionButtonText}>{actionLabel}</AppText>
                            </Pressable>
                        </>
                    ) : null}
                </SafeAreaView>
            </Modal>
        );
    }

    function renderDetailPage(): React.ReactElement {
        if (!detailTarget) {
            return <View />;
        }

        const isMyDetail = detailTarget.type === "me";
        const filterActive = !isAllMissionLogCategorySelected();

        return (
            <SafeAreaView style={commonStyles.appRoot}>
                <Header
                    mode="back"
                    title=""
                    userProfileImg={userProfileImg}
                    onBackClick={closeDetail}
                    onProfileClick={moveMyPage}
                />

                <ScrollView style={styles.detailMain} contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.myPointCard}>
                        <AppText style={styles.myPointLabel}>
                            {isMyDetail
                                ? t(`${LEADERBOARD_T}.myPoint`, { defaultValue: "My Point" })
                                : detailTarget.name}
                        </AppText>

                        <AppText style={styles.myPointValue}>
                            {formatNumber(detailTarget.totalScore)}
                        </AppText>

                        <AppText style={styles.myPointRank}>
                            {formatPlaceLabel(detailTarget.rank, t)}
                        </AppText>
                    </View>

                    <View style={styles.logSection}>
                        <View style={styles.logTitleRow}>
                            <AppText style={styles.logSectionTitle}>
                                {t(`${LEADERBOARD_T}.missionLog`, { defaultValue: "Mission Log" })}
                            </AppText>

                            <Pressable style={styles.filterButton} onPress={() => setIsLogFilterOpen(true)}>
                                <FilterIcon active={filterActive} />
                            </Pressable>
                        </View>

                        <View style={styles.logList}>
                            {isLogLoading ? (
                                <View style={styles.stateSmall}>
                                    <ActivityIndicator color="#0166FF" />
                                </View>
                            ) : filteredDetailLogs.length > 0 ? (
                                filteredDetailLogs.map((log) => (
                                    <MissionLogRow
                                        key={`${log.submissionId}-${log.missionId}`}
                                        log={log}
                                        onPress={() => openMissionLogDetail(log)}
                                    />
                                ))
                            ) : (
                                <View style={styles.emptyWrap}>
                                    <AppText style={styles.emptyText}>
                                        {t(`${LEADERBOARD_T}.missionLogEmpty`, { defaultValue: "No mission logs." })}
                                    </AppText>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>

                {isMyDetail ? (
                    <Pressable style={styles.getPointButton} onPress={goToLeaderboardMissions}>
                        <AppText style={styles.getPointButtonText}>
                            {t(`${LEADERBOARD_T}.getPoint`, { defaultValue: "Get Point" })}
                        </AppText>
                    </Pressable>
                ) : null}

                {renderMissionLogFilterModal()}
                {renderMissionLogDetailModal()}
            </SafeAreaView>
        );
    }

    function renderMainPage(): React.ReactElement {
        return (
            <SafeAreaView style={commonStyles.appRoot}>
                <Header
                    mode="menu"
                    userProfileImg={userProfileImg}
                    onMenuClick={() => setMenuOpen(true)}
                    onProfileClick={moveMyPage}
                />

                <ScrollView style={styles.main} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.titleSection}>
                        <AppText style={styles.activityTitle}>
                            {activity?.name ?? t(`${LEADERBOARD_T}.activityFallback`, { defaultValue: "대외활동" })}
                        </AppText>
                    </View>

                    <View style={styles.tabSection}>
                        <AppText style={styles.tabText}>
                            {t(`${LEADERBOARD_T}.ranking`, { defaultValue: "Ranking" })}
                        </AppText>
                    </View>

                    {loading ? (
                        <View style={styles.state}>
                            <ActivityIndicator color="#0166FF" />
                        </View>
                    ) : errorMessage ? (
                        <View style={styles.state}>
                            <AppText style={styles.emptyText}>{errorMessage}</AppText>
                        </View>
                    ) : (
                        <View style={styles.rankingList}>
                            {rankings.length > 0 ? (
                                rankings.map((ranking) => (
                                    <RankingRow
                                        key={ranking.studentId}
                                        ranking={ranking}
                                        onPress={() => openRankingDetail(ranking)}
                                    />
                                ))
                            ) : (
                                <View style={styles.emptyWrap}>
                                    <AppText style={styles.emptyText}>
                                        {t(`${LEADERBOARD_T}.rankingEmpty`, { defaultValue: "No rankings." })}
                                    </AppText>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {leaderboard ? (
                    <Pressable style={styles.myFloatingCard} onPress={openMyDetail}>
                        <View style={styles.myRankBadge}>
                            <AppText style={styles.myRankText}>
                                {leaderboard.myRank ?? myRanking?.rank ?? "-"}
                            </AppText>
                        </View>

                        <AppText style={styles.myNameText} numberOfLines={1}>
                            {displayName}
                        </AppText>

                        <AppText style={styles.myScoreText}>
                            {formatNumber(leaderboard.myTotalScore)}
                        </AppText>

                        <ChevronRightIcon color="#FFFFFF" />
                    </Pressable>
                ) : null}
            </SafeAreaView>
        );
    }

    return (
        <EcaStudentApp
            externalActivityId={externalActivityId}
            activeTab="leaderboard"
            overlay={(
                <StudentMobileSideMenu
                    isOpen={menuOpen}
                    onClose={() => setMenuOpen(false)}
                    userName={userName}
                    userEmail={userEmail}
                    userProfileImg={userProfileImg}
                    userRoleSet={userRoleSet}
                    activities={myActivities}
                    currentActivityId={Number(externalActivityId)}
                    currentActivityMenu="leaderboard"
                    onMoveHome={moveHome}
                    onMoveMyPage={moveMyPage}
                    onMoveActivityMenu={moveActivityMenu}
                    onMoveSystemAdmin={moveSystemAdmin}
                    onMoveJumpAdmin={moveJumpAdmin}
                    onMoveKakaoAdmin={moveKakaoAdmin}
                    onMoveVlogHome={moveVlogHome}
                />
            )}
        >
            {detailTarget ? renderDetailPage() : renderMainPage()}
        </EcaStudentApp>
    );
}