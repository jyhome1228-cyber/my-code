# CODE IMAGING

이미지를 올리면 웹에서 바로 사용할 수 있는 코드로 변환하고, `MY CODE`에 자동 보관하는 초간편 이미지 코드 라이브러리.

## 현재 1차 구현

- 이미지 드래그 앤 드롭 / 다중 업로드
- JPG/PNG/WEBP → WebP 자동 변환
- GIF/SVG 원본 유지
- 업로드 즉시 자동 저장 — 별도 저장 버튼 없음
- `MY CODE` 날짜별 자동 정렬
- 파일명 / 프로젝트 검색
- URL / HTML / CSS 코드 원클릭 복사
- 다중 선택 → 프로젝트 지정
- 프로젝트 폴더 생성
- 반응형 모바일 UI
- 서버가 연결되지 않아도 테스트 가능한 IndexedDB 로컬 저장
- Cloudflare Pages Functions + R2 업로드 엔드포인트 골격

## 지금의 저장 방식

현재 프론트엔드만 실행하는 경우 변환 이미지는 브라우저 IndexedDB에 저장됩니다. 이 모드는 UI/UX 테스트용입니다.

- 같은 브라우저에서는 새로고침/재방문 후에도 이미지가 남습니다.
- CDN 서버가 연결되기 전에는 복사되는 코드는 이미지 자체가 포함된 Data URL입니다.
- 기기 간 동기화와 외부 CDN 영구 URL은 다음 단계의 계정/서버 연결 후 활성화됩니다.

## 최종 운영 구조

```text
사용자
  ↓
CODE IMAGING
  ├─ Firebase Authentication : 간단 회원가입 / 로그인
  ├─ Firestore               : MY CODE / 프로젝트 / 메타데이터
  └─ Cloudflare R2           : 실제 이미지 원본·변환본
           ↓
      cdn.codeimaging.kr/...
```

사용자가 이미지를 업로드하면:

1. 브라우저에서 WebP 최적화
2. R2에 이미지 저장
3. 고유 CDN URL 발급
4. URL / HTML / CSS 코드 자동 생성
5. 사용자 `MY CODE`에 자동 기록
6. 필요할 때만 프로젝트 폴더로 분류

## Cloudflare R2 연결

`functions/api/upload.js`는 Cloudflare Pages Functions 기준으로 준비되어 있습니다.

필요한 환경 설정:

- R2 bucket binding: `IMAGES`
- Environment variable: `CDN_BASE_URL`

예시:

```text
IMAGES        → code-imaging bucket
CDN_BASE_URL  → https://cdn.codeimaging.kr
```

R2 binding과 CDN 도메인이 연결되면 프론트엔드는 `/api/upload` 응답의 실제 URL을 자동 사용합니다.

## 다음 구현 순서

1. Firebase 이메일/Google 간편 로그인
2. Firestore에 MY CODE / PROJECT 데이터 저장
3. R2 실버킷 생성 및 `IMAGES` binding 연결
4. `cdn.codeimaging.kr` 커스텀 도메인 연결
5. 삭제 대신 휴지통 30일 보관
6. 기존 URL 유지 이미지 교체 기능
7. FREE / PRO 사용량 제한 및 결제
8. 광고 영역

## UX 원칙

> 올리고 → 복사하고 → 필요할 때 정리한다.

사용자에게 프로젝트 생성이나 저장 위치를 먼저 묻지 않습니다. 모든 업로드는 자동으로 `MY CODE`에 들어가고, 프로젝트 분류는 나중에 선택적으로 합니다.
