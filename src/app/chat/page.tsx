"use client";

import { ChatRoomRow } from "@/components/chat/chat-room-row";
import { NotificationsNavLink } from "@/components/notifications/notifications-nav-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { getChatRooms, getParticipationErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";

const PAGE_SIZE = 20;

export default function ChatPage() {
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, accessToken } = useAuthStore();

  const enabled = hasHydrated && isAuthenticated && !!accessToken;

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
    queryKey: ["chat", "rooms", PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      getChatRooms({ page: pageParam as number, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    enabled,
  });

  const rooms = useMemo(
    () => data?.pages.flatMap((p) => p.content) ?? [],
    [data?.pages]
  );

  const showLoginGate = hasHydrated && (!isAuthenticated || !accessToken);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">채팅</h1>
            <p className="text-sm text-muted-foreground">
              확정된 매칭의 채팅방 목록입니다
            </p>
          </div>
          {!showLoginGate ? <NotificationsNavLink /> : null}
        </div>
      </header>

      {showLoginGate ? (
        <main className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <MessageCircle className="h-14 w-14 text-muted-foreground" />
          <p className="text-muted-foreground">
            로그인 후 채팅 목록을 확인할 수 있습니다.
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default" }), "no-underline")}
          >
            로그인하기
          </Link>
        </main>
      ) : isPending ? (
        <main className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      ) : isError ? (
        <main className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <p className="text-destructive">
            {getParticipationErrorMessage(error)}
          </p>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            다시 시도
          </Button>
        </main>
      ) : rooms.length === 0 ? (
        <main className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <MessageCircle className="h-14 w-14 text-muted-foreground/60" />
          <p className="font-medium text-foreground">채팅방이 없습니다</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            매칭에 확정되면 여기에서 방장·참가자와 대화할 수 있습니다.
          </p>
          <Link
            href="/matching"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "mt-2 no-underline"
            )}
          >
            매칭 둘러보기
          </Link>
        </main>
      ) : (
        <main className="pb-8">
          <ul className="border-t border-border" role="list">
            {rooms.map((room) => (
              <li key={room.roomId}>
                <ChatRoomRow room={room} />
              </li>
            ))}
          </ul>
          {hasNextPage ? (
            <div className="flex justify-center px-4 py-6">
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
        </main>
      )}
    </div>
  );
}
