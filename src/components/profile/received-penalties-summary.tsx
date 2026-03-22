"use client";

import { getUserPenalties } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

type ReceivedPenaltiesSummaryProps = {
  userId: number;
  /** 프로필 `penaltyCount`가 있으면 추가 요청 없이 표시 (문서: 목록 totalElements와 정합) */
  penaltyCount?: number | null;
  /** 전체 목록 페이지 경로 */
  listHref: string;
  /** 카드 왼쪽 문구 */
  rowLabel?: string;
};

export function ReceivedPenaltiesSummary({
  userId,
  penaltyCount,
  listHref,
  rowLabel = "내 패널티 이력",
}: ReceivedPenaltiesSummaryProps) {
  const fromProfile = penaltyCount != null;
  const { data: totalFromApi, isLoading } = useQuery({
    queryKey: ["userPenaltiesTotal", userId],
    queryFn: async () => {
      const page = await getUserPenalties(userId, { page: 0, size: 1 });
      return page.totalElements;
    },
    enabled: !fromProfile && userId > 0,
  });

  const count = fromProfile ? penaltyCount! : totalFromApi;
  const countLoading = !fromProfile && isLoading;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
        패널티 이력
      </h2>
      <Link
        href={listHref}
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-4 no-underline",
          "transition-colors hover:bg-muted/50"
        )}
      >
        <span className="font-medium text-foreground">{rowLabel}</span>
        <span className="flex min-w-0 items-center gap-2 text-sm">
          {countLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <span className="shrink-0 text-muted-foreground">
              총 {typeof count === "number" ? count : "—"}건
            </span>
          )}
          <span className="shrink-0 font-medium text-foreground">더보기</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </span>
      </Link>
    </section>
  );
}
