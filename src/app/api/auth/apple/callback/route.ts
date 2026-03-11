import { NextRequest, NextResponse } from "next/server";

/**
 * Apple Sign In은 response_mode=form_post 사용
 * Apple이 POST로 code를 전달하므로, 여기서 수신 후 /oauth/callback으로 리다이렉트
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const code = formData.get("code") as string | null;
    const state = formData.get("state") as string | null;

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Apple 로그인: code 또는 state가 없습니다.")}`,
          request.url
        )
      );
    }

    const baseUrl = new URL(request.url).origin;
    const redirectUrl = new URL("/oauth/callback", baseUrl);
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", state);

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Apple 로그인 처리 중 오류가 발생했습니다.")}`,
        request.url
      )
    );
  }
}
