// src/screens/student/mypage/UserModifyScreen.tsx
import React from "react";
import { API_BASE_URL } from "@env";
import { useTranslation } from "react-i18next";
import { View, Text, Pressable, Image, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { launchImageLibrary } from "react-native-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ApiError, getUserMe, updateMyProfile, updateMyProfileImage, type UserMe, type UploadFileLike, } from "../../../api/client";
import { Screen } from "../../../components/Screen";
import { styles } from "./UserModify.style";
import { commonStyles } from "../../../theme/common.Style";

type Props = NativeStackScreenProps<StudentStackParamList, "UserModify">;

type ProfileForm = {
    name: string;
};

function normalizeText(v: string) {
    return (v ?? "").trim();
}

function getApiOrigin(url: string) {
    return url.replace(/\/+$/, "").replace(/\/api$/, "");
}

function resolveImageUrl(path?: string | null) {
    const raw = String(path ?? "").trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    const origin = getApiOrigin(API_BASE_URL);

    if (raw.startsWith("/")) {
        return `${origin}${raw}`;
    }

    return `${origin}/${raw}`;
}

// HEADER
function Header({
    onCloseClick,
}: {
    onCloseClick: () => void,
}) {
    const { t } = useTranslation(); 

    return (
        <View style={[commonStyles.topbarMain, commonStyles.topbarRow]}>
            <View style={styles.headerLeftSpace} />
            <Text style={styles.headerTitle}>{t("mypage.editProfile")}</Text>
            <Pressable style={commonStyles.iconbtn} onPress={onCloseClick} >
                <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} />
            </Pressable>
        </View>
    );
}

export default function UserModifyScreen({ navigation }: Props) {
    const { t } = useTranslation(); 
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

                const loaded: ProfileForm = {
                    name: data.name ?? "",
                };

                setForm(loaded);
                setInitialForm(loaded);
            } catch {
                Alert.alert("내 정보를 불러오지 못했습니다.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const isDefaultProfile = !me?.profileImage;
    const rawAvatarSrc = isDefaultProfile ? null : (me?.profileImage ?? null);
	const resolvedAvatarSrc = resolveImageUrl(rawAvatarSrc);
	const avatarSrc = resolvedAvatarSrc ?? null;

    const avatarSource =
        previewUri
            ? { uri: previewUri }
            : avatarSrc
                ? { uri: avatarSrc }
                : require("../../../assets/images/internie_mascot_normal.png");

    const displayEmail = (me as any)?.email ?? "example@your.email";
    const birth = (me as any)?.birth ?? t("mypage.birth");
    const schoolMajor = me?.status === "APPROVED" ? (me.school?.name ?? t("mypage.noSchool")) : t("mypage.needStudentVerification");

    const isDirty = React.useMemo(() => {
        if (!initialForm) return false;
        if (normalizeText(form.name) !== normalizeText(initialForm.name)) return true;
        if (selectedImage) return true;
        return false;
    }, [form.name, initialForm, selectedImage]);

    const handleServicePreparing = React.useCallback(() => {
        Alert.alert("서비스 준비중입니다.");
    }, []);

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

            if (asset.type && !asset.type.startsWith("image/")) {
                Alert.alert("이미지 파일만 선택할 수 있습니다.");
                return;
            }

            const file: UploadFileLike = {
                uri: asset.uri,
                name: asset.fileName ?? `profile_${Date.now()}.jpg`,
                type: asset.type ?? "image/jpeg",
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

            let updatedMe: UserMe | null = null;

            updatedMe = await updateMyProfile({
                name: trimmedName,
            });

            if (selectedImage) {
                updatedMe = await updateMyProfileImage(selectedImage);
            }

            if (updatedMe) {
                setMe(updatedMe);
                setAvatarVersion(Date.now());
            }

            const nextInitial: ProfileForm = {
                name: trimmedName,
            };

            setInitialForm(nextInitial);
            setForm(nextInitial);
            setSelectedImage(null);
            setPreviewUri(null);

            Alert.alert("저장되었습니다.");
        } catch (e) {
            const status = (e as any)?.status;
            const bodyText = (e as any)?.bodyText;

            if (status != null) {
                Alert.alert("수정 실패", `status=${String(status)}\n${String(bodyText ?? "")}`);
            } else if (e instanceof ApiError) {
                Alert.alert("수정 실패", e.bodyText ? String(e.bodyText) : "수정에 실패했습니다.");
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
        <SafeAreaView style={commonStyles.appRoot}>
            <Header onCloseClick={() => navigation.goBack()}/>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.body} >
                <View style={styles.top}>
                    <View style={styles.avatarWrap}>
                        <Image source={avatarSource} style={styles.profileImg} resizeMode="cover" />
                    </View>

                    <Pressable style={[styles.avatarBtn, saving ? styles.avatarBtnDisabled : null]} onPress={handlePickImage} disabled={saving} >
                        <Text style={styles.avatarBtnText}>{t("mypage.edit")}</Text>
                    </Pressable>
                </View>

                <View style={styles.form}>
                    <View style={styles.field}>
                        <Text style={styles.label}>{t("mypage.name")}</Text>
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
                        <Pressable onPress={handleServicePreparing}>
                            <TextInput
                                style={[styles.input, styles.inputReadonly]}
                                value={displayEmail}
                                editable={false}
                                pointerEvents="none"
                            />
                        </Pressable>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>{t("mypage.birth")}</Text>
                        <Pressable onPress={handleServicePreparing}>
                            <TextInput
                                style={[styles.input, styles.inputReadonly]}
                                value={birth}
                                editable={false}
                                pointerEvents="none"
                            />
                        </Pressable>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>{t("mypage.schoolMajor")}</Text>
                        <TextInput
                            style={[styles.input, styles.inputReadonly]}
                            value={schoolMajor}
                            editable={false}
                        />
                    </View>
                </View>

                <View style={{ height: 30 }} />
                <View style={styles.bottom}>
                    <Pressable style={[ styles.saveBtn, (!isDirty || saving) ? styles.saveBtnDisabled : null, ]} onPress={onSave} disabled={!isDirty || saving} >
                        <Text style={[ styles.saveBtnText, (!isDirty || saving) ? styles.saveBtnTextDisabled : null, ]} >
                            {t("common.save")}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>

            
        </SafeAreaView>
    );
}