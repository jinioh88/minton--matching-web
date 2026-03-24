"use client";

import { cn } from "@/lib/utils";
import type { NotificationResponse } from "@/types/notification";
import { ChevronRight } from "lucide-react";

function formatNotifiedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type NotificationRowProps = {
  item: NotificationResponse;
  onOpen: () => void;
  disabled?: boolean;
};

export function NotificationRow({
  item,
  onOpen,
  disabled,
}: NotificationRowProps) {
  const unread = item.readAt == null;
  const hasLink = item.relatedMatchId != null;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className={cn(
        "flex w-full gap-3 border-b px-4 py-3 text-left transition-colors",
        "hover:bg-muted/50 active:bg-muted/70",
        "disabled:pointer-events-none disabled:opacity-60",
        unread && "bg-primary/5"
      )}
    >
      {unread ? (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
          aria-hidden
        />
      ) : (
        <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-foreground">{item.title}</p>
          <time
            className="shrink-0 text-xs text-muted-foreground"
            dateTime={item.createdAt}
          >
            {formatNotifiedAt(item.createdAt)}
          </time>
        </div>
        {item.body ? (
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {item.body}
          </p>
        ) : null}
      </div>
      {hasLink ? (
        <ChevronRight
          className="mt-1 h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
