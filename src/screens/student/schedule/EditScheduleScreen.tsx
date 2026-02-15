// src/screens/student/schedule/EditScheduleScreen.tsx
import { useTranslation } from "react-i18next";
import React from "react";
import { View, Text, Pressable, Image, TextInput, ScrollView, Modal, Alert, NativeScrollEvent, NativeSyntheticEvent,} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { api, ApiError, deleteEvent, deleteEventDay } from "../../../api/client";
import { styles } from "./Schedule.style";
import { commonStyles } from "../../../theme/common.Style";

type Stage = "form" | "outro";
type TimeWheelVariant = "sheet" | "calendar";
type RangeSheetMode = "range" | "startOnly" | "endOnly";

type EditState =
  | {
      event?: {
        id: string | number;
        title: string;
        content?: string;
        startDate: string; // 'YYYY-MM-DD'
        endDate: string; // 'YYYY-MM-DD'
        startTime?: string; // 'HH:mm:ss'
        endTime?: string; // 'HH:mm:ss'
        eventDayId?: string | number | null;
        transcriptionCount?: number;
      };
    }
  | null;

type EventDay = {
  eventDayId: number;
  eventId: string | number;
  date: string; // YYYY-MM-DD
  completed: boolean;
  transcriptions?: Array<any>;
};
type EventDayMonthResponse = {
  totalCount: number;
  eventDayList: EventDay[];
};

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const toApiHHmmss = (hhmm: string) => `${hhmm}:00`;

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

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const getTimeIndex = (t: string | null) => (t ? TIME_OPTIONS.indexOf(t) : -1);

// 날짜 관련
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
const clampToStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

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

// 녹음 존재 시 기간 수정 block(원본 유지)
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
  const selectedPeriod =
    value ? getDayPeriodLabel(value, locale) : locale.startsWith("ko") ? "오후" : "PM";

  const rafRef = React.useRef<number | null>(null);
  const [scrollX, setScrollX] = React.useState(0);
  const [opacities, setOpacities] = React.useState<number[]>(
    () => Array.from({ length: TIME_OPTIONS.length }, () => 1)
  );

  // style 기준 근사
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
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.timewheelRow}
      >
        {TIME_OPTIONS.map((opt, idx) => {
          const isSelected = opt === value;
          return (
            <Pressable
              key={opt}
              style={[
                styles.timewheelItem,
                isSelected ? styles.timewheelItemSelected : null,
                { opacity: isSelected ? 1 : opacities[idx] },
              ]}
              onPress={() => onChange(opt)}
            >
              <Text style={[styles.timewheelItemText, isSelected ? styles.timewheelItemSelectedText : null]}>
                {displayTimeWheelLabel(opt, locale)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
                  <Text style={[styles.timeItemText, isAllDay ? styles.timeItemSelectedText : null]}>
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
                      <Text style={[styles.timeItemText, selected ? styles.timeItemSelectedText : null]}>
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
                      <Text style={[styles.timeItemText, selected ? styles.timeItemSelectedText : null]}>
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
            <Pressable style={styles.calNavBtn} onPress={() => setCursor(addMonths(cursor, -1))} accessibilityLabel="prev month">
              <Image
                source={require("../../../assets/icons/Previous (Stroke).png")}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable style={styles.calNavBtn} onPress={() => setCursor(addMonths(cursor, 1))} accessibilityLabel="next month">
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

            if (!inMonth) return <View key={key} style={[styles.calCell, styles.calCellEmpty]} pointerEvents="none" />;

            const day = clampToStartOfDay(d);
            const isStart = isSameDay(day, s);
            const isEnd = isSameDay(day, e);
            const between = !sameDay && inRange(day);
            const showRange = !sameDay && (between || isStart || isEnd);

            const isSelected = (sameDay && isSameDay(day, s)) || isStart || isEnd;

            return (
              <View key={key} style={styles.calCell}>
                {showRange && <View style={styles.calRange} pointerEvents="none" />}

                <Pressable
                  style={[styles.calDay, isSelected ? styles.calDaySelected : null, styles.calDayFront]}
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

// ===== DateRangeSheet (RN) =====
type DateRangeSheetProps = {
  mode: RangeSheetMode;

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
  }, [mode]);

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
          <View>
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
type RouteParams = {
  eventId?: string | number;
  event?: EditState extends { event?: infer E } ? E : any;
  // 또는: state?: EditState; 형태로 설계했으면 그에 맞춰 수정
};

export default function EditSchedule(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

  const navigation = useNavigation();
  const route = useRoute<any>();

  // 웹: useParams + useLocation.state
  // RN: route.params로 받는 방식
  const eventId = route.params?.eventId;
  const passed = route.params?.event ?? (route.params?.state as EditState)?.event ?? null;

  const [stage, setStage] = React.useState<Stage>("form");

  const [showSheet, setShowSheet] = React.useState(false);
  const [timeStep, setTimeStep] = React.useState<"start" | "end">("start");

  const initialAllDay = passed?.startTime === "00:00:00" && passed?.endTime === "23:59:59";
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
    passed?.startTime ? passed.startTime.slice(0, 5) : null
  );
  const [endTime, setEndTime] = React.useState<string | null>(() =>
    passed?.endTime ? passed.endTime.slice(0, 5) : null
  );
  const hasTime = startTime !== null && endTime !== null;

  const [showDateRangeSheet, setShowDateRangeSheet] = React.useState(false);
  const [rangeSheetMode, setRangeSheetMode] = React.useState<RangeSheetMode>("range");

  const [title, setTitle] = React.useState<string>(() => passed?.title ?? "");
  const [memo, setMemo] = React.useState<string>(() => passed?.content ?? "");

  const [firstRecordedDate, setFirstRecordedDate] = React.useState<Date | null>(null);
  const [lastRecordedDate, setLastRecordedDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (!passed) {
      Alert.alert(t("common.error", "오류"), t("error.cannotLoadSchedule", "일정을 불러올 수 없어요"), [
        {
          text: t("common.confirm", "확인"),
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  }, [passed, navigation, t]);

  // 녹음(기록) 존재 여부 기반 기간 수정 제한 조회(원본 로직 유지)
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
          const c = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
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
  const isRangeSelected = stripTime(startDate).getTime() !== stripTime(endDate).getTime();

  const handleStartDateChange = (newDate: Date) => {
    const nd = stripTime(newDate);
    if (firstRecordedDate && nd > stripTime(firstRecordedDate)) {
      Alert.alert(t("common.notice", "알림"), "첫 녹음이 있는 날짜 이후로는 시작일을 변경할 수 없습니다.");
      return;
    }
    setStartDate(newDate);
    if (stripTime(newDate) > stripTime(endDate)) setEndDate(newDate);
  };

  const handleEndDateChange = (newDate: Date) => {
    const nd = stripTime(newDate);

    if (lastRecordedDate && nd < stripTime(lastRecordedDate)) {
      Alert.alert(t("common.notice", "알림"), "기록이 있는 날짜 이전으로는 마감일을 변경할 수 없습니다.");
      return;
    }

    if (nd < stripTime(startDate)) {
      Alert.alert(t("common.error", "오류"), t("error.failSetEndDate", "마감일을 설정할 수 없어요"));
      return;
    }

    setEndDate(newDate);
  };

  const handleEndDateChangeForRange = (newDate: Date) => {
    const nd = stripTime(newDate);
    const sd = stripTime(startDate);

    if (lastRecordedDate && nd < stripTime(lastRecordedDate)) {
      Alert.alert(t("common.notice", "알림"), "녹음이 있는 날짜 이전으로는 종료일을 변경할 수 없습니다.");
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

    const isSame = stripTime(startDate).getTime() === stripTime(endDate).getTime();
    if (!isSame) return;

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
    const isSame = stripTime(startDate).getTime() === stripTime(endDate).getTime();
    if (isSame && startTime) {
      if (getTimeIndex(newTime) < getTimeIndex(startTime)) {
        Alert.alert(t("common.error", "오류"), t("error.failSetEndTime", "종료 시간을 설정할 수 없어요"));
        return;
      }
    }
    setEndTime(newTime);
  };

  const handleSave = async () => {
    if (!eventId) {
      Alert.alert(t("common.error", "오류"), t("error.invalidAccessMissingEventId", "잘못된 접근입니다."));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t("common.notice", "알림"), t("schedule_edit.alertAddTitle", "제목을 입력해 주세요"));
      return;
    }
    if (firstRecordedDate && stripTime(startDate) > stripTime(firstRecordedDate)) {
      Alert.alert(t("common.notice", "알림"), "첫 녹음이 있는 날짜 이후로는 시작일을 변경할 수 없습니다.");
      return;
    }
    if (lastRecordedDate && stripTime(endDate) < stripTime(lastRecordedDate)) {
      Alert.alert(t("common.notice", "알림"), "녹음이 있는 날짜 이전으로는 종료일을 변경할 수 없습니다.");
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

      if (isAllDay) {
        payload.startTime = "00:00:00";
        payload.endTime = "23:59:59";
      } else if (startTime && endTime) {
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

      // 웹: nav("/", { replace:true, state:{ refetch:true, updatedEvent } })
      // RN: 프로젝트 구조에 맞게 아래 둘 중 하나를 선택
      // 1) 그냥 뒤로 + 상위 화면에서 focus 시 refetch
      // 2) params로 전달
      // 여기서는 뒤로 이동하면서 params 전달 형태로 예시를 둡니다.
      setTimeout(() => {
        navigation.goBack();
        // 예) 상위 화면이 params로 갱신 처리한다면:
        // navigation.navigate("SomeList" as never, { refetch: true, updatedEvent: finalEventForUI } as never);
      }, 300);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : t("error.unknown", "알 수 없는 오류");
      Alert.alert(t("common.error", "오류"), t("error.unknown", "알 수 없는 오류"));
    }
  };

  const handleDelete = async () => {
    if (!eventId) {
      Alert.alert(t("common.error", "오류"), t("error.invalidAccessMissingEventId", "잘못된 접근입니다."));
      return;
    }

    const transcriptionCount = passed?.transcriptionCount ?? 0;
    if (transcriptionCount > 0) {
      Alert.alert(t("common.notice", "알림"), t("schedule_edit.cannotDeleteWithRecording", "녹음이 있으면 삭제할 수 없어요"));
      return;
    }

    Alert.alert(
      t("common.confirm", "확인"),
      t("schedule_edit.confirmDelete", "삭제하시겠습니까?"),
      [
        { text: t("common.cancel", "취소"), style: "cancel" },
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

              // 웹: nav("/", { state:{ refetch:true, deletedEventId } })
              navigation.goBack();
            } catch (err: any) {
              if (err instanceof ApiError) {
                if (err.status === 500 || err.status === 409) {
                  Alert.alert(t("common.notice", "알림"), t("schedule_edit.cannotDeleteHasRecord", "기록이 있으면 삭제할 수 없어요"));
                  return;
                }
                if (err.status === 401) {
                  Alert.alert(t("common.notice", "알림"), t("schedule_edit.noPermissionDelete", "삭제 권한이 없어요"));
                  return;
                }
                if (err.status === 403) {
                  Alert.alert(t("common.notice", "알림"), t("error.authRequired", "로그인이 필요해요"));
                  return;
                }
                if (err.status === 404) {
                  Alert.alert(t("common.notice", "알림"), t("error.notFound", "대상을 찾을 수 없어요"));
                  return;
                }

                Alert.alert(
                  t("common.error", "오류"),
                  t("error.unknown", "알 수 없는 오류")
                );
                return;
              }

              const msg = err instanceof Error ? err.message : t("error.unknown", "알 수 없는 오류");
              Alert.alert(t("common.error", "오류"), t("schedule_edit.deleteFailedWithMessage", "삭제 실패"));
            }
          },
        },
      ]
    );
  };


  return (
    <View style={styles.screen}>
      {/* topbar */}
      <View style={[{ paddingTop: 40, paddingHorizontal: 20, paddingBottom: 23, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Pressable accessibilityLabel={t("common.menu", "메뉴")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../../../assets/icons/menu-01.png")} style={{ width: 24, height: 24 }} />
        </Pressable>

        <Text style={styles.topbarTitle}>{t("schedule_edit.title", "일정 수정")}</Text>

        <Pressable
          accessibilityLabel={t("common.close", "닫기")}
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Image source={require("../../../assets/icons/x-01.png")} style={{ width: 24, height: 24 }} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.newEvent} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder={t("schedule_edit.titlePlaceholder", "제목을 입력해 주세요")}
          value={title}
          onChangeText={setTitle}
        />

        {/* 시작일 + 시간 */}
        <View style={styles.row}>
          <View style={styles.rowCol}>
            <Pressable style={styles.rowHead} onPress={openStartOnlyRangeSheet}>
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
            >
              <Image source={require("../../../assets/icons/plus-02.png")} style={{ width: 24, height: 24 }} />
            </Pressable>
          </View>
        </View>

        {/* 마감일 + 범위 */}
        <View style={[styles.row, { gap: 2 as any }]}>
          <View style={styles.rowCol}>
            <Pressable style={styles.rowHead} onPress={openEndOnlyRangeSheet}>
              <Image source={require("../../../assets/icons/check-broken.png")} style={{ width: 24, height: 24 }} />
              <Text style={styles.rowToday}>
                <Text style={{ fontWeight: "700" }}>{endDateLabel}</Text>
              </Text>
            </Pressable>

            <Pressable style={styles.rowSubBtn} onPress={openFullRangeSheet}>
              <Text style={styles.rowSub}>
                {isRangeSelected ? dateRangeLabel : t("schedule_edit.dateRange", "기간 설정")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.addBtnWrapper}>
            <Pressable style={styles.addDate} onPress={openFullRangeSheet}>
              <Image source={require("../../../assets/icons/plus-02.png")} style={{ width: 24, height: 24 }} />
            </Pressable>
          </View>
        </View>

        {/* 메모 */}
        <View style={styles.memoBox}>
          <TextInput
            style={styles.memoInput}
            placeholder={t("schedule_edit.memoPlaceholder", "메모를 입력해 주세요")}
            value={memo}
            onChangeText={setMemo}
            multiline
          />
        </View>
        <View style={commonStyles.bottomSpacer} />
      </ScrollView>

      {/* footer */}
      <View style={styles.footerFixed}>
        <Pressable style={styles.btnDelete} onPress={handleDelete}>
          <Text style={styles.btnDeleteText}>{t("schedule_edit.delete", "삭제")}</Text>
        </Pressable>

        <Pressable style={styles.btnPrimary} onPress={handleSave}>
          <Text style={styles.btnPrimaryText}>{t("schedule_edit.save", "저장")}</Text>
        </Pressable>
      </View>

      {/* 시간 시트 */}
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

      {/* 날짜 범위 시트 */}
      {showDateRangeSheet && (
        <DateRangeSheet
          mode={rangeSheetMode}
          startDate={startDate}
          endDate={endDate}
          onChangeStart={handleStartDateChange}
          onChangeEnd={rangeSheetMode === "range" ? handleEndDateChangeForRange : handleEndDateChange}
          startTime={startTime}
          onChangeStartTime={(tt) => {
            if (tt) {
              setIsAllDay(false);
              handleStartTimeChange(tt);
            } else {
              setStartTime(null);
            }
          }}
          onClose={() => setShowDateRangeSheet(false)}
        />
      )}
    </View>
  );
}
