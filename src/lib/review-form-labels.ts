import type { ReviewHashtagCode, ReviewSentiment } from "@/types/review";

export const REVIEW_SENTIMENT_OPTIONS: {
  value: ReviewSentiment;
  label: string;
}[] = [
  { value: "NEGATIVE", label: "아쉬워요" },
  { value: "NEUTRAL", label: "보통이에요" },
  { value: "POSITIVE", label: "좋았어요" },
];

export const REVIEW_HASHTAG_OPTIONS: { value: ReviewHashtagCode; label: string }[] =
  [
    { value: "PASSION", label: "열정" },
    { value: "MANNER", label: "매너" },
    { value: "KINDNESS", label: "친절" },
    { value: "EXPERT", label: "고수" },
    { value: "PUNCTUAL", label: "시간 약속" },
    { value: "TEAM_PLAY", label: "팀플레이" },
  ];

export const MAX_REVIEW_DETAIL_LENGTH = 2000;
export const MAX_REVIEW_HASHTAGS = 10;

export function sentimentLabel(s: ReviewSentiment): string {
  return REVIEW_SENTIMENT_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

export function hashtagLabel(code: ReviewHashtagCode): string {
  return REVIEW_HASHTAG_OPTIONS.find((o) => o.value === code)?.label ?? code;
}
