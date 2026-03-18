"use client";

import { getOAuthLoginUrl } from "@/lib/oauth";
import type { OAuthProvider } from "@/lib/oauth";
import { SiApple, SiGoogle, SiNaver } from "react-icons/si";

type OAuthButtonConfig = {
  provider: OAuthProvider;
  label: string;
  /** 공식 가이드라인 배경색 */
  bgColor: string;
  /** 텍스트/아이콘 색상 */
  textColor: string;
  /** 테두리 (구글: 1px inside #747775) */
  border?: string;
  /** 모서리 둥글기 (px) */
  borderRadius?: number;
  /** 레이블 opacity (카카오: 0.85) */
  labelOpacity?: number;
  /** 커스텀 폰트 (구글: Roboto Medium) */
  fontFamily?: string;
  /** react-icons 또는 커스텀 아이콘 */
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

/** 카카오 공식 말풍선 심볼 (#000000) - 가이드: 말풍선 모양만 사용 */
const KakaoChatBubbleIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    aria-hidden
  >
    <path d="M12 3c-4.97 0-9 3.58-9 8 0 2.52 1.49 4.74 3.78 6.12l-.96 3.5 3.84-2.3c1.02.13 2.06.2 3.12.2 4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
  </svg>
);

/** 카카오 공식: 컨테이너 #FEE500, 심볼 #000000, 레이블 #000000 85%, radius 12px */
const OAUTH_BUTTONS: OAuthButtonConfig[] = [
  {
    provider: "KAKAO",
    label: "카카오 로그인",
    bgColor: "#FEE500",
    textColor: "#000000",
    borderRadius: 12,
    labelOpacity: 0.85,
    Icon: KakaoChatBubbleIcon,
  },
  {
    provider: "NAVER",
    label: "네이버 로그인",
    bgColor: "#03C75A",
    textColor: "#FFFFFF",
    borderRadius: 4,
    Icon: SiNaver,
  },
  {
    provider: "GOOGLE",
    label: "구글 로그인",
    bgColor: "#FFFFFF",
    textColor: "#1F1F1F",
    border: "1px solid #747775",
    borderRadius: 4,
    fontFamily: "var(--font-roboto), 'Roboto', sans-serif",
    Icon: SiGoogle,
  },
  {
    provider: "APPLE",
    label: "Apple로 로그인",
    bgColor: "#000000",
    textColor: "#FFFFFF",
    borderRadius: 12,
    Icon: SiApple,
  },
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
      {OAUTH_BUTTONS.map(
        ({
          provider,
          label,
          bgColor,
          textColor,
          border,
          borderRadius = 12,
          labelOpacity = 1,
          fontFamily,
          Icon,
        }) => {
          const url = getOAuthLoginUrl(provider);
          return (
            <button
              key={provider}
              type="button"
              onClick={() => handleOAuthLogin(provider)}
              disabled={!url}
              className="flex h-12 w-full items-center justify-center gap-2 font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                border: border ?? "none",
                borderRadius: `${borderRadius}px`,
                fontFamily: fontFamily ?? undefined,
                fontSize: provider === "GOOGLE" ? "14px" : undefined,
              }}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                style={{ color: "inherit", opacity: provider === "KAKAO" ? 1 : undefined }}
              />
              <span style={{ opacity: labelOpacity }}>{label}</span>
            {!url && (
              <span className="ml-2 text-xs opacity-70">(환경 변수 미설정)</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
