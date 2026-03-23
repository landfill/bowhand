# BowHand PDCA Completion Report

> **Report Type**: PDCA Cycle Completion Report
>
> **Project**: BowHand
> **Feature**: bowhand (AR Archery Game)
> **Version**: 1.0.0
> **Author**: report-generator
> **Date**: 2026-03-23
> **PDCA Duration**: 2026-03-22 ~ 2026-03-23 (2 days)

---

## Executive Summary

### 1.1 Project Overview

| Item | Value |
|------|-------|
| **Feature** | BowHand — 듀얼 카메라 AR 패스스루 핸드트래킹 양궁 게임 |
| **Start Date** | 2026-03-22 |
| **Completion Date** | 2026-03-23 |
| **Duration** | 2 days |
| **PDCA Iterations** | 3 (89% → 95% → 98% → 96% after AR pivot sync) |
| **Final Match Rate** | 96% |

### 1.2 Results Summary

| Metric | Value |
|--------|-------|
| **Match Rate** | 96% (threshold: 90%) |
| **Source Files** | 12 TypeScript files |
| **Lines of Code** | 1,488 lines |
| **PDCA Documents** | 4 (Plan, Design, Analysis, Report) |
| **Iterations** | 3 Act cycles |

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 기존 모바일 양궁 게임은 터치 기반으로 신체적 몰입감이 없고, AR 환경에서의 양궁 체험이 없었다 |
| **Solution** | 후면 카메라 AR 패스스루 + 전면 카메라 MediaPipe 핸드트래킹 + Three.js 투명 오버레이로 현실 공간에서 AR 양궁 구현 |
| **Function/UX Effect** | 후면 카메라의 실제 환경 위에 3D 과녁이 떠 있고, 손 제스처(주먹→당기기→펼치기)로 활을 발사. PiP로 핸드트래킹 상태 확인. 모바일 20fps+ 유지 |
| **Core Value** | 스마트폰 듀얼 카메라만으로 현실 공간에서 AR 양궁 체험. 별도 하드웨어/SDK 없이 웹 브라우저에서 즉시 실행 가능한 기술 데모 |

---

## 2. PDCA Cycle History

### 2.1 Phase Timeline

```
[Plan+] ✅ 2026-03-22  Brainstorming-enhanced planning
    ↓
[Design] ✅ 2026-03-22  Module specifications + architecture
    ↓
[Do] ✅ 2026-03-22  Full implementation (12 files, 1,488 LOC)
    ↓
[Check 1] ⚠️ 89%  Initial gap analysis — 10 gaps found
    ↓
[Act 1] ✅ 95%  Design doc sync (Target, HUD, method signatures)
    ↓
[Act 2] ✅ 98%  Further design alignment
    ↓
[Check 2] ⚠️ 88%  AR architecture pivot detected
    ↓
[Act 3] ✅ 96%  Design doc v0.3.0 — AR dual camera architecture sync
    ↓
[Report] ✅ 2026-03-23  Completion report
```

### 2.2 Match Rate Progression

```
100% ┤
 96% ┤                                              ●──── Final
 95% ┤                           ●
 90% ┤─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ threshold ─ ─ ─
 89% ┤              ●
 88% ┤                                    ●
     └──────────────────────────────────────────────────────
     Check1    Act1      Act2    Check2    Act3
```

---

## 3. Architecture Summary

### 3.1 Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Build | Vite ^8.x | Dev server + bundling |
| Language | TypeScript ^5.x | Type safety |
| 3D | Three.js ^0.183.x | AR overlay rendering |
| Hand Tracking | MediaPipe Hands 0.4.x (CDN) | 21-point hand skeleton |
| Camera | getUserMedia API | Dual camera (rear + front) |

### 3.2 Module Architecture

```
┌─────────────────────────────────────────────────┐
│  Rendering Layer Stack (z-index)                 │
│                                                  │
│  [0]  ar-background — 후면 카메라 실시간 영상      │
│  [1]  Three.js canvas — 투명, 3D 과녁+화살        │
│  [10] HUD — 파워 게이지, 상태, 점수               │
│  [20] pip-view — 전면 카메라 PiP 미리보기          │
└─────────────────────────────────────────────────┘
```

| Module | File | Responsibility |
|--------|------|----------------|
| CameraManager | src/camera/ | 듀얼 카메라 (후면 AR + 전면 핸드트래킹) |
| HandTracker | src/tracking/ | MediaPipe Hands wrapper |
| GestureEngine | src/tracking/ | 상태 머신 (IDLE→NOCK→DRAW→RELEASE) |
| SceneManager | src/scene/ | Three.js 투명 오버레이 렌더링 |
| Target | src/scene/ | 5링 과녁 + 부유 애니메이션 + 히트 이펙트 |
| AimController | src/gameplay/ | 손 좌표 → 3D 크로스헤어 |
| ArrowPhysics | src/gameplay/ | 중력 포물선 + 충돌 판정 |
| HUD | src/ui/ | 파워 게이지 + 상태 + 점수 |

---

## 4. Key Decisions & Learnings

### 4.1 AR Architecture Pivot

초기 설계는 **FantasyField** (프로시저럴 3D 배경)를 기반으로 했으나, 구현 과정에서 **후면 카메라 AR 패스스루**로 전환. 이로 인해 Check 단계에서 설계-구현 불일치(88%)가 발생했고, Act iteration 3에서 설계 문서를 AR 기준으로 업데이트하여 해결.

**교훈**: 구현 중 아키텍처 방향이 바뀌면 설계 문서를 즉시 업데이트해야 함. PDCA의 Check-Act 루프가 이런 불일치를 자동으로 감지하고 수정하는 데 효과적이었음.

### 4.2 AR 배경 검은 화면 버그

Three.js canvas의 CSS `position: relative`가 `ar-background` 비디오를 완전히 가려 후면 카메라 영상이 보이지 않는 버그 발생. `position: absolute; inset: 0`으로 수정하여 해결. iOS Safari에서 비디오 autoplay 정책도 `muted + await play().catch()` 패턴으로 대응.

### 4.3 성능 최적화

- MediaPipe `modelComplexity: 0` (lite model)
- FPS 기반 적응형 프레임 스킵 (15fps 이하 시 자동 조절)
- `pixelRatio` 상한 2로 제한
- `antialias: false`

---

## 5. Remaining Items

| # | Item | Priority | Description |
|---|------|----------|-------------|
| 1 | 타겟 좌표 설계 동기화 | Low | 설계의 타겟 좌표와 구현이 미세하게 다름 (게임플레이 튜닝) |
| 2 | HUD 초기화 패턴 | Very Low | 설계는 init() 메서드, 구현은 constructor |
| 3 | 적응형 프레임 스킵 문서화 | Very Low | FPS 기반 적응형 스킵이 설계에 미반영 |
| 4 | FantasyField 정리 | Low | AR 모드에서 미사용 — 제거 또는 비AR 모드 토글 구현 |

---

## 6. Files Changed

### Implementation Files (12)

| File | Lines | Role |
|------|:-----:|------|
| src/main.ts | ~248 | App orchestrator + render loop |
| src/camera/CameraManager.ts | ~113 | Dual camera management |
| src/tracking/HandTracker.ts | ~90 | MediaPipe wrapper |
| src/tracking/GestureEngine.ts | ~110 | Gesture state machine |
| src/scene/SceneManager.ts | ~64 | Three.js transparent renderer |
| src/scene/Target.ts | ~200 | 5-ring target with effects |
| src/scene/FantasyField.ts | ~150 | Fantasy environment (unused in AR) |
| src/gameplay/AimController.ts | ~100 | Crosshair positioning |
| src/gameplay/ArrowPhysics.ts | ~160 | Arrow physics + collision |
| src/ui/HUD.ts | ~180 | Power gauge + score + feedback |
| src/types/index.ts | ~40 | Core type definitions |
| src/types/mediapipe.d.ts | ~33 | MediaPipe CDN type declarations |

### Configuration Files

| File | Role |
|------|------|
| index.html | Entry HTML with AR video elements |
| package.json | Dependencies (three, vite, typescript) |
| tsconfig.json | TypeScript configuration |
| vite.config.ts | Vite build configuration |

### PDCA Documents

| File | Version |
|------|---------|
| docs/01-plan/features/bowhand.plan.md | 0.1.0 |
| docs/02-design/features/bowhand.design.md | 0.3.0 |
| docs/03-analysis/bowhand.analysis.md | 0.4.0 |
| docs/04-report/features/bowhand.report.md | 1.0.0 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-23 | Initial completion report | report-generator |
