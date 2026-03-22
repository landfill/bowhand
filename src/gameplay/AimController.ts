import * as THREE from 'three';

export class AimController {
  private crosshairSprite: THREE.Sprite;
  private aimPoint = new THREE.Vector3();
  private crosshairCanvas: HTMLCanvasElement;
  private crosshairTexture: THREE.CanvasTexture;

  constructor() {
    // Create crosshair texture with canvas
    this.crosshairCanvas = document.createElement('canvas');
    this.crosshairCanvas.width = 64;
    this.crosshairCanvas.height = 64;
    this.crosshairTexture = new THREE.CanvasTexture(this.crosshairCanvas);
    this.drawCrosshair(1.0, 0xffffff);

    const material = new THREE.SpriteMaterial({
      map: this.crosshairTexture,
      transparent: true,
      depthTest: false,
    });
    this.crosshairSprite = new THREE.Sprite(material);
    this.crosshairSprite.scale.set(0.8, 0.8, 1);
  }

  init(scene: THREE.Scene): void {
    scene.add(this.crosshairSprite);
  }

  update(
    handPosition: { x: number; y: number },
    camera: THREE.PerspectiveCamera,
  ): void {
    // Convert normalized hand position (0~1) to NDC (-1~1)
    // Mirror X because front camera is mirrored
    const ndcX = (handPosition.x * 2 - 1) * -1;
    const ndcY = -(handPosition.y * 2 - 1);

    // Project to 3D world at a fixed distance from camera
    const aimDistance = 15;
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    this.aimPoint.copy(camera.position).add(dir.multiplyScalar(aimDistance));

    // Position crosshair sprite at aim point
    this.crosshairSprite.position.copy(this.aimPoint);
  }

  setDrawState(power: number): void {
    // Visual feedback: crosshair shrinks and changes color as power increases
    const scale = 0.8 - power * 0.5; // 0.8 → 0.3
    this.crosshairSprite.scale.set(scale, scale, 1);

    // Color: white → yellow → red
    let color: number;
    if (power < 0.5) {
      color = 0xffffff;
    } else if (power < 0.8) {
      color = 0xffcc00;
    } else {
      color = 0xff3300;
    }
    this.drawCrosshair(1.0 - power * 0.5, color);
    this.crosshairTexture.needsUpdate = true;
  }

  resetCrosshair(): void {
    this.crosshairSprite.scale.set(0.8, 0.8, 1);
    this.drawCrosshair(1.0, 0xffffff);
    this.crosshairTexture.needsUpdate = true;
  }

  getAimDirection(camera: THREE.PerspectiveCamera): THREE.Vector3 {
    return this.aimPoint.clone().sub(camera.position).normalize();
  }

  private drawCrosshair(size: number, colorHex: number): void {
    const ctx = this.crosshairCanvas.getContext('2d')!;
    const w = this.crosshairCanvas.width;
    const h = this.crosshairCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = (w / 2 - 4) * size;

    ctx.clearRect(0, 0, w, h);

    const color = `#${colorHex.toString(16).padStart(6, '0')}`;

    // Outer circle
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Cross lines
    const lineLen = r * 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - lineLen, cy);
    ctx.lineTo(cx + lineLen, cy);
    ctx.moveTo(cx, cy - lineLen);
    ctx.lineTo(cx, cy + lineLen);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
