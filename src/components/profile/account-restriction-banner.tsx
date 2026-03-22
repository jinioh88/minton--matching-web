"use client";

import type { Profile } from "@/types/profile";
import { AlertTriangle, Ban, ShieldAlert } from "lucide-react";

function formatUntil(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function isAfterNow(iso: string | null | undefined): boolean {
  if (iso == null || iso === "") return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

type AccountRestrictionBannerProps = {
  profile: Pick<
    Profile,
    "accountStatus" | "suspendedUntil" | "participationBannedUntil"
  >;
};

/**
 * 본인 `/users/me` 전용 — 제재·참여 제한 안내
 */
export function AccountRestrictionBanner({
  profile,
}: AccountRestrictionBannerProps) {
  const { accountStatus, suspendedUntil, participationBannedUntil } = profile;

  if (accountStatus === "BANNED") {
    return (
      <div
        className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="status"
      >
        <Ban className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">이용이 제한된 계정입니다</p>
          <p className="mt-1 text-destructive/90">
            영구 제재 상태입니다. 문의가 필요하면 고객 지원을 이용해 주세요.
          </p>
        </div>
      </div>
    );
  }

  const suspendedActive = isAfterNow(suspendedUntil);
  const participationActive = isAfterNow(participationBannedUntil);

  if (!suspendedActive && !participationActive) {
    return null;
  }

  return (
    <div className="space-y-3">
      {suspendedActive && suspendedUntil && (
        <div
          className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          role="status"
        >
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
            aria-hidden
          />
          <div>
            <p className="font-semibold text-destructive">계정 정지 중</p>
            <p className="mt-1 text-muted-foreground">
              {formatUntil(suspendedUntil)}까지 일부 기능(후기 작성 등)이
              제한될 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {participationActive && participationBannedUntil && (
        <div
          className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">매칭 참여 제한 중</p>
            <p className="mt-1 opacity-90">
              {formatUntil(participationBannedUntil)}까지 새 매칭 참여 신청이
              제한됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
