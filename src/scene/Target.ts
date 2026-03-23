import * as THREE from 'three';
import type { TargetConfig, HitResult } from '../types';

export class Target {
  private mesh: THREE.Group;
  private hitSphere: THREE.Sphere;
  private config: TargetConfig;
  private isHit = false;
  private baseY: number;
  private baseX: number;
  private elapsed = 0;
  private hitFlashTimer = 0;
  private particles: THREE.Points | null = null;
  private particleLife = 0;
  private glowRing: THREE.Mesh | null = null;
  private originalMaterials: Map<THREE.Mesh, number> = new Map();

  constructor(config: TargetConfig) {
    this.config = config;
    this.baseY = config.position.y;
    this.baseX = config.position.x;
    this.mesh = new THREE.Group();
    this.hitSphere = new THREE.Sphere(config.position.clone(), config.radius);
    this.createMesh();
    this.mesh.position.copy(config.position);
  }

  private createMesh(): void {
    const r = this.config.radius;

    // 5-ring archery target (gold → red → blue → black → white)
    const rings = [
      { radius: r, color: 0xeeeeee },         // white (outer)
      { radius: r * 0.82, color: 0x222222 },   // black
      { radius: r * 0.64, color: 0x2288cc },   // blue
      { radius: r * 0.46, color: 0xcc3333 },   // red
      { radius: r * 0.28, color: 0xffcc00 },   // gold (bullseye)
    ];

    for (let i = 0; i < rings.length; i++) {
      const geo = new THREE.CylinderGeometry(
        rings[i].radius,
        rings[i].radius,
        0.06,
        24,
      );
      const mat = new THREE.MeshPhongMaterial({
        color: rings[i].color,
        shininess: 30,
      });
      const disc = new THREE.Mesh(geo, mat);
      disc.rotation.x = Math.PI / 2;
      disc.position.z = i * 0.008;
      this.mesh.add(disc);
      this.originalMaterials.set(disc, rings[i].color);
    }

    // Wooden frame ring
    const frameGeo = new THREE.TorusGeometry(r + 0.06, 0.1, 8, 24);
    const frameMat = new THREE.MeshPhongMaterial({
      color: 0x8b5a2b,
      shininess: 10,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    this.mesh.add(frame);

    // Wooden stand posts (for static targets)
    if (this.config.type === 'static') {
      const postMat = new THREE.MeshPhongMaterial({ color: 0x6b4226 });
      const postGeo = new THREE.CylinderGeometry(0.06, 0.08, this.config.position.y, 6);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-r * 0.6, -this.config.position.y / 2, 0.1);
      this.mesh.add(leftPost);
      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(r * 0.6, -this.config.position.y / 2, 0.1);
      this.mesh.add(rightPost);
    }

    // AR glow ring — always slightly visible for AR visibility
    const glowGeo = new THREE.TorusGeometry(r + 0.2, 0.06, 8, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.2,
    });
    this.glowRing = new THREE.Mesh(glowGeo, glowMat);
    this.mesh.add(this.glowRing);
  }

  update(deltaTime: number): void {
    this.elapsed += deltaTime;

    // Floating animation
    if (this.config.type === 'floating') {
      const amp = this.config.floatAmplitude ?? 0.5;
      const speed = this.config.floatSpeed ?? 1.0;
      const swayAmp = this.config.swayAmplitude ?? amp * 0.3;
      const swaySpeed = this.config.swaySpeed ?? speed * 0.7;
      this.mesh.position.y = this.baseY + Math.sin(this.elapsed * speed) * amp;
      this.mesh.position.x = this.baseX + Math.sin(this.elapsed * swaySpeed) * swayAmp;
      // Tilt follows horizontal sway direction
      this.mesh.rotation.z = Math.sin(this.elapsed * swaySpeed) * swayAmp * 0.15;
    }

    // Glow ring pulse
    if (this.glowRing) {
      const glowMat = this.glowRing.material as THREE.MeshBasicMaterial;
      const pulse = (Math.sin(this.elapsed * 2) + 1) * 0.15;
      glowMat.opacity = this.isHit ? 0 : pulse;
    }

    // Hit flash decay with bounce
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaTime;
      const t = this.hitFlashTimer / 0.6;
      // Elastic bounce scale
      const scale = 1 + Math.sin(t * Math.PI * 3) * t * 0.3;
      this.mesh.scale.setScalar(Math.max(scale, 0.8));
      if (this.hitFlashTimer <= 0) {
        this.mesh.scale.setScalar(1);
      }
    }

    // Particle decay
    if (this.particles && this.particleLife > 0) {
      this.particleLife -= deltaTime;
      const positions = (this.particles.geometry as THREE.BufferGeometry)
        .getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        positions.setY(i, positions.getY(i) + deltaTime * (2 + Math.random() * 3));
        positions.setX(i, positions.getX(i) + (Math.random() - 0.5) * deltaTime * 2);
        positions.setZ(i, positions.getZ(i) + (Math.random() - 0.5) * deltaTime * 2);
      }
      positions.needsUpdate = true;
      (this.particles.material as THREE.PointsMaterial).opacity = this.particleLife / 1.0;
      if (this.particleLife <= 0) {
        this.mesh.remove(this.particles);
        this.particles.geometry.dispose();
        (this.particles.material as THREE.PointsMaterial).dispose();
        this.particles = null;
      }
    }

    // Update hitbox position
    this.hitSphere.center.copy(this.mesh.position);
  }

  checkHit(raycaster: THREE.Raycaster): HitResult {
    const ray = raycaster.ray;
    const intersectPoint = new THREE.Vector3();

    if (ray.intersectSphere(this.hitSphere, intersectPoint)) {
      const distance = intersectPoint.distanceTo(this.hitSphere.center);
      return {
        hit: true,
        targetIndex: -1,
        distance,
        position: intersectPoint.clone(),
      };
    }

    return {
      hit: false,
      targetIndex: -1,
      distance: Infinity,
      position: new THREE.Vector3(),
    };
  }

  onHit(): void {
    this.isHit = true;
    this.hitFlashTimer = 0.6;

    // Spawn burst particles
    this.spawnHitParticles();

    // Flash all rings to gold then restore
    this.originalMaterials.forEach((_origColor, mesh) => {
      const mat = mesh.material;
      if (mat instanceof THREE.MeshPhongMaterial) {
        mat.emissive.setHex(0xffaa00);
        mat.emissiveIntensity = 0.8;
        setTimeout(() => {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }, 400);
      }
    });
  }

  private spawnHitParticles(): void {
    if (this.particles) {
      this.mesh.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.PointsMaterial).dispose();
    }

    const count = 30;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sparkColors = [
      new THREE.Color(0xffcc00), // gold
      new THREE.Color(0xff6600), // orange
      new THREE.Color(0xff3333), // red
      new THREE.Color(0xffffff), // white
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = Math.random() * 0.3;
      const c = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.particleLife = 1.0;
    this.mesh.add(this.particles);
  }

  resetHit(): void {
    this.isHit = false;
  }

  getMesh(): THREE.Group {
    return this.mesh;
  }

  getIsHit(): boolean {
    return this.isHit;
  }
}
