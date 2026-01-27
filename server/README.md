# Gen AI Playground - Proxy Server

Kling AI API CORS 문제를 해결하기 위한 프록시 서버입니다.

## 기능

- Kling AI API 요청을 중계
- CORS 헤더 추가로 브라우저에서 안전하게 API 호출
- API 키를 서버 측에서 안전하게 처리

## 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
루트 디렉토리의 `.env` 파일에 Kling API 키 추가:
```
VITE_KLING_API_KEY=your_kling_access_key
```

### 3. 서버 실행
```bash
npm start
```

서버는 `http://localhost:3001`에서 실행됩니다.

## API 엔드포인트

### POST /api/kling/videos/image2video
비디오 생성 작업 시작

### POST /api/kling/videos/image2video/:taskId
작업 상태 확인

### GET /health
서버 헬스체크

## 로그

- 📤 요청 정보
- ⏳ 진행 상황
- ✅ 성공
- ❌ 에러
