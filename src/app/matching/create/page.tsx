"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { createMatch, uploadFile } from "@/lib/api";
import { REGIONS } from "@/lib/regions";
import type { CostPolicy, CreateMatchRequest } from "@/types/match";
import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "초심" },
  { value: "D", label: "D급" },
  { value: "C", label: "C급" },
  { value: "B", label: "B급" },
  { value: "A", label: "A급" },
];

const COST_POLICY_OPTIONS: { value: CostPolicy; label: string }[] = [
  { value: "SPLIT_EQUAL", label: "균등 분담" },
  { value: "HOST_PAYS", label: "방장 부담" },
  { value: "GUEST_PAYS", label: "참가자 부담" },
];

const DURATION_OPTIONS = [
  { value: 30, label: "30분" },
  { value: 60, label: "1시간" },
  { value: 90, label: "1.5시간" },
  { value: 120, label: "2시간" },
  { value: 150, label: "2.5시간" },
  { value: 180, label: "3시간" },
  { value: 210, label: "3.5시간" },
  { value: 240, label: "4시간" },
];

const createMatchSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요").max(100, "최대 100자"),
  description: z
    .string()
    .min(1, "상세 설명을 입력해 주세요")
    .max(500, "최대 500자"),
  matchDate: z.string().min(1, "날짜를 선택해 주세요"),
  startTime: z.string().min(1, "시작 시간을 선택해 주세요"),
  durationMin: z.number().min(30).max(240),
  locationName: z.string().optional(),
  regionCode: z.string().min(1, "지역을 선택해 주세요"),
  maxPeople: z.number().min(2).max(12),
  targetLevels: z.string().optional(),
  costPolicy: z.enum(["SPLIT_EQUAL", "HOST_PAYS", "GUEST_PAYS"]),
});

type CreateMatchFormData = z.infer<typeof createMatchSchema>;

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getMaxDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export default function CreateMatchingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { ready, isAuthenticated, shouldRedirect } = useRequireAuth("/login");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateMatchFormData>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      title: "",
      description: "",
      matchDate: getTodayStr(),
      startTime: "14:00",
      durationMin: 120,
      regionCode: "",
      maxPeople: 4,
      costPolicy: "SPLIT_EQUAL",
    },
    mode: "onChange",
  });

  const targetLevels = watch("targetLevels");

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    if (file.size > MAX_SIZE_BYTES) {
      setImageError(`이미지는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
      return;
    }
    if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
      setImageError("jpeg, png, gif, webp 형식만 가능합니다.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const { url } = await uploadFile(file, "MATCH");
      setImageUrl(url);
    } catch {
      setImageError("이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const onSubmit = async (data: CreateMatchFormData) => {
    try {
      const body: CreateMatchRequest = {
        title: data.title,
        description: data.description,
        matchDate: data.matchDate,
        startTime: data.startTime,
        durationMin: data.durationMin,
        locationName: data.locationName || undefined,
        regionCode: data.regionCode,
        maxPeople: data.maxPeople,
        targetLevels: data.targetLevels || undefined,
        costPolicy: data.costPolicy,
        imageUrl: imageUrl || undefined,
      };
      const result = await createMatch(body);
      router.push(`/matching/${result.matchId}`);
    } catch {
      // TODO: 토스트 등 에러 표시
    }
  };

  const handleCancel = () => {
    if (
      watch("title") ||
      watch("description") ||
      imageUrl
    ) {
      if (window.confirm("작성 중인 내용이 사라집니다. 취소하시겠습니까?")) {
        router.push("/matching");
      }
    } else {
      router.push("/matching");
    }
  };

  if (!ready || shouldRedirect || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </button>
        <h1 className="text-lg font-semibold">매칭 만들기</h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 기본 정보 */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              기본 정보
            </h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">매칭 제목 *</label>
              <Input
                placeholder="예: 망원동에서 가볍게 한 판 하실 분!"
                maxLength={100}
                error={!!errors.title}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">상세 설명 *</label>
              <textarea
                placeholder="모임에 대한 자세한 안내 (준비물, 분위기 등)"
                maxLength={500}
                rows={4}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
          </section>

          {/* 일시 및 장소 */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              일시 및 장소
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">날짜 *</label>
                <Input
                  type="date"
                  min={getTodayStr()}
                  max={getMaxDateStr()}
                  error={!!errors.matchDate}
                  {...register("matchDate")}
                />
                {errors.matchDate && (
                  <p className="text-sm text-destructive">
                    {errors.matchDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">시작 시간 *</label>
                <Input
                  type="time"
                  error={!!errors.startTime}
                  {...register("startTime")}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">
                    {errors.startTime.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">소요 시간 *</label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                {...register("durationMin", { valueAsNumber: true })}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">장소명</label>
              <Input
                placeholder="예: OO체육관"
                {...register("locationName")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">지역 *</label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                {...register("regionCode")}
              >
                <option value="">시/군/구 선택</option>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              {errors.regionCode && (
                <p className="text-sm text-destructive">
                  {errors.regionCode.message}
                </p>
              )}
            </div>
          </section>

          {/* 참여 조건 */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              참여 조건 및 규칙
            </h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">모집 인원 * (2~12명)</label>
              <Input
                type="number"
                min={2}
                max={12}
                error={!!errors.maxPeople}
                {...register("maxPeople", { valueAsNumber: true })}
              />
              {errors.maxPeople && (
                <p className="text-sm text-destructive">
                  {errors.maxPeople.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">희망 급수</label>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.map((opt) => {
                  const selected = targetLevels
                    ?.split(",")
                    .includes(opt.value) ?? false;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const current = targetLevels?.split(",").filter(Boolean) ?? [];
                        const next = selected
                          ? current.filter((v) => v !== opt.value)
                          : [...current, opt.value];
                        setValue("targetLevels", next.join(","), {
                          shouldValidate: true,
                        });
                      }}
                      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border border-input bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">비용 분담 *</label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                {...register("costPolicy")}
              >
                {COST_POLICY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* 사진 등록 */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              사진 등록 (선택)
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleImageSelect}
            />
            <div
              onClick={() =>
                !isUploadingImage && fileInputRef.current?.click()
              }
              className="flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-input bg-muted/30 transition-colors hover:bg-muted/50"
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="매칭 대표 이미지"
                  className="h-full w-full object-cover"
                />
              ) : isUploadingImage ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-10 w-10" />
                  <span className="text-sm">이미지를 선택해 주세요</span>
                  <span className="text-xs">jpeg, png, gif, webp (최대 5MB)</span>
                </div>
              )}
            </div>
            {imageError && (
              <p className="text-sm text-destructive">{imageError}</p>
            )}
          </section>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "등록"
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
