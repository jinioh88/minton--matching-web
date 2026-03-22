"use client";

import { ReceivedPenaltiesSection } from "@/components/profile/received-penalties-section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function UserPenaltiesPage() {
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const valid = !!userId && /^\d+$/.test(userId);
  const idNum = valid ? Number(userId) : 0;

  if (!valid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-destructive">잘못된 주소입니다.</p>
        <Link
          href="/"
          className={cn(buttonVariants(), "mt-4 inline-flex no-underline")}
        >
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href={`/profile/${userId}`}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">프로필</span>
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-lg font-bold">패널티 이력</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          모임 종료 후 방장이 부여한 노쇼·지각 기록입니다.
        </p>
        <div className="mt-6">
          <ReceivedPenaltiesSection userId={idNum} embedHeading={false} />
        </div>
      </main>
    </div>
  );
}
