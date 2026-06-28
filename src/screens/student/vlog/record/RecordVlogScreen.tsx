import React from "react";
import { ActivityIndicator, Alert, Animated, AppState, Easing, Image, InteractionManager, Modal, PixelRatio, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import type { GestureResponderEvent } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Video, { type VideoRef } from "react-native-video";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { createThumbnail } from "react-native-create-thumbnail";
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, useVideoOutput } from "react-native-vision-camera";
import Svg, { Circle, Path } from "react-native-svg";
import { BlurView } from "@react-native-community/blur";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "../../../../../AppText";
import { uploadFileToPresignedUrl } from "../../../../api/client";
import { completeMissionClip, createFreeClip, createVlogUploadUrl, deleteVlogProject, getVlogClipPlayUrl, getVlogProjectDetail, replaceFreeClip, replaceMissionClip, type VlogClipCompleteInput, type VlogClipResponse, type VlogResponse } from "../../../../api/vlog";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./RecordVlogScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "RecordVlog">;

type TranslationFunction = ReturnType<typeof useTranslation>["t"];

type MissionItem = {
    id: string;
    title: string;
    durationText: string;
    background: string;
    composition: string;
    completed: boolean;
    locked: boolean;
    clipId: number | null;
    thumbnailUrl: string | null;
};

type FreeCaptureItem = {
    id: string;
    clipId: number | null;
    title: string;
    durationText: string;
    thumbnailUrl: string | null;
};

type WeekItem = {
    id: string;
    week: number;
    dateText: string;
    completedCount: number;
    totalCount: number;
    description: string;
    missions: MissionItem[];
};

type CameraPosition = "back" | "front";
type CaptureResultMode = "READY" | "SAVING" | "DONE";

// 날짜 표시
function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseApiDate(value?: string | null): Date | null {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function formatTodayText(t: TranslationFunction): string {
    const today = new Date();

    return t("vlog.date.monthDay", { month: today.getMonth() + 1, day: today.getDate() });
}

function getCurrentWeekText(startDate: string | null | undefined, t: TranslationFunction): string { // 오늘날 기준week 계산
    const start = parseApiDate(startDate);

    if (!start) {
        return t("vlog.weekWithDate", { week: 1, date: formatTodayText(t) });
    }

    const today = startOfDay(new Date());
    const startDay = startOfDay(start);
    const diffDays = Math.max(0, Math.floor((today.getTime() - startDay.getTime()) / 86400000));
    const week = Math.floor(diffDays / 7) + 1;

    return t("vlog.weekWithDate", { week, date: formatTodayText(t) });
}

function formatMissionDuration(seconds: number | null | undefined, t: TranslationFunction): string {
    const safeSeconds = Number.isFinite(seconds ?? NaN) ? Math.max(0, seconds ?? 0) : 0;

    return t("vlog.seconds", { seconds: safeSeconds });
}

function groupMissionsByWeek(missions: VlogResponse[], t: TranslationFunction): WeekItem[] {
    const weekMap = new Map<number, VlogResponse[]>();

    missions.forEach((mission) => {
        const week = mission.week ?? 0;

        if (!weekMap.has(week)) {
            weekMap.set(week, []);
        }

        weekMap.get(week)?.push(mission);
    });

    return Array.from(weekMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([week, weekMissions]) => {
                const sortedMissions = [...weekMissions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const missionItems = sortedMissions.map((mission) => {
                    const missionStatus = mission.missionStatus ?? "AVAILABLE";

                    return {
                        id: mission.missionId ?? `${week}-${mission.order ?? 0}`,
                        title: mission.title ?? t("vlog.record.defaultMissionTitle"),
                        durationText: formatMissionDuration(mission.durationSec, t),
                        background: mission.description ?? t("vlog.record.defaultMissionDesc"),
                        composition: mission.tip ?? t("vlog.record.defaultMissionTip"),
                        completed: missionStatus === "COMPLETED",
                        locked: false,
                        clipId: mission.lastClipId ?? null,
                        thumbnailUrl: mission.lastClipThumbnailUrl ?? mission.thumbnailUrl ?? null,
                    };
                });
                const completedCount = missionItems.filter((mission) => mission.completed).length;

                return {
                    id: `week-${week}`,
                    week,
                    dateText: formatTodayText(t),
                    completedCount,
                    totalCount: missionItems.length,
                    description: t("vlog.record.weekDescription", { week }),
                    missions: missionItems,
                };
            });
}

function toFreeCaptureItems(clips: VlogClipResponse[] | null | undefined, t: TranslationFunction): FreeCaptureItem[] {
    return (clips ?? [])
            .filter((clip) => clip.type === "FREE_RECORD")
            .map((clip, index) => ({
                id: `free-${clip.clipId ?? index}`,
                clipId: clip.clipId ?? null,
                title: clip.displayTitle ?? clip.customTitle ?? t("vlog.record.freeMissionIndexed", { index: index + 1 }),
                durationText: formatMissionDuration(clip.durationSeconds, t),
                thumbnailUrl: clip.thumbnailUrl ?? null,
            }));
}

function toLocalUri(path: string): string {
    if (path.startsWith("file://") || path.startsWith("content://") || path.startsWith("ph://") || path.startsWith("assets-library://")) {
        return path;
    }

    return `file://${path}`;
}


function CameraCloseIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6L18 18" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function CameraSwitchIcon(): React.ReactElement {
    return (
        <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
            <Path d="M7.43714 9.66667C9.2904 6.27913 12.7543 4 16.7216 4C21.2198 4 25.0708 6.92991 26.6609 11.0833M10.6925 11.0833H5.33331V5.41667M25.8961 21C24.0429 24.3875 20.579 26.6667 16.6117 26.6667C12.1135 26.6667 8.26246 23.7368 6.67242 19.5833M22.6408 19.5833H28V25.25" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function CaptureCheckIcon(): React.ReactElement {
    return (
        <Svg width={64} height={64} viewBox="0 0 64 64" fill="none" style={styles.captureCheckIcon}>
            <Circle cx={32} cy={32} r={32} fill="#0166FF" />
            <Path d="M18 31.9999L28 42L47.9999 22" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function UpIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M6 15L12 9L18 15" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function DownIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M6 9L12 15L18 9" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function LeftIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18L9 12L15 6" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function RightIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M9 18L15 12L9 6" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function BackIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M14 17L9 12L14 7" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d={open ? "M6 15L12 9L18 15" : "M6 9L12 15L18 9"} stroke="#999999" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function CheckCircleIcon({ active }: { active: boolean }): React.ReactElement {
    return (
        <View style={[styles.checkCircle, active ? styles.checkCircleActive : null]}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C13.4121 3 14.7482 3.32519 15.9375 3.90476M19.3125 6.375L11.4375 14.25L9.1875 12" stroke={active ? "#0F6EF7" : "#808080"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        </View>
    );
}

function VideoIcon(): React.ReactElement {
    return (
        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
            <Path d="M12.1056 8.83333H9.35556M15.8753 14.3867L20.5252 16.6771C21.0072 16.9705 21.5131 16.7976 21.5001 16.1856L21.4675 8.09104C21.4263 7.42667 21.0342 7.24539 20.4569 7.55242L15.8622 9.64057M5.25006 18.5H13.6056C14.8482 18.5 15.8556 17.5051 15.8556 16.2778L15.8753 13.4275L15.8556 7.72222C15.8556 6.49492 14.8482 5.5 13.6056 5.5H5.25006C4.00742 5.5 3.00006 6.49492 3.00006 7.72222V16.2778C3.00006 17.5051 4.00742 18.5 5.25006 18.5Z" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ThreeDotIcon(): React.ReactElement {
    return (
        <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
            <Path d="M7.5 4.5C6.67157 4.5 6 3.82843 6 3C6 2.17157 6.67157 1.5 7.5 1.5C8.32843 1.5 9 2.17157 9 3C9 3.82843 8.32843 4.5 7.5 4.5Z" fill="black"/>
            <Path d="M7.5 9C6.67157 9 6 8.32843 6 7.5C6 6.67157 6.67157 6 7.5 6C8.32843 6 9 6.67157 9 7.5C9 8.32843 8.32843 9 7.5 9Z" fill="black"/>
            <Path d="M7.5 13.5C6.67157 13.5 6 12.8284 6 12C6 11.1716 6.67157 10.5 7.5 10.5C8.32843 10.5 9 11.1716 9 12C9 12.8284 8.32843 13.5 7.5 13.5Z" fill="black"/>
        </Svg>
    );
}

function Header({
    onBackClick,
    onMenuClick,
}: {
    onBackClick: () => void;
    onMenuClick: () => void;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onBackClick} accessibilityLabel={t("common.prev")}>
                <BackIcon />
            </Pressable>
            <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel={t("common.menu")}>
                <ThreeDotIcon />
            </Pressable>
        </View>
    );
}

function CameraCloseButton({ top, left, right, onClose }: { top: number; left?: number; right?: number; onClose: () => void }): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={[styles.cameraCloseButtonWrap, { top, left, right }]}>
            <Pressable style={styles.cameraCloseIconBox} onPress={onClose} accessibilityLabel={t("vlog.cameraClose")}>
                <CameraCloseIcon />
            </Pressable>
        </View>
    );
}

function CaptureSavingDots(): React.ReactElement {
    const wave = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        wave.setValue(0);

        const animation = Animated.loop(
            Animated.timing(wave, {
                toValue: 1,
                duration: 1350,
                easing: Easing.linear,
                useNativeDriver: false,
            })
        );

        animation.start();

        return () => {
            animation.stop();
            wave.stopAnimation();
        };
    }, [wave]);

    const inputRange = Array.from({ length: 17 }, (_, index) => index / 16);
    const phaseGap = 0.24;

    const createTranslateYRange = (dotIndex: number) => {
        const delayRatio = dotIndex * phaseGap;

        return inputRange.map((value) => {
            const shiftedValue = value - delayRatio;
            const waveValue = Math.sin(shiftedValue * Math.PI * 2);
            const normalizedValue = (waveValue + 1) / 2;

            return -26 * normalizedValue;
        });
    };

    const createColorRange = (dotIndex: number) => {
        const delayRatio = dotIndex * phaseGap;

        return inputRange.map((value) => {
            const shiftedValue = value - delayRatio;
            const waveValue = Math.sin(shiftedValue * Math.PI * 2);
            const normalizedValue = (waveValue + 1) / 2;

            if (normalizedValue >= 0.86) return "#0166FF";
            if (normalizedValue >= 0.55) return "#7EB5FF";

            return "#C7DFFF";
        });
    };

    const getDotAnimatedStyle = (dotIndex: number) => ({
        backgroundColor: wave.interpolate({
            inputRange,
            outputRange: createColorRange(dotIndex),
        }),
        transform: [
            {
                translateY: wave.interpolate({
                    inputRange,
                    outputRange: createTranslateYRange(dotIndex),
                }),
            },
            {
                scale: wave.interpolate({
                    inputRange,
                    outputRange: inputRange.map((value) => {
                        const shiftedValue = value - dotIndex * phaseGap;
                        const waveValue = Math.sin(shiftedValue * Math.PI * 2);
                        const normalizedValue = (waveValue + 1) / 2;

                        return 1 + normalizedValue * 0.16;
                    }),
                }),
            },
        ],
    });

    return (
        <View style={styles.captureSavingDotRow} accessibilityRole="progressbar">
            <Animated.View style={[styles.captureSavingDot, getDotAnimatedStyle(0)]} />
            <Animated.View style={[styles.captureSavingDot, getDotAnimatedStyle(1)]} />
            <Animated.View style={[styles.captureSavingDot, getDotAnimatedStyle(2)]} />
        </View>
    );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RecordVlogScreen({ navigation, route }: Props): React.ReactElement {
    const { t } = useTranslation();
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isLandscape = width > height;

    const [cameraPosition, setCameraPosition] = React.useState<CameraPosition>("back");
    const backCameraDevice = useCameraDevice("back");
    const frontCameraDevice = useCameraDevice("front");
    const cameraDevice = cameraPosition === "front" ? frontCameraDevice : backCameraDevice;
    const videoOutput = useVideoOutput({ enableAudio: true, fileType: "mp4" });
    const recorderRef = React.useRef<any>(null);
    const recordingStartedAtRef = React.useRef<number | null>(null);
    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();
    const isFocused = useIsFocused();
    const permissionRequestingRef = React.useRef(false);

    const projectId = route.params.projectId;
    const [title, setTitle] = React.useState(route.params?.title ?? t("vlog.record.defaultTitle"));
    const [subText, setSubText] = React.useState(route.params?.subText ?? "");
    const [progressPercent, setProgressPercent] = React.useState(route.params?.progressPercent ?? 0);
    const [completedMissionCount, setCompletedMissionCount] = React.useState(route.params?.completedMissionCount ?? 0);
    const [totalMissionCount, setTotalMissionCount] = React.useState(route.params?.totalMissionCount ?? 0);
    const [weeks, setWeeks] = React.useState<WeekItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [savingClip, setSavingClip] = React.useState(false);
    const [openedWeekId, setOpenedWeekId] = React.useState<string | null>(null);

    const [menuModalOpen, setMenuModalOpen] = React.useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [deleteCompleteModalOpen, setDeleteCompleteModalOpen] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [heroThumbnailUrl, setHeroThumbnailUrl] = React.useState<string | null>(null);
    const [heroThumbnailOverrideUri, setHeroThumbnailOverrideUri] = React.useState<string | null>(null);
    const [heroLastClipId, setHeroLastClipId] = React.useState<number | null>(null);
    const heroVideoRef = React.useRef<VideoRef>(null);
    const heroControlsHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [heroVideoUrl, setHeroVideoUrl] = React.useState<string | null>(null);
    const [heroVideoLoading, setHeroVideoLoading] = React.useState(false);
    const [heroPaused, setHeroPaused] = React.useState(true);
    const [heroEnded, setHeroEnded] = React.useState(false);
    const [heroControlsVisible, setHeroControlsVisible] = React.useState(true);
    const [heroProgressWidth, setHeroProgressWidth] = React.useState(0);
    const heroSeekingRef = React.useRef(false);
    const [heroProgressDragging, setHeroProgressDragging] = React.useState(false);
    const heroControlsOpacity = React.useRef(new Animated.Value(1)).current;
    const [heroCurrentTime, setHeroCurrentTime] = React.useState(0);
    const [heroDuration, setHeroDuration] = React.useState(0);
    const [missionThumbnailOverrides, setMissionThumbnailOverrides] = React.useState<Record<string, string>>({});
    const [freeClips, setFreeClips] = React.useState<FreeCaptureItem[]>([]);

    const [recording, setRecording] = React.useState(false);
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [recordSeconds, setRecordSeconds] = React.useState(0);
    const [cameraInfoOpen, setCameraInfoOpen] = React.useState(true);
    const [cameraInfoVisible, setCameraInfoVisible] = React.useState(true);
    const cameraInfoAnim = React.useRef(new Animated.Value(1)).current;
    const [cameraMissionCardHeight, setCameraMissionCardHeight] = React.useState(0);
    const [cameraLayout, setCameraLayout] = React.useState({ width: 0, height: 0 });
    const [captureTarget, setCaptureTarget] = React.useState<{
        type: "MISSION" | "FREE";
        mission: MissionItem | null;
        freeClip: FreeCaptureItem | null;
    } | null>(null);

    const [captureResult, setCaptureResult] = React.useState<{
        visible: boolean;
        mode: CaptureResultMode;
        mission: MissionItem | null;
        type: "MISSION" | "FREE";
        freeClip: FreeCaptureItem | null;
        thumbnailUri: string | null;
        videoUri: string | null;
        durationSeconds: number | null;
        isEditReady: boolean;
    }>({
        visible: false,
        mode: "READY",
        mission: null,
        type: "MISSION",
        freeClip: null,
        thumbnailUri: null,
        videoUri: null,
        durationSeconds: null,
        isEditReady: false,
    });

    React.useEffect(() => {
        return () => {
            clearHeroControlsTimer();
        };
    }, []);

    React.useEffect(() => {
        void loadProjectDetail();
    }, [projectId, t]);

    React.useEffect(() => {
        if (!recording) {
            setRecordSeconds(0);
            return;
        }

        const timer = setInterval(() => {
            setRecordSeconds((prev) => {
                const maxSeconds = getCaptureMaxDurationSeconds();

                if (prev >= maxSeconds) {
                    return prev;
                }

                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [recording, captureTarget]);

    async function loadProjectDetail(): Promise<void> {
        try {
            setLoading(true);

            const detail = await getVlogProjectDetail(projectId);
            const missions = detail.missions ?? [];

            setTitle(detail.title ?? title);
            setSubText(getCurrentWeekText(detail.startDate, t));
            setProgressPercent(detail.progressPercent ?? 0);
            setCompletedMissionCount(detail.completedMissionCount ?? 0);
            setTotalMissionCount(detail.totalMissionCount ?? 0);
            setHeroThumbnailUrl(detail.lastClipThumbnailUrl ?? null);
            setHeroLastClipId(detail.lastClipId ?? null);
            setWeeks(groupMissionsByWeek(missions, t));
            setFreeClips(toFreeCaptureItems(detail.clips, t));
        } catch (error) {
            console.error("[RECORD_VLOG] load project error:", error);
            Alert.alert(t("vlog.loadFailedTitle"), t("vlog.record.detailLoadFailed"));
        } finally {
            setLoading(false);
        }
    }

    function formatPlayerTime(seconds?: number | null): string {
        const safeSeconds = Number.isFinite(seconds ?? NaN) ? Math.max(0, seconds ?? 0) : 0;
        const minutes = Math.floor(safeSeconds / 60);
        const remainSeconds = Math.floor(safeSeconds % 60);

        return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
    }
 
    function clearHeroControlsTimer(): void {
        if (heroControlsHideTimerRef.current) {
            clearTimeout(heroControlsHideTimerRef.current);
            heroControlsHideTimerRef.current = null;
        }
    }

    function showHeroControls(autoHide: boolean): void {
        clearHeroControlsTimer();
        setHeroControlsVisible(true);

        Animated.timing(heroControlsOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
        }).start();

        if (!autoHide) {
            return;
        }

        heroControlsHideTimerRef.current = setTimeout(() => {
            Animated.timing(heroControlsOpacity, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    setHeroControlsVisible(false);
                }
            });
        }, 2000);
    }

    function hideHeroControls(): void {
        clearHeroControlsTimer();

        Animated.timing(heroControlsOpacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setHeroControlsVisible(false);
            }
        });
    }

    function resetHeroPlayer(): void {
        clearHeroControlsTimer();
        setHeroVideoUrl(null);
        setHeroVideoLoading(false);
        setHeroPaused(true);
        setHeroEnded(false);
        setHeroControlsVisible(true);
        setHeroCurrentTime(0);
        setHeroDuration(0);
        setHeroProgressDragging(false);
    }

    async function loadHeroVideoUrl(): Promise<string | null> {
        if (!heroLastClipId) {
            Alert.alert(t("vlog.noVideoTitle"), t("vlog.noRecordedVideoDesc"));
            return null;
        }

        try {
            const response = await getVlogClipPlayUrl(projectId, heroLastClipId);

            if (!response.url) {
                Alert.alert(t("vlog.noVideoTitle"), t("vlog.videoUrlLoadFailed"));
                return null;
            }

            return response.url;
        } catch (error) {
            console.error("[RECORD_VLOG] hero play url error:", error);
            Alert.alert(t("vlog.videoLoadFailedTitle"), t("vlog.retryLater"));
            return null;
        }
    }

    async function handlePressHeroPlay(event: GestureResponderEvent): Promise<void> {
        event.stopPropagation();

        if (!heroLastClipId) {
            Alert.alert(t("vlog.noVideoTitle"), t("vlog.noRecordedVideoDesc"));
            return;
        }

        if (heroVideoUrl) {
            if (heroEnded) {
                heroVideoRef.current?.seek(0);
                setHeroCurrentTime(0);
                setHeroEnded(false);
                setHeroPaused(false);
                showHeroControls(true);
                return;
            }

            const nextPaused = !heroPaused;

            setHeroPaused(nextPaused);
            showHeroControls(!nextPaused);
            return;
        }

        setHeroVideoLoading(true);

        try {
            const url = await loadHeroVideoUrl();

            if (!url) return;

            setHeroVideoUrl(url);
            setHeroPaused(false);
            setHeroEnded(false);
            setHeroCurrentTime(0);
            setHeroDuration(0);
            showHeroControls(true);
        } finally {
            setHeroVideoLoading(false);
        }
    }

    function handlePressHeroBackground(event: GestureResponderEvent): void {
        event.stopPropagation();

        if (!heroVideoUrl) {
            handlePressHeroPlay(event).catch(console.error);
            return;
        }

        if (!heroControlsVisible) {
            showHeroControls(!heroPaused && !heroEnded);
            return;
        }

        hideHeroControls();
    }

    function seekHeroProgress(locationX: number): void {
        if (heroDuration <= 0 || heroProgressWidth <= 0) {
            return;
        }

        const safeLocationX = Math.max(0, Math.min(locationX, heroProgressWidth));
        const nextTime = (safeLocationX / heroProgressWidth) * heroDuration;

        heroVideoRef.current?.seek(nextTime);
        setHeroCurrentTime(nextTime);
        setHeroEnded(false);
    }

    function handleHeroProgressStart(event: GestureResponderEvent): void {
        event.stopPropagation();
        heroSeekingRef.current = true;
        setHeroProgressDragging(true);
        clearHeroControlsTimer();
        showHeroControls(false);
        seekHeroProgress(event.nativeEvent.locationX);
    }

    function handleHeroProgressEnd(): void {
        heroSeekingRef.current = false;
        setHeroProgressDragging(false);
        showHeroControls(!heroPaused && !heroEnded);
    }

    function handleHeroProgressTerminate(): void {
        heroSeekingRef.current = false;
        setHeroProgressDragging(false);
        showHeroControls(!heroPaused && !heroEnded);
    }

    function handleHeroProgressMove(event: GestureResponderEvent): void {
        event.stopPropagation();

        if (!heroSeekingRef.current) {
            return;
        }

        seekHeroProgress(event.nativeEvent.locationX);
    }

    async function handleDeleteProject(): Promise<void> {
        if (deleting) return;

        try {
            setDeleting(true);

            await deleteVlogProject(projectId);

            setDeleteModalOpen(false);
            setDeleteCompleteModalOpen(true);
        } catch (error) {
            console.error("[RECORD_VLOG] delete project error:", error);
            Alert.alert(t("vlog.deleteFailedTitle"), t("vlog.record.deleteFailedDesc"));
        } finally {
            setDeleting(false);
        }
    }

    function parseDurationText(value?: string | null): number {
        const seconds = Number(String(value ?? "").replace(/[^0-9]/g, ""));

        if (!Number.isFinite(seconds) || seconds <= 0) {
            return 6;
        }

        return seconds;
    }

    function getCaptureDurationSecondsByTarget(target: { type: "MISSION" | "FREE"; mission: MissionItem | null } | null): number {
        if (target?.type === "FREE") {
            return 6;
        }

        return parseDurationText(target?.mission?.durationText);
    }

    function getCaptureThumbnailMaxSize(): { maxWidth: number; maxHeight: number } {
        const pixelRatio = PixelRatio.get();
        const rawWidth = Math.ceil(width * pixelRatio);
        const rawHeight = Math.ceil(height * pixelRatio);
        const longSide = Math.max(rawWidth, rawHeight);
        const scale = longSide > 2560 ? 2560 / longSide : 1;

        return {
            maxWidth: Math.ceil(rawWidth * scale),
            maxHeight: Math.ceil(rawHeight * scale),
        };
    }

    async function createCapturePreviewThumbnail(fileUri: string, target: { type: "MISSION" | "FREE"; mission: MissionItem | null } | null, actualDurationSeconds?: number | null): Promise<string | null> {
        const durationSeconds = actualDurationSeconds ?? getCaptureDurationSecondsByTarget(target);
        const thumbnailTimestamp = Math.max(0, durationSeconds * 1000 - 300);
        const { maxWidth, maxHeight } = getCaptureThumbnailMaxSize();

        try {
            const thumbnail = await createThumbnail({
                url: fileUri,
                timeStamp: thumbnailTimestamp,
                maxWidth,
                maxHeight,
                format: "png",
                cacheName: `capture_preview_${Date.now()}`,
            });

            return toLocalUri(thumbnail.path);
        } catch (error) {
            console.error("[RECORD_VLOG] create preview thumbnail error:", error);
            return null;
        }
    }

    function getCaptureMaxDurationSeconds(): number {
        return getCaptureDurationSecondsByTarget(captureTarget);
    }

    function getActualRecordedDurationSeconds(): number {
        const startedAt = recordingStartedAtRef.current;
        const maxSeconds = getCaptureMaxDurationSeconds();

        if (!startedAt) {
            return maxSeconds;
        }

        const elapsedSeconds = Math.ceil((Date.now() - startedAt) / 1000);

        return Math.max(1, Math.min(elapsedSeconds, maxSeconds));
    }

    async function requestCapturePermissions(): Promise<boolean> {
        if (permissionRequestingRef.current) return false;
        if (!isFocused || AppState.currentState !== "active") return false;

        permissionRequestingRef.current = true;

        try {
            return await new Promise<boolean>((resolve) => {
                InteractionManager.runAfterInteractions(async () => {
                    try {
                        if (!isFocused || AppState.currentState !== "active") {
                            resolve(false);
                            return;
                        }

                        const cameraGranted = hasCameraPermission || await requestCameraPermission();

                        if (!cameraGranted) {
                            resolve(false);
                            return;
                        }

                        const microphoneGranted = hasMicrophonePermission || await requestMicrophonePermission();

                        resolve(Boolean(microphoneGranted));
                    } catch (error) {
                        console.error("[RECORD_VLOG] permission request error:", error);
                        resolve(false);
                    }
                });
            });
        } finally {
            permissionRequestingRef.current = false;
        }
    }

    async function openCaptureCamera(target: { type: "MISSION" | "FREE"; mission: MissionItem | null; freeClip: FreeCaptureItem | null }): Promise<void> {
        if (recording || savingClip) return;

        const permissionGranted = await requestCapturePermissions();

        if (!permissionGranted) {
            Alert.alert(t("vlog.permissionRequiredTitle"), t("vlog.cameraMicPermissionDesc"));
            return;
        }

        if (!cameraDevice) {
            Alert.alert(t("vlog.cameraErrorTitle"), t("vlog.cameraUnavailable"));
            return;
        }

        setCaptureTarget(target);

        const initialCameraInfoOpen = !isLandscape;

        setCameraInfoOpen(initialCameraInfoOpen);
        setCameraInfoVisible(initialCameraInfoOpen);
        cameraInfoAnim.setValue(initialCameraInfoOpen ? 1 : 0);
        setCameraOpen(true);
    }

    async function startCameraRecording(): Promise<void> {
        if (recording || !captureTarget) return;

        try {
            setRecording(true);
            setRecordSeconds(0);
            recordingStartedAtRef.current = Date.now();

            const recorder = await videoOutput.createRecorder({
                maxDuration: getCaptureMaxDurationSeconds(),
            });

            recorderRef.current = recorder;

            await recorder.startRecording(
                (path: string) => {
                    recorderRef.current = null;
                    setRecording(false);
                    void handleRecordedVideo(path);
                },
                (error: unknown) => {
                    console.error("[RECORD_VLOG] recording error:", error);
                    recorderRef.current = null;
                    setRecording(false);
                    Alert.alert(t("vlog.recordFailedTitle"), t("vlog.recordFailedDesc"));
                }
            );
        } catch (error) {
            console.error("[RECORD_VLOG] start recording error:", error);
            recorderRef.current = null;
            setRecording(false);
            Alert.alert(t("vlog.recordFailedTitle"), t("vlog.recordFailedDesc"));
        }
    }

    async function stopCameraRecording(): Promise<void> {
        if (!recorderRef.current || !recording) return;

        try {
            await recorderRef.current.stopRecording();
        } catch (error) {
            console.error("[RECORD_VLOG] stop recording error:", error);
        }
    }

    function handleCloseCamera(): void {
        if (recording) {
            Alert.alert(t("vlog.recordingTitle"), t("vlog.cannotCloseCameraWhileRecording"));
            return;
        }

        setCameraOpen(false);
    }

    function toggleCameraPosition(): void {
        if (recording) return;

        const nextPosition = cameraPosition === "back" ? "front" : "back";
        const nextCameraDevice = nextPosition === "front" ? frontCameraDevice : backCameraDevice;

        if (!nextCameraDevice) {
            Alert.alert(t("vlog.cameraErrorTitle"), t("vlog.cameraSwitchUnavailable"));
            return;
        }

        setCameraPosition(nextPosition);
    }

    function handlePressRecord(mission: MissionItem): void {
        openCaptureCamera({
            type: "MISSION",
            mission,
            freeClip: null,
        }).catch(console.error);
    }

    async function handleRecordedVideo(path: string): Promise<void> {
        if (!captureTarget) return;

        const fileUri = toLocalUri(path);
        const currentTarget = captureTarget;

        setRecording(false);

        const actualDurationSeconds = getActualRecordedDurationSeconds();
        recordingStartedAtRef.current = null;

        const thumbnailUri = await createCapturePreviewThumbnail(fileUri, currentTarget, actualDurationSeconds);

        setCaptureResult({
            visible: true,
            mode: "READY",
            mission: currentTarget.mission,
            type: currentTarget.type,
            freeClip: currentTarget.freeClip,
            thumbnailUri,
            videoUri: fileUri,
            durationSeconds: actualDurationSeconds,
            isEditReady: false,
        });

        setCameraOpen(false);
        setCaptureTarget(null);
    }

    function willAllMissionsBeCompletedAfterSave(type: "MISSION" | "FREE", mission: MissionItem | null): boolean {
        const allMissions = weeks.flatMap((week) => week.missions);

        if (allMissions.length === 0) {
            return false;
        }

        if (type !== "MISSION" || !mission) {
            return allMissions.every((item) => item.completed);
        }

        return allMissions.every((item) => item.completed || item.id === mission.id);
    }

    async function uploadCaptureResultVideo(result: typeof captureResult): Promise<{ clipInput: VlogClipCompleteInput; thumbnailUri: string | null }> {
        if (!result.videoUri) {
            throw new Error(t("vlog.record.videoUriMissing"));
        }

        const now = Date.now();
        const prefix = result.type === "FREE" ? "free" : result.mission?.id ?? "mission";
        const fileName = `${prefix}_${now}.mp4`;
        const contentType = "video/mp4";
        const thumbnailFileName = `${prefix}_thumbnail_${now}.png`;
        const thumbnailContentType = "image/png";
        const durationSeconds = result.durationSeconds ?? getCaptureDurationSecondsByTarget({
            type: result.type,
            mission: result.mission,
        });

        let thumbnailUri = result.thumbnailUri;

        if (!thumbnailUri) {
            thumbnailUri = await createCapturePreviewThumbnail(result.videoUri, {
                type: result.type,
                mission: result.mission,
            }, durationSeconds);
        }

        if (!thumbnailUri) {
            throw new Error(t("vlog.thumbnailCreateFailed"));
        }

        const upload = await createVlogUploadUrl({
            projectId,
            fileName,
            contentType,
            type: "VIDEO",
        });

        if (!upload.uploadUrl || !upload.fileKey) {
            throw new Error(t("vlog.record.videoUploadUrlMissing"));
        }

        await uploadFileToPresignedUrl(upload.uploadUrl, result.videoUri, contentType);

        const thumbnailUpload = await createVlogUploadUrl({
            projectId,
            fileName: thumbnailFileName,
            contentType: thumbnailContentType,
            type: "THUMBNAIL",
        });

        if (!thumbnailUpload.uploadUrl || !thumbnailUpload.fileKey) {
            throw new Error(t("vlog.record.thumbnailUploadUrlMissing"));
        }

        await uploadFileToPresignedUrl(thumbnailUpload.uploadUrl, thumbnailUri, thumbnailContentType);

        return {
            thumbnailUri,
            clipInput: {
                fileKey: upload.fileKey,
                originalName: fileName,
                contentType,
                sizeBytes: null,
                durationSeconds,
                thumbnailKey: thumbnailUpload.fileKey,
                customTitle: result.type === "FREE" ? t("vlog.freeCapture") : null,
            },
        };
    }

    async function handleConfirmClip(): Promise<void> {
        if (savingClip) return;

        const currentResult = captureResult;

        if (!currentResult.videoUri) {
            Alert.alert(t("vlog.saveFailedTitle"), t("vlog.record.videoInfoMissing"));
            return;
        }

        const nextEditReady = willAllMissionsBeCompletedAfterSave(currentResult.type, currentResult.mission);

        try {
            setSavingClip(true);
            setCaptureResult((prev) => ({ ...prev, mode: "SAVING" }));

            const { clipInput, thumbnailUri } = await uploadCaptureResultVideo(currentResult);

            if (currentResult.type === "FREE") {
                if (currentResult.freeClip?.clipId) {
                    await replaceFreeClip(projectId, currentResult.freeClip.clipId, {
                        ...clipInput,
                        customTitle: currentResult.freeClip.title,
                    });
                } else {
                    await createFreeClip(projectId, {
                        ...clipInput,
                        customTitle: t("vlog.freeCapture"),
                    });
                }
            } else {
                if (!currentResult.mission) return;

                if (currentResult.mission.completed) {
                    await replaceMissionClip(projectId, currentResult.mission.id, clipInput);
                } else {
                    await completeMissionClip(projectId, currentResult.mission.id, clipInput);
                }

                if (thumbnailUri) {
                    setMissionThumbnailOverrides((prev) => ({
                        ...prev,
                        [currentResult.mission?.id ?? ""]: thumbnailUri,
                    }));
                }
            }

            if (thumbnailUri) {
                setHeroThumbnailOverrideUri(thumbnailUri);
            }

            await loadProjectDetail();

            setCaptureResult((prev) => ({
                ...prev,
                mode: "DONE",
                isEditReady: nextEditReady,
            }));
        } catch (error) {
            console.error("[RECORD_VLOG] save clip error:", error);
            setCaptureResult((prev) => ({ ...prev, mode: "READY" }));
            Alert.alert(t("vlog.saveFailedTitle"), t("vlog.record.saveClipFailed"));
        } finally {
            setSavingClip(false);
        }
    }

    function resetCaptureResult(): void {
        setCaptureResult({
            visible: false,
            mode: "READY",
            mission: null,
            type: "MISSION",
            freeClip: null,
            thumbnailUri: null,
            videoUri: null,
            durationSeconds: null,
            isEditReady: false,
        });
    }

    function handleRetryCapture(): void {
        const nextTarget = {
            type: captureResult.type,
            mission: captureResult.mission,
            freeClip: captureResult.freeClip,
        };

        resetCaptureResult();
        openCaptureCamera(nextTarget).catch(console.error);
    }

    function handlePressCaptureHome(): void {
        resetCaptureResult();
    }

    function handlePressCaptureDonePrimary(): void {
        if (captureResult.isEditReady) {
            resetCaptureResult();
            navigation.navigate("EditVlog", {
                projectId,
                title,
                subText,
            });
            return;
        }

        resetCaptureResult();
    }

    function toggleCameraInfo(): void {
        if (cameraInfoOpen) {
            setCameraInfoOpen(false);

            Animated.timing(cameraInfoAnim, {
                toValue: 0,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(() => {
                setCameraInfoVisible(false);
            });

            return;
        }

        setCameraInfoVisible(true);
        setCameraInfoOpen(true);

        Animated.timing(cameraInfoAnim, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }

    function handlePressEdit(): void {
        navigation.navigate("EditVlog", {
            projectId,
            title,
            subText,
        });
    }

    function toggleWeek(weekId: string): void {
        setOpenedWeekId((prev) => (prev === weekId ? null : weekId));
    }

    function handlePressFreeCapture(freeClip: FreeCaptureItem | null = null): void {
        openCaptureCamera({
            type: "FREE",
            mission: null,
            freeClip,
        }).catch(console.error);
    }

    function renderMission(mission: MissionItem): React.ReactElement {
        const missionThumbnailUri = missionThumbnailOverrides[mission.id] ?? mission.thumbnailUrl;

        return (
            <View key={mission.id} style={styles.missionCard}>
                <View style={styles.missionTopRow}>
                    <View style={[styles.missionThumb, mission.completed ? styles.missionThumbDone : null]}>
                        {missionThumbnailUri ? (
                            <Image source={{ uri: missionThumbnailUri }} style={styles.missionThumbImage} resizeMode="cover" />
                        ) : (
                            <VideoIcon />
                        )}
                    </View>

                    <View style={styles.missionTitleWrap}>
                        <AppText style={styles.missionTitle}>{mission.title}</AppText>
                        <AppText style={styles.missionDuration}>{mission.durationText}</AppText>
                    </View>
                </View>

                <View style={styles.missionInfoRow}>
                    <View style={styles.missionBadge}>
                        <AppText style={styles.missionBadgeText}>{t("vlog.record.background")}</AppText>
                    </View>
                    <AppText style={styles.missionDesc}>{mission.background}</AppText>
                </View>

                <View style={styles.missionInfoRow}>
                    <View style={styles.missionBadge}>
                        <AppText style={styles.missionBadgeText}>{t("vlog.record.composition")}</AppText>
                    </View>
                    <AppText style={styles.missionDesc}>{mission.composition}</AppText>
                </View>

                <Pressable
                    style={[styles.missionRecordButton, mission.completed ? styles.missionRecordButtonActive : null]}
                    onPress={() => handlePressRecord(mission)}
                >
                    <AppText style={[styles.missionRecordText, mission.completed ? styles.missionRecordTextActive : null]}>
                        {mission.completed ? t("vlog.recordAgain") : t("vlog.recordAction")}
                    </AppText>
                </Pressable>
            </View>
        );
    }

    function renderWeek(week: WeekItem): React.ReactElement {
        const open = openedWeekId === week.id;
        const complete = week.completedCount === week.totalCount;

        return (
            <View key={week.id} style={[styles.weekCard, open ? styles.weekCardOpen : null]}>
                <Pressable style={styles.weekHeader} onPress={() => toggleWeek(week.id)}>
                    <CheckCircleIcon active={complete} />

                    <View style={styles.weekTitleWrap}>
                        <AppText style={styles.weekTitle}>{t("vlog.week", { week: week.week })}</AppText>
                    </View>

                    <AppText style={styles.weekCount}>{week.completedCount}/{week.totalCount}</AppText>
                    <ChevronIcon open={open} />
                </Pressable>

                {open && (
                    <View style={styles.weekBody}>
                        <AppText style={styles.weekDesc}>{week.description}</AppText>
                        {week.missions.map(renderMission)}
                    </View>
                )}
            </View>
        );
    }

    function renderCaptureBackground(): React.ReactElement {
        if (captureResult.thumbnailUri) {
            return (
                <Image source={{ uri: captureResult.thumbnailUri }} style={styles.captureBackgroundImage} resizeMode="cover" />
            );
        }

        return <View style={styles.captureBackgroundFallback} />;
    }

    function renderCaptureResultLayer(): React.ReactElement | null {
        if (!captureResult.visible) return null;

        if (captureResult.mode === "SAVING") {
            return (
                <View style={[styles.captureOverlay, styles.captureOverlayLight]}>
                    <View style={styles.captureBody}>
                        <CaptureSavingDots />
                        <AppText style={styles.captureSavingTitle}>{t("vlog.record.savingVlog")}</AppText>
                    </View>
                </View>
            );
        }

        if (captureResult.mode === "DONE") {
            const subTitle = captureResult.isEditReady ? t("vlog.record.readyToEdit") : t("vlog.record.tryOtherMission");
            const primaryText = captureResult.isEditReady ? t("vlog.editAction") : t("vlog.record.otherMission");

            return (
                <View style={[styles.captureOverlay, styles.captureOverlayLight]}>
                    <View style={styles.captureBody}>
                        <Image source={require("../../../../assets/images/internie_mascot_normal.png")} style={styles.captureSuccessImg} resizeMode="contain" />
                        <AppText style={styles.captureSuccessTitle}>{t("vlog.record.created")}</AppText>
                        <AppText style={styles.captureSuccessSubTitle}>{subTitle}</AppText>
                    </View>

                    <View style={styles.captureActionArea}>
                        <Pressable style={styles.captureAgainButton} onPress={handlePressCaptureHome}>
                            <AppText style={styles.captureAgainText}>{t("vlog.record.toStart")}</AppText>
                        </Pressable>

                        <Pressable style={styles.captureNextButton} onPress={handlePressCaptureDonePrimary}>
                            <AppText style={styles.captureNextText}>{primaryText}</AppText>
                        </Pressable>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.captureOverlay}>
                {renderCaptureBackground()}
                <View style={styles.captureBackgroundDim} />

                <Pressable style={[styles.captureCloseButton, { top: insets.top + 9 }]} onPress={resetCaptureResult}>
                    <CameraCloseIcon />
                </Pressable>

                <View style={styles.captureBody}>
                    <CaptureCheckIcon />
                    <AppText style={styles.captureTitle}>{t("vlog.record.captureComplete")}</AppText>
                </View>

                <View style={styles.captureActionArea}>
                    <Pressable style={styles.captureAgainButton} onPress={handleRetryCapture}>
                        <AppText style={styles.captureAgainText}>{t("vlog.recordAgain")}</AppText>
                    </Pressable>

                    <Pressable style={styles.captureNextButton} onPress={handleConfirmClip} disabled={savingClip}>
                        <AppText style={styles.captureNextText}>{t("vlog.next")}</AppText>
                    </Pressable>
                </View>
            </View>
        );
    }

    function renderCameraModal(): React.ReactElement {
        const cameraCloseTop = insets.top + 59;
        const cameraCloseLeft = isLandscape ? insets.left + 12 : undefined;
        const cameraCloseRight = isLandscape ? undefined : 12;

        const modalWidth = cameraLayout.width > 0 ? cameraLayout.width : width;
        const modalHeight = cameraLayout.height > 0 ? cameraLayout.height : height;

        const cameraMissionCardWidth = isLandscape ? modalWidth * 0.42 : modalWidth * 0.84;
        const estimatedCameraMissionCardHeight = cameraMissionCardHeight > 0 ? cameraMissionCardHeight : captureTarget?.type === "MISSION" ? 220 : 112;
        const portraitMissionCardTop = cameraCloseTop + 40 + 19;
        const portraitMissionCardLeft = (modalWidth - cameraMissionCardWidth) / 2;
        const landscapeMissionCardLeft = insets.left + 36;
        const cameraMissionCardMaxHeight = isLandscape ? Math.max(190, modalHeight - 120) : Math.max(190, modalHeight - portraitMissionCardTop - 210);
        const landscapeMissionCardTop = Math.max(insets.top + 64, (modalHeight - cameraMissionCardMaxHeight) / 2);
        const cameraMissionCardTop = isLandscape ? landscapeMissionCardTop : portraitMissionCardTop;
        const cameraMissionCardLeft = isLandscape ? landscapeMissionCardLeft : portraitMissionCardLeft;

        const landscapeHiddenOffsetX = -(cameraMissionCardWidth + 14);
        const portraitFoldLeft = (modalWidth - 32) / 2;
        const portraitFoldOpenTop = cameraMissionCardTop + estimatedCameraMissionCardHeight + 23;
        const landscapeFoldOpenLeft = cameraMissionCardLeft + cameraMissionCardWidth + 14;
        const landscapeFoldTop = cameraMissionCardTop + Math.min(estimatedCameraMissionCardHeight, cameraMissionCardMaxHeight) / 2 - 16;

        const cameraCardOpacity = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
        });

        const cameraCardTranslateX = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [landscapeHiddenOffsetX, 0] : [0, 0],
        });

        const cameraCardTranslateY = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [0, 0] : [-8, 0],
        });

        const cameraFoldButtonTranslateX = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [landscapeHiddenOffsetX, 0] : [0, 0],
        });

        const cameraFoldButtonTranslateY = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [0, 0] : [-(estimatedCameraMissionCardHeight + 23), 0],
        });

        const cameraFoldButtonLeft = isLandscape ? landscapeFoldOpenLeft : portraitFoldLeft;
        const cameraFoldButtonTop = isLandscape ? landscapeFoldTop : portraitFoldOpenTop;

        const missionTitle = captureTarget?.type === "FREE" ? t("vlog.freeCapture") : captureTarget?.mission?.title ?? t("vlog.record.defaultMissionTitle");
        const missionDuration = captureTarget?.type === "FREE" ? t("vlog.sixSeconds") : captureTarget?.mission?.durationText ?? t("vlog.sixSeconds");
        const missionBackground = captureTarget?.mission?.background ?? t("vlog.record.freeCaptureDesc");
        const missionComposition = captureTarget?.mission?.composition ?? t("vlog.record.defaultMissionTip");

        return (
            <Modal visible={cameraOpen} animationType="fade" presentationStyle="fullScreen" onRequestClose={handleCloseCamera}>
                <View
                    style={styles.cameraRoot}
                    onLayout={(event) => {
                        const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;

                        setCameraLayout((prev) => {
                            if (prev.width === layoutWidth && prev.height === layoutHeight) return prev;
                            return { width: layoutWidth, height: layoutHeight };
                        });
                    }}
                >
                    {cameraDevice ? (
                        <Camera
                            key={cameraDevice.id}
                            style={styles.cameraPreview}
                            device={cameraDevice}
                            isActive={cameraOpen}
                            outputs={[videoOutput]}
                        />
                    ) : null}

                    <View style={styles.cameraOverlay}>
                        <CameraCloseButton
                            top={cameraCloseTop}
                            left={cameraCloseLeft}
                            right={cameraCloseRight}
                            onClose={handleCloseCamera}
                        />

                        {cameraInfoVisible ? (
                            <Animated.View
                                onLayout={(event) => {
                                    const nextHeight = event.nativeEvent.layout.height;

                                    setCameraMissionCardHeight((prev) => {
                                        if (Math.abs(prev - nextHeight) < 1) return prev;
                                        return nextHeight;
                                    });
                                }}
                                style={[
                                    styles.cameraMissionCard,
                                    isLandscape ? styles.cameraMissionCardLandscape : styles.cameraMissionCardPortrait,
                                    {
                                        top: cameraMissionCardTop,
                                        left: cameraMissionCardLeft,
                                        width: cameraMissionCardWidth,
                                        maxHeight: cameraMissionCardMaxHeight,
                                        opacity: cameraCardOpacity,
                                        overflow: "hidden",
                                        transform: [
                                            { translateX: cameraCardTranslateX },
                                            { translateY: cameraCardTranslateY },
                                        ],
                                    },
                                ]}
                            >
                                <AppText style={styles.cameraMissionTitle}>{missionTitle}</AppText>
                                <AppText style={styles.cameraMissionDuration}>{missionDuration}</AppText>

                                {captureTarget?.type === "MISSION" ? (
                                    <ScrollView
                                        style={styles.cameraMissionInfoScroll}
                                        contentContainerStyle={styles.cameraMissionInfoWrap}
                                        showsVerticalScrollIndicator={false}
                                        nestedScrollEnabled
                                    >
                                        <View style={styles.cameraMissionInfoRow}>
                                            <View style={styles.cameraMissionBadge}>
                                                <AppText style={styles.cameraMissionBadgeText}>{t("vlog.record.background")}</AppText>
                                            </View>
                                            <AppText style={styles.cameraMissionDesc}>{missionBackground}</AppText>
                                        </View>

                                        <View style={styles.cameraMissionInfoRow}>
                                            <View style={styles.cameraMissionBadge}>
                                                <AppText style={styles.cameraMissionBadgeText}>{t("vlog.record.composition")}</AppText>
                                            </View>
                                            <AppText style={styles.cameraMissionDesc}>{missionComposition}</AppText>
                                        </View>
                                    </ScrollView>
                                ) : null}
                            </Animated.View>
                        ) : null}

                        <Animated.View
                            style={[
                                styles.cameraFoldButton,
                                {
                                    left: cameraFoldButtonLeft,
                                    top: cameraFoldButtonTop,
                                    transform: [
                                        { translateX: cameraFoldButtonTranslateX },
                                        { translateY: cameraFoldButtonTranslateY },
                                    ],
                                },
                            ]}
                        >
                            <Pressable style={styles.cameraFoldButtonInner} onPress={toggleCameraInfo}>
                                {isLandscape ? (
                                    cameraInfoOpen ? <LeftIcon /> : <RightIcon />
                                ) : (
                                    cameraInfoOpen ? <UpIcon /> : <DownIcon />
                                )}
                            </Pressable>
                        </Animated.View>

                        <View style={[styles.cameraRecordArea, isLandscape ? styles.cameraRecordAreaLandscape : styles.cameraRecordAreaPortrait]}>
                            <Pressable
                                style={styles.recordCircleOuter}
                                onPress={() => {
                                    if (recording) {
                                        stopCameraRecording().catch(console.error);
                                        return;
                                    }

                                    startCameraRecording().catch(console.error);
                                }}
                            >
                                <View style={recording ? styles.recordStopInner : styles.recordCircleInner} />
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.cameraSwitchButton,
                                    isLandscape ? styles.cameraSwitchButtonLandscape : styles.cameraSwitchButtonPortrait,
                                    recording ? styles.cameraSwitchButtonDisabled : null,
                                ]}
                                onPress={toggleCameraPosition}
                                disabled={recording}
                                accessibilityLabel={t("vlog.cameraSwitch")}
                            >
                                <CameraSwitchIcon />
                            </Pressable>

                            {recording ? (
                                <AppText style={styles.cameraRecordTime}>{t("vlog.record.secondsProgress", { current: recordSeconds, total: getCaptureMaxDurationSeconds() })}</AppText>
                            ) : null}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderFreeCaptureCard(): React.ReactElement {
        return (
            <View style={styles.freeCaptureCard}>
                <View style={styles.weekHeader}>
                    <CheckCircleIcon active={freeClips.length >= 0} />

                    <View style={styles.weekTitleWrap}>
                        <AppText style={styles.weekTitle}>{t("vlog.freeCapture")}</AppText>
                    </View>

                    <ChevronIcon open={true} />
                </View>

                <View style={styles.weekBody}>
                    <AppText style={styles.weekDesc}>{t("vlog.record.freeCaptureDescWithLimit")}</AppText>

                    {freeClips.map((clip) => renderFreeClip(clip))}

                    <View style={styles.missionCard}>
                        <View style={styles.missionTopRow}>
                            <View style={styles.missionThumb}>
                                <VideoIcon />
                            </View>

                            <View style={styles.missionTitleWrap}>
                                <AppText style={styles.missionTitle}>{t("vlog.record.freeCapturePrompt")}</AppText>
                                <AppText style={styles.missionDuration}>{t("vlog.sixSeconds")}</AppText>
                            </View>
                        </View>

                        <Pressable style={styles.missionRecordButton} onPress={() => handlePressFreeCapture(null)}>
                            <AppText style={styles.missionRecordText}>{t("vlog.recordAction")}</AppText>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    }

    function renderFreeClip(clip: FreeCaptureItem): React.ReactElement {
        return (
            <View key={clip.id} style={styles.missionCard}>
                <View style={styles.missionTopRow}>
                    <View style={[styles.missionThumb, styles.missionThumbDone]}>
                        {clip.thumbnailUrl ? (
                            <Image source={{ uri: clip.thumbnailUrl }} style={styles.missionThumbImage} resizeMode="cover" />
                        ) : (
                            <VideoIcon />
                        )}
                    </View>

                    <View style={styles.missionTitleWrap}>
                        <AppText style={styles.missionTitle}>{clip.title}</AppText>
                        <AppText style={styles.missionDuration}>{clip.durationText}</AppText>
                    </View>
                </View>

                <Pressable style={[styles.missionRecordButton, styles.missionRecordButtonActive]} onPress={() => handlePressFreeCapture(clip)} >
                    <AppText style={[styles.missionRecordText, styles.missionRecordTextActive]}>{t("vlog.recordAgain")}</AppText>
                </Pressable>
            </View>
        );
    }

    function renderMenuModal(): React.ReactElement {
        return (
            <Modal visible={menuModalOpen} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setMenuModalOpen(false)}>
                <Pressable style={styles.menuModalBackdrop} onPress={() => setMenuModalOpen(false)}>
                    <Pressable
                        style={styles.menuBox}
                        onPress={() => {
                            setMenuModalOpen(false);
                            setDeleteModalOpen(true);
                        }}
                    >
                        <AppText style={styles.menuDeleteText}>{t("common.delete")}</AppText>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    }

    function renderDeleteModal(): React.ReactElement {
        return (
            <Modal visible={deleteModalOpen} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setDeleteModalOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <BlurView style={styles.modalBlur} blurType="light" blurAmount={2} reducedTransparencyFallbackColor="rgba(104, 104, 104, 0.5)" />
                    <Pressable style={styles.modalDim} onPress={() => setDeleteModalOpen(false)} />

                    <View style={styles.deleteModalBox}>
                        <AppText style={styles.deleteModalTitle}>{t("vlog.record.deleteConfirmTitle")}</AppText>
                        <View style={styles.deleteModalButtonRow}>
                            <Pressable
                                style={styles.deleteConfirmButton}
                                disabled={deleting}
                                onPress={() => {
                                    handleDeleteProject().catch(console.error);
                                }}
                            >
                                <AppText style={styles.deleteConfirmText}>{deleting ? t("vlog.deleting") : t("common.yes")}</AppText>
                            </Pressable>
                            <Pressable style={styles.deleteCancelButton} onPress={() => setDeleteModalOpen(false)} disabled={deleting}>
                                <AppText style={styles.deleteCancelText}>{t("common.no")}</AppText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderDeleteCompleteModal(): React.ReactElement {
        return (
            <Modal visible={deleteCompleteModalOpen} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setDeleteCompleteModalOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <BlurView style={styles.modalBlur} blurType="light" blurAmount={2} reducedTransparencyFallbackColor="rgba(104, 104, 104, 0.5)" />
                    <View style={styles.modalDim} />

                    <View style={styles.deleteCompleteModalBox}>
                        <AppText style={styles.deleteCompleteModalTitle}>{t("vlog.record.deleteComplete")}</AppText>

                        <Pressable
                            style={styles.deleteCompleteButton}
                            onPress={() => {
                                setDeleteCompleteModalOpen(false);
                                navigation.goBack();
                            }}
                        >
                            <AppText style={styles.deleteCompleteButtonText}>{t("common.confirm")}</AppText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    }

    const resolvedHeroThumbnailUrl = heroThumbnailOverrideUri ?? heroThumbnailUrl;
    const safeHeroCurrentTime = heroDuration > 0 ? Math.min(heroCurrentTime, heroDuration) : heroCurrentTime;
    const heroProgressPercent = heroDuration > 0 ? Math.min(100, Math.max(0, (safeHeroCurrentTime / heroDuration) * 100)) : 0;
    const heroCurrentTimeText = heroVideoUrl ? formatPlayerTime(Math.floor(safeHeroCurrentTime)) : "00:00";
    const heroDurationText = heroVideoUrl && heroDuration > 0 ? formatPlayerTime(Math.ceil(heroDuration)) : "00:00";
    const shouldShowHeroCenterButton = heroVideoLoading || !heroVideoUrl || heroPaused || heroEnded || heroControlsVisible;

    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <Header onBackClick={() => navigation.goBack()} onMenuClick={() => setMenuModalOpen(true)} />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!heroProgressDragging}>
                <View style={styles.titleRow}>
                    <View style={styles.titleTextWrap}>
                        <AppText style={styles.subText}>{subText}</AppText>
                        <AppText style={styles.title}>{title}</AppText>
                    </View>

                    <View style={styles.progressBadge}>
                        <AppText style={styles.progressText}>{progressPercent}%</AppText>
                    </View>
                </View>

                <View style={styles.heroCard}>
                    {heroVideoUrl ? (
                        <Video
                            ref={heroVideoRef}
                            source={{ uri: heroVideoUrl }}
                            style={styles.heroVideo}
                            resizeMode="cover"
                            maxBitRate={0}
                            paused={heroPaused}
                            muted={false}
                            volume={1}
                            ignoreSilentSwitch="ignore"
                            repeat={false}
                            controls={false}
                            onLoad={(data) => {
                                setHeroDuration(data.duration ?? 0);
                            }}
                            onProgress={(data) => {
                                setHeroCurrentTime(data.currentTime ?? 0);
                            }}
                            onEnd={() => {
                                setHeroPaused(true);
                                setHeroEnded(true);
                                setHeroCurrentTime(heroDuration);
                                showHeroControls(false);
                            }}
                            onError={(error) => {
                                console.error("[RECORD_VLOG] hero video error:", error);
                                Alert.alert(t("vlog.videoPlayFailedTitle"), t("vlog.retryLater"));
                                resetHeroPlayer();
                            }}
                        />
                    ) : resolvedHeroThumbnailUrl ? (
                        <Image source={{ uri: resolvedHeroThumbnailUrl }} style={styles.heroThumbnailImage} resizeMode="cover" />
                    ) : (
                        <AppText style={styles.heroEmptyText}>{t("vlog.noRecordedVideo")}</AppText>
                    )}

                    {heroLastClipId ? (
                        <Pressable
                            style={styles.heroTouchLayer}
                            onPress={handlePressHeroBackground}
                            disabled={heroVideoLoading}
                        />
                    ) : null}

                    {heroLastClipId && shouldShowHeroCenterButton ? (
                        <AnimatedPressable
                            style={[styles.playCircle, { opacity: heroControlsOpacity }]}
                            onPress={(event) => {
                                handlePressHeroPlay(event).catch(console.error);
                            }}
                            disabled={heroVideoLoading}
                        >
                            {heroVideoLoading ? (
                                <ActivityIndicator />
                            ) : heroPaused || !heroVideoUrl || heroEnded ? (
                                <View style={styles.playTriangle} />
                            ) : (
                                <View style={styles.pauseIcon}>
                                    <View style={styles.pauseBar} />
                                    <View style={styles.pauseBar} />
                                </View>
                            )}
                        </AnimatedPressable>
                    ) : null}

                    {heroLastClipId ? (
                        <Animated.View pointerEvents={heroControlsVisible ? "auto" : "none"} style={[styles.videoControlBar, { opacity: heroControlsOpacity }]}>
                            <View
                                style={styles.videoProgressHitArea}
                                onLayout={(event) => {
                                    setHeroProgressWidth(event.nativeEvent.layout.width);
                                }}
                                onStartShouldSetResponder={() => true}
                                onMoveShouldSetResponder={() => true}
                                onResponderTerminationRequest={() => false}
                                onResponderGrant={handleHeroProgressStart}
                                onResponderMove={handleHeroProgressMove}
                                onResponderRelease={handleHeroProgressEnd}
                                onResponderTerminate={handleHeroProgressTerminate}
                            >
                                <View style={styles.videoProgressTrack}>
                                    <View style={[styles.videoProgressFill, { width: `${heroProgressPercent}%` }]} />
                                </View>
                            </View>

                            <View style={styles.timeRow}>
                                <AppText style={styles.timeText}>{heroCurrentTimeText}</AppText>
                                <AppText style={styles.timeText}>{heroDurationText}</AppText>
                            </View>
                        </Animated.View>
                    ) : null}

                    {heroVideoLoading ? (
                        <View style={styles.heroLoadingOverlay}>
                            <ActivityIndicator />
                        </View>
                    ) : null}
                </View>

                <AppText style={styles.sectionTitle}>{t("vlog.record.internshipSchedule")}</AppText>

                <View style={styles.weekList}>
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        <>
                            {weeks.map(renderWeek)}
                            {renderFreeCaptureCard()}
                        </>
                    )}
                </View>
            </ScrollView>

            <LinearGradient colors={["rgba(255, 255, 255, 0)", "#F0F6FF"]} locations={[0, 0.1469]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.bottomGradientBar} pointerEvents="none" />
            <View style={styles.editButtonWrap}>
                <Pressable style={styles.editButton} onPress={handlePressEdit}>
                    <AppText style={styles.editButtonText}>{t("vlog.editAction")}</AppText>
                </Pressable>
            </View>

            {renderCaptureResultLayer()}
            {renderCameraModal()}
            {renderMenuModal()}
            {renderDeleteModal()}
            {renderDeleteCompleteModal()}
        </SafeAreaView>
    );
}
