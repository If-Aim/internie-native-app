import React, { useEffect, useState } from "react";
import { StyleSheet, Image, Modal, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { ApiError, sendFindLoginIdCode, verifyFindLoginIdCode } from "../../api/client";
import { commonStyles } from "../../theme/common.Style";
import { styles } from "./FindId.style";
import AppText from "../../../AppText";
import AppTextInput from "../../../AppTextInput";
import Mail01Blue from "../../assets/icons/mail-01-blue.svg"

type Props = NativeStackScreenProps<AuthStackParamList, "FindId">;
type FormState = { email: string; code: string };

function formatRemainingTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function FindIdScreen({ navigation }: Props): React.ReactElement {
    const { t, i18n } = useTranslation();
    const language = (i18n.resolvedLanguage ?? i18n.language ?? "ko").startsWith("en") ? "en" : "ko";

    const [form, setForm] = useState<FormState>({ email: "", code: "" });
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [codeSent, setCodeSent] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [, setMaskedEmail] = useState("");
    const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
    const [codeTimeLeft, setCodeTimeLeft] = useState(0);

    const canSendCode = form.email.trim().length > 0;
    const canVerifyCode = form.code.trim().length > 0 && codeTimeLeft > 0;

    useEffect(() => {
        if (!codeExpiresAt) {
            setCodeTimeLeft(0);
            return;
        }

        const updateRemaining = () => {
            const remain = Math.max(0, Math.floor((codeExpiresAt - Date.now()) / 1000));
            setCodeTimeLeft(remain);
        };

        updateRemaining();
        const timer = setInterval(updateRemaining, 1000);
        return () => clearInterval(timer);
    }, [codeExpiresAt]);

    const handleSendCode = async () => {
        const email = form.email.trim();

        if (!email) {
            setError(t("findId.emailRequired"));
            return;
        }

        setSending(true);
        setError(null);
        setInfo(null);

        try {
            const res = await sendFindLoginIdCode(email, language);
            setMaskedEmail(res.maskedEmail);
            setInfo(t("findId.codeSent", { email: res.maskedEmail }));
            setCodeSent(true);
            setCodeExpiresAt(Date.now() + 10 * 60 * 1000);
            setCodeTimeLeft(10 * 60);
        } catch (e: any) {
            const code = e?.code ?? "";

            if (code === "ALREADY_REGISTERED_WITH_GOOGLE") {
                setError(t("findId.alreadyGoogle"));
            } else if (code === "ALREADY_REGISTERED_WITH_KAKAO") {
                setError(t("findId.alreadyKakao"));
            } else if (code === "USER_NOT_FOUND") {
                setError(t("findId.accountNotFound"));
            } else if (e instanceof ApiError) {
                setError(e.message || t("findId.codeSendFail"));
            } else {
                setError(t("findId.codeSendFail"));
            }
        } finally {
            setSending(false);
        }
    };

    const handleVerifyCode = async () => {
        const email = form.email.trim();
        const code = form.code.trim();

        if (!code) {
            setError(t("findId.codeRequired"));
            return;
        }
        if (codeTimeLeft <= 0) {
            setError(t("findId.codeExpired", "인증코드가 만료되었습니다. 다시 요청해주세요."));
            return;
        }
        setVerifying(true);
        setError(null);
        setInfo(null);
        try {
            const res = await verifyFindLoginIdCode(email, code, language);
            setMaskedEmail(res.maskedEmail);
            setSuccessModalOpen(true);
        } catch (e: any) {
            if (e instanceof ApiError) {
                setError(e.message || t("findId.codeVerifyFail"));
            } else {
                setError(t("findId.codeVerifyFail"));
            }
        } finally {
            setVerifying(false);
        }
    };

    

    return (
        <SafeAreaView style={commonStyles.appRoot}>
            <Modal visible={successModalOpen} transparent animationType="fade" onRequestClose={() => setSuccessModalOpen(false)}>
                <View style={StyleSheet.absoluteFill}>
                    <BlurView style={StyleSheet.absoluteFill} blurType="xlight" blurAmount={1} />
                    <View style={commonStyles.modalDimLight} />
                </View>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Pressable style={[styles.modalCloseBtn, commonStyles.iconbtn]} onPress={() => setSuccessModalOpen(false)}>
                            <Image source={require("../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                        </Pressable>
                        <Mail01Blue style={styles.modalIconImage}/>
                        <AppText style={styles.modalText}>{t("findId.checkMailbox", "메일함을 확인해주세요")}</AppText>

                        <Pressable style={styles.modalConfirmBtn} onPress={() => navigation.replace("Login")}>
                            <AppText style={styles.modalConfirmBtnText}>{t("findId.goLoginNow", "로그인 화면으로")}</AppText>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <View style={styles.page}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <Pressable style={commonStyles.iconbtn} onPress={() => navigation.navigate("Login")}>
                            <Image source={require("../../assets/icons/chevron-left.png")} style={commonStyles.icon24} resizeMode="contain" />
                        </Pressable>
                        <AppText style={styles.headerTitle}>{t("findId.title")}</AppText>
                        <View style={commonStyles.icon40} />
                    </View>
                    <AppText style={styles.title}>{t("findId.title")}</AppText>
                    <View style={styles.main}>
                        <View style={styles.fieldGroup}>
                            <AppTextInput
                                style={[styles.input, error && !codeSent ? styles.inputError : null]}
                                value={form.email}
                                onChangeText={(value) => {
                                    setForm((prev) => ({ ...prev, email: value }));
                                    setError(null);
                                    setInfo(null);

                                    if (codeSent) {
                                        setCodeSent(false);
                                        setForm((prev) => ({ ...prev, code: "" }));
                                        setCodeExpiresAt(null);
                                        setCodeTimeLeft(0);
                                    }
                                }}
                                placeholder={t("findId.emailPlaceholder")}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {codeSent ? (
                                <View style={styles.field}>
                                    <View style={styles.inputWrap}>
                                        <AppTextInput
                                            style={[styles.input, styles.inputTimer, error ? styles.inputError : null]}
                                            value={form.code}
                                            onChangeText={(value) => {
                                                setForm((prev) => ({ ...prev, code: value.replace(/\D/g, "").slice(0, 6) }));
                                                setError(null);
                                            }}
                                            placeholder={t("findId.codePlaceholder", "인증코드를 입력하세요")}
                                            keyboardType="number-pad"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            editable={codeTimeLeft > 0}
                                        />
                                        {codeTimeLeft > 0 ? <AppText style={styles.timer}>{formatRemainingTime(codeTimeLeft)}</AppText> : null}
                                    </View>
                                </View>
                            ) : null}
                        </View>
                        <View style={styles.messageWrap}>
                            <AppText
                                style={[
                                    error || (codeSent && codeTimeLeft <= 0) ? styles.errorText : styles.infoText,
                                    !error && !(codeSent && codeTimeLeft <= 0) && !info ? styles.messageHidden : null,
                                ]}
                            >
                                {(
                                    error ||
                                    (codeSent && codeTimeLeft <= 0 ? t("findId.codeExpired", "인증코드가 만료되었습니다. 다시 요청해주세요.") : info) ||
                                    " "
                                ).replace(/\\n/g, "\n")}
                            </AppText>
                        </View>
                    </View>
                    <View style={styles.footer}>
                        {!codeSent ? (
                            <Pressable style={[styles.primaryBtn, sending || !canSendCode ? styles.primaryBtnDisabled : null]} onPress={handleSendCode} disabled={sending || !canSendCode}>
                                <AppText style={[styles.primaryBtnText, sending || !canSendCode ? styles.primaryBtnTextDisabled : null]}>{sending ? t("signup.sending", "전송 중") : t("findId.next", "다음")}</AppText>
                            </Pressable>
                        ) : (
                            <Pressable style={[styles.primaryBtn, verifying || !canVerifyCode ? styles.primaryBtnDisabled : null]} onPress={handleVerifyCode} disabled={verifying || !canVerifyCode}>
                                <AppText style={[styles.primaryBtnText, verifying || !canVerifyCode ? styles.primaryBtnTextDisabled : null]}>{verifying ? t("signup.verifying", "확인 중") : t("findId.getId", "아이디 찾기")}</AppText>
                            </Pressable>
                        )}
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}