import React, { useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { ApiError, resetPasswordWithToken, sendResetPasswordCode, verifyResetPasswordCode } from "../../api/client";
import { commonStyles } from "../../theme/common.Style";
import { styles } from "./ResetPassword.style";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;
type Step = 1 | 2;
type FormState = { loginId: string; email: string; code: string; newPassword: string; newPasswordConfirm: string };

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function isValidResetPassword(value: string): boolean {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/.test(value);
}

export default function ResetPasswordScreen({ navigation }: Props): React.ReactElement {
    const { t, i18n } = useTranslation();
    const language = (i18n.resolvedLanguage ?? i18n.language ?? "ko").startsWith("en") ? "en" : "ko";

    const [step, setStep] = useState<Step>(1);
    const [form, setForm] = useState<FormState>({ loginId: "", email: "", code: "", newPassword: "", newPasswordConfirm: "" });
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState("");
    const [codeSent, setCodeSent] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [openGuide, setOpenGuide] = useState<"password" | null>(null);
    const [successModalOpen, setSuccessModalOpen] = useState(false);

    const prevLoginIdRef = useRef(form.loginId);
    const prevEmailRef = useRef(form.email);

    const canSendCode = form.loginId.trim().length > 0 && form.email.trim().length > 0 && !sending;
    const canVerifyCode = form.code.trim().length > 0 && !verifying && remainingSeconds > 0;
    const passwordInvalid = form.newPassword.length > 0 && !isValidResetPassword(form.newPassword);
    const passwordMismatch = form.newPasswordConfirm.length > 0 && form.newPassword.length > 0 && form.newPassword !== form.newPasswordConfirm;
    const canSubmit = form.newPassword.length > 0 && form.newPasswordConfirm.length > 0 && form.newPassword === form.newPasswordConfirm && isValidResetPassword(form.newPassword) && !submitting;

    useEffect(() => {
        if (prevLoginIdRef.current === form.loginId) return;
        prevLoginIdRef.current = form.loginId;
        if (step !== 1) return;
        setCodeSent(false);
        setRemainingSeconds(0);
        setInfo(null);
        setError(null);
        setForm((prev) => ({ ...prev, code: "" }));
    }, [form.loginId, step]);

    useEffect(() => {
        if (prevEmailRef.current === form.email) return;
        prevEmailRef.current = form.email;
        if (step !== 1) return;
        setCodeSent(false);
        setRemainingSeconds(0);
        setInfo(null);
        setError(null);
        setForm((prev) => ({ ...prev, code: "" }));
    }, [form.email, step]);

    useEffect(() => {
        if (!codeSent || remainingSeconds <= 0) return;

        const timer = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [codeSent, remainingSeconds]);

    const handleSendCode = async () => {
        const loginId = form.loginId.trim();
        const email = form.email.trim();

        if (!loginId || !email) {
            setError(t("resetPassword.requiredLoginIdEmail", "아이디와 이메일을 입력해주세요."));
            return;
        }

        setSending(true);
        setError(null);
        setInfo(null);

        try {
            await sendResetPasswordCode({ loginId, email, language });
            setCodeSent(true);
            setRemainingSeconds(600);
            setForm((prev) => ({ ...prev, code: "" }));
            setInfo(t("resetPassword.codeSent", { email }));
        } catch (e) {
            if (e instanceof ApiError) {
                setError(t("resetPassword.codeSendFail", "인증코드 발송에 실패했습니다."));
            } else {
                setError(t("resetPassword.codeSendFail", "인증코드 발송에 실패했습니다."));
            }
        } finally {
            setSending(false);
        }
    };

    const handleVerifyCode = async () => {
        const loginId = form.loginId.trim();
        const email = form.email.trim();
        const code = form.code.trim();

        if (!code) {
            setError(t("resetPassword.codeRequired", "인증코드를 입력해주세요."));
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const res = await verifyResetPasswordCode({ loginId, email, code, language });
            setResetToken(res.resetToken);
            setStep(2);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "EMAIL_CODE_INVALID") {
                    setError(t("resetPassword.codeVerifyFail"));
                } else if (e.code === "EMAIL_CODE_EXPIRED") {
                    setError(t("resetPassword.codeExpired"));
                } else {
                    setError(t("resetPassword.fail"));
                }
            } else {
                setError(t("resetPassword.fail"));
            }
        } finally {
            setVerifying(false);
        }
    };

    const handleResetPassword = async () => {
        const loginId = form.loginId.trim();
        const email = form.email.trim();

        if (!form.newPassword || !form.newPasswordConfirm) {
            setPasswordError(t("resetPassword.passwordRequired", "비밀번호를 입력해주세요."));
            return;
        }

        if (!isValidResetPassword(form.newPassword)) {
            setPasswordError(t("resetPassword.passwordGuide", "영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함한 8~20자여야 합니다."));
            return;
        }

        if (form.newPassword !== form.newPasswordConfirm) {
            setConfirmError(t("resetPassword.passwordMismatch", "비밀번호가 일치하지 않습니다."));
            return;
        }

        setSubmitting(true);
        setError(null);
        setPasswordError(null);
        setConfirmError(null);

        try {
            await resetPasswordWithToken({ loginId, email, resetToken, newPassword: form.newPassword });
            setSuccessModalOpen(true);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "NEW_PASSWORD_SAME_AS_OLD") {
                    setPasswordError(t("resetPassword.passwordSameAsOld", "새로 설정한 비밀번호는 이전 비밀번호와 달라야 합니다."));
                } else {
                    setError(e.message || t("resetPassword.fail", "비밀번호 재설정에 실패했습니다."));
                }
            } else {
                setError(t("resetPassword.fail", "비밀번호 재설정에 실패했습니다."));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => {
        if (step === 1) {
            navigation.navigate("Login");
            return;
        }
        setPasswordError(null);
        setConfirmError(null);
        setError(null);
        setStep(1);
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
                            <Image source={require("../../assets/icons/checkcircle-rounded-blue.png")} style={styles.modalIconImage} resizeMode="contain" />
                        </View>

                        <Text style={styles.modalText}>{t("resetPassword.resetDone", "비밀번호가 재설정 되었습니다")}</Text>

                        <Pressable style={styles.modalConfirmBtn} onPress={() => navigation.replace("Login")}>
                            <Text style={styles.modalConfirmBtnText}>{t("resetPassword.goLogin", "로그인 화면으로")}</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <View style={styles.page}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <Pressable style={[styles.backBtn, commonStyles.iconbtn]} onPress={handleBack}>
                            <Image source={require("../../assets/icons/chevron-left.png")} style={commonStyles.icon24} resizeMode="contain" />
                        </Pressable>
                        <Text style={styles.headerTitle}>{t("resetPassword.title", "비밀번호 재설정")}</Text>
                    </View>

                    <View style={styles.content}>
                        {step === 1 ? (
                            <>
                                <Text style={styles.title}>{t("resetPassword.emailVerifyTitle", "이메일 인증하기")}</Text>

                                <View style={styles.field}>
                                    <TextInput
                                        style={styles.input}
                                        value={form.loginId}
                                        onChangeText={(value) => {
                                            setForm((prev) => ({ ...prev, loginId: value }));
                                            setError(null);
                                        }}
                                        placeholder={t("resetPassword.loginIdPlaceholder", "아이디 입력하기")}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <View style={styles.field}>
                                    <TextInput
                                        style={[styles.input, error && !codeSent ? styles.inputError : null]}
                                        value={form.email}
                                        onChangeText={(value) => {
                                            setForm((prev) => ({ ...prev, email: value }));
                                            setError(null);
                                            setInfo(null);
                                        }}
                                        placeholder={t("resetPassword.emailPlaceholder", "이메일 입력하기")}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                {codeSent ? (
                                    <View style={[styles.field, styles.fieldSecond, styles.codeField]}>
                                        <TextInput
                                            style={[styles.input, styles.codeInput, error ? styles.inputError : null]}
                                            value={form.code}
                                            onChangeText={(value) => {
                                                setForm((prev) => ({ ...prev, code: value }));
                                                setError(null);
                                            }}
                                            placeholder={t("resetPassword.codePlaceholder", "인증코드를 입력하세요")}
                                            keyboardType="number-pad"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        {remainingSeconds > 0 ? <Text style={styles.codeTimer}>{formatTime(remainingSeconds)}</Text> : null}
                                    </View>
                                ) : null}

                                {info ? <Text style={styles.infoText}>{info}</Text> : null}
                                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                            </>
                        ) : (
                            <>
                                <Text style={styles.title}>{t("resetPassword.resetTitle", "비밀번호 재설정")}</Text>

                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>{t("login.pw", "비밀번호")}</Text>
                                    <Pressable style={styles.guideBtn} onPress={() => setOpenGuide((prev) => prev === "password" ? null : "password")}>
                                        <Image source={require("../../assets/icons/info-01-6b.png")} style={commonStyles.icon24} resizeMode="contain" />
                                    </Pressable>
                                    {openGuide === "password" ? (
                                        <View style={styles.guideBubble}>
                                            <Text style={styles.guideBubbleText}>{t("resetPassword.passwordGuide", "영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함한 8~20자여야 합니다.")}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View style={[styles.field, styles.passwordWrap]}>
                                    <TextInput
                                        style={[styles.input, styles.passwordInput, passwordInvalid || passwordError ? styles.inputError : null]}
                                        value={form.newPassword}
                                        onChangeText={(value) => {
                                            setForm((prev) => ({ ...prev, newPassword: value }));
                                            setPasswordError(null);
                                            setError(null);
                                        }}
                                        placeholder={t("resetPassword.newPasswordPlaceholder", "비밀번호를 입력해주세요")}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((prev) => !prev)}>
                                        <Image source={showPassword ? require("../../assets/icons/carbon_view-6b.png") : require("../../assets/icons/carbon_view-6b-blind.png")} style={commonStyles.icon24} resizeMode="contain" />
                                    </Pressable>
                                </View>

                                {passwordInvalid || passwordError ? <Text style={styles.errorTextStrong}>{passwordError || t("resetPassword.passwordGuide", "영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함한 8~20자여야 합니다.")}</Text> : null}

                                <View style={[styles.field, styles.fieldSecond, styles.passwordWrap]}>
                                    <TextInput
                                        style={[styles.input, styles.passwordInput, passwordMismatch || confirmError ? styles.inputError : null]}
                                        value={form.newPasswordConfirm}
                                        onChangeText={(value) => {
                                            setForm((prev) => ({ ...prev, newPasswordConfirm: value }));
                                            setConfirmError(null);
                                            setError(null);
                                        }}
                                        placeholder={t("resetPassword.newPasswordConfirmPlaceholder", "비밀번호를 다시 입력해주세요")}
                                        secureTextEntry={!showPasswordConfirm}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <Pressable style={styles.passwordToggle} onPress={() => setShowPasswordConfirm((prev) => !prev)}>
                                        <Image source={showPasswordConfirm ? require("../../assets/icons/carbon_view-6b.png") : require("../../assets/icons/carbon_view-6b-blind.png")} style={commonStyles.icon24} resizeMode="contain" />
                                    </Pressable>
                                </View>

                                {passwordMismatch || confirmError ? <Text style={styles.errorTextStrong}>{confirmError || t("resetPassword.passwordMismatch", "비밀번호가 일치하지 않습니다.")}</Text> : null}
                                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                            </>
                        )}
                    </View>

                    <View style={styles.footer}>
                        {step === 1 ? (
                            <Pressable style={[styles.primaryBtn, codeSent ? (!canVerifyCode ? styles.primaryBtnDisabled : null) : (!canSendCode ? styles.primaryBtnDisabled : null)]} onPress={codeSent ? handleVerifyCode : handleSendCode} disabled={codeSent ? !canVerifyCode : !canSendCode}>
                                <Text style={[styles.primaryBtnText, codeSent ? (!canVerifyCode ? styles.primaryBtnTextDisabled : null) : (!canSendCode ? styles.primaryBtnTextDisabled : null)]}>
                                    {codeSent ? (verifying ? t("resetPassword.verifying", "확인 중") : t("resetPassword.next", "다음")) : (sending ? t("resetPassword.sending", "전송 중") : t("resetPassword.next", "다음"))}
                                </Text>
                            </Pressable>
                        ) : (
                            <Pressable style={[styles.primaryBtn, !canSubmit ? styles.primaryBtnDisabled : null]} onPress={handleResetPassword} disabled={!canSubmit}>
                                <Text style={[styles.primaryBtnText, !canSubmit ? styles.primaryBtnTextDisabled : null]}>{submitting ? t("resetPassword.submitting", "처리 중") : t("resetPassword.changePassword", "비밀번호 변경")}</Text>
                            </Pressable>
                        )}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}