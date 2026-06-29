import React from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../../../../../AppText";
import { getUserDateOnly, getUserTimeZone, parseServerKstDateTime, } from "../../../../../theme/dateTime";
import type { StudentStackParamList } from "../../../../../navigation/StudentNavigator";
import { API_BASE_URL } from "@env";
import { getAccessToken } from "../../../../../auth/tokenStorage";
import { getUserMe } from "../../../../../api/client";
import type { UserMe } from "../../../../../api/client";
import { getMyAttendanceEvents, getMyExternalActivityAssignments, getMyParticipatingExternalActivities, getMyParticipatingExternalActivity, } from "../../../../../api/ea";
import type { MyAttendanceEventResponse, StudentAssignmentResponse, StudentExternalActivityDetailResponse, StudentExternalActivityResponse, } from "../../../../../api/ea";
import EcaStudentApp from "../../EcaStudentApp";
import StudentMobileSideMenu from "../../../StudentSideMenu";
import { commonStyles } from "../../../../../theme/common.Style";
import { styles } from "./EcaStudentDashboard.style";

const DASHBOARD_T = "ecaStudent.dashboardPage";
const SCHEDULE_FILTER_VALUES: ScheduleTypeFilter[] = ["attendance", "assignment"];
type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentDashboard">;

type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "leaderboard" | "team-activity";

type ScheduleTypeFilter = "assignment" | "attendance";
type ScheduleSortDirection = "asc" | "desc";

type MobileScheduleItem = {
    id: number;
    title: string;
    date: string;
    sortTime: number;
    type: ScheduleTypeFilter;
    completed: boolean;
};

type UserDateParts = {
    year: number;
    month: number;
    day: number;
};

function getScheduleFilterOptions(t: TFunction): { value: ScheduleTypeFilter; label: string }[] {
    return SCHEDULE_FILTER_VALUES.map((value) => ({
        value,
        label: t(`${DASHBOARD_T}.scheduleType.${value}`),
    }));
}

function formatDateOnlyDot(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}.${month}.${day}.`;
}

function parseDateOnlyLocal(value?: string | null): Date | null {
    if (!value) return null;

    const [year, month, day] = value.split("-").map(Number);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function getServerKstUserDateParts(value?: string | null): UserDateParts | null {
    const date = parseServerKstDateTime(value);

    if (!date) return null;

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: getUserTimeZone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    return { year, month, day };
}

function formatToday(t: TFunction, language: string): string {
    const date = getUserDateOnly();

    if (language.toLowerCase().startsWith("en")) {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        }).format(date);
    }

    const weekday = t(`${DASHBOARD_T}.weekday.${date.getDay()}`);

    return t(`${DASHBOARD_T}.todayFormat`, {
        month: date.getMonth() + 1,
        day: date.getDate(),
        weekday,
    });
}

function formatTargetDate(date: Date, language?: string): string {
    if (language?.toLowerCase().startsWith("en")) {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        }).format(date);
    }

    return formatDateOnlyDot(date);
}

function formatUserDateParts(parts: UserDateParts, language?: string): string {
    if (language?.toLowerCase().startsWith("en")) {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: "UTC",
            weekday: "short",
            month: "short",
            day: "numeric",
        }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
    }

    const month = String(parts.month).padStart(2, "0");
    const day = String(parts.day).padStart(2, "0");

    return `${parts.year}.${month}.${day}.`;
}

function formatDate(value?: string | null, language?: string): string {
    if (!value) return "-";

    if (value.includes("T")) {
        const userDateParts = getServerKstUserDateParts(value);

        return userDateParts ? formatUserDateParts(userDateParts, language) : value;
    }

    const date = parseDateOnlyLocal(value);

    return date ? formatTargetDate(date, language) : value;
}

function getScheduleSortTime(value?: string | null): number {
    if (!value) return Number.MAX_SAFE_INTEGER;

    if (value.includes("T")) {
        const userDateParts = getServerKstUserDateParts(value);

        return userDateParts ? Date.UTC(userDateParts.year, userDateParts.month - 1, userDateParts.day) : Number.MAX_SAFE_INTEGER;
    }

    const date = parseDateOnlyLocal(value);

    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function getDateProgressRate(startDate?: string | null, endDate?: string | null): number {
    if (!startDate || !endDate) return 0;

    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    const oneDay = 1000 * 60 * 60 * 24;

    if (endDateOnly < startDateOnly) return 0;
    if (todayDate < startDateOnly) return 0;
    if (todayDate > endDateOnly) return 100;

    const totalDays = Math.floor((endDateOnly - startDateOnly) / oneDay) + 1;
    const elapsedDays = Math.floor((todayDate - startDateOnly) / oneDay) + 1;

    return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
}

function isCompletedAssignment(assignment: StudentAssignmentResponse): boolean {
    return assignment.status === "SUBMITTED" || assignment.status === "LATE_SUBMITTED";
}

function isCompletedAttendance(event: MyAttendanceEventResponse): boolean {
    return event.status === "PRESENT"
        || event.status === "LATE"
        || event.status === "VERY_LATE"
        || event.status === "EARLY_LEAVE"
        || event.status === "VERY_EARLY_LEAVE";
}

function formatAttendanceScheduleTitle(
    event: MyAttendanceEventResponse,
    t: TFunction,
    baseDateParts: UserDateParts | null
): string {
    const typeText = t(`${DASHBOARD_T}.attendanceType.${event.type}`);

    if (!baseDateParts) {
        return t(`${DASHBOARD_T}.attendanceNameWithType`, {
            name: event.name,
            type: typeText,
        });
    }

    return t(`${DASHBOARD_T}.attendanceScheduleTitle`, {
        month: baseDateParts.month,
        day: baseDateParts.day,
        type: typeText,
    });
}

function toScheduleItems(
    assignments: StudentAssignmentResponse[],
    attendanceEvents: MyAttendanceEventResponse[],
    t: TFunction,
    language: string
): MobileScheduleItem[] {
    const assignmentItems = assignments.map((assignment) => {
        const scheduleDate = assignment.deadlineAt;

        return {
            id: assignment.assignmentId,
            title: assignment.name,
            date: formatDate(scheduleDate, language),
            sortTime: getScheduleSortTime(scheduleDate),
            type: "assignment" as const,
            completed: isCompletedAssignment(assignment),
        };
    });

    const attendanceItems = attendanceEvents.map((event) => {
        const scheduleDate = event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
        const userDateParts = getServerKstUserDateParts(scheduleDate);

        return {
            id: event.eventId,
            title: formatAttendanceScheduleTitle(event, t, userDateParts),
            date: userDateParts ? formatUserDateParts(userDateParts, language) : formatDate(scheduleDate, language),
            sortTime: userDateParts ? Date.UTC(userDateParts.year, userDateParts.month - 1, userDateParts.day) : getScheduleSortTime(scheduleDate),
            type: "attendance" as const,
            completed: isCompletedAttendance(event),
        };
    });

    return [...assignmentItems, ...attendanceItems];
}
function getProfileImageUrl(profileImage?: string | null): string | null {
    const raw = String(profileImage ?? "").trim();

    if (!raw || raw.toLowerCase().includes("default")) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const origin = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

    return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}

function BellIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ArrowRightIcon(): React.ReactElement {
    return (
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path d="M8 5L13 10L8 15" stroke="#A0A0A0" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function CompletedIcon(): React.ReactElement {
    return (
        <Svg width={26} height={26} viewBox="0 0 26 26" fill="none">
            <Path d="M25 13C25 19.6274 19.6274 25 13 25C6.37258 25 1 19.6274 1 13C1 6.37258 6.37258 1 13 1C14.8827 1 16.6642 1.43358 18.25 2.20635M22.75 5.5L12.25 16L9.25 13" stroke="#0166FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function AssignmentFolderIcon(): React.ReactElement {
    return (
        <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
            <Path d="M3.20157 11.2221L3.20144 24.5879C3.20142 25.6925 4.09686 26.5879 5.20143 26.5879L26.7997 26.588C27.9043 26.588 28.7997 25.6926 28.7997 24.588L28.8002 10.3498C28.8002 9.79754 28.3525 9.3498 27.8002 9.3498H16.1118L12.4251 5.41162H4.20057C3.64814 5.41162 3.20036 5.85813 3.20054 6.41057C3.20095 7.65588 3.20158 9.79409 3.20157 11.2221Z" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function FilterIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M22.125 7.875H1.875C1.57663 7.875 1.29048 7.75647 1.0795 7.5455C0.868526 7.33452 0.75 7.04837 0.75 6.75C0.75 6.45163 0.868526 6.16548 1.0795 5.9545C1.29048 5.74353 1.57663 5.625 1.875 5.625H22.125C22.4234 5.625 22.7095 5.74353 22.9205 5.9545C23.1315 6.16548 23.25 6.45163 23.25 6.75C23.25 7.04837 23.1315 7.33452 22.9205 7.5455C22.7095 7.75647 22.4234 7.875 22.125 7.875ZM18.375 13.125H5.625C5.32663 13.125 5.04048 13.0065 4.8295 12.7955C4.61853 12.5845 4.5 12.2984 4.5 12C4.5 11.7016 4.61853 11.4155 4.8295 11.2045C5.04048 10.9935 5.32663 10.875 5.625 10.875H18.375C18.6734 10.875 18.9595 10.9935 19.1705 11.2045C19.3815 11.4155 19.5 11.7016 19.5 12C19.5 12.2984 19.3815 12.5845 19.1705 12.7955C18.9595 13.0065 18.6734 13.125 18.375 13.125ZM13.875 18.375H10.125C9.82663 18.375 9.54048 18.2565 9.3295 18.0455C9.11853 17.8345 9 17.5484 9 17.25C9 16.9516 9.11853 16.6655 9.3295 16.4545C9.54048 16.2435 9.82663 16.125 10.125 16.125H13.875C14.1734 16.125 14.4595 16.2435 14.6705 16.4545C14.8815 16.6655 15 16.9516 15 17.25C15 17.5484 14.8815 17.8345 14.6705 18.0455C14.4595 18.2565 14.1734 18.375 13.875 18.375Z" fill="#000000" />
        </Svg>
    );
}

function SortIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M21 6.375L17.625 3L14.25 6.375M17.625 3L17.625 21M3 17.625L6.375 21L9.75 17.625M6.375 21L6.375 3" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function Header({
    onMenuClick,
    onNotificationClick,
    onProfileClick,
    userProfileImg,
}: {
    onMenuClick: () => void;
    onNotificationClick: () => void;
    onProfileClick: () => void;
    userProfileImg: string | null;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel={t("common.menu")}>
                <Image source={require("../../../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
            </Pressable>

            <AppText style={styles.appTitle} />

            <View style={styles.topActions}>
                <Pressable
                    style={styles.dashboardIconButton}
                    onPress={onNotificationClick}
                    accessibilityLabel={t(`${DASHBOARD_T}.aria.notification`)}
                >
                    <BellIcon />
                </Pressable>

                <Pressable
                    style={styles.profileButton}
                    onPress={onProfileClick}
                    accessibilityLabel={t("menu.settings")}
                >
                    {userProfileImg ? (
                        <Image source={{ uri: userProfileImg }} style={styles.profileImage} />
                    ) : (
                        <Image source={require("../../../../../assets/images/internie_mascot_normal.png")} style={styles.profileImage} />
                    )}
                </Pressable>
            </View>
        </View>
    );
}

export default function EcaStudentDashboard({
    route,
    navigation,
}: Props): React.ReactElement {
    const { t, i18n } = useTranslation();
    const { externalActivityId } = route.params;

    const [menuOpen, setMenuOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [myActivities, setMyActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [assignments, setAssignments] = React.useState<StudentAssignmentResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const [attendanceEvents, setAttendanceEvents] = React.useState<MyAttendanceEventResponse[]>([]);
    const [selectedScheduleTypes, setSelectedScheduleTypes] = React.useState<ScheduleTypeFilter[]>(["attendance", "assignment"]);
    const [scheduleSortDirection, setScheduleSortDirection] = React.useState<ScheduleSortDirection>("asc");
    const [scheduleFilterOpen, setScheduleFilterOpen] = React.useState(false);

    const userName = (me?.name ?? "").trim() || "User";
    const userEmail = (me?.email ?? "").trim();
    const userRoleSet = Array.isArray(me?.roleSet) ? me.roleSet : [];
    const userProfileImg = getProfileImageUrl(me?.profileImage);

    React.useEffect(() => {
        let mounted = true;

        async function fetchDashboard(): Promise<void> {
            setLoading(true);
            setError("");

            try {
                const [meData, activityListData, activityData, assignmentData, attendanceData] = await Promise.all([
                    getUserMe(),
                    getMyParticipatingExternalActivities(),
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyExternalActivityAssignments(externalActivityId),
                    getMyAttendanceEvents(externalActivityId),
                ]);

                if (!mounted) return;

                setMe(meData);
                setMyActivities([...activityListData].sort((a, b) => a.externalActivityId - b.externalActivityId));
                setActivity(activityData);
                setAssignments(assignmentData);
                setAttendanceEvents(attendanceData);
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setActivity(null);
                setAssignments([]);
                setAttendanceEvents([]);
                setError(t(`${DASHBOARD_T}.error.dashboardLoadFailed`));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchDashboard();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, t]);

    const progressRate = getDateProgressRate(activity?.startDate, activity?.endDate);
    const completedAssignmentCount = assignments.filter(isCompletedAssignment).length;
    const assignmentRate = assignments.length === 0 ? 0 : Math.round((completedAssignmentCount / assignments.length) * 100);
    const scheduleFilterOptions = React.useMemo(() => getScheduleFilterOptions(t), [t]);
    const scheduleLanguage = i18n.resolvedLanguage ?? i18n.language;

    const scheduleItems = React.useMemo(() => {
        return toScheduleItems(assignments, attendanceEvents, t, scheduleLanguage)
            .filter((item) => selectedScheduleTypes.includes(item.type))
            .sort((a, b) =>
                scheduleSortDirection === "asc"
                    ? a.sortTime - b.sortTime
                    : b.sortTime - a.sortTime
            );
    }, [
        assignments,
        attendanceEvents,
        selectedScheduleTypes,
        scheduleSortDirection,
        t,
        scheduleLanguage,
    ]);

    function openAttendanceSubmit(eventId: number): void {
        navigation.navigate("EcaStudentMobileAttendanceSubmit", {
            externalActivityId,
            eventId,
        });
    }

    function toggleScheduleTypeFilter(type: ScheduleTypeFilter): void {
        setSelectedScheduleTypes((prev) =>
            prev.includes(type)
                ? prev.filter((item) => item !== type)
                : [...prev, type]
        );
    }

    function toggleScheduleSortDirection(): void {
        setScheduleSortDirection((prev) => prev === "asc" ? "desc" : "asc");
    }

    function getScheduleFilterLabel(): string {
        if (selectedScheduleTypes.length === scheduleFilterOptions.length) {
            return t(`${DASHBOARD_T}.filter.allTypes`);
        }

        if (selectedScheduleTypes.length === 0) {
            return t(`${DASHBOARD_T}.filter.noTypes`);
        }

        return scheduleFilterOptions
            .filter((option) => selectedScheduleTypes.includes(option.value))
            .map((option) => option.label)
            .join(", ");
    }

    function requireAuth(action: () => void): void {
        void getAccessToken().then((token) => {
            if (!token) {
                Alert.alert(t("login.getLoginTitle"), t("login.getLoginSub"));
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

            Alert.alert(t("common.preparing"));
        });
    }

    function moveSystemAdmin(): void {
        Alert.alert(t("common.adminUnsupported"));
    }

    function moveJumpAdmin(): void {
        Alert.alert(t("common.adminUnsupported"));
    }

    function moveKakaoAdmin(): void {
        Alert.alert(t("common.adminUnsupported"));
    }

    function openAssignmentList(): void {
        navigation.navigate("EcaStudentAssignment", { externalActivityId });
    }

    function openAssignmentSubmit(assignmentId: number): void {
        navigation.navigate("EcaStudentAssignmentSubmit", {
            externalActivityId,
            assignmentId: String(assignmentId),
        });
    }

    function openLeaderboard(): void {
        navigation.navigate("EcaStudentLeaderboard", { externalActivityId });
    }

    function openNotification(): void {
        navigation.navigate("EcaStudentNotification", { externalActivityId });
    }

    return (
        <EcaStudentApp
            externalActivityId={externalActivityId}
            activeTab="dashboard"
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
                    currentActivityMenu="dashboard"
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
            <SafeAreaView style={commonStyles.appRoot}>
                <Header onMenuClick={() => setMenuOpen(true)} onNotificationClick={openNotification} onProfileClick={moveMyPage} userProfileImg={userProfileImg}/>

                <ScrollView style={styles.main} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.titleSection}>
                        <AppText style={styles.todayText}>{formatToday(t, i18n.resolvedLanguage ?? i18n.language)}</AppText>
                        <AppText style={styles.activityTitle}>{activity?.name ?? t(`${DASHBOARD_T}.activityFallback`)}</AppText>
                    </View>

                    {loading ? (
                        <View style={styles.emptyWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : error ? (
                        <View style={styles.emptyWrap}>
                            <AppText style={styles.empty}>{error}</AppText>
                        </View>
                    ) : (
                        <>
                            {/* <View style={styles.progressCard}>
                                <AppText style={styles.progressLabel}>활동 진행률</AppText>
                                <AppText style={styles.progressValue}>{progressRate}%</AppText>

                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${progressRate}%` }]} />
                                </View>
                            </View>

                            <Pressable style={styles.metricCard} onPress={openAssignmentList}>
                                <View style={styles.metricTextWrap}>
                                    <AppText style={styles.metricLabel}>나의 과제</AppText>
                                    <AppText style={styles.metricValue}>{assignmentRate}%</AppText>
                                </View>

                                <View style={styles.metricBadge}>
                                    <AppText style={styles.metricBadgeText}>{assignments.length}개</AppText>
                                </View>

                                <View style={styles.metricArrow}>
                                    <ArrowRightIcon />
                                </View>
                            </Pressable>

                            <Pressable style={styles.metricCard} onPress={() => Alert.alert("서비스 준비중입니다.")}>
                                <View style={styles.metricTextWrap}>
                                    <AppText style={styles.metricLabel}>나의 출석</AppText>
                                    <AppText style={styles.metricValue}>준비중</AppText>
                                </View>

                                <View style={[styles.metricBadge, styles.metricBadgePrimary]}>
                                    <AppText style={[styles.metricBadgeText, styles.metricBadgeTextPrimary]}>-</AppText>
                                </View>

                                <View style={styles.metricArrow}>
                                    <ArrowRightIcon />
                                </View>
                            </Pressable> */}

                            <View style={styles.scheduleSection}>
                                <View style={styles.scheduleHead}>
                                    <AppText style={styles.scheduleTitle}>{t(`${DASHBOARD_T}.scheduleTitle`)}</AppText>
                                    <View style={styles.scheduleActions}>
                                        <Pressable style={styles.scheduleActionButton} onPress={() => setScheduleFilterOpen(true)} accessibilityLabel={getScheduleFilterLabel()}><FilterIcon /></Pressable>
                                        <Pressable
                                            style={styles.scheduleActionButton}
                                            onPress={toggleScheduleSortDirection}
                                            accessibilityLabel={
                                                scheduleSortDirection === "asc"
                                                    ? t(`${DASHBOARD_T}.sort.asc`)
                                                    : t(`${DASHBOARD_T}.sort.desc`)
                                            }
                                        >
                                            <SortIcon />
                                        </Pressable>
                                    </View>
                                </View>
                                <View style={styles.scheduleList}>
                                    {scheduleItems.length === 0 ? (
                                        <View style={styles.emptyWrap}>
                                            <AppText style={styles.empty}>{t(`${DASHBOARD_T}.emptySchedule`)}</AppText>
                                        </View>
                                    ) : (
                                        scheduleItems.map((item) => (
                                            <Pressable
                                                key={`${item.type}-${item.id}`}
                                                style={styles.scheduleItem}
                                                onPress={() => {
                                                    if (item.type === "assignment") {
                                                        openAssignmentSubmit(item.id);
                                                        return;
                                                    }

                                                    if (item.type === "attendance") {
                                                        openAttendanceSubmit(item.id);
                                                    }
                                                }}
                                            >
                                                <View style={[styles.scheduleIcon, item.completed ? styles.scheduleIconCompleted : null]}>
                                                    {item.completed ? <CompletedIcon /> : <AssignmentFolderIcon />}
                                                </View>

                                                <View style={styles.scheduleTextWrap}>
                                                    <AppText style={styles.scheduleItemTitle} numberOfLines={1}>{item.title}</AppText>
                                                    <AppText style={styles.scheduleItemDate}>{item.date}</AppText>
                                                </View>
                                            </Pressable>
                                        ))
                                    )}
                                </View>
                            </View>
                        </>
                    )}
                </ScrollView>
                <Modal
                    visible={scheduleFilterOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setScheduleFilterOpen(false)}
                >
                    <Pressable style={styles.filterModalBackdrop} onPress={() => setScheduleFilterOpen(false)}>
                        <Pressable style={styles.filterModal} onPress={() => {}}>
                            {scheduleFilterOptions.map((option) => {
                                const selected = selectedScheduleTypes.includes(option.value);

                                return (
                                    <Pressable
                                        key={option.value}
                                        style={[
                                            styles.filterModalOption,
                                            selected ? styles.filterModalOptionSelected : null,
                                        ]}
                                        onPress={() => toggleScheduleTypeFilter(option.value)}
                                    >
                                        <AppText style={styles.filterModalOptionText}>
                                            {option.label}
                                        </AppText>
                                    </Pressable>
                                );
                            })}
                        </Pressable>
                    </Pressable>
                </Modal>
            </SafeAreaView>
        </EcaStudentApp>
    );
}
