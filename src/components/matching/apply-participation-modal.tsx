"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";
import { useRef, useEffect } from "react";

const MAX_APPLY_MESSAGE = 200;

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (applyMessage?: string) => void;
  isPending: boolean;
  /** 정원 초과 시 true → "대기 신청" 문구 */
  isFull?: boolean;
};

export function ApplyParticipationModal({
  open,
  onClose,
  onSubmit,
  isPending,
  isFull = false,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      textareaRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = (e.target as HTMLFormElement).applyMessage?.value?.trim();
    onSubmit(value && value.length > 0 ? value : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-background p-6 shadow-lg sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-modal-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="apply-modal-title" className="text-lg font-semibold">
            {isFull ? "대기 신청" : "참여 신청"}
          </h2>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            disabled={isPending}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="applyMessage"
              className="mb-2 block text-sm font-medium text-muted-foreground"
            >
              참여 멘트 (선택, 최대 {MAX_APPLY_MESSAGE}자)
            </label>
            <textarea
              ref={textareaRef}
              id="applyMessage"
              name="applyMessage"
              placeholder="방장에게 한마디 남겨보세요"
              maxLength={MAX_APPLY_MESSAGE}
              disabled={isPending}
              rows={3}
              className={cn(
                "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              )}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFull ? (
                "대기 신청"
              ) : (
                "참여 신청"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
