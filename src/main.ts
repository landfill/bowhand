import * as THREE from 'three';
import { CameraManager } from './camera/CameraManager';
import { HandTracker } from './tracking/HandTracker';
import { GestureEngine } from './tracking/GestureEngine';
import { SceneManager } from './scene/SceneManager';
import { FantasyField } from './scene/FantasyField';
import { Target } from './scene/Target';
import { AimController } from './gameplay/AimController';
import { ArrowPhysics } from './gameplay/ArrowPhysics';
import { HUD } from './ui/HUD';
import type { TargetConfig } from './types';

// DOM references
const app = document.getElementById('app')!;
const loadingEl = document.getElementById('loading')!;
const loadingText = document.getElementById('loading-text')!;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const errorScreen = document.getElementById('error-screen')!;
const errorTitle = document.getElementById('error-title')!;
const errorMessage = document.getElementById('error-message')!;

function showError(title: string, message: string): void {
  loadingEl.style.display = 'none';
  errorScreen.style.display = 'flex';
  errorTitle.textContent = title;
  errorMessage.textContent = message;
}

function showLoading(text: string): void {
  startBtn.style.display = 'none';
  loadingText.textContent = text;
}

// Gyroscope permission must be requested during user gesture (iOS 13+)
let gyroPermissionGranted = false;

startBtn.addEventListener('click', async () => {
  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      const perm = await (DeviceOrientationEvent as any).requestPermission();
      gyroPermissionGranted = perm === 'granted';
    } catch {
      gyroPermissionGranted = false;
    }
  } else {
    // Non-iOS: gyro available without permission
    gyroPermissionGranted = true;
  }
  main();
}, { once: true });

async function main(): Promise<void> {
  // --- Check WebGL Support ---
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    showError(
      'WebGL Not Supported',
      'Your browser does not support WebGL. Please use a modern browser like Chrome or Safari.',
    );
    return;
  }

  // --- Initialize Camera (front only, for hand tracking) ---
  showLoading('Requesting camera access...');
  const pipView = document.getElementById('pip-view') as HTMLVideoElement;
  const cameraManager = new CameraManager(pipView);
  try {
    await cameraManager.init();
  } catch (err) {
    if (err instanceof Error && err.message === 'CAMERA_DENIED') {
      showError(
        'Camera Required',
        'This game needs camera access for hand tracking. Please allow camera access and reload.',
      );
    } else {
      showError(
        'Camera Error',
        'Could not access the camera. Make sure you are using HTTPS and a supported browser.',
      );
    }
    return;
  }

  // --- Initialize Hand Tracker ---
  showLoading('Loading hand tracking model...');
  const handTracker = new HandTracker();
  try {
    await handTracker.init();
  } catch {
    showError(
      'Loading Error',
      'Failed to load hand tracking model. Check your internet connection and reload.',
    );
    return;
  }

  // --- Initialize 3D Scene ---
  showLoading('Setting up scene...');
  const sceneManager = new SceneManager();
  sceneManager.init(app);

  // --- Fantasy Field environment ---
  const fantasyField = new FantasyField();
  fantasyField.init(sceneManager.getScene());

  // --- Create Targets ---
  const targetConfigs: TargetConfig[] = [
    // Near — easy (large, slow)
    {
      position: new THREE.Vector3(-2, 1.5, -8),
      radius: 0.8,
      type: 'floating',
      floatAmplitude: 0.3,
      floatSpeed: 0.6,
    },
    {
      position: new THREE.Vector3(2, 1.8, -9),
      radius: 0.7,
      type: 'floating',
      floatAmplitude: 0.25,
      floatSpeed: 0.8,
    },
    // Mid — medium
    {
      position: new THREE.Vector3(0, 2.5, -14),
      radius: 0.6,
      type: 'floating',
      floatAmplitude: 0.5,
      floatSpeed: 1.0,
    },
    {
      position: new THREE.Vector3(-3, 2, -16),
      radius: 0.5,
      type: 'floating',
      floatAmplitude: 0.4,
      floatSpeed: 1.2,
    },
    // Far — hard (small, fast)
    {
      position: new THREE.Vector3(3, 3, -20),
      radius: 0.4,
      type: 'floating',
      floatAmplitude: 0.7,
      floatSpeed: 1.6,
    },
  ];

  const targets = targetConfigs.map((config) => {
    const target = new Target(config);
    sceneManager.addObject(target.getMesh());
    return target;
  });

  // --- Initialize Gameplay ---
  const gestureEngine = new GestureEngine();
  const aimController = new AimController();
  aimController.init(sceneManager.getScene());

  const arrowPhysics = new ArrowPhysics();
  arrowPhysics.init(sceneManager.getScene(), targets);

  // --- Initialize HUD ---
  const hud = new HUD(app);

  // --- Gyroscope Controls ---
  // Device orientation → Three.js camera rotation for "AR feel"
  // On PC (no gyro): camera stays at fixed position looking at targets
  let gyroActive = false;

  if (gyroPermissionGranted) {
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    const zee = new THREE.Vector3(0, 0, 1);

    const onOrientation = (event: DeviceOrientationEvent): void => {
      if (event.alpha === null) return;

      const alpha = THREE.MathUtils.degToRad(event.alpha);
      const beta = THREE.MathUtils.degToRad(event.beta!);
      const gamma = THREE.MathUtils.degToRad(event.gamma!);
      const orient = THREE.MathUtils.degToRad(
        (screen.orientation?.angle ?? (window as any).orientation ?? 0) as number,
      );

      const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
      const q = new THREE.Quaternion();
      q.setFromEuler(euler);
      q.multiply(q1);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(zee, -orient));

      sceneManager.getCamera().quaternion.copy(q);
      gyroActive = true;
    };

    window.addEventListener('deviceorientation', onOrientation);
  }

  // --- Event Handlers ---
  gestureEngine.addEventListener('release', ((e: CustomEvent) => {
    if (arrowPhysics.getIsFlying()) return;
    const power = e.detail.power as number;
    const direction = aimController.getAimDirection(sceneManager.getCamera());
    const startPos = sceneManager.getCamera().position.clone();
    arrowPhysics.fire(direction, power, startPos);
    aimController.resetCrosshair();
  }) as EventListener);

  arrowPhysics.addEventListener('hit', ((e: CustomEvent) => {
    hud.showHitFeedback();
    const idx = e.detail.targetIndex;
    setTimeout(() => targets[idx].resetHit(), 1500);
  }) as EventListener);

  arrowPhysics.addEventListener('miss', () => {
    hud.showMissFeedback();
  });

  // --- Hide loading, show game ---
  loadingEl.style.display = 'none';

  // --- Debug overlay ---
  const debugEl = document.createElement('div');
  debugEl.style.cssText = `
    position: absolute; top: 8px; left: 8px; z-index: 30;
    color: #0f0; font: 11px monospace; background: rgba(0,0,0,0.6);
    padding: 4px 8px; border-radius: 4px; pointer-events: none;
  `;
  app.appendChild(debugEl);

  const frontVid = cameraManager.getVideoElement();
  let detectCount = 0;
  let landmarkCount = 0;
  let lastError = '';

  // --- Render Loop ---
  const clock = new THREE.Clock();

  let frameCount = 0;
  let fpsAccum = 0;
  const FPS_CHECK_INTERVAL = 60;
  const LOW_FPS_THRESHOLD = 15;

  function gameLoop(): void {
    requestAnimationFrame(gameLoop);
    const delta = clock.getDelta();

    // FPS monitoring
    frameCount++;
    fpsAccum += delta;
    if (frameCount >= FPS_CHECK_INTERVAL) {
      const avgFps = frameCount / fpsAccum;
      if (avgFps < LOW_FPS_THRESHOLD && handTracker.getSkipInterval() < 4) {
        handTracker.setSkipInterval(handTracker.getSkipInterval() + 1);
      } else if (avgFps > 25 && handTracker.getSkipInterval() > 2) {
        handTracker.setSkipInterval(handTracker.getSkipInterval() - 1);
      }
      frameCount = 0;
      fpsAccum = 0;

      const fps = Math.round(avgFps);
      debugEl.textContent =
        `${fps}fps vid:${frontVid.videoWidth}x${frontVid.videoHeight} rs:${frontVid.readyState} ` +
        `det:${detectCount} lm:${landmarkCount} gyro:${gyroActive ? 'on' : 'off'}` +
        (lastError ? ` ERR:${lastError}` : '');
    }

    // 1. Hand tracking
    handTracker
      .detect(cameraManager.getVideoElement())
      .then((landmarks) => {
        detectCount++;

        const gesture = gestureEngine.update(landmarks);

        if (landmarks) {
          landmarkCount++;
          aimController.update(gesture.handPosition, sceneManager.getCamera());
        }

        if (gesture.state === 'DRAW') {
          aimController.setDrawState(gesture.drawPower);
          hud.updatePower(gesture.drawPower);
        } else {
          hud.updatePower(0);
        }

        hud.updateState(gesture.state);
      })
      .catch((err) => {
        lastError = String(err).slice(0, 40);
      });

    // 2. Arrow physics
    arrowPhysics.update(delta);

    // 3. Update targets
    for (const target of targets) {
      target.update(delta);
    }

    // 4. Update fantasy field (cloud animation)
    fantasyField.update(delta);

    // 5. Render
    sceneManager.render();
  }

  gameLoop();
}
