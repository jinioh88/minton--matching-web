# 배드민턴 매칭 웹

누구나 자유롭게 배드민턴을 매칭해서 치는 문화를 만듭니다.

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **상태 관리**: Zustand, TanStack Query
- **API**: Axios (JWT Interceptor)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 참고하여 `.env.local`을 생성합니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

### 3. 개발 서버 실행

```bash
npm run dev
```

- **URL**: http://localhost:3000

### 4. API 연동 테스트

백엔드가 실행 중일 때 http://localhost:3000/api-test 에서 헬스체크 API 연동을 확인할 수 있습니다.

## 프로젝트 구조

```
src/
├── app/              # App Router 페이지
├── components/       # 공통 컴포넌트
├── hooks/            # 커스텀 훅
├── lib/              # API 클라이언트, 유틸
├── stores/           # Zustand 스토어
└── types/            # TypeScript 타입
```

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run lint` | ESLint 실행 |

## 참고 문서

- [개발환경설정](./docs/개발환경설정.md)
- [제품백로그](./docs/제품백로그.md)
- [API 문서](../common-docs/api/README.md)
