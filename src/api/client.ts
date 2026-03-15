// src/api/client.ts
import { API_BASE_URL } from "@env";
import { jwtDecode } from "jwt-decode";
import { getAccessToken, saveAccessToken, clearAccessToken } from "../auth/tokenStorage";

/** URL util */
function buildUrl(path: string) {
    return path.startsWith("http")
        ? path
        : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

type HeaderInput =
    | Record<string, string>
    | Array<[string, string]>
    | Headers
    | undefined;

function normalizeHeaders(h?: HeaderInput): Record<string, string> {
    if (!h) return {};
    if (typeof Headers !== "undefined" && h instanceof Headers) {
        const out: Record<string, string> = {};
        h.forEach((v, k) => {
            out[k] = v;
        });
        return out;
    }

    if (Array.isArray(h)) {
        return Object.fromEntries(h) as Record<string, string>;
    }

    return h as Record<string, string>;
}
async function getAuthHeader(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    if (!token) return {};
    return {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };
}

/* =========================
            Auth 
========================= */
async function requestWithAutoRefresh(
    path: string,
    init: RequestInit = {},
    opts?: { expectJson?: boolean }
): Promise<Response> {
    const expectJson = opts?.expectJson ?? false;

    const makeHeaders = async (): Promise<Record<string, string>> => {
        const base = normalizeHeaders(init.headers);
        const auth = await getAuthHeader();

        const headers: Record<string, string> = {
            ...base,
            ...auth,
        };

        if (
            expectJson &&
            !("Content-Type" in headers) &&
            !("content-type" in headers)
        ) {
            headers["Content-Type"] = "application/json";
        }

        return headers;
    };

    const doFetch = async (): Promise<Response> => {
        return fetch(buildUrl(path), {
            ...init,
            headers: await makeHeaders(),
            credentials: "include",
        });
    };

    let res = await doFetch();

    if (res.status === 401 || res.status === 403) {
        try {
            await refreshAccessToken();
            res = await doFetch();
        } catch (error) {
            await clearAccessToken().catch(() => {});
            throw error instanceof ApiError
                ? error
                : new ApiError(401, "Refresh failed");
        }

        if (res.status === 401 || res.status === 403) {
            await clearAccessToken().catch(() => {});
            const bodyText = await res.text().catch(() => "");
            throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
        }
    }

    return res;
}

/**
 * API 공용함수 
 */
export async function apiPublic(
    path: string,
    init: RequestInit = {}
): Promise<Response> {
    return fetch(buildUrl(path), {
        ...init,
        credentials: "include",
    });
}
export async function api<T = unknown>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const res = await requestWithAutoRefresh(path, init, { expectJson: true });

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
    }

    return (await res.json()) as T;
}

// 업로드 API (FormData)
export async function apiUpload<T = unknown>(
    path: string,
    formData: FormData,
    init: RequestInit = {}
): Promise<T> {
    const res = await requestWithAutoRefresh(
        path,
        {
            ...init,
            method: init.method ?? "POST",
            body: formData,
        },
        { expectJson: false }
    );

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
        const bodyText = await res.text().catch(() => "");
        return bodyText as unknown as T;
    }

    return (await res.json()) as T;
}

// android 카카오 로그인
export async function exchangeKakaoToken(accessToken: string): Promise<Response> {
    const res = await fetch(buildUrl("/auth/kakao/android"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ accessToken }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
    }

    return res;
}

// 리프레시
export async function refreshAccessToken(): Promise<string> {
    const res = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
    }

    const newAuth =
        res.headers.get("authorization") ||
        res.headers.get("Authorization");

    if (!newAuth) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No Authorization header in /auth/refresh response", bodyText);
    }

    await saveAccessToken(newAuth);
    return newAuth;
}

/** 로그아웃 */
export async function logout(): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;

    await apiPublic("/auth/logout", {
        method: "POST",
        headers: {
            Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        },
    }).catch(() => {});

    await clearAccessToken().catch(() => {});
}
export function routeAfterLoginFromLogin(
    login: LoginResponse
): "Student" | "Onboarding" {
    return login.onboardingCompleted ? "Student" : "Onboarding";
}
export async function getUserIdFromAccessToken(): Promise<string | null> {
    const token = await getAccessToken();
    if (!token) return null;

    const raw = token.startsWith("Bearer ") ? token.slice(7) : token;

    try {
        const payload = jwtDecode<JwtPayload>(raw);

        return (
            toValidUserId(payload.userId) ||
            toValidUserId(payload.id) ||
            toValidUserId(payload.sub) ||
            null
        );
    } catch {
        return null;
    }
}
function toValidUserId(v: unknown): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;

    if (/^\d+$/.test(s)) return s;

    return null;

}
function normalizeNullableText(v: unknown): string {
    const s = String(v ?? "").trim();
    if (!s) return "";
    const lower = s.toLowerCase();
    if (lower === "null") return "";
    if (lower === "undefined") return "";
    return s;
}

/* =========================
            Type 
========================= */
export type LoginResponse = {
    onboardingCompleted: boolean;
};
type JwtPayload = {
    userId?: number | string;
    id?: number | string;
    sub?: number | string;
    type?: "access" | "refresh" | string;
};

export type Transcription = {
    id: number;
    text: string;
    audioUrl?: string;
};
export type UserSchool = {
    id: number;
    name: string;
    campus: string;
    region: string;
};
export type JumpOrganization = {
    id: number;
    name: string;
};
export type UserBase = {
    userId: number;
    name?: string | null;
    kakaoName?: string | null;

    nickname: string | null;
    profileImage: string | null;
    verificationImage: string | null;
    role: string;
    status: string;
    school: UserSchool | null;

    interestJob?: string | null;
    interestCompany?: string | null;
    jumpOrganization?: JumpOrganization | null;
};
export type UserMe = UserBase;
export type ApplyVerificationResponse = UserBase;
export type UploadFileLike = {
    uri: string;  
    name: string;
    type: string; 
};
export type UpdateMyProfileJsonInput = {
    name?: string | null;
    nickname?: string | null;
    interestJob?: string | null;
    interestCompany?: string | null;
};
export type AdminUserFile = {
    fileId: number;
    url: string;
    filename: string;
};
export type SelectMySchoolInput = {
    schoolId: number;
};

export type SelectMySchoolResponse = UserBase & {
    school: UserSchool | null;
};

export type SubmitOnboardingInput = {
    name: string;
    interestJob?: string | null;
    interestCompany?: string | null;
    jumpOrganizationId?: number | null;
};

export type SubmitOnboardingResponse = UserBase;
export type CreateEventInput = {
    title: string;
    content: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
};

export type CreateEventResponse = {
    eventId?: number;
    title?: string;
    content?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string | null;
    endTime?: string | null;
};
export type EventDayQuestionsResponse = {
    eventDayId: number;
    questionId: number;
    questionList: string[];
};
export type EventDayDetailResponse = {
    eventDayId: number;
    title: string;
    eventId: number;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    memo?: string | null;
    completed: boolean;
    transcriptions: Transcription[];
};
export type EventDay = {
    eventDayId: number;
    title: string;
    eventId: string | number;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    memo?: string | null;
    completed: boolean;
    transcriptions?: Transcription[];
};
export type EventDayMonthResponse = {
    totalCount: number;
    eventDayList: EventDay[];
};

/* =========================
        User & Mypage 
========================= */
export function getUserDisplayName(
    me: Partial<UserBase> | null | undefined
): string {
    if (!me) return "";
    return (
        normalizeNullableText((me as any).name) ||
        normalizeNullableText((me as any).kakaoName)
    );
}
export function isOnboardingDone(
    me: Partial<UserBase> | null | undefined
): boolean {
    if (!me) return false;

    const name = normalizeNullableText((me as any).name);
    if (name.toUpperCase() === "NULL") return false;

    return name.length > 0;
}
export async function getUserMe(): Promise<UserMe> {
    return api<UserMe>("/users/me");
}
// 재학생 인증
export async function applyMyVerification(
    file: UploadFileLike
): Promise<ApplyVerificationResponse> {
    const userId = await getUserIdFromAccessToken();
    if (!userId) {
        throw new ApiError(401, "로그인 정보에서 userId를 찾을 수 없습니다.");
    }

    const formData = new FormData();

    formData.append(
        "verificationImage",
        {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as any
    );

    return apiUpload<ApplyVerificationResponse>(
        `/users/${userId}/apply-verification`,
        formData,
        { method: "POST" }
    );
}
// 프로필 수정 (텍스트)
export async function updateMyProfile(
    input: UpdateMyProfileJsonInput
): Promise<UserMe> {
    return api<UserMe>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
            name: input.name ?? null,
            nickname: input.nickname ?? null,
            interestJob: input.interestJob ?? null,
            interestCompany: input.interestCompany ?? null,
        }),
    });
}
// 프로필 수정 (이미지)
export async function updateMyProfileImage(
    file: UploadFileLike
): Promise<UserMe> {
    const formData = new FormData();

    formData.append(
        "imagefile",
        {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as any
    );

    formData.append(
        "imageFile",
        {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as any
    );

    return apiUpload<UserMe>("/users/me/profile-image", formData, {
        method: "PATCH",
    });
}
// 학교 검색
export async function searchSchools(keyword: string): Promise<UserSchool[]> {
    const q = keyword.trim();
    if (!q) return [];

    const qs = `keyword=${encodeURIComponent(q)}`;
    return api<UserSchool[]>(`/schools?${qs}`, { method: "GET" });
}

export async function selectMySchool(
    input: SelectMySchoolInput
): Promise<SelectMySchoolResponse> {
    if (input.schoolId == null || Number.isNaN(Number(input.schoolId))) {
        throw new ApiError(400, "schoolId가 올바르지 않습니다.");
    }

    return api<SelectMySchoolResponse>("/users/me/school", {
        method: "PATCH",
        body: JSON.stringify({
            schoolId: Number(input.schoolId),
        } satisfies SelectMySchoolInput),
    });
}
// 관리자 업로드 파일 목록 조회 (수료증)
export async function getMyAdminFiles(): Promise<AdminUserFile[]> {
     return api<AdminUserFile[]>("/users/me/admin-files", { method: "GET" });
}

// 관리자 업로드 파일 다운로드 (수료증)
export async function getMyAdminFileDownloadUrl(
    fileId: number | string
): Promise<string> {
    const res = await api<{ url: string }>(`/users/me/admin-files/${fileId}`, {
        method: "GET",
    });
    return res.url;
}
/* =========================
            JUMP 
========================= */
export async function verifyJumpUser (
    code: string
): Promise<UserMe> {
    return api<UserMe>("/users/me/jump-verify", {
        method: "POST",
        body: JSON.stringify({ code } satisfies { code: string }),
    });
}
export async function getMyJumpOrganizations(): Promise<JumpOrganization[]> {
    return api<JumpOrganization[]>("/users/me/jump-organizations", {
        method: "GET",
    });
}

/* =========================
        ONBOARDING  
========================= */
export async function submitMyOnboarding(
    input: SubmitOnboardingInput
): Promise<SubmitOnboardingResponse> {
    const name = (input.name ?? "").trim();
    if (!name) {
        throw new ApiError(400, "name은 필수값입니다.");
    }

    const payload: SubmitOnboardingInput = {
        name,
        interestJob: (input.interestJob ?? "").trim() || null,
        interestCompany: (input.interestCompany ?? "").trim() || null,
        jumpOrganizationId:
            input.jumpOrganizationId != null &&
            !Number.isNaN(Number(input.jumpOrganizationId))
                ? Number(input.jumpOrganizationId)
                : null,
    };

    return api<SubmitOnboardingResponse>("/users/me/onboarding", {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}


/* =========================
        EVENT  
========================= */
export async function createEvent(
    input: CreateEventInput
): Promise<CreateEventResponse> {
    return api<CreateEventResponse>("/events", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/** 맞춤 질문 조회 */
export async function getEventDayQuestions(
    eventDayId: string | number
): Promise<EventDayQuestionsResponse> {
    return api<EventDayQuestionsResponse>(`/event-days/${eventDayId}/questions`);
}

/** eventDay 상세 */
export async function getEventDayDetail(
    eventDayId: string | number
): Promise<EventDayDetailResponse> {
    return api<EventDayDetailResponse>(`/event-days/${eventDayId}`);
}

/** 이벤트 삭제 */
export async function deleteEvent(eventId: string | number): Promise<void> {
    return api<void>(`/events/${eventId}`, { method: "DELETE" });
}
export async function deleteEventDay(eventDayId: string | number): Promise<void> {
    return api<void>(`/event-days/${eventDayId}`, { method: "DELETE" });
}

/** 최근 기록 월 조회 */
export async function getEventDaysByMonth(
    y: string,
    m: string
): Promise<EventDayMonthResponse> {
    return api<EventDayMonthResponse>(`/event-days/${y}/${m}`);
}


/** 에러 */
export class ApiError extends Error {
    status: number;
    bodyText?: string;

    constructor(status: number, message: string, bodyText?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.bodyText = bodyText;
    }
}
