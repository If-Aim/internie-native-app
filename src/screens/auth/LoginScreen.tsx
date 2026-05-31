import React, { useState } from "react";
import { View, Pressable, Image, NativeModules, Alert, ScrollView, Modal } from "react-native";
import { useTranslation } from "react-i18next";
import { ApiError, exchangeKakaoToken, loginWithApple, loginWithGoogle, loginWithLocal } from "../../api/client";
import { saveAccessToken, saveOnboardingCompleted } from "../../auth/tokenStorage";
import { styles } from "./Login.style";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import appleAuth from "@invertase/react-native-apple-authentication";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import AppText from "../../../AppText";
import AppTextInput from "../../../AppTextInput";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type AuthNav = NativeStackNavigationProp<AuthStackParamList>;

type KakaoLoginResult = {
    accessToken: string;
    refreshToken?: string;
};

const { KakaoLogin } = NativeModules as {
    KakaoLogin?: {
        loginWithTalk(): Promise<KakaoLoginResult>;
        loginWithAccount(): Promise<KakaoLoginResult>;
    };
};

const { GoogleLogin } = NativeModules as {
    GoogleLogin?: {
        signIn(): Promise<{ idToken: string }>;
        restorePreviousSignIn?(): Promise<{ idToken: string } | null>;
        signOut?(): Promise<void>;
    };
};

export default function LoginScreen(_props: Props) {
    const { t } = useTranslation();
    const rootNav = useNavigation<RootNav>();
    const authNav = useNavigation<AuthNav>();

    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [kakaoMethodOpen, setKakaoMethodOpen] = useState(false);

    const moveAfterLogin = async (onboardingCompleted: boolean) => {
        await saveOnboardingCompleted(onboardingCompleted === true);
        if (onboardingCompleted === true) {
            rootNav.replace("Student");
        } else {
            rootNav.replace("Onboarding");
        }
    };

    const handleServerKakaoLogin = async (kakaoAccessToken: string) => {
        const res = await exchangeKakaoToken(kakaoAccessToken);
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            Alert.alert(t("login.loginFailed"), text || t("login.kakaoLoginFailed"));
            return;
        }

        const auth = res.headers.get("Authorization") || res.headers.get("authorization");
        const body = await res.json().catch(() => null);

        if (!auth) {
            Alert.alert(t("login.loginFailed"), t("login.authorizationHeaderMissing"));
            return;
        }

        await saveAccessToken(auth);
        await moveAfterLogin(body?.onboardingCompleted === true);
    };

    const handleLocalLogin = async () => {
        const trimmedLoginId = loginId.trim();
        const trimmedPassword = password.trim();

        if (!trimmedLoginId || !trimmedPassword) {
            setLoginError(t("login.localLoginRequired"));
            return;
        }

        try {
            setSubmitting(true);
            setLoginError(null);

            const data = await loginWithLocal({
                loginId: trimmedLoginId,
                password: trimmedPassword,
            });

            await moveAfterLogin(data.onboardingCompleted);
        } catch (e) {
            if (e instanceof ApiError) {
                setLoginError(e.message || t("login.localLoginFailed"));
            } else {
                setLoginError(t("login.localLoginFailed"));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleKakaoTalkLogin = async () => {
        try {
            const kakaoToken = await KakaoLogin!.loginWithTalk();
            const kakaoAccessToken = kakaoToken?.accessToken ?? "";
            if (!kakaoAccessToken) {
                Alert.alert(t("login.loginFailed"), t("login.kakaoTokenMissing"));
                return;
            }
            await handleServerKakaoLogin(kakaoAccessToken);
        } catch (e: any) {
            Alert.alert(t("login.loginFailed"), String(e?.message || t("login.kakaoLoginFailed")));
        }
    };

    const handleKakaoAccountLogin = async () => {
        try {
            const kakaoToken = await KakaoLogin!.loginWithAccount();
            const kakaoAccessToken = kakaoToken?.accessToken ?? "";
            if (!kakaoAccessToken) {
                Alert.alert(t("login.loginFailed"), t("login.kakaoTokenMissing"));
                return;
            }
            await handleServerKakaoLogin(kakaoAccessToken);
        } catch (e: any) {
            Alert.alert(t("login.loginFailed"), String(e?.message || t("login.kakaoAccountLoginFailed")));
        }
    };

    const onPressKakao = () => {
        setKakaoMethodOpen(true);
    };

    const runKakaoTalkLogin = async () => {
        setKakaoMethodOpen(false);
        await handleKakaoTalkLogin();
    };

    const runKakaoAccountLogin = async () => {
        setKakaoMethodOpen(false);
        await handleKakaoAccountLogin();
    };

    const handleGooglePress = async () => {
        try {
            if (!GoogleLogin?.signIn) {
                Alert.alert(t("login.loginFailed"), "GoogleLogin.signIn 네이티브 모듈을 찾을 수 없습니다.");
                return;
            }

            const result = await GoogleLogin.signIn();
            const idToken = result?.idToken ?? "";

            if (!idToken) {
                Alert.alert(t("login.loginFailed"), t("login.googleTokenMissing"));
                return;
            }

            const data = await loginWithGoogle(idToken);

            await moveAfterLogin(data.onboardingCompleted);
            } catch (e: any) {
                if (e?.code === "GOOGLE_SIGN_IN_CANCELED") {
                    return;
                }

                if (e?.code === "GOOGLE_NO_CREDENTIAL") {
                    Alert.alert(
                        t("login.loginFailed"),
                        "사용 가능한 Google 계정을 찾을 수 없습니다. 기기에 Google 계정이 로그인되어 있는지 확인해주세요."
                    );
                    return;
                }

                if (e instanceof ApiError) {
                    Alert.alert(
                        t("login.loginFailed"),
                        e.bodyText || e.message || t("login.googleLoginFailed")
                    );
                    return;
                }

                Alert.alert(
                    t("login.loginFailed"),
                    "Google 로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
                );
            }
    };

    const handleApplePress = async () => {
        try {
            const result = await appleAuth.performRequest({
                requestedOperation: appleAuth.Operation.LOGIN,
                requestedScopes: [
                    appleAuth.Scope.FULL_NAME,
                    appleAuth.Scope.EMAIL,
                ],
            });

            const identityToken = result.identityToken ?? "";

            if (!identityToken) {
                Alert.alert(t("login.loginFailed"), "Apple identityToken을 받지 못했습니다.");
                return;
            }

            const fullNameParts = [
                result.fullName?.familyName,
                result.fullName?.givenName,
            ].filter(Boolean);

            const fullName = fullNameParts.length > 0 ? fullNameParts.join("") : null;
            const data = await loginWithApple({identityToken, fullName,});

            await moveAfterLogin(data.onboardingCompleted);
        } catch (e: any) {
            if (e?.code === appleAuth.Error.CANCELED) {
                return;
            }

            if (e instanceof ApiError) {
                Alert.alert(
                    t("login.loginFailed"),
                    e.bodyText || e.message || "Apple 로그인에 실패했습니다."
                );
                return;
            }

            console.log("Apple login error:", e);

            Alert.alert(
                t("login.loginFailed"),
                String(e?.message || e?.code || "Apple 로그인 중 문제가 발생했습니다.")
            );
        }
    };

    return (
        <View style={styles.page}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.logoSection}>
                    <AppText style={styles.logoText}>internie</AppText>
                </View>

                <View style={styles.formSection}>
                    <View style={styles.loginFieldGroup}>
                        <AppTextInput
                            style={[styles.input, loginError ? styles.inputError : null]}
                            value={loginId}
                            onChangeText={setLoginId}
                            placeholder={t("login.idPlaceholder")}
                            placeholderTextColor={"#DDD"}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <View style={styles.passwordWrap}>
                            <AppTextInput
                                style={[styles.input, styles.passwordInput, loginError ? styles.inputError : null]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder={t("login.passwordPlaceholder")}
                                placeholderTextColor={"#DDD"}
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
                                    style={styles.passwordToggleIcon}
                                    resizeMode="contain"
                                />
                            </Pressable>
                        </View>
                    </View>
                    <AppText style={[styles.errorText, loginError ? styles.errorTextVisible : styles.errorTextHidden]}>
                        {loginError || " "}
                    </AppText>
                    <View style={styles.findAuthRow}>
                        <Pressable onPress={() => authNav.navigate("FindId")}>
                            <AppText style={styles.findAuthBtn}>{t("login.findId")}</AppText>
                        </Pressable>
                        <View style={styles.findAuthDivider} />
                        <Pressable onPress={() => authNav.navigate("ResetPassword")}>
                            <AppText style={styles.findAuthBtn}>{t("login.findPassword")}</AppText>
                        </Pressable>
                    </View>

                    <Pressable style={styles.submitBtn} onPress={handleLocalLogin} disabled={submitting}>
                        <AppText style={styles.submitBtnText}>
                            {submitting ? t("login.loginLoading") : t("login.loginButton")}
                        </AppText>
                    </Pressable>
                </View>

                <View style={styles.socialSection}>
                    <Pressable style={[styles.socialBtn, styles.kakaoBtn]} onPress={onPressKakao}>
                        <View style={styles.socialIconWrap}>
                            <Image source={require("../../assets/logo/kakao_Logo.png")} style={styles.socialIcon} resizeMode="contain" />
                        </View>
                        <AppText style={styles.socialText}>{t("login.startWithKakao")}</AppText>
                    </Pressable>

                    <Pressable style={[styles.socialBtn, styles.googleBtn]} onPress={handleGooglePress}>
                        <View style={styles.socialIconWrap}>
                            <Image source={require("../../assets/logo/google_Logo.png")} style={styles.socialIcon} resizeMode="contain" />
                        </View>
                        <AppText style={styles.socialText}>{t("login.startWithGoogle")}</AppText>
                    </Pressable>
                    <Pressable style={[styles.socialBtn, styles.appleBtn]} onPress={handleApplePress}>
                        <View style={styles.socialIconWrap}>
                            <Image source={require("../../assets/logo/apple_Logo.png")} style={styles.socialIcon} resizeMode="contain" />
                        </View>
                        <AppText style={styles.appleText}>{t("login.startWithApple")}</AppText>
                    </Pressable>
                </View>

                <View style={styles.signupSection}>
                    <AppText style={styles.signupText}>{t("login.signupPrompt")}</AppText>
                    <Pressable onPress={() => authNav.navigate("Signup")}>
                        <AppText style={styles.signupLink}>{t("login.signupLink")}</AppText>
                    </Pressable>
                </View>
            </ScrollView>
            <Modal visible={kakaoMethodOpen} transparent animationType="fade" onRequestClose={() => setKakaoMethodOpen(false)}>
                <View style={styles.kakaoModalBackdrop}>
                    <Pressable style={styles.kakaoModalBackdropPress} onPress={() => setKakaoMethodOpen(false)} />
                    <View style={styles.kakaoModal}>
                        <View style={styles.kakaoModalIconWrap}>
                            <Image source={require("../../assets/logo/kakao_Logo.png")} style={styles.kakaoModalIcon} resizeMode="contain" />
                        </View>

                        <AppText style={styles.kakaoModalTitle}>{t("login.selectMethodTitle")}</AppText>
                        <AppText style={styles.kakaoModalDesc}>{t("login.selectMethodDesc")}</AppText>

                        <View style={styles.kakaoModalButtonGroup}>
                            <Pressable style={styles.kakaoModalPrimaryButton} onPress={runKakaoTalkLogin}>
                                <AppText style={styles.kakaoModalPrimaryButtonText}>{t("login.withKakaoTalk")}</AppText>
                            </Pressable>

                            <Pressable style={styles.kakaoModalSecondaryButton} onPress={runKakaoAccountLogin}>
                                <AppText style={styles.kakaoModalSecondaryButtonText}>{t("login.withKakaoAccount")}</AppText>
                            </Pressable>
                        </View>

                        <Pressable style={styles.kakaoModalCancelButton} onPress={() => setKakaoMethodOpen(false)}>
                            <AppText style={styles.kakaoModalCancelButtonText}>{t("common.cancel")}</AppText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}