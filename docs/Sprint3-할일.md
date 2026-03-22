# Sprint 3 할일 (프론트엔드)

> 참조: `common-docs/api/Sprint3-API.md`, `docs/스프린트플래닝.md`, `docs/요구사항분석.md`, `docs/제품백로그.md`  
> API 변경 요약(KICK, 정원 정책, REJECTED·재신청, **매칭 수정**): `Sprint3-API.md` 하단 **「변경 사항 (프론트엔드 연동 참고)」** 및 **§7 매칭 수정**

## Sprint 3 개요

| 항목 | 내용 |
|------|------|
| **대상** | 프론트엔드 개발자 |
| **목표** | 참여 신청, 수락/거절, 대기열, 취소, 방장 추방·매칭 수정이 end-to-end로 동작한다 |
| **API 문서** | `common-docs/api/Sprint3-API.md` |
| **백로그** | B4-1, B4-2, B4-3, B4-4, B4-5 (Epic 4: 매칭 참여 및 대기열) |

---

## 완료 조건 (Definition of Done)

- [ ] 참여 신청 → 방장 수락 → 확정 흐름 동작
- [ ] 정원 초과 시 대기 신청 가능
- [ ] 취소 시 대기열 1번에게 승인 기회 부여 (RESERVED → 15분 내 수락/거절)
- [ ] 방장이 신청 목록에서 수락/거절 가능
- [ ] RESERVED 상태에서 예약 수락/거절 UI 동작
- [ ] 긴급 모드(경기 2시간 미만) 시 WAITING 전체 선착순 수락 가능
- [ ] (선택) 방장이 모집 중 매칭 정보 수정(PATCH partial update) 및 확정 참여자 추방(KICK)

---

## Sprint 3 API 요약 (문서 기준)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| PATCH | `/api/matches/{matchId}` | **매칭 수정**(방장, RECRUITING만) · partial update |
| PATCH | `/api/matches/{matchId}/participants/{participationId}` | 수락(ACCEPT) / 거절(REJECT) / **추방(KICK)** |

> Sprint2의 `PATCH /api/matches/{matchId}`에 **상태 변경(CLOSED/CANCELLED)** 와 **필드 수정**이 동일 엔드포인트로 정리되었을 수 있음. 백엔드 스펙에 맞춰 `status` 전용 호출과 본문 수정 호출을 구분해 구현.

---

## 대기열 하이브리드 시스템 (참고)

| 단계 | 설명 |
|------|------|
| **1. 순차 기회** | ACCEPTED 취소 시 → 대기 1번에게 RESERVED 부여 (15분 내 수락) |
| **2. 타임아웃** | 15분 내 미응답/거절 → CANCELLED, 다음 대기 1번에게 기회 이전 |
| **3. 긴급 선착순** | 경기 2시간 미만 시 → WAITING 전체가 accept-offer 호출 가능, 먼저 수락한 사람 확정 |

---

## 백엔드 요구사항 (API 보완 제안)

프론트엔드 UX 개선을 위해 아래 API 수정을 백엔드에 요청합니다.

### 1. RESERVED 상태의 실시간성 UI 처리

| 요청 항목 | 상세 |
|-----------|------|
| **serverTime 또는 serverTimeOffset** | `GET /api/matches/{matchId}` 응답에 `serverTime`(ISO 8601) 또는 `serverTimeOffset`(ms) 포함 |
| **목적** | 클라이언트 시계와 서버 시계 차이로 인한 offerExpiresAt 계산 오차 방지. 남은 시간 카운트다운 정확도 향상 |

**대안**: `serverTime` 대신 `offerExpiresAt`이 서버 기준으로 계산된 값이라면, API 문서에 "클라이언트는 offerExpiresAt을 그대로 사용하되, 1분 미만일 때 '곧 만료' UI 표시 권장" 가이드 추가

### 2. 긴급 선착순 모드(Emergency Mode) 식별

| 요청 항목 | 상세 |
|-----------|------|
| **isEmergencyMode** | `GET /api/matches/{matchId}` 응답에 `isEmergencyMode: boolean` 필드 추가 |
| **조건** | 경기 시작 2시간 미만일 때 true |
| **목적** | WAITING 사용자에게 "현재 선착순으로 참여 기회가 열렸습니다!" 문구 노출. accept-offer 버튼 노출 여부 판단 |

### 3. 방장 신청 목록 조회 데이터 확장

| 요청 항목 | 상세 |
|-----------|------|
| **level** | `GET /api/matches/{matchId}/participants/applications` 응답 각 항목에 `level`(급수) 필드 추가 |
| **interestRegions** | `interestRegions` 또는 `regionCodes` (관심 지역, 최대 2곳) 필드 추가 |
| **목적** | 방장이 수락/거절 시 상대방 급수·관심 지역을 보고 판단할 수 있도록 함 |

### 4. 에러 처리 (참고)

OFFER_EXPIRED 에러 시 프론트엔드에서 자동 새로고침·UI 전환 처리. API 변경 불필요.

---

## Phase 1: 타입 및 API 함수 구현

### 타입 정의 (types/match.ts 확장)

| 타입 | 필드 | 설명 |
|------|------|------|
| ParticipantStatus | PENDING, ACCEPTED, REJECTED, WAITING, RESERVED, CANCELLED | 참여 상태 |
| MyParticipationSummary | participationId, status, queueOrder, applyMessage, offerExpiresAt | 내 참여 요약 |
| MatchDetail 확장 | myParticipation, canApply, canCancel, hasWaitingOffer, **isEmergencyMode**, **serverTime**? | 로그인 사용자 전용. isEmergencyMode·serverTime은 백엔드 반영 시 추가 |
| ApplicationItem | participationId, userId, nickname, profileImg, ratingScore, **level**, **interestRegions**?, status, queueOrder, applyMessage, appliedAt, offerExpiresAt | 방장 신청 목록. level·interestRegions는 백엔드 반영 시 추가 |

### API 함수 (lib/api.ts 추가)

| 순서 | 작업 | 상세 |
|------|------|------|
| 1-1 | 참여/대기 신청 | `applyParticipation(matchId, applyMessage?)` → POST `/api/matches/{matchId}/participants` |
| 1-2 | 방장 수락/거절/추방 | `updateParticipation(matchId, participationId, action)` → PATCH `/api/matches/{matchId}/participants/{participationId}` · action: **ACCEPT \| REJECT \| KICK** |
| 1-2b | 매칭 수정 | `updateMatch(matchId, body)` → PATCH `/api/matches/{matchId}` · **partial update** (Sprint3-API §7 참조) |
| 1-3 | 참여 취소 | `cancelParticipation(matchId)` → DELETE `/api/matches/{matchId}/participants/me` |
| 1-4 | 예약 수락 | `acceptOffer(matchId)` → POST `/api/matches/{matchId}/participants/me/accept-offer` |
| 1-5 | 예약 거절 | `rejectOffer(matchId)` → POST `/api/matches/{matchId}/participants/me/reject-offer` |
| 1-6 | 방장 신청 목록 | `getApplications(matchId)` → GET `/api/matches/{matchId}/participants/applications` |
| 1-7 | 에러 코드 처리 | 위 코드 + **FORBIDDEN**, **BAD_REQUEST**(매칭 수정 유효성) 등 사용자 친화적 메시지로 변환 |

### 매칭 수정 Request Body (선택 필드, 포함된 항목만 변경)

| 필드 | 설명 |
|------|------|
| title, description | 제목·상세 (비우면 안 됨) |
| matchDate, startTime, durationMin | 일시·소요(30~240) |
| locationName, regionCode | 장소 |
| maxPeople | 2~12, **≥ currentPeople** 필수 |
| targetLevels, costPolicy, imageUrl | 급수·비용·이미지 |
| latitude, longitude | 위치(선택) |

### 산출물

- `types/match.ts`: ParticipantStatus, MyParticipationSummary, ApplicationItem, MatchDetail 확장, **UpdateMatchRequest**(선택)
- `lib/api.ts`: 참여 API 6종 + **updateMatch**(또는 기존 PATCH 확장) + 에러 메시지 유틸

---

## Phase 2: 매칭 상세 화면 - 참여 신청/취소 UI

### API 참조 (매칭 상세 확장)

**GET** `/api/matches/{matchId}` 응답에 **로그인 사용자**에게 추가되는 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| myParticipation | MyParticipationSummary \| null | 현재 사용자의 참여 상태 |
| canApply | boolean | 참여 신청 가능 여부 |
| canCancel | boolean | 취소 가능 여부 |
| hasWaitingOffer | boolean | 예약 수락 대기 여부 (RESERVED 상태) |
| isEmergencyMode | boolean | (요청) 긴급 선착순 모드 여부. 경기 2시간 미만 시 true |
| serverTime | string | (요청) 서버 시각 ISO 8601. offerExpiresAt 계산용 |

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 2-1 | MatchDetail 타입 확장 | myParticipation, canApply, canCancel, hasWaitingOffer, isEmergencyMode, serverTime 반영 |
| 2-2 | 참여 신청 버튼 | canApply=true일 때 [참여 신청하기] 또는 [대기 신청하기] (정원 여유/초과에 따라 백엔드가 PENDING/WAITING 반환) |
| 2-3 | 참여 신청 모달/다이얼로그 | applyMessage 입력 (최대 200자, 선택), 확인 시 `applyParticipation` 호출 |
| 2-4 | 내 참여 상태 표시 | myParticipation 존재 시: PENDING→"수락 대기 중", ACCEPTED→"참여 확정", REJECTED→"거절됨", WAITING→"대기열 N번", RESERVED→"참여 기회가 왔어요! (15분 내 수락)". **REJECTED + canApply=true** 이면 재신청 가능(하단 [참여 신청] 노출 우선순위 조정) |
| 2-5 | 취소 버튼 | canCancel=true일 때 [참여 취소] 버튼, 확인 후 `cancelParticipation` 호출 |
| 2-6 | RESERVED 수락/거절 버튼 | hasWaitingOffer=true일 때 [수락하기] / [거절하기], offerExpiresAt 남은 시간 표시 |
| 2-7 | offerExpiresAt 카운트다운 | serverTime이 있으면 시차(offset)를 반영해 남은 시간 계산. **1분 미만일 때 "곧 만료됩니다!" 시각적 피드백** (강조 색상, 애니메이션 등) |
| 2-8 | 비로그인/방장 처리 | 비로그인: canApply 등 null → 참여 신청 비활성화. 방장: HOST_CANNOT_APPLY 에러 시 "방장은 참여 신청할 수 없습니다" 표시 |

### 참고

- 요구사항: "인원이 꽉 차면 [참여 신청] 버튼이 [대기 신청]으로 자동 변경됨" → 백엔드가 정원 여유/초과에 따라 PENDING/WAITING 반환하므로, 프론트는 동일한 "참여 신청" 버튼으로 처리 가능. (선택) 정원 초과 시 "대기 신청" 문구로 변경
- **offerExpiresAt 계산**: serverTime 제공 시 시차(offset)를 구해 `남은시간 = offerExpiresAt - (now + offset)` 형태로 보정. 미제공 시 `offerExpiresAt - now`로 계산
- 와이어프레임: `docs/화면/와이어프레임/상세화면_와이어프레임_데이터.md`

---

## Phase 3: 방장 신청 관리 UI

### API 참조

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/matches/{matchId}/participants/applications` | **필요** | 방장용 신청 목록 조회 |
| PATCH | `/api/matches/{matchId}/participants/{participationId}` | **필요** | 수락(ACCEPT) / 거절(REJECT) / **추방(KICK)** · KICK은 확정(ACCEPTED) 참여자만 |

**신청 목록 응답**: participationId, userId, nickname, profileImg, ratingScore, **level**, **interestRegions**?, status, queueOrder, applyMessage, appliedAt, offerExpiresAt

- **level**, **interestRegions**: 백엔드 요구사항 3번 반영 시 추가. 방장이 수락/거절 판단에 필수

**정렬**: PENDING → RESERVED → WAITING (queueOrder ASC)

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 3-1 | 신청 목록 섹션 | 매칭 상세에서 방장(hostId === user.id)일 때 "신청 목록" 섹션 표시 |
| 3-2 | 신청 목록 API 연동 | `getApplications(matchId)` 호출, TanStack Query 사용 |
| 3-3 | 신청자 카드 컴포넌트 | 닉네임, 프로필 이미지, 별점, **급수(level)**, **관심 지역(interestRegions)**, applyMessage, appliedAt, status, queueOrder |
| 3-4 | 수락/거절 버튼 | PENDING, RESERVED에 대해 [수락] [거절] 버튼. WAITING은 대기열이라 수락 불가(정원 초과) → RESERVED로 바뀌면 수락 가능 |
| 3-8 | 확정 참여자 추방 | `GET` 상세의 `confirmedParticipants[].participationId`로 **KICK** 호출. 방장만, RECRUITING(또는 정책에 따라 CLOSED) UI에서 [추방] |
| 3-5 | 수락 시 MATCH_FULL 처리 | 정원 초과 시 "정원이 가득 찼습니다" 에러 표시 |
| 3-6 | RESERVED 카드 강조 | offerExpiresAt 남은 시간 표시 (예: "15분 내 수락 대기"). serverTime 있으면 시차 반영 |
| 3-7 | 신청 없음 상태 | 목록 비어 있을 때 "아직 신청이 없습니다" 메시지 |

### 산출물

- 매칭 상세 화면 내 "신청 목록" 섹션
- 신청자 카드 + 수락/거절 버튼
- 확정 참여자 목록 + **추방(KICK)** (구현 시)

---

## Phase 3b: 매칭 수정 (방장)

### API 참조

**PATCH** `/api/matches/{matchId}` — Sprint3-API **§7 매칭 수정**

| 조건 | 내용 |
|------|------|
| 권한 | 방장만 |
| 상태 | **RECRUITING** 만 수정 가능 (`MATCH_NOT_RECRUITING` 그 외) |
| 정원 | `maxPeople` 변경 시 **≥ currentPeople** (방장 포함 인원 정책) |
| 방식 | **partial update** — 요청에 넣은 필드만 변경 |

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 3b-1 | 타입/API | `UpdateMatchRequest` (Partial) + `updateMatch(matchId, body)` |
| 3b-2 | 진입점 | 매칭 상세에서 방장 + RECRUITING일 때 [매칭 수정] → `/matching/[id]/edit` 또는 모달 |
| 3b-3 | 폼 | 매칭 만들기와 동일·유사 필드. 기존 값 프리필, **maxPeople** 최소값 `currentPeople` |
| 3b-4 | 제출 | `updateMatch` 성공 시 상세 쿼리 무효화, 상세로 이동/갱신 |
| 3b-5 | 에러 | FORBIDDEN, MATCH_NOT_RECRUITING, BAD_REQUEST(정원·날짜·제목 공백 등) 메시지 처리 |

### 참고

- Sprint2 `매칭 만들기` 화면(`docs/Sprint2-할일.md` Phase 2) 컴포넌트 재사용 권장
- 이미지 변경 시 기존 플로우: `POST /api/files/upload` → `imageUrl` 포함 PATCH

---

## Phase 4: 예약 수락/거절 (대기열 사용자)

### API 참조

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/matches/{matchId}/participants/me/accept-offer` | RESERVED 상태 수락. 긴급 모드(경기 2시간 미만) 시 WAITING도 호출 가능 |
| POST | `/api/matches/{matchId}/participants/me/reject-offer` | RESERVED 상태 거절 |

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 4-1 | RESERVED 수락/거절 UI | 매칭 상세 하단 또는 상단 배너: "참여 기회가 왔어요! 15분 내 수락해 주세요" + [수락하기] [거절하기] |
| 4-2 | offerExpiresAt 카운트다운 | serverTime 반영 시 시차 고려. **1분 미만 시 "곧 만료됩니다!" 시각적 피드백** |
| 4-3 | 긴급 모드 UI | `isEmergencyMode=true`일 때 WAITING 사용자에게 "**현재 선착순으로 참여 기회가 열렸습니다!**" 문구 + [참여 기회 잡기] 버튼 노출. accept-offer 호출 |
| 4-4 | 긴급 모드 fallback | isEmergencyMode 미제공 시: WAITING + hasWaitingOffer가 true인 경우에만 버튼 노출 (백엔드 정책에 따름) |
| 4-5 | 에러 처리 | OFFER_EXPIRED → "참여 기회가 만료되었습니다", MATCH_FULL → "정원이 가득 찼습니다" |
| 4-6 | OFFER_EXPIRED UX | **단순 토스트만 띄우지 말고**: 자동으로 매칭 상세 쿼리 새로고침(invalidateQueries) 후, 대기열(WAITING) 상태로 UI 전환. UX 매끄러움 |

---

## Phase 5: 상태 표시 및 에러 처리 통합

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 5-1 | ParticipantStatus 라벨 | PENDING→"수락 대기", ACCEPTED→"참여 확정", REJECTED→"거절됨", WAITING→"대기열", RESERVED→"참여 기회", CANCELLED→"취소됨" |
| 5-2 | 에러 코드 → 메시지 매핑 | MATCH_NOT_FOUND, MATCH_NOT_RECRUITING, ALREADY_APPLIED, HOST_CANNOT_APPLY, PARTICIPANT_NOT_FOUND, INVALID_STATUS, MATCH_FULL, CANNOT_CANCEL, OFFER_EXPIRED, **FORBIDDEN**, **BAD_REQUEST** |
| 5-3 | OFFER_EXPIRED UX | 에러 시 토스트 + **자동 쿼리 새로고침** + 대기열 상태 UI 전환. "만료되었습니다"만 띄우지 않음 |
| 5-4 | 로딩/낙관적 업데이트 | mutation 시 버튼 비활성화, 성공 시 쿼리 무효화(invalidateQueries) |
| 5-5 | 매칭 목록 카드 | (선택) 내가 참여 신청한 매칭에 "수락 대기" 등 뱃지 표시. 목록 API에 myParticipation 포함 여부에 따라 구현 |

---

## 권장 진행 순서

```
Phase 1 (타입/API) → Phase 2 (참여 신청/취소) → Phase 3 (방장 신청 관리 + KICK) → Phase 3b (매칭 수정) → Phase 4 → Phase 5
```

Phase 2·3·3b는 Phase 1 완료 후 일부 병렬 가능. **Phase 3b**는 방장 UX 보강용으로 우선순위 조정 가능.

---

## Enum 참조 (Sprint3-API)

### ParticipantStatus

| 값 | 설명 |
|----|------|
| PENDING | 대기 중 (방장 미확인) |
| ACCEPTED | 수락됨 (확정) |
| REJECTED | 거절됨 |
| WAITING | 대기열 |
| RESERVED | 참여 기회 부여됨 (15분 내 수락 대기) |
| CANCELLED | 본인 취소 (대기 상태 해제) |

### 에러 코드 (Sprint 3)

| 코드 | HTTP | 사용자 메시지 예시 |
|------|------|-------------------|
| MATCH_NOT_FOUND | 404 | 매칭을 찾을 수 없습니다 |
| MATCH_NOT_RECRUITING | 400 | 모집 중인 매칭이 아닙니다 |
| ALREADY_APPLIED | 400 | 이미 신청한 매칭입니다 |
| HOST_CANNOT_APPLY | 400 | 방장은 참여 신청할 수 없습니다 |
| PARTICIPANT_NOT_FOUND | 404 | 참여 내역을 찾을 수 없습니다 |
| INVALID_STATUS | 400 | 이미 처리된 신청이거나 수락할 수 없는 상태입니다 |
| MATCH_FULL | 400 | 정원이 가득 찼습니다 |
| CANNOT_CANCEL | 400 | 취소할 수 없는 상태입니다 |
| OFFER_EXPIRED | 400 | 참여 기회가 만료되었습니다 |
| FORBIDDEN | 403 | 권한이 없습니다 (방장 전용 API) |
| BAD_REQUEST | 400 | 매칭 수정 시 정원·날짜·제목 등 유효성 위반 |

---

## 체크리스트 (스프린트 종료 전)

- [x] 참여 신청(멘트 입력) → PENDING/WAITING 반환
- [x] 방장이 신청 목록에서 수락/거절 → ACCEPTED/REJECTED
- [x] 참여 취소 → 대기열 1번 RESERVED (백엔드 동작 확인)
- [ ] RESERVED 상태에서 수락 → ACCEPTED, 거절 → CANCELLED
- [ ] canApply, canCancel, hasWaitingOffer에 따른 버튼 노출 정상
- [ ] offerExpiresAt 1분 미만 시 "곧 만료됩니다!" 시각적 피드백
- [ ] isEmergencyMode 시 WAITING 사용자에게 선착순 참여 기회 UI
- [ ] OFFER_EXPIRED 시 자동 새로고침 + 대기열 UI 전환
- [ ] 에러 코드별 사용자 친화적 메시지 표시
- [ ] 비로그인/방장 접근 시 적절한 UI 처리
- [ ] 방장: 확정 참여자 **추방(KICK)** 후 목록·정원 갱신
- [ ] 방장: **매칭 수정**(RECRUITING) partial update · maxPeople ≥ currentPeople
- [ ] 거절(REJECTED) 후 **canApply** 로 재신청 UI

---

## 백엔드 미반영 시 프론트 대응

| 백엔드 요구사항 | 미반영 시 프론트 대응 |
|-----------------|------------------------|
| serverTime | offerExpiresAt을 클라이언트 시계 기준으로 해석. 1분 미만 카운트다운은 그대로 구현 |
| isEmergencyMode | WAITING + hasWaitingOffer 조합으로 추론 시도. 불가 시 긴급 모드 UI 생략 |
| level, interestRegions | 신청자 카드에 nickname, ratingScore, applyMessage만 표시 |
