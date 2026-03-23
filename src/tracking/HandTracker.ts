/// <reference path="../types/mediapipe.d.ts" />
import type { HandLandmark } from '../types';

export class HandTracker {
  private hands: Hands;
  private latestResults: MediaPipeHandsResults | null = null;
  private isReady = false;
  private frameSkip = 0;
  private skipInterval = 2;

  // Canvas intermediate for mobile compatibility
  // Avoids WebGL context conflicts between MediaPipe and Three.js
  private detectCanvas: HTMLCanvasElement | null = null;
  private detectCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      modelComplexity: 0,
      maxNumHands: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.4,
    });

    this.hands.onResults((results) => {
      this.latestResults = results;
    });
  }

  async init(): Promise<void> {
    // Use a larger canvas for warm-up to ensure full model initialization
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    await this.hands.send({ image: canvas });
    this.isReady = true;
  }

  private ensureCanvas(w: number, h: number): void {
    if (!this.detectCanvas || this.detectCanvas.width !== w || this.detectCanvas.height !== h) {
      this.detectCanvas = document.createElement('canvas');
      this.detectCanvas.width = w;
      this.detectCanvas.height = h;
      this.detectCtx = this.detectCanvas.getContext('2d');
    }
  }

  async detect(video: HTMLVideoElement): Promise<HandLandmark[] | null> {
    if (!this.isReady) return null;

    // Skip if video not ready (mobile can be slow to deliver frames)
    if (video.readyState < 2 || video.videoWidth === 0) return this.extractLandmarks();

    this.frameSkip++;
    if (this.frameSkip % this.skipInterval !== 0) {
      return this.extractLandmarks();
    }

    // Draw video frame to 2D canvas first, then send canvas to MediaPipe.
    // This avoids mobile issues where video→WebGL texture transfer fails
    // when Three.js holds the primary WebGL context.
    this.ensureCanvas(video.videoWidth, video.videoHeight);
    this.detectCtx!.drawImage(video, 0, 0);

    await this.hands.send({ image: this.detectCanvas! });
    return this.extractLandmarks();
  }

  private extractLandmarks(): HandLandmark[] | null {
    if (
      !this.latestResults ||
      !this.latestResults.multiHandLandmarks ||
      this.latestResults.multiHandLandmarks.length === 0
    ) {
      return null;
    }

    return this.latestResults.multiHandLandmarks[0].map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
    }));
  }

  setSkipInterval(interval: number): void {
    this.skipInterval = Math.max(1, Math.min(interval, 5));
  }

  getSkipInterval(): number {
    return this.skipInterval;
  }

  destroy(): void {
    this.hands.close();
  }
}
