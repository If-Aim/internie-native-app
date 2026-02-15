// src/api/client.ts
import { API_BASE_URL } from "@env";
import { jwtDecode } from "jwt-decode";
import { getAccessToken, clearAccessToken } from "../auth/tokenStorage";

/** URL 합치기 */
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

  // Headers 인스턴스면 object로 변환해서 반환
  if (typeof Headers !== "undefined" && h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  // [key, value][] 형태면 object로 변환
  if (Array.isArray(h)) {
    return Object.fromEntries(h) as Record<string, string>;
  }

  // 이미 object면 그대로 반환
  return h as Record<string, string>;
}


/** Authorization 헤더 (Keychain 기반) */
async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) return {};
  return {
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
}

/** 공용 fetch (401/403 처리 포함) */
async function request(
  path: string,
  init: RequestInit = {},
  opts?: { expectJson?: boolean }
): Promise<Response> {
  const expectJson = opts?.expectJson ?? false;

  const base = normalizeHeaders(init.headers);
  const auth = await getAuthHeader();

  // 기본 헤더 + 인증 헤더 합치기
  // (정책) init.headers가 Authorization을 줬더라도 auth로 덮어씁니다.
  const headers: Record<string, string> = {
    ...base,
    ...auth,
  };

  // JSON 요청일 때만 Content-Type 자동 세팅 (업로드와 충돌 방지)
  if (expectJson && !("Content-Type" in headers) && !("content-type" in headers)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  // 인증 실패 시 토큰 삭제 (현재 앱 전략: refresh 없이 재로그인 유도)
  if (res.status === 401 || res.status === 403) {
    await clearAccessToken().catch(() => {});
  }

  return res;
}

/** Public API (토큰/JSON 강제 없음) */
export async function apiPublic(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(buildUrl(path), { ...init });
}

/** JSON API */
export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await request(path, init, { expectJson: true });

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

/**
 * 업로드 API (FormData)
 * - RN은 Content-Type을 직접 지정하면 boundary가 깨질 수 있어 지정하지 않는 것이 정석입니다.
 */
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  init: RequestInit = {}
): Promise<T> {
  const res = await request(
    path,
    {
      ...init,
      method: init.method ?? "POST",
      body: formData,
      // headers는 request()에서 auth + init.headers 합쳐짐
      // (주의) 여기서 Content-Type을 지정하지 마세요.
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

/* =========================
   Auth (RN 네이티브 카카오)
   ========================= */

export function exchangeKakaoToken(kakaoAccessToken: string) {
  return fetch(buildUrl("/auth/kakao/native"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kakaoAccessToken }),
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

  await clearAccessToken().catch(() => {});
}

/* =========================
   JWT 파싱 (RN 권장: jwt-decode)
   ========================= */

type JwtPayload = {
  userId?: number | string;
  id?: number | string;
  sub?: number | string;
  type?: "access" | "refresh" | string;
};

/** accessToken에서 userId 추출 */
export async function getUserIdFromAccessToken(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const raw = token.startsWith("Bearer ") ? token.slice(7) : token;

  try {
    const payload = jwtDecode<JwtPayload>(raw);

    // 백엔드가 subject(userId)를 sub로 넣는 구조이므로 sub 우선
    return (
      (payload.sub != null ? String(payload.sub) : null) ||
      (payload.userId != null ? String(payload.userId) : null) ||
      (payload.id != null ? String(payload.id) : null) ||
      null
    );
  } catch {
    return null;
  }
}

/* =========================
   Types & APIs
   ========================= */

export type Transcription = {
  id: number;
  text: string;
  audioUrl?: string;
};

/* - mypage관련 - */
export type UserBase = {
  userId: number;
  name: string;
  nickname: string | null;
  profileImage: string | null;
  verificationImage: string | null;
  role: string;
  status: string;
};
export type UserMe = UserBase;

export async function getUserMe(): Promise<UserMe> {
  return api<UserMe>("/users/me");
}

/** 재학생 인증 - RN은 uri 기반 업로드 */
export type ApplyVerificationResponse = UserBase;

export type UploadFileLike = {
  uri: string;  // "file://..." or "content://..."
  name: string; // "student_card.jpg"
  type: string; // "image/jpeg"
};

export async function applyMyVerification(
  file: UploadFileLike
): Promise<ApplyVerificationResponse> {
  const userId = await getUserIdFromAccessToken();
  if (!userId) {
    throw new ApiError(401, "로그인 정보에서 userId를 찾을 수 없습니다.");
  }

  const formData = new FormData();

  // RN FormData: { uri, name, type } 형태를 명시적으로 넣는게 안정적입니다.
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

// JUMP 사용자 인증
export async function verifyJumpUser (
  code: string
): Promise<UserMe> {
  return api<UserMe>("/users/me/jump-verify", {
    method: "POST",
    body: JSON.stringify({ code } satisfies { code: string }),
  });
}

// 프로필 수정
export type UpdateMyProfileInput = {
  name?: string | null;
  nickname?: string | null;
  imageFile?: UploadFileLike | null;
};

export async function updateMyProfile(input: UpdateMyProfileInput): Promise<UserMe> {
  const formData = new FormData();

  if (input.name != null) formData.append("name", input.name);
  if (input.nickname != null) formData.append("nickname", input.nickname);

  if (input.imageFile != null) {
    formData.append("imageFile", input.imageFile);
    formData.append("imagefile", input.imageFile);
  }
  
  return apiUpload<UserMe>("/users/me", formData, { method: "PATCH" });
}

// 수료증(관리자 업로드 파일) 타입
export type AdminUserFile = {
  fileId: number;
  url: string;
  filename: string;
};

// 관리자 업로드 파일 목록 조회
export async function getMyAdminFiles(): Promise<AdminUserFile[]> {
  return api<AdminUserFile[]>("/users/me/admin-files", { method: "GET" });
}

// 관리자 업로드 파일 다운로드
export async function getMyAdminFileDownloadUrl(
  fileId: number | string
): Promise<string> {
  const res = await api<{ url: string }>(`/users/me/admin-files/${fileId}`, {
    method: "GET",
  });
  return res.url;
}

/** 맞춤 질문 조회 */
export type EventDayQuestionsResponse = {
  eventDayId: number;
  questionId: number;
  questionList: string[];
};
export async function getEventDayQuestions(
  eventDayId: string | number
): Promise<EventDayQuestionsResponse> {
  return api<EventDayQuestionsResponse>(`/event-days/${eventDayId}/questions`);
}

/** eventDay 상세 */
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
