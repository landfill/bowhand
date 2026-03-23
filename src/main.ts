import * as THREE from 'three';
import { CameraManager } from './camera/CameraManager';
import { HandTracker } from './tracking/HandTracker';
import { GestureEngine } from './tracking/GestureEngine';
import { SceneManager } from './scene/SceneManager';
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

// Wait for user tap before requesting camera (required on mobile)
startBtn.addEventListener('click', () => {
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

  // --- Initialize Camera ---
  // pip-view serves double duty: PiP display AND MediaPipe input
  // This avoids assigning one stream to multiple videos (breaks on mobile)
  showLoading('Requesting camera access...');
  const arBg = document.getElementById('ar-background') as HTMLVideoElement;
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

  // --- Setup AR background ---
  const arStream = cameraManager.getARStream();
  if (arStream) {
    arBg.srcObject = arStream;
    arBg.muted = true;
    try {
      await arBg.play();
    } catch {
      showError(
        'AR Video Error',
        'Could not start camera background. Please reload the page or check browser settings.',
      );
      return;
    }
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

  // --- Initialize 3D Scene (AR overlay) ---
  showLoading('Setting up AR targets...');
  const sceneManager = new SceneManager();
  sceneManager.init(app);

  // AR lighting — needs to work with transparent background
  const arLight = new THREE.DirectionalLight(0xffffff, 1.0);
  arLight.position.set(5, 10, 5);
  sceneManager.getScene().add(arLight);
  const arAmbient = new THREE.AmbientLight(0xffffff, 0.6);
  sceneManager.getScene().add(arAmbient);

  // --- Create AR Targets ---
  // Targets positioned in front of camera, floating in AR space
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
    // Reset hit target after delay
    const idx = e.detail.targetIndex;
    setTimeout(() => targets[idx].resetHit(), 1500);
  }) as EventListener);

  arrowPhysics.addEventListener('miss', () => {
    hud.showMissFeedback();
  });

  // --- Hide loading, show game ---
  loadingEl.style.display = 'none';

  // --- Render Loop ---
  const clock = new THREE.Clock();

  // FPS monitoring for adaptive frame skip
  let frameCount = 0;
  let fpsAccum = 0;
  const FPS_CHECK_INTERVAL = 60; // check every 60 frames
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
    }

    // 1. Hand tracking
    handTracker
      .detect(cameraManager.getVideoElement())
      .then((landmarks) => {
        // 2. Gesture recognition
        const gesture = gestureEngine.update(landmarks);

        // 3. Update aim
        if (landmarks) {
          aimController.update(gesture.handPosition, sceneManager.getCamera());
        }

        // 4. Update draw state visual
        if (gesture.state === 'DRAW') {
          aimController.setDrawState(gesture.drawPower);
          hud.updatePower(gesture.drawPower);
        } else {
          hud.updatePower(0);
        }

        // 5. Update HUD state
        hud.updateState(gesture.state);
      })
      .catch(() => {
        // Silently handle tracking errors
      });

    // 6. Update arrow physics
    arrowPhysics.update(delta);

    // 7. Update targets
    for (const target of targets) {
      target.update(delta);
    }

    // 8. Render
    sceneManager.render();
  }

  gameLoop();
}
