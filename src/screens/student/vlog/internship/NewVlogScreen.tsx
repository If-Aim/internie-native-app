import React from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getVlogCompanies, startVlogProject, type VlogClipCompleteInput, type VlogCompanyResponse } from "../../../../api/vlog";

import AppText from "../../../../../AppText";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./NewVlogScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "NewVlog">;

type DateTarget = "start" | "end";

const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function CloseIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6L18 18" stroke="#05070A" strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function ClockIcon(): React.ReactElement {
    return (
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path
                d="M13.3 14.7L14.7 13.3L11 9.6V5H9V10.4L13.3 14.7ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z"
                fill="#000000"
            />
        </Svg>
    );
}

function VideoIcon({ color = "#808080" }: { color?: string }): React.ReactElement {
    return (
        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
            <Path d="M12.1056 8.83333H9.35556M15.8753 14.3867L20.5252 16.6771C21.0072 16.9705 21.5131 16.7976 21.5001 16.1856L21.4675 8.09104C21.4263 7.42667 21.0342 7.24539 20.4569 7.55242L15.8622 9.64057M5.25006 18.5H13.6056C14.8482 18.5 15.8556 17.5051 15.8556 16.2778L15.8753 13.4275L15.8556 7.72222C15.8556 6.49492 14.8482 5.5 13.6056 5.5H5.25006C4.00742 5.5 3.00006 6.49492 3.00006 7.72222V16.2778C3.00006 17.5051 4.00742 18.5 5.25006 18.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }): React.ReactElement {
    const path = direction === "left" ? "M15 18L9 12L15 6" : "M9 18L15 12L9 6";

    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d={path} stroke="#333333" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function DropdownArrowIcon({ open }: { open: boolean }): React.ReactElement {
    const path = open ? "M6 15L12 9L18 15" : "M6 9L12 15L18 9";

    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d={path} stroke="#5F5F5F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function formatKoreanDate(date: Date): string {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function sameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isAfterDate(a: Date, b: Date): boolean {
    return startOfDay(a).getTime() > startOfDay(b).getTime();
}

function isBeforeDate(a: Date, b: Date): boolean {
    return startOfDay(a).getTime() < startOfDay(b).getTime();
}

function isBetweenDate(date: Date, start: Date, end: Date): boolean {
    const targetTime = startOfDay(date).getTime();
    const startTime = startOfDay(start).getTime();
    const endTime = startOfDay(end).getTime();

    return targetTime > startTime && targetTime < endTime;
}

function isInRangeInclusive(date: Date, start: Date, end: Date): boolean {
    const targetTime = startOfDay(date).getTime();
    const startTime = startOfDay(start).getTime();
    const endTime = startOfDay(end).getTime();

    return targetTime >= startTime && targetTime <= endTime;
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMonthDays(year: number, month: number): Array<Date | null> {
    const firstDate = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0);
    const firstDay = (firstDate.getDay() + 6) % 7;
    const days: Array<Date | null> = [];

    for (let i = 0; i < firstDay; i += 1) {
        days.push(null);
    }

    for (let day = 1; day <= lastDate.getDate(); day += 1) {
        days.push(new Date(year, month, day));
    }

    while (days.length % 7 !== 0) {
        days.push(null);
    }

    return days;
}

function formatApiDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function Header({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement {

    return (
        <View style={styles.topbarRow}>
            <View style={styles.headerLeftSpace} />

            <AppText style={styles.appTitle}>인턴십 추가하기</AppText>

            <View style={commonStyles.iconbtn}>
                <Pressable style={commonStyles.iconbtn} onPress={onClose} accessibilityLabel="닫기">
                    <CloseIcon />
                </Pressable>
            </View>
        </View>
    );
}

export default function NewVlogScreen({ navigation }: Props): React.ReactElement {
    const today = React.useMemo(() => startOfDay(new Date()), []);
    const [name, setName] = React.useState("");
    const [startDate, setStartDate] = React.useState<Date | null>(null);
    const [endDate, setEndDate] = React.useState<Date | null>(null);
    const [companies, setCompanies] = React.useState<VlogCompanyResponse[]>([]);
    const [companyLoading, setCompanyLoading] = React.useState(false);
    const [selectedCompanyCode, setSelectedCompanyCode] = React.useState<string | null>(null);
    const [companyDropdownOpen, setCompanyDropdownOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    const [introClip, setIntroClip] = React.useState<VlogClipCompleteInput | null>(null);

    const [calendarOpen, setCalendarOpen] = React.useState(false);
    const [calendarTarget, setCalendarTarget] = React.useState<DateTarget>("start");
    const [visibleMonth, setVisibleMonth] = React.useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [tempDate, setTempDate] = React.useState<Date | null>(null);
    const selectedCompany = companies.find((company) => company.code === selectedCompanyCode) ?? null;
    const canSave = name.trim().length > 0 && startDate !== null && endDate !== null && selectedCompanyCode !== null && introClip !== null && !saving;
    
    React.useEffect(() => {
        void loadCompanies();
    }, []);

    async function loadCompanies(): Promise<void> {
        try {

            setCompanyLoading(true);

            const data = await getVlogCompanies();

            setCompanies(data ?? []);
            setSelectedCompanyCode(null);
        } catch (error) {
            console.error("[NEW_VLOG] load companies error:", error);
            setCompanies([]);
            setSelectedCompanyCode(null);
            Alert.alert("불러오기 실패", "회사 목록을 불러오지 못했습니다.");
        } finally {
            setCompanyLoading(false);
        }
    }

    function openCalendar(target: DateTarget): void {
        const baseDate = target === "start" ? startDate : endDate;

        setCalendarTarget(target);
        setTempDate(baseDate ?? today);
        setVisibleMonth(new Date((baseDate ?? today).getFullYear(), (baseDate ?? today).getMonth(), 1));
        setCalendarOpen(true);
    }

    function closeCalendar(): void {
        setCalendarOpen(false);
    }

    function moveMonth(amount: number): void {
        setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
    }

    function confirmDate(): void {
        if (!tempDate) {
            closeCalendar();
            return;
        }

        if (calendarTarget === "start") {
            setStartDate(tempDate);

            if (endDate && tempDate > endDate) {
                setEndDate(null);
            }
        } else {
            if (startDate && tempDate < startDate) {
                Alert.alert("기간을 확인해주세요.", "종료일은 시작일보다 빠를 수 없습니다.");
                return;
            }

            setEndDate(tempDate);
        }

        closeCalendar();
    }

    function handlePressRecord(): void {
        setIntroClip({
            fileKey: `vlogs/temp/intro-${Date.now()}.mp4`,
            originalName: "intro.mp4",
            contentType: "video/mp4",
            sizeBytes: 0,
            durationSeconds: 30,
            thumbnailKey: null,
        });

        Alert.alert("촬영 완료", "자기소개 영상이 임시로 등록되었습니다.");
    }

    async function handleSave(): Promise<void> {
        if (!canSave || !selectedCompanyCode || !startDate || !endDate || !introClip) {
            Alert.alert("입력값을 확인해주세요.", "인턴십 이름, 기간, 회사, 자기소개 영상을 모두 입력해주세요.");
            return;
        }

        if (saving) return;

        try {
            setSaving(true);

            await startVlogProject({
                companyCode: selectedCompanyCode,
                title: name.trim(),
                startDate: formatApiDate(startDate),
                endDate: formatApiDate(endDate),
                introClip,
            });

            Alert.alert("저장되었습니다.", "브이로그 인턴십이 추가되었습니다.", [
                {
                    text: "확인",
                    onPress: () => navigation.goBack(),
                },
            ]);
        } catch (error) {
            console.error("[NEW_VLOG] save error:", error);
            Alert.alert("저장 실패", "브이로그 인턴십을 추가하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    }

    function renderCalendarModal(): React.ReactElement {
        const days = getMonthDays(visibleMonth.getFullYear(), visibleMonth.getMonth());
        const selected = tempDate;
        const previewStartDate = calendarTarget === "start" ? selected : startDate;
        const previewEndDate = calendarTarget === "end" ? selected : endDate;
        const hasPreviewRange = !!previewStartDate && !!previewEndDate && !isAfterDate(previewStartDate, previewEndDate);
        const rangeStart = calendarTarget === "end" ? startDate : null;

        return (
            <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={closeCalendar}>
                <View style={styles.modalBackdrop}>
                    <Pressable style={styles.modalDim} onPress={closeCalendar} />

                    <View style={styles.calendarSheet}>
                        <View style={styles.calendarHeader}>
                            <AppText style={styles.calendarTitle}>{calendarTarget === "start" ? "시작일을 설정하세요" : "종료일을 설정하세요"}</AppText>
                            <Pressable style={styles.calendarCloseButton} onPress={closeCalendar}>
                                <CloseIcon />
                            </Pressable>
                        </View>

                        <View style={styles.monthRow}>
                            <Pressable style={styles.monthArrowButton} onPress={() => moveMonth(-1)}>
                                <ChevronIcon direction="left" />
                            </Pressable>

                            <AppText style={styles.monthText}>{visibleMonth.getMonth() + 1}월</AppText>

                            <Pressable style={styles.monthArrowButton} onPress={() => moveMonth(1)}>
                                <ChevronIcon direction="right" />
                            </Pressable>
                        </View>

                        <View style={styles.weekRow}>
                            {WEEK_LABELS.map((label) => (
                                <AppText key={label} style={styles.weekText}>{label}</AppText>
                            ))}
                        </View>

                        <View style={styles.dayGrid}>
                            {days.map((date, index) => {
                                const disabled = !date || (rangeStart !== null && isBeforeDate(date, rangeStart));
                                const isStart = !!date && !!previewStartDate && sameDate(date, previewStartDate);
                                const isEnd = !!date && !!previewEndDate && sameDate(date, previewEndDate);
                                const isBetween = !!date && !!previewStartDate && !!previewEndDate && hasPreviewRange && isBetweenDate(date, previewStartDate, previewEndDate);
                                const isRangeEdge = isStart || isEnd;
                                const isRangeSelected = isRangeEdge || isBetween;

                                const isFirstColumn = index % 7 === 0;
                                const isLastColumn = index % 7 === 6;
                                const prevDate = !isFirstColumn ? days[index - 1] : null;
                                const nextDate = !isLastColumn ? days[index + 1] : null;

                                const hasLeftConnection = !!prevDate && !!previewStartDate && !!previewEndDate && hasPreviewRange && isInRangeInclusive(prevDate, previewStartDate, previewEndDate);
                                const hasRightConnection = !!nextDate && !!previewStartDate && !!previewEndDate && hasPreviewRange && isInRangeInclusive(nextDate, previewStartDate, previewEndDate);

                                const rangeFillStyle = (() => {
                                    if (!isRangeSelected || !hasPreviewRange) return null;
                                    if (isStart && isEnd) return styles.rangeFillSingle;

                                    if (!hasLeftConnection && !hasRightConnection) {
                                        if (isStart && !isEnd) return styles.rangeFillRowEnd;
                                        if (!isStart && isEnd) return styles.rangeFillRowStart;
                                        return styles.rangeFillSingle;
                                    }

                                    if (!hasLeftConnection && hasRightConnection) {
                                        if (isStart) return styles.rangeFillStart;
                                        return styles.rangeFillRowStart;
                                    }

                                    if (hasLeftConnection && !hasRightConnection) {
                                        if (isEnd) return styles.rangeFillEnd;
                                        return styles.rangeFillRowEnd;
                                    }

                                    return styles.rangeFillMiddle;
                                })();

                                return (
                                    <Pressable
                                        key={`${index}-${date?.toISOString() ?? "empty"}`}
                                        style={styles.dayCell}
                                        disabled={disabled}
                                        onPress={() => date && setTempDate(date)}
                                    >
                                        {date && (
                                            <>
                                                {isRangeSelected && hasPreviewRange && rangeFillStyle && (
                                                    <View
                                                        pointerEvents="none"
                                                        style={[styles.rangeFill, rangeFillStyle]}
                                                    />
                                                )}

                                                <View style={[styles.dayCircle, isRangeEdge ? styles.dayCircleActive : null]}>
                                                    <AppText style={[styles.dayText, isRangeEdge ? styles.dayTextActive : null, isBetween ? styles.dayTextInRange : null]}>
                                                        {date.getDate()}
                                                    </AppText>
                                                </View>
                                            </>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Pressable style={styles.calendarConfirmButton} onPress={confirmDate}>
                            <AppText style={styles.calendarConfirmText}>확인</AppText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <Header onClose={() => navigation.goBack()} />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>인턴십 회사</AppText>

                    {companyLoading ? (
                        <View style={styles.companyLoadingBox}>
                            <ActivityIndicator />
                        </View>
                    ) : companies.length === 0 ? (
                        <View style={styles.companyEmptyBox}>
                            <AppText style={styles.companyEmptyText}>선택 가능한 회사가 없습니다.</AppText>
                        </View>
                    ) : (
                        <View style={styles.companyDropdownWrap}>
                            <Pressable
                                style={[styles.companyDropdownButton, companyDropdownOpen ? styles.companyDropdownButtonActive : null]}
                                onPress={() => setCompanyDropdownOpen((prev) => !prev)}
                            >
                                <AppText style={[styles.companyDropdownText, selectedCompany ? styles.companyDropdownTextSelected : null]}>
                                    {selectedCompany ? selectedCompany.name : "인턴십을 진행하는 회사를 선택해주세요"}
                                </AppText>

                                <DropdownArrowIcon open={companyDropdownOpen} />
                            </Pressable>

                            {companyDropdownOpen && (
                                <View style={styles.companyDropdownList}>
                                    {companies.map((company) => {
                                        const selected = selectedCompanyCode === company.code;

                                        return (
                                            <Pressable
                                                key={company.code}
                                                style={[styles.companyDropdownItem, selected ? styles.companyDropdownItemActive : null]}
                                                onPress={() => {
                                                    setSelectedCompanyCode(company.code);
                                                    setCompanyDropdownOpen(false);
                                                }}
                                            >
                                                <AppText style={[styles.companyDropdownItemText, selected ? styles.companyDropdownItemTextActive : null]}>
                                                    {company.name}
                                                </AppText>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}
                </View>
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>인턴십 이름</AppText>

                    <TextInput
                        style={styles.nameInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="이름을 입력하세요"
                        placeholderTextColor="#7E7E7E"
                    />
                </View>

                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>인턴십 기간</AppText>

                    <View style={styles.periodBox}>
                        <ClockIcon />

                        <Pressable style={styles.dateChip} onPress={() => openCalendar("start")}>
                            <AppText style={styles.dateChipText}>{startDate ? formatKoreanDate(startDate) : "시작일"}</AppText>
                        </Pressable>

                        <AppText style={styles.periodDash}>-</AppText>

                        <Pressable style={styles.dateChip} onPress={() => openCalendar("end")}>
                            <AppText style={styles.dateChipText}>{endDate ? formatKoreanDate(endDate) : "종료일"}</AppText>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>인턴십 소개</AppText>

                    <View style={styles.introCard}>
                        <View style={styles.introTopRow}>
                            <View style={styles.videoThumb}>
                                <VideoIcon />
                            </View>

                            <View style={styles.introTextWrap}>
                                <AppText style={styles.introLabel}>{introClip ? "자기소개 영상 등록 완료" : "나를 소개해볼까요?"}</AppText>
                                <AppText style={styles.introDuration}>{introClip?.durationSeconds ? `${introClip.durationSeconds}초` : "30초"}</AppText>
                            </View>
                        </View>

                        <Pressable style={styles.recordButton} onPress={handlePressRecord}>
                            <AppText style={styles.recordButtonText}>{introClip ? "재촬영하기" : "촬영하기"}</AppText>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <Pressable style={[styles.saveButton, canSave ? styles.saveButtonActive : null]} onPress={handleSave}>
                    <AppText style={[styles.saveButtonText, canSave ? styles.saveButtonTextActive : null]}>{saving ? "저장 중..." : "저장하기"}</AppText>
                </Pressable>
            </View>

            {renderCalendarModal()}
        </SafeAreaView>
    );
}