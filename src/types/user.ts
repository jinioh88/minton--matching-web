/**
 * API 응답 user 필드 (OAuth 로그인, 프로필 조회 등)
 * Sprint1-API 기준
 */
export type User = {
  id: number;
  email?: string;
  nickname: string;
  profileImg?: string;
  profileComplete: boolean;
};
