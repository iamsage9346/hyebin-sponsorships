# 광고 협찬 관리 (Sponsorship Manager)

인스타그램 광고/협찬 진행 상황을 Notion 데이터베이스처럼 관리하는 웹 스프레드시트.

## 기능

- **셀 직접 편집** + 키보드 내비게이션
  - 셀 클릭(선택) → 한 번 더 클릭하거나 `Enter`로 편집, 또는 바로 타이핑
  - `Enter` 확정 후 아래로, `Tab`/`Shift+Tab` 좌우, 방향키 이동, `Esc` 취소
  - `Backspace`/`Delete`로 셀 비우기
- **색상 태그**: 콘텐츠 종류 / 진행상태 / 입금상태를 pill 형태 색상으로 표시 (미촬영 행은 연빨강 강조)
- **컬럼 필터**: select 컬럼은 다중 선택 체크박스, 텍스트 컬럼은 포함 검색 (여러 컬럼 AND)
- **정렬**: 헤더 클릭 → 오름차순 → 내림차순 → 해제
- **요약**: 광고비 총합 / 입금완료 합계 / 미입금 합계 / 건수(필터 시 표시/전체)
- **행 추가·삭제** (행 호버 시 ✕ 버튼)
- **자동 저장**: `localStorage`에 행 데이터 영속화 (새로고침해도 유지)
- 모바일 가로 스크롤 조회 지원

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드 + 타입체크
```

## 기술 스택

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- 상태: React state + localStorage (서버 DB로 확장 가능한 구조)

## Vercel 배포

1. 이 저장소를 GitHub에 push
2. [vercel.com](https://vercel.com)에서 **New Project → Import**
3. 프레임워크 자동 감지(Next.js) → **Deploy**
4. 배포된 URL로 접속

추가 환경변수 없이 그대로 배포됩니다. (데이터는 브라우저별 localStorage에 저장)

## 데이터 구조 / 영속성

- 컬럼 스키마는 코드(`lib/seed.ts`)에서 정의됩니다.
- 사용자가 편집하는 **행 데이터만** `localStorage` 키 `hyebin-sponsorships:rows:v1`에 저장됩니다.
- 저장된 데이터가 없으면 시드 데이터(`lib/seed.ts`)로 시작합니다.

## 향후 확장 (코드 구조상 용이)

- 영속성을 `lib/storage.ts`만 교체해 Supabase / Vercel Postgres로 전환
- 컬럼 추가/삭제 UI, CSV 내보내기/가져오기, 월별 입금 대시보드
