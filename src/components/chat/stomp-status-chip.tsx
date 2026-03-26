"use client";

import { useStomp } from "@/contexts/stomp-context";
import { cn } from "@/lib/utils";

/** 채팅 목록 등 — Sprint6 Phase 3: 전역 STOMP 연결 상태 표시 */
export function StompStatusChip({ className }: { className?: string }) {
  const { status, isConnected } = useStomp();

  if (status === "idle") return null;

  const label = isConnected
    ? "실시간 연결됨"
    : status === "connecting"
      ? "실시간 연결 중…"
      : status === "error"
        ? "실시간 연결 오류"
        : "실시간 끊김";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        isConnected
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted/50 text-muted-foreground",
        className
      )}
      title="Sprint6 STOMP(SockJS) 세션"
    >
      {label}
    </span>
  );
}
