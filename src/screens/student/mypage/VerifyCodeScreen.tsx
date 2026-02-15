// src/screens/student/mypage/VerifyCodeScreen.tsx
import React from "react";
import { View, Text, Pressable, Image, TextInput } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../../../components/Screen"
import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ApiError, verifyJumpUser, getUserMe, type UserMe } from "../../../api/client";

import { commonStyles } from "../../../theme/common.Style";
import { styles as myPageStyles } from "./MyPage.style";
import { styles as userModifyStyles } from "./UserModify.style";


type Props = NativeStackScreenProps<StudentStackParamList, "VerifyCode">;

export default function VerifyCodeScreen({ navigation }: Props) {
  const [me, setMe] = React.useState<UserMe | null>(null);

  const [code, setCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isJumpVerified = me?.role === "ROLE_JUMP_STUDENT";

  const loadMe = React.useCallback(async () => {
    try {
      const user = await getUserMe();
      setMe(user);

      if (user.role === "ROLE_JUMP_STUDENT") {
        setCode("JUMP 인증 완료");
      }
    } catch {
        
    }
  }, []);

  React.useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const submit = React.useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("인증코드를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await verifyJumpUser(trimmed);

      const refreshed = await getUserMe();
      setMe(refreshed);

      if (refreshed.role === "ROLE_JUMP_STUDENT") {
        setCode("JUMP 인증 완료");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError("인증 코드가 올바르지 않습니다.");
        else setError("인증에 실패했습니다.");
      } else {
        setError("인증에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [code]);

    return (
    <Screen style={[commonStyles.screen, myPageStyles.container]}>
        {/* Header */}
        <View style={myPageStyles.header}>
        <Pressable
            style={myPageStyles.previousBtn}
            accessibilityLabel="previous"
            onPress={() => navigation.goBack()}
            hitSlop={8}
        >
            <Image
            source={require("../../../assets/icons/chevron-left.png")}
            style={{ width: 24, height: 24 }}
            />
        </Pressable>

        <View style={{ flex: 1 }} />
        </View>

        {/* Body */}
        <View style={userModifyStyles.field}>
        <Text style={userModifyStyles.label}>
            인증코드를 입력하세요
        </Text>

        <TextInput
            style={[
            userModifyStyles.input,
            isJumpVerified && userModifyStyles.inputReadonly
            ]}
            value={isJumpVerified ? "JUMP 인증 완료" : code}
            onChangeText={setCode}
            placeholder={isJumpVerified ? undefined : "인증코드"}
            editable={!isJumpVerified && !submitting}
        />
        </View>

        {error ? (
        <Text style={userModifyStyles.errorText}>{error}</Text>
        ) : null}

        {/* Bottom Button */}
        <View style={userModifyStyles.bottom}>
        <Pressable
            style={[
            userModifyStyles.saveBtn,
            (!code || submitting || isJumpVerified) &&
                userModifyStyles.profileEditSaveDisabled
            ]}
            onPress={() => void submit()}
            disabled={!code || submitting || isJumpVerified}
        >
            <Text style={userModifyStyles.profileEditSaveText}>완료</Text>
        </Pressable>
        </View>
    </Screen>
    );

}
