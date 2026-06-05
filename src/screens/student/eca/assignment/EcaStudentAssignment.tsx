import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../../../../AppText";
import { API_BASE_URL } from "@env";
import { getAccessToken } from "../../../../auth/tokenStorage";
import { ApiError, getUserMe } from "../../../../api/client";
import type { UserMe } from "../../../../api/client";
import { getMyExternalActivityAssignments, getMyParticipatingExternalActivities, getMyParticipatingExternalActivity } from "../../../../api/ea";
import type { AssignmentParticipantStatus, StudentAssignmentResponse, StudentExternalActivityDetailResponse, StudentExternalActivityResponse } from "../../../../api/ea";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import EcaStudentApp from "../EcaStudentApp";
import StudentMobileSideMenu from "../../StudentSideMenu";
import { styles } from "./EcaStudentAssignment.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentAssignment">;

type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "team-activity";
type AssignmentStatus = "before" | "submitted" | "lateSubmitted" | "missing";

type StudentAssignmentViewModel = {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt?: string | null;
    status: AssignmentStatus;
};

function getAssignmentStatus(status: AssignmentParticipantStatus, deadlineAt?: string | null): AssignmentStatus {
    if (status === "SUBMITTED") return "submitted";
    if (status === "LATE_SUBMITTED") return "lateSubmitted";
    if (status === "LATE") return "missing";

    if (status === "NOT_SUBMITTED") {
        if (!deadlineAt) return "before";

        return Date.now() > new Date(deadlineAt).getTime() ? "missing" : "before";
    }

    return "before";
}

function toStudentAssignmentViewModel(assignment: StudentAssignmentResponse): StudentAssignmentViewModel {
    return {
        id: assignment.assignmentId,
        name: assignment.name,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        deadlineAt: assignment.deadlineAt,
        status: getAssignmentStatus(assignment.status, assignment.deadlineAt),
    };
}

function formatDate(value?: string | null): string {
    if (!value) return "-";

    return value.replaceAll("-", ".");
}

function formatTime(value?: string | null): string {
    if (!value) return "";

    return value.slice(0, 5);
}

function formatMobilePeriod(assignment: StudentAssignmentViewModel): string {
    const start = `${formatDate(assignment.startDate)}${assignment.startTime ? ` ${formatTime(assignment.startTime)}` : ""}`;
    const endDate = formatDate(assignment.endDate).slice(5);
    const end = `${endDate}${assignment.endTime ? ` ${formatTime(assignment.endTime)}` : ""}`;

    return `${start} ~ ${end}`;
}

function getAssignmentStatusLabel(status: AssignmentStatus): string {
    if (status === "submitted") return "제출";
    if (status === "lateSubmitted") return "제출";
    if (status === "missing") return "미제출";
    return "제출전";
}

function getStatusStyle(status: AssignmentStatus) {
    if (status === "submitted") return styles.statusSubmitted;
    if (status === "lateSubmitted") return styles.statusLateSubmitted;
    if (status === "missing") return styles.statusMissing;
    return styles.statusBefore;
}

function getStatusTextStyle(status: AssignmentStatus) {
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
                <Image source={require("../../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
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
                setAssignments(assignmentData.map(toStudentAssignmentViewModel));
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setActivity(null);
                setAssignments([]);

                if (e instanceof ApiError) {
                    if (e.status === 404 || e.code === "EXTERNAL_ACTIVITY_NOT_FOUND") {
                        Alert.alert("삭제되었거나 존재하지 않는 대외활동입니다.");
                        navigation.navigate("StudentHome");
                        return;
                    }

                    if (e.status === 403 || e.code === "FORBIDDEN" || e.code === "SUBMISSION_NOT_ALLOWED") {
                        Alert.alert("접근할 수 없는 대외활동입니다.");
                        navigation.navigate("StudentHome");
                        return;
                    }
                }

                setError("과제 목록을 불러오지 못했습니다.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchAssignmentPage();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, navigation]);

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

    function handleFilterClick(): void {
        Alert.alert("필터 기능은 준비중입니다.");
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
                />
            )}
        >
            <SafeAreaView style={commonStyles.appRoot}>
                <Header activityName={activity?.name ?? ""} onMenuClick={() => setMenuOpen(true)} />

                <ScrollView style={styles.main} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.titleRow}>
                        <AppText style={styles.title}>과제 현황</AppText>

                        <Pressable style={styles.filterButton} onPress={handleFilterClick} accessibilityLabel="필터">
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
                                <AppText style={styles.emptyText}>배정된 과제가 없습니다.</AppText>
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
                                            {getAssignmentStatusLabel(assignment.status)}
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