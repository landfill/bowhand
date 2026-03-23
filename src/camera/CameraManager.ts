export class CameraManager {
  // Front camera — for hand tracking (hidden, used by MediaPipe)
  private frontVideo: HTMLVideoElement;
  private frontStream: MediaStream | null = null;

  // Rear camera — for AR background
  private rearStream: MediaStream | null = null;

  private dualSupported = false;

  constructor() {
    // Front camera needs a hidden video for MediaPipe input
    this.frontVideo = this.createHiddenVideo('front-cam');
  }

  private createHiddenVideo(id: string): HTMLVideoElement {
    const video = document.createElement('video');
    video.id = id;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.muted = true;
    // Use offscreen positioning instead of display:none
    // Some mobile browsers don't deliver frames for display:none videos
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    document.body.appendChild(video);
    return video;
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
      await this.frontVideo.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw new Error('CAMERA_DENIED');
      }
      throw new Error('CAMERA_FAILED');
    }

    // 2. Try rear camera (AR background — optional)
    // Many mobile devices cannot open two cameras simultaneously,
    // so this is a best-effort attempt
    try {
      this.rearStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      // Fallback: use front camera for AR background too
      this.rearStream = null;
    }

    this.dualSupported = this.rearStream !== null;
  }

  /** Front camera video for hand tracking (hidden element) */
  getVideoElement(): HTMLVideoElement {
    return this.frontVideo;
  }

  /** Get the AR background stream (rear or front fallback) */
  getARStream(): MediaStream | null {
    return this.rearStream ?? this.frontStream;
  }

  /** Get the front camera stream for PiP */
  getFrontStream(): MediaStream | null {
    return this.frontStream;
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
    this.frontVideo.remove();
  }
}
