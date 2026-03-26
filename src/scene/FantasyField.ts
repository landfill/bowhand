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
    this.createMountains();
    this.createCastle();
    this.createTrees();
    this.createClouds();
    this.createLighting(scene);
    scene.add(this.group);
  }

  private createSky(scene: THREE.Scene): void {
    // Bright daytime sky
    scene.fog = new THREE.FogExp2(0x88ccff, 0.008);
    scene.background = new THREE.Color(0x88ccff);
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(250, 250);
    const material = new THREE.MeshLambertMaterial({ color: 0x55cc44 }); // very bright vibrant grass
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.group.add(ground);
  }

  private createMountains(): void {
    const mntMat = new THREE.MeshLambertMaterial({ color: 0x4a8b62, flatShading: true }); // bright bluish-green mountains
    
    const mountGeo1 = new THREE.ConeGeometry(15, 45, 4); // sharp and narrow
    const mount1 = new THREE.Mesh(mountGeo1, mntMat);
    mount1.position.set(-45, 15, -80);
    mount1.rotation.y = Math.PI / 6;
    this.group.add(mount1);

    const mountGeo2 = new THREE.ConeGeometry(20, 50, 5);
    const mount2 = new THREE.Mesh(mountGeo2, mntMat);
    mount2.position.set(0, 20, -90);
    mount2.rotation.y = Math.PI / 4;
    this.group.add(mount2);

    const mountGeo3 = new THREE.ConeGeometry(12, 35, 4);
    const mount3 = new THREE.Mesh(mountGeo3, mntMat);
    mount3.position.set(50, 10, -75);
    mount3.rotation.y = Math.PI / 3;
    this.group.add(mount3);
  }

  private createCastle(): void {
    const castle = new THREE.Group();

    // Main tower
    const towerGeo = new THREE.BoxGeometry(4, 12, 4);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xaaaaa3 }); // bright stone
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

    // Some glowing windows
    const winGeo = new THREE.PlaneGeometry(0.8, 1.5);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x66ccff }); // bright day window reflection
    const win1 = new THREE.Mesh(winGeo, winMat);
    win1.position.set(-15, 8, -37.9);
    castle.add(win1);
    const win2 = new THREE.Mesh(winGeo, winMat);
    win2.position.set(-8, 8, -37.9);
    castle.add(win2);

    this.group.add(castle);
  }

  private createTrees(): void {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7b4226 }); // warm brown trunk
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3d9a2e }); // bright green leaves

    const treePositions = [
      { x: 6, z: -15 }, { x: -6, z: -18 }, { x: 10, z: -25 },
      { x: 15, z: -30 }, { x: -10, z: -35 }, { x: -4, z: -12 },
      { x: 20, z: -20 }, { x: -20, z: -28 }, { x: 8, z: -40 },
      { x: -5, z: -45 },
    ];

    for (const pos of treePositions) {
      const tree = new THREE.Group();

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 2, 5);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1;
      tree.add(trunk);

      // Fluffy Leaves (multiple overlapping spheres)
      const leafGeo = new THREE.SphereGeometry(1.2, 7, 7);
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(
          (Math.random() - 0.5) * 0.8,
          2.5 + Math.random() * 0.8,
          (Math.random() - 0.5) * 0.8
        );
        tree.add(leaf);
      }

      // Random scale variation
      const scale = 0.9 + Math.random() * 0.6;
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
    // Bright sun
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.5);
    sunLight.position.set(20, 30, -10);
    scene.add(sunLight);

    // Warm fill light
    const fillLight = new THREE.DirectionalLight(0xddffff, 0.6);
    fillLight.position.set(-20, 10, 20);
    scene.add(fillLight);

    // Ambient
    const ambient = new THREE.AmbientLight(0x7788aa, 0.7);
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
