# BowHand Planning Document

> **Summary**: 스마트폰 전면 카메라 핸드트래킹 기반 1인칭 3D 양궁 게임 (판타지 필드 배경, 기술 시연 프로토타입)
>
> **Project**: BowHand
> **Version**: 0.1.0
> **Author**: h0977
> **Date**: 2026-03-22
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 기존 모바일 양궁 게임은 터치/스와이프 기반으로, 실제 활쏘기의 신체적 몰입감이 없다. 별도 컨트롤러 없이 자연스러운 양궁 체험을 제공하는 방법이 필요하다. |
| **Solution** | 스마트폰 전면 카메라 + MediaPipe Hands로 손 제스처(주먹 쥐고 당기기 → 펼쳐서 발사)를 인식하고, Three.js로 판타지 필드 3D 환경에서 양궁 체험을 제공한다. |
| **Function/UX Effect** | 실제 활쏘기와 유사한 신체 동작으로 조준·발사하는 직관적 UX. 실시간 크로스헤어 피드백으로 즉각적인 조준 반응. 판타지 세계관으로 몰입감 강화. |
| **Core Value** | 스마트폰 한 대와 맨손만으로 실감나는 양궁 체험을 제공하는 카메라 기반 핸드트래킹 + 3D 렌더링 기술 시연 포트폴리오. |

---

## 1. User Intent Discovery

### 1.1 Core Problem

카메라 기반 핸드트래킹과 3D 렌더링 기술을 결합한 AR 체험 데모를 제작하여, 개발자의 기술력을 시연할 수 있는 포트폴리오 프로젝트가 필요하다. 별도 하드웨어 없이 스마트폰만으로 실감나는 양궁 경험을 구현하는 것이 핵심 도전 과제이다.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| 포트폴리오 열람자 (채용담당자/동료 개발자) | 웹 URL로 바로 체험 | 기술력 시연, 인터랙티브 경험 |
| 개발자 본인 | 기술 역량 증명 | MediaPipe + Three.js 통합 역량 시연 |

### 1.3 Success Criteria

- [ ] 전면 카메라로 손 제스처(당기기/놓기)를 실시간 인식
- [ ] 3D 판타지 필드 환경에서 타겟에 화살이 날아가 적중 판정
- [ ] 손 위치에 따른 조준점(크로스헤어)이 실시간으로 화면에 반영

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|--------|
| 모바일 성능 | 핸드트래킹 + 3D 렌더링을 모바일 브라우저에서 동시 처리 | High |
| MediaPipe 정확도 | 조명/배경에 따라 손 인식 정확도 변동 | Medium |
| 웹 기반 제약 | WebGL 성능 한계, 카메라 권한 필요 | Medium |

---

## 2. Alternatives Explored

### 2.1 Approach A: Web (Three.js + MediaPipe) — Selected

| Aspect | Details |
|--------|---------|
| **Summary** | Three.js(3D) + MediaPipe Hands(핸드트래킹) 순수 웹 기반 |
| **Pros** | 설치 불필요, URL 공유만으로 데모 가능, 크로스플랫폼, 포트폴리오 최적 |
| **Cons** | 네이티브 대비 성능 제약, 복잡한 물리 시뮬레이션 한계 |
| **Effort** | Medium |
| **Best For** | 기술 시연 프로토타입, 빠른 개발, 접근성 최우선 |

### 2.2 Approach B: React Native + Expo

| Aspect | Details |
|--------|---------|
| **Summary** | React Native + expo-camera + react-three-fiber |
| **Pros** | 앱 배포 가능, 네이티브 카메라 접근 |
| **Cons** | 빌드/배포 복잡, 핸드트래킹 통합 어려움, 개발 시간 2-3배 |
| **Effort** | High |
| **Best For** | 앱스토어 배포가 목표일 때 |

### 2.3 Decision Rationale

**Selected**: Approach A (Web: Three.js + MediaPipe)
**Reason**: 포트폴리오/기술 시연 목적에 URL 공유만으로 즉시 체험 가능한 웹 기반이 최적. 개발 속도와 접근성 모두 우수.

---

## 3. YAGNI Review

### 3.1 Included (v1 Must-Have)

- [ ] MediaPipe Hands 기반 손 제스처 인식 (NOCK → DRAW → RELEASE)
- [ ] Three.js 판타지 필드 3D 환경 (중세 성곽, 숲, 하늘)
- [ ] 조준 크로스헤어 실시간 피드백
- [ ] 화살 발사 및 포물선 궤적
- [ ] 타겟 적중 판정 (Raycasting)
- [ ] 적중 시 시각 피드백

### 3.2 Deferred (v2+ Maybe)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| 점수/라운드 시스템 | 기술 데모에 게임 루프는 불필요 | 게임성 강화 시 |
| 사운드 효과 | MVP 핵심 체험과 무관 | UX 개선 단계 |
| 리더보드 | 백엔드 필요, 데모 범위 초과 | 멀티유저 확장 시 |
| 난이도 조절 | 단일 스테이지로 충분 | 스테이지 추가 시 |
| 바람 효과/물리 고도화 | 복잡도 대비 데모 효과 낮음 | 게임성 강화 시 |

### 3.3 Removed (Won't Do)

| Feature | Reason for Removal |
|---------|-------------------|
| 멀티플레이어 | 데모 목적에 불필요, 복잡도 과다 |
| 앱스토어 배포 | 웹 기반으로 결정됨 |
| 커스텀 캐릭터/스킨 | 기술 시연에 불필요 |

---

## 4. Scope

### 4.1 In Scope

- [ ] 전면 카메라 스트림 획득 (getUserMedia)
- [ ] MediaPipe Hands 손 랜드마크 추출 (21포인트)
- [ ] 제스처 상태 머신 (IDLE → NOCK → DRAW → RELEASE)
- [ ] Three.js 판타지 필드 3D 씬 렌더링
- [ ] 타겟 오브젝트 배치 (고정/부유)
- [ ] 손 위치 → 조준점 매핑 + 크로스헤어 UI
- [ ] 화살 발사 궤적 물리 시뮬레이션
- [ ] Raycasting 기반 적중 판정 + 시각 피드백

### 4.2 Out of Scope

- 점수/라운드 시스템 — (YAGNI Deferred)
- 사운드 효과 — (YAGNI Deferred)
- 리더보드/백엔드 — (YAGNI Deferred)
- 멀티플레이어 — (YAGNI Removed)
- 앱스토어 배포 — (YAGNI Removed)

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 전면 카메라로 사용자의 손을 실시간 감지 | High | Pending |
| FR-02 | 손가락 접힘/펼침으로 당기기(DRAW)/발사(RELEASE) 제스처 판별 | High | Pending |
| FR-03 | 판타지 필드 3D 환경 렌더링 (배경, 타겟) | High | Pending |
| FR-04 | 손 위치에 따른 조준 크로스헤어 실시간 표시 | High | Pending |
| FR-05 | 화살 발사 시 포물선 궤적으로 비행 | High | Pending |
| FR-06 | 타겟 적중 시 시각 피드백 (파티클, 색상 변화 등) | Medium | Pending |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 핸드트래킹 + 3D 렌더링 합산 20fps 이상 (모바일) | Chrome DevTools FPS 측정 |
| Compatibility | Chrome/Safari 모바일 브라우저 지원 | 실기기 테스트 |
| Latency | 제스처 인식 → 화면 반영 200ms 이내 | 체감 테스트 |

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] 모든 기능 요구사항(FR-01~FR-06) 구현 완료
- [ ] 모바일 Chrome에서 정상 동작 확인
- [ ] URL 공유로 즉시 체험 가능
- [ ] 카메라 권한 요청 UX 처리

### 6.2 Quality Criteria

- [ ] 모바일 환경 20fps 이상 유지
- [ ] 제스처 인식 성공률 체감상 양호
- [ ] 3D 씬 렌더링 깨짐 없음

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 모바일 성능 부족 (핸드트래킹+3D 동시 처리) | High | Medium | MediaPipe lite 모델 사용, Three.js 최적화 (낮은 폴리곤, LOD), 프레임 스킵 |
| 손 인식 정확도 저하 (조명/배경) | Medium | Medium | 인식 실패 시 가이드 UI 표시, 임계값 튜닝 |
| 브라우저 카메라 권한 거부 | Medium | Low | 권한 요청 UX + 폴백 안내 |
| MediaPipe WASM 로딩 시간 | Medium | Medium | 로딩 인디케이터 + CDN 활용 |

---

## 8. Architecture Considerations

### 8.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ✅ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs | |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | |

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 3D 엔진 | Three.js / Babylon.js / PlayCanvas | Three.js | 가장 넓은 생태계, 경량, 학습 자료 풍부 |
| 핸드트래킹 | MediaPipe Hands / TensorFlow HandPose | MediaPipe Hands | 더 높은 정확도, WASM 지원, Google 공식 |
| 카메라 | 전면 / 후면 | 전면 (facingMode: "user") | 화면을 보면서 제스처 수행 가능 |
| 물리 엔진 | 커스텀 / Cannon.js / Ammo.js | 커스텀 (간단한 포물선) | 화살 궤적만 필요, 외부 엔진 과잉 |
| 빌드 도구 | Vite / Webpack / None | Vite | 빠른 HMR, ES 모듈 기본 지원 |

### 8.3 Component Overview

```
src/
├── main.ts                  # 앱 진입점
├── camera/
│   └── CameraManager.ts     # getUserMedia 전면 카메라 관리
├── tracking/
│   ├── HandTracker.ts        # MediaPipe Hands 래퍼
│   └── GestureEngine.ts      # 제스처 상태 머신 (IDLE→NOCK→DRAW→RELEASE)
├── scene/
│   ├── SceneManager.ts       # Three.js 씬 초기화 + 렌더 루프
│   ├── FantasyField.ts       # 판타지 필드 환경 (배경, 지형, 하늘)
│   └── Target.ts             # 타겟 오브젝트 (생성, 배치, 히트박스)
├── gameplay/
│   ├── AimController.ts      # 손 좌표 → 3D 조준점 매핑 + 크로스헤어
│   └── ArrowPhysics.ts       # 화살 발사, 포물선 궤적, 적중 판정
└── ui/
    └── HUD.ts                # 파워 게이지, 상태 표시 오버레이
```

### 8.4 Data Flow

```
카메라 프레임 (30fps)
    │
    ▼
MediaPipe Hands → 21개 손 랜드마크 좌표 (x, y, z)
    │
    ▼
GestureEngine 상태 머신 (실제 활쏘기 모션):

    IDLE ──(손 감지)──▶ NOCK ──(주먹 쥐기)──▶ DRAW ──(손 펼치기)──▶ RELEASE
     ▲                  │           │                        │
     └──(손 사라짐)──────┘           │                        │
                                    ▼                        ▼
                           당기는 거리 측정             ArrowPhysics
                           (손가락 접힘율)              - 방향: 조준점 기준
                           → 파워 게이지               - 강도: draw 거리 비례
                           → 크로스헤어 갱신            - 포물선 궤적 계산
                                                           │
                                                           ▼
                                                     적중 판정 (Raycasting)
                                                     - 타겟 히트박스 충돌
                                                     - 적중 시각 피드백

제스처 판정 기준:
  NOCK:    손 감지 + 손가락 모두 펼침 (열린 손)
  DRAW:    주먹 쥐기 (손가락 접힘) + 손이 뒤로 이동
  RELEASE: 주먹에서 급격히 손가락 펼침
```

---

## 9. Convention Prerequisites

### 9.1 Applicable Conventions

- [ ] TypeScript strict mode
- [ ] ESLint + Prettier
- [ ] 모듈별 단일 책임 원칙
- [ ] camelCase (변수/함수), PascalCase (클래스/타입)

---

## 10. Next Steps

1. [ ] Write design document (`/pdca design bowhand`)
2. [ ] 핵심 기술 검증 (MediaPipe + Three.js 통합 PoC)
3. [ ] Start implementation (`/pdca do bowhand`)

---

## Appendix: Brainstorming Log

> Key decisions from Plan Plus Phases 1-4.

| Phase | Question | Answer | Decision |
|-------|----------|--------|----------|
| Intent Q1 | 핵심 목적 | AR 체험 데모 | 기술 시연 프로토타입으로 방향 설정 |
| Intent Q2 | 타겟 사용자 | 포트폴리오/기술 시연 | 웹 기반 URL 공유 방식 확정 |
| Intent Q3 | 성공 기준 | 핸드트래킹 + 3D 타겟 + 조준 피드백 | 3가지 핵심 기능 필수 |
| Alternatives | Web vs RN vs Unity | Web (Three.js + MediaPipe) | 접근성/개발속도 최우선 |
| YAGNI | MVP 범위 | 핸드트래킹 + 3D 환경 + 조준 UI | 점수/사운드/리더보드 제외 |
| Design 4-1 | 아키텍처 수정 | 양궁장 → 판타지 필드 | 차별화된 비주얼 |
| Design 4-2 | 제스처 방식 | 실제 활쏘기 모션 | 주먹→당기기→펼치기=발사 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-22 | Initial draft (Plan Plus) | h0977 |
