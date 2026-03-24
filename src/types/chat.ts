/**
 * Sprint 5 채팅 API 타입 (`common-docs/api/Sprint5-API.md`)
 */
import type { CostPolicy, MatchStatus } from "@/types/match";

export type ChatRoomListItemResponse = {
  matchId: number;
  roomId: number;
  matchTitle: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
};

/** 채팅 상단 공지 (매칭 요약) */
export type MatchChatNoticeResponse = {
  matchId: number;
  title: string;
  matchDate: string;
  startTime: string;
  durationMin: number | null;
  locationName: string | null;
  costPolicy: CostPolicy;
  status: MatchStatus;
};

export type ChatMessageType = "TEXT" | "IMAGE" | "SYSTEM";

export type ChatMessageResponse = {
  messageId: number;
  roomId: number;
  senderId: number;
  senderNickname: string | null;
  content: string | null;
  messageType: ChatMessageType;
  createdAt: string;
  editedAt: string | null;
};

export type ChatRoomDetailResponse = {
  roomId: number;
  matchId: number;
  matchNotice: MatchChatNoticeResponse;
  lastMessage: ChatMessageResponse | null;
};

export type ChatMessagePageResponse = {
  messages: ChatMessageResponse[];
  nextCursor: number | null;
};

export type ChatMessageSendRequest = {
  content: string;
  messageType?: ChatMessageType;
};

export type ChatMessagePatchRequest = {
  content: string;
};
