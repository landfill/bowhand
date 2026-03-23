/// <reference path="../types/mediapipe.d.ts" />
import type { HandLandmark } from '../types';

export class HandTracker {
  private hands: Hands;
  private latestResults: MediaPipeHandsResults | null = null;
  private isReady = false;
  private frameSkip = 0;
  private skipInterval = 2;

  constructor() {
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      modelComplexity: 0,
      maxNumHands: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results) => {
      this.latestResults = results;
    });
  }

  async init(): Promise<void> {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    await this.hands.send({ image: canvas });
    this.isReady = true;
  }

  async detect(video: HTMLVideoElement): Promise<HandLandmark[] | null> {
    if (!this.isReady) return null;

    // Skip if video not ready (mobile can be slow to deliver frames)
    if (video.readyState < 2 || video.videoWidth === 0) return this.extractLandmarks();

    this.frameSkip++;
    if (this.frameSkip % this.skipInterval !== 0) {
      return this.extractLandmarks();
    }

    await this.hands.send({ image: video });
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
