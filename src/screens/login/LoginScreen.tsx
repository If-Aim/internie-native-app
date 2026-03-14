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
	const { t } = useTranslation();

	const rootNav = useNavigation<RootNav>();
	

	const onPressKakao = async () => {
		try {
			const kakaoToken = await kakaoLogin();

			const kakaoAccessToken =
				(kakaoToken as any)?.accessToken ||
				(kakaoToken as any)?.access_token ||
				"";

			if (!kakaoAccessToken) {
				console.error("Kakao access token not found");
				return;
			}

			const res = await exchangeKakaoToken(kakaoAccessToken);

			if (!res.ok) {
				console.error("Server login failed", res.status);
				return;
			}

			const auth =
				res.headers.get("Authorization") ||
				res.headers.get("authorization");

			const body = await res.json().catch(() => null);

			if (!auth) {
				console.error("Authorization header missing");
				return;
			}

			await saveAccessToken(auth);

			rootNav.replace("Student");
		} catch (e) {
			console.error("Kakao login error:", e);
		}
	};

  return (
    <View style={styles.page}>
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
