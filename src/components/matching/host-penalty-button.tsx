"use client";

import { Button } from "@/components/ui/button";
import { createPenalty } from "@/lib/api";
import { showApiErrorToast } from "@/lib/show-api-error-toast";
import { cn } from "@/lib/utils";
import type { MatchParticipant } from "@/types/match";
import type { PenaltyType } from "@/types/penalty";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type HostPenaltyButtonProps = {
  matchId: number;
  participant: MatchParticipant;
  onSuccess?: () => void;
};

const PENALTY_LABEL: Record<PenaltyType, string> = {
  NO_SHOW: "노쇼",
  LATE: "지각",
};

export function HostPenaltyButton({
  matchId,
  participant,
  onSuccess,
}: HostPenaltyButtonProps) {
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (type: PenaltyType) =>
      createPenalty(matchId, { userId: participant.userId, type }),
    onSuccess: () => {
      setOpen(false);
      onSuccess?.();
    },
    onError: (err) => {
      showApiErrorToast(err);
    },
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const pick = (type: PenaltyType) => {
    const kind = PENALTY_LABEL[type];
    if (
      !window.confirm(
        `${participant.nickname}님에게 「${kind}」 패널티를 부여할까요? 부여 후에는 같은 유형을 중복으로 줄 수 없습니다.`
      )
    )
      return;
    mutation.mutate(type);
  };

  const busy = mutation.isPending;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-amber-600/40 text-amber-900 hover:bg-amber-500/10 dark:text-amber-200"
        onClick={() => setOpen(true)}
      >
        패널티
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="닫기"
            disabled={busy}
            onClick={() => !busy && setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="penalty-dialog-title"
            className={cn(
              "relative z-10 w-full max-w-sm rounded-t-xl border bg-background p-4 shadow-lg sm:rounded-xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="penalty-dialog-title"
              className="text-base font-semibold"
            >
              패널티 부여
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {participant.nickname}님 — 유형을 선택하세요.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {busy ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full justify-center"
                    onClick={() => pick("NO_SHOW")}
                  >
                    노쇼 (불참)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center border-amber-600/50 text-amber-900 hover:bg-amber-500/10 dark:text-amber-200"
                    onClick={() => pick("LATE")}
                  >
                    지각
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setOpen(false)}
                  >
                    취소
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
