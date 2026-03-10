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

// Response Interceptor: 401 시 authStore 초기화 후 로그인 페이지 이동
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        useAuthStore.getState().logout();
        window.location.href = "/login";
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
