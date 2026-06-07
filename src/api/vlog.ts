import { api } from "./client";

export type VlogProjectStatus = "IN_PROGRESS" | "EDITING" | "COMPLETED";
export type VlogFinalVideoStatus = "NOT_REQUESTED" | "REQUESTED" | "RENDERING" | "DONE" | "FAILED";
export type VlogClipType = "MISSION" | "FREE_RECORD" | "EXTRA";
export type VlogClipStatus = "ACTIVE" | "DELETED";
export type VlogMissionStatus = "COMPLETED" | "AVAILABLE" | "LOCKED";

export type VlogResponse = {
    vlogProjectId?: number | null;
    companyCode?: string | null;
    title?: string | null;
    description?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    today?: string | null;

    projectStatus?: VlogProjectStatus | null;
    finalVideoStatus?: VlogFinalVideoStatus | null;
    portfolioShared?: boolean | null;
    locked?: boolean | null;

    currentWeek?: number | null;
    lastWeek?: number | null;
    completedMissionCount?: number | null;
    totalMissionCount?: number | null;
    progressPercent?: number | null;

    lastClipId?: number | null;
    lastClipFileKey?: string | null;
    lastClipThumbnailKey?: string | null;
    lastRecordedAt?: string | null;

    missionId?: string | null;
    week?: number | null;
    order?: number | null;
    durationSec?: number | null;
    tip?: string | null;
    soloPossible?: boolean | null;
    presetText?: string | null;
    type?: string | null;
    intro?: boolean | null;
    missionStatus?: VlogMissionStatus | string | null;

    freeRecordId?: number | null;
    finalVideoId?: number | null;
    finalVideoFileKey?: string | null;
    finalVideoThumbnailKey?: string | null;
    finalVideoDurationSeconds?: number | null;

    projects?: VlogResponse[] | null;
    missions?: VlogResponse[] | null;
    freeRecords?: VlogResponse[] | null;
    clips?: VlogClipResponse[] | null;
};

export type VlogClipResponse = {
    clipId?: number | null;
    vlogProjectId?: number | null;
    missionId?: string | null;
    freeRecordId?: number | null;
    type?: VlogClipType | null;

    fileKey?: string | null;
    originalName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
    durationSeconds?: number | null;
    thumbnailKey?: string | null;

    caption?: string | null;
    narrationKey?: string | null;
    descriptionSkipped?: boolean | null;
    status?: VlogClipStatus | null;

    deletedFileKey?: string | null;
    deletedThumbnailKey?: string | null;

    includedInFinal?: boolean | null;
    customTitle?: string | null;
    originalTitle?: string | null;
    displayOrder?: number | null;
    week?: number | null;
    order?: number | null;
    recordedAt?: string | null;

    completedMissionCount?: number | null;
    totalMissionCount?: number | null;
    progressPercent?: number | null;
};

export type VlogCompanyResponse = {
    code: string;
    name: string;
};

export type VlogClipCompleteInput = {
    fileKey?: string | null;
    originalName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
    durationSeconds?: number | null;
    thumbnailKey?: string | null;
    customTitle?: string | null;
};

export type VlogStartInput = {
    companyCode?: string | null;
    title?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    introClip?: VlogClipCompleteInput | null;
};

export type VlogFreeRecordInput = {
    title: string;
    description?: string | null;
};

export type VlogEditClipInput = {
    includedInFinal?: boolean | null;
    customTitle?: string | null;
    displayOrder?: number | null;
    caption?: string | null;
};

export type VlogExportInput = {
    portfolioShared: boolean;
    finalVideoFileKey?: string | null;
    finalVideoThumbnailKey?: string | null;
    finalVideoDurationSeconds?: number | null;
};

export async function getVlogCompanies(): Promise<VlogCompanyResponse[]> {
    return api<VlogCompanyResponse[]>("/vlogs/companies", { method: "GET" });
}

export async function getMyVlogProjects(): Promise<VlogResponse> {
    return api<VlogResponse>("/vlogs/me/projects", { method: "GET" });
}

export async function startVlogProject(input: VlogStartInput): Promise<VlogResponse> {
    return api<VlogResponse>("/vlogs/me/projects", {
        method: "POST",
        body: JSON.stringify({
            companyCode: input.companyCode ?? null,
            title: input.title ?? null,
            startDate: input.startDate ?? null,
            endDate: input.endDate ?? null,
            introClip: input.introClip ?? null,
        }),
    });
}

export async function getVlogProjectDetail(projectId: number | string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}`, { method: "GET" });
}

export async function completeMissionClip(projectId: number | string, missionId: string, input: VlogClipCompleteInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/missions/${encodeURIComponent(missionId)}/clip`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function replaceMissionClip(projectId: number | string, missionId: string, input: VlogClipCompleteInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/missions/${encodeURIComponent(missionId)}/clip`, {
        method: "PUT",
        body: JSON.stringify(input),
    });
}

export async function getFreeRecords(projectId: number | string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}/free-records`, { method: "GET" });
}

export async function createFreeRecord(projectId: number | string, input: VlogFreeRecordInput): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}/free-records`, {
        method: "POST",
        body: JSON.stringify({
            title: input.title,
            description: input.description ?? null,
        }),
    });
}

export async function updateFreeRecord(projectId: number | string, freeRecordId: number | string, input: VlogFreeRecordInput): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}/free-records/${freeRecordId}`, {
        method: "PATCH",
        body: JSON.stringify({
            title: input.title,
            description: input.description ?? null,
        }),
    });
}

export async function deleteFreeRecord(projectId: number | string, freeRecordId: number | string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}/free-records/${freeRecordId}`, {
        method: "DELETE",
    });
}

export async function completeFreeRecordClip(projectId: number | string, freeRecordId: number | string, input: VlogClipCompleteInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/free-records/${freeRecordId}/clip`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function replaceFreeRecordClip(projectId: number | string, freeRecordId: number | string, input: VlogClipCompleteInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/free-records/${freeRecordId}/clip`, {
        method: "PUT",
        body: JSON.stringify(input),
    });
}

export async function startVlogEditing(projectId: number | string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}/editing/start`, {
        method: "POST",
    });
}

export async function getVlogEditing(projectId: number | string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}/editing`, {
        method: "GET",
    });
}

export async function updateVlogEditClip(projectId: number | string, clipId: number | string, input: VlogEditClipInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/editing/clips/${clipId}`, {
        method: "PATCH",
        body: JSON.stringify({
            includedInFinal: input.includedInFinal ?? null,
            customTitle: input.customTitle ?? null,
            displayOrder: input.displayOrder ?? null,
            caption: input.caption ?? null,
        }),
    });
}

export async function addVlogExtraClip(projectId: number | string, input: VlogClipCompleteInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/editing/extra-clips`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function completeVlogExport(projectId: number | string, input: VlogExportInput): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}/export`, {
        method: "POST",
        body: JSON.stringify({
            portfolioShared: input.portfolioShared,
            finalVideoFileKey: input.finalVideoFileKey ?? null,
            finalVideoThumbnailKey: input.finalVideoThumbnailKey ?? null,
            finalVideoDurationSeconds: input.finalVideoDurationSeconds ?? null,
        }),
    });
}