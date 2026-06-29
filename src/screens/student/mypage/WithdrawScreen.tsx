import React from "react";
import { Alert, Image, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { getUserMe, withdraw, type UserMe } from "../../../api/client";
import { commonStyles } from "../../../theme/common.Style";
import { styles } from "./Withdraw.style";

import AppText from "../../../../AppText";
import AppTextInput from "../../../../AppTextInput";

const REASONS = [
    "mypage.WithdrawR.reason.notUsing",
    "mypage.WithdrawR.reason.notUseful",
    "mypage.WithdrawR.reason.tooExpensive",
    "mypage.WithdrawR.reason.privacy",
    "mypage.WithdrawR.reason.etc",
] as const;

type Props = NativeStackScreenProps<StudentStackParamList, "Withdraw">;
type WithdrawReason = typeof REASONS[number] | "";

export default function WithdrawScreen({ navigation }: Props): React.ReactElement {
    const { t } = useTranslation();

    const [me, setMe] = React.useState<UserMe | null>(null);
    const [reason, setReason] = React.useState<WithdrawReason>("");
    const [detail, setDetail] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    const displayName = (me?.name ?? "").trim() || t("mypage.memberFallback");
    const isEtcReason = reason === "mypage.WithdrawR.reason.etc";
    const trimmedDetail = detail.trim();
    const canSubmit = !!reason && !submitting && (!isEtcReason || !!trimmedDetail);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await getUserMe();
                if (!mounted) return;
                setMe(res);
            } catch (e) {
                console.error("getUserMe failed:", e);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const handleSelectReason = (value: typeof REASONS[number]) => {
        setReason(value);
        setOpen(false);

        if (value !== "mypage.WithdrawR.reason.etc") {
            setDetail("");
        }
    };

    const handleWithdraw = async () => {
        if (!canSubmit) return;

        try {
            setSubmitting(true);

            await withdraw({
                reason: t(reason),
                detail: isEtcReason ? trimmedDetail : "",
            });

            navigation.getParent()?.navigate("Auth" as never);
        } catch (e) {
            console.error("withdraw failed:", e);
            Alert.alert(
                t("common.error"),
                t("mypage.withdrawErrorDesc")
            );
        } finally {
            setSubmitting(false);
        }
    };

    const confirmWithdraw = () => {
        if (!canSubmit) return;

        Alert.alert(
            t("mypage.withdrawConfirmTitle"),
            t("mypage.withdrawConfirmDesc"),
            [
                { text: t("common.cancel"), style: "cancel" },
                { text: t("mypage.WithdrawSubmit"), style: "destructive", onPress: handleWithdraw },
            ]
        );
    };

    return (
        <SafeAreaView style={commonStyles.appRoot}>
            <View style={[commonStyles.topbarMain, commonStyles.topbarRow]}>
                <Pressable style={commonStyles.iconbtn} onPress={() => navigation.goBack()}>
                    <Image source={require("../../../assets/icons/chevron-left.png")} style={commonStyles.icon24} resizeMode="contain" />
                </Pressable>
                <View style={commonStyles.icon40} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <View style={styles.copy}>
                        <AppText style={styles.title}>
                            {t("mypage.WithdrawTitle", { name: displayName })}
                            {"\n"}
                            {t("mypage.WithdrawTitle2")}
                        </AppText>
                        <AppText style={styles.desc}>
                            {t("mypage.WithdrawDesc")}
                            {"\n"}
                            {t("mypage.WithdrawDesc2")}
                            {"\n"}
                            {t("mypage.WithdrawDesc3")}
                        </AppText>
                    </View>

                    <View style={styles.imageWrap}>
                        <Image source={require("../../../assets/images/internie_mascot_crying.png")} style={styles.heroImage} resizeMode="contain" />
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.questionRow}>
                        <View style={styles.questionBadge}>
                            <AppText style={styles.questionBadgeText}>Q</AppText>
                        </View>
                        <AppText style={styles.question}>{t("mypage.WithdrawQuestion", { name: displayName })}</AppText>
                    </View>

                    <View style={styles.selectWrap}>
                        <Pressable style={styles.selectBtn} onPress={() => setOpen((prev) => !prev)}>
                            <AppText style={[styles.selectText, !reason ? styles.selectPlaceholder : null]}>
                                {reason ? t(reason) : t("mypage.WithdrawReasonSelect")}
                            </AppText>
                            <Image source={require("../../../assets/icons/chevron-down-ae.png")} style={commonStyles.icon24} resizeMode="contain" />
                        </Pressable>
                        {open ? (
                            <View style={styles.optionList}>
                                {REASONS.map((item) => (
                                    <Pressable key={item} style={styles.optionItem} onPress={() => handleSelectReason(item)}>
                                        <AppText style={[styles.optionText, reason === item ? styles.optionTextSelected : null]}>{t(item)}</AppText>
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}
                    </View>

                    {isEtcReason ? (
                        <AppTextInput
                            style={styles.detailInput}
                            placeholder={t("mypage.WithdrawR.reason.detailPlaceholder")}
                            value={detail}
                            onChangeText={setDetail}
                            multiline
                            maxLength={300}
                            textAlignVertical="top"
                        />
                    ) : null}
                </View>
                <View style={styles.notice}>
                    <AppText style={styles.noticeTitle}>{t("mypage.WithdrawNoticeTitle")}</AppText>
                    <AppText style={styles.noticeDesc}>{t("mypage.WithdrawNoticeDesc")}</AppText>
                    <AppText style={styles.noticeDesc}>{t("mypage.WithdrawNoticeDesc2")}</AppText>
                </View>
                <View style={styles.bottomSpacer} />
            </ScrollView>

            <View style={styles.submitDock} pointerEvents="box-none">
                <Pressable style={[styles.submitBtn, !canSubmit ? styles.submitBtnDisabled : null]} onPress={confirmWithdraw} disabled={!canSubmit}>
                    <AppText style={[styles.submitBtnText, !canSubmit ? styles.submitBtnTextDisabled : null]}>
                        {submitting ? t("mypage.WithdrawSubmitting") : t("mypage.WithdrawSubmit")}
                    </AppText>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
