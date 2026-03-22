"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getMatchDetail, updateMatch, uploadFile } from "@/lib/api";
import { showApiErrorToast } from "@/lib/show-api-error-toast";
import { REGIONS } from "@/lib/regions";
import type { CostPolicy, CreateMatchRequest, MatchDetail } from "@/types/match";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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

/** "14:00:00" → "14:00" (HTML time input) */
function normalizeTimeForInput(t: string): string {
  const parts = t.split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return t;
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getMaxDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function buildEditSchema(minMaxPeople: number) {
  return z.object({
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
    maxPeople: z
      .number()
      .int()
      .min(minMaxPeople, `정원은 현재 인원(${minMaxPeople}명, 방장 포함) 이상이어야 합니다`)
      .max(12, "최대 12명"),
    targetLevels: z.string().optional(),
    costPolicy: z.enum(["SPLIT_EQUAL", "HOST_PAYS", "GUEST_PAYS"]),
  });
}

type EditMatchFormData = z.infer<ReturnType<typeof buildEditSchema>>;

function EditMatchFormInner({
  match,
  matchId,
}: {
  match: MatchDetail;
  matchId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(
    match.imageUrl ?? null
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const minMaxPeople = Math.max(2, match.currentPeople);
  const editSchema = useMemo(
    () => buildEditSchema(minMaxPeople),
    [minMaxPeople]
  );

  const defaultValues = useMemo(
    (): EditMatchFormData => ({
      title: match.title,
      description: match.description,
      matchDate: match.matchDate,
      startTime: normalizeTimeForInput(match.startTime),
      durationMin: match.durationMin,
      locationName: match.locationName ?? "",
      regionCode: match.regionCode,
      maxPeople: match.maxPeople,
      targetLevels: match.targetLevels ?? "",
      costPolicy: match.costPolicy,
    }),
    [match]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<EditMatchFormData>({
    resolver: zodResolver(editSchema),
    defaultValues,
    mode: "onChange",
  });

  const targetLevels = watch("targetLevels");

  const handleCancel = () => {
    router.push(`/matching/${matchId}`);
  };

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

  const onSubmit = async (data: EditMatchFormData) => {
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
      await updateMatch(Number(matchId), body);
      router.push(`/matching/${matchId}`);
    } catch (err) {
      showApiErrorToast(err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
          취소
        </button>
        <h1 className="text-lg font-semibold">매칭 수정</h1>
        <div className="w-14" />
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <p className="mb-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          정원은 현재{" "}
          <span className="font-medium text-foreground">
            {match.currentPeople}명(방장 포함)
          </span>
          이상으로만 설정할 수 있습니다.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              참여 조건 및 규칙
            </h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                모집 인원 * ({minMaxPeople}~12명, 방장 포함)
              </label>
              <Input
                type="number"
                min={minMaxPeople}
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
                  const selected =
                    targetLevels?.split(",").includes(opt.value) ?? false;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const current =
                          targetLevels?.split(",").filter(Boolean) ?? [];
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
                "저장"
              )}
            </Button>
          </div>
        </form>
      </main>
    </>
  );
}

export default function EditMatchingPage() {
  const params = useParams();
  const matchId = params?.id as string | undefined;

  const { ready, isAuthenticated, shouldRedirect } =
    useRequireAuth("/login");
  const user = useAuthStore((s) => s.user);

  const {
    data: match,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => getMatchDetail(Number(matchId)),
    enabled: !!matchId && /^\d+$/.test(matchId ?? ""),
  });

  if (!ready || shouldRedirect || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!matchId || !/^\d+$/.test(matchId)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">잘못된 주소입니다.</p>
        <Link href="/matching">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !match) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">매칭을 불러오지 못했습니다.</p>
        <Link href="/matching">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    );
  }

  if (user?.id !== match.hostId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">방장만 수정할 수 있습니다.</p>
        <Link href={`/matching/${matchId}`}>
          <Button variant="outline">상세로</Button>
        </Link>
      </div>
    );
  }

  if (match.status !== "RECRUITING") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">
          모집 중인 매칭만 수정할 수 있습니다.
        </p>
        <Link href={`/matching/${matchId}`}>
          <Button variant="outline">상세로</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EditMatchFormInner match={match} matchId={matchId} />
    </div>
  );
}
