"use client";

import { NotificationRow } from "@/components/notifications/notification-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import {
  getNotifications,
  getParticipationErrorMessage,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { NotificationResponse } from "@/types/notification";
import type { SpringPage } from "@/types/spring-page";
import type { InfiniteData } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Bell, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function notificationsListQueryKey(size: number) {
  return ["notifications", "list", size] as const;
}

function patchReadInInfiniteCache(
  queryClient: ReturnType<typeof useQueryClient>,
  notificationId: number
) {
  const key = notificationsListQueryKey(PAGE_SIZE);
  const readAt = new Date().toISOString();
  queryClient.setQueryData<InfiniteData<SpringPage<NotificationResponse>>>(
    key,
    (old) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          content: page.content.map((n) =>
            n.notificationId === notificationId ? { ...n, readAt } : n
          ),
        })),
      };
    }
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, accessToken } = useAuthStore();

  const enabled = hasHydrated && isAuthenticated && !!accessToken;
  const { data: unreadTotal } = useUnreadNotificationCount();
  const [busyNotificationId, setBusyNotificationId] = useState<number | null>(
    null
  );
  const openGuardRef = useRef(false);

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: notificationsListQueryKey(PAGE_SIZE),
    queryFn: ({ pageParam }) =>
      getNotifications({ page: pageParam as number, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    enabled,
  });

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.content) ?? [],
    [data?.pages]
  );

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, notificationId) => {
      patchReadInInfiniteCache(queryClient, notificationId);
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
    },
    onError: (err) => {
      toast.error(getParticipationErrorMessage(err));
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("모든 알림을 읽음으로 표시했습니다.");
    },
    onError: (err) => {
      toast.error(getParticipationErrorMessage(err));
    },
  });

  const handleOpen = useCallback(
    async (n: NotificationResponse) => {
      if (openGuardRef.current) return;
      openGuardRef.current = true;
      setBusyNotificationId(n.notificationId);
      try {
        if (n.readAt == null) {
          try {
            await markReadMutation.mutateAsync(n.notificationId);
          } catch {
            return;
          }
        }
        if (n.relatedMatchId != null) {
          router.push(`/matching/${n.relatedMatchId}`);
        }
      } finally {
        openGuardRef.current = false;
        setBusyNotificationId(null);
      }
    },
    [markReadMutation, router]
  );

  const showMarkAll =
    (unreadTotal ?? 0) > 0 || items.some((n) => n.readAt == null);

  if (hasHydrated && (!isAuthenticated || !accessToken)) {
    return (
      <div className="min-h-screen bg-background px-4 py-12 text-center">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">
          로그인 후 알림을 확인할 수 있습니다.
        </p>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "default" }),
            "mt-4 inline-flex no-underline"
          )}
        >
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-2">
          <Link
            href="/matching"
            className="flex shrink-0 items-center gap-1 px-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">홈</span>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold">
            알림
          </h1>
          <div className="flex w-[4.5rem] shrink-0 justify-end pr-1">
            {showMarkAll ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={markAllMutation.isPending}
                onClick={() => markAllMutation.mutate()}
              >
                {markAllMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "전체 읽음"
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {isPending ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="px-4 py-12 text-center">
            <p className="text-destructive">
              {getParticipationErrorMessage(error)}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <Bell className="h-14 w-14 text-muted-foreground/50" />
            <p className="mt-4 font-medium text-foreground">알림이 없습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">
              매칭 신청·수락·대기열 등 소식이 오면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            <ul className="border-t" role="list">
              {items.map((n) => (
                <li key={n.notificationId}>
                  <NotificationRow
                    item={n}
                    onOpen={() => handleOpen(n)}
                    disabled={busyNotificationId === n.notificationId}
                  />
                </li>
              ))}
            </ul>
            {hasNextPage ? (
              <div className="flex justify-center py-6">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      불러오는 중…
                    </>
                  ) : (
                    "더 보기"
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
