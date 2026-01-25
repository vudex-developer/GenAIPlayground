# Nano Banana Studio

AI 기반 이미지-투-비디오 워크플로우 빌더

## 특징

- 🎨 **노드 기반 워크플로우**: React Flow를 활용한 직관적인 비주얼 편집기
- 🤖 **AI 통합**: Google Gemini, Kling AI API 지원
- 🎬 **비디오 생성**: 이미지에서 고품질 비디오 생성
- 💾 **워크플로우 저장/불러오기**: JSON 파일 및 localStorage 지원
- 🌙 **다크 모드**: 눈에 편한 다크 테마

## 지원 노드

- **Image Import**: 이미지 불러오기
- **Prompt**: 텍스트 프롬프트 입력
- **Motion Prompt**: 모션 설명 입력
- **Nano Image**: Google Gemini로 이미지 생성
- **Gemini Video**: Google Veo로 비디오 생성
- **Kling Video**: Kling AI로 비디오 생성

## 시작하기

### 1. 의존성 설치

```bash
npm install
cd server && npm install && cd ..
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 API 키를 입력하세요:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_KLING_API_KEY=your_kling_access_key
```

### 3. 실행

#### 개발 모드 (프론트엔드 + 프록시 서버 동시 실행)
```bash
npm run dev:all
```

이 명령어는 다음을 동시에 실행합니다:
- **프록시 서버**: http://localhost:3001 (Kling API CORS 해결)
- **프론트엔드**: http://localhost:5173

#### 프론트엔드만 실행
```bash
npm run dev
```

#### 프록시 서버만 실행
```bash
npm run dev:server
```

### 4. 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

프리뷰:
```bash
npm run preview
```

## API 키 설정

앱 실행 후 우측 상단의 **API Key** 버튼을 클릭하여 API 키를 입력하세요.

### Google Gemini API
- [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급

### Kling AI API
- [Kling AI 개발자 페이지](https://app.klingai.com/global/dev/api-key)에서 발급
- Access Key만 입력 (Secret Key 불필요)

## 프록시 서버

Kling AI API는 브라우저에서 직접 호출 시 CORS 에러가 발생합니다.
이를 해결하기 위해 Express 프록시 서버를 사용합니다.

프록시 서버는 `npm run dev:all` 명령으로 자동 실행되며,
`http://localhost:3001`에서 실행됩니다.

자세한 내용은 `server/README.md`를 참조하세요.

## 기술 스택

- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, React Flow
- **State**: Zustand
- **Icons**: Lucide React
- **Backend**: Express.js (Proxy Server)

## 워크플로우 사용법

1. 좌측 툴바에서 노드를 클릭하여 캔버스에 추가
2. 노드 간 연결선(핸들)을 드래그하여 워크플로우 구성
3. 각 노드에 필요한 데이터 입력
4. 각 노드의 **실행** 버튼을 클릭하여 개별 실행

## Mock 모드

API 키 없이 테스트하려면 API 키 입력란을 비워두세요.
Mock 모드에서는 샘플 데이터로 동작합니다.

## 라이선스

MIT
