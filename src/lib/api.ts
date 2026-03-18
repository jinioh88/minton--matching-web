import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types/profile";
import type {
  CreateMatchRequest,
  CreateMatchResponse,
  MatchDetail,
  MatchListResponse,
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
