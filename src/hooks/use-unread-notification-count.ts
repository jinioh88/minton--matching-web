"use client";

import { useStompOptional } from "@/contexts/stomp-context";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { getUnreadNotificationCount } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";

const UNREAD_POLL_MS = 45_000;

/** Sprint 5 Phase 6: 미읽음 알림 수. Sprint6 Phase 6: STOMP 연결 시 폴링 생략 */
export function useUnreadNotificationCount() {
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, accessToken } = useAuthStore();
  const stomp = useStompOptional();
  const stompLive = stomp?.isConnected ?? false;

  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: hasHydrated && isAuthenticated && !!accessToken,
    refetchInterval: () => {
      if (stompLive) return false;
      return typeof document !== "undefined" && document.hidden
        ? false
        : UNREAD_POLL_MS;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
