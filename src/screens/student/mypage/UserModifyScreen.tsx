import React from "react";
import { API_BASE_URL } from "@env";
import { useTranslation } from "react-i18next";
import { View, Text, Pressable, Image, TextInput, ActivityIndicator, Alert, ScrollView, Modal } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { launchImageLibrary } from "react-native-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ApiError, getUserMe, updateMyProfile, updateMyProfileImage, deleteMyProfileImage, sendMyEmailCode, verifyMyEmailCode, type UserMe, type UploadFileLike } from "../../../api/client";
import { Screen } from "../../../components/Screen";
import { styles } from "./UserModify.style";
import { commonStyles } from "../../../theme/common.Style";

type Props = NativeStackScreenProps<StudentStackParamList, "UserModify">;

type ProfileForm = {
    name: string;
    email: string;
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
    if (/^https?:\/\//i.test(raw)) return raw;

    const origin = getApiOrigin(API_BASE_URL);
    if (raw.startsWith("/")) return `${origin}${raw}`;
    return `${origin}/${raw}`;
}

function Header({ onCloseClick }: { onCloseClick: () => void }) {
    const { t } = useTranslation();

    return (
        <View style={[commonStyles.topbarMain, commonStyles.topbarRow]}>
            <View style={styles.headerLeftSpace} />
            <Text style={styles.headerTitle}>{t("mypage.editProfile")}</Text>
            <Pressable style={commonStyles.iconbtn} onPress={onCloseClick}>
                <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
            </Pressable>
        </View>
    );
}

export default function UserModifyScreen({ navigation }: Props) {
    const { t, i18n } = useTranslation();

    const [me, setMe] = React.useState<UserMe | null>(null);
    const [form, setForm] = React.useState<ProfileForm>({ name: "", email: "" });
    const [initialForm, setInitialForm] = React.useState<ProfileForm | null>(null);

    const [selectedImage, setSelectedImage] = React.useState<UploadFileLike | null>(null);
    const [previewUri, setPreviewUri] = React.useState<string | null>(null);
    const [removeProfileImage, setRemoveProfileImage] = React.useState(false);

    const [saving, setSaving] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    const [emailConfirmOpen, setEmailConfirmOpen] = React.useState(false);
    const [emailVerifyPopupOpen, setEmailVerifyPopupOpen] = React.useState(false);
    const [emailForm, setEmailForm] = React.useState({ email: "", code: "" });
    const [emailSending, setEmailSending] = React.useState(false);
    const [emailVerifying, setEmailVerifying] = React.useState(false);
    const [emailSentMessage, setEmailSentMessage] = React.useState<string | null>(null);
    const [emailError, setEmailError] = React.useState<string | null>(null);

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
                    email: data.email ?? "",
                };

                setForm(loaded);
                setInitialForm(loaded);
            } catch {
                Alert.alert(t("error.failGetUserMe", "내 정보를 불러오지 못했습니다."));
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [t]);

    const isDefaultProfile = !me?.profileImage || String(me?.profileImage ?? "").includes("default");
    const rawAvatarSrc = isDefaultProfile ? null : (me?.profileImage ?? null);
    const resolvedAvatarSrc = resolveImageUrl(rawAvatarSrc);
    const serverAvatarSrc = resolvedAvatarSrc ?? null;

    const avatarSource =
        removeProfileImage
            ? require("../../../assets/images/internie_mascot_normal.png")
            : previewUri
                ? { uri: previewUri }
                : serverAvatarSrc
                    ? { uri: serverAvatarSrc }
                    : require("../../../assets/images/internie_mascot_normal.png");

    const displayEmail = form.email.trim() || "";
    const birth = (me as any)?.birth ?? t("mypage.birth");
    const schoolMajor = me?.status === "APPROVED" ? (me.school?.name ?? t("mypage.noSchool")) : t("mypage.needStudentVerification");

    const isDirty = React.useMemo(() => {
        if (!initialForm) return false;
        if (normalizeText(form.name) !== normalizeText(initialForm.name)) return true;
        if (normalizeText(form.email) !== normalizeText(initialForm.email)) return true;
        if (selectedImage) return true;
        if (removeProfileImage) return true;
        return false;
    }, [form, initialForm, selectedImage, removeProfileImage]);

    const handleServicePreparing = React.useCallback(() => {
        const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");
        Alert.alert(isKo ? "서비스 준비중입니다." : "Coming Soon");
    }, [i18n.language, i18n.resolvedLanguage]);

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
                Alert.alert(t("error.imageLoadFail", "이미지를 불러오지 못했습니다."));
                return;
            }

            if (asset.type && !asset.type.startsWith("image/")) {
                Alert.alert(t("error.imageRequired", "이미지 파일만 선택할 수 있습니다."));
                return;
            }

            const file: UploadFileLike = {
                uri: asset.uri,
                name: asset.fileName ?? `profile_${Date.now()}.jpg`,
                type: asset.type ?? "image/jpeg",
            };

            setRemoveProfileImage(false);
            setSelectedImage(file);
            setPreviewUri(asset.uri);
        } catch {
            Alert.alert(t("error.imagePickFail", "이미지 선택에 실패했습니다."));
        }
    }, [saving, t]);

    const onDeleteProfileImage = React.useCallback(() => {
        if (saving) return;
        setSelectedImage(null);
        setPreviewUri(null);
        setRemoveProfileImage(true);
    }, [saving]);

    const onSave = React.useCallback(async () => {
        const trimmedName = normalizeText(form.name);

        if (!trimmedName) {
            Alert.alert(t("mypage.needName", "이름을 입력해주세요."));
            return;
        }

        try {
            setSaving(true);

            let updatedMe: UserMe | null = null;

            updatedMe = await updateMyProfile({
                name: trimmedName,
            });

            if (removeProfileImage) {
                updatedMe = await deleteMyProfileImage();
            }

            if (selectedImage) {
                updatedMe = await updateMyProfileImage(selectedImage);
            }

            if (updatedMe) {
                setMe(updatedMe);
            }

            const nextInitial: ProfileForm = {
                ...form,
                name: trimmedName,
            };

            setInitialForm(nextInitial);
            setForm(nextInitial);
            setSelectedImage(null);
            setPreviewUri(null);
            setRemoveProfileImage(false);

            Alert.alert(t("common.saved", "저장되었습니다."));
        } catch (e) {
            const status = (e as any)?.status;
            const bodyText = (e as any)?.bodyText;

            if (status != null) {
                Alert.alert(t("common.saveFail", "수정 실패"), `status=${String(status)}\n${String(bodyText ?? "")}`);
            } else if (e instanceof ApiError) {
                Alert.alert(t("common.saveFail", "수정 실패"), e.bodyText ? String(e.bodyText) : t("common.saveFailDefault", "수정에 실패했습니다."));
            } else {
                Alert.alert(t("common.saveFailDefault", "수정에 실패했습니다."));
            }
        } finally {
            setSaving(false);
        }
    }, [form, removeProfileImage, selectedImage, t]);

    const handleSendEmailCode = React.useCallback(async () => {
        const currentEmail = (me?.email ?? "").trim().toLowerCase();
        const nextEmail = emailForm.email.trim().toLowerCase();

        if (!nextEmail) {
            setEmailError(t("userModify.emailRequired", "이메일을 입력해주세요."));
            return;
        }

        if (nextEmail === currentEmail) {
            setEmailError(t("userModify.sameEmail", "현재 사용 중인 이메일과 동일합니다. 다른 이메일을 입력해주세요."));
            return;
        }

        setEmailSending(true);
        setEmailError(null);
        setEmailSentMessage(null);

        try {
            const lang = i18n.resolvedLanguage ?? i18n.language ?? "ko";
            const res = await sendMyEmailCode(emailForm.email.trim(), lang);

            if (res.status === "EXISTING_ACCOUNT_FOUND") {
                setEmailError(t("userModify.existingAccount", "이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요."));
                return;
            }

            setEmailSentMessage(t("userModify.codeSent", { email: res.maskedEmail, defaultValue: `${res.maskedEmail}로 인증코드를 발송했습니다.` }));
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "AUTH_EXISTING_ACCOUNT") {
                    setEmailError(t("userModify.existingAccount", "이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요."));
                    return;
                }
                setEmailError(t("userModify.codeSendFail", "인증코드 발송에 실패했습니다."));
                return;
            }

            setEmailError(t("userModify.emailSendError", "이메일 전송 중 오류가 발생했습니다."));
        } finally {
            setEmailSending(false);
        }
    }, [emailForm.email, i18n.language, i18n.resolvedLanguage, me?.email, t]);

    const handleVerifyEmailCode = React.useCallback(async () => {
        const email = emailForm.email.trim();
        const code = emailForm.code.trim();
        const beforeEmail = (me?.email ?? "").trim().toLowerCase();

        if (!email) {
            setEmailError(t("userModify.emailRequired", "이메일을 입력해주세요."));
            return;
        }

        if (!code) {
            setEmailError(t("userModify.codeRequired", "인증코드를 입력해주세요."));
            return;
        }

        if (email.toLowerCase() === beforeEmail) {
            setEmailError(t("userModify.sameEmail", "현재 사용 중인 이메일과 동일합니다. 다른 이메일을 입력해주세요."));
            return;
        }

        try {
            setEmailVerifying(true);
            setEmailError(null);

            const res = await verifyMyEmailCode(email, code);

            if (!res.verified) {
                setEmailError(t("userModify.emailVerifyFail", "이메일 인증에 실패했습니다."));
                return;
            }

            const nextMe = await getUserMe();
            const afterEmail = (nextMe.email ?? "").trim().toLowerCase();

            if (afterEmail === beforeEmail) {
                setEmailError(t("userModify.emailNotChanged", "현재 이메일과 동일하여 변경되지 않았습니다."));
                return;
            }

            setMe(nextMe);
            setForm((prev) => ({ ...prev, email: (nextMe.email ?? "").trim() }));
            setInitialForm((prev) => prev ? { ...prev, email: (nextMe.email ?? "").trim() } : prev);
            setEmailVerifyPopupOpen(false);
            setEmailForm({ email: "", code: "" });
            setEmailSentMessage(null);
            setEmailError(null);

            Alert.alert(t("userModify.emailChanged", "이메일 변경이 완료되었습니다."));
        } catch (e) {
            if (e instanceof ApiError) {
                setEmailError(t("userModify.invalidOrExpiredCode", "인증코드가 올바르지 않거나 만료되었습니다."));
                return;
            }

            setEmailError(t("userModify.emailVerifyError", "이메일 인증 중 오류가 발생했습니다."));
        } finally {
            setEmailVerifying(false);
        }
    }, [emailForm.code, emailForm.email, me?.email, t]);

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
        <>
            <SafeAreaView style={commonStyles.appRoot}>
                <Header onCloseClick={() => navigation.goBack()} />

                <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
                    <View style={styles.top}>
                        <View style={styles.avatarWrap}>
                            <Image source={avatarSource} style={styles.profileImg} resizeMode="cover" />
                        </View>

                        <View style={{ flexDirection: "row", gap: 16 }}>
                            <Pressable style={[styles.avatarBtn, saving ? styles.avatarBtnDisabled : null]} onPress={handlePickImage} disabled={saving}>
                                <Text style={styles.avatarBtnText}>{t("mypage.edit")}</Text>
                            </Pressable>
                            <Pressable style={[styles.avatarBtn, saving ? styles.avatarBtnDisabled : null, { backgroundColor: "#FFD0D1" }]} onPress={onDeleteProfileImage} disabled={saving}>
                                <Text style={[styles.avatarBtnText, { color: "#FF5959" }]}>{t("mypage.delete")}</Text>
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.field}>
                            <Text style={styles.label}>{t("mypage.name")}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.name}
                                onChangeText={(txt) => setForm((prev) => ({ ...prev, name: txt }))}
                                editable={!saving}
                                placeholder={t("mypage.name")}
                                placeholderTextColor="rgba(0,0,0,0.35)"
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>E-mail</Text>
                            <Pressable onPress={() => { if (!saving) setEmailConfirmOpen(true); }}>
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

                    <View style={styles.bottomMargin} />
                    <View style={styles.bottom}>
                        <Pressable style={[styles.saveBtn, (!isDirty || saving) ? styles.saveBtnDisabled : null]} onPress={onSave} disabled={!isDirty || saving}>
                            <Text style={[styles.saveBtnText, (!isDirty || saving) ? styles.saveBtnTextDisabled : null]}>
                                {t("common.save")}
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </SafeAreaView>

            <Modal visible={emailConfirmOpen} transparent animationType="fade" onRequestClose={() => setEmailConfirmOpen(false)}>
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
                    <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#F0F6FF", borderRadius: 20, paddingTop: 28, paddingHorizontal: 20, paddingBottom: 20 }}>
                        <View style={{ position: "relative", flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                            <Text style={{ fontSize: 24, fontWeight: "700", color: "#000000", lineHeight: 28, textAlign: "center" }}>{t("userModify.changeEmailTitle", "이메일 변경")}</Text>
                            <Pressable style={{ position: "absolute", top: 0, right: 0 }} onPress={() => setEmailConfirmOpen(false)}>
                                <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 16, color: "rgba(0,0,0,0.5)", fontWeight: "500", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
                            {t("userModify.changeEmailDesc", "이메일 변경을 위해 이메일 인증을 진행해야 합니다. 계속하시겠습니까?")}
                        </Text>

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                            <Pressable style={{ flex: 1, height: 56, borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }} onPress={() => setEmailConfirmOpen(false)}>
                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>{t("common.cancel", "취소")}</Text>
                            </Pressable>

                            <Pressable
                                style={{ flex: 1, height: 56, borderRadius: 12, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center" }}
                                onPress={() => {
                                    setEmailConfirmOpen(false);
                                    setEmailForm({ email: "", code: "" });
                                    setEmailSentMessage(null);
                                    setEmailError(null);
                                    setEmailVerifyPopupOpen(true);
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>{t("common.continue", "계속")}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={emailVerifyPopupOpen} transparent animationType="fade" onRequestClose={() => setEmailVerifyPopupOpen(false)}>
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
                    <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#F0F6FF", borderRadius: 20, paddingTop: 28, paddingHorizontal: 20, paddingBottom: 20 }}>
                        <View style={{ position: "relative", flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                            <Text style={{ fontSize: 24, fontWeight: "700", color: "#000000", lineHeight: 28, textAlign: "center" }}>{t("userModify.emailVerifyTitle", "이메일 인증")}</Text>
                            <Pressable style={{ position: "absolute", top: 0, right: 0 }} onPress={() => setEmailVerifyPopupOpen(false)}>
                                <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 16, color: "rgba(0,0,0,0.5)", fontWeight: "500", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
                            {t("userModify.emailVerifyDesc", "이메일 변경을 위해 인증을 진행해주세요.")}
                        </Text>

                        <View style={{ gap: 12 }}>
                            <TextInput
                                style={{ width: "100%", height: 54, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: "#E2E2E2", backgroundColor: "#FFFFFF", fontSize: 16, fontWeight: "400", color: "#000000" }}
                                value={emailForm.email}
                                onChangeText={(value) => setEmailForm((prev) => ({ ...prev, email: value }))}
                                placeholder={t("userModify.emailPlaceholder", "이메일을 입력해주세요")}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                            />

                            <View style={{ flexDirection: "row", gap: 8 }}>
                                <TextInput
                                    style={{ flex: 1, height: 54, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: "#E2E2E2", backgroundColor: "#FFFFFF", fontSize: 16, fontWeight: "400", color: "#000000" }}
                                    value={emailForm.code}
                                    onChangeText={(value) => setEmailForm((prev) => ({ ...prev, code: value }))}
                                    placeholder={t("userModify.codePlaceholder", "인증코드를 입력해주세요")}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                <Pressable
                                    style={{ width: 96, height: 54, borderRadius: 10, backgroundColor: emailSending ? "#E3E3E3" : "#0166FF", alignItems: "center", justifyContent: "center" }}
                                    onPress={handleSendEmailCode}
                                    disabled={emailSending}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: "700", color: emailSending ? "#707070" : "#FFFFFF" }}>
                                        {emailSending ? t("userModify.sending", "전송중") : t("userModify.sendCode", "코드 받기")}
                                    </Text>
                                </Pressable>
                            </View>

                            {emailSentMessage ? <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: "rgba(0,0,0,0.6)" }}>{emailSentMessage}</Text> : null}
                            {emailError ? <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: "#d64545" }}>{emailError}</Text> : null}
                        </View>

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                            <Pressable style={{ flex: 1, height: 56, borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }} onPress={() => setEmailVerifyPopupOpen(false)}>
                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>{t("userModify.later", "나중에")}</Text>
                            </Pressable>

                            <Pressable
                                style={{ flex: 1, height: 56, borderRadius: 12, backgroundColor: emailVerifying || !emailForm.email.trim() || !emailForm.code.trim() ? "#E3E3E3" : "#0166FF", alignItems: "center", justifyContent: "center" }}
                                onPress={handleVerifyEmailCode}
                                disabled={emailVerifying || !emailForm.email.trim() || !emailForm.code.trim()}
                            >
                                <Text style={{ fontSize: 16, fontWeight: "700", color: emailVerifying || !emailForm.email.trim() || !emailForm.code.trim() ? "#707070" : "#FFFFFF" }}>
                                    {emailVerifying ? t("userModify.verifying", "인증 중") : t("userModify.verifyNow", "인증하기")}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}