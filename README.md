# 마이코드 · MY CODE

이미지를 브라우저에서 WebP/JPG/PNG로 변환하고 Firebase Storage에 업로드해 CDN URL로 사용할 수 있도록 만든 개인 이미지 작업 도구입니다.

## 현재 구현

- 여러 이미지 드래그앤드롭 / 파일 선택
- JPG · PNG · WEBP 입력
- WebP · JPG · PNG 출력
- 품질 조정
- 최대 가로폭 1200 / 1600 / 2000 / 3000px 및 원본 유지
- 원본 비율 자동 유지
- 변환 전/후 용량 표시
- 변환 이미지 로컬 저장
- Firebase Storage 연결 구조
- Firebase 업로드 진행률
- 업로드 완료 후 CDN URL 복사
- 반응형 UI

## Firebase 연결

`firebase-config.js`의 예시 값을 Firebase Console에서 발급받은 웹 앱 설정값으로 교체합니다.

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

> Firebase 웹 config는 일반적인 서버 비밀키가 아닙니다. 업로드/삭제 권한은 반드시 Firebase Authentication과 Storage Security Rules로 제한합니다.

## 다음 작업

1. Firebase 프로젝트 연결
2. Firebase Storage 활성화
3. 관리자 로그인 추가
4. 관리자 계정 UID 기준 Storage Rules 적용
5. 업로드 기록 / 최근 이미지 관리 기능 추가
6. HTML · CSS background · Markdown 코드 복사 기능 추가

## 구조

```text
my-code/
├── index.html
├── style.css
├── app.js
├── firebase-config.js
└── README.md
```
