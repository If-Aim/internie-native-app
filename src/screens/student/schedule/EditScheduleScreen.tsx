// src/screens/student/schedule/EditScheduleScreen.tsx
import { useTranslation } from "react-i18next";
import React from "react";
import { View, Text, Pressable, Image, TextInput, ScrollView, Modal, Alert, } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { api, ApiError, deleteEvent, deleteEventDay } from "../../../api/client";
import { styles } from "./Schedule.style";
import { commonStyles } from "../../../theme/common.Style";

import { TIME_OPTIONS, WEEK_LABELS, toApiHHmmss, displayTimeLabel, toYmd, stripTime, getTimeIndex, displayTimePillLabel, isSameDay, addMonths, getMonthGrid, } from "./scheduleUtils";
import type { RangeSheetMode, TimeSheetProps, DateRangeSheetProps, } from "./scheduleTypes";

type Stage = "form" | "outro";

type EditState =
    | {
          event?: {
              id: string | number;
              title: string;
              content?: string;
              startDate: string;
              endDate: string;
              startTime?: string;
              endTime?: string;
              eventDayId?: string | number | null;
              transcriptionCount?: number;
          };
      }
    | null;

type EventDay = {
    eventDayId: number;
    eventId: string | number;
    date: string;
    completed: boolean;
    transcriptions?: Array<any>;
};

type EventDayMonthResponse = {
    totalCount: number;
    eventDayList: EventDay[];
};

function ymdToDate(ymd: string): Date {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function ymFromDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(start: Date, end: Date) {
    const out: string[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cur <= last) {
        out.push(ymFromDate(cur));
        cur.setMonth(cur.getMonth() + 1);
    }

    return out;
}

function TimeSheet({
    step,
    setStep,
    startTime,
    endTime,
    onChangeStart,
    onChangeEnd,
    onClose,
    isAllDay,
    setIsAllDay,
    setStartTime,
    setEndTime,
}: TimeSheetProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

    return (
        <Modal transparent visible animationType="fade" onRequestClose={onClose}>
            <View style={styles.sheetOverlay}>
                <Pressable style={styles.sheetBackdrop} onPress={onClose} />

                <View style={styles.sheetCard}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{t("common.time")}</Text>

                        <Pressable style={styles.sheetCloseBtn} accessibilityLabel={t("common.close")} onPress={onClose} >
                            <Image source={require("../../../assets/icons/x-01.png")} style={{ width: 24, height: 24 }} />
                        </Pressable>
                    </View>

                    <View style={styles.sheetCols}>
                        {step === "start" ? (
                            <View style={styles.sheetCol}>
                                <ScrollView
                                    style={styles.timeList}
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                >
                                    <Pressable
                                        style={[
                                            styles.timeItem,
                                            isAllDay ? styles.timeItemSelected : null,
                                        ]}
                                        onPress={() => {
                                            setIsAllDay(true);
                                            setStartTime(null);
                                            setEndTime(null);
                                            setStep("start");
                                            onClose();
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.timeItemText,
                                                isAllDay
                                                    ? styles.timeItemSelectedText
                                                    : null,
                                            ]}
                                        >
                                            {t("common.allDay")}
                                        </Text>
                                    </Pressable>

                                    {TIME_OPTIONS.map((opt) => {
                                        const selected = opt === startTime;

                                        return (
                                            <Pressable
                                                key={opt}
                                                style={[
                                                    styles.timeItem,
                                                    selected
                                                        ? styles.timeItemSelected
                                                        : null,
                                                ]}
                                                onPress={() => {
                                                    setIsAllDay(false);
                                                    onChangeStart(opt);
                                                    setStep("end");
                                                }}
                                            >
                                                <Text style={[ styles.timeItemText, selected ? styles.timeItemSelectedText : null, ]} >
                                                    {displayTimeLabel(opt, locale)} -
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        ) : (
                            <View style={styles.sheetCol}>
                                <ScrollView
                                    style={styles.timeList}
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                >
                                    {TIME_OPTIONS.map((opt) => {
                                        const startIdx = getTimeIndex(startTime);
                                        const endIdx = getTimeIndex(opt);
                                        const isDisabled = startTime
                                            ? endIdx <= startIdx
                                            : false;
                                        const selected = opt === endTime;

                                        return (
                                            <Pressable
                                                key={opt}
                                                style={[
                                                    styles.timeItem,
                                                    selected ? styles.timeItemSelected : null,
                                                    isDisabled ? styles.timeItemDisabled : null,
                                                ]}
                                                onPress={() => {
                                                    if (isDisabled) return;
                                                    onChangeEnd(opt);
                                                    onClose();
                                                }}
                                            >
                                                <Text style={[ styles.timeItemText, selected ? styles.timeItemSelectedText : null, ]} >
                                                    - {displayTimeLabel(opt, locale)}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}


function CalendarRange({
    mode,
    startDate,
    endDate,
    onChangeStart,
    onChangeEnd,
    onClose,
    onWeeksChange,
    resetKey,
}: {
    mode: RangeSheetMode;
    startDate: Date;
    endDate: Date;
    onChangeStart: (d: Date) => void;
    onChangeEnd: (d: Date) => void;
    onClose: () => void;
    onWeeksChange?: (weeks: 5 | 6) => void;
    resetKey: number;
}) {
    const { t } = useTranslation();
    const s = stripTime(startDate);
    const e = stripTime(endDate);
    const sameDay = isSameDay(s, e);

    const [cursor, setCursor] = React.useState(
        () => new Date(s.getFullYear(), s.getMonth(), 1)
    );
    const [focus, setFocus] = React.useState<"start" | "end">("start");

    React.useEffect(() => {
        setFocus("start");
    }, [resetKey]);

    React.useEffect(() => {
        setCursor(new Date(s.getFullYear(), s.getMonth(), 1));
    }, [s.getFullYear(), s.getMonth()]);

    React.useEffect(() => {
        if (mode === "range") setFocus("start");
        if (mode === "startOnly") setFocus("start");
        if (mode === "endOnly") setFocus("end");
    }, [mode]);

    const { month, days } = getMonthGrid(cursor);
    const weeks = (days.length === 42 ? 6 : 5) as 5 | 6;

    React.useEffect(() => {
        onWeeksChange?.(weeks);
    }, [weeks, onWeeksChange]);

    const monthLabel = cursor.toLocaleString("en-US", { month: "long" });
    const title = `${monthLabel} ${cursor.getFullYear()}`;

    const inRange = (d: Date) => {
        const x = stripTime(d).getTime();
        return x > s.getTime() && x < e.getTime();
    };

    const handlePick = (picked: Date) => {
        if (mode === "startOnly") {
            onChangeStart(picked);
            return;
        }

        if (mode === "endOnly") {
            const pTime = picked.getTime();
            const sTime = s.getTime();

            if (pTime < sTime) {
                onChangeStart(picked);
                onChangeEnd(picked);
                return;
            }

            onChangeEnd(picked);
            return;
        }

        if (mode === "range") {
            if (focus === "start") {
                onChangeStart(picked);
                onChangeEnd(picked);
                setFocus("end");
                return;
            }

            if (picked.getTime() < s.getTime()) {
                onChangeStart(picked);
                onChangeEnd(s);
                setFocus("end");
                return;
            }

            onChangeEnd(picked);
            setFocus("start");
        }
    };

    return (
        <View style={styles.cal}>
            <View style={styles.calHeader}>
                <View style={styles.calHeaderTop}>
                    <Pressable style={styles.calCloseBtn} onPress={onClose} accessibilityLabel={t("common.close", "닫기")} >
                        <Image source={require("../../../assets/icons/x-01.png")} style={{ width: 24, height: 24 }} />
                    </Pressable>
                </View>

                <View style={styles.calHeaderBottom}>
                    <Text style={styles.calTitle}>{title}</Text>

                    <View style={styles.calNav}>
                        <Pressable style={styles.calNavBtn} onPress={() => setCursor(addMonths(cursor, -1))} accessibilityLabel="prev month" >
                            <Image source={require("../../../assets/icons/Previous (Stroke).png")} style={{ width: 8, height: 14 }} resizeMode="contain" />
                        </Pressable>

                        <Pressable style={styles.calNavBtn} onPress={() => setCursor(addMonths(cursor, 1))} accessibilityLabel="next month" > 
                            <Image source={require("../../../assets/icons/Next (Stroke).png")} style={{ width: 8, height: 14 }} resizeMode="contain" />
                        </Pressable>
                    </View>
                </View>
            </View>

            <View style={styles.calBody}>
                <View style={styles.calWeek}>
                    {WEEK_LABELS.map((w) => (
                        <Text key={w} style={styles.calWeekday}>
                            {w}
                        </Text>
                    ))}
                </View>

                <View style={styles.calGrid}>
                    {days.map((d) => {
                        const inMonth = d.getMonth() === month;
                        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

                        if (!inMonth) {
                            return (
                                <View key={key} style={[styles.calCell, styles.calCellEmpty]} pointerEvents="none" />
                            );
                        }

                        const day = stripTime(d);
                        const isStart = isSameDay(day, s);
                        const isEnd = isSameDay(day, e);
                        const between = !sameDay && inRange(day);
                        const showRange = !sameDay && (between || isStart || isEnd);
                        const isSelected =
                            (sameDay && isSameDay(day, s)) || isStart || isEnd;

                        return (
                            <View key={key} style={[ styles.calCell, between ? styles.calCellInRange : null, isStart ? styles.calCellStart : null, isEnd ? styles.calCellEnd : null, ]} >
                                {showRange && <View style={[ styles.calRange, isStart && !isEnd ? styles.calRangeStart : null, isEnd && !isStart ? styles.calRangeEnd : null, ]} pointerEvents="none" />}
                                <Pressable style={[ styles.calDay, isSelected ? styles.calDaySelected : null, styles.calDayFront, ]} onPress={() => handlePick(day)} >
                                    <Text style={[ styles.calDayText, isSelected ? styles.calDaySelectedText : null, ]} >
                                        {day.getDate()}
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

function DateRangeSheet({
    mode,
    startDate,
    endDate,
    onChangeStart,
    onChangeEnd,
    onClose,
}: DateRangeSheetProps) {
    const { t } = useTranslation();
    const [weeks, setWeeks] = React.useState<5 | 6>(5);
    const [resetKey, setResetKey] = React.useState(0);

    React.useEffect(() => {
        setResetKey((k) => k + 1);
    }, [mode]);

    return (
        <Modal transparent visible animationType="fade" onRequestClose={onClose}>
            <View style={styles.sheetOverlay}>
                <Pressable style={[styles.sheetBackdrop, styles.sheetBackdropCal]} onPress={onClose} />
                <View style={[ styles.sheetCardDate, weeks === 6 ? styles.sheetCardDate6w : styles.sheetCardDate5w, ]} >
                    <View style={styles.dateRangeBody}>
                        <CalendarRange
                            mode={mode}
                            startDate={startDate}
                            endDate={endDate}
                            onChangeStart={onChangeStart}
                            onChangeEnd={onChangeEnd}
                            onClose={onClose}
                            onWeeksChange={setWeeks}
                            resetKey={resetKey}
                        />
                    </View>

                    <Pressable style={styles.sheetConfirm} onPress={onClose}>
                        <Text style={styles.sheetConfirmText}>
                            {t("common.confirm", "확인")}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

function formatRangeDate(d: Date, locale: string) {
    if (locale.startsWith("ko")) {
        return new Intl.DateTimeFormat("ko-KR", {
            month: "long",
            day: "numeric",
        }).format(d);
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    }).format(d);
}

export default function EditScheduleScreen(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

    const navigation = useNavigation();
    const route = useRoute<any>();

    const eventId = route.params?.eventId;
    const passed = route.params?.event ?? (route.params?.state as EditState)?.event ?? null;

    const [stage, setStage] = React.useState<Stage>("form");

    const [showSheet, setShowSheet] = React.useState(false);
    const [timeStep, setTimeStep] = React.useState<"start" | "end">("start");

    const initialAllDay =
        passed?.startTime === "00:00:00" && passed?.endTime === "23:59:59";
    const [isAllDay, setIsAllDay] = React.useState<boolean>(!!initialAllDay);

    const [startDate, setStartDate] = React.useState<Date>(() =>
        passed?.startDate ? ymdToDate(passed.startDate) : new Date()
    );
    const [endDate, setEndDate] = React.useState<Date>(() =>
        passed?.endDate ? ymdToDate(passed.endDate) : new Date()
    );

    React.useEffect(() => {
        if (!passed?.startDate || !passed?.endDate) return;
        setStartDate(ymdToDate(passed.startDate));
        setEndDate(ymdToDate(passed.endDate));
    }, [passed?.startDate, passed?.endDate]);

    const [startTime, setStartTime] = React.useState<string | null>(() =>
        initialAllDay ? null : passed?.startTime ? passed.startTime.slice(0, 5) : null
    );

    const [endTime, setEndTime] = React.useState<string | null>(() =>
        initialAllDay ? null : passed?.endTime ? passed.endTime.slice(0, 5) : null
    );

    const isSingleDay =
        stripTime(startDate).getTime() === stripTime(endDate).getTime();

    const prevTimeRef = React.useRef<{
        isAllDay: boolean;
        startTime: string | null;
        endTime: string | null;
    } | null>(null);

    React.useEffect(() => {
        if (!isSingleDay) {
            if (prevTimeRef.current === null) {
                prevTimeRef.current = { isAllDay, startTime, endTime };
            }

            setIsAllDay(true);
            setStartTime(null);
            setEndTime(null);
            setShowSheet(false);
            return;
        }

        setShowSheet(false);

        if (prevTimeRef.current) {
            const prev = prevTimeRef.current;
            prevTimeRef.current = null;

            setIsAllDay(prev.isAllDay);
            setStartTime(prev.startTime);
            setEndTime(prev.endTime);
        } else {
            const nextHasTime = startTime !== null && endTime !== null;
            if (!nextHasTime) {
                setIsAllDay(false);
            }
        }
    }, [isSingleDay]);

    const hasTime = startTime !== null && endTime !== null;

    const [showDateRangeSheet, setShowDateRangeSheet] = React.useState(false);
    const [rangeSheetMode, setRangeSheetMode] =
        React.useState<RangeSheetMode>("range");

    const [title, setTitle] = React.useState<string>(() => passed?.title ?? "");
    const [memo, setMemo] = React.useState<string>(() => passed?.content ?? "");

    const [firstRecordedDate, setFirstRecordedDate] = React.useState<Date | null>(
        null
    );
    const [lastRecordedDate, setLastRecordedDate] = React.useState<Date | null>(
        null
    );

    React.useEffect(() => {
        if (!passed) {
            Alert.alert(
                t("common.error", "오류"),
                t("error.cannotLoadSchedule", "일정을 불러올 수 없어요"),
                [
                    {
                        text: t("common.confirm", "확인"),
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        }
    }, [passed, navigation, t]);

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!eventId || !passed?.startDate || !passed?.endDate) return;

            try {
                const baseStart = ymdToDate(passed.startDate);
                const baseEnd = ymdToDate(passed.endDate);
                const months = monthRange(baseStart, baseEnd);

                const lists = await Promise.all(
                    months.map((ym) => {
                        const [y, m] = ym.split("-");
                        return api<EventDayMonthResponse>(`/event-days/${y}/${m}`);
                    })
                );

                if (cancelled) return;

                const all = lists.flatMap((r) => r.eventDayList ?? []);
                const my = all.filter((ed) => String(ed.eventId) === String(eventId));

                const recorded = my.filter((ed) => {
                    const c = Array.isArray(ed.transcriptions)
                        ? ed.transcriptions.length
                        : 0;
                    return ed.completed === true || c > 0;
                });

                if (recorded.length === 0) {
                    setFirstRecordedDate(null);
                    setLastRecordedDate(null);
                    return;
                }

                let min = recorded[0].date;
                let max = recorded[0].date;

                for (const ed of recorded) {
                    if (ed.date < min) min = ed.date;
                    if (ed.date > max) max = ed.date;
                }

                setFirstRecordedDate(ymdToDate(min));
                setLastRecordedDate(ymdToDate(max));
            } catch {
                setFirstRecordedDate(null);
                setLastRecordedDate(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [eventId, passed?.startDate, passed?.endDate]);

    const openStartOnlyRangeSheet = () => {
        setRangeSheetMode("startOnly");
        setShowDateRangeSheet(true);
    };

    const openEndOnlyRangeSheet = () => {
        setRangeSheetMode("endOnly");
        setShowDateRangeSheet(true);
    };

    const handleStartDateChange = (newDate: Date) => {
        const nd = stripTime(newDate);

        if (firstRecordedDate && nd > stripTime(firstRecordedDate)) {
            Alert.alert(
                t("common.notice", "알림"),
                t(
                    "schedule_edit.startDateLockedAfterFirstRecording",
                    "첫 녹음이 있는 날짜 이후로는 시작일을 변경할 수 없습니다."
                )
            );
            return;
        }

        setStartDate(newDate);

        if (stripTime(newDate) > stripTime(endDate)) {
            setEndDate(newDate);
        }
    };

    const handleEndDateChange = (newDate: Date) => {
        const nd = stripTime(newDate);

        if (lastRecordedDate && nd < stripTime(lastRecordedDate)) {
            Alert.alert(
                t("common.notice", "알림"),
                t(
                    "schedule_edit.endDateLockedBeforeRecording",
                    "녹음이 있는 날짜 이전으로는 종료일을 변경할 수 없습니다."
                )
            );
            return;
        }

        if (nd < stripTime(startDate)) {
            Alert.alert(
                t("common.error", "오류"),
                t("error.failSetEndDate", "마감일을 설정할 수 없어요")
            );
            return;
        }

        setEndDate(newDate);
    };

    const handleEndDateChangeForRange = (newDate: Date) => {
        const nd = stripTime(newDate);
        const sd = stripTime(startDate);

        if (lastRecordedDate && nd < stripTime(lastRecordedDate)) {
            Alert.alert(
                t("common.notice", "알림"),
                t(
                    "schedule_edit.endDateLockedBeforeRecording",
                    "녹음이 있는 날짜 이전으로는 종료일을 변경할 수 없습니다."
                )
            );
            setEndDate(lastRecordedDate);
            return;
        }

        if (nd < sd) {
            setEndDate(startDate);
            return;
        }

        setEndDate(newDate);
    };

    const handleStartTimeChange = (newTime: string) => {
        setStartTime(newTime);

        const sameDay = stripTime(startDate).getTime() === stripTime(endDate).getTime();
        if (!sameDay) return;

        const startIdx = getTimeIndex(newTime);

        if (!endTime) {
            const nextIdx = Math.min(startIdx + 1, TIME_OPTIONS.length - 1);
            setEndTime(TIME_OPTIONS[nextIdx]);
            return;
        }

        if (getTimeIndex(endTime) < startIdx) {
            const nextIdx = Math.min(startIdx + 1, TIME_OPTIONS.length - 1);
            setEndTime(TIME_OPTIONS[nextIdx]);
        }
    };

    const handleEndTimeChange = (newTime: string) => {
        const sameDay = stripTime(startDate).getTime() === stripTime(endDate).getTime();

        if (sameDay && startTime) {
            if (getTimeIndex(newTime) < getTimeIndex(startTime)) {
                Alert.alert(
                    t("common.error", "오류"),
                    t("error.failSetEndTime", "종료 시간을 설정할 수 없어요")
                );
                return;
            }
        }

        setEndTime(newTime);
    };

    const handleSave = async () => {
        if (!eventId) {
            Alert.alert(
                t("common.error", "오류"),
                t("error.invalidAccessMissingEventId", "잘못된 접근입니다.")
            );
            return;
        }

        if (!title.trim()) {
            Alert.alert(
                t("common.notice", "알림"),
                t("schedule_edit.alertAddTitle", "제목을 입력해 주세요")
            );
            return;
        }

        if (firstRecordedDate && stripTime(startDate) > stripTime(firstRecordedDate)) {
            Alert.alert(
                t("common.notice", "알림"),
                t(
                    "schedule_edit.startDateLockedAfterFirstRecording",
                    "첫 녹음이 있는 날짜 이후로는 시작일을 변경할 수 없습니다."
                )
            );
            return;
        }

        if (lastRecordedDate && stripTime(endDate) < stripTime(lastRecordedDate)) {
            Alert.alert(
                t("common.notice", "알림"),
                t(
                    "schedule_edit.endDateLockedBeforeRecording",
                    "녹음이 있는 날짜 이전으로는 종료일을 변경할 수 없습니다."
                )
            );
            return;
        }

        try {
            const payload: {
                title: string;
                content: string;
                startDate: string;
                endDate: string;
                startTime?: string;
                endTime?: string;
            } = {
                title,
                content: memo,
                startDate: toYmd(startDate),
                endDate: toYmd(endDate),
            };

            const sendAllDay =
                !isSingleDay ||
                isAllDay ||
                startTime === null ||
                endTime === null;

            if (sendAllDay) {
                payload.startTime = "00:00:00";
                payload.endTime = "23:59:59";
            } else {
                payload.startTime = toApiHHmmss(startTime);
                payload.endTime = toApiHHmmss(endTime);
            }

            const updatedEventFromServer = await api<any>(`/events/${eventId}`, {
                method: "PATCH",
                body: JSON.stringify(payload),
            });

            const finalEventForUI = {
                ...updatedEventFromServer,
                id: updatedEventFromServer.id ?? eventId,
                startTime: updatedEventFromServer.startTime ?? payload.startTime ?? null,
                endTime: updatedEventFromServer.endTime ?? payload.endTime ?? null,
            };

            setStage("outro");
            navigation.goBack();

        } catch (err: any) {
            const msg = err instanceof Error ? err.message : t("error.unknown", "알 수 없는 오류");
            Alert.alert(
                t("common.error", "오류"),
                t("schedule_edit.editeFailedWithMessage", { message: msg, defaultValue: "수정에 실패했어요" })
            );
        }
    };

    const handleDelete = async () => {
        if (!eventId) {
            Alert.alert(
                t("common.error", "오류"),
                t("error.invalidAccessMissingEventId", "잘못된 접근입니다.")
            );
            return;
        }

        const transcriptionCount = passed?.transcriptionCount ?? 0;
        if (transcriptionCount > 0) {
            Alert.alert(
                t("common.notice", "알림"),
                t("schedule_edit.cannotDeleteWithRecording", "녹음이 있으면 삭제할 수 없어요")
            );
            return;
        }

        Alert.alert(
            t("common.confirm", "확인"),
            t("schedule_edit.confirmDelete", "삭제하시겠습니까?"),
            [
                {
                    text: t("common.cancel", "취소"),
                    style: "cancel",
                },
                {
                    text: t("common.delete", "삭제"),
                    style: "destructive",
                    onPress: async () => {
                        const eventDayId = passed?.eventDayId ?? null;

                        try {
                            if (eventDayId != null) {
                                await deleteEventDay(eventDayId);
                            }
                            await deleteEvent(eventId);
                            navigation.goBack();
                        } catch (err: any) {
                            if (err instanceof ApiError) {
                                if (err.status === 500 || err.status === 409) {
                                    Alert.alert(
                                        t("common.notice", "알림"),
                                        t("schedule_edit.cannotDeleteHasRecord", "기록이 있으면 삭제할 수 없어요")
                                    );
                                    return;
                                }

                                if (err.status === 401) {
                                    Alert.alert(
                                        t("common.notice", "알림"),
                                        t("schedule_edit.noPermissionDelete", "삭제 권한이 없어요")
                                    );
                                    return;
                                }

                                if (err.status === 403) {
                                    Alert.alert(
                                        t("common.notice", "알림"),
                                        t("error.authRequired", "로그인이 필요해요")
                                    );
                                    return;
                                }

                                if (err.status === 404) {
                                    Alert.alert(
                                        t("common.notice", "알림"),
                                        t("error.notFound", "대상을 찾을 수 없어요")
                                    );
                                    return;
                                }

                                Alert.alert(
                                    t("common.error", "오류"),
                                    t("error.unknown", "알 수 없는 오류")
                                );
                                return;
                            }

                            const msg =
                                err instanceof Error
                                    ? err.message
                                    : t("error.unknown", "알 수 없는 오류");

                            Alert.alert(
                                t("common.error", "오류"),
                                t("schedule_edit.deleteFailedWithMessage", {
                                    message: msg,
                                    defaultValue: "삭제에 실패했어요",
                                })
                            );
                        }
                    },
                },
            ]
        );
    };

    if (stage === "outro") {
        return <View style={styles.screen} />;
    }

    return (
        <View style={styles.screen}>
            <View style={styles.topbarMain}>
                <View style={commonStyles.icon24} />

                <Text style={styles.topbarTitle}>{t("schedule_edit.title")}</Text>

                <Pressable style={styles.iconBtn} accessibilityLabel={t("common.close")} onPress={() => navigation.goBack()} >
                    <Image source={require("../../../assets/icons/x-01.png")} style={{ width: 24, height: 24 }} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.newEvent} keyboardShouldPersistTaps="handled" >
                <TextInput
                    style={styles.titleInput}
                    placeholder={t("schedule_edit.titlePlaceholder")}
                    value={title}
                    onChangeText={setTitle}
                />

                <View style={styles.scheduleCardDatetime}>
                    <View style={styles.scheduleLineDate}>
                        <Image source={require("../../../assets/icons/clock-01.png")} style={styles.scheduleLineIcon} />
                        <View style={styles.dateInline}>
                            <Pressable style={styles.datePill} onPress={openStartOnlyRangeSheet} accessibilityLabel="set start date" >
                                <Text style={styles.datePillText}>
                                    {formatRangeDate(startDate, locale)}
                                </Text>
                            </Pressable>

                            <Text style={styles.dateSep}>-</Text>

                            <Pressable style={styles.datePill} onPress={openEndOnlyRangeSheet} accessibilityLabel="set end date" >
                                <Text style={styles.datePillText}>
                                    {formatRangeDate(endDate, locale)}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {isSingleDay && (
                        <>
                            <View style={styles.scheduleLineTime}>
                                <Image source={require("../../../assets/icons/schedule_stopwatch.png")} style={styles.scheduleLineIconTime} />
                                <View style={styles.rowToggleLeft}>
                                    <Text style={styles.rowToggleLeftText}>
                                        {t("schedule_new.addTime")}
                                    </Text>
                                </View>

                                <Pressable
                                    style={[
                                        styles.switch,
                                        hasTime || isAllDay ? styles.switchOn : null,
                                    ]}
                                    onPress={() => {
                                        const on = !(hasTime || isAllDay);

                                        if (on) {
                                            setIsAllDay(false);

                                            if (!startTime) setStartTime("09:00");
                                            if (!endTime) setEndTime("10:00");

                                            requestAnimationFrame(() => {
                                                setTimeStep("start");
                                                setShowSheet(true);
                                            });
                                        } else {
                                            setIsAllDay(false);
                                            setStartTime(null);
                                            setEndTime(null);
                                        }
                                    }}
                                    accessibilityRole="switch"
                                    accessibilityState={{ checked: hasTime || isAllDay }}
                                >
                                    <View style={[ styles.switchThumb, hasTime || isAllDay ? styles.switchThumbOn : null, ]} />
                                </Pressable>
                            </View>

                            {(hasTime || isAllDay) && !isAllDay && (
                                <View style={styles.scheduleLineTimePills}>
                                    <View style={styles.rowIconEmpty} />

                                    <View style={styles.timeInline}>
                                        <Pressable style={styles.timePill} onPress={() => { setTimeStep("start"); setShowSheet(true); }} >
                                            <Text style={styles.timePillText}>
                                                {hasTime ? displayTimePillLabel(startTime!) : "09:00 AM"}
                                            </Text>
                                        </Pressable>

                                        <Text style={styles.dateSep}>-</Text>

                                        <Pressable style={styles.timePill} onPress={() => { setTimeStep("end"); setShowSheet(true); }} >
                                            <Text style={styles.timePillText}>
                                                {hasTime ? displayTimePillLabel(endTime!) : "10:00 AM"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.memoBox}>
                    <TextInput
                        style={styles.memoInput}
                        placeholder={t("schedule_edit.memoPlaceholder")}
                        value={memo}
                        onChangeText={setMemo}
                        multiline
                    />
                </View>

                <View style={commonStyles.bottomSpacer} />
            </ScrollView>

            <View style={styles.footerFixed}>
                <Pressable style={styles.btnDelete} onPress={handleDelete}>
                    <Text style={styles.btnDeleteText}>{t("schedule_edit.delete")}</Text>
                </Pressable>

                <Pressable style={styles.btnPrimary} onPress={handleSave}>
                    <Text style={styles.btnPrimaryText}>{t("schedule_edit.save")}</Text>
                </Pressable>
            </View>

            {showSheet && (
                <TimeSheet
                    step={timeStep}
                    setStep={setTimeStep}
                    startTime={startTime}
                    endTime={endTime}
                    onChangeStart={handleStartTimeChange}
                    onChangeEnd={handleEndTimeChange}
                    isAllDay={isAllDay}
                    setIsAllDay={setIsAllDay}
                    setStartTime={setStartTime}
                    setEndTime={setEndTime}
                    onClose={() => setShowSheet(false)}
                />
            )}

            {showDateRangeSheet && (
                <DateRangeSheet
                    mode={rangeSheetMode}
                    startDate={startDate}
                    endDate={endDate}
                    onChangeStart={handleStartDateChange}
                    onChangeEnd={
                        rangeSheetMode === "range"
                            ? handleEndDateChangeForRange
                            : handleEndDateChange
                    }
                    onClose={() => setShowDateRangeSheet(false)}
                />
            )}
        </View>
    );
}