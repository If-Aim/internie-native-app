import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { ApiError, sendFindLoginIdCode, verifyFindLoginIdCode } from "../../api/client";
import { commonStyles } from "../../theme/common.Style";
import { styles } from "./FindId.style";

type Props = NativeStackScreenProps<AuthStackParamList, "FindId">;
type FormState = { email: string; code: string };

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

    const canSendCode = form.email.trim().length > 0;
    const canVerifyCode = form.code.trim().length > 0;

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
        <>
            <Modal visible={successModalOpen} transparent animationType="fade" onRequestClose={() => setSuccessModalOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Pressable style={[styles.modalCloseBtn, commonStyles.iconbtn]} onPress={() => setSuccessModalOpen(false)}>
                            <Image source={require("../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                        </Pressable>

                        <View style={styles.modalIconWrap}>
                            <Image source={require("../../assets/icons/mail-01-blue.png")} style={styles.modalIconImage} resizeMode="contain" />
                        </View>

                        <Text style={styles.modalText}>{t("findId.checkMailbox", "메일함을 확인해주세요")}</Text>

                        <Pressable style={styles.modalConfirmBtn} onPress={() => navigation.replace("Login")}>
                            <Text style={styles.modalConfirmBtnText}>{t("findId.goLoginNow", "로그인 화면으로")}</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <View style={styles.page}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <Pressable style={[styles.backBtn, commonStyles.iconbtn]} onPress={() => navigation.navigate("Login")}>
                            <Image source={require("../../assets/icons/chevron-left.png")} style={commonStyles.icon24} resizeMode="contain" />
                        </Pressable>
                        <Text style={styles.headerTitle}>{t("findId.title")}</Text>
                    </View>

                    <Text style={styles.title}>{t("findId.title")}</Text>
                    <Text style={styles.subtitle}>{t("findId.subtitle", "가입한 이메일로 인증 후 아이디를 확인할 수 있어요")}</Text>

                    <View style={styles.field}>
                        <TextInput
                            style={[styles.input, error && !codeSent ? styles.inputError : null]}
                            value={form.email}
                            onChangeText={(value) => {
                                setForm((prev) => ({ ...prev, email: value }));
                                setError(null);
                                setInfo(null);

                                if (codeSent) {
                                    setCodeSent(false);
                                    setForm((prev) => ({ ...prev, code: "" }));
                                }
                            }}
                            placeholder={t("findId.emailPlaceholder")}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {codeSent ? (
                        <View style={[styles.field, styles.fieldSecond]}>
                            <TextInput
                                style={[styles.input, error ? styles.inputError : null]}
                                value={form.code}
                                onChangeText={(value) => {
                                    setForm((prev) => ({ ...prev, code: value }));
                                    setError(null);
                                }}
                                placeholder={t("findId.codePlaceholder", "인증코드를 입력하세요")}
                                keyboardType="number-pad"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    ) : null}

                    {info ? <Text style={styles.infoText}>{info}</Text> : null}
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.footer}>
                        {!codeSent ? (
                            <Pressable style={[styles.primaryBtn, sending || !canSendCode ? styles.primaryBtnDisabled : null]} onPress={handleSendCode} disabled={sending || !canSendCode}>
                                <Text style={[styles.primaryBtnText, sending || !canSendCode ? styles.primaryBtnTextDisabled : null]}>{sending ? t("signup.sending", "전송 중") : t("findId.next", "다음")}</Text>
                            </Pressable>
                        ) : (
                            <Pressable style={[styles.primaryBtn, verifying || !canVerifyCode ? styles.primaryBtnDisabled : null]} onPress={handleVerifyCode} disabled={verifying || !canVerifyCode}>
                                <Text style={[styles.primaryBtnText, verifying || !canVerifyCode ? styles.primaryBtnTextDisabled : null]}>{verifying ? t("signup.verifying", "확인 중") : t("findId.getId", "아이디 찾기")}</Text>
                            </Pressable>
                        )}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}