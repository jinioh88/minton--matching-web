import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types/profile";
import type {
  ApplicationItem,
  ApplyParticipationResponse,
  CreateMatchRequest,
  CreateMatchResponse,
  MatchDetail,
  MatchListResponse,
  UpdateMatchRequest,
} from "@/types/match";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Request Interceptor: 모든 요청에 JWT 자동 첨부
apiClient.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData 전송 시 Content-Type 제거 → axios가 boundary 포함 multipart/form-data 자동 설정
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Response Interceptor: 401/403/404(사용자 없음) 시 로그아웃 후 로그인 페이지 이동
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status;
    const message =
      (err.response?.data as { message?: string })?.message ?? "";

    const isUsersMeRequest =
      typeof err.config?.url === "string" &&
      err.config.url.includes("/users/me");

    const shouldRedirectToLogin =
      status === 401 ||
      status === 403 ||
      (status === 404 && isUsersMeRequest) ||
      message.includes("사용자를 찾을 수 없습니다");

    if (shouldRedirectToLogin && typeof window !== "undefined") {
      useAuthStore.getState().logout();
      const errorMsg = message.includes("사용자를 찾을 수 없습니다")
        ? encodeURIComponent("사용자를 찾을 수 없습니다. 다시 로그인해 주세요.")
        : encodeURIComponent("세션이 만료되었습니다. 다시 로그인해 주세요.");
      window.location.href = `/login?error=${errorMsg}`;
    }
    return Promise.reject(err);
  }
);

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
};

/** Sprint 3 에러 코드 → 사용자 친화적 메시지 */
const PARTICIPATION_ERROR_MESSAGES: Record<string, string> = {
  MATCH_NOT_FOUND: "매칭을 찾을 수 없습니다",
  MATCH_NOT_RECRUITING: "모집 중인 매칭이 아닙니다",
  ALREADY_APPLIED: "이미 신청한 매칭입니다",
  HOST_CANNOT_APPLY: "방장은 참여 신청할 수 없습니다",
  PARTICIPANT_NOT_FOUND: "참여 내역을 찾을 수 없습니다",
  INVALID_STATUS: "이미 처리된 신청이거나 수락할 수 없는 상태입니다",
  MATCH_FULL: "정원이 가득 찼습니다",
  CANNOT_CANCEL: "취소할 수 없는 상태입니다",
  OFFER_EXPIRED: "참여 기회가 만료되었습니다",
  FORBIDDEN: "권한이 없습니다",
  BAD_REQUEST: "입력값을 확인해 주세요",
};

/** API 에러에서 사용자 메시지 추출 (Sprint 3 참여 관련) */
export function getParticipationErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const code = (err.response?.data as { code?: string })?.code;
    const message = (err.response?.data as { message?: string })?.message;
    if (code && PARTICIPATION_ERROR_MESSAGES[code]) {
      return PARTICIPATION_ERROR_MESSAGES[code];
    }
    if (message) return message;
  }
  if (err instanceof Error) return err.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

/** 프로필 이미지 업로드 (Multipart). 업데이트된 프로필 반환 */
export async function uploadProfileImage(file: File): Promise<Profile> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await apiClient.post<ApiResponse<Profile>>(
    "/users/me/profile-image",
    formData
  );
  const data = res.data?.data;
  if (!data) throw new Error("응답 데이터가 없습니다.");
  return data;
}

/** 파일 업로드 (Multipart). S3 URL 반환. type: PROFILE | MATCH */
export async function uploadFile(
  file: File,
  type: "PROFILE" | "MATCH" = "MATCH"
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  const res = await apiClient.post<
    ApiResponse<{ url: string; key: string }>
  >("/files/upload", formData);
  const data = res.data?.data;
  if (!data?.url) throw new Error("업로드에 실패했습니다.");
  return data;
}

/** 매칭 생성 */
export async function createMatch(
  body: CreateMatchRequest
): Promise<CreateMatchResponse> {
  const res = await apiClient.post<ApiResponse<CreateMatchResponse>>(
    "/matches",
    body
  );
  const data = res.data?.data;
  if (!data) throw new Error("매칭 생성에 실패했습니다.");
  return data;
}

/** 매칭 목록 조회 */
export async function getMatchList(params?: {
  regionCode?: string;
  dateFrom?: string;
  dateTo?: string;
  level?: string;
  page?: number;
  size?: number;
}): Promise<MatchListResponse> {
  const res = await apiClient.get<ApiResponse<MatchListResponse>>("/matches", {
    params,
  });
  const data = res.data?.data;
  if (!data) throw new Error("목록을 불러오는데 실패했습니다.");
  return data;
}

/** 매칭 상세 조회 */
export async function getMatchDetail(matchId: number): Promise<MatchDetail> {
  const res = await apiClient.get<ApiResponse<MatchDetail>>(
    `/matches/${matchId}`
  );
  const data = res.data?.data;
  if (!data) throw new Error("매칭 정보를 불러오는데 실패했습니다.");
  return data;
}

/** 매칭 상태 변경 (방장 전용). status: CLOSED(모집 마감) | CANCELLED(취소) */
export async function updateMatchStatus(
  matchId: number,
  status: "CLOSED" | "CANCELLED"
): Promise<MatchDetail> {
  const res = await apiClient.patch<ApiResponse<MatchDetail>>(
    `/matches/${matchId}`,
    { status }
  );
  const data = res.data?.data;
  if (!data) throw new Error("매칭 상태 변경에 실패했습니다.");
  return data;
}

/** 매칭 정보 수정 (방장 전용, RECRUITING만). partial update */
export async function updateMatch(
  matchId: number,
  body: UpdateMatchRequest
): Promise<MatchDetail> {
  const res = await apiClient.patch<ApiResponse<MatchDetail>>(
    `/matches/${matchId}`,
    body
  );
  const data = res.data?.data;
  if (!data) throw new Error("매칭 수정에 실패했습니다.");
  return data;
}

// --- Sprint 3: 참여/대기열 API ---

/** 참여/대기 신청. 정원 여유 시 PENDING, 초과 시 WAITING 반환 */
export async function applyParticipation(
  matchId: number,
  applyMessage?: string
): Promise<ApplyParticipationResponse> {
  const res = await apiClient.post<ApiResponse<ApplyParticipationResponse>>(
    `/matches/${matchId}/participants`,
    { applyMessage: applyMessage || undefined }
  );
  const data = res.data?.data;
  if (!data) throw new Error("참여 신청에 실패했습니다.");
  return data;
}

/** 방장 수락/거절/추방. action: ACCEPT | REJECT | KICK (KICK은 ACCEPTED 확정 참여자만) */
export async function updateParticipation(
  matchId: number,
  participationId: number,
  action: "ACCEPT" | "REJECT" | "KICK"
): Promise<ApplyParticipationResponse> {
  const res = await apiClient.patch<ApiResponse<ApplyParticipationResponse>>(
    `/matches/${matchId}/participants/${participationId}`,
    { action }
  );
  const data = res.data?.data;
  if (!data) throw new Error("처리에 실패했습니다.");
  return data;
}

/** 참여 취소. ACCEPTED 취소 시 대기열 승격 트리거 */
export async function cancelParticipation(matchId: number): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(
    `/matches/${matchId}/participants/me`
  );
}

/** 예약 수락 (RESERVED 또는 긴급 모드 WAITING) */
export async function acceptOffer(
  matchId: number
): Promise<ApplyParticipationResponse> {
  const res = await apiClient.post<ApiResponse<ApplyParticipationResponse>>(
    `/matches/${matchId}/participants/me/accept-offer`
  );
  const data = res.data?.data;
  if (!data) throw new Error("수락 처리에 실패했습니다.");
  return data;
}

/** 예약 거절 (RESERVED) */
export async function rejectOffer(
  matchId: number
): Promise<ApplyParticipationResponse> {
  const res = await apiClient.post<ApiResponse<ApplyParticipationResponse>>(
    `/matches/${matchId}/participants/me/reject-offer`
  );
  const data = res.data?.data;
  if (!data) throw new Error("거절 처리에 실패했습니다.");
  return data;
}

/** 방장 신청 목록 조회 (PENDING/WAITING/RESERVED) */
export async function getApplications(
  matchId: number
): Promise<ApplicationItem[]> {
  const res = await apiClient.get<ApiResponse<ApplicationItem[]>>(
    `/matches/${matchId}/participants/applications`
  );
  const data = res.data?.data;
  if (!data) throw new Error("신청 목록을 불러오는데 실패했습니다.");
  return data;
}
