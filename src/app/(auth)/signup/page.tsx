"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { REGIONS } from "@/lib/regions";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const signupSchema = z.object({
  nickname: z
    .string()
    .min(1, "닉네임을 입력해 주세요")
    .max(30, "닉네임은 최대 30자까지 가능합니다"),
  interestLoc1: z.string().min(1, "관심 지역을 선택해 주세요"),
  interestLoc2: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(
    null
  );
  const [checkingNickname, setCheckingNickname] = useState(false);

  const hasHydrated = useHasHydrated();
  const { ready, shouldRedirect } = useRequireAuth("/login");
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated || !ready) return;
    if (isAuthenticated && user?.profileComplete) {
      router.replace("/");
    }
  }, [hasHydrated, ready, isAuthenticated, user?.profileComplete, router]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      nickname: "",
      interestLoc1: "",
      interestLoc2: "",
    },
  });

  const nickname = watch("nickname");

  const checkNickname = useCallback(async () => {
    if (!nickname || nickname.length < 1) return;
    setCheckingNickname(true);
    setNicknameAvailable(null);
    try {
      const res = await apiClient.get("/users/check-nickname", {
        params: { nickname },
      });
      setNicknameAvailable(res.data.data?.available ?? false);
      if (!res.data.data?.available) {
        setError("nickname", { message: "이미 사용 중인 닉네임입니다" });
      } else {
        clearErrors("nickname");
      }
    } catch {
      setNicknameAvailable(null);
    } finally {
      setCheckingNickname(false);
    }
  }, [nickname, setError, clearErrors]);

  const onSubmit = async (data: SignupFormData) => {
    if (nicknameAvailable !== true) {
      setError("nickname", {
        message: "닉네임 중복 확인을 해 주세요",
      });
      return;
    }

    try {
      const res = await apiClient.patch("/users/me", {
        nickname: data.nickname,
        interestLoc1: data.interestLoc1,
        interestLoc2: data.interestLoc2 || undefined,
      });

      const updatedUser = res.data.data;
      useAuthStore.getState().setAuth(
        {
          id: updatedUser.id,
          nickname: updatedUser.nickname,
          profileImg: updatedUser.profileImg,
          profileComplete: true,
        },
        useAuthStore.getState().accessToken
      );

      router.replace("/");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError("root", {
        message:
          axiosErr.response?.data?.message || "프로필 저장에 실패했습니다",
      });
    }
  };

  if (!hasHydrated || !ready || shouldRedirect || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">프로필 입력</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            서비스 이용을 위해 필수 정보를 입력해 주세요
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium">
              닉네임 <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                id="nickname"
                placeholder="닉네임 (최대 30자)"
                maxLength={30}
                error={!!errors.nickname}
                {...register("nickname", {
                  onChange: () => setNicknameAvailable(null),
                })}
              />
              <Button
                type="button"
                variant="outline"
                onClick={checkNickname}
                disabled={!nickname || checkingNickname}
              >
                {checkingNickname ? "확인 중" : "중복 확인"}
              </Button>
            </div>
            {nicknameAvailable === true && (
              <p className="text-sm text-green-600">사용 가능한 닉네임입니다</p>
            )}
            {errors.nickname && (
              <p className="text-sm text-destructive">{errors.nickname.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="interestLoc1" className="text-sm font-medium">
              관심 지역 1 <span className="text-destructive">*</span>
            </label>
            <select
              id="interestLoc1"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("interestLoc1")}
            >
              <option value="">시/군/구 선택</option>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.interestLoc1 && (
              <p className="text-sm text-destructive">
                {errors.interestLoc1.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="interestLoc2" className="text-sm font-medium">
              관심 지역 2 (선택)
            </label>
            <select
              id="interestLoc2"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("interestLoc2")}
            >
              <option value="">시/군/구 선택</option>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "저장 중..." : "완료"}
          </Button>
        </form>
      </div>
    </div>
  );
}
