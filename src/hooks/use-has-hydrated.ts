"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Hydration 완료 여부를 반환하는 훅.
 * Zustand persist + localStorage 사용 시 서버/클라이언트 렌더 불일치로 인한
 * Hydration 에러를 방지하기 위해, 이 훅이 true를 반환한 후에만 persist 상태를 사용한다.
 */
export const useHasHydrated = () => {
  return useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
};
