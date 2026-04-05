import React from "react";
import { View, Text, Pressable, Image, NativeModules, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { exchangeKakaoToken } from "../../api/client";
import { saveAccessToken, saveOnboardingCompleted } from "../../auth/tokenStorage";
import { styles } from "./Login.style";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import type { RootStackParamList } from "../../navigation/AppNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

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

    const handleServerLogin = async (kakaoAccessToken: string) => {
        const res = await exchangeKakaoToken(kakaoAccessToken);
        if (!res.ok) {
            console.error("Server login failed", res.status);
            Alert.alert("로그인 실패", `서버 로그인 실패: ${res.status}`);
            return;
        }
        const auth = res.headers.get("Authorization") || res.headers.get("authorization");
        const body = await res.json().catch(() => null);
        if (!auth) {
            console.error("Authorization header missing");
            Alert.alert("로그인 실패", "Authorization 헤더가 없습니다.");
            return;
        }
        await saveAccessToken(auth);
        await saveOnboardingCompleted(body?.onboardingCompleted === true);
        if (body?.onboardingCompleted === true) {
            rootNav.replace("Student");
        } else {
            rootNav.replace("Onboarding");
        }
    };

    const handleKakaoTalkLogin = async () => {
        try {
            const kakaoToken = await KakaoLogin!.loginWithTalk();
            const kakaoAccessToken = kakaoToken?.accessToken ?? "";
            if (!kakaoAccessToken) {
                Alert.alert("로그인 실패", "카카오 액세스 토큰을 받지 못했습니다.");
                return;
            }
            await handleServerLogin(kakaoAccessToken);
        } catch (e: any) {
            console.error("KakaoTalk login error:", e);
            Alert.alert("로그인 실패", String(e?.message || "카카오톡 로그인 중 오류가 발생했습니다."));
        }
    };

    const handleKakaoAccountLogin = async () => {
        try {
            const kakaoToken = await KakaoLogin!.loginWithAccount();
            const kakaoAccessToken = kakaoToken?.accessToken ?? "";
            if (!kakaoAccessToken) {
                Alert.alert("로그인 실패", "카카오 액세스 토큰을 받지 못했습니다.");
                return;
            }
            await handleServerLogin(kakaoAccessToken);
        } catch (e: any) {
            console.error("KakaoAccount login error:", e);
            Alert.alert("로그인 실패", String(e?.message || "카카오계정 로그인 중 오류가 발생했습니다."));
        }
    };

    const onPressKakao = () => {
		Alert.alert(
			t("login.selectMethodTitle"),
			t("login.selectMethodDesc"),
			[
				{ text: t("login.withKakaoTalk"), onPress: handleKakaoTalkLogin },
				{ text: t("login.withKakaoAccount"), onPress: handleKakaoAccountLogin },
				{ text: t("common.cancel"), style: "cancel" }
			]
		);
	};

    return (
        <View style={styles.page}>
            <View style={styles.headerSpacer} />
            <View style={styles.wrap}>
                <Image source={require("../../assets/logo/internie_Logo.png")} style={styles.logo} resizeMode="contain" />
                <Pressable style={styles.kakaoBtn} onPress={onPressKakao}>
                    <View style={styles.kakaoIco}>
                        <Image source={require("../../assets/logo/kakao_Logo.png")} style={styles.kakaoIcoImg} resizeMode="contain" />
                    </View>
                    <Text style={styles.kakaoText}>{t("login.startWithKakao")}</Text>
                </Pressable>
            </View>
        </View>
    );
}