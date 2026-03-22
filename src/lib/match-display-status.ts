import type { MatchStatus } from "@/types/match";

/** 목록·상세 동일 규칙: `MatchCard`와 배지 스타일 공유 */
export type MatchDisplayStatusInput = {
  status: MatchStatus;
  currentPeople: number;
  maxPeople: number;
};

export function getMatchDisplayStatus(
  match: MatchDisplayStatusInput
): { label: string; className: string } {
  if (match.status === "CANCELLED") {
    return {
      label: "모집취소",
      className: "bg-destructive/90 text-destructive-foreground",
    };
  }
  if (match.status === "FINISHED") {
    return {
      label: "종료",
      className: "bg-muted text-muted-foreground",
    };
  }

  const isFull = match.currentPeople >= match.maxPeople;
  const isNearlyFull =
    match.currentPeople >= match.maxPeople - 1 && !isFull;

  if (match.status === "CLOSED" || isFull) {
    return { label: "대기신청", className: "bg-gray-700 text-white" };
  }
  if (match.status === "RECRUITING" && isNearlyFull) {
    return { label: "마감임박", className: "bg-orange-500 text-white" };
  }
  if (match.status === "RECRUITING") {
    return { label: "모집중", className: "bg-green-500 text-white" };
  }
  return { label: "모집중", className: "bg-green-500 text-white" };
}
