// src/screens/student/mypage/UserModifyScreen.tsx
import React from "react";
import { View, Text, Pressable, Image, TextInput, ActivityIndicator, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { launchImageLibrary } from "react-native-image-picker";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ApiError, getUserMe, updateMyProfile, type UserMe, type UploadFileLike } from "../../../api/client";
import { Screen, ScrollScreen } from "../../../components/Screen";
import { styles } from "./UserModify.style";

type Props = NativeStackScreenProps<StudentStackParamList, "UserModify">;

type ProfileForm = {
    name: string;
};

function normalizeText(v: string) {
    return (v ?? "").trim();
}

export default function UserModifyScreen({ navigation }: Props) {
    const [me, setMe] = React.useState<UserMe | null>(null);

    const [form, setForm] = React.useState<ProfileForm>({ name: "" });
    const [initialForm, setInitialForm] = React.useState<ProfileForm | null>(null);

    const [selectedImage, setSelectedImage] = React.useState<UploadFileLike | null>(null);
    const [previewUri, setPreviewUri] = React.useState<string | null>(null);

    const [saving, setSaving] = React.useState(false);
    const [avatarVersion, setAvatarVersion] = React.useState<number>(0);

    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                const data = await getUserMe();
                if (!mounted) return;

                setMe(data);

                const loaded: ProfileForm = { name: data.name ?? "" };
                setForm(loaded);
                setInitialForm(loaded);
            } catch (e) {
                // 필요 시 에러 처리
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const isDefaultProfile =
        !me?.profileImage || (me.profileImage ?? "").includes("default");

    const rawServerAvatarSrc =
        isDefaultProfile
            ? "internie_mascot_normal"
            : (me?.profileImage ?? "internie_mascot_normal");

    const defaultAvatarSource = require("../../../assets/images/internie_mascot_normal.png");

    const serverAvatarUri =
        rawServerAvatarSrc.startsWith("http")
            ? `${rawServerAvatarSrc}${rawServerAvatarSrc.includes("?") ? "&" : "?"}v=${avatarVersion || 0}`
            : null;

    const avatarSource =
        previewUri
            ? ({ uri: previewUri } as const)
            : serverAvatarUri
                ? ({ uri: serverAvatarUri } as const)
                : defaultAvatarSource;

    const displayEmail = (me as any)?.email ?? "이메일";
    const birth = (me as any)?.birth ?? "생년월일";
    const schoolMajor = me?.status === "APPROVED" ? "학교명" : "재학생 인증 필요";

    const isDirty = React.useMemo(() => {
        if (!initialForm) return false;
        if (normalizeText(form.name) !== normalizeText(initialForm.name)) return true;
        if (selectedImage) return true;
        return false;
    }, [form.name, initialForm, selectedImage]);

    const handlePickImage = React.useCallback(async () => {
        if (saving) return;

        try {
            const res = await launchImageLibrary({
                mediaType: "photo",
                selectionLimit: 1,
                includeBase64: false,
            });

            if (res.didCancel) return;
            const asset = res.assets?.[0];
            if (!asset?.uri) {
                Alert.alert("이미지를 불러오지 못했습니다.");
                return;
            }

            const name = asset.fileName ?? `profile_${Date.now()}.jpg`;
            const type = asset.type ?? "image/jpeg";

            const file: UploadFileLike = {
                uri: asset.uri,
                name,
                type,
            };

            setSelectedImage(file);
            setPreviewUri(asset.uri);
        } catch {
            Alert.alert("이미지 선택에 실패했습니다.");
        }
    }, [saving]);

    const onSave = React.useCallback(async () => {
        const trimmedName = normalizeText(form.name);
        if (!trimmedName) {
            Alert.alert("이름을 입력해주세요.");
            return;
        }

        try {
            setSaving(true);

            const updated = await updateMyProfile({
                name: trimmedName,
                imageFile: selectedImage ?? undefined,
            });

            setMe(updated);
            setAvatarVersion(Date.now());

            const nextInitial: ProfileForm = { name: trimmedName };
            setInitialForm(nextInitial);
            setForm(nextInitial);

            setSelectedImage(null);
            setPreviewUri(null);

            Alert.alert("저장되었습니다.");
        } catch (e) {
            if (e instanceof ApiError) {
                Alert.alert(e.bodyText ? `수정 실패: ${e.bodyText}` : "수정에 실패했습니다.");
            } else {
                Alert.alert("수정에 실패했습니다.");
            }
        } finally {
            setSaving(false);
        }
    }, [form.name, selectedImage]);

    if (loading || !me || !initialForm) {
        return (
            <Screen style={styles.screen}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator />
                </View>
            </Screen>
        );
    }

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>프로필 수정하기</Text>

                <Pressable style={styles.headerClose} accessibilityLabel="닫기" onPress={() => navigation.goBack()} >
                    <Image source={require("../../../assets/icons/x-01.png")} style={styles.headerCloseIcon} />
                </Pressable>
            </View>

            {/* Body (스크롤) */}
            <ScrollScreen contentContainerStyle={styles.body}>
                <View style={styles.top}>
                    <View style={styles.avatarWrap}>
                        <Image source={avatarSource as any} style={styles.avatar} resizeMode="contain" />
                    </View>

                    <Pressable style={[styles.avatarBtn, saving ? styles.avatarBtnDisabled : null]} onPress={handlePickImage} disabled={saving}>
                        <Text style={styles.avatarBtnText}>편집</Text>
                    </Pressable>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.field}>
                        <Text style={styles.label}>이름</Text>
                        <TextInput
                        style={styles.input}
                        value={form.name}
                        onChangeText={(txt) => setForm({ name: txt })}
                        editable={!saving}
                        placeholder="이름"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>E-mail</Text>
                        <TextInput
                        style={[styles.input, styles.inputReadonly]}
                        value={displayEmail}
                        editable={false}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>생년월일</Text>
                        <TextInput
                        style={[styles.input, styles.inputReadonly]}
                        value={birth}
                        editable={false}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>학교/전공</Text>
                        <TextInput
                        style={[styles.input, styles.inputReadonly]}
                        value={schoolMajor}
                        editable={false}
                        />
                    </View>
                </View>

                <View style={{ height: 18 }} />
            </ScrollScreen>

            {/* Bottom Save Button */}
            <View style={styles.bottom}>
                <Pressable
                style={[
                    styles.saveBtn,
                    (!isDirty || saving) ? styles.saveBtnDisabled : null,
                ]}
                onPress={onSave}
                disabled={!isDirty || saving}
                >
                    <Text style={[
                        styles.saveBtnText,
                        (!isDirty || saving) ? styles.saveBtnTextDisabled : null,
                    ]}>
                        저장하기
                    </Text>
                </Pressable>
            </View>
        </Screen>
    );
}
