import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-3xl font-bold">🏸 배드민턴 매칭</h1>
      <p className="text-gray-600">누구나 자유롭게 배드민턴을 매칭해서 치는 문화</p>
      <Link
        href="/profile/me"
        className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
      >
        마이페이지
      </Link>
    </main>
  );
}
