# 🚀 Nano Banana Studio - 배포 가이드

## 📋 준비물
- GitHub 계정
- Vercel 계정 (무료)

---

## 방법 1: Vercel CLI (가장 빠름 - 5분)

### 1단계: 배포
```bash
cd /Users/lukemacbookpro/nano-banana-studio
npx vercel
```

### 2단계: 질문에 답변
```
? Set up and deploy "nano-banana-studio"? [Y/n] → Y
? Which scope do you want to deploy to? → [Your Name]
? Link to existing project? [y/N] → N
? What's your project's name? → nano-banana-studio
? In which directory is your code located? → ./
? Want to override the settings? [y/N] → N
```

### 3단계: 완료!
```
✅ Deployed to production: https://nano-banana-studio-xxxx.vercel.app
```

→ 이 URL을 팀원들에게 공유!

---

## 방법 2: GitHub + Vercel (권장 - 자동 배포)

### 1단계: GitHub 저장소 생성
1. https://github.com/new 방문
2. Repository name: `nano-banana-studio`
3. Private 선택
4. Create repository

### 2단계: 코드 푸시
```bash
cd /Users/lukemacbookpro/nano-banana-studio
git remote add origin https://github.com/[YOUR_USERNAME]/nano-banana-studio.git
git branch -M main
git push -u origin main
```

### 3단계: Vercel 연결
1. https://vercel.com 로그인
2. "Add New Project" 클릭
3. "Import Git Repository" 선택
4. `nano-banana-studio` 선택
5. "Deploy" 클릭

### 4단계: 완료!
```
✅ Deployed: https://nano-banana-studio.vercel.app
```

→ 코드를 수정하고 `git push`하면 자동 재배포!

---

## 📱 팀원 사용 방법

### 1. URL 공유
```
https://nano-banana-studio.vercel.app
```

### 2. API 키 입력
각 팀원이 자신의 API 키를 입력:
- 우측 상단 "API Key" 클릭
- Google Gemini API Key 입력
- Kling API Key 입력 (선택)

### 3. 워크플로우 공유
- Export 버튼으로 JSON 파일 저장
- 팀원에게 파일 공유
- Import 버튼으로 불러오기

---

## 🔧 환경 변수 (선택)

팀원들이 매번 API 키를 입력하지 않으려면:

### Vercel 대시보드에서:
1. Project Settings → Environment Variables
2. 추가:
   ```
   VITE_GEMINI_API_KEY = your-api-key
   VITE_KLING_API_KEY = your-kling-key
   ```
3. Redeploy

---

## 💡 도메인 변경 (선택)

### 커스텀 도메인 연결:
1. Vercel 대시보드 → Settings → Domains
2. 도메인 추가 (예: nanoBanana.company.com)
3. DNS 설정

---

## ⚠️ 주의사항

### API 비용
- 각 팀원이 자신의 API 키 사용 권장
- 공용 API 키 사용 시 비용 관리 필요

### 데이터 저장
- 현재: 브라우저 localStorage (각 팀원 로컬)
- 공유 필요 시: Export/Import 사용

---

## 🆘 문제 해결

### 빌드 실패
```bash
npm run build
# 로컬에서 먼저 테스트
```

### 배포 후 흰 화면
- Vercel 설정에서 Framework Preset: Vite 확인
- Output Directory: dist 확인

### API 키 오류
- 팀원들이 각자 API 키 입력했는지 확인
- API 키 할당량 확인

---

## 📞 지원

문제가 있으면 저에게 연락주세요!
