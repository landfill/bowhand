# BowHand Design Document

> **Summary**: 전면 카메라 핸드트래킹 + Three.js 판타지 필드 3D 양궁 게임의 상세 설계
>
> **Project**: BowHand
> **Version**: 0.2.0
> **Author**: h0977
> **Date**: 2026-03-22
> **Status**: Updated (Act iteration)
> **Planning Doc**: [bowhand.plan.md](../01-plan/features/bowhand.plan.md)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 기존 모바일 양궁 게임은 터치 기반으로 실제 활쏘기의 신체적 몰입감이 없다 |
| **Solution** | MediaPipe Hands 핸드트래킹 + Three.js 3D 렌더링을 웹 브라우저에서 통합 |
| **Function/UX Effect** | 주먹 쥐고 당기기→펼쳐서 발사하는 직관적 제스처로 판타지 필드에서 양궁 체험 |
| **Core Value** | 스마트폰 한 대와 맨손만으로 실감나는 양궁 체험 기술 데모 |

---

## 1. Overview

### 1.1 Design Goals

- MediaPipe Hands와 Three.js를 단일 렌더 루프에서 효율적으로 통합
- 모바일 브라우저에서 20fps 이상 유지하는 성능 최적화 설계
- 실제 활쏘기 모션과 유사한 자연스러운 제스처 인식
- 모듈 간 낮은 결합도로 독립적 테스트 및 교체 가능

### 1.2 Design Principles

- **단일 책임**: 각 모듈은 하나의 역할만 수행 (카메라, 트래킹, 씬, 게임플레이)
- **이벤트 기반 통신**: 모듈 간 커스텀 이벤트로 소통, 직접 참조 최소화
- **성능 우선**: requestAnimationFrame 루프 내 불필요한 할당/연산 제거
- **점진적 로딩**: MediaPipe WASM → 카메라 → 3D 씬 순차 초기화

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                                │
│                                                               │
│  ┌─────────────┐                                              │
│  │ index.html  │  진입점 (카메라 권한 요청 → 로딩 → 게임)      │
│  └──────┬──────┘                                              │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐     이벤트 버스 (EventEmitter)               │
│  │  main.ts    │─────────────────────────────────┐            │
│  │  (App)      │                                 │            │
│  └──────┬──────┘                                 │            │
│         │ 초기화                                  │            │
│         ├──────────────────┬──────────────────┐  │            │
│         ▼                  ▼                  ▼  ▼            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │ Camera      │   │ HandTracker │   │ SceneManager│        │
│  │ Manager     │──▶│ + Gesture   │──▶│ + Fantasy   │        │
│  │             │   │   Engine    │   │   Field     │        │
│  └─────────────┘   └──────┬──────┘   └──────┬──────┘        │
│                           │                  │               │
│                           ▼                  ▼               │
│                    ┌─────────────┐   ┌─────────────┐        │
│                    │ Aim         │   │ Arrow       │        │
│                    │ Controller  │   │ Physics     │        │
│                    └─────────────┘   └─────────────┘        │
│                           │                  │               │
│                           ▼                  ▼               │
│                    ┌────────────────────────────┐            │
│                    │         HUD (UI 오버레이)   │            │
│                    │ 크로스헤어 + 파워게이지 + 상태│            │
│                    └────────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
매 프레임 (requestAnimationFrame):
─────────────────────────────────────────────────────
1. CameraManager.getFrame()
   → <video> 엘리먼트에서 현재 프레임 제공

2. HandTracker.detect(videoFrame)
   → MediaPipe Hands 추론 (21 랜드마크)
   → GestureEngine.update(landmarks)
   → 이벤트 발행: 'release' (GestureEngine EventTarget)

3. AimController.update(landmarks)
   → 손 위치 → 화면 좌표 → 3D 월드 좌표 변환
   → 크로스헤어 위치 갱신

4. ArrowPhysics.update(deltaTime)
   → (RELEASE 시) 화살 궤적 계산 + 이동
   → Raycasting 적중 판정
   → 이벤트 발행: 'hit' | 'miss' (ArrowPhysics EventTarget)

5. SceneManager.render()
   → Three.js 씬 렌더링 (배경 + 타겟 + 화살 + 크로스헤어)

6. HUD.update(state)
   → 파워 게이지, 상태 텍스트 갱신
─────────────────────────────────────────────────────
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| HandTracker | CameraManager | 비디오 프레임 입력 |
| GestureEngine | HandTracker | 랜드마크 데이터 → 제스처 판정 |
| AimController | GestureEngine | 제스처 상태 + 손 좌표 → 조준점 |
| ArrowPhysics | AimController | 조준 방향 + 파워 → 화살 발사 |
| SceneManager | — | 독립적 3D 씬 (외부에서 오브젝트 추가) |
| HUD | GestureEngine, ArrowPhysics | 상태 표시용 데이터 구독 |

---

## 3. Data Model

### 3.1 Core Types

```typescript
// 손 랜드마크 (MediaPipe 출력)
interface HandLandmark {
  x: number;  // 0~1 (정규화된 x좌표)
  y: number;  // 0~1 (정규화된 y좌표)
  z: number;  // 깊이 (상대값)
}

// 제스처 상태
type GestureState = 'IDLE' | 'NOCK' | 'DRAW' | 'RELEASE';

// 제스처 이벤트 데이터
interface GestureEvent {
  state: GestureState;
  handPosition: { x: number; y: number };  // 정규화된 손 중심
  drawPower: number;     // 0~1 (당긴 정도)
  timestamp: number;
}

// 화살 상태
interface ArrowState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isFlying: boolean;
  launchPower: number;   // 0~1
  launchDirection: THREE.Vector3;
}

// 타겟 정의
interface TargetConfig {
  position: THREE.Vector3;
  radius: number;        // 히트박스 반지름
  type: 'static' | 'floating';
  floatAmplitude?: number;  // 부유 진폭 (floating일 때)
  floatSpeed?: number;      // 부유 속도
}

// 적중 결과
interface HitResult {
  hit: boolean;
  targetIndex: number;
  distance: number;       // 타겟 중심으로부터 거리
  position: THREE.Vector3;  // 적중 위치
}
```

---

## 4. Module Specifications

### 4.1 CameraManager

**책임**: 전면 카메라 스트림 획득 및 관리

```typescript
class CameraManager {
  private video: HTMLVideoElement;
  private stream: MediaStream | null;

  async init(): Promise<void>
  // getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
  // 카메라 권한 거부 시 에러 이벤트 발행

  getVideoElement(): HTMLVideoElement
  // HandTracker에 전달할 video 엘리먼트 반환

  destroy(): void
  // 스트림 정리, 트랙 중지
}
```

**핵심 결정:**
- 해상도 640x480: 핸드트래킹 정확도와 성능의 균형점
- `facingMode: 'user'`: 전면 카메라 (사용자가 화면을 보며 제스처)

### 4.2 HandTracker

**책임**: MediaPipe Hands를 래핑하여 랜드마크 추출

```typescript
class HandTracker {
  private hands: Hands;  // @mediapipe/hands
  private isReady: boolean;

  async init(): Promise<void>
  // MediaPipe Hands 초기화
  // modelComplexity: 0 (lite — 모바일 성능 우선)
  // maxNumHands: 1
  // minDetectionConfidence: 0.7
  // minTrackingConfidence: 0.5

  async detect(video: HTMLVideoElement): Promise<HandLandmark[] | null>
  // 프레임별 추론 실행
  // 손 감지 못하면 null 반환

  destroy(): void
}
```

**핵심 결정:**
- `modelComplexity: 0` (lite): 모바일에서 추론 속도 최우선
- `maxNumHands: 1`: 한 손만 추적 (성능 절약)
- 매 프레임 호출하지 않고 2프레임마다 추론 (성능 최적화)

### 4.3 GestureEngine

**책임**: 랜드마크로부터 제스처 상태 판정 (상태 머신)

```typescript
class GestureEngine extends EventTarget {
  private state: GestureState = 'IDLE';
  private drawStartTime: number = 0;
  private prevFingersCurled: number = 0;

  update(landmarks: HandLandmark[]): GestureEvent
  // 상태 머신 로직:
  //
  // IDLE → NOCK: 손 감지 + 열린 손 (curledCount <= 1)
  //   판정: 각 손가락 팁(8,12,16,20)의 y가 PIP(6,10,14,18)보다 위
  //
  // NOCK → DRAW: 주먹 쥐기 (손가락 접힘)
  //   판정: curledCount >= 3 (4개 중 3개 이상)
  //   → drawStartTime = Date.now() 기록
  //
  // DRAW → RELEASE: 손가락 급격히 펼침
  //   판정: prevFingersCurled >= 3 && curledCount <= 1
  //   → drawPower = 손가락 접힘 지속 시간 기반 (최대 2초 = 1.0, 최소 0.3)
  //
  // RELEASE → IDLE: 자동 전환 (1프레임 후)
  // 어느 상태든 → IDLE: 손 사라짐 (landmarks === null)

  getState(): GestureState
  getDrawPower(): number  // 0~1
}
```

**손가락 랜드마크 인덱스 (MediaPipe):**
```
         8(검지팁)
         |
    12   7(검지PIP)  4(엄지팁)
     |   |           |
    11   6     3     |
     |   |     |     |
    16  10   5   2   |
     |   |   |   |   |
    15   9   |   1   |
     |   |   |   |   |
    20  14   |   0 ──┘
     |   |   |  (손목)
    19  13   |
     |   |   |
    18  17   |
     └───┴───┘
```

### 4.4 SceneManager + FantasyField

**책임**: Three.js 씬 관리 및 판타지 필드 환경 렌더링

```typescript
class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  init(container: HTMLElement): void
  // WebGLRenderer 초기화 (antialias: false — 모바일 성능)
  // PerspectiveCamera (fov: 60, 1인칭 시점)
  // 렌더러 pixelRatio: Math.min(window.devicePixelRatio, 2)

  render(): void
  // requestAnimationFrame 루프에서 호출

  addObject(obj: THREE.Object3D): void
  removeObject(obj: THREE.Object3D): void

  getCamera(): THREE.PerspectiveCamera
  getScene(): THREE.Scene
}

class FantasyField {
  init(scene: THREE.Scene): void
  // 1. 하늘: FogExp2 + 단색 배경색으로 경량 하늘 표현
  // 2. 지형: 녹색 평원 (PlaneGeometry + 심플 텍스처)
  // 3. 원경: 중세 성곽 실루엣 (낮은 폴리곤 BoxGeometry 조합)
  // 4. 나무: 원뿔+원기둥 조합 심플 나무 (ConeGeometry + CylinderGeometry)
  // 5. 조명: DirectionalLight (태양) + AmbientLight (환경광)
  // ※ 모든 지오메트리는 프로시저럴 생성 (외부 모델 로딩 없음)

  update(deltaTime: number): void
  // 구름 이동 등 경미한 환경 애니메이션
}
```

**핵심 결정:**
- **프로시저럴 생성**: 외부 3D 모델 파일 없이 코드로 환경 구축 (로딩 시간 제거)
- **antialias: false**: 모바일 성능 확보
- **pixelRatio 제한**: 고해상도 디바이스에서 과도한 렌더링 방지

### 4.5 Target

**책임**: 타겟 오브젝트 생성, 배치, 애니메이션

```typescript
class Target {
  private mesh: THREE.Group;
  private hitbox: THREE.Sphere;
  private config: TargetConfig;
  private isHit: boolean = false;

  constructor(config: TargetConfig)
  // 5링 양궁 과녁 메쉬 생성 (흰-검-파-빨-금)
  // CylinderGeometry (납작한 원통)으로 타겟 보드 표현
  // 나무 프레임 + 받침대 추가 (BoxGeometry + CylinderGeometry)
  // 글로우 링 (근접 시각 피드백)

  update(deltaTime: number): void
  // floating 타입이면 상하 부유 + 좌우 흔들림 + 기울기 애니메이션 (sin 파형)

  checkHit(ray: THREE.Raycaster): HitResult
  // 히트박스(Sphere)와 ray 교차 판정

  onHit(): void
  // 적중 시 시각 피드백: emissive 플래시 + 탄성 바운스 + 파티클 버스트

  resetHit(): void
  // 히트 상태 초기화 (재사용)

  getIsHit(): boolean

  getMesh(): THREE.Group
}
```

**타겟 배치 (초기 설정 — 5개, 난이도별 3열):**
```
카메라(사용자 시점)에서 바라본 3D 공간:

        z (깊이)
        ↑
  Far   │     🎯 (0, 3, -25)  중앙 부유      🎯 (6, 2.5, -22) 우측 부유
        │
  Mid   │  🎯 (-4, 2, -18)  좌측 고정
        │
  Near  │     🎯 (0, 1.5, -12)  중앙 고정    🎯 (5, 2, -15) 우측 부유
        │
        └─────────────────→ x (좌우)
       /
      y (높이)
```

- 5개 타겟: 2개 고정 (near/mid) + 3개 부유 (near/far/far)
- Near (10~15 유닛): 초보자 타겟
- Mid (15~20 유닛): 중급 타겟
- Far (20~25 유닛): 고급 타겟
- 난이도 진행: 거리 + 부유 속도 증가

### 4.6 AimController

**책임**: 손 위치를 3D 조준점으로 매핑, 크로스헤어 표시

```typescript
class AimController {
  private crosshair: THREE.Sprite;
  private aimPoint: THREE.Vector3;

  init(scene: THREE.Scene): void
  // 크로스헤어 스프라이트 생성 (CanvasTexture로 동적 생성)
  // 원형 + 십자 모양
  // camera는 update() 호출 시 전달 (결합도 감소)

  update(handPosition: { x: number; y: number }, camera: THREE.PerspectiveCamera): void
  // 1. handPosition (0~1 정규화) → NDC 좌표 (-1~1)
  //    ndcX = (handPosition.x * 2 - 1) * -1  (카메라 미러링 보정)
  //    ndcY = -(handPosition.y * 2 - 1)
  // 2. NDC → 3D 월드 좌표 (camera.unproject)
  // 3. 크로스헤어 스프라이트 위치 갱신
  // 4. aimPoint 저장 (ArrowPhysics에서 발사 방향 결정용)

  getAimDirection(camera: THREE.PerspectiveCamera): THREE.Vector3
  // 카메라 위치 → aimPoint 방향 벡터 (정규화)

  setDrawState(power: number): void
  // 크로스헤어 시각 피드백: 당길수록 크로스헤어 축소 + 색상 변화
  // power 0: 큰 원(흰색, scale 0.8) → power 1: 작은 점(빨강, scale 0.3)

  resetCrosshair(): void
  // 발사 후 크로스헤어 기본 상태 복원
}
```

### 4.7 ArrowPhysics

**책임**: 화살 발사, 포물선 궤적, 적중 판정

```typescript
class ArrowPhysics extends EventTarget {
  private arrow: THREE.Mesh | null;
  private state: ArrowState | null;
  private targets: Target[];
  private readonly GRAVITY = -9.8;
  private readonly BASE_SPEED = 25;  // 유닛/초

  init(scene: THREE.Scene, targets: Target[]): void
  // 화살 메쉬 생성 (가느다란 CylinderGeometry + 촉 ConeGeometry + 깃털 fins)

  fire(direction: THREE.Vector3, power: number, startPos: THREE.Vector3): void
  // 1. 화살 위치를 startPos에 배치 (외부에서 카메라 위치 전달)
  // 2. velocity = direction * (BASE_SPEED * power)
  // 3. isFlying = true

  update(deltaTime: number): void
  // isFlying일 때:
  // 1. velocity.y += GRAVITY * deltaTime  (중력)
  // 2. position += velocity * deltaTime
  // 3. 화살 메쉬 회전 = velocity 방향으로 lookAt
  // 4. 각 target.checkHit() 호출
  //    → 적중 시: 이벤트 발행 'hit', isFlying = false
  // 5. position.y < -2 이면: 이벤트 발행 'miss', 화살 제거

  reset(): void
  // 화살 상태 초기화, 다음 발사 대기
}
```

**물리 파라미터:**
| 파라미터 | 값 | 근거 |
|---------|-----|------|
| 중력 | -9.8 m/s² | 현실적 포물선 |
| 기본 속도 | 25 유닛/초 | 타겟(15~20유닛)까지 ~1초 비행 |
| 파워 범위 | 0.3~1.0 | 최소 30% 파워 보장 (너무 약한 발사 방지) |
| 화살 수명 | 3초 | 바닥 아래로 사라지면 자동 제거 |

### 4.8 HUD

**책임**: HTML/CSS 오버레이로 게임 상태 표시

```typescript
class HUD {
  private container: HTMLElement;
  private powerGauge: HTMLElement;
  private stateText: HTMLElement;

  init(container: HTMLElement): void
  // DOM 엘리먼트 생성 (Three.js 캔버스 위 absolute 배치)
  // 파워 게이지: 좌측 세로 바 (14px x 160px)
  // 상태 텍스트: 하단 중앙
  // 점수 표시: 우측 상단 (명중/발사 횟수 + 정확도%)

  updatePower(power: number): void
  // 게이지 높이 = power * 100%
  // 색상: 0~0.3 파랑 → 0.3~0.7 초록 → 0.7~1.0 빨강

  updateState(state: GestureState): void
  // IDLE: "Show your hand"
  // NOCK: "Make a fist"
  // DRAW: "Hold and aim..."
  // RELEASE: (표시 없음)

  showHitFeedback(): void
  // "HIT!" 텍스트 팝업 (0.8초, 스케일+글로우 애니메이션)

  showMissFeedback(): void
  // "MISS" 텍스트 (0.8초, 스케일 애니메이션)

  updateScore(hits: number, shots: number): void
  // 점수 표시 갱신 (명중/발사 + 정확도%)
}
```

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌────────────────────────────────────────────┐
│                                            │
│  ┌──┐                                      │
│  │  │ 파워                                  │
│  │  │ 게이지                                │
│  │  │                                      │
│  │  │         ⊕ 크로스헤어                  │
│  │  │        (손 위치 추적)                  │
│  │  │                                      │
│  │  │                                      │
│  └──┘                                      │
│                                            │
│        [ Show your hand ]                  │
│                                            │
└────────────────────────────────────────────┘
  ↑ Three.js 캔버스 (전체 화면)
  ↑ 카메라 피드는 화면에 표시하지 않음 (백그라운드 처리)
  ↑ HUD는 HTML 오버레이
```

### 5.2 User Flow

```
[앱 접속]
    │
    ▼
[카메라 권한 요청] ──(거부)──▶ [안내 화면: 카메라 필요]
    │(허용)
    ▼
[로딩 화면] ── MediaPipe WASM 다운로드 + 초기화
    │
    ▼
[게임 화면] ── 판타지 필드 + 타겟 표시
    │
    ▼
[손 감지 대기] ── "Show your hand"
    │(손 감지)
    ▼
[NOCK] ── "Make a fist"
    │(주먹 쥐기)
    ▼
[DRAW] ── 파워 게이지 상승, 크로스헤어 축소
    │(손 펼치기)
    ▼
[RELEASE] ── 화살 발사
    │
    ├──(적중)──▶ "HIT!" + 타겟 피드백 → [손 감지 대기]
    └──(빗나감)──▶ "MISS" → [손 감지 대기]
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| App (main.ts) | src/main.ts | 초기화 오케스트레이터, 렌더 루프 관리 |
| CameraManager | src/camera/ | 카메라 스트림 획득 |
| HandTracker | src/tracking/ | MediaPipe 핸드 추적 |
| GestureEngine | src/tracking/ | 제스처 상태 머신 |
| SceneManager | src/scene/ | Three.js 씬 관리 |
| FantasyField | src/scene/ | 판타지 환경 렌더링 |
| Target | src/scene/ | 타겟 오브젝트 |
| AimController | src/gameplay/ | 조준 제어 |
| ArrowPhysics | src/gameplay/ | 화살 물리 |
| HUD | src/ui/ | UI 오버레이 |

---

## 6. Error Handling

### 6.1 에러 시나리오

| 시나리오 | 원인 | 처리 |
|---------|------|------|
| 카메라 권한 거부 | 사용자 거부 또는 HTTP (비HTTPS) | 안내 화면 표시 + HTTPS 필요 안내 |
| MediaPipe 로딩 실패 | 네트워크 오류, WASM 미지원 | 재시도 버튼 + 브라우저 호환성 안내 |
| 손 인식 불가 | 조명 부족, 손이 프레임 밖 | HUD에 가이드 메시지 표시 |
| WebGL 미지원 | 구형 브라우저 | "WebGL을 지원하는 브라우저가 필요합니다" 표시 |
| 성능 저하 (< 15fps) | 디바이스 한계 | 핸드트래킹 프레임 스킵 증가 (3프레임마다) |

---

## 7. Security Considerations

- [x] HTTPS 필수 (카메라 API는 secure context에서만 동작)
- [x] 카메라 스트림은 로컬 처리만 (서버 전송 없음)
- [x] MediaPipe WASM은 공식 CDN에서 로드
- [x] 사용자 데이터 수집/저장 없음 (순수 클라이언트 앱)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| 수동 테스트 | 제스처 인식 정확도, UX 흐름 | 실기기 (모바일 Chrome) |
| 수동 테스트 | 적중 판정, 물리 동작 | 데스크톱 Chrome + 모바일 |
| 시각 테스트 | 3D 씬 렌더링 품질 | 다양한 해상도 디바이스 |

### 8.2 Test Cases (Key)

- [ ] 손 펼침 → 주먹 쥐기 → 펼침 제스처로 화살 발사 성공
- [ ] 타겟 방향 조준 후 발사 시 적중 판정
- [ ] 손이 카메라 밖으로 나가면 IDLE 상태 복귀
- [ ] 모바일 Chrome에서 20fps 이상 유지
- [ ] 카메라 권한 거부 시 안내 화면 표시
- [ ] MediaPipe 로딩 중 로딩 인디케이터 표시

---

## 9. Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| 빌드 | Vite | ^8.x | 개발 서버 + 번들링 |
| 언어 | TypeScript | ^5.x | 타입 안전성 |
| 3D | Three.js | ^0.183.x | 3D 렌더링 |
| 핸드트래킹 | @mediapipe/hands (CDN) | 0.4.x | 손 랜드마크 추출 (CDN script 태그 로딩) |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| 클래스 | PascalCase | `SceneManager`, `HandTracker` |
| 함수/변수 | camelCase | `getDrawPower()`, `isFlying` |
| 상수 | UPPER_SNAKE_CASE | `BASE_SPEED`, `GRAVITY` |
| 타입/인터페이스 | PascalCase | `GestureState`, `ArrowState` |
| 파일 (클래스) | PascalCase.ts | `SceneManager.ts` |
| 폴더 | kebab-case 또는 단일 단어 | `tracking/`, `gameplay/` |

### 10.2 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| 모듈 통신 | EventTarget 기반 커스텀 이벤트 |
| 상태 관리 | 각 모듈이 자체 상태 보유 (중앙 스토어 없음) |
| 렌더 루프 | 단일 rAF 루프에서 모든 update() 순차 호출 |
| 3D 오브젝트 | 프로시저럴 생성 (외부 모델 파일 없음) |

---

## 11. Implementation Guide

### 11.1 File Structure

```
bowhand/
├── index.html                # 진입 HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts               # 앱 초기화 + 렌더 루프
│   ├── camera/
│   │   └── CameraManager.ts
│   ├── tracking/
│   │   ├── HandTracker.ts
│   │   └── GestureEngine.ts
│   ├── scene/
│   │   ├── SceneManager.ts
│   │   ├── FantasyField.ts
│   │   └── Target.ts
│   ├── gameplay/
│   │   ├── AimController.ts
│   │   └── ArrowPhysics.ts
│   ├── ui/
│   │   └── HUD.ts
│   └── types/
│       ├── index.ts           # 공통 타입 정의
│       └── mediapipe.d.ts     # MediaPipe CDN 타입 선언
├── public/
│   └── (정적 에셋 — 현재 없음, 프로시저럴 생성)
└── docs/
    ├── 01-plan/
    └── 02-design/
```

### 11.2 Implementation Order

```
Phase 1: 프로젝트 기반 ──────────────────────────
1. [ ] Vite + TypeScript 프로젝트 초기화
2. [ ] Three.js, MediaPipe 패키지 설치
3. [ ] 공통 타입 정의 (types/index.ts)

Phase 2: 카메라 + 핸드트래킹 ────────────────────
4. [ ] CameraManager 구현 (카메라 스트림 획득)
5. [ ] HandTracker 구현 (MediaPipe Hands 래퍼)
6. [ ] GestureEngine 구현 (상태 머신)
7. [ ] 카메라 + 핸드트래킹 통합 테스트

Phase 3: 3D 씬 ─────────────────────────────────
8. [ ] SceneManager 구현 (Three.js 초기화)
9. [ ] FantasyField 구현 (프로시저럴 환경)
10. [ ] Target 구현 (타겟 생성 + 부유 애니메이션)

Phase 4: 게임플레이 ─────────────────────────────
11. [ ] AimController 구현 (손 좌표 → 조준점)
12. [ ] ArrowPhysics 구현 (발사 + 궤적 + 적중)
13. [ ] HUD 구현 (파워 게이지 + 상태 텍스트)

Phase 5: 통합 + 최적화 ─────────────────────────
14. [ ] main.ts에서 전체 모듈 통합 + 렌더 루프
15. [ ] 모바일 성능 최적화 (프레임 스킵, 해상도 조절)
16. [ ] 에러 처리 (카메라 거부, 로딩 실패 등)
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-22 | Initial draft | h0977 |
| 0.2 | 2026-03-22 | Gap Analysis 기반 업데이트: Target 5개 난이도 시스템, 5링 과녁, 메서드 시그니처 동기화, 이벤트 이름 간소화, HUD 영어 UI + 점수 표시, 피드백 0.8초, FogExp2 하늘, mediapipe.d.ts 추가 | h0977 |
