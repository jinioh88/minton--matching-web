import { expect, test } from "@playwright/test";

test.describe("Sprint6 smoke", () => {
  test("로그인 페이지가 열린다", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "배드민턴 매칭" })
    ).toBeVisible();
  });

  test("채팅 목록 라우트가 응답한다 (비로그인 안내)", async ({ page }) => {
    await page.goto("/chat");
    await expect(
      page.getByText(/로그인 후 채팅 목록을 확인할 수 있습니다/)
    ).toBeVisible();
  });
});
