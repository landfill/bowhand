export class CameraManager {
  // Front camera only — used by MediaPipe for hand tracking
  private frontVideo: HTMLVideoElement;
  private frontStream: MediaStream | null = null;

  constructor(frontVideoEl: HTMLVideoElement) {
    this.frontVideo = frontVideoEl;
  }

  async init(): Promise<void> {
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
  }

  getVideoElement(): HTMLVideoElement {
    return this.frontVideo;
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
  }
}
