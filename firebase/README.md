# my:code Firebase architecture

현재는 Firebase Authentication + Firestore + Storage를 사용하는 1차 운영 구조입니다.

## 사용 서비스

- Firebase Authentication: Google 로그인
- Cloud Firestore: 사용자 / 이미지 메타데이터 / 프로젝트
- Cloud Storage for Firebase: 로그인 사용자의 실제 이미지 파일

## 사용자 구조

```text
users/{uid}
  email
  displayName
  photoURL
  plan            // free | basic | pro
  storageMode     // firebase
  createdAt
  updatedAt

users/{uid}/images/{imageId}
  imageId
  originalName
  displayName
  storagePath
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
  id
  name
  createdAt
  updatedAt
```

## Storage path

```text
users/{uid}/images/{imageId}/optimized.webp
```

로그인한 사용자 본인의 경로만 읽기/업로드/삭제할 수 있도록 `storage.rules`를 준비했습니다. 업로드 파일은 이미지 형식, 파일당 20MB 미만으로 제한합니다.

## 코드 발급

현재는 Firebase Storage `getDownloadURL()`로 얻은 URL을 `publicUrl`로 사용합니다.

```html
<img src="https://firebasestorage.googleapis.com/..." alt="">
```

향후 서비스 도메인이 확정되면 짧은 URL 라우트를 추가할 수 있습니다.

```text
https://img.<service-domain>/<shortCode>.webp
```

## Plans

```text
FREE   0원
BASIC  990원 / 월
PRO    3,990원 / 월
```

결제는 아직 연결하지 않고 모두 `오픈 예정`입니다. 플랜별 실제 저장량/트래픽 한도는 운영 사용량을 보고 확정합니다.

## Firebase Console에서 필요한 설정

1. Authentication → Google 로그인 활성화
2. Authentication → Authorized domains에 GitHub Pages 도메인 추가
3. Firestore Database 생성 후 `firestore.rules` 적용
4. Storage 생성
5. Storage → Rules에서 `storage.rules` 적용
6. Google 로그인 후 이미지 업로드 테스트

비로그인 업로드는 브라우저 IndexedDB에만 저장하고, 로그인 후 새로 올린 이미지부터 Firebase Storage에 저장합니다.
