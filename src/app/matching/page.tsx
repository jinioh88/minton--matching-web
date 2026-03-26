"use client";

import { MatchCard } from "@/components/matching/match-card";
import { Button } from "@/components/ui/button";
import { NotificationsNavLink } from "@/components/notifications/notifications-nav-link";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { getMatchList } from "@/lib/api";
import {
  parseMatchListLevelParam,
  serializeMatchListLevelParam,
} from "@/lib/match-level-query";
import { getRegionName } from "@/lib/regions";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api";
import type { Profile } from "@/types/profile";
import { useQuery } from "@tanstack/react-query";
import { Calendar, HelpCircle, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const LEVEL_OPTIONS = [
  { value: "", label: "전체" },
  { value: "BEGINNER", label: "초심" },
  { value: "D", label: "D급" },
  { value: "C", label: "C급" },
  { value: "B", label: "B급" },
  { value: "A", label: "A급" },
];

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function MatchingListPage() {
  return (
    <Suspense fallback={<MatchingListSkeleton />}>
      <MatchingListContent />
    </Suspense>
  );
}

function MatchingListSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 rounded border bg-muted" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded bg-muted" />
            <div className="h-8 w-8 rounded bg-muted" />
          </div>
        </div>
      </header>
      <main className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    </div>
  );
}

function MatchingListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, accessToken } = useAuthStore();

  const [regionCode, setRegionCode] = useState(
    () => searchParams.get("regionCode") ?? ""
  );
  const [dateMode, setDateMode] = useState<"all" | "today" | "range">(() => {
    const from = searchParams.get("dateFrom");
    const to = searchParams.get("dateTo");
    const today = getTodayStr();
    if (from && to) return "range";
    if (from === today && to === today) return "today";
    if (searchParams.get("date") === today) return "today";
    return "all";
  });
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(() => {
    const from = searchParams.get("dateFrom");
    const to = searchParams.get("dateTo");
    if (from && to) return [new Date(from), new Date(to)];
    return [null, null];
  });
  const [selectedLevels, setSelectedLevels] = useState(() =>
    parseMatchListLevelParam(searchParams.get("level"))
  );
  const [recruitingOnly, setRecruitingOnly] = useState(
    () => searchParams.get("recruitingOnly") === "true"
  );
  const [showLevelFilter, setShowLevelFilter] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const levelFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLevelFilter) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (levelFilterRef.current && !levelFilterRef.current.contains(e.target as Node)) {
        setShowLevelFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLevelFilter]);

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const res = await apiClient.get("/users/me");
      return res.data.data as Profile;
    },
    enabled: hasHydrated && !!accessToken && isAuthenticated,
  });

  const interestLoc1 = profile?.interestLoc1;
  const interestLoc2 = profile?.interestLoc2;

  const regionButtonOptions = [
    ...(interestLoc1 ? [{ code: interestLoc1, name: getRegionName(interestLoc1) }] : []),
    ...(interestLoc2 ? [{ code: interestLoc2, name: getRegionName(interestLoc2) }] : []),
  ].filter((r) => r.name);

  const getDateParams = () => {
    if (dateMode === "today") {
      const today = getTodayStr();
      return { dateFrom: today, dateTo: today };
    }
    if (dateMode === "range" && dateRange[0] && dateRange[1]) {
      return {
        dateFrom: dateRange[0].toISOString().slice(0, 10),
        dateTo: dateRange[1].toISOString().slice(0, 10),
      };
    }
    return {};
  };

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "matches",
      regionCode,
      dateMode,
      dateRange,
      serializeMatchListLevelParam(selectedLevels),
      recruitingOnly,
      page,
    ],
    queryFn: () => {
      const dateParams = getDateParams();
      const levelParam = serializeMatchListLevelParam(selectedLevels);
      return getMatchList({
        regionCode: regionCode || undefined,
        dateFrom: dateParams.dateFrom,
        dateTo: dateParams.dateTo,
        level: levelParam || undefined,
        page,
        size: PAGE_SIZE,
      });
    },
    enabled: hasHydrated,
  });

  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      params.delete("page");
      router.replace(`/matching?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const regionButtons =
    regionButtonOptions.length >= 2
      ? regionButtonOptions
      : regionButtonOptions.length === 1
        ? [{ code: "", name: "전체" }, ...regionButtonOptions]
        : [{ code: "", name: "전체" }];

  const handleRegionChange = (code: string) => {
    const newCode = regionCode === code ? "" : code;
    setRegionCode(newCode);
    setPage(0);
    updateUrl({ regionCode: newCode });
  };

  const handleDateModeChange = (mode: "all" | "today" | "range") => {
    setDateMode(mode);
    setPage(0);
    setShowDatePicker(false);
    if (mode === "all") {
      updateUrl({ dateFrom: "", dateTo: "" });
    } else if (mode === "today") {
      const today = getTodayStr();
      updateUrl({ dateFrom: today, dateTo: today });
    } else {
      setShowDatePicker(true);
    }
  };

  const handleDateRangeChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
    setPage(0);
    if (update[0] && update[1]) {
      setDateMode("range");
      const from = update[0].toISOString().slice(0, 10);
      const to = update[1].toISOString().slice(0, 10);
      updateUrl({ dateFrom: from, dateTo: to });
      setShowDatePicker(false);
    }
  };

  const handleLevelToggle = (optValue: string) => {
    setPage(0);
    if (optValue === "") {
      setSelectedLevels([]);
      updateUrl({ level: "" });
      setShowLevelFilter(false);
      return;
    }
    const next = selectedLevels.includes(optValue)
      ? selectedLevels.filter((x) => x !== optValue)
      : [...selectedLevels, optValue];
    setSelectedLevels(next);
    updateUrl({ level: serializeMatchListLevelParam(next) });
  };

  const handleRecruitingOnlyChange = () => {
    const next = !recruitingOnly;
    setRecruitingOnly(next);
    setPage(0);
    updateUrl({ recruitingOnly: next ? "true" : "" });
  };

  let content = data?.content ?? [];
  if (recruitingOnly) {
    content = content.filter((m) => m.status === "RECRUITING" && m.currentPeople < m.maxPeople);
  }
  const totalPages = data?.totalPages ?? 0;
  const hasMore = page < totalPages - 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 헤더: 지역 버튼, 알림, 설정 */}
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {regionButtons.map((opt) => (
              <button
                key={opt.code || "all"}
                type="button"
                onClick={() => handleRegionChange(opt.code)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  regionCode === opt.code
                    ? "bg-primary text-primary-foreground"
                    : "border border-input bg-background hover:bg-muted/50"
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <NotificationsNavLink />
            <Link
              href="/profile/me"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
              aria-label="설정"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* 날짜: 전체(기본), 오늘, 달력 범위 */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDateModeChange("all")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              dateMode === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-background hover:bg-muted"
            }`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => handleDateModeChange("today")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              dateMode === "today"
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-background hover:bg-muted"
            }`}
          >
            오늘
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                dateMode === "range"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background hover:bg-muted"
              }`}
            >
              <Calendar className="h-4 w-4" />
            </button>
            {showDatePicker && (
              <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border bg-popover p-2 shadow-lg">
                <DatePicker
                  selectsRange
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  onChange={handleDateRangeChange}
                  inline
                  monthsShown={2}
                  minDate={new Date()}
                />
              </div>
            )}
          </div>
        </div>

        {/* 필터 칩 */}
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative" ref={levelFilterRef}>
            <button
              type="button"
              onClick={() => setShowLevelFilter(!showLevelFilter)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted"
            >
              급수 선택
              {selectedLevels.length > 0 && (
                <span className="ml-1 text-primary">
                  (
                  {selectedLevels
                    .map(
                      (v) =>
                        LEVEL_OPTIONS.find((o) => o.value === v)?.label ?? v
                    )
                    .join(", ")}
                  )
                </span>
              )}
            </button>
            {showLevelFilter && (
              <div className="absolute left-0 top-full z-10 mt-1 max-w-[min(100vw-2rem,280px)] rounded-lg border bg-popover p-2 shadow-md">
                <div className="flex flex-wrap gap-1">
                  {LEVEL_OPTIONS.map((opt) => {
                    const selected =
                      opt.value !== "" && selectedLevels.includes(opt.value);
                    return (
                      <button
                        key={opt.value || "all"}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLevelToggle(opt.value);
                        }}
                        className={`rounded px-2 py-1 text-xs ${
                          opt.value === "" && selectedLevels.length === 0
                            ? "bg-primary text-primary-foreground"
                            : selected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleRecruitingOnlyChange}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              recruitingOnly
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-muted"
            }`}
          >
            모집 중만 보기
          </button>
        </div>
      </header>

      <main
        className="mx-auto max-w-lg px-4 py-4"
        onClick={() => {
          setShowLevelFilter(false);
          setShowDatePicker(false);
        }}
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-destructive">
            목록을 불러오는데 실패했습니다.
          </div>
        ) : content.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">
              해당 조건의 매칭이 없습니다.
              <br />
              새로운 매칭을 만들어보세요!
            </p>
            <Link href="/matching/create">
              <Button>매칭 만들기</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {content.map((match) => (
              <MatchCard key={match.matchId} match={match} />
            ))}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                >
                  더 보기
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB: 매칭 만들기 + 도움말 */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-3">
        <Link
          href="/matching/create"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          aria-label="매칭 만들기"
        >
          <Plus className="h-6 w-6" />
        </Link>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-800"
          aria-label="도움말"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
