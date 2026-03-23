export class CameraManager {
  // Front camera video — used by both MediaPipe and PiP display
  // Single video element avoids mobile stream duplication issues
  private frontVideo: HTMLVideoElement;
  private frontStream: MediaStream | null = null;

  // Rear camera — for AR background
  private rearStream: MediaStream | null = null;

  private dualSupported = false;

  constructor(frontVideoEl: HTMLVideoElement) {
    this.frontVideo = frontVideoEl;
  }

  async init(): Promise<void> {
    // 1. Start front camera first (hand tracking — critical)
    try {
      this.frontStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      this.frontVideo.srcObject = this.frontStream;
      this.frontVideo.muted = true;
      await this.frontVideo.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw new Error('CAMERA_DENIED');
      }
      throw new Error('CAMERA_FAILED');
    }

    // 2. Try rear camera (AR background — optional)
    // Many mobile devices cannot open two cameras simultaneously
    try {
      this.rearStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (error) {
      console.warn('Rear camera unavailable, using front camera fallback:', error);
      this.rearStream = null;
    }

    this.dualSupported = this.rearStream !== null;
  }

  /** Front camera video element — for MediaPipe hand tracking input */
  getVideoElement(): HTMLVideoElement {
    return this.frontVideo;
  }

  /** AR background stream (rear camera, or front as fallback) */
  getARStream(): MediaStream | null {
    return this.rearStream ?? this.frontStream;
  }

  isDualCamera(): boolean {
    return this.dualSupported;
  }

  getVideoSize(): { width: number; height: number } {
    return {
      width: this.frontVideo.videoWidth || 640,
      height: this.frontVideo.videoHeight || 480,
    };
  }

  destroy(): void {
    if (this.frontStream) {
      this.frontStream.getTracks().forEach((track) => track.stop());
      this.frontStream = null;
    }
    if (this.rearStream) {
      this.rearStream.getTracks().forEach((track) => track.stop());
      this.rearStream = null;
    }
  }
}
