import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { applyMyVerification, ApiError, type UploadFileLike } from "../../../api/client";

import { Screen } from "../../../components/Screen";
import { commonStyles } from "../../../theme/common.Style";
import { styles } from "./SchoolVerify.style";

import { launchCamera, launchImageLibrary, type Asset } from "react-native-image-picker";

type Props = NativeStackScreenProps<StudentStackParamList, "SchoolVerify">;

type School = { id: string; name: string };
type Step = "SCHOOL_SEARCH" | "UPLOAD" | "DONE";

const MOCK_SCHOOLS: School[] = [
  { id: "1", name: "서울대학교" },
  { id: "2", name: "연세대학교" },
  { id: "3", name: "고려대학교" },
  { id: "4", name: "성균관대학교" },
  { id: "5", name: "한양대학교" },
  { id: "6", name: "중앙대학교" },
  { id: "7", name: "경희대학교" },
  { id: "8", name: "이화여자대학교" },
  { id: "9", name: "숭실대학교" },
  { id: "10", name: "숙명여자대학교" },
  { id: "11", name: "서강대학교" },
  { id: "12", name: "한국외국어대학교" },
  { id: "13", name: "국민대학교" },
  { id: "14", name: "동국대학교" },
  { id: "15", name: "명지대학교" },
  { id: "16", name: "광운대학교" },
  { id: "17", name: "서경대학교" },
  { id: "18", name: "삼육대학교" },
  { id: "19", name: "상명대학교" },
  { id: "20", name: "세종대학교" },
  { id: "21", name: "홍익대학교" },
  { id: "22", name: "단국대학교" },
];

function assetToUploadFile(a: Asset): UploadFileLike | null {
  const uri = a.uri;
  if (!uri) return null;

  // name/type은 없을 수 있어서 안전하게 기본값 부여
  const name = a.fileName ?? `student_card_${Date.now()}.jpg`;
  const type = a.type ?? "image/jpeg";

  return { uri, name, type };
}

export default function SchoolVerifyScreen({ navigation }: Props) {
  const [step, setStep] = React.useState<Step>("SCHOOL_SEARCH");

  const [query, setQuery] = React.useState("");
  const [selectedSchool, setSelectedSchool] = React.useState<School | null>(null);

  const [picked, setPicked] = React.useState<UploadFileLike | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return MOCK_SCHOOLS.filter((s) => s.name.includes(q)).slice(0, 10);
  }, [query]);

  const isDropdownOpen = query.trim() !== "" && !selectedSchool;

  function onClose() {
    navigation.goBack();
  }

  function onPickSchool(s: School) {
    setSelectedSchool(s);
    setQuery(s.name);
  }

  function onNextFromSchool() {
    if (!selectedSchool) return;
    setStep("UPLOAD");
    setErrorMsg("");
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
    });

    const a = res.assets?.[0];
    if (!a) return;

    const file = assetToUploadFile(a);
    if (!file) {
      setErrorMsg("이미지 파일을 불러오지 못했습니다.");
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

    setPicked(file);
    setStep("DONE");
  }

  async function onSubmit() {
    if (!picked) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      await applyMyVerification(picked);
      Alert.alert("제출 완료", "재학생 인증 요청이 제출되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      if (e instanceof ApiError) {
        const body = e.bodyText ?? "";
        const msg = body.includes("이미 승인된 사용자")
          ? "이미 승인된 사용자입니다."
          : body.includes("사용자를 찾을 수 없습니다")
          ? "사용자를 찾을 수 없습니다."
          : "업로드에 실패했습니다. 다시 시도해주세요.";
        setErrorMsg(msg);
      } else {
        setErrorMsg("업로드에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen style={[commonStyles.screen, styles.screen]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.closeBtn} accessibilityLabel="닫기" onPress={onClose} hitSlop={8}>
          <Image source={require("../../../assets/icons/x-01.png")} style={styles.closeIcon} />
        </Pressable>
      </View>

      {/* Step 1: SCHOOL_SEARCH */}
      {step === "SCHOOL_SEARCH" && (
        <>
          <View style={styles.body}>
            <Text style={styles.title}>학교를 선택해주세요</Text>

            <View style={[styles.searchWrap, isDropdownOpen ? styles.searchWrapOpen : null]}>
              <TextInput
                style={[styles.input, isDropdownOpen ? styles.inputOpen : null]}
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

              <View style={[styles.rightIcon, selectedSchool ? styles.rightIconCheck : null]}>
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
                  <FlatList
                    keyboardShouldPersistTaps="handled"
                    data={filtered}
                    keyExtractor={(it) => it.id}
                    renderItem={({ item }) => (
                      <Pressable style={styles.item} onPress={() => onPickSchool(item)}>
                        <Text style={styles.itemText}>{item.name}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.primaryBtn, !selectedSchool ? styles.primaryBtnDisabled : null]}
              disabled={!selectedSchool}
              onPress={onNextFromSchool}
            >
              <Text style={styles.primaryBtnText}>다음</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Step 2: UPLOAD */}
      {step === "UPLOAD" && (
        <>
          <View style={styles.body}>
            <Text style={styles.title}>재학생 인증을 위한 학생증 사진이 필요해요</Text>

            <View style={styles.cardPreview}>
              <Image
                source={require("../../../assets/images/studentcard_guide.png")}
                style={styles.previewGuide}
                resizeMode="contain"
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </View>

          <View style={[styles.footer, styles.footerUpload]}>
            <Pressable style={[styles.secondaryBtn, styles.footerBtn]} onPress={() => void pickFromLibrary()}>
              <Text style={styles.secondaryBtnText}>사진 선택하기</Text>
            </Pressable>

            <Pressable style={[styles.primaryAltBtn, styles.footerBtn]} onPress={() => void takePhoto()}>
              <Text style={styles.primaryBtnText}>학생증 촬영하기</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Step 3: DONE */}
      {step === "DONE" && (
        <>
          <View style={[styles.body, styles.doneBody]}>
            <Text style={styles.title}>학생증이 등록되었어요!</Text>

            <View style={styles.doneBox}>
              {picked?.uri ? (
                <Image source={{ uri: picked.uri }} style={styles.doneImg} resizeMode="cover" />
              ) : (
                <View style={styles.doneCard}>
                  <Text style={styles.doneCardText}>(학생증 사진)</Text>
                </View>
              )}
            </View>

            <Text style={styles.hint}>
              재학생 인증까지{"\n"}약 1주일 정도 소요될 수 있어요.
            </Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.linkBtn} onPress={resetFile}>
              <Text style={styles.linkText}>사진 다시 선택하기</Text>
            </Pressable>

            <Pressable
              style={[
                styles.primaryBtn,
                (!picked || submitting) ? styles.primaryBtnDisabled : null,
              ]}
              disabled={!picked || submitting}
              onPress={() => void onSubmit()}
            >
              {submitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator />
                  <Text style={styles.primaryBtnText}>제출 중...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>제출하기</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}
