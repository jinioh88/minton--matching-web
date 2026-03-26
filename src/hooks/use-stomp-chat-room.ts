"use client";

import { useStomp } from "@/contexts/stomp-context";
import type { ChatMessageResponse } from "@/types/chat";
import { useEffect } from "react";

/** Sprint6: `/topic/chat.{roomId}` 구독 — 상세 이탈 시 자동 unsubscribe */
export function useStompChatRoom(
  roomId: number,
  onMessage: (msg: ChatMessageResponse) => void
) {
  const { client, isConnected, connectionGeneration } = useStomp();

  useEffect(() => {
    if (!client || !isConnected || !roomId) return;
    const dest = `/topic/chat.${roomId}`;
    const sub = client.subscribe(dest, (frame) => {
      try {
        const raw = frame.body;
        if (!raw) return;
        const msg = JSON.parse(raw) as ChatMessageResponse;
        if (msg.roomId === roomId) onMessage(msg);
      } catch {
        // malformed frame 무시
      }
    });
    return () => sub.unsubscribe();
  }, [client, isConnected, roomId, connectionGeneration, onMessage]);
}
