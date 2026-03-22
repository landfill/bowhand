import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  }

  init(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Camera setup (1st person archer position)
    this.camera.aspect = width / height;
    this.camera.position.set(0, 1.6, 0); // eye height ~1.6m
    this.camera.lookAt(0, 1.6, -20);
    this.camera.updateProjectionMatrix();

    // Renderer setup
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x87ceeb); // sky blue fallback
    this.renderer.shadowMap.enabled = false; // performance
    container.appendChild(this.renderer.domElement);

    // Handle resize
    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  addObject(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  removeObject(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
}
