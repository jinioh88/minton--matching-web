import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";
import type { CreatePenaltyRequest, PenaltyHistoryItem } from "@/types/penalty";
import type { Profile } from "@/types/profile";
import type {
  CreateReviewRequest,
  CreateReviewResponse,
  PendingReviewItem,
  ReceivedReviewItem,
  WrittenReviewListItem,
} from "@/types/review";
import type {
  ApplicationItem,
  ApplyParticipationResponse,
  CreateMatchRequest,
  CreateMatchResponse,
  MatchDetail,
  MatchListResponse,
  MatchStatus,
  UpdateMatchRequest,
} from "@/types/match";
import type {
  ChatMessagePageResponse,
  ChatMessagePatchRequest,
  ChatMessageResponse,
  ChatMessageSendRequest,
  ChatRoomDetailResponse,
  ChatRoomListItemResponse,
} from "@/types/chat";
import type { NotificationResponse } from "@/types/notification";
import type { PageResponse } from "@/types/page";
import type { SpringPage } from "@/types/spring-page";

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
  INVALID_MATCH_STATUS: "현재 상태에서는 진행할 수 없습니다",
};

/** Sprint 4 후기·패널티·제재 관련 에러 코드 */
const SPRINT4_API_ERROR_MESSAGES: Record<string, string> = {
  REVIEW_NOT_ALLOWED: "이 모임에서는 후기를 작성할 수 없습니다.",
  SELF_REVIEW_NOT_ALLOWED: "본인에게는 후기를 남길 수 없습니다.",
  DUPLICATE_REVIEW: "이미 후기를 작성했습니다.",
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다.",
  INVALID_PENALTY_TARGET: "패널티를 줄 수 없는 대상입니다.",
  DUPLICATE_PENALTY: "이미 같은 유형의 패널티가 부여되었습니다.",
  USER_PARTICIPATION_BANNED: "현재 참여 제한 중인 계정입니다.",
  USER_SUSPENDED: "정지된 계정입니다. 이 작업을 할 수 없습니다.",
  USER_BANNED: "이용이 제한된 계정입니다.",
  NOT_FOUND: "요청한 정보를 찾을 수 없습니다.",
};

/** Sprint 5 채팅·알림 API 에러 코드 */
const SPRINT5_API_ERROR_MESSAGES: Record<string, string> = {
  CHAT_ACCESS_DENIED: "이 채팅방을 볼 수 있는 권한이 없습니다.",
  CHAT_ROOM_NOT_FOUND: "채팅방을 찾을 수 없습니다.",
  MESSAGE_NOT_FOUND: "메시지를 찾을 수 없습니다.",
  NOTIFICATION_NOT_FOUND: "알림을 찾을 수 없습니다.",
  VALIDATION_ERROR: "입력값을 확인해 주세요.",
};

const API_ERROR_MESSAGES: Record<string, string> = {
  ...PARTICIPATION_ERROR_MESSAGES,
  ...SPRINT4_API_ERROR_MESSAGES,
  ...SPRINT5_API_ERROR_MESSAGES,
};

/** Phase 7: 참여 신청 — 제재 코드는 재시도 불가 안내 */
const APPLY_PARTICIPATION_ERROR_OVERRIDES: Record<string, string> = {
  USER_PARTICIPATION_BANNED:
    "참여 제한 기간 중입니다. 기간이 끝나기 전에는 신청할 수 없으며, 같은 조건으로 다시 시도해도 신청되지 않습니다.",
  USER_SUSPENDED:
    "계정이 정지된 상태입니다. 정지가 해제되기 전에는 참여 신청을 할 수 없으며, 다시 시도해도 같습니다.",
  USER_BANNED:
    "이용이 제한된 계정입니다. 참여 신청이 불가하며, 재시도로 바뀌지 않습니다. 고객 지원을 이용해 주세요.",
};

/** Phase 7: 후기 작성 — 정지·밴 구분 */
const REVIEW_ERROR_OVERRIDES: Record<string, string> = {
  USER_SUSPENDED:
    "정지된 계정입니다. 정지 기간이 끝나기 전에는 후기를 작성할 수 없습니다.",
  USER_BANNED:
    "이용이 제한된 계정입니다. 후기를 작성할 수 없습니다. 고객 지원을 이용해 주세요.",
};

export type ApiErrorMessageContext = "apply" | "review" | "general";

/** API 에러에서 사용자 메시지 추출 (참여·후기·패널티 공통) */
export function getParticipationErrorMessage(
  err: unknown,
  context: ApiErrorMessageContext = "general"
): string {
  if (err instanceof AxiosError) {
    const code = (err.response?.data as { code?: string })?.code;
    const message = (err.response?.data as { message?: string })?.message;
    if (code) {
      if (context === "apply" && APPLY_PARTICIPATION_ERROR_OVERRIDES[code]) {
        return APPLY_PARTICIPATION_ERROR_OVERRIDES[code];
      }
      if (context === "review" && REVIEW_ERROR_OVERRIDES[code]) {
        return REVIEW_ERROR_OVERRIDES[code];
      }
      if (API_ERROR_MESSAGES[code]) {
        return API_ERROR_MESSAGES[code];
      }
    }
    if (message) return message;
  }
  if (err instanceof Error) return err.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

/** Sprint 5: 채팅방 조회·매칭→채팅 진입 (`CHAT_*` 우선 안내) */
export function getChatApiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const code = (err.response?.data as { code?: string })?.code;
    if (code === "CHAT_ROOM_NOT_FOUND" || code === "CHAT_ACCESS_DENIED") {
      return "채팅방을 찾을 수 없거나 이 방에 들어갈 권한이 없습니다. 채팅 목록에서 참여 중인 방을 선택해 주세요.";
    }
    const status = err.response?.status;
    const url = err.config?.url ?? "";
    if (
      status === 404 &&
      typeof url === "string" &&
      /\/chat\/rooms\/\d+(?:$|[?#])/.test(url)
    ) {
      return "존재하지 않는 채팅방입니다. 주소가 맞는지 확인하거나 채팅 목록으로 돌아가 주세요.";
    }
  }
  return getParticipationErrorMessage(err);
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

/**
 * 매칭 목록 조회
 * @param params.level 쉼표 구분 급수 (예: `B,C`). OR 조건·토큰 완전 일치 — Sprint2-API 목록 조회
 */
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

/** 모집 마감 (방장 전용). PATCH 본문 `{ status: CLOSED }` */
export async function closeMatch(matchId: number): Promise<MatchDetail> {
  const res = await apiClient.patch<ApiResponse<MatchDetail>>(
    `/matches/${matchId}`,
    { status: "CLOSED" }
  );
  const data = res.data?.data;
  if (!data) throw new Error("모집 마감 처리에 실패했습니다.");
  return data;
}

/**
 * 모임 전체 취소 (방장 전용).
 * `PATCH /matches/{id}` 본문으로 CANCELLED 보내지 않고 전용 엔드포인트만 사용 (Sprint3-API §7-1).
 */
export async function cancelMatch(matchId: number): Promise<MatchDetail> {
  const res = await apiClient.patch<ApiResponse<MatchDetail>>(
    `/matches/${matchId}/cancel`
  );
  const data = res.data?.data;
  if (!data) throw new Error("매칭 취소에 실패했습니다.");
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

// --- Sprint 4: 종료·후기·패널티·프로필 ---

/** 매칭 수동 종료 (방장, CLOSED → FINISHED) */
export async function finishMatch(matchId: number): Promise<MatchDetail> {
  const res = await apiClient.patch<ApiResponse<MatchDetail>>(
    `/matches/${matchId}/finish`
  );
  const data = res.data?.data;
  if (!data) throw new Error("모임 종료 처리에 실패했습니다.");
  return data;
}

/** 후기 작성 */
export async function createReview(
  matchId: number,
  body: CreateReviewRequest
): Promise<CreateReviewResponse> {
  const res = await apiClient.post<ApiResponse<CreateReviewResponse>>(
    `/matches/${matchId}/reviews`,
    body
  );
  const data = res.data?.data;
  if (!data) throw new Error("후기 작성에 실패했습니다.");
  return data;
}

/** 받은 후기 목록 (비로그인 가능 — 마스킹은 서버 규칙) */
export async function getUserReviews(
  userId: number,
  params?: { page?: number; size?: number }
): Promise<PageResponse<ReceivedReviewItem>> {
  const res = await apiClient.get<ApiResponse<PageResponse<ReceivedReviewItem>>>(
    `/users/${userId}/reviews`,
    { params: { page: params?.page ?? 0, size: params?.size ?? 20 } }
  );
  const data = res.data?.data;
  if (!data) throw new Error("후기 목록을 불러오는데 실패했습니다.");
  return data;
}

/** 패널티 부여 (방장, FINISHED) */
export async function createPenalty(
  matchId: number,
  body: CreatePenaltyRequest
): Promise<void> {
  const res = await apiClient.post<ApiResponse<unknown>>(
    `/matches/${matchId}/penalties`,
    body
  );
  if (!res.data?.success) {
    throw new Error("패널티 부여에 실패했습니다.");
  }
}

/** 받은 패널티 이력 */
export async function getUserPenalties(
  userId: number,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PenaltyHistoryItem>> {
  const res = await apiClient.get<
    ApiResponse<PageResponse<PenaltyHistoryItem>>
  >(`/users/${userId}/penalties`, {
    params: { page: params?.page ?? 0, size: params?.size ?? 20 },
  });
  const data = res.data?.data;
  if (!data) throw new Error("패널티 이력을 불러오는데 실패했습니다.");
  return data;
}

/** 내 프로필 (Sprint 4 제재·후기 필드 포함 가능) */
export async function getMyProfile(): Promise<Profile> {
  const res = await apiClient.get<ApiResponse<Profile>>("/users/me");
  const data = res.data?.data;
  if (!data) throw new Error("프로필을 불러오는데 실패했습니다.");
  return data;
}

/** 타인 프로필 */
export async function getUserProfile(userId: number): Promise<Profile> {
  const res = await apiClient.get<ApiResponse<Profile>>(`/users/${userId}`);
  const data = res.data?.data;
  if (!data) throw new Error("프로필을 불러오는데 실패했습니다.");
  return data;
}

// --- Sprint 7: 마이페이지 집계·매칭 내역·후기 허브 ---

/** 내가 방장인 매칭 목록 (Spring `Page` → `MatchListResponse`) */
export async function getMyHostedMatches(params?: {
  status?: MatchStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}): Promise<MatchListResponse> {
  const res = await apiClient.get<ApiResponse<MatchListResponse>>(
    "/users/me/matches/hosted",
    {
      params: {
        status: params?.status,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    }
  );
  const data = res.data?.data;
  if (!data) throw new Error("개설 매칭 목록을 불러오는데 실패했습니다.");
  return data;
}

/** 확정 참여(ACCEPTED) 매칭 목록 */
export async function getMyParticipatedMatches(params?: {
  status?: MatchStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}): Promise<MatchListResponse> {
  const res = await apiClient.get<ApiResponse<MatchListResponse>>(
    "/users/me/matches/participated",
    {
      params: {
        status: params?.status,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    }
  );
  const data = res.data?.data;
  if (!data) throw new Error("참여 매칭 목록을 불러오는데 실패했습니다.");
  return data;
}

/** 내가 작성한 후기 목록 */
export async function getMyWrittenReviews(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<WrittenReviewListItem>> {
  const res = await apiClient.get<
    ApiResponse<PageResponse<WrittenReviewListItem>>
  >("/users/me/reviews/written", {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
    },
  });
  const data = res.data?.data;
  if (!data) throw new Error("작성한 후기 목록을 불러오는데 실패했습니다.");
  return data;
}

/** 후기 작성 대기 목록 */
export async function getMyPendingReviews(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<PendingReviewItem>> {
  const res = await apiClient.get<ApiResponse<PageResponse<PendingReviewItem>>>(
    "/users/me/reviews/pending",
    {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    }
  );
  const data = res.data?.data;
  if (!data) throw new Error("작성 대기 목록을 불러오는데 실패했습니다.");
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

// --- Sprint 5: 채팅·알림 (REST, Spring `Page` 목록) ---

/** 내 채팅방 목록 (`roomId` 내림차순 페이지) */
export async function getChatRooms(params?: {
  page?: number;
  size?: number;
}): Promise<SpringPage<ChatRoomListItemResponse>> {
  const res = await apiClient.get<ApiResponse<SpringPage<ChatRoomListItemResponse>>>(
    "/chat/rooms",
    {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    }
  );
  const data = res.data?.data;
  if (!data) throw new Error("채팅 목록을 불러오는데 실패했습니다.");
  return data;
}

/** 채팅방 상세: 공지 + 최근 메시지 1건 */
export async function getChatRoom(
  roomId: number
): Promise<ChatRoomDetailResponse> {
  const res = await apiClient.get<ApiResponse<ChatRoomDetailResponse>>(
    `/chat/rooms/${roomId}`
  );
  const data = res.data?.data;
  if (!data) throw new Error("채팅방 정보를 불러오는데 실패했습니다.");
  return data;
}

/** 매칭 ID로 채팅방 상세 (진입 UX용, 본문은 `getChatRoom`과 동일) */
export async function getMatchChat(
  matchId: number
): Promise<ChatRoomDetailResponse> {
  const res = await apiClient.get<ApiResponse<ChatRoomDetailResponse>>(
    `/matches/${matchId}/chat`
  );
  const data = res.data?.data;
  if (!data) throw new Error("채팅방 정보를 불러오는데 실패했습니다.");
  return data;
}

/**
 * 메시지 목록. `cursor`: 과거 페이지 / `afterId`: 폴링(신규만).
 * 동시 사용은 권장되지 않음 — `afterId`가 있으면 서버가 폴링 분기.
 */
export async function getChatMessages(
  roomId: number,
  params?: { cursor?: number; afterId?: number; size?: number }
): Promise<ChatMessagePageResponse> {
  const res = await apiClient.get<ApiResponse<ChatMessagePageResponse>>(
    `/chat/rooms/${roomId}/messages`,
    {
      params: {
        cursor: params?.cursor,
        afterId: params?.afterId,
        size: params?.size ?? 30,
      },
    }
  );
  const data = res.data?.data;
  if (!data) throw new Error("메시지를 불러오는데 실패했습니다.");
  return data;
}

/** 메시지 전송 (응답 본문 = 방금 보낸 메시지) */
export async function sendChatMessage(
  roomId: number,
  body: ChatMessageSendRequest
): Promise<ChatMessageResponse> {
  const res = await apiClient.post<ApiResponse<ChatMessageResponse>>(
    `/chat/rooms/${roomId}/messages`,
    body
  );
  const data = res.data?.data;
  if (!data) throw new Error("메시지 전송에 실패했습니다.");
  return data;
}

export async function patchChatMessage(
  roomId: number,
  messageId: number,
  body: ChatMessagePatchRequest
): Promise<ChatMessageResponse> {
  const res = await apiClient.patch<ApiResponse<ChatMessageResponse>>(
    `/chat/rooms/${roomId}/messages/${messageId}`,
    body
  );
  const data = res.data?.data;
  if (!data) throw new Error("메시지 수정에 실패했습니다.");
  return data;
}

export async function deleteChatMessage(
  roomId: number,
  messageId: number
): Promise<void> {
  const res = await apiClient.delete<ApiResponse<null>>(
    `/chat/rooms/${roomId}/messages/${messageId}`
  );
  if (!res.data?.success) {
    throw new Error("메시지 삭제에 실패했습니다.");
  }
}

/** 내 알림 목록 (`createdAt` 내림차순) */
export async function getNotifications(params?: {
  page?: number;
  size?: number;
}): Promise<SpringPage<NotificationResponse>> {
  const res = await apiClient.get<
    ApiResponse<SpringPage<NotificationResponse>>
  >("/notifications", {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
    },
  });
  const data = res.data?.data;
  if (!data) throw new Error("알림 목록을 불러오는데 실패했습니다.");
  return data;
}

/** 미읽음 알림 건수 */
export async function getUnreadNotificationCount(): Promise<number> {
  const res = await apiClient.get<ApiResponse<number>>(
    "/notifications/unread-count"
  );
  const data = res.data?.data;
  if (typeof data !== "number") {
    throw new Error("미읽음 수를 불러오는데 실패했습니다.");
  }
  return data;
}

/** 단건 읽음 */
export async function markNotificationRead(
  notificationId: number
): Promise<void> {
  const res = await apiClient.patch<ApiResponse<unknown>>(
    `/notifications/${notificationId}/read`
  );
  if (!res.data?.success) {
    throw new Error("알림 읽음 처리에 실패했습니다.");
  }
}

/** 미읽음 일괄 읽음 — 갱신된 행 수 */
export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiClient.post<ApiResponse<number>>(
    "/notifications/read-all"
  );
  const data = res.data?.data;
  if (typeof data !== "number") {
    throw new Error("알림 읽음 처리에 실패했습니다.");
  }
  return data;
}
