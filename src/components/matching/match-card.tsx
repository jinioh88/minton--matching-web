"use client";

import { getMatchDisplayStatus } from "@/lib/match-display-status";
import { PARTICIPATION_STATUS_SHORT_LABELS } from "@/lib/participation";
import type { MatchListItem } from "@/types/match";
import { Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";

/** durationMin → "2h" 형식 */
function formatDuration(min?: number): string {
  if (!min) return "";
  if (min >= 60) return `${min / 60}h`;
  return `${min}분`;
}

/** startTime + durationMin → endTime "21:00" */
function getEndTime(startTime: string, durationMin?: number): string {
  if (!durationMin) return "";
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMin;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

/** 급수 배지 색상 */
const LEVEL_BADGE_STYLES: Record<string, string> = {
  A: "bg-amber-500 text-white",
  B: "bg-orange-400 text-white",
  C: "bg-orange-400 text-white",
  D: "bg-green-500 text-white",
  BEGINNER: "bg-green-400 text-white",
};

function parseTargetLevels(targetLevels?: string): string[] {
  if (!targetLevels?.trim()) return [];
  return targetLevels
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function levelBadgeLabel(code: string): string {
  return code === "BEGINNER" ? "초" : code;
}

type MatchCardProps = {
  match: MatchListItem;
};

export function MatchCard({ match }: MatchCardProps) {
  const locationDisplay = match.locationName || "-";
  const statusBadge =
    match.status != null
      ? getMatchDisplayStatus({
          status: match.status,
          currentPeople: match.currentPeople,
          maxPeople: match.maxPeople,
        })
      : null;
  const endTime = getEndTime(match.startTime, match.durationMin);
  const durationStr = formatDuration(match.durationMin);
  const timeDisplay = match.durationMin
    ? `${match.startTime} ~ ${endTime} (${durationStr})`
    : match.startTime;
  const targetLevelCodes = parseTargetLevels(match.targetLevels);

  return (
    <Link
      href={`/matching/${match.matchId}`}
      className="block overflow-hidden rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {/* 상태 + 급수 배지 */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {statusBadge ? (
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            ) : (
              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                상태 미제공
              </span>
            )}
            {match.myParticipation && (
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {match.myParticipation.status === "WAITING"
                  ? `대기열 ${match.myParticipation.queueOrder}번`
                  : PARTICIPATION_STATUS_SHORT_LABELS[match.myParticipation.status] ??
                    match.myParticipation.status}
              </span>
            )}
            {targetLevelCodes.map((code) => (
              <span
                key={code}
                className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold ${
                  LEVEL_BADGE_STYLES[code] ??
                  "bg-primary text-primary-foreground"
                }`}
              >
                {levelBadgeLabel(code)}
              </span>
            ))}
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold">{match.title}</h3>

          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {timeDisplay}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {locationDisplay}
            </p>
            <p className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium text-primary">
                  {match.currentPeople}
                </span>
                /{match.maxPeople}명
              </span>
            </p>
          </div>

          {/* 방장 정보 */}
          <div className="mt-3 flex items-center gap-2">
            {match.hostProfileImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.hostProfileImg}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                {match.hostNickname.charAt(0)}
              </span>
            )}
            <span className="text-sm font-medium">{match.hostNickname}</span>
            {match.hostRatingScore != null && (
              <span className="text-xs text-yellow-600">
                ★ {match.hostRatingScore.toFixed(1)}
              </span>
            )}
          </div>

          {/* 해시태그 */}
          {match.hostMannerTags && match.hostMannerTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {match.hostMannerTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-primary hover:underline"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="aspect-square w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-32">
          {match.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={match.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      </div>
    </Link>
  );
}
