/**
 * Sprint 5 알림 API 타입 (`common-docs/api/Sprint5-API.md`)
 */

export type NotificationType =
  | "MATCH_APPLICATION"
  | "PARTICIPATION_ACCEPTED"
  | "PARTICIPATION_REJECTED"
  | "WAITLIST_SLOT_OFFER"
  | "WAITLIST_EMERGENCY_OPEN"
  | "MATCH_CANCELLED"
  | "FRIEND_CREATED_MATCH"
  | "FRIEND_CONFIRMED_PARTICIPATION";

export type NotificationResponse = {
  notificationId: number;
  type: NotificationType;
  title: string;
  body: string | null;
  payload: string | null;
  relatedMatchId: number | null;
  relatedParticipantId: number | null;
  readAt: string | null;
  createdAt: string;
};
