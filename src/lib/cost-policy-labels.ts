import type { CostPolicy } from "@/types/match";

/** 코트비 분담 — 화면 표시용 (매칭 상세·채팅 공지 공통) */
export const COST_POLICY_LABELS: Record<CostPolicy, string> = {
  SPLIT_EQUAL: "1/N 정산",
  HOST_PAYS: "방장 부담",
  GUEST_PAYS: "참가자 부담",
};
