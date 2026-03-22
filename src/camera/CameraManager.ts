export class CameraManager {
  private video: HTMLVideoElement;
  private stream: MediaStream | null = null;

  constructor() {
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('autoplay', '');
    this.video.style.display = 'none';
    document.body.appendChild(this.video);
  }

  async init(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw new Error('CAMERA_DENIED');
      }
      throw new Error('CAMERA_FAILED');
    }
  }

  getVideoElement(): HTMLVideoElement {
    return this.video;
  }

  getVideoSize(): { width: number; height: number } {
    return {
      width: this.video.videoWidth || 640,
      height: this.video.videoHeight || 480,
    };
  }

  destroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.video.remove();
  }
}
