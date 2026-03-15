// src/screens/student/HomeScreen.tsx
import React from "react";
import { StyleSheet, View, Text, Pressable, Image, Modal, ActivityIndicator, FlatList, Alert, Animated, NativeScrollEvent, NativeSyntheticEvent, } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../../navigation/AppNavigator";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
} & TimeRange & DateRange;

type RawEvent = {
    id: string | number;
    title: string;
    content?: string;
} & TimeRange & DateRange;

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

const PICKER_ROW_HEIGHT = 52;
const PICKER_SNAP_EPSILON = 2;
function parseYm(ym: string) {
    const [y, m] = ym.split("-").map(Number);
    return { year: y, month: m };
}

function toYm(year: number, month: number) {
    return `${year}-${String(month).padStart(2, "0")}`;
}

function pickerYearLabel(year: number, lang: string) {
    return lang.startsWith("ko") ? `${year}년` : String(year);
}

function pickerMonthLabel(month: number, lang: string) {
    return lang.startsWith("ko") ? `${month}월` : new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2000, month - 1, 1));
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

function recordModalDateLabel(iso: string, lang: string): string {
    const d = new Date(`${iso}T00:00:00`);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();

    if (lang.startsWith("ko")) return `${y}년 ${m}월 ${day}일`;

    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(d);
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
function MonthPickerModal({
    open,
    ym,
    lang,
    minYear,
    maxYear,
    onClose,
    onConfirm,
}: {
    open: boolean;
    ym: string;
    lang: string;
    minYear: number;
    maxYear: number;
    onClose: () => void;
    onConfirm: (nextYm: string) => void;
}) {
    const { t } = useTranslation();
    const years = React.useMemo(() => {
        const out: number[] = [];
        for (let y = maxYear; y >= minYear; y -= 1) out.push(y);
        return out;
    }, [minYear, maxYear]);

    const months = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

    const initial = React.useMemo(() => parseYm(ym), [ym]);
    const [selectedYear, setSelectedYear] = React.useState(initial.year);
    const [selectedMonth, setSelectedMonth] = React.useState(initial.month);

    const yearListRef = React.useRef<FlatList<number>>(null);
    const monthListRef = React.useRef<FlatList<number>>(null);

    React.useEffect(() => {
        if (!open) return;

        const next = parseYm(ym);
        setSelectedYear(next.year);
        setSelectedMonth(next.month);

        requestAnimationFrame(() => {
            const yearIndex = years.indexOf(next.year);
            const monthIndex = months.indexOf(next.month);

            if (yearIndex >= 0) {
                yearListRef.current?.scrollToOffset({
                    offset: yearIndex * PICKER_ROW_HEIGHT,
                    animated: false,
                });
            }

            if (monthIndex >= 0) {
                monthListRef.current?.scrollToOffset({
                    offset: monthIndex * PICKER_ROW_HEIGHT,
                    animated: false,
                });
            }
        });
    }, [open, ym, years, months]);

    const snapYearToOffset = React.useCallback((offsetY: number) => {
        const index = Math.round(offsetY / PICKER_ROW_HEIGHT);
        const safeIndex = Math.max(0, Math.min(index, years.length - 1));
        const targetOffset = safeIndex * PICKER_ROW_HEIGHT;

        setSelectedYear(years[safeIndex]);

        if (Math.abs(offsetY - targetOffset) < PICKER_SNAP_EPSILON) {
            return;
        }

        yearListRef.current?.scrollToOffset({
            offset: targetOffset,
            animated: false,
        });
    }, [years]);

    const snapMonthToOffset = React.useCallback((offsetY: number) => {
        const index = Math.round(offsetY / PICKER_ROW_HEIGHT);
        const safeIndex = Math.max(0, Math.min(index, months.length - 1));
        const targetOffset = safeIndex * PICKER_ROW_HEIGHT;

        setSelectedMonth(months[safeIndex]);

        if (Math.abs(offsetY - targetOffset) < PICKER_SNAP_EPSILON) {
            return;
        }

        monthListRef.current?.scrollToOffset({
            offset: targetOffset,
            animated: false,
        });
    }, [months]);

    const onYearMomentumEnd = React.useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        snapYearToOffset(e.nativeEvent.contentOffset.y);
    }, [snapYearToOffset]);

    const onMonthMomentumEnd = React.useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        snapMonthToOffset(e.nativeEvent.contentOffset.y);
    }, [snapMonthToOffset]);

    return (
        <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
            <View style={commonStyles.periodSheetBackdrop}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

                <View style={commonStyles.periodSheet}>
                    <View style={commonStyles.monthpickerHeader}>
                        <Pressable style={commonStyles.monthpickerIconBtn} onPress={onClose}>
                            <Image source={require("../../assets/icons/chevron-left.png")} style={commonStyles.icon24} />
                        </Pressable>

                        <Pressable style={commonStyles.monthpickerIconBtn} onPress={onClose}>
                            <Image source={require("../../assets/icons/x-01.png")} style={commonStyles.icon24} />
                        </Pressable>
                    </View>

                    <View style={commonStyles.wheelWrap}>
                        <View style={commonStyles.wheelCol}>
                            <FlatList
                                ref={yearListRef}
                                data={years}
                                keyExtractor={(item) => `year-${item}`}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={PICKER_ROW_HEIGHT}
                                decelerationRate="normal"
                                bounces={false}
                                scrollEventThrottle={16}
                                initialNumToRender={8}
                                maxToRenderPerBatch={8}
                                contentContainerStyle={commonStyles.wheelContent}
                                getItemLayout={(_, index) => ({
                                    length: PICKER_ROW_HEIGHT,
                                    offset: PICKER_ROW_HEIGHT * index,
                                    index,
                                })}
                                onMomentumScrollEnd={onYearMomentumEnd}
                                renderItem={({ item }) => {
                                    const active = item === selectedYear;
                                    return (
                                        <View style={commonStyles.wheelItem}>
                                            <Text style={[commonStyles.wheelItemText, active ? commonStyles.wheelItemTextActive : null]}>
                                                {pickerYearLabel(item, lang)}
                                            </Text>
                                        </View>
                                    );
                                }}
                            />
                        </View>

                        <View style={commonStyles.wheelCol}>
                            <FlatList
                                ref={monthListRef}
                                data={months}
                                keyExtractor={(item) => `month-${item}`}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={PICKER_ROW_HEIGHT}
                                decelerationRate="normal"
                                bounces={false}
                                scrollEventThrottle={16}
                                initialNumToRender={8}
                                maxToRenderPerBatch={8}
                                contentContainerStyle={commonStyles.wheelContent}
                                getItemLayout={(_, index) => ({
                                    length: PICKER_ROW_HEIGHT,
                                    offset: PICKER_ROW_HEIGHT * index,
                                    index,
                                })}
                                onMomentumScrollEnd={onMonthMomentumEnd}
                                renderItem={({ item }) => {
                                    const active = item === selectedMonth;
                                    return (
                                        <View style={commonStyles.wheelItem}>
                                            <Text style={[commonStyles.wheelItemText, active ? commonStyles.wheelItemTextActive : null]}>
                                                {pickerMonthLabel(item, lang)}
                                            </Text>
                                        </View>
                                    );
                                }}
                            />
                        </View>
                    </View>

                    <Pressable style={commonStyles.monthpickerConfirm} onPress={() => onConfirm(toYm(selectedYear, selectedMonth))} >
                        <Text style={commonStyles.monthpickerConfirmText}>{t("common.confirm")}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
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
    const [pickerYm, setPickerYm] = React.useState(valueYm);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setTmpYm(valueYm);
            setTmpSort(sortOrder);
            setPickerYm(valueYm);
        }
    }, [open, valueYm, sortOrder]);

    if (!open) return null;

    return (
        <>
            <View style={commonStyles.periodSheetBackdrop}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={commonStyles.periodSheet}>
                    <View style={commonStyles.periodSheetHeader}>
                        <Text style={commonStyles.periodSheetTitle}>{t("filter.title")}</Text>
                        <Pressable style={commonStyles.periodSheetClose} onPress={onClose}>
                            <Image source={require("../../assets/icons/x-01.png")} style={commonStyles.icon24} />
                        </Pressable>
                    </View>

                    <View style={commonStyles.periodSheetBody}>
                        <View style={commonStyles.periodSheetSection}>
                            <Text style={commonStyles.periodSheetLabel}>{t("filter.period")}</Text>

                            <Pressable
                                style={styles.monthInputRow}
                                onPress={() => {
                                    setPickerYm(tmpYm);
                                    setIsMonthPickerOpen(true);
                                }}
                            >
                                <Text style={styles.monthInputText}>
                                    {ymLabel(tmpYm, i18n.language)}
                                </Text>

                                <Image source={require("../../assets/icons/calendar-07.png")} style={commonStyles.icon24} />
                            </Pressable>
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

                    <Pressable style={commonStyles.monthpickerConfirmGet} onPress={() => onApply(tmpYm, tmpSort)}>
                        <Text style={commonStyles.monthpickerConfirmText}>{t("filter.apply")}</Text>
                    </Pressable>
                </View>
            </View>

            <MonthPickerModal
                open={isMonthPickerOpen}
                ym={pickerYm}
                lang={i18n.language}
                minYear={2020}
                maxYear={2030}
                onClose={() => setIsMonthPickerOpen(false)}
                onConfirm={(nextYm) => {
                    setPickerYm(nextYm);
                    setTmpYm(nextYm);
                    setIsMonthPickerOpen(false);
                }}
            />
        </>
    );
}

function PreparingDots() {
    const a1 = React.useRef(new Animated.Value(0)).current;
    const a2 = React.useRef(new Animated.Value(0)).current;
    const a3 = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const makeLoop = (v: Animated.Value, delayMs: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delayMs),
                    Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: true }),
                    Animated.timing(v, { toValue: 0, duration: 380, useNativeDriver: true }),
                    Animated.delay(180),
                ])
            );

        const l1 = makeLoop(a1, 0);
        const l2 = makeLoop(a2, 120);
        const l3 = makeLoop(a3, 240);

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
                    outputRange: [0, -10],
                }),
            },
        ],
    });

    return (
        <View style={styles.preparingDotsRow}>
            <Animated.View style={[styles.preparingDot, dotStyle(a1)]} />
            <Animated.View style={[styles.preparingDot, dotStyle(a2)]} />
            <Animated.View style={[styles.preparingDot, dotStyle(a3)]} />
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
    const { t, i18n } = useTranslation();
    const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");
    const toggleLang = async () => {
            await i18n.changeLanguage(isKo ? "en" : "ko");
    };
    function handleServicePreparing() {
        Alert.alert(isKo ? "서비스 준비중입니다.": "Coming Soon");
    }
    if (!open) return null;

    return (
        <View style={commonStyles.drawerBackdrop}>
            <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: tokens.colors.overlay45 }]} onPress={onClose} />
            <View style={commonStyles.drawerPanel}>
                <View style={commonStyles.drawerHeader}>
                    <View style={commonStyles.profileWrap}>
                        <View style={commonStyles.profileImgRadius}><Image source={userProfileImg ? { uri: userProfileImg } : require("../../assets/images/internie_mascot_normal.png")} style={commonStyles.profileImg} /></View>
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
                    <Pressable style={commonStyles.drawerMenuItem} onPress={() => { handleServicePreparing() }}>
                        <Image source={require("../../assets/icons/arrow-refresh-01.png")} style={commonStyles.icon24} />
                        <Text style={commonStyles.drawerMenuItemText}>{t("menu.recent")}</Text>
                    </Pressable>
                    <Pressable style={commonStyles.drawerMenuItem} onPress={() => { handleServicePreparing() }}>
                        <Image source={require("../../assets/icons/settings.png")} style={commonStyles.icon24} />
                        <Text style={commonStyles.drawerMenuItemText}>{t("menu.settings")}</Text>
                    </Pressable>
                    <Pressable style={commonStyles.drawerMenuItem} onPress={() => { toggleLang() }}>
                        <Image source={require("../../assets/icons/globe-01.png")} style={commonStyles.icon24} />
                        <Text style={commonStyles.drawerMenuItemText}>{t("menu.language")}</Text>
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
	const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
	
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

	const [loginGateOpen, setLoginGateOpen] = React.useState(false);
	const [pendingRouteName, setPendingRouteName] = React.useState<string | null>(null);
	const [recordStage, setRecordStage] = React.useState<"idle" | "preparing">("idle");
    
    const loadMonthData = React.useCallback(async () => {
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
    }, [month, isAuthed]);

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

    useFocusEffect(
        React.useCallback(() => {
            loadMonthData();
        }, [loadMonthData])
    );

	React.useEffect(() => {
		if (!selectedItem) setRecordModalOpen(false);
	}, [selectedItem]);

	const requireAuth = (routeNameAfterLogin: string, action?: () => void) => {
		if (!isAuthed) {
			setPendingRouteName(routeNameAfterLogin);
			setLoginGateOpen(true);
			return;
		}
		action?.();
	};

	const handleRecord = async () => {
		if (!selectedItem) return;
		if (!isAuthed) return;
		if (selectedItem.isLocked) return;

		setRecordModalOpen(false);
		setRecordStage("preparing");

		const startedAt = Date.now();

		const moveAfterDelay = (eventDayId: number) => {
			const elapsed = Date.now() - startedAt;
			const remain = Math.max(0, 2000 - elapsed);

			setTimeout(() => {
				setRecordStage("idle");
				setSelectedItem(null);
				navigation.navigate("Questions", {
					eventDayId,
				} as never);
			}, remain);
		};

		try {
			if (selectedItem.eventDayId) {
				const count = selectedItem.transcriptionCount ?? 0;
				if (count >= TOTAL_QUESTIONS) {
					setRecordStage("idle");
					return;
				}

				moveAfterDelay(Number(selectedItem.eventDayId));
				return;
			}

			const body = {
				date: selectedItem.date,
				title: selectedItem.title,
				memo: selectedItem.subtitle,
				startTime: selectedItem.startTime
					? selectedItem.startTime.slice(0, 5)
					: undefined,
				endTime: selectedItem.endTime
					? selectedItem.endTime.slice(0, 5)
					: undefined,
				subtitle: selectedItem.subtitle ?? "",
			};

			const response = await api<any>(`/event-days/events/${selectedItem.eventId}`, {
				method: "POST",
				body: JSON.stringify(body),
			});

			const newEventDayId = response?.eventDayId;
			moveAfterDelay(Number(newEventDayId));
		} catch (e) {
			console.error("[HOME] handleRecord error:", e);
			setRecordStage("idle");
		}
	};
    const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");

    function handleServicePreparing() {
        Alert.alert(isKo ? "서비스 준비중입니다.": "Coming Soon");
    }
    return (
        <SafeAreaView style={commonStyles.appRoot}>
            {/* Header */}
            <Header
                onMenuClick={() => requireAuth("StudentHome", () => setMenuOpen(true))}
                onAddClick={() => requireAuth("NewSchedule", () => navigation.navigate("NewSchedule"))}
            />

            {/* 리스트 */}
            <FlatList
                data={byDate}
                keyExtractor={(x) => x[0]}
                style={{ flex: 1 }}
                contentContainerStyle={commonStyles.wrap}
                ListHeaderComponent={
                    <> 
                        <MonthHeader valueYm={month} lang={i18n.language} onOpen={() => setFilterOpen(true)} />  
                    </>
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Image source={require("../../assets/images/internie_mascot_normal.png")} style={styles.emptyImg} resizeMode="contain" />
                            <Text style={styles.emptyTitle}>{t("empty.title")}{"\n"}{t("empty.subtitle")}</Text>

                            <Pressable style={styles.emptyBtn} onPress={() => handleServicePreparing()} >
                                <Text style={styles.emptyBtnText}>{t("empty.sync")}</Text>
                            </Pressable>
                        </View>
                    )
                }
                renderItem={({ item: [date, arr] }) => (
                    <View>
                        <Text style={styles.sectionTitle}>{dateLabel(date, i18n.language, t)}</Text>

                        {arr.map((it) => {
                            const locked = !!it.isLocked;
                            const selected = selectedItem?.instanceId === it.instanceId;

                            return (
                                <View key={it.instanceId} style={styles.cardOuter}>
                                    <View style={styles.cardShadowWrap}>
                                        <Pressable
                                            style={[
                                                styles.card,
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
                                            {selected && <View style={styles.cardSelectedOutline} />}

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

                                                    navigation.navigate("EditSchedule", {
                                                        eventId: Number(it.eventId),
                                                        event: {
                                                            id: it.eventId,
                                                            eventDayId: it.eventDayId ?? null,
                                                            transcriptionCount: it.transcriptionCount ?? 0,
                                                            title: it.title,
                                                            content: it.subtitle,
                                                            startDate: it.startDate,
                                                            endDate: it.endDate,
                                                            startTime: it.startTime ?? null,
                                                            endTime: it.endTime ?? null,
                                                        },
                                                    } as never);
                                                }}
                                            >
                                                <Image source={require("../../assets/icons/chevron-right.png")} style={styles.editIcon} />
                                            </Pressable>
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            />

            {/* 하단 기록하기 CTA */}
            {byDate.length > 0 && (
                <View style={commonStyles.bottomCta}>
                    <Pressable
                        style={[commonStyles.recordBtn, canRecord ? commonStyles.recordBtnEnabled : null]}
                        disabled={!canRecord}
                        onPress={() => requireAuth("StudentHome", () => setRecordModalOpen(true))}
                    >
                        <Text style={canRecord ? commonStyles.recordBtnEnabledText : commonStyles.recordBtnText}>
                            {t("common.record")}
                        </Text>
                    </Pressable>
                </View>
            )}

            <SideMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                userName={userName}
                userProfileImg={userProfileImg}
                userRole={userRole}
                onMyPage={() => navigation.navigate("MyPage")}
            />

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

            <Modal visible={recordModalOpen && !!selectedItem} transparent animationType="fade" onRequestClose={() => setRecordModalOpen(false)} >
                <Pressable style={styles.backdrop} onPress={() => setRecordModalOpen(false)}>
                    <Pressable style={styles.sheet} onPress={() => {}}>
                        <View style={[commonStyles.topbarMain, styles.topbarRow]}>
                            <Text style={styles.sheetTitle}>{selectedItem?.title ?? ""}</Text>
                            <Pressable onPress={() => setRecordModalOpen(false)}>
                                <Image source={require("../../assets/icons/x-01.png")} style={commonStyles.icon24} />
                            </Pressable>
                        </View>
                        {!!selectedItem && (
                            <Text style={styles.sheetDate}>
                                {recordModalDateLabel(selectedItem.date, i18n.language)}
                            </Text>
                        )}
                        {selectedItem && (
                            <View style={styles.weekRow}>
                                {weekdayLabels(i18n.language).map((w, idx) => {
                                    const list = eventDaysByEventId.get(String(selectedItem.eventId)) ?? [];
                                    const set = new Set<number>();
                                    for (const ed of list) if (hasRecord(ed)) set.add(getWeekdayIndex(ed.date));
                                    const active = set.has(idx);

                                    return (
                                        <View key={w} style={[styles.weekChip, active ? styles.weekChipActive : null]}>
                                            <Text style={[styles.weekChipText, active ? styles.weekChipTextActive : null]}>{w}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        <View style={styles.recordIntroWrap}>
                            <View style={styles.speechBubble}>
                                <View style={styles.speechDesc}>
                                    <Text style={styles.speechBubbleText}>
                                        {t("modal.desc1")}{"\n"}
                                        {t("modal.desc2")}
                                    </Text>
                                </View>
                                <View style={styles.speechBubbleTail} />
                            </View>

                            <Image source={require("../../assets/images/internie_mascot_normal.png")} style={styles.recordMascot} resizeMode="contain" />
                        </View>
                        <Pressable style={styles.sheetPrimary} onPress={handleRecord}>
                            <Text style={styles.sheetPrimaryText}>{t("common.record")}</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
            {recordStage === "preparing" && (
                <View style={styles.preparingOverlay} pointerEvents="auto">
                    <View style={styles.preparingContent}>
                        <PreparingDots />
                        <Text style={styles.preparingTitle}>{t("modal.questionsPreparingTitle")}</Text>
                        <Text style={styles.preparingDesc}>
                            {t("modal.questionsPreparingDesc1")}{"\n"}
                            {t("modal.questionsPreparingDesc2")}
                        </Text>
                    </View>
                </View>
            )}
            {/* 로그인 유도 팝업 */}			
            <Modal visible={loginGateOpen} transparent animationType="fade" onRequestClose={() => setLoginGateOpen(false)} >
                <Pressable style={styles.backdrop} onPress={() => setLoginGateOpen(false)} >
                    <Pressable style={styles.sheet} onPress={() => {}}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>
                                {t("login.getLoginTitle", "로그인이 필요해요")}
                            </Text>
                            <Pressable onPress={() => setLoginGateOpen(false)}>
                                <Text style={styles.sheetClose}><Image source={require("../../assets/icons/x-01.png")} style={styles.editIcon} /></Text>
                            </Pressable>
                        </View>

                        <Text style={styles.sheetDesc}>
                            {t("login.getLoginSub", "이 기능을 이용하려면 로그인해 주세요")}
                        </Text>

                        <Pressable style={styles.sheetPrimary} onPress={() => { setLoginGateOpen(false); rootNavigation.navigate("Auth"); }} >
                            <Text style={styles.sheetPrimaryText}>
                                {t("common.login", "로그인")}
                            </Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
