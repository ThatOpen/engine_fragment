/* MD
  ## Raycasting Your Fragment Models 🤏
  ---
  Determining what lies beneath the mouse pointer is one of the most essential operations in any 3D application. Working with Fragments is no exception, and we provide you with convenient tools to achieve this. Let’s dive in!
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from "../../..";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
*/

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const container = document.getElementById("container")!;
world.renderer = new OBC.SimpleRenderer(components, container);

world.camera = new OBC.SimpleCamera(components);
world.camera.controls.setLookAt(58, 22, -25, 13, 0, 4.2); // convenient position for the model we will load

components.init();

const grids = components.get(OBC.Grids);
grids.create(world);

/* MD
  :::info Do I need @thatopen/components?

  Not necessarily! While @thatopen/components simplifies the process of setting up a scene, you can always use plain ThreeJS to create your own custom scene setup. It's entirely up to your preference and project requirements! 😉

  :::

  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start manipulating them with ease:
*/

// You have to copy `/node_modules/@thatopen/fragments/dist/Worker/worker.mjs` to your project directory
// and provide the relative path in `workerUrl`
// We use here the internal route of the worker in the library for simplicity purposes
const githubUrl =
  "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
const fetchedUrl = await fetch(githubUrl);
const workerBlob = await fetchedUrl.blob();
const workerFile = new File([workerBlob], "worker.mjs", {
  type: "text/javascript",
});
const workerUrl = URL.createObjectURL(workerFile);
const fragments = new FRAGS.FragmentsModels(workerUrl);
world.camera.controls.addEventListener("update", () => fragments.update());

// Remove z fighting
fragments.models.materials.list.onItemSet.add(({ value: material }) => {
  if (!("isLodMaterial" in material && material.isLodMaterial)) {
    material.polygonOffset = true;
    material.polygonOffsetUnits = 1;
    material.polygonOffsetFactor = Math.random();
  }
});

// Once a model is available in the list, we can tell what camera to use
// in order to perform the culling and LOD operations.
// Also, we add the model to the 3D scene.
fragments.models.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  // At the end, you tell fragments to update so the model can be seen given
  // the initial camera position
  fragments.update(true);
});

/* MD
  ### 📂 Loading a Fragments Model
  With the core setup complete, it's time to load a Fragments model into our scene. Fragments are optimized for fast loading and rendering, making them ideal for large-scale 3D models.

  :::info Where can I find Fragment files?

  You can use the sample Fragment files available in our repository for testing. If you have an IFC model you'd like to convert to Fragments, check out the IfcImporter tutorial for detailed instructions.

  :::
*/

const file = await fetch(
  "https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag",
);
const buffer = await file.arrayBuffer();
const model = await fragments.load(buffer, { modelId: "example" });

/* MD
  ### 🤏 Setting Up Raycaster
  Each Fragments Model comes with built-in methods to retrieve information about what lies beneath the mouse pointer (raycasting). To make this process more versatile, let's create a utility function that performs raycasting across all models loaded in the scene and returns the closest result:
*/

const raycast = async (data: {
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  mouse: THREE.Vector2;
  dom: HTMLCanvasElement;
}) => {
  const results = [];
  for (const [_, model] of fragments.models.list) {
    const result = await model.raycast(data);
    if (result) {
      results.push(result);
    }
  }
  await Promise.all(results);
  if (results.length === 0) return null;

  // Find result with smallest distance
  let closestResult = results[0];
  let minDistance = closestResult.distance;

  for (let i = 1; i < results.length; i++) {
    if (results[i].distance < minDistance) {
      minDistance = results[i].distance;
      closestResult = results[i];
    }
  }

  return closestResult;
};

/* MD
  Now, that is just the helper function and we can use it however we like. For demonstration purposes, let's enhance the raycasting functionality to provide more interactivity and feedback to the user. Let's start by defining the pointer move event:
*/

const mouse = new THREE.Vector2();

let onRaycastHoverResult = (_result: FRAGS.RaycastResult | null) => {};
container.addEventListener("pointermove", async (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  const result = await raycast({
    camera: world.camera.three,
    mouse,
    dom: world.renderer!.three.domElement!,
  });
  onRaycastHoverResult(result);
});

/* MD
  :::info Performance Tip!

  Continuously raycasting on every pointer move might seem like the obvious choice, but it can introduce performance bottlenecks. This is because each raycast request is sent to a worker, and there is a small delay for the data to return. A more efficient approach is to trigger raycasting only after the pointer has stopped moving for a short duration.

  :::

  To provide visual feedback, we'll draw a ThreeJS line at the hit position. This line will orient itself to align with the surface normal at the hit point. Additionally, we'll log the raycast result to the console for further inspection:
*/

const lineGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 2),
]);

const lineMaterial = new THREE.LineBasicMaterial({ color: "#6528d7" });
const line = new THREE.Line(lineGeometry, lineMaterial);
world.scene.three.add(line);

onRaycastHoverResult = (result) => {
  line.visible = !!result;
  if (!result) return;
  console.log(result);
  const { point, normal } = result;
  if (!normal) return;
  line.position.copy(point);
  const look = point.clone().add(normal);
  line.lookAt(look);
};

/* MD
  Let's enhance the interactivity by creating a sphere at the location where the user clicks. This will provide a visual cue for the click position:
*/

let onRaycastClickResult = (_result: FRAGS.RaycastResult | null) => {};
container.addEventListener("click", async (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  const result = await model.raycast({
    camera: world.camera.three,
    mouse,
    dom: world.renderer!.three.domElement!,
  });
  onRaycastClickResult(result);
});

const sphereGeometry = new THREE.SphereGeometry(0.4);

const sphereMaterial = new THREE.MeshLambertMaterial({
  color: "#bcf124",
  transparent: true,
  opacity: 0.8,
});

onRaycastClickResult = (result) => {
  if (!result) return;
  const { point } = result;
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(point);
  world.scene.three.add(sphere);
};

/* MD
  :::info What's Next?

  Curious about how to leverage the raycast results for advanced operations like data retrieval or material changing? Check out the other Fragments tutorials for more in-depth examples and use cases.

  :::

  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

const panel = BUI.Component.create<BUI.PanelSection>(() => {
  return BUI.html`
    <bim-panel id="controls-panel" active label="Raycasting" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
    </bim-panel>
  `;
});

document.body.append(panel);

/* MD
  And we will make some logic that adds a button to the screen when the user is visiting our app from their phone, allowing to show or hide the menu. Otherwise, the menu would make the app unusable.
*/

const button = BUI.Component.create<BUI.PanelSection>(() => {
  const onClick = () => {
    if (panel.classList.contains("options-menu-visible")) {
      panel.classList.remove("options-menu-visible");
    } else {
      panel.classList.add("options-menu-visible");
    }
  };

  return BUI.html`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${onClick}>
    </bim-button>
  `;
});

document.body.append(button);

/* MD
  ### ⏱️ Measuring the performance (optional)
  We'll use the [Stats.js](https://github.com/mrdoob/stats.js) to measure the performance of our app. We will add it to the top left corner of the viewport. This way, we'll make sure that the memory consumption and the FPS of our app are under control.
*/

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

/* MD
  ### 🎉 Congratulations!
  You've successfully implemented raycasting in your 3D scene! 🚀
  Now you can identify objects beneath your mouse pointer and interact with them dynamically. 
  Ready to explore more? Check out our other tutorials to unlock the full potential of Fragments! 💡
*/
