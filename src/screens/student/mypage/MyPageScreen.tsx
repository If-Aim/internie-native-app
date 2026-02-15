// src/screens/student/mypage/MyPageScreen.tsx
import React from "react";
import { View, Text, Pressable, Image, ScrollView, Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { getUserMe, logout, ApiError } from "../../../api/client";

import { Screen } from "../../../components/Screen";
import { styles } from "./MyPage.style";

type Props = NativeStackScreenProps<StudentStackParamList, "MyPage">;

type VerifyStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

type UserMe = {
  name?: string | null;
  status?: VerifyStatus | null;
  verificationImage?: string | null;
  profileImage?: string | null;
};

function isHttp(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function MyPageScreen({ navigation }: Props) {
  const isFocused = useIsFocused();

  const [me, setMe] = React.useState<UserMe | null>(null);
  const [avatarVersion, setAvatarVersion] = React.useState<number>(0);

  const displayName = (me?.name ?? "").trim() || "User";
  const status: VerifyStatus = (me?.status ?? "UNVERIFIED") as VerifyStatus;

  const isVerifiedStudent = status === "APPROVED" && Boolean(me?.verificationImage);

  const isDefaultProfile = !me?.profileImage || String(me.profileImage).includes("default");
  const rawAvatarSrc = isDefaultProfile
    ? "local_default"
    : (me?.profileImage ?? "local_default");

  const avatarSrc =
    rawAvatarSrc === "local_default"
      ? null
      : (isHttp(rawAvatarSrc) ? `${rawAvatarSrc}${rawAvatarSrc.includes("?") ? "&" : "?"}v=${avatarVersion || 0}` : rawAvatarSrc);

  const mypageSubText = status === "APPROVED" ? "재학생 인증 완료" : "재학생 인증이 필요합니다.";

  const verifyUi = React.useMemo(() => {
    switch (status) {
      case "PENDING":
        return { label: "인증 요청중", disabled: true, onPress: () => {} };
      case "REJECTED":
        return { label: "인증이 실패했어요", disabled: false, onPress: () => navigation.navigate("SchoolVerify") };
      case "APPROVED":
        return {
          label: "프로필 수정하기",
          disabled: false,
          onPress: () => Alert.alert("서비스 준비중입니다."),
        };
      case "UNVERIFIED":
      default:
        return { label: "재학생 인증하기", disabled: false, onPress: () => navigation.navigate("SchoolVerify") };
    }
  }, [status, navigation]);

  const handleServicePreparing = React.useCallback(() => {
    Alert.alert("서비스 준비중입니다.");
  }, []);

  const handleLogout = React.useCallback(async () => {
    try {
      await logout();
    } catch (e) {
      // 서버 실패해도 로컬 토큰 제거 후 로그인으로 이동
      // 필요 시 e instanceof ApiError 처리 가능
    } finally {
      // tokenStorage를 쓰고 있으면 여기서 removeAccessToken() 호출로 교체하세요.
      try {
        // 로컬 저장소 직접 제거를 쓰는 구조면 여기에 맞춰 수정
        // 예: await clearAccessToken();
      } catch {}
      navigation.getParent()?.navigate("Auth" as never);
    }
  }, [navigation]);

  React.useEffect(() => {
    if (!isFocused) return;

    let mounted = true;
    (async () => {
      try {
        const res = await getUserMe();
        if (!mounted) return;
        setMe(res as any);
        setAvatarVersion(Date.now());
      } catch (e) {
        if (!mounted) return;
        setMe(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isFocused]);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.previousBtn}
            accessibilityLabel="previous"
            onPress={() => navigation.navigate("StudentHome")}
          >
            <Image
              source={require("../../../assets/icons/chevron-left.png")}
              style={styles.headerIcon}
            />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1} />
          </View>

          <View style={styles.headerRightSpace} />
        </View>

        {/* Top */}
        <View style={styles.top}>
          <View style={styles.profileWrap}>
            <View style={styles.profileImgWrap}>
              <Image
                source={
                  avatarSrc
                    ? { uri: avatarSrc }
                    : require("../../../assets/images/internie_mascot_normal.png")
                }
                style={styles.profileImg}
                resizeMode="contain"
              />

              {isVerifiedStudent && (
                <Image
                  source={require("../../../assets/icons/school-verified-01.png")}
                  style={styles.verifyBadge}
                  resizeMode="contain"
                />
              )}
            </View>

            <Text style={styles.greeting}>
              안녕하세요, <Text style={styles.name}>{displayName}</Text>님
            </Text>
            <Text style={styles.subText}>{mypageSubText}</Text>
          </View>
        </View>

        {/* Cards / Menu */}
        <View style={styles.cards}>
          {/* 재학생 인증(웹: status !== APPROVED일 때만 노출) */}
          {status !== "APPROVED" && (
            <Pressable
              style={[
                styles.verifyCard,
                status === "PENDING" ? styles.verifyCardPending : null,
                status === "REJECTED" ? styles.verifyCardRejected : null,
                verifyUi.disabled ? styles.disabled : null,
              ]}
              onPress={verifyUi.onPress}
              disabled={verifyUi.disabled}
            >
              <View style={styles.verifyBadgeDot} />
              <Text style={styles.verifyCardTitle}>{verifyUi.label}</Text>
            </Pressable>
          )}

          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={handleServicePreparing}>
              <Text style={styles.menuTitle}>나의 목표 기업</Text>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>미설정</Text>
                <Image
                  source={require("../../../assets/icons/chevron-right.png")}
                  style={styles.menuChevron}
                />
              </View>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => navigation.navigate("Certificates")}>
              <Text style={styles.menuTitle}>나의 수료증</Text>
              <View style={styles.menuRight}>
                <Image
                  source={require("../../../assets/icons/chevron-right.png")}
                  style={styles.menuChevron}
                />
              </View>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => navigation.navigate("UserModify")}>
              <Text style={styles.menuTitle}>프로필 수정하기</Text>
              <View style={styles.menuRight}>
                <Image
                  source={require("../../../assets/icons/chevron-right.png")}
                  style={styles.menuChevron}
                />
              </View>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => navigation.navigate("VerifyCode")}>
              <Text style={styles.menuTitle}>인증코드 입력하기</Text>
              <View style={styles.menuRight}>
                <Image
                  source={require("../../../assets/icons/chevron-right.png")}
                  style={styles.menuChevron}
                />
              </View>
            </Pressable>
          </View>

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>

      {/* 로그아웃 버튼(하단 고정) */}
      <View style={styles.logoutDock} pointerEvents="box-none">
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
