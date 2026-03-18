"use client";

import { Button } from "@/components/ui/button";
import { getMatchDetail, updateMatchStatus } from "@/lib/api";
import { getRegionName } from "@/lib/regions";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Users,
  Share2,
  Info,
  Coins,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const COST_LABELS: Record<string, string> = {
  SPLIT_EQUAL: "1/N 정산",
  HOST_PAYS: "방장 부담",
  GUEST_PAYS: "참가자 부담",
};

/** startTime + durationMin → endTime "21:00" */
function getEndTime(startTime: string, durationMin: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMin;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

/** durationMin → "2시간" 형식 */
function formatDuration(min: number): string {
  if (min >= 60) return `${min / 60}시간`;
  return `${min}분`;
}

function formatDate(dateStr: string) {
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

export default function MatchingDetailPage() {
  const params = useParams();
  const matchId = params?.id as string | undefined;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: match, isLoading, error } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => getMatchDetail(Number(matchId)),
    enabled: !!matchId && /^\d+$/.test(matchId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: "CLOSED" | "CANCELLED") =>
      updateMatchStatus(Number(matchId), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "상태 변경에 실패했습니다.";
      window.alert(msg);
    },
  });

  const handleStatusClick = (status: "CLOSED" | "CANCELLED") => {
    const message =
      status === "CANCELLED"
        ? "정말로 이 매칭을 취소하시겠습니까? 취소된 매칭은 복구할 수 없습니다."
        : "정말로 이 매칭을 모집 마감하시겠습니까?";

    if (!window.confirm(message)) return;

    statusMutation.mutate(status);
  };

  if (!matchId || !/^\d+$/.test(matchId)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">잘못된 매칭 주소입니다.</p>
        <Link href="/matching">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !match) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">매칭 정보를 불러오는데 실패했습니다.</p>
        <Link href="/matching">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    );
  }

  const costLabel = COST_LABELS[match.costPolicy] ?? match.costPolicy;
  const locationDisplay = match.locationName || getRegionName(match.regionCode) || "-";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href="/matching"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">뒤로</span>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon-xs" aria-label="공유">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="정보">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* 대표 이미지 */}
        {match.imageUrl && (
          <div className="-mx-4 mb-4 aspect-video overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={match.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* 방장 정보 및 제목 */}
        <section className="mb-6">
          <Link
            href={`/profile/${match.host.id}`}
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20">
              {match.host.profileImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.host.profileImg}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-primary">
                  {match.host.nickname.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{match.host.nickname}</p>
                <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  방장
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                ★ {match.host.ratingScore?.toFixed(1) ?? "-"} / 5.0
              </p>
            </div>
          </Link>
          <h1 className="mt-4 text-xl font-bold leading-tight">
            {match.title}
          </h1>
        </section>

        {/* 핵심 매칭 카드 */}
        <section className="mb-6 rounded-xl border bg-card p-4">
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-muted-foreground">일시</p>
                <p>
                  {formatDate(match.matchDate)}{" "}
                  {match.startTime} ~ {getEndTime(match.startTime, match.durationMin)}{" "}
                  ({formatDuration(match.durationMin)})
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-muted-foreground">장소</p>
                <p>{locationDisplay}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-muted-foreground">인원</p>
                <p>
                  현재 참여 {match.currentPeople}명 / 정원 {match.maxPeople}명
                </p>
                {match.waitingCount > 0 && (
                  <p className="mt-1 text-xs text-destructive">
                    대기 중인 인원: {match.waitingCount}명
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Coins className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-muted-foreground">비용</p>
                <p>{costLabel}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 상세 내용 및 조건 */}
        <section className="mb-6 rounded-xl border bg-card p-4">
          {match.targetLevels && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                희망 급수
              </p>
              <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
                {match.targetLevels.replace(/,/g, ", ")}
              </span>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              상세 내용
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {match.description}
            </p>
          </div>
        </section>

        {/* 확정된 참여자 */}
        {match.confirmedParticipants.length > 0 && (
          <section className="mb-24">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              확정된 참여자 ({match.confirmedParticipants.length}명)
            </p>
            <div className="flex flex-wrap gap-2">
              {match.confirmedParticipants.map((p) => (
                <Link
                  key={p.participationId}
                  href={`/profile/${p.userId}`}
                  className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {p.profileImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.profileImg}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium">
                        {p.nickname.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{p.nickname}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 하단 고정 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
          {user?.id === match.hostId && match.status === "RECRUITING" ? (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="lg"
                onClick={() => handleStatusClick("CLOSED")}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "모집 마감"
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                size="lg"
                onClick={() => handleStatusClick("CANCELLED")}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "취소"
                )}
              </Button>
            </div>
          ) : (
            <Button className="w-full" size="lg" disabled>
              참여 신청하기
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
