/**
 * Sprint 8 — GET/POST /api/users/me/friendships 응답
 * (`common-docs/api/Sprint8-API.md`)
 */
export type FollowingUserResponse = {
  userId: number;
  nickname: string | null;
  profileImg: string | null;
  level: string | null;
  followedAt: string;
};
