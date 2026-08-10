# my:code

이미지를 코드로 간편하게 변환하고, 만든 결과를 `MY CODE`에 편리하게 저장하는 이미지 코드 아카이브.

> 이미지를 코드로 간편하게, 그리고 편리하게 저장하세요.

## 현재 1차 운영 모드

```text
Firebase Authentication  → Google 로그인
Cloud Firestore          → 사용자 / 이미지 메타데이터 / 프로젝트
Firebase Storage         → 로그인 사용자의 실제 이미지 저장
IndexedDB                → 비로그인 사용자의 임시 로컬 저장
```

로그인한 사용자가 이미지를 업로드하면 WebP 변환 후 Firebase Storage에 저장하고, 발급된 다운로드 URL을 이용해 URL / HTML / CSS 코드를 생성합니다.

비로그인 사용자는 기존처럼 브라우저 IndexedDB에 이미지를 임시 저장하며 이미지 포함형(Data URL) 코드를 사용할 수 있습니다.

## 핵심 흐름

```text
이미지 업로드
   ↓
WebP 자동 변환
   ↓
로그인: Firebase Storage 저장
비로그인: 브라우저 저장
   ↓
URL / HTML / CSS 코드 생성
   ↓
MY CODE 자동 보관
```

## 현재 UI

- 블랙 / 화이트 + 딥블루 `#0B3FC7` + 형광그린 `#B7FF00`
- 중앙 이미지 업로드 중심 첫 화면
- 우측 햄버거: `UPLOAD / MY CODE / PROJECTS / PRICING`
- JPG / PNG / WEBP → WebP 자동 변환
- URL / HTML / CSS 코드 복사
- MY CODE 날짜별 정렬 / 검색
- 프로젝트 폴더 생성 및 분류
- Google Firebase Authentication
- 반응형 모바일 UI

## Pricing — 오픈 예정

```text
FREE    0원
BASIC   990원 / 월
PRO     3,990원 / 월
```

현재 결제는 연결하지 않고 모두 `오픈 예정`으로만 노출합니다. 실제 저장 용량과 사용량 제한은 운영 데이터를 확인한 뒤 확정합니다.

## Firebase 구조

```text
users/{uid}
users/{uid}/images/{imageId}
users/{uid}/projects/{projectId}

Storage:
users/{uid}/images/{imageId}/optimized.webp
```

보안 규칙은 `/firebase/firestore.rules`, `/firebase/storage.rules`에 준비되어 있습니다.

## 향후

현재는 Firebase가 발급하는 다운로드 URL을 사용합니다. 서비스 도메인이 정해지면 다음처럼 더 짧은 주소를 제공하는 라우트를 추가할 수 있습니다.

```html
<img src="https://img.example.com/a8F3k.webp" alt="">
```

## UX 원칙

**DROP → CONVERT → SAVE → COPY**
