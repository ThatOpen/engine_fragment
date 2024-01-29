import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js/src/Stats.js";

/**
 * Simple Three.js scene to avoid code repetition in each example
 */
export class SimpleThreeScene {
  scene;
  size;
  camera;
  canvas;
  renderer;
  controls;
  stats;

  constructor(canvas) {
    this.initializeScene(canvas);
  }

  initializeScene(canvas) {
    // Creates the Three.js scene
    this.scene = new THREE.Scene();

    // Object to store the size of the viewport
    this.size = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Creates the camera (point of view of the user)
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.size.width / this.size.height
    );
    this.camera.position.z = 5;
    this.camera.position.y = 4;
    this.camera.position.x = 2;

    // Creates the lights of the scene
    const lightColor = 0xffffff;
    const ambientLight = new THREE.AmbientLight(lightColor, 1.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(lightColor, 2);
    directionalLight.position.set(0, 10, 0);
    directionalLight.target.position.set(-5, 0, 0);
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);

    // Sets up the renderer, fetching the canvas of the HTML
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
    });
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    // Creates grids and axes in the scene
    const grid = new THREE.GridHelper(50, 30);
    this.scene.add(grid);

    const axes = new THREE.AxesHelper();
    axes.material.depthTest = false;
    axes.renderOrder = 1;
    this.scene.add(axes);

    // Creates the orbit controls (to navigate the scene)
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(-2, 0, 0);

    // Stats
    this.stats = new Stats();
    this.stats.showPanel(2);
    document.body.append(this.stats.dom);

    // Animation loop
    const animate = () => {
      this.stats.begin();
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.stats.end();
      requestAnimationFrame(animate);
    };

    animate();

    // Adjust the viewport to the size of the browser
    window.addEventListener("resize", () => {
      this.size.width = window.innerWidth;
      this.size.height = window.innerHeight;
      this.camera.aspect = this.size.width / this.size.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.size.width, this.size.height);
    });
  }
}
