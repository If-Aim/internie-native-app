// src/screens/student/questions/QuestionsScreen.tsx
import React from "react";
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator, Animated, PermissionsAndroid, Platform, } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import Sound, { type AudioSet, AudioEncoderAndroidType, AudioSourceAndroidType, } from "react-native-nitro-sound";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { api, apiUpload, ApiError } from "../../../api/client";
import { Screen } from "../../../components/Screen";
import { styles } from "./Questions.style";

type Props = NativeStackScreenProps<StudentStackParamList, "Questions">;

type Stage = "asking" | "completed";
type RecordStage = "closed" | "preparing" | "recording";

type EventDayResponse = {
  eventDayId: number;
  title: string;
  eventId: number;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  memo?: string | null;
  completed: boolean;
  transcriptions: Array<any>;
};

type EventDayQuestionsResponse = {
  eventDayId: number;
  questionId: number;
  questionList: string[];
};

type QuestionDto = {
  id: string;
  order: number;
  text: string;
  totalCount: number;
};

const BARS = 40;
const SENSITIVITY = 10;

// 업로드/녹음 제한 (웹과 동일 감각)
const PREPARE_MS = 800;
const MIC_LOCK_MS = 3000;
const AUTO_STOP_MS = 40_000; // 40초 지나면 자동 종료(8MB 체크 대신 안전장치)

function applyExperienceName(q: string, title: string) {
  if (!q.includes("(@experience_name)")) return q;
  return q.split("(@experience_name)").join(title);
}

async function ensureRecordPermissionAndroid(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: "마이크 권한",
      message: "녹음을 위해 마이크 권한이 필요합니다.",
      buttonPositive: "허용",
      buttonNegative: "거부",
    }
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function LoadingDots() {
  const a1 = React.useRef(new Animated.Value(0)).current;
  const a2 = React.useRef(new Animated.Value(0)).current;
  const a3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const mk = (v: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(v, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay(250),
        ])
      );

    const l1 = mk(a1, 0);
    const l2 = mk(a2, 120);
    const l3 = mk(a3, 240);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [a1, a2, a3]);

  const dotStyle = (v: Animated.Value) => ({
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -12],
        }),
      },
    ],
  });

  return (
    <View style={styles.loadingDots} accessibilityRole="progressbar">
      <Animated.View style={[styles.loadingDot, dotStyle(a1)]} />
      <Animated.View style={[styles.loadingDot, dotStyle(a2)]} />
      <Animated.View style={[styles.loadingDot, dotStyle(a3)]} />
    </View>
  );
}

export default function QuestionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const eventDayIdNum = Number(route.params?.eventDayId);

  const [questions, setQuestions] = React.useState<QuestionDto[]>([]);
  const [index, setIndex] = React.useState(0);
  const [stage, setStage] = React.useState<Stage>("asking");

  const [recordStage, setRecordStage] = React.useState<RecordStage>("closed");
  const [isMicOn, setIsMicOn] = React.useState(false);
  const [micLocked, setMicLocked] = React.useState(false);

  const [levels, setLevels] = React.useState<number[]>(() => Array(BARS).fill(0));
  const [ringLevel, setRingLevel] = React.useState(0);

  const [eventDayTitle, setEventDayTitle] = React.useState<string>("");
  const [isLoadingQuestions, setIsLoadingQuestions] = React.useState(false);

  const [isUploading, setIsUploading] = React.useState(false);
  const [showOutro, setShowOutro] = React.useState(false);
  const [lastUploadOk, setLastUploadOk] = React.useState<boolean | null>(null);

  const waveTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);


  const startWave = React.useCallback(() => {
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);

    waveTimerRef.current = setInterval(() => {
      // CLI에서 metering을 안정적으로 쓰기 어렵거나 환경 차이가 있어
      // 웹과 동일한 “움직이는 느낌”을 주는 가짜 파형으로 처리합니다.
      const amp = Math.min(1, Math.random() * 0.35 * SENSITIVITY * 0.1);

      setLevels((prev) => {
        const next = prev.slice(1);
        const minLevel = 0.4;
        const newVal = minLevel + amp * (1 - minLevel);
        next.push(newVal);
        return next;
      });
      setRingLevel(amp);
    }, 60);
  }, []);

  const stopWave = React.useCallback(() => {
    if (waveTimerRef.current) {
      clearInterval(waveTimerRef.current);
      waveTimerRef.current = null;
    }
    setLevels(Array(BARS).fill(0));
    setRingLevel(0);
  }, []);

  const uploadAudioToSTT = React.useCallback(
    async (filePath: string): Promise<boolean> => {
      if (!Number.isFinite(eventDayIdNum)) return false;

      setIsUploading(true);
      try {
        const uri = filePath.startsWith("file://") ? filePath : `file://${filePath}`;

        const formData = new FormData();
        formData.append(
          "audioFile",
          {
            uri,
            name: "voice_record.m4a",
            type: Platform.OS === "ios" ? "audio/mp4" : "audio/mp4",
          } as any
        );

        await apiUpload<any>(`/api/stt/upload/${eventDayIdNum}`, formData);
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          // 401/403이면 상위 auth 플로우로 보내는 쪽이 안전
          if (err.status === 401 || err.status === 403) {
            navigation.getParent()?.navigate("Auth" as never);
            return false;
          }
        }
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [eventDayIdNum, navigation]
  );

  // 질문 불러오기
  React.useEffect(() => {
    if (!Number.isFinite(eventDayIdNum)) return;

    let cancelled = false;

    (async () => {
      try {
        setIsLoadingQuestions(true);

        const day = await api<EventDayResponse>(`/event-days/${eventDayIdNum}`);
        if (cancelled) return;

        const title = day.title ?? "";
        setEventDayTitle(title);

        const data = await api<EventDayQuestionsResponse>(`/event-days/${eventDayIdNum}/questions`);
        if (cancelled) return;

        const list = Array.isArray(data.questionList) ? data.questionList : [];
        const totalCount = list.length || 1;

        const mapped: QuestionDto[] = list.map((text, i) => ({
          id: `${data.questionId}_${i + 1}`,
          order: i + 1,
          text: applyExperienceName(text, title),
          totalCount,
        }));

        setQuestions(mapped);

        const answeredCount = Array.isArray(day.transcriptions) ? day.transcriptions.length : 0;
        const nextIndex = Math.max(0, Math.min(answeredCount, mapped.length - 1));

        if (day.completed === true || answeredCount >= mapped.length) {
          setStage("completed");
          return;
        }

        setIndex(nextIndex);
        setStage("asking");
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401 || err.status === 403) return;
        }
      } finally {
        if (!cancelled) setIsLoadingQuestions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventDayIdNum]);

  const current = questions[index] ?? null;
  const total = isLoadingQuestions
    ? Math.max(questions.length, 1)
    : (current?.totalCount ?? questions.length) || 1;
  const currentNo = isLoadingQuestions ? 0 : (current?.order ?? index + 1);
  const isLastQuestion = index === Math.max(0, questions.length - 1);

  // preparing -> recording 전환
  React.useEffect(() => {
    if (recordStage === "preparing") {
      const staticLevels = Array.from({ length: BARS }, () => 0.15);
      setLevels(staticLevels);
      setRingLevel(0.5);

      const timer = setTimeout(() => setRecordStage("recording"), PREPARE_MS);
      return () => clearTimeout(timer);
    }

    if (recordStage === "closed") {
      stopWave();
      setIsMicOn(false);
      setMicLocked(false);

      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
    }
  }, [recordStage, stopWave]);
  
  const stopRecordingAndUpload = React.useCallback(async () => {
    if (micLocked) return;

    try {
      // stopRecorder는 경로(uri)를 반환
      const filePath = await Sound.stopRecorder();

      // (리스너를 추가했다면) 반드시 제거
      // Sound.removeRecordBackListener();

      setRecordStage("closed");
      stopWave();

      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }

      if (!filePath) return;

      setShowOutro(true);
      const ok = await uploadAudioToSTT(filePath);
      setLastUploadOk(ok);
    } catch {
      setRecordStage("closed");
      stopWave();
    }
  }, [micLocked, stopWave, uploadAudioToSTT]);

  // recording 시작/정지(네이티브)
  React.useEffect(() => {
    if (recordStage !== "recording") return;

    let cancelled = false;

    (async () => {
      try {
        const ok = await ensureRecordPermissionAndroid();
        if (!ok) {
          setRecordStage("closed");
          return;
        }

        // (선택) 녹음 설정: Android에서 MIC + AAC 권장
        const audioSet: AudioSet | undefined =
          Platform.OS === "android"
            ? {
                AudioSourceAndroid: AudioSourceAndroidType.MIC,
                AudioEncoderAndroid: AudioEncoderAndroidType.AAC,

                // 공통 키로 품질 지정(권장)
                AudioSamplingRate: 44100,
                AudioEncodingBitRate: 128000,
                AudioChannels: 1,
              }
            : undefined;

        // meteringEnabled는 필요하실 때만 true
        await Sound.startRecorder(undefined, audioSet, false);

        if (cancelled) return;

        setIsMicOn(true);
        startWave();

        // 자동 종료 타이머
        autoStopTimerRef.current = setTimeout(() => {
          void stopRecordingAndUpload();
        }, AUTO_STOP_MS);
      } catch {
        setRecordStage("closed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recordStage, startWave, stopRecordingAndUpload]);

  // 실제 녹음 시작 후 3초간 버튼 잠금
  React.useEffect(() => {
    if (recordStage === "recording" && isMicOn) {
      setMicLocked(true);
      const tt = setTimeout(() => setMicLocked(false), MIC_LOCK_MS);
      return () => clearTimeout(tt);
    }
  }, [recordStage, isMicOn]);




  // 업로드 결과 처리(다음 질문/완료)
  React.useEffect(() => {
    if (!showOutro) return;
    if (isUploading) return;
    if (lastUploadOk == null) return;

    const timer = setTimeout(() => {
      if (!lastUploadOk) {
        // 실패 시 진행 X
        setShowOutro(false);
        setLastUploadOk(null);
        return;
      }

      if (isLastQuestion) {
        setStage("completed");
      } else {
        setIndex((prev) => prev + 1);
        setStage("asking");
      }

      setShowOutro(false);
      setLastUploadOk(null);
    }, 500);

    return () => clearTimeout(timer);
  }, [showOutro, isUploading, isLastQuestion, lastUploadOk]);

  // 완료 시 3초 후 홈 이동
  React.useEffect(() => {
    if (stage !== "completed") return;

    const timer = setTimeout(() => {
      navigation.navigate("StudentHome");
    }, 3000);

    return () => clearTimeout(timer);
  }, [stage, navigation]);

  const progressPct = total > 0 ? (currentNo / total) * 100 : 0;

  return (
    <Screen style={styles.screen}>
      {stage === "asking" && (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.wrap}
            keyboardShouldPersistTaps="handled"
          >
            {/* Topbar */}
            <View style={styles.topbarQuestion}>
              <Pressable
                style={styles.iconBtn}
                accessibilityLabel={t("common.menu")}
                onPress={() => {
                  // 질문 화면 메뉴
                }}
              >
                <Image source={require("../../../assets/icons/menu-01.png")} style={styles.icon24} />
              </Pressable>

              <Text style={styles.topbarTitle} numberOfLines={1}>
                {eventDayTitle || "기록"}
              </Text>

              <View style={{ width: 24, height: 24 }} />
            </View>

            {/* Main */}
            <View style={styles.questionPage}>
              <Image
                source={require("../../../assets/images/internie_mascot_normal.png")}
                style={styles.mascot}
                resizeMode="contain"
              />

              <View style={styles.progressCard}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                </View>

                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabelText}>{t("questions.progress", { defaultValue: "진행률" })}</Text>
                  <Text style={styles.progressLabelText}>
                    {currentNo}/{total}
                  </Text>
                </View>

                <View style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.qBadge}>
                      <Text style={styles.qBadgeText}>Q</Text>
                    </View>
                  </View>

                  <Text style={styles.questionText}>
                    {isLoadingQuestions ? "질문을 불러오는 중이에요…" : current?.text ?? ""}
                  </Text>
                </View>
              </View>

              <View style={styles.bottomSpacer} />
            </View>
          </ScrollView>

          {/* 마이크 버튼(닫힘 상태) */}
          {!isLoadingQuestions && recordStage === "closed" && !showOutro && (
            <Pressable
              style={styles.micButton}
              onPress={() => setRecordStage("preparing")}
              accessibilityLabel={t("questions.micStart", { defaultValue: "녹음 시작" })}
            >
              <Image source={require("../../../assets/icons/microphone-01.png")} style={styles.micIcon} />
            </Pressable>
          )}

          {/* 레코딩 시트(열림 상태) */}
          {!isLoadingQuestions && recordStage !== "closed" && !showOutro && (
            <View style={styles.recordingSheet}>
              <View style={styles.recordingSheetInner}>
                <View style={styles.recordingMeter}>
                  <View style={styles.recordingWave}>
                    {levels.map((lv, i) => (
                      <View
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            transform: [{ scaleY: lv }],
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <Text style={styles.recordingText}>
                  {recordStage === "recording" && isMicOn
                    ? "지금 말하세요"
                    : "인터니가 기록을\n준비하고 있어요!"}
                </Text>

                <View
                  style={[
                    styles.recordingMicRing,
                    recordStage === "recording" && isMicOn && !micLocked
                      ? styles.recordingMicRingActive
                      : styles.recordingMicRingDisabled,
                    isMicOn ? { opacity: 0.2 + ringLevel * 0.6 } : null,
                  ]}
                >
                  <Pressable
                    style={[
                      styles.recordingMicBtn,
                      recordStage === "recording" && isMicOn && !micLocked
                        ? styles.recordingMicBtnActive
                        : styles.recordingMicBtnDisabled,
                    ]}
                    disabled={recordStage !== "recording" || !isMicOn || micLocked}
                    onPress={() => stopRecordingAndUpload()}
                    accessibilityLabel={t("questions.micStop", { defaultValue: "녹음 종료" })}
                  >
                    <Image
                      source={
                        micLocked || !isMicOn || recordStage !== "recording"
                          ? require("../../../assets/icons/microphone-01-gray.png")
                          : require("../../../assets/icons/microphone-01-blue.png")
                      }
                      style={styles.micIcon}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </>
      )}

      {/* OUTRO */}
      {showOutro && (
        <View style={styles.outroOverlay} pointerEvents="none">
          <View style={styles.outroCard}>
            <View style={styles.outroIcon}>
              <Image source={require("../../../assets/icons/check-02.png")} style={styles.outroIconImg} />
            </View>
            <Text style={styles.outroText}>기록완료!</Text>
          </View>
        </View>
      )}

      {/* COMPLETED */}
      {stage === "completed" && (
        <View style={styles.completedWrap}>
          <View style={styles.completionContent}>
            <LoadingDots />
            <Text style={styles.completionTitle}>역량 분석 중</Text>
            <Text style={styles.completionDesc}>
              인터니가 답변을 분석 중이에요!{"\n"}
              완료까지 약 5분 정도 소요될 수 있어요
            </Text>

            {/* 네트워크/대기 인디케이터 */}
            <View style={{ height: 18 }} />
            <ActivityIndicator />
          </View>
        </View>
      )}
    </Screen>
  );
}
