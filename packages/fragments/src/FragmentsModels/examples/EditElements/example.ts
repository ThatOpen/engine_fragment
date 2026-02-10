/* MD
  ## Editing BIM Elements 🪑
  ---
  In this tutorial, we'll explore how to easily edit BIM elements using the Fragments Edit API. We will move things around, change its materials, edit its instance attributes, register everything in a history that we can revert and more. Let’s dive in!
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from "../../../index";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
*/

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const container = document.getElementById("container") as HTMLDivElement;

const world = worlds.create<
  OBC.ShadowedScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.ShadowedScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

components.init();

world.scene.three.add(new THREE.AxesHelper());

world.camera.three.far = 10000;

world.renderer.three.shadowMap.enabled = true;
world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;

world.scene.setup({
  shadows: {
    cascade: 1,
    resolution: 1024,
  },
});

await world.scene.updateShadows();

world.camera.controls.addEventListener("rest", async () => {
  await world.scene.updateShadows();
});

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
world.camera.controls.addEventListener("control", () => fragments.update());

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

  // We will also set up the shadows of all the loaded models here
  model.tiles.onItemSet.add(({ value: mesh }) => {
    if ("isMesh" in mesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial[];
      if (mat[0].opacity === 1) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    }
  });
});

/* MD
  ### 📂 Loading a Fragments Model
  With the core setup complete, it's time to load a Fragments model into our scene. Fragments are optimized for fast loading and rendering, making them ideal for large-scale 3D models.

  :::info Where can I find Fragment files?

  You can use the sample Fragment files available in our repository for testing. If you have an IFC model you'd like to convert to Fragments, check out the IfcImporter tutorial for detailed instructions.

  :::
*/

const fetched = await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag");
const buffer = await fetched.arrayBuffer();
const model = await fragments.load(buffer, {
  modelId: "medium_test",
  camera: world.camera.three,
});

world.scene.three.add(model.object);
await fragments.update(true);

/* MD
  ### ✏️ Setting up the model editor

  Now we'll set up all the logic to edit it. We will use the Elements API, which allows you to work directly with three.js objects (Meshes, Geometries, Materials, etc.) and then apply the changes directly to the fragments model. This makes it a lot easier to build an app that can edit / author fragments.

  :::info How to edit the model?

  When building an authoring app, objects could be edited in many ways: from just moving them and changing their material, to smart logic specific to their geometry (e.g. revit system families). For that reason, it's better to encapsulate the edit logic in a class that defines HOW we want to edit the elements. That way we can build multiple "editors" that we can use across our app.

  :::

  In this tutorial, we'll create a general Editor that can edit the global and local transform of an element, edit the geometry of an element, edit the materials (color and opacity) of an element and edit the samples (geometry, material and local transform) of an element.

  :::warning Before we start

  Before we start, here's the key things you need to know about elements. Each element has a global transform and is made by samples (instances). Each sample is made by a geometry, a material and a local transform. Samples can share the same geometry, material and local transform. This last point is important because it means that when we edit a material, geometry or local transform, it can affect multiple samples.

  :::

*/

class GeneralEditor {
  // We'll start by creating 2 events that will be useful for UI updates
  readonly onUpdated = new OBC.Event<void>();
  readonly sampleMaterialsUpdated = new OBC.Event<void>();

  // We'll need a reference to the currently used world
  private _world: OBC.World;

  // This is the current element that we are editing
  private _element: FRAGS.Element | null = null;

  // This is the current three.js mesh that we will use to make edits to the selected element
  private _mesh: THREE.Group | null = null;

  // These are the global and local transform controls that we will use to edit the selected element
  private _gControls: TransformControls;
  private _lControls: TransformControls[] = [];

  // This is the transform that we will be editing: global or local
  private _controlType: "global" | "local" = "global";

  // Here we will store a list of materials, local transformsIds and geometries ids
  // We will use it to allow the user to change the material, local transform or geometry of a sample
  // The reason why we store the whole material and not only the ID is to display its color in the select menu
  private _materials: Map<number, FRAGS.RawMaterial> | null = null;
  private _localTransformsIds: number[] = [];
  private _geometriesIds: number[] = [];

  // We need to get the materials, local transforms and geometries asynchronously, so we can't get them
  // in the constructor. We need to wait for the model to be initialized first. So we will define getters
  // that will throw an error if the model is not initialized yet.

  get materials() {
    if (!this._materials) {
      throw new Error("Editor not initialized");
    }
    return this._materials;
  }

  get localTransformsIds() {
    if (!this._localTransformsIds.length) {
      throw new Error("Editor not initialized");
    }
    return this._localTransformsIds;
  }

  get geometriesIds() {
    if (!this._geometriesIds.length) {
      throw new Error("Editor not initialized");
    }
    return this._geometriesIds;
  }

  // We will also define a getter to expose the samples of the selected element,
  // which will be used for the UI to edit them.

  get samples() {
    if (!this._element) {
      throw new Error("No element selected");
    }
    return this._element.core.samples;
  }

  // We will also define a getter to check if an element is currently selected

  get elementSelected() {
    return this._element !== null;
  }

  // In the constructor we'll simply set up the basic elements and events

  constructor(world: OBC.World) {
    this._world = world;
    this._gControls = new TransformControls(
      world.camera.three,
      world.renderer!.three.domElement!,
    );
    this.setupEvents();
  }

  // We will also define a method to initialize the editor.
  // This will be used to fetch all data necessary to build the UI.
  // We don't do this in the constructor because it's async.

  async init() {
    this._materials = await model.getMaterials();
    const allLtIds = await model.getLocalTransformsIds();
    const allGeomsIds = await model.getRepresentationsIds();
    this._localTransformsIds = [allLtIds[0], allLtIds[1]];
    this._geometriesIds = [allGeomsIds[0], allGeomsIds[1]];
  }

  // This method will return the list of Threejs materials
  // used by the currently selected element.

  get3dMaterials() {
    if (!this._mesh) {
      return [];
    }
    const materialList = new Map<string, THREE.MeshLambertMaterial>();

    this._mesh.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        materialList.set(
          object.material.userData.localId,
          object.material as THREE.MeshLambertMaterial,
        );
      }
    });

    return Array.from(materialList.values());
  }

  // Now we'll define a method that allows to change the material of a sample

  async setSampleMaterial(id: number, material: number) {
    if (!this._element) {
      return;
    }
    this._element.core.samples[id].material = material;
    await this.updateSamples();
    this.sampleMaterialsUpdated.trigger();
  }

  // Now we'll define a method that will update the materials list.
  // This is needed to update the UI material color when a material was edited

  async updateMaterials() {
    if (!this._materials) {
      return;
    }
    this._materials = await model.getMaterials();
  }

  // This method illustrates how to override the geometry of a sample
  // This is useful for building editors that rely on our geometry engine
  // (e.g. to build something similar to Revit Wall System Family)

  overrideGeometryWithCube() {
    if (!this._mesh) {
      return;
    }
    this._mesh.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry as THREE.BufferGeometry;
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        geometry.setAttribute("position", boxGeometry.attributes.position);
        geometry.setIndex(boxGeometry.index);
        geometry.setAttribute("normal", boxGeometry.attributes.normal);
      }
    });
  }

  // This method will apply the changes to the selected element
  // Then it will unselect it

  async applyChanges() {
    if (!this._element || !this._mesh) {
      return;
    }

    // This generates the requests to apply the changes to the selected mesh
    await this._element.setMeshes(this._mesh);

    // This unselects the element and disposes everything related to it
    this.dispose();

    // This applies the generated changes to Fragments
    const requests = this._element.getRequests();
    if (requests) {
      await fragments.editor.edit(model.modelId, requests);
    }

    // If no changes were made, we show the hidden items
    if (!this._element.elementChanged) {
      // No changes: show hidden items
      await this.setVisible(true);
    }

    // This updates the viewer to see the changes
    await fragments.update(true);

    // This resets the element and mesh variables
    this._element = null;
    this._mesh = null;

    // This triggers the UI update
    this.onUpdated.trigger();
  }

  // This method will set the mode of the global and local transform controls
  // Fragments only support translate and rotate

  setControlsMode(mode: "translate" | "rotate") {
    this._gControls.setMode(mode);
    for (const localTransformControl of this._lControls) {
      localTransformControl.setMode(mode);
    }
  }

  // This method allows to change between local and global transform controls

  setControlsTarget(target = this._controlType) {
    const globalGizmo = this._gControls.getHelper();
    if (target === "global") {
      this._world.scene.three.add(globalGizmo);
      this._gControls.enabled = true;
      for (const localTransformControl of this._lControls) {
        const localGizmo = localTransformControl.getHelper();
        localGizmo.removeFromParent();
        localTransformControl.enabled = false;
      }
    } else {
      globalGizmo.removeFromParent();
      this._gControls.enabled = false;
      for (const localTransformControl of this._lControls) {
        const localGizmo = localTransformControl.getHelper();
        this._world.scene.three.add(localGizmo);
        localTransformControl.enabled = true;
      }
    }
    this._controlType = target;
  }

  // This method will update the samples of the selected element
  // as well as regenerate the current mesh while maintaining
  // the transform controls
  async updateSamples() {
    if (!this._element || !this._mesh) {
      return;
    }
    const prevTransform = this._mesh.matrixWorld.clone();
    await this._element.updateSamples();
    this.dispose();

    this._mesh = await this._element.getMeshes();
    this._world.scene.three.add(this._mesh);
    await this.createControls();
    this._mesh.position.set(0, 0, 0);
    this._mesh.rotation.set(0, 0, 0);
    this._mesh.applyMatrix4(prevTransform);
  }

  // Here we'll create the Three.js TransformControls
  // for global and local transforms

  private async createControls() {
    if (!this._mesh) {
      return;
    }

    this._gControls.attach(this._mesh);

    for (const localMesh of this._mesh.children) {
      const localTransformControl = new TransformControls(
        world.camera.three,
        world.renderer!.three.domElement!,
      );
      localTransformControl.attach(localMesh);
      localTransformControl.setMode(this._gControls.mode);
      this._lControls.push(localTransformControl);
      localTransformControl.addEventListener("dragging-changed", (event) => {
        if (world.camera.hasCameraControls()) {
          world.camera.controls.enabled = !event.value;
        }
      });
    }

    this.setControlsTarget();
  }

  // This unselects the current element and disposes the transform controls

  private dispose() {
    // Dispose meshes

    if (this._mesh && this._element) {
      this._element.disposeMeshes(this._mesh);
    }
    // Dispose global transform controls
    const globalGizmo = this._gControls.getHelper();
    globalGizmo.removeFromParent();
    this._gControls.detach();
    if (!this._mesh || !this._element) {
      return;
    }
    for (const localTransformControl of this._lControls) {
      localTransformControl.detach();
      localTransformControl.dispose();
    }
    this._lControls.length = 0;
  }

  // This is used to control the visibility of the existing / edited objects
  // When we use the edit API, fragments creates a new Fragments Model called
  // delta model that contains only the changed objects. This is done to avoid
  // having to recompute the whole model when only a few objects were changed.
  // We then hide the edited objects in the original model.
  // This method manages the visibility both in the original model and in the delta model
  // making sure the same element is not visible in both models at the same time.

  private async setVisible(visible: boolean) {
    if (!this._element) {
      return;
    }
    const promises: Promise<void>[] = [];
    for (const [, model] of fragments.models.list) {
      if (model.deltaModelId) {
        if (visible === true) {
          const editedElements = new Set(await model.getEditedElements());
          if (visible && editedElements.has(this._element.localId)) {
            continue;
          }
        }
      }

      promises.push(model.setVisible([this._element.localId], visible));
    }
    await Promise.all(promises);
  }

  // Here we'll setup the events for the global transform controls
  // as well as the double click and keydown events
  private setupEvents() {
    // Prevent camera move when using the global transform controls
    this._gControls.addEventListener("dragging-changed", (event) => {
      if (this._world.camera.hasCameraControls()) {
        this._world.camera.controls.enabled = !event.value;
      }
    });

    // Double click event logic to select an element
    const mouse = new THREE.Vector2();
    const canvas = this._world.renderer!.three.domElement!;
    canvas.addEventListener("dblclick", async (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      let result: any;

      // Raycast all models, including delta models
      for (const [, model] of fragments.models.list) {
        const promises: Promise<FRAGS.RaycastResult | null>[] = [];
        promises.push(
          model.raycast({
            camera: world.camera.three,
            mouse,
            dom: world.renderer!.three.domElement!,
          }),
        );
        const results = await Promise.all(promises);
        let smallestDistance = Infinity;
        for (const current of results) {
          if (current) {
            if (current.distance < smallestDistance) {
              smallestDistance = current.distance;
              result = current;
            }
          }
        }
      }

      // If nothing is found, return
      if (!result) {
        return;
      }

      // If an element was already selected, reset the visibility
      if (this._element) {
        await this.setVisible(true);
      }

      // Get the selected element
      const [element] = await fragments.editor.getElements(model.modelId, [
        result.localId,
      ]);
      this._element = element;
      if (!element) {
        return;
      }

      // Dispose the previous mesh, if any
      if (this._mesh) {
        this.dispose();
      }

      // Set the visibility of the selected elements to false in the original model
      await this.setVisible(false);

      // Add the selected meshes to the scene and add the transform controls
      this._mesh = await element.getMeshes();
      this._world.scene.three.add(this._mesh);
      await this.createControls();

      // Update the viewer to see the changes
      await fragments.update(true);

      // Trigger the UI update
      this.onUpdated.trigger();
    });

    // Keydown event logic to cancel the edit when pressing the escape key

    window.addEventListener("keydown", async (event) => {
      if (event.key === "Escape") {
        if (!this._element || !this._mesh) {
          return;
        }

        // Clear the existing edit requests
        this._element.getRequests();
        this.dispose();

        // All canceled: show hidden items
        this.setVisible(true);

        // Update the viewer to see the changes
        await fragments.update(true);

        // Reset the element and mesh variables
        this._element = null;
        this._mesh = null;

        // Trigger the UI update
        this.onUpdated.trigger();
      }
    });
  }
}

/* MD
  Great! Now we just need to instantiate and initialize the editor we just built, and we'll be ready to start editing the model.
*/

const generalEditor = new GeneralEditor(world);
await generalEditor.init();

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
  Now we will create various UI elements to use the logic of the editor we just made. We will start by defining a panel to edit the samples of the selected element.
*/

const [samplesPanel, updateSamplesPanel] = BUI.Component.create<
  BUI.PanelSection,
  any
>((_) => {
  const tempColor = new THREE.Color();

  const samplesMenus: BUI.PanelSection[] = [];

  if (generalEditor.elementSelected) {
    const samples = generalEditor.samples;
    for (const id in samples) {
      const sample = samples[id];

      const materialMenu = BUI.Component.create<BUI.PanelSection>(() => {
        return BUI.html`
             <bim-dropdown label="Material" @change=${async (e: any) => {
               if (!e.target.value[0]) return;
               const idNum = parseInt(id, 10);
               await generalEditor.setSampleMaterial(idNum, e.target.value[0]);
             }}>
            </bim-dropdown>
        `;
      });

      generalEditor.updateMaterials().then(() => {
        for (const [materialId, material] of generalEditor.materials) {
          const { r, g, b } = material;
          tempColor.setRGB(r / 255, g / 255, b / 255);
          const colorString = `#${tempColor.getHexString()}`;
          const option = BUI.Component.create<BUI.PanelSection>(() => {
            return BUI.html`<bim-option icon="icon-park-outline:material" label=${materialId} ?checked=${sample.material === materialId}>
            <div style="width: 1rem; height: 1rem; background-color: ${colorString}"></div>
          </bim-option>`;
          });
          materialMenu.appendChild(option);
        }
      });

      const sampleMenu = BUI.Component.create<BUI.PanelSection>(() => {
        return BUI.html`
          <div style="display: flex; gap: 0.5rem; flex-direction: column;">

            <div style="display: flex; gap: 0.5rem;">
              <bim-label icon="f7:cube" style="font-weight: bold;">Sample ${id}</bim-label>
            </div>

            ${materialMenu}

            <bim-dropdown label="Local Transform" @change=${async (e: any) => {
              if (!e.target.value[0]) return;
              const sample = samples[id];
              if (!sample) return;
              sample.localTransform = e.target.value[0];
              await generalEditor.updateSamples();
            }}>

              ${[
                ...new Set([
                  ...generalEditor.localTransformsIds,
                  sample.localTransform,
                ]),
              ].map((ltId) => {
                return BUI.html`<bim-option icon="iconoir:axes" label=${ltId} ?checked=${sample.localTransform === ltId}>
                </bim-option>`;
              })}
            </bim-dropdown>

            <bim-dropdown label="Geometry" @change=${async (e: any) => {
              if (!e.target.value[0]) return;
              const sample = samples[id];
              if (!sample) return;
              sample.representation = e.target.value[0];
              await generalEditor.updateSamples();
            }}>

              ${[
                ...new Set([
                  ...generalEditor.geometriesIds,
                  sample.representation,
                ]),
              ].map((geometryId) => {
                return BUI.html`<bim-option icon="fluent:select-object-24-filled" label=${geometryId} ?checked=${sample.representation === geometryId}>
                </bim-option>`;
              })}
            </bim-dropdown>
          </div>
          `;
      });
      samplesMenus.push(sampleMenu);
    }
  }

  return BUI.html`<bim-panel-section label="Samples">
  ${samplesMenus.map((menu) => menu)}
  </bim-panel-section>`;
}, {});

/* MD
  Now we will create another panel to edit the materials of the selected element.
*/

const [matsPanel, updateMatsPanel] = BUI.Component.create<
  BUI.PanelSection,
  any
>((_) => {
  const materials = generalEditor.get3dMaterials();

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${materials.map(
          (material) =>
            BUI.html`

          <div style="display: flex; gap: 0.5rem;">
          <bim-color-input color=#${material.color.getHexString()} label=${material.userData.localId} @input=${(
            e: any,
          ) => {
            material.color.set(e.target.color);
          }}>
          </bim-color-input>

          <bim-number-input slider min=0 max=1 step=0.01 value=${material.opacity} @change=${(
            e: any,
          ) => {
            material.opacity = e.target.value;
          }}></bim-number-input>

          </div>`,
        )}
        </div>
  `;
}, {});

generalEditor.sampleMaterialsUpdated.add(updateMatsPanel);

/* MD
  And finally, we will create a panel to show the history of the edits made to the model so that we can also revert them.
*/

const historyMenu = document.getElementById("history-menu") as HTMLDivElement;

let selectedRequestIndex: number | null = null;

const updateHistoryMenu = async () => {
  const { requests, undoneRequests } = await fragments.editor.getModelRequests(
    model.modelId,
  );

  const allRequests = [...requests, ...undoneRequests];

  const children = [...historyMenu.children];
  for (const child of children) {
    historyMenu.removeChild(child);
    child.remove();
  }

  let selectedButton: BUI.Button | null = null;

  for (let i = 0; i < allRequests.length; i++) {
    const request = allRequests[i];

    const nextExists = i < allRequests.length - 1;

    const requestButton = BUI.Component.create<BUI.Button>(() => {
      return BUI.html`
        <bim-button icon="solar:arrow-right-bold"></bim-button>
      `;
    });

    const isSelected = selectedRequestIndex === i;
    const noSelectionAndIsLast = selectedRequestIndex === null && !nextExists;
    if (isSelected || noSelectionAndIsLast) {
      requestButton.classList.add("selected-request");
      selectedButton = requestButton;
    }

    const currentIndex = i;
    // eslint-disable-next-line no-loop-func
    requestButton.addEventListener("click", async () => {
      if (selectedButton) {
        selectedButton.classList.remove("selected-request");
      }
      selectedButton = requestButton;
      requestButton.classList.add("selected-request");
      await fragments.editor.selectRequest(model.modelId, currentIndex);
      await model.setVisible(undefined, true);
      selectedRequestIndex = currentIndex;
      await fragments.editor.edit(model.modelId, [], {
        removeRedo: false,
      });
      await fragments.update(true);
    });

    const requestMenu = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
      <div class="history-request">
        ${nextExists ? BUI.html`<div class="history-line"></div>` : ""}
        ${requestButton}
        <div>
          <bim-label class="history-request-title">${FRAGS.EditRequestTypeNames[request.type]}</bim-label>
          <bim-label class="history-request-subtitle">ID: ${request.localId}</bim-label>
        </div>
      </div>
      `;
    });

    historyMenu.appendChild(requestMenu);
  }

  selectedRequestIndex = null;
};

fragments.editor.onEdit.add(updateHistoryMenu);

/* MD
  Now, let's put all the UI elemnets together:
*/

const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
  (_) => {
    const geometryButton = BUI.html`<bim-button label="Change geometry" @click=${() => {
      generalEditor.overrideGeometryWithCube();
    }}></bim-button>`;
    updateSamplesPanel();
    updateMatsPanel();

    return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">
      <bim-panel-section label="Controls">
        <bim-button data-name="arq" label="Apply changes" @click=${() => generalEditor.applyChanges()}></bim-button>
        <bim-dropdown required label="Tranform Mode" 
            @change="${({ target }: { target: BUI.Dropdown }) => {
              const selected = target.value[0] as "rotate" | "translate";
              generalEditor.setControlsMode(selected);
            }}">
          <bim-option checked  label="translate"></bim-option>
          <bim-option label="rotate"></bim-option>
        </bim-dropdown>
        <bim-dropdown required label="Transform Target" 
            @change="${({ target }: { target: BUI.Dropdown }) => {
              const selected = target.value[0] as "global" | "local";
              generalEditor.setControlsTarget(selected);
            }}">
          <bim-option checked  label="global"></bim-option>
          <bim-option label="local"></bim-option>
        </bim-dropdown>
        ${geometryButton}
        ${matsPanel}
      </bim-panel-section>
      ${samplesPanel}
    </bim-panel>
  `;
  },
  {},
);

generalEditor.onUpdated.add(() => {
  updatePanel();
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

window.dispatchEvent(new Event("resize"));

/* MD
  ### ⏱️ Measuring the performance (optional)
  We'll use the [Stats.js](https://github.com/mrdoob/stats.js) to measure the performance of our app. We will add it to the top left corner of the viewport. This way, we'll make sure that the memory consumption and the FPS of our app are under control.
*/

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.right = "0px";
stats.dom.style.bottom = "0px";
stats.dom.style.left = "unset";
stats.dom.style.top = "unset";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

/* MD
  ### 🎉 Congratulations!
  You've successfully learned how to edit BIM models using the Fragments Elements API! 🚀
  Now, you can start building your own authoring app with Fragments! 💡
*/
