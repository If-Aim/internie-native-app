import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Modal, Pressable, ScrollView, View, Image } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { ApiError, checkLoginIdAvailability, sendEmailCode, signup, verifyEmailCode } from "../../api/client";
import { styles } from "./Signup.style";
import { commonStyles } from "../../theme/common.Style";
import AppText from "../../../AppText";
import AppTextInput from "../../../AppTextInput";
import Info016b from "../../assets/icons/info-01-6b.svg";
import CheckCircleRoundedBlue from "../../assets/icons/checkcircle-rounded-blue.svg";
import Notify01Blue from "../../assets/icons/notify-01-blue.svg";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;
type FormState = { loginId: string; password: string; passwordConfirm: string; email: string };
type SignupStep = 1 | 2 | 3 | 4;

function getSignupErrorMessage(e: unknown, t: (key: string, options?: any) => string): string {
    if (e instanceof ApiError) {
        const code = e.code ?? "";
        if (code === "LOGIN_ID_ALREADY_EXISTS") return t("signup.loginIdAlreadyExists");
        if (code === "EMAIL_VERIFICATION_REQUIRED") return t("signup.emailVerifyRequired");
        if (code === "ALREADY_REGISTERED_WITH_LOCAL") return t("signup.alreadyLocal");
        if (code === "ALREADY_REGISTERED_WITH_GOOGLE") return t("signup.alreadyGoogle");
        if (code === "ALREADY_REGISTERED_WITH_KAKAO") return t("signup.alreadyKakao");
        if (code === "INVALID_LOGIN_ID_FORMAT") return t("signup.invalidLoginIdFormat");
        if (code === "INVALID_PASSWORD_FORMAT") return t("signup.invalidPasswordFormat");
        if (code === "INVALID_LOGIN_REQUEST") return t("signup.required");
        if (code === "AUTH_EXISTING_ACCOUNT") return t("signup.alreadyAccount");
        return e.message || t("signup.fail");
    }
    return t("signup.fail");
}

function getCheckLoginIdErrorMessage(e: unknown, t: (key: string, options?: any) => string): string {
    if (e instanceof ApiError) {
        const code = e.code ?? "";
        if (code === "INVALID_LOGIN_ID_FORMAT") return t("signup.invalidLoginIdFormat");
        if (code === "LOGIN_ID_ALREADY_EXISTS") return t("signup.loginIdAlreadyExists");
        return e.message || t("signup.loginIdCheckFail");
    }
    return t("signup.loginIdCheckFail");
}

function getSendEmailErrorMessage(e: unknown, t: (key: string, options?: any) => string): string {
    if (e instanceof ApiError) {
        const code = e.code ?? "";
        if (code === "ALREADY_REGISTERED_WITH_GOOGLE") return t("signup.alreadyGoogle");
        if (code === "ALREADY_REGISTERED_WITH_KAKAO") return t("signup.alreadyKakao");
        if (code === "ALREADY_REGISTERED_WITH_LOCAL") return t("signup.alreadyLocal");
        if (code === "EMAIL_COOLDOWN_ACTIVE") return e.message || t("signup.emailCooldownActive");
        if (code === "USER_NOT_FOUND") return t("signup.emailCodeSendFail");
        return e.message || t("signup.emailCodeSendFail");
    }
    return t("signup.emailCodeSendFail");
}

function getVerifyEmailErrorMessage(e: unknown, t: (key: string, options?: any) => string): string {
    if (e instanceof ApiError) {
        const code = e.code ?? "";
        const message = (e.message ?? "").trim();
        if (code === "EMAIL_CODE_INVALID") return t("signup.emailCodeInvalid");
        if (code === "EMAIL_CODE_EXPIRED") return t("signup.emailCodeExpired");
        if (message) return message;
        return t("signup.emailVerifyFail");
    }
    return t("signup.emailVerifyFail");
}

function formatRemainingTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isValidSignupPassword(value: string): boolean {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/.test(value);
}

export default function SignupScreen({ navigation }: Props): React.ReactElement {
    const { t, i18n } = useTranslation();
    const language = (i18n.resolvedLanguage ?? i18n.language ?? "ko").startsWith("en") ? "en" : "ko";

    const [step, setStep] = useState<SignupStep>(1);
    const [form, setForm] = useState<FormState>({ loginId: "", password: "", passwordConfirm: "", email: "" });
    const [code, setCode] = useState("");
    const [sendingCode, setSendingCode] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [checkingLoginId, setCheckingLoginId] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [emailCodeSent, setEmailCodeSent] = useState(false);
    const [emailCodeExpiresAt, setEmailCodeExpiresAt] = useState<number | null>(null);
    const [emailCodeTimeLeft, setEmailCodeTimeLeft] = useState(0);
    const [loginIdChecked, setLoginIdChecked] = useState(false);
    const [loginIdAvailable, setLoginIdAvailable] = useState<boolean | null>(null);
    const [loginIdInfo, setLoginIdInfo] = useState<string | null>(null);
    const [emailInfo, setEmailInfo] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [loginIdError, setLoginIdError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [signupError, setSignupError] = useState<string | null>(null);
    const [accountExistsModalOpen, setAccountExistsModalOpen] = useState(false);
    const [accountExistsMessage, setAccountExistsMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [signupSuccessModalOpen, setSignupSuccessModalOpen] = useState(false);
    const [openGuide, setOpenGuide] = useState<"loginId" | "password" | null>(null);
    

    const prevEmailRef = useRef(form.email);
    const prevLoginIdRef = useRef(form.loginId);
    const autoClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const canSendEmailCode = form.email.trim().length > 0 && !sendingCode;
    const canGoLoginIdStep = emailVerified;
    const canGoPasswordStep = loginIdChecked && loginIdAvailable === true;
    const canSubmit = form.password.length > 0 && form.passwordConfirm.length > 0 && form.password === form.passwordConfirm && !submitting;
    const passwordInvalid = form.password.length > 0 && !isValidSignupPassword(form.password);
    const passwordConfirmInvalid = form.passwordConfirm.length > 0 && form.password.length > 0 && form.password !== form.passwordConfirm;

    const stepTitle = useMemo(() => {
        if (step === 1) return t("signup.mobileStepEmailTitle", "이메일 인증하기");
        if (step === 2) return t("signup.mobileStepCodeTitle", "인증코드 입력");
        return t("signup.mobileStepLoginIdTitle", "회원가입");
    }, [step, t]);

    const clearLater = (setter: React.Dispatch<React.SetStateAction<string | null>>, delay = 3000) => {
        if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
        autoClearTimerRef.current = setTimeout(() => setter(null), delay);
    };

    useEffect(() => {
        return () => {
            if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (prevEmailRef.current === form.email) return;
        prevEmailRef.current = form.email;
        setEmailVerified(false);
        setEmailCodeSent(false);
        setEmailCodeExpiresAt(null);
        setEmailCodeTimeLeft(0);
        setCode("");
        setEmailInfo(null);
        setEmailError(null);
        setCodeError(null);
        if (step >= 2) setStep(1);
    }, [form.email, step]);

    useEffect(() => {
        if (prevLoginIdRef.current === form.loginId) return;
        prevLoginIdRef.current = form.loginId;
        setLoginIdChecked(false);
        setLoginIdAvailable(null);
        setLoginIdInfo(null);
        setLoginIdError(null);
        if (step >= 4) setStep(3);
    }, [form.loginId, step]);

    useEffect(() => {
        if (!emailCodeExpiresAt) {
            setEmailCodeTimeLeft(0);
            return;
        }

        const updateRemaining = () => {
            const remain = Math.max(0, Math.floor((emailCodeExpiresAt - Date.now()) / 1000));
            setEmailCodeTimeLeft(remain);
            if (remain === 0) setEmailVerified(false);
        };

        updateRemaining();
        const timer = setInterval(updateRemaining, 1000);
        return () => clearInterval(timer);
    }, [emailCodeExpiresAt]);

    const handleBack = () => {
        if (openGuide) {
            setOpenGuide(null);
            return;
        }
        if (step === 1) {
            navigation.navigate("Login");
            return;
        }
        if (step === 2) {
            setCodeError(null);
            setStep(1);
            return;
        }
        if (step === 3) {
            setLoginIdError(null);
            setStep(2);
            return;
        }
        setPasswordError(null);
        setSignupError(null);
        setStep(3);
    };

    const handleSendEmailCode = async () => {
        const email = form.email.trim();
        const isResend = emailCodeSent;

        if (!email) {
            setEmailError(t("signup.emailRequired"));
            return;
        }

        setSendingCode(true);
        setEmailError(null);
        setCodeError(null);
        setEmailInfo(null);
        setEmailVerified(false);
        setCode("");

        try {
            const res = await sendEmailCode(email, language);

            if (res.status === "EXISTING_ACCOUNT_FOUND") {
                if (res.existingAccountType === "GOOGLE") setAccountExistsMessage(t("signup.alreadyGoogle"));
                else if (res.existingAccountType === "KAKAO") setAccountExistsMessage(t("signup.alreadyKakao"));
                else if (res.existingAccountType === "LOCAL") setAccountExistsMessage(t("signup.alreadyLocal"));
                else setAccountExistsMessage(t("signup.emailAlreadyUsed"));
                setAccountExistsModalOpen(true);
                return;
            }

            setEmailCodeSent(true);
            setEmailCodeExpiresAt(Date.now() + 10 * 60 * 1000);
            setEmailCodeTimeLeft(10 * 60);
            setEmailInfo(isResend ? t("signup.emailCodeResent", { email: res.maskedEmail }) : t("signup.emailCodeSent", { email: res.maskedEmail }));
            clearLater(setEmailInfo);
            setStep(2);
        } catch (e: unknown) {
            setEmailError(getSendEmailErrorMessage(e, t));
            clearLater(setEmailError);
        } finally {
            setSendingCode(false);
        }
    };

    const handleVerifyEmailCode = async (inputCode?: string) => {
        const email = form.email.trim();
        const trimmedCode = (inputCode ?? code).trim();

        if (!email) {
            setCodeError(t("signup.emailRequired"));
            return;
        }
        if (!trimmedCode) {
            setCodeError(t("signup.emailCodeRequired"));
            return;
        }
        if (trimmedCode.length !== 6) return;
        if (emailCodeTimeLeft <= 0) {
            setCodeError(t("signup.emailCodeExpired"));
            clearLater(setCodeError);
            return;
        }
        if (verifyingCode || emailVerified) return;

        setVerifyingCode(true);
        setCodeError(null);

        try {
            const res = await verifyEmailCode(email, trimmedCode);

            if (res.verified) {
                setEmailVerified(true);
                setEmailCodeExpiresAt(null);
                setEmailCodeTimeLeft(0);
                setEmailInfo(t("signup.emailVerifiedDone", { email: res.maskedEmail }));
                clearLater(setEmailInfo);
                setStep(3);
                return;
            }

            if (res.existingAccountFound) {
                setCode("");
                setEmailVerified(false);
                setCodeError(t("signup.emailAlreadyUsed"));
                return;
            }

            setCode("");
            setEmailVerified(false);
            setCodeError(t("signup.emailVerifyFail"));
        } catch (e: unknown) {
            setCode("");
            setEmailVerified(false);
            setCodeError(getVerifyEmailErrorMessage(e, t));
        } finally {
            setVerifyingCode(false);
        }
    };

    const handleCodeChange = async (value: string) => {
        const nextValue = value.replace(/\D/g, "").slice(0, 6);
        setCode(nextValue);
        setCodeError(null);
        if (emailVerified) return;
        if (emailCodeTimeLeft <= 0) return;
        if (nextValue.length !== 6) return;
        await handleVerifyEmailCode(nextValue);
    };

    const handleCheckLoginId = async () => {
        const loginId = form.loginId.trim();

        if (!loginId) {
            setLoginIdError(t("signup.loginIdRequired"));
            return;
        }

        setCheckingLoginId(true);
        setLoginIdError(null);
        setLoginIdInfo(null);

        try {
            const res = await checkLoginIdAvailability(loginId);
            setLoginIdChecked(true);
            setLoginIdAvailable(res.available);

            if (res.available) {
                setLoginIdInfo(t("signup.loginIdAvailable"));
                return;
            }

            setLoginIdInfo(null);
            setLoginIdError(res.message);
            clearLater(setLoginIdError);
        } catch (e: unknown) {
            setLoginIdChecked(false);
            setLoginIdAvailable(false);
            setLoginIdInfo(null);
            setLoginIdError(getCheckLoginIdErrorMessage(e, t));
        } finally {
            setCheckingLoginId(false);
        }
    };

    const handleSignup = async () => {
        const loginId = form.loginId.trim();
        const password = form.password;
        const passwordConfirm = form.passwordConfirm;
        const email = form.email.trim();

        if (!emailVerified) {
            setSignupError(t("signup.emailVerifyRequired"));
            return;
        }
        if (!loginId) {
            setSignupError(t("signup.loginIdRequired"));
            return;
        }
        if (!loginIdChecked || loginIdAvailable !== true) {
            setSignupError(t("signup.loginIdCheckRequired"));
            return;
        }
        if (!password || !passwordConfirm) {
            setPasswordError(t("signup.required"));
            return;
        }
        if (!isValidSignupPassword(password)) {
            setPasswordError(t("signup.invalidPasswordFormat"));
            return;
        }
        if (password !== passwordConfirm) {
            setPasswordError(t("signup.passwordMismatch"));
            return;
        }

        setSubmitting(true);
        setPasswordError(null);
        setSignupError(null);

        try {
            await signup({ loginId, password, email });
            setSignupSuccessModalOpen(true);
        } catch (e: unknown) {
            const message = getSignupErrorMessage(e, t);
            setSignupError(message);
            clearLater(setSignupError);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={commonStyles.appRoot}>
            <Modal visible={accountExistsModalOpen} transparent animationType="fade" onRequestClose={() => setAccountExistsModalOpen(false)}>
                <View style={StyleSheet.absoluteFill}>
                    <BlurView
                        style={StyleSheet.absoluteFillObject}
                        blurType="xlight"
                        blurAmount={1}
                        reducedTransparencyFallbackColor="rgba(209, 209, 209, 0.20)"
                    />
                    <View style={commonStyles.modalDimLight} />
                </View>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Pressable style={[styles.modalCloseBtn, commonStyles.iconbtn]} onPress={() => setAccountExistsModalOpen(false)}>
                            <Image source={require("../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                        </Pressable>
                        <View style={styles.modalIcon}>
                            <Notify01Blue style={styles.modalIconImage}/>
                        </View>
                        <AppText style={styles.modalMessage}>{accountExistsMessage || t("signup.emailAlreadyUsed")}</AppText>
                        <Pressable style={styles.modalConfirmBtn} onPress={() => { setAccountExistsModalOpen(false); navigation.replace("Login"); }}>
                            <AppText style={styles.modalConfirmBtnText}>{t("signup.goToLogin", "로그인 화면으로")}</AppText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
            <Modal visible={signupSuccessModalOpen} transparent animationType="fade" onRequestClose={() => setSignupSuccessModalOpen(false)}>
                <View style={StyleSheet.absoluteFill}>
                    <BlurView
                        style={StyleSheet.absoluteFillObject}
                        blurType="xlight"
                        blurAmount={1}
                        reducedTransparencyFallbackColor="rgba(209, 209, 209, 0.20)"
                    />
                    <View style={commonStyles.modalDimLight} />
                </View>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Pressable style={[styles.modalCloseBtn, commonStyles.iconbtn]} onPress={() => setSignupSuccessModalOpen(false)}>
                            <Image source={require("../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                        </Pressable>
                        <View style={styles.modalIcon}>
                            <CheckCircleRoundedBlue style={styles.modalIconImage}/>
                        </View>
                        <AppText style={styles.modalMessage}>{t("signup.success", "회원가입이 완료되었습니다.")}</AppText>
                        <Pressable
                            style={styles.modalConfirmBtn}
                            onPress={() => {
                                setSignupSuccessModalOpen(false);
                                navigation.replace("Login");
                            }}
                        >
                            <AppText style={styles.modalConfirmBtnText}>{t("signup.loginNow", "로그인하기")}</AppText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
            <View style={styles.page}>
                <View style={styles.topbarRow}>
                    <Pressable style={commonStyles.iconbtn} onPress={handleBack}>
                        <Image source={require("../../assets/icons/chevron-left.png")} style={commonStyles.icon24} resizeMode="contain" />
                    </Pressable>
                    <AppText style={styles.headerTitle}>{t("signup.title", "회원가입")}</AppText>
                    <View style={commonStyles.icon40} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.main}>
                        <View style={styles.section}>
                            <AppText style={styles.stepTitle}>{stepTitle}</AppText>

                            {step === 1 && (
                                <>
                                    <View style={styles.field}>
                                        <AppTextInput
                                            style={styles.input}
                                            value={form.email}
                                            onChangeText={(value) => { setForm((prev) => ({ ...prev, email: value })); setEmailError(null); }}
                                            placeholder={t("signup.emailPlaceholder")}
                                            placeholderTextColor={"#5F5F5F"}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <View style={styles.messageWrap}>
                                            <AppText
                                                style={[
                                                    emailError ? styles.errorText : styles.infoText,
                                                    !emailError && !emailInfo ? styles.messageHidden : null,
                                                ]}
                                            >
                                                {emailError || emailInfo || " "}
                                            </AppText>
                                        </View>
                                    </View>
                                    <View style={styles.submitWrap}>
                                        <Pressable style={[styles.submitBtn, !canSendEmailCode ? styles.submitBtnDisabled : null]} onPress={handleSendEmailCode} disabled={!canSendEmailCode}>
                                            <AppText style={[styles.submitBtnText, !canSendEmailCode ? styles.submitBtnTextDisabled : null]}>{sendingCode ? t("signup.sending", "전송 중") : t("signup.sendVerifyCode", "인증코드 보내기")}</AppText>
                                        </Pressable>
                                    </View>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <View style={styles.field}>
                                        <View style={styles.inputWrap}>
                                            <AppTextInput
                                                style={[styles.input, styles.inputTimer]}
                                                value={code}
                                                onChangeText={(value) => { void handleCodeChange(value); }}
                                                placeholder={language === "en" ? "Check your inbox for the verification code." : t("signup.enterEmailVC", "메일함에서 인증코드를 확인하세요")}
                                                keyboardType="number-pad"
                                                editable={!emailVerified && emailCodeTimeLeft > 0}
                                            />
                                            {!emailVerified && emailCodeTimeLeft > 0 ? <AppText style={styles.timer}>{formatRemainingTime(emailCodeTimeLeft)}</AppText> : null}
                                        </View>    
                                        <View style={styles.messageWrap}>
                                            <AppText
                                                style={[
                                                    codeError || (emailCodeTimeLeft <= 0 && !emailVerified) ? styles.errorText : styles.infoText,
                                                    !codeError && !(emailCodeTimeLeft <= 0 && !emailVerified) && !emailInfo ? styles.messageHidden : null,
                                                ]}
                                            >
                                                {codeError || (emailCodeTimeLeft <= 0 && !emailVerified ? t("signup.emailCodeExpired", "인증 시간이 만료되었습니다. 인증코드를 다시 요청해주세요.") : emailInfo) || " "}
                                            </AppText>
                                        </View>
                                        {emailCodeTimeLeft <= 0 && !emailVerified ? <AppText style={styles.errorText}>{t("signup.emailCodeExpired", "인증 시간이 만료되었습니다. 인증코드를 다시 요청해주세요.")}</AppText> : null}
                                    </View>

                                    <View style={styles.submitWrap}>
                                        <Pressable style={[styles.submitBtn, !canGoLoginIdStep && (code.trim().length !== 6 || verifyingCode) ? styles.submitBtnDisabled : null]} onPress={() => handleVerifyEmailCode()} disabled={!canGoLoginIdStep && (code.trim().length !== 6 || verifyingCode)}>
                                            <AppText style={[styles.submitBtnText, !canGoLoginIdStep && (code.trim().length !== 6 || verifyingCode) ? styles.submitBtnTextDisabled : null]}>{verifyingCode ? t("signup.verifying", "확인 중") : t("signup.next", "다음")}</AppText>
                                        </Pressable>
                                    </View>
                                </>
                            )}

                            {step === 3 && (
                                <>
                                    <View style={styles.labelRow}>
                                        <AppText style={styles.label}>{t("login.id", "아이디")}</AppText>
                                        <Pressable style={styles.guideBtn} onPress={() => setOpenGuide((prev) => prev === "loginId" ? null : "loginId")}>
                                            <Info016b style={commonStyles.icon24}/>
                                        </Pressable>
                                        {openGuide === "loginId" ? <View style={styles.guideBubble}><AppText style={styles.guideBubbleText}>{t("signup.loginIdGuide", "영문 소문자 or 숫자를 활용해 4-20자로 만들어주세요")}</AppText></View> : null}
                                    </View>

                                    <View style={styles.field}>
                                        <View style={styles.inlineField}>
                                            <AppTextInput
                                                style={[styles.input, styles.inputInline, loginIdError ? styles.inputError : null]}
                                                value={form.loginId}
                                                onChangeText={(value) => { setForm((prev) => ({ ...prev, loginId: value })); setLoginIdError(null); }}
                                                placeholder={t("signup.loginIdPlaceholder", "아이디를 입력하세요")}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            <Pressable
                                                style={[
                                                    styles.sideBtn,
                                                    loginIdChecked && loginIdAvailable ? styles.sideBtnConfirmed : null,
                                                    checkingLoginId || (loginIdChecked && loginIdAvailable === true) || !form.loginId.trim() ? styles.sideBtnDisabled : null,
                                                ]}
                                                onPress={handleCheckLoginId}
                                                disabled={checkingLoginId || (loginIdChecked && loginIdAvailable === true) || !form.loginId.trim()}
                                            >
                                                <AppText style={[
                                                    styles.sideBtnText,
                                                    loginIdChecked && loginIdAvailable ? styles.sideBtnTextConfirmed : null,
                                                    checkingLoginId || (loginIdChecked && loginIdAvailable === true) || !form.loginId.trim() ? styles.sideBtnTextDisabled : null,
                                                ]}>
                                                    {checkingLoginId ? t("signup.checking", "확인 중") : loginIdChecked && loginIdAvailable === true ? t("signup.checked", "확인됨") : t("signup.checkLoginId", "중복확인")}
                                                </AppText>
                                            </Pressable>
                                        </View>
                                        <View style={styles.messageWrap}>
                                            <AppText
                                                style={[
                                                    loginIdError ? styles.errorText : styles.infoText,
                                                    !loginIdError && !(loginIdInfo && loginIdAvailable === true) ? styles.messageHidden : null,
                                                ]}
                                            >
                                                {loginIdError || (loginIdInfo && loginIdAvailable === true ? loginIdInfo : " ")}
                                            </AppText>
                                        </View>
                                    </View>
                                    <View style={styles.submitWrap}>
                                        <Pressable style={[styles.submitBtn, !canGoPasswordStep ? styles.submitBtnDisabled : null]} onPress={() => setStep(4)} disabled={!canGoPasswordStep}>
                                            <AppText style={[styles.submitBtnText, !canGoPasswordStep ? styles.submitBtnTextDisabled : null]}>{t("signup.next", "다음")}</AppText>
                                        </Pressable>
                                    </View>
                                </>
                            )}

                            {step === 4 && (
                                <>
                                    <View style={styles.labelRow}>
                                        <AppText style={styles.label}>{t("login.pw", "비밀번호")}</AppText>
                                        <Pressable style={styles.guideBtn} onPress={() => setOpenGuide((prev) => prev === "password" ? null : "password")}>
                                            <Info016b style={commonStyles.icon24}/>
                                        </Pressable>
                                        {openGuide === "password" ? <View style={styles.guideBubblePw}><AppText style={styles.guideBubbleText}>{t("signup.passwordGuide", "영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함한 8~20자여야 합니다")}</AppText></View> : null}
                                    </View>

                                    <View style={styles.passwordGroup}>
                                        <View style={styles.passwordWrap}>
                                            <AppTextInput
                                                style={[
                                                    styles.input,
                                                    styles.passwordInput,
                                                    passwordInvalid || passwordError ? styles.inputError : null
                                                ]}
                                                value={form.password}
                                                onChangeText={(value) => {
                                                    setForm((prev) => ({ ...prev, password: value }));
                                                    setPasswordError(null);
                                                    setSignupError(null);
                                                }}
                                                placeholder={t("signup.passwordPlaceholder", "비밀번호를 입력하세요")}
                                                secureTextEntry={!showPassword}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((prev) => !prev)}>
                                                <Image
                                                    source={
                                                        showPassword
                                                            ? require("../../assets/icons/carbon_view-6b.png")
                                                            : require("../../assets/icons/carbon_view-6b-blind.png")
                                                    }
                                                    style={commonStyles.icon24}
                                                    resizeMode="contain"
                                                />
                                            </Pressable>
                                            <View style={styles.messageWrap}>
                                                <AppText
                                                    style={[
                                                        styles.errorText,
                                                        !(passwordInvalid || passwordError) ? styles.messageHidden : null,
                                                    ]}
                                                >
                                                    {passwordError || t("signup.passwordGuide", "영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함한 8~20자여야 합니다") || " "}
                                                </AppText>
                                            </View>
                                        </View>
                                        <View style={styles.passwordWrap}>
                                            <AppTextInput
                                                style={[
                                                    styles.input,
                                                    styles.passwordInput,
                                                    passwordConfirmInvalid ? styles.inputError : null
                                                ]}
                                                value={form.passwordConfirm}
                                                onChangeText={(value) => {
                                                    setForm((prev) => ({ ...prev, passwordConfirm: value }));
                                                    setPasswordError(null);
                                                    setSignupError(null);
                                                }}
                                                placeholder={t("signup.passwordConfirmPlaceholder", "비밀번호를 다시 입력하세요")}
                                                secureTextEntry={!showPasswordConfirm}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            <Pressable style={styles.passwordToggle} onPress={() => setShowPasswordConfirm((prev) => !prev)}>
                                                <Image
                                                    source={
                                                        showPasswordConfirm
                                                            ? require("../../assets/icons/carbon_view-6b.png")
                                                            : require("../../assets/icons/carbon_view-6b-blind.png")
                                                    }
                                                    style={commonStyles.icon24}
                                                    resizeMode="contain"
                                                />
                                            </Pressable>
                                            <View style={styles.messageWrap}>
                                                <AppText
                                                    style={[
                                                        styles.errorText,
                                                        !(passwordConfirmInvalid || signupError) ? styles.messageHidden : null,
                                                    ]}
                                                >
                                                    {(passwordConfirmInvalid
                                                        ? t("signup.passwordMismatch", "비밀번호가 일치하지 않습니다")
                                                        : signupError) || " "}
                                                </AppText>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.submitWrap}>
                                        <Pressable style={[styles.submitBtn, !canSubmit ? styles.submitBtnDisabled : null]} onPress={handleSignup} disabled={!canSubmit}>
                                            <AppText style={[styles.submitBtnText, !canSubmit ? styles.submitBtnTextDisabled : null]}>{submitting ? t("signup.submitting", "가입 중") : t("signup.submit", "회원가입")}</AppText>
                                        </Pressable>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}