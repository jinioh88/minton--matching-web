"use client";

import { Button } from "@/components/ui/button";
import { getUserPenalties, getParticipationErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PenaltyHistoryItem } from "@/types/penalty";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const PAGE_SIZE = 20;

const PENALTY_TYPE_LABEL: Record<PenaltyHistoryItem["type"], string> = {
  NO_SHOW: "노쇼",
  LATE: "지각",
};

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function PenaltyCard({ item }: { item: PenaltyHistoryItem }) {
  const timeShort = item.match.startTime?.slice(0, 5) ?? item.match.startTime;
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/matching/${item.match.matchId}`}
            className="font-medium text-foreground hover:underline"
          >
            {item.match.title}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            {item.match.matchDate} {timeShort}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
            item.type === "NO_SHOW"
              ? "bg-destructive/15 text-destructive"
              : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
          )}
        >
          {PENALTY_TYPE_LABEL[item.type]}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        부여: {item.hostNickname} · {formatWhen(item.createdAt)}
      </p>
    </article>
  );
}

type ReceivedPenaltiesSectionProps = {
  userId: number;
  embedHeading?: boolean;
};

export function ReceivedPenaltiesSection({
  userId,
  embedHeading = true,
}: ReceivedPenaltiesSectionProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["userPenalties", userId],
    queryFn: ({ pageParam }) =>
      getUserPenalties(userId, { page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
    enabled: Number.isFinite(userId) && userId > 0,
  });

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data?.pages]
  );

  const totalElements = data?.pages[0]?.totalElements;

  if (isLoading) {
    return (
      <section className="space-y-3">
        {embedHeading && (
          <h2 className="text-sm font-semibold text-muted-foreground">
            패널티 이력
          </h2>
        )}
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-3">
        {embedHeading && (
          <h2 className="text-sm font-semibold text-muted-foreground">
            패널티 이력
          </h2>
        )}
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {getParticipationErrorMessage(error)}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {embedHeading ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            패널티 이력
          </h2>
          {totalElements != null && (
            <span className="text-xs text-muted-foreground">
              총 {totalElements}건
            </span>
          )}
        </div>
      ) : (
        totalElements != null && (
          <p className="text-sm text-muted-foreground">총 {totalElements}건</p>
        )
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          패널티 이력이 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.penaltyId}>
              <PenaltyCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && items.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "더 보기"
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
