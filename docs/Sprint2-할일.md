# Sprint 2 할일 (프론트엔드)

> 참조: `common-docs/api/Sprint2-API.md`, `docs/화면/와이어프레임/`

## Sprint 2 개요

| 항목 | 내용 |
|------|------|
| **대상** | 프론트엔드 개발자 |
| **목표** | 매칭 생성·목록·상세 화면 구현, 프로필/매칭 이미지 업로드 연동 |
| **API 문서** | `common-docs/api/Sprint2-API.md` |

---

## 완료 조건 (Definition of Done)

- [ ] 프로필 이미지 업로드 → 프로필 반영
- [ ] 매칭 생성 시 이미지 업로드 가능
- [ ] 매칭 생성 후 목록에 노출
- [ ] 필터(지역, 날짜, 급수)로 목록 조회
- [ ] 매칭 상세에서 모든 정보 확인

---

## Phase 1: 프로필 이미지 업로드

### API 참조

| 메서드 | 경로 | 인증 | Content-Type |
|--------|------|------|--------------|
| POST | `/api/users/me/profile-image` | **필요** | multipart/form-data |

**Request (form-data)**: `image` 필드에 파일 (jpeg, png, gif, webp, 최대 5MB)

**Response**: 업데이트된 프로필 객체 (`profileImg` 포함)

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 1-1 | API 함수 구현 | `uploadProfileImage(file: File)` → FormData로 `image` 전송 |
| 1-2 | 프로필 수정 화면에 이미지 선택 UI | 파일 input, 카메라 버튼 등 (내 프로필 `/profile/me`에서만) |
| 1-3 | 업로드 후 프로필 반영 | 성공 시 `profileImg` 갱신, 쿼리 무효화 |
| 1-4 | 클라이언트 검증 | 5MB 초과, 허용 형식(jpeg/png/gif/webp) 체크 |

### 산출물

내 프로필에서 프로필 사진 변경 시 즉시 반영

---

## Phase 2: 매칭 만들기 화면

### API 참조

| 메서드 | 경로 | 인증 |
|--------|------|------|
| POST | `/api/files/upload` | **필요** |
| POST | `/api/matches` | **필요** |

**1) 이미지 업로드** `POST /api/files/upload`  
- form-data: `file` (필수), `type` (선택: PROFILE, MATCH)  
- response: `{ url, key }` → `url`을 매칭 생성 시 `imageUrl`로 전달

**2) 매칭 생성** `POST /api/matches`  
- Request Body (JSON):

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | O | 제목 (최대 100자) |
| description | string | O | 상세 설명 |
| matchDate | string | O | yyyy-MM-dd |
| startTime | string | O | HH:mm |
| durationMin | number | O | 30~240 |

| locationName | string | X | 장소명 |
| regionCode | string | O | 행정구역 코드 (7~10자리) |
| maxPeople | number | O | 2~12 |
| targetLevels | string | X | "A,B,C" 형태 |
| costPolicy | enum | O | SPLIT_EQUAL, HOST_PAYS, GUEST_PAYS |
| imageUrl | string | X | `/api/files/upload` 응답의 `url` |

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 2-1 | 라우트 및 레이아웃 | `/matching/create` 페이지, 와이어프레임 참고 |
| 2-2 | 폼 입력 항목 | 제목, 상세설명, 날짜, 시작시간, 소요시간, 장소, regionCode, 인원, 급수, 비용분담 |
| 2-3 | 이미지 업로드 UI | 파일 선택 → `POST /api/files/upload` → `url` 획득 → `imageUrl`로 전달 |
| 2-4 | 비용분담 선택 | SPLIT_EQUAL(균등), HOST_PAYS(방장부담), GUEST_PAYS(참가자부담) |
| 2-5 | 매칭 생성 API 연동 | `POST /api/matches` 호출 |
| 2-6 | 생성 성공 시 이동 | 상세 `/matching/[id]` 또는 목록으로 redirect |

### 참고

- 와이어프레임: `docs/화면/와이어프레임/매칭 만들기_와이어프레임_데이터.md`
- regionCode: 관심 지역 코드(REGIONS) 사용 또는 장소 검색 연동

---

## Phase 3: 매칭 목록 화면

### API 참조

| 메서드 | 경로 | 인증 |
|--------|------|------|
| GET | `/api/matches` | 불필요 |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| regionCode | string | X | 단일 또는 쉼표 구분 다중 |
| dateFrom | string | X | yyyy-MM-dd |
| dateTo | string | X | yyyy-MM-dd |
| level | string | X | targetLevels에 포함된 급수 |
| page | number | X | 기본 0 |
| size | number | X | 기본 20 |

**동작**: 로그인 시 regionCode 미전달 → interestLoc1/2를 기본 regionCode로 적용

**Response**: `{ content: MatchListItem[], totalElements, totalPages, size, number }`

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 3-1 | 라우트 | `/` 또는 `/matching` 홈/목록 페이지 |
| 3-2 | 매칭 카드 컴포넌트 | title, matchDate, startTime, locationName, maxPeople, currentPeople, hostNickname, hostProfileImg, hostRatingScore, status, imageUrl |
| 3-3 | 관심 지역 전환 | regionCode 드롭다운/탭 (interestLoc1, interestLoc2) |
| 3-4 | 필터 UI | dateFrom/dateTo, level (급수) |
| 3-5 | 목록 API 연동 | `GET /api/matches` + 쿼리 파라미터 |
| 3-6 | 페이징 | page, size 파라미터 또는 무한 스크롤 |
| 3-7 | 카드 클릭 시 상세 이동 | `/matching/[id]` |

### 참고

- 와이어프레임: `docs/화면/와이어프레임/홈화면_와이어프레임_데이터.md`
- status: RECRUITING(모집중), CLOSED(마감), FINISHED(종료), CANCELLED(취소)

---

## Phase 4: 매칭 상세 화면

### API 참조

| 메서드 | 경로 | 인증 |
|--------|------|------|
| GET | `/api/matches/{matchId}` | 불필요 |

**Response**: matchId, hostId, title, description, matchDate, startTime, durationMin, locationName, regionCode, maxPeople, currentPeople, targetLevels, costPolicy, status, imageUrl, host { id, nickname, profileImg, ratingScore }, confirmedParticipants[], waitingList[], waitingCount

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 4-1 | 라우트 | `/matching/[id]` 동적 라우트 |
| 4-2 | 상세 정보 표시 | 제목, 장소, 일시, 인원, 급수, 코트비, 이미지, 본문 |
| 4-3 | 방장 프로필 요약 | host.profileImg, host.nickname, host.ratingScore, 프로필 링크 |
| 4-4 | 참여자 현황 | confirmedParticipants, waitingCount |
| 4-5 | 상세 API 연동 | `GET /api/matches/{matchId}` |
| 4-6 | 로딩/에러 처리 | Skeleton, 404, 에러 메시지 |

### 참고

- 와이어프레임: `docs/화면/와이어프레임/상세화면_와이어프레임_데이터.md`
- costPolicy 표시: SPLIT_EQUAL → "균등 분담", HOST_PAYS → "방장 부담", GUEST_PAYS → "참가자 부담"

---

## Phase 5: 네비게이션 및 통합

### 할일

| 순서 | 작업 | 상세 |
|------|------|------|
| 5-1 | 네비게이션 구조 | 홈(매칭 목록), 매칭 만들기, 프로필 탭 |
| 5-2 | 매칭 만들기 진입점 | FAB 또는 탭에서 `/matching/create` 이동 |
| 5-3 | E2E 확인 | 로그인 → 프로필 이미지 업로드 → 매칭 생성 → 목록 → 상세 |

---

## 권장 진행 순서

```
Phase 1 (프로필 이미지) → Phase 2 (매칭 만들기) → Phase 3 (목록) → Phase 4 (상세) → Phase 5 (네비통합)
```

Phase 2와 3은 병렬 가능. Phase 4는 Phase 3 이후.

---

## Enum 참조 (Sprint2-API)

### CostPolicy

| 값 | 설명 |
|----|------|
| SPLIT_EQUAL | 균등 분담 |
| HOST_PAYS | 방장 부담 |
| GUEST_PAYS | 참가자 부담 |

### MatchStatus

| 값 | 설명 |
|----|------|
| RECRUITING | 모집 중 |
| CLOSED | 모집 마감 |
| FINISHED | 종료 |
| CANCELLED | 취소 |

---

## 체크리스트 (스프린트 종료 전)

- [ ] 프로필 이미지 업로드 → 프로필 반영
- [ ] 매칭 생성(이미지 포함) → 목록 노출
- [ ] 필터(regionCode, dateFrom, dateTo, level)로 목록 조회
- [ ] 매칭 상세에서 방장, 참여 현황 확인
- [ ] 네비게이션(홈, 매칭 만들기, 프로필) 동작
