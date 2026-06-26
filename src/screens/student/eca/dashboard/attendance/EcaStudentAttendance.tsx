import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "@env";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { formatServerKstDateTimeDateLabelForUser, formatServerKstDateTimeTimeForUser, parseServerKstDateTime, } from "../../../../../theme/dateTime";

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

const ATTENDANCE_T = "ecaStudent.attendancePage";
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
                <Image source={require("../../../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
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

function getEventBaseDateTimeValue(event: MyAttendanceEventResponse): string | null {
    return event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
}

function formatEventDate(event: MyAttendanceEventResponse): string {
    return formatServerKstDateTimeDateLabelForUser(getEventBaseDateTimeValue(event));
}

function getEventDisplayTime(event: MyAttendanceEventResponse): string {
    return formatServerKstDateTimeTimeForUser(getEventBaseDateTimeValue(event), "");
}

function getEventSortTime(event: MyAttendanceEventResponse): number {
    const date = parseServerKstDateTime(event.uploadWindowStart);

    if (date) {
        return date.getTime();
    }

    return Number.MAX_SAFE_INTEGER;
}

function getTypeLabel(type: AttendanceEventType, t: TFunction): string {
    return t(`${ATTENDANCE_T}.type.${type}`);
}

function getStatusLabel(status: AttendanceStatus, t: TFunction): string {
    return t(`${ATTENDANCE_T}.status.${status}`);
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

function sortAttendanceEvents(events: MyAttendanceEventResponse[]): MyAttendanceEventResponse[] {
    return [...events].sort((a, b) => getEventSortTime(a) - getEventSortTime(b));
}

function ArrowRightIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M10 7L15 12L10 17" stroke="#848484" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export default function EcaStudentAttendance({
    route,
    navigation,
}: Props): React.ReactElement {
    const { t } = useTranslation();
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
                setError(t(`${ATTENDANCE_T}.error.attendanceLoadFailed`));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchAttendance();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, t]);

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
                <Header activityName={activity?.name ?? t(`${ATTENDANCE_T}.fallbackTitle`)} onMenuClick={() => setMenuOpen(true)} />

                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={styles.emptyWrap}>
                            <ActivityIndicator color="#0166FF" />
                            <AppText style={styles.emptyText}>
                                {t(`${ATTENDANCE_T}.loading`)}
                            </AppText>
                        </View>
                    ) : error ? (
                        <View style={styles.emptyWrap}>
                            <AppText style={styles.emptyText}>{error}</AppText>
                        </View>
                    ) : events.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <AppText style={styles.emptyText}>
                                {t(`${ATTENDANCE_T}.empty`)}
                            </AppText>
                        </View>
                    ) : (
                        events.map((event) => {
                            const displayTime = getEventDisplayTime(event);

                            return (
                                <Pressable key={String(event.eventId)} style={styles.card} onPress={() => openAttendance(event)}>
                                    <View style={styles.cardText}>
                                        <AppText style={styles.cardTitle} numberOfLines={1}>
                                            {formatEventDate(event)}
                                        </AppText>

                                        <View style={styles.cardSubRow}>
                                            <AppText style={styles.cardSubText}>
                                                {getTypeLabel(event.type, t)}
                                            </AppText>

                                            {displayTime ? (
                                                <AppText style={styles.cardTime}>
                                                    {displayTime}
                                                </AppText>
                                            ) : null}
                                        </View>
                                    </View>

                                    <View style={[styles.statusBox, getStatusBoxStyle(event.status)]}>
                                        <AppText style={[styles.statusText, getStatusTextStyle(event.status)]}>
                                            {getStatusLabel(event.status, t)}
                                        </AppText>
                                    </View>

                                    <View style={styles.chevronWrap}>
                                        <ArrowRightIcon />
                                    </View>
                                </Pressable>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>
        </EcaStudentApp>
    );
}