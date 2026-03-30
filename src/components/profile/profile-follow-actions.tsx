"use client";

import { Button } from "@/components/ui/button";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import {
  followUser,
  getMyFollowings,
  getParticipationErrorMessage,
  unfollowUser,
} from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

export const friendshipsQueryKey = ["friendships", "me"] as const;

type ProfileFollowActionsProps = {
  targetUserId: number;
};

export function ProfileFollowActions({ targetUserId }: ProfileFollowActionsProps) {
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const enabled =
    hasHydrated && isAuthenticated && !!accessToken && Number.isFinite(targetUserId);

  const { data: followings, isPending } = useQuery({
    queryKey: friendshipsQueryKey,
    queryFn: getMyFollowings,
    enabled,
  });

  const isFollowing = useMemo(
    () => followings?.some((f) => f.userId === targetUserId) ?? false,
    [followings, targetUserId]
  );

  const followMutation = useMutation({
    mutationFn: () => followUser(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipsQueryKey });
      toast.success("팔로우했습니다.");
    },
    onError: (err) => {
      toast.error(getParticipationErrorMessage(err));
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipsQueryKey });
      toast.success("팔로우를 해제했습니다.");
    },
    onError: (err) => {
      toast.error(getParticipationErrorMessage(err));
    },
  });

  if (!hasHydrated || !isAuthenticated || !accessToken) {
    return null;
  }

  const busy = followMutation.isPending || unfollowMutation.isPending;

  if (isPending && followings === undefined) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isFollowing) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">팔로우 중인 회원입니다.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => unfollowMutation.mutate()}
        >
          {unfollowMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserMinus className="h-3.5 w-3.5" />
          )}
          언팔로우
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      className="gap-1.5"
      disabled={busy}
      onClick={() => followMutation.mutate()}
    >
      {followMutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      팔로우
    </Button>
  );
}
