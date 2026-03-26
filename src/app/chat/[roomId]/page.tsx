"use client";

import { ChatMatchNotice } from "@/components/chat/chat-match-notice";
import { ChatMessageThread } from "@/components/chat/chat-message-thread";
import { StompStatusChip } from "@/components/chat/stomp-status-chip";
import { NotificationsNavLink } from "@/components/notifications/notifications-nav-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { getChatApiErrorMessage, getChatRoom } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ChatRoomPage() {
  const params = useParams();
  const roomIdParam = params.roomId as string;
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, accessToken } = useAuthStore();

  const roomId = Number(roomIdParam);
  const validId = /^\d+$/.test(roomIdParam) && Number.isFinite(roomId);

  const enabled =
    hasHydrated &&
    isAuthenticated &&
    !!accessToken &&
    validId;

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["chat", "room", roomId],
    queryFn: () => getChatRoom(roomId),
    enabled,
    retry: false,
  });

  /** v5: disabled 쿼리도 isPending이 true → 실제 요청 중일 때만 전체 로딩 */
  const isRoomLoading = isPending && isFetching;

  if (!validId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 text-center">
        <p className="text-destructive">잘못된 채팅방 주소입니다.</p>
        <Link
          href="/chat"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 inline-flex no-underline"
          )}
        >
          채팅 목록
        </Link>
      </div>
    );
  }

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    return (
      <div className="min-h-screen bg-background px-4 py-12 text-center">
        <p className="text-muted-foreground">로그인 후 채팅방을 열 수 있습니다.</p>
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

  if (isRoomLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <Link
            href="/chat"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">채팅 목록</span>
          </Link>
        </header>
        <div className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            이 채팅방을 불러올 수 없습니다.
          </p>
          <p className="mt-2 text-destructive">{getChatApiErrorMessage(error)}</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/chat"
              className={cn(
                buttonVariants({ variant: "default" }),
                "inline-flex w-full no-underline sm:w-auto"
              )}
            >
              채팅 목록으로
            </Link>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => refetch()}
            >
              다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 z-0 flex flex-col overflow-hidden bg-background bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]">
      <header className="z-20 shrink-0 border-b bg-background">
        <div className="flex h-14 items-center gap-2 px-4">
          <Link
            href="/chat"
            className="flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">목록</span>
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-base font-semibold">
              {data.matchNotice.title}
            </h1>
            <div className="mt-0.5 flex justify-center">
              <StompStatusChip />
            </div>
          </div>
          <div className="flex w-9 shrink-0 justify-end">
            <NotificationsNavLink className="h-9 w-9" />
          </div>
        </div>
      </header>

      <div className="shrink-0 bg-background">
        <ChatMatchNotice notice={data.matchNotice} />
      </div>

      <ChatMessageThread
        roomId={roomId}
        matchNotice={data.matchNotice}
        className="min-h-0 flex-1 overflow-hidden"
      />
    </div>
  );
}
