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

- [x] **Phase 1: 프로젝트 기반 구축 & 코어 엔진 기초**
  - [x] 최신 모던 웹 스택 셋업 (`Next.js 16` + `TypeScript` + `Tailwind CSS v4` + `Zustand` + `Lucide-react`)
  - [x] 코어 데이터 모델링 (`src/engine/types.ts`: 카드, 플레이어, 맵, 질문, 게임 상태 정의 완료)
  - [x] 게임 시나리오 데이터 정의 (`src/engine/data.ts`: 용의자 6명, 장소 6곳, 도구 6개, 동기 4개)
  - [x] 순수 게임 엔진 코어 로직 작성 (`initGame`, `shuffleDeal`, `movePlayer`, `makeSuggestion`, `resolveDisprove`, `makeAccusation`)
  - [x] Vitest 엔진 단위 테스트 작성 및 통과 (5개 핵심 룰 테스트 완료)

- [x] **Phase 2: 공정한 2인 AI 에이전트 구현**
  - [x] AI 추론 메모리 모델 (치팅 없이 자신만의 소거/추론 시트 관리 `src/engine/ai.ts`)
  - [x] `LogicAI` (아서 - 논리 소거형 알고리즘: 확신도 100% 도달 시 정답 고발)
  - [x] `InstinctAI` (블레이크 - 직감/블러핑형 알고리즘: 25% 블러핑 질문 & 조기 승부수)

- [x] **Phase 3: 인터랙티브 UI & 4인 플레이 화면 완성**
  - [x] 호텔 6개 룸 맵 및 플레이어 위치 표시
  - [x] 가설 질문(Suggestion) 및 AI 자동 반증(Disprove) 연출
  - [x] 나만의 사건 추리 수첩 (O / X / ? 인터랙티브 시트)
  - [x] 실시간 사건 수사 일지(Event Log) 창
  - [x] 승리 축하 컨페티 효과 및 사건 해결 모달

- [x] **Phase 4 & 5: 웹 배포 및 연출 고도화**
  - [x] **오리지널 Clue 정통 룰 도입: 주사위 굴리기(Dice Roll) & 복도 칸수 거리 시스템**
  - [x] 모서리 방 간 **비밀 통로(Secret Passage)** 시스템 구현 (서재 ⇄ 주방, 연회장 ⇄ 옥상정원)
  - [x] 주사위 굴림 사운드 효과 및 도달 가능한 방 에메랄드 하이라이트/거리 배지 UI
  - [x] Web Audio API 기반 절차적 사운드 효과 시스템 구현 (`src/utils/sounds.ts`: 발자국, 질문, 단서 공개, 승리/패배 효과음)
  - [x] 최종 고발(Accusation) 전용 모달 및 오답 시 탈락 처리 UI 추가
  - [x] **글로벌 다국어 지원 (i18n): 기본 영어(EN), 스페인어(ES), 한국어(KO) 원클릭 전환**
  - [x] Vercel 배포 완료 (`https://clueamos-seven.vercel.app/`) 및 `.npmrc` 충돌 해결
  - [x] 단위 테스트 5개 100% 통과 및 빌드 성공

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
