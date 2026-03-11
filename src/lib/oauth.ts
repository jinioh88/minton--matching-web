/**
 * OAuth 소셜 로그인 URL 생성
 * redirectUri: http://localhost:3000/oauth/callback (각 소셜 개발자 콘솔에 등록)
 * code 수신 후 POST /api/auth/oauth/login 으로 백엔드 전달
 */

export type OAuthProvider = "KAKAO" | "NAVER" | "GOOGLE" | "APPLE";

const getBaseUrl = () =>
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

const REDIRECT_URI = `${getBaseUrl()}/oauth/callback`;

export const getOAuthLoginUrl = (provider: OAuthProvider): string | null => {
  const state = provider;

  switch (provider) {
    case "KAKAO": {
      const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
      if (!clientId) return null;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        state,
      });
      return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
    }

    case "NAVER": {
      const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
      if (!clientId) return null;
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        state,
      });
      return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
    }

    case "GOOGLE": {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) return null;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: "openid email profile",
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    case "APPLE": {
      const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
      if (!clientId) return null;
      const appleRedirectUri = `${getBaseUrl()}/api/auth/apple/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: appleRedirectUri,
        response_type: "code",
        response_mode: "form_post",
        scope: "name email",
        state,
      });
      return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
    }

    default:
      return null;
  }
};

export const getRedirectUri = (provider?: OAuthProvider) => {
  const base = getBaseUrl();
  if (provider === "APPLE") {
    return `${base}/api/auth/apple/callback`;
  }
  return `${base}/oauth/callback`;
};
