# Sprint 6 할일 (프론트엔드 · 실시간 · MVP 마무리)

> 참조: `common-docs/api/Sprint6-API.md`, `common-docs/api/Sprint5-API.md`, `docs/스프린트플래닝.md`, `docs/요구사항분석.md`, `docs/제품백로그.md`
>
> **섹션 번호**: 공통 API 문서가 **§A~§F**를 인용할 수 있다. **본 문서는 웹 전용**이라 **§E(푸시 토큰·FCM 등 모바일)** 는 두지 않으며, **§F**가 MVP 마무리에 해당한다.

## Sprint 6 개요

| 항목 | 내용 |
|------|------|
| **대상** | 프론트엔드(본 저장소: **Next.js 웹** 전용) |
| **목표** | 채팅·알림 **실시간(STOMP)** 연동, **REST와의 병합·동기화** 정책 반영, **인증 일원화(B7-2)**, 로딩·에러·반응형 등 **UI/UX 정리**, **주요 시나리오 E2E**로 MVP 마무리 |
| **API·프로토콜 문서** | `common-docs/api/Sprint6-API.md` (STOMP §5~6, 알림 §12 등). **FCM·푸시 토큰 REST(§2)는 모바일 클라이언트용**으로 문서에만 존재하며 **본 웹 프로젝트 범위에서 제외** |
| **백로그** | B7-2(인증), Epic 7 비기능 일부; Sprint 5 채팅·알림(B6-*)의 **실시간 고도화** |

### Sprint 5와의 관계

- Sprint 5에서 **REST + `afterId` 폴링**으로 구현한 채팅·알림을, Sprint 6에서 **WebSocket(STOMP) 수신**으로 전환·보완한다.
- 과거 메시지·수정·삭제는 **여전히 REST**(Sprint5-API). STOMP는 **수신·발송(SEND)** 중심이며, PATCH/DELETE 후 **상대 단말 자동 브로드캐스트는 현재 미구현**(Sprint6-API §6.2) — 갭 보정·재조회로 처리.

---

## A. 환경·URL·배포 합의

| 순서 | 작업 | 상세 |
|------|------|------|
| A-1 | REST Base | 기존과 동일 (`NEXT_PUBLIC_API_BASE_URL` 등). 스테이징 없음 — **로컬·운영**만 |
| A-2 | WebSocket URL | REST와 **동일 호스트**, 경로 **`/ws-chat`**. 로컬 `ws://localhost:8080/ws-chat`, 운영 `wss://{API호스트}/ws-chat` |
| A-3 | 웹 클라이언트 스택 | **SockJS + STOMP** 권장(Sprint6-API §4). 예: `@stomp/stompjs` + SockJS 클라이언트 |
| A-4 | CORS·Origin | 운영 시 백엔드 `CORS_ALLOWED_ORIGIN_PATTERNS`와 **프론트 실제 origin** 일치 필요(REST·SockJS). → [직접 설정·팀 협업](#직접-설정-및-팀협업-체크) |
| A-5 | env 정리 | WS Base를 API URL에서 유도할지(`https`→`wss`, 호스트 동일) 별도 `NEXT_PUBLIC_CHAT_SOCKJS_URL` 둘지 결정 후 `.env.example` 반영 |

---

## B. 인증·보안 (B7-2)

| 순서 | 작업 | 상세 |
|------|------|------|
| B-1 | REST 전 구간 | **인증 필요 API**에 `Authorization: Bearer <access_token>` 누락 없음(플래닝·백로그 B7-2) |
| B-2 | STOMP CONNECT | **쿼리스트링으로 JWT 금지**. `CONNECT` 프레임 헤더에 **`Authorization: Bearer <access_token>`** (Sprint6-API §5) |
| B-3 | 토큰 만료 | 만료 시 연결 끊김 → **재연결 시 갱신된 액세스 토큰**으로 `CONNECT` 후 **구독 복원** |
| B-4 | STOMP ERROR | `ERROR` 프레임·`/user/queue/errors` 수신 시 사용자 안내·재로그인 유도 UX |
| B-5 | 코드 공유 | 백엔드 구현 직후 **STOMP·REST 공통 `ErrorResponse` 코드 목록** 정리 여부 팀 합의(Sprint6-API §15) |

---

## C. 채팅 실시간(STOMP)

| 순서 | 작업 | 상세 |
|------|------|------|
| C-1 | 연결 싱글톤/컨텍스트 | **레이아웃(또는 루트 프로바이더)** 단위로 STOMP 연결 1개 유지 권장. 채팅 목록·상세 진입 시 재사용 |
| C-2 | 구독 생명주기 | Sprint6-API §7: **목록·상세 모두** 연결 + `/user/queue/notifications` 구독; **상세만** `/topic/chat.{roomId}` 구독. 뒤로 가기 시 **해당 방 topic만** unsubscribe |
| C-3 | SEND | **`/app/chat/messages`** 만. 본문: `roomId`, `content`, `messageType`(TEXT \| IMAGE). Sprint5 `ChatMessageSendRequest`와 동일 의미 |
| C-4 | 수신 병합 | 초기는 REST `GET .../messages` 후, 수신은 `/topic/chat.{roomId}`의 `ChatMessageResponse`로 병합. **`messageType` SYSTEM**: 매칭 종료·취소 안내(§11) |
| C-5 | `afterId` 폴링 | **WS 연결 유지 중에는 폴링 중단**. 끊김·재연결 직후 **1회** Gap 보정(`afterId` 또는 동등 로직)(§8) |
| C-6 | Optimistic UI | 임시 ID `temp-{UUID}` → topic 수신 시 `messageId`로 치환; `/user/queue/errors` 시 재전송·제거 UX(§9) |
| C-7 | REST 수정·삭제 | PATCH/DELETE는 Sprint5와 동일. **타 사용자 화면 실시간 반영 STOMP 없음** — 필요 시 재조회·스크롤 위치 정책 |
| C-8 | FINISHED/CANCELLED | 서버가 `SYSTEM` 메시지 브로드캐스트. 기존처럼 입력 비활성·`INVALID_MATCH_STATUS` 처리와 병행 |

### STOMP Destination 요약

| 용도 | Destination |
|------|-------------|
| 방 메시지 수신 | SUBSCRIBE `/topic/chat.{roomId}` |
| 채팅 발송 | SEND `/app/chat/messages` |
| 비즈니스 오류 | SUBSCRIBE `/user/queue/errors` |
| 알림(포그라운드) | SUBSCRIBE `/user/queue/notifications` |

---

## D. 알림 실시간·목록 연동

| 순서 | 작업 | 상세 |
|------|------|------|
| D-1 | 동일 STOMP 세션 | 채팅과 같은 연결에서 **`/user/queue/notifications`** 구독(Sprint6-API §12.1) |
| D-2 | 페이로드 | `NotificationRealtimePayload`: `notificationId`, `recipientUserId`, `type`, `title`, `summary`, `relatedMatchId`, `relatedParticipantId` — 상세는 `GET /api/notifications`와 맞춤 |
| D-3 | UI 갱신 | 수신 시 알림 목록 쿼리 invalidate 또는 낙관적 추가, **미읽음 카운트** 갱신 |
| D-4 | 탭 비활성 | 브라우저 탭이 백그라운드일 때 폴링·갱신 주기 완화 등 정책 선택(배터리·부하). **알림 수신은 STOMP(포그라운드) + 기존 REST 목록**이 본 스코프 |

---

## F. MVP 마무리 (플래닝 Sprint 6)

| 순서 | 작업 | 상세 |
|------|------|------|
| F-1 | UI/UX | 로딩 스켈레톤·에러 토스트/빈 상태·터치 타겟·주요 화면 반응형(스프린트플래닝) |
| F-2 | 채팅·알림 UX | 연결 중·재연결 중·오프라인 표시; STOMP 실패 시 REST 폴백 여부(최소 안내) |
| F-3 | E2E | 로그인 → 매칭 탐색 → 참여·채팅·알림 등 **주요 시나리오** 자동화(도구는 팀 표준) |
| F-4 | 완료 조건 정렬 | 인증 없는 API 호출 차단(B7-2), E2E 통과(스프린트플래닝 완료 조건) |

---

## 직접 설정 및 팀협업 체크

아래는 **코드 외**에서 본인 또는 인프라/백엔드 담당이 직접 해야 할 항목이다.

### 1. 운영·백엔드 환경 (프론트가 값만 맞추면 되는 항목)

| 항목 | 설명 |
|------|------|
| `CORS_ALLOWED_ORIGIN_PATTERNS` | 프로덕션 웹 **정확한 origin** 을 백엔드에 전달 |
| OAuth Redirect | 운영 **웹 콜백 URL** 이 백엔드 `allowed-redirect-uris`에 등록되는지 확인(Sprint6-API §15) |
| TLS / `wss` | API와 동일 도메인에서 `/ws-chat` 프록시·443 종료 |

### 2. Redis · STOMP 릴레이

| 항목 | 설명 |
|------|------|
| Redis, `STOMP_REDIS_RELAY_ENABLED` | **서버/인프라**. 프론트는 Redis에 직접 연결하지 않음(Sprint6-API §13) |

### 3. 로컬 개발

| 항목 | 설명 |
|------|------|
| 백엔드 기동 | `ws://localhost:8080/ws-chat` 로 STOMP 연결 테스트 |
| JWT | 개발용 액세스 토큰으로 `CONNECT` 헤더 검증 |

---

## Phase 작업 쪼개기 (권장)

| Phase | 내용 |
|-------|------|
| **1** | 패키지 추가(`@stomp/stompjs`, sockjs-client 등), WS URL 유틸, STOMP 팩토리(헤더에 Bearer) |
| **2** | React 컨텍스트(또는 훅): 연결·재연결·구독 해제, `/user/queue/errors` 공통 처리 |
| **3** | 채팅 목록 화면: 연결 유지 + `/user/queue/notifications` 구독, 필요 시 목록 쿼리 무효화 |
| **4** | 채팅 상세: `/topic/chat.{roomId}` 구독·unsubscribe, SEND로 전송 전환(또는 REST→STOMP 단계적), `afterId` 폴링 on/off |
| **5** | Optimistic UI·SYSTEM 메시지 표시·FINISHED/CANCELLED와 정합 |
| **6** | 알림: STOMP 수신과 목록·배지 연동 |
| **7** | UI/UX 폴리시, E2E, OAuth·CORS 운영 체크리스트 |

---

## 완료 조건 (Definition of Done)

- [ ] 모든 보호 API·STOMP `CONNECT`에 **Bearer JWT** 일관 적용(B7-2)
- [ ] 웹에서 **SockJS+STOMP**로 `/ws-chat` 연결, `/user/queue/errors`·`/user/queue/notifications` 구독
- [ ] 채팅 상세에서 `/topic/chat.{roomId}` 구독·이탈 시 unsubscribe, **SEND `/app/chat/messages`** 또는 REST와 중복 없는 단일 송신 경로 합의
- [ ] **WS 유지 중 `afterId` 폴링 중단**, 재연결 직후 갭 보정 1회
- [ ] Optimistic 전송·에러 시 복구 UX
- [ ] `SYSTEM` 종료·취소 메시지 표시 및 전송 불가 상태와 일치
- [ ] 알림 STOMP 수신 시 목록·미읽음 반영
- [ ] 스프린트플래닝 기준: **주요 시나리오 E2E 통과**, 로딩·에러·반응형 정리

---

## 체크리스트 (스프린트 종료 전)

- [ ] `.env.example`에 WS 관련 변수 및 설명
- [ ] 운영 origin·OAuth redirect 백엔드와 교차 확인
- [ ] STOMP·HTTP **에러 코드** 매핑 표(팀 공유) 초안
- [ ] 채팅 수정·삭제 후 상대 화면: 재조회/포커스 갱신 정책 문서화

---

## 요구사항·기획 매핑 (참고)

| 출처 | 내용 |
|------|------|
| `docs/스프린트플래닝.md` Sprint 6 | 인증 연동, UI/UX, E2E; 비기능·MVP 마무리 |
| `docs/제품백로그.md` B7-2 | API 인증·인가, 권한 없는 접근 차단 |
| `docs/요구사항분석.md` | 실시간 알림·채팅 품질, 예외 흐름(취소·대기열 알림 등) — STOMP·REST 병행으로 대응 |
| `common-docs/api/Sprint6-API.md` | 본 스프린트 기술 단일 기준 |

---

## 권장 진행 순서

```
A(환경·URL) → B(인증·CONNECT) → Phase 1~2(STOMP 인프라)
  → C 채팅(topic·SEND·폴링 정책) → D 알림 큐 → F(MVP)·Phase 7(UI/UX·E2E)
```

백엔드 `/ws-chat` 가 준비되기 전에는 **클라이언트 스텁·통합 테스트 계획**만으로도 Phase 1~2 착수 가능하다.

---

## Phase별 수동 테스트 (구현 반영)

| Phase | 확인 방법 |
|-------|-----------|
| **1** | 로그인 후 **`http://localhost:3000/dev/stomp`** (`/matching/dev/stomp` 는 동일 페이지로 리다이렉트) — SockJS URL 표시, **일회성 연결** 시 로그에 `onConnect 성공`(백엔드 `/ws-chat` 필요). 프로덕션 빌드에서는 해당 경로 404 |
| **2** | 로그인 직후 브라우저 개발자 도구 Network에 SockJS `/ws-chat` 협상(`info?...` 등, Initiator `create-stomp-client`), 콘솔 `[STOMP]` 디버그(개발 모드). 비즈니스 오류 시 토스트(`/user/queue/errors`) |
| **3** | `/chat` 헤더 **실시간 연결됨** 배지. 알림이 STOMP로 오면 목록·미리보기가 갱신되는지(백엔드 이벤트 필요) |
| **4** | 채팅방 상단 배지 + 상대가 보낸 메시지가 폴링 없이 도착하는지. STOMP 끊김 시 `afterId` 폴링 재개·재연결 후 1회 갭 보정 |
| **5** | STOMP 연결 상태에서 전송 시 잠시 **임시 말풍선** 후 서버 `messageId`로 치환. 전송 실패(연결 끊김 등) 시 롤백·토스트 — 아래 [Phase 5 상세](#phase-5-상세-테스트-임시-말풍선--롤백) |
| **6** | 실시간 연결 중 미읽음 배지 **폴링 간격 멈춤**(STOMP로 invalidate 시 갱신) |
| **7** | `npm run test:e2e` — 로그인·채팅 게이트 스모크(서버는 Playwright가 `npm run dev`로 기동) |

**E2E**: 이미 `3000`에서 dev를 띄운 경우 Playwright가 `reuseExistingServer`로 재사용한다.
