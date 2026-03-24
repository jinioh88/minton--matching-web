"use client";

import type { ChatRoomListItemResponse } from "@/types/chat";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

function formatListTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
}

type ChatRoomRowProps = {
  room: ChatRoomListItemResponse;
};

export function ChatRoomRow({ room }: ChatRoomRowProps) {
  const preview = room.lastMessagePreview?.trim() || "메시지가 없습니다";
  const timeLabel = formatListTime(room.lastMessageAt);

  return (
    <Link
      href={`/chat/${room.roomId}`}
      className="flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted/70"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate font-semibold text-foreground">
            {room.matchTitle}
          </h2>
          {timeLabel ? (
            <time
              className="shrink-0 text-xs text-muted-foreground"
              dateTime={room.lastMessageAt ?? undefined}
            >
              {timeLabel}
            </time>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {preview}
        </p>
      </div>
    </Link>
  );
}
