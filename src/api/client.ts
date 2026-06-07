// src/api/client.ts
import { API_BASE_URL } from "@env";
import { jwtDecode } from "jwt-decode";
import { getAccessToken, saveAccessToken, clearAccessToken, getRefreshToken, saveRefreshToken, clearRefreshToken, clearTokens } from "../auth/tokenStorage";

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

let refreshPromise: Promise<string> | null = null;

async function isAccessTokenExpiringSoon(bufferSeconds = 60): Promise<boolean> {
    const token = await getAccessToken();

    if (!token) {
        return false;
    }

    const raw = token.startsWith("Bearer ") ? token.slice(7) : token;

    try {
        const payload = jwtDecode<JwtPayload>(raw);

        if (!payload.exp) {
            return false;
        }

        const nowSeconds = Math.floor(Date.now() / 1000);

        return payload.exp <= nowSeconds + bufferSeconds;
    } catch {
        return true;
    }
}

/* =========================
            Auth 
========================= */
async function requestWithAutoRefresh(
    path: string,
    init: RequestInit = {},
    opts?: { expectJson?: boolean; skipAuthRefresh?: boolean }
): Promise<Response> {
    const expectJson = opts?.expectJson ?? false;
    const skipAuthRefresh = opts?.skipAuthRefresh ?? false;

    const makeHeaders = async (): Promise<Record<string, string>> => {
        const base = normalizeHeaders(init.headers);
        const auth = await getAuthHeader();
        const headers: Record<string, string> = {
            ...base,
            ...auth,
        };
        const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

        if (isFormData) {
            delete headers["Content-Type"];
            delete headers["content-type"];
            return headers;
        }

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

    if (!skipAuthRefresh && await isAccessTokenExpiringSoon()) {
        try {
            await refreshAccessToken();
        } catch (error) {
            await clearTokens().catch(() => {});
            throw error instanceof ApiError
                ? error
                : new ApiError(401, "Refresh failed");
        }
    }

    let res = await doFetch();

    if (!skipAuthRefresh && (res.status === 401 || res.status === 403)) {
        try {
            await refreshAccessToken();
            res = await doFetch();
        } catch (error) {
            await clearTokens().catch(() => {});
            throw error instanceof ApiError
                ? error
                : new ApiError(401, "Refresh failed");
        }

        if (res.status === 401 || res.status === 403) {
            await clearTokens().catch(() => {});
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
    init: RequestInit = {},
    opts?: { skipAuthRefresh?: boolean }
): Promise<T> {
    const res = await requestWithAutoRefresh(path, init, {
        expectJson: true,
        skipAuthRefresh: opts?.skipAuthRefresh ?? false,
    });

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
    }

    return (await res.json()) as T;
}
export async function apiPublicJson<T = unknown>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const res = await fetch(buildUrl(path), {
        ...init,
        credentials: "include",
    });

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
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
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }

    const ct = res.headers.get("content-type") ?? "";

    if (ct.includes("application/json")) {
        return (await res.json()) as T;
    }

    return (await res.text()) as unknown as T;
}

// android 카카오 로그인
export async function exchangeKakaoToken(accessToken: string): Promise<LoginResponse> {
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
        const parsed = parseErrorBody(bodyText);

        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }

    const auth = res.headers.get("authorization") || res.headers.get("Authorization");
    const refreshToken = res.headers.get("x-refresh-token") || res.headers.get("X-Refresh-Token");

    if (!auth) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No Authorization header in /auth/kakao/android response", bodyText);
    }

    if (!refreshToken) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No X-Refresh-Token header in /auth/kakao/android response", bodyText);
    }

    await saveAccessToken(auth);
    await saveRefreshToken(refreshToken);

    return (await res.json()) as LoginResponse;
}

// 구글 로그인
export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
    const res = await fetch(buildUrl("/auth/google/app"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }

    const auth = res.headers.get("authorization") || res.headers.get("Authorization");
    const refreshToken = res.headers.get("x-refresh-token") || res.headers.get("X-Refresh-Token");

    if (!auth) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No Authorization header in /auth/google/app response", bodyText);
    }

    if (!refreshToken) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No X-Refresh-Token header in /auth/google/app response", bodyText);
    }

    await saveAccessToken(auth);
    await saveRefreshToken(refreshToken);

    return (await res.json()) as LoginResponse;
}

// 애플 로그인
export async function loginWithApple(input: AppleLoginRequest): Promise<LoginResponse> {
    const res = await fetch(buildUrl("/auth/apple/app"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            identityToken: input.identityToken,
            fullName: input.fullName ?? null,
            nonce: input.nonce ?? null,
        }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }

    const auth = res.headers.get("authorization") || res.headers.get("Authorization");
    const refreshToken = res.headers.get("x-refresh-token") || res.headers.get("X-Refresh-Token");

    if (!auth) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No Authorization header in /auth/apple/app response", bodyText);
    }

    if (!refreshToken) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No X-Refresh-Token header in /auth/apple/app response", bodyText);
    }

    await saveAccessToken(auth);
    await saveRefreshToken(refreshToken);

    return (await res.json()) as LoginResponse;
}

// 회원가입
export async function signup(input: SignupRequest): Promise<void> {
    const res = await fetch(buildUrl("/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            loginId: input.loginId,
            password: input.password,
            email: input.email ?? "",
        }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }
}

// 아이디 중복 확인
export async function checkLoginIdAvailability(
    loginId: string
): Promise<LoginIdAvailabilityResponse> {
    const qs = new URLSearchParams({
        loginId: loginId.trim(),
    }).toString();

    return apiPublicJson<LoginIdAvailabilityResponse>(`/auth/login-id/check?${qs}`, {
        method: "GET",
    });
}

// 로컬 로그인
export async function loginWithLocal(input: LoginRequest): Promise<LoginResponse> {
    const res = await fetch(buildUrl("/auth/login/app"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            loginId: input.loginId,
            password: input.password,
        }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }

    const auth = res.headers.get("authorization") || res.headers.get("Authorization");
    const refreshToken = res.headers.get("x-refresh-token") || res.headers.get("X-Refresh-Token");

    if (!auth) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No Authorization header in /auth/login/app response", bodyText);
    }

    if (!refreshToken) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No X-Refresh-Token header in /auth/login/app response", bodyText);
    }

    await saveAccessToken(auth);
    await saveRefreshToken(refreshToken);

    return (await res.json()) as LoginResponse;
}

// 리프레시
export async function refreshAccessToken(): Promise<string> {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
            throw new ApiError(401, "No refresh token");
        }

        const res = await fetch(buildUrl("/auth/refresh/app"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                refreshToken,
            }),
        });

        if (!res.ok) {
            const bodyText = await res.text().catch(() => "");
            const parsed = parseErrorBody(bodyText);

            throw new ApiError(
                res.status,
                parsed.message ?? `HTTP ${res.status}`,
                bodyText,
                parsed.code,
                parsed.path
            );
        }

        const newAuth = res.headers.get("authorization") || res.headers.get("Authorization");
        const newRefreshToken = res.headers.get("x-refresh-token") || res.headers.get("X-Refresh-Token");

        if (!newAuth) {
            const bodyText = await res.text().catch(() => "");
            throw new ApiError(200, "No Authorization header in /auth/refresh/app response", bodyText);
        }

        await saveAccessToken(newAuth);

        if (newRefreshToken) {
            await saveRefreshToken(newRefreshToken);
        }

        return newAuth;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

// 아이디 찾기용 이메일 전송
export async function sendFindLoginIdCode(
    email: string,
    language?: string
): Promise<FindLoginIdResponse> {
    const res = await apiPublic("/auth/login-id/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, language }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
    }

    return (await res.json()) as FindLoginIdResponse;
}

// 아이디 찾기 이메일 인증
export async function verifyFindLoginIdCode(
    email: string,
    code: string,
    language?: string
): Promise<FindLoginIdResponse> {
    const res = await apiPublic("/auth/login-id/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, language }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code,
            parsed.path
        );
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
    }

    return (await res.json()) as FindLoginIdResponse;
}

// 비밀번호 재설정 인증코드 전송
export async function sendResetPasswordCode(
    input: SendResetPasswordCodeRequest
): Promise<PasswordRecoveryResponse> {
    return apiPublicJson<PasswordRecoveryResponse>("/auth/password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            loginId: input.loginId.trim(),
            email: input.email.trim(),
            language: input.language,
        }),
    });
}

// 비밀번호 재설정 전 인증
export async function verifyResetPasswordCode(
    input: VerifyResetPasswordCodeRequest
): Promise<PasswordResetVerifyResponse> {
    return apiPublicJson<PasswordResetVerifyResponse>("/auth/password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            loginId: input.loginId.trim(),
            email: input.email.trim(),
            code: input.code.trim(),
            language: input.language,
        }),
    });
}

// 비밀번호 재설정
export async function resetPasswordWithToken(
    input: ResetPasswordRequest
): Promise<void> {
    await apiPublicJson<void>("/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            loginId: input.loginId.trim(),
            email: input.email.trim(),
            resetToken: input.resetToken.trim(),
            newPassword: input.newPassword,
        }),
    });
}

/* =========================
            Email 
========================= */
// 신규 가입자 이메일 send
export async function sendEmailCode(
    email: string,
    language?: string
): Promise<SendEmailCodeResponse> {
    return apiPublicJson<SendEmailCodeResponse>("/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: email.trim(),
            language,
        }),
    });
}
// 신규 가입자 이메일 verify
export async function verifyEmailCode(
    email: string,
    code: string
): Promise<VerifyEmailCodeResponse> {
    return apiPublicJson<VerifyEmailCodeResponse>("/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: email.trim(),
            code: code.trim(),
        }),
    });
}

// 기존 가입자 이메일 send
export async function sendMyEmailCode(
    email: string,
    language?: string
): Promise<SendEmailCodeResponse> {
    return api<SendEmailCodeResponse>("/users/me/email/send", {
        method: "POST",
        body: JSON.stringify({
            email: email.trim(),
            language,
        }),
    });
}

// 기존 가입자 이메일 verify
export async function verifyMyEmailCode(
    email: string,
    code: string
): Promise<VerifyEmailCodeResponse> {
    return api<VerifyEmailCodeResponse>("/users/me/email/verify", {
        method: "POST",
        body: JSON.stringify({
            email: email.trim(),
            code: code.trim(),
        }),
    });
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

    await clearTokens().catch(() => {});
}

/** 회원 탈퇴(삭제) */
export async function withdraw(input: WithdrawRequest): Promise<void> {
    await api<void>("/auth/me", {
        method: "DELETE",
        body: JSON.stringify({
            reason: input.reason,
            detail: input.detail ?? "",
        }),
    });
    await clearTokens().catch(() => {});
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
    linkedToExistingAccount: boolean;
    message: string | null;
};
export type WithdrawRequest = {
    reason: string;
    detail?: string;
};
export type SignupRequest = {
    loginId: string;
    password: string;
    email?: string;
};

export type LoginRequest = {
    loginId: string;
    password: string;
};

export type AppleLoginRequest = {
    identityToken: string;
    fullName?: string | null;
    nonce?: string | null;
};

export type LoginIdAvailabilityResponse = {
    available: boolean;
    message: string;
};

export type EmailSendStatus = "CODE_SENT" | "EXISTING_ACCOUNT_FOUND";
export type ExistingAccountType = "LOCAL" | "GOOGLE" | "KAKAO" | "UNKNOWN";

export type SendEmailCodeResponse = {
    status: EmailSendStatus;
    maskedEmail: string;
    existingAccountType: ExistingAccountType | null;
};

export type VerifyEmailCodeResponse = {
    verified: boolean;
    existingAccountFound: boolean;
    maskedEmail: string;
};

export type FindLoginIdCodeRequest = {
    email: string;
    language?: string;
};

export type FindLoginIdVerifyRequest = {
    email: string;
    code: string;
    language?: string;
};

export type FindLoginIdResponse = {
    maskedEmail: string;
    message: string;
};

export type SendResetPasswordCodeRequest = {
    loginId: string;
    email: string;
    language?: string;
};

export type VerifyResetPasswordCodeRequest = {
    loginId: string;
    email: string;
    code: string;
    language?: string;
};

export type ResetPasswordRequest = {
    loginId: string;
    email: string;
    resetToken: string;
    newPassword: string;
};

export type PasswordRecoveryResponse = {
    maskedEmail: string;
    message: string;
};

export type PasswordResetVerifyResponse = {
    maskedEmail: string;
    message: string;
    resetToken: string;
};

type JwtPayload = {
    userId?: number | string;
    id?: number | string;
    sub?: number | string;
    exp?: number;
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
    email: string | null;
    emailVerified: boolean | null;
    name?: string | null;
    kakaoName?: string | null;
    nickname: string | null;
    profileImage: string | null;
    verificationImage: string | null;
    roleSet: string[];
    status: string;
    rejectionReason?: string | null;
    school: UserSchool | null;
    studentNumber?: string | null;
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
    name?: string | null;
    studentNumber?: string | null;
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
// 프로필 사진 삭제
export async function deleteMyProfileImage(): Promise<UserMe> {
    return api<UserMe>("/users/me/profile-image", {
        method: "DELETE",
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
            CLIENT(거래처)
========================= */
export async function verifyClientUser(
    code: string
): Promise<UserMe> {
    return api<UserMe>(
        "/users/me/code-verify",
        {
            method: "POST",
            body: JSON.stringify({ code } satisfies { code: string }),
        },
        {
            skipAuthRefresh: true,
        }
    );
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
    const studentNumber = (input.studentNumber ?? "").trim();
    const interestJob = (input.interestJob ?? "").trim();
    const interestCompany = (input.interestCompany ?? "").trim();

    const payload: SubmitOnboardingInput = {
        ...(input.name != null ? { name } : {}),
        ...(input.studentNumber != null ? { studentNumber } : {}),
        ...(input.interestJob != null ? { interestJob } : {}),
        ...(input.interestCompany != null ? { interestCompany } : {}),
        ...(input.jumpOrganizationId != null && !Number.isNaN(Number(input.jumpOrganizationId))
            ? { jumpOrganizationId: Number(input.jumpOrganizationId) }
            : {}),
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
function parseErrorBody(bodyText: string): { message?: string; code?: string; path?: string; status?: number } {
    if (!bodyText) return {};
    try {
        const parsed = JSON.parse(bodyText);
        return {
            message: parsed?.message,
            code: parsed?.clientExceptionCode ?? parsed?.code ?? parsed?.error,
            path: parsed?.path,
            status: typeof parsed?.status === "number" ? parsed.status : undefined,
        };
    } catch {
        return {};
    }
}
export class ApiError extends Error {
    status: number;
    bodyText?: string;
    code?: string;
    path?: string;

    constructor(status: number, message: string, bodyText?: string, code?: string, path?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.bodyText = bodyText;
        this.code = code;
        this.path = path;
    }
}