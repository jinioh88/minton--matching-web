/** GET /api/matches 의 `level` — Sprint2-API: 쉼표 구분, OR, 대소문자 무시·trim (백엔드 처리) */

const ALLOWED = new Set(["A", "B", "C", "D", "BEGINNER"]);

/** URL·초기 state용: 허용 토큰만 순서 유지하며 중복 제거 */
export function parseMatchListLevelParam(
  param: string | null | undefined
): string[] {
  if (!param?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of param.split(",")) {
    const t = raw.trim().toUpperCase();
    if (!ALLOWED.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** 쿼리스트링·API param: 안정적인 정렬 (가독성) */
export function serializeMatchListLevelParam(levels: string[]): string {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of levels) {
    const t = raw.trim().toUpperCase();
    if (!ALLOWED.has(t) || seen.has(t)) continue;
    seen.add(t);
    normalized.push(t);
  }
  normalized.sort();
  return normalized.join(",");
}
