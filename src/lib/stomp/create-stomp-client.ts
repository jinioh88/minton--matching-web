import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getChatSockJsUrl } from "@/lib/ws-url";

/**
 * STOMP CONNECT 헤더에 Bearer JWT (쿼리스트링 금지 — Sprint6-API §5)
 */
export function createStompClient(accessToken: string): Client {
  const url = getChatSockJsUrl();
  return new Client({
    webSocketFactory: () => new SockJS(url) as unknown as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug:
      process.env.NODE_ENV === "development"
        ? (m) => console.debug("[STOMP]", m)
        : () => undefined,
  });
}
