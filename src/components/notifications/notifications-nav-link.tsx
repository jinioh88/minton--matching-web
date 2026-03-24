"use client";

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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PREVIEW_SIZE = 10;

type NotificationsNavLinkProps = {
  className?: string;
  iconClassName?: string;
};

function formatPreviewTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 홈·채팅·프로필 — 종 클릭 시 최근 알림 미리보기, 더보기로 전체 페이지 */
export function NotificationsNavLink({
  className,
  iconClassName,
}: NotificationsNavLinkProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { data: unreadCount } = useUnreadNotificationCount();

  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["notifications", "preview", PREVIEW_SIZE],
    queryFn: () => getNotifications({ page: 0, size: PREVIEW_SIZE }),
    enabled: open && isAuthenticated,
    staleTime: 15_000,
  });

  const items = data?.content ?? [];

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleBellToggle = () => {
    if (!open) {
      markAllMutation.mutate();
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleItemClick = async (n: NotificationResponse) => {
    if (busyId != null) return;
    setBusyId(n.notificationId);
    try {
      if (n.readAt == null) {
        await markReadMutation.mutateAsync(n.notificationId);
      }
      setOpen(false);
      if (n.relatedMatchId != null) {
        router.push(`/matching/${n.relatedMatchId}`);
      }
    } catch {
      // 토스트는 전역 패턴 생략 — 전체 페이지에서 재시도 가능
    } finally {
      setBusyId(null);
    }
  };

  const bell = (
    <>
      <Bell className={cn("h-5 w-5", iconClassName)} />
      {isAuthenticated &&
      typeof unreadCount === "number" &&
      unreadCount > 0 ? (
        <span className="absolute right-0 top-0 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </>
  );

  if (!isAuthenticated) {
    return (
      <Link
        href="/notifications"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted",
          className
        )}
        aria-label="알림"
      >
        {bell}
      </Link>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleBellToggle}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="알림"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {bell}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 top-full z-[100] mt-1 flex max-h-[min(70vh,28rem)] w-[min(calc(100vw-2rem),22rem)] flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-lg"
          )}
          role="dialog"
          aria-label="알림 미리보기"
        >
          <div className="border-b px-3 py-2">
            <p className="text-sm font-semibold">알림</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isPending ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="px-3 py-6 text-center">
                <p className="text-xs text-destructive">
                  {getParticipationErrorMessage(error)}
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-primary underline"
                  onClick={() => refetch()}
                >
                  다시 시도
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                알림이 없습니다
              </p>
            ) : (
              <ul className="divide-y" role="list">
                {items.map((n) => {
                  const unread = n.readAt == null;
                  const busy = busyId === n.notificationId;
                  return (
                    <li key={n.notificationId}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleItemClick(n)}
                        className={cn(
                          "flex w-full gap-2 px-3 py-2.5 text-left transition-colors",
                          "hover:bg-muted/60 disabled:opacity-50",
                          unread && "bg-primary/5"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            unread ? "bg-primary" : "bg-transparent"
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-1 text-sm font-medium">
                              {n.title}
                            </p>
                            <time
                              className="shrink-0 text-[10px] text-muted-foreground"
                              dateTime={n.createdAt}
                            >
                              {formatPreviewTime(n.createdAt)}
                            </time>
                          </div>
                          {n.body ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.body}
                            </p>
                          ) : null}
                        </div>
                        {n.relatedMatchId != null ? (
                          <ChevronRight
                            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block w-full py-2.5 text-center text-sm font-medium text-primary hover:bg-muted/50"
            >
              더보기
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
