# 🔑 API 키 자동 저장 가이드

NanoBanana에서 API 키를 자동으로 저장하고 관리하는 방법입니다.

---

## 🎯 API 키 저장 방법 (2가지)

### 방법 1: .env 파일 (권장) ⭐

**장점:**
- ✅ 앱 시작시 자동 로드
- ✅ 매번 입력할 필요 없음
- ✅ 팀원들과 공유 가능 (.gitignore 제외시)
- ✅ 개발/운영 환경 분리 가능

**설정 방법:**

```bash
# 1. .env.example을 .env로 복사
cp .env.example .env

# 2. .env 파일 편집
nano .env
```

**입력 예시:**

```env
# Google Gemini API
VITE_GEMINI_API_KEY=AIzaSyBCDE123456789FGHIJKLMNOPQRSTUVwxyz

# Kling AI API (AccessKey:SecretKey 형식)
VITE_KLING_API_KEY=ak_1234567890abcdef:sk_abcdef1234567890

# AWS S3 (선택 사항)
VITE_AWS_REGION=us-east-1
VITE_AWS_S3_BUCKET=nanobanana-media
VITE_AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
VITE_AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**저장 후:**

```bash
# 개발 서버 재시작 (필수!)
npm run dev:all
```

✅ **앱이 시작되면 API 키가 자동으로 로드됩니다!**

---

### 방법 2: Settings에서 입력 (간단)

**장점:**
- ✅ 파일 편집 불필요
- ✅ GUI로 쉽게 입력
- ✅ 즉시 적용 (재시작 불필요)

**설정 방법:**

```
1. 앱 실행
2. 상단 우측 "API Key" 버튼 클릭
3. Google Gemini API Key 입력
4. Kling AI API Key 입력 (AccessKey:SecretKey)
5. "저장" 버튼 클릭
```

✅ **localStorage에 자동 저장되어 다음에도 유지됩니다!**

---

## 🔄 작동 방식

### 우선순위

```
1. Settings에서 입력한 API 키 (최우선)
   ↓
2. .env 파일의 API 키 (폴백)
   ↓
3. Mock 모드 (API 키 없을 때)
```

### 자동 로드 과정

```
앱 시작
    ↓
┌─────────────────────────┐
│ 1. .env 파일 읽기       │
│    import.meta.env...   │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 2. localStorage 확인    │
│    저장된 API 키 있음?  │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 3. 우선순위 결정        │
│    localStorage > .env  │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 4. API 키 사용 ✅       │
└─────────────────────────┘
```

---

## 📦 API 키 발급 방법

### Google Gemini API Key

```
1. Google AI Studio 접속
   https://aistudio.google.com/app/apikey

2. "Create API Key" 클릭

3. 프로젝트 선택 또는 생성

4. API 키 복사
   예: AIzaSyBCDE123456789FGHIJKLMNOPQRSTUVwxyz

5. .env 또는 Settings에 입력
```

**무료 할당량:**
- 이미지 생성: 50 requests/day
- 비디오 생성: 제한적

---

### Kling AI API Key

```
1. Kling AI 개발자 페이지 접속
   https://app.klingai.com/global/dev/api-key

2. 로그인 (WeChat 또는 이메일)

3. "Create API Key" 클릭

4. Access Key와 Secret Key 받기
   Access Key: ak_1234567890abcdef
   Secret Key: sk_abcdef1234567890

5. 콜론(:)으로 연결
   ak_1234567890abcdef:sk_abcdef1234567890

6. .env 또는 Settings에 입력
```

**가격:**
- Kling 1.6: 비교적 저렴
- Kling 2.5 Pro: 고급 (구독 필요)

---

## 🔐 보안

### .env 파일 보안

```bash
# .gitignore에 .env 추가 (이미 되어 있음)
.env

# 절대 Git에 커밋하지 마세요!
❌ git add .env  # 절대 금지!
```

### API 키 보호

```
✅ DO:
- .env 파일 사용
- .gitignore에 .env 추가
- 팀원과 안전하게 공유 (Slack DM, 1Password 등)
- 주기적으로 키 재생성

❌ DON'T:
- 코드에 직접 입력
- GitHub에 커밋
- 공개 저장소에 올리기
- 스크린샷 공유시 노출
```

---

## 🧪 테스트

### API 키가 잘 로드되었는지 확인

**브라우저 콘솔(F12)에서:**

```javascript
// Settings 열기 → 콘솔 확인

예상 로그:
🔑 Gemini API 키 자동 로드됨 (.env)
🔑 Kling API 키 자동 로드됨 (.env)
✅ Zustand persist: 상태 복원됨
```

**Settings 모달에서:**

```
Google Gemini API Key
[••••••••••••••••••••••••••••] ← 마스킹된 키

Kling AI API Key
[••••••••••••••••••••••••••••] ← 마스킹된 키
```

---

## 🔄 API 키 업데이트

### .env 파일 업데이트

```bash
# 1. .env 파일 편집
nano .env

# 2. 새 API 키 입력

# 3. 개발 서버 재시작 (필수!)
# Ctrl+C로 서버 중지 → npm run dev:all
```

### Settings에서 업데이트

```
1. Settings 열기
2. 새 API 키 입력
3. "저장" 클릭
4. ✅ 즉시 적용 (재시작 불필요)
```

---

## ❓ 자주 묻는 질문

### Q: .env에 API 키를 입력했는데 Settings에서 보이지 않아요

A: Settings는 localStorage에 저장된 키를 표시합니다. .env의 키는 localStorage가 비어있을 때만 자동으로 로드됩니다.

**해결:**
```
1. Settings에서 API 키 입력란을 비우고 저장
2. 브라우저 새로고침 (⌘R 또는 F5)
3. .env의 키가 자동으로 로드됨
```

---

### Q: API 키를 변경했는데 적용이 안돼요

A: .env 파일 변경시 **개발 서버 재시작**이 필요합니다.

```bash
# 1. 서버 중지 (Ctrl+C)
# 2. 서버 재시작
npm run dev:all
```

---

### Q: .env 파일과 Settings 중 어떤 것을 사용해야 하나요?

A: 둘 다 괜찮지만 목적에 따라 선택하세요.

**개발자/팀:**
- ✅ .env 파일 사용
- 버전 관리 가능 (.gitignore 제외)
- 환경별 설정 분리

**일반 사용자:**
- ✅ Settings 사용
- 파일 편집 불필요
- GUI로 쉽게 관리

---

### Q: Mock 모드가 뭔가요?

A: API 키 없이 테스트할 수 있는 모드입니다.

```
API 키 없음
    ↓
Mock 모드 자동 활성화
    ↓
샘플 데이터로 동작
    ↓
실제 API 호출 안함 (무료)
```

**특징:**
- ✅ API 키 불필요
- ✅ 무료
- ❌ 샘플 이미지/비디오만
- ❌ 실제 생성 불가

---

## 📖 관련 문서

- [AWS-SETUP.md](./AWS-SETUP.md) - AWS S3 설정
- [OPTIMIZATION-GUIDE.md](./OPTIMIZATION-GUIDE.md) - 전체 최적화
- [QUICK-CHECKLIST.md](./QUICK-CHECKLIST.md) - 일일 체크리스트

---

**API 키를 안전하게 관리하세요!** 🔐
