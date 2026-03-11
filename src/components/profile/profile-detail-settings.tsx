"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRegionName } from "@/lib/regions";
import { REGIONS } from "@/lib/regions";
import type { Profile } from "@/types/profile";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api";

const PLAY_STYLES = ["공격형", "수비형", "올라운드"] as const;

const editSchema = z.object({
  interestLoc1: z.string().optional(),
  interestLoc2: z.string().optional(),
  racketInfo: z.string().max(100).optional(),
  playStyle: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

type ProfileDetailSettingsProps = {
  profile: Profile;
  onUpdate?: (updated: Partial<Profile>) => void;
  /** true: 타인 프로필 등 수정 불가 (수정 버튼 숨김) */
  readOnly?: boolean;
};

export const ProfileDetailSettings = ({
  profile,
  onUpdate,
  readOnly = false,
}: ProfileDetailSettingsProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, watch, setValue, reset } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      interestLoc1: profile.interestLoc1 ?? "",
      interestLoc2: profile.interestLoc2 ?? "",
      racketInfo: profile.racketInfo ?? "",
      playStyle: profile.playStyle ?? "",
    },
  });

  const startEditing = () => {
    if (readOnly) return;
    reset({
      interestLoc1: profile.interestLoc1 ?? "",
      interestLoc2: profile.interestLoc2 ?? "",
      racketInfo: profile.racketInfo ?? "",
      playStyle: profile.playStyle ?? "",
    });
    setIsEditing(true);
  };

  const playStyle = watch("playStyle");

  const onSubmit = async (data: EditFormData) => {
    if (readOnly || !onUpdate) return;
    try {
      await apiClient.patch("/users/me", {
        interestLoc1: data.interestLoc1 || undefined,
        interestLoc2: data.interestLoc2 || undefined,
        racketInfo: data.racketInfo || undefined,
        playStyle: data.playStyle || undefined,
      });
      onUpdate({
        interestLoc1: data.interestLoc1,
        interestLoc2: data.interestLoc2,
        racketInfo: data.racketInfo,
        playStyle: data.playStyle,
      });
      setIsEditing(false);
    } catch {
      // 에러 처리
    }
  };

  const region1Name = getRegionName(profile.interestLoc1);
  const region2Name = getRegionName(profile.interestLoc2);

  if (isEditing && !readOnly) {
    return (
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          상세 설정
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">관심 지역</label>
            <div className="flex gap-2">
              <select
                className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                {...register("interestLoc1")}
              >
                <option value="">시/군/구 선택</option>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                {...register("interestLoc2")}
              >
                <option value="">시/군/구 선택 (선택)</option>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">나의 장비</label>
            <Input
              placeholder="라켓 모델명"
              maxLength={100}
              {...register("racketInfo")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">플레이 스타일</label>
            <div className="flex gap-2">
              {PLAY_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setValue("playStyle", style)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    playStyle === style
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-muted/50 hover:bg-muted"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              저장
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              취소
            </Button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">
        상세 설정
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">관심 지역</p>
            <div className="flex flex-wrap gap-2">
              {region1Name && (
                <span className="rounded-md bg-muted px-2 py-1 text-sm">
                  {region1Name}
                </span>
              )}
              {region2Name && (
                <span className="rounded-md bg-muted px-2 py-1 text-sm">
                  {region2Name}
                </span>
              )}
              {!region1Name && !region2Name && (
                <span className="text-sm text-muted-foreground">미설정</span>
              )}
            </div>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="link"
              className="text-primary"
              onClick={startEditing}
            >
              수정
            </Button>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">나의 장비</p>
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            {profile.racketInfo || "미입력"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">플레이 스타일</p>
          <div className="flex gap-2">
            {PLAY_STYLES.map((style) => (
              <span
                key={style}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  profile.playStyle === style
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-muted/50 text-muted-foreground"
                }`}
              >
                {style}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
