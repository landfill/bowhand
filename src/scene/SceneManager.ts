import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
  }

  init(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Camera setup (1st person archer position)
    this.camera.aspect = width / height;
    this.updateCameraForAspect(width, height);

    // Renderer setup
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    // Handle resize
    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.updateCameraForAspect(w, h);
      this.renderer.setSize(w, h);
    });
  }

  private updateCameraForAspect(width: number, height: number): void {
    const isPortrait = height > width;
    // Portrait: widen FOV so horizontal view isn't too narrow
    this.camera.fov = isPortrait ? 75 : 60;
    this.camera.position.set(0, 1.6, 0);
    // Portrait: look slightly higher to show more sky, less ground
    const lookY = isPortrait ? 1.8 : 1.6;
    this.camera.lookAt(0, lookY, -20);
    this.camera.updateProjectionMatrix();
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
