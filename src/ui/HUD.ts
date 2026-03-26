import type { GestureState } from '../types';

const STATE_MESSAGES: Record<GestureState, string> = {
  IDLE: 'Show your hand ✋',
  NOCK: 'Make a fist ✊',
  DRAW: 'Hold and aim... 🏹',
  RELEASE: '',
};

export class HUD {
  private container: HTMLElement;
  private powerGauge!: HTMLElement;
  private powerFill!: HTMLElement;
  private powerLabel!: HTMLElement;
  private stateText!: HTMLElement;
  private feedbackText!: HTMLElement;
  private feedbackTimer = 0;
  private hitCount = 0;
  private shotCount = 0;
  private score = 0;
  private scoreDisplay!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createElements();
  }

  private createElements(): void {
    const hud = document.createElement('div');
    hud.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      font-family: system-ui, sans-serif; z-index: 10;
    `;

    // Power gauge (left side vertical bar) — enhanced
    this.powerGauge = document.createElement('div');
    this.powerGauge.style.cssText = `
      position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
      width: 14px; height: 160px; background: rgba(0,0,0,0.4);
      border-radius: 7px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.15);
    `;
    this.powerFill = document.createElement('div');
    this.powerFill.style.cssText = `
      position: absolute; bottom: 0; width: 100%; height: 0%;
      background: linear-gradient(to top, #4488ff, #44ccff);
      border-radius: 7px;
      transition: height 0.05s, background 0.1s;
      box-shadow: 0 0 8px rgba(68,136,255,0.4);
    `;
    this.powerGauge.appendChild(this.powerFill);
    this.powerLabel = document.createElement('div');
    this.powerLabel.style.cssText = `
      position: absolute; left: 36px; top: 50%; transform: translateY(-50%);
      color: rgba(255,255,255,0.5); font-size: 0.7rem; font-weight: 600;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    `;
    this.powerLabel.textContent = 'POWER';
    hud.appendChild(this.powerGauge);
    hud.appendChild(this.powerLabel);

    // Score display (top right)
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.style.cssText = `
      position: absolute; top: 20px; right: 20px;
      color: white; font-size: 1rem; font-weight: 700;
      text-shadow: 0 1px 4px rgba(0,0,0,0.7);
      text-align: right; line-height: 1.5;
    `;
    this.updateScoreDisplay();
    hud.appendChild(this.scoreDisplay);

    // State text (bottom center)
    this.stateText = document.createElement('div');
    this.stateText.style.cssText = `
      position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
      color: white; font-size: 1.1rem; font-weight: 600;
      text-shadow: 0 1px 4px rgba(0,0,0,0.7);
      text-align: center; white-space: nowrap;
      background: rgba(0,0,0,0.2); padding: 6px 16px; border-radius: 20px;
    `;
    hud.appendChild(this.stateText);

    // Feedback text (center, for HIT/MISS) — enhanced with animation
    this.feedbackText = document.createElement('div');
    this.feedbackText.style.cssText = `
      position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%) scale(0.5);
      color: white; font-size: 4rem; font-weight: 900;
      text-shadow: 0 2px 12px rgba(0,0,0,0.8), 0 0 40px rgba(255,200,0,0.3);
      opacity: 0;
      transition: opacity 0.15s, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      letter-spacing: 4px;
    `;
    hud.appendChild(this.feedbackText);

    this.container.appendChild(hud);
  }

  updatePower(power: number): void {
    const percent = Math.round(power * 100);
    this.powerFill.style.height = `${percent}%`;

    if (power < 0.3) {
      this.powerFill.style.background = 'linear-gradient(to top, #4488ff, #44ccff)';
      this.powerFill.style.boxShadow = '0 0 8px rgba(68,136,255,0.4)';
    } else if (power < 0.7) {
      this.powerFill.style.background = 'linear-gradient(to top, #44cc44, #88ff44)';
      this.powerFill.style.boxShadow = '0 0 8px rgba(68,204,68,0.4)';
    } else {
      this.powerFill.style.background = 'linear-gradient(to top, #ff4422, #ff8800)';
      this.powerFill.style.boxShadow = '0 0 12px rgba(255,68,34,0.6)';
    }
  }

  updateState(state: GestureState): void {
    this.stateText.textContent = STATE_MESSAGES[state];
  }

  showHitFeedback(isPenalty?: boolean): void {
    this.shotCount++;
    
    if (isPenalty) {
      this.score = Math.max(0, this.score - 10);
      this.updateScoreDisplay();

      this.feedbackText.textContent = '-10';
      this.feedbackText.style.color = '#ff3333';
      this.feedbackText.style.textShadow =
        '0 2px 12px rgba(0,0,0,0.8), 0 0 60px rgba(255,0,0,0.5)';
    } else {
      this.hitCount++;
      this.score += 10;
      this.updateScoreDisplay();

      this.feedbackText.textContent = '+10';
      this.feedbackText.style.color = '#44ddaa';
      this.feedbackText.style.textShadow =
        '0 2px 12px rgba(0,0,0,0.8), 0 0 60px rgba(0,255,100,0.5)';
    }

    this.feedbackText.style.opacity = '1';
    this.feedbackText.style.transform = 'translate(-50%, -50%) scale(1.2)';

    requestAnimationFrame(() => {
      setTimeout(() => {
        this.feedbackText.style.transform = 'translate(-50%, -50%) scale(1)';
      }, 50);
    });

    this.clearFeedbackAfterDelay();
  }

  showMissFeedback(): void {
    this.shotCount++;
    this.updateScoreDisplay();

    this.feedbackText.textContent = 'MISS';
    this.feedbackText.style.color = '#ff5555';
    this.feedbackText.style.textShadow =
      '0 2px 12px rgba(0,0,0,0.8), 0 0 30px rgba(255,50,50,0.3)';
    this.feedbackText.style.opacity = '1';
    this.feedbackText.style.transform = 'translate(-50%, -50%) scale(1)';

    this.clearFeedbackAfterDelay();
  }

  private updateScoreDisplay(): void {
    const accuracy = this.shotCount > 0
      ? Math.round((this.hitCount / this.shotCount) * 100)
      : 0;
    this.scoreDisplay.innerHTML = `
      <div style="font-size:0.8rem; color:#44ddaa; letter-spacing:1px;">SCORE</div>
      <div style="font-size:2rem; line-height:1.1">${this.score}</div>
      <div style="font-size:0.8rem; opacity:0.7">${accuracy}% accuracy</div>
    `;
  }

  private clearFeedbackAfterDelay(): void {
    clearTimeout(this.feedbackTimer as unknown as number);
    this.feedbackTimer = window.setTimeout(() => {
      this.feedbackText.style.opacity = '0';
      this.feedbackText.style.transform = 'translate(-50%, -50%) scale(0.5)';
    }, 800);
  }
}
