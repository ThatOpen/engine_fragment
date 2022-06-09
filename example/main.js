import {
    AmbientLight,
    AxesHelper,
    DirectionalLight,
    GridHelper, InstancedMesh, Mesh, MeshLambertMaterial, Object3D,
    PerspectiveCamera, Raycaster,
    Scene, Vector2, Color, Matrix4,
    WebGLRenderer, MeshBasicMaterial,
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {mergeBufferGeometries} from "three/examples/jsm/utils/BufferGeometryUtils";
import Stats from 'stats.js/src/Stats';
import {Fragment} from "bim-fragment/dist/fragment";


//Creates the Three.js scene
const scene = new Scene();

//Object to store the size of the viewport
const size = {
    width: window.innerWidth,
    height: window.innerHeight,
};

//Creates the camera (point of view of the user)
const camera = new PerspectiveCamera(75, size.width / size.height);
camera.position.z = 5;
camera.position.y = 4;
camera.position.x = 2;

//Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 1);
directionalLight.position.set(0, 10, 0);
directionalLight.target.position.set(-5, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

//Sets up the renderer, fetching the canvas of the HTML
const threeCanvas = document.getElementById("three-canvas");
const renderer = new WebGLRenderer({canvas: threeCanvas, alpha: true});
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Creates grids and axes in the scene
const grid = new GridHelper(50, 30);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

//Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);

// Stats
const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);

//Animation loop
const animate = () => {
    stats.begin();
    controls.update();
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animate);
};

animate();

//Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
    size.width = window.innerWidth;
    size.height = window.innerHeight;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    renderer.setSize(size.width, size.height);
});


// Load model
const loader = new GLTFLoader();

const red = new Color(255, 0, 0);

async function loadModels() {
    const chairScene = await loader.loadAsync('gltfs/chair.glb');
    const chairMeshes = chairScene.scene.children[0].children;
    const fragment = createFragment(chairMeshes, 1000);
    scene.add(fragment.mesh);

    const selectionMaterial = new MeshBasicMaterial({color: 0xff0000, depthTest: false});
    const selection = fragment.addFragment('selection', selectionMaterial);

    scene.add(selection.mesh);

    const caster = new Raycaster();
    const mouse = new Vector2();
    const tempMatrix = new Matrix4();

    window.onmousemove = (event) => {
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        caster.setFromCamera(mouse, camera);
        const result = caster.intersectObject(fragment.mesh)[0];

        if(result) {
            fragment.mesh.getMatrixAt(result.instanceId, tempMatrix);
            selection.mesh.setMatrixAt(0, tempMatrix);
            selection.mesh.instanceMatrix.needsUpdate = true;
            selection.mesh.count = 1;
        } else {
            selection.mesh.count = 0;
        }
    }

    // const tableScene = await loader.loadAsync('gltfs/table.glb');
    // const tableMeshes = tableScene.scene.children[0].children;
    // const table = mergeGltfGeometries(tableMeshes);
    // scene.add(table);
}

function createFragment(meshes, count = 1, offset = 0.5) {
    const geometries = meshes.map(mesh => mesh.geometry);
    const sizes = meshes.map(mesh => mesh.geometry.index.count);

    const materials = meshes.map(mesh => {
        const mat = mesh.material;
        const result = new MeshLambertMaterial({
            color: mat.color,
            transparent: mat.transparent,
            opacity: mat.opacity
        });
        mat.dispose();
        return result;
    });

    const merged = mergeBufferGeometries(geometries);
    geometries.forEach(geometry => geometry.dispose());

    let vertexCounter = 0;
    let counter = 0;
    for(let size of sizes) {
        const group = {start: vertexCounter, count: size, materialIndex: counter++};
        merged.groups.push(group);
        vertexCounter += size;
    }

    const fragment = new Fragment(merged, materials, 1000);

    const rootCount = Math.cbrt(count);
    const matrices = {};
    for (let i = 0; i < rootCount; i++) {
        for (let j = 0; j < rootCount; j++) {
            for (let k = 0; k < rootCount; k++) {
                const matrix = new Matrix4();
                matrix.setPosition(i * offset, j * offset, k * offset);
                matrices[`${i}${j}${k}`] = matrix;
            }
        }
    }

    fragment.instances = matrices;

    return fragment;
}

loadModels();


// const mesh = new InstancedMesh( geometry, material, count );
// scene.add( mesh );
