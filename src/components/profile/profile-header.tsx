"use client";

import { uploadProfileImage } from "@/lib/api";
import { AlertTriangle, Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

type ProfileHeaderProps = {
  nickname: string;
  profileImg?: string;
  level?: string;
  ratingScore?: number;
  mannerTags?: string[];
  joinedAt?: string;
  createdAt?: string;
  /** true: 타인 프로필 등 수정 불가 (카메라 버튼 숨김) */
  readOnly?: boolean;
  /** Sprint 4 — 서버 `showCautionBadge` (패널티 누적 구간 등) */
  showCautionBadge?: boolean;
  /** 프로필 이미지 업로드 완료 시 콜백 (내 프로필에서만 사용) */
  onProfileImageUpdate?: (profileImg: string) => void;
};

/** LocalDateTime(ISO), timestamp, [y,m,d,...] 배열 등 다양한 형식 지원 */
const formatJoinedAt = (value?: string | number | number[]): string => {
  if (value == null) return "-";
  try {
    let date: Date;
    if (Array.isArray(value)) {
      const [y, m = 1, d = 1] = value;
      date = new Date(y, m - 1, d);
    } else if (typeof value === "number") {
      date = new Date(value);
    } else {
      date = new Date(value);
    }
    if (Number.isNaN(date.getTime())) return "-";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
  } catch {
    return "-";
  }
};

const LEVEL_LABELS: Record<string, string> = {
  A: "A급",
  B: "B급",
  C: "C급",
  D: "D급",
  BEGINNER: "초급",
};

export const ProfileHeader = ({
  nickname,
  profileImg,
  level,
  ratingScore = 5,
  mannerTags = [],
  joinedAt,
  createdAt,
  readOnly = false,
  showCautionBadge = false,
  onProfileImageUpdate,
}: ProfileHeaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const joinedAtValue = joinedAt ?? createdAt;
  const levelLabel = level ? LEVEL_LABELS[level] ?? `${level}급` : "-";
  const rating = Math.min(5, Math.max(0, ratingScore ?? 0));
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onProfileImageUpdate) return;

    setUploadError(null);
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`이미지는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
      return;
    }
    if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
      setUploadError("jpeg, png, gif, webp 형식만 가능합니다.");
      return;
    }

    setIsUploading(true);
    try {
      const updated = await uploadProfileImage(file);
      onProfileImageUpdate(updated.profileImg ?? "");
    } catch {
      setUploadError("업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleCameraClick = () => {
    if (readOnly || !onProfileImageUpdate || isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4 pb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        aria-hidden
        onChange={handleImageSelect}
      />
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {profileImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImg}
              alt={nickname}
              width={96}
              height={96}
              className="h-24 w-24 object-cover"
            />
          ) : (
            nickname.charAt(0) || "?"
          )}
        </div>
        {!readOnly && onProfileImageUpdate && (
          <button
            type="button"
            onClick={handleCameraClick}
            disabled={isUploading}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="프로필 사진 수정"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {uploadError && (
        <p className="text-center text-sm text-destructive">{uploadError}</p>
      )}

      <div className="flex flex-col items-center gap-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xl font-bold">{nickname}</span>
          <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {levelLabel}
          </span>
          {showCautionBadge && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100"
              title="최근 활동 이력에 따라 표시될 수 있습니다"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              주의
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          가입일: {formatJoinedAt(joinedAtValue)}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={
                  i <= fullStars
                    ? "text-yellow-400"
                    : i === fullStars + 1 && hasHalfStar
                      ? "text-yellow-400"
                      : "text-muted-foreground"
                }
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {(ratingScore ?? 0).toFixed(1)} / 5.0
          </span>
        </div>
        {mannerTags.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {mannerTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
