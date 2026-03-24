import type { MatchStatus } from "@/types/match";

/** 채팅 공지 배지 — `MatchDetail` 카드와 구분되는 간단한 상태만 표시 */
export function getChatNoticeStatusBadge(status: MatchStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "CANCELLED":
      return {
        label: "취소됨",
        className: "bg-destructive/90 text-destructive-foreground",
      };
    case "FINISHED":
      return {
        label: "종료",
        className: "bg-muted text-muted-foreground",
      };
    case "CLOSED":
      return {
        label: "모집 마감",
        className: "bg-gray-700 text-white",
      };
    case "RECRUITING":
    default:
      return {
        label: "모집 중",
        className: "bg-green-600 text-white",
      };
  }
}
