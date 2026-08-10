# my:code Firebase architecture

이 폴더는 my:code를 Firebase 기반 운영 서비스로 전환하기 위한 준비 구조입니다.

## Services

- Firebase Authentication: Google / 이메일 간편가입
- Cloud Firestore: 사용자, MY CODE 이미지 메타데이터, 프로젝트
- Cloud Storage for Firebase: 실제 이미지 파일
- Firebase Hosting + trusted server route: 짧은 이미지 URL 연결 예정

## Firestore structure

```text
users/{uid}
  email
  displayName
  plan            // free | basic | pro
  createdAt

users/{uid}/images/{imageId}
  originalName
  displayName
  storagePath
  shortCode
  publicUrl
  format
  width
  height
  originalSize
  optimizedSize
  projectId
  createdAt
  updatedAt

users/{uid}/projects/{projectId}
  name
  createdAt
  updatedAt

shortLinks/{shortCode}
  ownerUid
  imageId
  storagePath
  createdAt
```

`shortLinks`는 브라우저에서 직접 수정하지 않고, 신뢰할 수 있는 서버 코드에서만 생성/조회하는 전제로 설계합니다.

## Storage path

```text
users/{uid}/images/{imageId}/original.ext
users/{uid}/images/{imageId}/optimized.webp
```

한 이미지의 표시 이름이 바뀌어도 실제 저장 키는 `imageId`를 유지해서 기존 링크가 깨지지 않도록 합니다.

## Short URL target

최종적으로 사용자에게 보이는 코드는 Firebase 원본 다운로드 URL을 그대로 노출하지 않고 다음처럼 짧게 제공하는 방향입니다.

```text
https://img.<service-domain>/<shortCode>.webp
```

예:

```html
<img src="https://img.example.com/a8F3k.webp" alt="">
```

짧은 주소는 Hosting/서버 라우트에서 `shortCode`를 실제 Storage 파일과 연결합니다.

## Plans

현재 사이트에는 결제 기능을 연결하지 않고 전부 `오픈 예정`으로 표시합니다.

```text
FREE   0원
BASIC  990원 / 월
PRO    3,990원 / 월
```

실제 저장 용량, 월 업로드량, 이미지 요청량 제한은 운영 테스트 후 확정합니다. 지금 단계에서는 가격만 노출하고 제한 수치를 약속하지 않습니다.

## Next connection steps

1. Firebase 프로젝트 생성
2. Web App 등록 후 `firebase-config.example.js`의 값 확보
3. Authentication에서 Google / 이메일 로그인 활성화
4. Firestore 생성 및 `firestore.rules` 적용
5. Storage 생성 및 `storage.rules` 적용
6. 프론트의 IndexedDB 저장을 Firestore + Storage 동기화 방식으로 전환
7. 짧은 URL 라우트 구현
8. 사용자별 plan / usage 집계 연결

현재 GitHub Pages 미리보기는 서버가 연결되지 않아 로컬 IndexedDB를 사용하며, Base64 코드는 외부 코드로 내보내지 않습니다.
