# my:code

이미지를 코드로 간편하게 변환하고, 만든 결과를 `MY CODE`에 편리하게 저장하는 이미지 코드 아카이브.

> 이미지를 코드로 간편하게, 그리고 편리하게 저장하세요.

## 현재 1차 운영 모드

```text
Firebase Authentication  → Google 로그인
Cloud Firestore          → 사용자 계정 / 플랜 정보
IndexedDB                → 이미지 / MY CODE / 프로젝트 (현재 브라우저)
Firebase Storage         → 보류
외부용 짧은 URL          → 정식 오픈 시 제공 예정
```

이미지 저장 비용을 먼저 발생시키지 않고 서비스 사용성을 검증하기 위해, 현재 이미지는 브라우저 IndexedDB에 보관합니다. 다른 기기와 이미지가 동기화되지는 않습니다.

## 핵심 흐름

```text
이미지 업로드
   ↓
WebP 자동 변환
   ↓
MY CODE 자동 보관
   ↓
필요할 때 프로젝트로 정리
```

외부 사이트에서 사용할 짧은 URL / HTML / CSS 코드는 정식 오픈 시 저장소와 함께 연결할 예정입니다. Base64 형태의 긴 코드는 외부 코드로 내보내지 않습니다.

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
- Google Firebase Authentication 연결 준비
- 반응형 모바일 UI

## Pricing — 오픈 예정

현재 결제는 연결하지 않고 모두 `오픈 예정`으로만 노출합니다.

```text
FREE    0원
BASIC   990원 / 월
PRO     3,990원 / 월
```

세부 저장 용량과 사용량 제한은 운영 테스트 후 확정합니다.

## 정식 오픈 단계

사용성과 유료 플랜 반응을 확인한 뒤 다음 기능을 추가합니다.

1. Firebase Storage 또는 적합한 이미지 저장소 연결
2. 계정별 이미지 클라우드 보관
3. 짧은 이미지 URL 라우트
4. HTML / CSS / URL 원클릭 복사
5. 사용자별 사용량 집계
6. FREE / BASIC / PRO 한도 확정
7. 결제 연결

목표 URL 형태:

```html
<img src="https://img.example.com/a8F3k.webp" alt="">
```

## UX 원칙

**DROP → CONVERT → KEEP → COPY**

처음 사용자가 마주하는 행동은 항상 하나, **이미지 올리기**로 유지합니다.
