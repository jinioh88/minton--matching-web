"use client";

import { friendshipsQueryKey } from "@/components/profile/profile-follow-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  getMyFollowings,
  getParticipationErrorMessage,
  unfollowUser,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FollowingUserResponse } from "@/types/friendship";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const LEVEL_LABELS: Record<string, string> = {
  A: "A급",
  B: "B급",
  C: "C급",
  D: "D급",
  BEGINNER: "초급",
};

function displayName(u: FollowingUserResponse) {
  return u.nickname?.trim() || "회원";
}

function FollowingRow({ user }: { user: FollowingUserResponse }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(user.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipsQueryKey });
      toast.success("팔로우를 해제했습니다.");
      setConfirmOpen(false);
    },
    onError: (err) => {
      toast.error(getParticipationErrorMessage(err));
    },
  });

  const levelLabel = user.level
    ? LEVEL_LABELS[user.level] ?? `${user.level}급`
    : null;

  return (
    <li className="border-b last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href={`/profile/${user.userId}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-90"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
            {user.profileImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profileImg}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg text-muted-foreground">
                {displayName(user).slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">
              {displayName(user)}
            </p>
            {levelLabel ? (
              <p className="text-xs text-muted-foreground">{levelLabel}</p>
            ) : null}
          </div>
        </Link>
        {confirmOpen ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">해제할까요?</span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setConfirmOpen(false)}
                disabled={unfollowMutation.isPending}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="xs"
                disabled={unfollowMutation.isPending}
                onClick={() => unfollowMutation.mutate()}
              >
                {unfollowMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "해제"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`${displayName(user)} 언팔로우`}
            onClick={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <UserX className="h-5 w-5" />
          </Button>
        )}
      </div>
    </li>
  );
}

export default function MyFriendsPage() {
  const { ready, isAuthenticated, shouldRedirect } = useRequireAuth("/login");
  const enabled = ready && isAuthenticated;

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: friendshipsQueryKey,
    queryFn: getMyFollowings,
    enabled,
  });

  if (!ready || shouldRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Link
            href="/profile/me"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">마이페이지</span>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold">
            팔로잉
          </h1>
          <span className="w-16 shrink-0" />
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {isPending ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="px-4 py-12 text-center">
            <p className="text-destructive">{getParticipationErrorMessage(error)}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : !data?.length ? (
          <div className="px-6 py-20 text-center">
            <p className="font-medium text-foreground">팔로우한 회원이 없습니다</p>
            <p className="mt-2 text-sm text-muted-foreground">
              매칭·프로필에서 마음에 드는 회원을 팔로우해 보세요.
            </p>
            <Link
              href="/matching"
              className={cn(buttonVariants({ variant: "default" }), "mt-6 inline-flex")}
            >
              매칭 둘러보기
            </Link>
          </div>
        ) : (
          <ul className="border-t bg-card" role="list">
            {data.map((u) => (
              <FollowingRow key={u.userId} user={u} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
