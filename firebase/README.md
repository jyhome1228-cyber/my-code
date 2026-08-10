# my:code Firebase architecture

현재 1차 검증 단계에서는 **Firebase Storage를 사용하지 않습니다.** Firebase는 로그인과 사용자/플랜 정보에만 사용하고, 이미지는 브라우저 IndexedDB에 저장합니다.

## 현재 사용하는 Firebase 서비스

- Firebase Authentication: Google 로그인
- Cloud Firestore: 사용자 계정 / 플랜 정보

## 현재 사용하지 않는 서비스

- Cloud Storage for Firebase: 보류
- Firebase Hosting 기반 짧은 이미지 URL: 보류

## Firestore structure

```text
users/{uid}
  email
  displayName
  photoURL
  plan            // free | basic | pro
  storageMode     // browser
  createdAt
  updatedAt
```

현재 이미지와 프로젝트는 브라우저 IndexedDB / localStorage에 보관합니다. 사용자가 로그인하더라도 이미지 파일 자체는 Firebase에 업로드되지 않습니다.

## Security

`firestore.rules`는 로그인한 사용자 본인의 `users/{uid}` 데이터만 접근할 수 있도록 설계되어 있습니다. 향후 이미지/프로젝트 클라우드 동기화를 추가할 수 있도록 하위 컬렉션 규칙도 준비되어 있습니다.

## Plans

사이트에는 현재 결제 없이 다음 가격만 `오픈 예정`으로 표시합니다.

```text
FREE   0원
BASIC  990원 / 월
PRO    3,990원 / 월
```

저장 용량과 업로드 한도는 실제 운영 테스트 후 확정합니다.

## 향후 Storage 연결 시

```text
users/{uid}/images/{imageId}/optimized.webp
```

같은 식으로 실제 파일을 저장하고, 사용자에게는 Firebase의 긴 다운로드 URL을 그대로 보여주지 않고 다음처럼 짧은 주소를 제공하는 방향입니다.

```text
https://img.<service-domain>/<shortCode>.webp
```

## 다음 단계

1. Firebase Authentication에서 Google 로그인 활성화
2. GitHub Pages 도메인을 Authorized domains에 추가
3. Firestore Rules 적용
4. Google 로그인 / FREE 플랜 계정 생성 테스트
5. 이미지 변환 / MY CODE / 프로젝트 UX 테스트
6. 유료화 반응 확인
7. 필요 시 Storage 및 짧은 URL 연결
