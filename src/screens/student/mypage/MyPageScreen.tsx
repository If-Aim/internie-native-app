// src/screens/student/mypage/MyPageScreen.tsx
import React from "react";
import { API_BASE_URL } from "@env";
import { View, Text, Pressable, Image, ScrollView, Alert, Modal, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { getUserMe, logout, getEventDaysByMonth, type UserMe, type EventDay, deleteMyAccount } from "../../../api/client";

import { styles } from "./MyPage.style";
import { commonStyles } from "../../../theme/common.Style";

type Props = NativeStackScreenProps<StudentStackParamList, "MyPage">;
type VerifyStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

function isHttp(url: string) {
    return /^https?:\/\//i.test(url);
}
// 프로필 사진 관련
function getApiOrigin(url: string) {
    return url.replace(/\/+$/, "").replace(/\/api$/, "");
}

function resolveImageUrl(path?: string | null) {
    const raw = String(path ?? "").trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    const origin = getApiOrigin(API_BASE_URL);

    if (raw.startsWith("/")) {
        return `${origin}${raw}`;
    }

    return `${origin}/${raw}`;
}
// 최근 기록 관련 유틸
function currentYm() {
    const d = new Date();
    return {
        y: String(d.getFullYear()),
        m: String(d.getMonth() + 1).padStart(2, "0"),
    };
}

function prevYm(y: string, m: string) {
    const yy = Number(y);
    const mm = Number(m);

    if (mm === 1) {
        return { y: String(yy - 1), m: "12" };
    }

    return { y, m: String(mm - 1).padStart(2, "0") };
}

function sortKey(ed: EventDay) {
    const dateKey = ed.date.replaceAll("-", "");
    const timeKey = (ed.startTime ?? "00:00").slice(0, 5).replace(":", "");
    const txCount = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;

    return { dateKey, timeKey, txCount };
}

// HEADER
function Header({
	onPreviousClick,
}: {
	onPreviousClick: () => void,
}) {
	return (
		<View style={[commonStyles.topbarMain, commonStyles.topbarRow]}>
			<Pressable style={commonStyles.iconbtn} onPress={onPreviousClick} >
				<Image source={require("../../../assets/icons/chevron-left.png")} style={commonStyles.icon24} />
			</Pressable>
			<View style={styles.headerCenter}>
				<Text style={styles.headerTitle} numberOfLines={1} />
			</View>

			<View style={styles.headerRightSpace} />
		</View>
	);
}

export default function MyPageScreen({ navigation }: Props) {
    const isFocused = useIsFocused();
	const { t, i18n } = useTranslation();


    const [me, setMe] = React.useState<UserMe | null>(null);
    const [showRejectModal, setShowRejectModal] = React.useState(false);
    const [recent, setRecent] = React.useState<EventDay[]>([]);

    const displayName = me?.name ?? "";
    const status = (me?.status ?? "UNVERIFIED") as VerifyStatus;
    const schoolName = (me?.school?.name ?? "").trim();

    const isVerifiedStudent = status === "APPROVED";

    const isDefaultProfile = !me?.profileImage;
    const rawAvatarSrc = isDefaultProfile ? null : (me?.profileImage ?? null);
	const resolvedAvatarSrc = resolveImageUrl(rawAvatarSrc);
	const avatarSrc = resolvedAvatarSrc ?? null;

    const mypageSubText = React.useMemo(() => {
        if (status === "APPROVED") {
        	return schoolName || t("mypage_verifyUi.approved");
        }

        return t("mypage_verifyUi.required");
    }, [status, schoolName]);

	const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");
    const handleServicePreparing = React.useCallback(() => {
        Alert.alert(isKo ? "서비스 준비중입니다.": "Coming Soon");
    }, []);

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
    }, [status, navigation, handleServicePreparing]);

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

        } catch (error) {
            setMe(null);
        }
    }, []);

    const handleLogout = React.useCallback(async () => { // 로그아웃 
        try {
            await logout();
        } catch (error) {
        } finally {
            navigation.getParent()?.navigate("Auth" as never);
        }
    }, [navigation]);

    const handleDeleteAccount = React.useCallback(async () => { // 회원탈퇴
        try {
            await deleteMyAccount();
            Alert.alert(
                isKo ? "회원 탈퇴 완료" : "Account deleted",
                isKo ? "회원 탈퇴가 완료되었습니다." : "Your account has been deleted."
            );
            navigation.getParent()?.navigate("Auth" as never);
        } catch (error: any) {
            Alert.alert(
                isKo ? "회원 탈퇴 실패" : "Delete failed",
                isKo ? "회원 탈퇴 중 문제가 발생했습니다." : "There was a problem deleting your account."
            );
        }
    }, [navigation, isKo]);

    const confirmDeleteAccount = React.useCallback(() => {
        Alert.alert(
            isKo ? "회원 탈퇴" : "Delete account",
            isKo ? "정말 회원 탈퇴하시겠습니까?\n탈퇴 후에는 계정을 복구할 수 없습니다." : "Are you sure you want to delete your account?\nThis action cannot be undone.",
            [
                {
                    text: isKo ? "취소" : "Cancel",
                    style: "cancel",
                },
                {
                    text: isKo ? "회원탈퇴" : "Delete",
                    style: "destructive",
                    onPress: handleDeleteAccount,
                },
            ]
        );
    }, [handleDeleteAccount, isKo]);
    
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

        void loadMe();
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

                const all = [
                    ...(curRes.eventDayList ?? []),
                    ...(prevRes.eventDayList ?? []),
                ];

                const recorded = all.filter((ed) =>
                    Array.isArray(ed.transcriptions) && ed.transcriptions.length > 0
                );

                recorded.sort((a, b) => {
                    const A = sortKey(a);
                    const B = sortKey(b);

                    if (A.dateKey !== B.dateKey) return A.dateKey < B.dateKey ? 1 : -1;
                    if (A.timeKey !== B.timeKey) return A.timeKey < B.timeKey ? 1 : -1;
                    return A.txCount < B.txCount ? 1 : -1;
                });

                if (!mounted) return;
                setRecent(recorded.slice(0, 2));
            } catch (error) {
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
			<Header onPreviousClick={() => navigation.goBack()} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" >
                <View style={styles.top}>
                    <View style={styles.profileWrap}>
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

                            {isVerifiedStudent && (
                                <Image source={require("../../../assets/icons/school-verified-01.png")} style={styles.verifyBadge} resizeMode="contain" />
                            )}
                        </View>

                        <Text style={styles.greeting}>
                            {t("mypage.greeting")} <Text style={styles.name}>{displayName}</Text>{t("mypage.greeting2")}
                        </Text>

                        <Text style={styles.subText}>{mypageSubText}</Text>
                    </View>
                </View>

                <View style={styles.cards}>
                    {status !== "APPROVED" && (
                        <Pressable style={[ styles.verifyCard, status === "PENDING" ? styles.verifyCardPending : null, ]} onPress={verifyUi.onPress} disabled={verifyUi.disabled} >
                            <Text style={[styles.verifyCardTitle, status === "PENDING" ? styles.verifyCardTitlePending : null,]}>{verifyUi.label}</Text>
                        </Pressable>
                    )}

                    <View style={styles.menu}>
                        <Pressable style={styles.menuItem} onPress={() => navigation.navigate("UserModify")} >
                            <Text style={styles.menuTitle}>{t("mypage.editProfile")}</Text>
                            <View style={styles.menuRight}>
                                <Image source={require("../../../assets/icons/chevron-right.png")} style={styles.menuChevron} />
                            </View>
                        </Pressable>
                        <Pressable style={styles.menuItem} onPress={handleServicePreparing}>
                            <Text style={styles.menuTitle}>{t("mypage.targetCompany")}</Text>
                            <View style={styles.menuRight}>
                                <Text style={styles.menuValue}>
                                    {me?.interestCompany?.trim() ? me.interestCompany : t("mypage.notSet")}
                                </Text>
                                <Image source={require("../../../assets/icons/chevron-right.png")} style={styles.menuChevron} />
                            </View>
                        </Pressable>
                        <Pressable style={styles.menuItem} onPress={() => navigation.navigate("Certificates")} >
                            <Text style={styles.menuTitle}>{t("mypage.certs")}</Text>
                            <View style={styles.menuRight}>
                                <Image source={require("../../../assets/icons/chevron-right.png")} style={styles.menuChevron} />
                            </View>
                        </Pressable>
                        <Pressable style={styles.menuItem} onPress={() => navigation.navigate("VerifyCode")} >
                            <Text style={styles.menuTitle}>{t("mypage.verifyCode")}</Text>
                            <View style={styles.menuRight}>
                                <Image source={require("../../../assets/icons/chevron-right.png")} style={styles.menuChevron} />
                            </View>
                        </Pressable>
                    </View>

                    <View style={{ height: 30 }} />
                </View>
                <View style={styles.logoutDock} pointerEvents="box-none">
                    <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                        <Text style={styles.logoutText}>{t("mypage.logout")}</Text>
                    </Pressable>
                    <Pressable style={styles.withdrawBtn} onPress={confirmDeleteAccount}>
                        <Text style={styles.withdrawText}>
                            {isKo ? "회원탈퇴" : "Delete account"}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>

            

            <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={closeRejectModal} >
                <View style={styles.modalBackdrop}>
					<BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={5} />
                    <View style={styles.modalCard}>
                        <Pressable style={styles.modalClose} accessibilityLabel="close" onPress={closeRejectModal} >
                            <Image source={require("../../../assets/icons/x-01.png")} style={styles.modalCloseIcon} />
                        </Pressable>

                        <View style={styles.modalBody}>
                            <Text style={styles.modalTitle}>{t("mypage_modal.title")}</Text>
                            <Text style={styles.modalReason}>
                                사유:
                            </Text>
                            <Text style={styles.modalReason}>
                                정보 미제거, 학생증 판별 불가
                            </Text>
                        </View>

                        <Pressable style={styles.modalPrimaryButton} onPress={goReVerify} >
                            <Text style={styles.modalPrimaryButtonText}>
                                {t("mypage_modal.reVerify")}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}