import type { User } from "./user";

export type OAuthLoginRequest = {
  provider: "KAKAO" | "NAVER" | "GOOGLE" | "APPLE";
  authorizationCode: string;
  redirectUri: string;
};

export type OAuthLoginResponse = {
  accessToken: string;
  user: User;
};
