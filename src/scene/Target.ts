import * as THREE from 'three';
import type { TargetConfig, HitResult } from '../types';

export class Target {
  private mesh: THREE.Group;
  private characterGroup: THREE.Group;
  private hitSphere: THREE.Sphere;
  private config: TargetConfig;
  private isHit = false;
  private active = true;
  private baseY: number;
  private baseX: number;
  private elapsed = 0;
  private hitFlashTimer = 0;
  private particles: THREE.Points | null = null;
  private particleLife = 0;
  private glowRing: THREE.Mesh | null = null;
  private originalMaterials: Map<THREE.Mesh, number> = new Map();
  private randomOffset = Math.random() * Math.PI * 2;

  constructor(config: TargetConfig) {
    this.config = config;
    this.baseY = config.position.y;
    this.baseX = config.position.x;
    this.mesh = new THREE.Group();
    this.characterGroup = new THREE.Group();
    this.mesh.add(this.characterGroup);
    this.hitSphere = new THREE.Sphere(config.position.clone(), config.radius);
    this.createMesh();
    this.mesh.position.copy(config.position);
  }

  getConfig(): TargetConfig {
    return this.config;
  }

  getActive(): boolean {
    return this.active;
  }

  private createMesh(): void {
    const r = this.config.radius;
    const isPenalty = this.config.isPenalty;

    // We will build a character based on isPenalty
    if (isPenalty) {
      // Human Villager (Non-Target Penalty -10)
      // Head
      const headGeo = new THREE.SphereGeometry(r * 0.4, 32, 32);
      const skinMat = new THREE.MeshPhongMaterial({ color: 0xffdcb3, shininess: 10 });
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.set(0, r * 0.7, 0);
      this.characterGroup.add(head);
      this.originalMaterials.set(head, 0xffdcb3);

      // Body (Bright Shirt)
      const bodyGeo = new THREE.CylinderGeometry(r * 0.3, r * 0.35, r * 0.8, 16);
      const shirtMat = new THREE.MeshPhongMaterial({ color: 0x33ccff, shininess: 30 }); // Bright blue
      const body = new THREE.Mesh(bodyGeo, shirtMat);
      body.position.set(0, 0, 0);
      this.characterGroup.add(body);
      this.originalMaterials.set(body, 0x33ccff);

      // Hair
      const hairGeo = new THREE.SphereGeometry(r * 0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8);
      const hairMat = new THREE.MeshPhongMaterial({ color: 0x553311, flatShading: true });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, r * 0.72, 0);
      hair.rotation.x = -0.1;
      this.characterGroup.add(hair);

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(r * 0.06, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-r * 0.15, r * 0.75, r * 0.35);
      this.characterGroup.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(r * 0.15, r * 0.75, r * 0.35);
      this.characterGroup.add(rightEye);

      // Smile
      const smileGeo = new THREE.TorusGeometry(r * 0.1, r * 0.02, 8, 16, Math.PI);
      const smile = new THREE.Mesh(smileGeo, eyeMat);
      smile.rotation.x = Math.PI; // flip upside down to make a smile
      smile.position.set(0, r * 0.6, r * 0.38);
      this.characterGroup.add(smile);

      // Arms
      const armGeo = new THREE.CylinderGeometry(r * 0.1, r * 0.1, r * 0.6);
      const leftArm = new THREE.Mesh(armGeo, skinMat);
      leftArm.position.set(-r * 0.45, r * 0.1, 0);
      leftArm.rotation.z = Math.PI / 6;
      this.characterGroup.add(leftArm);
      const rightArm = new THREE.Mesh(armGeo, skinMat);
      rightArm.position.set(r * 0.45, r * 0.1, 0);
      rightArm.rotation.z = -Math.PI / 6;
      this.characterGroup.add(rightArm);

    } else {
      // Jack-o'-Lantern Pumpkin (Target +10)
      const bodyGeo = new THREE.SphereGeometry(r * 0.9, 32, 16);
      const bodyMat = new THREE.MeshPhongMaterial({
        color: 0xff6600, // vibrant orange
        shininess: 20,
        flatShading: true,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(1, 0.8, 1); // squash pumpkin
      this.characterGroup.add(body);
      this.originalMaterials.set(body, 0xff6600);

      // Stem
      const stemGeo = new THREE.CylinderGeometry(r * 0.08, r * 0.1, r * 0.4);
      const stemMat = new THREE.MeshPhongMaterial({ color: 0x228822 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(0, r * 0.8, 0);
      this.characterGroup.add(stem);

      // Carved Eyes (Glowing Yellowish)
      const carveMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      
      const leftEyeGeo = new THREE.ConeGeometry(r * 0.15, r * 0.2, 3);
      const leftEye = new THREE.Mesh(leftEyeGeo, carveMat);
      leftEye.position.set(-r * 0.35, r * 0.1, r * 0.8);
      leftEye.rotation.x = Math.PI / 2; // point outward
      leftEye.rotation.z = Math.PI / 6; // tilt
      this.characterGroup.add(leftEye);

      const rightEye = new THREE.Mesh(leftEyeGeo, carveMat);
      rightEye.position.set(r * 0.35, r * 0.1, r * 0.8);
      rightEye.rotation.x = Math.PI / 2;
      rightEye.rotation.z = -Math.PI / 6;
      this.characterGroup.add(rightEye);

      // Carved Mouth
      const mouthGeo = new THREE.BoxGeometry(r * 0.5, r * 0.1, r * 0.1);
      const mouth = new THREE.Mesh(mouthGeo, carveMat);
      mouth.position.set(0, -r * 0.2, r * 0.85);
      
      const toothGeo = new THREE.BoxGeometry(r * 0.1, r * 0.1, r * 0.11);
      const toothMat = new THREE.MeshBasicMaterial({ color: 0xff6600 }); // blend with body
      const tooth1 = new THREE.Mesh(toothGeo, toothMat);
      tooth1.position.set(-r * 0.15, r * 0.05, 0);
      mouth.add(tooth1);
      const tooth2 = new THREE.Mesh(toothGeo, toothMat);
      tooth2.position.set(r * 0.1, -r * 0.05, 0);
      mouth.add(tooth2);

      this.characterGroup.add(mouth);
    }

    // AR glow ring
    const glowGeo = new THREE.TorusGeometry(r + 0.1, 0.04, 8, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: isPenalty ? 0x66ccff : 0xffaa00, // bright blue for human, orange for pumpkin
      transparent: true,
      opacity: 0.2,
    });
    this.glowRing = new THREE.Mesh(glowGeo, glowMat);
    this.characterGroup.add(this.glowRing);
  }

  update(deltaTime: number): void {
    this.elapsed += deltaTime;

    // Floating animation
    if (this.config.type === 'floating') {
      const amp = this.config.floatAmplitude ?? 0.5;
      const speed = this.config.floatSpeed ?? 1.0;
      const swayAmp = this.config.swayAmplitude ?? amp * 0.3;
      const swaySpeed = this.config.swaySpeed ?? speed * 0.7;
      
      const time = this.elapsed;
      // Combine multiple sine waves for chaotic/unpredictable movement
      const yMove = Math.sin(time * speed + this.randomOffset) + 
                    0.5 * Math.sin(time * speed * 2.1 - this.randomOffset);
      const xMove = Math.sin(time * swaySpeed - this.randomOffset) + 
                    0.6 * Math.sin(time * swaySpeed * 1.8 + this.randomOffset * 2.5);

      this.mesh.position.y = this.baseY + yMove * amp * 0.6;
      this.mesh.position.x = this.baseX + xMove * swayAmp * 0.6;
      // Tilt follows horizontal sway direction
      this.mesh.rotation.z = xMove * swayAmp * 0.15;
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
        isPenalty: this.config.isPenalty,
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
    if (!this.active) return;
    this.isHit = true;
    
    if (!this.config.isPenalty) {
      this.active = false; // Mark hit
      this.characterGroup.visible = false; // Hide model instantly
    } else {
      // Penalty characters don't disappear, but reset their hit state shortly after
      setTimeout(() => this.resetStatus(), 1500);
    }
    
    this.hitFlashTimer = 0.6;

    // Spawn burst particles
    this.spawnHitParticles();
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

    const sparkColorsTarget = [
      new THREE.Color(0xffaa00), // orange
      new THREE.Color(0xffdd00), // yellow
      new THREE.Color(0x55ff00), // green (stem)
    ];
    
    const sparkColorsPenalty = [
      new THREE.Color(0x33ccff), // bright blue
      new THREE.Color(0xffffff), // white
      new THREE.Color(0xffdcb3), // skin color
    ];

    const sparkColors = this.config.isPenalty ? sparkColorsPenalty : sparkColorsTarget;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = Math.random() * 0.5 + 0.2; // slight forward burst
      const c = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.particleLife = 1.0;
    this.mesh.add(this.particles);
  }

  resetStatus(): void {
    this.isHit = false;
    this.active = true;
    this.characterGroup.visible = true;
  }

  getMesh(): THREE.Group {
    return this.mesh;
  }

  getIsHit(): boolean {
    return this.isHit;
  }
}
