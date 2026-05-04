/* MD
  ## Converting IFC to Fragments 😀
  ---
  Teams that receive IFC files from design software need to load them in a web viewer, but parsing IFC at runtime is too slow for large models — re-converting on every session makes the app unusable for end users.

  The Fragment format is a compact binary representation of IFC data optimized for fast loading. Converting once and saving the result means subsequent sessions skip the heavy parsing step entirely.

  This tutorial covers configuring the IFC-to-Fragment converter with its WASM path; fetching an IFC file and running the conversion with a progress callback; loading the resulting binary data into the 3D scene; disposing the loaded model to free memory; and a UI panel that sequences convert → add to scene → download as a local file.

  By the end, you'll have a complete IFC import pipeline that converts a model, renders it in the viewport, and lets you download the Fragment file for reuse in future sessions.

  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
// You have to import * as FRAGS from "@thatopen/fragments"
import { Font, FontLoader } from "three/examples/jsm/Addons.js";
import * as FRAGS from "../..";

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
world.camera.controls.setLookAt(74, 16, 0.2, 30, -4, 27); // convenient position for the model we will load

components.init();

const grids = components.get(OBC.Grids);
grids.create(world);

/* MD
  :::info Do I need @thatopen/components?

  Not necessarily! While @thatopen/components simplifies the process of setting up a scene, you can always use plain ThreeJS to create your own custom scene setup. It's entirely up to your preference and project requirements! 😉

  :::

  ### Converting IFCs 🚀
  The IfcImporter is your gateway to converting IFC files into Fragments, enabling you to build high-performance BIM applications effortlessly. With just a few lines of code, you can transform complex IFC data into lightweight, modern Fragments. Let's dive in and make it happen!

  :::warning What elements of IFC get converted to Fragments?

  For memory efficiency reasons, we don't convert each an every element to fragments by default. You can see the list in IfcImporter.classes and check out the full list [here](https://github.com/ThatOpen/engine_fragment/blob/main/packages/fragments/src/Importers/IfcImporter/src/classes.ts). If you convert an IFC to fragments and miss some elements, you probably need to add their IFC classes to the list.
  :::
  */

const serializer = new FRAGS.IfcImporter();
serializer.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.77/" };
// A convenient variable to hold the ArrayBuffer data loaded into memory
let fragmentBytes: ArrayBuffer | null = null;
let onConversionFinish = () => {};

const convertIFC = async () => {
  const url =
    "https://thatopen.github.io/engine_fragment/resources/ifc/school_str.ifc";
  const ifcFile = await fetch(url);
  const ifcBuffer = await ifcFile.arrayBuffer();
  const ifcBytes = new Uint8Array(ifcBuffer);
  fragmentBytes = await serializer.process({
    bytes: ifcBytes,
    progressCallback: (progress, data) => console.log(progress, data),
  });
  onConversionFinish();
};

/* MD
  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load the converted files effortlessly and start manipulating them with ease:
  */

// `FragmentsModels.getWorker()` fetches the matching worker for this library version from unpkg and returns a blob URL.
// You can also pass your own URL to `new FragmentsModels(...)` if you'd rather host the worker yourself.
const workerUrl = await FRAGS.FragmentsModels.getWorker();
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

/* MD
  ### Loading a Fragments Model 🚧
  With the core already set up, let's create a simple function to load the Fragments Model from the binary data and add it to the scene. This function ensures seamless integration of the converted model into our application:
*/

const loadModel = async () => {
  if (!fragmentBytes) return;
  const model = await fragments.load(fragmentBytes, { modelId: "example" });
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  const font = await new Promise<Font>((resolve, reject) => {
    new FontLoader().load(
      // convert font file to json: https://gero3.github.io/facetype.js/
      new URL("../../../../../resources/Roboto_Regular.json", import.meta.url)
        .href,
      resolve,
      (e) => console.log("Font loading progress", e),
      reject,
    );
  });
  const grids = await model.getGrids({ labels: { show: true, font } });
  world.scene.three.add(grids);
  await fragments.update(true);
};

/* MD
  To ensure optimal performance and prevent memory leaks, it's important to handle model disposal properly. Here's how we can do it:
*/

const removeModel = async () => {
  await fragments.disposeModel("example");
};

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
  (_) => {
    const onDownload = () => {
      if (!fragmentBytes) return;
      const file = new File([fragmentBytes], "sample.frag");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
    };

    let content = BUI.html`
      <bim-label style="white-space: normal;">💡 Open the console to see more information</bim-label>
      <bim-button label="Load IFC" @click=${convertIFC}></bim-button>
    `;
    if (fragmentBytes) {
      content = BUI.html`
        <bim-label style="white-space: normal;">🚀 The IFC has been converted to Fragments binary data. Add the model to the scene!</bim-label>
        <bim-button label="Add Model" @click=${loadModel}></bim-button>
        <bim-button label="Remove Model" @click=${removeModel}></bim-button>
        <bim-button label="Download Fragments" @click=${onDownload}></bim-button>
      `;
    }

    return BUI.html`
    <bim-panel id="controls-panel" active label="IFC Importer" class="options-menu">
      <bim-panel-section label="Controls">
        ${content}
      </bim-panel-section>
    </bim-panel>
  `;
  },
  {},
);

onConversionFinish = () => updatePanel();
fragments.models.list.onItemDeleted.add(() => updatePanel());

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
  You've successfully completed this tutorial on converting complex IFC models into lightweight and efficient Fragments Models! 🚀
  Now you can leverage this knowledge to build high-performance BIM applications with ease. Happy coding! 🎊
*/
