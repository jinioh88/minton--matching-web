/**
 * Sprint 2 매칭 관련 타입
 */

export type CostPolicy = "SPLIT_EQUAL" | "HOST_PAYS" | "GUEST_PAYS";

export type MatchStatus =
  | "RECRUITING"
  | "CLOSED"
  | "FINISHED"
  | "CANCELLED";

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
};
