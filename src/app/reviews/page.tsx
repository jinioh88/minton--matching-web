"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getMyPendingReviews, getMyWrittenReviews } from "@/lib/api";
import {
  hashtagLabel,
  sentimentLabel,
} from "@/lib/review-form-labels";
import type {
  PendingReviewItem,
  ReviewHashtagCode,
  WrittenReviewListItem,
} from "@/types/review";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PAGE_SIZE = 20;

type Tab = "written" | "pending";

function WrittenReviewCard({ item }: { item: WrittenReviewListItem }) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{item.match.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.match.matchDate} {item.match.startTime}
          </p>
        </div>
        <Link
          href={`/matching/${item.match.matchId}`}
          className="shrink-0 text-xs text-primary underline"
        >
          매칭 보기
        </Link>
      </div>
      <div className="flex items-center gap-3 border-t pt-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          {item.reviewee.profileImg ? (
            <img
              src={item.reviewee.profileImg}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {item.reviewee.nickname.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{item.reviewee.nickname}</p>
          <p className="text-xs text-muted-foreground">
            {sentimentLabel(item.sentiment)} · {item.score}점
          </p>
        </div>
      </div>
      {item.hashtags.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {item.hashtags
            .map((h) => hashtagLabel(h as ReviewHashtagCode))
            .join(" · ")}
        </p>
      ) : null}
      {item.detail ? (
        <p className="mt-2 line-clamp-3 text-sm text-foreground">{item.detail}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(item.createdAt).toLocaleString("ko-KR")}
      </p>
    </article>
  );
}

function PendingReviewCard({ item }: { item: PendingReviewItem }) {
  const href = `/matching/${item.matchId}/review?revieweeId=${item.revieweeId}`;
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="mb-3">
        <p className="font-medium text-foreground">{item.match.title}</p>
        <p className="text-xs text-muted-foreground">
          {item.match.matchDate} {item.match.startTime}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          {item.reviewee.profileImg ? (
            <img
              src={item.reviewee.profileImg}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {item.reviewee.nickname.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{item.reviewee.nickname}</p>
          <p className="text-xs text-muted-foreground">후기 미작성</p>
        </div>
      </div>
      <Link
        href={href}
        className={cn(
          buttonVariants({ size: "sm" }),
          "mt-4 inline-flex w-full justify-center no-underline"
        )}
      >
        후기 작성
      </Link>
    </article>
  );
}

export default function ReviewsHubPage() {
  const { ready, isAuthenticated, shouldRedirect } = useRequireAuth("/login");
  const [tab, setTab] = useState<Tab>("written");
  const [page, setPage] = useState(0);

  const writtenQuery = useQuery({
    queryKey: ["myReviews", "written", page],
    queryFn: () => getMyWrittenReviews({ page, size: PAGE_SIZE }),
    enabled: ready && isAuthenticated && tab === "written",
  });

  const pendingQuery = useQuery({
    queryKey: ["myReviews", "pending", page],
    queryFn: () => getMyPendingReviews({ page, size: PAGE_SIZE }),
    enabled: ready && isAuthenticated && tab === "pending",
  });

  const active = tab === "written" ? writtenQuery : pendingQuery;
  const data = active.data;

  if (!ready || shouldRedirect || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/profile/me"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">마이페이지</span>
          </Link>
        </div>
        <h1 className="mx-auto max-w-lg px-4 pt-2 text-lg font-semibold">
          후기 관리
        </h1>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <Link
          href="/profile/me/reviews"
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
        >
          <span>받은 후기 보기</span>
          <span className="text-muted-foreground">→</span>
        </Link>

        <div className="flex rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => {
              setTab("written");
              setPage(0);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "written"
                ? "bg-background shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            작성한 후기
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("pending");
              setPage(0);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "pending"
                ? "bg-background shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            작성 대기
          </button>
        </div>

        {active.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : active.isError ? (
          <p className="text-center text-sm text-destructive">
            목록을 불러오지 못했습니다.
          </p>
        ) : !data?.items.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tab === "written"
              ? "작성한 후기가 없습니다."
              : "작성 대기 중인 후기가 없습니다."}
          </p>
        ) : (
          <ul className="space-y-4">
            {tab === "written"
              ? (data.items as WrittenReviewListItem[]).map((item) => (
                  <li key={item.reviewId}>
                    <WrittenReviewCard item={item} />
                  </li>
                ))
              : (data.items as PendingReviewItem[]).map((item) => (
                  <li key={`${item.matchId}-${item.revieweeId}`}>
                    <PendingReviewCard item={item} />
                  </li>
                ))}
          </ul>
        )}

        {data && data.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 0 || active.isLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {data.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={active.isLoading || page >= data.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
