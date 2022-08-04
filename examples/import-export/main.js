import { ThreeScene } from '../utils/scene';
import { FragmentLoader } from 'bim-fragment/dist/fragment-loader.js';

setupScene();

async function setupScene() {
    const threeScene = new ThreeScene();
    const chairs = await importChairs();
    console.log(chairs);
    threeScene.scene.add(chairs.mesh);
    const button = document.getElementById('export');
    button.onclick = async () => exportChairs(chairs);
}

async function importChairs() {
    const loader = new FragmentLoader();
    const geometry = "../models/exported/geometry.gltf";
    const data = "../models/exported/data.json";
    return loader.load(geometry, data);
}

async function exportChairs(chairs) {
    const file = await chairs.export();
    const link = document.createElement('a');
    document.body.appendChild(link);

    link.download = "geometry.gltf";
    link.href = URL.createObjectURL(file.geometry);
    link.click();

    link.download = "data.json";
    link.href = URL.createObjectURL(file.data);
    link.click();

    link.remove();
}