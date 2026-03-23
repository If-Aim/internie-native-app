// src/screens/student/mypage/VerifyCodeScreen.tsx
import React from "react";
import { View, Text, Pressable, Image, TextInput, FlatList, } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import { Screen } from "../../../components/Screen";
import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ApiError, verifyJumpUser, getUserMe, getMyJumpOrganizations, submitMyOnboarding, type UserMe, type JumpOrganization, } from "../../../api/client";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles } from "../../../theme/common.Style";
import { styles as myPageStyles } from "./MyPage.style";
import { styles as userModifyStyles } from "./UserModify.style";

type Props = NativeStackScreenProps<StudentStackParamList, "VerifyCode">;

// HEADER
function Header({
    onPreviousClick,
}: {
    onPreviousClick: () => void,
}) {
    return (
        <View style={[commonStyles.topbarMain, commonStyles.topbarRow, userModifyStyles.verifyHeader]}>
            <Pressable style={commonStyles.iconbtn} onPress={onPreviousClick} >
                <Image source={require("../../../assets/icons/chevron-left.png")} style={commonStyles.icon24} />
            </Pressable>
            <View style={myPageStyles.headerCenter} />

            <View style={myPageStyles.headerRightSpace} />
        </View>
    );
}

export default function VerifyCodeScreen({ navigation }: Props) {
    const { t } = useTranslation();
    const [me, setMe] = React.useState<UserMe | null>(null);

    const [code, setCode] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);
    const [instOpen, setInstOpen] = React.useState(false);

    const [jumpOrganizationId, setJumpOrganizationId] = React.useState<number | null>(null);
    const [jumpOrganizationName, setJumpOrganizationName] = React.useState("");

    const [orgLoading, setOrgLoading] = React.useState(false);
    const [orgError, setOrgError] = React.useState<string | null>(null);

    const isJumpVerified = me?.role === "ROLE_JUMP_STUDENT";

    const loadJumpOrganizations = React.useCallback(
        async (currentOrg?: JumpOrganization | null) => {
            setOrgLoading(true);
            setOrgError(null);

            try {
                const orgs = await getMyJumpOrganizations();
                const list = Array.isArray(orgs) ? orgs : [];

                const merged =
                    currentOrg?.id && !list.some((x) => x.id === currentOrg.id)
                        ? [{ id: currentOrg.id, name: currentOrg.name ?? "" }, ...list]
                        : list;

                setInstitutions(merged);

                if (currentOrg?.id) {
                    setJumpOrganizationId(currentOrg.id);
                    setJumpOrganizationName(currentOrg.name ?? "");
                }
            } catch {
                setInstitutions([]);
                setOrgError("센터 목록을 불러오지 못했습니다.");
            } finally {
                setOrgLoading(false);
            }
        },
        []
    );

    const loadMe = React.useCallback(async () => {
        try {
            const user = await getUserMe();
            setMe(user);

            const existingOrg = user.jumpOrganization;
            if (existingOrg?.id != null) {
                setJumpOrganizationId(existingOrg.id);
                setJumpOrganizationName(existingOrg.name ?? "");
            }

            if (user.role === "ROLE_JUMP_STUDENT") {
                setCode("JUMP 인증 완료");
                await loadJumpOrganizations(user.jumpOrganization);
            }
        } catch {
        }
    }, [loadJumpOrganizations]);

    React.useEffect(() => {
        loadMe().catch(console.error);
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
            const refreshed = await verifyJumpUser(trimmed);
            setMe(refreshed);

            if (refreshed.role === "ROLE_JUMP_STUDENT") {
                setCode("JUMP 인증 완료");
                await loadJumpOrganizations(refreshed.jumpOrganization);
            }
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status === 401) {
                    setError("인증 코드가 올바르지 않습니다.");
                } else {
                    setError("인증에 실패했습니다.");
                }
            } else {
                setError("인증에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    }, [code, loadJumpOrganizations]);

    const pickInstitution = React.useCallback((org: JumpOrganization) => {
        setJumpOrganizationId(org.id);
        setJumpOrganizationName(org.name);
        setInstOpen(false);
    }, []);

    const finishInstitution = React.useCallback(async () => {
        if (!jumpOrganizationId) return;

        const name = (me?.name ?? me?.kakaoName ?? "").trim();
        if (!name) {
            setOrgError("이름 정보가 없어 센터 저장을 진행할 수 없습니다.");
            return;
        }

        setSubmitting(true);
        setOrgError(null);

        try {
            await submitMyOnboarding({
                name,
                jumpOrganizationId,
            });

            navigation.navigate("StudentHome");
        } catch (e) {
            if (e instanceof ApiError) {
                setOrgError("센터 저장에 실패했습니다.");
            } else {
                setOrgError("센터 저장에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    }, [jumpOrganizationId, me, navigation]);

    const handlePressDone = React.useCallback(async () => {
        if (isJumpVerified) {
            await finishInstitution();
            return;
        }

        await submit();
    }, [isJumpVerified, finishInstitution, submit]);

    const doneDisabled =
        submitting ||
        (isJumpVerified ? !jumpOrganizationId : !code.trim());

    return (
        <SafeAreaView style={userModifyStyles.vcsSafeAreaView}>
            <Header onPreviousClick={() => navigation.goBack()}/>
            <Screen style={[userModifyStyles.verifyScreen,]}>
                <View style={userModifyStyles.verifyField}>
                    <Text style={userModifyStyles.verifyLabel}>{t("mypage.enterVerificationCode")}</Text>
                    <TextInput
                        style={[
                            userModifyStyles.verifyInput,
                            !isJumpVerified && code.trim().length > 0 && userModifyStyles.verifyInputFilled,
                            isJumpVerified && userModifyStyles.inputReadonly,
                        ]}
                        value={isJumpVerified ? "JUMP 인증 완료" : code}
                        onChangeText={setCode}
                        placeholder={isJumpVerified ? undefined : t("mypage.verificationCode")}
                        editable={!isJumpVerified && !submitting}
                    />
                </View>

                {isJumpVerified && (
                    <View style={userModifyStyles.jumpCenterSection}>
                        <View style={userModifyStyles.jumpLogoWrap}>
                            <Image
                                source={require("../../../assets/logo/jump-logo.png")}
                                style={userModifyStyles.jumpLogo}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={userModifyStyles.jumpCenterTitle}>
                            센터를 선택하세요
                        </Text>

                        {orgLoading ? (
                            <Text style={userModifyStyles.helperText}>불러오는 중...</Text>
                        ) : orgError ? (
                            <Text style={userModifyStyles.errorText}>{orgError}</Text>
                        ) : (
                            <View style={userModifyStyles.dropdownWrap}>
                                <Pressable style={[ userModifyStyles.selectBox, instOpen && userModifyStyles.selectBoxOpen, ]} onPress={() => setInstOpen((v) => !v)} disabled={submitting} >
                                    <Text
                                        style={[
                                            userModifyStyles.selectBoxText,
                                            !jumpOrganizationName && userModifyStyles.selectPlaceholderText,
                                        ]}
                                    >
                                        {jumpOrganizationName || "센터 선택"}
                                    </Text>

                                    <Image
                                        source={require("../../../assets/icons/chevron-left.png")}
                                        style={[
                                            userModifyStyles.selectChevron,
                                            instOpen && userModifyStyles.selectChevronOpen,
                                        ]}
                                    />
                                </Pressable>

                                {instOpen && (
                                    <View style={userModifyStyles.dropdownMenu}>
                                        <FlatList
                                            data={institutions}
                                            keyExtractor={(item) => String(item.id)}
                                            style={userModifyStyles.dropdownMenuScroll}
                                            contentContainerStyle={userModifyStyles.dropdownMenuScrollContent}
                                            nestedScrollEnabled={true}
                                            scrollEnabled={true}
                                            keyboardShouldPersistTaps="handled"
                                            showsVerticalScrollIndicator={true}
                                            renderItem={({ item }) => {
                                                const active = jumpOrganizationId === item.id;

                                                return (
                                                    <Pressable style={[ userModifyStyles.dropdownItem, active && userModifyStyles.dropdownItemActive, ]} onPress={() => pickInstitution(item)} >
                                                        <Text style={[ userModifyStyles.dropdownItemText, ]} >
                                                            {item.name}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            }}
                                        />
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {error ? (
                    <Text style={userModifyStyles.errorText}>{error}</Text>
                ) : null}

                <View style={userModifyStyles.verifyBottom} pointerEvents={instOpen ? "none" : "auto"} >
                    <Pressable
                        style={[
                            userModifyStyles.saveBtn,
                            doneDisabled && userModifyStyles.profileEditSaveDisabled,
                        ]}
                        onPress={() => {handlePressDone().catch(console.error)}}
                        disabled={doneDisabled}
                    >
                        <Text style={[ userModifyStyles.verifySaveBtnText, doneDisabled && userModifyStyles.verifySaveBtnTextDisabled, ]} >
                            완료
                        </Text>
                    </Pressable>
                </View>
            </Screen>
        </SafeAreaView>
    );
}