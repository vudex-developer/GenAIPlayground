# Gen AI Playground 최근 업데이트

> 📅 업데이트 기간: 2026년 1월 28일 ~ 2월 10일
> 
> 📊 총 5개 주요 업데이트, 8,000+ 줄 추가

---

## 🎥 [최신] OpenAI Sora Video 노드 추가

**📅 2026년 2월 10일 00:55** | **👤 luke** | **✅ 완료**

### 주요 기능

**1. Sora Video 노드 신규 추가**
- ✅ `sora-2`, `sora-2-pro` 모델 지원
- ✅ Image-to-Video 생성 기능
- ✅ 오렌지 테마 전용 노드 UI
- ✅ 비디오 생성 Duration 및 Resolution 설정

**2. Cell Regenerator → Nano Banana 버그 수정**
- 🐛 **문제**: Grid Node의 전체 그리드 프롬프트(9 cells, 3×3 layout)가 Nano Banana에 전달되어 그리드를 다시 생성하는 문제
- ✅ **해결**: Cell Regenerator 참조 시 그리드 프롬프트를 단일 이미지 프롬프트로 완전 교체
- ✅ ref-N 핸들 매칭 실패 시 폴백 로직 추가
- ✅ Cell Regenerator 완료 시 하위 Nano Banana 출력 자동 초기화

### 새로운 파일
```
src/services/soraAPI.ts              # Sora API 클라이언트 (172줄)
src/components/nodes/SoraVideoNode.tsx  # Sora 노드 UI (82줄)
src/components/icons/SoraIcon.tsx    # Sora 전용 아이콘 (36줄)
```

### 주요 변경 파일
- `src/stores/flowStore.ts`: runSoraNode 실행 로직 (+576줄)
- `src/components/NodeInspector.tsx`: Sora 설정 UI (+237줄)
- `src/types/nodes.ts`: SoraVideoNode 타입 정의 (+33줄)

### 기술 상세
- **API 방식**: multipart/form-data (OpenAI 공식 스펙 준수)
- **핸들**: image 입력, prompt 입력, video 출력
- **설정 옵션**: 모델 선택, Duration, Resolution

**📊 통계**: 10개 파일 변경 | +1,020줄 | -133줄

---

## 🎬 Cell Regenerator 이미지 분할 기능 완성

**📅 2026년 2월 4일 02:38** | **👤 vudex-developer** | **✅ 완료**

### 주요 기능

**1. 자동 그리드 이미지 분할**
- ✅ Canvas API를 활용한 그리드 이미지 자동 분할
- ✅ 개별 셀을 IndexedDB에 저장
- ✅ 각 셀에 대한 개별 출력 핸들 생성 (S1-S6)
- ✅ 셀 좌표 및 Canvas 작업 상세 로그

**2. 슬롯 라벨 통합**
- ✅ 모든 컴포넌트에서 `slot.id` (S1, S2, S3...) 사용
- ✅ CellRegeneratorNode, GridNode, NodeInspector 업데이트
- ✅ 일관된 슬롯 표시 방식

**3. 그리드 프리셋 템플릿 추가**
```
satire-slice-of-life-6    # Pink Bubble 스타일 풍자적 내러티브
emotional-beat-6          # 캐릭터 감정 여정 중심
comedy-timing-6           # 셋업과 펀치라인이 있는 시각적 코미디
```

**4. LLM 프롬프트 출력 형식 강화**
- ✅ 그리드 스토리보드 모드 파싱 규칙 추가
- ✅ 슬롯 중복 및 번호 오류 방지
- ✅ 정확한 슬롯 마커 형식 강제 (S[NUMBER]:)

### 새로운 파일
```
AGENTS.md                   # 레포지토리 가이드라인 (55줄)
src/utils/gridPresets.ts    # 그리드 프리셋 템플릿 (459줄)
```

### 주요 변경 파일
- `src/components/NodeInspector.tsx`: +962줄 (그리드 UI 대폭 개선)
- `src/stores/flowStore.ts`: +483줄 (Cell Regenerator 로직)
- `src/components/nodes/CellRegeneratorNode.tsx`: +151줄
- `src/utils/storage.ts`: +111줄 (셀 저장 로직)

**📊 통계**: 11개 파일 변경 | +2,110줄 | -371줄

---

## 📸 Motion Prompt 프롬프트 생성 전면 개선

**📅 2026년 1월 30일 13:55** | **👤 vudex-developer** | **✅ 완료**

### 주요 개선사항

**Google Gemini Photography 템플릿 적용**
- 📚 참고: Google Developers Blog - "How to prompt Gemini 2.5 Flash Image Generation"

**1. 전문 Photography/Cinematography 용어 전환**

| 이전 (수치) | 개선 (전문 용어) |
|---|---|
| 65° | left side three-quarter view |
| Distance | wide shot / close-up / extreme close-up |
| Tilt | high-angle / low-angle perspective |

**2. 새로운 용어 적용**
- ✅ Shot type 명시 (three-quarter view, side profile, back view)
- ✅ Lens type 자동 선택 (85mm portrait lens / 50mm standard lens)
- ✅ Photography 용어 (perspective, framing, bokeh, depth of field)
- ✅ Cinematography 참조 (The Matrix bullet time, Inception 등)

**3. UI 개선**
- ✅ Rotation Subject 선택 UI 추가
  - Camera Orbit: 카메라가 피사체 주위를 회전
  - Character Turn: 캐릭터가 제자리에서 회전

### 기술 개선
- 프롬프트 구조를 Google 권장 템플릿으로 재구성
- AI 이미지 생성 정확도 크게 향상

**📊 통계**: 4개 파일 변경 | +392줄 | -165줄

---

## 🎯 Motion Prompt 360도 카메라 회전 시스템

**📅 2026년 1월 30일 (같은 날)** | **👤 vudex-developer** | **✅ 완료**

### 주요 기능

**1. 360도 회전 시스템 전면 개편**
```
0°   = 정면 (Front)
90°  = 오른쪽 (Right)
180° = 뒤 (Back)
270° = 왼쪽 (Left)
```

**2. 3D 카메라 프리뷰 컴포넌트**
- ✅ `CameraPreview3D` 컴포넌트 신규 추가 (1,176줄!)
- ✅ 구형 와이어프레임 배경
- ✅ 피사체를 간단한 구체 포인트로 표시
- ✅ 실시간 카메라 위치 시각화

**3. UI/UX 개선**
- ✅ 가이드 색상 밝게 조정 (녹색, 핫핑크, 노랑)
- ✅ 컨트롤 포인트 크기 절반으로 축소
- ✅ Quick Presets 버튼 추가
  - Front / Right / Back / Left
  - 3/4 각도 프리셋

**4. LLM 카메라 인터프리터 통합**
- ✅ 360도 시스템과 LLM 모드 통합
- ✅ 자연어로 카메라 각도 설명 가능

### 기술 개선
- ✅ NaN 및 undefined 안전 체크 추가
- ✅ 부동소수점 오류 방지
- ✅ 360도 각도 정규화 로직 구현
- ✅ 소수점 정밀도 수정 및 반올림 처리

### 새로운 파일
```
src/components/CameraPreview3D.tsx  # 3D 프리뷰 (1,176줄)
cleanup-storage.html                # 저장소 정리 도구
storage-test.js                     # 저장소 테스트 스크립트
```

**📊 통계**: 27개 파일 변경 | +4,756줄 | -299줄

---

## ☁️ AWS S3 클라우드 저장소 통합

**📅 2026년 1월 28일** | **👤 vudex-developer** | **✅ 완료**

### 주요 기능

**1. 하이브리드 저장소 시스템 구축**
```
┌─────────────────────────────────────┐
│ Browser                             │
│ ├─ localStorage (5MB, 메타데이터)   │
│ └─ IndexedDB (캐시)                 │
└──────────┬──────────────────────────┘
           │ 자동 업로드/다운로드
           ↓
┌─────────────────────────────────────┐
│ AWS S3 (무제한 클라우드 저장소)      │
└─────────────────────────────────────┘
```

**2. 자동 최적화**
- ✅ 이미지 자동 압축 (최대 2048px)
- ✅ 파일 크기 60-80% 감소
- ✅ 오래된 미디어 자동 정리 (30일 이상)
- ✅ 오프라인 캐시 지원

**3. UI 통합**
- ✅ Settings UI에 S3 상태 표시
- ✅ NanoImageNode 이미지 로딩 개선
- ✅ NodeInspector 이미지 표시 개선

### 새로운 파일
```
src/utils/s3Client.ts      # AWS S3 클라이언트 (229줄)
AWS-SETUP.md               # AWS 설정 가이드 (376줄)
OPTIMIZATION-GUIDE.md      # 최적화 가이드 (384줄)
QUICK-CHECKLIST.md         # 일일/주간 체크리스트 (164줄)
```

### 기술 아키텍처
- **로컬**: localStorage (메타데이터) + IndexedDB (캐시)
- **클라우드**: AWS S3 (무제한 저장소)
- **동기화**: 자동 업로드/다운로드 시스템

### 예상 비용
```
AWS S3 (100GB): ~$3/월
→ 매우 저렴하고 안정적인 프로덕션급 시스템
```

### 로드맵
- ✅ **Phase 1**: S3 저장소 통합 (완료)
- 📅 **Phase 2**: DynamoDB 워크플로우 동기화
- 📅 **Phase 3**: Lambda 서버리스 백엔드
- 📅 **Phase 4**: AppSync 실시간 협업

**📊 통계**: 14개 파일 변경 | +4,766줄 | -1,289줄

---

## 📊 전체 통계 요약

| 항목 | 수치 |
|---|---|
| **총 업데이트** | 5개 주요 기능 |
| **기간** | 2026.01.28 ~ 2026.02.10 (14일) |
| **변경된 파일** | 66개 |
| **추가된 코드** | +13,044줄 |
| **삭제된 코드** | -2,628줄 |
| **순증가** | +10,416줄 |

---

## 🎯 주요 성과

### 기능 추가
- ✅ OpenAI Sora Video 통합
- ✅ Cell Regenerator 이미지 분할
- ✅ 360도 3D 카메라 프리뷰
- ✅ AWS S3 클라우드 저장소
- ✅ Professional Photography 프롬프트 시스템

### 버그 수정
- ✅ Cell Regenerator → Nano Banana 그리드 프롬프트 버그
- ✅ 슬롯 라벨 불일치 문제
- ✅ NaN 및 undefined 안전 체크

### 최적화
- ✅ 이미지 자동 압축 (60-80% 감소)
- ✅ 오래된 미디어 자동 정리
- ✅ 무제한 클라우드 저장소

### 문서화
- ✅ AGENTS.md (개발 가이드라인)
- ✅ AWS-SETUP.md (AWS 설정)
- ✅ OPTIMIZATION-GUIDE.md (최적화 가이드)
- ✅ API-KEYS-GUIDE.md (API 키 가이드)

---

## 🔗 참고 문서

- 📚 [Google Gemini Image Generation Guide](https://developers.google.com/)
- 📚 [OpenAI Sora API Documentation](https://platform.openai.com/docs/)
- 📚 [AWS S3 Documentation](https://aws.amazon.com/s3/)
- 📚 레포지토리: `/Users/lukemacbookpro/Documents/GitHub/gen-ai-playground`

---

**마지막 업데이트**: 2026년 2월 10일
**다음 업데이트 예정**: DynamoDB 워크플로우 동기화, Lambda 서버리스 백엔드
