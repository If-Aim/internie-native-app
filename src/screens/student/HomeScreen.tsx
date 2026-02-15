// src/screens/student/HomeScreen.tsx
import React from "react";
import { StyleSheet, View, Text, Pressable, Image, Modal, ActivityIndicator, FlatList, } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, getUserMe } from "../../api/client";
import { getAccessToken } from "../../auth/tokenStorage";
import type { StudentStackParamList } from "../../navigation/StudentNavigator";

import { styles } from "./Home.style";
import { commonStyles, tokens } from "../../theme/common.Style";

type Props = NativeStackScreenProps<StudentStackParamList, "StudentHome">;

type TimeRange = {
  startTime?: string | null;
  endTime?: string | null;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

type ScheduleItem = {
  instanceId: string;
  eventId: string;
  title: string;
  subtitle: string;
  date: string;
  eventDayId?: string | number | null;
  isLocked?: boolean;
  transcriptionCount?: number;
} & TimeRange &
  DateRange;

type RawEvent = {
  id: string | number;
  title: string;
  content?: string;
} & TimeRange &
  DateRange;

type Transcription = {
  id: number;
  text: string;
  audioUrl?: string;
};

type EventDay = {
  eventDayId: number;
  title: string;
  eventId: string | number;
  date: string; // YYYY-MM-DD
  memo?: string | null;
  completed: boolean;
  transcriptions?: Transcription[];
} & TimeRange;

type EventDayMonthResponse = {
  totalCount: number;
  eventDayList: EventDay[];
};

type SortOrder = "past" | "latest";

const TOTAL_QUESTIONS = 4;

/* 날짜 유틸 */
function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function expandEventToDailyItems(e: RawEvent, ym: string): ScheduleItem[] {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);

  const start = ymdToDate(e.startDate);
  const end = ymdToDate(e.endDate);

  const s = start > monthStart ? start : monthStart;
  const ed = end < monthEnd ? end : monthEnd;

  if (s > ed) return [];

  const eventId = String(e.id);
  const out: ScheduleItem[] = [];
  for (let cur = s; cur <= ed; cur = addDays(cur, 1)) {
    const date = toYmd(cur);
    out.push({
      instanceId: `${eventId}_${date}`,
      eventId,
      title: e.title,
      subtitle: e.content ?? "",
      date,
      startDate: e.startDate,
      endDate: e.endDate,
      startTime: e.startTime ?? null,
      endTime: e.endTime ?? null,
      eventDayId: null,
    });
  }
  return out;
}

function ymLabel(ym: string, lang: string) {
  const [y, m] = ym.split("-").map(Number);
  if (lang.startsWith("ko")) return `${y}.${String(m).padStart(2, "0")}.`;
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d);
}
function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}


/* 시간 유틸 */
function hhmm(t?: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}
function isAllDayTime(startTime?: string | null, endTime?: string | null): boolean {
  if (!startTime || !endTime) return false;
  const s = startTime.slice(0, 5);
  const e = endTime.slice(0, 5);
  return s === "00:00" && (e === "24:00" || e === "23:59");
}
function timeRangeText(
  startTime?: string | null,
  endTime?: string | null,
  t?: (key: string, opts?: any) => string
): string {
  if (!startTime || !endTime) return "";
  if (isAllDayTime(startTime, endTime)) return t ? t("common.allDay") : "All day";
  return `${hhmm(startTime)}–${hhmm(endTime)}`;
}

function dateLabel(
  iso: string,
  lang: string,
  t: (k: string, opts?: any) => string
): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();

  const same =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const dayNum = d.getDate();

  const locale = lang.startsWith("ko") ? "ko-KR" : "en-US";
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: lang.startsWith("ko") ? "long" : "short",
  }).format(d);

  return same
    ? t("home.date.today", { day: dayNum })
    : t("home.date.weekday", { day: dayNum, weekday });
}

function hasRecord(ed: EventDay): boolean {
  const count = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
  return count > 0 || ed.completed === true;
}
function getWeekdayIndex(iso: string): number {
  const d = new Date(`${iso}T00:00:00`);
  const js = d.getDay(); // 0 Sun .. 6 Sat
  return (js + 6) % 7; // 0=Mon ... 6=Sun
}
function weekdayLabels(lang: string): string[] {
  if (lang.startsWith("ko")) return ["월", "화", "수", "목", "금", "토", "일"];
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

function MonthHeader({
  valueYm,
  onOpen,
  lang,
}: {
  valueYm: string;
  onOpen: () => void;
  lang: string;
}) {
  const { t } = useTranslation();

  const label = React.useMemo(() => {
    const [yy, mm] = valueYm.split("-").map(Number);
    const d = new Date(yy, mm - 1, 1);
    if (lang.startsWith("ko")) return `${mm}월`;
    return new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
  }, [valueYm, lang]);

  return (
    <View style={styles.monthRow}>
      <View style={styles.monthLeft}>
        <Text style={styles.h1}>{label}</Text>
        <Pressable style={styles.monthBtn} onPress={onOpen} accessibilityLabel={t("calendar.selectMonth")}>
          <Image source={require("../../assets/icons/chevron-right.png")} style={[commonStyles.icon24, styles.chevronRotate]} />
        </Pressable>
      </View>
    </View>
  );
}

function MonthFilterSheet({
  open,
  valueYm,
  sortOrder,
  onClose,
  onApply,
}: {
  open: boolean;
  valueYm: string;
  sortOrder: "past" | "latest";
  onClose: () => void;
  onApply: (nextYm: string, nextSort: "past" | "latest") => void;
}) {
  const { t, i18n } = useTranslation();
  const [tmpYm, setTmpYm] = React.useState(valueYm);
  const [tmpSort, setTmpSort] = React.useState(sortOrder);

  React.useEffect(() => {
    if (open) {
      setTmpYm(valueYm);
      setTmpSort(sortOrder);
    }
  }, [open, valueYm, sortOrder]);

  if (!open) return null;

  return (
    <View style={commonStyles.periodSheetBackdrop}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <View style={commonStyles.periodSheet}>
        <View style={commonStyles.periodSheetHeader}>
          <Text style={commonStyles.periodSheetTitle}>{t("filter.title")}</Text>
          <Pressable onPress={onClose}>
            <Text style={{ fontSize: 24 }}>×</Text>
          </Pressable>
        </View>

        <View style={commonStyles.periodSheetBody}>
          <View style={commonStyles.periodSheetSection}>
            <Text style={commonStyles.periodSheetLabel}>{t("filter.period")}</Text>

            <View style={styles.monthInputRow}>
              <Pressable style={styles.monthNavBtn} onPress={() => setTmpYm(prevMonth(tmpYm))}>
                <Text style={styles.monthNavText}>‹</Text>
              </Pressable>

              <Text style={styles.monthInputText}>{ymLabel(tmpYm, i18n.language)}</Text>

              <Pressable style={styles.monthNavBtn} onPress={() => setTmpYm(nextMonth(tmpYm))}>
                <Text style={styles.monthNavText}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={commonStyles.periodSheetSection}>
            <Text style={commonStyles.periodSheetLabel}>{t("filter.sort")}</Text>
            <View style={commonStyles.sortRow}>
              <Pressable
                style={[commonStyles.sortBtn, tmpSort === "past" ? commonStyles.sortBtnActive : null]}
                onPress={() => setTmpSort("past")}
              >
                <Text style={[commonStyles.sortBtnText, tmpSort === "past" ? commonStyles.sortBtnActiveText : null]}>
                  {t("filter.sortPast")}
                </Text>
              </Pressable>

              <Pressable
                style={[commonStyles.sortBtn, tmpSort === "latest" ? commonStyles.sortBtnActive : null]}
                onPress={() => setTmpSort("latest")}
              >
                <Text style={[commonStyles.sortBtnText, tmpSort === "latest" ? commonStyles.sortBtnActiveText : null]}>
                  {t("filter.sortLatest")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable style={commonStyles.monthpickerConfirm} onPress={() => onApply(tmpYm, tmpSort)}>
          <Text style={commonStyles.monthpickerConfirmText}>{t("filter.apply")}</Text>
        </Pressable>
      </View>
    </View>
  );
}


// HEADER
function Header({
  onMenuClick,
  onAddClick,
}: {
  onMenuClick: () => void;
  onAddClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={[commonStyles.topbarMain, styles.topbarRow]}>
      <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel={t("common.menu")}>
        <Image source={require("../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
      </Pressable>

      <Text style={styles.appTitle}>internie</Text>

      <Pressable style={commonStyles.iconbtn} onPress={onAddClick} accessibilityLabel={t("common.add")}>
        <Image source={require("../../assets/icons/plus-01.png")} style={commonStyles.icon24} />
      </Pressable>
    </View>
  );
}

// SIDE MENU
function SideMenu({
  open,
  onClose,
  userName,
  userProfileImg,
  userRole,
  onMyPage,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  userProfileImg: string | null;
  userRole: string | null;
  onMyPage: () => void;
}) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <View style={commonStyles.drawerBackdrop}>
      <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: tokens.colors.overlay45 }]} onPress={onClose} />
      <View style={commonStyles.drawerPanel}>
        <View style={commonStyles.drawerHeader}>
          <View style={commonStyles.profileWrap}>
            <Image
              source={userProfileImg ? { uri: userProfileImg } : require("../../assets/images/internie_mascot_normal.png")}
              style={commonStyles.profileImg}
            />
            <View>
              <Text style={commonStyles.profileName}>{userName}</Text>
            </View>
          </View>
        </View>

        <View style={commonStyles.drawerBody}>
          <Pressable style={commonStyles.drawerMenuItem} onPress={() => { onMyPage(); onClose(); }}>
            <Image source={require("../../assets/icons/user-profile-02.png")} style={commonStyles.icon24} />
            <Text style={commonStyles.drawerMenuItemText}>{t("menu.mypage")}</Text>
          </Pressable>

          {userRole === "ROLE_ADMIN" ? (
            <Pressable style={commonStyles.drawerMenuItem} onPress={() => { /* admin navigate */ }}>
              <Image source={require("../../assets/icons/chevron-right.png")} style={commonStyles.icon24} />
              <Text style={commonStyles.drawerMenuItemText}>사용자조회</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}


export default function HomeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [isAuthed, setIsAuthed] = React.useState(false);

  const [month, setMonth] = React.useState<string>(currentMonth);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("latest");

  const [loading, setLoading] = React.useState(false);

  const [items, setItems] = React.useState<ScheduleItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<ScheduleItem | null>(null);

  const [eventDaysByEventId, setEventDaysByEventId] = React.useState<Map<string, EventDay[]>>(new Map());

  // UI state
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);

  // 유저 정보 (간단히)
  const [userName, setUserName] = React.useState("User");
  const [userProfileImg, setUserProfileImg] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  const byDate = React.useMemo(() => {
    const g: Record<string, ScheduleItem[]> = {};
    for (const it of items) (g[it.date] ??= []).push(it);

    const entries = Object.entries(g);
    entries.sort((a, b) => {
      if (sortOrder === "latest") return a[0] < b[0] ? 1 : -1;
      return a[0] < b[0] ? -1 : 1;
    });
    return entries as Array<[string, ScheduleItem[]]>;
  }, [items, sortOrder]);

  const hasItems = byDate.length > 0;
  const isSelectedLocked = !!selectedItem?.isLocked;
  const canRecord = !!selectedItem && !isSelectedLocked;

  React.useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken(); 
        setIsAuthed(!!token);
      } catch {
        setIsAuthed(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!isAuthed) {
        setUserName("User");
        setUserProfileImg(null);
        setUserRole(null);
        return;
      }
      try {
        const me = await getUserMe();
        setUserName((me.name ?? "User").trim() || "User");
        setUserRole(me.role ?? null);
        setUserProfileImg(me.profileImage ?? null);
      } catch {
        setUserName("User");
        setUserProfileImg(null);
        setUserRole(null);
      }
    })();
  }, [isAuthed]);

  React.useEffect(() => {
    (async () => {
      if (!isAuthed) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const [y, m] = month.split("-");
        const [eventsData, eventDaysData] = await Promise.all([
          api<any>(`/events/${y}/${m}`),
          api<EventDayMonthResponse>(`/event-days/${y}/${m}`),
        ]);

        const rawList = eventsData?.eventList ?? [];
        const events: RawEvent[] = rawList.map((e: any) => ({
          id: e.id,
          title: e.title,
          content: e.content,
          startDate: e.startDate,
          endDate: e.endDate,
          startTime: e.startTime ?? null,
          endTime: e.endTime ?? null,
        }));

        const eventDayByKey = new Map<string, EventDay>();
        const nextEventDaysByEventId = new Map<string, EventDay[]>();

        for (const ed of eventDaysData?.eventDayList ?? []) {
          const key = `${String(ed.eventId)}__${ed.date}`;
          eventDayByKey.set(key, ed);

          const eid = String(ed.eventId);
          const arr = nextEventDaysByEventId.get(eid) ?? [];
          arr.push(ed);
          nextEventDaysByEventId.set(eid, arr);
        }
        setEventDaysByEventId(nextEventDaysByEventId);

        const expanded = events.flatMap((ev) => expandEventToDailyItems(ev, month));

        const merged = expanded.map((it) => {
          const key = `${String(it.eventId)}__${it.date}`;
          const ed = eventDayByKey.get(key);
          if (!ed) return it;

          const count = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
          const locked = ed.completed === true || count >= TOTAL_QUESTIONS;

          return {
            ...it,
            eventDayId: ed.eventDayId,
            transcriptionCount: count,
            isLocked: locked,
          };
        });

        setItems(merged);
      } catch (e) {
        console.error("[HOME] load month error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [month, isAuthed]);

  React.useEffect(() => {
    if (!selectedItem) setRecordModalOpen(false);
  }, [selectedItem]);

  const requireAuth = (action: () => void) => {
    if (!isAuthed) {
      navigation.getParent()?.navigate("Auth" as never);
      return;
    }
    action();
  };

  const handleRecord = async () => {
    if (!selectedItem) return;
    if (!isAuthed) return;
    if (selectedItem.isLocked) return;

    setRecordModalOpen(false);

    try {
      if (selectedItem.eventDayId) {
        const count = selectedItem.transcriptionCount ?? 0;
        if (count >= TOTAL_QUESTIONS) return;

        navigation.navigate("Questions", {
          eventDayId: Number(selectedItem.eventDayId),
        });
        setSelectedItem(null);
        return;
      }

      const body = {
        date: selectedItem.date,
        title: selectedItem.title,
        memo: selectedItem.subtitle,
        startTime: selectedItem.startTime ? selectedItem.startTime.slice(0, 5) : undefined,
        endTime: selectedItem.endTime ? selectedItem.endTime.slice(0, 5) : undefined,
        subtitle: selectedItem.subtitle ?? "",
      };

      const response = await api<any>(`/event-days/events/${selectedItem.eventId}`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const newEventDayId = response?.eventDayId;

      navigation.navigate("Questions", {
        eventDayId: Number(newEventDayId),
      } as any);
      setSelectedItem(null);
    } catch (e) {
      console.error("[HOME] handleRecord error:", e);
    }
  };

  return (
    <SafeAreaView style={commonStyles.appRoot}>
      {/* Header (웹 topbar-main 대응) */}
      <Header
        onMenuClick={() => requireAuth(() => setMenuOpen(true))}
        onAddClick={() => requireAuth(() => navigation.navigate("NewSchedule"))}
      />

      {/* 리스트(웹 wrap 대응) - FlatList 1개만 */}
      <FlatList
        data={byDate}
        keyExtractor={(x) => x[0]}
        contentContainerStyle={commonStyles.wrap}
        ListHeaderComponent={
          <MonthHeader
            valueYm={month}
            lang={i18n.language}
            onOpen={() => setFilterOpen(true)}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Image
                source={require("../../assets/images/internie_mascot_normal.png")}
                style={styles.emptyImg}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>{t("empty.title")}{"\n"}{t("empty.subtitle")}</Text>

              <Pressable
                style={styles.emptyBtn}
                onPress={() => requireAuth(() => navigation.navigate("NewSchedule"))}
              >
                <Text style={styles.emptyBtnText}>{t("empty.sync")}</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item: [date, arr] }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{dateLabel(date, i18n.language, t)}</Text>

            {arr.map((it) => {
              const locked = !!it.isLocked;
              const selected = selectedItem?.instanceId === it.instanceId;

              return (
                <Pressable
                  key={it.instanceId}
                  style={[
                    styles.card,
                    selected ? styles.cardSelected : null,
                    locked ? styles.cardLocked : null,
                  ]}
                  onPress={() => {
                    if (locked && it.eventDayId) {
                      setSelectedItem(null);
                      navigation.navigate("DetailSchedule", { eventDayId: Number(it.eventDayId) });
                      return;
                    }
                    setSelectedItem((prev) => (prev?.instanceId === it.instanceId ? null : it));
                  }}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.thumb, selected || locked ? styles.thumbSelected : null]} />
                    <View style={styles.cardTextWrap}>
                      <Text style={styles.cardTitle}>{it.title}</Text>
                      <Text style={styles.cardSub}>
                        {timeRangeText(it.startTime, it.endTime, t)}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.editBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      navigation.navigate("EditSchedule", { eventId: Number(it.eventId) });
                    }}
                  >
                    <Image source={require("../../assets/icons/chevron-right.png")} style={styles.editIcon} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      />

      {/* 하단 기록하기 CTA (웹 bottom-cta 대응) - 1개만 */}
      {byDate.length > 0 && (
        <View style={commonStyles.bottomCta}>
          <Pressable
            style={[commonStyles.recordBtn, canRecord ? commonStyles.recordBtnEnabled : null]}
            disabled={!canRecord}
            onPress={() => requireAuth(() => setRecordModalOpen(true))}
          >
            <Text style={canRecord ? commonStyles.recordBtnEnabledText : commonStyles.recordBtnText}>
              {t("common.record")}
            </Text>
          </Pressable>
        </View>
      )}

      {/* SideMenu - Modal 블록 삭제하고 컴포넌트만 */}
      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        userName={userName}
        userProfileImg={userProfileImg}
        userRole={userRole}
        onMyPage={() => navigation.navigate("MyPage")}
      />

      {/* MonthFilterSheet - Filter Modal 블록 삭제하고 컴포넌트만 */}
      <MonthFilterSheet
        open={filterOpen}
        valueYm={month}
        sortOrder={sortOrder}
        onClose={() => setFilterOpen(false)}
        onApply={(nextYm, nextSort) => {
          setMonth(nextYm);
          setSortOrder(nextSort);
          setFilterOpen(false);
        }}
      />

      {/* Record Modal - 이건 유지해도 됨(웹 EventModal 대응) */}
      <Modal
        visible={recordModalOpen && !!selectedItem}
        transparent
        animationType="fade"
        onRequestClose={() => setRecordModalOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRecordModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectedItem?.title ?? ""}</Text>
              <Pressable onPress={() => setRecordModalOpen(false)}>
                <Text style={styles.sheetClose}>×</Text>
              </Pressable>
            </View>

            {selectedItem && (
              <View style={styles.weekRow}>
                {weekdayLabels(i18n.language).map((w, idx) => {
                  const list = eventDaysByEventId.get(String(selectedItem.eventId)) ?? [];
                  const set = new Set<number>();
                  for (const ed of list) if (hasRecord(ed)) set.add(getWeekdayIndex(ed.date));
                  const active = set.has(idx);

                  return (
                    <View key={w} style={[styles.weekChip, active ? styles.weekChipActive : null]}>
                      <Text style={styles.weekChipText}>{w}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.sheetDesc}>
              {t("modal.desc1")}
              {"\n"}
              {t("modal.desc2")}
            </Text>

            <Pressable style={styles.sheetPrimary} onPress={handleRecord}>
              <Text style={styles.sheetPrimaryText}>{t("common.record")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
