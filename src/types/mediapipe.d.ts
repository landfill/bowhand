declare class Hands {
  constructor(config: { locateFile: (file: string) => string });
  setOptions(options: {
    modelComplexity?: number;
    maxNumHands?: number;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }): void;
  onResults(callback: (results: MediaPipeHandsResults) => void): void;
  send(input: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
  close(): void;
}

interface MediaPipeHandsResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandWorldLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandedness?: Array<Array<{ label: string; score: number }>>;
  image: HTMLCanvasElement;
}
