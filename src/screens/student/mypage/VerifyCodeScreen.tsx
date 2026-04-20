import React from "react";
import { View, Text, Pressable, Image, TextInput, FlatList, Modal } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import { Screen } from "../../../components/Screen";
import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ApiError, verifyClientUser, getUserMe, getMyJumpOrganizations, submitMyOnboarding, type UserMe, type JumpOrganization } from "../../../api/client";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles } from "../../../theme/common.Style";
import { styles as myPageStyles } from "./MyPage.style";
import { styles as userModifyStyles } from "./UserModify.style";

type Props = NativeStackScreenProps<StudentStackParamList, "VerifyCode">;

function Header({ onPreviousClick }: { onPreviousClick: () => void }) {
    return (
        <View style={[commonStyles.topbarMain, commonStyles.topbarRow, userModifyStyles.verifyHeader]}>
            <Pressable style={commonStyles.iconbtn} onPress={onPreviousClick}>
                <Image source={require("../../../assets/icons/chevron-left.png")} style={commonStyles.icon24} resizeMode="contain" />
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
    const [verifyMessage, setVerifyMessage] = React.useState<string | null>(null);
    const [verifyingCode, setVerifyingCode] = React.useState(false);
    const [savingJumpCenter, setSavingJumpCenter] = React.useState(false);
    const [savingStudentNumber, setSavingStudentNumber] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const verifiedMessageTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);
    const [instOpen, setInstOpen] = React.useState(false);
    const [jumpOrganizationId, setJumpOrganizationId] = React.useState<number | null>(null);
    const [jumpOrganizationName, setJumpOrganizationName] = React.useState("");

    const [orgLoading, setOrgLoading] = React.useState(false);
    const [orgLoadError, setOrgLoadError] = React.useState<string | null>(null);
    const [orgSaveError, setOrgSaveError] = React.useState<string | null>(null);
    const [orgSaveMessage, setOrgSaveMessage] = React.useState<string | null>(null);

    const [studentNumber, setStudentNumber] = React.useState("");
    const [studentNumberError, setStudentNumberError] = React.useState<string | null>(null);
    const [studentNumberMessage, setStudentNumberMessage] = React.useState<string | null>(null);

    const [showJumpPopup, setShowJumpPopup] = React.useState(false);
    const [showKakaoPopup, setShowKakaoPopup] = React.useState(false);

    const roleSet = me?.roleSet ?? [];
    const isJumpVerified = roleSet.includes("ROLE_JUMP_STUDENT");
    const isKakaoVerified = roleSet.includes("ROLE_KAKAO_STUDENT");

    function triggerVerifiedMessage(message: string) {
        if (verifiedMessageTimeoutRef.current !== null) {
            clearTimeout(verifiedMessageTimeoutRef.current);
        }

        setVerifyMessage(message);

        verifiedMessageTimeoutRef.current = setTimeout(() => {
            setVerifyMessage(null);
            verifiedMessageTimeoutRef.current = null;
        }, 5000);
    }

    function syncClientPopups(user: UserMe) {
        const nextRoleSet = user.roleSet ?? [];
        const needsJumpCenter = nextRoleSet.includes("ROLE_JUMP_STUDENT") && user.jumpOrganization?.id == null;
        const needsStudentNumber = nextRoleSet.includes("ROLE_KAKAO_STUDENT") && !(user.studentNumber ?? "").trim();

        if (needsJumpCenter) {
            setShowJumpPopup(true);
            setShowKakaoPopup(false);
            return;
        }

        if (needsStudentNumber) {
            setShowJumpPopup(false);
            setShowKakaoPopup(true);
            return;
        }

        setShowJumpPopup(false);
        setShowKakaoPopup(false);
    }

    async function loadJumpOrganizations(currentOrg?: JumpOrganization | null) {
        setOrgLoading(true);
        setOrgLoadError(null);

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
            setOrgLoadError("센터 목록을 불러오지 못했습니다.");
        } finally {
            setOrgLoading(false);
        }
    }

    function pickInstitution(org: JumpOrganization) {
        setJumpOrganizationId(org.id);
        setJumpOrganizationName(org.name);
        setOrgSaveError(null);
        setOrgSaveMessage(null);
        setInstOpen(false);
    }

    async function finishInstitution() {
        if (!jumpOrganizationId) return;

        setSavingJumpCenter(true);
        setOrgSaveError(null);
        setOrgSaveMessage(null);

        try {
            const updated = await submitMyOnboarding({
                jumpOrganizationId,
            });

            setMe(updated);
            setJumpOrganizationId(updated.jumpOrganization?.id ?? null);
            setJumpOrganizationName(updated.jumpOrganization?.name ?? "");
            setOrgSaveError(null);
            setOrgSaveMessage("센터 저장이 완료되었습니다.");
            syncClientPopups(updated);
        } catch (e) {
            if (e instanceof ApiError) {
                setOrgSaveError("센터 저장에 실패했습니다.");
            } else {
                setOrgSaveError("센터 저장에 실패했습니다.");
            }
        } finally {
            setSavingJumpCenter(false);
        }
    }

    async function finishStudentNumber() {
        const trimmedStudentNumber = studentNumber.trim();

        if (!trimmedStudentNumber) {
            setStudentNumberError("학번을 입력해주세요.");
            return;
        }

        setSavingStudentNumber(true);
        setStudentNumberError(null);
        setStudentNumberMessage(null);

        try {
            const updated = await submitMyOnboarding({
                studentNumber: trimmedStudentNumber,
            });

            setMe(updated);
            setStudentNumber((updated.studentNumber ?? "").trim());
            setStudentNumberError(null);
            setStudentNumberMessage("학번 저장이 완료되었습니다.");
            syncClientPopups(updated);
        } catch (e) {
            if (e instanceof ApiError) {
                setStudentNumberError("학번 저장에 실패했습니다.");
            } else {
                setStudentNumberError("학번 저장에 실패했습니다.");
            }
        } finally {
            setSavingStudentNumber(false);
        }
    }

    async function submit() {
        const trimmed = code.trim();

        if (!trimmed) {
            setError("인증코드를 입력해주세요.");
            return;
        }

        setVerifyingCode(true);
        setError(null);

        try {
            const prevRoleSet = me?.roleSet ?? [];
            const refreshed = await verifyClientUser(trimmed);
            const nextRoleSet = refreshed.roleSet ?? [];
            const addedRoles = nextRoleSet.filter((role) => !prevRoleSet.includes(role));

            setMe(refreshed);
            setCode("");
            setError(null);

            if (addedRoles.length === 0) {
                triggerVerifiedMessage("이미 인증된 코드입니다.");
            } else {
                triggerVerifiedMessage("인증이 완료되었습니다.");
            }

            if (nextRoleSet.includes("ROLE_JUMP_STUDENT")) {
                await loadJumpOrganizations(refreshed.jumpOrganization);
            }

            setStudentNumber((refreshed.studentNumber ?? "").trim());
            syncClientPopups(refreshed);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status === 400 || e.status === 401) {
                    setError("인증 코드가 올바르지 않습니다.");
                } else {
                    setError("인증에 실패했습니다.");
                }
            } else {
                setError("인증에 실패했습니다.");
            }
        } finally {
            setVerifyingCode(false);
        }
    }

    function handleSubmitCode() {
        void submit();
    }

    React.useEffect(() => {
        return () => {
            if (verifiedMessageTimeoutRef.current !== null) {
                clearTimeout(verifiedMessageTimeoutRef.current);
            }
        };
    }, []);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const user = await getUserMe();
                if (!mounted) return;

                setMe(user);
                setStudentNumber((user.studentNumber ?? "").trim());

                const existingOrg = user.jumpOrganization;
                if (existingOrg?.id != null) {
                    setJumpOrganizationId(existingOrg.id);
                    setJumpOrganizationName(existingOrg.name ?? "");
                }

                if (Array.isArray(user.roleSet) && user.roleSet.includes("ROLE_JUMP_STUDENT")) {
                    await loadJumpOrganizations(user.jumpOrganization);
                }

                syncClientPopups(user);
            } catch {
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <SafeAreaView style={userModifyStyles.vcsSafeAreaView}>
            <Header onPreviousClick={() => navigation.goBack()} />

            <Screen style={userModifyStyles.verifyScreen}>
                <View style={userModifyStyles.verifyField}>
                    <Text style={userModifyStyles.verifyLabel}>{t("mypage.enterVerificationCode")}</Text>
                    <TextInput
                        style={[
                            userModifyStyles.verifyInput,
                            code.trim().length > 0 && userModifyStyles.verifyInputFilled,
                        ]}
                        value={code}
                        onChangeText={setCode}
                        placeholder={t("mypage.verificationCode")}
                        editable={!verifyingCode}
                    />
                </View>

                {verifyMessage ? <Text style={myPageStyles.modalReason}>{verifyMessage}</Text> : null}
                {error ? <Text style={userModifyStyles.verifyErrorText}>{error}</Text> : null}

                <View style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16, marginLeft: 12 }}>
                    {isJumpVerified ? (
                        <Pressable
                            style={{ width: "50%", height: 52, borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
                            onPress={() => {
                                setOrgSaveError(null);
                                setOrgSaveMessage(null);
                                setShowJumpPopup(true);
                                setShowKakaoPopup(false);
                            }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>점프 센터 선택</Text>
                        </Pressable>
                    ) : null}

                    {isKakaoVerified ? (
                        <Pressable
                            style={{ width: "50%", height: 52, borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
                            onPress={() => {
                                setStudentNumberError(null);
                                setStudentNumberMessage(null);
                                setShowKakaoPopup(true);
                                setShowJumpPopup(false);
                            }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>학번 수정</Text>
                        </Pressable>
                    ) : null}
                </View>

                <View style={userModifyStyles.verifyBottom}>
                    <Pressable
                        style={[
                            userModifyStyles.saveBtn,
                            verifyingCode && userModifyStyles.profileEditSaveDisabled,
                        ]}
                        onPress={handleSubmitCode}
                        disabled={verifyingCode}
                    >
                        <Text style={[userModifyStyles.verifySaveBtnText, verifyingCode && userModifyStyles.verifySaveBtnTextDisabled]}>
                            {verifyingCode ? "확인 중..." : t("common.done")}
                        </Text>
                    </Pressable>
                </View>
            </Screen>

            <Modal visible={showJumpPopup} transparent animationType="fade" onRequestClose={() => setShowJumpPopup(false)}>
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
                    <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#F0F6FF", borderRadius: 20, paddingTop: 28, paddingHorizontal: 20, paddingBottom: 20 }}>
                        <View style={{ position: "relative", flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                            <Text style={{ fontSize: 24, fontWeight: "700", color: "#000000", lineHeight: 28, textAlign: "center" }}>센터 선택</Text>
                            <Pressable style={{ position: "absolute", top: 0, right: 0 }} onPress={() => setShowJumpPopup(false)}>
                                <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 16, color: "rgba(0,0,0,0.5)", fontWeight: "500", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
                            소속된 점프 센터를 선택해주세요.
                        </Text>

                        <View style={{ gap: 12 }}>
                            {orgLoading ? (
                                <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: "rgba(0,0,0,0.6)" }}>불러오는 중...</Text>
                            ) : orgLoadError ? (
                                <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: "#d64545" }}>{orgLoadError}</Text>
                            ) : (
                                <View style={userModifyStyles.dropdownWrap}>
                                    <Pressable
                                        style={[userModifyStyles.selectBox, instOpen && userModifyStyles.selectBoxOpen]}
                                        onPress={() => setInstOpen((v) => !v)}
                                        disabled={savingJumpCenter}
                                    >
                                        <Text style={[userModifyStyles.selectBoxText, !jumpOrganizationName && userModifyStyles.selectPlaceholderText]}>
                                            {jumpOrganizationName || "센터 선택"}
                                        </Text>

                                        <Image
                                            source={require("../../../assets/icons/chevron-left.png")}
                                            style={[userModifyStyles.selectChevron, instOpen && userModifyStyles.selectChevronOpen]}
                                            resizeMode="contain"
                                        />
                                    </Pressable>

                                    {instOpen ? (
                                        <View style={userModifyStyles.dropdownMenu}>
                                            <FlatList
                                                data={institutions}
                                                keyExtractor={(item) => String(item.id)}
                                                style={userModifyStyles.dropdownMenuScroll}
                                                contentContainerStyle={userModifyStyles.dropdownMenuScrollContent}
                                                nestedScrollEnabled={true}
                                                keyboardShouldPersistTaps="handled"
                                                renderItem={({ item }) => {
                                                    const active = jumpOrganizationId === item.id;

                                                    return (
                                                        <Pressable style={[userModifyStyles.dropdownItem, active && userModifyStyles.dropdownItemActive]} onPress={() => pickInstitution(item)}>
                                                            <Text style={userModifyStyles.dropdownItemText}>{item.name}</Text>
                                                        </Pressable>
                                                    );
                                                }}
                                            />
                                        </View>
                                    ) : null}
                                </View>
                            )}

                            {orgSaveError ? <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: "#d64545" }}>{orgSaveError}</Text> : null}
                            {orgSaveMessage ? <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: "rgba(0,0,0,0.6)" }}>{orgSaveMessage}</Text> : null}
                        </View>

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                            <Pressable
                                style={{ flex: 1, height: 56, borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
                                onPress={() => setShowJumpPopup(false)}
                                disabled={savingJumpCenter}
                            >
                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>닫기</Text>
                            </Pressable>

                            <Pressable
                                style={{ flex: 1, height: 56, borderRadius: 12, backgroundColor: savingJumpCenter || !jumpOrganizationId ? "#E3E3E3" : "#0166FF", alignItems: "center", justifyContent: "center" }}
                                onPress={() => { void finishInstitution(); }}
                                disabled={savingJumpCenter || !jumpOrganizationId}
                            >
                                <Text style={{ fontSize: 16, fontWeight: "700", color: savingJumpCenter || !jumpOrganizationId ? "#707070" : "#FFFFFF" }}>
                                    {savingJumpCenter ? "저장 중..." : "저장"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showKakaoPopup} transparent animationType="fade" onRequestClose={() => setShowKakaoPopup(false)}>
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
                    <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#F0F6FF", borderRadius: 20, paddingTop: 28, paddingHorizontal: 20, paddingBottom: 20 }}>
                        <View style={{ position: "relative", flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                            <Text style={{ fontSize: 24, fontWeight: "700", color: "#000000", lineHeight: 28, textAlign: "center" }}>학번 입력</Text>
                            <Pressable style={{ position: "absolute", top: 0, right: 0 }} onPress={() => setShowKakaoPopup(false)}>
                                <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} resizeMode="contain" />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 16, color: "rgba(0,0,0,0.5)", fontWeight: "500", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
                            카카오 인증 사용자는 학번을 입력해주세요.
                        </Text>

                        <View style={{ gap: 12 }}>
                            <TextInput
                                style={{ width: "100%", height: 54, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: "#E2E2E2", backgroundColor: "#FFFFFF", fontSize: 16, fontWeight: "400", color: "#000000" }}
                                value={studentNumber}
                                onChangeText={(value) => {
                                    setStudentNumber(value);
                                    setStudentNumberError(null);
                                    setStudentNumberMessage(null);
                                }}
                                placeholder="학번 입력"
                                editable={!savingStudentNumber}
                            />

                            {studentNumberError ? <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: "#d64545" }}>{studentNumberError}</Text> : null}
                            {studentNumberMessage ? <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: "rgba(0,0,0,0.6)" }}>{studentNumberMessage}</Text> : null}
                        </View>

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                            <Pressable
                                style={{ flex: 1, height: 56, borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
                                onPress={() => setShowKakaoPopup(false)}
                                disabled={savingStudentNumber}
                            >
                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>닫기</Text>
                            </Pressable>

                            <Pressable
                                style={{ flex: 1, height: 56, borderRadius: 12, backgroundColor: savingStudentNumber || !studentNumber.trim() ? "#E3E3E3" : "#0166FF", alignItems: "center", justifyContent: "center" }}
                                onPress={() => { void finishStudentNumber(); }}
                                disabled={savingStudentNumber || !studentNumber.trim()}
                            >
                                <Text style={{ fontSize: 16, fontWeight: "700", color: savingStudentNumber || !studentNumber.trim() ? "#707070" : "#FFFFFF" }}>
                                    {savingStudentNumber ? "저장 중..." : "저장"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}