// src/screens/student/mypage/SchoolVerifyScreen.tsx
import React from "react";
import { View, Pressable, Image, FlatList, ActivityIndicator, Keyboard, } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { launchCamera, launchImageLibrary, type Asset } from "react-native-image-picker";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { applyMyVerification, ApiError, searchSchools, selectMySchool, type UploadFileLike, type UserSchool, } from "../../../api/client";

import { Screen } from "../../../components/Screen";
import { commonStyles } from "../../../theme/common.Style";
import { styles } from "./SchoolVerify.style";

import AppText from "../../../../AppText";
import AppTextInput from "../../../../AppTextInput";

type Props = NativeStackScreenProps<StudentStackParamList, "SchoolVerify">;

type Step = "SCHOOL_SEARCH" | "UPLOAD" | "DONE" | "SUBMITTED";

function assetToUploadFile(a: Asset): UploadFileLike | null {
    const uri = a.uri;
    if (!uri) return null;

    const name = a.fileName ?? `student_card_${Date.now()}.jpg`;
    const type = a.type ?? "image/jpeg";

    return { uri, name, type };
}

// HEADER
function Header({
    onCloseClick,
}: {
    onCloseClick: () => void,
}) {
    return (
        <View style={commonStyles.topbarRow}>
            <View style={commonStyles.icon40} />
            <Pressable style={commonStyles.iconbtn} onPress={onCloseClick} >
                <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} />
            </Pressable>
        </View>
    );
}

export default function SchoolVerifyScreen({ navigation }: Props) {
    const [step, setStep] = React.useState<Step>("SCHOOL_SEARCH");

    const [query, setQuery] = React.useState("");
    const [selectedSchool, setSelectedSchool] = React.useState<UserSchool | null>(null);
    const [schools, setSchools] = React.useState<UserSchool[]>([]);
    const [searching, setSearching] = React.useState(false);

    const [picked, setPicked] = React.useState<UploadFileLike | null>(null);

    const [submitting, setSubmitting] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState("");

    const isDropdownOpen =
        query.trim() !== "" &&
        !selectedSchool &&
        (schools.length > 0 || searching || (!searching && schools.length === 0));

    function onClose() {
        navigation.goBack();
    }

    function onPickSchool(s: UserSchool) {
        Keyboard.dismiss();
        setSelectedSchool(s);
        setQuery(s.name);
        setSchools([]);
        setErrorMsg("");
    }

    async function onNextFromSchool() {
        if (!selectedSchool) return;

        setSubmitting(true);
        setErrorMsg("");

        try {
            await selectMySchool({ schoolId: selectedSchool.id });
            setStep("UPLOAD");
        } catch (e) {
            if (e instanceof ApiError) {
                const msg =
                    e.status === 404
                        ? "찾을 수 없는 학교입니다."
                        : e.status === 400
                        ? "학교 정보가 올바르지 않습니다."
                        : "학교 선택에 실패했습니다.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("학교 선택에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    function resetFile() {
        setPicked(null);
        setErrorMsg("");
        setStep("UPLOAD");
    }

    async function pickFromLibrary() {
        setErrorMsg("");

        const res = await launchImageLibrary({
            mediaType: "photo",
            selectionLimit: 1,
            includeExtra: false,
            quality: 0.7,
            maxWidth: 1600,
            maxHeight: 1600,
        });

        const a = res.assets?.[0];
        if (!a) return;

        const file = assetToUploadFile(a);
        if (!file) {
            setErrorMsg("이미지 파일을 불러오지 못했습니다.");
            return;
        }

        if (!(file.type || "").startsWith("image/")) {
            setErrorMsg("이미지 파일만 업로드할 수 있습니다.");
            return;
        }

        setPicked(file);
        setStep("DONE");
    }

    async function takePhoto() {
        setErrorMsg("");

        const res = await launchCamera({
            mediaType: "photo",
            cameraType: "back",
            saveToPhotos: false,
            includeExtra: false,
        });

        const a = res.assets?.[0];
        if (!a) return;

        const file = assetToUploadFile(a);
        if (!file) {
            setErrorMsg("사진을 불러오지 못했습니다.");
            return;
        }

        if (!(file.type || "").startsWith("image/")) {
            setErrorMsg("이미지 파일만 업로드할 수 있습니다.");
            return;
        }

        setPicked(file);
        setStep("DONE");
    }

    React.useEffect(() => {
        const q = query.trim();

        if (selectedSchool) return;

        if (!q) {
            setSchools([]);
            setSearching(false);
            return;
        }

        let cancelled = false;

        const timer = setTimeout(async () => {
            setSearching(true);
            setErrorMsg("");

            try {
                const res = await searchSchools(q);
                if (cancelled) return;
                setSchools(res.slice(0, 10));
            } catch (e) {
                if (cancelled) return;

                if (e instanceof ApiError) {
                    setErrorMsg(
                        e.status === 400
                            ? "검색어를 입력해주세요."
                            : "학교 검색에 실패했습니다."
                    );
                } else {
                    setErrorMsg("학교 검색에 실패했습니다.");
                }
                setSchools([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, selectedSchool]);

    async function onSubmit() {
        if (!picked) return;

        setSubmitting(true);
        setErrorMsg("");

        try {
            await applyMyVerification(picked);
            setStep("SUBMITTED");
        } catch (e) {
            if (e instanceof ApiError) {
                console.log("apply verification failed");
                console.log("status:", e.status);
                console.log("bodyText:", e.bodyText);

                const msg =
                    e.bodyText?.includes("이미 승인된 사용자")
                        ? "이미 승인된 사용자입니다."
                        : e.bodyText?.includes("사용자를 찾을 수 없습니다")
                        ? "사용자를 찾을 수 없습니다."
                        : "업로드에 실패했습니다. 다시 시도해주세요.";
                setErrorMsg(msg);
            } else {
                console.log("unknown error:", e);
                setErrorMsg("업로드에 실패했습니다. 다시 시도해주세요.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={commonStyles.appRoot}>
            <Screen style={[commonStyles.screen, styles.screen]}>
                <Header onCloseClick={onClose} />
                {step === "SCHOOL_SEARCH" && (
                    <>
                        <View style={styles.body}>
                            <AppText style={styles.title}>학교를 선택해주세요</AppText>

                            <View style={[ styles.searchWrap, isDropdownOpen ? styles.searchWrapOpen : null, ]} >
                                <AppTextInput
                                    style={[
                                        styles.input,
                                        query.trim() ? styles.inputHasValue : null,
                                        isDropdownOpen ? styles.inputOpen : null,
                                    ]}
                                    value={query}
                                    placeholder=""
                                    onFocus={() => {
                                        if (selectedSchool) {
                                            setSelectedSchool(null);
                                            setQuery("");
                                        }
                                    }}
                                    onChangeText={(v) => setQuery(v)}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                <View style={[ styles.rightIcon, selectedSchool ? styles.rightIconCheck : null, ]} >
                                    <Image
                                        source={
                                            selectedSchool
                                                ? require("../../../assets/icons/check-02.png")
                                                : require("../../../assets/icons/search-01.png")
                                        }
                                        style={styles.rightIconImg}
                                    />
                                </View>

                                {isDropdownOpen && (
                                    <View style={styles.dropdown} accessibilityRole="list">
                                        {searching ? (
                                            <View style={styles.item}>
                                                <AppText style={styles.itemText}>검색 중...</AppText>
                                            </View>
                                        ) : schools.length === 0 ? (
                                            <View style={styles.item}>
                                                <AppText style={styles.itemText}>검색 결과가 없습니다.</AppText>
                                            </View>
                                        ) : (
                                            <FlatList
                                                keyboardShouldPersistTaps="handled"
                                                data={schools}
                                                keyExtractor={(it) => String(it.id)}
                                                renderItem={({ item }) => (
                                                    <Pressable
                                                        style={styles.item}
                                                        onPress={() => onPickSchool(item)}
                                                    >
                                                        <AppText style={styles.itemText}>{item.name}</AppText>
                                                    </Pressable>
                                                )}
                                            />
                                        )}
                                    </View>
                                )}

                                {errorMsg ? <AppText style={styles.errorText}>{errorMsg}</AppText> : null}
                            </View>
                        </View>

                        <View style={styles.footer}>
                            <Pressable
                                style={[
                                    styles.primaryBtn,
                                    !selectedSchool || submitting
                                        ? styles.primaryBtnDisabled
                                        : null,
                                ]}
                                disabled={!selectedSchool || submitting}
                                onPress={() => {onNextFromSchool().catch(console.error);}}
                            >
                                <AppText style={styles.primaryBtnText}>
                                    {submitting ? "저장 중..." : "다음"}
                                </AppText>
                            </Pressable>
                        </View>
                    </>
                )}

                {step === "UPLOAD" && (
                    <>
                        <View style={styles.body}>
                            <AppText style={styles.uploadTitle}>
                                재학생 인증을 위한{"\n"}학생증 사진이 필요해요
                            </AppText>

                            <View style={styles.cardPreview}>
                                <Image source={require("../../../assets/images/studentcard_guide.png")} style={styles.previewGuide} resizeMode="contain" />
                                <AppText style={styles.cardPreviewText}>
                                    개인정보 보호를 위해{"\n"}카드 번호 등을 가려서 올려주세요!
                                </AppText>
                            </View>

                            

                            {errorMsg ? <AppText style={styles.errorText}>{errorMsg}</AppText> : null}
                        </View>

                        <View style={[styles.footer, styles.footerUpload]}>
                            <Pressable style={[styles.secondaryBtn, styles.footerBtn]} onPress={() => {pickFromLibrary().catch(console.error);}} >
                                <AppText style={styles.secondaryBtnText}>사진 선택하기</AppText>
                            </Pressable>

                            <Pressable style={[styles.primaryAltBtn, styles.footerBtn]} onPress={() => {takePhoto().catch(console.error);}} >
                                <AppText style={styles.primaryBtnText}>학생증 촬영하기</AppText>
                            </Pressable>
                        </View>
                    </>
                )}

                {step === "DONE" && (
                    <>
                        <View style={styles.body}>
                            <AppText style={styles.doneTitle}>학생증 업로드 완료!</AppText>

                            <View style={styles.doneBox}>
                                {picked?.uri ? (
                                    <Image
                                        source={{ uri: picked.uri }}
                                        style={styles.doneImg}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.doneCard}>
                                        <AppText style={styles.doneCardText}>(학생증 사진)</AppText>
                                    </View>
                                )}
                            </View>

                            <AppText style={styles.hint}>
                                재학생 인증까지{"\n"}약 1주일 정도 소요될 수 있어요.
                            </AppText>

                            {errorMsg ? <AppText style={styles.errorText}>{errorMsg}</AppText> : null}
                        </View>

                        <View style={[styles.footer, styles.footerUpload]}>
                            <Pressable style={[styles.secondaryBtn, styles.footerBtn]} onPress={resetFile} >
                                <AppText style={styles.secondaryBtnText}>사진 다시 선택하기</AppText>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.primaryAltBtn,
                                    styles.footerBtn,
                                    !picked || submitting ? styles.primaryBtnDisabled : null,
                                ]}
                                disabled={!picked || submitting}
                                onPress={() => {onSubmit().catch(console.error);}}
                            >
                                {submitting ? (
                                    <View style={styles.submittingRow}>
                                        <ActivityIndicator />
                                        <AppText style={styles.primaryBtnText}>제출 중...</AppText>
                                    </View>
                                ) : (
                                    <AppText style={styles.primaryBtnText}>제출하기</AppText>
                                )}
                            </Pressable>
                        </View>
                    </>
                )}

                {step === "SUBMITTED" && (
                    <View style={styles.submittedWrap}>
                        <View style={styles.submittedCenter}>
                            <View style={styles.checkCircle}>
                                <Image source={require("../../../assets/icons/check-02.png")} style={styles.submittedCheckIcon} />
                            </View>
                            <AppText style={styles.submittedTitle}>제출완료!</AppText>
                        </View>
                    </View>
                )}
            </Screen>
        </SafeAreaView>
    );
}