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
const errorScreen = document.getElementById('error-screen')!;
const errorTitle = document.getElementById('error-title')!;
const errorMessage = document.getElementById('error-message')!;

function showError(title: string, message: string): void {
  loadingEl.style.display = 'none';
  errorScreen.style.display = 'flex';
  errorTitle.textContent = title;
  errorMessage.textContent = message;
}

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
  loadingText.textContent = 'Requesting camera access...';
  const cameraManager = new CameraManager();
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
  loadingText.textContent = 'Loading hand tracking model...';
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
  loadingText.textContent = 'Building fantasy world...';
  const sceneManager = new SceneManager();
  sceneManager.init(app);

  const fantasyField = new FantasyField();
  fantasyField.init(sceneManager.getScene());

  // --- Create Targets ---
  const targetConfigs: TargetConfig[] = [
    // Near row — easy
    {
      position: new THREE.Vector3(-4, 1.5, -12),
      radius: 1.2,
      type: 'static',
    },
    {
      position: new THREE.Vector3(4, 1.8, -13),
      radius: 1.0,
      type: 'static',
    },
    // Mid row — medium (floating)
    {
      position: new THREE.Vector3(0, 3, -18),
      radius: 1.0,
      type: 'floating',
      floatAmplitude: 0.6,
      floatSpeed: 0.8,
    },
    {
      position: new THREE.Vector3(-6, 2.5, -20),
      radius: 0.9,
      type: 'floating',
      floatAmplitude: 0.4,
      floatSpeed: 1.2,
    },
    // Far row — hard (smaller, faster)
    {
      position: new THREE.Vector3(5, 3.5, -25),
      radius: 0.7,
      type: 'floating',
      floatAmplitude: 0.8,
      floatSpeed: 1.8,
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

    // 8. Update environment
    fantasyField.update(delta);

    // 9. Render
    sceneManager.render();
  }

  gameLoop();
}

main();
