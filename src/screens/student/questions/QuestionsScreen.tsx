// src/screens/student/questions/QuestionsScreen.tsx
import React from "react";
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator, Animated, PermissionsAndroid, Platform, Alert, } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import RNFS from "react-native-fs";

import Sound, { type AudioSet, AudioEncoderAndroidType, AudioSourceAndroidType, } from "react-native-nitro-sound"; 
import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { apiUpload, ApiError, getEventDayDetail, getEventDayQuestions, type EventDayDetailResponse, type EventDayQuestionsResponse, } from "../../../api/client";
import { Screen } from "../../../components/Screen";
import { styles } from "./Questions.style";
import { commonStyles } from "../../../theme/common.Style";

type Props = NativeStackScreenProps<StudentStackParamList, "Questions">;

type Stage = "asking" | "completed";
type RecordStage = "closed" | "preparing" | "recording";

type QuestionDto = {
    id: string;
    order: number;
    text: string;
    totalCount: number;
};

const BARS = 40;
const PREPARE_MS = 800;
const MIC_LOCK_MS = 3000;
const AUTO_STOP_MS = 5 * 60 * 1000;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

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
function normalizeMetering(db: number) {
    const clamped = Math.max(-60, Math.min(0, db));
    const normalized = (clamped + 60) / 60;
    const minBar = 0.12;
    const maxBar = 1;
    return minBar + normalized * (maxBar - minBar);
}

function normalizeRingLevel(db: number) {
    const clamped = Math.max(-50, Math.min(0, db));
    const normalized = (clamped + 50) / 50;
    return 0.08 + normalized * 0.42;
}
// 파일 크기 및 길이
function normalizeFilePath(uri: string) {
    return uri.startsWith("file://") ? uri.replace("file://", "") : uri;
}

async function getFileSizeBytes(uri: string): Promise<number> {
    const path = normalizeFilePath(uri);
    const stat = await RNFS.stat(path);
    return Number(stat.size);
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
                    Animated.timing(v, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(v, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
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

    const autoStopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const noiseGate = 0.05;

    const ringOpacity =
        ringLevel < noiseGate
            ? 0
            : Math.min(1, (ringLevel - noiseGate) / (1 - noiseGate));

    const stopWave = React.useCallback(() => {
        Sound.removeRecordBackListener();
        setLevels(Array(BARS).fill(0.08));
        setRingLevel(0);
    }, []);

    const clearAutoStopTimer = React.useCallback(() => {
        if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
        }
    }, []);

    const uploadAudioToSTT = React.useCallback(
        async (filePath: string): Promise<boolean> => {
            if (!Number.isFinite(eventDayIdNum)) {
                console.error("eventDayId가 유효하지 않습니다:", eventDayIdNum);
                return false;
            }

            const uri = filePath.startsWith("file://") ? filePath : `file://${filePath}`;

            setIsUploading(true);
            try {
                const fileSize = await getFileSizeBytes(uri);

                if (fileSize > MAX_AUDIO_BYTES) {
                    Alert.alert(
                        "업로드 불가",
                        "녹음 파일이 너무 커서 업로드할 수 없어요.\n조금 더 짧게 녹음한 뒤 다시 시도해 주세요."
                    );
                    return false;
                }

                const formData = new FormData();
                formData.append(
                    "audioFile",
                    {
                        uri,
                        name: "voice_record.m4a",
                        type: "audio/mp4",
                    } as any
                );

                const result = await apiUpload<string>(`/api/stt/upload/${eventDayIdNum}`, formData);
                console.log("STT 결과:", result);
                return true;
            } catch (err) {
                console.error(err);

                if (err instanceof ApiError) {
                    if (err.status === 401 || err.status === 403) {
                        return false;
                    }

                    Alert.alert(
                        "STT 업로드 실패",
                        `${err.status}\n${err.bodyText ?? ""}`
                    );
                    return false;
                }

                Alert.alert("오류", "STT 업로드 중 네트워크 오류가 발생했습니다.");
                return false;
            } finally {
                setIsUploading(false);
            }
        },
        [eventDayIdNum]
    );

    React.useEffect(() => {
        if (!Number.isFinite(eventDayIdNum)) {
            console.error("eventDayId가 유효하지 않습니다:", route.params?.eventDayId);
            return;
        }

        let cancelled = false;

        const fetchAll = async () => {
            try {
                setIsLoadingQuestions(true);

                const day: EventDayDetailResponse = await getEventDayDetail(eventDayIdNum);
                if (cancelled) return;

                const title = day.title ?? "";
                setEventDayTitle(title);

                const data: EventDayQuestionsResponse = await getEventDayQuestions(eventDayIdNum);
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

                if (mapped.length === 0) {
                    Alert.alert("안내", "표시할 질문이 없습니다.");
                }

                const answeredCount = Array.isArray(day.transcriptions)
                    ? day.transcriptions.length
                    : 0;

                const nextIndex = Math.max(0, Math.min(answeredCount, mapped.length - 1));

                if (day.completed === true || answeredCount >= mapped.length) {
                    setStage("completed");
                    return;
                }

                setIndex(nextIndex);
                setStage("asking");
            } catch (err) {
                if (err instanceof ApiError) {
                    if (err.status === 401 || err.status === 403) {
                        return;
                    }

                    if (err.status === 404) {
                        Alert.alert(
                            "안내",
                            "모든 질문을 완료했습니다.\n다음 일정에서 다시 진행해 주세요."
                        );
                        return;
                    }

                    Alert.alert(
                        "질문 조회 실패",
                        `${err.status}\n${err.bodyText ?? ""}`
                    );
                    return;
                }

                Alert.alert("오류", "질문 조회 중 네트워크 오류가 발생했습니다.");
            } finally {
                if (!cancelled) {
                    setIsLoadingQuestions(false);
                }
            }
        };

        fetchAll();

        return () => {
            cancelled = true;
        };
    }, [eventDayIdNum, route.params?.eventDayId]);

    const current = questions[index] ?? null;
    const total = isLoadingQuestions
        ? Math.max(questions.length, 1)
        : (current?.totalCount ?? questions.length) || 1;
    const currentNo = isLoadingQuestions ? 0 : (current?.order ?? index + 1);
    const isLastQuestion = index === questions.length - 1;
    const progressPct = total > 0 ? (currentNo / total) * 100 : 0;

    React.useEffect(() => {
        if (recordStage === "preparing") {
            const staticLevels = Array.from({ length: BARS }, () => 0.08);
            setLevels(staticLevels);
            setRingLevel(0.12);

            const timer = setTimeout(() => {
                setRecordStage("recording");
            }, PREPARE_MS);

            return () => clearTimeout(timer);
        }

        if (recordStage === "closed") {
            stopWave();
            setIsMicOn(false);
            setMicLocked(false);
            clearAutoStopTimer();
        }
    }, [recordStage, stopWave, clearAutoStopTimer]);

    const stopRecordingAndUpload = React.useCallback(async () => {
        if (micLocked) return;

        try {
            const filePath = await Sound.stopRecorder();

            Sound.removeRecordBackListener();
            setRecordStage("closed");
            stopWave();
            clearAutoStopTimer();
            if (!filePath) return;

            setShowOutro(true);
            const recordOk = await uploadAudioToSTT(filePath);
            setLastUploadOk(recordOk);
        } catch (err) {
            console.error("녹음 종료 실패", err);
            setRecordStage("closed");
            stopWave();
            clearAutoStopTimer();
        }
    }, [micLocked, stopWave, clearAutoStopTimer, uploadAudioToSTT]);

    React.useEffect(() => {
        if (recordStage !== "recording") return;

        let cancelled = false;

        const start = async () => {
            try {
                const ok = await ensureRecordPermissionAndroid();
                if (!ok) {
                    Alert.alert("안내", "마이크 권한을 허용해 주셔야 녹음할 수 있어요.");
                    setRecordStage("closed");
                    return;
                }

                const audioSet: AudioSet | undefined =
                    Platform.OS === "android"
                        ? {
                            AudioSourceAndroid: AudioSourceAndroidType.MIC,
                            AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
                            AudioSamplingRate: 44100,
                            AudioEncodingBitRate: 128000,
                            AudioChannels: 1,
                        }
                        : undefined;

                await Sound.startRecorder(undefined, audioSet, true);

                if (cancelled) return;

                Sound.setSubscriptionDuration(0.12);

                Sound.addRecordBackListener((e) => {
                    const db = typeof e.currentMetering === "number"
                        ? e.currentMetering
                        : -160;

                    setLevels((prev) => {
                        const next = prev.slice(1);
                        next.push(normalizeMetering(db));
                        return next;
                    });

                    
                    const nextRing = normalizeRingLevel(db);
                    setRingLevel((prevRing) => prevRing * 0.7 + nextRing * 0.3);
                });

                setIsMicOn(true);

                autoStopTimerRef.current = setTimeout(() => {
                    stopRecordingAndUpload().catch(console.error);
                }, AUTO_STOP_MS);
            } catch (err) {
                console.error("마이크 접근 실패", err);
                Alert.alert("안내", "마이크 권한을 허용해 주셔야 녹음할 수 있어요.");
                setRecordStage("closed");
            }
        };

        start();

        return () => {
            cancelled = true;
        };
    }, [recordStage, stopRecordingAndUpload]);

    React.useEffect(() => {
        if (recordStage === "recording" && isMicOn) {
            setMicLocked(true);
            const timer = setTimeout(() => setMicLocked(false), MIC_LOCK_MS);
            return () => clearTimeout(timer);
        }

        setMicLocked(false);
    }, [recordStage, isMicOn]);

    React.useEffect(() => {
        if (!showOutro) return;
        if (isUploading) return;
        if (lastUploadOk == null) return;

        const timer = setTimeout(() => {
            if (!lastUploadOk) {
                Alert.alert(
                    "업로드 실패",
                    "업로드에 실패했습니다.\n네트워크를 확인하고 다시 시도해 주세요."
                );
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
    }, [showOutro, isUploading, lastUploadOk, isLastQuestion]);

    React.useEffect(() => {
        if (stage !== "completed") return;

        const timer = setTimeout(() => {
            navigation.navigate("StudentHome");
        }, 3000);

        return () => clearTimeout(timer);
    }, [stage, navigation]);

    React.useEffect(() => {
        return () => {
            clearAutoStopTimer();
            stopWave();

            Sound.stopRecorder().catch(() => {});
        };
    }, [clearAutoStopTimer, stopWave]);

    return (
        <Screen style={styles.screen}>
            {stage === "asking" && (
                <>
                    <View style={[commonStyles.topbarMain, commonStyles.topbarRow]}>
                        <Pressable style={commonStyles.iconbtn} accessibilityLabel={t("common.menu")} >
                            <Image source={require("../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
                        </Pressable>

                        <View style={styles.headerCenter}>
                            <Text style={styles.topbarTitle} numberOfLines={1}>
                                {eventDayTitle || "기록"}
                            </Text>
                        </View>

                        <View style={styles.headerRightSpace} />
                    </View>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.wrap}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.questionPage}>
                            <Image source={require("../../../assets/images/internie_mascot_normal.png")} style={styles.mascot} resizeMode="contain" />
                            <View style={styles.progressCard}>
                                <View style={styles.progressBar}>
                                    <View style={[ styles.progressBarFill, { width: `${progressPct}%` }, ]} />
                                </View>

                                <View style={styles.progressLabelRow}>
                                    <Text style={styles.progressLabelText}>진행률</Text>
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
                                        {isLoadingQuestions
                                            ? "질문을 불러오는 중이에요…"
                                            : current?.text ?? ""}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {!isLoadingQuestions && recordStage === "closed" && !showOutro && (
                        <Pressable
                            style={styles.micButton}
                            onPress={() => {
                                setRecordStage("preparing");
                            }}
                            accessibilityLabel={t("questions.micStart", {
                                defaultValue: "녹음 시작",
                            })}
                        >
                            <Image source={require("../../../assets/icons/microphone-01.png")} style={styles.micIcon} />
                        </Pressable>
                    )}

                    {!isLoadingQuestions && recordStage !== "closed" && !showOutro && (
                        <View style={styles.recordingSheet}>
                            <View style={styles.recordingSheetInner}>
                                <View style={styles.recordingMeter}>
                                    <View style={styles.recordingWave}>
                                        {levels.map((lv, i) => (
                                            <View
                                                key={i}
                                                style={[
                                                    styles.waveBar,
                                                    { transform: [{ scaleY: lv }] },
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

                                <View style={styles.recordingMicRing}>
                                    <View
                                        style={[
                                            styles.recordingMicRingBg,
                                            recordStage === "recording" && isMicOn && !micLocked
                                                ? styles.recordingMicRingActive
                                                : styles.recordingMicRingDisabled,
                                            isMicOn ? { opacity: ringOpacity } : null,
                                        ]}
                                    />

                                    <Pressable
                                        style={[
                                            styles.recordingMicBtn,
                                            recordStage === "recording" && isMicOn && !micLocked
                                                ? styles.recordingMicBtnActive
                                                : styles.recordingMicBtnDisabled,
                                        ]}
                                        disabled={
                                            recordStage !== "recording" ||
                                            !isMicOn ||
                                            micLocked
                                        }
                                        onPress={() => {
                                            stopRecordingAndUpload().catch(console.error);
                                        }}
                                        accessibilityLabel={t("questions.micStop", {
                                            defaultValue: "녹음 종료",
                                        })}
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

            {showOutro && (
                <View style={styles.outroOverlay} pointerEvents="none">
                    <View style={styles.outroCard}>
                        <View style={styles.outroIcon}>
                            <Image
                                source={require("../../../assets/icons/check-02.png")}
                                style={styles.outroIconImg}
                            />
                        </View>
                        <Text style={styles.outroText}>기록완료!</Text>
                    </View>
                </View>
            )}

            {stage === "completed" && (
                <View style={styles.completedWrap}>
                    <View style={styles.completionContent}>
                        <LoadingDots />
                        <Text style={styles.completionTitle}>역량 분석 중</Text>
                        <Text style={styles.completionDesc}>
                            인터니가 답변을 분석 중이에요!{"\n"}
                            완료까지 약 5분 정도 소요될 수 있어요
                        </Text>
                        <View style={styles.completionMargin} />
                        <ActivityIndicator />
                    </View>
                </View>
            )}
        </Screen>
    );
}