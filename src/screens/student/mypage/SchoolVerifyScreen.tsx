// src/screens/student/mypage/SchoolVerifyScreen.tsx
import React from "react";
import { View, Pressable, Image, FlatList, ActivityIndicator, Keyboard, } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
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
const ALREADY_APPROVED_RESPONSE = String.fromCharCode(51060, 48120, 32, 49849, 51064, 46108, 32, 49324, 50857, 51088);
const USER_NOT_FOUND_RESPONSE = String.fromCharCode(49324, 50857, 51088, 47484, 32, 52286, 51012, 32, 49688, 32, 50630, 49845, 45768, 45796);

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
    const { t } = useTranslation();
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
                        ? t("mypage.schoolVerifyPage.schoolNotFound")
                        : e.status === 400
                        ? t("mypage.schoolVerifyPage.invalidSchool")
                        : t("mypage.schoolVerifyPage.schoolSelectFailed");
                setErrorMsg(msg);
            } else {
                setErrorMsg(t("mypage.schoolVerifyPage.schoolSelectFailed"));
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
            setErrorMsg(t("error.imageLoadFail"));
            return;
        }

        if (!(file.type || "").startsWith("image/")) {
            setErrorMsg(t("error.imageRequired"));
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
            setErrorMsg(t("error.imageLoadFail"));
            return;
        }

        if (!(file.type || "").startsWith("image/")) {
            setErrorMsg(t("error.imageRequired"));
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
                            ? t("mypage.schoolVerifyPage.queryRequired")
                            : t("mypage.schoolVerifyPage.schoolSearchFailed")
                    );
                } else {
                    setErrorMsg(t("mypage.schoolVerifyPage.schoolSearchFailed"));
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
    }, [query, selectedSchool, t]);

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
                    e.bodyText?.includes(ALREADY_APPROVED_RESPONSE)
                        ? t("mypage.schoolVerifyPage.alreadyApproved")
                        : e.bodyText?.includes(USER_NOT_FOUND_RESPONSE)
                        ? t("mypage.schoolVerifyPage.userNotFound")
                        : t("mypage.schoolVerifyPage.uploadFailed");
                setErrorMsg(msg);
            } else {
                console.log("unknown error:", e);
                setErrorMsg(t("mypage.schoolVerifyPage.uploadFailed"));
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
                            <AppText style={styles.title}>{t("mypage.schoolVerifyPage.title")}</AppText>

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
                                                <AppText style={styles.itemText}>{t("mypage.schoolVerifyPage.searching")}</AppText>
                                            </View>
                                        ) : schools.length === 0 ? (
                                            <View style={styles.item}>
                                                <AppText style={styles.itemText}>{t("mypage.schoolVerifyPage.noSearchResults")}</AppText>
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
                                    {submitting ? t("mypage.schoolVerifyPage.saving") : t("mypage.schoolVerifyPage.next")}
                                </AppText>
                            </Pressable>
                        </View>
                    </>
                )}

                {step === "UPLOAD" && (
                    <>
                        <View style={styles.body}>
                            <AppText style={styles.uploadTitle}>
                                {t("mypage.schoolVerifyPage.uploadTitle")}
                            </AppText>

                            <View style={styles.cardPreview}>
                                <Image source={require("../../../assets/images/studentcard_guide.png")} style={styles.previewGuide} resizeMode="contain" />
                                <AppText style={styles.cardPreviewText}>
                                    {t("mypage.schoolVerifyPage.uploadGuide")}
                                </AppText>
                            </View>

                            

                            {errorMsg ? <AppText style={styles.errorText}>{errorMsg}</AppText> : null}
                        </View>

                        <View style={[styles.footer, styles.footerUpload]}>
                            <Pressable style={[styles.secondaryBtn, styles.footerBtn]} onPress={() => {pickFromLibrary().catch(console.error);}} >
                                <AppText style={styles.secondaryBtnText}>{t("mypage.schoolVerifyPage.pickPhoto")}</AppText>
                            </Pressable>

                            <Pressable style={[styles.primaryAltBtn, styles.footerBtn]} onPress={() => {takePhoto().catch(console.error);}} >
                                <AppText style={styles.primaryBtnText}>{t("mypage.schoolVerifyPage.takeStudentCardPhoto")}</AppText>
                            </Pressable>
                        </View>
                    </>
                )}

                {step === "DONE" && (
                    <>
                        <View style={styles.body}>
                            <AppText style={styles.doneTitle}>{t("mypage.schoolVerifyPage.uploadComplete")}</AppText>

                            <View style={styles.doneBox}>
                                {picked?.uri ? (
                                    <Image
                                        source={{ uri: picked.uri }}
                                        style={styles.doneImg}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.doneCard}>
                                        <AppText style={styles.doneCardText}>{t("mypage.schoolVerifyPage.studentCardPhotoLabel")}</AppText>
                                    </View>
                                )}
                            </View>

                            <AppText style={styles.hint}>
                                {t("mypage.schoolVerifyPage.reviewHint")}
                            </AppText>

                            {errorMsg ? <AppText style={styles.errorText}>{errorMsg}</AppText> : null}
                        </View>

                        <View style={[styles.footer, styles.footerUpload]}>
                            <Pressable style={[styles.secondaryBtn, styles.footerBtn]} onPress={resetFile} >
                                <AppText style={styles.secondaryBtnText}>{t("mypage.schoolVerifyPage.repickPhoto")}</AppText>
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
                                        <AppText style={styles.primaryBtnText}>{t("mypage.schoolVerifyPage.submitting")}</AppText>
                                    </View>
                                ) : (
                                    <AppText style={styles.primaryBtnText}>{t("mypage.schoolVerifyPage.submit")}</AppText>
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
                            <AppText style={styles.submittedTitle}>{t("mypage.schoolVerifyPage.submitted")}</AppText>
                        </View>
                    </View>
                )}
            </Screen>
        </SafeAreaView>
    );
}
