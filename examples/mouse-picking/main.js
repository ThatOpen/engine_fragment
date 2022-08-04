import {
    Raycaster,
    Vector2,
    Matrix4,
    MeshBasicMaterial, MeshLambertMaterial
} from 'three';
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
    walls.setInstance(0, {ids: [1, 2, 3, 4], transform })
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

    // Set up selection
    const selectionMaterial = new MeshBasicMaterial({color: 0xff0000, depthTest: false});
    for(const fragment of fragments) {
        fragment.addFragment('selection', [selectionMaterial]);
    }

    // Set up raycasting
    const caster = new Raycaster();
    caster.firstHitOnly = true;
    const mouse = new Vector2();
    const tempMatrix = new Matrix4();
    let previousSelection;

    const pickingLimit = 100;
    let lastPicked = 0;

    window.onmousemove = (event) => {

        // const time = performance.now() - lastPicked;
        // if(time < pickingLimit) return;
        // lastPicked = performance.now();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        caster.setFromCamera(mouse, threeScene.camera);
        const results = caster.intersectObjects(meshes);
        const result = results[0];

        if (result) {

            // Reset previous selection (if any)
            if(previousSelection) previousSelection.mesh.removeFromParent();

            // Get found fragment
            const fragment = items[result.object.uuid];
            previousSelection = fragment.fragments['selection'];

            // Select instance
            threeScene.scene.add(previousSelection.mesh);
            fragment.getInstance(result.instanceId, tempMatrix);
            previousSelection.setInstance(0, {transform: tempMatrix});
            previousSelection.mesh.instanceMatrix.needsUpdate = true;

            // Select block
            const blockID = previousSelection.getVertexBlockID(result.object.geometry, result.face.a);
            if(blockID !== null) {
                previousSelection.blocks.add([blockID], true);
                // const itemID = fragment.getItemID(result.instanceId, blockID);
                // console.log(itemID);
            }
        } else {
            // Reset previous selection (if any)
            if(previousSelection) previousSelection.mesh.removeFromParent();
        }
    }
}

