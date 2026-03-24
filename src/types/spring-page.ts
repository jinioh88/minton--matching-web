/**
 * Spring Data `Page<T>` JSON 직렬화 (Sprint5-API — 채팅방·알림 목록).
 * `PageResponse<T>`(Sprint 4 후기·패널티)와 필드명이 다르다.
 */
export type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements?: number;
  empty?: boolean;
};
