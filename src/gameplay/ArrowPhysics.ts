import * as THREE from 'three';
import { Target } from '../scene/Target';

const GRAVITY = -9.8;
const BASE_SPEED = 14;
const MAX_LIFETIME = 2.0; // seconds

export class ArrowPhysics extends EventTarget {
  private scene: THREE.Scene | null = null;
  private targets: Target[] = [];
  private arrowMesh: THREE.Group | null = null;
  private position = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private isFlying = false;
  private lifetime = 0;
  private trailGlow: THREE.Mesh | null = null;
  private trailTimer = 0;

  init(scene: THREE.Scene, targets: Target[]): void {
    this.scene = scene;
    this.targets = targets;
    this.arrowMesh = this.createArrowMesh();
    this.arrowMesh.visible = false;
    scene.add(this.arrowMesh);
  }

  private createArrowMesh(): THREE.Group {
    const group = new THREE.Group();

    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4);
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.x = Math.PI / 2;
    group.add(shaft);

    // Arrowhead (cone)
    const headGeo = new THREE.ConeGeometry(0.05, 0.15, 4);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const head = new THREE.Mesh(headGeo, headMat);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.55;
    group.add(head);

    // Fletching (small fins)
    const finGeo = new THREE.PlaneGeometry(0.08, 0.12);
    const finMat = new THREE.MeshLambertMaterial({
      color: 0xcc3333,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.z = 0.45;
      fin.rotation.z = (i * Math.PI * 2) / 3;
      group.add(fin);
    }

    // Trail glow (simple stretched sphere)
    const trailGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.trailGlow = new THREE.Mesh(trailGeo, trailMat);
    this.trailGlow.position.z = 0.6;
    this.trailGlow.scale.z = 10; // Stretch backwards
    group.add(this.trailGlow);

    return group;
  }

  fire(direction: THREE.Vector3, power: number, startPos: THREE.Vector3): void {
    if (this.isFlying || !this.arrowMesh) return;

    this.position.copy(startPos);
    this.velocity.copy(direction).multiplyScalar(BASE_SPEED * power);
    this.isFlying = true;
    this.lifetime = 0;

    this.arrowMesh.visible = true;
    this.arrowMesh.position.copy(this.position);

    if (this.trailGlow) {
      this.trailGlow.visible = true;
    }
  }

  update(deltaTime: number): void {
    if (!this.isFlying || !this.arrowMesh) return;

    this.lifetime += deltaTime;

    // Apply gravity
    this.velocity.y += GRAVITY * deltaTime;

    // Update position
    this.position.addScaledVector(this.velocity, deltaTime);
    this.arrowMesh.position.copy(this.position);

    // Rotate arrow to face velocity direction
    const lookTarget = this.position.clone().add(this.velocity);
    this.arrowMesh.lookAt(lookTarget);

    // Check hit against targets
    const raycaster = new THREE.Raycaster(
      this.position.clone(),
      this.velocity.clone().normalize(),
      0,
      this.velocity.length() * deltaTime + 0.5,
    );

    for (let i = 0; i < this.targets.length; i++) {
      const result = this.targets[i].checkHit(raycaster);
      if (result.hit) {
        // Move arrow precisely to the hit point for better visual
        this.position.copy(result.position);
        this.arrowMesh.position.copy(this.position);

        result.targetIndex = i;
        this.targets[i].onHit();
        this.endFlight(true); // pass true for a hit!
        this.dispatchEvent(
          new CustomEvent('hit', { detail: result }),
        );
        return;
      }
    }

    // Miss: arrow went below ground or exceeded lifetime
    if (this.position.y < -2 || this.lifetime > MAX_LIFETIME) {
      this.endFlight(false);
      this.dispatchEvent(new CustomEvent('miss'));
    }
  }

  private endFlight(isHit: boolean = false): void {
    this.isFlying = false;

    // Hide trail immediately
    if (this.trailGlow) {
      this.trailGlow.visible = false;
    }

    if (this.arrowMesh) {
      if (isHit) {
        // Leave the arrow embedded in the target for a moment
        setTimeout(() => {
          if (!this.isFlying && this.arrowMesh) {
            this.arrowMesh.visible = false;
          }
        }, 1000); // 1 second stick
      } else {
        this.arrowMesh.visible = false;
      }
    }
  }

  getIsFlying(): boolean {
    return this.isFlying;
  }

  reset(): void {
    this.endFlight();
  }
}
