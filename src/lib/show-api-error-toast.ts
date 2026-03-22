import { toast } from "sonner";

import {
  getParticipationErrorMessage,
  type ApiErrorMessageContext,
} from "@/lib/api";

/** API 실패 시 Sprint 4 에러 코드 등을 사용자 문구로 토스트 표시 */
export function showApiErrorToast(
  err: unknown,
  context: ApiErrorMessageContext = "general"
) {
  toast.error(getParticipationErrorMessage(err, context));
}
