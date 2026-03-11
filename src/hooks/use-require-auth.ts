"use client";

import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 비로그인 시 redirectPath로 리다이렉트.
 * @returns { ready: boolean } - hasHydrated && (isAuthenticated || redirect 완료)
 */
export const useRequireAuth = (redirectPath = "/login") => {
  const hasHydrated = useHasHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [hasHydrated, isAuthenticated, router, redirectPath]);

  return {
    ready: hasHydrated,
    isAuthenticated,
    shouldRedirect: hasHydrated && !isAuthenticated,
  };
};
