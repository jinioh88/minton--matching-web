/**
 * Sprint 2, 3 매칭 관련 타입
 */

export type CostPolicy = "SPLIT_EQUAL" | "HOST_PAYS" | "GUEST_PAYS";

export type MatchStatus =
  | "RECRUITING"
  | "CLOSED"
  | "FINISHED"
  | "CANCELLED";

/** 참여 상태 (Sprint 3) */
export type ParticipantStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WAITING"
  | "RESERVED"
  | "CANCELLED";

/** 내 참여 요약 (Sprint 3) */
export type MyParticipationSummary = {
  participationId: number;
  status: ParticipantStatus;
  queueOrder: number;
  applyMessage?: string;
  offerExpiresAt?: string | null; // ISO 8601, RESERVED일 때만
};

/** 참여 신청 응답 */
export type ApplyParticipationResponse = {
  participationId: number;
  status: ParticipantStatus;
  queueOrder: number;
  applyMessage?: string;
  offerExpiresAt?: string | null;
};

/** 방장 신청 목록 아이템 (Sprint 3) */
export type ApplicationItem = {
  participationId: number;
  userId: number;
  nickname: string;
  profileImg?: string;
  ratingScore?: number;
  level?: string; // A, B, C, D, BEGINNER
  interestRegions?: string[];
  status: ParticipantStatus;
  queueOrder: number;
  applyMessage?: string;
  appliedAt: string; // ISO 8601
  offerExpiresAt?: string | null;
};

/** 매칭 생성 요청 */
export type CreateMatchRequest = {
  title: string;
  description: string;
  matchDate: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  durationMin: number; // 30~240
  locationName?: string;
  regionCode: string;
  maxPeople: number; // 2~12
  targetLevels?: string; // "A,B,C"
  costPolicy: CostPolicy;
  imageUrl?: string;
};

/** 매칭 수정 요청 (PATCH partial). 포함된 필드만 변경 (Sprint3-API §7) */
export type UpdateMatchRequest = Partial<{
  title: string;
  description: string;
  matchDate: string;
  startTime: string;
  durationMin: number;
  locationName: string;
  regionCode: string;
  maxPeople: number;
  targetLevels: string;
  costPolicy: CostPolicy;
  imageUrl: string;
  latitude: number | null;
  longitude: number | null;
}>;

/** 매칭 생성 응답 */
export type CreateMatchResponse = {
  matchId: number;
  hostId: number;
  title: string;
  description: string;
  matchDate: string;
  startTime: string;
  durationMin: number;
  locationName?: string;
  regionCode: string;
  maxPeople: number;
  targetLevels?: string;
  costPolicy: CostPolicy;
  status: MatchStatus;
  imageUrl?: string;
  createdAt: string;
};

/** 목록 아이템 */
export type MatchListItem = {
  matchId: number;
  title: string;
  matchDate: string;
  startTime: string;
  durationMin?: number;
  locationName?: string;
  maxPeople: number;
  currentPeople: number;
  targetLevels?: string;
  costPolicy: CostPolicy;
  imageUrl?: string;
  hostNickname: string;
  hostProfileImg?: string;
  hostRatingScore?: number;
  hostMannerTags?: string[];
  status: MatchStatus;
  /** Sprint 3: 목록 API에 포함 시 내 참여 상태 표시용 */
  myParticipation?: MyParticipationSummary | null;
};

/** 목록 응답 */
export type MatchListResponse = {
  content: MatchListItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

/** 참여자 */
export type MatchParticipant = {
  participationId: number;
  userId: number;
  nickname: string;
  profileImg?: string;
  ratingScore?: number;
  queueOrder: number;
  applyMessage?: string;
};

/** 매칭 상세 응답 */
export type MatchDetail = {
  matchId: number;
  hostId: number;
  title: string;
  description: string;
  matchDate: string;
  startTime: string;
  durationMin: number;
  locationName?: string;
  regionCode: string;
  maxPeople: number;
  currentPeople: number;
  targetLevels?: string;
  costPolicy: CostPolicy;
  status: MatchStatus;
  imageUrl?: string;
  createdAt: string;
  host: {
    id: number;
    nickname: string;
    profileImg?: string;
    ratingScore?: number;
  };
  confirmedParticipants: MatchParticipant[];
  waitingList: MatchParticipant[];
  waitingCount: number;
  // Sprint 3: 공통 필드
  serverTime?: string; // ISO 8601, offerExpiresAt 카운트다운 시차 보정용
  isEmergencyMode?: boolean; // 경기 2시간 미만 시 true
  // Sprint 3: 로그인 사용자 전용
  myParticipation?: MyParticipationSummary | null;
  canApply?: boolean;
  canCancel?: boolean;
  hasWaitingOffer?: boolean;
};
