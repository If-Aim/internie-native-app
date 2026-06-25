import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "@env";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../../../../../../AppText";
import { getAccessToken } from "../../../../../auth/tokenStorage";
import { getUserMe } from "../../../../../api/client";
import type { UserMe } from "../../../../../api/client";
import { getMyAttendanceEvents, getMyParticipatingExternalActivities, getMyParticipatingExternalActivity } from "../../../../../api/ea";
import type { AttendanceEventType, AttendanceStatus, MyAttendanceEventResponse, StudentExternalActivityDetailResponse, StudentExternalActivityResponse } from "../../../../../api/ea";
import type { StudentStackParamList } from "../../../../../navigation/StudentNavigator";
import EcaStudentApp from "../../EcaStudentApp";
import StudentMobileSideMenu from "../../../StudentSideMenu";
import { commonStyles } from "../../../../../theme/common.Style";
import { styles } from "./EcaStudentAttendance.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentMobileAttendance">;

type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "leaderboard" | "team-activity";

type AttendanceRouteParams = {
    externalActivityId?: number | string;
};

type HeaderProps = {
    activityName: string;
    onMenuClick: () => void;
};

function Header({ activityName, onMenuClick }: HeaderProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbar}>
            <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel={t("common.menu")}>
                <Image source={require("../../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
            </Pressable>

            <AppText style={styles.appTitle} numberOfLines={1}>{activityName}</AppText>

            <View style={commonStyles.iconbtn} />
        </View>
    );
}

function getProfileImageUrl(profileImage?: string | null): string | null {
    const raw = String(profileImage ?? "").trim();

    if (!raw || raw.toLowerCase().includes("default")) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const origin = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

    return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}

function toDate(value?: string | null): Date | null {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function formatEventDate(value?: string | null): string {
    const date = toDate(value);

    if (!date) return "-";

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatEventStartTime(value?: string | null): string {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${hour}:${minute}`;
}

function getEventDisplayTime(event: MyAttendanceEventResponse): string {
    const value = event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;

    return formatEventStartTime(value);
}

function getTypeLabel(type: AttendanceEventType): string {
    return type === "CLASS_START" ? "Start" : "End";
}

function getStatusLabel(status: AttendanceStatus): string {
    const labels: Record<AttendanceStatus, string> = {
        NOT_CHECKED: "Not Checked",
        PRESENT: "Present",
        LATE: "Late",
        VERY_LATE: "Very Late",
        EARLY_LEAVE: "Early Leave",
        VERY_EARLY_LEAVE: "Very Early Leave",
        ABSENT: "Absent",
    };

    return labels[status];
}

function getStatusBoxStyle(status: AttendanceStatus) {
    if (status === "PRESENT") return styles.statusPresent;
    if (status === "ABSENT") return styles.statusAbsent;
    if (status === "NOT_CHECKED") return styles.statusNotChecked;

    return styles.statusLate;
}

function getStatusTextStyle(status: AttendanceStatus) {
    if (status === "PRESENT") return styles.statusTextPresent;
    if (status === "ABSENT") return styles.statusTextAbsent;
    if (status === "NOT_CHECKED") return styles.statusTextNotChecked;

    return styles.statusTextLate;
}

function getEventSortTime(event: MyAttendanceEventResponse): number {
    const windowTime = new Date(event.uploadWindowStart).getTime();

    if (Number.isFinite(windowTime)) {
        return windowTime;
    }

    return new Date(`${event.eventDate}T00:00:00`).getTime();
}

function sortAttendanceEvents(events: MyAttendanceEventResponse[]): MyAttendanceEventResponse[] {
    return [...events].sort((a, b) => {
        if (a.progress === "OPEN" && b.progress !== "OPEN") return -1;
        if (a.progress !== "OPEN" && b.progress === "OPEN") return 1;

        return getEventSortTime(b) - getEventSortTime(a);
    });
}

export default function EcaStudentAttendance({
    route,
    navigation,
}: Props): React.ReactElement {
    const { externalActivityId } = route.params;

    const [menuOpen, setMenuOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [myActivities, setMyActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const userName = (me?.name ?? "").trim() || "User";
    const userEmail = (me?.email ?? "").trim();
    const userRoleSet = Array.isArray(me?.roleSet) ? me.roleSet : [];
    const userProfileImg = getProfileImageUrl(me?.profileImage);

    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [events, setEvents] = React.useState<MyAttendanceEventResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        let mounted = true;

        async function fetchAttendance(): Promise<void> {
            setLoading(true);
            setError("");

            try {
                const [meData, activityListData, activityData, eventData] = await Promise.all([
                    getUserMe(),
                    getMyParticipatingExternalActivities(),
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyAttendanceEvents(externalActivityId),
                ]);

                if (!mounted) return;

                setMe(meData);
                setMyActivities([...activityListData].sort((a, b) => a.externalActivityId - b.externalActivityId));
                setActivity(activityData);
                setEvents(sortAttendanceEvents(eventData));
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setActivity(null);
                setEvents([]);
                setError("출석 정보를 불러오지 못했습니다.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchAttendance();

        return () => {
            mounted = false;
        };
    }, [externalActivityId]);

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

    function openAttendance(event: MyAttendanceEventResponse): void {
        if (!externalActivityId) return;

        navigation.navigate("EcaStudentMobileAttendanceSubmit", {
            externalActivityId: String(externalActivityId),
            eventId: event.eventId,
            event,
        });
    }

    return (
        <EcaStudentApp
            externalActivityId={externalActivityId}
            activeTab="attendance"
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
                    currentActivityMenu="attendance"
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
            <SafeAreaView style={styles.page}>
                <Header activityName={activity?.name ?? "Attendance"} onMenuClick={() => setMenuOpen(true)} />

                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={styles.emptyWrap}>
                            <ActivityIndicator />
                            <Text style={styles.emptyText}>출석 정보를 불러오는 중입니다.</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>{error}</Text>
                        </View>
                    ) : events.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>등록된 출석 이벤트가 없습니다.</Text>
                        </View>
                    ) : (
                        events.map((event) => {
                            const displayTime = getEventDisplayTime(event);

                            return (
                                <Pressable key={String(event.eventId)} style={styles.card} onPress={() => openAttendance(event)}>
                                    <View style={styles.cardText}>
                                        <Text style={styles.cardTitle}>{formatEventDate(event.eventDate)}</Text>

                                        <View style={styles.cardSubRow}>
                                            <Text style={styles.cardSubText}>{getTypeLabel(event.type)}</Text>
                                            {displayTime ? <Text style={styles.cardTime}>{displayTime}</Text> : null}
                                        </View>
                                    </View>

                                    <View style={[styles.statusBox, getStatusBoxStyle(event.status)]}>
                                        <Text style={[styles.statusText, getStatusTextStyle(event.status)]}>{getStatusLabel(event.status)}</Text>
                                    </View>

                                    <Text style={styles.chevron}>›</Text>
                                </Pressable>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>
        </EcaStudentApp>
    );
}