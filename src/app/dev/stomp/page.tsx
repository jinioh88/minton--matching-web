"use client";

/**
 * Sprint 6 Phase 1 수동 테스트: SockJS URL · STOMP CONNECT(Bearer) · 연결 상태
 * 개발 서버: http://localhost:3000/dev/stomp (로그인 후 accessToken 필요)
 * `/matching/dev/stomp` → 동일 화면으로 리다이렉트
 */
import { createStompClient } from "@/lib/stomp/create-stomp-client";
import { getChatSockJsUrl } from "@/lib/ws-url";
import { useAuthStore } from "@/stores/authStore";
import type { Client } from "@stomp/stompjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function DevStompPage() {
  const { isAuthenticated, accessToken } = useAuthStore();

  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const token = accessToken;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-lg font-semibold">STOMP 연결 테스트 (Phase 1)</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        백엔드가{" "}
        <code className="rounded bg-muted px-1">/ws-chat</code> 에서 SockJS를
        열어야 합니다. 로그인 후 토큰이 있어야 CONNECT가 성공합니다.
      </p>
      <p className="mt-2 text-sm">
        SockJS URL:{" "}
        <code className="break-all rounded bg-muted px-1 text-xs">
          {getChatSockJsUrl()}
        </code>
      </p>
      {!isAuthenticated && !token?.trim() ? (
        <p className="mt-4 text-sm text-amber-600">
          로그인이 필요합니다.{" "}
          <Link href="/login" className="underline">
            로그인
          </Link>
        </p>
      ) : (
        <StompManualTester accessToken={token ?? ""} />
      )}
      <p className="mt-8 text-xs text-muted-foreground">
        Phase 2 이후에는 앱 전역 <code>StompProvider</code>가 동일 방식으로
        연결합니다.
      </p>
    </div>
  );
}

function StompManualTester({ accessToken }: { accessToken: string }) {
  const [log, setLog] = useState<string[]>([]);
  const [state, setState] = useState<string>("대기");
  const clientRef = useRef<Client | null>(null);

  const push = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-40), `${new Date().toISOString()} ${line}`]);
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.deactivate();
    clientRef.current = null;
    setState("종료됨");
    push("deactivate() 호출");
  }, [push]);

  const connect = useCallback(() => {
    disconnect();
    if (!accessToken.trim()) {
      setState("토큰 없음");
      push("accessToken 비어 있음");
      return;
    }
    setState("연결 중…");
    push(`CONNECT 시도 → ${getChatSockJsUrl()}`);
    const client = createStompClient(accessToken);
    clientRef.current = client;

    client.onConnect = () => {
      setState("연결됨");
      push("onConnect 성공");
    };
    client.onStompError = (f) => {
      setState("STOMP 오류");
      push(`onStompError: ${f.headers?.message ?? f.body ?? "?"}`);
    };
    client.onWebSocketClose = () => {
      push("WebSocket close");
    };

    client.activate();
  }, [accessToken, disconnect, push]);

  useEffect(() => () => disconnect(), [disconnect]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={connect}
        >
          일회성 연결
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={disconnect}
        >
          끊기
        </button>
      </div>
      <p className="text-sm font-medium">상태: {state}</p>
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed">
        {log.length === 0 ? "(로그 없음)" : log.join("\n")}
      </pre>
    </div>
  );
}
