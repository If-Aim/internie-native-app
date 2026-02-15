// src/screens/student/schedule/NewScheduleScreen.tsx
import { useTranslation } from "react-i18next";
import React from "react";
import { View, Text, Pressable, Image, TextInput, ScrollView, Modal, Alert, NativeScrollEvent, NativeSyntheticEvent, } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api } from "../../../api/client";

import { styles } from "./Schedule.style";

type TimeWheelVariant = "sheet" | "calendar";
type RangeSheetMode = "range" | "startOnly" | "endOnly";

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const toApiHHmmss = (hhmm: string) => `${hhmm}:00`;
function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function displayTimeLabel(hhmm: string, locale: string) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, hh, mm, 0);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function displayTimeWheelLabel(hhmm: string, locale: string) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, hh, mm, 0);

  if (locale.startsWith("ko")) {
    return (
      new Intl.DateTimeFormat("ko-KR", { hour: "numeric", hour12: true })
        .formatToParts(d)
        .filter((p) => p.type === "hour")
        .map((p) => p.value)
        .join("")
        .trim() + "시"
    );
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .formatToParts(d)
    .filter((p) => p.type !== "dayPeriod")
    .map((p) => p.value)
    .join("")
    .trim();
}

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const getTimeIndex = (t: string | null) => (t ? TIME_OPTIONS.indexOf(t) : -1);

// 날짜 관련
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function clampToStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addMonths(d: Date, diff: number) {
  return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getMonthGrid(base: Date) {
  const year = base.getFullYear();
  const month = base.getMonth();

  const first = new Date(year, month, 1);
  const jsDay = first.getDay(); // Sun=0
  const offset = (jsDay + 6) % 7; // Monday-first
  const dim = daysInMonth(year, month);
  const totalCells = offset + dim;
  const rows = Math.ceil(totalCells / 7);
  const cellCount = rows * 7;

  const start = new Date(year, month, 1 - offset);
  const days = Array.from({ length: cellCount }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return { year, month, days };
}

// 달력 내 시간(오전/오후) 라벨
function getDayPeriodLabel(hhmm: string | null, locale: string) {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, hh, mm, 0);

  const parts = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);

  return parts.find((p) => p.type === "dayPeriod")?.value ?? "";
}

// ===== TimeWheel (RN) =====
function TimeWheel({
  value,
  onChange,
  variant = "sheet",
}: {
  value: string | null;
  onChange: (t: string | null) => void;
  variant?: TimeWheelVariant;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
  const selectedPeriod = value
    ? getDayPeriodLabel(value, locale)
    : locale.startsWith("ko")
      ? "오후"
      : "PM";

  // 웹의 scrollLeft 기반 opacity 그라데이션을 RN에서 근사
  const rowRef = React.useRef<ScrollView | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const [scrollX, setScrollX] = React.useState(0);
  const [opacities, setOpacities] = React.useState<number[]>(
    () => Array.from({ length: TIME_OPTIONS.length }, () => 1)
  );

  // 스타일에서 width=73, gap=5, paddingX=12를 기준으로 근사 계산
  const ITEM_W = 73;
  const GAP = 5;
  const PAD_L = 12;

  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

  const computeOpacities = React.useCallback((x: number) => {
    const startOffset = 40;
    const fadeWidth = 140;

    const next = TIME_OPTIONS.map((_, idx) => {
      const itemLeft = PAD_L + idx * (ITEM_W + GAP);
      const itemRight = itemLeft + ITEM_W;

      const distanceFromLeftEdge = itemRight - x;
      const raw = (distanceFromLeftEdge - startOffset) / fadeWidth;
      const t = clamp(raw, 0, 1);
      const eased = t * t * (3 - 2 * t);

      const minO = 0.12;
      const maxO = 1.0;
      return minO + (maxO - minO) * eased;
    });

    setOpacities(next);
  }, []);

  const onScroll = React.useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      setScrollX(x);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        computeOpacities(x);
        rafRef.current = null;
      });
    },
    [computeOpacities]
  );

  React.useEffect(() => {
    computeOpacities(scrollX);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [computeOpacities, scrollX]);

  return (
    <View style={styles.timewheel}>
      {variant === "calendar" && <Text style={styles.timewheelPeriod}>{selectedPeriod}</Text>}

      <ScrollView
        ref={rowRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.timewheelRow}
        accessibilityRole="adjustable"
        accessibilityLabel="set time"
      >
        {TIME_OPTIONS.map((opt, idx) => {
          const isSelected = opt === value;
          return (
            <Pressable
              key={opt}
              style={[
                styles.timewheelItem,
                isSelected ? styles.timewheelItemSelected : null,
                // opacity는 style prop으로 적용
                { opacity: isSelected ? 1 : opacities[idx] },
              ]}
              onPress={() => onChange(opt)}
            >
              <Text
                style={[
                  styles.timewheelItemText,
                  isSelected ? styles.timewheelItemSelectedText : null,
                ]}
              >
                {displayTimeWheelLabel(opt, locale)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ===== CalendarRange (RN) =====
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
  const s = clampToStartOfDay(startDate);
  const e = clampToStartOfDay(endDate);
  const sameDay = isSameDay(s, e);

  const [cursor, setCursor] = React.useState(() => new Date(s.getFullYear(), s.getMonth(), 1));
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
    const x = clampToStartOfDay(d).getTime();
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
        Alert.alert(t("common.error", "오류"), t("error.failSetEndDate", "마감일을 설정할 수 없어요"));
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
      return;
    }
  };

  return (
    <View style={styles.cal}>
      <View style={styles.calHeader}>
        <View style={styles.calHeaderTop}>
          <Pressable style={styles.calCloseBtn} onPress={onClose} accessibilityLabel={t("common.close", "닫기")}>
            <Image source={require("../../../assets/icons/x-01.png")} style={{ width: 24, height: 24 }} />
          </Pressable>
        </View>

        <View style={styles.calHeaderBottom}>
          <Text style={styles.calTitle}>{title}</Text>

          <View style={styles.calNav}>
            <Pressable
              style={styles.calNavBtn}
              onPress={() => setCursor(addMonths(cursor, -1))}
              accessibilityLabel="prev month"
            >
              <Image
                source={require("../../../assets/icons/Previous (Stroke).png")}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable
              style={styles.calNavBtn}
              onPress={() => setCursor(addMonths(cursor, 1))}
              accessibilityLabel="next month"
            >
              <Image
                source={require("../../../assets/icons/Next (Stroke).png")}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.calBody}>
        <View style={styles.calWeek}>
          {WEEK_LABELS.map((w) => (
            <Text key={w} style={styles.calWeekday}>{w}</Text>
          ))}
        </View>

        <View style={styles.calGrid}>
          {days.map((d) => {
            const inMonth = d.getMonth() === month;
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

            if (!inMonth) {
              return <View key={key} style={[styles.calCell, styles.calCellEmpty]} pointerEvents="none" />;
            }

            const day = clampToStartOfDay(d);
            const isStart = isSameDay(day, s);
            const isEnd = isSameDay(day, e);
            const between = !sameDay && inRange(day);
            const showRange = !sameDay && (between || isStart || isEnd);

            const isSelected = (sameDay && isSameDay(day, s)) || isStart || isEnd;

            return (
              <View
                key={key}
                style={[
                  styles.calCell,
                  // 웹의 className is-inrange/is-start/is-end를 정확히 분리해 쓰고 싶으면
                  // schedule.style.ts에 별도 스타일을 추가해서 여기서 조합하면 됩니다.
                ]}
              >
                {showRange && <View style={styles.calRange} pointerEvents="none" />}

                <Pressable
                  style={[
                    styles.calDay,
                    isSelected ? styles.calDaySelected : null,
                    styles.calDayFront,
                  ]}
                  onPress={() => handlePick(day)}
                >
                  <Text style={[styles.calDayText, isSelected ? styles.calDaySelectedText : null]}>
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

// ===== TimeSheet (RN) =====
type TimeSheetProps = {
  step: "start" | "end";
  setStep: React.Dispatch<React.SetStateAction<"start" | "end">>;

  startTime: string | null;
  endTime: string | null;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;

  isAllDay: boolean;
  setIsAllDay: React.Dispatch<React.SetStateAction<boolean>>;
  setStartTime: React.Dispatch<React.SetStateAction<string | null>>;
  setEndTime: React.Dispatch<React.SetStateAction<string | null>>;

  onClose: () => void;
};

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
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        {/* web의 sheet-card (작은 팝오버) 구조 유지: absolute 위치 스타일 사용 */}
        <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.timeList}>
            {step === "start" ? (
              <ScrollView>
                <Pressable
                  style={[styles.timeItem, isAllDay ? styles.timeItemSelected : null]}
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
                      isAllDay ? styles.timeItemSelectedText : null,
                    ]}
                  >
                    {t("common.allDay", "종일")}
                  </Text>
                </Pressable>

                {TIME_OPTIONS.map((opt) => {
                  const selected = opt === startTime && !isAllDay;
                  return (
                    <Pressable
                      key={opt}
                      style={[styles.timeItem, selected ? styles.timeItemSelected : null]}
                      onPress={() => {
                        setIsAllDay(false);
                        onChangeStart(opt);
                        setStep("end");
                      }}
                    >
                      <Text
                        style={[
                          styles.timeItemText,
                          selected ? styles.timeItemSelectedText : null,
                        ]}
                      >
                        {displayTimeLabel(opt, locale)} ~
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView>
                {TIME_OPTIONS.map((opt) => {
                  const startIdx = getTimeIndex(startTime);
                  const endIdx = getTimeIndex(opt);
                  const isDisabled = startTime ? endIdx <= startIdx : false;
                  const selected = opt === endTime;

                  return (
                    <Pressable
                      key={opt}
                      disabled={isDisabled}
                      style={[
                        styles.timeItem,
                        selected ? styles.timeItemSelected : null,
                        isDisabled ? styles.timeItemDisabled : null,
                      ]}
                      onPress={() => {
                        onChangeEnd(opt);
                        onClose();
                      }}
                    >
                      <Text
                        style={[
                          styles.timeItemText,
                          selected ? styles.timeItemSelectedText : null,
                        ]}
                      >
                        ~ {displayTimeLabel(opt, locale)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ===== DateRangeSheet (RN) =====
type DateRangeSheetProps = {
  mode: "range" | "startOnly" | "endOnly";

  startDate: Date;
  endDate: Date;
  onChangeStart: (d: Date) => void;
  onChangeEnd: (d: Date) => void;

  startTime: string | null;
  onChangeStartTime: (t: string | null) => void;

  onClose: () => void;
};

function DateRangeSheet({
  mode,
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  startTime,
  onChangeStartTime,
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
      <Pressable style={[styles.sheetBackdrop, styles.sheetBackdropCal]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetCardDate,
            weeks === 6 ? styles.sheetCardDate6w : styles.sheetCardDate5w,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* 웹 구조 유지: 내부에 CalendarRange + TimeWheel */}
          <View>
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

            <View style={{ paddingHorizontal: 20 }}>
              <TimeWheel value={startTime} onChange={onChangeStartTime} variant="calendar" />
            </View>
          </View>

          <Pressable style={styles.sheetConfirm} onPress={onClose}>
            <Text style={styles.sheetConfirmText}>{t("common.confirm", "확인")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ===== page =====
export default function NewSchedule(): React.ReactElement {
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

  const hasTime = startTime !== null && endTime !== null;

  const [showDateRangeSheet, setShowDateRangeSheet] = React.useState(false);
  const [rangeSheetMode, setRangeSheetMode] = React.useState<RangeSheetMode>("range");

  const isRangeSelected = startDate.getTime() !== endDate.getTime();

  const openStartOnlyRangeSheet = () => {
    setRangeSheetMode("startOnly");
    setShowDateRangeSheet(true);
  };
  const openEndOnlyRangeSheet = () => {
    setRangeSheetMode("endOnly");
    setShowDateRangeSheet(true);
  };
  const openFullRangeSheet = () => {
    setRangeSheetMode("range");
    setShowDateRangeSheet(true);
  };

  const formatFullDate = React.useCallback(
    (d: Date) =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(d),
    [locale]
  );

  function formatRangeDate(d: Date, localeStr: string) {
    if (localeStr.startsWith("ko")) {
      return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(d);
    }
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  }

  function getRangeSeparator(localeStr: string) {
    return localeStr.startsWith("ko") ? " ~ " : " - ";
  }

  const startDateLabel = formatFullDate(startDate);
  const endDateLabel = formatFullDate(endDate);
  const dateRangeLabel = `${formatRangeDate(startDate, locale)}${getRangeSeparator(locale)}${formatRangeDate(endDate, locale)}`;

  const handleStartDateChange = (newDate: Date) => {
    setStartDate(newDate);
    if (stripTime(newDate) > stripTime(endDate)) setEndDate(newDate);
  };

  const handleEndDateChange = (newDate: Date) => {
    if (stripTime(newDate) < stripTime(startDate)) {
      Alert.alert(t("common.error", "오류"), t("error.failSetEndDate", "마감일을 설정할 수 없어요"));
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
        Alert.alert(t("common.error", "오류"), t("error.failSetEndTime", "종료 시간을 설정할 수 없어요"));
        return;
      }
    }
    setEndTime(newTime);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.notice", "알림"), t("schedule_new.alertAddTitle", "제목을 입력해 주세요"));
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

    if (isAllDay) {
      payload.startTime = "00:00:00";
      payload.endTime = "23:59:59";
    } else if (startTime && endTime) {
      payload.startTime = toApiHHmmss(startTime);
      payload.endTime = toApiHHmmss(endTime);
    }

    try {
      await api(`/events`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // 웹: nav("/", { replace: true })
      // 앱: 프로젝트 목적지에 맞게 아래를 바꾸세요.
      navigation.goBack();
      // 예시) navigation.navigate("StudentHome" as never);
      // 예시) navigation.reset({ index: 0, routes: [{ name: "StudentHome" as never }] } as never);
    } catch (err) {
      console.error("Error:", err);
      Alert.alert(t("common.error", "오류"), t("error.failAddSchedule", "일정 등록에 실패했어요"));
    }
  };

  return (
    <View style={styles.screen}>
      {/* topbar (웹 구조 유지) */}
      <View style={[{ paddingTop: 40, paddingHorizontal: 20, paddingBottom: 23, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Pressable accessibilityLabel={t("common.menu", "메뉴")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../../../assets/icons/menu-01.png")} style={{ width: 24, height: 24 }} />
        </Pressable>

        <Text style={{ fontSize: 16, fontWeight: "800" }}>
          {t("schedule_new.title", "일정 작성")}
        </Text>

        <Pressable
          accessibilityLabel={t("common.close", "닫기")}
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Image source={require("../../../assets/icons/x-01.png")} style={{ width: 24, height: 24 }} />
        </Pressable>
      </View>

      {/* main */}
      <ScrollView contentContainerStyle={styles.newEvent} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder={t("schedule_new.titlePlaceholder", "제목을 입력해 주세요")}
          value={title}
          onChangeText={setTitle}
        />

        {/* 일정(시작일/시간) */}
        <View style={styles.row}>
          <View style={styles.rowCol}>
            <Pressable
              style={styles.rowHead}
              onPress={openStartOnlyRangeSheet}
              accessibilityLabel="set start date"
            >
              <Image source={require("../../../assets/icons/clock-01.png")} style={{ width: 24, height: 24 }} />
              <Text style={styles.rowToday}>
                <Text style={{ fontWeight: "700" }}>{startDateLabel}</Text>
              </Text>
            </Pressable>

            <Pressable
              style={styles.rowSubBtn}
              onPress={() => {
                setTimeStep("start");
                setShowSheet(true);
              }}
              accessibilityLabel={hasTime ? t("schedule_new.editTime", "시간 수정") : t("schedule_new.addTime", "시간 추가")}
            >
              <Text style={styles.rowSub}>
                {isAllDay
                  ? t("common.allDay", "종일")
                  : hasTime
                    ? `${displayTimeLabel(startTime!, locale)} ~ ${displayTimeLabel(endTime!, locale)}`
                    : t("schedule_new.addTime", "시간 추가")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.addBtnWrapper}>
            <Pressable
              style={styles.addDate}
              onPress={() => {
                setTimeStep("start");
                setShowSheet(true);
              }}
              accessibilityLabel={hasTime ? t("schedule_new.editTime", "시간 수정") : t("schedule_new.addTime", "시간 추가")}
            >
              <Image source={require("../../../assets/icons/plus-02.png")} style={{ width: 24, height: 24 }} />
            </Pressable>
          </View>
        </View>

        {/* 날짜(마감일/기간) */}
        <View style={[styles.row, { gap: 2 as any }]}>
          <View style={styles.rowCol}>
            <Pressable
              style={styles.rowHead}
              onPress={openEndOnlyRangeSheet}
              accessibilityLabel="set end date"
            >
              <Image source={require("../../../assets/icons/check-broken.png")} style={{ width: 24, height: 24 }} />
              <Text style={styles.rowToday}>
                <Text style={{ fontWeight: "700" }}>{endDateLabel}</Text>
              </Text>
            </Pressable>

            <Pressable
              style={styles.rowSubBtn}
              onPress={openFullRangeSheet}
              accessibilityLabel="set start-end date"
            >
              <Text style={styles.rowSub}>
                {isRangeSelected ? dateRangeLabel : t("schedule_new.dateRange", "기간 설정")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.addBtnWrapper}>
            <Pressable style={styles.addDate} onPress={openFullRangeSheet} accessibilityLabel="set start-end date">
              <Image source={require("../../../assets/icons/plus-02.png")} style={{ width: 24, height: 24 }} />
            </Pressable>
          </View>
        </View>

        {/* 메모 */}
        <View style={styles.memoBox}>
          <TextInput
            style={styles.memoInput}
            placeholder={t("schedule_new.memoPlaceholder", "메모를 입력해 주세요")}
            value={memo}
            onChangeText={setMemo}
            multiline
          />
        </View>

        {/* 하단 여백(footer 겹침 방지) */}
        <View style={{ height: 150 }} />
      </ScrollView>

      {/* footer */}
      <View style={styles.footerFixed}>
        <Pressable style={styles.btnPrimary} onPress={handleSave}>
          <Text style={styles.btnPrimaryText}>{t("common.save", "저장")}</Text>
        </Pressable>
      </View>

      {/* 시간 선택 팝오버 */}
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

      {/* 날짜 범위 시트 + 달력 + 달력내 TimeWheel */}
      {showDateRangeSheet && (
        <DateRangeSheet
          mode={rangeSheetMode}
          startDate={startDate}
          endDate={endDate}
          onChangeStart={handleStartDateChange}
          onChangeEnd={rangeSheetMode === "range" ? handleEndDateChangeForRange : handleEndDateChange}
          startTime={startTime}
          onChangeStartTime={(tt) => {
            if (tt) handleStartTimeChange(tt);
            else setStartTime(null);
          }}
          onClose={() => setShowDateRangeSheet(false)}
        />
      )}
    </View>
  );
}
