import type { NotificationType } from "@/types/notification";

/** Sprint6-API §12.3 — `/user/queue/notifications` 본문 */
export type NotificationRealtimePayload = {
  notificationId: number;
  recipientUserId: number;
  type: NotificationType;
  title: string;
  summary: string;
  relatedMatchId: number | null;
  relatedParticipantId: number | null;
};

/** `/user/queue/errors` 및 공통 ErrorResponse 형태 */
export type StompErrorPayload = {
  success?: boolean;
  message?: string;
  code?: string;
};
