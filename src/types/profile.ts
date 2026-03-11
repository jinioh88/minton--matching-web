/**
 * GET /api/users/me 응답 타입
 */
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
};
