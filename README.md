# 🎮 Gen AI Playground

**AI 기반 이미지 & 비디오 생성 워크플로우 빌더**

노드 기반 비주얼 에디터로 AI 생성 파이프라인을 쉽게 구축하세요!

---

## ✨ 주요 기능

### 🎨 **노드 기반 워크플로우**
- React Flow 기반 직관적인 비주얼 편집기
- 드래그 앤 드롭으로 노드 연결
- 실시간 미리보기

### 🤖 **AI 통합**
- **Gemini Imagen 3**: 고품질 이미지 생성
- **Gemini Video (Veo 2)**: 텍스트/이미지에서 비디오 생성
- **Kling Video**: 프로페셔널 비디오 생성

### ⏪ **Undo/Redo**
- ⌘Z / Ctrl+Z: 되돌리기
- ⌘⇧Z / Ctrl+Shift+Z: 다시 실행
- 최근 20개 상태 자동 저장

### 💾 **Export/Import**
- 워크플로우를 JSON 파일로 저장
- 팀원들과 워크플로우 공유
- 데이터 손실 방지

### 🎬 **고급 기능**
- 생성 중 Stop 기능
- 실시간 진행률 표시
- 사용자 친화적 에러 메시지
- 다크 모드 UI

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

## 📖 사용 방법

### 1️⃣ **워크플로우 구성**
```
1. 좌측 팔레트에서 노드를 클릭하여 캔버스에 추가
2. 노드 핸들을 드래그하여 연결
3. 노드를 클릭하여 우측 패널에서 설정
4. 각 노드의 "실행" 버튼 클릭
```

### 2️⃣ **빠른 입력**
- **TextPrompt 노드**: 노드 안에서 바로 프롬프트 작성
- **ImageImport 노드**: 노드 안에서 바로 이미지 업로드

### 3️⃣ **키보드 단축키**
- `⌘Z` / `Ctrl+Z`: 되돌리기
- `⌘⇧Z` / `Ctrl+Shift+Z`: 다시 실행
- `Delete`: 선택한 노드 삭제

### 4️⃣ **워크플로우 저장/공유**
```
1. Export 버튼 → JSON 파일 저장
2. 팀원에게 파일 공유
3. Import 버튼 → JSON 파일 불러오기
```

---

## 🚀 배포 (팀 공유)

### ⚡ 가장 빠른 방법 (5분)
```bash
cd /Users/lukemacbookpro/gen-ai-playground
npx vercel
```
→ URL이 생성되면 팀원들에게 공유!

### 📝 자세한 배포 가이드
`DEPLOYMENT.md` 파일을 참고하세요.

---

## 💡 Mock 모드

API 키 없이 테스트하려면 API 키 입력란을 비워두세요.
Mock 모드에서는 샘플 데이터로 동작합니다.

---

## 🎯 예제 워크플로우

### 이미지 생성
```
TextPrompt → Nano Banana
```

### 이미지 업스케일
```
ImageImport → TextPrompt → Nano Banana
```

### 비디오 생성
```
TextPrompt → MotionPrompt → Gemini Video
```

### 이미지-투-비디오
```
ImageImport → MotionPrompt → Kling Video
```

---

## 📦 프로젝트 구조

```
gen-ai-playground/
├── src/
│   ├── components/      # UI 컴포넌트
│   │   ├── nodes/       # 노드 컴포넌트
│   │   └── icons/       # 커스텀 아이콘
│   ├── stores/          # Zustand 스토어
│   ├── services/        # API 클라이언트
│   ├── types/           # TypeScript 타입
│   └── assets/          # 이미지, 로고
├── server/              # 프록시 서버
└── dist/                # 빌드 결과물
```

---

## 🛠️ 개발

### 코드 수정 후 자동 재배포 (GitHub + Vercel)
```bash
git add .
git commit -m "Update: ..."
git push
```
→ Vercel이 자동으로 재배포!

---

## ⚡ 성능 최적화

### 📊 저장소 구조

앱은 세 가지 저장소를 지원합니다:

- **localStorage (5MB)**: 워크플로우 구조, API 키, 백업
- **IndexedDB (수백 MB)**: 이미지, 비디오 (자동 압축) - 기본
- **AWS S3 (무제한)**: 클라우드 저장소 (선택 사항) - [설정 가이드](./AWS-SETUP.md)

### 🤖 자동 최적화 (이미 작동 중!)

✅ **이미지 자동 압축** (2048px 이상 → 자동 리사이즈)  
✅ **오래된 미디어 자동 삭제** (30일 후)  
✅ **오래된 백업 자동 삭제** (7일 후)  
✅ **localStorage 자동 관리** (90% 초과시 경고)  
✅ **1초 debounce로 저장 최적화**  
✅ **AWS S3 자동 업로드** (설정시 무제한 저장소)

### 📖 상세 가이드

- **AWS S3 클라우드 저장소**: [AWS-SETUP.md](./AWS-SETUP.md) ⭐ 추천!
- **빠른 체크리스트**: [QUICK-CHECKLIST.md](./QUICK-CHECKLIST.md)
- **전체 최적화 가이드**: [OPTIMIZATION-GUIDE.md](./OPTIMIZATION-GUIDE.md)

### 💡 권장 사항

| 항목 | 권장 | 위험 |
|------|------|------|
| 노드 개수 | 50개 미만 | 100개 이상 |
| localStorage | 70% 미만 | 90% 이상 |
| 이미지 크기 | 2048px 이하 | 4096px 이상 |

### 🚨 긴급 상황

**localStorage 가득 참 (QuotaExceededError)?**

```bash
1. Export로 백업 (필수!)
2. 브라우저 콘솔(F12)에서:
   localStorage.clear()
   location.reload()
3. Import로 백업 복원
```

---

## 🆘 문제 해결

### Q: 이미지 생성이 안 돼요
A: API 키를 확인하세요. 우측 상단 "API Key" 버튼에서 입력.

### Q: "할당량 초과" 오류
A: Google AI Studio에서 할당량을 확인하세요.

### Q: Kling Video 오류
A: 프록시 서버가 실행 중인지 확인 (`npm run dev:all`).

### Q: 캐시 지우면 데이터가 사라져요
A: Export 버튼으로 백업하세요!

### Q: 노드가 삭제 안 돼요
A: localStorage가 가득 찼을 수 있습니다. [QUICK-CHECKLIST.md](./QUICK-CHECKLIST.md) 참조.

### Q: 앱이 느려요
A: 노드 개수를 확인하세요 (100개 이상이면 워크플로우 분리 권장).

---

## 📄 라이선스

MIT

---

## 🙏 크레딧

- React Flow
- Google Gemini API
- Kling AI API
- VUDEX
