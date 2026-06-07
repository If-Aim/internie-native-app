import React from "react";
import { API_BASE_URL } from "@env";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "../../../../AppText";
import { getUserMe } from "../../../api/client";
import { getMyParticipatingExternalActivities, type StudentExternalActivityResponse } from "../../../api/ea";
import { getMyVlogProjects } from "../../../api/vlog";
import type { VlogFinalVideoStatus, VlogProjectStatus, VlogResponse } from "../../../api/vlog";
import { getAccessToken } from "../../../auth/tokenStorage";
import type { RootStackParamList } from "../../../navigation/AppNavigator";
import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { commonStyles } from "../../../theme/common.Style";
import StudentMobileSideMenu from "../StudentSideMenu";
import { styles } from "./VlogHomeScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "VlogHome">;

type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "team-activity";

type VlogHomeCard = {
    id: string;
    projectId: number;
    title: string;
    subText: string;
    progressPercent: number | null;
    completedMissionCount: number | null;
    totalMissionCount: number | null;
    projectStatus: VlogProjectStatus | null;
    finalVideoStatus: VlogFinalVideoStatus | null;
    locked: boolean;
    durationText: string;
};

function formatDuration(seconds?: number | null): string {
    const safeSeconds = Number.isFinite(seconds ?? NaN) ? Math.max(0, seconds ?? 0) : 77;
    const minutes = Math.floor(safeSeconds / 60);
    const remainSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
}

function formatRecordedDate(value?: string | null): string {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}.`;
}

function toVlogCard(item: VlogResponse): VlogHomeCard | null {
    if (item.vlogProjectId == null) return null;

    const recordedDate = formatRecordedDate(item.lastRecordedAt);
    const weekText = item.currentWeek ? `${item.currentWeek}주차` : "";
    const subText = [weekText, recordedDate].filter(Boolean).join(", ");

    return {
        id: String(item.vlogProjectId),
        projectId: item.vlogProjectId,
        title: item.title ?? item.companyCode ?? "인턴십",
        subText: subText || "브이로그",
        progressPercent: item.progressPercent ?? null,
        completedMissionCount: item.completedMissionCount ?? null,
        totalMissionCount: item.totalMissionCount ?? null,
        projectStatus: item.projectStatus ?? null,
        finalVideoStatus: item.finalVideoStatus ?? null,
        locked: item.locked === true,
        durationText: formatDuration(item.finalVideoDurationSeconds ?? item.durationSec),
    };
}

function isEditStarted(item: VlogHomeCard): boolean {
    if (item.projectStatus === "EDITING") return true;
    if (item.projectStatus === "COMPLETED") return true;
    if (item.locked) return true;

    return false;
}

function isVlogCompleted(item: VlogHomeCard): boolean {
    return item.projectStatus === "COMPLETED";
}

function BellIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ChevronIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
                <Image source={require("../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
            </Pressable>

            <AppText style={styles.appTitle}>Vlog</AppText>

            <View style={commonStyles.iconbtn}>
                <Pressable style={commonStyles.icon24} onPress={() => Alert.alert("서비스 준비중입니다.")} accessibilityLabel="알림" >
                    <BellIcon />
                </Pressable>
            </View>
        </View>
    );
}

export default function VlogHomeScreen({ navigation }: Props): React.ReactElement {
    const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [isAuthed, setIsAuthed] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [refreshing, setRefreshing] = React.useState(false);
    const [menuOpen, setMenuOpen] = React.useState(false);

    const [cards, setCards] = React.useState<VlogHomeCard[]>([]);
    const [myActivities, setMyActivities] = React.useState<StudentExternalActivityResponse[]>([]);

    const [userName, setUserName] = React.useState("Guest");
    const [userEmail, setUserEmail] = React.useState("");
    const [userProfileImg, setUserProfileImg] = React.useState<string | null>(null);
    const [userRoleSet, setUserRoleSet] = React.useState<string[]>([]);

    React.useEffect(() => {
        void checkAuth();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (!isAuthed) {
                setUserName("Guest");
                setUserEmail("");
                setUserProfileImg(null);
                setUserRoleSet([]);
                setMyActivities([]);
                return;
            }

            void loadMe();
            void loadSideMenuData();
            void loadVlogHome();
        }, [isAuthed])
    );

    async function checkAuth(): Promise<void> {
        try {
            const token = await getAccessToken();

            setIsAuthed(!!token);
        } catch {
            setIsAuthed(false);
        }
    }

    async function loadMe(): Promise<void> {
        try {
            const me = await getUserMe();
            const rawProfileImage = String(me.profileImage ?? "").trim();

            setUserName((me.name ?? "").trim() || "User");
            setUserEmail((me.email ?? "").trim());
            setUserRoleSet(Array.isArray(me.roleSet) ? me.roleSet : []);

            if (!rawProfileImage || rawProfileImage.includes("default")) {
                setUserProfileImg(null);
                return;
            }

            if (/^https?:\/\//i.test(rawProfileImage)) {
                setUserProfileImg(rawProfileImage);
                return;
            }

            const origin = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
            setUserProfileImg(rawProfileImage.startsWith("/") ? `${origin}${rawProfileImage}` : `${origin}/${rawProfileImage}`);
        } catch {
            setUserName("User");
            setUserEmail("");
            setUserProfileImg(null);
            setUserRoleSet([]);
        }
    }

    async function loadSideMenuData(): Promise<void> {
        try {
            const token = await getAccessToken();

            if (!token) {
                setMyActivities([]);
                return;
            }

            const activityData = await getMyParticipatingExternalActivities();

            setMyActivities(activityData);
        } catch (error) {
            setMyActivities([]);
        }
    }

    async function loadVlogHome(): Promise<void> {
        if (!isAuthed) {
            setCards([]);
            return;
        }

        setLoading(true);

        try {
            const response = await getMyVlogProjects();
            const nextCards = (response.projects ?? [])
                    .map(toVlogCard)
                    .filter((item): item is VlogHomeCard => item !== null);

            setCards(nextCards);
        } catch (error) {
            console.error("[VLOG_HOME] load error:", error);
            setCards([]);
        } finally {
            setLoading(false);
        }
    }

    async function refreshVlogHome(): Promise<void> {
        setRefreshing(true);

        try {
            await Promise.all([
                loadVlogHome(),
                loadSideMenuData(),
            ]);
        } finally {
            setRefreshing(false);
        }
    }

    function requireAuth(action: () => void): void {
        if (!isAuthed) {
            Alert.alert(
                "로그인이 필요합니다.",
                "로그인 후 이용할 수 있습니다.",
                [
                    { text: "취소", style: "cancel" },
                    { text: "로그인", onPress: () => rootNavigation.navigate("Auth" as never) },
                ]
            );
            return;
        }

        action();
    }

    function moveHome(): void {
        navigation.navigate("StudentHome");
    }

    function moveMyPage(): void {
        requireAuth(() => {
            navigation.navigate("MyPage" as never);
        });
    }
    function moveVlogHome(): void {
        requireAuth(() => {
            navigation.navigate("VlogHome");
        });
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

    function handlePressVideo(): void {
        Alert.alert("서비스 준비중입니다.");
    }

    function handlePressAdd(): void {
        requireAuth(() => {
            navigation.navigate("NewVlog");
        });
    }

    function handlePressCard(item: VlogHomeCard): void {
        requireAuth(() => {
            if (isVlogCompleted(item) || isEditStarted(item)) {
                navigation.navigate("EditVlog", {
                    projectId: item.projectId,
                    title: `${item.title} 브이로그`,
                    subText: item.subText,
                });
                return;
            }

            navigation.navigate("RecordVlog", {
                projectId: item.projectId,
                title: item.title,
                subText: item.subText,
                progressPercent: item.progressPercent,
                completedMissionCount: item.completedMissionCount,
                totalMissionCount: item.totalMissionCount,
                projectStatus: item.projectStatus,
                finalVideoStatus: item.finalVideoStatus,
                locked: item.locked,
            });
        });
    }

    function renderVideoThumbnail(item: VlogHomeCard): React.ReactElement {
        return (
            <View style={styles.thumbnail}>
                <View style={styles.playCircle}>
                    <View style={styles.playTriangle} />
                </View>

                <View style={styles.timeRow}>
                    <AppText style={styles.timeText}>00:00</AppText>
                    <AppText style={styles.timeText}>{item.durationText}</AppText>
                </View>
            </View>
        );
    }

    function renderItem({ item }: { item: VlogHomeCard }): React.ReactElement {
        return (
            <Pressable style={styles.card} onPress={() => handlePressCard(item)}>
                {renderVideoThumbnail(item)}

                <View style={styles.cardInfoRow}>
                    <View style={styles.cardTextWrap}>
                        <AppText style={styles.cardTitle}>{item.title}</AppText>
                        <AppText style={styles.cardDate}>{item.subText}</AppText>
                    </View>

                    {isVlogCompleted(item) ? (
                        <View style={styles.completedBadge}>
                            <AppText style={styles.completedText}>완료</AppText>
                        </View>
                    ) : item.progressPercent !== null ? (
                        <View style={styles.progressBadge}>
                            <AppText style={styles.progressText}>{item.progressPercent}%</AppText>
                        </View>
                    ) : null}
                    <View style={commonStyles.iconbtn}>
                        <ChevronIcon />
                    </View>
                </View>
            </Pressable>
        );
    }

    return (
        <SafeAreaView style={commonStyles.appRoot}>
            <Header onMenuClick={() => setMenuOpen(true)} />

            <FlatList
                data={cards}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshVlogHome} />}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Image source={require("../../../assets/images/internie_mascot_normal.png")} style={styles.emptyImg} resizeMode="contain" />
                            <AppText style={styles.emptyTitle}>아직 브이로그가 없어요{"\n"}지금 바로 만들어 볼까요?</AppText>
                        </View>
                    )
                }
                renderItem={renderItem}

            />

            <Pressable style={styles.addButton} onPress={handlePressAdd}>
                <AppText style={styles.addButtonText}>인턴십 추가하기</AppText>
            </Pressable>

            <StudentMobileSideMenu
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                userName={userName}
                userEmail={userEmail}
                userProfileImg={userProfileImg}
                userRoleSet={userRoleSet}
                activities={myActivities}
                currentMenu="vlog"
                onMoveHome={moveHome}
                onMoveMyPage={moveMyPage}
                onMoveActivityMenu={moveActivityMenu}
                onMoveSystemAdmin={moveSystemAdmin}
                onMoveJumpAdmin={moveJumpAdmin}
                onMoveKakaoAdmin={moveKakaoAdmin}
                onMoveVlogHome={moveVlogHome}
            />
        </SafeAreaView>
    );
}