import * as THREE from 'three';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type GestureState = 'IDLE' | 'NOCK' | 'DRAW' | 'RELEASE';

export interface GestureEvent {
  state: GestureState;
  handPosition: { x: number; y: number };
  drawPower: number;
  timestamp: number;
}

export interface ArrowState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isFlying: boolean;
  launchPower: number;
  launchDirection: THREE.Vector3;
}

export interface TargetConfig {
  position: THREE.Vector3;
  radius: number;
  type: 'static' | 'floating';
  isPenalty?: boolean; // Added for non-target characters
  floatAmplitude?: number;
  floatSpeed?: number;
  swayAmplitude?: number; // horizontal sway width
  swaySpeed?: number;     // horizontal sway speed multiplier
}

export interface HitResult {
  hit: boolean;
  targetIndex: number;
  distance: number;
  position: THREE.Vector3;
  isPenalty?: boolean; // True if it hit a non-target penalty
}
