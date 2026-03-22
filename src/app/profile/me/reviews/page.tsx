"use client";

import { ReceivedReviewsSection } from "@/components/profile/received-reviews-section";
import { buttonVariants } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function MyReceivedReviewsPage() {
  const { ready, isAuthenticated, shouldRedirect } = useRequireAuth("/login");
  const { user, accessToken } = useAuthStore();

  if (!ready || shouldRedirect || !isAuthenticated || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-muted-foreground">사용자 정보를 확인할 수 없습니다.</p>
        <Link
          href="/profile/me"
          className={cn(buttonVariants(), "mt-4 inline-flex no-underline")}
        >
          마이페이지로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href="/profile/me"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">마이페이지</span>
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-lg font-bold">받은 후기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          다른 참가자가 남긴 후기입니다.
        </p>
        <div className="mt-6">
          <ReceivedReviewsSection userId={user.id} embedHeading={false} />
        </div>
      </main>
    </div>
  );
}
