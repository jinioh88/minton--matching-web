"use client";

import { useEffect, useState } from "react";

/**
 * offerExpiresAt까지 남은 시간(ms)을 계산.
 * serverTime이 있으면 시차 보정. 1분 미만 시 "곧 만료" UI용.
 */
export function useOfferRemainingMs(
  offerExpiresAt: string | null | undefined,
  serverTime?: string | null,
  receivedAt?: number | null
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!offerExpiresAt) {
      setRemaining(null);
      return;
    }

    const expiresMs = new Date(offerExpiresAt).getTime();
    if (Number.isNaN(expiresMs)) {
      setRemaining(null);
      return;
    }

    const update = () => {
      const now = Date.now();
      let remainingMs = expiresMs - now;

      // serverTime으로 시차 보정 (선택)
      if (serverTime && receivedAt != null) {
        const serverMs = new Date(serverTime).getTime();
        const offset = serverMs - receivedAt; // 서버가 offset ms 앞서 있음
        remainingMs = expiresMs - (now + offset);
      }

      setRemaining(remainingMs > 0 ? Math.floor(remainingMs) : 0);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [offerExpiresAt, serverTime, receivedAt]);

  return remaining;
}

/** ms → "N분 N초" 또는 "곧 만료" */
export function formatRemaining(ms: number | null): string {
  if (ms == null || ms <= 0) return "만료됨";
  if (ms < 60_000) return "곧 만료됩니다!";
  const min = Math.floor(ms / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  if (sec > 0) return `${min}분 ${sec}초`;
  return `${min}분`;
}
