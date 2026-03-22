# Sprint 4 할일 (프론트엔드)

> 참조: `common-docs/api/Sprint4-API.md`, `common-docs/api/Sprint3-API.md` (§7-1 모임 취소), `docs/스프린트플래닝.md`, `docs/요구사항분석.md`, `docs/제품백로그.md`

## Sprint 4 개요

| 항목 | 내용 |
|------|------|
| **대상** | 프론트엔드 개발자 |
| **목표** | 모임 종료(FINISHED), 후기 작성·조회(공개·마스킹), 패널티 부여·이력, 프로필 제재·후기 지표 연동이 end-to-end로 동작한다 |
| **API 문서** | `common-docs/api/Sprint4-API.md` |
| **백로그** | B5-1, B5-2, B5-3, B5-4, B5-5 (Epic 5: 후기 및 패널티) |

---

## 완료 조건 (Definition of Done)

- [ ] 매칭이 **CLOSED → FINISHED** 되면(방장 수동 종료 또는 서버 자동 종료) 후기·패널티 플로우가 가능하다
- [ ] 방장은 조건 충족 시 **[모임 종료]** 로 수동 종료할 수 있다 (`canFinishMatch`, `PATCH .../finish`)
- [ ] 확정 참여자는 **FINISHED** 후 `reviewPendingUserIds` 기준으로 후기를 작성할 수 있다
- [ ] 유저 프로필에서 **받은 후기 목록**을 조회할 수 있고, 비로그인·유예·양방향 후기 규칙에 따라 **마스킹**이 반영된다
- [ ] 방장은 **FINISHED** 후 **노쇼/지각** 패널티를 부여할 수 있다
- [ ] 프로필에 **패널티 이력·주의 배지·받은 후기 수** 등 Sprint 4 확장 필드가 반영된다
- [ ] 참여 신청 시 **참여 제한·정지·영구 제재** 에러가 사용자에게 설명 가능하게 처리된다
- [ ] **모임 전체 취소**는 `PATCH` 본문 `status: CANCELLED`가 아닌 **전용 취소 API**로만 호출한다 (아래 § 모임 취소 API 변경)

---

## Sprint 3 연동: 모임 취소 API 변경 (필수)

**모임 취소는 `PATCH /api/matches/{matchId}` 본문의 `status: CANCELLED`가 아니라 전용 API를 사용합니다.** (`Sprint3-API.md` §7-1)

| 메서드 | 경로 | 본문 | 설명 |
|--------|------|------|------|
| **PATCH** | `/api/matches/{matchId}/cancel` | 없음 | 방장만. 허용 상태: **RECRUITING**, **CLOSED**. **FINISHED** 등에서는 불가 |

| 전제 | 설명 |
|------|------|
| 멱등 | 이미 **CANCELLED**이면 200·동일 응답 |

**에러**

| 코드 | 설명 |
|------|------|
| INVALID_MATCH_STATUS | 종료(FINISHED) 후 취소 시도 등 |
| FORBIDDEN | 방장 아님 |

### 할일 (취소 마이그레이션)

| 순서 | 작업 | 상세 |
|------|------|------|
| C-1 | API 함수 | `cancelMatch(matchId)` → `PATCH /api/matches/{matchId}/cancel` (body 없음) |
| C-2 | 기존 코드 제거·교체 | 매칭 취소 UI가 `updateMatch(..., { status: 'CANCELLED' })` 등으로 호출 중이면 **전부** `cancelMatch`로 변경 |
| C-3 | 매칭 수정(PATCH) | `PATCH /api/matches/{matchId}`는 **필드 수정·CLOSED 전환** 등 문서 정책에 맞게만 사용. 취소는 별도 엔드포인트만 사용 |
| C-4 | 에러 처리 | INVALID_MATCH_STATUS, FORBIDDEN → 토스트/다이얼로그 메시지 |
| C-5 | 성공 후 | 매칭 상세·목록 쿼리 무효화(invalidateQueries), 상세에서 CANCELLED 상태 UI |

---

## Sprint 4 API 요약

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| PATCH | `/api/matches/{matchId}/finish` | **필요** | 수동 종료 (방장, CLOSED → FINISHED) |
| POST | `/api/matches/{matchId}/reviews` | **필요** | 후기 작성 |
| GET | `/api/users/{userId}/reviews` | 선택 (`IfLogin`) | 받은 후기 목록 (`PageResponse`, 마스킹 규칙) |
| POST | `/api/matches/{matchId}/penalties` | **필요** | 패널티 부여 (방장, FINISHED) |
| GET | `/api/users/{userId}/penalties` | 불필요 | 받은 패널티 이력 (`PageResponse`) |
| GET | `/api/users/me` | **필요** | 내 프로필 (제재·후기 건수 등 Step 8 확장) |
| GET | `/api/users/{userId}` | 불필요 | 타인 프로필 (제약 시각 미포함) |

**매칭 상세 `GET /api/matches/{matchId}` Sprint 4 확장 (항상 포함)**

| 필드 | 설명 |
|------|------|
| `canFinishMatch` | 로그인 사용자가 방장이고 CLOSED이며, `require-past-start-for-manual-finish`가 true면 경기 시작 시각이 현재 이전(또는 동시)일 때만 true. `PATCH .../finish`와 동일 판정 |
| `reviewPendingUserIds` | FINISHED이고 로그인 사용자가 확정 참여자일 때, 본인 제외·아직 후기 안 쓴 상대 `userId` 목록 (방장 → ACCEPTED 순). 그 외 `[]` |

**페이징**: 후기·패널티 목록은 Spring `Page`가 아니라 **`PageResponse`** (`items`, `page`, `pageSize`, `totalElements`, `totalPages`, `first`, `last`). 쿼리: `?page=0&size=20`.

**자동 FINISHED**: 서버 배치 스케줄러. 프론트는 상세/목록 갱신으로 상태 반영만 하면 됨.

**보류 (Step 9)**: `GET /api/reviews/hashtag-suggestions` — 이번 스프린트 범위 밖.

---

## 참여 신청 연동 (`POST .../participants`)

백엔드가 사용자 상태를 검사한다. 프론트는 아래 코드를 매칭·신청 플로우에서 처리한다.

| 순서 | 조건 | 코드 |
|------|------|------|
| 1 | 영구 제재 | `USER_BANNED` |
| 2 | 정지 기간 중 | `USER_SUSPENDED` |
| 3 | 참여 제한 기간 중 | `USER_PARTICIPATION_BANNED` |

---

## Phase 1: 타입 및 API 함수

### 공통 타입

| 타입 | 용도 |
|------|------|
| `PageResponse<T>` | `items`, `page`, `pageSize`, `totalElements`, `totalPages`, `first`, `last` |
| 후기 작성 요청 | `revieweeId`, `sentiment`(NEGATIVE/NEUTRAL/POSITIVE), `score`(1~5), `hashtags?`(코드명 최대 10), `detail?`(최대 2000자) |
| 패널티 요청 | `userId`, `type`(NO_SHOW / LATE) |

### `MatchDetail` (또는 동등 타입) 확장

| 필드 | 타입 | 설명 |
|------|------|------|
| `canFinishMatch` | boolean | 모임 종료 버튼 노출 |
| `reviewPendingUserIds` | number[] | 후기 미작성 대상 (FINISHED·확정 참여자 시) |

### API 함수 (`lib/api.ts` 등)

| 순서 | 작업 | 함수 예시 |
|------|------|-----------|
| 1-1 | 수동 종료 | `finishMatch(matchId)` → PATCH `/api/matches/{matchId}/finish` |
| 1-2 | 후기 작성 | `createReview(matchId, body)` → POST `/api/matches/{matchId}/reviews` |
| 1-3 | 받은 후기 목록 | `getUserReviews(userId, page?, size?)` → GET `/api/users/{userId}/reviews` |
| 1-4 | 패널티 부여 | `createPenalty(matchId, body)` → POST `/api/matches/{matchId}/penalties` |
| 1-5 | 패널티 이력 | `getUserPenalties(userId, page?, size?)` → GET `/api/users/{userId}/penalties` |
| 1-6 | 프로필 | 기존 `GET /api/users/me`, `GET /api/users/{userId}` 응답 타입에 Sprint 4 필드 반영 |
| 1-7 | **모임 취소** | `cancelMatch(matchId)` → PATCH `/api/matches/{matchId}/cancel` (§ 모임 취소 API 변경) |
| 1-8 | 에러 매핑 | REVIEW_*, DUPLICATE_*, INVALID_PENALTY_*, USER_* 등 사용자 메시지 |

### 프로필 확장 필드 (문서 기준)

| 필드 | 본인 (`/me`) | 타인 |
|------|----------------|------|
| `participationBannedUntil` | 포함 | **미포함** |
| `suspendedUntil` | 포함 | **미포함** |
| `accountStatus` | ACTIVE / SUSPENDED / BANNED | **미포함** |
| `showCautionBadge` | 포함 | 포함 (`penaltyCount` 임계 미만 구간) |
| `receivedReviewCount` | 포함 | 포함 |

---

## Phase 2: 매칭 상세 — 종료·FINISHED UI

| 순서 | 작업 | 상세 |
|------|------|------|
| 2-1 | 종료 버튼 | `canFinishMatch === true`일 때만 [모임 종료] 노출, 클릭 시 `finishMatch` |
| 2-2 | 종료 후 | 응답 `status: FINISHED` 반영, 후기/패널티 섹션 진입 가능하도록 쿼리 갱신 |
| 2-3 | FINISHED 표시 | 목록·상세에서 종료된 모임 라벨·비활성 액션(참여 신청 등) 정리 |
| 2-4 | 에러 | INVALID_MATCH_STATUS, FORBIDDEN — 수동 종료 조건 불충족 시 메시지 |
| 2-5 | 후기 배너/진입 | `reviewPendingUserIds.length > 0`이면 "후기를 남겨주세요" 등 CTA → 후기 작성 플로우 |

---

## Phase 3: 후기 작성 화면

요구사항·백로그: 3단계 감정(좋아요 계열), 점수, 해시태그(열정·매너 등 코드명), 상세 텍스트.

| 순서 | 작업 | 상세 |
|------|------|------|
| 3-1 | 대상 선택 | `reviewPendingUserIds` 또는 확정 참여자 목록에서 피평가자 선택 (`revieweeId`) |
| 3-2 | 입력 폼 | `sentiment`, `score`(1~5), `hashtags`(PASSION, MANNER, KINDNESS, EXPERT, PUNCTUAL, TEAM_PLAY 등 문서 코드), `detail` |
| 3-3 | 검증 | 클라이언트에서 길이·개수 제한 선제 검증 |
| 3-4 | 제출 | `createReview` 성공 시 매칭 상세 무효화 → `reviewPendingUserIds`에서 해당 user 제거 반영 |
| 3-5 | 에러 | REVIEW_NOT_ALLOWED, SELF_REVIEW_NOT_ALLOWED, DUPLICATE_REVIEW, USER_SUSPENDED, USER_BANNED, BAD_REQUEST |

---

## Phase 4: 후기 목록(프로필·타인)

| 순서 | 작업 | 상세 |
|------|------|------|
| 4-1 | API 연동 | `getUserReviews` + `PageResponse` 무한 스크롤 또는 페이지네이션 |
| 4-2 | `contentRevealed` | false일 때 `reviewer`, `sentiment`, `score`, `hashtags`, `detail` 생략(null) — 카드에 "비공개" 등 안내 |
| 4-3 | 로그인 여부 | 비로그인 조회 시 항상 마스킹. 로그인 시 문서의 유예·양방향 후기 규칙에 따름 |
| 4-4 | 빈 목록 | 받은 후기 없음 UI |

---

## Phase 5: 패널티 (방장)

| 순서 | 작업 | 상세 |
|------|------|------|
| 5-1 | 진입 조건 | 매칭 `FINISHED` + 방장만 [패널티] 또는 참여자 행 메뉴 |
| 5-2 | 대상 | ACCEPTED 참여자만, 방장 본인 제외 |
| 5-3 | 유형 선택 | NO_SHOW / LATE → `createPenalty` |
| 5-4 | 중복 방지 | DUPLICATE_PENALTY 안내 |
| 5-5 | 에러 | INVALID_MATCH_STATUS, INVALID_PENALTY_TARGET, FORBIDDEN |

---

## Phase 6: 패널티 이력·프로필 UI

| 순서 | 작업 | 상세 |
|------|------|------|
| 6-1 | 타인 프로필 | `getUserPenalties`로 이력 목록(선택 탭 또는 섹션) |
| 6-2 | 본인 마이페이지 | `participationBannedUntil`, `suspendedUntil`, `accountStatus` 표시(본인만) |
| 6-3 | 주의 배지 | `showCautionBadge` 노출 정책 반영 |
| 6-4 | 후기 수 | `receivedReviewCount` 표시, 호스트 요약 등 기존 별점(`ratingScore`)과 정합 |

---

## Phase 7: 에러·상태 통합

| 순서 | 작업 | 상세 |
|------|------|------|
| 7-1 | 참여 신청 | USER_PARTICIPATION_BANNED, USER_SUSPENDED, USER_BANNED 메시지·재시도 불가 안내 |
| 7-2 | 후기 작성 | 정지·밴 시 USER_SUSPENDED / USER_BANNED 구분 |
| 7-3 | 매칭 상세 | CANCELLED / FINISHED / CLOSED에 따른 버튼 노출 일관성 (취소는 `cancelMatch`만) |

---

## Enum·에러 코드 참조 (Sprint 4 문서)

| 코드 | HTTP | 용도 |
|------|------|------|
| INVALID_MATCH_STATUS | 400 | 종료/상태 전이 불가 등 |
| REVIEW_NOT_ALLOWED | 400 | 후기 작성 조건 불충족 |
| SELF_REVIEW_NOT_ALLOWED | 400 | 본인 후기 |
| DUPLICATE_REVIEW | 400 | 중복 후기 |
| USER_NOT_FOUND | 404 | 피평가자 없음 |
| INVALID_PENALTY_TARGET | 400 | 패널티 대상 불가 |
| DUPLICATE_PENALTY | 400 | 패널티 중복 |
| USER_PARTICIPATION_BANNED | 400 | 참여 신청 제한 |
| USER_SUSPENDED | 403 | 정지 중 쓰기 |
| USER_BANNED | 403 | 영구 제재 |

---

## 권장 진행 순서

```
§ 모임 취소 API 변경(C-1~C-5) → Phase 1 → Phase 2 → Phase 3 → Phase 4
  → Phase 5 → Phase 6 → Phase 7
```

취소 API는 Sprint 3 잔여·회귀와 겹치므로 **후기 작업 전에** 반영하는 것을 권장한다.

---

## 체크리스트 (스프린트 종료 전)

- [ ] `PATCH .../cancel`로 모임 취소, `status: CANCELLED` PATCH 본문 사용 없음
- [ ] `canFinishMatch` 기준 [모임 종료] 및 `finishMatch` 연동
- [ ] FINISHED 후 `reviewPendingUserIds` 기반 후기 작성
- [ ] 후기 목록 `PageResponse`·`contentRevealed` 마스킹 UI
- [ ] 방장 패널티 부여 UI 및 에러 처리
- [ ] 패널티 이력 목록(프로필)
- [ ] `/me`·타인 프로필 Sprint 4 필드 반영 및 제재·주의 배지
- [ ] 참여 신청 시 USER_PARTICIPATION_BANNED / USER_SUSPENDED / USER_BANNED 처리

---

## 요구사항·기획 매핑 (참고)

| 출처 | 내용 |
|------|------|
| `docs/스프린트플래닝.md` Sprint 4 | 후기 작성·조회, 패널티 체크·이력, 모임 종료 후 후기 |
| `docs/요구사항분석.md` | 모임 종료 후 특정인 후기, 3단계 좋아요·점수·해시태그, 방장 노쇼/지각 패널티, 프로필에 후기·패널티 노출 |
| `docs/제품백로그.md` B5-1~B5-5 | 후기 작성/입력 항목/조회, 패널티 부여·조회 |
