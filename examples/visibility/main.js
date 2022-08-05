import { Matrix4 } from 'three';
import { Fragment } from "bim-fragment/dist/fragment";
import { ThreeScene } from '../utils/scene';
import { Models } from '../utils/models';

const threeScene = new ThreeScene();
const models = new Models();
loadModels();

async function loadModels() {

    const items = {};

    // Create walls fragment
    const wallsData = await models.getWalls();
    const walls = new Fragment(wallsData.geometry, wallsData.material, 1);
    const transform = new Matrix4();
    transform.setPosition(-1, 0, 2);
    walls.setInstance(0, {ids: [11, 12, 13, 14], transform })
    items[walls.id] = walls;

    // Create chairs fragment
    const chairData = await models.getChair();
    const chairs = new Fragment(chairData.geometry, chairData.material, 1000);
    models.generateInstances(chairs, 1000, 0.5);
    items[chairs.id] = chairs;

    const fragments = Object.values(items);

    // Add fragments to scene
    const meshes = fragments.map(item => item.mesh);
    threeScene.scene.add(...meshes);

    // Visibility
    const halfChairs = chairs.items.slice(0, Math.ceil(chairs.items.length / 2));
    const halfWalls = walls.items.slice(0, Math.ceil(walls.items.length / 2));

    let visibility = true;
    const exportButton = document.getElementById('visibility');
    exportButton.onclick = () => {
        visibility = !visibility;
        chairs.setVisibility(halfChairs, visibility);
        walls.setVisibility(halfWalls, visibility);
    }
}

