# 📋 작업 인수인계 및 진행 현황 (PROGRESS.md)

> **현재 담당 AI:** Gemini (Antigravity)  
> **마지막 업데이트 일시:** 2026-09-09  
> **다음 작업자에게:** 작업을 이어받기 전에 이 파일과 [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)를 먼저 확인해 주세요.

---

## 🎯 전체 개발 로드맵

- [x] **Phase 0: 기획 및 아키텍처 수립**
  - [x] ChatGPT 대화 기반 게임 요구사항 및 핵심 룰 추출
  - [x] 프로젝트 구조 및 AI 인수인계 템플릿 작성 (`README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`)
  - [x] 깃허브 원격 저장소(`Clueamos`) 초기화 및 동기화

- [ ] **Phase 1: 프로젝트 기반 구축 & 코어 엔진 설계**
  - [ ] 모던 웹 프레임워크 셋업 (Next.js 14+ / React + TypeScript + Tailwind CSS)
  - [ ] 코어 데이터 모델링 (`src/engine/types.ts`: 카드, 플레이어, 맵, 질문, 게임 상태)
  - [ ] 게임 엔진 코어 로직 작성 (`initGame`, `shuffleDeal`, `validateSuggestion`, `disproveSuggestion`)
  - [ ] 엔진 단위 테스트 (Vitest 등을 통한 규칙 검증)

- [ ] **Phase 2: 공정한 2인 AI 에이전트 구현**
  - [ ] AI 추론 메모리 모델 (치팅 없이 자신만의 소거/추론 시트 관리)
  - [ ] `LogicAI` (아서 - 논리 소거형 알고리즘)
  - [ ] `InstinctAI` (블레이크 - 직감/블러핑/공격적 추리 알고리즘)
  - [ ] AI 간 가상 대전 시뮬레이션 테스트

- [ ] **Phase 3: 인터랙티브 UI & 2인 플레이 화면**
  - [ ] 호텔 맵 보드 컴포넌트 & 캐릭터 토큰
  - [ ] 질문/반증 대화 상자 UI (상대에게 카드 은밀히 보여주기)
  - [ ] 인터랙티브 자동 추리 노트 (Deduction Sheet)
  - [ ] 턴 및 사건 로그 창

- [ ] **Phase 4: 폴리싱 & 게임 루프 완성**
  - [ ] 승리/패배 및 사건 해결 엔딩 화면
  - [ ] BGM/효과음 및 미스터리 호텔 비주얼 테마 적용
  - [ ] 2인(부부) 맞춤형 반협력 스코어링 시스템

---

## 📌 현재 진행 상태 및 인수인계 사항

### 1. 방금 완료한 작업
* ChatGPT와의 이전 대화 분석 완료
* `README.md`: 프로젝트 개요, 호텔 콘셉트, 4인 플레이(사람 2 + AI 2), 기술 스택 정의
* `PROJECT_CONTEXT.md`: 핵심 규칙, AI 치팅 방지 원칙, 아키텍처 원칙 문서화
* `PROGRESS.md`: AI 간 인수인계 로드맵 및 태스크 트래커 수립
* GitHub 원격 저장소 커밋 & 푸시

### 2. 다음 세션(또는 다음 작업자)이 해야 할 일
1. 프론트엔드 프로젝트 뼈대 생성 (권장: `Next.js` with TypeScript, Tailwind CSS)
2. `src/engine/types.ts` 파일 작성 (카드 타입: Suspect, Location, Weapon, Motive 및 GameState 정의)
3. 덱 셔플, 정답 봉투(Envelope) 격리, 플레이어별 카드 분배 함수 구현

### 3. 기술적 유의사항
* AI 탐정 로직은 반드시 엔진 상태를 조작하지 않고 `GameState -> Action`을 반환하는 순수 함수 구조로 설계해야 합니다.
* 모바일/태블릿 터치 조작도 고려한 반응형 레이아웃을 염두에 두세요.
