import React, { useState } from "react";
import { View, Text, Pressable, Image, NativeModules, Alert, TextInput, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { ApiError, exchangeKakaoToken, loginWithGoogle, loginWithLocal } from "../../api/client";
import { saveAccessToken, saveOnboardingCompleted } from "../../auth/tokenStorage";
import { styles } from "./Login.style";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
    webClientId: "GOOGLE_WEB_CLIENT_ID",
    offlineAccess: false,
});

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

export default function LoginScreen(_props: Props) {
    const { t } = useTranslation();
    const rootNav = useNavigation<RootNav>();
    const authNav = useNavigation<AuthNav>();

    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

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
            Alert.alert(t("login.loginFailed"), "Authorization header가 없습니다.");
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
        Alert.alert(
            t("login.selectMethodTitle"),
            t("login.selectMethodDesc"),
            [
                { text: t("login.withKakaoTalk"), onPress: handleKakaoTalkLogin },
                { text: t("login.withKakaoAccount"), onPress: handleKakaoAccountLogin },
                { text: t("common.cancel"), style: "cancel" },
            ]
        );
    };

    const handleGooglePress = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const result = await GoogleSignin.signIn();

            if (!result.data?.idToken) {
                Alert.alert(t("login.loginFailed"), t("login.googleTokenMissing"));
                return;
            }

            const data = await loginWithGoogle(result.data.idToken);
            await moveAfterLogin(data.onboardingCompleted);
        } catch (e) {
            if (e instanceof ApiError) {
                Alert.alert(t("login.loginFailed"), e.message || t("login.googleLoginFailed"));
                return;
            }
            Alert.alert(t("login.loginFailed"), t("login.googleLoginFailed"));
        }
    };

    return (
        <View style={styles.page}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.logoSection}>
                    <Text style={styles.logoText}>internie</Text>
                </View>

                <View style={styles.formSection}>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.input}
                            value={loginId}
                            onChangeText={setLoginId}
                            placeholder={t("login.idPlaceholder")}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputWrap}>
                        <View style={styles.passwordWrap}>
                            <TextInput
                                style={[styles.input, styles.passwordInput, loginError ? styles.inputError : null]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder={t("login.passwordPlaceholder")}
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

                    {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

                    <View style={styles.findAuthRow}>
                        <Pressable onPress={() => authNav.navigate("FindId")}>
                            <Text style={styles.findAuthBtn}>{t("login.findId")}</Text>
                        </Pressable>
                        <View style={styles.findAuthDivider} />
                        <Pressable onPress={() => authNav.navigate("ResetPassword")}>
                            <Text style={styles.findAuthBtn}>{t("login.findPassword")}</Text>
                        </Pressable>
                    </View>

                    <Pressable style={styles.submitBtn} onPress={handleLocalLogin} disabled={submitting}>
                        <Text style={styles.submitBtnText}>
                            {submitting ? t("login.loginLoading") : t("login.loginButton")}
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.socialSection}>
                    <Pressable style={[styles.socialBtn, styles.kakaoBtn]} onPress={onPressKakao}>
                        <View style={styles.socialIconWrap}>
                            <Image source={require("../../assets/logo/kakao_Logo.png")} style={styles.socialIcon} resizeMode="contain" />
                        </View>
                        <Text style={styles.socialText}>{t("login.startWithKakao")}</Text>
                    </Pressable>

                    <Pressable style={[styles.socialBtn, styles.googleBtn]} onPress={handleGooglePress}>
                        <View style={styles.socialIconWrap}>
                            <Image source={require("../../assets/logo/google_Logo.png")} style={styles.socialIcon} resizeMode="contain" />
                        </View>
                        <Text style={styles.socialText}>{t("login.startWithGoogle")}</Text>
                    </Pressable>
                </View>

                <View style={styles.signupSection}>
                    <Text style={styles.signupText}>{t("login.signupPrompt")}</Text>
                    <Pressable onPress={() => authNav.navigate("Signup")}>
                        <Text style={styles.signupLink}>{t("login.signupLink")}</Text>
                    </Pressable>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
}