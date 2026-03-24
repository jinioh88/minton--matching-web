"use client";

import { COST_POLICY_LABELS } from "@/lib/cost-policy-labels";
import { getChatNoticeStatusBadge } from "@/lib/chat-notice-status";
import { cn } from "@/lib/utils";
import type { MatchChatNoticeResponse } from "@/types/chat";
import { Calendar, ChevronRight, Coins, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";

function formatNoticeDate(dateStr: string) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const w = weekdays[d.getDay()];
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${d.getFullYear()}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}(${w})`;
  } catch {
    return dateStr;
  }
}

/** API LocalTime 직렬화 `HH:mm:ss` → 표시용 `HH:mm` */
function shortTime(t: string): string {
  const parts = t.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return t;
}

function getEndTime(startTime: string, durationMin: number | null): string {
  if (durationMin == null) return "";
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMin;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function formatDurationKo(min: number | null): string {
  if (min == null) return "";
  if (min >= 60) return `${min / 60}시간`;
  return `${min}분`;
}

type ChatMatchNoticeProps = {
  notice: MatchChatNoticeResponse;
  className?: string;
};

export function ChatMatchNotice({ notice, className }: ChatMatchNoticeProps) {
  const costLabel =
    COST_POLICY_LABELS[notice.costPolicy] ?? notice.costPolicy;
  const badge = getChatNoticeStatusBadge(notice.status);
  const startShort = shortTime(notice.startTime);
  const endTime = getEndTime(notice.startTime, notice.durationMin);
  const durationStr = formatDurationKo(notice.durationMin);
  const timeLine =
    notice.durationMin != null && endTime
      ? `${startShort} ~ ${endTime} (${durationStr})`
      : startShort;

  return (
    <section
      className={cn(
        "border-b bg-muted px-4 py-3 text-sm shadow-sm",
        className
      )}
    >
      <div className="mx-auto max-w-lg">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 flex-1 font-semibold leading-snug text-foreground">
            {notice.title}
          </h2>
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
              badge.className
            )}
          >
            {badge.label}
          </span>
        </div>

        <ul className="mt-3 space-y-2.5 text-muted-foreground">
          <li className="flex gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="text-xs font-medium text-muted-foreground/90">
                일시
              </p>
              <p className="text-foreground">
                {formatNoticeDate(notice.matchDate)} {timeLine}
              </p>
            </div>
          </li>
          <li className="flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="text-xs font-medium text-muted-foreground/90">
                장소
              </p>
              <p className="text-foreground">
                {notice.locationName?.trim() || "미정"}
              </p>
            </div>
          </li>
          <li className="flex gap-2">
            <Coins className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="text-xs font-medium text-muted-foreground/90">
                비용 정산
              </p>
              <p className="text-foreground">{costLabel}</p>
            </div>
          </li>
        </ul>

        <Link
          href={`/matching/${notice.matchId}`}
          className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-border bg-background/80 py-2 text-xs font-medium text-primary transition-colors hover:bg-muted/50"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          매칭 상세 보기
          <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
