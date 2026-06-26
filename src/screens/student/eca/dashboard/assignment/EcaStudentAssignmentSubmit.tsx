import React from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { pick } from "@react-native-documents/picker";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../../../../../AppText";
import { API_BASE_URL } from "@env";
import { getAccessToken } from "../../../../../auth/tokenStorage";
import { getUserMe } from "../../../../../api/client";
import type { UserMe, UploadFileLike } from "../../../../../api/client";
import { getAssignment, getMyAssignmentSubmissions, getMyExternalActivityAssignments, getMyParticipatingExternalActivities, getMyParticipatingExternalActivity, getSubmissionEvaluation, submitAssignment, updateAssignmentSubmission, } from "../../../../../api/ea";
import type { AssignmentResponse, AssignmentResultForm, AssignmentSubmissionEvaluationResponse, AssignmentSubmissionResponse, StudentAssignmentResponse, StudentExternalActivityDetailResponse, StudentExternalActivityResponse, SubmissionFileResponse, } from "../../../../../api/ea";
import { formatServerKstDateAndTimeCompactForUser, formatServerKstDateTimeDotForUser, } from "../../../../../theme/dateTime";
import type { StudentStackParamList } from "../../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../../theme/common.Style";
import EcaStudentApp from "../../EcaStudentApp";
import StudentMobileSideMenu from "../../../StudentSideMenu";
import { getFileIconByExtension } from "./FileIcons";
import { styles } from "./EcaStudentAssignmentSubmit.style";

const ASSIGNMENT_SUBMIT_T = "ecaStudent.assignmentSubmitPage";
type TranslationFunction = ReturnType<typeof useTranslation>["t"];
type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentAssignmentSubmit">;

type ActivityMenuKey = "dashboard" | "assignment" | "attendance" | "leaderboard" | "team-activity";

type UploadFileItem = {
    id: string;
    file: UploadFileLike & { size?: number | null };
    extension: string;
};

function formatDateTime(
    date?: string | null,
    time?: string | null,
    fallbackTime: string = "00:00:00"
): string {
    return formatServerKstDateAndTimeCompactForUser(date, time, fallbackTime).slice(2);
}

function formatSubmittedAt(value?: string | null): string {
    return formatServerKstDateTimeDotForUser(value);
}

function getLatestSubmittedAt(submission: AssignmentSubmissionResponse): string {
    return submission.updatedAt ?? submission.submittedAt;
}

function isSameNumberArray(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort((prev, next) => prev - next);
    const sortedB = [...b].sort((prev, next) => prev - next);

    return sortedA.every((value, index) => value === sortedB[index]);
}

function getResultFormLabel(value: AssignmentResultForm | null | undefined, t: TranslationFunction): string {
    if (value === "WRITING") return t(`${ASSIGNMENT_SUBMIT_T}.resultForm.WRITING`);
    if (value === "VIDEO") return t(`${ASSIGNMENT_SUBMIT_T}.resultForm.VIDEO`);
    if (value === "IMAGE") return t(`${ASSIGNMENT_SUBMIT_T}.resultForm.IMAGE`);
    if (value === "LINK") return t(`${ASSIGNMENT_SUBMIT_T}.resultForm.LINK`);
    if (value === "ETC") return t(`${ASSIGNMENT_SUBMIT_T}.resultForm.ETC`);
    return value ?? "-";
}

function getStudentAssignmentFormLabel(
    assignment: AssignmentResponse | null,
    studentAssignment: StudentAssignmentResponse | null,
    t: TranslationFunction
): string {
    const isTeamAssignment = studentAssignment?.isTeamAssignment ?? (assignment?.systemForm === "TEAM");

    if (!isTeamAssignment) return t(`${ASSIGNMENT_SUBMIT_T}.assignmentForm.individual`);

    const teamName = studentAssignment?.myTeam?.name?.trim();

    return teamName
        ? t(`${ASSIGNMENT_SUBMIT_T}.assignmentForm.teamWithName`, { teamName })
        : t(`${ASSIGNMENT_SUBMIT_T}.assignmentForm.team`);
}

function getResultFormsLabel(values: AssignmentResultForm[] | null | undefined, t: TranslationFunction): string {
    if (!values || values.length === 0) return "-";

    return values.map((value) => getResultFormLabel(value, t)).join(", ");
}

function getFileExtension(fileName: string): string {
    const extension = fileName.split(".").pop();

    if (!extension || extension === fileName) return "file";

    return extension.toLowerCase();
}

function normalizeExtension(extension: string): string {
    const lower = extension.toLowerCase();

    if (lower === "jpeg") return "jpg";
    if (lower === "pptx") return "ppt";
    if (lower === "docx") return "doc";
    if (lower === "xlsx") return "xls";

    return lower;
}

function isAllowedAssignmentFile(resultForms?: AssignmentResultForm[] | null, extension?: string | null): boolean {
    if (!resultForms || resultForms.length === 0 || !extension) return true;

    const normalizedExtension = normalizeExtension(extension);

    const allowedExtensionsByResultForm: Record<Exclude<AssignmentResultForm, "LINK">, string[]> = {
        WRITING: ["txt", "doc", "pdf", "hwp"],
        IMAGE: ["jpg", "png", "gif", "webp", "svg"],
        VIDEO: ["mp4", "mov", "avi", "mpg"],
        ETC: [],
    };

    return resultForms
        .filter((resultForm): resultForm is Exclude<AssignmentResultForm, "LINK"> => resultForm !== "LINK")
        .some((resultForm) => {
            const allowedExtensions = allowedExtensionsByResultForm[resultForm];

            if (allowedExtensions.length === 0) return true;

            return allowedExtensions.includes(normalizedExtension);
        });
}

function getAssignmentFileWarning(resultForms?: AssignmentResultForm[] | null, extension?: string | null): string {
    if (isAllowedAssignmentFile(resultForms, extension)) return "";

    return "과제 형식을 확인해주세요!";
}

function isValidHttpUrl(value: string): boolean {
    const trimmedValue = value.trim();

    if (!trimmedValue) return false;

    return /^https?:\/\/.+/i.test(trimmedValue);
}

function getProfileImageUrl(profileImage?: string | null): string | null {
    const raw = String(profileImage ?? "").trim();

    if (!raw || raw.toLowerCase().includes("default")) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const origin = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

    return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}

function BackIcon(): React.ReactElement {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M14 17L9 12L14 7" stroke="#848484" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function UploadIcon(): React.ReactElement {
    return (
        <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
            <Path fillRule="evenodd" clipRule="evenodd" d="M16 2.666C14.457 2.666 12.947 3.112 11.651 3.951C10.356 4.79 9.33 5.985 8.699 7.393C8.609 7.595 8.517 7.796 8.423 7.996H8C6.586 7.996 5.229 8.558 4.229 9.558C3.229 10.558 2.667 11.915 2.667 13.329C2.667 14.744 3.229 16.1 4.229 17.1C5.229 18.101 6.586 18.663 8 18.663H8.23L10.896 15.996H8C7.293 15.996 6.615 15.715 6.115 15.215C5.615 14.715 5.334 14.037 5.334 13.329C5.334 12.622 5.615 11.944 6.115 11.444C6.615 10.944 7.293 10.663 8 10.663H8.086C8.363 10.663 8.686 10.664 8.952 10.61C9.284 10.553 9.602 10.431 9.886 10.25C10.207 10.042 10.428 9.783 10.596 9.547C10.699 9.395 10.789 9.234 10.864 9.067C10.935 8.919 11.023 8.728 11.126 8.496C11.546 7.556 12.23 6.758 13.094 6.198C13.958 5.638 14.966 5.34 15.996 5.34C17.026 5.34 18.034 5.638 18.898 6.198C19.762 6.758 20.445 7.556 20.866 8.496C20.978 8.728 21.065 8.919 21.136 9.067C21.198 9.196 21.288 9.384 21.404 9.547C21.572 9.782 21.792 10.042 22.115 10.251C22.438 10.459 22.764 10.554 23.048 10.611C23.315 10.664 23.638 10.664 23.915 10.664H24C24.708 10.664 25.386 10.944 25.886 11.444C26.386 11.944 26.667 12.622 26.667 13.329C26.667 14.037 26.386 14.715 25.886 15.215C25.386 15.715 24.708 15.996 24 15.996H21.104L23.771 18.663H24C25.415 18.663 26.771 18.101 27.772 17.1C28.772 16.1 29.334 14.744 29.334 13.329C29.334 11.915 28.772 10.558 27.772 9.558C26.771 8.558 25.415 7.996 24 7.996H23.578C23.462 7.746 23.381 7.568 23.302 7.393C22.67 5.985 21.645 4.79 20.349 3.951C19.054 3.112 17.543 2.666 16 2.666Z" fill="#808080" />
            <Path d="M16 16L15.057 15.057L16 14.114L16.943 15.057L16 16ZM17.333 28C17.333 28.354 17.193 28.693 16.942 28.943C16.692 29.193 16.353 29.333 16 29.333C15.646 29.333 15.307 29.193 15.057 28.943C14.807 28.693 14.667 28.354 14.667 28H17.333ZM9.724 20.391L15.057 15.057L16.943 16.943L11.609 22.276L9.724 20.391ZM16.943 15.057L22.276 20.391L20.391 22.276L15.057 16.943L16.943 15.057ZM17.333 16V28H14.667V16H17.333Z" fill="#808080" />
        </Svg>
    );
}

function CloseIcon({ size = 12 }: { size?: number }): React.ReactElement {
    return (
        <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
            <Path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function DownloadIcon(): React.ReactElement {
    return (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d="M12 15.5C11.8667 15.5 11.7417 15.475 11.625 15.425C11.5083 15.375 11.4 15.3 11.3 15.2L7.7 11.6C7.5 11.4 7.404 11.1667 7.412 10.9C7.42 10.6333 7.516 10.4 7.7 10.2C7.9 10 8.13767 9.896 8.413 9.888C8.68833 9.88 8.92567 9.97567 9.125 10.175L11 12.05V5C11 4.71667 11.096 4.47933 11.288 4.288C11.48 4.09667 11.7173 4.00067 12 4C12.2827 3.99933 12.5203 4.09533 12.713 4.288C12.9057 4.48067 13.0013 4.718 13 5V12.05L14.875 10.175C15.075 9.975 15.3127 9.879 15.588 9.887C15.8633 9.895 16.1007 9.99933 16.3 10.2C16.4833 10.4 16.5793 10.6333 16.588 10.9C16.5967 11.1667 16.5007 11.4 16.3 11.6L12.7 15.2C12.6 15.3 12.4917 15.375 12.375 15.425C12.2583 15.475 12.1333 15.5 12 15.5ZM6 20C5.45 20 4.97933 19.8043 4.588 19.413C4.19667 19.0217 4.00067 18.5507 4 18V16C4 15.7167 4.096 15.4793 4.288 15.288C4.48 15.0967 4.71733 15.0007 5 15C5.28267 14.9993 5.52033 15.0953 5.713 15.288C5.90567 15.4807 6.00133 15.718 6 16V18H18V16C18 15.7167 18.096 15.4793 18.288 15.288C18.48 15.0967 18.7173 15.0007 19 15C19.2827 14.9993 19.5203 15.0953 19.713 15.288C19.9057 15.4807 20.0013 15.718 20 16V18C20 18.55 19.8043 19.021 19.413 19.413C19.0217 19.805 18.5507 20.0007 18 20H6Z" fill="#808080" />
        </Svg>
    );
}

function ResultIcon({ success }: { success: boolean }): React.ReactElement {
    if (success) {
        return (
            <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
                <Path d="M35.3337 45.9998L28.167 38.8332C27.5559 38.2221 26.7781 37.9165 25.8337 37.9165C24.8892 37.9165 24.1114 38.2221 23.5003 38.8332C22.8892 39.4443 22.5837 40.2221 22.5837 41.1665C22.5837 42.111 22.8892 42.8887 23.5003 43.4998L33.0003 52.9998C33.667 53.6665 34.4448 53.9998 35.3337 53.9998C36.2226 53.9998 37.0003 53.6665 37.667 52.9998L56.5003 34.1665C57.1114 33.5554 57.417 32.7776 57.417 31.8332C57.417 30.8887 57.1114 30.111 56.5003 29.4998C55.8892 28.8887 55.1114 28.5832 54.167 28.5832C53.2225 28.5832 52.4448 28.8887 51.8337 29.4998L35.3337 45.9998ZM40.0003 73.3332C35.3892 73.3332 31.0559 72.4576 27.0003 70.7065C22.9448 68.9554 19.417 66.581 16.417 63.5832C13.417 60.5854 11.0426 57.0576 9.29366 52.9998C7.54477 48.9421 6.66922 44.6087 6.667 39.9998C6.66477 35.3909 7.54033 31.0576 9.29366 26.9998C11.047 22.9421 13.4214 19.4143 16.417 16.4165C19.4126 13.4187 22.9403 11.0443 27.0003 9.29317C31.0603 7.54206 35.3937 6.6665 40.0003 6.6665C44.607 6.6665 48.9403 7.54206 53.0003 9.29317C57.0603 11.0443 60.5881 13.4187 63.5837 16.4165C66.5792 19.4143 68.9548 22.9421 70.7103 26.9998C72.4659 31.0576 73.3403 35.3909 73.3337 39.9998C73.327 44.6087 72.4514 48.9421 70.707 52.9998C68.9626 57.0576 66.5881 60.5854 63.5837 63.5832C60.5792 66.581 57.0514 68.9565 53.0003 70.7098C48.9492 72.4632 44.6159 73.3376 40.0003 73.3332Z" fill="#0166FF" />
            </Svg>
        );
    }

    return (
        <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
            <Path d="M56.6665 11.1333C61.7338 14.0589 65.9418 18.2669 68.8674 23.3342C71.793 28.4016 73.3332 34.1498 73.3332 40.001C73.3331 45.8523 71.7929 51.6004 68.8672 56.6678C65.9415 61.7351 61.7335 65.943 56.6661 68.8685C51.5988 71.7941 45.8506 73.3342 39.9993 73.3342C34.1481 73.3341 28.3999 71.7937 23.3326 68.868C18.2653 65.9423 14.0575 61.7342 11.132 56.6668C8.20644 51.5994 6.66636 45.8512 6.6665 40L6.68317 38.92C6.86985 33.1633 8.545 27.5532 11.5453 22.6366C14.5456 17.72 18.7687 13.6648 23.8028 10.8662C28.8369 8.06768 34.5103 6.62129 40.2699 6.66809C46.0294 6.7149 51.6785 8.25329 56.6665 11.1333ZM39.9998 50C39.1158 50 38.2679 50.3512 37.6428 50.9763C37.0177 51.6014 36.6665 52.4492 36.6665 53.3333V53.3666C36.6665 54.2507 37.0177 55.0985 37.6428 55.7237C38.2679 56.3488 39.1158 56.7 39.9998 56.7C40.8839 56.7 41.7317 56.3488 42.3569 55.7237C42.982 55.0985 43.3332 54.2507 43.3332 53.3666V53.3333C43.3332 52.4492 42.982 51.6014 42.3569 50.9763C41.7317 50.3512 40.8839 50 39.9998 50ZM39.9998 26.6666C39.1158 26.6666 38.2679 27.0178 37.6428 27.6429C37.0177 28.2681 36.6665 29.1159 36.6665 30V43.3333C36.6665 44.2174 37.0177 45.0652 37.6428 45.6903C38.2679 46.3154 39.1158 46.6666 39.9998 46.6666C40.8839 46.6666 41.7317 46.3154 42.3569 45.6903C42.982 45.0652 43.3332 44.2174 43.3332 43.3333V30C43.3332 29.1159 42.982 28.2681 42.3569 27.6429C41.7317 27.0178 40.8839 26.6666 39.9998 26.6666Z" fill="#0166FF" />
        </Svg>
    );
}

function Header({
    activityName,
    onMenuClick,
}: {
    activityName: string;
    onMenuClick: () => void;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            <Pressable style={commonStyles.iconbtn} onPress={onMenuClick} accessibilityLabel={t("common.menu")}>
                <Image source={require("../../../../../assets/icons/menu-01.png")} style={commonStyles.icon24} />
            </Pressable>

            <AppText style={styles.appTitle} numberOfLines={1}>{activityName}</AppText>

            <View style={styles.headerRightSpace} />
        </View>
    );
}

function ReadonlyField({
    label,
    value,
}: {
    label: string;
    value: string;
}): React.ReactElement {
    return (
        <View style={styles.field}>
            <AppText style={styles.fieldLabel}>{label}</AppText>
            <View style={styles.readonlyInput}>
                <AppText style={styles.readonlyInputText} numberOfLines={1}>{value}</AppText>
            </View>
        </View>
    );
}

function getEvaluationTotalScore(evaluation?: AssignmentSubmissionEvaluationResponse | null): number {
    return evaluation?.criteria.reduce((total, item) => total + item.score, 0) ?? 0;
}

function getEvaluationTotalMaxScore(evaluation?: AssignmentSubmissionEvaluationResponse | null): number {
    return evaluation?.criteria.reduce((total, item) => total + item.maxScore, 0) ?? 0;
}

function isEvaluationCompleted(
    submission?: AssignmentSubmissionResponse | null,
    evaluation?: AssignmentSubmissionEvaluationResponse | null
): boolean {
    return submission?.status === "REVIEWED" || !!evaluation?.evaluationId || !!evaluation?.evaluatedAt;
}

export default function EcaStudentAssignmentSubmit({
    route,
    navigation,
}: Props): React.ReactElement {
    const { t } = useTranslation();
    const { externalActivityId, assignmentId } = route.params;

    const [menuOpen, setMenuOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [myActivities, setMyActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const [assignment, setAssignment] = React.useState<AssignmentResponse | null>(null);
    const [mySubmission, setMySubmission] = React.useState<AssignmentSubmissionResponse | null>(null);
    const [existingFiles, setExistingFiles] = React.useState<SubmissionFileResponse[]>([]);
    const [existingLinks, setExistingLinks] = React.useState<SubmissionFileResponse[]>([]);
    const [initialExistingFileIds, setInitialExistingFileIds] = React.useState<number[]>([]);
    const [initialExistingLinkIds, setInitialExistingLinkIds] = React.useState<number[]>([]);
    const [files, setFiles] = React.useState<UploadFileItem[]>([]);
    const [linkUrl, setLinkUrl] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState("");
    const [submitResultModalOpen, setSubmitResultModalOpen] = React.useState(false);
    const [submitResult, setSubmitResult] = React.useState<"success" | "fail">("success");

    const [evaluation, setEvaluation] = React.useState<AssignmentSubmissionEvaluationResponse | null>(null);
    const [studentAssignment, setStudentAssignment] = React.useState<StudentAssignmentResponse | null>(null);

    const userName = (me?.name ?? "").trim() || "User";
    const userEmail = (me?.email ?? "").trim();
    const userRoleSet = Array.isArray(me?.roleSet) ? me.roleSet : [];
    const userProfileImg = getProfileImageUrl(me?.profileImage);

    async function fetchMySubmission(targetAssignmentId: string): Promise<void> {
        const data = await getMyAssignmentSubmissions(targetAssignmentId);
        const latestSubmission = data[0] ?? null;
        const nextFiles = latestSubmission?.files?.filter((file) => file.submitType !== "LINK") ?? [];
        const nextLinks = latestSubmission?.files?.filter((file) => file.submitType === "LINK") ?? [];

        setMySubmission(latestSubmission);
        setExistingFiles(nextFiles);
        setExistingLinks(nextLinks);
        setInitialExistingFileIds(nextFiles.map((file) => file.submissionFileId));
        setInitialExistingLinkIds(nextLinks.map((file) => file.submissionFileId));
        setLinkUrl("");

        if (!latestSubmission) {
            setEvaluation(null);
            return;
        }

        try {
            const evaluationData = await getSubmissionEvaluation(latestSubmission.submissionId);
            setEvaluation(evaluationData);
        } catch (e) {
            console.error(e);
            setEvaluation(null);
        }
    }

    React.useEffect(() => {
        let mounted = true;

        async function fetchPageData(): Promise<void> {
            setLoading(true);
            setError("");

            try {
                const [meData, activityListData, activityData, assignmentData, assignmentListData] = await Promise.all([
                    getUserMe(),
                    getMyParticipatingExternalActivities(),
                    getMyParticipatingExternalActivity(externalActivityId),
                    getAssignment(assignmentId),
                    getMyExternalActivityAssignments(externalActivityId),
                ]);

                const matchedStudentAssignment =
                    assignmentListData.find((item) => String(item.assignmentId) === String(assignmentId)) ?? null;

                if (!mounted) return;

                setMe(meData);
                setMyActivities([...activityListData].sort((a, b) => a.externalActivityId - b.externalActivityId));
                setActivity(activityData);
                setAssignment(assignmentData);
                setStudentAssignment(matchedStudentAssignment);

                await fetchMySubmission(assignmentId);
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setActivity(null);
                setAssignment(null);
                setMySubmission(null);
                setExistingFiles([]);
                setExistingLinks([]);
                setFiles([]);
                setLinkUrl("");
                setStudentAssignment(null);
                setEvaluation(null);
                setError(t(`${ASSIGNMENT_SUBMIT_T}.error.assignmentLoadFailed`));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchPageData();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, assignmentId, t]);

    const resultForms = assignment?.resultForms ?? [];
    const acceptsLink = resultForms.includes("LINK");
    const acceptsFile = resultForms.some((form) => form !== "LINK");
    const trimmedLinkUrl = linkUrl.trim();
    const hasAnyLink = existingLinks.length > 0 || trimmedLinkUrl.length > 0;
    const hasInvalidLink = trimmedLinkUrl.length > 0 && !isValidHttpUrl(trimmedLinkUrl);
    const hasInvalidFileType = files.some((item) => !isAllowedAssignmentFile(assignment?.resultForms, item.extension));
    const hasAnyFile = existingFiles.length > 0 || files.length > 0;
    const hasRequiredSubmission = (acceptsFile && hasAnyFile) || (acceptsLink && hasAnyLink);
    const currentExistingFileIds = existingFiles.map((file) => file.submissionFileId);
    const currentExistingLinkIds = existingLinks.map((file) => file.submissionFileId);
    const hasFileChange = files.length > 0 || !isSameNumberArray(initialExistingFileIds, currentExistingFileIds);
    const hasLinkChange = trimmedLinkUrl.length > 0 || !isSameNumberArray(initialExistingLinkIds, currentExistingLinkIds);
    const hasSubmissionChange = !mySubmission || hasFileChange || hasLinkChange;
    
    const evaluationCompleted = isEvaluationCompleted(mySubmission, evaluation);
    const evaluationTotalScore = getEvaluationTotalScore(evaluation);
    const evaluationTotalMaxScore = getEvaluationTotalMaxScore(evaluation);

    const submitDisabled =
        evaluationCompleted ||
        !hasRequiredSubmission ||
        !hasSubmissionChange ||
        hasInvalidFileType ||
        hasInvalidLink ||
        submitting ||
        loading ||
        !!error;    

    async function openFilePicker(): Promise<void> {
        try {
            const selectedFiles = await pick({
                allowMultiSelection: true,
                mode: "import",
            });

            const validFiles = selectedFiles.filter((file) => Number(file.size ?? 1) > 0);

            if (validFiles.length === 0) {
                Alert.alert("비어 있는 파일은 제출할 수 없습니다.");
                return;
            }

            const nextFiles: UploadFileItem[] = validFiles.map((file) => {
                const name = file.name ?? "file";
                const size = file.size ?? 0;

                return {
                    id: `${name}-${size}-${file.uri}`,
                    file: {
                        uri: file.uri,
                        name,
                        type: file.type ?? "application/octet-stream",
                        size,
                    },
                    extension: getFileExtension(name),
                };
            });

            setFiles((prev) => {
                const prevIds = new Set(prev.map((item) => item.id));
                const filtered = nextFiles.filter((item) => !prevIds.has(item.id));

                return [...prev, ...filtered];
            });
        } catch (e) {
            console.error(e);
        }
    }

    function removeFile(fileId: string): void {
        if (evaluationCompleted) return;

        setFiles((prev) => prev.filter((item) => item.id !== fileId));
    }

    function removeExistingFile(fileId: number): void {
        if (evaluationCompleted) return;

        setExistingFiles((prev) => prev.filter((file) => file.submissionFileId !== fileId));
    }

    function removeExistingLink(fileId: number): void {
        if (evaluationCompleted) return;

        setExistingLinks((prev) => prev.filter((file) => file.submissionFileId !== fileId));
    }

    async function handleOpenExistingLink(link: SubmissionFileResponse): Promise<void> {
        if (!link.url) {
            Alert.alert("링크 정보가 없습니다.");
            return;
        }

        const canOpen = await Linking.canOpenURL(link.url);

        if (!canOpen) {
            Alert.alert("링크를 열 수 없습니다.");
            return;
        }

        await Linking.openURL(link.url);
    }

    async function handleDownloadExistingFile(file: SubmissionFileResponse): Promise<void> {
        if (!file.url) {
            Alert.alert("파일 URL 정보가 없습니다.");
            return;
        }

        try {
            await Linking.openURL(file.url);
        } catch (e) {
            console.error(e);
            Alert.alert("파일을 열 수 없습니다.");
        }
    }

    async function submitNow(): Promise<void> {
        const uploadFiles = files.map((item) => item.file);
        const keepFileIds = [
            ...existingFiles.map((file) => file.submissionFileId),
            ...existingLinks.map((file) => file.submissionFileId),
        ];
        const nextUrls = trimmedLinkUrl ? [trimmedLinkUrl] : [];

        setSubmitting(true);

        try {
            if (mySubmission) {
                await updateAssignmentSubmission(mySubmission.submissionId, {
                    files: uploadFiles,
                    keepFileIds,
                    urls: nextUrls,
                });
            } else {
                await submitAssignment(assignmentId, {
                    files: uploadFiles,
                    urls: nextUrls,
                });
            }

            await fetchMySubmission(assignmentId);
            setFiles([]);
            setLinkUrl("");
            setSubmitResult("success");
            setSubmitResultModalOpen(true);
        } catch (e) {
            console.error(e);
            setSubmitResult("fail");
            setSubmitResultModalOpen(true);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSubmit(): Promise<void> {
        if (!assignmentId || submitting || evaluationCompleted) return;

        if (!hasRequiredSubmission) {
            Alert.alert(
                acceptsLink && !acceptsFile
                    ? t(`${ASSIGNMENT_SUBMIT_T}.alert.linkRequired`)
                    : t(`${ASSIGNMENT_SUBMIT_T}.alert.fileOrLinkRequired`)
            );
            return;
        }

        if (hasInvalidLink) {
            Alert.alert(t(`${ASSIGNMENT_SUBMIT_T}.alert.invalidLink`));
            return;
        }

        if (hasInvalidFileType) {
            Alert.alert(t(`${ASSIGNMENT_SUBMIT_T}.alert.invalidFileType`));
            return;
        }

        await submitNow();
    }

    function requireAuth(action: () => void): void {
        void getAccessToken().then((token) => {
            if (!token) {
                Alert.alert("로그인이 필요합니다.", "로그인 후 이용할 수 있습니다.");
                return;
            }

            action();
        });
    }

    function moveHome(): void {
        navigation.navigate("StudentHome");
    }

    function moveMyPage(): void {
        navigation.navigate("MyPage");
    }
    function moveVlogHome(): void {
        navigation.navigate("VlogHome");
    }

    function moveActivityMenu(activityId: number, menuKey: ActivityMenuKey): void {
        requireAuth(() => {
            if (menuKey === "dashboard") {
                navigation.navigate("EcaStudentDashboard", { externalActivityId: String(activityId) });
                return;
            }

            if (menuKey === "assignment") {
                navigation.navigate("EcaStudentAssignment", { externalActivityId: String(activityId) });
                return;
            }

            if (menuKey === "attendance") {
                navigation.navigate("EcaStudentMobileAttendance", { externalActivityId: String(activityId) });
                return;
            }

            if (menuKey === "leaderboard") {
                navigation.navigate("EcaStudentLeaderboard", { externalActivityId: String(activityId) });
                return;
            }

            Alert.alert("서비스 준비중입니다.");
        });
    }

    function moveSystemAdmin(): void {
        Alert.alert("앱에서는 관리자 페이지를 지원하지 않습니다.");
    }

    function moveJumpAdmin(): void {
        Alert.alert("앱에서는 관리자 페이지를 지원하지 않습니다.");
    }

    function moveKakaoAdmin(): void {
        Alert.alert("앱에서는 관리자 페이지를 지원하지 않습니다.");
    }

    return (
        <EcaStudentApp
            externalActivityId={externalActivityId}
            activeTab="assignment"
            overlay={(
                <StudentMobileSideMenu
                    isOpen={menuOpen}
                    onClose={() => setMenuOpen(false)}
                    userName={userName}
                    userEmail={userEmail}
                    userProfileImg={userProfileImg}
                    userRoleSet={userRoleSet}
                    activities={myActivities}
                    currentActivityId={Number(externalActivityId)}
                    currentActivityMenu="assignment"
                    onMoveHome={moveHome}
                    onMoveMyPage={moveMyPage}
                    onMoveActivityMenu={moveActivityMenu}
                    onMoveSystemAdmin={moveSystemAdmin}
                    onMoveJumpAdmin={moveJumpAdmin}
                    onMoveKakaoAdmin={moveKakaoAdmin}
                    onMoveVlogHome={moveVlogHome}
                />
            )}
        >
            <SafeAreaView style={commonStyles.appRoot}>
                <Header activityName={activity?.name ?? ""} onMenuClick={() => setMenuOpen(true)} />
                <ScrollView style={styles.main} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.titleRow}>
                        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="뒤로가기">
                            <BackIcon />
                        </Pressable>

                        <AppText style={styles.title} numberOfLines={1}>{assignment?.name ?? ""}</AppText>
                    </View>

                    {loading ? (
                        <View style={styles.emptyWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : error ? (
                        <View style={styles.emptyWrap}>
                            <AppText style={styles.emptyText}>{error}</AppText>
                        </View>
                    ) : (
                        <>
                            <View style={styles.card}>
                                <AppText style={styles.cardTitle}>{t(`${ASSIGNMENT_SUBMIT_T}.uploadTitle`)}</AppText>

                                <ReadonlyField label={t(`${ASSIGNMENT_SUBMIT_T}.assignmentName`)} value={assignment?.name ?? ""} />

                                <View style={styles.period}>
                                    <AppText style={styles.fieldLabel}>과제 수행 기간</AppText>

                                    <View style={styles.periodRow}>
                                        <View style={styles.periodInput}>
                                            <AppText style={styles.readonlyInputText} numberOfLines={1}>{formatDateTime(assignment?.startDate, assignment?.startTime)}</AppText>
                                        </View>

                                        <AppText style={styles.periodDash}>-</AppText>

                                        <View style={styles.periodInput}>
                                            <AppText style={styles.readonlyInputText} numberOfLines={1}>{formatDateTime(assignment?.endDate, assignment?.endTime)}</AppText>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.grid}>
                                    <View style={styles.gridItem}>
                                        <AppText style={styles.fieldLabel}>팀/개인</AppText>
                                        <View style={styles.readonlyInput}>
                                            <AppText style={styles.readonlyInputText}>{getStudentAssignmentFormLabel(assignment, studentAssignment, t)}</AppText>
                                        </View>
                                    </View>

                                    <View style={styles.gridItem}>
                                        <AppText style={styles.fieldLabel}>과제 형태</AppText>
                                        <View style={styles.readonlyInput}>
                                            <AppText style={styles.readonlyInputText} numberOfLines={1}>{getResultFormsLabel(assignment?.resultForms, t)}</AppText>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.card}>
                                <AppText style={styles.cardTitle}>과제 업로드</AppText>

                                {acceptsFile ? (
                                    <View style={styles.submissionMeta}>
                                        <AppText style={styles.submissionMetaLabel}>
                                            {t(`${ASSIGNMENT_SUBMIT_T}.fileLabel`)}
                                        </AppText>

                                        {mySubmission ? (
                                            <AppText style={styles.submissionMetaDate} numberOfLines={1}>
                                                {t(`${ASSIGNMENT_SUBMIT_T}.lastModifiedAt`)} {formatSubmittedAt(getLatestSubmittedAt(mySubmission))}
                                            </AppText>
                                        ) : null}
                                    </View>
                                ) : null}

                                {acceptsFile ? (
                                    <Pressable
                                        style={[styles.uploadBox, evaluationCompleted ? styles.uploadBoxDisabled : null]}
                                        onPress={openFilePicker}
                                        disabled={evaluationCompleted}
                                    >
                                        <UploadIcon />
                                        <AppText style={styles.uploadText}>
                                            {t(`${ASSIGNMENT_SUBMIT_T}.fileUploadGuide`)}
                                        </AppText>
                                    </Pressable>
                                ) : null}

                                {acceptsLink ? (
                                    <View style={[styles.linkArea, acceptsFile ? null : styles.linkAreaOnly]}>
                                        <TextInput
                                            value={linkUrl}
                                            onChangeText={setLinkUrl}
                                            placeholder={t(`${ASSIGNMENT_SUBMIT_T}.linkPlaceholder`)}
                                            placeholderTextColor="#808080"
                                            autoCapitalize="none"
                                            keyboardType="url"
                                            editable={!evaluationCompleted}
                                            style={[styles.linkInput, hasInvalidLink ? styles.linkInputInvalid : null]}
                                        />

                                        {existingLinks.map((link) => (
                                            <View style={styles.linkItem} key={link.submissionFileId}>
                                                <Pressable style={{ flex: 1 }} onPress={() => void handleOpenExistingLink(link)}>
                                                    <AppText style={styles.linkText} numberOfLines={1}>{link.url ?? "링크 정보 없음"}</AppText>
                                                </Pressable>

                                                {!evaluationCompleted ? (
                                                    <Pressable style={styles.linkRemoveButton} onPress={() => removeExistingLink(link.submissionFileId)}>
                                                        <CloseIcon />
                                                    </Pressable>
                                                ) : null}
                                            </View>
                                        ))}

                                        {hasInvalidLink ? (
                                            <AppText style={styles.linkError}>http 또는 https로 시작하는 링크를 입력해주세요.</AppText>
                                        ) : null}
                                    </View>
                                ) : null}

                                {evaluationCompleted ? (
                                    <View style={styles.evaluatedBar}>
                                        <AppText style={styles.evaluatedBarText}>
                                            {t(`${ASSIGNMENT_SUBMIT_T}.evaluatedNotice`)}
                                        </AppText>
                                    </View>
                                ) : null}
                                
                                {existingFiles.length > 0 ? (
                                    <View style={styles.fileList}>
                                        {existingFiles.map((file) => {
                                            const fileName = file.originalFileName ?? `submission-file-${file.submissionFileId}`;
                                            const extension = getFileExtension(fileName);
                                            const warning = getAssignmentFileWarning(assignment?.resultForms, extension);

                                            return (
                                                <View style={styles.fileItem} key={file.submissionFileId}>
                                                    <View style={styles.fileMain}>
                                                        <View style={styles.fileIcon}>
                                                            {getFileIconByExtension(extension)}
                                                        </View>

                                                        <View style={styles.fileNameWrap}>
                                                            <AppText style={styles.fileName} numberOfLines={1}>{fileName}</AppText>
                                                            {warning ? <AppText style={styles.fileWarning}>{warning}</AppText> : null}
                                                        </View>
                                                    </View>

                                                    <View style={styles.fileActions}>
                                                        <Pressable style={styles.fileActionButton} onPress={() => void handleDownloadExistingFile(file)} accessibilityLabel="파일 열기">
                                                            <DownloadIcon />
                                                        </Pressable>

                                                        <Pressable style={styles.fileActionButton} onPress={() => removeExistingFile(file.submissionFileId)} accessibilityLabel="파일 삭제">
                                                            <CloseIcon />
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}

                                {files.length > 0 ? (
                                    <View style={styles.fileList}>
                                        {files.map((item) => {
                                            const warning = getAssignmentFileWarning(assignment?.resultForms, item.extension);

                                            return (
                                                <View style={styles.fileItem} key={item.id}>
                                                    <View style={styles.fileMain}>
                                                        <View style={styles.fileIcon}>
                                                            {getFileIconByExtension(item.extension)}
                                                        </View>

                                                        <View style={styles.fileNameWrap}>
                                                            <AppText style={styles.fileName} numberOfLines={1}>{item.file.name}</AppText>
                                                            {warning ? <AppText style={styles.fileWarning}>{warning}</AppText> : null}
                                                        </View>
                                                    </View>

                                                    <Pressable style={styles.fileRemoveButton} onPress={() => removeFile(item.id)} accessibilityLabel="파일 삭제">
                                                        <CloseIcon />
                                                    </Pressable>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </View>
                            {evaluationCompleted && evaluation ? (
                                <>
                                    <View style={[styles.card, styles.evaluationCard]}>
                                        <AppText style={styles.cardTitle}>
                                            {t(`${ASSIGNMENT_SUBMIT_T}.evaluationTitle`)}
                                        </AppText>

                                        <View style={[styles.evaluationRow, styles.evaluationRowTotal]}>
                                            <AppText style={styles.evaluationLabel}>
                                                {t(`${ASSIGNMENT_SUBMIT_T}.totalScore`)}
                                            </AppText>
                                            <AppText style={[styles.evaluationScore, styles.evaluationScoreTotal]}>
                                                {evaluationTotalScore}/{evaluationTotalMaxScore}
                                            </AppText>
                                        </View>

                                        {evaluation.criteria.map((criterion) => (
                                            <View style={styles.evaluationRow} key={criterion.criterionId}>
                                                <AppText style={styles.evaluationLabel} numberOfLines={1}>
                                                    {criterion.name}
                                                </AppText>
                                                <AppText style={styles.evaluationScore}>
                                                    {criterion.score}/{criterion.maxScore}
                                                </AppText>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={[styles.card, styles.feedbackCard]}>
                                        <AppText style={styles.cardTitle}>
                                            {t(`${ASSIGNMENT_SUBMIT_T}.feedbackTitle`)}
                                        </AppText>

                                        <AppText style={styles.feedbackText}>
                                            {evaluation.feedback?.trim() || t(`${ASSIGNMENT_SUBMIT_T}.noFeedback`)}
                                        </AppText>
                                    </View>
                                </>
                            ) : null}

                            <View style={styles.buttonRow}>
                                <Pressable style={[styles.submitButton, submitDisabled ? styles.submitButtonDisabled : null]} disabled={submitDisabled} onPress={handleSubmit}>
                                    <AppText style={[styles.submitButtonText, submitDisabled ? styles.submitButtonTextDisabled : null]}>
                                        {evaluationCompleted
                                            ? t(`${ASSIGNMENT_SUBMIT_T}.evaluationCompletedButton`)
                                            : submitting
                                                ? t(`${ASSIGNMENT_SUBMIT_T}.savingButton`)
                                                : mySubmission
                                                    ? t(`${ASSIGNMENT_SUBMIT_T}.editButton`)
                                                    : t(`${ASSIGNMENT_SUBMIT_T}.submitButton`)}
                                    </AppText>
                                </Pressable>
                            </View>
                        </>
                    )}
                </ScrollView>

                <Modal visible={submitResultModalOpen} transparent animationType="fade" onRequestClose={() => setSubmitResultModalOpen(false)}>
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modal}>
                            <View style={styles.modalIcon}>
                                <ResultIcon success={submitResult === "success"} />
                            </View>

                            <AppText style={styles.modalTitle}>{submitResult === "success" ? "제출 완료" : "제출 실패"}</AppText>

                            <Pressable style={styles.modalButton} onPress={() => setSubmitResultModalOpen(false)}>
                                <AppText style={styles.modalButtonText}>{submitResult === "success" ? "확인" : "다시 시도"}</AppText>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </EcaStudentApp>
    );
}