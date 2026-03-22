"use client";

import { Button } from "@/components/ui/button";
import { getUserReviews, getParticipationErrorMessage } from "@/lib/api";
import {
  hashtagLabel,
  sentimentLabel,
} from "@/lib/review-form-labels";
import { cn } from "@/lib/utils";
import type { ReceivedReviewItem } from "@/types/review";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Calendar, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const PAGE_SIZE = 20;

function formatReviewDate(iso: string) {
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

function formatMatchWhen(item: ReceivedReviewItem) {
  const { matchDate, startTime, title } = item.match;
  const timeShort = startTime?.slice(0, 5) ?? startTime;
  return { line: `${title}`, sub: `${matchDate} ${timeShort}` };
}

function ReviewCard({ item }: { item: ReceivedReviewItem }) {
  const { line, sub } = formatMatchWhen(item);
  const revealed = item.contentRevealed === true;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4",
        !revealed && "border-dashed bg-muted/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/matching/${item.match.matchId}`}
            className="font-medium text-foreground hover:underline"
          >
            {line}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            {sub}
          </p>
        </div>
        {!revealed && (
          <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Lock className="h-3 w-3" />
            비공개
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        후기 작성일 {formatReviewDate(item.createdAt)}
      </p>

      {revealed ? (
        <div className="mt-3 space-y-2 text-sm">
          {item.reviewer?.nickname && (
            <p className="text-muted-foreground">
              작성자 <span className="font-medium text-foreground">{item.reviewer.nickname}</span>
            </p>
          )}
          {item.sentiment != null && (
            <p>
              <span className="text-muted-foreground">느낌</span>{" "}
              <span className="font-medium">{sentimentLabel(item.sentiment)}</span>
            </p>
          )}
          {item.score != null && (
            <p>
              <span className="text-muted-foreground">점수</span>{" "}
              <span className="font-medium">{item.score} / 5</span>
            </p>
          )}
          {item.hashtags && item.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.hashtags.map((h) => (
                <span
                  key={h}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  #{hashtagLabel(h)}
                </span>
              ))}
            </div>
          )}
          {item.detail?.trim() && (
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
              {item.detail}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          비로그인이거나 공개 조건(유예 기간·양방향 후기 등)을 충족하지 않아 내용이
          숨겨져 있어요. 조건이 맞으면 자동으로 공개됩니다.
        </p>
      )}
    </article>
  );
}

type ReceivedReviewsSectionProps = {
  userId: number;
  /**
   * `false`: 전용 목록 페이지 등에서 상단 제목과 겹치지 않도록 소제목·헤더 줄을 생략합니다.
   * @default true
   */
  embedHeading?: boolean;
};

export function ReceivedReviewsSection({
  userId,
  embedHeading = true,
}: ReceivedReviewsSectionProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["userReviews", userId],
    queryFn: ({ pageParam }) =>
      getUserReviews(userId, { page: pageParam, size: PAGE_SIZE }),
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
            받은 후기
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
            받은 후기
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
            받은 후기
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
          아직 받은 후기가 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.reviewId}>
              <ReviewCard item={item} />
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
