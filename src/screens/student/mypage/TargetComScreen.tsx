import React from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { getUserMe, submitMyOnboarding, type UserMe } from "../../../api/client";
import { commonStyles } from "../../../theme/common.Style";
import { styles } from "./TargetCom.style";

type Props = NativeStackScreenProps<StudentStackParamList, "TargetCom">;

type FormState = {
    interestJob: string;
    interestCompany: string;
};

function normalize(v: unknown): string {
    return String(v ?? "").trim();
}

export default function TargetComScreen({ navigation }: Props): React.ReactElement {
    const { t } = useTranslation();

    const [me, setMe] = React.useState<UserMe | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    const [form, setForm] = React.useState<FormState>({
        interestJob: "",
        interestCompany: "",
    });
    const [initial, setInitial] = React.useState<FormState | null>(null);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                const data = await getUserMe();
                if (!mounted) return;

                setMe(data);

                const next: FormState = {
                    interestJob: normalize(data.interestJob),
                    interestCompany: normalize(data.interestCompany),
                };

                setForm(next);
                setInitial(next);
                setError("");
            } catch (e) {
                if (!mounted) return;
                setError(t("error.failGetUserMe"));
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [t]);

    const dirty = React.useMemo(() => {
        if (!initial) return false;
        return normalize(form.interestJob) !== normalize(initial.interestJob) || normalize(form.interestCompany) !== normalize(initial.interestCompany);
    }, [form, initial]);

    const canSave = !loading && !saving && dirty;

    const onClose = () => {
        navigation.goBack();
    };

    const onSave = async () => {
        if (!me) return;
        if (!canSave) return;

        try {
            setSaving(true);
            setError("");

            await submitMyOnboarding({
                interestJob: normalize(form.interestJob),
                interestCompany: normalize(form.interestCompany),
            });

            const refreshed = await getUserMe();
            setMe(refreshed);

            const next: FormState = {
                interestJob: normalize(refreshed.interestJob),
                interestCompany: normalize(refreshed.interestCompany),
            };

            setForm(next);
            setInitial(next);

            navigation.goBack();
        } catch (e) {
            setError(t("error.failSetCareerGoal"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.page}>
            <View style={styles.header}>
                <View style={styles.headerSpacer} />
                <Text style={styles.headerTitle}>{t("mypage.targetCompany")}</Text>
                <Pressable style={[styles.headerClose, commonStyles.iconbtn]} onPress={onClose}>
                    <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.section}>
                    <Text style={styles.label}>{t("mypage.desiredJob")}</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={form.interestJob}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, interestJob: value }))}
                            placeholder={t("mypage.desiredJobEx")}
                            editable={!loading && !saving}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Image source={require("../../../assets/icons/ph_pencil-simple-thin.png")} style={styles.pencil} resizeMode="contain" />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>{t("mypage.targetComLabel")}</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={form.interestCompany}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, interestCompany: value }))}
                            placeholder={t("mypage.targetComLabelEx")}
                            editable={!loading && !saving}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Image source={require("../../../assets/icons/ph_pencil-simple-thin.png")} style={styles.pencil} resizeMode="contain" />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Pressable style={[styles.saveBtn, !canSave ? styles.saveBtnDisabled : null]} onPress={onSave} disabled={!canSave}>
                    <Text style={[styles.saveBtnText, !canSave ? styles.saveBtnTextDisabled : null]}>
                        {saving ? t("schedule_edit.saving") : t("schedule_edit.save")}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}