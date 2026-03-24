"use client";

import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { getUnreadNotificationCount } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";

const UNREAD_POLL_MS = 45_000;

/** Sprint 5 Phase 6: 미읽음 알림 수 (홈 헤더 배지·폴링) */
export function useUnreadNotificationCount() {
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, accessToken } = useAuthStore();

  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: hasHydrated && isAuthenticated && !!accessToken,
    refetchInterval: () =>
      typeof document !== "undefined" && document.hidden ? false : UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
