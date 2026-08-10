# my:code

이미지를 올리면 웹에서 바로 쓸 수 있는 짧은 코드로 바꾸고, 만든 코드를 `MY CODE`에 자동 보관하는 이미지 코드 아카이브.

> 올리고, 복사하세요. 보관은 my:code가 합니다.

## 핵심 흐름

```text
이미지 업로드
   ↓
WebP 자동 변환
   ↓
CDN URL / HTML / CSS 코드 생성
   ↓
MY CODE 자동 보관
   ↓
필요할 때 프로젝트로 정리
```

프로젝트나 폴더를 먼저 만들 필요가 없습니다. **먼저 올리고, 정리는 나중에** 하는 것이 my:code의 핵심 UX입니다.

## 현재 UI

- 좌측 사이드바 없는 일반 웹서비스 구조
- 중앙 업로드 중심의 간결한 첫 화면
- 블랙 + 화이트 랜딩페이지
- 우측 햄버거 메뉴에서 `UPLOAD / MY CODE / PROJECTS / 계정 / 사용량` 접근
- 이미지 드래그 앤 드롭 / 다중 업로드
- JPG/PNG/WEBP → WebP 자동 변환
- 업로드 즉시 MY CODE 자동 기록
- MY CODE 날짜별 정렬 / 검색
- 프로젝트 폴더 생성 및 분류
- 반응형 모바일 UI

## 저장 구조

현재 GitHub Pages 미리보기에서는 이미지가 브라우저 IndexedDB에 임시 저장됩니다. 외부 웹사이트에 붙이는 코드는 Base64 방식으로 내보내지 않습니다.

실제 운영 버전은 다음 구조를 사용합니다.

```text
Firebase Authentication  → 간편가입 / 로그인
Firestore                → MY CODE / 프로젝트 / 메타데이터
Cloudflare R2            → 실제 이미지 저장
CDN                      → 짧은 영구 이미지 URL
```

R2/CDN이 연결되면 다음처럼 짧은 코드가 발급됩니다.

```html
<img src="https://cdn.example.com/image-id.webp" alt="">
```

## UX 원칙

**DROP → CONVERT → COPY → KEEP**

기능이 많아져도 사용자가 처음 마주하는 행동은 항상 하나, **이미지 올리기**로 유지합니다.
