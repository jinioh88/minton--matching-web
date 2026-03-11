import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";

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
  return config;
});

// Response Interceptor: 401/403 시 로그아웃 후 로그인 페이지 이동
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      if (typeof window !== "undefined") {
        useAuthStore.getState().logout();
        const message = encodeURIComponent("세션이 만료되었습니다. 다시 로그인해 주세요.");
        window.location.href = `/login?error=${message}`;
      }
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
