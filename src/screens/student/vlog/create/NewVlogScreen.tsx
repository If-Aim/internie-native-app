import React from "react";
import { ActivityIndicator, Alert, Animated, AppState, Easing, Image, InteractionManager, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { CommonActions, useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { createThumbnail } from "react-native-create-thumbnail";
import Svg, { Path } from "react-native-svg";
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, useVideoOutput } from "react-native-vision-camera";

import { getVlogCompanies, startVlogProject, type VlogCompanyResponse } from "../../../../api/vlog";
import AppText from "../../../../../AppText";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./NewVlogScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "NewVlog">;
type Step = 1 | 2;
type CameraPosition = "back" | "front";

function toLocalUri(path: string): string {
    if (path.startsWith("file://") || path.startsWith("content://") || path.startsWith("ph://") || path.startsWith("assets-library://")) return path;
    return `file://${path}`;
}

const FIXED_START_DATE = "2026-06-29";
const FIXED_END_DATE = "2026-08-07";
const FIXED_PERIOD_TEXT = "2026.06.29. ~ 2026.08.07.";

function CloseIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6L18 18" stroke="#05070A" strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
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

function VideoIcon({ color = "#808080" }: { color?: string }): React.ReactElement {
    return (
        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
            <Path d="M12.1056 8.83333H9.35556M15.8753 14.3867L20.5252 16.6771C21.0072 16.9705 21.5131 16.7976 21.5001 16.1856L21.4675 8.09104C21.4263 7.42667 21.0342 7.24539 20.4569 7.55242L15.8622 9.64057M5.25006 18.5H13.6056C14.8482 18.5 15.8556 17.5051 15.8556 16.2778L15.8753 13.4275L15.8556 7.72222C15.8556 6.49492 14.8482 5.5 13.6056 5.5H5.25006C4.00742 5.5 3.00006 6.49492 3.00006 7.72222V16.2778C3.00006 17.5051 4.00742 18.5 5.25006 18.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function DropdownArrowIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M6 9L12 15L18 9" stroke="#9A9A9A" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
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

function Header({ onClose }: { onClose: () => void }): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            <View style={styles.headerLeftSpace} />
            <AppText style={styles.appTitle}>{t("vlog.addInternship")}</AppText>
            <View style={commonStyles.iconbtn}>
                <Pressable style={commonStyles.iconbtn} onPress={onClose} accessibilityLabel={t("common.close")}>
                    <CloseIcon />
                </Pressable>
            </View>
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

export default function NewVlogScreen({ navigation }: Props): React.ReactElement {
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
    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();
    const isFocused = useIsFocused();
    const permissionRequestingRef = React.useRef(false);

    const [step, setStep] = React.useState<Step>(1);
    const [companies, setCompanies] = React.useState<VlogCompanyResponse[]>([]);
    const [companyLoading, setCompanyLoading] = React.useState(false);
    const [selectedCompanyCode, setSelectedCompanyCode] = React.useState<string | null>(null);
    const [companyDropdownOpen, setCompanyDropdownOpen] = React.useState(false);
    const [companyDropdownVisible, setCompanyDropdownVisible] = React.useState(false);
    const companyDropdownAnim = React.useRef(new Animated.Value(0)).current;
    const [onboardingRecorded, setOnboardingRecorded] = React.useState(false);
    const [onboardingThumbnailUri, setOnboardingThumbnailUri] = React.useState<string | null>(null);
    const [onboardingThumbnailRenderKey, setOnboardingThumbnailRenderKey] = React.useState(0);

    const [saving, setSaving] = React.useState(false);
    const [recording, setRecording] = React.useState(false);
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [recordSeconds, setRecordSeconds] = React.useState(0);
    const [cameraInfoOpen, setCameraInfoOpen] = React.useState(true);
    const [cameraInfoVisible, setCameraInfoVisible] = React.useState(true);
    const cameraInfoAnim = React.useRef(new Animated.Value(1)).current;
    const [cameraLayout, setCameraLayout] = React.useState({ width: 0, height: 0 });

    const selectedCompany = companies.find((company) => company.code === selectedCompanyCode) ?? null;
    const canNext = selectedCompanyCode !== null;
    const canSave = Boolean(selectedCompanyCode) && !saving && !recording;

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
            Alert.alert(t("vlog.loadFailedTitle"), t("vlog.new.companyLoadFailed"));
        } finally {
            setCompanyLoading(false);
        }
    }

    React.useEffect(() => {
        if (!recording) {
            setRecordSeconds(0);
            return;
        }

        const timer = setInterval(() => {
            setRecordSeconds((prev) => {
                if (prev >= 6) return prev;
                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [recording]);

    function toggleCompanyDropdown(): void {
        if (companyDropdownOpen) {
            setCompanyDropdownOpen(false);

            Animated.timing(companyDropdownAnim, {
                toValue: 0,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start(() => {
                setCompanyDropdownVisible(false);
            });

            return;
        }

        setCompanyDropdownVisible(true);
        setCompanyDropdownOpen(true);

        Animated.timing(companyDropdownAnim, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }

    function handleNext(): void {
        if (!canNext) {
            Alert.alert(t("vlog.new.selectCompanyTitle"), t("vlog.new.selectCompanyDesc"));
            return;
        }

        setStep(2);
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
                        console.error("[NEW_VLOG] permission request error:", error);
                        resolve(false);
                    }
                });
            });
        } finally {
            permissionRequestingRef.current = false;
        }
    }

    async function handlePressRecord(): Promise<void> {
        if (recording) return;

        const permissionGranted = await requestCapturePermissions();

        if (!permissionGranted) {
            Alert.alert(t("vlog.permissionRequiredTitle"), t("vlog.cameraMicPermissionDesc"));
            return;
        }

        if (!cameraDevice) {
            Alert.alert(t("vlog.cameraErrorTitle"), t("vlog.cameraUnavailable"));
            return;
        }

        const initialCameraInfoOpen = !isLandscape;

        setCameraInfoOpen(initialCameraInfoOpen);
        setCameraInfoVisible(initialCameraInfoOpen);
        cameraInfoAnim.setValue(initialCameraInfoOpen ? 1 : 0);
        setCameraOpen(true);
    }

    async function startCameraRecording(): Promise<void> {
        if (recording) return;

        try {
            setRecording(true);
            setRecordSeconds(0);

            const recorder = await videoOutput.createRecorder({
                maxDuration: 6,
            });

            recorderRef.current = recorder;

            await recorder.startRecording(
                (path: string) => {
                    recorderRef.current = null;
                    setRecording(false);
                    void handleRecordedVideo(path);
                },
                (error: unknown) => {
                    console.error("[NEW_VLOG] recording error:", error);
                    recorderRef.current = null;
                    setRecording(false);
                    Alert.alert(t("vlog.recordFailedTitle"), t("vlog.recordFailedDesc"));
                }
            );
        } catch (error) {
            console.error("[NEW_VLOG] start recording error:", error);
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
            console.error("[NEW_VLOG] stop recording error:", error);
        }
    }

    async function handleRecordedVideo(path: string): Promise<void> {
        try {
            setRecording(false);
            setCameraOpen(false);

            const fileUri = toLocalUri(path);

            const thumbnail = await createThumbnail({
                url: fileUri,
                timeStamp: 1000,
            });

            const thumbnailUri = toLocalUri(thumbnail.path);

            setOnboardingThumbnailUri(thumbnailUri);
            setOnboardingThumbnailRenderKey((prev) => prev + 1);
            setOnboardingRecorded(true);

            Alert.alert(t("vlog.recordCompleteTitle"), t("vlog.new.testRecordComplete"));
        } catch (error) {
            console.error("[NEW_VLOG] create thumbnail error:", error);
            Alert.alert(t("vlog.recordFailedTitle"), t("vlog.thumbnailCreateFailed"));
        } finally {
            setRecording(false);
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

    function resetToVlogHome(): void {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{name: "VlogHome",},],
            })
        );
    }

    async function handleSave(): Promise<void> {
        if (!canSave || !selectedCompanyCode || !selectedCompany) {
            Alert.alert(t("vlog.new.checkInputTitle"), t("vlog.new.selectCompanyTitle"));
            return;
        }

        if (saving) return;

        try {
            setSaving(true);

            await startVlogProject({
                companyCode: selectedCompanyCode,
                title: t("vlog.new.projectTitle", { company: selectedCompany.name }),
                startDate: FIXED_START_DATE,
                endDate: FIXED_END_DATE,
            });

            Alert.alert(t("common.saved"), t("vlog.new.savedDesc"), [
                {
                    text: t("common.confirm"),
                    onPress: resetToVlogHome,
                },
            ]);
        } catch (error) {
            console.error("[NEW_VLOG] save error:", error);
            Alert.alert(t("vlog.saveFailedTitle"), t("vlog.new.saveFailedDesc"));
        } finally {
            setSaving(false);
        }
    }

    function renderCompanyStep(): React.ReactElement {
        const dropdownRotate = companyDropdownAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "180deg"],
        });

        const dropdownMaxHeight = companyDropdownAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.min(companies.length * 56 + 15, 335)],
        });

        const dropdownOpacity = companyDropdownAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
        });

        const dropdownTranslateY = companyDropdownAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-8, 0],
        });
        return (
            <View style={styles.content}>
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>{t("vlog.new.myCompany")}</AppText>

                    {companyLoading ? (
                        <View style={styles.companyLoadingBox}>
                            <ActivityIndicator />
                        </View>
                    ) : companies.length === 0 ? (
                        <View style={styles.companyEmptyBox}>
                            <AppText style={styles.companyEmptyText}>{t("vlog.new.companyEmpty")}</AppText>
                        </View>
                    ) : (
                        <View style={styles.companyDropdownWrap}>
                            <Pressable
                                style={[
                                    styles.companyDropdownButton,
                                    companyDropdownOpen ? styles.companyDropdownButtonOpen : null,
                                ]}
                                onPress={toggleCompanyDropdown}
                            >
                            <AppText style={[styles.companyDropdownText, selectedCompany ? styles.companyDropdownTextSelected : null]}>
                                    {selectedCompany ? selectedCompany.name : t("vlog.new.companyPlaceholder")}
                                </AppText>

                                <Animated.View style={{ transform: [{ rotate: dropdownRotate }] }}>
                                    <DropdownArrowIcon />
                                </Animated.View>
                            </Pressable>

                            {companyDropdownVisible ? (
                                <Animated.View
                                    style={[
                                        styles.companyDropdownList,
                                        {
                                            maxHeight: dropdownMaxHeight,
                                            opacity: dropdownOpacity,
                                            transform: [{ translateY: dropdownTranslateY }],
                                        },
                                    ]}
                                >
                                    <View style={styles.companyDropdownListInner}>
                                        {companies.map((company) => {
                                            const selected = selectedCompanyCode === company.code;

                                            return (
                                                <Pressable
                                                    key={company.code}
                                                    style={[
                                                        styles.companyDropdownItem,
                                                        selected ? styles.companyDropdownItemActive : null,
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedCompanyCode(company.code);
                                                        toggleCompanyDropdown();
                                                    }}
                                                >
                                                    <AppText
                                                        style={[
                                                            styles.companyDropdownItemText,
                                                            selected ? styles.companyDropdownItemTextActive : null,
                                                        ]}
                                                    >
                                                        {company.name}
                                                    </AppText>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </Animated.View>
                            ) : null}
                        </View>
                    )}

                    {selectedCompany ? (<AppText style={styles.fixedPeriodText}>{FIXED_PERIOD_TEXT}</AppText>) : null}
                </View>
            </View>
        );
    }

    function renderOnboardingStep(): React.ReactElement {
        const recordButtonActive = onboardingRecorded;
        const recordButtonText = onboardingRecorded ? t("vlog.recordAgain") : t("vlog.recordAction");
        return (
            <View style={styles.content}>
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>{t("vlog.new.internshipIntro")}</AppText>
                    <AppText style={styles.sectionDescription}>{t("vlog.new.testRecordPrompt")}</AppText>

                    <View style={styles.introCard}>
                        <View style={styles.introTopRow}>
                            <View style={[styles.videoThumb, onboardingRecorded ? styles.videoThumbActive : null]}>
                                {onboardingThumbnailUri ? (
                                    <Image
                                        key={`onboarding-thumbnail-${onboardingThumbnailRenderKey}`}
                                        style={styles.videoThumbImage}
                                        source={{ uri: onboardingThumbnailUri }}
                                        resizeMode="cover"
                                        onError={(error) => {
                                            console.log("[NEW_VLOG] thumbnail image error:", error.nativeEvent);
                                        }}
                                    />
                                ) : (
                                    <VideoIcon color={onboardingRecorded ? "#0166FF" : "#808080"} />
                                )}
                            </View>

                            <View style={styles.introTextWrap}>
                                <AppText style={styles.introLabel}>{onboardingRecorded ? t("vlog.new.otRecordComplete") : t("vlog.new.otRecord")}</AppText>
                                <AppText style={styles.introDuration}>{t("vlog.sixSeconds")}</AppText>
                            </View>
                        </View>

                        <Pressable
                            style={[styles.recordButton, recordButtonActive ? styles.recordButtonActive : null]}
                            disabled={recording}
                            onPress={() => {
                                handlePressRecord().catch(console.error);
                            }}
                        >
                            <AppText style={[styles.recordButtonText, recordButtonActive ? styles.recordButtonTextActive : null]}>
                                {recordButtonText}
                            </AppText>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    }

    function toggleCameraInfo(): void {
        if (cameraInfoOpen) {
            setCameraInfoOpen(false);

            Animated.timing(cameraInfoAnim, {
                toValue: 0,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
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
            useNativeDriver: false,
        }).start();
    }

    function renderCameraModal(): React.ReactElement {
        const cameraCloseTop = insets.top + 11;
        const cameraCloseLeft = isLandscape ? insets.left + 12 : undefined;
        const cameraCloseRight = isLandscape ? undefined : 12;

        const modalWidth = cameraLayout.width > 0 ? cameraLayout.width : width;
        const modalHeight = cameraLayout.height > 0 ? cameraLayout.height : height;

        const cameraMissionCardWidth = isLandscape ? modalWidth * 0.37 : modalWidth * 0.8;
        const cameraMissionCardHeight = 96;

        const portraitMissionCardTop = cameraCloseTop + 40 + 19;
        const portraitMissionCardLeft = (modalWidth - cameraMissionCardWidth) / 2;

        const landscapeMissionCardLeft = insets.left + 36;
        const landscapeMissionCardTop = (modalHeight - cameraMissionCardHeight) / 2;

        const cameraMissionCardTop = isLandscape ? landscapeMissionCardTop : portraitMissionCardTop;
        const cameraMissionCardLeft = isLandscape ? landscapeMissionCardLeft : portraitMissionCardLeft;

        const portraitFoldLeft = (modalWidth - 32) / 2;
        const portraitFoldOpenTop = cameraMissionCardTop + cameraMissionCardHeight + 23;
        const portraitFoldClosedTop = cameraMissionCardTop;

        const landscapeFoldTop = cameraMissionCardTop + (cameraMissionCardHeight - 32) / 2;
        const landscapeFoldClosedLeft = cameraMissionCardLeft;
        const landscapeFoldOpenLeft = cameraMissionCardLeft + cameraMissionCardWidth + 14;

        const cameraCardWidth = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [0, cameraMissionCardWidth] : [cameraMissionCardWidth, cameraMissionCardWidth],
        });

        const cameraCardHeight = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [cameraMissionCardHeight, cameraMissionCardHeight] : [0, cameraMissionCardHeight],
        });

        const cameraCardOpacity = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
        });

        const cameraCardTranslateY = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [0, 0] : [-8, 0],
        });

        const cameraFoldButtonTop = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [landscapeFoldTop, landscapeFoldTop] : [portraitFoldClosedTop, portraitFoldOpenTop],
        });

        const cameraFoldButtonLeft = cameraInfoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: isLandscape ? [landscapeFoldClosedLeft, landscapeFoldOpenLeft] : [portraitFoldLeft, portraitFoldLeft],
        });

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
                                style={[
                                    styles.cameraMissionCard,
                                    isLandscape ? styles.cameraMissionCardLandscape : styles.cameraMissionCardPortrait,
                                    {
                                        top: cameraMissionCardTop,
                                        left: cameraMissionCardLeft,
                                        width: cameraCardWidth,
                                        height: cameraCardHeight,
                                        opacity: cameraCardOpacity,
                                        overflow: "hidden",
                                        transform: [{ translateY: cameraCardTranslateY }],
                                    },
                                ]}
                            >
                                <AppText style={styles.cameraMissionTitle}>
                                    {t("vlog.new.onboardingMission")}
                                </AppText>

                                <AppText style={styles.cameraMissionDuration}>
                                    {t("vlog.sixSeconds")}
                                </AppText>
                            </Animated.View>
                        ) : null}

                        <Animated.View
                            style={[
                                styles.cameraFoldButton,
                                {
                                    left: cameraFoldButtonLeft,
                                    top: cameraFoldButtonTop,
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

                        <View
                            style={[
                                styles.cameraRecordArea,
                                isLandscape ? styles.cameraRecordAreaLandscape : styles.cameraRecordAreaPortrait,
                            ]}
                        >
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
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <Header onClose={() => navigation.goBack()} />

            {step === 1 ? renderCompanyStep() : renderOnboardingStep()}

            <View style={styles.bottomBar}>
                {step === 1 ? (
                    <Pressable style={[styles.saveButton, canNext ? styles.nextButtonActive : null]} onPress={handleNext}>
                        <AppText style={[styles.saveButtonText, canNext ? styles.nextButtonTextActive : null]}>{t("vlog.next")}</AppText>
                    </Pressable>
                ) : (
                    <Pressable
                        style={[styles.saveButton, canSave ? styles.saveButtonActive : null]}
                        disabled={!canSave}
                        onPress={() => {
                            handleSave().catch(console.error);
                        }}
                    >
                        <AppText style={[styles.saveButtonText, canSave ? styles.saveButtonTextActive : null]}>
                            {saving ? t("vlog.saving") : t("common.save")}
                        </AppText>
                    </Pressable>
                )}
            </View>
            {renderCameraModal()}
        </SafeAreaView>
    );
}
