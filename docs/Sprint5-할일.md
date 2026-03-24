# Sprint 5 할일 (프론트엔드)

> 참조: `common-docs/api/Sprint5-API.md`, `docs/스프린트플래닝.md`, `docs/요구사항분석.md`, `docs/제품백로그.md`

## Sprint 5 개요

| 항목 | 내용 |
|------|------|
| **대상** | 프론트엔드 개발자 |
| **목표** | 확정 매칭 기준 **REST 채팅**(목록·상세·메시지 송수신·수정·삭제)과 **인앱 알림**(목록·미읽음·읽음)이 end-to-end로 동작한다 |
| **API 문서** | `common-docs/api/Sprint5-API.md` |
| **백로그** | B6-1, B6-2, B6-3, B6-4, B6-5 (Epic 6: 채팅 및 알림) |

### 본 스프린트 범위 밖 (Sprint 6 예고)

- **실시간(WebSocket·STOMP)** 은 Sprint 6에서 도입 예정이다. Sprint 5에서는 **HTTP + 폴링(또는 화면 포커스 시 재조회)** 으로 새 메시지·알림을 반영한다.
- 백엔드가 채팅방을 **첫 확정 시점**에 생성한다. 프론트는 `CHAT_ROOM_NOT_FOUND` 등으로 “아직 방 없음” UX를 처리한다.

---

## 완료 조건 (Definition of Done)

- [ ] **방장 또는 ACCEPTED** 참가자만 채팅 목록·방 진입·메시지 조회·전송이 가능하고, 권한 없을 때 `CHAT_ACCESS_DENIED` 등이 사용자에게 설명 가능하다
- [ ] **내 채팅방 목록**(`GET /api/chat/rooms`)이 페이지네이션·미리보기·마지막 메시지 시각으로 표시된다
- [ ] **채팅방 상단 공지**(`MatchChatNoticeResponse`: 일시·장소·코트비 정책·상태 등)가 요구사항(B6-3)에 맞게 노출된다
- [ ] **메시지** 전송·과거 스크롤(커서)·상대방 화면 갱신을 위한 **`afterId` 폴링**(또는 동등한 주기적 재조회)이 동작한다
- [ ] 매칭이 **FINISHED / CANCELLED** 이면 **`matchNotice.status` 기준으로 채팅 입력창(전송)을 비활성화**하고, 수정·삭제 UI도 숨기거나 비활성화한다. 레이스·직접 호출 등으로 API가 거부하면 `INVALID_MATCH_STATUS` 를 사용자에게 안내한다
- [ ] **본인 메시지**만 수정·삭제 가능, 수정은 **15분 이내**(`BAD_REQUEST` 초과 시 안내)
- [ ] **알림 목록**·**미읽음 수**·**단건 읽음**·**전체 읽음**이 API와 연동되고, `type`·`relatedMatchId` 로 매칭 상세·채팅 등으로 이동할 수 있다
- [ ] `GET /api/matches/{matchId}/chat` 으로 매칭 상세 등에서 **채팅 진입 UX**를 제공할 수 있다

---

## Sprint 5 API 요약

**페이징**: `GET /api/chat/rooms`, `GET /api/notifications` 는 Spring **`Page`** 직렬화(`content`, `totalElements`, `totalPages`, `number`, `size` 등). 기존 Sprint 4 후기/패널티의 `PageResponse` 와 **형식이 다르므로** 타입·파서를 분리하거나 매핑한다.

### 채팅

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/chat/rooms` | **필요** | 내 채팅방 목록 (`page`, `size`) |
| GET | `/api/chat/rooms/{roomId}` | **필요** | 방 상세: 공지 + 최근 메시지 1건 |
| GET | `/api/matches/{matchId}/chat` | **필요** | 위와 동일 본문을 matchId로 (진입용) |
| GET | `/api/chat/rooms/{roomId}/messages` | **필요** | 메시지: `cursor`(과거) 또는 `afterId`(폴링), `size`(1~100, 기본 30) |
| POST | `/api/chat/rooms/{roomId}/messages` | **필요** | 메시지 전송 (`content` 필수·trim·최대 1000자, `messageType` 선택·기본 TEXT) |
| PATCH | `/api/chat/rooms/{roomId}/messages/{messageId}` | **필요** | 본인 메시지 수정 |
| DELETE | `/api/chat/rooms/{roomId}/messages/{messageId}` | **필요** | 본인 메시지 소프트 삭제(목록에서 제외) |

### 알림

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/notifications` | **필요** | 내 알림 (`page`, `size`, `createdAt` 내림차순) |
| GET | `/api/notifications/unread-count` | **필요** | 미읽음 건수 (`data`: number) |
| PATCH | `/api/notifications/{notificationId}/read` | **필요** | 단건 읽음 |
| POST | `/api/notifications/read-all` | **필요** | 미읽음 일괄 읽음 (`data`: 갱신 행 수 int) |

### 응답 타입 (문서 기준 요약)

**`ChatRoomListItemResponse`**: `matchId`, `roomId`, `matchTitle`, `lastMessagePreview`, `lastMessageAt`

**`ChatRoomDetailResponse`**: `roomId`, `matchId`, `matchNotice`, `lastMessage`

**`ChatMessagePageResponse`**: `messages[]`, `nextCursor` (`afterId` 분기 시 `nextCursor` 는 항상 `null`)

**`ChatMessageResponse`**: `messageId`, `roomId`, `senderId`, `senderNickname`, `content`, `messageType`(TEXT/IMAGE/SYSTEM), `createdAt`, `editedAt`

**`NotificationResponse`**: `notificationId`, `type`, `title`, `body`, `payload`(JSON 문자열·대부분 null), `relatedMatchId`, `relatedParticipantId`, `readAt`, `createdAt` — **미읽음**: `readAt == null`

**`NotificationType`**: `MATCH_APPLICATION`, `PARTICIPATION_ACCEPTED`, `PARTICIPATION_REJECTED`, `WAITLIST_SLOT_OFFER`, `WAITLIST_EMERGENCY_OPEN`, `MATCH_CANCELLED` — 화면 이동은 주로 `relatedMatchId` + `type` 조합.

---

## Phase 1: 타입 및 API 함수

| 순서 | 작업 | 상세 |
|------|------|------|
| 1-1 | Spring `Page<T>` 타입 | 채팅방·알림 목록용 (`content`, `totalElements`, `number`, `size` 등) |
| 1-2 | 채팅 타입 | `ChatRoomListItemResponse`, `ChatRoomDetailResponse`, `MatchChatNoticeResponse`, `ChatMessageResponse`, `ChatMessagePageResponse`, 요청 DTO |
| 1-3 | 알림 타입 | `NotificationResponse`, `NotificationType` enum |
| 1-4 | API 함수 (`lib/api.ts` 등) | 아래 표 참고 |
| 1-5 | 에러 매핑 | § 에러 코드 — 토스트/다이얼로그 메시지 |

### API 함수 예시

| 함수 예시 | 메서드·경로 |
|-----------|-------------|
| `getChatRooms(page?, size?)` | GET `/api/chat/rooms` |
| `getChatRoom(roomId)` | GET `/api/chat/rooms/{roomId}` |
| `getMatchChat(matchId)` | GET `/api/matches/{matchId}/chat` |
| `getChatMessages(roomId, { cursor?, afterId?, size? })` | GET `/api/chat/rooms/{roomId}/messages` |
| `sendChatMessage(roomId, body)` | POST `/api/chat/rooms/{roomId}/messages` |
| `patchChatMessage(roomId, messageId, body)` | PATCH `.../messages/{messageId}` |
| `deleteChatMessage(roomId, messageId)` | DELETE `.../messages/{messageId}` |
| `getNotifications(page?, size?)` | GET `/api/notifications` |
| `getUnreadNotificationCount()` | GET `/api/notifications/unread-count` |
| `markNotificationRead(notificationId)` | PATCH `/api/notifications/{id}/read` |
| `markAllNotificationsRead()` | POST `/api/notifications/read-all` |

---

## Phase 2: 채팅 목록 화면

| 순서 | 작업 | 상세 |
|------|------|------|
| 2-1 | 라우트 | 기존 `/chat` 플레이스홀더를 목록 UI로 교체 |
| 2-2 | 데이터 | TanStack Query + `getChatRooms`, 무한 스크롤 또는 페이지 |
| 2-3 | 카드 | 제목(`matchTitle`), 미리보기(`lastMessagePreview`), 시각(`lastMessageAt`) |
| 2-4 | 진입 | 탭 시 `roomId` 로 방 상세(메시지) 화면으로 이동 |
| 2-5 | 빈 상태 | 채팅방 없음 안내 |

---

## Phase 3: 채팅방 화면 — 공지·헤더·진입 경로

| 순서 | 작업 | 상세 |
|------|------|------|
| 3-1 | 상단 고정 | `matchNotice`: 제목, `matchDate`, `startTime`, `durationMin`, `locationName`, `costPolicy`, `status` — 기획의 “채팅방 상단 일시·장소·정산 방식”(B6-3) |
| 3-2 | `costPolicy` 표시 | `SPLIT_EQUAL`, `HOST_PAYS`, `GUEST_PAYS` 사용자용 라벨 매핑 |
| 3-3 | 매칭 상세에서 진입 | `GET /api/matches/{matchId}/chat` — 성공 시 `roomId` 확보 후 동일 방 UI 재사용 |
| 3-4 | 404/권한 | `CHAT_ROOM_NOT_FOUND`, `CHAT_ACCESS_DENIED` — “아직 채팅방이 없거나 참여 권한이 없습니다” 등 |
| 3-5 | 매칭 상세 링크 | 공지에서 매칭 상세(`/matching/...` 등 기존 경로)로 이동 가능하면 UX 향상 |

---

## Phase 4: 메시지 영역 — 과거 로드·전송·수정·삭제

| 순서 | 작업 | 상세 |
|------|------|------|
| 4-1 | 초기 로드 | `cursor` 없이 `getChatMessages` → 최신 쪽에서 `size`개, 시간 오름차순 표시 |
| 4-2 | 과거 스크롤 | `nextCursor` 가 있으면 `cursor=nextCursor` 로 이전 페이지 로드 |
| 4-3 | 전송 | `sendChatMessage`, 성공 시 로컬 목록에 반영 또는 메시지 쿼리 무효화 |
| 4-4 | 수정 | 본인 말풍선만 · 15분 내 · `patchChatMessage` |
| 4-5 | 삭제 | 본인만 · `deleteChatMessage` 후 목록에서 제거(서버 소프트 삭제와 정합) |
| 4-6 | 타입 | Sprint 5는 TEXT 중심; `IMAGE`/`SYSTEM` 은 표시만 문서에 맞게 확장(이미지는 추후 스토리지 연동 시) |
| 4-7 | 상태 잠금 | `matchNotice.status` 가 FINISHED/CANCELLED 이면 입력창 비활성 + `INVALID_MATCH_STATUS` 처리 |

---

## Phase 5: 새 메시지 반영(폴링)

| 순서 | 작업 | 상세 |
|------|------|------|
| 5-1 | `afterId` | 화면에 표시 중인 메시지 중 최대 `messageId` 를 보관 |
| 5-2 | 주기 호출 | `getChatMessages(roomId, { afterId, size })` — **동시에 `cursor` 와 쓰지 않음**(문서 권장) |
| 5-3 | 병합 | 응답 `messages` 를 기존 목록에 append, 중복 제거 |
| 5-4 | 백그라운드 | 탭 비활성 시 간격 조절·일시 중지 등은 선택(배터리·서버 부하 고려) |
| 5-5 | 목록 미리보기 | 방 나간 뒤 채팅 탭 목록은 `invalidateQueries` 로 `lastMessagePreview` 갱신 |

---

## Phase 6: 알림 화면·배지

| 순서 | 작업 | 상세 |
|------|------|------|
| 6-1 | 알림 목록 페이지 | `getNotifications` + Spring Page UI |
| 6-2 | 미읽음 배지 | 헤더/탭: `getUnreadNotificationCount` 폴링 또는 포커스 시 갱신 |
| 6-3 | 단건 탭 | `markNotificationRead` 후 목록·카운트 갱신 |
| 6-4 | 전체 읽음 | 툴바 액션 → `markAllNotificationsRead` |
| 6-5 | 딥링크 | `relatedMatchId` 있으면 매칭 상세; `WAITLIST_*` 는 상세에서 수락 플로우(Sprint 3)와 연결. `payload` 는 MVP에서 대부분 null |
| 6-6 | 타입별 카피 | 문서 §4.5 패턴과 제목/본문 표시 일치(디버깅·QA 용이) |

---

## Phase 7: 내비·기존 화면 연동

| 순서 | 작업 | 상세 |
|------|------|------|
| 7-1 | 매칭 상세 | ACCEPTED(또는 방장)일 때 “채팅하기” → `getMatchChat` 또는 `roomId` 보유 시 직행 |
| 7-2 | 하단 탭 | `/chat` 이 실제 목록과 연결됨을 확인 |
| 7-3 | 요구사항 Phase 5 | 홈 상단 **알림 아이콘** → 알림 목록(선택, 스프린트 일정에 맞게 우선순위 조정) |

---

## 에러 코드 (Sprint 5 문서)

| code | HTTP | 용도 |
|------|------|------|
| CHAT_ACCESS_DENIED | 403 | 방장도 아니고 ACCEPTED 아님 |
| CHAT_ROOM_NOT_FOUND | 404 | roomId·매칭 불일치 또는 방 미생성 |
| MESSAGE_NOT_FOUND | 404 | 메시지 없음·이미 삭제 |
| INVALID_MATCH_STATUS | 400 | FINISHED/CANCELLED 에 쓰기 시도 |
| FORBIDDEN | 403 | 타인 메시지 수정·삭제 |
| BAD_REQUEST | 400 | 수정 15분 초과 등 |
| VALIDATION_ERROR | 400 | `@Valid` 실패 |
| NOTIFICATION_NOT_FOUND | 404 | 타인 알림 id 읽음 처리 |
| UNAUTHORIZED | 401 | 토큰 없음·무효 |

---

## 권장 진행 순서

```
Phase 1 (타입·API) → Phase 2 (채팅 목록) → Phase 3 (방 헤더·matchId 진입)
  → Phase 4 (메시지) → Phase 5 (afterId 폴링) → Phase 6 (알림) → Phase 7 (내비 연동)
```

알림은 채팅과 병렬로 착수 가능하나, **미읽음 배지**는 Phase 1 API 준비 후 Phase 6에서 마무리하는 흐름이 안전하다.

---

## 체크리스트 (스프린트 종료 전)

- [ ] 채팅방 목록 Spring `Page` 연동 및 빈 상태
- [ ] 방 상단 공지(`matchNotice`) 및 매칭 상태에 따른 입력 제한
- [ ] 메시지 커서 기반 과거 로드 + 전송
- [ ] `afterId` 폴링으로 상대방 신규 메시지 반영
- [ ] 본인 메시지 수정·삭제 및 15분·FINISHED/CANCELLED 에러 처리
- [ ] `GET /api/matches/{matchId}/chat` 진입
- [ ] 알림 목록·미읽음 수·읽음·전체 읽음
- [ ] 알림 타입·`relatedMatchId` 기반 화면 이동
- [ ] JWT 만료 시 채팅·알림 화면 UNAUTHORIZED 처리

---

## 요구사항·기획 매핑 (참고)

| 출처 | 내용 |
|------|------|
| `docs/스프린트플래닝.md` Sprint 5 | 채팅 목록·방(메시지·공지)·알림 목록·읽음; 확정 시 방 생성·메시지 교환·신청·대기열 알림 수신 |
| `docs/요구사항분석.md` | 확정자 전용 채팅, 상단 장소·시간·코트비 공지, 방장 알림(신청), 대기열 승격 알림 |
| `docs/제품백로그.md` B6-1~B6-5 | 확정 시 채팅방, 메시지, 상단 공지, 방장 신청 알림, 대기 기회 알림 |
