/**
 * Sprint 3: 참여 관련 공통 상수 및 유틸
 */

import type { ParticipantStatus } from "@/types/match";

/** ParticipantStatus → 사용자 라벨 */
export const PARTICIPATION_STATUS_LABELS: Record<
  ParticipantStatus,
  string
> = {
  PENDING: "수락 대기 중",
  ACCEPTED: "참여 확정",
  REJECTED: "거절됨",
  WAITING: "대기열",
  RESERVED: "참여 기회가 왔어요!",
  CANCELLED: "취소됨",
};

/** ParticipantStatus → 짧은 라벨 (카드/배지용) */
export const PARTICIPATION_STATUS_SHORT_LABELS: Record<
  ParticipantStatus,
  string
> = {
  PENDING: "수락 대기",
  ACCEPTED: "참여 확정",
  REJECTED: "거절됨",
  WAITING: "대기열",
  RESERVED: "참여 기회",
  CANCELLED: "취소됨",
};
