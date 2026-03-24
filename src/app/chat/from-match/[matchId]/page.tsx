"use client";

import { buttonVariants } from "@/components/ui/button";
import { getChatApiErrorMessage, getMatchChat } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ChatFromMatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchIdParam = params.matchId as string;
  const matchId = Number(matchIdParam);
  const valid = /^\d+$/.test(matchIdParam) && Number.isFinite(matchId);

  const { data, isSuccess, isError, error, isPending } = useQuery({
    queryKey: ["chat", "from-match", matchId],
    queryFn: () => getMatchChat(matchId),
    enabled: valid,
    retry: false,
  });

  useEffect(() => {
    if (isSuccess && data?.roomId != null) {
      router.replace(`/chat/${data.roomId}`);
    }
  }, [isSuccess, data, router]);

  if (!valid) {
    return (
      <div className="min-h-screen bg-background px-4 py-12 text-center">
        <p className="text-destructive">잘못된 매칭 주소입니다.</p>
        <Link
          href="/matching"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 inline-flex no-underline"
          )}
        >
          매칭 목록
        </Link>
      </div>
    );
  }

  if (isPending || (isSuccess && data)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">채팅방으로 이동하는 중…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background px-4 py-12 text-center">
        <p className="text-destructive">{getChatApiErrorMessage(error)}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`/matching/${matchId}`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "no-underline"
            )}
          >
            매칭 상세로
          </Link>
          <Link
            href="/chat"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "no-underline"
            )}
          >
            채팅 목록
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Link
        href="/chat"
        className={cn(buttonVariants({ variant: "outline" }), "no-underline")}
      >
        채팅 목록
      </Link>
    </div>
  );
}
