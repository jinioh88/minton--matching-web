"use client";

import { ApplicationCard } from "@/components/matching/application-card";
import { ApplyParticipationModal } from "@/components/matching/apply-participation-modal";
import { HostPenaltyButton } from "@/components/matching/host-penalty-button";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  applyParticipation,
  cancelParticipation,
  acceptOffer,
  rejectOffer,
  getMatchDetail,
  getApplications,
  cancelMatch,
  closeMatch,
  finishMatch,
  updateParticipation,
} from "@/lib/api";
import { showApiErrorToast } from "@/lib/show-api-error-toast";
import { PARTICIPATION_STATUS_LABELS } from "@/lib/participation";
import { getMatchDisplayStatus } from "@/lib/match-display-status";
import { getRegionName } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { useOfferRemainingMs, formatRemaining } from "@/hooks/use-offer-remaining-ms";
import { useAuthStore } from "@/stores/authStore";
import type { MatchDetail, MatchParticipant } from "@/types/match";
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
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

/**
 * 백엔드가 방장을 confirmedParticipants에 넣지 않는 경우에도
 * 화면에는 방장을 확정 참여자 맨 앞에 표시한다.
 */
function withHostInConfirmedParticipants(match: MatchDetail): MatchParticipant[] {
  const { confirmedParticipants, hostId, host } = match;
  if (confirmedParticipants.some((p) => p.userId === hostId)) {
    return confirmedParticipants;
  }
  const hostRow: MatchParticipant = {
    participationId: -hostId,
    userId: hostId,
    nickname: host.nickname,
    profileImg: host.profileImg,
    ratingScore: host.ratingScore,
    queueOrder: 0,
  };
  return [hostRow, ...confirmedParticipants];
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

  const isHost = !!match && !!user && user.id === match.hostId;
  const { data: applications = [] } = useQuery({
    queryKey: ["applications", matchId],
    queryFn: () => getApplications(Number(matchId)),
    enabled:
      !!matchId &&
      /^\d+$/.test(matchId) &&
      !!match &&
      isHost &&
      match.status === "RECRUITING",
  });

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);

  useEffect(() => {
    if (match?.serverTime) {
      setReceivedAt(Date.now());
    }
  }, [match?.serverTime]);

  const statusMutation = useMutation({
    mutationFn: (action: "CLOSED" | "CANCELLED") =>
      action === "CLOSED"
        ? closeMatch(Number(matchId))
        : cancelMatch(Number(matchId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["applications", matchId] });
    },
    onError: (err) => {
      showApiErrorToast(err);
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => finishMatch(Number(matchId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["applications", matchId] });
    },
    onError: (err) => {
      showApiErrorToast(err);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (applyMessage?: string) =>
      applyParticipation(Number(matchId), applyMessage),
    onSuccess: () => {
      setApplyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (err) => {
      showApiErrorToast(err, "apply");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelParticipation(Number(matchId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (err) => {
      showApiErrorToast(err);
    },
  });

  const acceptOfferMutation = useMutation({
    mutationFn: () => acceptOffer(Number(matchId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (err) => {
      showApiErrorToast(err, "apply");
      // OFFER_EXPIRED 시 자동 새로고침
      if ((err as { response?: { data?: { code?: string } } })?.response?.data?.code === "OFFER_EXPIRED") {
        queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      }
    },
  });

  const rejectOfferMutation = useMutation({
    mutationFn: () => rejectOffer(Number(matchId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (err) => {
      showApiErrorToast(err, "apply");
    },
  });

  const updateParticipationMutation = useMutation({
    mutationFn: ({
      participationId,
      action,
    }: {
      participationId: number;
      action: "ACCEPT" | "REJECT" | "KICK";
    }) => updateParticipation(Number(matchId), participationId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({
        queryKey: ["applications", matchId],
      });
    },
    onError: (err) => {
      showApiErrorToast(err);
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
  const matchStatusBadge = getMatchDisplayStatus(match);
  const displayConfirmed = withHostInConfirmedParticipants(match);

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
        <div className="flex items-center gap-1">
          {isHost && match.status === "RECRUITING" && (
            <Link
              href={`/matching/${matchId}/edit`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1 px-2 no-underline"
              )}
            >
              <Pencil className="h-4 w-4" />
              <span className="text-xs">수정</span>
            </Link>
          )}
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold leading-tight">{match.title}</h1>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                matchStatusBadge.className
              )}
            >
              {matchStatusBadge.label}
            </span>
          </div>
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

        {/* Sprint 4: 종료 모임 후기 안내 */}
        {match.status === "FINISHED" &&
          user &&
          (match.reviewPendingUserIds?.length ?? 0) > 0 && (
            <section className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <p className="text-sm font-medium">
                아직 남기지 않은 후기가{" "}
                {match.reviewPendingUserIds!.length}건 있습니다.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                상대방에 대한 후기를 작성해 주세요.
              </p>
              <Link
                href={`/matching/${matchId}/review`}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-3 inline-flex no-underline"
                )}
              >
                후기 작성하기
              </Link>
            </section>
          )}

        {/* 방장 신청 목록 */}
        {isHost && match.status === "RECRUITING" && (
          <section className="mb-6">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              신청 목록 ({applications.length}명)
            </p>
            {applications.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                아직 신청이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((item) => (
                  <ApplicationCard
                    key={item.participationId}
                    item={item}
                    serverTime={match.serverTime}
                    receivedAt={receivedAt}
                    onAccept={(participationId) =>
                      updateParticipationMutation.mutate({
                        participationId,
                        action: "ACCEPT",
                      })
                    }
                    onReject={(participationId) =>
                      updateParticipationMutation.mutate({
                        participationId,
                        action: "REJECT",
                      })
                    }
                    isAccepting={
                      updateParticipationMutation.isPending &&
                      updateParticipationMutation.variables?.participationId ===
                        item.participationId &&
                      updateParticipationMutation.variables?.action === "ACCEPT"
                    }
                    isRejecting={
                      updateParticipationMutation.isPending &&
                      updateParticipationMutation.variables?.participationId ===
                        item.participationId &&
                      updateParticipationMutation.variables?.action === "REJECT"
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 내 참여 상태 (로그인 사용자) */}
        {match.myParticipation && (
          <section className="mb-6 rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              내 참여 상태
            </p>
            <p className="mt-1 font-semibold">
              {match.myParticipation.status === "WAITING"
                ? `대기열 ${match.myParticipation.queueOrder}번`
                : PARTICIPATION_STATUS_LABELS[match.myParticipation.status]}
            </p>
            {match.myParticipation.applyMessage && (
              <p className="mt-2 text-sm text-muted-foreground">
                &quot;{match.myParticipation.applyMessage}&quot;
              </p>
            )}
          </section>
        )}

        {/* 확정된 참여자 (API에 방장이 없으면 host 정보로 맨 앞에 표시) */}
        {displayConfirmed.length > 0 && (
          <section className="mb-24">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              확정된 참여자 ({displayConfirmed.length}명)
            </p>
            {isHost &&
              match.status === "FINISHED" &&
              match.confirmedParticipants.some((x) => x.userId !== match.hostId) && (
                <p className="mb-3 text-xs text-muted-foreground">
                  종료된 모임입니다. 참가자(방장 제외)에게 노쇼·지각 패널티를 부여할
                  수 있습니다. 동일 유형은 한 번만 부여됩니다.
                </p>
              )}
            <div className="grid grid-cols-3 gap-2">
              {displayConfirmed.map((p) => {
                const showKick =
                  isHost &&
                  (match.status === "RECRUITING" || match.status === "CLOSED") &&
                  p.userId !== match.hostId;
                const showPenalty =
                  isHost &&
                  match.status === "FINISHED" &&
                  p.userId !== match.hostId;
                const isKicking =
                  updateParticipationMutation.isPending &&
                  updateParticipationMutation.variables?.participationId ===
                    p.participationId &&
                  updateParticipationMutation.variables?.action === "KICK";

                return (
                  <div
                    key={p.participationId}
                    className="flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/30 p-2"
                  >
                    <Link
                      href={`/profile/${p.userId}`}
                      className="flex min-w-0 flex-col items-center gap-1.5 text-center transition-opacity hover:opacity-80"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                        {p.profileImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.profileImg}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {p.nickname.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className="w-full truncate text-xs font-medium leading-tight sm:text-sm">
                        {p.nickname}
                      </span>
                    </Link>
                    {(showKick || showPenalty) && (
                      <div className="flex flex-wrap justify-center gap-1">
                        {showKick && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-destructive px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isKicking}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `${p.nickname}님을 매칭에서 추방하시겠습니까?`
                                )
                              )
                                return;
                              updateParticipationMutation.mutate({
                                participationId: p.participationId,
                                action: "KICK",
                              });
                            }}
                          >
                            {isKicking ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "추방"
                            )}
                          </Button>
                        )}
                        {showPenalty && (
                          <HostPenaltyButton
                            matchId={Number(matchId)}
                            participant={p}
                            onSuccess={() => {
                              queryClient.invalidateQueries({
                                queryKey: ["match", matchId],
                              });
                              queryClient.invalidateQueries({
                                queryKey: ["matches"],
                              });
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 하단 고정 버튼 */}
        <MatchDetailBottomBar
          match={match}
          matchId={matchId}
          user={user}
          statusMutation={statusMutation}
          finishMutation={finishMutation}
          applyMutation={applyMutation}
          cancelMutation={cancelMutation}
          acceptOfferMutation={acceptOfferMutation}
          rejectOfferMutation={rejectOfferMutation}
          setApplyModalOpen={setApplyModalOpen}
          handleStatusClick={handleStatusClick}
          receivedAt={receivedAt}
        />
      </main>

      <ApplyParticipationModal
        open={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        onSubmit={(msg) => applyMutation.mutate(msg)}
        isPending={applyMutation.isPending}
        isFull={match.currentPeople >= match.maxPeople}
      />
    </div>
  );
}

type BottomBarProps = {
  match: MatchDetail;
  matchId: string;
  user: { id: number } | null;
  statusMutation: { isPending: boolean; mutate: (s: "CLOSED" | "CANCELLED") => void };
  finishMutation: { isPending: boolean; mutate: () => void };
  applyMutation: { isPending: boolean };
  cancelMutation: { isPending: boolean; mutate: () => void };
  acceptOfferMutation: { isPending: boolean; mutate: () => void };
  rejectOfferMutation: { isPending: boolean; mutate: () => void };
  setApplyModalOpen: (v: boolean) => void;
  handleStatusClick: (s: "CLOSED" | "CANCELLED") => void;
  receivedAt: number | null;
};

/** 하단 버튼 영역 (참여/취소/수락·거절) */
function MatchDetailBottomBar({
  match,
  matchId,
  user,
  statusMutation,
  finishMutation,
  applyMutation,
  cancelMutation,
  acceptOfferMutation,
  rejectOfferMutation,
  setApplyModalOpen,
  handleStatusClick,
  receivedAt,
}: BottomBarProps) {
  const remainingMs = useOfferRemainingMs(
    match.myParticipation?.offerExpiresAt,
    match.serverTime,
    receivedAt
  );
  const remainingLabel = formatRemaining(remainingMs);
  const isUrgent = remainingMs != null && remainingMs > 0 && remainingMs < 60_000;

  const hostActionPending =
    statusMutation.isPending || finishMutation.isPending;

  // 취소된 매칭
  if (match.status === "CANCELLED") {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <Button className="w-full" size="lg" disabled variant="secondary">
          취소된 모임입니다
        </Button>
      </div>
    );
  }

  // 종료된 매칭: 후기 미작성 시 CTA (Sprint 4)
  if (match.status === "FINISHED") {
    const pendingCount = match.reviewPendingUserIds?.length ?? 0;
    const showReviewCta = pendingCount > 0 && !!user;
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 space-y-2">
        {showReviewCta && (
          <Link
            href={`/matching/${matchId}/review`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full justify-center no-underline"
            )}
          >
            후기 남기기 ({pendingCount}명)
          </Link>
        )}
        <Button className="w-full" size="lg" disabled variant="secondary">
          종료된 모임입니다
        </Button>
      </div>
    );
  }

  // 방장: 모집 마감·취소(RECRUITING) / 모임 취소만(CLOSED — Sprint3 §7-1 전용 API)
  const isHostRecruiting =
    user?.id === match.hostId && match.status === "RECRUITING";
  const isHostClosed = user?.id === match.hostId && match.status === "CLOSED";
  if (isHostRecruiting || isHostClosed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div
          className={cn(
            "flex flex-col gap-2",
            isHostRecruiting && "sm:flex-row sm:gap-2"
          )}
        >
          {isHostRecruiting && (
            <Button
              className="w-full sm:flex-1"
              size="lg"
              onClick={() => handleStatusClick("CLOSED")}
              disabled={hostActionPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "모집 마감"
              )}
            </Button>
          )}
          {isHostClosed && match.canFinishMatch && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                if (
                  !window.confirm(
                    "모임을 종료하시겠습니까? 종료 후 후기·패널티를 남길 수 있습니다."
                  )
                )
                  return;
                finishMutation.mutate();
              }}
              disabled={hostActionPending}
            >
              {finishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "모임 종료"
              )}
            </Button>
          )}
          <Button
            variant="outline"
            className={cn(
              "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive w-full",
              isHostRecruiting && "sm:flex-1"
            )}
            size="lg"
            onClick={() => handleStatusClick("CANCELLED")}
            disabled={hostActionPending}
          >
            {statusMutation.isPending && !finishMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "모임 취소"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // 비로그인: 참여 비활성화
  if (!user) {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <Button className="w-full" size="lg" disabled>
          로그인 후 참여 신청
        </Button>
      </div>
    );
  }

  // RESERVED: 수락/거절 (hasWaitingOffer)
  if (match.hasWaitingOffer) {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div className="mb-3 text-center">
          <p className="text-sm font-medium">
            참여 기회가 왔어요! 15분 내 수락해 주세요
          </p>
          <p
            className={`mt-1 text-sm ${isUrgent ? "font-semibold text-destructive animate-pulse" : "text-muted-foreground"}`}
          >
            {remainingLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            size="lg"
            onClick={() => rejectOfferMutation.mutate()}
            disabled={rejectOfferMutation.isPending || remainingMs === 0}
          >
            {rejectOfferMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "거절하기"
            )}
          </Button>
          <Button
            className="flex-1"
            size="lg"
            onClick={() => acceptOfferMutation.mutate()}
            disabled={acceptOfferMutation.isPending || remainingMs === 0}
          >
            {acceptOfferMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "수락하기"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // 긴급 모드 + WAITING: 선착순 참여 기회 (fallback: isEmergencyMode 미제공 시 hasWaitingOffer로 판단)
  if (
    match.myParticipation?.status === "WAITING" &&
    (match.isEmergencyMode || match.hasWaitingOffer)
  ) {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <p className="mb-3 text-center text-sm font-medium">
          현재 선착순으로 참여 기회가 열렸습니다!
        </p>
        <Button
          className="w-full"
          size="lg"
          onClick={() => acceptOfferMutation.mutate()}
          disabled={acceptOfferMutation.isPending}
        >
          {acceptOfferMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "참여 기회 잡기"
          )}
        </Button>
      </div>
    );
  }

  // canApply: 참여/대기 신청 (모집 중일 때만 — 백엔드 불일치·상태 일관성)
  if (match.status === "RECRUITING" && match.canApply) {
    const isFull = match.currentPeople >= match.maxPeople;
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <Button
          className="w-full"
          size="lg"
          onClick={() => setApplyModalOpen(true)}
          disabled={applyMutation.isPending}
        >
          {isFull ? "대기 신청하기" : "참여 신청하기"}
        </Button>
      </div>
    );
  }

  // myParticipation 있음: 취소 또는 상태 표시
  if (match.myParticipation) {
    const status = match.myParticipation.status;
    const label =
      status === "WAITING"
        ? `대기열 ${match.myParticipation.queueOrder}번`
        : PARTICIPATION_STATUS_LABELS[status];

    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        {match.canCancel ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (window.confirm("참여를 취소하시겠습니까?")) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "참여 취소"
              )}
            </Button>
          </div>
        ) : (
          <Button className="w-full" size="lg" disabled>
            {label}
          </Button>
        )}
      </div>
    );
  }

  // 모집 마감 단계이나 아직 참여 정보가 없는 경우 (비로그인은 위에서 처리됨)
  if (match.status === "CLOSED") {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <Button className="w-full" size="lg" disabled variant="secondary">
          모집 마감된 모임입니다
        </Button>
      </div>
    );
  }

  // 모집 중이나 신청 불가 (정원·조건 등)
  if (match.status === "RECRUITING") {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <Button className="w-full" size="lg" disabled variant="secondary">
          지금은 참여 신청할 수 없습니다
        </Button>
      </div>
    );
  }

  // 기본: 비활성
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
      <Button className="w-full" size="lg" disabled variant="secondary">
        참여 신청 불가
      </Button>
    </div>
  );
}
