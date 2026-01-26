/* MD
  ## Hello World Schema 📋
  ---
  
  In this demo we will create a simple app that allows us to navigate the Fragments schema of IFC STEP files. This is not something you will usually need to do in your apps, but it will serve as a demonstration
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this little example work:

  ```bash
  npm install @thatopen/components @thatopen/ui @andypf/json-viewer stats.js pako flatbuffers three @thatopen/fragments @thatopen/components @thatopen/ui web-ifc
  ```

*/

import * as FB from "flatbuffers";
import pako from "pako";
import "@andypf/json-viewer";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import Stats from "stats.js";
import * as BUI from "@thatopen/ui";
import * as FRAGS from "../../../../index";

/* MD
  ### 🌎 Setting up a Simple Scene

  Now we will create a simple scene with a camera, a renderer, and a world, as well as add some stats to keep an eye on the performance:
*/

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const container = document.getElementById("viewer") as HTMLDivElement;

const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.SimpleCamera(components);

components.init();

world.scene.setup();

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

/* MD
  ### 🔥 Setting up fragments

  Now we will set up Fragments for this app. If you are not familiar with Fragments, you can check out the other Fragments related tutorails in this documentation.
*/

// prettier-ignore
const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
const fragments = new FRAGS.FragmentsModels(workerUrl);
world.camera.controls.addEventListener("control", () => fragments.update());

/* MD
  ### 💅🏻 Setting up the UI

  Now we will create a simple UI to display the schema:
*/

BUI.Manager.init();

const jsonViewer = document.getElementById("json-viewer") as any;

const expandBtn = document.getElementById("expand-btn")!;
expandBtn.addEventListener("click", () => {
  jsonViewer.expanded = true;
});

const collapseBtn = document.getElementById("collapse-btn")!;
collapseBtn.addEventListener("click", () => {
  jsonViewer.expanded = false;
});

const loadFileBtn = document.getElementById("load-file-btn")!;
const loadWallBtn = document.getElementById("load-wall-btn")!;
const downloadBtn = document.getElementById("download-btn")!;

/* MD
  ### 👾 Loading an IFC and extracting the schema

  Now we will convert an IFC file to a Fragments file, load it in the scene, and add extract its schema to display it in the screen.
*/

let model: FRAGS.FragmentsModel | null = null;
let result = null as any;

async function loadIfcFile(fileUrl: string, raw: boolean) {
  // If there is a previous model, dispose it
  if (model) {
    model.dispose();
  }

  // Load the model

  const ifcFile = await fetch(fileUrl);
  const ifcBuffer = await ifcFile.arrayBuffer();
  const typedArray = new Uint8Array(ifcBuffer);
  const serializer = new FRAGS.IfcImporter();
  serializer.wasm = {
    absolute: true,
    path: "https://unpkg.com/web-ifc@0.0.74/",
  };

  const bytes = await serializer.process({ bytes: typedArray, raw: true });

  model = await fragments.load(bytes, {
    modelId: performance.now().toString(),
    camera: world.camera.three,
    raw: true,
  });

  world.scene.three.add(model.object);
  await fragments.update(true);

  // Extract the schema
  const byteBuffer = new FB.ByteBuffer(raw ? bytes : pako.inflate(bytes));
  const readModel = FRAGS.Model.getRootAsModel(byteBuffer);
  result = {};
  FRAGS.getObject(readModel, result);

  // Display the schema in the screen
  jsonViewer.data = {};
  jsonViewer.data = result;

  // Update the viewer
  window.dispatchEvent(new Event("resize"));
}

/* MD

  Finally, we just need to bind the UI to the loading logic:
*/

loadFileBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".ifc";
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      loadIfcFile(url, true);
      URL.revokeObjectURL(url);
    }
  };
  input.click();
});

loadWallBtn.addEventListener("click", () => {
  const url =
    "https://thatopen.github.io/engine_fragment/resources/ifc/just_wall.ifc";
  loadIfcFile(url, true);
});

downloadBtn.addEventListener("click", async () => {
  if (!model) return;
  const bytes = await model.getBuffer(true);
  const a = document.createElement("a");
  const file = new File([bytes], "small_test.frag");
  const url = URL.createObjectURL(file);
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
});

/* MD
  ### 🥳 Congratulations!
  
  You have created an app that can extract Fragment schemas from IFC files. This should be useful for understanding how the fragment schema works and build your custom tools on top of Fragments!
*/
