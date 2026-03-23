import * as THREE from 'three';

export class FantasyField {
  private group: THREE.Group;
  private clouds: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
  }

  init(scene: THREE.Scene): void {
    this.createSky(scene);
    this.createGround();
    this.createCastle();
    this.createTrees();
    this.createClouds();
    this.createLighting(scene);
    scene.add(this.group);
  }

  private createSky(scene: THREE.Scene): void {
    // Gradient sky using fog
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);
    scene.background = new THREE.Color(0x87ceeb);
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.MeshLambertMaterial({ color: 0x4a7c3f });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.group.add(ground);
  }

  private createCastle(): void {
    const castle = new THREE.Group();

    // Main tower
    const towerGeo = new THREE.BoxGeometry(4, 12, 4);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x8b8b83 });
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(-15, 6, -40);
    castle.add(tower);

    // Tower top (battlement)
    const topGeo = new THREE.BoxGeometry(5, 1, 5);
    const top = new THREE.Mesh(topGeo, stoneMat);
    top.position.set(-15, 12.5, -40);
    castle.add(top);

    // Second tower
    const tower2 = new THREE.Mesh(towerGeo, stoneMat);
    tower2.position.set(-8, 6, -40);
    castle.add(tower2);
    const top2 = new THREE.Mesh(topGeo, stoneMat);
    top2.position.set(-8, 12.5, -40);
    castle.add(top2);

    // Wall between towers
    const wallGeo = new THREE.BoxGeometry(7, 8, 1);
    const wall = new THREE.Mesh(wallGeo, stoneMat);
    wall.position.set(-11.5, 4, -40);
    castle.add(wall);

    this.group.add(castle);
  }

  private createTrees(): void {
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a1e });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 });

    const treePositions = [
      { x: 6, z: -15 },
      { x: -6, z: -18 },
      { x: 10, z: -25 },
      { x: 15, z: -30 },
      { x: -10, z: -35 },
      { x: -4, z: -12 },
      { x: 20, z: -20 },
      { x: -20, z: -28 },
      { x: 8, z: -40 },
      { x: -5, z: -45 },
    ];

    for (const pos of treePositions) {
      const tree = new THREE.Group();

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1;
      tree.add(trunk);

      // Crown (cone)
      const crownGeo = new THREE.ConeGeometry(1.5, 4, 6);
      const crown = new THREE.Mesh(crownGeo, treeMat);
      crown.position.y = 4;
      tree.add(crown);

      // Random scale variation
      const scale = 0.8 + Math.random() * 0.6;
      tree.scale.setScalar(scale);
      tree.position.set(pos.x, 0, pos.z);
      this.group.add(tree);
    }
  }

  private createClouds(): void {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });

    const cloudPositions = [
      { x: -10, y: 20, z: -50 },
      { x: 15, y: 22, z: -60 },
      { x: 5, y: 18, z: -45 },
    ];

    for (const pos of cloudPositions) {
      const cloud = new THREE.Group();
      // Cloud made of overlapping spheres
      for (let i = 0; i < 4; i++) {
        const sphereGeo = new THREE.SphereGeometry(
          1.5 + Math.random(),
          6,
          4,
        );
        const sphere = new THREE.Mesh(sphereGeo, cloudMat);
        sphere.position.set(i * 1.5 - 2, Math.random() * 0.5, 0);
        cloud.add(sphere);
      }
      cloud.position.set(pos.x, pos.y, pos.z);
      this.clouds.push(cloud as unknown as THREE.Mesh);
      this.group.add(cloud);
    }
  }

  private createLighting(scene: THREE.Scene): void {
    // Sun (directional)
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sunLight.position.set(10, 20, -10);
    scene.add(sunLight);

    // Ambient
    const ambient = new THREE.AmbientLight(0x6688cc, 0.5);
    scene.add(ambient);
  }

  update(deltaTime: number): void {
    // Slowly drift clouds
    for (const cloud of this.clouds) {
      cloud.position.x += deltaTime * 0.3;
      if (cloud.position.x > 40) {
        cloud.position.x = -40;
      }
    }
  }
}
