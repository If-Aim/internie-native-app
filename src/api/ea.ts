import { api, apiUpload, UploadFileLike } from "./client";

/* - EA 관련 공통 타입 - */
export type ExternalActivityProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "DELAYED";

/* - Assignment 공통 타입 - */
export type AssignmentSystemForm = "INDIVIDUAL" | "TEAM";
export type AssignmentResultForm = "WRITING" | "IMAGE" | "VIDEO" | "LINK" | "ETC";
export type AssignmentParticipantType = "USER" | "TEAM";
export type AssignmentParticipantStatus = "NOT_SUBMITTED" | "SUBMITTED" | "LATE_SUBMITTED" | "LATE";
export type TeamRole = "LEADER" | "MEMBER";

export type AssignmentParticipantResponse = {
    assignmentParticipantId: number;
    participantType: AssignmentParticipantType;
    userId?: number | null;
    userName?: string | null;
    userNickname?: string | null;
    userLinkedinUrl?: string | null;
    teamId?: number | null;
    teamName?: string | null;
    status: AssignmentParticipantStatus;
};

export type AssignmentResponse = {
    assignmentId: number;
    name: string;
    description?: string | null;
    externalActivityId: number;
    systemForm: AssignmentSystemForm;
    resultForms: AssignmentResultForm[];
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt: string;
    maxAutoTeams?: number | null;
    assigneeUserIds: number[];
    teamMemberConfigurationLocked: boolean;
    participants: AssignmentParticipantResponse[];
};

/* - Attendance 공통 타입 - */
export type AttendanceEventProgress = "SCHEDULED" | "OPEN" | "CLOSED";
export type AttendanceEventType = "CLASS_START" | "CLASS_END";
export type AttendanceStatus = "NOT_CHECKED" | "PRESENT" | "LATE" | "VERY_LATE" | "EARLY_LEAVE" | "VERY_EARLY_LEAVE" | "ABSENT";
export type AttendanceEventSort = "latest" | "oldest" | "rateAsc" | "rateDesc";
export type AttendanceParticipantSort = "rateDesc" | "rateAsc" | "nameAsc";

export type AttendanceEventCreateRequest = {
    roundNumber: number;
    name: string;
    eventDate: string;
    type: AttendanceEventType;
    uploadWindowStart: string;
    scoreReferenceAt: string;
    durationMinutes: number;
    fullCreditThresholdMinutes?: number | null;
    partialCreditThresholdMinutes?: number | null;
    halfCreditThresholdMinutes?: number | null;
};

export type AttendanceEventResponse = {
    eventId: number;
    name: string;
    roundNumber: number;
    type: AttendanceEventType;
    eventDate: string;
    uploadWindowStart: string;
    uploadWindowEnd: string;
    scoreReferenceAt: string;
    durationMinutes: number;
    fullCreditThresholdMinutes: number;
    partialCreditThresholdMinutes: number;
    halfCreditThresholdMinutes: number;
    progress: AttendanceEventProgress;
    attendanceRatePercent: number;
};

export type MyAttendanceEventResponse = {
    eventId: number;
    name: string;
    roundNumber: number;
    type: AttendanceEventType;
    eventDate: string;
    uploadWindowStart: string;
    uploadWindowEnd: string;
    scoreReferenceAt: string;
    durationMinutes: number;
    fullCreditThresholdMinutes: number;
    partialCreditThresholdMinutes: number;
    halfCreditThresholdMinutes: number;
    progress: AttendanceEventProgress;
    status: AttendanceStatus;
    score: number;
    checkedAt?: string | null;
};

export type AttendanceCheckInResponse = {
    status: AttendanceStatus;
    score: number;
    selfieUrl?: string | null;
    checkedAt: string;
};

export type AttendanceSummaryResponse = {
    totalParticipantCount: number;
    attendanceMinimumRate?: number | null;
    averageAttendanceRate: number;
    belowThresholdCount: number;
};

export type AttendanceEventParticipantRecordResponse = {
    recordId: number;
    userId: number;
    name: string;
    nickname?: string | null;
    profileImage?: string | null;
    linkedinUrl?: string | null;
    status: AttendanceStatus;
    score: number;
    checkedAt?: string | null;
    selfieUrl?: string | null;
};

export type AttendanceEventDetailResponse = {
    eventId: number;
    name: string;
    roundNumber: number;
    type: AttendanceEventType;
    eventDate: string;
    uploadWindowStart: string;
    uploadWindowEnd: string;
    scoreReferenceAt: string;
    durationMinutes: number;
    fullCreditThresholdMinutes: number;
    partialCreditThresholdMinutes: number;
    halfCreditThresholdMinutes: number;
    progress: AttendanceEventProgress;
    records: AttendanceEventParticipantRecordResponse[];
};

export type MyAttendanceSelfieResponse = {
    recordId: number;
    name: string;
    selfieUrl?: string | null;
};

export type MyAttendanceEventDetailResponse = {
    eventId: number;
    name: string;
    roundNumber: number;
    type: AttendanceEventType;
    eventDate: string;
    uploadWindowStart: string;
    uploadWindowEnd: string;
    progress: AttendanceEventProgress;
    records: MyAttendanceSelfieResponse[];
};

export type AttendanceParticipantRateResponse = {
    userId: number;
    name: string;
    nickname?: string | null;
    profileImage?: string | null;
    linkedinUrl?: string | null;
    cumulativeRate: number;
    thresholdMet: boolean;
};

export type AttendanceWindowOpenRequest = {
    type: AttendanceEventType;
    openAt: string;
    scoreReferenceAt: string;
};

export type AttendanceWindowCloseRequest = {
    closedAt: string;
};

export type AttendanceRecordStatusUpdateRequest = {
    status: AttendanceStatus;
};

export type AttendanceCheckInEligibilityResponse = {
    eligible: boolean;
    alreadyChecked: boolean;
};


/* - Team 공통 타입 - */
export type TeamMemberResponse = {
    teamMemberId: number;
    userId: number;
    userName: string;
    profileImage?: string | null;
    role: TeamRole;
    joinedAt: string;
};

export type TeamResponse = {
    teamId: number;
    externalActivityId: number;
    name: string;
    description?: string | null;
    members: TeamMemberResponse[];
};

export type TeamCreateRequest = {
    name: string;
    description?: string | null;
    memberUserIds: number[];
    leaderUserId?: number | null;
};

export type TeamUpdateRequest = {
    name?: string | null;
    description?: string | null;
};

export type TeamMemberRequest = {
    userId: number;
    role?: TeamRole | null;
};

export type InlineTeamCreateRequest = TeamCreateRequest;

export type TeamMemberMoveRequest = {
    targetTeamId: number;
};

/* - EA 관련 Student 타입 - */
export type ExternalActivityManager = {
    userId: number;
    name: string;
    profileImage?: string | null;
    roleSet?: string[];
};

export type StudentExternalActivityResponse = {
    externalActivityId: number;
    organizationId: number;
    organizationName: string;
    name: string;
    startDate: string;
    endDate: string;
    progressStatus: ExternalActivityProgressStatus;
};

export type StudentExternalActivityDetailResponse = StudentExternalActivityResponse & {
    managers: ExternalActivityManager[];
};

export async function getMyParticipatingExternalActivities(): Promise<StudentExternalActivityResponse[]> {
    return api<StudentExternalActivityResponse[]>("/users/me/externalActivities/participating", {
        method: "GET",
    });
}

export async function getMyParticipatingExternalActivity(
    externalActivityId: number | string
): Promise<StudentExternalActivityDetailResponse> {
    return api<StudentExternalActivityDetailResponse>(
        `/users/me/externalActivities/participating/${externalActivityId}`,
        { method: "GET" }
    );
}

/* - Assignment 관련 Student 타입 - */
export type SubmissionStatus = "SUBMITTED" | "REVIEWED";

export type StudentAssignmentTeam = {
    teamId: number;
    name: string;
    role: TeamRole;
};

export type StudentAssignmentResponse = {
    assignmentId: number;
    name: string;
    description?: string | null;
    externalActivityId: number;
    resultForms: AssignmentResultForm[];
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt: string;
    submittedAt?: string | null;
    isTeamAssignment: boolean;
    myTeam?: StudentAssignmentTeam | null;
    status: AssignmentParticipantStatus;
    evaluationCompleted?: boolean;
};

export type SubmissionFileSubmitType = "FILE" | "LINK";

export type SubmissionFileResponse = {
    submissionFileId: number;
    url?: string | null;
    submitType?: SubmissionFileSubmitType | null;
    originalFileName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
};

export type AssignmentSubmissionResponse = {
    submissionId: number;
    assignmentId: number;
    participantId: number;
    submitterUserId: number;
    submitterName: string;
    submittedAt: string;
    updatedAt?: string | null;
    lateOnSubmission: boolean;
    description?: string | null;
    status: SubmissionStatus;
    files: SubmissionFileResponse[];
};

export type AssignmentEvaluationItemResponse = {
    criterionId: number;
    name: string;
    displayOrder: number;
    maxScore: number;
    score: number;
};

export type AssignmentSubmissionEvaluationResponse = {
    evaluationId?: number | null;
    submissionId: number;
    assignmentId: number;
    participantId: number;
    lateOnSubmission: boolean;
    evaluatorUserId?: number | null;
    evaluatorName?: string | null;
    feedback?: string | null;
    evaluatedAt?: string | null;
    updatedAt?: string | null;
    criteria: AssignmentEvaluationItemResponse[];
};

export type SubmitAssignmentInput = {
    description?: string;
    participantId?: number | null;
    files?: UploadFileLike[];
    urls?: string[];
};

export type UpdateAssignmentSubmissionInput = {
    description?: string;
    files?: UploadFileLike[];
    keepFileIds?: number[];
    urls?: string[];
};

function appendFile(formData: FormData, fieldName: string, file: UploadFileLike): void {
    formData.append(
        fieldName,
        {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as any
    );
}

function appendUrls(formData: FormData, urls?: string[]): void {
    urls?.forEach((url) => {
        const trimmedUrl = url.trim();

        if (trimmedUrl) {
            formData.append("urls", trimmedUrl);
        }
    });
}

export async function getMyExternalActivityAssignments(
    externalActivityId: number | string
): Promise<StudentAssignmentResponse[]> {
    return api<StudentAssignmentResponse[]>(
        `/externalActivities/${externalActivityId}/assignments/me`,
        { method: "GET" }
    );
}

export async function getAssignment(
    assignmentId: number | string
): Promise<AssignmentResponse> {
    return api<AssignmentResponse>(
        `/assignments/${assignmentId}`,
        { method: "GET" }
    );
}

export async function getMyAssignmentSubmissions(
    assignmentId: number | string
): Promise<AssignmentSubmissionResponse[]> {
    return api<AssignmentSubmissionResponse[]>(
        `/assignments/${assignmentId}/submissions/me`,
        { method: "GET" }
    );
}

function appendJsonPart(formData: FormData, fieldName: string, value: unknown): void {
    formData.append(
        fieldName,
        {
            string: JSON.stringify(value),
            name: `${fieldName}.json`,
            type: "application/json",
        } as any
    );
}

export async function submitAssignment(
    assignmentId: number | string,
    input: SubmitAssignmentInput
): Promise<AssignmentSubmissionResponse> {
    const formData = new FormData();

    appendJsonPart(formData, "meta", {
        description: input.description ?? "",
        participantId: input.participantId ?? null,
    });

    input.files?.forEach((file) => {
        appendFile(formData, "files", file);
    });

    appendUrls(formData, input.urls);

    return apiUpload<AssignmentSubmissionResponse>(
        `/assignments/${assignmentId}/submissions`,
        formData,
        { method: "POST" }
    );
}

export async function updateAssignmentSubmission(
    submissionId: number | string,
    input: UpdateAssignmentSubmissionInput
): Promise<AssignmentSubmissionResponse> {
    const formData = new FormData();

    appendJsonPart(formData, "meta", {
        description: input.description ?? "",
    });

    input.keepFileIds?.forEach((fileId) => {
        formData.append("keepFileIds", String(fileId));
    });

    input.files?.forEach((file) => {
        appendFile(formData, "files", file);
    });

    appendUrls(formData, input.urls);

    return apiUpload<AssignmentSubmissionResponse>(
        `/submissions/${submissionId}`,
        formData,
        { method: "PATCH" }
    );
}

export async function deleteAssignmentSubmission(
    submissionId: number | string
): Promise<void> {
    await api<void>(
        `/submissions/${submissionId}`,
        { method: "DELETE" }
    );
}

export async function getSubmissionEvaluation(
    submissionId: number | string
): Promise<AssignmentSubmissionEvaluationResponse> {
    return api<AssignmentSubmissionEvaluationResponse>(
        `/submissions/${submissionId}/evaluation`,
        { method: "GET" }
    );
}

/* - Attendance 관련 Student API - */
export async function getMyAttendanceEvents(
    externalActivityId: number | string
): Promise<MyAttendanceEventResponse[]> {
    return api<MyAttendanceEventResponse[]>(
        `/externalActivities/${externalActivityId}/attendance-events/me`,
        { method: "GET" }
    );
}

export async function getMyAttendanceEventDetail(
    eventId: number | string
): Promise<MyAttendanceEventDetailResponse> {
    return api<MyAttendanceEventDetailResponse>(
        `/attendance-events/${eventId}/me`,
        { method: "GET" }
    );
}

export async function getAttendanceCheckInEligibility(
    eventId: number | string
): Promise<AttendanceCheckInEligibilityResponse> {
    return api<AttendanceCheckInEligibilityResponse>(
        `/attendance-events/${eventId}/check-in/eligibility`,
        { method: "GET" }
    );
}

export async function checkInAttendance(
    eventId: number | string,
    type: AttendanceEventType,
    selfie: UploadFileLike
): Promise<AttendanceCheckInResponse> {
    const formData = new FormData();

    formData.append("type", type);
    appendFile(formData, "selfie", selfie);

    return apiUpload<AttendanceCheckInResponse>(
        `/attendance-events/${eventId}/check-in`,
        formData,
        { method: "POST" }
    );
}

/* - Team 관련 Student API - */
export async function getMyExternalActivityTeams(
    externalActivityId: number | string
): Promise<TeamResponse[]> {
    return api<TeamResponse[]>(
        `/externalActivities/${externalActivityId}/teams`,
        { method: "GET" }
    );
}

export async function getMyTeam(
    teamId: number | string
): Promise<TeamResponse> {
    return api<TeamResponse>(
        `/teams/${teamId}`,
        { method: "GET" }
    );
}

function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
    const queryString = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&");

    return queryString ? `?${queryString}` : "";
}

/* - LeaderBoard 관련 공통 타입 - */
export type LeaderboardScope = "individual" | "team";
export type LeaderboardSort = "score" | "latest";
export type LeaderboardApprovalSort = "latest" | "oldest";
export type LeaderboardApprovalStatus = "pending" | "approved" | "rejected" | "all";
export type LeaderboardMissionCategory = "ELICIT" | "DISCOVER" | "INSIGHT" | "SYNTHESIZE" | "OWN" | "NURTURE";
export type LeaderboardEvidenceType = "IMAGE" | "LINK" | "DOCUMENT" | "VIDEO" | "OTHER";
export type LeaderboardTrendDirection = "UP" | "DOWN" | "SAME";
export type LeaderboardSubmissionEvidenceSubmitType = "FILE" | "LINK";

export const LEADERBOARD_MISSION_CATEGORY_OPTIONS: { value: LeaderboardMissionCategory; label: string }[] = [
    { value: "ELICIT", label: "E - Elicit" },
    { value: "DISCOVER", label: "D - Discover" },
    { value: "INSIGHT", label: "I - Insight" },
    { value: "SYNTHESIZE", label: "S - Synthesize" },
    { value: "OWN", label: "O - Own" },
    { value: "NURTURE", label: "N - Nurture" },
];

export type LeaderboardApiResponse<T> = {
    data: T;
    timestamp: string;
};

export type LeaderboardRankingResponse = {
    rank: number;
    studentId: number;
    studentName: string;
    studentNickname?: string | null;
    profileImage?: string | null;
    totalScore: number;
    attendanceScore: number;
    assignmentScore: number;
    participationScore: number;
    lastReviewedAt?: string | null;
    trendDirection?: LeaderboardTrendDirection | null;
    trendValue?: number | null;
};

export type StudentLeaderboardResponse = {
    externalActivityId: number;
    studentId: number;
    myRank?: number | null;
    myTotalScore: number;
    myTrendDirection?: LeaderboardTrendDirection | null;
    myTrendValue?: number | null;
    page: number;
    size: number;
    totalCount: number;
    rankings: LeaderboardRankingResponse[];
};

export type LeaderboardSubmissionEvidenceResponse = {
    evidenceId?: number | null;
    submitType?: LeaderboardSubmissionEvidenceSubmitType | null;
    evidenceUrl: string;
    originalFileName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
};

export type LeaderboardMissionResponse = {
    missionId: number;
    externalActivityId: number;
    name: string;
    description?: string | null;
    category: LeaderboardMissionCategory;
    points: number;
    maximumPerStudent: number;
    evidenceName?: string | null;
    evidenceType: LeaderboardEvidenceType;
    autoReflect: boolean;
};

export type LeaderboardMissionListResponse = {
    externalActivityId: number;
    totalCount: number;
    missions: LeaderboardMissionResponse[];
};

export type StudentLeaderboardLogResponse = {
    submissionId: number;
    missionId: number;
    missionName: string;
    category: LeaderboardMissionCategory;
    status: LeaderboardApprovalStatus;
    score?: number | null;
    submittedAt?: string | null;
    reviewedAt?: string | null;
};

export type StudentLeaderboardLogsResponse = {
    externalActivityId: number;
    studentId: number;
    page: number;
    size: number;
    totalCount: number;
    logs: StudentLeaderboardLogResponse[];
};

export type LeaderboardSubmissionResponse = {
    submissionId: number;
    missionId: number;
    missionName: string;
    category?: LeaderboardMissionCategory | null;
    points?: number | null;
    studentId: number;
    studentName: string;
    studentNickname?: string | null;
    profileImage?: string | null;
    status: LeaderboardApprovalStatus;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    evidenceUrl?: string | null;
    evidences?: LeaderboardSubmissionEvidenceResponse[] | null;
    rejectReason?: string | null;
};

export type LeaderboardApprovalsResponse = {
    externalActivityId: number;
    status: LeaderboardApprovalStatus;
    sort: LeaderboardApprovalSort;
    page: number;
    size: number;
    totalCount: number;
    submissions: LeaderboardSubmissionResponse[];
};

export type LeaderboardCompletedMissionResponse = {
    submissionId: number;
    missionId: number;
    missionName: string;
    category: LeaderboardMissionCategory;
    score: number;
    completedAt?: string | null;
    evidenceUrl?: string | null;
    evidences?: LeaderboardSubmissionEvidenceResponse[] | null;
};

export type LeaderboardCompletedMissionsResponse = {
    externalActivityId: number;
    studentId: number;
    page: number;
    size: number;
    totalCount: number;
    missions: LeaderboardCompletedMissionResponse[];
};

export type StudentLeaderboardEvidenceResponse = {
    externalActivityId: number;
    submissionId: number;
    studentId: number;
    evidenceUrl?: string | null;
    evidences?: LeaderboardSubmissionEvidenceResponse[] | null;
    submittedAt: string;
};

export type StudentLeaderboardSubmitResponse = {
    submissionId: number;
    externalActivityId: number;
    missionId: number;
    studentId: number;
    status: LeaderboardApprovalStatus;
    autoReflected: boolean;
    submittedAt: string;
    reviewedAt?: string | null;
    approvedPoint?: number | null;
    adjustPoint?: number | null;
    evidenceUrl?: string | null;
    evidences?: LeaderboardSubmissionEvidenceResponse[] | null;
};

export type LeaderboardEvidenceInput = {
    file?: UploadFileLike | null;
    files?: UploadFileLike[] | null;
    evidenceUrl?: string | null;
    evidenceUrls?: string[] | null;
};

function buildLeaderboardEvidenceForm(input: LeaderboardEvidenceInput): FormData {
    const formData = new FormData();

    if (input.file) {
        appendFile(formData, "file", input.file);
    }

    input.files?.forEach((file) => {
        appendFile(formData, "files", file);
    });

    if (input.evidenceUrl?.trim()) {
        formData.append("evidenceUrl", input.evidenceUrl.trim());
    }

    input.evidenceUrls
        ?.map((url) => url.trim())
        .filter(Boolean)
        .forEach((url) => {
            formData.append("evidenceUrls", url);
        });

    return formData;
}

/* - LeaderBoard 관련 Student API - */
export async function getMyLeaderboard(
    externalActivityId: number | string,
    query?: { page?: number; size?: number }
): Promise<StudentLeaderboardResponse> {
    const queryString = buildQueryString({
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    const response = await api<LeaderboardApiResponse<StudentLeaderboardResponse>>(
        `/student/externalActivities/${externalActivityId}/leaderboard${queryString}`,
        { method: "GET" }
    );

    return response.data;
}

export async function getMyLeaderboardMissions(
    externalActivityId: number | string,
    category?: LeaderboardMissionCategory | null
): Promise<LeaderboardMissionListResponse> {
    const queryString = buildQueryString({ category });

    const response = await api<LeaderboardApiResponse<LeaderboardMissionListResponse>>(
        `/student/externalActivities/${externalActivityId}/missions${queryString}`,
        { method: "GET" }
    );

    return response.data;
}

export async function getMyLeaderboardMissionLogs(
    externalActivityId: number | string,
    query?: { category?: LeaderboardMissionCategory | null; page?: number; size?: number }
): Promise<StudentLeaderboardLogsResponse> {
    const queryString = buildQueryString({
        category: query?.category,
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    const response = await api<LeaderboardApiResponse<StudentLeaderboardLogsResponse>>(
        `/student/externalActivities/${externalActivityId}/missions/logs${queryString}`,
        { method: "GET" }
    );

    return response.data;
}

export async function getMyLeaderboardSubmissions(
    externalActivityId: number | string,
    query?: { status?: LeaderboardApprovalStatus; page?: number; size?: number }
): Promise<LeaderboardApprovalsResponse> {
    const queryString = buildQueryString({
        status: query?.status ?? "all",
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    const response = await api<LeaderboardApiResponse<LeaderboardApprovalsResponse>>(
        `/student/externalActivities/${externalActivityId}/submissions${queryString}`,
        { method: "GET" }
    );

    return response.data;
}

export async function submitLeaderboardMission(
    externalActivityId: number | string,
    missionId: number | string,
    input: LeaderboardEvidenceInput
): Promise<StudentLeaderboardSubmitResponse> {
    const response = await apiUpload<LeaderboardApiResponse<StudentLeaderboardSubmitResponse>>(
        `/externalActivities/${externalActivityId}/missions/${missionId}/submissions`,
        buildLeaderboardEvidenceForm(input),
        { method: "POST" }
    );

    return response.data;
}

export async function updateMyLeaderboardEvidence(
    externalActivityId: number | string,
    submissionId: number | string,
    input: LeaderboardEvidenceInput
): Promise<StudentLeaderboardEvidenceResponse> {
    const response = await apiUpload<LeaderboardApiResponse<StudentLeaderboardEvidenceResponse>>(
        `/student/externalActivities/${externalActivityId}/submissions/${submissionId}/evidence`,
        buildLeaderboardEvidenceForm(input),
        { method: "PATCH" }
    );

    return response.data;
}

export async function resubmitMyLeaderboardSubmission(
    externalActivityId: number | string,
    submissionId: number | string,
    input: LeaderboardEvidenceInput
): Promise<StudentLeaderboardEvidenceResponse> {
    const response = await apiUpload<LeaderboardApiResponse<StudentLeaderboardEvidenceResponse>>(
        `/student/externalActivities/${externalActivityId}/submissions/${submissionId}/resubmit`,
        buildLeaderboardEvidenceForm(input),
        { method: "PATCH" }
    );

    return response.data;
}

export async function deleteMyRejectedLeaderboardSubmission(
    externalActivityId: number | string,
    submissionId: number | string
): Promise<void> {
    await api<void>(
        `/student/externalActivities/${externalActivityId}/submissions/${submissionId}/rejected`,
        { method: "DELETE" }
    );
}

export async function getStudentLeaderboardCompletedMissions(
    externalActivityId: number | string,
    studentId: number | string,
    query?: { category?: LeaderboardMissionCategory | null; page?: number; size?: number }
): Promise<LeaderboardCompletedMissionsResponse> {
    const queryString = buildQueryString({
        category: query?.category,
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    const response = await api<LeaderboardApiResponse<LeaderboardCompletedMissionsResponse>>(
        `/student/externalActivities/${externalActivityId}/students/${studentId}/missions/completed${queryString}`,
        { method: "GET" }
    );

    return response.data;
}

/* - Notification 관련 Student API - */
export type NotificationType = "ASSIGNMENT_CREATED" | "ASSIGNMENT_EVALUATED" | "ATTENDANCE_CHECK_IN_OPENED" | "EXTERNAL_ACTIVITY_NOTICE" | "LEADERBOARD_MISSION_APPROVED" | "LEADERBOARD_MISSION_REJECTED";

export type NotificationResponse = {
    notificationId: number;
    recipientId: number;
    senderId?: number | null;
    externalActivityId?: number | null;
    type: NotificationType;
    title: string;
    body: string;
    titleKo?: string | null;
    bodyKo?: string | null;
    titleEn?: string | null;
    bodyEn?: string | null;
    targetType: string;
    targetId?: number | null;
    read: boolean;
    readAt?: string | null;
    createdAt: string;
};

export type NotificationListResponse = {
    page: number;
    size: number;
    totalCount: number;
    unreadCount: number;
    notifications: NotificationResponse[];
};

export type NotificationDeleteAllResponse = {
    deletedCount: number;
};

export async function getNotifications(query?: { unreadOnly?: boolean; page?: number; size?: number }): Promise<NotificationListResponse> {
    const queryString = buildQueryString({
        unreadOnly: query?.unreadOnly,
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return api<NotificationListResponse>(`/notifications${queryString}`, { method: "GET" });
}

export async function markNotificationRead(notificationId: number | string): Promise<NotificationResponse> {
    return api<NotificationResponse>(`/notifications/${notificationId}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
    return api<{ updatedCount: number }>("/notifications/read-all", { method: "PATCH" });
}

export async function deleteAllNotifications(): Promise<NotificationDeleteAllResponse> {
    return api<NotificationDeleteAllResponse>("/notifications", { method: "DELETE" });
}

/* 앱 푸시 관련 */
export type PushDevicePlatform = "ANDROID" | "IOS" | "WEB" | "UNKNOWN";

export type PushDeviceTokenRequest = {
    token: string;
    platform?: PushDevicePlatform;
    deviceId?: string | null;
    appVersion?: string | null;
};

export async function registerPushDeviceToken(input: PushDeviceTokenRequest): Promise<void> {
    await api<void>("/notifications/push-tokens", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function deletePushDeviceToken(token: string): Promise<void> {
    await api<void>("/notifications/push-tokens", {
        method: "DELETE",
        body: JSON.stringify({ token }),
    });
}

/* - EA 학생 초대코드 관련 - */
export type ExternalActivityStudentInviteStatus = "ACTIVE" | "DISABLED";

export type ExternalActivityStudentInviteResponse = {
    externalActivityStudentInviteId: number;
    externalActivityId: number;
    externalActivityName: string;
    code: string;
    token: string;
    status: ExternalActivityStudentInviteStatus;
    createdByUserId: number;
    createdByName: string;
    createdAt: string;
};

export type AcceptExternalActivityStudentInviteResponse = {
    externalActivityId: number;
    externalActivityName: string;
    organizationId: number;
    organizationName: string;
    participantUserId: number;
    participantName: string;
};

export async function createExternalActivityStudentInvite(
    externalActivityId: number | string
): Promise<ExternalActivityStudentInviteResponse> {
    return api<ExternalActivityStudentInviteResponse>(
        `/externalActivities/${externalActivityId}/student-invites`,
        { method: "POST" }
    );
}

export async function getExternalActivityStudentInvites(
    externalActivityId: number | string
): Promise<ExternalActivityStudentInviteResponse[]> {
    return api<ExternalActivityStudentInviteResponse[]>(
        `/externalActivities/${externalActivityId}/student-invites`,
        { method: "GET" }
    );
}

export async function disableExternalActivityStudentInvite(
    externalActivityId: number | string,
    externalActivityStudentInviteId: number | string
): Promise<void> {
    await api<void>(
        `/externalActivities/${externalActivityId}/student-invites/${externalActivityStudentInviteId}`,
        { method: "DELETE" }
    );
}

export async function acceptExternalActivityStudentInvite(
    token: string
): Promise<AcceptExternalActivityStudentInviteResponse> {
    return api<AcceptExternalActivityStudentInviteResponse>(
        `/student-invites/tokens/${encodeURIComponent(token.trim())}/accept`,
        { method: "POST" }
    );
}