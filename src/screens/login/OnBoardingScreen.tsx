// src/screens/login/OnboardingScreen.tsx
import React from "react";
import { View, Text, TextInput, Pressable, Image, Modal, ScrollView, KeyboardAvoidingView, Platform, } from "react-native"; 
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../../components/Screen";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { ApiError, getUserMe, verifyJumpUser, getMyJumpOrganizations, submitMyOnboarding, type JumpOrganization, } from "../../api/client";

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
            } catch {
            }

            navigation.replace("Student");
            return;
        }

        setSubmitting(true);
        setCodeError(null);

        try {
            await verifyJumpUser(code);
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
        navigation,
    ]);

    const canGoStep1 = form.name.trim().length > 0;
    const canGoStep2 =
        form.interestJob.trim().length > 0 || form.interestCompany.trim().length > 0;
    const canGoStep3 = form.verifyCode.trim().length > 0;
    const canFinishStep4 = isVerified && form.jumpOrganizationId != null;

    return (
        <Screen style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboard}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.content}>
                    {step === 1 && (
                        <>
                            <Text style={styles.title}>이름을 입력하세요</Text>

                            <View style={styles.field}>
                                <TextInput
                                    style={styles.input}
                                    value={form.name}
                                    onChangeText={(text) =>
                                        setForm((prev) => ({ ...prev, name: text }))
                                    }
                                    placeholder="이름"
                                    placeholderTextColor="#9AA0A6"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Text style={styles.title}>나의 목표를 설정하세요</Text>

                            <View style={styles.field}>
                                <TextInput
                                    style={styles.input}
                                    value={form.interestJob}
                                    onChangeText={(text) =>
                                        setForm((prev) => ({ ...prev, interestJob: text }))
                                    }
                                    placeholder="관심있는 직무를 입력하세요"
                                    placeholderTextColor="#9AA0A6"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <View style={styles.field}>
                                <TextInput
                                    style={styles.input}
                                    value={form.interestCompany}
                                    onChangeText={(text) =>
                                        setForm((prev) => ({ ...prev, interestCompany: text }))
                                    }
                                    placeholder="희망하는 기업을 입력하세요"
                                    placeholderTextColor="#9AA0A6"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Text style={styles.title}>인증코드를 입력하세요</Text>

                            <View style={styles.field}>
                                <TextInput
                                    style={styles.input}
                                    value={form.verifyCode}
                                    onChangeText={(text) =>
                                        setForm((prev) => ({ ...prev, verifyCode: text }))
                                    }
                                    placeholder="인증코드"
                                    placeholderTextColor="#9AA0A6"
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                />
                            </View>

                            {codeError ? (
                                <Text style={styles.errorText}>{codeError}</Text>
                            ) : null}
                        </>
                    )}

                    {step === 4 && isVerified && (
                        <>
                            <View style={styles.jumpLogoWrap}>
                                <Image
                                    source={require("../../assets/logo/jump-logo.png")}
                                    style={styles.jumpLogo}
                                    resizeMode="contain"
                                />
                            </View>

                            <Text style={styles.title}>센터를 선택하세요</Text>

                            <View style={styles.field}>
                                <Pressable
                                    style={styles.dropdown}
                                    onPress={() => setInstOpen(true)}
                                >
                                    <Text
                                        style={[
                                            styles.dropdownValue,
                                            !form.jumpOrganizationName && styles.dropdownPlaceholder,
                                        ]}
                                    >
                                        {form.jumpOrganizationName || "센터 선택"}
                                    </Text>

                                    <Image
                                        source={require("../../assets/icons/chevron-left.png")}
                                        style={styles.dropdownCaret}
                                    />
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.footer}>
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
                                다음
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
                                <Text style={styles.ghostButtonText}>건너뛰기</Text>
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
                                    다음
                                </Text>
                            </Pressable>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Pressable
                                style={styles.ghostButton}
                                onPress={() => void skipVerifyAndFinish()}
                                disabled={submitting}
                            >
                                <Text style={styles.ghostButtonText}>건너뛰기</Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.primaryButton,
                                    (submitting || !canGoStep3) && styles.primaryButtonDisabled,
                                ]}
                                onPress={() => void submitAll()}
                                disabled={submitting || !canGoStep3}
                            >
                                <Text
                                    style={[
                                        styles.primaryButtonText,
                                        (submitting || !canGoStep3) &&
                                            styles.primaryButtonTextDisabled,
                                    ]}
                                >
                                    다음
                                </Text>
                            </Pressable>
                        </>
                    )}

                    {step === 4 && isVerified && (
                        <Pressable
                            style={[
                                styles.primaryButton,
                                (!canFinishStep4 || submitting) &&
                                    styles.primaryButtonDisabled,
                            ]}
                            onPress={() => void finishInstitution()}
                            disabled={!canFinishStep4 || submitting}
                        >
                            <Text
                                style={[
                                    styles.primaryButtonText,
                                    (!canFinishStep4 || submitting) &&
                                        styles.primaryButtonTextDisabled,
                                ]}
                            >
                                완료
                            </Text>
                        </Pressable>
                    )}
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={instOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setInstOpen(false)}
            >
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={() => setInstOpen(false)}
                >
                    <Pressable
                        style={styles.modalCard}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.modalTitle}>센터 목록</Text>

                        <ScrollView
                            style={styles.modalList}
                            contentContainerStyle={styles.modalListContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {institutions.map((org) => (
                                <Pressable
                                    key={org.id}
                                    style={[
                                        styles.modalItem,
                                        form.jumpOrganizationId === org.id &&
                                            styles.modalItemActive,
                                    ]}
                                    onPress={() => pickInstitution(org)}
                                >
                                    <Text
                                        style={[
                                            styles.modalItemText,
                                            form.jumpOrganizationId === org.id &&
                                                styles.modalItemTextActive,
                                        ]}
                                    >
                                        {org.name}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Pressable
                            style={styles.modalCloseButton}
                            onPress={() => setInstOpen(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>닫기</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </Screen>
    );
}