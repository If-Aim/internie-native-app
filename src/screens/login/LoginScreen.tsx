// src/screens/login/LoginScreen.tsx
import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import { exchangeKakaoToken } from "../../api/client";
import { saveAccessToken } from "../../auth/tokenStorage";
import { styles } from "./Login.style";

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import type { RootStackParamList } from "../../navigation/AppNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen(_props: Props) {
  const { t, i18n } = useTranslation();
  const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");

  // ✅ Root 스택 네비게이션 (Auth -> Student 전환용)
  const rootNav = useNavigation<RootNav>();

  const toggleLang = async () => {
    await i18n.changeLanguage(isKo ? "en" : "ko");
  };

  const onPressKakao = async () => {
    try {
      console.log("[LOGIN] Kakao button pressed");

      const kakaoToken = await kakaoLogin();
      console.log("[LOGIN] kakaoToken:", kakaoToken);

      const kakaoAccessToken =
        (kakaoToken as any)?.accessToken ||
        (kakaoToken as any)?.access_token ||
        "";

      if (!kakaoAccessToken) {
        console.error("[LOGIN] kakao access token not found");
        return;
      }

      console.log("[LOGIN] exchangeKakaoToken start");

      const res = await exchangeKakaoToken(kakaoAccessToken);
      console.log("[LOGIN] exchange response status:", res.status);

      if (!res.ok) {
        console.error(
          "[LOGIN] 서버 로그인 실패:",
          res.status,
          await res.text().catch(() => "")
        );
        return;
      }

      const auth =
        res.headers.get("Authorization") ||
        res.headers.get("authorization");

      console.log("[LOGIN] Authorization header:", auth);

      if (!auth) {
        console.error("[LOGIN] Authorization 헤더가 없습니다.");
        return;
      }

      await saveAccessToken(auth);
      console.log("[LOGIN] saved token, switching to Student flow");

      // ✅ Auth 스택 내부의 StudentHome로 가지 말고, Root의 Student로 전환
      rootNav.replace("Student");
    } catch (e) {
      console.error("[LOGIN] kakao login error:", e);
    }
  };

  return (
    <View style={styles.page}>
      <Pressable style={styles.langToggle} onPress={toggleLang}>
        <Text style={styles.langToggleText}>{isKo ? "EN" : "KO"}</Text>
      </Pressable>

      <View style={styles.headerSpacer} />

      <View style={styles.wrap}>
        <Image
          source={require("../../assets/logo/internie_Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Pressable style={styles.kakaoBtn} onPress={onPressKakao}>
          <View style={styles.kakaoIco}>
            <Image
              source={require("../../assets/logo/kakao_Logo.png")}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.kakaoText}>{t("login.startWithKakao")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
