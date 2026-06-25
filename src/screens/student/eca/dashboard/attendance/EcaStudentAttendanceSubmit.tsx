import React from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import type { Asset } from "react-native-image-picker";

import type { StudentStackParamList } from "../../../../../navigation/StudentNavigator";
import { checkInAttendance, getAttendanceCheckInEligibility, getMyAttendanceEventDetail, getMyAttendanceEvents } from "../../../../../api/ea";
import type { MyAttendanceEventDetailResponse, MyAttendanceSelfieResponse, MyAttendanceEventResponse } from "../../../../../api/ea";
import type { UploadFileLike } from "../../../../../api/client";
import { styles } from "./EcaStudentAttendanceSubmit.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentMobileAttendanceSubmit">;

type GalleryItem = {
    id: string;
    file: UploadFileLike;
    uri: string;
};

type HeaderProps = {
    titleDate: string;
    titleType: string;
    pickerOpen: boolean;
    onBackClick: () => void;
    onPickerClose: () => void;
};

function BackIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M14 17L9 12L14 7" stroke="black" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function CloseIcon({ color = "#808080" }: { color?: string }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M20 4L4 20M20 20L4 4" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function CameraIcon(): React.ReactElement {
    return (
        <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
            <Path d="M10.8001 9.18011V10.1801C11.1558 10.1801 11.4847 9.9912 11.6639 9.68398L10.8001 9.18011ZM13.3201 4.86011V3.86011C12.9644 3.86011 12.6355 4.04902 12.4563 4.35624L13.3201 4.86011ZM22.6801 4.86011L23.5439 4.35624C23.3647 4.04902 23.0358 3.86011 22.6801 3.86011V4.86011ZM25.2001 9.18011L24.3363 9.68398C24.5155 9.9912 24.8444 10.1801 25.2001 10.1801V9.18011ZM3.6001 27.5401H4.6001V12.7801H3.6001H2.6001V27.5401H3.6001ZM7.2001 9.18011V10.1801H10.8001V9.18011V8.18011H7.2001V9.18011ZM10.8001 9.18011L11.6639 9.68398L14.1839 5.36398L13.3201 4.86011L12.4563 4.35624L9.93632 8.67624L10.8001 9.18011ZM13.3201 4.86011V5.86011H22.6801V4.86011V3.86011H13.3201V4.86011ZM22.6801 4.86011L21.8163 5.36398L24.3363 9.68398L25.2001 9.18011L26.0639 8.67624L23.5439 4.35624L22.6801 4.86011ZM25.2001 9.18011V10.1801H28.8001V9.18011V8.18011H25.2001V9.18011ZM32.4001 12.7801H31.4001V27.5401H32.4001H33.4001V12.7801H32.4001ZM32.4001 27.5401H31.4001C31.4001 28.976 30.236 30.1401 28.8001 30.1401V31.1401V32.1401C31.3406 32.1401 33.4001 30.0806 33.4001 27.5401H32.4001ZM28.8001 9.18011V10.1801C30.236 10.1801 31.4001 11.3442 31.4001 12.7801H32.4001H33.4001C33.4001 10.2396 31.3406 8.18011 28.8001 8.18011V9.18011ZM3.6001 12.7801H4.6001C4.6001 11.3442 5.76416 10.1801 7.2001 10.1801V9.18011V8.18011C4.65959 8.18011 2.6001 10.2396 2.6001 12.7801H3.6001ZM7.2001 31.1401V30.1401C5.76416 30.1401 4.6001 28.976 4.6001 27.5401H3.6001H2.6001C2.6001 30.0806 4.65959 32.1401 7.2001 32.1401V31.1401ZM23.4001 19.2601H22.4001C22.4001 21.6902 20.4301 23.6601 18.0001 23.6601V24.6601V25.6601C21.5347 25.6601 24.4001 22.7947 24.4001 19.2601H23.4001ZM18.0001 24.6601V23.6601C15.57 23.6601 13.6001 21.6902 13.6001 19.2601H12.6001H11.6001C11.6001 22.7947 14.4655 25.6601 18.0001 25.6601V24.6601ZM12.6001 19.2601H13.6001C13.6001 16.8301 15.57 14.8601 18.0001 14.8601V13.8601V12.8601C14.4655 12.8601 11.6001 15.7255 11.6001 19.2601H12.6001ZM18.0001 13.8601V14.8601C20.4301 14.8601 22.4001 16.8301 22.4001 19.2601H23.4001H24.4001C24.4001 15.7255 21.5347 12.8601 18.0001 12.8601V13.8601ZM28.8001 31.1401V30.1401H7.2001V31.1401V32.1401H28.8001V31.1401Z" fill="#808080" />
        </Svg>
    );
}

function CheckIcon(): React.ReactElement {
    return (
        <Svg width={26} height={26} viewBox="0 0 26 26" fill="none">
            <Circle cx={13} cy={13} r={13} fill="#0166FF" />
            <Path d="M7 13L11.2 17L19 9" stroke="#FFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function SuccessIcon(): React.ReactElement {
    return (
        <Svg width={50} height={50} viewBox="0 0 50 50" fill="none">
            <Circle cx={25} cy={25} r={25} fill="#0166FF" />
            <Path d="M15 26.1633C16.9613 27.5897 20.884 31.5124 22.4887 34.1869C24.4501 29.9077 29.4426 20.2793 34.7917 16" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function Header({ titleDate, titleType, pickerOpen, onBackClick, onPickerClose }: HeaderProps): React.ReactElement {
    return (
        <View style={styles.topbar}>
            {pickerOpen ? (
                <View style={styles.iconSpacer} />
            ) : (
                <Pressable style={styles.iconButton} accessibilityLabel="back" onPress={onBackClick}>
                    <BackIcon />
                </Pressable>
            )}

            <View style={styles.appTitle}>
                <Text style={styles.appTitleText}>{titleDate}</Text>
                {titleType ? <Text style={styles.appTitleStatus}>{titleType}</Text> : null}
            </View>

            {pickerOpen ? (
                <Pressable style={styles.iconButton} accessibilityLabel="close" onPress={onPickerClose}>
                    <CloseIcon />
                </Pressable>
            ) : (
                <View style={styles.iconSpacer} />
            )}
        </View>
    );
}

function toDate(value?: string | null): Date | null {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function formatTitleParts(event?: MyAttendanceEventResponse | null): { dateText: string; typeText: string } {
    if (!event) return { dateText: "Attendance", typeText: "" };

    const date = toDate(event.eventDate);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateText = date ? `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}` : event.eventDate;

    return {
        dateText,
        typeText: event.type === "CLASS_START" ? "Start" : "End",
    };
}

function getSelfieRecords(detail: MyAttendanceEventDetailResponse | null): MyAttendanceSelfieResponse[] {
    if (!detail) return [];

    return detail.records.filter((record) => Boolean(record.selfieUrl));
}

function isNowInUploadWindow(event?: MyAttendanceEventResponse | null, now: Date = new Date()): boolean {
    if (!event) return false;

    const start = new Date(event.uploadWindowStart);
    const end = new Date(event.uploadWindowEnd);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

    return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
}

function assetToUploadFile(asset: Asset): UploadFileLike | null {
    if (!asset.uri) return null;

    return {
        uri: asset.uri,
        name: asset.fileName || `attendance-selfie-${Date.now()}.jpg`,
        type: asset.type || "image/jpeg",
    };
}

export default function EcaStudentAttendanceSubmit({
    route,
    navigation,
}: Props): React.ReactElement {
    const { externalActivityId, eventId } = route.params;
    const initialEvent = route.params.event ?? null;

    const [event, setEvent] = React.useState<MyAttendanceEventResponse | null>(initialEvent);
    const [detail, setDetail] = React.useState<MyAttendanceEventDetailResponse | null>(null);
    const [selectedFile, setSelectedFile] = React.useState<UploadFileLike | null>(null);
    const [galleryItems, setGalleryItems] = React.useState<GalleryItem[]>([]);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [cameraReviewOpen, setCameraReviewOpen] = React.useState(false);
    const [capturedCameraFile, setCapturedCameraFile] = React.useState<UploadFileLike | null>(null);
    const [capturedCameraPreviewUri, setCapturedCameraPreviewUri] = React.useState("");
    const [, setEligible] = React.useState(false);
    const [alreadyChecked, setAlreadyChecked] = React.useState(false);
    const [now, setNow] = React.useState(new Date());
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [success, setSuccess] = React.useState(false);
    const [error, setError] = React.useState("");

    const finishSuccessOverlay = React.useCallback((): void => {
        setSuccess(false);
        setPickerOpen(false);
        setSelectedFile(null);
        setGalleryItems([]);
    }, []);

    React.useEffect(() => {
        let mounted = true;

        async function fetchAttendanceDetail(): Promise<void> {
            if (!externalActivityId || !eventId) {
                setError("출석 정보를 찾을 수 없습니다.");
                return;
            }

            setLoading(true);
            setError("");

            try {
                let currentEvent = initialEvent;

                if (!currentEvent) {
                    const events = await getMyAttendanceEvents(externalActivityId);
                    currentEvent = events.find((item) => String(item.eventId) === String(eventId)) ?? null;
                }

                if (!mounted) return;

                setEvent(currentEvent);

                try {
                    const eligibilityData = await getAttendanceCheckInEligibility(eventId);

                    if (!mounted) return;

                    setEligible(eligibilityData.eligible);
                    setAlreadyChecked(eligibilityData.alreadyChecked);
                } catch {
                    if (!mounted) return;

                    setEligible(currentEvent?.progress === "OPEN" && currentEvent.status === "NOT_CHECKED");
                    setAlreadyChecked(currentEvent?.status !== "NOT_CHECKED");
                }

                try {
                    const detailData = await getMyAttendanceEventDetail(eventId);

                    if (!mounted) return;

                    setDetail(detailData);
                } catch {
                    if (!mounted) return;

                    setDetail(null);
                }
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setEvent(null);
                setDetail(null);
                setError("출석 상세 정보를 불러오지 못했습니다.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchAttendanceDetail();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, eventId]);

    React.useEffect(() => {
        const timerId = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => {
            clearInterval(timerId);
        };
    }, []);

    React.useEffect(() => {
        if (!success) return;

        const timerId = setTimeout(() => {
            finishSuccessOverlay();
        }, 2700);

        return () => {
            clearTimeout(timerId);
        };
    }, [success, finishSuccessOverlay]);

    function goBack(): void {
        navigation.goBack();
    }

    function closePicker(): void {
        setPickerOpen(false);
    }

    function openPicker(): void {
        if (alreadyChecked) {
            Alert.alert("이미 출석 체크가 완료되었습니다.");
            return;
        }

        if (!isNowInUploadWindow(event, now)) {
            Alert.alert("현재 출석 가능한 시간이 아닙니다.");
            return;
        }

        setPickerOpen(true);
    }

    async function openCamera(): Promise<void> {
        const response = await launchCamera({
            mediaType: "photo",
            cameraType: "front",
            quality: 0.9,
            saveToPhotos: false,
        });

        if (response.didCancel) return;

        if (response.errorCode) {
            Alert.alert("카메라를 사용할 수 없습니다.", response.errorMessage ?? "카메라 권한을 확인해주세요.");
            return;
        }

        const asset = response.assets?.[0];
        const file = asset ? assetToUploadFile(asset) : null;

        if (!file) {
            Alert.alert("사진을 가져오지 못했습니다.");
            return;
        }

        setCapturedCameraFile(file);
        setCapturedCameraPreviewUri(file.uri);
        setCameraReviewOpen(true);
    }

    function closeCameraReview(): void {
        setCameraReviewOpen(false);
        setCapturedCameraFile(null);
        setCapturedCameraPreviewUri("");
    }

    async function retakeCameraPhoto(): Promise<void> {
        closeCameraReview();
        await openCamera();
    }

    async function openGallery(): Promise<void> {
        const response = await launchImageLibrary({
            mediaType: "photo",
            selectionLimit: 0,
            quality: 0.9,
        });

        if (response.didCancel) return;

        if (response.errorCode) {
            Alert.alert("사진을 선택할 수 없습니다.", response.errorMessage ?? "사진 접근 권한을 확인해주세요.");
            return;
        }

        const assets = response.assets ?? [];
        const nextItems = assets
            .map((asset, index) => {
                const file = assetToUploadFile(asset);

                if (!file) return null;

                return {
                    id: `${file.name}-${index}-${Date.now()}`,
                    file,
                    uri: file.uri,
                };
            })
            .filter((item): item is GalleryItem => item !== null);

        if (nextItems.length === 0) {
            Alert.alert("이미지 파일만 선택할 수 있습니다.");
            return;
        }

        setGalleryItems(nextItems);
        setSelectedFile(nextItems[0].file);
    }

    function selectGalleryItem(file: UploadFileLike): void {
        setSelectedFile(file);
    }

    async function refreshDetail(): Promise<void> {
        try {
            const detailData = await getMyAttendanceEventDetail(eventId);
            setDetail(detailData);
        } catch {
            setDetail(null);
        }
    }

    async function submitAttendance(uploadFile: UploadFileLike, closeCameraAfterSuccess = false): Promise<void> {
        if (!eventId || !event || saving) return;

        if (alreadyChecked || !isNowInUploadWindow(event, now)) {
            Alert.alert("현재 출석 가능한 시간이 아닙니다.");
            return;
        }

        setSaving(true);

        try {
            await checkInAttendance(eventId, event.type, uploadFile);
            setAlreadyChecked(true);
            setEligible(false);
            await refreshDetail();

            if (closeCameraAfterSuccess) {
                closeCameraReview();
            }

            setPickerOpen(false);
            setSuccess(true);
        } catch (e) {
            console.error(e);
            Alert.alert("출석 체크에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    }

    async function handleUpload(): Promise<void> {
        if (!selectedFile) {
            Alert.alert("업로드할 사진을 선택해주세요.");
            return;
        }

        await submitAttendance(selectedFile);
    }

    async function confirmCameraPhoto(): Promise<void> {
        if (!capturedCameraFile) return;

        setSelectedFile(capturedCameraFile);
        await submitAttendance(capturedCameraFile, true);
    }

    const selfieRecords = getSelfieRecords(detail);
    const canCheckIn = !alreadyChecked && isNowInUploadWindow(event, now);
    const selectedFileInGallery = galleryItems.some((item) => item.file.uri === selectedFile?.uri);
    const titleParts = formatTitleParts(event);

    return (
        <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
            <Header titleDate={titleParts.dateText} titleType={titleParts.typeText} pickerOpen={pickerOpen} onBackClick={goBack} onPickerClose={closePicker} />

            {loading ? (
                <View style={styles.emptyWrap}>
                    <ActivityIndicator />
                </View>
            ) : error ? (
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            ) : (
                <>
                    <ScrollView contentContainerStyle={[styles.scrollContent, pickerOpen ? styles.scrollContentPicker : null]} showsVerticalScrollIndicator={false}>
                        {pickerOpen ? (
                            <View style={styles.grid}>
                                <Pressable style={[styles.photoTile, styles.cameraTile]} onPress={() => void openCamera()}>
                                    <CameraIcon />
                                </Pressable>

                                {selectedFile?.uri && !selectedFileInGallery ? (
                                    <View style={[styles.photoTile, styles.selectedTile]}>
                                        <Image source={{ uri: selectedFile.uri }} style={styles.photoImage} />
                                        <View style={styles.selectedIconWrap}>
                                            <CheckIcon />
                                        </View>
                                    </View>
                                ) : null}

                                {galleryItems.map((item) => {
                                    const selected = selectedFile?.uri === item.file.uri;

                                    return (
                                        <Pressable key={item.id} style={[styles.photoTile, selected ? styles.selectedTile : null]} onPress={() => selectGalleryItem(item.file)}>
                                            <Image source={{ uri: item.uri }} style={styles.photoImage} />
                                            {selected ? (
                                                <View style={styles.selectedIconWrap}>
                                                    <CheckIcon />
                                                </View>
                                            ) : null}
                                        </Pressable>
                                    );
                                })}

                                <Pressable style={[styles.photoTile, styles.galleryTile]} onPress={() => void openGallery()}>
                                    <Text style={styles.galleryText}>+</Text>
                                </Pressable>
                            </View>
                        ) : selfieRecords.length > 0 ? (
                            <View style={styles.grid}>
                                {selfieRecords.map((record) => (
                                    <View style={styles.photoTile} key={String(record.recordId)}>
                                        <Image source={{ uri: record.selfieUrl ?? "" }} style={styles.photoImage} />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noSelfieText}>아직 출석한 학생이 없습니다.</Text>
                        )}
                    </ScrollView>

                    <View style={styles.bottomBar}>
                        {pickerOpen ? (
                            <Pressable style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]} disabled={saving} onPress={() => void handleUpload()}>
                                <Text style={[styles.primaryButtonText, saving ? styles.primaryButtonTextDisabled : null]}>{saving ? "Uploading..." : "Upload"}</Text>
                            </Pressable>
                        ) : (
                            <Pressable style={[styles.primaryButton, !canCheckIn ? styles.primaryButtonDisabled : null]} disabled={!canCheckIn} onPress={openPicker}>
                                <Text style={[styles.primaryButtonText, !canCheckIn ? styles.primaryButtonTextDisabled : null]}>Check-In</Text>
                            </Pressable>
                        )}
                    </View>

                    <Modal visible={cameraReviewOpen} animationType="fade" transparent={false} onRequestClose={closeCameraReview}>
                        <View style={styles.cameraLayer}>
                            {capturedCameraPreviewUri ? <Image source={{ uri: capturedCameraPreviewUri }} style={styles.cameraReviewImage} /> : null}

                            <Pressable style={styles.cameraClose} accessibilityLabel="close camera" onPress={closeCameraReview}>
                                <CloseIcon color="#FFFFFF" />
                            </Pressable>

                            <View style={styles.cameraReviewActions}>
                                <Pressable style={[styles.cameraReviewButton, styles.cameraRetakeButton]} disabled={saving} onPress={() => void retakeCameraPhoto()}>
                                    <Text style={styles.cameraRetakeText}>Retake</Text>
                                </Pressable>

                                <Pressable style={[styles.cameraReviewButton, styles.cameraCheckInButton]} disabled={saving} onPress={() => void confirmCameraPhoto()}>
                                    <Text style={styles.cameraCheckInText}>{saving ? "Uploading..." : "Check-In"}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={success} animationType="fade" transparent={false} onRequestClose={finishSuccessOverlay}>
                        <Pressable style={styles.successLayer} accessibilityLabel="close success message" onPress={finishSuccessOverlay}>
                            <SuccessIcon />
                            <Text style={styles.successText}>Check-In Complete!</Text>
                        </Pressable>
                    </Modal>
                </>
            )}
        </SafeAreaView>
    );
}