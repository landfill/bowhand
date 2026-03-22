export class CameraManager {
  // Front camera — for hand tracking
  private frontVideo: HTMLVideoElement;
  private frontStream: MediaStream | null = null;

  // Rear camera — for AR background
  private rearVideo: HTMLVideoElement;
  private rearStream: MediaStream | null = null;

  private dualSupported = false;

  constructor() {
    this.frontVideo = this.createVideoElement('front-cam');
    this.rearVideo = this.createVideoElement('rear-cam');
  }

  private createVideoElement(id: string): HTMLVideoElement {
    const video = document.createElement('video');
    video.id = id;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.style.display = 'none';
    document.body.appendChild(video);
    return video;
  }

  async init(): Promise<void> {
    // 1. Start rear camera (AR background) — higher resolution
    try {
      this.rearStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      this.rearVideo.srcObject = this.rearStream;
      await this.rearVideo.play();
    } catch {
      // Fallback: no rear camera (desktop) — use front camera for both
      this.rearStream = null;
    }

    // 2. Start front camera (hand tracking)
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
      await this.frontVideo.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw new Error('CAMERA_DENIED');
      }
      throw new Error('CAMERA_FAILED');
    }

    this.dualSupported = this.rearStream !== null;

    // If no rear camera, use front camera as AR background too
    if (!this.dualSupported) {
      this.rearVideo.srcObject = this.frontStream;
      await this.rearVideo.play();
    }
  }

  /** Front camera video for hand tracking */
  getVideoElement(): HTMLVideoElement {
    return this.frontVideo;
  }

  /** Rear camera video for AR background */
  getRearVideoElement(): HTMLVideoElement {
    return this.rearVideo;
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

  getRearVideoSize(): { width: number; height: number } {
    return {
      width: this.rearVideo.videoWidth || 1280,
      height: this.rearVideo.videoHeight || 720,
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
    this.frontVideo.remove();
    this.rearVideo.remove();
  }
}
