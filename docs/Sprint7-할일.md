# Sprint 7 할일 (마이페이지 보강 · 프론트엔드)

> **API 문서**: [common-docs/api/Sprint7-API.md](../common-docs/api/Sprint7-API.md)  
> **참조**: `docs/스프린트플래닝.md` Sprint 7, `docs/제품백로그.md` Epic 9, `docs/요구사항분석.md` (마이페이지·후기 공개 규칙)

---

## Sprint 7 개요

| 항목 | 내용 |
|------|------|
| **대상** | 프론트엔드(본 저장소: **Next.js 웹**) |
| **목표** | 마이페이지 **활동 집계·매칭 내역·후기 허브(작성함·작성 대기)** 를 Sprint 7 API와 연동하고, 기존 UI(`ActivitySummary`, 메뉴 라우트 등)와 정합시킨다. |
| **백로그** | B9-1 ~ B9-4 중 **Sprint7-API에 정의된 부분** (아래 [API·백로그 매핑](#api백로그-매핑)) |
| **범위 밖 (본 API 문서 미포함)** | 공지·고객센터(B9-5·B9-6), 계정 수명주기 API(B9-7) — **별도 API 전달·합의 후** 진행 (스프린트 플래닝 Sprint 7 전체 목표와의 갭은 [§ 갭 정리](#sprint7-api-대비-스프린트-목표-갭) 참고) |

---

## API·백로그 매핑

| Sprint7-API Step | 엔드포인트 / 변경 | 백로그 | 비고 |
|------------------|-------------------|--------|------|
| **Step 1** | `GET /api/users/me`에 `hostedMatchCount`, `participatedMatchCount` 추가 (본인만) | **B9-1** | 타인 `GET /api/users/{userId}`에는 **미포함** — 타입 분리·옵셔널 처리 |
| **Step 2** | `GET /api/users/me/matches/hosted` | **B9-2** | Spring `Page` — Sprint2 `MatchListResponse`와 동일 구조 |
| **Step 2** | `GET /api/users/me/matches/participated` | **B9-3** | 확정 참여(`ACCEPTED`)만; 방장 전용 매칭은 개설 목록에서만 |
| **Step 3** | `GET /api/users/me/reviews/written` | **B9-4** (일부) | 작성한 후기 목록 (`PageResponse`: items, page, …) |
| **Step 3** | `GET /api/users/me/reviews/pending` | **B9-4** (일부) | 미작성 후보; 작성은 기존 `POST /api/matches/{matchId}/reviews` + `revieweeId` |
| — | (Sprint7-API에 없음) **받은 후기** 목록·허브 요약 | **B9-4** (잔여) | 기존 프로필의 `receivedReviewCount` 등과 함께 **기존 Sprint 4 API**로 충족 가능한지 검토; 부족 시 백엔드 후속 스펙 필요 |

---

## A. 타입·API 클라이언트 (`src/lib/api.ts` 등)

| 순서 | 작업 | 상세 |
|------|------|------|
| A-1 | `Profile` / Me 전용 타입 | `hostedMatchCount`, `participatedMatchCount` 필드 추가. `GET /users/{id}` 응답 타입과 혼동 없이 **me 전용**으로 narrow |
| A-2 | 매칭 내역 | `hosted`·`participated` 호출 함수, 쿼리 파라미터 (`status`, `dateFrom`, `dateTo`, `page`, `size`). 응답은 Sprint2 목록과 동일하므로 **기존 `MatchListResponse` / 페이지 타입 재사용** 검토 |
| A-3 | 후기 목록 | `written`·`pending` 각각 `PageResponse` 파싱 (`items`, `totalElements`, `totalPages` 등). `WrittenReviewListItemResponse`, `PendingReviewItemResponse` 필드명 API와 일치 |
| A-4 | 에러·401 | 인증 필수 API — 토큰 없음·만료 시 기존 B7-2 패턴과 동일 처리 |

---

## B. 마이페이지 메인 (`/profile/me`)

| 순서 | 작업 | 상세 |
|------|------|------|
| B-1 | 활동 요약 숫자 | `ActivitySummary`에 `hostedCount` → **`hostedMatchCount`**, `joinedCount` → **`participatedMatchCount`** 를 `GET /api/users/me`에서 공급 (B9-1) |
| B-2 | 캐시 | 프로필 쿼리 키 `["profile","me"]` invalidate 정책: 프로필 수정·매칭/후기 액션 후 필요 시 갱신 |
| B-3 | 문구 정합 | 집계 정의: 개설 수는 **모든 상태(취소 포함)**; 참여 수는 **방장 매칭 ∪ ACCEPTED 참여, match_id 기준 중복 없음** — UI 툴팁/도움말은 제품 문구 수준으로만 (과도한 기술 설명 생략 가능) |

---

## C. 매칭 내역 화면 (`/matching/history` 등)

| 순서 | 작업 | 상세 |
|------|------|------|
| C-1 | 탭 또는 서브 라우트 | **개설** (`hosted`) / **참여** (`participated`) 구분. 스프린트 플래닝·메뉴 라벨「매칭 내역」과 일치 |
| C-2 | 목록 UI | 기존 매칭 카드·목록 컴포넌트(`match-card` 등) 재사용 가능하면 재사용. 빈 목록·로딩·에러 상태 |
| C-3 | 필터 | `status`, `dateFrom`, `dateTo` — 백엔드 `MatchStatus`·날짜 형식(`yyyy-MM-dd`) 맞춤 |
| C-4 | 페이징 | `page`/`size` (기본 0, 20). 무한 스크롤 vs 페이지 버튼은 기존 앱 패턴 따름 |
| C-5 | 상세 이동 | 행/카드 클릭 시 `/matching/{id}` 등 기존 상세 경로로 이동 |

---

## D. 후기 관리 (`/reviews`)

| 순서 | 작업 | 상세 |
|------|------|------|
| D-1 | 작성한 후기 | `GET .../reviews/written` 목록. **작성자 본인 조회**이므로 마스킹 규칙 미적용 — 내용·피평가자 항상 표시 (API 스펙 그대로) |
| D-2 | 작성 대기 | `GET .../reviews/pending` 목록. 정렬: `match_id` 내림차순 등은 서버 책임 — 클라이언트는 표시 순서 신뢰 |
| D-3 | 후기 작성 이동 | 항목에서 **후기 작성** 시 `POST /api/matches/{matchId}/reviews`, body에 응답의 `revieweeId` 사용. 기존 후기 작성 UI·폼과 연결 (Sprint 4 플로 재사용) |
| D-4 | 받은 후기 | B9-4의「받은 후기」는 **Sprint7-API Step 3에 목록 API 없음**. 마이페이지 `ReceivedReviewsSummary` 등은 **기존 유저 프로필/후기 조회 API**로 유지하거나, 링크를 `/profile/me` 또는 타인 프로필 규칙에 맞게 조정 — **백엔드 추가 스펙 시** 목록 화면 보강 |
| D-5 | 후기 허브 내비 | 「작성함 / 작성 대기 / 받은 후기(가능한 범위)」 정보 구조가 한눈에 들어오도록 탭·섹션 구성 |

---

## E. 테스트·완료 조건

| 순서 | 작업 | 상세 |
|------|------|------|
| E-1 | 수동 시나리오 | 로그인 → 마이페이지 집계 숫자가 백엔드와 동일한지 샘플 계정으로 확인 |
| E-2 | 내역 필터 | 상태·기간 필터 조합 후 URL/상태 유지 정책(필요 시) |
| E-3 | E2E (선택) | `/profile/me`, `/matching/history`, `/reviews` 주요 진입·목록 로드 (Playwright 등 기존 Sprint 6 방침 따름) |

### Sprint 7 (본 문서 범위) 완료 체크리스트

- [ ] `GET /api/users/me` 집계 필드가 마이페이지 **활동 요약**에 반영됨 (B9-1)
- [ ] **개설·참여** 매칭 내역이 각 API로 조회·표시됨 (B9-2, B9-3)
- [ ] **작성한 후기**·**작성 대기**가 각각 API와 연동되고, 대기 항목에서 기존 후기 작성 API로 이어짐 (B9-4 일부)
- [ ] 인증 필요 엔드포인트에 Bearer 토큰이 일관되게 붙음 (B7-2 연속)

---

## Sprint7-API 대비 스프린트 목표 갭

`docs/스프린트플래닝.md` Sprint 7에는 **공지(B9-5)·고객센터(B9-6)·계정 API(B9-7)** 가 포함되어 있다. 현재 전달된 **Sprint7-API.md**는 **마이페이지 보강(프로필 집계·매칭 내역·후기 written/pending)** 에 한정된다.

| 항목 | 상태 | 권장 다음 액션 |
|------|------|----------------|
| B9-5 공지 | API 문서 미수신 | 공지 API 스펙 또는 정적/웹뷰 URL 합의 후 `/notice` 연동 |
| B9-6 고객센터 | API 문서 미수신 | FAQ·약관 링크 정책(정적 페이지 vs API) 합의 |
| B9-7 계정 | API 문서 미수신 | 탈퇴·연동 정보 `GET` 등 스펙 수신 후 `/account` 연동 |
| B9-4 받은 후기 | Sprint7 Step 3에 목록 없음 | 프로필·기존 후기 API로 커버 여부 검토 또는 백엔드 보강 요청 |

---

## 직접 설정·팀 협업

- **Base URL**: `NEXT_PUBLIC_API_BASE_URL` (프로젝트 규칙과 동일)
- **Sprint2 매칭 목록 스펙**: 페이징 필드명(`content` vs `items`)이 Spring `Page` 그대로인지, 래핑 여부는 **Sprint2-API.md·실제 응답**과 한 번 더 대조
- **후기 `PageResponse`**: 매칭 내역의 Spring `Page`와 필드명이 다름 — 파서 분리 유지
