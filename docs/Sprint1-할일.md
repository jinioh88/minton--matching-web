# Sprint 1 할일 (To-Do)

> **대상**: React(Next.js) 프론트엔드 개발자  
> **목표**: OAuth2 소셜 로그인·프로필 조회가 동작하는 상태를 만든다.  
> **기간**: 2주  
> **참조**: [스프린트플래닝.md](./스프린트플래닝.md), [제품백로그.md](./제품백로그.md), [common-docs/api/Sprint1-API.md](../common-docs/api/Sprint1-API.md)

> 💡 **백엔드**: 별도 팀에서 담당. 이 문서는 **프론트엔드(React) 작업만** 포함합니다.  
> **API 명세**: 백엔드 개발자 전달 [Sprint1-API.md](../common-docs/api/Sprint1-API.md)를 기준으로 연동하세요.

---

## 완료 조건 (Definition of Done)

- [ ] OAuth2 로그인 후 JWT 발급 및 프로필 조회/수정 가능
- [ ] 신규 사용자 프로필 입력 후 서비스 이용 가능
- [ ] 다른 사용자 프로필 조회 가능

---

## 할일 (프론트엔드)

### 1. 프로젝트 셋업 (완료 여부 확인)

| # | 작업 | 상세 | 완료 |
|---|------|------|------|
| 1-1 | 프로젝트 초기화 | Next.js, TypeScript, Tailwind, Shadcn UI | ☑ |
| 1-2 | API 클라이언트 | Axios 인스턴스, Base URL `http://localhost:8080/api`, JWT Interceptor (`Authorization: Bearer`) | ☑ |
| 1-3 | 인증 스토어 | Zustand authStore. API 응답 `user` 필드(id, nickname, profileImg, profileComplete 등) 매핑 | ☑ |
| 1-4 | **Hydration 관리** | Zustand + localStorage 사용 시 서버/클라이언트 상태 불일치 방지 (persist rehydrate 후 렌더, `suppressHydrationWarning` 등) | ☑ |
| 1-5 | API 연동 확인 | `GET /api/health` 호출로 백엔드 연결 테스트 (선택) | ☑ |

---

### 2. 로그인 화면

> ⚠️ **우선 작업**: OAuth 콜백 페이지(`/oauth/callback`)를 **먼저** 구현하세요. code 추출 → 백엔드 전송의 전담 컴포넌트입니다.

| # | 작업 | 상세 | API | 백로그 ID | 완료 |
|---|------|------|-----|-----------|------|
| 2-0 | **OAuth 콜백 페이지** | `/oauth/callback` 전담 컴포넌트. URL에서 `code` 추출 → `POST /api/auth/oauth/login` 호출 → `data.accessToken`, `data.user` 저장 → `user.profileComplete` 분기 | [Sprint1-API §1](../common-docs/api/Sprint1-API.md#1-oauth2-소셜-로그인) | B2-1 | ☑ |
| 2-1 | 로그인 페이지 | `/login` 라우트 | - | B2-1 | ☑ |
| 2-2 | OAuth 버튼 | 카카오, 네이버, 구글, 애플 로그인 버튼 (각 소셜 인증 URL로 리다이렉트) | - | B2-1 | ☑ |
| 2-3 | 로그인 API 연동 | 콜백에서 `POST /api/auth/oauth/login` 호출 (provider, authorizationCode, redirectUri) | [Sprint1-API §1](../common-docs/api/Sprint1-API.md#1-oauth2-소셜-로그인) | B2-1, B2-2 | ☑ |
| 2-4 | JWT 저장 | accessToken → localStorage + authStore | - | - | ☑ |
| 2-5 | profileComplete 분기 | `data.user.profileComplete === false` → 신규 가입 프로필 화면으로 이동 | - | B2-2 | ☑ |

**API 명세 (Sprint1-API §1)**

- **Request**: `{ provider, authorizationCode, redirectUri }` (provider: KAKAO|NAVER|GOOGLE|APPLE)
- **Response**: `{ success, data: { accessToken, user: { id, email, nickname, profileImg, profileComplete } } }`
- **profileComplete**: `true` → 필수 프로필 완료, `false` → 신규 가입 또는 미입력 → 프로필 입력 유도
- **redirectUri**: 웹 `http://localhost:3000/oauth/callback` (각 소셜 개발자 콘솔에 등록)
- **에러**: `OAUTH_INVALID` (400) 시 로그인 실패 처리

---

### 3. 신규 가입 프로필 화면

| # | 작업 | 상세 | API | 백로그 ID | 완료 |
|---|------|------|-----|-----------|------|
| 3-1 | 프로필 입력 페이지 | `/signup` 또는 `/profile/complete` | - | B2-2, B2-6 | ☑ |
| 3-2 | 닉네임 입력 | `GET /api/users/check-nickname?nickname={nickname}` 중복 체크. Response `data.available` (true/false). 최대 30자 | [Sprint1-API §2](../common-docs/api/Sprint1-API.md#2-닉네임-중복-체크) | B2-6 | ☑ |
| 3-3 | 관심 지역 입력 | **시/군/구 드롭다운 UI** (행정구역 코드 직접 입력 불가). interestLoc1(필수), interestLoc2(선택) → 7~10자리 코드로 변환 | - | B2-6 | ☑ |
| 3-4 | 프로필 저장 | `PATCH /api/users/me` 호출 | [Sprint1-API §4](../common-docs/api/Sprint1-API.md#4-내-프로필-수정) | B2-2 | ☑ |
| 3-5 | 완료 후 이동 | 홈 또는 매칭 목록으로 리다이렉트 | - | - | ☑ |

**API 명세 (Sprint1-API §4)**

- **Request**: `{ nickname?, profileImg?, level?, interestLoc1?, interestLoc2?, racketInfo?, playStyle? }` (신규 가입 시 nickname, interestLoc1 필수)
- **유효성**: nickname 최대 30자, profileImg 최대 2000자(URL만), interestLoc 7~10자리 숫자, racketInfo 최대 100자, playStyle 최대 50자
- **profileImg**: Sprint 1에서는 URL 문자열만 지원 (파일 업로드 Sprint 2)
- **지역 선택**: 시/군/구 드롭다운 → 7~10자리 행정구역 코드로 변환

---

### 4. 내 프로필 화면

| # | 작업 | 상세 | API | 백로그 ID | 완료 |
|---|------|------|-----|-----------|------|
| 4-1 | 내 프로필 페이지 | `/profile` 또는 `/profile/me` | - | B2-4 | ☑ |
| 4-2 | 프로필 조회 | `GET /api/users/me` (JWT 필요) | [Sprint1-API §3](../common-docs/api/Sprint1-API.md#3-내-프로필-조회) | B2-4 | ☑ |
| 4-3 | 프로필 수정 UI | 닉네임, 급수, **관심 지역(시/군/구 드롭다운)**, 라켓, 플레이 스타일 | - | B2-6 | ☑ |
| 4-4 | 프로필 수정 API | `PATCH /api/users/me` 호출 | [Sprint1-API §4](../common-docs/api/Sprint1-API.md#4-내-프로필-수정) | B2-2, B2-6 | ☑ |
| 4-5 | 로그아웃 | authStore 초기화, JWT 삭제, 로그인 페이지 이동 | - | - | ☑ |

**API 응답 필드 (Sprint1-API §3)**

- id, nickname, profileImg, level, interestLoc1, interestLoc2, racketInfo, playStyle, ratingScore, penaltyCount

---

### 5. 타인 프로필 화면

| # | 작업 | 상세 | API | 백로그 ID | 완료 |
|---|------|------|-----|-----------|------|
| 5-1 | 타인 프로필 페이지 | `/profile/[userId]` | - | B2-5 | ☑ |
| 5-2 | 프로필 조회 | `GET /api/users/{userId}` (인증 불필요) | [Sprint1-API §5](../common-docs/api/Sprint1-API.md#5-타인-프로필-조회) | B2-5 | ☑ |
| 5-3 | 읽기 전용 표시 | 수정 버튼 없음, 조회만 가능 | - | B2-5 | ☑ |

---

### 6. 인증 가드 및 라우팅

| # | 작업 | 상세 | 완료 |
|---|------|------|------|
| 6-1 | 비로그인 시 접근 제한 | `/profile`, `/profile/me`, `/signup` 등 → 로그인 페이지로 리다이렉트 | ☑ |
| 6-2 | 로그인 시 로그인 페이지 접근 | `/login` 접근 시 이미 로그인되어 있으면 홈으로 | ☑ |
| 6-3 | 에러 처리 | 401(UNAUTHORIZED) 시 로그아웃 후 로그인 페이지. 400(OAUTH_INVALID) 등 에러 메시지 표시 (apiClient Interceptor) | ☑ |

---

## 7. 주의사항 (개발 시 유의)

| 항목 | 설명 |
|------|------|
| **Hydration 관리** | Zustand + localStorage(persist) 사용 시 Next.js에서 서버 렌더와 클라이언트 상태가 달라 Hydration 에러가 발생할 수 있음. `onRehydrateStorage` 완료 후 UI 렌더, 또는 `useEffect`에서만 클라이언트 전용 상태 접근 등으로 처리 |
| **OAuth 콜백** | `/oauth/callback`은 code 추출·백엔드 전송의 전담 페이지로, 로그인 플로우의 핵심입니다. **먼저 구현** 권장 |
| **지역 선택** | 행정구역 코드(7~10자리)를 사용자가 직접 입력할 수 없으므로, 시/군/구 드롭다운 UI를 이번 스프린트에 포함 |
| **API 필드명** | API 응답은 `profileImg`(profileImageUrl 아님), `interestLoc1`/`interestLoc2` 등 사용. `data` 래퍼로 감싸져 있음 |
| **에러 코드** | BAD_REQUEST(400), UNAUTHORIZED(401), OAUTH_INVALID(400) 등. `response.data.code`로 분기 처리 |

---

## API 요약 (Sprint1-API 기준)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /api/health | 불필요 | 헬스 체크 (연동 확인용) |
| POST | /api/auth/oauth/login | 불필요 | OAuth2 소셜 로그인 |
| GET | /api/users/check-nickname | 불필요 | 닉네임 중복 체크 |
| GET | /api/users/me | **필요** | 내 프로필 조회 |
| PATCH | /api/users/me | **필요** | 내 프로필 수정 |
| GET | /api/users/{userId} | 불필요 | 타인 프로필 조회 |

**Base URL**: `http://localhost:8080/api`  
**인증**: `Authorization: Bearer {accessToken}`  
**공통 응답**: `{ success, message?, data? }` (실패 시 `code`: BAD_REQUEST, UNAUTHORIZED, OAUTH_INVALID 등)

---

## Enum 참조 (Sprint1-API)

| Provider | Level |
|----------|-------|
| KAKAO, NAVER, GOOGLE, APPLE | A, B, C, D, BEGINNER |

---

## 체크리스트 (스프린트 종료 시)

- [ ] 카카오 로그인 → JWT 발급 → 프로필 조회 가능
- [ ] 네이버/구글/애플 중 1개 이상 추가 로그인 동작
- [ ] 신규 사용자: 닉네임·관심 지역 입력 후 서비스 이용 가능
- [ ] 내 프로필 조회·수정 가능
- [ ] 타인 프로필 조회 가능 (URL `/profile/123` 등)
- [ ] 비로그인 시 보호된 페이지 접근 시 로그인 페이지로 이동
- [ ] OAuth 콜백(`/oauth/callback`)에서 code 추출 후 백엔드 연동 동작
- [ ] 관심 지역 시/군/구 드롭다운 UI로 선택 가능
- [ ] Hydration 에러 없이 authStore 동작
- [ ] API 응답 필드명(profileImg 등) 및 에러 코드(OAUTH_INVALID 등) 처리
