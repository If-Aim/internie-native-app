import React from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { pick } from "@react-native-documents/picker";

import AppText from "../../../../../../AppText";
import type { StudentStackParamList } from "../../../../../navigation/StudentNavigator";
import type { UploadFileLike } from "../../../../../api/client";
import { LEADERBOARD_MISSION_CATEGORY_OPTIONS, getMyLeaderboardMissionLogs, getMyLeaderboardMissions, getMyLeaderboardSubmissions, submitLeaderboardMission, updateMyLeaderboardEvidence } from "../../../../../api/ea";
import type { LeaderboardMissionCategory, LeaderboardMissionResponse, LeaderboardSubmissionEvidenceResponse, LeaderboardSubmissionResponse, StudentLeaderboardLogResponse } from "../../../../../api/ea";

import { getFileIconByExtension } from "../assignment/FileIcons";
import EcaStudentApp from "../../EcaStudentApp";
import { EcaBackExitTransitionView, useEcaBackExitTransition } from "../../EcaBackExitTransition";
import { styles } from "./EcaStudentLeaderboard.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentLeaderboardMission">;

const LEADERBOARD_MISSION_T = "ecaStudent.leaderboardMissionPage";

type MissionStep = "select" | "submit" | "complete";
type MissionFilter = "ALL" | "AVAILABLE" | "MAXED_OUT";
type MissionCategoryFilter = LeaderboardMissionCategory;

type PickedDocumentLike = {
    uri: string;
    name: string | null;
    type: string | null;
    size: number | null;
    hasRequestedType?: boolean | null;
};

type EvidenceUploadFile = UploadFileLike & {
    key: string;
    size?: number | null;
};

function formatNumber(value?: number | null): string {
    return Number(value ?? 0).toLocaleString("en-US");
}

function getFileExtension(fileName: string): string {
    const extension = fileName.split(".").pop();

    if (!extension || extension === fileName) return "file";

    return extension.toLowerCase();
}

function getCategoryLabel(value: LeaderboardMissionCategory | null | undefined, t: TFunction): string {
    if (!value) return t(`${LEADERBOARD_MISSION_T}.categoryFallback`);

    const option = LEADERBOARD_MISSION_CATEGORY_OPTIONS.find((item) => item.value === value);

    return t(`${LEADERBOARD_MISSION_T}.category.${value}`, {
        defaultValue: option?.label ?? t(`${LEADERBOARD_MISSION_T}.categoryFallback`),
    });
}

function getEvidenceTypeLabel(value: LeaderboardMissionResponse["evidenceType"], t: TFunction): string {
    return t(`${LEADERBOARD_MISSION_T}.evidenceType.${value}`, {
        defaultValue: value,
    });
}

function normalizeExtension(extension: string): string {
    const lower = extension.toLowerCase();

    if (lower === "jpeg") return "jpg";
    if (lower === "pptx") return "ppt";
    if (lower === "docx") return "doc";
    if (lower === "xlsx") return "xls";

    return lower;
}

function isAllowedLeaderboardEvidenceFile(
    evidenceType: LeaderboardMissionResponse["evidenceType"],
    extension: string
): boolean {
    const normalizedExtension = normalizeExtension(extension);

    if (evidenceType === "IMAGE") {
        return ["jpg", "png", "gif", "webp", "svg"].includes(normalizedExtension);
    }

    if (evidenceType === "VIDEO") {
        return ["mp4", "mov", "avi", "mpg"].includes(normalizedExtension);
    }

    if (evidenceType === "DOCUMENT") {
        return ["pdf", "doc", "ppt", "xls", "hwp", "txt"].includes(normalizedExtension);
    }

    return true;
}

function isValidHttpUrl(value: string): boolean {
    const trimmedValue = value.trim();

    if (!trimmedValue) return false;

    return /^https?:\/\/.+/i.test(trimmedValue);
}

function buildMissionUsedCount(logs: StudentLeaderboardLogResponse[]): Map<number, number> {
    const map = new Map<number, number>();

    logs.forEach((log) => {
        if (log.status === "rejected") return;

        map.set(log.missionId, (map.get(log.missionId) ?? 0) + 1);
    });

    return map;
}

function isMissionMaxedOut(mission: LeaderboardMissionResponse, usedCountMap: Map<number, number>): boolean {
    return (usedCountMap.get(mission.missionId) ?? 0) >= mission.maximumPerStudent;
}

function toEvidenceUploadFile(file: PickedDocumentLike, index: number): EvidenceUploadFile {
    const fallbackName = `evidence-${Date.now()}-${index}`;
    const name = file.name?.trim() || fallbackName;

    return {
        uri: file.uri,
        name,
        type: file.type || "application/octet-stream",
        key: `${file.uri}-${name}-${file.size ?? 0}`,
        size: file.size ?? null,
    };
}

function BackIcon(): React.ReactElement {
    return (
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M14 17L9 12L14 7" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function FilterIcon({ active }: { active: boolean }): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="#A0A0A0" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            {active ? <Circle cx={20} cy={6} r={3} fill="#0166FF" /> : null}
        </Svg>
    );
}

function UploadIcon(): React.ReactElement {
    return (
        <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
            <Path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16 2.666C14.457 2.666 12.947 3.112 11.651 3.951C10.356 4.79 9.33 5.985 8.699 7.393C8.609 7.595 8.517 7.796 8.423 7.996H8C6.586 7.996 5.229 8.558 4.229 9.558C3.229 10.558 2.667 11.915 2.667 13.329C2.667 14.744 3.229 16.1 4.229 17.1C5.229 18.101 6.586 18.663 8 18.663H8.23L10.896 15.996H8C7.293 15.996 6.615 15.715 6.115 15.215C5.615 14.715 5.334 14.037 5.334 13.329C5.334 12.622 5.615 11.944 6.115 11.444C6.615 10.944 7.293 10.663 8 10.663H8.086C8.363 10.663 8.686 10.664 8.952 10.61C9.284 10.553 9.602 10.431 9.886 10.25C10.207 10.042 10.428 9.783 10.596 9.547C10.699 9.395 10.789 9.234 10.864 9.067C10.935 8.919 11.023 8.728 11.126 8.496C11.546 7.556 12.23 6.758 13.094 6.198C13.958 5.638 14.966 5.34 15.996 5.34C17.026 5.34 18.034 5.638 18.898 6.198C19.762 6.758 20.445 7.556 20.866 8.496C20.978 8.728 21.065 8.919 21.136 9.067C21.198 9.196 21.288 9.384 21.404 9.547C21.572 9.782 21.792 10.042 22.115 10.251C22.438 10.459 22.764 10.554 23.048 10.611C23.315 10.664 23.638 10.664 23.915 10.664H24C24.708 10.664 25.386 10.944 25.886 11.444C26.386 11.944 26.667 12.622 26.667 13.329C26.667 14.037 26.386 14.715 25.886 15.215C25.386 15.715 24.708 15.996 24 15.996H21.104L23.771 18.663H24C25.415 18.663 26.771 18.101 27.772 17.1C28.772 16.1 29.334 14.744 29.334 13.329C29.334 11.915 28.772 10.558 27.772 9.558C26.771 8.558 25.415 7.996 24 7.996H23.578C23.462 7.746 23.381 7.568 23.302 7.393C22.67 5.985 21.645 4.79 20.349 3.951C19.054 3.112 17.543 2.666 16 2.666Z"
                fill="#808080"
            />
            <Path
                d="M16 16L15.057 15.057L16 14.114L16.943 15.057L16 16ZM17.333 28C17.333 28.354 17.193 28.693 16.942 28.943C16.692 29.193 16.353 29.333 16 29.333C15.646 29.333 15.307 29.193 15.057 28.943C14.807 28.693 14.667 28.354 14.667 28H17.333ZM9.724 20.391L15.057 15.057L16.943 16.943L11.609 22.276L9.724 20.391ZM16.943 15.057L22.276 20.391L20.391 22.276L15.057 16.943L16.943 15.057ZM17.333 16V28H14.667V16H17.333Z"
                fill="#808080"
            />
        </Svg>
    );
}

function CheckIcon(): React.ReactElement {
    return (
        <Svg width={50} height={50} viewBox="0 0 50 50" fill="none">
            <Circle cx={25} cy={25} r={25} fill="#0166FF" />
            <Path d="M15 26.1633C16.9613 27.5897 20.884 31.5124 22.4887 34.1869C24.4501 29.9077 29.4426 20.2793 34.7917 16" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function XIcon(): React.ReactElement {
    return (
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
            <Path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function Header({
    title,
    onBackClick,
}: {
    title: string;
    onBackClick: () => void;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.missionTopbarRow}>
            <Pressable style={styles.missionHeaderIconButton} onPress={onBackClick} accessibilityLabel={t(`${LEADERBOARD_MISSION_T}.aria.back`)}>
                <BackIcon />
            </Pressable>

            <AppText style={styles.missionHeaderTitle} numberOfLines={1}>
                {title}
            </AppText>

            <View style={styles.missionHeaderRightPlaceholder} />
        </View>
    );
}

export default function EcaStudentLeaderboardMission({
    route,
    navigation,
}: Props): React.ReactElement {
    const { t } = useTranslation();
    const { externalActivityId, editSubmissionId, editMissionId } = route.params;
    const isEditMode = editSubmissionId !== undefined;
    const backActionRef = React.useRef<"goBack" | "replaceLeaderboard">("goBack");
    const { screenExitStyle, runBackExitTransition } = useEcaBackExitTransition(() => {
        if (backActionRef.current === "replaceLeaderboard") {
            navigation.replace("EcaStudentLeaderboard", { externalActivityId });
            return;
        }

        navigation.goBack();
    });

    const [step, setStep] = React.useState<MissionStep>("select");
    const [filter, setFilter] = React.useState<MissionFilter>("ALL");
    const [selectedMissionCategories, setSelectedMissionCategories] = React.useState<MissionCategoryFilter[]>(
        () => LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => option.value)
    );
    const [isMissionCategoryFilterOpen, setIsMissionCategoryFilterOpen] = React.useState(false);

    const [missions, setMissions] = React.useState<LeaderboardMissionResponse[]>([]);
    const [logs, setLogs] = React.useState<StudentLeaderboardLogResponse[]>([]);
    const [selectedMission, setSelectedMission] = React.useState<LeaderboardMissionResponse | null>(null);
    const [editingSubmission, setEditingSubmission] = React.useState<LeaderboardSubmissionResponse | null>(null);
    const [existingEvidences, setExistingEvidences] = React.useState<LeaderboardSubmissionEvidenceResponse[]>([]);
    const [evidenceFiles, setEvidenceFiles] = React.useState<EvidenceUploadFile[]>([]);
    const [evidenceUrlText, setEvidenceUrlText] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState("");

    const usedCountMap = React.useMemo(() => buildMissionUsedCount(logs), [logs]);

    const missionItems = React.useMemo(() => {
        return missions.map((mission) => ({
            mission,
            maxedOut: isMissionMaxedOut(mission, usedCountMap),
        }));
    }, [missions, usedCountMap]);

    const filteredMissionItems = React.useMemo(() => {
        let nextItems = missionItems;

        if (filter === "AVAILABLE") {
            nextItems = nextItems.filter((item) => !item.maxedOut);
        }

        if (filter === "MAXED_OUT") {
            nextItems = nextItems.filter((item) => item.maxedOut);
        }

        if (selectedMissionCategories.length > 0) {
            nextItems = nextItems.filter((item) => selectedMissionCategories.includes(item.mission.category));
        } else {
            nextItems = [];
        }

        return nextItems;
    }, [missionItems, filter, selectedMissionCategories]);

    const availableCount = missionItems.filter((item) => !item.maxedOut).length;
    const maxedOutCount = missionItems.filter((item) => item.maxedOut).length;

    React.useEffect(() => {
        let mounted = true;

        async function loadMissions(): Promise<void> {
            try {
                setLoading(true);
                setErrorMessage("");

                const [missionResponse, logResponse, pendingSubmissionResponse] = await Promise.all([
                    getMyLeaderboardMissions(externalActivityId),
                    getMyLeaderboardMissionLogs(externalActivityId, { page: 0, size: 1000 }),
                    isEditMode
                        ? getMyLeaderboardSubmissions(externalActivityId, { status: "pending", page: 0, size: 1000 })
                        : Promise.resolve(null),
                ]);

                if (!mounted) return;

                setMissions(missionResponse.missions);
                setLogs(logResponse.logs);

                if (isEditMode) {
                    const pendingSubmissions = pendingSubmissionResponse?.submissions ?? [];
                    const nextEditingSubmission = pendingSubmissions.find((submission) => String(submission.submissionId) === String(editSubmissionId)) ?? null;

                    const missionList = missionResponse.missions ?? [];
                    const nextSelectedMission = missionList.find((mission) => String(mission.missionId) === String(editMissionId ?? nextEditingSubmission?.missionId)) ?? null;

                    if (!nextEditingSubmission || !nextSelectedMission) {
                        setErrorMessage(t(`${LEADERBOARD_MISSION_T}.error.editSubmissionNotFound`, { defaultValue: "수정할 수 있는 제출물을 찾을 수 없습니다." }));
                        return;
                    }

                    const nextEvidences = nextEditingSubmission.evidences ?? [];
                    const nextLinkText = nextEvidences
                        .filter((evidence) => evidence.submitType === "LINK" || nextSelectedMission.evidenceType === "LINK")
                        .map((evidence) => evidence.evidenceUrl?.trim() ?? "")
                        .filter(Boolean)
                        .join("\n");

                    setEditingSubmission(nextEditingSubmission);
                    setExistingEvidences(nextEvidences);
                    setSelectedMission(nextSelectedMission);
                    setEvidenceFiles([]);
                    setEvidenceUrlText(nextLinkText);
                    setStep("submit");
                }
            } catch (error) {
                if (!mounted) return;

                console.error(error);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : t(`${LEADERBOARD_MISSION_T}.error.missionLoadFailed`)
                );
            } finally {
                if (mounted) setLoading(false);
            }
        }

        void loadMissions();

        return () => {
            mounted = false;
        };
    }, [editMissionId, editSubmissionId, externalActivityId, isEditMode, t]);

    function handleBackClick(): void {
        if (step === "complete") {
            backActionRef.current = "replaceLeaderboard";
            runBackExitTransition();
            return;
        }

        if (step === "submit" && isEditMode) {
            backActionRef.current = "goBack";
            runBackExitTransition();
            return;
        }

        if (step === "submit") {
            setStep("select");
            return;
        }

        backActionRef.current = "goBack";
        runBackExitTransition();
    }

    function handleNextClick(): void {
        if (!selectedMission) return;

        setEditingSubmission(null);
        setExistingEvidences([]);
        setEvidenceFiles([]);
        setEvidenceUrlText("");
        setStep("submit");
    }

    function removeEvidenceFile(fileKey: string): void {
        setEvidenceFiles((prev) => prev.filter((file) => file.key !== fileKey));
    }
    
    async function pickEvidenceFiles(): Promise<void> {
        if (!selectedMission) return;

        try {
            const selectedFiles = await pick({
                allowMultiSelection: true,
                mode: "import",
            });

            const validFiles = selectedFiles.filter((file) => Number(file.size ?? 1) > 0);

            if (validFiles.length === 0) {
                Alert.alert(t(`${LEADERBOARD_MISSION_T}.alert.emptyFile`));
                return;
            }

            const invalidFile = validFiles.find((file) => {
                const name = file.name ?? "file";
                const extension = getFileExtension(name);

                return !isAllowedLeaderboardEvidenceFile(selectedMission.evidenceType, extension);
            });

            if (invalidFile) {
                Alert.alert(
                    t(`${LEADERBOARD_MISSION_T}.alert.invalidFileTypeTitle`),
                    t(`${LEADERBOARD_MISSION_T}.alert.invalidFileType`)
                );
                return;
            }

            const nextFiles: EvidenceUploadFile[] = validFiles.map((file, index) => {
                const name = file.name ?? `evidence-${Date.now()}-${index}`;
                const size = file.size ?? 0;

                return {
                    uri: file.uri,
                    name,
                    type: file.type ?? "application/octet-stream",
                    key: `${name}-${size}-${file.uri}`,
                    size,
                };
            });

            setEvidenceFiles((prev) => {
                const prevKeys = new Set(prev.map((item) => item.key));
                const filtered = nextFiles.filter((item) => !prevKeys.has(item.key));

                return [...prev, ...filtered];
            });
        } catch (error) {
            console.error(error);
        }
    }

    async function handleSubmit(): Promise<void> {
        if (!selectedMission || submitting) return;

        const acceptsLink = selectedMission.evidenceType === "LINK";
        const acceptsFile = selectedMission.evidenceType !== "LINK";
        const evidenceUrls = evidenceUrlText
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean);

       if (isEditMode && !editingSubmission) {
            Alert.alert(t(`${LEADERBOARD_MISSION_T}.alert.submitFailed`));
            return;
        }

        if (acceptsFile && evidenceFiles.length === 0) {
            Alert.alert(
                isEditMode
                    ? t(`${LEADERBOARD_MISSION_T}.alert.fileRequiredForEdit`, { defaultValue: "수정할 파일을 선택해주세요." })
                    : t(`${LEADERBOARD_MISSION_T}.alert.fileRequired`)
            );
            return;
        }

        if (acceptsLink && evidenceUrls.length === 0) {
            Alert.alert(t(`${LEADERBOARD_MISSION_T}.alert.linkRequired`));
            return;
        }

        if (acceptsLink && evidenceUrls.some((url) => !isValidHttpUrl(url))) {
            Alert.alert(t(`${LEADERBOARD_MISSION_T}.alert.invalidLink`));
            return;
        }

        try {
            setSubmitting(true);

            if (isEditMode && editingSubmission) {
                await updateMyLeaderboardEvidence(externalActivityId, editingSubmission.submissionId, {
                    files: acceptsFile ? evidenceFiles : null,
                    evidenceUrls: acceptsLink ? evidenceUrls : null,
                });
            } else {
                await submitLeaderboardMission(externalActivityId, selectedMission.missionId, {
                    files: acceptsFile ? evidenceFiles : null,
                    evidenceUrls: acceptsLink ? evidenceUrls : null,
                });
            }

            setStep("complete");
        } catch (error) {
            console.error(error);
            Alert.alert(t(`${LEADERBOARD_MISSION_T}.alert.submitFailed`));
        } finally {
            setSubmitting(false);
        }
    }

    function renderProgress(): React.ReactElement {
        const currentStep = step === "select" ? 1 : 2;

        return (
            <View style={styles.missionProgress}>
                {[1, 2].map((item) => (
                    <View key={item} style={[styles.missionProgressBar, item <= currentStep ? styles.missionProgressBarActive : null]} />
                ))}
            </View>
        );
    }

    function toggleMissionCategoryFilter(category: MissionCategoryFilter): void {
        setSelectedMissionCategories((prev) =>
            prev.includes(category)
                ? prev.filter((item) => item !== category)
                : [...prev, category]
        );
    }

    function selectAllMissionCategories(): void {
        setSelectedMissionCategories(LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => option.value));
    }

    function isAllMissionCategorySelected(): boolean {
        return selectedMissionCategories.length === LEADERBOARD_MISSION_CATEGORY_OPTIONS.length;
    }

    function renderMissionCategoryFilterModal(): React.ReactElement {
        return (
            <Modal visible={isMissionCategoryFilterOpen} transparent animationType="fade" onRequestClose={() => setIsMissionCategoryFilterOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setIsMissionCategoryFilterOpen(false)}>
                    <Pressable style={styles.filterSheet} onPress={() => {}}>
                        <Pressable
                            style={[styles.filterOption, isAllMissionCategorySelected() ? styles.filterOptionSelected : null]}
                            onPress={selectAllMissionCategories}
                        >
                            <AppText style={styles.filterOptionText}>
                                {t(`${LEADERBOARD_MISSION_T}.filter.all`)}
                            </AppText>
                        </Pressable>

                        {LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => {
                            const selected = selectedMissionCategories.includes(option.value);

                            return (
                                <Pressable
                                    key={option.value}
                                    style={[styles.filterOption, selected ? styles.filterOptionSelected : null]}
                                    onPress={() => toggleMissionCategoryFilter(option.value)}
                                >
                                    <AppText style={styles.filterOptionText}>
                                        {getCategoryLabel(option.value, t)}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>
        );
    }

    function renderSelectStep(): React.ReactElement {
        const filterActive = !isAllMissionCategorySelected();

        return (
            <>
                <View style={styles.missionSelectHeader}>
                    <AppText style={styles.missionSelectTitle}>
                        {t(`${LEADERBOARD_MISSION_T}.selectMission`)}
                    </AppText>

                    <Pressable style={styles.filterButton} onPress={() => setIsMissionCategoryFilterOpen(true)}>
                        <FilterIcon active={filterActive} />
                    </Pressable>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.missionFilterTabs}
                >
                    <Pressable style={[styles.missionFilterTab, filter === "ALL" ? styles.missionFilterTabActive : null]} onPress={() => setFilter("ALL")}>
                        <AppText style={[styles.missionFilterTabText, filter === "ALL" ? styles.missionFilterTabTextActive : null]}>
                            {t(`${LEADERBOARD_MISSION_T}.missionFilter.all`, { missionCount: missionItems.length })}
                        </AppText>
                    </Pressable>

                    <Pressable style={[styles.missionFilterTab, filter === "AVAILABLE" ? styles.missionFilterTabActive : null]} onPress={() => setFilter("AVAILABLE")}>
                        <AppText style={[styles.missionFilterTabText, filter === "AVAILABLE" ? styles.missionFilterTabTextActive : null]}>
                            {t(`${LEADERBOARD_MISSION_T}.missionFilter.available`, { missionCount: availableCount })}
                        </AppText>
                    </Pressable>

                    <Pressable style={[styles.missionFilterTab, filter === "MAXED_OUT" ? styles.missionFilterTabActive : null]} onPress={() => setFilter("MAXED_OUT")}>
                        <AppText style={[styles.missionFilterTabText, filter === "MAXED_OUT" ? styles.missionFilterTabTextActive : null]}>
                            {t(`${LEADERBOARD_MISSION_T}.missionFilter.maxedOut`, { missionCount: maxedOutCount })}
                        </AppText>
                    </Pressable>
                </ScrollView>

                <View style={styles.missionList}>
                    {filteredMissionItems.length > 0 ? (
                        filteredMissionItems.map(({ mission, maxedOut }) => {
                            const selected = selectedMission?.missionId === mission.missionId;

                            return (
                                <Pressable
                                    key={mission.missionId}
                                    style={[
                                        styles.missionCard,
                                        selected ? styles.missionCardSelected : null,
                                        maxedOut ? styles.missionCardDisabled : null,
                                    ]}
                                    disabled={maxedOut}
                                    onPress={() => setSelectedMission(mission)}
                                >
                                    <View style={[styles.missionRadio, selected ? styles.missionRadioSelected : null]} />

                                    <View style={styles.missionInfo}>
                                        <AppText style={styles.missionName} numberOfLines={1}>
                                            {mission.name}
                                        </AppText>
                                        <AppText style={styles.missionCategory} numberOfLines={1}>
                                            {getCategoryLabel(mission.category, t)}
                                        </AppText>
                                    </View>

                                    <View style={[styles.missionPoint, maxedOut ? styles.missionPointDisabled : null]}>
                                        <AppText style={[styles.missionPointText, maxedOut ? styles.missionPointTextDisabled : null]}>
                                            +{formatNumber(mission.points)}
                                        </AppText>
                                    </View>
                                </Pressable>
                            );
                        })
                    ) : (
                        <View style={styles.emptyWrap}>
                            <AppText style={styles.emptyText}>
                                {t(`${LEADERBOARD_MISSION_T}.empty`)}
                            </AppText>
                        </View>
                    )}
                </View>
            </>
        );
    }

    function renderSubmitStep(): React.ReactElement | null {
        if (!selectedMission) return null;

        const acceptsLink = selectedMission.evidenceType === "LINK";
        const acceptsFile = selectedMission.evidenceType !== "LINK";
        const evidenceUrls = evidenceUrlText
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean);
        const hasInvalidLink = acceptsLink && evidenceUrls.length > 0 && evidenceUrls.some((url) => !isValidHttpUrl(url));
        const submitDisabled =
            submitting ||
            (acceptsFile && evidenceFiles.length === 0) ||
            (acceptsLink && (evidenceUrls.length === 0 || hasInvalidLink));
        const existingFileEvidences = existingEvidences.filter((evidence) => evidence.submitType !== "LINK");

        return (
            <>
                <View style={styles.missionUploadTitle}>
                    <AppText style={styles.missionUploadTitleText}>
                        {t(`${LEADERBOARD_MISSION_T}.uploadEvidence`)}
                    </AppText>
                </View>

                <View style={styles.missionSubmitSection}>
                    <View style={styles.missionSubmitCard}>
                        <AppText style={styles.missionSubmitCardTitle}>
                            {selectedMission.name}
                        </AppText>

                        <View style={styles.missionInfoField}>
                            <AppText style={styles.missionInfoLabel}>
                                {t(`${LEADERBOARD_MISSION_T}.evidence`)}
                            </AppText>
                            <View style={styles.missionReadonlyInput}>
                                <AppText style={styles.missionReadonlyInputText} numberOfLines={1}>
                                    {selectedMission.evidenceName || "-"}
                                </AppText>
                            </View>
                        </View>

                        <View style={styles.missionInfoField}>
                            <AppText style={styles.missionInfoLabel}>
                                {t(`${LEADERBOARD_MISSION_T}.submissionFormat`)}
                            </AppText>
                            <View style={styles.missionReadonlyInput}>
                                <AppText style={styles.missionReadonlyInputText} numberOfLines={1}>
                                    {getEvidenceTypeLabel(selectedMission.evidenceType, t)}
                                </AppText>
                            </View>
                        </View>
                    </View>

                    <View style={styles.missionSubmitCard}>
                        <AppText style={styles.missionSubmitCardTitle}>
                            {t(`${LEADERBOARD_MISSION_T}.submission`)}
                        </AppText>

                        {acceptsFile ? (
                            <>
                                <AppText style={styles.missionFileLabel}>File</AppText>

                                {isEditMode && existingFileEvidences.length > 0 ? (
                                    <View style={styles.missionFileList}>
                                        {existingFileEvidences.map((evidence, index) => {
                                            const fileName = evidence.originalFileName || evidence.evidenceUrl.split("/").pop() || `evidence-${index + 1}`;
                                            const extension = getFileExtension(fileName);

                                            return (
                                                <View style={styles.missionFileItem} key={`${evidence.evidenceId ?? index}-${evidence.evidenceUrl}`}>
                                                    <View style={styles.missionFileMain}>
                                                        <View style={styles.missionFileIcon}>
                                                            {getFileIconByExtension(extension)}
                                                        </View>

                                                        <AppText style={styles.missionFileName} numberOfLines={1}>
                                                            {fileName}
                                                        </AppText>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}

                                <Pressable style={styles.missionUploadBox} onPress={pickEvidenceFiles}>
                                    <UploadIcon />
                                    <AppText style={styles.missionUploadGuide}>
                                        {evidenceFiles.length > 0
                                            ? t(`${LEADERBOARD_MISSION_T}.filesSelected`, { fileCount: evidenceFiles.length })
                                            : t(`${LEADERBOARD_MISSION_T}.fileUploadGuide`)}
                                    </AppText>
                                </Pressable>

                                {evidenceFiles.length > 0 ? (
                                    <View style={styles.missionFileList}>
                                        {evidenceFiles.map((file) => {
                                            const extension = getFileExtension(file.name);

                                            return (
                                                <View style={styles.missionFileItem} key={file.key}>
                                                    <View style={styles.missionFileMain}>
                                                        <View style={styles.missionFileIcon}>
                                                            {getFileIconByExtension(extension)}
                                                        </View>

                                                        <AppText style={styles.missionFileName} numberOfLines={1}>
                                                            {file.name}
                                                        </AppText>
                                                    </View>

                                                    <Pressable style={styles.missionFileRemove} onPress={() => removeEvidenceFile(file.key)}>
                                                        <XIcon />
                                                    </Pressable>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </>
                        ) : null}

                        {acceptsLink ? (
                            <View style={styles.missionLinkArea}>
                                <AppText style={styles.missionLinkLabel}>
                                    {t(`${LEADERBOARD_MISSION_T}.link`)}
                                </AppText>

                                <TextInput
                                    style={[styles.missionLinkInput, hasInvalidLink ? styles.missionLinkInputInvalid : null]}
                                    value={evidenceUrlText}
                                    placeholder={t(`${LEADERBOARD_MISSION_T}.linkPlaceholder`)}
                                    placeholderTextColor="#9AA0A6"
                                    onChangeText={setEvidenceUrlText}
                                    multiline
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                {hasInvalidLink ? (
                                    <AppText style={styles.missionLinkError}>
                                        {t(`${LEADERBOARD_MISSION_T}.alert.invalidLink`)}
                                    </AppText>
                                ) : null}
                            </View>
                        ) : null}

                        <Pressable
                            style={[styles.missionSubmitButton, submitDisabled ? styles.missionSubmitButtonDisabled : null]}
                            disabled={submitDisabled}
                            onPress={handleSubmit}
                        >
                            <AppText style={[styles.missionSubmitButtonText, submitDisabled ? styles.missionSubmitButtonDisabledText : null]}>
                                {submitting
                                    ? t(`${LEADERBOARD_MISSION_T}.saving`)
                                    : isEditMode
                                        ? t(`${LEADERBOARD_MISSION_T}.editSubmit`, { defaultValue: "edit" })
                                        : t(`${LEADERBOARD_MISSION_T}.submit`)}
                            </AppText>
                        </Pressable>
                    </View>
                </View>
            </>
        );
    }

    function renderCompleteStep(): React.ReactElement {
        return (
            <View style={styles.missionComplete}>
                <View style={styles.missionCompleteIcon}>
                    <CheckIcon />
                </View>

                <AppText style={styles.missionCompleteTitle}>
                    {t(`${LEADERBOARD_MISSION_T}.completed`)}
                </AppText>
            </View>
        );
    }

    function renderBody(): React.ReactElement {
        if (loading) {
            return (
                <View style={styles.state}>
                    <ActivityIndicator color="#0166FF" />
                </View>
            );
        }

        if (errorMessage) {
            return (
                <View style={styles.state}>
                    <AppText style={styles.emptyText}>{errorMessage}</AppText>
                </View>
            );
        }

        return (
            <>
                {renderProgress()}
                {step === "select" ? renderSelectStep() : null}
                {step === "submit" ? renderSubmitStep() : null}
                {step === "complete" ? renderCompleteStep() : null}
            </>
        );
    }

    return (
        <EcaBackExitTransitionView exitStyle={screenExitStyle}>
            <EcaStudentApp externalActivityId={externalActivityId} activeTab="leaderboard" hideBottomNav>
                <SafeAreaView style={styles.missionPage}>
                <Header title={t(`${LEADERBOARD_MISSION_T}.title`)} onBackClick={handleBackClick} />

                <ScrollView
                    style={styles.missionMain}
                    contentContainerStyle={styles.missionScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {renderBody()}
                </ScrollView>

                {!loading && !errorMessage && step === "select" ? (
                    <Pressable style={[styles.missionNextButton, !selectedMission ? styles.missionNextButtonDisabled : null]} disabled={!selectedMission} onPress={handleNextClick}>
                        <AppText style={[styles.missionNextButtonText, !selectedMission ? styles.missionNextButtonDisabledText : null]}>
                            {t(`${LEADERBOARD_MISSION_T}.next`)}
                        </AppText>
                    </Pressable>
                ) : null}

                {!loading && !errorMessage && step === "complete" ? (
                    <View style={styles.missionCompleteFloatingBottom}>
                        <AppText style={styles.missionCompleteNotice}>
                            {t(`${LEADERBOARD_MISSION_T}.approvalNotice`)}
                        </AppText>

                        <Pressable style={styles.missionCompleteButton} onPress={() => navigation.replace("EcaStudentLeaderboard", { externalActivityId })}>
                            <AppText style={styles.missionCompleteButtonText}>
                                {t(`${LEADERBOARD_MISSION_T}.save`)}
                            </AppText>
                        </Pressable>
                    </View>
                ) : null}

                {renderMissionCategoryFilterModal()}
                </SafeAreaView>
            </EcaStudentApp>
        </EcaBackExitTransitionView>
    );
}
