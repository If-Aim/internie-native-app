import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../../../../AppText";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { API_BASE_URL } from "@env";
import { getAccessToken } from "../../../../auth/tokenStorage";
import { getUserMe } from "../../../../api/client";
import type { UserMe } from "../../../../api/client";
import { getMyExternalActivityAssignments, getMyParticipatingExternalActivities, getMyParticipatingExternalActivity } from "../../../../api/ea";
import type { StudentAssignmentResponse, StudentExternalActivityDetailResponse, StudentExternalActivityResponse } from "../../../../api/ea";
import EcaStudentApp from "../EcaStudentApp";
import StudentMobileSideMenu from "../../StudentSideMenu";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./EcaStudentDashboard.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentDashboard">;

type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "team-activity";

type MobileScheduleItem = {
    id: number;
    title: string;
    date: string;
    type: "activity" | "assignment" | "attendance";
    completed: boolean;
};

function formatToday(): string {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

    return `${month}월 ${day}일, ${weekdays[date.getDay()]}`;
}

function formatDate(value?: string | null): string {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}.${month}.${day}.`;
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

function toScheduleItems(assignments: StudentAssignmentResponse[]): MobileScheduleItem[] {
    return assignments.map((assignment) => ({
        id: assignment.assignmentId,
        title: assignment.name,
        date: formatDate(assignment.deadlineAt),
        type: "assignment" as const,
        completed: isCompletedAssignment(assignment),
    }));
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

function Header({
    onMenuClick,
}: {
    onMenuClick: () => void;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel={t("common.menu")}>
                <Image source={require("../../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
            </Pressable>

            <AppText style={styles.appTitle} />

            <View style={commonStyles.iconbtn}>
                <Pressable style={commonStyles.icon24} onPress={() => Alert.alert("서비스 준비중입니다.")} accessibilityLabel="알림" >
                    <BellIcon />
                </Pressable>
            </View>
        </View>
    );
}

export default function EcaStudentDashboard({
    route,
    navigation,
}: Props): React.ReactElement {
    const { externalActivityId } = route.params;

    const [menuOpen, setMenuOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [myActivities, setMyActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [assignments, setAssignments] = React.useState<StudentAssignmentResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

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
                setAssignments(assignmentData);
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setActivity(null);
                setAssignments([]);
                setError("대시보드 정보를 불러오지 못했습니다.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchDashboard();

        return () => {
            mounted = false;
        };
    }, [externalActivityId]);

    const progressRate = getDateProgressRate(activity?.startDate, activity?.endDate);
    const completedAssignmentCount = assignments.filter(isCompletedAssignment).length;
    const assignmentRate = assignments.length === 0 ? 0 : Math.round((completedAssignmentCount / assignments.length) * 100);
    const scheduleItems = toScheduleItems(assignments);

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

    function openAssignmentList(): void {
        navigation.navigate("EcaStudentAssignment", { externalActivityId });
    }

    function openAssignmentSubmit(assignmentId: number): void {
        navigation.navigate("EcaStudentAssignmentSubmit", {
            externalActivityId,
            assignmentId: String(assignmentId),
        });
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
                <Header onMenuClick={() => setMenuOpen(true)} />

                <ScrollView style={styles.main} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.titleSection}>
                        <AppText style={styles.todayText}>{formatToday()}</AppText>
                        <AppText style={styles.activityTitle}>{activity?.name ?? "대외활동"}</AppText>
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
                            <View style={styles.progressCard}>
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
                            </Pressable>

                            <View style={styles.scheduleSection}>
                                <AppText style={styles.scheduleTitle}>전체 일정</AppText>

                                <View style={styles.scheduleList}>
                                    {scheduleItems.length === 0 ? (
                                        <View style={styles.emptyWrap}>
                                            <AppText style={styles.empty}>등록된 일정이 없습니다.</AppText>
                                        </View>
                                    ) : (
                                        scheduleItems.map((item) => (
                                            <Pressable
                                                key={`${item.type}-${item.id}`}
                                                style={styles.scheduleItem}
                                                onPress={() => item.type === "assignment" ? openAssignmentSubmit(item.id) : undefined}
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
            </SafeAreaView>
        </EcaStudentApp>
    );
}