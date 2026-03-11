"use client";

import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { useAuthStore } from "@/stores/authStore";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

const LoginContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const error = searchParams.get("error");

  if (hasHydrated && isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">배드민턴 매칭</h1>
          <p className="mt-2 text-muted-foreground">
            소셜 계정으로 간편하게 로그인하세요
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {(() => {
              try {
                return decodeURIComponent(error);
              } catch {
                return error;
              }
            })()}
          </div>
        )}

        <OAuthButtons />

        <p className="text-center text-xs text-muted-foreground">
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
