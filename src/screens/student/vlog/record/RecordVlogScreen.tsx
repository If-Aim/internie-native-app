import React from "react";
import { ActivityIndicator, Alert, Animated, Easing, Image, Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import type { GestureResponderEvent } from "react-native";
import Video, { type VideoRef } from "react-native-video";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { createThumbnail } from "react-native-create-thumbnail";
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, useVideoOutput } from "react-native-vision-camera";
import Svg, { Path } from "react-native-svg";
import { BlurView } from "@react-native-community/blur";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "../../../../../AppText";
import { uploadFileToPresignedUrl } from "../../../../api/client";
import { completeMissionClip, createFreeClip, createVlogUploadUrl, deleteVlogProject, getVlogClipPlayUrl, getVlogProjectDetail, replaceMissionClip, type VlogClipCompleteInput, type VlogResponse } from "../../../../api/vlog";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./RecordVlogScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "RecordVlog">;

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

function formatTodayText(): string {
    const today = new Date();

    return `${today.getMonth() + 1}월 ${today.getDate()}일`;
}

function getCurrentWeekText(startDate?: string | null): string { // 오늘날 기준week 계산
    const start = parseApiDate(startDate);

    if (!start) {
        return `1주차, ${formatTodayText()}`;
    }

    const today = startOfDay(new Date());
    const startDay = startOfDay(start);
    const diffDays = Math.max(0, Math.floor((today.getTime() - startDay.getTime()) / 86400000));
    const week = Math.floor(diffDays / 7) + 1;

    return `${week}주차, ${formatTodayText()}`;
}

function formatMissionDuration(seconds?: number | null): string {
    const safeSeconds = Number.isFinite(seconds ?? NaN) ? Math.max(0, seconds ?? 0) : 0;

    return `${safeSeconds}초`;
}

function groupMissionsByWeek(missions: VlogResponse[]): WeekItem[] {
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
                        title: mission.title ?? "브이로그 미션",
                        durationText: formatMissionDuration(mission.durationSec),
                        background: mission.description ?? "미션 설명이 없습니다.",
                        composition: mission.tip ?? "자유롭게 촬영해주세요.",
                        completed: missionStatus === "COMPLETED",
                        locked: missionStatus === "LOCKED",
                        clipId: mission.lastClipId ?? null,
                        thumbnailUrl: mission.lastClipThumbnailUrl ?? mission.thumbnailUrl ?? null,
                    };
                });
                const completedCount = missionItems.filter((mission) => mission.completed).length;

                return {
                    id: `week-${week}`,
                    week,
                    dateText: formatTodayText(),
                    completedCount,
                    totalCount: missionItems.length,
                    description: `${week}주차에 진행할 브이로그 미션입니다.`,
                    missions: missionItems,
                };
            });
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

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onBackClick} accessibilityLabel="뒤로가기">
                <BackIcon />
            </Pressable>
            <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel="메뉴">
                <ThreeDotIcon />
            </Pressable>
        </View>
    );
}

function CameraCloseButton({ top, left, right, onClose }: { top: number; left?: number; right?: number; onClose: () => void }): React.ReactElement {
    return (
        <View style={[styles.cameraCloseButtonWrap, { top, left, right }]}>
            <Pressable style={styles.cameraCloseIconBox} onPress={onClose} accessibilityLabel="카메라 닫기">
                <CameraCloseIcon />
            </Pressable>
        </View>
    );
}

export default function RecordVlogScreen({ navigation, route }: Props): React.ReactElement {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isLandscape = width > height;

    const cameraDevice = useCameraDevice("back");
    const videoOutput = useVideoOutput({ enableAudio: true, fileType: "mp4" });
    const recorderRef = React.useRef<any>(null);
    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();

    const projectId = route.params.projectId;
    const [title, setTitle] = React.useState(route.params?.title ?? "인턴십A");
    const [subText, setSubText] = React.useState(route.params?.subText ?? "");
    const [progressPercent, setProgressPercent] = React.useState(route.params?.progressPercent ?? 0);
    const [completedMissionCount, setCompletedMissionCount] = React.useState(route.params?.completedMissionCount ?? 0);
    const [totalMissionCount, setTotalMissionCount] = React.useState(route.params?.totalMissionCount ?? 0);
    const [weeks, setWeeks] = React.useState<WeekItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [savingClip, setSavingClip] = React.useState(false);
    const [openedWeekId, setOpenedWeekId] = React.useState<string | null>(null);
    const recordingCompleted = totalMissionCount > 0 && completedMissionCount >= totalMissionCount;

    const [menuModalOpen, setMenuModalOpen] = React.useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [deleteCompleteModalOpen, setDeleteCompleteModalOpen] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [heroThumbnailUrl, setHeroThumbnailUrl] = React.useState<string | null>(null);
    const [heroThumbnailOverrideUri, setHeroThumbnailOverrideUri] = React.useState<string | null>(null);
    const [missionThumbnailOverrides, setMissionThumbnailOverrides] = React.useState<Record<string, string>>({});
    const [freeThumbnailUri, setFreeThumbnailUri] = React.useState<string | null>(null);

    const captureVideoRef = React.useRef<VideoRef>(null);
    const captureControlsHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [captureVideoUrl, setCaptureVideoUrl] = React.useState<string | null>(null);
    const [captureVideoLoading, setCaptureVideoLoading] = React.useState(false);
    const [capturePaused, setCapturePaused] = React.useState(true);
    const [captureEnded, setCaptureEnded] = React.useState(false);
    const [captureControlsVisible, setCaptureControlsVisible] = React.useState(true);
    const [captureCurrentTime, setCaptureCurrentTime] = React.useState(0);
    const [captureDuration, setCaptureDuration] = React.useState(0);

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
        isFinalMission: boolean;
    } | null>(null);
    const [uploadingCaptureClip, setUploadingCaptureClip] = React.useState(false);

    const freeCaptureItem: FreeCaptureItem = {
        id: "free-capture",
        title: "나의 일상을 자유롭게 기록해볼까요?",
        durationText: "6초",
        thumbnailUrl: null,
    };

    const [captureResult, setCaptureResult] = React.useState<{
        visible: boolean;
        mission: MissionItem | null;
        type: "MISSION" | "FREE";
        thumbnailUri: string | null;
        videoUri: string | null;
        clipInput: VlogClipCompleteInput | null;
        isFinalMission: boolean;
    }>({
        visible: false,
        mission: null,
        type: "MISSION",
        thumbnailUri: null,
        videoUri: null,
        clipInput: null,
        isFinalMission: false,
    });

    React.useEffect(() => {
        return () => {
            clearCaptureControlsTimer();
        };
    }, []);

    React.useEffect(() => {
        void loadProjectDetail();
    }, [projectId]);

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
            setSubText(getCurrentWeekText(detail.startDate));
            setProgressPercent(detail.progressPercent ?? 0);
            setCompletedMissionCount(detail.completedMissionCount ?? 0);
            setTotalMissionCount(detail.totalMissionCount ?? 0);
            setHeroThumbnailUrl(detail.lastClipThumbnailUrl ?? detail.thumbnailUrl ?? null);
            setWeeks(groupMissionsByWeek(missions));
        } catch (error) {
            console.error("[RECORD_VLOG] load project error:", error);
            Alert.alert("불러오기 실패", "브이로그 정보를 불러오지 못했습니다.");
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
 
    function formatMissionDurationToPlayerTime(value?: string | null): string {
        const seconds = Number(String(value ?? "").replace(/[^0-9]/g, ""));

        if (!Number.isFinite(seconds) || seconds <= 0) {
            return "00:00";
        }

        return formatPlayerTime(seconds);
    }

    function clearCaptureControlsTimer(): void {
        if (captureControlsHideTimerRef.current) {
            clearTimeout(captureControlsHideTimerRef.current);
            captureControlsHideTimerRef.current = null;
        }
    }

    function showCaptureControls(autoHide: boolean): void {
        clearCaptureControlsTimer();
        setCaptureControlsVisible(true);

        if (!autoHide) {
            return;
        }

        captureControlsHideTimerRef.current = setTimeout(() => {
            setCaptureControlsVisible(false);
        }, 2000);
    }

    function resetCapturePlayer(): void {
        clearCaptureControlsTimer();
        setCaptureVideoUrl(null);
        setCaptureVideoLoading(false);
        setCapturePaused(true);
        setCaptureEnded(false);
        setCaptureControlsVisible(true);
        setCaptureCurrentTime(0);
        setCaptureDuration(0);
    }

    async function loadCaptureVideoUrl(): Promise<string | null> {
        if (captureResult.videoUri) {
            return captureResult.videoUri;
        }

        const clipId = captureResult.mission?.clipId;

        if (!clipId) {
            Alert.alert("재생할 영상이 없습니다.", "아직 저장된 영상이 없거나 촬영 영상 주소가 없습니다.");
            return null;
        }

        try {
            const response = await getVlogClipPlayUrl(projectId, clipId);

            if (!response.url) {
                Alert.alert("재생할 영상이 없습니다.", "영상 URL을 불러오지 못했습니다.");
                return null;
            }

            return response.url;
        } catch (error) {
            console.error("[RECORD_VLOG] capture play url error:", error);
            Alert.alert("영상을 불러오지 못했습니다.", "잠시 후 다시 시도해주세요.");
            return null;
        }
    }

    async function handlePressCapturePlay(event: GestureResponderEvent): Promise<void> {
        event.stopPropagation();

        if (captureVideoUrl) {
            if (captureEnded) {
                captureVideoRef.current?.seek(0);
                setCaptureCurrentTime(0);
                setCaptureEnded(false);
                setCapturePaused(false);
                showCaptureControls(true);
                return;
            }

            const nextPaused = !capturePaused;

            setCapturePaused(nextPaused);
            showCaptureControls(!nextPaused);
            return;
        }

        setCaptureVideoLoading(true);

        try {
            const url = await loadCaptureVideoUrl();

            if (!url) return;

            setCaptureVideoUrl(url);
            setCapturePaused(false);
            setCaptureEnded(false);
            setCaptureCurrentTime(0);
            setCaptureDuration(0);
            showCaptureControls(true);
        } finally {
            setCaptureVideoLoading(false);
        }
    }

    function handlePressCaptureBackground(event: GestureResponderEvent): void {
        event.stopPropagation();

        if (captureVideoUrl && !capturePaused && !captureEnded) {
            showCaptureControls(true);
        }
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
            Alert.alert("삭제 실패", "브이로그를 삭제하지 못했습니다.");
        } finally {
            setDeleting(false);
        }
    }

    function createTempClipInput(mission: MissionItem): VlogClipCompleteInput {
        return {
            fileKey: `vlogs/temp/${projectId}/${mission.id}-${Date.now()}.mp4`,
            originalName: `${mission.id}.mp4`,
            contentType: "video/mp4",
            sizeBytes: 0,
            durationSeconds: Number(mission.durationText.replace(/[^0-9]/g, "")) || 0,
            thumbnailKey: null,
        };
    }

    function isFinalMission(missionId: string): boolean {
        const allMissions = weeks.flatMap((week) => week.missions);
        const lastMission = allMissions[allMissions.length - 1];

        return lastMission?.id === missionId;
    }

    function parseDurationText(value?: string | null): number {
        const seconds = Number(String(value ?? "").replace(/[^0-9]/g, ""));

        if (!Number.isFinite(seconds) || seconds <= 0) {
            return 6;
        }

        return seconds;
    }

    function getCaptureMaxDurationSeconds(): number {
        if (captureTarget?.type === "FREE") {
            return 6;
        }

        return parseDurationText(captureTarget?.mission?.durationText);
    }

    async function openCaptureCamera(target: { type: "MISSION" | "FREE"; mission: MissionItem | null; isFinalMission: boolean }): Promise<void> {
        if (recording || uploadingCaptureClip) return;

        const cameraGranted = hasCameraPermission || await requestCameraPermission();
        const microphoneGranted = hasMicrophonePermission || await requestMicrophonePermission();

        if (!cameraGranted || !microphoneGranted) {
            Alert.alert("권한이 필요합니다.", "브이로그 촬영을 위해 카메라와 마이크 권한이 필요합니다.");
            return;
        }

        if (!cameraDevice) {
            Alert.alert("카메라 오류", "사용 가능한 카메라를 찾지 못했습니다.");
            return;
        }

        resetCapturePlayer();
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
                    Alert.alert("촬영 실패", "영상을 촬영하지 못했습니다.");
                }
            );
        } catch (error) {
            console.error("[RECORD_VLOG] start recording error:", error);
            recorderRef.current = null;
            setRecording(false);
            Alert.alert("촬영 실패", "영상을 촬영하지 못했습니다.");
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
            Alert.alert("촬영 중입니다.", "촬영 중에는 카메라를 닫을 수 없습니다.");
            return;
        }

        setCameraOpen(false);
    }

    function handlePressRecord(mission: MissionItem): void {
        const finalMission = isFinalMission(mission.id);

        openCaptureCamera({
            type: "MISSION",
            mission,
            isFinalMission: finalMission,
        }).catch(console.error);
    }

    async function handleRecordedVideo(path: string): Promise<void> {
        if (!captureTarget) return;

        try {
            setRecording(false);
            setUploadingCaptureClip(true);
            setCameraOpen(false);

            const fileUri = toLocalUri(path);
            const now = Date.now();
            const prefix = captureTarget.type === "FREE" ? "free" : captureTarget.mission?.id ?? "mission";
            const fileName = `${prefix}_${now}.mp4`;
            const contentType = "video/mp4";
            const thumbnailFileName = `${prefix}_thumbnail_${now}.jpg`;
            const thumbnailContentType = "image/jpeg";
            const durationSeconds = getCaptureMaxDurationSeconds();

            const thumbnail = await createThumbnail({
                url: fileUri,
                timeStamp: 1000,
            });

            const thumbnailUri = toLocalUri(thumbnail.path);

            const upload = await createVlogUploadUrl({
                projectId,
                fileName,
                contentType,
                type: "VIDEO",
            });

            if (!upload.uploadUrl || !upload.fileKey) {
                Alert.alert("업로드 실패", "영상 업로드 URL을 발급받지 못했습니다.");
                return;
            }

            await uploadFileToPresignedUrl(upload.uploadUrl, fileUri, contentType);

            const thumbnailUpload = await createVlogUploadUrl({
                projectId,
                fileName: thumbnailFileName,
                contentType: thumbnailContentType,
                type: "THUMBNAIL",
            });

            if (!thumbnailUpload.uploadUrl || !thumbnailUpload.fileKey) {
                Alert.alert("업로드 실패", "썸네일 업로드 URL을 발급받지 못했습니다.");
                return;
            }

            await uploadFileToPresignedUrl(thumbnailUpload.uploadUrl, thumbnailUri, thumbnailContentType);

            const clipInput: VlogClipCompleteInput = {
                fileKey: upload.fileKey,
                originalName: fileName,
                contentType,
                sizeBytes: null,
                durationSeconds,
                thumbnailKey: thumbnailUpload.fileKey,
                customTitle: captureTarget.type === "FREE" ? "내 자리" : null,
            };

            setCaptureResult({
                visible: true,
                mission: captureTarget.mission,
                type: captureTarget.type,
                thumbnailUri,
                videoUri: fileUri,
                clipInput,
                isFinalMission: captureTarget.isFinalMission,
            });

            if (captureTarget.mission) {
                setMissionThumbnailOverrides((prev) => ({
                    ...prev,
                    [captureTarget.mission?.id ?? ""]: thumbnailUri,
                }));
            }

            if (captureTarget.type === "FREE") {
                setFreeThumbnailUri(thumbnailUri);
            }

            setHeroThumbnailOverrideUri(thumbnailUri);
        } catch (error) {
            console.error("[RECORD_VLOG] upload recorded video error:", error);
            Alert.alert("업로드 실패", "촬영한 영상을 업로드하지 못했습니다.");
        } finally {
            setRecording(false);
            setUploadingCaptureClip(false);
        }
    }

    async function handleConfirmClip(): Promise<void> {
        if (savingClip) return;

        if (!captureResult.clipInput) {
            Alert.alert("저장 실패", "촬영한 영상 정보가 없습니다.");
            return;
        }

        try {
            setSavingClip(true);

            if (captureResult.type === "FREE") {
                await createFreeClip(projectId, {
                    ...captureResult.clipInput,
                    customTitle: "내 자리",
                });
            } else {
                if (!captureResult.mission) return;

                if (captureResult.mission.completed) {
                    await replaceMissionClip(projectId, captureResult.mission.id, captureResult.clipInput);
                } else {
                    await completeMissionClip(projectId, captureResult.mission.id, captureResult.clipInput);
                }
            }

            setCaptureResult({
                visible: false,
                mission: null,
                type: "MISSION",
                thumbnailUri: null,
                videoUri: null,
                clipInput: null,
                isFinalMission: false,
            });

            resetCapturePlayer();
            await loadProjectDetail();
        } catch (error) {
            console.error("[RECORD_VLOG] save clip error:", error);
            Alert.alert("저장 실패", "촬영한 영상을 저장하지 못했습니다.");
        } finally {
            setSavingClip(false);
        }
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

    function getNextMission(): MissionItem | null {
        const allMissions = weeks.flatMap((week) => week.missions);

        return allMissions.find((mission) => !mission.completed && !mission.locked) ?? allMissions[allMissions.length - 1] ?? null;
    }

    function handlePressHeroRecord(): void {
        const nextMission = getNextMission();

        if (!nextMission) {
            Alert.alert("촬영할 미션이 없습니다.", "등록된 미션이 없습니다.");
            return;
        }

        handlePressRecord(nextMission);
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

    function onboardingComplete(): boolean {
        return weeks.some((week) => week.missions.some((mission) => mission.completed));
    }

    function handlePressFreeCapture(): void {
        openCaptureCamera({
            type: "FREE",
            mission: null,
            isFinalMission: false,
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
                        <AppText style={styles.missionBadgeText}>배경</AppText>
                    </View>
                    <AppText style={styles.missionDesc}>{mission.background}</AppText>
                </View>

                <View style={styles.missionInfoRow}>
                    <View style={styles.missionBadge}>
                        <AppText style={styles.missionBadgeText}>구도</AppText>
                    </View>
                    <AppText style={styles.missionDesc}>{mission.composition}</AppText>
                </View>

                <Pressable
                    style={[styles.missionRecordButton, mission.completed ? styles.missionRecordButtonActive : null]}
                    disabled={mission.locked}
                    onPress={() => handlePressRecord(mission)}
                >
                    <AppText style={[styles.missionRecordText, mission.completed ? styles.missionRecordTextActive : null]}>
                        {mission.locked ? "이전 미션을 먼저 완료해주세요" : mission.completed ? "재촬영하기" : "촬영하기"}
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
                        <AppText style={styles.weekTitle}>{week.week}주차</AppText>
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

    function renderCaptureResultLayer(): React.ReactElement | null {
        if (!captureResult.visible) return null;

        const hasThumbnail = !!captureResult.thumbnailUri;
        const hasPlayerSource = !!captureVideoUrl;
        const safeCurrentTime = captureDuration > 0 ? Math.min(captureCurrentTime, captureDuration) : captureCurrentTime;
        const progressPercent = captureDuration > 0 ? Math.min(100, Math.max(0, (safeCurrentTime / captureDuration) * 100)) : 0;
        const currentTimeText = hasPlayerSource ? formatPlayerTime(safeCurrentTime) : "00:00";
        const durationText = captureDuration > 0 ? formatPlayerTime(Math.ceil(captureDuration)) : formatMissionDurationToPlayerTime(captureResult.mission?.durationText);
        const shouldShowCenterButton = captureVideoLoading || !hasPlayerSource || capturePaused || captureEnded || captureControlsVisible;

        return (
            <View style={styles.captureOverlay}>
                <Pressable style={styles.capturePlayerArea} onPress={handlePressCaptureBackground}>
                    {hasPlayerSource ? (
                        <Video
                            ref={captureVideoRef}
                            source={{ uri: captureVideoUrl }}
                            style={styles.captureVideo}
                            resizeMode="cover"
                            paused={capturePaused}
                            repeat={false}
                            controls={false}
                            onLoad={(data) => {
                                setCaptureDuration(data.duration ?? 0);
                            }}
                            onProgress={(data) => {
                                setCaptureCurrentTime(data.currentTime ?? 0);
                            }}
                            onEnd={() => {
                                setCapturePaused(true);
                                setCaptureEnded(true);
                                setCaptureCurrentTime(captureDuration);
                                showCaptureControls(false);
                            }}
                            onError={(error) => {
                                console.error("[RECORD_VLOG] capture video error:", error);
                                Alert.alert("영상 재생에 실패했습니다.", "잠시 후 다시 시도해주세요.");
                                resetCapturePlayer();
                            }}
                        />
                    ) : hasThumbnail ? (
                        <Image source={{ uri: captureResult.thumbnailUri as string }} style={styles.captureThumbnail} resizeMode="cover" />
                    ) : (
                        <View style={styles.captureFallback} />
                    )}

                    {captureVideoLoading ? (
                        <View style={styles.captureLoadingOverlay}>
                            <ActivityIndicator />
                        </View>
                    ) : null}
                </Pressable>

                <Pressable
                    style={styles.captureCloseButton}
                    onPress={() => {
                        resetCapturePlayer();
                        setCaptureResult((prev) => ({ ...prev, visible: false }));
                    }}
                >
                    <AppText style={styles.captureCloseText}>×</AppText>
                </Pressable>

                {!hasPlayerSource ? (
                    <View style={styles.captureCenter}>
                        <View style={styles.captureCheckCircle}>
                            <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
                                <Path d="M7 12L10.2 15.2L17 8.4" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </View>
                        <AppText style={styles.captureTitle}>촬영완료!</AppText>
                    </View>
                ) : null}

                {shouldShowCenterButton ? (
                    <Pressable style={styles.capturePlayCircle} onPress={handlePressCapturePlay} disabled={captureVideoLoading}>
                        {captureVideoLoading ? (
                            <ActivityIndicator />
                        ) : capturePaused || !hasPlayerSource || captureEnded ? (
                            <View style={styles.capturePlayTriangle} />
                        ) : (
                            <View style={styles.capturePauseIcon}>
                                <View style={styles.capturePauseBar} />
                                <View style={styles.capturePauseBar} />
                            </View>
                        )}
                    </Pressable>
                ) : null}

                <View style={styles.captureVideoControlBar}>
                    <View style={styles.captureVideoProgressTrack}>
                        <View style={[styles.captureVideoProgressFill, { width: `${progressPercent}%` }]} />
                    </View>

                    <View style={styles.captureTimeRow}>
                        <AppText style={styles.captureTimeText}>{currentTimeText}</AppText>
                        <AppText style={styles.captureTimeText}>{durationText}</AppText>
                    </View>
                </View>

                <View style={styles.captureBottom}>
                    <Pressable
                        style={styles.captureAgainButton}
                        onPress={() => {
                            resetCapturePlayer();
                            setCaptureResult((prev) => ({ ...prev, visible: false }));
                        }}
                    >
                        <AppText style={styles.captureAgainText}>다시 촬영하기</AppText>
                    </Pressable>

                    <Pressable style={styles.captureNextButton} onPress={handleConfirmClip} disabled={savingClip}>
                        <AppText style={styles.captureNextText}>{savingClip ? "저장 중..." : captureResult.isFinalMission ? "저장 후 편집하기" : "완료하기"}</AppText>
                    </Pressable>
                </View>
            </View>
        );
    }

    function renderCameraModal(): React.ReactElement {
        const cameraCloseTop = insets.top + 11;
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

        const missionTitle = captureTarget?.type === "FREE" ? "자율 촬영" : captureTarget?.mission?.title ?? "브이로그 미션";
        const missionDuration = captureTarget?.type === "FREE" ? "6초" : captureTarget?.mission?.durationText ?? "6초";
        const missionBackground = captureTarget?.mission?.background ?? "나의 인턴십 과정을 자유롭게 촬영해보세요.";
        const missionComposition = captureTarget?.mission?.composition ?? "자유롭게 촬영해주세요.";

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
                                                <AppText style={styles.cameraMissionBadgeText}>배경</AppText>
                                            </View>
                                            <AppText style={styles.cameraMissionDesc}>{missionBackground}</AppText>
                                        </View>

                                        <View style={styles.cameraMissionInfoRow}>
                                            <View style={styles.cameraMissionBadge}>
                                                <AppText style={styles.cameraMissionBadgeText}>구도</AppText>
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

                            {recording ? (
                                <AppText style={styles.cameraRecordTime}>{recordSeconds}/{getCaptureMaxDurationSeconds()}초</AppText>
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
                    <CheckCircleIcon active={onboardingComplete()} />

                    <View style={styles.weekTitleWrap}>
                        <AppText style={styles.weekTitle}>자율 촬영</AppText>
                    </View>

                    <ChevronIcon open={true} />
                </View>

                <View style={styles.weekBody}>
                    <AppText style={styles.weekDesc}>나의 인턴십 과정을 자유롭게 촬영해보세요. 하루에 2번만 가능해요.</AppText>

                    <View style={styles.missionCard}>
                        <View style={styles.missionTopRow}>
                            <View style={[styles.missionThumb, freeThumbnailUri ? styles.missionThumbDone : null]}>
                                {freeThumbnailUri ? (
                                    <Image source={{ uri: freeThumbnailUri }} style={styles.missionThumbImage} resizeMode="cover" />
                                ) : (
                                    <VideoIcon />
                                )}
                            </View>

                            <View style={styles.missionTitleWrap}>
                                <AppText style={styles.missionTitle}>{freeCaptureItem.title}</AppText>
                                <AppText style={styles.missionDuration}>{freeCaptureItem.durationText}</AppText>
                            </View>
                        </View>

                        <Pressable style={styles.missionRecordButtonActive} onPress={handlePressFreeCapture}>
                            <AppText style={styles.missionRecordTextActive}>촬영하기</AppText>
                        </Pressable>
                    </View>
                </View>
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
                        <AppText style={styles.menuDeleteText}>삭제하기</AppText>
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
                        <AppText style={styles.deleteModalTitle}>브이로그를 삭제하시겠어요?</AppText>
                        <View style={styles.deleteModalButtonRow}>
                            <Pressable
                                style={styles.deleteConfirmButton}
                                disabled={deleting}
                                onPress={() => {
                                    handleDeleteProject().catch(console.error);
                                }}
                            >
                                <AppText style={styles.deleteConfirmText}>{deleting ? "삭제 중..." : "예"}</AppText>
                            </Pressable>
                            <Pressable style={styles.deleteCancelButton} onPress={() => setDeleteModalOpen(false)} disabled={deleting}>
                                <AppText style={styles.deleteCancelText}>아니요</AppText>
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
                        <AppText style={styles.deleteCompleteModalTitle}>브이로그가 삭제되었어요</AppText>

                        <Pressable
                            style={styles.deleteCompleteButton}
                            onPress={() => {
                                setDeleteCompleteModalOpen(false);
                                navigation.goBack();
                            }}
                        >
                            <AppText style={styles.deleteCompleteButtonText}>확인</AppText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    }

    const resolvedHeroThumbnailUrl = heroThumbnailOverrideUri ?? heroThumbnailUrl;
    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <Header onBackClick={() => navigation.goBack()} onMenuClick={() => setMenuModalOpen(true)} />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                    {resolvedHeroThumbnailUrl ? (
                        <Image source={{ uri: resolvedHeroThumbnailUrl }} style={styles.heroThumbnailImage} resizeMode="cover" />
                    ) : null}

                    <Pressable style={styles.heroPlayButton} onPress={handlePressHeroRecord}>
                        <View style={styles.heroPlayTriangle} />
                    </Pressable>
                </View>

                <AppText style={styles.sectionTitle}>인턴십 일정</AppText>

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

            <View style={styles.bottomBar}>
                <Pressable style={styles.editButton} onPress={handlePressEdit}>
                    <AppText style={styles.editButtonText}>편집하기</AppText>
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