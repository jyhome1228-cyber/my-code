# my:code

이미지를 코드로 간편하게 변환하고, 만든 코드를 `MY CODE`에 편리하게 저장하는 이미지 코드 아카이브.

> 이미지를 코드로 간편하게, 그리고 편리하게 저장하세요.

## 핵심 흐름

```text
이미지 업로드
   ↓
WebP 자동 변환
   ↓
짧은 URL / HTML / CSS 코드 생성
   ↓
MY CODE 자동 보관
   ↓
필요할 때 프로젝트로 정리
```

프로젝트나 폴더를 먼저 만들 필요가 없습니다. **먼저 올리고, 정리는 나중에** 하는 것이 my:code의 핵심 UX입니다.

## 현재 UI

- 좌측 사이드바 없는 일반 웹서비스 구조
- 중앙 업로드 중심의 간결한 첫 화면
- 블랙 / 화이트 + 딥블루 `#0B3FC7` + 형광그린 `#B7FF00`
- 우측 햄버거에서 `UPLOAD / MY CODE / PROJECTS / PRICING / 계정 / 사용량` 접근
- 이미지 드래그 앤 드롭 / 다중 업로드
- JPG/PNG/WEBP → WebP 자동 변환
- 업로드 즉시 MY CODE 자동 기록
- MY CODE 날짜별 정렬 / 검색
- 프로젝트 폴더 생성 및 분류
- 반응형 모바일 UI

## Pricing — 오픈 예정

현재 결제는 연결하지 않고 모두 `오픈 예정`으로만 노출합니다.

```text
FREE    0원
BASIC   990원 / 월
PRO     3,990원 / 월
```

세부 저장 용량과 사용량 제한은 운영 테스트 후 확정합니다.

## Firebase 운영 구조

실제 운영 버전은 Firebase 중심으로 구성합니다.

```text
Firebase Authentication  → Google / 이메일 간편가입
Cloud Firestore          → MY CODE / 프로젝트 / 사용자 메타데이터
Firebase Storage         → 실제 이미지 저장
짧은 URL 라우트          → 사용자에게 짧은 이미지 코드 제공
```

상세 데이터 구조와 보안 규칙은 `/firebase` 폴더에 준비되어 있습니다.

현재 GitHub Pages 미리보기에서는 이미지가 브라우저 IndexedDB에 임시 저장됩니다. 운영 저장소가 연결되기 전에는 Base64를 외부 코드로 복사하지 않습니다.

## 목표 코드 형태

```html
<img src="https://img.example.com/a8F3k.webp" alt="">
```

Firebase Storage의 실제 파일 경로와 사용자에게 보여주는 짧은 주소를 분리해, 저장 구조가 바뀌어도 기존 사용자 코드가 최대한 깨지지 않게 설계합니다.

## 다음 구현 순서

1. Firebase 프로젝트 연결
2. Google / 이메일 Authentication 실제 활성화
3. Firestore MY CODE / PROJECT 동기화
4. Firebase Storage 실제 이미지 업로드
5. 짧은 URL 라우트 구현
6. 사용자별 사용량 집계
7. FREE / BASIC / PRO 한도 확정
8. 정식 오픈 시 결제 연결

## UX 원칙

**DROP → CONVERT → COPY → KEEP**

기능이 많아져도 사용자가 처음 마주하는 행동은 항상 하나, **이미지 올리기**로 유지합니다.
