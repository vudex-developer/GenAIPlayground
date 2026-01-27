# ☁️ AWS S3 설정 가이드

NanoBanana를 AWS S3와 연동하여 무제한 클라우드 저장소를 사용하는 방법입니다.

---

## 🎯 설정 효과

### Before (IndexedDB만)
```
❌ 브라우저 용량 한계 (수백 MB)
❌ 캐시 삭제시 데이터 손실
❌ 디바이스간 동기화 불가
```

### After (AWS S3)
```
✅ 무제한 저장 용량
✅ 안전한 클라우드 백업
✅ 멀티 디바이스 준비 완료
✅ 오프라인 캐시 자동 관리
```

---

## 📋 1단계: AWS S3 버킷 생성

### 1. AWS 콘솔 접속
```
https://console.aws.amazon.com/s3/
```

### 2. 버킷 생성
```bash
버킷 이름: nanobanana-media
리전: us-east-1 (또는 원하는 리전)

# 설정:
□ 퍼블릭 액세스 차단: 모두 체크 (보안 유지)
□ 버전 관리: 활성화 (선택 사항)
□ 암호화: 활성화 (권장)
```

### 3. CORS 설정

S3 버킷 → **권한** → **CORS(Cross-origin resource sharing)**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**중요:** `your-production-domain.com`을 실제 배포 URL로 변경하세요!

---

## 🔑 2단계: IAM 사용자 생성

### 1. IAM 콘솔 접속
```
https://console.aws.amazon.com/iam/
```

### 2. 사용자 생성
```bash
사용자 이름: nanobanana-s3-user
액세스 유형: 액세스 키 - 프로그래밍 방식 액세스
```

### 3. 권한 설정

**방법 A: 기존 정책 사용 (간단)**
```
정책: AmazonS3FullAccess
```

**방법 B: 커스텀 정책 (권장 - 최소 권한)**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::nanobanana-media",
        "arn:aws:s3:::nanobanana-media/*"
      ]
    }
  ]
}
```

### 4. 액세스 키 저장
```
✅ Access Key ID 복사
✅ Secret Access Key 복사

⚠️ 주의: Secret Key는 이 화면에서만 확인 가능!
```

---

## ⚙️ 3단계: 환경 변수 설정

### 1. `.env` 파일 생성/수정

```bash
cd ~/Documents/GitHub/gen-ai-playground
nano .env
```

### 2. AWS 설정 추가

```bash
# AI API Keys (기존)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_KLING_API_KEY=your_kling_access_key_here

# AWS S3 Configuration (새로 추가)
VITE_AWS_REGION=us-east-1
VITE_AWS_S3_BUCKET=nanobanana-media
VITE_AWS_ACCESS_KEY_ID=AKIA...
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### 3. 저장 및 재시작

```bash
# 저장 (nano)
Ctrl+X → Y → Enter

# 개발 서버 재시작
npm run dev:all
```

---

## ✅ 4단계: 동작 확인

### 1. 앱 열기
```
http://localhost:5173
```

### 2. Settings 확인
```
Settings 버튼 → AWS S3 섹션 확인

예상 출력:
☁️ AWS S3 (클라우드)
✅ 활성화
🌎 Region: us-east-1 | 📦 Bucket: nanobanana-media
```

### 3. 이미지 생성 테스트
```
1. Nano Image 노드 생성
2. 이미지 생성
3. 브라우저 콘솔(F12) 확인

예상 로그:
✅ 이미지 압축: ...
☁️ S3 업로드 완료: images/node-abc/xyz.jpg (2.31 MB)
☁️ S3 저장 완료: xyz
```

### 4. S3 콘솔 확인
```
S3 콘솔 → nanobanana-media 버킷 → images/ 폴더

파일 구조:
nanobanana-media/
├── images/
│   ├── node-abc/
│   │   └── xyz.jpg
│   └── node-def/
│       └── uvw.jpg
└── videos/
    └── node-ghi/
        └── rst.mp4
```

---

## 🔧 트러블슈팅

### 문제 1: "Access Denied" 에러

**원인:** IAM 권한 부족

**해결:**
1. IAM 콘솔 → 사용자 확인
2. 정책이 올바른지 확인
3. 버킷 이름이 정확한지 확인

### 문제 2: CORS 에러

**원인:** CORS 설정 누락

**해결:**
1. S3 콘솔 → 버킷 → 권한 → CORS
2. 위의 CORS 설정 추가
3. `AllowedOrigins`에 현재 도메인 포함 확인

### 문제 3: "S3 비활성화" 표시

**원인:** 환경 변수 누락

**해결:**
```bash
# .env 파일 확인
cat .env

# 필수 변수 확인
VITE_AWS_ACCESS_KEY_ID=?
VITE_AWS_SECRET_ACCESS_KEY=?

# 개발 서버 재시작 (필수!)
npm run dev:all
```

### 문제 4: 이미지가 S3에 업로드 안됨

**원인:** 네트워크 또는 권한 문제

**해결:**
```bash
# 브라우저 콘솔(F12)에서 확인
예상 에러:
❌ S3 업로드 실패: [에러 메시지]

# IndexedDB로 자동 폴백됨 (정상 동작)
💾 IndexedDB 저장: xyz (2.31 MB)
```

---

## 💰 비용 추정

### S3 요금 (us-east-1 기준, 2026년)

| 항목 | 단가 | 예상 사용량 | 월 비용 |
|------|------|------------|---------|
| **저장소** | $0.023/GB | 100 GB | $2.30 |
| **PUT 요청** | $0.005/1000건 | 10,000건 | $0.05 |
| **GET 요청** | $0.0004/1000건 | 50,000건 | $0.02 |
| **데이터 전송** | $0.09/GB | 10 GB | $0.90 |
| **합계** | | | **$3.27** |

### 대규모 사용 (1TB, 100만 요청)

| 항목 | 단가 | 예상 사용량 | 월 비용 |
|------|------|------------|---------|
| **저장소** | $0.023/GB | 1,000 GB | $23.00 |
| **PUT 요청** | $0.005/1000건 | 1,000,000건 | $5.00 |
| **GET 요청** | $0.0004/1000건 | 5,000,000건 | $2.00 |
| **데이터 전송** | $0.09/GB | 100 GB | $9.00 |
| **합계** | | | **$39.00** |

**비용 절감 팁:**
1. S3 Intelligent-Tiering 사용 (자동 비용 최적화)
2. CloudFront CDN 추가 (데이터 전송 비용 절감)
3. Lifecycle 정책 설정 (오래된 파일 자동 삭제)

---

## 🚀 고급 설정 (선택 사항)

### 1. CloudFront CDN 추가

**효과:**
- 🚀 이미지 로딩 속도 10배 향상
- 💰 데이터 전송 비용 50% 절감
- 🌍 글로벌 배포

**설정:**
```bash
1. CloudFront 콘솔 접속
2. Create Distribution
3. Origin: nanobanana-media.s3.amazonaws.com
4. Distribution URL 받기
5. 환경 변수에 추가:
   VITE_AWS_CLOUDFRONT_URL=https://d123.cloudfront.net
```

### 2. S3 Lifecycle 정책

**효과:**
- 💰 저장소 비용 자동 절감
- 🧹 오래된 파일 자동 정리

**설정:**
```json
{
  "Rules": [
    {
      "Id": "DeleteOldMedia",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

### 3. 버전 관리 + 백업

**효과:**
- 🔄 파일 버전 히스토리
- 💾 실수로 삭제 방지

**설정:**
```bash
S3 콘솔 → 버킷 → 속성 → 버전 관리 → 활성화
```

---

## 🎯 다음 단계

### Phase 1: S3 저장소 (완료!)
```
✅ 이미지 S3 업로드
✅ 비디오 S3 업로드
✅ 자동 폴백 (IndexedDB)
```

### Phase 2: DynamoDB 워크플로우 저장 (다음)
```
□ 워크플로우 클라우드 저장
□ 버전 히스토리
□ 멀티 디바이스 동기화
```

### Phase 3: Lambda + API Gateway (추후)
```
□ 서버리스 백엔드
□ 워크플로우 공유
□ 팀 협업
```

---

## 📖 참고 자료

- [AWS S3 공식 문서](https://docs.aws.amazon.com/s3/)
- [IAM 권한 가이드](https://docs.aws.amazon.com/IAM/)
- [S3 요금 계산기](https://calculator.aws/)
- [CloudFront 설정 가이드](https://docs.aws.amazon.com/cloudfront/)

---

**설정 완료 후 테스트를 꼭 해보세요!** 🎉

문제가 있으면 브라우저 콘솔(F12)을 먼저 확인하세요.
