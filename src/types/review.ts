import type { PageResponse } from "@/types/page";

export type ReviewSentiment = "NEGATIVE" | "NEUTRAL" | "POSITIVE";

export type ReviewHashtagCode =
  | "PASSION"
  | "MANNER"
  | "KINDNESS"
  | "EXPERT"
  | "PUNCTUAL"
  | "TEAM_PLAY";

export type CreateReviewRequest = {
  revieweeId: number;
  sentiment: ReviewSentiment;
  score: number;
  hashtags?: ReviewHashtagCode[];
  detail?: string;
};

export type CreateReviewResponse = {
  reviewId: number;
  matchId: number;
  revieweeId: number;
  sentiment: ReviewSentiment;
  score: number;
  hashtags?: ReviewHashtagCode[];
  detail?: string;
  createdAt: string;
};

export type ReviewMatchSummary = {
  matchId: number;
  title: string;
  matchDate: string;
  startTime: string;
};

/** 받은 후기 목록 행 (`GET /users/{id}/reviews`) */
export type ReceivedReviewItem = {
  reviewId: number;
  match: ReviewMatchSummary;
  createdAt: string;
  contentRevealed: boolean;
  reviewSubmitted?: boolean;
  /** `contentRevealed === true` 일 때 등 */
  reviewer?: { id: number; nickname?: string } | null;
  sentiment?: ReviewSentiment | null;
  score?: number | null;
  hashtags?: ReviewHashtagCode[] | null;
  detail?: string | null;
};

export type ReceivedReviewsPage = PageResponse<ReceivedReviewItem>;

/** Sprint 7 — `ReviewerPublicSummaryResponse` */
export type ReviewerPublicSummary = {
  userId: number;
  nickname: string;
  profileImg?: string;
};

/** Sprint 7 — `GET /users/me/reviews/written` 행 */
export type WrittenReviewListItem = {
  reviewId: number;
  match: ReviewMatchSummary;
  reviewee: ReviewerPublicSummary;
  sentiment: ReviewSentiment;
  score: number;
  hashtags: string[];
  detail: string | null;
  createdAt: string;
};

/** Sprint 7 — `GET /users/me/reviews/pending` 행 */
export type PendingReviewItem = {
  matchId: number;
  match: ReviewMatchSummary;
  revieweeId: number;
  reviewee: ReviewerPublicSummary;
};
