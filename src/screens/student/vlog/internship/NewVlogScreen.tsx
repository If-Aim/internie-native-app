import React from "react";
import { ActivityIndicator, Alert, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, useVideoOutput } from "react-native-vision-camera";

import { uploadFileToPresignedUrl } from "../../../../api/client";
import { createVlogPreProjectUploadUrl, getVlogCompanies, startVlogProject, type VlogClipCompleteInput, type VlogCompanyResponse, } from "../../../../api/vlog";
import AppText from "../../../../../AppText";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./NewVlogScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "NewVlog">;
type Step = 1 | 2;

function toFileUri(path: string): string {
    return path.startsWith("file://") ? path : `file://${path}`;
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
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6L18 18" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
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

function DropdownArrowIcon({ open }: { open: boolean }): React.ReactElement {
    const path = open ? "M6 15L12 9L18 15" : "M6 9L12 15L18 9";

    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d={path} stroke="#5F5F5F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const cameraDevice = useCameraDevice("back");
    const videoOutput = useVideoOutput({ enableAudio: true, fileType: "mp4" });
    const recorderRef = React.useRef<any>(null);
    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();

    const [step, setStep] = React.useState<Step>(1);
    const [companies, setCompanies] = React.useState<VlogCompanyResponse[]>([]);
    const [companyLoading, setCompanyLoading] = React.useState(false);
    const [selectedCompanyCode, setSelectedCompanyCode] = React.useState<string | null>(null);
    const [companyDropdownOpen, setCompanyDropdownOpen] = React.useState(false);
    const [onboardingClip, setOnboardingClip] = React.useState<VlogClipCompleteInput | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [recording, setRecording] = React.useState(false);
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [recordSeconds, setRecordSeconds] = React.useState(0);
    const [cameraInfoOpen, setCameraInfoOpen] = React.useState(true);

    const selectedCompany = companies.find((company) => company.code === selectedCompanyCode) ?? null;
    const canNext = selectedCompanyCode !== null;
    const canSave = selectedCompanyCode !== null && onboardingClip !== null && !saving && !recording;

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

    function handleNext(): void {
        if (!canNext) {
            Alert.alert("회사를 선택해주세요.", "인턴십을 진행하는 회사를 먼저 선택해주세요.");
            return;
        }

        setStep(2);
    }

    async function handlePressRecord(): Promise<void> {
        if (recording) return;

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

        setCameraInfoOpen(true);
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
                    void handleRecordedVideo(path);
                },
                (error: unknown) => {
                    console.error("[NEW_VLOG] recording error:", error);
                    recorderRef.current = null;
                    setRecording(false);
                    Alert.alert("촬영 실패", "영상을 촬영하지 못했습니다.");
                }
            );
        } catch (error) {
            console.error("[NEW_VLOG] start recording error:", error);
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
            console.error("[NEW_VLOG] stop recording error:", error);
        }
    }

    async function handleRecordedVideo(path: string): Promise<void> {
        try {
            const fileUri = toFileUri(path);
            const fileName = `onboarding_${Date.now()}.mp4`;
            const contentType = "video/mp4";
            const durationSeconds = 6; // 인턴십 영상 최대 길이 (s)

            setRecording(false);
            setCameraOpen(false);

            const upload = await createVlogPreProjectUploadUrl({
                fileName,
                contentType,
                type: "VIDEO",
            });

            if (!upload.uploadUrl || !upload.fileKey) {
                Alert.alert("업로드 실패", "영상 업로드 URL을 발급받지 못했습니다.");
                return;
            }

            await uploadFileToPresignedUrl(upload.uploadUrl, fileUri, contentType);

            setOnboardingClip({
                fileKey: upload.fileKey,
                originalName: fileName,
                contentType,
                sizeBytes: null,
                durationSeconds,
                thumbnailKey: null,
                customTitle: "인턴십 온보딩 현장 촬영하기",
            });

            Alert.alert("촬영 완료", "온보딩 현장 영상이 등록되었습니다.");
        } catch (error) {
            console.error("[NEW_VLOG] upload recorded video error:", error);
            Alert.alert("업로드 실패", "온보딩 현장 영상을 업로드하지 못했습니다.");
        } finally {
            setRecording(false);
        }
    }

    async function handleSave(): Promise<void> {
        if (!canSave || !selectedCompanyCode || !selectedCompany || !onboardingClip) {
            Alert.alert("입력값을 확인해주세요.", "회사 선택과 온보딩 현장 촬영을 완료해주세요.");
            return;
        }

        if (saving) return;

        try {
            setSaving(true);

            await startVlogProject({
                companyCode: selectedCompanyCode,
                title: `${selectedCompany.name} 인턴십`,
                startDate: FIXED_START_DATE,
                endDate: FIXED_END_DATE,
                onboardingClip,
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

    function renderCompanyStep(): React.ReactElement {
        return (
            <View style={styles.content}>
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>나의 회사</AppText>

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
                                    {selectedCompany ? selectedCompany.name : "회사를 선택하세요"}
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

                    {selectedCompany ? (
                        <AppText style={styles.fixedPeriodText}>{FIXED_PERIOD_TEXT}</AppText>
                    ) : null}
                </View>
            </View>
        );
    }

    function renderOnboardingStep(): React.ReactElement {
        return (
            <View style={styles.content}>
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>인턴십 소개</AppText>
                    <AppText style={styles.sectionDescription}>나의 인턴 브이로그에 들어갈 첫 번째 장면이에요.</AppText>

                    <View style={styles.introCard}>
                        <View style={styles.introTopRow}>
                            <View style={[styles.videoThumb, onboardingClip ? styles.videoThumbActive : null]}>
                                <VideoIcon color={onboardingClip ? "#0166FF" : "#808080"} />
                            </View>

                            <View style={styles.introTextWrap}>
                                <AppText style={styles.introLabel}>{onboardingClip ? "온보딩 현장 촬영 완료" : "인턴십 온보딩 현장 촬영하기"}</AppText>
                                <AppText style={styles.introDuration}>{onboardingClip?.durationSeconds ? `${onboardingClip.durationSeconds}초` : "6초"}</AppText>
                            </View>
                        </View>

                        <Pressable
                            style={[styles.recordButton, onboardingClip ? styles.recordButtonActive : null]}
                            disabled={recording}
                            onPress={() => {
                                handlePressRecord().catch(console.error);
                            }}
                        >
                            <AppText style={[styles.recordButtonText, onboardingClip ? styles.recordButtonTextActive : null]}>
                                {recording ? "업로드 중..." : onboardingClip ? "재촬영하기" : "촬영하기"}
                            </AppText>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    }

    function renderCameraModal(): React.ReactElement {
        return (
            <Modal visible={cameraOpen} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setCameraOpen(false)}>
                <View style={styles.cameraRoot}>
                    {cameraDevice ? (
                        <Camera
                            style={styles.cameraPreview}
                            device={cameraDevice}
                            isActive={cameraOpen}
                            outputs={[videoOutput]}
                        />
                    ) : null}

                    <View style={styles.cameraOverlay}>
                        <Pressable
                            style={[
                                styles.cameraCloseButton,
                                isLandscape ? styles.cameraCloseButtonLandscape : styles.cameraCloseButtonPortrait,
                            ]}
                            onPress={() => setCameraOpen(false)}
                        >
                            <CameraCloseIcon />
                        </Pressable>

                        {cameraInfoOpen ? (
                            <View
                                style={[
                                    styles.cameraMissionCard,
                                    isLandscape ? styles.cameraMissionCardLandscape : styles.cameraMissionCardPortrait,
                                ]}
                            >
                                <AppText
                                    style={[
                                        styles.cameraMissionTitle,
                                        isLandscape ? styles.cameraMissionTitleLandscape : null,
                                    ]}
                                >
                                    인턴십 온보딩 현장 촬영하기
                                </AppText>

                                <AppText
                                    style={[
                                        styles.cameraMissionDuration,
                                        isLandscape ? styles.cameraMissionDurationLandscape : null,
                                    ]}
                                >
                                    6초
                                </AppText>

                                {isLandscape ? (
                                    <View style={styles.cameraGuideWrap}>
                                        <View style={styles.cameraGuideRow}>
                                            <View style={styles.cameraGuideBadge}>
                                                <AppText style={styles.cameraGuideBadgeText}>배경</AppText>
                                            </View>
                                            <AppText style={styles.cameraGuideText}>책상 세팅과 사원증</AppText>
                                        </View>

                                        <View style={styles.cameraGuideRow}>
                                            <View style={styles.cameraGuideBadge}>
                                                <AppText style={styles.cameraGuideBadgeText}>구도</AppText>
                                            </View>
                                            <AppText style={styles.cameraGuideText}>떨리는 표정, 셀카로 충분해요.</AppText>
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}

                        <Pressable
                            style={[
                                styles.cameraFoldButton,
                                isLandscape
                                    ? (cameraInfoOpen ? styles.cameraFoldButtonLandscapeOpen : styles.cameraFoldButtonLandscapeClosed)
                                    : (cameraInfoOpen ? styles.cameraFoldButtonPortraitOpen : styles.cameraFoldButtonPortraitClosed),
                            ]}
                            onPress={() => setCameraInfoOpen((prev) => !prev)}
                        >
                            {isLandscape ? (
                                cameraInfoOpen ? <LeftIcon /> : <RightIcon />
                            ) : (
                                cameraInfoOpen ? <UpIcon /> : <DownIcon />
                            )}
                        </Pressable>

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
                                <View style={styles.recordCircleInner} />
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
                    <Pressable style={[styles.saveButton, canNext ? styles.saveButtonActive : null]} onPress={handleNext}>
                        <AppText style={[styles.saveButtonText, canNext ? styles.saveButtonTextActive : null]}>다음으로</AppText>
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
                            {saving ? "저장 중..." : "저장하기"}
                        </AppText>
                    </Pressable>
                )}
            </View>
            {renderCameraModal()}
        </SafeAreaView>
    );
}