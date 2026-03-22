import type { PageResponse } from "@/types/page";
import type { ReviewMatchSummary } from "@/types/review";

export type PenaltyType = "NO_SHOW" | "LATE";

export type CreatePenaltyRequest = {
  userId: number;
  type: PenaltyType;
};

export type PenaltyHistoryItem = {
  penaltyId: number;
  type: PenaltyType;
  match: ReviewMatchSummary;
  createdAt: string;
  hostNickname: string;
};

export type PenaltyHistoryPage = PageResponse<PenaltyHistoryItem>;
