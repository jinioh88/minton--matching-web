"use client";

import { apiClient } from "@/lib/api";
import { getRedirectUri } from "@/lib/oauth";
import { useAuthStore } from "@/stores/authStore";
import type { OAuthProvider } from "@/lib/oauth";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const OAUTH_PROVIDERS: OAuthProvider[] = [
  "KAKAO",
  "NAVER",
  "GOOGLE",
  "APPLE",
];

/**
 * OAuth 콜백 페이지
 * OAuth Provider에서 code 수신 → POST /api/auth/oauth/login 호출 → JWT 저장 → profileComplete 분기
 */
const OAuthCallbackContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state") as OAuthProvider | null;

    if (!code || !state || !OAUTH_PROVIDERS.includes(state)) {
      setStatus("error");
      setErrorMessage("잘못된 OAuth 콜백입니다. code 또는 provider가 없습니다.");
      return;
    }

    const redirectUri = getRedirectUri(state);

    apiClient
      .post("/auth/oauth/login", {
        provider: state,
        authorizationCode: code,
        redirectUri,
      })
      .then((res) => {
        const { accessToken, user } = res.data.data;
        useAuthStore.getState().setAuth(user, accessToken);

        if (user.profileComplete) {
          router.replace("/");
        } else {
          router.replace("/signup");
        }
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        const errCode = err.response?.data?.code;
        const message = err.response?.data?.message;
        if (errCode === "OAUTH_INVALID") {
          setErrorMessage(message || "OAuth 인증에 실패했습니다.");
        } else {
          setErrorMessage(message || err.message || "로그인에 실패했습니다.");
        }
      });
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">로그인 처리 중...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-center font-medium text-destructive">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-lg border px-4 py-2 hover:bg-muted"
        >
          로그인 페이지로
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
};

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
