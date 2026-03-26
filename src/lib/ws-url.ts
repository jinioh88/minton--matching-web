/**
 * Sprint6-API: REST와 동일 호스트, 채팅 STOMP(SockJS) 경로 `/ws-chat`
 * SockJS는 브라우저에서 http(s) URL로 핸드셰이크합니다.
 */
export function getChatSockJsUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CHAT_SOCKJS_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
  try {
    const url = new URL(apiBase);
    return `${url.origin}/ws-chat`;
  } catch {
    return "http://localhost:8080/ws-chat";
  }
}
