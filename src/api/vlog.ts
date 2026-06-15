import { api } from "./client";

export type VlogProjectStatus = "IN_PROGRESS" | "COMPLETED";
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
    thumbnailKey?: string | null;
    thumbnailUrl?: string | null;
    projectStatus?: VlogProjectStatus | null;
    finalVideoStatus?: VlogFinalVideoStatus | null;
    portfolioShared?: boolean | null;
    locked?: boolean | null;
    deleted?: boolean | null;

    currentWeek?: number | null;
    lastWeek?: number | null;
    completedMissionCount?: number | null;
    totalMissionCount?: number | null;
    progressPercent?: number | null;

    lastClipId?: number | null;
    lastClipFileKey?: string | null;
    lastClipThumbnailKey?: string | null;
    lastClipThumbnailUrl?: string | null;
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
    exportNo?: number | null;
    finalVideoTitle?: string | null;
    finalVideoFileKey?: string | null;
    finalVideoThumbnailKey?: string | null;
    finalVideoDurationSeconds?: number | null;
    exportedAt?: string | null;

    projects?: VlogResponse[] | null;
    missions?: VlogResponse[] | null;
    clips?: VlogClipResponse[] | null;
    excludedClips?: VlogClipResponse[] | null;
    finalVideos?: VlogResponse[] | null;
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
    thumbnailUrl?: string | null;
    
    status?: VlogClipStatus | null;
    includedInFinal?: boolean | null;
    customTitle?: string | null;
    originalTitle?: string | null;
    displayTitle?: string | null;
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
};

export type VlogEditClipInput = {
    includedInFinal?: boolean | null;
    customTitle?: string | null;
    displayOrder?: number | null;
};

export type VlogExportInput = {
    portfolioShared: boolean;
};

export type VlogUploadUrlInput = {
    projectId: number | string;
    fileName?: string | null;
    contentType?: string | null;
    type?: "VIDEO" | "THUMBNAIL" | string | null;
};

export type VlogUrlResponse = {
    clipId?: number | null;
    finalVideoId?: number | null;
    fileKey?: string | null;
    uploadUrl?: string | null;
    url?: string | null;
    fileName?: string | null;
    expiresInSeconds?: number | null;
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
        }),
    });
}

export async function getVlogProjectDetail(projectId: number | string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}`, { method: "GET" });
}

export async function deleteVlogProject(projectId: number | string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}`, { method: "DELETE" });
}

// export async function createVlogPreProjectUploadUrl(input: Omit<VlogUploadUrlInput, "projectId">): Promise<VlogUrlResponse> {
//     return api<VlogUrlResponse>("/vlogs/uploads/pre-project-presigned-url", {
//         method: "POST",
//         body: JSON.stringify({
//             projectId: null,
//             fileName: input.fileName ?? null,
//             contentType: input.contentType ?? null,
//             type: input.type ?? "VIDEO",
//         }),
//     });
// }

export async function createVlogUploadUrl(input: VlogUploadUrlInput): Promise<VlogUrlResponse> {
    return api<VlogUrlResponse>("/vlogs/uploads/presigned-url", {
        method: "POST",
        body: JSON.stringify({
            projectId: input.projectId,
            fileName: input.fileName ?? null,
            contentType: input.contentType ?? null,
            type: input.type ?? "VIDEO",
        }),
    });
}

export async function getVlogClipPlayUrl(projectId: number | string, clipId: number | string): Promise<VlogUrlResponse> {
    return api<VlogUrlResponse>(`/vlogs/me/projects/${projectId}/clips/${clipId}/play-url`, { method: "GET" });
}

export async function getVlogClipDownloadUrl(projectId: number | string, clipId: number | string): Promise<VlogUrlResponse> {
    return api<VlogUrlResponse>(`/vlogs/me/projects/${projectId}/clips/${clipId}/download-url`, { method: "GET" });
}

export async function getVlogClipThumbnailUrl(projectId: number | string, clipId: number | string): Promise<VlogUrlResponse> {
    return api<VlogUrlResponse>(`/vlogs/me/projects/${projectId}/clips/${clipId}/thumbnail-url`, { method: "GET" });
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

export async function createFreeClip(projectId: number | string, input: VlogClipCompleteInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/free-clips`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function replaceFreeClip(projectId: number | string, clipId: number | string, input: VlogClipCompleteInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/free-clips/${clipId}`, {
        method: "PUT",
        body: JSON.stringify(input),
    });
}

export async function getVlogEditing(projectId: number | string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/me/projects/${projectId}/editing`, { method: "GET" });
}

export async function updateVlogEditClip(projectId: number | string, clipId: number | string, input: VlogEditClipInput): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/editing/clips/${clipId}`, {
        method: "PATCH",
        body: JSON.stringify({
            includedInFinal: input.includedInFinal ?? null,
            customTitle: input.customTitle ?? null,
            displayOrder: input.displayOrder ?? null,
        }),
    });
}

export async function excludeVlogEditClip(projectId: number | string, clipId: number | string): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/editing/clips/${clipId}/exclude`, { method: "PATCH" });
}

export async function includeVlogEditClip(projectId: number | string, clipId: number | string): Promise<VlogClipResponse> {
    return api<VlogClipResponse>(`/vlogs/me/projects/${projectId}/editing/clips/${clipId}/include`, { method: "PATCH" });
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
        }),
    });
}

export async function getVlogFinalVideoDownloadUrl(projectId: number | string, finalVideoId: number | string): Promise<VlogUrlResponse> {
    return api<VlogUrlResponse>(`/vlogs/me/projects/${projectId}/final-videos/${finalVideoId}/download-url`, { method: "GET" });
}

export async function getOperatorFinalVideos(companyCode: string): Promise<VlogResponse> {
    return api<VlogResponse>(`/vlogs/operator/final-videos?companyCode=${encodeURIComponent(companyCode)}`, { method: "GET" });
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitVlogFinalVideoDone(
    projectId: number | string,
    finalVideoId: number | string,
    options?: {
        intervalMs?: number;
        maxTryCount?: number;
    }
): Promise<VlogUrlResponse> {
    const intervalMs = options?.intervalMs ?? 3000;
    const maxTryCount = options?.maxTryCount ?? 60;

    for (let tryCount = 0; tryCount < maxTryCount; tryCount += 1) {
        const project = await getVlogProjectDetail(projectId);

        if (project.finalVideoStatus === "DONE") {
            return getVlogFinalVideoDownloadUrl(projectId, finalVideoId);
        }

        if (project.finalVideoStatus === "FAILED") {
            throw new Error("최종 영상 생성에 실패했습니다.");
        }

        await delay(intervalMs);
    }

    throw new Error("최종 영상 생성 시간이 초과되었습니다.");
}