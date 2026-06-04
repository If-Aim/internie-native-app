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
export type SubmissionStatus = "SUBMITTED";

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

export async function submitAssignment(
    assignmentId: number | string,
    input: SubmitAssignmentInput
): Promise<AssignmentSubmissionResponse> {
    const formData = new FormData();
    const meta = {
        description: input.description ?? "",
        participantId: input.participantId ?? null,
    };

    formData.append("meta", JSON.stringify(meta));

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
    const meta = {
        description: input.description ?? "",
    };

    formData.append("meta", JSON.stringify(meta));

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

export async function acceptExternalActivityStudentInvite(
    token: string
): Promise<AcceptExternalActivityStudentInviteResponse> {
    return api<AcceptExternalActivityStudentInviteResponse>(
        `/student-invites/tokens/${encodeURIComponent(token.trim())}/accept`,
        { method: "POST" }
    );
}