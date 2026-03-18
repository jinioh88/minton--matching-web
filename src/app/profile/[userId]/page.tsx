"use client";

import { ActivitySummary } from "@/components/profile/activity-summary";
import { ProfileDetailSettings } from "@/components/profile/profile-detail-settings";
import { ProfileHeader } from "@/components/profile/profile-header";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types/profile";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OtherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const userId = params?.userId as string | undefined;

  const isOwnProfile =
    hasHydrated &&
    isAuthenticated &&
    !!userId &&
    /^\d+$/.test(userId) &&
    user?.id === Number(userId);

  useEffect(() => {
    if (isOwnProfile) {
      router.replace("/profile/me");
    }
  }, [isOwnProfile, router]);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${userId}`);
      return res.data.data as Profile;
    },
    enabled: !!userId && /^\d+$/.test(userId) && !isOwnProfile,
    retry: (failureCount, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status === 404) return false;
      return failureCount < 3;
    },
  });

  const is404 =
    error instanceof AxiosError && error.response?.status === 404;
  const invalidUserId = !userId || !/^\d+$/.test(userId);

  if (isOwnProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (invalidUserId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">잘못된 프로필 주소입니다.</p>
        <Link
          href="/"
          className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
        >
          홈으로
        </Link>
      </div>
    );
  }

  if (is404) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <p className="text-center text-muted-foreground">
          조회할 수 없는 프로필입니다.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-lg border border-primary bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            홈으로
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">프로필을 불러오는데 실패했습니다.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">뒤로</span>
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <ProfileHeader
          nickname={profile.nickname}
          profileImg={profile.profileImg}
          level={profile.level}
          ratingScore={profile.ratingScore}
          joinedAt={profile.joinedAt}
          createdAt={profile.createdAt}
          readOnly
        />

        <div className="space-y-6 border-t pt-6">
          <ActivitySummary
            hostedCount={0}
            joinedCount={0}
            penaltyCount={profile.penaltyCount ?? 0}
          />

          <div className="border-t pt-6">
            <ProfileDetailSettings profile={profile} readOnly />
          </div>
        </div>
      </main>
    </div>
  );
}
