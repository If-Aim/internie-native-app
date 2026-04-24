import React from "react";
import { API_BASE_URL } from "@env";
import { View, Pressable, Image, ScrollView, Alert, Modal, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { getUserMe, logout, getEventDaysByMonth, type UserMe, type EventDay, withdraw } from "../../../api/client";

import { styles } from "./MyPage.style";
import { commonStyles } from "../../../theme/common.Style";

import AppText from "../../../../AppText";

type Props = NativeStackScreenProps<StudentStackParamList, "MyPage">;
type VerifyStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

function getApiOrigin(url: string) {
    return url.replace(/\/+$/, "").replace(/\/api$/, "");
}

function resolveImageUrl(path?: string | null) {
    const raw = String(path ?? "").trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const origin = getApiOrigin(API_BASE_URL);
    if (raw.startsWith("/")) return `${origin}${raw}`;
    return `${origin}/${raw}`;
}

function currentYm() {
    const d = new Date();
    return { y: String(d.getFullYear()), m: String(d.getMonth() + 1).padStart(2, "0") };
}

function prevYm(y: string, m: string) {
    const yy = Number(y);
    const mm = Number(m);
    if (mm === 1) return { y: String(yy - 1), m: "12" };
    return { y, m: String(mm - 1).padStart(2, "0") };
}

function sortKey(ed: EventDay) {
    const dateKey = ed.date.replaceAll("-", "");
    const timeKey = (ed.startTime ?? "00:00").slice(0, 5).replace(":", "");
    const txCount = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
    return { dateKey, timeKey, txCount };
}

function Header({ onPreviousClick }: { onPreviousClick: () => void }) {
    return (
        <View style={styles.header}>
            <Pressable style={commonStyles.iconbtn} onPress={onPreviousClick}>
                <Image source={require("../../../assets/icons/chevron-left.png")} style={commonStyles.icon24} resizeMode="contain" />
            </Pressable>
            <AppText style={styles.headerTitle} />
            <View style={commonStyles.icon40} />
        </View>
    );
}

export default function MyPageScreen({ navigation }: Props) {
    const isFocused = useIsFocused();
    const { t, i18n } = useTranslation();

    const [me, setMe] = React.useState<UserMe | null>(null);
    const [showRejectModal, setShowRejectModal] = React.useState(false);
    const [/*recent*/, setRecent] = React.useState<EventDay[]>([]);

    const displayName = me?.name ?? "";
    const status = (me?.status ?? "UNVERIFIED") as VerifyStatus;
    const schoolName = (me?.school?.name ?? "").trim();
    const rejectReasonText = (me?.rejectionReason ?? "").trim();
    const isVerifiedStudent = status === "APPROVED";

    const isDefaultProfile = !me?.profileImage || String(me?.profileImage ?? "").includes("default");
    const rawAvatarSrc = isDefaultProfile ? null : (me?.profileImage ?? null);
    const resolvedAvatarSrc = resolveImageUrl(rawAvatarSrc);
    const avatarSrc = resolvedAvatarSrc ?? null;

    const mypageSubText = React.useMemo(() => {
        if (status === "APPROVED") {
            return schoolName || t("mypage_verifyUi.approved");
        }
        return t("mypage_verifyUi.required");
    }, [status, schoolName, t]);

    const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");

    const handleServicePreparing = React.useCallback(() => {
        Alert.alert(isKo ? "서비스 준비중입니다." : "Coming Soon");
    }, [isKo]);

    const verifyUi = React.useMemo(() => {
        switch (status) {
            case "PENDING":
                return {
                    label: t("mypage_verifyUi.pending"),
                    disabled: true,
                    onPress: () => {},
                };
            case "REJECTED":
                return {
                    label: t("mypage_verifyUi.rejected"),
                    disabled: false,
                    onPress: () => navigation.navigate("SchoolVerify"),
                };
            case "APPROVED":
                return {
                    label: "프로필 수정하기",
                    disabled: false,
                    onPress: handleServicePreparing,
                };
            case "UNVERIFIED":
            default:
                return {
                    label: t("mypage_verifyUi.unverified"),
                    disabled: false,
                    onPress: () => navigation.navigate("SchoolVerify"),
                };
        }
    }, [status, navigation, handleServicePreparing, t]);

    const loadMe = React.useCallback(async () => {
        try {
            const res = await getUserMe();

            const lastStatusKey = `mypage_last_status_${res.userId}`;
            const lastStatus = await AsyncStorage.getItem(lastStatusKey);

            if (res.status === "REJECTED" && lastStatus !== "REJECTED") {
                setShowRejectModal(true);
            }

            await AsyncStorage.setItem(lastStatusKey, res.status ?? "");
            setMe(res);
        } catch {
            setMe(null);
        }
    }, []);

    const handleLogout = React.useCallback(async () => {
        try {
            await logout();
        } catch {
        } finally {
            navigation.getParent()?.navigate("Auth" as never);
        }
    }, [navigation]);

    const goReVerify = React.useCallback(() => {
        setShowRejectModal(false);
        navigation.navigate("SchoolVerify");
    }, [navigation]);

    const closeRejectModal = React.useCallback(() => {
        if (!me) return;
        setShowRejectModal(false);
    }, [me]);

    React.useEffect(() => {
        if (!isFocused) return;
        loadMe().catch(console.error);
    }, [isFocused, loadMe]);

    React.useEffect(() => {
        if (!isFocused) return;

        let mounted = true;

        (async () => {
            try {
                const { y, m } = currentYm();
                const prev = prevYm(y, m);

                const [curRes, prevRes] = await Promise.all([
                    getEventDaysByMonth(y, m),
                    getEventDaysByMonth(prev.y, prev.m),
                ]);

                const all = [...(curRes.eventDayList ?? []), ...(prevRes.eventDayList ?? [])];
                const recorded = all.filter((ed) => Array.isArray(ed.transcriptions) && ed.transcriptions.length > 0);

                recorded.sort((a, b) => {
                    const A = sortKey(a);
                    const B = sortKey(b);
                    if (A.dateKey !== B.dateKey) return A.dateKey < B.dateKey ? 1 : -1;
                    if (A.timeKey !== B.timeKey) return A.timeKey < B.timeKey ? 1 : -1;
                    return A.txCount < B.txCount ? 1 : -1;
                });

                if (!mounted) return;
                setRecent(recorded.slice(0, 2));
            } catch {
                if (!mounted) return;
                setRecent([]);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [isFocused]);

    return (
        <SafeAreaView style={commonStyles.appRoot}>
            <View style={styles.page}>
                <Header onPreviousClick={() => navigation.goBack()} />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <View style={styles.top}>
                        <View style={styles.profileImgWrap}>
                            <Image
                                source={
                                    avatarSrc
                                        ? { uri: avatarSrc }
                                        : require("../../../assets/images/internie_mascot_normal.png")
                                }
                                style={styles.profileImg}
                                resizeMode="cover"
                            />
                            {isVerifiedStudent ? (
                                <Image source={require("../../../assets/icons/school-verified-01.png")} style={styles.verifyBadge} resizeMode="contain" />
                            ) : null}
                        </View>

                        <AppText style={styles.greeting}>
                            {t("mypage.greeting")} <AppText style={styles.name}>{displayName}</AppText>{t("mypage.greeting2")}
                        </AppText>

                        <AppText style={styles.subText}>{mypageSubText}</AppText>
                    </View>

                    <View style={styles.cards}>
                        {status !== "APPROVED" ? (
                            <Pressable style={[styles.verifyCard, status === "PENDING" ? styles.verifyCardPending : null]} onPress={verifyUi.onPress} disabled={verifyUi.disabled}>
                                <AppText style={[styles.verifyCardTitle, status === "PENDING" ? styles.verifyCardTitlePending : null]}>{verifyUi.label}</AppText>
                            </Pressable>
                        ) : null}

                        <View style={styles.menu}>
                            <Pressable style={styles.menuItem} onPress={() => navigation.navigate("UserModify")}>
                                <AppText style={styles.menuTitle}>{t("mypage.editProfile")}</AppText>
                                <View style={styles.menuRight}>
                                    <Image source={require("../../../assets/icons/chevron-right.png")} style={styles.menuChevron} resizeMode="contain" />
                                </View>
                            </Pressable>

                            <Pressable style={styles.menuItem} onPress={() => navigation.navigate("TargetCom")}>
                                <AppText style={styles.menuTitle}>{t("mypage.targetCompany")}</AppText>
                                <View style={styles.menuRight}>
                                    <AppText style={styles.menuValue}>{me?.interestCompany?.trim() ? me.interestCompany : t("mypage.notSet")}</AppText>
                                    <Image source={require("../../../assets/icons/chevron-right.png")} style={styles.menuChevron} resizeMode="contain" />
                                </View>
                            </Pressable>

                            <Pressable style={styles.menuItem} onPress={() => navigation.navigate("Certificates")}>
                                <AppText style={styles.menuTitle}>{t("mypage.certs")}</AppText>
                                <View style={styles.menuRight}>
                                    <Image source={require("../../../assets/icons/chevron-right.png")} style={styles.menuChevron} resizeMode="contain" />
                                </View>
                            </Pressable>

                            <Pressable style={styles.menuItem} onPress={() => navigation.navigate("VerifyCode")}>
                                <AppText style={styles.menuTitle}>{t("mypage.verifyCode")}</AppText>
                                <View style={styles.menuRight}>
                                    <Image source={require("../../../assets/icons/chevron-right.png")} style={styles.menuChevron} resizeMode="contain" />
                                </View>
                            </Pressable>
                        </View>

                        <Pressable style={styles.withdrawBtn} onPress={() => navigation.navigate("Withdraw")}>
                            <AppText style={styles.withdrawText}>{isKo ? "회원탈퇴" : "Delete account"}</AppText>
                        </Pressable>
                    </View>
                    <View style={styles.logoutDock} pointerEvents="box-none">
                        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                            <AppText style={styles.logoutText}>{t("mypage.logout")}</AppText>
                        </Pressable>
                    </View>
                </ScrollView>
                <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={closeRejectModal}>
                    <View style={styles.modalBackdrop}>
                        <View style={StyleSheet.absoluteFill}>
                            <BlurView style={StyleSheet.absoluteFill} blurType="xlight" blurAmount={1} />
                            <View style={commonStyles.modalDimLight} />
                        </View>
                        <View style={styles.modalCard}>
                            <Pressable style={commonStyles.iconbtn} accessibilityLabel="close" onPress={closeRejectModal}>
                                <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                            </Pressable>

                            <View style={styles.modalBody}>
                                <AppText style={styles.modalTitle}>{t("mypage_modal.title")}</AppText>
                                <AppText style={styles.modalReason}>사유:</AppText>
                                <AppText style={styles.modalReason}>{rejectReasonText || "-"}</AppText>
                            </View>

                            <Pressable style={styles.modalPrimaryButton} onPress={goReVerify}>
                                <AppText style={styles.modalPrimaryButtonText}>{t("mypage_modal.reVerify")}</AppText>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}