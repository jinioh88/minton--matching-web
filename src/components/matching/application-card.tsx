"use client";

import { Button } from "@/components/ui/button";
import { getRegionName } from "@/lib/regions";
import type { ApplicationItem } from "@/types/match";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "수락 대기",
  RESERVED: "15분 내 수락 대기",
  WAITING: "대기열",
};

function formatAppliedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
  } catch {
    return iso.slice(0, 10);
  }
}

type Props = {
  item: ApplicationItem;
  serverTime?: string | null;
  receivedAt?: number | null;
  onAccept: (participationId: number) => void;
  onReject: (participationId: number) => void;
  isAccepting: boolean;
  isRejecting: boolean;
};

export function ApplicationCard({
  item,
  serverTime,
  receivedAt,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: Props) {
  const canRespond = item.status === "PENDING" || item.status === "RESERVED";
  const isReserved = item.status === "RESERVED";

  // offerExpiresAt 남은 시간 (RESERVED용)
  let remainingLabel: string | null = null;
  if (isReserved && item.offerExpiresAt) {
    try {
      const expiresMs = new Date(item.offerExpiresAt).getTime();
      let remainingMs = expiresMs - Date.now();
      if (serverTime && receivedAt != null) {
        const serverMs = new Date(serverTime).getTime();
        const offset = serverMs - receivedAt;
        remainingMs = expiresMs - (Date.now() + offset);
      }
      if (remainingMs > 0) {
        const min = Math.floor(remainingMs / 60_000);
        const sec = Math.floor((remainingMs % 60_000) / 1000);
        remainingLabel = min < 1 ? "곧 만료" : `${min}분 ${sec}초`;
      }
    } catch {
      remainingLabel = "15분 내 수락 대기";
    }
  }

  const statusLabel =
    remainingLabel ?? APPLICATION_STATUS_LABELS[item.status] ?? item.status;

  const interestRegionsDisplay = item.interestRegions?.length
    ? item.interestRegions.map((c) => getRegionName(c) || c).join(", ")
    : null;

  return (
    <div
      className={`rounded-xl border p-4 ${isReserved ? "border-primary/50 bg-primary/5" : "bg-card"}`}
    >
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${item.userId}`}
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted">
            {item.profileImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.profileImg}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {item.nickname.charAt(0)}
              </span>
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${item.userId}`}
              className="font-semibold hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {item.nickname}
            </Link>
            {item.level && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {item.level}급
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            ★ {item.ratingScore?.toFixed(1) ?? "-"} / 5.0
          </p>
          {interestRegionsDisplay && (
            <p className="mt-1 text-xs text-muted-foreground">
              관심 지역: {interestRegionsDisplay}
            </p>
          )}
          {item.applyMessage && (
            <p className="mt-2 text-sm">&quot;{item.applyMessage}&quot;</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {formatAppliedAt(item.appliedAt)} · {statusLabel}
            {item.queueOrder > 0 && ` · 대기 ${item.queueOrder}번`}
          </p>
          {canRespond && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onReject(item.participationId)}
                disabled={isRejecting || isAccepting}
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "거절"
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => onAccept(item.participationId)}
                disabled={isAccepting || isRejecting}
              >
                {isAccepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "수락"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
