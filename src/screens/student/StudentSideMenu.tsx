import React from "react";
import { Alert, Animated, Image, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import AppText from "../../../AppText";
import type { StudentExternalActivityResponse } from "../../api/ea";
import { DRAWER_WIDTH, sideMenuStyles } from "./StudentSideMenu.style";

type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "team-activity";
type MainMenuKey = "home" | "vlog" | "mypage";

const ACTIVE_COLOR = "#0166FF";
const INACTIVE_COLOR = "#808080";

type StudentMobileSideMenuProps = {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    userEmail: string;
    userProfileImg: string | null;
    userRoleSet: string[];
    activities: StudentExternalActivityResponse[];
    currentMenu?: MainMenuKey | null;
    currentActivityId?: number | null;
    currentActivityMenu?: ActivityMenuKey | null;
    onMoveHome: () => void;
    onMoveMyPage: () => void;
    onMoveActivityMenu: (activityId: number, menuKey: ActivityMenuKey) => void;
    onMoveSystemAdmin: () => void;
    onMoveJumpAdmin: () => void;
    onMoveKakaoAdmin: () => void;

    onMoveVlogHome: () => void;
};

function HomeIcon({ color = INACTIVE_COLOR }: { color?: string }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M21 19V12.267C21 11.7245 20.8896 11.1876 20.6756 10.689C20.4616 10.1905 20.1483 9.74069 19.755 9.36701L13.378 3.31001C13.0063 2.9569 12.5132 2.76001 12.0005 2.76001C11.4878 2.76001 10.9947 2.9569 10.623 3.31001L4.245 9.36701C3.85165 9.74069 3.53844 10.1905 3.3244 10.689C3.11037 11.1876 3 11.7245 3 12.267V19C3 19.5304 3.21071 20.0392 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0392 21 19.5304 21 19Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ChevronDownIcon(): React.ReactElement {
    return (
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function GlobeIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M3.5 14.966C3.16814 14.0124 2.99911 13.0097 3 12C2.99922 10.9907 3.16825 9.98834 3.5 9.03503C4.11608 7.27196 5.26515 5.74409 6.78807 4.66303C8.31099 3.58197 10.1324 3.00122 12 3.00122C13.8676 3.00122 15.689 3.58197 17.2119 4.66303C18.7349 5.74409 19.8839 7.27196 20.5 9.03503C20.824 9.96303 21 10.961 21 12C21.0009 13.0097 20.8319 14.0124 20.5 14.966C19.8839 16.7291 18.7349 18.257 17.2119 19.338C15.689 20.4191 13.8676 20.9998 12 20.9998C10.1324 20.9998 8.31099 20.4191 6.78807 19.338C5.26515 18.257 4.11608 16.7291 3.5 14.966ZM20.5 9.03503H3.5M20.5 14.966H3.5" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12.0009 21C16.9709 16.03 16.9709 7.97 12.0009 3C7.03094 7.97 7.03094 16.03 12.0009 21Z" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function SettingsIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function VlogIcon({ color = INACTIVE_COLOR }: { color?: string }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M12.1056 8.83333H9.35556M15.8753 14.3867L20.5252 16.6771C21.0072 16.9705 21.5131 16.7976 21.5001 16.1856L21.4675 8.09104C21.4263 7.42667 21.0342 7.24539 20.4569 7.55242L15.8622 9.64057M5.25006 18.5H13.6056C14.8482 18.5 15.8556 17.5051 15.8556 16.2778L15.8753 13.4275L15.8556 7.72222C15.8556 6.49492 14.8482 5.5 13.6056 5.5H5.25006C4.00742 5.5 3.00006 6.49492 3.00006 7.72222V16.2778C3.00006 17.5051 4.00742 18.5 5.25006 18.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export default function StudentMobileSideMenu({
    isOpen,
    onClose,
    userName,
    userEmail,
    userProfileImg,
    userRoleSet,
    activities,
    currentMenu,
    currentActivityId,
    currentActivityMenu,
    onMoveHome,
    onMoveMyPage,
    onMoveActivityMenu,
    onMoveSystemAdmin,
    onMoveJumpAdmin,
    onMoveKakaoAdmin,
    onMoveVlogHome,
}: StudentMobileSideMenuProps): React.ReactElement | null {
    const { t, i18n } = useTranslation();
    const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");
    const translateX = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const [mounted, setMounted] = React.useState(isOpen);
    const [openedActivityId, setOpenedActivityId] = React.useState<number | null>(currentActivityId ?? null);

    React.useEffect(() => {
        if (currentActivityId == null) return;

        setOpenedActivityId(currentActivityId);
    }, [currentActivityId]);

    React.useEffect(() => {
        if (isOpen) {
            setMounted(true);
            Animated.timing(translateX, {
                toValue: 0,
                duration: 240,
                useNativeDriver: true,
            }).start();
            return;
        }

        Animated.timing(translateX, {
            toValue: -DRAWER_WIDTH,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            setMounted(false);
        });
    }, [isOpen, translateX]);

    if (!mounted) return null;

    const activityMenus: Array<{ key: ActivityMenuKey; label: string; disabled: boolean }> = [
        { key: "dashboard", label: isKo ? "대시보드" : "Dashboard", disabled: false },
        { key: "assignment", label: isKo ? "과제 제출 현황" : "Assignment Status", disabled: false },
        { key: "attendance", label: isKo ? "출석 현황" : "Attendance", disabled: true },
        { key: "team-activity", label: isKo ? "팀 활동" : "Team Activity", disabled: true },
    ];

    const hasActivities = activities.length > 0;
    const hasSystemAdmin = userRoleSet.includes("ROLE_ADMIN") || userRoleSet.includes("ROLE_CAPTAIN");
    const hasJumpAdmin = userRoleSet.includes("ROLE_JUMP_ADMIN");
    const hasKakaoAdmin = userRoleSet.includes("ROLE_KAKAO_ADMIN");

    async function toggleLang(): Promise<void> {
        await i18n.changeLanguage(isKo ? "en" : "ko");
    }

    function showPreparing(): void {
        Alert.alert(isKo ? "서비스 준비중입니다." : "Coming Soon");
    }

    function closeAfter(action: () => void): void {
        action();
        onClose();
    }

    return (
        <View style={sideMenuStyles.overlay} pointerEvents="box-none">
            <Pressable style={sideMenuStyles.backdrop} onPress={onClose} />

            <Animated.View style={[sideMenuStyles.panel, { transform: [{ translateX }] }]}>
                <SafeAreaView style={sideMenuStyles.safeArea} edges={["top", "bottom"]}>
                    <View style={sideMenuStyles.header}>
                        <View style={sideMenuStyles.profileWrap}>
                            <View style={sideMenuStyles.profileImgBox}>
                                <Image
                                    source={
                                        userProfileImg
                                            ? { uri: userProfileImg }
                                            : require("../../assets/images/internie_mascot_normal.png")
                                    }
                                    style={sideMenuStyles.profileImg}
                                    resizeMode="cover"
                                />
                            </View>

                            <View style={sideMenuStyles.profileInfo}>
                                <AppText style={sideMenuStyles.profileName} numberOfLines={1}>{userName}</AppText>
                                <AppText style={sideMenuStyles.profileEmail} numberOfLines={1}>{userEmail}</AppText>
                            </View>
                        </View>
                    </View>

                    <ScrollView style={sideMenuStyles.body} contentContainerStyle={sideMenuStyles.bodyContent} showsVerticalScrollIndicator={false}>
                        <Pressable
                            style={[sideMenuStyles.menuItem, currentMenu === "home" ? sideMenuStyles.menuItemActive : null]}
                            onPress={() => closeAfter(onMoveHome)}
                        >
                            <View style={sideMenuStyles.icon}>
                                <HomeIcon color={currentMenu === "home" ? ACTIVE_COLOR : INACTIVE_COLOR} />
                            </View>
                            <AppText style={[sideMenuStyles.menuText, currentMenu === "home" ? sideMenuStyles.menuTextActive : null]}>
                                {t("menu.home")}
                            </AppText>
                        </Pressable>

                        {hasActivities && (
                            <View style={sideMenuStyles.activityList}>
                                {activities.map((activity) => {
                                    const isActivityOpen = openedActivityId === activity.externalActivityId;

                                    return (
                                        <View style={sideMenuStyles.activitySection} key={activity.externalActivityId}>
                                            <Pressable
                                                style={sideMenuStyles.activityTitle}
                                                onPress={() => {
                                                    setOpenedActivityId((prev) => (
                                                        prev === activity.externalActivityId ? null : activity.externalActivityId
                                                    ));
                                                }}
                                            >
                                                <View style={[sideMenuStyles.arrowIcon, isActivityOpen ? sideMenuStyles.arrowIconOpen : null]}>
                                                    <ChevronDownIcon />
                                                </View>

                                                <AppText style={sideMenuStyles.activityTitleText} numberOfLines={1}>
                                                    {activity.name}
                                                </AppText>
                                            </Pressable>

                                            {isActivityOpen && (
                                                <View style={sideMenuStyles.activityMenuList}>
                                                    {activityMenus.map((menu) => {
                                                        const active = currentActivityId === activity.externalActivityId && currentActivityMenu === menu.key;

                                                        return (
                                                            <Pressable
                                                                key={menu.key}
                                                                style={[sideMenuStyles.activityMenuItem, active ? sideMenuStyles.activityMenuItemActive : null]}
                                                                onPress={() => {
                                                                    if (menu.disabled) {
                                                                        showPreparing();
                                                                        return;
                                                                    }

                                                                    closeAfter(() => onMoveActivityMenu(activity.externalActivityId, menu.key));
                                                                }}
                                                            >
                                                                <AppText style={[sideMenuStyles.activityMenuText, active ? sideMenuStyles.activityMenuTextActive : null]}>
                                                                    {menu.label}
                                                                </AppText>
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        <Pressable
                            style={[sideMenuStyles.menuItem, currentMenu === "vlog" ? sideMenuStyles.menuItemActive : null]}
                            onPress={() => closeAfter(onMoveVlogHome)}
                        >
                            <View style={sideMenuStyles.icon}>
                                <VlogIcon color={currentMenu === "vlog" ? ACTIVE_COLOR : INACTIVE_COLOR} />
                            </View>
                            <AppText style={[sideMenuStyles.menuText, currentMenu === "vlog" ? sideMenuStyles.menuTextActive : null]}>
                                {t("menu.vlog")}
                            </AppText>
                        </Pressable>
                        {/* <View style={sideMenuStyles.adminMenuGroup}>
                            {hasSystemAdmin && (
                                <Pressable style={sideMenuStyles.menuItem} onPress={() => closeAfter(onMoveSystemAdmin)}>
                                    <View style={sideMenuStyles.icon}><ChevronRightIcon /></View>
                                    <AppText style={sideMenuStyles.menuText}>인터니 관리자 페이지</AppText>
                                </Pressable>
                            )}

                            {hasJumpAdmin && (
                                <Pressable style={sideMenuStyles.menuItem} onPress={() => closeAfter(onMoveJumpAdmin)}>
                                    <View style={sideMenuStyles.icon}><ChevronRightIcon /></View>
                                    <AppText style={sideMenuStyles.menuText}>JUMP 관리자 페이지</AppText>
                                </Pressable>
                            )}

                            {hasKakaoAdmin && (
                                <Pressable style={sideMenuStyles.menuItem} onPress={() => closeAfter(onMoveKakaoAdmin)}>
                                    <View style={sideMenuStyles.icon}><ChevronRightIcon /></View>
                                    <AppText style={sideMenuStyles.menuText}>KAKAO 관리자 페이지</AppText>
                                </Pressable>
                            )}
                        </View> */}

                        <View style={sideMenuStyles.bottomMenu}>
                            <Pressable style={sideMenuStyles.menuItem} onPress={() => { void toggleLang(); }}>
                                <View style={sideMenuStyles.icon}><GlobeIcon /></View>
                                <AppText style={sideMenuStyles.menuText}>{t("menu.language")}</AppText>
                            </Pressable>

                            <Pressable style={sideMenuStyles.menuItem} onPress={() => closeAfter(onMoveMyPage)}>
                                <View style={sideMenuStyles.icon}><SettingsIcon /></View>
                                <AppText style={sideMenuStyles.menuText}>{t("menu.settings")}</AppText>
                            </Pressable>

                            {/* <Pressable style={sideMenuStyles.menuItem} onPress={showPreparing}>
                                <Image source={require("../../assets/icons/settings.png")} style={sideMenuStyles.icon} />
                                <AppText style={sideMenuStyles.menuText}>{t("menu.settings")}</AppText>
                            </Pressable> */}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Animated.View>
        </View>
    );
}