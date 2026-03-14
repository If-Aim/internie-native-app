// src/screens/student/schedule/DetailScheduleScreen.tsx
import React from "react";
import { View, Text, ScrollView, Pressable, Image, useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent, } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError, getEventDayDetail, getEventDayQuestions, type Transcription, } from "../../../api/client";
import { styles } from "./Schedule.style";
import { commonStyles } from "../../../theme/common.Style";

type DetailScheduleRouteParams = { eventDayId: string };
type DetailScheduleRoute = RouteProp<
    { DetailSchedule: DetailScheduleRouteParams },
    "DetailSchedule"
>;

type SlideItem = {
    idx: number;
    question: string;
    answerText: string;
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function formatRecordedAt(date: string) {
    const [y, m, d] = date.split("-").map(Number);
    return `${y}.${pad2(m)}.${pad2(d)}`;
}

function applyExperienceName(q: string, title: string) {
    if (!q.includes("(@experience_name)")) return q;
    return q.replaceAll("(@experience_name)", title);
}

export default function DetailScheduleScreen(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const route = useRoute<DetailScheduleRoute>();
    const eventDayId = route.params?.eventDayId;

    const { width } = useWindowDimensions();

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const [title, setTitle] = React.useState<string>(
        t("schedule_detail.titleFallback", "새로운 이벤트")
    );
    const [recordedAtText, setRecordedAtText] = React.useState<string>(
        "2000.00.00"
    );
    const [slides, setSlides] = React.useState<SlideItem[]>([]);
    const [page, setPage] = React.useState(0);

    function Header({
        onCloseClick,
    }: {
        onCloseClick: () => void;
    }) {
        return (
            <View style={[commonStyles.topbarMain, commonStyles.topbarRow]}>
                <View style={commonStyles.icon24} />

                <Text numberOfLines={1} style={styles.detailTopbarTitle}>{title}</Text>

                <Pressable style={commonStyles.iconbtn} onPress={onCloseClick}>
                    <Image
                        source={require("../../../assets/icons/x-01.png")}
                        style={commonStyles.icon24}
                    />
                </Pressable>
            </View>
        );
    }
    
    React.useEffect(() => {
        (async () => {
            try {
                if (!eventDayId) throw new Error("missing eventDayId");

                setLoading(true);
                setError(null);

                const [qRes, dRes] = await Promise.all([
                    getEventDayQuestions(String(eventDayId)),
                    getEventDayDetail(String(eventDayId)),
                ]);

                setTitle(
                    dRes.title || t("schedule_detail.titleFallback", "새로운 이벤트")
                );
                setRecordedAtText(formatRecordedAt(dRes.date));

                const questions = (qRes.questionList ?? []).slice(0, 4);
                const trans: Transcription[] = Array.isArray(dRes.transcriptions)
                    ? dRes.transcriptions
                    : [];

                const merged: SlideItem[] = questions.map((q, i) => ({
                    idx: i + 1,
                    question: applyExperienceName(q, dRes.title),
                    answerText: (trans[i]?.text ?? "").trim(),
                }));

                setSlides(merged);
                setPage(0);
            } catch (e: any) {
                if (e instanceof ApiError) {
                    setError(`HTTP ${e.status}`);
                } else {
                    setError(e?.message ?? "error");
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [eventDayId, t]);

    const hasAnyAnswer = React.useMemo(
        () => slides.some((s) => s.answerText.length > 0),
        [slides]
    );

    const close = () => navigation.goBack();

    const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = e.nativeEvent.contentOffset.x;
        const step = Math.max(1, width - 40);
        const next = Math.round(x / step);
        const max = Math.max(0, slides.length - 1);
        setPage(Math.min(max, Math.max(0, next)));
    };

    return (
        <SafeAreaView style={commonStyles.appRoot}>
            <Header onCloseClick={() => navigation.goBack()} />
                <View style={styles.detailBody}>
                <View
                    style={[
                        styles.detailDots,
                        !loading && !error && hasAnyAnswer
                            ? null
                            : styles.detailDotsPlaceholder,
                    ]}
                >
                    {!loading &&
                        !error &&
                        hasAnyAnswer &&
                        slides.map((_, i) => (
                            <View
                                key={i}
                                style={[styles.dot, i === page ? styles.dotActive : null]}
                            />
                        ))}
                </View>

                {loading && (
                    <View style={styles.detailSingleWrap}>
                        <View style={styles.detailCard}>
                            <View style={styles.detailCenter}>
                                <Text style={styles.muted}>
                                    {t("common.loading", "Loading...")}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {!loading && error && (
                    <View style={styles.detailSingleWrap}>
                        <View style={styles.detailCard}>
                            <View style={styles.detailCenter}>
                                <Text style={styles.muted}>
                                    {t("common.error", "오류가 발생했어요")}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {!loading && !error && !hasAnyAnswer && (
                    <View style={styles.detailSingleWrap}>
                        <View style={styles.detailCard}>
                            <View style={styles.detailCenter}>
                                <Text style={styles.detailEmpty}>
                                    {t("schedule_detail.empty", "기록이 없어요")}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {!loading && !error && hasAnyAnswer && (
                    <ScrollView
                        style={{paddingBottom: 10,}}
                        horizontal
                        pagingEnabled={false}
                        decelerationRate={0.999}
                        snapToInterval={width}
                        snapToAlignment="start"
                        disableIntervalMomentum={true}
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={onScrollEnd}
                    >
                        {slides.map((s) => (
                            <View
                                key={s.idx}
                                style={[styles.detailPage, { width }]}
                            >
                                <View style={[styles.detailCard, {width: width - 40}]}>
                                    <View style={styles.qaWrap}>
                                        <View>
                                            <Text style={styles.qaQText}>{s.question}</Text>
                                        </View>

                                        <View>
                                            <Text style={styles.qaAText}>
                                                {s.answerText.length > 0
                                                    ? s.answerText
                                                    : t("schedule_detail.noAnswer", "답변이 없어요")}
                                            </Text>
                                        </View>

                                        <View style={styles.detailFooter}>
                                            <Text style={styles.detailRecordedAt}>
                                                {i18n.language.startsWith("ko")
                                                    ? `${recordedAtText} 기록됨`
                                                    : `${recordedAtText} recorded`}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}