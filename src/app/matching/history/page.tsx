"use client";

import { MatchCard } from "@/components/matching/match-card";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  getMyHostedMatches,
  getMyParticipatedMatches,
} from "@/lib/api";
import type { MatchStatus } from "@/types/match";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const STATUS_OPTIONS: { value: "" | MatchStatus; label: string }[] = [
  { value: "", label: "전체" },
  { value: "RECRUITING", label: "모집중" },
  { value: "CLOSED", label: "모집마감" },
  { value: "FINISHED", label: "종료" },
  { value: "CANCELLED", label: "취소" },
];

const PAGE_SIZE = 20;

type Tab = "hosted" | "participated";

export default function MatchingHistoryPage() {
  const { ready, isAuthenticated, shouldRedirect } = useRequireAuth("/login");
  const [tab, setTab] = useState<Tab>("hosted");
  const [status, setStatus] = useState<"" | MatchStatus>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const queryParams = useMemo(
    () => ({
      status: status || undefined,
      dateFrom: dateFrom.trim() || undefined,
      dateTo: dateTo.trim() || undefined,
      page,
      size: PAGE_SIZE,
    }),
    [status, dateFrom, dateTo, page]
  );

  const hostedQuery = useQuery({
    queryKey: ["myMatches", "hosted", queryParams],
    queryFn: () => getMyHostedMatches(queryParams),
    enabled: ready && isAuthenticated && tab === "hosted",
  });

  const participatedQuery = useQuery({
    queryKey: ["myMatches", "participated", queryParams],
    queryFn: () => getMyParticipatedMatches(queryParams),
    enabled: ready && isAuthenticated && tab === "participated",
  });

  const active = tab === "hosted" ? hostedQuery : participatedQuery;
  const list = active.data;

  const applyFilters = () => {
    setPage(0);
  };

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
          매칭 내역
        </h1>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <div className="flex rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => {
              setTab("hosted");
              setPage(0);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "hosted"
                ? "bg-background shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            개설
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("participated");
              setPage(0);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "participated"
                ? "bg-background shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            참여
          </button>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              상태
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "" | MatchStatus)
              }
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                경기일 시작
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                경기일 끝
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-2 text-sm"
              />
            </div>
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={applyFilters}>
            필터 적용
          </Button>
        </div>

        {active.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : active.isError ? (
          <p className="text-center text-sm text-destructive">
            목록을 불러오지 못했습니다.
          </p>
        ) : !list?.content.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            표시할 매칭이 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.content.map((m) => (
              <li key={m.matchId}>
                <MatchCard match={m} />
              </li>
            ))}
          </ul>
        )}

        {list && list.totalPages > 1 ? (
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
              {page + 1} / {list.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                active.isLoading || page >= list.totalPages - 1
              }
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
