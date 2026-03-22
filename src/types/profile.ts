/**
 * GET /api/users/me , GET /api/users/{userId} 응답 타입
 * Sprint 4: participationBannedUntil·suspendedUntil·accountStatus 는 `/me` 에만 포함 (타인 프로필 미포함)
 */
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export type Profile = {
  id: number;
  nickname: string;
  profileImg?: string;
  level?: string;
  interestLoc1?: string;
  interestLoc2?: string;
  racketInfo?: string;
  playStyle?: string;
  ratingScore?: number;
  penaltyCount?: number;
  /** 가입일 (ISO 문자열 또는 LocalDateTime 직렬화) */
  joinedAt?: string;
  /** createdAt - joinedAt 대체 (백엔드 DTO에 따라 사용) */
  createdAt?: string;
  /** Sprint 4 — 본인(`/me`)만 */
  participationBannedUntil?: string | null;
  suspendedUntil?: string | null;
  accountStatus?: AccountStatus;
  /** Sprint 4 — 본인·타인 */
  showCautionBadge?: boolean;
  receivedReviewCount?: number;
};
