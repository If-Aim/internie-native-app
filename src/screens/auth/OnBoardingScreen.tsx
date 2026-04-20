import React from "react";
import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, FlatList, } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Screen } from "../../components/Screen";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { ApiError, getUserMe, verifyClientUser, getMyJumpOrganizations, submitMyOnboarding, type JumpOrganization, } from "../../api/client";
import { saveOnboardingCompleted } from "../../auth/tokenStorage";

import { styles } from "./OnBoarding.style";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;
type Step = 1 | 2 | 3 | 4;

type FormState = {
    name: string;
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
    const [instOpen, setInstOpen] = React.useState(false);
    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const me = await getUserMe();
                if (!mounted) return;

                setForm((prev) => ({
                    ...prev,
                    name: (me.name ?? "").trim(),
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
            await verifyClientUser(code);
            setIsVerified(true);

            const orgs = await getMyJumpOrganizations();
            setInstitutions(Array.isArray(orgs) ? orgs : []);

            setStep(4);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status === 401) {
                    setCodeError("인증 코드가 올바르지 않습니다.");
                } else {
                    setCodeError("인증에 실패했습니다. 잠시 후 다시 시도해주세요.");
                }
            } else {
                setCodeError("인증에 실패했습니다.");
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
        if (!form.jumpOrganizationId) return;

        setSubmitting(true);

        try {
            await submitMyOnboarding({
                name: form.name,
                interestJob: form.interestJob,
                interestCompany: form.interestCompany,
                jumpOrganizationId: form.jumpOrganizationId,
            });
            await saveOnboardingCompleted(true);
        } catch {
        } finally {
            setSubmitting(false);
        }

        navigation.replace("Student");
    }, [form.name, form.interestJob, form.interestCompany, form.jumpOrganizationId, navigation]);

    const canGoStep1 = form.name.trim().length > 0;
    const canGoStep2 = form.interestJob.trim().length > 0 || form.interestCompany.trim().length > 0;
    const canGoStep3 = form.verifyCode.trim().length > 0;
    const canFinishStep4 = isVerified && form.jumpOrganizationId != null;

    return (
        <Screen style={styles.container}>
            <Pressable style={styles.flex} onPress={() => instOpen && setInstOpen(false)}>
                <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <View style={styles.content}>
                        {step === 1 && (
                            <>
                                <Text style={styles.title}>{t("onboarding.step1Title")}</Text>

                                <View style={styles.field}>
                                    <TextInput
                                        style={styles.input}
                                        value={form.name}
                                        onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
                                        placeholder={t("onboarding.namePlaceholder")}
                                        placeholderTextColor="#5F5F5F"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View> 
                                <Text style={styles.alert}>{t("onboarding.nameAlert")}</Text>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Text style={styles.title}>{t("onboarding.step2Title")}</Text>

                                <View style={styles.field}>
                                    <TextInput
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
                                    <TextInput
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
                                <Text style={styles.title}>{t("onboarding.step3Title")}</Text>

                                <View style={styles.field}>
                                    <TextInput
                                        style={styles.input}
                                        value={form.verifyCode}
                                        onChangeText={(text) => setForm((prev) => ({ ...prev, verifyCode: text }))}
                                        placeholder={t("onboarding.verifyCodePlaceholder")}
                                        placeholderTextColor="#5F5F5F"
                                        autoCorrect={false}
                                    />
                                </View>

                                {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
                            </>
                        )}

                        {step === 4 && isVerified && (
                            <>
                                <View style={styles.jumpLogoWrap}>
                                    <Image source={require("../../assets/logo/jump-logo.png")} style={styles.jumpLogo} resizeMode="contain" />
                                </View>

                                <Text style={styles.title}>{t("onboarding.step4Title")}</Text>

                                <View style={styles.field}>
                                    <View style={[styles.dropdownBox, instOpen && styles.dropdownBoxOpen]}>
                                        <Pressable style={styles.dropdownTrigger} onPress={() => setInstOpen((prev) => !prev)}>
                                            <Text style={[styles.dropdownValue, !form.jumpOrganizationName && styles.dropdownPlaceholder]}>
                                                {form.jumpOrganizationName || t("onboarding.institutionPlaceholder")}
                                            </Text>

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
                                                        <Pressable
                                                            style={[
                                                                styles.dropdownItem,
                                                                form.jumpOrganizationId === item.id && styles.dropdownItemActive,
                                                            ]}
                                                            onPress={() => pickInstitution(item)}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.dropdownItemText,
                                                                    form.jumpOrganizationId === item.id && styles.dropdownItemTextActive,
                                                                ]}
                                                            >
                                                                {item.name}
                                                            </Text>
                                                        </Pressable>
                                                    )}
                                                    ListEmptyComponent={
                                                        <Text style={styles.dropdownEmptyText}>선택 가능한 센터가 없습니다.</Text>
                                                    }
                                                />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </>
                        )}
                    </View>

                    <View style={[styles.footer, { paddingBottom: 53 + insets.bottom }]}>
                        {step === 1 && (
                            <Pressable
                                style={[
                                    styles.primaryButton,
                                    !canGoStep1 && styles.primaryButtonDisabled,
                                ]}
                                onPress={next}
                                disabled={!canGoStep1}
                            >
                                <Text
                                    style={[
                                        styles.primaryButtonText,
                                        !canGoStep1 && styles.primaryButtonTextDisabled,
                                    ]}
                                >
                                    {t("onboarding.next")}
                                </Text>
                            </Pressable>
                        )}

                        {step === 2 && (
                            <>
                                <Pressable
                                    style={styles.ghostButton}
                                    onPress={skipGoals}
                                    disabled={submitting}
                                >
                                    <Text style={styles.ghostButtonText}>{t("onboarding.skip")}</Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.primaryButton,
                                        !canGoStep2 && styles.primaryButtonDisabled,
                                    ]}
                                    onPress={next}
                                    disabled={!canGoStep2}
                                >
                                    <Text
                                        style={[
                                            styles.primaryButtonText,
                                            !canGoStep2 && styles.primaryButtonTextDisabled,
                                        ]}
                                    >
                                        {t("onboarding.next")}
                                    </Text>
                                </Pressable>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <Pressable
                                    style={styles.ghostButton}
                                    onPress={() => {
                                        skipVerifyAndFinish().catch(console.error);
                                    }}
                                    disabled={submitting}
                                >
                                    <Text style={styles.ghostButtonText}>{t("onboarding.skip")}</Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.primaryButton,
                                        (submitting || !canGoStep3) && styles.primaryButtonDisabled,
                                    ]}
                                    onPress={() => {
                                        submitAll().catch(console.error);
                                    }}
                                    disabled={submitting || !canGoStep3}
                                >
                                    <Text
                                        style={[
                                            styles.primaryButtonText,
                                            (submitting || !canGoStep3) && styles.primaryButtonTextDisabled,
                                        ]}
                                    >
                                        {t("onboarding.next")}
                                    </Text>
                                </Pressable>
                            </>
                        )}

                        {step === 4 && isVerified && (
                            <Pressable
                                style={[
                                    styles.primaryButton,
                                    (!canFinishStep4 || submitting) && styles.primaryButtonDisabled,
                                ]}
                                onPress={() => {
                                    finishInstitution().catch(console.error);
                                }}
                                disabled={!canFinishStep4 || submitting}
                            >
                                <Text
                                    style={[
                                        styles.primaryButtonText,
                                        (!canFinishStep4 || submitting) && styles.primaryButtonTextDisabled,
                                    ]}
                                >
                                    {t("common.done")}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Pressable>
        </Screen>
    );
}