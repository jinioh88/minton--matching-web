# Sprint 8 할일 — 친구(팔로우) · 소셜 활동 알림 (프론트엔드)

> **API 문서**: [common-docs/api/Sprint8-API.md](../common-docs/api/Sprint8-API.md)  
> **알림 공통·STOMP·FCM**: [common-docs/api/Sprint5-API.md](../common-docs/api/Sprint5-API.md) §4, [common-docs/api/Sprint6-API.md](../common-docs/api/Sprint6-API.md) §12  
> **참조**: `docs/스프린트플래닝.md` Sprint 8, `docs/제품백로그.md` Epic 10 (B2-7~B2-10), `docs/요구사항분석.md` 「친구 및 활동 알림」

---

## Sprint 8 개요

| 항목 | 내용 |
|------|------|
| **대상** | 프론트엔드(본 저장소: **Next.js 웹**) |
| **목표** | 단방향 팔로우(친구 추가·목록·언팔)를 Sprint 8 REST와 연동하고, 친구 활동 알림 타입(`FRIEND_CREATED_MATCH`, `FRIEND_CONFIRMED_PARTICIPATION`)을 타입·UI에 반영한다. 알림 탭 시 **`relatedMatchId`** 로 매칭 상세(`/matching/[id]`) 이동은 요구사항 §2.4·API §3.3과 일치시킨다. |
| **백로그** | **B2-7** ~ **B2-10** (Epic 10) |
| **모델 정리** | “친구” = **내가 팔로우한 사용자**(`follower_id` = 나, `following_id` = 상대). 상대의 팔로워 목록에 나를 노출하는 **상호 맞팔 API는 없음**. |

---

## API·백로그 매핑

| Sprint8-API | 메서드·경로 | 백로그 | 비고 |
|-------------|-------------|--------|------|
| §2.1 | `POST /api/users/me/friendships` | **B2-7** | Body: `followingUserId` — `GET /api/users/{userId}` 의 `userId` 와 동일 |
| §2.2 | `GET /api/users/me/friendships` | **B2-8** | `FollowingUserResponse[]`, 최근 팔로우가 앞(역순) |
| §2.3 | `DELETE /api/users/me/friendships/{followingUserId}` | **B2-8** | 언팔로우; 404 `FRIENDSHIP_NOT_FOUND` |
| §3 | 알림 파이프라인·`NotificationType` 확장 | **B2-9** | 기존 `NotificationService` · STOMP `/user/queue/notifications` · (설정 시) FCM |
| §3.3 | `relatedMatchId` 필수, `FRIEND_CONFIRMED_PARTICIPATION` 에 `relatedParticipantId` 선택 | **B2-10** | 웹: `router.push(\`/matching/${relatedMatchId}\`)` — 이미 `relatedMatchId` 가 있으면 동일 패턴 재사용 |

**에러 코드 (표시·토스트용)**: `FRIENDSHIP_SELF_NOT_ALLOWED`, `FRIENDSHIP_ALREADY_EXISTS`, `USER_NOT_FOUND`, `FRIENDSHIP_NOT_FOUND` 등 — 공통 `ApiResponse` / `ErrorResponse` 규칙은 README·기존 `api.ts` 패턴과 동일.

---

## A. 타입·API 클라이언트 (`src/types/*`, `src/lib/api.ts` 등)

| 순서 | 작업 | 상세 |
|------|------|------|
| A-1 | `FollowingUserResponse` | API 표: `userId`, `nickname`, `profileImg`, `level`, `followedAt`. `Level` 은 기존 프로필 Enum과 동일하게 매핑 |
| A-2 | `POST .../friendships` | `{ followingUserId: number }` — 성공 시 `FollowingUserResponse` (또는 래핑 규칙에 따른 `data`) |
| A-3 | `GET .../friendships` | 배열 파싱; 빈 배열 허용 |
| A-4 | `DELETE .../friendships/{followingUserId}` | 성공 시 `data` 가 `null` 일 수 있음 (`success: true`) |
| A-5 | `NotificationType` 확장 | `FRIEND_CREATED_MATCH`, `FRIEND_CONFIRMED_PARTICIPATION` 추가 ([Sprint5 §4.3](../common-docs/api/Sprint5-API.md) 통합 Enum과 동기) |
| A-6 | `NotificationResponse` | 기존 필드 유지; 소셜 타입에서도 **`relatedMatchId` 필수**, `relatedParticipantId` 는 두 번째 타입에서 채워질 수 있음 — 타입은 이미 옵셔널이면 그대로 활용 |
| A-7 | STOMP 페이로드 | `src/types/stomp.ts` 등 — 실시간 페이로드에도 동일 `type`·`relatedMatchId` 반영 시 기존 invalidate 쿼리 패턴 유지 |

---

## B. 타인 프로필 — 팔로우 추가 (B2-7)

| 순서 | 작업 | 상세 |
|------|------|------|
| B-1 | 진입점 | `docs/스프린트플래닝.md`: 매칭 내역·기타 경로에서 **`/profile/[userId]`** 진입 후 추가. 기존 타인 프로필 페이지(`src/app/profile/[userId]/page.tsx`)에 액션 배치 |
| B-2 | 팔로우 버튼 | 로그인 사용자만 표시; 본인 페이지는 기존처럼 `/profile/me` 로 리다이렉트되므로 제외 |
| B-3 | **이미 팔로우 여부** | API에 “단건 조회” 없음 → `GET .../friendships` 결과에 현재 `userId` 가 있는지로 판단하거나, 목록 쿼리 키(예: `["friendships","me"]`)를 공유해 캐시 조회. 성능·UX에 따라 프로필 마운트 시 목록 일부만이 아니라 **필요 시 전체 또는 서버 페이징이 생기면** 정책 재검토 |
| B-4 | `POST` 성공 | 캐시 invalidate 또는 optimistic update; 버튼을 “팔로우 중” / “언팔로우” 로 전환할지는 **B2-8 목록·언팔 흐름**과 맞출 것 |
| B-5 | 에러 UX | 이미 팔로우(`FRIENDSHIP_ALREADY_EXISTS`), 본인(`FRIENDSHIP_SELF_NOT_ALLOWED`), 없는 유저(`USER_NOT_FOUND`) — 사용자용 문구로 `getParticipationErrorMessage` 확장 또는 전용 매핑 |

---

## C. 친구(팔로잉) 목록 · 관리 (B2-8)

| 순서 | 작업 | 상세 |
|------|------|------|
| C-1 | 라우트 | 예: `/profile/me/friends` (스프린트 플래닝의 “친구 목록 페이지”). `ProfileMenu`(`src/components/profile/profile-menu.tsx`)에 **「팔로잉」/「친구」** 등 레이블로 링크 추가 |
| C-2 | 목록 UI | `GET .../friendships` 로 카드/행 렌더; `nickname` 없을 때 표시 정책은 서버와 동일하게 **「회원」** 등 제품 문구로 통일 가능 |
| C-3 | 프로필 이동 | 행 클릭 시 `/profile/{userId}` |
| C-4 | 언팔로우 | 행마다 `DELETE .../friendships/{followingUserId}` 또는 확인 후 실행; 성공 시 목록 refetch |
| C-5 | 빈 상태 | 팔로우한 사용자가 없을 때 안내 문구 (요구사항·백로그 톤에 맞게) |

---

## D. 알림 — 소셜 타입 표시·이동 (B2-9, B2-10)

| 순서 | 작업 | 상세 |
|------|------|------|
| D-1 | 목록·미리보기 | `src/app/notifications/page.tsx`, `notifications-nav-link.tsx` — 새 `type` 이 와도 **title/body** 는 서버 문자열 그대로 표시하면 됨 (§3.4 패턴 참고) |
| D-2 | 딥링크 | `relatedMatchId != null` 이면 기존과 동일하게 `router.push(\`/matching/${relatedMatchId}\`)` — **추가 분기 필수 아님**. 다만 타입 unions· exhaustiveness(선택)로 누락 방지 |
| D-3 | `relatedParticipantId` | 매칭 상세에서만 의미 있으면 **이번 스프린트에서 UI 노출 생략 가능**; 필요 시 추후 참여자 하이라이트 등으로 확장 |
| D-4 | 실시간 | `src/contexts/stomp-context.tsx` — 기존처럼 알림 수신 시 `notifications` 관련 쿼리 invalidate 유지 (Epic 6 B6-8 프론트 잔여와 연계) |

---

## E. 테스트·완료 조건

| 순서 | 작업 | 상세 |
|------|------|------|
| E-1 | 팔로우 E2E | 계정 A가 계정 B 프로필에서 팔로우 → B가 매칭 생성 또는 참여 확정 시 A에게 알림(백엔드·팔로우 관계 전제) |
| E-2 | 딥링크 | 소셜 알림 클릭 → `/matching/[id]` 에서 올바른 매칭 로드 |
| E-3 | 예외 | 중복 팔로우·언팔(없는 관계)·본인 팔로우 시 메시지 확인 |
| E-4 | E2E (선택) | Playwright 등 기존 Sprint 6 방침 — `/profile/[id]`, `/profile/me/friends`, `/notifications` |

### Sprint 8 완료 체크리스트

- [ ] 타인 프로필에서 **`followingUserId`** 로 팔로우 API 연동 (B2-7)
- [ ] 마이페이지 메뉴에서 팔로잉 목록 조회·프로필 이동·언팔로우 (B2-8)
- [ ] `NotificationType` 에 소셜 두 값 반영; 목록·벨 미리보기에서 표시 (B2-9)
- [ ] `relatedMatchId` 로 매칭 상세 이동이 요구사항 §2.4 와 일치 (B2-10)
- [ ] Bearer 인증·401 처리 기존 패턴과 일관

---

## 연계·갭

| 항목 | 설명 |
|------|------|
| **Epic 6 (B6-6~B6-8)** | 수락/거절·모임 취소 알림 표시, FCM·STOMP 전 구간 프론트는 별도 잔여. Sprint 8 소셜 알림은 **동일 알림 인프라**를 타므로, 타입만 확장해도 폴링·STOMP가 이미 붙어 있으면 연동 부담이 적음. |
| **용어** | 제품 문구에서 “친구” vs “팔로잉” — 요구사항은 단방향 Follow; UI 라벨은 팀 합의로 통일. |
| **API 문서 상 할일 경로** | Sprint8-API.md 상단은 `docs/할일/Sprint8-할일.md` 를 가리키나, 본 저장소 스프린트 할일 관례는 **`docs/Sprint8-할일.md`** 이다. |

---

## 직접 설정·팀 협업

- **Base URL**: `NEXT_PUBLIC_API_BASE_URL` (프로젝트 규칙과 동일)
- **타인 ID**: API 전 구간에서 **`userId`** (Long) 사용 — 프로필 URL 세그먼트와 동일 숫자 문자열
- **백엔드 배포 순서**: `friendships` 마이그레이션·API 배포 후 프론트 배포 권장 (404·에러 처리로 그레이스풀 degrade)
