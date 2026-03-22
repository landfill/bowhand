import type { HandLandmark, GestureState, GestureEvent } from '../types';

// MediaPipe hand landmark indices
const FINGER_TIPS = [8, 12, 16, 20]; // index, middle, ring, pinky tips
const FINGER_PIPS = [6, 10, 14, 18]; // corresponding PIP joints
const WRIST = 0;

export class GestureEngine extends EventTarget {
  private state: GestureState = 'IDLE';
  private drawStartTime = 0;
  private drawPower = 0;
  private prevFingersCurled = 0;
  private readonly MAX_DRAW_TIME = 2000; // ms for full power

  update(landmarks: HandLandmark[] | null): GestureEvent {
    const event: GestureEvent = {
      state: this.state,
      handPosition: { x: 0.5, y: 0.5 },
      drawPower: this.drawPower,
      timestamp: performance.now(),
    };

    // No hand detected → reset to IDLE
    if (!landmarks) {
      if (this.state !== 'IDLE') {
        this.state = 'IDLE';
        this.drawPower = 0;
      }
      event.state = this.state;
      return event;
    }

    // Calculate hand center (palm)
    const palm = landmarks[WRIST];
    event.handPosition = { x: palm.x, y: palm.y };

    // Count curled fingers
    const curledCount = this.countCurledFingers(landmarks);

    switch (this.state) {
      case 'IDLE':
        // IDLE → NOCK: hand detected with open fingers
        if (curledCount <= 1) {
          this.state = 'NOCK';
        }
        break;

      case 'NOCK':
        // NOCK → DRAW: fist formed (3+ fingers curled)
        if (curledCount >= 3) {
          this.state = 'DRAW';
          this.drawStartTime = performance.now();
          this.drawPower = 0;
        }
        break;

      case 'DRAW':
        // Update draw power based on hold duration
        const elapsed = performance.now() - this.drawStartTime;
        this.drawPower = Math.min(elapsed / this.MAX_DRAW_TIME, 1.0);

        // DRAW → RELEASE: sudden finger spread
        // Detect: was curled (3+) → now open (1 or less)
        if (this.prevFingersCurled >= 3 && curledCount <= 1) {
          this.state = 'RELEASE';
          // Ensure minimum power
          this.drawPower = Math.max(this.drawPower, 0.3);
          this.dispatchEvent(
            new CustomEvent('release', {
              detail: { power: this.drawPower },
            }),
          );
        }
        break;

      case 'RELEASE':
        // RELEASE → IDLE: auto transition after one frame
        this.state = 'IDLE';
        this.drawPower = 0;
        break;
    }

    this.prevFingersCurled = curledCount;
    event.state = this.state;
    event.drawPower = this.drawPower;
    return event;
  }

  private countCurledFingers(landmarks: HandLandmark[]): number {
    let curled = 0;
    for (let i = 0; i < FINGER_TIPS.length; i++) {
      const tip = landmarks[FINGER_TIPS[i]];
      const pip = landmarks[FINGER_PIPS[i]];
      // Finger is curled if tip is below PIP (higher y = lower on screen)
      if (tip.y > pip.y) {
        curled++;
      }
    }
    return curled;
  }

  getState(): GestureState {
    return this.state;
  }

  getDrawPower(): number {
    return this.drawPower;
  }
}
