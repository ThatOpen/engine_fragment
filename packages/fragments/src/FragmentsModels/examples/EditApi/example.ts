/* MD
  ## Editing Fragment Models 🤏
  ---
  Viewing BIM models is cool, but sometimes we also need to edit the information of existing BIM models. In this tutorial, we'll explore how to edit BIM models using the Fragments Edit API, covering most of the edit operations.

  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from "../../../index";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene with shadows. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
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
  We will also define a disk bounding box and a disk geometry to use in some of the edits we'll make later.
*/

// @ts-ignore
const diskBbox = [0, 0, 0, 1, 1, 1];
// @ts-ignore
const diskGeometry: FRAGS.RawShell = {
  points: [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0.25, 0.25, 0],
    [0.75, 0.25, 0],
    [0.75, 0.75, 0],
    [0.25, 0.75, 0],
  ],
  profiles: new Map([[0, [0, 1, 2, 3]]]),
  holes: new Map([[0, [[4, 5, 6, 7]]]]),
  bigProfiles: new Map(),
  bigHoles: new Map(),
  type: FRAGS.ShellType.NONE,
  profilesFaceIds: [0],
};

/* MD
  :::info Do I need @thatopen/components?

  Not necessarily! While @thatopen/components simplifies the process of setting up a scene, you can always use plain ThreeJS to create your own custom scene setup. It's entirely up to your preference and project requirements! 😉

  :::

  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start manipulating them with ease:
*/

// You have to copy `/node_modules/@thatopen/fragments/dist/Worker/worker.mjs` to your project directory
// and provide the relative path in `workerUrl`
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

const modelId = "test";
const fetched = await fetch(
  "https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag",
);
const buffer = await fetched.arrayBuffer();
const model = await fragments.load(buffer, { modelId });
await fragments.update(true);

/* MD
  ### ✏️✨🧨 How Editing Works
  Now, let's edit the model. The Fragments Edit API is based on edit requests. Each edit request is an object that contains the type of edit to perform and the data to edit. In this tutorial we will cover the most common edit requests available. Let's get started!

  :::info How to go from simple edit requests to a modeller/configurator?

  Don't worry! Edit requests are the foundation of the Fragments Edit API. It's important to familiarize yourself with them first, but we also have other APIs that will make building a modeller/configurator a lot easier.

  :::

  :::warning What about real time changes?

  You may have noticed that applying edit requests to the model is not instantaneous; you can't make 60 edits per second. This is because the model is updated in the background to keep the Fragments' performance at a high level. But don't worry: there are ways to make changes in real time, and you'll learn about them in other tutorials.

  :::

  ### ✏️🎨 Editing materials

  We will define a function that will find the most used material and change its color to red.
*/

const editMaterials = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Find most used material
  const samples = await model.getSamples();
  const materialCounts = new Map<number, number>();
  for (const [, sample] of samples) {
    const material = sample.material;
    const count = materialCounts.get(material) || 0;
    materialCounts.set(material, count + 1);
  }
  let mostUsedMatId = 0;
  let maxCount = 0;
  for (const [material, count] of materialCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostUsedMatId = material;
    }
  }

  // Create an edit request to update the material to red
  const materials = await model.getMaterials([mostUsedMatId]);
  const materialId = materials.keys().next().value as number;
  const material = materials.get(materialId) as FRAGS.RawMaterial;
  material.r = 255;
  material.g = 0;
  material.b = 0;
  requests.push({
    type: FRAGS.EditRequestType.UPDATE_MATERIAL,
    localId: materialId,
    data: material,
  });

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✏️🧊 Editing geometries

  We will define a function that will replace all geometries (representations) by a disk geometry.
*/

const editGeometries = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // substitute all representations by a disk geometry
  const representations = await model.getRepresentations();
  for (const [localId, representation] of representations) {
    representation.geometry = diskGeometry;
    representation.bbox = diskBbox;
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_REPRESENTATION,
      localId,
      data: representation,
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✏️🍣 Editing instances

  We will define a function that will edit all instances (samples) by changing their material by the material of the first sample.
*/

const editInstances = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Get first sample
  const samples = await model.getSamples();
  const firstSample = samples.values().next().value!;

  for (const [localId, sample] of samples) {
    sample.material = firstSample.material;
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_SAMPLE,
      localId,
      data: sample,
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✏️🌍 Editing global transforms

  We will define a function that will edit all global transforms by modifying it's y position.
*/

const editGlobalTransforms = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Get all global transforms
  const gTransforms = await model.getGlobalTransforms();

  // Edit all global transforms by multiplying it's y position by 5
  for (const [localId, globalTransform] of gTransforms) {
    globalTransform.position[1] *= 5;
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_GLOBAL_TRANSFORM,
      localId,
      data: globalTransform,
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✏️🌍 Editing local transforms

  We will define a function that will edit all local transforms by modifying it's y position. We will skip the first local transform because it's the no-local transform (the local transform assigned to all the instances without a local transform).
*/

const editLocalTransforms = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Get all local transforms
  const lTransforms = await model.getLocalTransforms();

  // Edit all local transforms by multiplying it's y position by 5 (except the first one)
  let first = true;
  for (const [localId, localTransform] of lTransforms) {
    if (first) {
      first = false;
      continue;
    }
    localTransform.position[1] *= 5;
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_LOCAL_TRANSFORM,
      localId,
      data: localTransform,
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✏️📄 Editing items

  We will define a function that will edit the attributes of all walls in the model.
*/

const editItems = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Get all walls items
  const foundWalls = await model.getItemsOfCategories([/WALL/]);
  const wallsIds = Object.values(foundWalls).flat();
  const items = await model.getItems(wallsIds);

  // Edit all walls items by overriding its attributes
  for (const [localId, item] of items) {
    item.data = { test: { value: "hello" } };
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_ITEM,
      localId,
      data: item,
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);

  // Now log the new data

  const newItems = await model.getItems(wallsIds);
  console.log("New items:", newItems);
  alert("All wall attributes edited! Check the console to see them!");
};

/* MD
  ### ✏️📰 Editing metadata

  We will define a function that will edit the metadata of the model.
*/

const editMetadata = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Get the metadata and edit it
  const metadata = await model.getMetadata();
  metadata.newMetadataAttribute = "newMetadataAttribute";
  requests.push({
    type: FRAGS.EditRequestType.UPDATE_METADATA,
    localId: 0,
    data: metadata,
  });

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);

  // Now log the new data

  const newMetadata = await model.getMetadata();
  console.log("New metadata:", newMetadata);
  alert("Metadata edited! Check the console to see it!");
};

/* MD
  ### ✏️🌳 Editing the spatial structure

  We will define a function that will edit the spatial structure of the model.
*/

const editSpatialStructure = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Get the metadata and edit it
  requests.push({
    type: FRAGS.EditRequestType.UPDATE_SPATIAL_STRUCTURE,
    localId: 0,
    data: {
      localId: 0,
      category: "test",
      children: [],
    },
  });
  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);

  // Now log the new data

  const newSpatialStructure = await model.getSpatialStructure();
  console.log("New empty spatial structure:", newSpatialStructure);
  alert("Spatial structure edited! Check the console to see it!");
};

/* MD
  ### ✨🎨 Creating materials

  We will define a function that will create a new material with a random color and assign it to all the samples in the model.
*/

const createMaterials = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Define a new material
  const newMaterial = {
    r: 113,
    g: 255,
    b: 0,
    a: 255,
    renderedFaces: 0,
    stroke: 0,
  };

  // We use this temp id to reference the new material
  // before creating it and getting its local id
  const tempId = "new-material";

  // Create the new material
  requests.push({
    type: FRAGS.EditRequestType.CREATE_MATERIAL,
    tempId,
    data: newMaterial,
  });

  // Assign the new material to all the samples
  const samples = await model.getSamples();
  for (const [localId, sample] of samples) {
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_SAMPLE,
      localId,
      data: { ...sample, material: tempId },
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✨🧊 Creating geometries

  We will define a function that will create a new shell geometry and assign it to all the samples in the model.
*/

const createGeometries = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // We use this temp id to reference the new geometry
  // before creating it and getting its local id
  const tempId = "new-geometry";

  // Create the new geometry
  requests.push({
    type: FRAGS.EditRequestType.CREATE_REPRESENTATION,
    tempId,
    data: {
      bbox: diskBbox,
      representationClass: FRAGS.RepresentationClass.SHELL,
      geometry: diskGeometry,
    },
  });

  // Assign the new geometry to all the samples
  const samples = await model.getSamples();
  for (const [localId, sample] of samples) {
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_SAMPLE,
      localId,
      data: { ...sample, representation: tempId },
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✨🍣 Creating instances

  We will define a function that will create a new instance (sample) for each sample in the model, and give it the same geometry as the first sample. Basically, we will create an instance of one geometry on top of each existing instance.
*/

const createInstances = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Get all samples
  const samples = await model.getSamples();

  // Get the first sample
  const firstSample = samples.values().next().value!;

  // Create a new instance for each sample
  for (const [, sample] of samples) {
    requests.push({
      type: FRAGS.EditRequestType.CREATE_SAMPLE,
      data: { ...sample, representation: firstSample.representation },
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✨🌍 Creating global transforms (and items)

  We will define a function that will create a new global transform and assign it to every instance in the model. Global transforms are bound to items, so we need to create an item too.
*/

const createGlobalTransforms = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // We use these temp ids to reference the new item and global transform
  // before creating them and getting their local ids
  const tempItemId = "new-item";
  const tempGlobalTransformId = "new-global-transform";

  // Create the new item and the new global transform
  requests.push(
    {
      type: FRAGS.EditRequestType.CREATE_ITEM,
      tempId: tempItemId,
      data: { data: { hello: { value: "world" } }, category: "test" },
    },
    {
      type: FRAGS.EditRequestType.CREATE_GLOBAL_TRANSFORM,
      tempId: tempGlobalTransformId,
      data: {
        position: [0, 0, 0],
        xDirection: [1, 0, 0],
        yDirection: [0, 1, 0],
        itemId: tempItemId,
      },
    },
  );

  // Assign the new global transform to all the samples
  const samples = await model.getSamples();
  for (const [localId, sample] of samples) {
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_SAMPLE,
      localId,
      data: { ...sample, item: tempGlobalTransformId },
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✨🌍 Creating local transforms

  We will define a function that will create a new local transform and assign it to every instance in the model. 
*/

const createLocalTransforms = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // We use this temp id to reference the new local transform
  // before creating it and getting its local id
  const tempId = "new-local-transform";

  // Create the new local transform
  requests.push({
    type: FRAGS.EditRequestType.CREATE_LOCAL_TRANSFORM,
    tempId,
    data: {
      position: [0, 0, 0],
      xDirection: [1, 0, 0],
      yDirection: [0, 1, 0],
    },
  });

  // Assign the new local transform to all the samples
  const samples = await model.getSamples();
  for (const [localId, sample] of samples) {
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_SAMPLE,
      localId,
      data: { ...sample, localTransform: tempId },
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### ✨📄 Creating items

  We will define a function that will create a new item in the model.
*/

const createItems = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Create the new item
  requests.push({
    type: FRAGS.EditRequestType.CREATE_ITEM,
    data: { data: { hello: { value: "world" } }, category: "test" },
  });

  // Apply the edit requests to the model
  const [localId] = await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);

  // Now log the new data
  const newItems = await model.getItems([localId]);
  console.log("New items:", newItems);
  alert("Item created! Check the console to see it!");
};

/* MD
  ### 🧨🎨 Deleting materials

  We will define a function that will delete the most used material in the model.
*/

const deleteMaterials = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Find most used material and delete it

  const samples = await model.getSamples();
  const materialCounts = new Map<number, number>();
  for (const [, sample] of samples) {
    const material = sample.material;
    const count = materialCounts.get(material) || 0;
    materialCounts.set(material, count + 1);
  }
  let mostUsedMatId = 0;
  let maxCount = 0;
  for (const [material, count] of materialCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostUsedMatId = material;
    }
  }

  // Find the second most used material
  const materials = await model.getMaterials();
  const materialIds = Array.from(materials.keys());
  const secondMat =
    materialIds[0] === mostUsedMatId ? materialIds[1] : materialIds[0];

  requests.push({
    type: FRAGS.EditRequestType.DELETE_MATERIAL,
    localId: mostUsedMatId,
  });

  // We can't have samples referencing the deleted material, so we will update
  // them to reference the second most used material
  for (const [localId, sample] of samples) {
    if (sample.material === mostUsedMatId) {
      requests.push({
        type: FRAGS.EditRequestType.UPDATE_SAMPLE,
        localId,
        data: { ...sample, material: secondMat },
      });
    }
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### 🧨🧊 Deleting geometries

  We will define a function that will delete the most used representation in the model.
*/

const deleteGeometries = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Find most used representation

  const samples = await model.getSamples();
  const reprCounts = new Map<number, number>();

  for (const [, sample] of samples) {
    const repr = sample.representation;
    const count = reprCounts.get(repr) || 0;
    reprCounts.set(repr, count + 1);
  }

  let mostUsedReprId = 0;
  let maxCount = 0;
  for (const [repr, count] of reprCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostUsedReprId = repr;
    }
  }

  const reprs = await model.getRepresentations();
  const reprIds = Array.from(reprs.keys());
  const secondRepr = reprIds[0] === mostUsedReprId ? reprIds[1] : reprIds[0];

  // Delete the most used representation
  requests.push({
    type: FRAGS.EditRequestType.DELETE_REPRESENTATION,
    localId: mostUsedReprId,
  });

  // Update the samples to reference the second most used representation
  for (const [localId, sample] of samples) {
    if (sample.representation === mostUsedReprId) {
      requests.push({
        type: FRAGS.EditRequestType.UPDATE_SAMPLE,
        localId,
        data: { ...sample, representation: secondRepr },
      });
    }
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### 🧨🍣 Deleting instances

  We will define a function that will delete half of the instances in the model.
*/

const deleteInstances = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Delete half of the samples
  const samples = await model.getSamples();
  let toggle = false;
  for (const [localId] of samples) {
    toggle = !toggle;
    if (toggle) {
      continue;
    }
    requests.push({
      type: FRAGS.EditRequestType.DELETE_SAMPLE,
      localId,
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### 🧨🌍 Deleting global transforms

  We will define a function that will delete every global transform except the first one.
*/

const deleteGlobalTransforms = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Delete every global transforms except the first one
  const gTransforms = Array.from((await model.getGlobalTransforms()).keys());
  const gTransformsToDelete = new Set<number>();
  for (let i = 1; i < gTransforms.length; i++) {
    gTransformsToDelete.add(gTransforms[i]);
  }

  const firstGt = gTransforms[0];
  for (const localId of gTransformsToDelete) {
    requests.push({
      type: FRAGS.EditRequestType.DELETE_GLOBAL_TRANSFORM,
      localId,
    });
  }

  // Update the samples to reference the first global transform
  const samples = await model.getSamples();
  for (const [localId, sample] of samples) {
    if (gTransformsToDelete.has(sample.item)) {
      requests.push({
        type: FRAGS.EditRequestType.UPDATE_SAMPLE,
        localId,
        data: { ...sample, item: firstGt },
      });
    }
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### 🧨🌍 Deleting local transforms

  We will define a function that will delete every local transform except the first one.
*/

const deleteLocalTransforms = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // Delete every local transform except the first one

  const lTransforms = Array.from((await model.getLocalTransforms()).keys());
  const lTransformsToDelete = new Set<number>();
  for (let i = 1; i < lTransforms.length; i++) {
    lTransformsToDelete.add(lTransforms[i]);
  }

  const firstLt = lTransforms[0];

  for (const localId of lTransformsToDelete) {
    requests.push({
      type: FRAGS.EditRequestType.DELETE_LOCAL_TRANSFORM,
      localId,
    });
  }

  const samples = await model.getSamples();
  for (const [localId, sample] of samples) {
    if (lTransformsToDelete.has(sample.localTransform)) {
      requests.push({
        type: FRAGS.EditRequestType.UPDATE_SAMPLE,
        localId,
        data: { ...sample, localTransform: firstLt },
      });
    }
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### 🧨🌍 Deleting items

  We will define a function that will delete an item and its associated global transform.
*/

const deleteItems = async () => {
  // Define edit requests
  const requests: FRAGS.EditRequest[] = [];

  // We need to edit the global transform associated with the item too
  const items = await model.getItems();
  const itemIds = Array.from(items.keys());
  const firstItemId = itemIds[0];
  const secondItemId = itemIds[1];
  const gtIds = await model.getGlobalTranformsIdsOfItems([firstItemId]);

  requests.push({
    type: FRAGS.EditRequestType.DELETE_ITEM,
    localId: firstItemId,
  });

  const gts = await model.getGlobalTransforms(gtIds);
  for (const [id, gt] of gts) {
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_GLOBAL_TRANSFORM,
      localId: id,
      data: { ...gt, itemId: secondItemId },
    });
  }

  // Apply the edit requests to the model
  await fragments.editor.edit(modelId, requests);

  // Update the model to see the changes
  await fragments.update(true);
};

/* MD
  ### 💾 Saving the model

  We will define a function that will export the edited Fragments model to a new file.
*/

const exportModel = async () => {
  await fragments.editor.save(model.modelId);
  window.setTimeout(async () => {
    const exportedBuffer = await model.getBuffer();
    const exportedBytes = new Uint8Array(exportedBuffer);
    const exportedBlob = new Blob([exportedBytes]);
    const exportedUrl = URL.createObjectURL(exportedBlob);
    const exportedLink = document.createElement("a");
    exportedLink.href = exportedUrl;
    exportedLink.download = "exported.frag";
    document.body.appendChild(exportedLink);
    exportedLink.click();
    document.body.removeChild(exportedLink);
    URL.revokeObjectURL(exportedUrl);
  }, 1000);
};

/* MD
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
      <bim-panel-section fixed label="Export operations">
        <bim-button icon="mdi:file-export" label="Export model" @click=${exportModel}></bim-button>
      </bim-panel-section>
      <bim-panel-section fixed label="Edit operations">
        <bim-button icon="icon-park-outline:material" label="Edit materials" @click=${editMaterials}></bim-button>
        <bim-button icon="mdi:cube-outline" label="Edit geometries" @click=${editGeometries}></bim-button>
        <bim-button icon="mingcute:cube-line" label="Edit instances" @click=${editInstances}></bim-button>
        <bim-button icon="iconoir:axes" label="Edit global transforms" @click=${editGlobalTransforms}></bim-button>
        <bim-button icon="iconoir:axes" label="Edit local transforms" @click=${editLocalTransforms}></bim-button>
        <bim-button icon="mdi:paper-outline" label="Edit items" @click=${editItems}></bim-button>
        <bim-button icon="bx:data" label="Edit metadata" @click=${editMetadata}></bim-button>
        <bim-button icon="mdi:tree-outline" label="Edit spatial structure" @click=${editSpatialStructure}></bim-button>
      </bim-panel-section>
      <bim-panel-section fixed label="Create operations">
        <bim-button icon="icon-park-outline:material" label="Create materials" @click=${createMaterials}></bim-button>
        <bim-button icon="mdi:cube-outline" label="Create geometries" @click=${createGeometries}></bim-button>
        <bim-button icon="mingcute:cube-line" label="Create instances" @click=${createInstances}></bim-button>
        <bim-button icon="iconoir:axes" label="Create global transforms" @click=${createGlobalTransforms}></bim-button>
        <bim-button icon="iconoir:axes" label="Create local transforms" @click=${createLocalTransforms}></bim-button>
        <bim-button icon="mdi:paper-outline" label="Create items" @click=${createItems}></bim-button>
      </bim-panel-section>
      <bim-panel-section fixed label="Delete operations">
        <bim-button icon="icon-park-outline:material" label="Delete materials" @click=${deleteMaterials}></bim-button>
        <bim-button icon="mdi:cube-outline" label="Delete geometries" @click=${deleteGeometries}></bim-button>
        <bim-button icon="mingcute:cube-line" label="Delete instances" @click=${deleteInstances}></bim-button>
        <bim-button icon="iconoir:axes" label="Delete global transforms" @click=${deleteGlobalTransforms}></bim-button>
        <bim-button icon="iconoir:axes" label="Delete local transforms" @click=${deleteLocalTransforms}></bim-button>
        <bim-button icon="mdi:paper-outline" label="Delete items" @click=${deleteItems}></bim-button>
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
  You've successfully learned how to edit BIM models using the Fragments Edit API! 🚀
  Now, generating the edit requests directly gives us full control over the model but it's not very convenient. Check out the other edit tutorials to learn how to use the Fragments Edit API more easily! 💡
*/
