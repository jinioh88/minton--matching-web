"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { createReview, getMatchDetail } from "@/lib/api";
import { showApiErrorToast } from "@/lib/show-api-error-toast";
import {
  MAX_REVIEW_DETAIL_LENGTH,
  MAX_REVIEW_HASHTAGS,
  REVIEW_HASHTAG_OPTIONS,
  REVIEW_SENTIMENT_OPTIONS,
} from "@/lib/review-form-labels";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { MatchDetail } from "@/types/match";
import type { ReviewHashtagCode, ReviewSentiment } from "@/types/review";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function resolveRevieweeNickname(match: MatchDetail, userId: number): string {
  if (userId === match.hostId) return match.host.nickname;
  return (
    match.confirmedParticipants.find((p) => p.userId === userId)?.nickname ??
    `사용자 #${userId}`
  );
}

export default function MatchReviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, user } = useAuthStore();

  const matchIdParam = params?.id as string | undefined;
  const matchIdNum =
    matchIdParam && /^\d+$/.test(matchIdParam) ? Number(matchIdParam) : NaN;

  const queryReviewee = searchParams.get("revieweeId");
  const queryRevieweeNum =
    queryReviewee && /^\d+$/.test(queryReviewee) ? Number(queryReviewee) : null;

  const [revieweeId, setRevieweeId] = useState<number | "">("");
  const [sentiment, setSentiment] = useState<ReviewSentiment | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [hashtags, setHashtags] = useState<ReviewHashtagCode[]>([]);
  const [detail, setDetail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: match, isLoading, isError, error } = useQuery({
    queryKey: ["match", matchIdParam],
    queryFn: () => getMatchDetail(matchIdNum),
    enabled: hasHydrated && isAuthenticated && Number.isFinite(matchIdNum),
  });

  const pendingIds = useMemo(
    () =>
      Array.isArray(match?.reviewPendingUserIds)
        ? match.reviewPendingUserIds
        : [],
    [match]
  );
  const revieweeOptions = useMemo(() => {
    if (!match || pendingIds.length === 0) return [];
    return pendingIds.map((id) => ({
      id,
      nickname: resolveRevieweeNickname(match, id),
    }));
  }, [match, pendingIds]);

  // 초기 피평가자: URL ?revieweeId= → 단일 후보면 자동 선택
  useEffect(() => {
    if (!match || revieweeId !== "") return;
    if (
      queryRevieweeNum != null &&
      pendingIds.includes(queryRevieweeNum)
    ) {
      setRevieweeId(queryRevieweeNum);
      return;
    }
    if (pendingIds.length === 1) {
      setRevieweeId(pendingIds[0]);
    }
  }, [match, pendingIds, queryRevieweeNum, revieweeId]);

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!Number.isFinite(matchIdNum) || revieweeId === "" || !sentiment || score == null) {
        throw new Error("입력을 확인해 주세요.");
      }
      return createReview(matchIdNum, {
        revieweeId,
        sentiment,
        score,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        detail: detail.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchIdParam] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["myReviews"] });
      queryClient.invalidateQueries({ queryKey: ["myMatches"] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      router.push(`/matching/${matchIdParam}`);
    },
    onError: (err) => {
      showApiErrorToast(err, "review");
    },
  });

  const validateAndSubmit = () => {
    setLocalError(null);
    if (revieweeId === "") {
      setLocalError("후기를 남길 상대를 선택해 주세요.");
      return;
    }
    if (!pendingIds.includes(revieweeId)) {
      setLocalError("선택한 상대에게는 후기를 남길 수 없습니다.");
      return;
    }
    if (!sentiment) {
      setLocalError("전체적인 느낌을 선택해 주세요.");
      return;
    }
    if (score == null || score < 1 || score > 5) {
      setLocalError("점수는 1~5 사이로 선택해 주세요.");
      return;
    }
    if (hashtags.length > MAX_REVIEW_HASHTAGS) {
      setLocalError(`해시태그는 최대 ${MAX_REVIEW_HASHTAGS}개까지 선택할 수 있습니다.`);
      return;
    }
    if (detail.length > MAX_REVIEW_DETAIL_LENGTH) {
      setLocalError(`상세 내용은 ${MAX_REVIEW_DETAIL_LENGTH}자 이내로 입력해 주세요.`);
      return;
    }
    reviewMutation.mutate();
  };

  const toggleHashtag = (code: ReviewHashtagCode) => {
    setHashtags((prev) => {
      if (prev.includes(code)) return prev.filter((h) => h !== code);
      if (prev.length >= MAX_REVIEW_HASHTAGS) return prev;
      return [...prev, code];
    });
  };

  if (!matchIdParam || !Number.isFinite(matchIdNum)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-destructive">잘못된 매칭 주소입니다.</p>
        <Link href="/matching" className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}>
          목록으로
        </Link>
      </div>
    );
  }

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link
          href={`/matching/${matchIdParam}`}
          className="mb-6 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          매칭 상세로
        </Link>
        <h1 className="text-lg font-semibold">후기 작성</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          로그인 후 후기를 작성할 수 있습니다.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(`/matching/${matchIdParam}/review`)}`}
          className={cn(buttonVariants(), "mt-6 inline-flex no-underline")}
        >
          로그인하기
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "매칭을 불러오지 못했습니다."}
        </p>
        <Link
          href={`/matching/${matchIdParam}`}
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex no-underline")}
        >
          상세로 돌아가기
        </Link>
      </div>
    );
  }

  if (!match) return null;

  if (match.status !== "FINISHED") {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <BackLink matchId={matchIdParam} />
        <h1 className="text-lg font-semibold">후기 작성</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          종료된 모임에서만 후기를 작성할 수 있습니다.
        </p>
      </div>
    );
  }

  if (pendingIds.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <BackLink matchId={matchIdParam} />
        <h1 className="text-lg font-semibold">후기 작성</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          남기지 않은 후기가 없거나, 이 모임에서 후기를 작성할 수 없습니다.
        </p>
        <Link
          href={`/matching/${matchIdParam}`}
          className={cn(buttonVariants(), "mt-6 inline-flex no-underline")}
        >
          매칭 상세로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background px-4 pb-28 pt-6">
      <BackLink matchId={matchIdParam} />
      <h1 className="text-xl font-bold">후기 작성</h1>
      <p className="mt-1 text-sm text-muted-foreground">{match.title}</p>

      <div className="mt-8 space-y-8">
        <section>
          <label className="text-sm font-medium" htmlFor="reviewee">
            누구에게 남기시나요?
          </label>
          <select
            id="reviewee"
            className={cn(
              "mt-2 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            value={revieweeId === "" ? "" : String(revieweeId)}
            onChange={(e) => {
              const v = e.target.value;
              setRevieweeId(v === "" ? "" : Number(v));
            }}
          >
            <option value="">선택</option>
            {revieweeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nickname}
              </option>
            ))}
          </select>
        </section>

        <section>
          <p className="text-sm font-medium">전체적인 느낌</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REVIEW_SENTIMENT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={sentiment === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSentiment(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-sm font-medium">점수 (1~5)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                type="button"
                variant={score === n ? "default" : "outline"}
                size="sm"
                className="min-w-10"
                onClick={() => setScore(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-sm font-medium">
            해시태그 <span className="font-normal text-muted-foreground">(선택, 최대 {MAX_REVIEW_HASHTAGS}개)</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REVIEW_HASHTAG_OPTIONS.map((opt) => {
              const active = hashtags.includes(opt.value);
              return (
                <Button
                  key={opt.value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleHashtag(opt.value)}
                >
                  #{opt.label}
                </Button>
              );
            })}
          </div>
        </section>

        <section>
          <label className="text-sm font-medium" htmlFor="detail">
            상세 내용 <span className="font-normal text-muted-foreground">(선택)</span>
          </label>
          <textarea
            id="detail"
            rows={5}
            maxLength={MAX_REVIEW_DETAIL_LENGTH}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="함께한 경기에 대한 짧은 메모를 남겨 주세요."
            className={cn(
              "mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          />
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {detail.length} / {MAX_REVIEW_DETAIL_LENGTH}
          </p>
        </section>

        {localError && (
          <p className="text-sm text-destructive" role="alert">
            {localError}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            size="lg"
            disabled={reviewMutation.isPending}
            onClick={validateAndSubmit}
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "후기 등록"
            )}
          </Button>
          <Link
            href={`/matching/${matchIdParam}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "flex-1 justify-center no-underline"
            )}
          >
            취소
          </Link>
        </div>
      </div>
    </div>
  );
}

function BackLink({ matchId }: { matchId: string }) {
  return (
    <Link
      href={`/matching/${matchId}`}
      className="mb-6 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" />
      매칭 상세로
    </Link>
  );
}
