/** Spring `PageResponse<T>` 직렬화 (Sprint4-API) */
export type PageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};
