import { redirect } from "next/navigation";

/** Phase1 STOMP 테스트는 `/dev/stomp`에 구현됨 — 흔한 오타 경로에서 리다이렉트 */
export default function MatchingDevStompRedirectPage() {
  redirect("/dev/stomp");
}
