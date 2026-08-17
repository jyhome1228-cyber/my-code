# 마이코드 · MY CODE

이미지를 Cloudflare R2에 업로드하고 웹사이트에서 바로 사용할 수 있는 **IMAGE URL / HTML / CSS 코드**를 생성하는 이미지 워크스페이스입니다.

## 현재 구조

- Frontend: GitHub Pages
- Image storage: Cloudflare R2
- Upload API: Cloudflare Worker
- Account: Firebase Authentication
- Saved library: Cloud Firestore

## 현재 구현

- 이미지 드래그앤드롭 / 여러 장 업로드
- Cloudflare R2 자동 업로드
- IMAGE URL / HTML / CSS 코드 자동 생성
- 코드 개별 복사
- Pretendard 기반 SOST LABS 스타일 타이포그래피 / 레이아웃 시스템
- Orange 포인트 컬러 기반 MY CODE 브랜드 UI
- Google 로그인 UI
- 이메일 로그인 / 회원가입 UI
- 로그인 사용자별 코드 라이브러리 저장
- 저장된 이미지 검색 / 코드 재복사 / 라이브러리 항목 삭제
- 모바일 반응형

## Firebase Authentication 설정

Firebase Console > Authentication > 로그인 방법에서 아래 공급자를 활성화합니다.

1. Google
2. 이메일/비밀번호

Authentication > Settings > Authorized domains에 아래 도메인을 추가합니다.

```text
jyhome1228-cyber.github.io
```

## Firestore Security Rules

서비스 공개 전에 Firestore 규칙을 아래처럼 설정합니다.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, create, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;

      match /assets/{assetId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Firestore data structure

```text
users/{uid}/assets/{assetId}
```

각 asset에는 다음 값을 저장합니다.

- filename
- fileSize
- mimeType
- imageUrl
- htmlCode
- cssCode
- r2Key
- createdAt

## Worker

Frontend upload endpoint:

```text
https://cool-bar-7c8d.planus253.workers.dev/upload
```

Worker R2 binding:

```text
MYCODE_BUCKET -> mycode
```

## 다음 단계

- `img.mycode.kr` R2 Custom Domain 연결
- 사용자별 사용량 집계
- 저장 용량 / 월 트래픽 플랜 제한
- R2 원본 삭제 API
- 프로젝트/폴더 기능
- Free / Basic / Pro 요금제
