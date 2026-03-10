"use client";

import { apiClient } from "@/lib/api";
import { useEffect, useState } from "react";

export default function ApiTestPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get("/health")
      .then((res) => {
        setData(res.data);
        setStatus("success");
      })
      .catch((err) => {
        setError(err.message || "연결 실패");
        setStatus("error");
      });
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-4 text-2xl font-bold">백엔드 API 연동 테스트</h1>
      <p className="mb-4 text-gray-600">
        GET /api/health 호출 결과 (백엔드가 실행 중이어야 합니다)
      </p>

      {status === "loading" && <p>연결 중...</p>}
      {status === "success" && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="font-medium text-green-800">✅ 연결 성공</p>
          <pre className="mt-2 overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="font-medium text-red-800">❌ 연결 실패</p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-2 text-xs text-gray-600">
            CORS, 백엔드 실행 여부, .env.local의 NEXT_PUBLIC_API_BASE_URL 확인
          </p>
        </div>
      )}
    </div>
  );
}
