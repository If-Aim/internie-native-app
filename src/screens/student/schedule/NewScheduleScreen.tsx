// src/screens/student/schedule/NewScheduleScreen.tsx
import { useTranslation } from "react-i18next";
import React from "react";
import { View, Text, Pressable, Image, TextInput, ScrollView, Modal, Alert, } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createEvent } from "../../../api/client";
import { styles } from "./Schedule.style";
import { commonStyles } from "../../../theme/common.Style";

import { TIME_OPTIONS, WEEK_LABELS, toApiHHmmss, displayTimeLabel, toYmd, stripTime, getTimeIndex, displayTimePillLabel, isSameDay, addMonths, getMonthGrid, } from "./scheduleUtils";
import type { RangeSheetMode, TimeSheetProps, DateRangeSheetProps, } from "./scheduleTypes";
import { SafeAreaView } from "react-native-safe-area-context";


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
                            <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} />
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
                                                <Text
                                                    style={[
                                                        styles.timeItemText,
                                                        selected
                                                            ? styles.timeItemSelectedText
                                                            : null,
                                                    ]}
                                                >
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
                                                disabled={isDisabled}
                                                style={[
                                                    styles.timeItem,
                                                    selected
                                                        ? styles.timeItemSelected
                                                        : null,
                                                    isDisabled
                                                        ? styles.timeItemDisabled
                                                        : null,
                                                ]}
                                                onPress={() => {
                                                    onChangeEnd(opt);
                                                    onClose();
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.timeItemText,
                                                        selected
                                                            ? styles.timeItemSelectedText
                                                            : null,
                                                    ]}
                                                >
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
    }, []);

    return (
        <Modal transparent visible animationType="fade" onRequestClose={onClose}>
            <Pressable style={[styles.sheetBackdrop, styles.sheetBackdropCal]} onPress={onClose} >
                <Pressable
                    style={[
                        styles.sheetCardDate,
                        weeks === 6 ? styles.sheetCardDate6w : styles.sheetCardDate5w,
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.dateRangeBody}>
                        <CalendarRange
                            mode={mode}
                            startDate={startDate}
                            endDate={endDate}
                            onChangeStart={onChangeStart}
                            onChangeEnd={onChangeEnd}
                            onDone={onClose}
                            onClose={onClose}
                            onWeeksChange={setWeeks}
                            resetKey={resetKey}
                        />
                    </View>

                    <Pressable style={styles.sheetConfirm} onPress={onClose}>
                        <Text style={styles.sheetConfirmText}>{t("common.confirm")}</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
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
    mode: "range" | "startOnly" | "endOnly";
    startDate: Date;
    endDate: Date;
    onChangeStart: (d: Date) => void;
    onChangeEnd: (d: Date) => void;
    onDone: () => void;
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
    }, [s]);

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
        return x >= s.getTime() && x <= e.getTime();
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
                    <Pressable style={styles.calCloseBtn} accessibilityLabel={t("common.close")} onPress={onClose} >
                        <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} />
                    </Pressable>
                </View>

                <View style={styles.calHeaderBottom}>
                    <Text style={styles.calTitle}>{title}</Text>

                    <View style={styles.calNav}>
                        <Pressable style={styles.calNavBtn} onPress={() => setCursor(addMonths(cursor, -1))} accessibilityLabel="prev month" > 
                            <Image
                                source={require("../../../assets/icons/Previous (Stroke).png")}
                                style={commonStyles.iconArrow}
                                resizeMode="contain"
                            />
                        </Pressable>

                        <Pressable style={styles.calNavBtn} onPress={() => setCursor(addMonths(cursor, 1))} accessibilityLabel="next month" >
                            <Image source={require("../../../assets/icons/Next (Stroke).png")} style={commonStyles.iconArrow} resizeMode="contain" />
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
                            <View
                                key={key}
                                style={[
                                    styles.calCell,
                                    between ? styles.calCellInRange : null,
                                    isStart ? styles.calCellStart : null,
                                    isEnd ? styles.calCellEnd : null,
                                ]}
                            >
                                {showRange && (
                                    <View
                                        style={[
                                            styles.calRange,
                                            sameDay ? styles.calRangeSingle : null,
                                            isStart && !isEnd ? styles.calRangeStart : null,
                                            isEnd && !isStart ? styles.calRangeEnd : null,
                                            isStart && isEnd ? styles.calRangeSingle : null,
                                        ]}
                                        pointerEvents="none"
                                    />
                                )}

                                <Pressable style={[ styles.calDay, isSelected ? styles.calDaySelected : null, styles.calDayFront, ]} onPress={() => handlePick(day)} >
                                    <Text  style={[ styles.calDayText, isSelected ? styles.calDaySelectedText : null, ]} >
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

export default function NewScheduleScreen(): React.ReactElement {
    const navigation = useNavigation();
    const { t, i18n } = useTranslation();
    const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

    const [showSheet, setShowSheet] = React.useState(false);
    const [timeStep, setTimeStep] = React.useState<"start" | "end">("start");

    const [isAllDay, setIsAllDay] = React.useState(false);

    const [title, setTitle] = React.useState("");
    const [memo, setMemo] = React.useState("");

    const [startDate, setStartDate] = React.useState<Date>(() => new Date());
    const [endDate, setEndDate] = React.useState<Date>(() => new Date());

    const [startTime, setStartTime] = React.useState<string | null>(null);
    const [endTime, setEndTime] = React.useState<string | null>(null);

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

    const startTimeLabel = startTime
        ? displayTimePillLabel(startTime)
        : "09:00 AM";
    const endTimeLabel = endTime
        ? displayTimePillLabel(endTime)
        : "10:00 AM";

    const openStartOnlyRangeSheet = () => {
        setRangeSheetMode("startOnly");
        setShowDateRangeSheet(true);
    };

    const openEndOnlyRangeSheet = () => {
        setRangeSheetMode("endOnly");
        setShowDateRangeSheet(true);
    };

    const handleStartDateChange = (newDate: Date) => {
        setStartDate(newDate);
        if (stripTime(newDate) > stripTime(endDate)) {
            setEndDate(newDate);
        }
    };

    const handleEndDateChange = (newDate: Date) => {
        if (stripTime(newDate) < stripTime(startDate)) {
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

        if (nd < sd) {
            setEndDate(startDate);
            return;
        }

        setEndDate(newDate);
    };

    const handleStartTimeChange = (newTime: string) => {
        setStartTime(newTime);

        const sameDay = startDate.getTime() === endDate.getTime();
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
        const sameDay = startDate.getTime() === endDate.getTime();

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

    const isTitleValid = title.trim().length > 0;

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert(
                t("common.notice", "알림"),
                t("schedule_new.alertAddTitle", "제목을 입력해 주세요")
            );
            return;
        }

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

        try {
            await createEvent(payload);
            navigation.goBack();
        } catch (err) {
            console.error("Error:", err);
            Alert.alert(
                t("common.error", "오류"),
                t("error.failAddSchedule", "일정 등록에 실패했어요")
            );
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.topbarMain}>
                <View style={commonStyles.icon24} />

                <Text style={styles.appTitle}>{t("schedule_new.title")}</Text>

                <Pressable style={styles.iconBtn} accessibilityLabel={t("common.close")} onPress={() => navigation.goBack()} >
                    <Image source={require("../../../assets/icons/x-01.png")} style={commonStyles.icon24} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.newEvent}
                keyboardShouldPersistTaps="handled"
            >
                <TextInput
                    style={styles.titleInput}
                    placeholder={t("schedule_new.titlePlaceholder")}
                    placeholderTextColor="#A2A2A2"
                    value={title}
                    onChangeText={setTitle}
                />

                <View style={styles.scheduleCardDatetime}>
                    <View style={styles.scheduleLineDate}>
                        <Image source={require("../../../assets/icons/schedule_clock.png")} style={styles.scheduleLineIcon} />
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
                                        } else {
                                            setIsAllDay(false);
                                            setStartTime(null);
                                            setEndTime(null);
                                        }
                                    }}
									accessibilityRole="switch"
                                    accessibilityState={{ checked: hasTime || isAllDay }}
                                >
                                    <View
                                        style={[
                                            styles.switchThumb,
                                            hasTime || isAllDay
                                                ? styles.switchThumbOn
                                                : null,
                                        ]}
                                    />
                                </Pressable>
                            </View>

                            {(hasTime || isAllDay) && !isAllDay && (
                                <View style={styles.scheduleLineTimePills}>
                                    <View style={styles.rowIconEmpty} />

                                    <View style={styles.timeInline}>
                                        <Pressable
                                            style={styles.timePill}
                                            onPress={() => {
                                                setTimeStep("start");
                                                setShowSheet(true);
                                            }}
                                        >
                                            <Text style={styles.timePillText}>
                                                {startTime ? startTimeLabel : "Start"}
                                            </Text>
                                        </Pressable>

                                        <Text style={styles.dateSep}>-</Text>

                                        <Pressable
                                            style={styles.timePill}
                                            onPress={() => {
                                                setTimeStep("end");
                                                setShowSheet(true);
                                            }}
                                        >
                                            <Text style={styles.timePillText}>
                                                {endTime ? endTimeLabel : "End"}
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
                        placeholder={t("schedule_new.memoPlaceholder")}
                        placeholderTextColor="#A2A2A2"
                        value={memo}
                        onChangeText={setMemo}
                        multiline
                    />
                </View>

                <View style={commonStyles.bottomSpacer} />
            </ScrollView>

            <View style={styles.footerFixed}>
                <Pressable
                    style={[
                        styles.btnPrimary,
                        !isTitleValid ? styles.btnDisabled : null,
                    ]}
                    onPress={handleSave}
                    disabled={!isTitleValid}
                >
                    <Text style={[styles.btnPrimaryText, !isTitleValid ? styles.btnDisabled : null,]}>{t("common.save")}</Text>
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
        </SafeAreaView>
    );
}