import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../../../../../AppText";
import { API_BASE_URL } from "@env";
import { getAccessToken } from "../../../../../auth/tokenStorage";
import { ApiError, getUserMe } from "../../../../../api/client";
import type { UserMe } from "../../../../../api/client";
import { getMyExternalActivityAssignments, getMyParticipatingExternalActivities, getMyParticipatingExternalActivity } from "../../../../../api/ea";
import type { AssignmentParticipantStatus, StudentAssignmentResponse, StudentAssignmentTeam, StudentExternalActivityDetailResponse, StudentExternalActivityResponse } from "../../../../../api/ea";
import type { StudentStackParamList } from "../../../../../navigation/StudentNavigator";
import { formatServerKstDateAndTimeCompactForUser, parseServerKstDateTime, } from "../../../../../theme/dateTime";
import { commonStyles } from "../../../../../theme/common.Style";
import EcaStudentApp from "../../EcaStudentApp";
import StudentMobileSideMenu from "../../../StudentSideMenu";
import { styles } from "./EcaStudentAssignment.style";

const ASSIGNMENT_T = "ecaStudent.assignmentPage";
type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentAssignment">;
type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "leaderboard" | "team-activity";
type AssignmentStatus = "before" | "submitted" | "lateSubmitted" | "missing" | "evaluated";

type StudentAssignmentViewModel = {
    id: number;
    name: string;
    isTeamAssignment: boolean;
    myTeam?: StudentAssignmentTeam | null;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt?: string | null;
    status: AssignmentStatus;
};

function getAssignmentStatus(
    status: AssignmentParticipantStatus,
    deadlineAt?: string | null,
    evaluationCompleted = false
): AssignmentStatus {
    if (evaluationCompleted) return "evaluated";
    if (status === "SUBMITTED") return "submitted";
    if (status === "LATE_SUBMITTED") return "lateSubmitted";
    if (status === "LATE") return "missing";

    if (status === "NOT_SUBMITTED") {
        if (!deadlineAt) return "before";

        const deadline = parseServerKstDateTime(deadlineAt);

        if (!deadline) return "before";

        return Date.now() > deadline.getTime() ? "missing" : "before";
    }

    return "before";
}

function toStudentAssignmentViewModel(assignment: StudentAssignmentResponse): StudentAssignmentViewModel {
    return {
        id: assignment.assignmentId,
        name: assignment.name,
        isTeamAssignment: assignment.isTeamAssignment,
        myTeam: assignment.myTeam ?? null,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        deadlineAt: assignment.deadlineAt,
        status: getAssignmentStatus(
            assignment.status,
            assignment.deadlineAt,
            assignment.evaluationCompleted
        ),
    };
}

function formatMobilePeriod(assignment: StudentAssignmentViewModel): string {
    const start = formatServerKstDateAndTimeCompactForUser(
        assignment.startDate,
        assignment.startTime,
        "00:00:00"
    );
    const end = formatServerKstDateAndTimeCompactForUser(
        assignment.endDate,
        assignment.endTime,
        "23:59:59"
    );

    return `${start} ~ ${end.slice(5)}`;
}

function isUnsubmittedAssignment(status: AssignmentStatus): boolean {
    return status === "before" || status === "missing";
}

function getAssignmentDeadlineSortTime(assignment: StudentAssignmentViewModel): number {
    if (!assignment.deadlineAt) return Number.MAX_SAFE_INTEGER;

    const deadline = parseServerKstDateTime(assignment.deadlineAt);

    return deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function compareStudentAssignments(a: StudentAssignmentViewModel, b: StudentAssignmentViewModel): number {
    const unsubmittedA = isUnsubmittedAssignment(a.status);
    const unsubmittedB = isUnsubmittedAssignment(b.status);

    if (unsubmittedA !== unsubmittedB) return unsubmittedA ? -1 : 1;

    const deadlineDiff = getAssignmentDeadlineSortTime(a) - getAssignmentDeadlineSortTime(b);

    if (deadlineDiff !== 0) return deadlineDiff;

    return a.name.localeCompare(b.name, "ko-KR", { numeric: true });
}

function getAssignmentStatusLabelKey(status: AssignmentStatus): string {
    if (status === "evaluated") return `${ASSIGNMENT_T}.status.evaluated`;
    if (status === "submitted") return `${ASSIGNMENT_T}.status.submitted`;
    if (status === "lateSubmitted") return `${ASSIGNMENT_T}.status.late`;
    if (status === "missing") return `${ASSIGNMENT_T}.status.missing`;
    return `${ASSIGNMENT_T}.status.assigned`;
}

function getStatusStyle(status: AssignmentStatus) {
    if (status === "evaluated") return styles.statusEvaluated;
    if (status === "submitted") return styles.statusSubmitted;
    if (status === "lateSubmitted") return styles.statusLateSubmitted;
    if (status === "missing") return styles.statusMissing;
    return styles.statusBefore;
}

function getStatusTextStyle(status: AssignmentStatus) {
    if (status === "evaluated") return styles.statusTextEvaluated;
    if (status === "submitted") return styles.statusTextSubmitted;
    if (status === "lateSubmitted") return styles.statusTextLateSubmitted;
    if (status === "missing") return styles.statusTextMissing;
    return styles.statusTextBefore;
}

function getProfileImageUrl(profileImage?: string | null): string | null {
    const raw = String(profileImage ?? "").trim();

    if (!raw || raw.toLowerCase().includes("default")) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const origin = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

    return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}

function FilterIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M6.46154 12H17.5385M4 7H20M10.1538 17H13.8462" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ArrowRightIcon(): React.ReactElement {
    return (
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function Header({
    activityName,
    onMenuClick,
}: {
    activityName: string;
    onMenuClick: () => void;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel={t("common.menu")}>
                <Image source={require("../../../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
            </Pressable>

            <AppText style={styles.appTitle} numberOfLines={1}>{activityName}</AppText>

            <View style={styles.headerRightSpace} />
        </View>
    );
}

export default function EcaStudentAssignment({
    route,
    navigation,
}: Props): React.ReactElement {
    const { t } = useTranslation();
    const { externalActivityId } = route.params;

    const [menuOpen, setMenuOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [myActivities, setMyActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const [assignments, setAssignments] = React.useState<StudentAssignmentViewModel[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const userName = (me?.name ?? "").trim() || "User";
    const userEmail = (me?.email ?? "").trim();
    const userRoleSet = Array.isArray(me?.roleSet) ? me.roleSet : [];
    const userProfileImg = getProfileImageUrl(me?.profileImage);

    React.useEffect(() => {
        let mounted = true;

        async function fetchAssignmentPage(): Promise<void> {
            setLoading(true);
            setError("");

            try {
                const [meData, activityListData, activityData, assignmentData] = await Promise.all([
                    getUserMe(),
                    getMyParticipatingExternalActivities(),
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyExternalActivityAssignments(externalActivityId),
                ]);

                if (!mounted) return;

                setMe(meData);
                setMyActivities([...activityListData].sort((a, b) => a.externalActivityId - b.externalActivityId));
                setActivity(activityData);
                setAssignments(
                    assignmentData
                        .map(toStudentAssignmentViewModel)
                        .sort(compareStudentAssignments)
                );
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setActivity(null);
                setAssignments([]);

                if (e instanceof ApiError) {
                    if (e.status === 404 || e.code === "EXTERNAL_ACTIVITY_NOT_FOUND") {
                        Alert.alert(t(`${ASSIGNMENT_T}.error.activityDeletedOrNotFound`));
                        navigation.navigate("StudentHome");
                        return;
                    }

                    if (e.status === 403 || e.code === "FORBIDDEN" || e.code === "SUBMISSION_NOT_ALLOWED") {
                        Alert.alert(t(`${ASSIGNMENT_T}.error.accessDenied`));
                        navigation.navigate("StudentHome");
                        return;
                    }
                }

                setError(t(`${ASSIGNMENT_T}.error.assignmentLoadFailed`));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchAssignmentPage();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, navigation, t]);

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

    function handleFilterClick(): void {
        Alert.alert(t(`${ASSIGNMENT_T}.alert.filterPreparing`));
    }

    function moveToAssignmentDetail(assignmentId: number): void {
        navigation.navigate("EcaStudentAssignmentSubmit", {
            externalActivityId,
            assignmentId: String(assignmentId),
        });
    }

    return (
        <EcaStudentApp
            externalActivityId={externalActivityId}
            activeTab="assignment"
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
                    currentActivityMenu="assignment"
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
                <Header activityName={activity?.name ?? ""} onMenuClick={() => setMenuOpen(true)} />

                <ScrollView style={styles.main} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.titleRow}>
                        <AppText style={styles.title}>{t(`${ASSIGNMENT_T}.title`)}</AppText>

                        <Pressable style={styles.filterButton} onPress={handleFilterClick} accessibilityLabel={t(`${ASSIGNMENT_T}.filter`)}>
                            <FilterIcon />
                        </Pressable>
                    </View>

                    <View style={styles.list}>
                        {loading ? (
                            <View style={styles.emptyWrap}>
                                <ActivityIndicator />
                            </View>
                        ) : error ? (
                            <View style={styles.emptyWrap}>
                                <AppText style={styles.emptyText}>{error}</AppText>
                            </View>
                        ) : assignments.length === 0 ? (
                            <View style={styles.emptyWrap}>
                                <AppText style={styles.emptyText}>{t(`${ASSIGNMENT_T}.empty`)}</AppText>
                            </View>
                        ) : (
                            assignments.map((assignment) => (
                                <Pressable style={styles.card} key={assignment.id} onPress={() => moveToAssignmentDetail(assignment.id)}>
                                    <View style={styles.info}>
                                        <AppText style={styles.assignmentName} numberOfLines={1}>{assignment.name}</AppText>
                                        <AppText style={styles.assignmentPeriod} numberOfLines={1}>{formatMobilePeriod(assignment)}</AppText>
                                    </View>

                                    <View style={[styles.status, getStatusStyle(assignment.status)]}>
                                        <AppText style={[styles.statusText, getStatusTextStyle(assignment.status)]}>
                                            {t(getAssignmentStatusLabelKey(assignment.status))}
                                        </AppText>
                                    </View>

                                    <View style={styles.arrowWrap}>
                                        <ArrowRightIcon />
                                    </View>
                                </Pressable>
                            ))
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </EcaStudentApp>
    );
}
