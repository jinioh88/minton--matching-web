"use client";

import { AccountRestrictionBanner } from "@/components/profile/account-restriction-banner";
import { ActivitySummary } from "@/components/profile/activity-summary";
import { ProfileDetailSettings } from "@/components/profile/profile-detail-settings";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { ReceivedPenaltiesSummary } from "@/components/profile/received-penalties-summary";
import { ReceivedReviewsSummary } from "@/components/profile/received-reviews-summary";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types/profile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationsNavLink } from "@/components/notifications/notifications-nav-link";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MyProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ready, isAuthenticated, shouldRedirect } = useRequireAuth("/login");
  const { logout, accessToken } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const res = await apiClient.get("/users/me");
      return res.data.data as Profile;
    },
    enabled: ready && !!accessToken && isAuthenticated,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 3;
    },
  });

  useEffect(() => {
    if (data) setProfile(data);
  }, [data]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleProfileUpdate = (updated: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const handleProfileImageUpdate = (profileImg: string) => {
    handleProfileUpdate({ profileImg });
    queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
  };

  if (!ready || shouldRedirect || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
          className="rounded-lg border px-4 py-2"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href="/matching"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">뒤로</span>
        </Link>
        <NotificationsNavLink />
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <ProfileHeader
          nickname={profile.nickname}
          profileImg={profile.profileImg}
          level={profile.level}
          ratingScore={profile.ratingScore}
          joinedAt={profile.joinedAt}
          createdAt={profile.createdAt}
          showCautionBadge={profile.showCautionBadge === true}
          onProfileImageUpdate={handleProfileImageUpdate}
        />

        <div className="space-y-6 border-t pt-6">
          <AccountRestrictionBanner profile={profile} />

          <ActivitySummary
            hostedCount={0}
            joinedCount={0}
            penaltyCount={profile.penaltyCount ?? 0}
          />

          <div className="border-t pt-6">
            <ReceivedReviewsSummary
              userId={profile.id}
              receivedReviewCount={profile.receivedReviewCount}
              listHref="/profile/me/reviews"
            />
          </div>

          <div className="border-t pt-6">
            <ReceivedPenaltiesSummary
              userId={profile.id}
              penaltyCount={profile.penaltyCount}
              listHref="/profile/me/penalties"
            />
          </div>

          <div className="border-t pt-6">
            <ProfileDetailSettings profile={profile} onUpdate={handleProfileUpdate} />
          </div>

          <div className="border-t pt-6">
            <ProfileMenu />
          </div>

          <div className="flex justify-center pt-8">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              로그아웃
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
