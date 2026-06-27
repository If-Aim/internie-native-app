import React from "react";
import { View, Pressable, Image, KeyboardAvoidingView, Platform, FlatList, } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../../navigation/AppNavigator";
import { ApiError, getUserMe, verifyClientUser, getMyJumpOrganizations, submitMyOnboarding, type JumpOrganization, } from "../../api/client";
import { saveOnboardingCompleted } from "../../auth/tokenStorage";
import { commonStyles } from "../../theme/common.Style";
import { styles } from "./OnBoarding.style";

import AppText from "../../../AppText";
import AppTextInput from "../../../AppTextInput";


type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;
type Step = 1 | 2 | 3 | 4;

type FormState = {
    name: string;
    studentNumber: string;
    interestJob: string;
    interestCompany: string;
    selectedTags: string[];
    verifyCode: string;
    jumpOrganizationId: number | null;
    jumpOrganizationName: string;
};

export default function OnboardingScreen({ navigation }: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [step, setStep] = React.useState<Step>(1);

    const [form, setForm] = React.useState<FormState>({
        name: "",
        studentNumber: "",
        interestJob: "",
        interestCompany: "",
        selectedTags: [],
        verifyCode: "",
        jumpOrganizationId: null,
        jumpOrganizationName: "",
    });

    const [submitting, setSubmitting] = React.useState(false);
    const [codeError, setCodeError] = React.useState<string | null>(null);

    const [isVerified, setIsVerified] = React.useState(false);
    const [verifiedRoleSet, setVerifiedRoleSet] = React.useState<string[]>([]);
    const safeRoleSet = Array.isArray(verifiedRoleSet) ? verifiedRoleSet : [];
    const isJumpVerified = safeRoleSet.includes("ROLE_JUMP_STUDENT");
    const isKakaoVerified = safeRoleSet.includes("ROLE_KAKAO_STUDENT");
    const [instOpen, setInstOpen] = React.useState(false);
    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);

    const handleBack = React.useCallback(() => {
        if (step > 1) {
            setStep((prev) => (prev - 1) as Step);
            return;
        }

        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        navigation.replace("Auth");
    }, [step, navigation]);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const me = await getUserMe();
                if (!mounted) return;

                setForm((prev) => ({
                    ...prev,
                    name: (me.name ?? "").trim(),
                    studentNumber: (me.studentNumber ?? "").trim(),
                    jumpOrganizationId: me.jumpOrganization?.id ?? null,
                    jumpOrganizationName: me.jumpOrganization?.name ?? "",
                }));
            } catch {
                if (!mounted) return;
                navigation.replace("Auth");
            }
        })();

        return () => {
            mounted = false;
        };
    }, [navigation]);

    const next = React.useCallback(() => {
        setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));
    }, []);

    const skipGoals = React.useCallback(() => {
        setForm((prev) => ({
            ...prev,
            interestJob: "",
            interestCompany: "",
            selectedTags: [],
        }));
        setStep(3);
    }, []);

    const skipVerifyAndFinish = React.useCallback(async () => {
        setCodeError(null);
        setSubmitting(true);

        try {
            await submitMyOnboarding({
                name: form.name,
                interestJob: form.interestJob,
                interestCompany: form.interestCompany,
            });
            await saveOnboardingCompleted(true);
        } catch {
        } finally {
            setSubmitting(false);
        }

        navigation.replace("Student");
    }, [form.name, form.interestJob, form.interestCompany, navigation]);

    const submitAll = React.useCallback(async () => {
        const code = form.verifyCode.trim();

        if (!code) {
            try {
                await submitMyOnboarding({
                    name: form.name,
                    interestJob: form.interestJob,
                    interestCompany: form.interestCompany,
                });
                await saveOnboardingCompleted(true);
            } catch {
            }

            navigation.replace("Student");
            return;
        }

        setSubmitting(true);
        setCodeError(null);

        try {
            const refreshed = await verifyClientUser(code);
            const roleSet = Array.isArray(refreshed.roleSet)
                ? refreshed.roleSet
                : [];

            setVerifiedRoleSet(roleSet);
            setIsVerified(true);

            setForm((prev) => ({
                ...prev,
                studentNumber: (refreshed.studentNumber ?? "").trim(),
                jumpOrganizationId: refreshed.jumpOrganization?.id ?? null,
                jumpOrganizationName: refreshed.jumpOrganization?.name ?? "",
            }));

            if (roleSet.includes("ROLE_JUMP_STUDENT")) {
                const orgs = await getMyJumpOrganizations();
                setInstitutions(Array.isArray(orgs) ? orgs : []);
            }

            setStep(4);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status === 401) {
                    setCodeError(t("onboarding.invalidCode"));
                } else {
                    setCodeError(t("onboarding.verifyFailedRetry"));
                }
            } else {
                setCodeError(t("onboarding.verifyFailed"));
            }
        } finally {
            setSubmitting(false);
        }
    }, [form.verifyCode, form.name, form.interestJob, form.interestCompany, navigation]);

    const pickInstitution = React.useCallback((org: JumpOrganization) => {
        setForm((prev) => ({
            ...prev,
            jumpOrganizationId: org.id,
            jumpOrganizationName: org.name,
        }));
        setInstOpen(false);
    }, []);

    const finishInstitution = React.useCallback(async () => {
        if (isJumpVerified && !form.jumpOrganizationId) return;
        if (isKakaoVerified && !form.studentNumber.trim()) return;

        setSubmitting(true);

        try {
            await submitMyOnboarding({
                name: form.name,
                interestJob: form.interestJob,
                interestCompany: form.interestCompany,
                ...(isJumpVerified ? { jumpOrganizationId: form.jumpOrganizationId } : {}),
                ...(isKakaoVerified ? { studentNumber: form.studentNumber.trim() } : {}),
            });
            await saveOnboardingCompleted(true);
        } catch {
        } finally {
            setSubmitting(false);
        }

        navigation.replace("Student");
    }, [
        form.name,
        form.interestJob,
        form.interestCompany,
        form.jumpOrganizationId,
        form.studentNumber,
        isJumpVerified,
        isKakaoVerified,
        navigation,
    ]);

    const canGoStep1 = form.name.trim().length > 0;
    const canGoStep2 = form.interestJob.trim().length > 0 || form.interestCompany.trim().length > 0;
    const canGoStep3 = form.verifyCode.trim().length > 0;
    const canFinishStep4 =
        isVerified &&
        (!isJumpVerified || form.jumpOrganizationId != null) &&
        (!isKakaoVerified || form.studentNumber.trim().length > 0);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable style={commonStyles.iconbtn} onPress={handleBack}>
                    <Image source={require("../../assets/icons/chevron-left.png")} style={commonStyles.icon24} resizeMode="contain" />
                </Pressable>
                <View style={commonStyles.icon40} />
            </View>
            <Pressable style={styles.flex} onPress={() => instOpen && setInstOpen(false)}>
                <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <View style={styles.content}>
                        {step === 1 && (
                            <>
                                <AppText style={styles.title}>{t("onboarding.step1Title")}</AppText>

                                <View style={styles.field}>
                                    <AppTextInput
                                        style={styles.input}
                                        value={form.name}
                                        onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
                                        placeholder={t("onboarding.namePlaceholder")}
                                        placeholderTextColor="#5F5F5F"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View> 
                                <AppText style={styles.alert}>{t("onboarding.nameAlert")}</AppText>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <AppText style={styles.title}>{t("onboarding.step2Title")}</AppText>

                                <View style={styles.field}>
                                    <AppTextInput
                                        style={styles.input}
                                        value={form.interestJob}
                                        onChangeText={(text) => setForm((prev) => ({ ...prev, interestJob: text }))}
                                        placeholder={t("onboarding.interestJobPlaceholder")}
                                        placeholderTextColor="#5F5F5F"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <View style={styles.field}>
                                    <AppTextInput
                                        style={styles.input}
                                        value={form.interestCompany}
                                        onChangeText={(text) => setForm((prev) => ({ ...prev, interestCompany: text }))}
                                        placeholder={t("onboarding.interestCompanyPlaceholder")}
                                        placeholderTextColor="#5F5F5F"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <AppText style={styles.title}>{t("onboarding.step3Title")}</AppText>

                                <View style={styles.field}>
                                    <AppTextInput
                                        style={styles.input}
                                        value={form.verifyCode}
                                        onChangeText={(text) => setForm((prev) => ({ ...prev, verifyCode: text }))}
                                        placeholder={t("onboarding.verifyCodePlaceholder")}
                                        placeholderTextColor="#5F5F5F"
                                        autoCorrect={false}
                                    />
                                </View>

                                {codeError ? <AppText style={styles.errorText}>{codeError}</AppText> : null}
                            </>
                        )}

                        {step === 4 && isVerified && (
                            <>
                                {isJumpVerified && (
                                    <>
                                        <View style={styles.jumpLogoWrap}>
                                            <Image source={require("../../assets/logo/jump-logo.png")} style={styles.jumpLogo} resizeMode="contain" />
                                        </View>

                                        <AppText style={styles.title}>{t("onboarding.step4Title")}</AppText>

                                        <View style={styles.field}>
                                            <View style={[styles.dropdownBox, instOpen && styles.dropdownBoxOpen]}>
                                                <Pressable style={styles.dropdownTrigger} onPress={() => setInstOpen((prev) => !prev)}>
                                                    <AppText style={[styles.dropdownValue, !form.jumpOrganizationName && styles.dropdownPlaceholder]}>
                                                        {form.jumpOrganizationName || t("onboarding.institutionPlaceholder")}
                                                    </AppText>

                                                    <View style={styles.dropdownCaretWrap}>
                                                        <Image source={require("../../assets/icons/chevron-left.png")} style={styles.dropdownCaret} resizeMode="contain" />
                                                    </View>
                                                </Pressable>

                                                {instOpen && (
                                                    <View style={styles.dropdownMenu}>
                                                        <FlatList
                                                            data={institutions}
                                                            keyExtractor={(item) => String(item.id)}
                                                            style={styles.dropdownList}
                                                            showsVerticalScrollIndicator={true}
                                                            nestedScrollEnabled
                                                            renderItem={({ item }) => (
                                                                <Pressable style={[ styles.dropdownItem, form.jumpOrganizationId === item.id && styles.dropdownItemActive, ]} onPress={() => pickInstitution(item)} >
                                                                    <AppText style={[ styles.dropdownItemText, form.jumpOrganizationId === item.id && styles.dropdownItemTextActive, ]} >
                                                                        {item.name}
                                                                    </AppText>
                                                                </Pressable>
                                                            )}
                                                            ListEmptyComponent={
                                                                <AppText style={styles.dropdownEmptyText}>{t("onboarding.institutionEmpty")}</AppText>
                                                            }
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </>
                                )}

                                {isKakaoVerified && (
                                    <>
                                        <AppText style={styles.title}>{t("onboarding.studentNumberTitle")}</AppText>

                                        <View style={styles.field}>
                                            <AppTextInput
                                                style={styles.input}
                                                value={form.studentNumber}
                                                onChangeText={(text) => setForm((prev) => ({ ...prev, studentNumber: text }))}
                                                placeholder={t("onboarding.studentNumberLabel")}
                                                placeholderTextColor="#5F5F5F"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                        </View>
                                    </>
                                )}
                            </>
                        )}
                    </View>

                    <View style={[styles.footer, { paddingBottom: 53 + insets.bottom }]}>
                        {step === 1 && (
                            <Pressable style={[ styles.primaryButton, !canGoStep1 && styles.primaryButtonDisabled, ]} onPress={next} disabled={!canGoStep1} >
                                <AppText style={[ styles.primaryButtonText, !canGoStep1 && styles.primaryButtonTextDisabled, ]} >
                                    {t("onboarding.next")}
                                </AppText>
                            </Pressable>
                        )}

                        {step === 2 && (
                            <>
                                <Pressable style={styles.ghostButton} onPress={skipGoals} disabled={submitting} >
                                    <AppText style={styles.ghostButtonText}>{t("onboarding.skip")}</AppText>
                                </Pressable>

                                <Pressable style={[ styles.primaryButton, !canGoStep2 && styles.primaryButtonDisabled, ]} onPress={next} disabled={!canGoStep2} > 
                                    <AppText style={[ styles.primaryButtonText, !canGoStep2 && styles.primaryButtonTextDisabled, ]} >
                                        {t("onboarding.next")}
                                    </AppText>
                                </Pressable>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <Pressable style={styles.ghostButton} onPress={() => { skipVerifyAndFinish().catch(console.error); }} disabled={submitting} >
                                    <AppText style={styles.ghostButtonText}>{t("onboarding.skip")}</AppText>
                                </Pressable>

                                <Pressable style={[ styles.primaryButton, (submitting || !canGoStep3) && styles.primaryButtonDisabled, ]} onPress={() => { submitAll().catch(console.error); }} disabled={submitting || !canGoStep3} >
                                    <AppText style={[ styles.primaryButtonText, (submitting || !canGoStep3) && styles.primaryButtonTextDisabled, ]} >
                                        {t("onboarding.next")}
                                    </AppText>
                                </Pressable>
                            </>
                        )}

                        {step === 4 && isVerified && (
                            <Pressable style={[ styles.primaryButton, (!canFinishStep4 || submitting) && styles.primaryButtonDisabled, ]} onPress={() => { finishInstitution().catch(console.error); }} disabled={!canFinishStep4 || submitting} >
                                <AppText style={[ styles.primaryButtonText, (!canFinishStep4 || submitting) && styles.primaryButtonTextDisabled, ]} >
                                    {t("common.done")}
                                </AppText>
                            </Pressable>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Pressable>
        </SafeAreaView>
    );
}
