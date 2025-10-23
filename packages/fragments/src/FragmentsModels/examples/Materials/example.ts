/* MD
  ## Working with Materials 🎨
  ---
  In this tutorial, we'll explore how to work with materials in Fragments models. We'll learn how to load textures, apply different material properties, and dynamically change materials on specific elements. Let's dive in!
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import * as FRAGS from "../../../index";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models with proper lighting and shadows:
*/

const container = document.getElementById("container")!;

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.ShadowedScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.ShadowedScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

components.init();

const axes = new THREE.AxesHelper(10);
world.scene.three.add(axes);

world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);

world.renderer.three.shadowMap.enabled = true;
world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;

world.scene.setup({
  directionalLight: {
    color: new THREE.Color(1, 1, 1),
    position: new THREE.Vector3(5, 10, 5),
    intensity: 4,
  },
  shadows: {
    cascade: 1,
    resolution: 1024,
  },
});

world.renderer.three.toneMapping = THREE.NeutralToneMapping;
world.renderer.three.toneMappingExposure = 1;

await world.scene.updateShadows();

world.camera.controls.addEventListener("rest", async () => {
  await world.scene.updateShadows();
});

/* MD
  ### 🌅 Setting up HDRI Environment
  We'll load an HDRI environment map to provide realistic lighting and reflections for our materials. This will make the materials look more realistic and help us see the effects of different material properties:
*/

const hdriLoader = new RGBELoader();
hdriLoader.load(
  "https://thatopen.github.io/engine_fragment/resources/textures/envmaps/san_giuseppe_bridge_2k.hdr",
  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    // world.scene.three.background = texture;
    world.scene.three.environment = texture;
    // world.scene.three.environmentIntensity = 4;
  },
);

/* MD
  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start working with their materials:
*/

// prettier-ignore
const workerUrl = "../../src/multithreading/fragments-thread.ts";
const fragments = new FRAGS.FragmentsModels(workerUrl);
world.camera.controls.addEventListener("control", () => fragments.update());

/* MD
  ### 🖼️ Loading and Processing Textures
  We'll load various textures (color, normal, and roughness maps) that we'll use to create realistic materials. We'll also set up texture processing to ensure they wrap and repeat correctly:
*/

const processTextures = (texture: THREE.Texture) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.1, 0.1);
};

const textureLoader = new THREE.TextureLoader();
const colorTexture = textureLoader.load(
  "https://thatopen.github.io/engine_fragment/resources/textures/concrete/Concrete012_2K-JPG_Color.jpg",
);
colorTexture.colorSpace = THREE.SRGBColorSpace;

processTextures(colorTexture);

const normalMap = textureLoader.load(
  "https://thatopen.github.io/engine_fragment/resources/textures/concrete/Concrete012_2K-JPG_NormalGL.jpg",
);
processTextures(normalMap);

const roughnessMap = textureLoader.load(
  "https://thatopen.github.io/engine_fragment/resources/textures/concrete/Concrete012_2K-JPG_Roughness.jpg",
);
processTextures(roughnessMap);

/* MD
  ### 🎨 Material Processing and Enhancement
  We'll set up material processing to automatically enhance materials when they're loaded. This includes applying different material properties based on the material type and adding textures for more realistic appearance:

  :::info Material Types
  We'll identify different material types (like steel and concrete) based on their color properties and apply appropriate material settings for each type.
  :::
*/

fragments.models.materials.list.onItemSet.add(
  ({ key: id, value: material }) => {
    if ("map" in material) {
      // Steel material; we can also use material.localId to identify the material
      if (
        material.color.r === 1 &&
        material.color.g === 0 &&
        material.color.b === 0
      ) {
        const standardMaterial = new THREE.MeshStandardMaterial({
          color: material.color,
          metalness: 0.9,
          roughnessMap,
          roughness: 1,
        }) as any;
        fragments.models.materials.list.set(id, standardMaterial);
        return;
      }

      // Concrete material
      const standardMaterial = new THREE.MeshStandardMaterial({
        color: material.color,
        map: colorTexture,
        normalMap,
        roughnessMap,
        roughness: 1,
      }) as any;
      fragments.models.materials.list.set(id, standardMaterial);
    }
  },
);

/* MD
  ### 🗺️ UV Mapping Generation
  We'll generate UV coordinates for the geometry to ensure textures are properly mapped. This is essential for displaying textures correctly on the 3D models:

  :::warning UV Mapping
  Without proper UV mapping, textures won't display correctly on the geometry. We'll use cubic projection to generate UV coordinates based on the geometry's normal vectors.
  :::
*/

fragments.models.list.onItemSet.add(({ value: model }) => {
  model.tiles.onItemSet.add(({ value: mesh }) => {
    if (!("isLODGeometry" in mesh.geometry)) {
      const geometry = mesh.geometry as THREE.BufferGeometry;

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Cubic UV projection

      // Step 1: Determine the direction to use for projection

      const indexArray = geometry.index!.array;
      const positions = geometry.attributes.position!.array!;
      const normals = geometry.attributes.normal!.array!;

      const uvArray = new Float32Array((positions.length / 3) * 2);

      for (let i = 0; i < indexArray.length; i++) {
        const index = indexArray[i];
        const x = positions[index * 3];
        const y = positions[index * 3 + 1];
        const z = positions[index * 3 + 2];

        const nx1 = normals[index * 3];
        const ny1 = normals[index * 3 + 1];
        const nz1 = normals[index * 3 + 2];

        const absNx = Math.abs(nx1);
        const absNy = Math.abs(ny1);
        const absNz = Math.abs(nz1);

        if (absNx > absNy && absNx > absNz) {
          // Use x direction
          uvArray[index * 2] = y;
          uvArray[index * 2 + 1] = z;
        } else if (absNy > absNx && absNy > absNz) {
          // Use y direction
          uvArray[index * 2] = x;
          uvArray[index * 2 + 1] = z;
        } else {
          // Use z direction
          uvArray[index * 2] = x;
          uvArray[index * 2 + 1] = y;
        }
      }

      const attr = new THREE.BufferAttribute(uvArray, 2);
      attr.onUpload(function callback(this: any) {
        delete this.array;
      });

      geometry.setAttribute("uv", attr);
    }
  });
});

/* MD
  ### 📂 Loading a Fragments Model
  With the core setup complete, it's time to load a Fragments model into our scene. This model will serve as our test subject for material operations:

  :::info Where can I find Fragment files?
  You can use the sample Fragment files available in our repository for testing. If you have an IFC model you'd like to convert to Fragments, check out the IfcImporter tutorial for detailed instructions.
  :::
*/

const fetched = await fetch(
  "https://thatopen.github.io/engine_fragment/resources/frags/school_str.frag",
);
const buffer = await fetched.arrayBuffer();

const model = await fragments.load(buffer, {
  modelId: "test",
  camera: world.camera.three,
});
world.scene.three.add(model.object);

/* MD
  ### ✏️ Dynamic Material Editing
  Now we'll demonstrate how to dynamically change materials on specific elements. We'll identify steel elements and apply a new red material to them, showing how to programmatically modify materials in a Fragments model:
*/

const elements = await model.getItemsOfCategories([
  /IFCCOLUMN/,
  /IFCBEAM/,
  /IFCMEMBER/,
]);
const elementsIds = Object.values(elements).flat();

const steelElementsIds = new Set<number>();
for (const element of elementsIds) {
  const data = await model.getItemsData([element], {
    attributes: ["Name", "NominalValue"],
    relations: {
      IsDefinedBy: { attributes: true, relations: true },
      DefinesOcurrence: { attributes: false, relations: false },
    },
  });
  const objectType = data[0].ObjectType as FRAGS.ItemAttribute;
  if (!objectType.value.includes("Concrete")) {
    steelElementsIds.add(element);
  }
}

const requests: FRAGS.EditRequest[] = [];

const newMaterial = {
  r: 255,
  g: 0,
  b: 0,
  a: 255,
  renderedFaces: 0,
  stroke: 0,
};

requests.push({
  type: FRAGS.EditRequestType.CREATE_MATERIAL,
  tempId: "new-material",
  data: newMaterial,
});

const globalTransformIds = new Set(
  await model.getGlobalTranformsIdsOfItems(Array.from(steelElementsIds)),
);

const samples = await model.getSamples();
for (const [localId, sample] of samples) {
  if (globalTransformIds.has(sample.item)) {
    requests.push({
      type: FRAGS.EditRequestType.UPDATE_SAMPLE,
      localId,
      data: { ...sample, material: "new-material" },
    });
  }
}

await fragments.editor.edit(model.modelId, requests);
await fragments.update(true);

/* MD
  ### 🎉 Congratulations!
  You've successfully learned how to work with materials in Fragments models! 🚀
  Now you can load textures, apply different material properties, and dynamically change materials on specific elements. Ready to explore more? Check out our other tutorials to unlock the full potential of Fragments! 💡
*/
