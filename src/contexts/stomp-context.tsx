"use client";

import { createStompClient } from "@/lib/stomp/create-stomp-client";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { useAuthStore } from "@/stores/authStore";
import type {
  NotificationRealtimePayload,
  StompErrorPayload,
} from "@/types/stomp";
import type { Client, IMessage } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

export type StompConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type StompContextValue = {
  status: StompConnectionStatus;
  isConnected: boolean;
  /** CONNECT 완료 후 topic 구독·publish에 사용 */
  client: Client | null;
  /** 토큰 갱신·재연결마다 증가 — 구독 effect 의존용 */
  connectionGeneration: number;
  /** 전송 큐에 넣었으면 true, 연결 없으면 false (토스트는 호출 측에서 처리) */
  publishChatMessage: (payload: {
    roomId: number;
    content: string;
    messageType?: "TEXT" | "IMAGE";
  }) => boolean;
};

const StompContext = createContext<StompContextValue | null>(null);

export function StompProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const hasHydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [status, setStatus] = useState<StompConnectionStatus>("idle");
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [connectionGeneration, setConnectionGeneration] = useState(0);

  const activeClientRef = useRef<Client | null>(null);
  activeClientRef.current = activeClient;

  const tokenReady =
    hasHydrated && isAuthenticated && !!accessToken?.trim();

  useEffect(() => {
    if (!tokenReady) {
      setActiveClient(null);
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const client = createStompClient(accessToken!);

    let errorsSub: { unsubscribe: () => void } | null = null;
    let notifSub: { unsubscribe: () => void } | null = null;

    const clearSubs = () => {
      errorsSub?.unsubscribe();
      notifSub?.unsubscribe();
      errorsSub = null;
      notifSub = null;
    };

    client.onConnect = () => {
      setStatus("connected");
      setActiveClient(client);
      setConnectionGeneration((g) => g + 1);

      errorsSub = client.subscribe("/user/queue/errors", (msg: IMessage) => {
        try {
          const raw = msg.body;
          if (!raw) return;
          const data = JSON.parse(raw) as StompErrorPayload;
          toast.error(data.message ?? "요청을 처리할 수 없습니다.");
        } catch {
          toast.error("오류가 발생했습니다.");
        }
      });

      notifSub = client.subscribe(
        "/user/queue/notifications",
        (msg: IMessage) => {
          try {
            const raw = msg.body;
            if (raw) {
              JSON.parse(raw) as NotificationRealtimePayload;
            }
          } catch {
            // 본문 파싱 실패해도 목록 갱신
          }
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({
            queryKey: ["notifications", "unread-count"],
          });
          queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
        }
      );
    };

    client.onStompError = (frame) => {
      const hdr = frame.headers?.message;
      const body = frame.body;
      const text =
        (typeof hdr === "string" && hdr) ||
        (typeof body === "string" && body) ||
        "실시간 연결 오류";
      toast.error(text);
      setStatus("error");
    };

    client.onWebSocketClose = () => {
      setStatus((prev) =>
        prev === "connected" ? "disconnected" : prev
      );
    };

    client.onDisconnect = () => {
      clearSubs();
      setActiveClient(null);
    };

    client.activate();

    return () => {
      clearSubs();
      client.deactivate();
      setActiveClient(null);
      setStatus("idle");
    };
  }, [tokenReady, accessToken, queryClient]);

  const publishChatMessage = useCallback(
    (payload: {
      roomId: number;
      content: string;
      messageType?: "TEXT" | "IMAGE";
    }): boolean => {
      const c = activeClientRef.current;
      if (!c?.connected) {
        return false;
      }
      c.publish({
        destination: "/app/chat/messages",
        body: JSON.stringify({
          roomId: payload.roomId,
          content: payload.content,
          messageType: payload.messageType ?? "TEXT",
        }),
      });
      return true;
    },
    []
  );

  const value = useMemo<StompContextValue>(
    () => ({
      status: tokenReady ? status : "idle",
      isConnected: status === "connected",
      client: tokenReady ? activeClient : null,
      connectionGeneration,
      publishChatMessage,
    }),
    [
      tokenReady,
      status,
      activeClient,
      connectionGeneration,
      publishChatMessage,
    ]
  );

  return (
    <StompContext.Provider value={value}>{children}</StompContext.Provider>
  );
}

export function useStomp(): StompContextValue {
  const ctx = useContext(StompContext);
  if (!ctx) {
    throw new Error("useStomp must be used within StompProvider");
  }
  return ctx;
}

/** Provider 밖(테스트·스토리북)에서 호출 시 null */
export function useStompOptional(): StompContextValue | null {
  return useContext(StompContext);
}
