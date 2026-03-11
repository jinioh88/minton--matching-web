"use client";

import { Button } from "@/components/ui/button";
import { getOAuthLoginUrl } from "@/lib/oauth";
import type { OAuthProvider } from "@/lib/oauth";

type OAuthButtonConfig = {
  provider: OAuthProvider;
  label: string;
};

const OAUTH_BUTTONS: OAuthButtonConfig[] = [
  { provider: "KAKAO", label: "카카오 로그인" },
  { provider: "NAVER", label: "네이버 로그인" },
  { provider: "GOOGLE", label: "구글 로그인" },
  { provider: "APPLE", label: "애플 로그인" },
];

export const OAuthButtons = () => {
  const handleOAuthLogin = (provider: OAuthProvider) => {
    const url = getOAuthLoginUrl(provider);
    if (url) {
      window.location.href = url;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {OAUTH_BUTTONS.map(({ provider, label }) => {
        const url = getOAuthLoginUrl(provider);
        return (
          <Button
            key={provider}
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthLogin(provider)}
            disabled={!url}
          >
            {label}
            {!url && (
              <span className="ml-2 text-xs text-muted-foreground">
                (환경 변수 미설정)
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};
