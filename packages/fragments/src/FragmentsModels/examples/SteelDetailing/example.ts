/* MD
  ## Steel Detailing 🔧
  ---
  In this tutorial, we'll explore how to create detailed steel structures using the Fragments API. We'll learn how to generate steel frames, base plates, connections, and other structural steel elements with proper geometric relationships and detailing. Let's dive in!
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as WEBIFC from "web-ifc";
import Stats from "stats.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import * as FRAGS from "../../../index";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene with advanced rendering capabilities. This will serve as the foundation for our application and allow us to visualize the steel structures with proper lighting, shadows, and post-processing effects:
*/

const container = document.getElementById("container")!;

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.ShadowedScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>();

world.scene = new OBC.ShadowedScene(components);
world.renderer = new OBF.PostproductionRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

world.renderer.postproduction.enabled = true;
world.renderer.postproduction.style = OBF.PostproductionAspect.COLOR_PEN;

components.init();

world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);

world.renderer.three.shadowMap.enabled = true;
world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;

world.scene.setup({
  shadows: {
    cascade: 1,
    resolution: 1024,
  },
});

// const prevBackground = world.scene.three.background;

await world.scene.updateShadows();

world.camera.controls.addEventListener("rest", async () => {
  await world.scene.updateShadows();
});

const axes = new THREE.AxesHelper(1);
world.scene.three.add(axes);

/* MD
  ### ⚙️ Configuration Settings
  We'll define all the parameters that control the dimensions and properties of our steel structure. These settings will allow us to create customizable steel frames with proper detailing and connections:
*/

// prettier-ignore
const settings = {
  length: 30,
  lengthModules: 5,
  columnWidth: 0.2,
  columnLength: 0.2,
  columnThickness: 0.03,
  columnFlangeThickness: 0.03,
  basePlateSize: 0.5,
  basePlateCrossHeight: 0.2,
  basePlateCornerSize: 0.1,
  basePlateThickness: 0.01,
  startPoints: [
    [0, 0, 0], [0, 8, 0], 
    [0, 8, 0], [10, 10, 0], 
    [10, 10, 0], [20, 8, 0], 
    [20, 8, 0], [20, 0, 0],
    [20, 4, 0], [30, 4, 0],
    [30, 4, 0], [30, 0, 0],
  ]
};

/* MD
  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start working with steel structures:
*/

// prettier-ignore
const workerUrl = "../../src/multithreading/fragments-thread.ts";
// const workerUrl = "../../dist/Worker/worker.mjs";
const fragments = new FRAGS.FragmentsModels(workerUrl);

/* MD
  ### 🖼️ Material and Texture Setup
  We'll set up materials and textures for our steel structures. This includes processing textures and configuring material properties for realistic steel appearance:
*/

const processTextures = (texture: THREE.Texture) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.2, 0.2);
};

const textureLoader = new THREE.TextureLoader();

const roughnessMap = textureLoader.load(
  "/resources/textures/concrete/Concrete012_2K-JPG_Roughness.jpg",
);
processTextures(roughnessMap);

fragments.models.materials.list.onItemSet.add(
  ({ key: id, value: material }) => {
    if ("map" in material) {
      const standardMaterial = new THREE.MeshStandardMaterial({
        color: material.color,
        metalness: 0.9,
        roughnessMap,
        // roughness: 1,
        side: THREE.DoubleSide,
      }) as any;
      fragments.models.materials.list.set(id, standardMaterial);
    }
  },
);

fragments.models.materials.list.onItemSet.add(({ value: material }) => {
  const isLod = "isLodMaterial" in material && material.isLodMaterial;
  if (isLod) {
    world.renderer!.postproduction.basePass.isolatedMaterials.push(material);
  }
});

const fragmentsManager = components.get(OBC.FragmentsManager);
// @ts-ignore
fragmentsManager._core = fragments;

fragments.settings.graphicsQuality = 1;

world.camera.controls.addEventListener("control", () => {
  fragments.update();
});

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

fragments.models.list.onItemSet.add(({ value: model }) => {
  model.tiles.onItemSet.add(({ value: mesh }) => {
    if ("isMesh" in mesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial[];
      if (mat[0].opacity === 1) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    }
  });

  model.getClippingPlanesEvent = () => {
    return Array.from(world.renderer!.three.clippingPlanes) || [];
  };
});

/* MD
  ### 📂 Creating a New Fragments Model
  We'll create a new empty Fragments model to store our steel structure elements. This model will be built programmatically with steel beams, columns, and connection details:
*/

const bytes = FRAGS.EditUtils.newModel({ raw: true });

// @ts-ignore
const model = await fragments.load(bytes, {
  modelId: "example",
  camera: world.camera.three,
  raw: true,
});

world.scene.three.add(model.object);

await fragments.update(true);

/* MD
  ### 🧊 Setting up the Geometry Engine
  Now, let's set up the Geometry Engine. We'll use it to generate the steel structure geometries:

  :::warning Geometry Engine?
  The Geometry Engine is a library that allows us to easily generate geometry parametrically using the Fragments API.
  :::
*/

const api = new WEBIFC.IfcAPI();
api.SetWasmPath("/node_modules/web-ifc/", false);
await api.Init();

const geometryEngine = new FRAGS.GeometryEngine(api);

/* MD
  ### 🔧 Creating Basic Steel Geometries
  Now we'll create all the basic geometries that will be used to construct our steel structure. These include HDRI environment, wireframe models, and various steel connection elements:
*/

const hdriLoader = new RGBELoader();
hdriLoader.load(
  "/resources/textures/envmaps/san_giuseppe_bridge_2k.hdr",
  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    // world.scene.three.background = texture;
    world.scene.three.environment = texture;
    // world.scene.three.environmentIntensity = 4;
  },
);

// Create wire model

const wireGeom = new THREE.BufferGeometry();
const wireMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
const wireLines = new THREE.LineSegments(wireGeom, wireMat);
world.scene.three.add(wireLines);

// Now let's define the function to regenerate the fragments

let processing = false;

// We'll use this for boolean operations

const steelElementGeometry = new THREE.BufferGeometry();

// Create foundation base plate

const tempMat = new THREE.MeshLambertMaterial({ color: "white", side: 2 });

const newMesh = (geometry: THREE.BufferGeometry) => {
  const mesh = new THREE.Mesh(geometry, tempMat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  return mesh;
};

const newExtrusion = (
  profilePoints: number[],
  direction: number[],
  length: number,
) => {
  const geometry = new THREE.BufferGeometry();
  // prettier-ignore
  geometryEngine.getExtrusion(geometry, {
    profilePoints,
    direction,
    length,
  });
  return newMesh(geometry);
};

// const newBoolean = (target: THREE.Mesh, operands: THREE.Mesh[]) => {
//   const geometry = new THREE.BufferGeometry();
//   // prettier-ignore
//   geometryEngine.getBooleanOperation(geometry, {
//     type: "DIFFERENCE",
//     target,
//     operands,
//   });
//   return newMesh(geometry);
// };

const getCirclePoints = (radius: number, segments: number) => {
  const geometry = new THREE.CircleGeometry(radius, segments);
  const profilePoints: number[] = [];
  const index = geometry.index!.array;
  const pos = geometry.attributes.position.array;
  for (let i = 0; i < index.length; i++) {
    const currentIndex = index[i];
    profilePoints.push(pos[currentIndex * 3]);
    profilePoints.push(pos[currentIndex * 3 + 1]);
    profilePoints.push(pos[currentIndex * 3 + 2]);
  }

  const rotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const transformedPoints = geometryEngine.transformPoints(
    profilePoints,
    rotation,
  );
  return transformedPoints;
};

// The plate is centered at the origin
const newPlate = (width: number, length: number, thickness: number) => {
  // prettier-ignore
  return newExtrusion(
    [
      -width / 2, 0, -length / 2, 
      -width / 2, 0, length / 2,
      width / 2, 0, length / 2,
      width / 2, 0, -length / 2,
    ],
    [0, 1, 0],
    thickness,
  );
};

const newCylinder = (radius: number, height: number, segments: number) => {
  const points = getCirclePoints(radius, segments);
  // prettier-ignore
  const base = newExtrusion(
    points,
    [0, 1, 0],
    height,
  );

  return base;
};

const basePlateMesh = newPlate(
  settings.basePlateSize,
  settings.basePlateSize,
  settings.basePlateThickness,
);

const baseCrossPlateMesh = newPlate(
  settings.basePlateThickness * 2,
  settings.basePlateSize / 2,
  settings.basePlateCrossHeight,
);

const cornerPlateMesh = newPlate(
  settings.basePlateCornerSize,
  settings.basePlateCornerSize,
  settings.basePlateThickness,
);

const boltHeadMesh = newCylinder(
  settings.basePlateSize / 15,
  settings.basePlateSize / 15,
  6,
);

/* MD
  ### 🔄 Fragment Regeneration Logic
  This function handles the regeneration of fragments when parameters change. It creates steel elements, base plates, connections, and other structural components based on the wireframe geometry:
*/

const regenerateFragments = async () => {
  if (!wireGeom.attributes.position) {
    console.log("No wire geometry");
    return;
  }

  const tempObject = new THREE.Object3D();

  const elementsData: FRAGS.NewElementData[] = [];

  await fragments.editor.reset(model.modelId);

  const matId = fragments.editor.createMaterial(
    model.modelId,
    new THREE.MeshLambertMaterial({
      color: new THREE.Color(1, 1, 1),
      side: THREE.DoubleSide,
    }),
  );

  const ltId = fragments.editor.createLocalTransform(
    model.modelId,
    new THREE.Matrix4().identity(),
  );

  // GEOMETRIES

  const basePlateGeom = basePlateMesh.geometry;
  const basePlateGeomId = fragments.editor.createShell(
    model.modelId,
    basePlateGeom,
  );

  const baseCrossPlateGeom = baseCrossPlateMesh.geometry;
  const baseCrossPlateGeomId = fragments.editor.createShell(
    model.modelId,
    baseCrossPlateGeom,
  );

  const cornerPlateGeom = cornerPlateMesh.geometry;
  const cornerPlateGeomId = fragments.editor.createShell(
    model.modelId,
    cornerPlateGeom,
  );

  const baseBoltGeom = boltHeadMesh.geometry;
  const baseBoltGeomId = fragments.editor.createShell(
    model.modelId,
    baseBoltGeom,
  );

  const baseHookRadius = settings.basePlateSize / 10;
  const baseHookThickness = settings.basePlateThickness;

  const xDirection1 = new THREE.Vector3(1, 0, 0);
  const yDirection1 = new THREE.Vector3(0, 1, 0);
  const xDirection2 = new THREE.Vector3(1, 0, 0);
  const yDirection2 = new THREE.Vector3(0, 1, 0);
  tempObject.position.set(0, 0, 0);

  tempObject.rotation.set(0, 0, 0);
  tempObject.rotation.y = -Math.PI / 2;
  tempObject.updateMatrix();
  xDirection1.applyMatrix4(tempObject.matrix);
  yDirection1.applyMatrix4(tempObject.matrix);
  tempObject.rotation.set(0, 0, 0);
  tempObject.rotation.z = Math.PI / 2;
  tempObject.updateMatrix();
  xDirection1.applyMatrix4(tempObject.matrix);
  yDirection1.applyMatrix4(tempObject.matrix);

  tempObject.rotation.set(0, 0, 0);
  tempObject.rotation.y = Math.PI / 2;
  tempObject.updateMatrix();
  xDirection2.applyMatrix4(tempObject.matrix);
  yDirection2.applyMatrix4(tempObject.matrix);
  tempObject.rotation.set(0, 0, 0);
  tempObject.rotation.z = -Math.PI / 2;
  tempObject.updateMatrix();
  xDirection2.applyMatrix4(tempObject.matrix);
  yDirection2.applyMatrix4(tempObject.matrix);

  // prettier-ignore
  const baseHookGeomId = fragments.editor.createCircleExtrusion(
    model.modelId,
    {
      radius: [baseHookThickness],
      axes: [
        {
          wires: [
            [ 0, 0.06, 0, 0, -0.6 + baseHookRadius, 0 ],
            [ baseHookRadius, -0.6, 0, 0.15 - baseHookRadius, -0.6, 0 ],
            [ 0.15, -0.6 + baseHookRadius, 0, 0.15, -0.5, 0 ],
          ],
          wireSets: [],
          circleCurves: [
          {
            aperture: Math.PI / 2,
            position: [baseHookRadius, -0.6 + baseHookRadius, 0],
            radius: baseHookRadius,
            xDirection: [xDirection1.x, xDirection1.y, xDirection1.z],
            yDirection: [yDirection1.x, yDirection1.y, yDirection1.z],
          },
          {
            aperture: Math.PI / 2,
            position: [0.15-baseHookRadius, -0.6 + baseHookRadius, 0],
            radius: baseHookRadius,
            xDirection: [xDirection2.x, xDirection2.y, xDirection2.z],
            yDirection: [yDirection2.x, yDirection2.y, yDirection2.z],
          }
        ],
          order: [0, 1, 2, 0, 1],
          parts: [FRAGS.AxisPartClass.WIRE, FRAGS.AxisPartClass.WIRE, FRAGS.AxisPartClass.WIRE, FRAGS.AxisPartClass.CIRCLE_CURVE, FRAGS.AxisPartClass.CIRCLE_CURVE],
        },
      ],
    },
  );

  // PROFILES

  const profilePoints = geometryEngine.getProfilePoints({
    type: FRAGS.ProfileType.H,
    width: settings.columnWidth,
    depth: settings.columnLength,
    thickness: settings.columnThickness,
    flangeThickness: settings.columnFlangeThickness,
  });

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();

  const wirePoints = wireGeom.attributes.position.array;
  for (let i = 0; i < wirePoints.length; i += 6) {
    const x1 = wirePoints[i];
    const y1 = wirePoints[i + 1];
    const z1 = wirePoints[i + 2];
    const x2 = wirePoints[i + 3];
    const y2 = wirePoints[i + 4];
    const z2 = wirePoints[i + 5];
    p1.set(x1, y1, z1);
    p2.set(x2, y2, z2);

    // Create base plate
    if (y1 === 0 || y2 === 0) {
      // Add base plate
      const isFirst = y1 === 0;
      const x = isFirst ? x1 : x2;
      const y = isFirst ? y1 : y2;
      const z = isFirst ? z1 : z2;
      basePlateMesh.position.set(x, y, z);
      basePlateMesh.updateMatrix();

      elementsData.push({
        attributes: {
          _category: {
            value: "test",
          },
        },
        globalTransform: basePlateMesh.matrix.clone(),
        samples: [
          {
            localTransform: ltId,
            representation: basePlateGeomId,
            material: matId,
          },
        ],
      });

      // Add base cross plates

      const cpOffset = 0.1;
      for (let i = 0; i < 2; i++) {
        const height = -settings.basePlateCrossHeight;
        const offset = i === 0 ? -cpOffset : cpOffset;
        baseCrossPlateMesh.position.set(x + offset, height, z);
        baseCrossPlateMesh.updateMatrix();
        elementsData.push({
          attributes: {
            _category: {
              value: "test",
            },
          },
          globalTransform: baseCrossPlateMesh.matrix.clone(),
          samples: [
            {
              localTransform: ltId,
              representation: baseCrossPlateGeomId,
              material: matId,
            },
          ],
        });
      }

      const cOffset =
        settings.basePlateSize / 2 - settings.basePlateCornerSize / 2;

      const cornerOffsets: THREE.Vector3[] = [
        new THREE.Vector3(cOffset, 0, cOffset),
        new THREE.Vector3(-cOffset, 0, cOffset),
        new THREE.Vector3(cOffset, 0, -cOffset),
        new THREE.Vector3(-cOffset, 0, -cOffset),
      ];

      let cornerIndex = 0;
      for (const offset of cornerOffsets) {
        // Add corner plate
        cornerPlateMesh.position.set(x, y + settings.basePlateThickness, z);
        cornerPlateMesh.position.add(offset);
        cornerPlateMesh.updateMatrix();
        elementsData.push({
          attributes: {
            _category: {
              value: "test",
            },
          },
          globalTransform: cornerPlateMesh.matrix.clone(),
          samples: [
            {
              localTransform: ltId,
              representation: cornerPlateGeomId,
              material: matId,
            },
          ],
        });

        // Add base bolt
        boltHeadMesh.position.set(x, y + settings.basePlateThickness, z);
        boltHeadMesh.position.add(offset);
        boltHeadMesh.updateMatrix();
        elementsData.push({
          attributes: {
            _category: {
              value: "test",
            },
          },
          globalTransform: boltHeadMesh.matrix.clone(),
          samples: [
            {
              localTransform: ltId,
              representation: baseBoltGeomId,
              material: matId,
            },
          ],
        });

        // Add base hook
        tempObject.position.copy(boltHeadMesh.position);
        tempObject.rotation.set(0, 0, 0);
        if (cornerIndex === 0 || cornerIndex === 2) {
          tempObject.rotation.y = Math.PI;
        }
        tempObject.updateMatrix();
        elementsData.push({
          attributes: {
            _category: {
              value: "test",
            },
          },
          globalTransform: tempObject.matrix.clone(),
          samples: [
            {
              localTransform: ltId,
              representation: baseHookGeomId,
              material: matId,
            },
          ],
        });
        cornerIndex++;
      }
    }

    const direction = p2.clone().sub(p1).normalize();

    tempObject.position.copy(p1);
    tempObject.lookAt(p2);
    tempObject.position.set(0, 0, 0);
    tempObject.updateMatrix();

    const transfomedProfilePoints = geometryEngine.transformPoints(
      [...profilePoints],
      tempObject.matrix.clone(),
    );

    // prettier-ignore
    geometryEngine.getExtrusion(steelElementGeometry, {
      profilePoints: transfomedProfilePoints,
      direction: [direction.x, direction.y, direction.z],
      length: p1.distanceTo(p2),
    });

    const steelElementGeomId = fragments.editor.createShell(
      model.modelId,
      steelElementGeometry,
    );

    tempObject.position.copy(p1);
    tempObject.rotation.set(0, 0, 0);
    tempObject.updateMatrix();

    elementsData.push({
      attributes: {
        _category: {
          value: "test",
        },
      },
      globalTransform: tempObject.matrix.clone(),
      samples: [
        {
          localTransform: ltId,
          representation: steelElementGeomId,
          material: matId,
        },
      ],
    });
  }

  await fragments.editor.createElements(model.modelId, elementsData);

  await fragments.update(true);

  processing = false;
};

let lastUpdate: any = null;
const maxUpdateRate = 1000; // ms
const requestFragmentsUpdate = () => {
  if (processing) {
    return;
  }
  processing = true;

  if (lastUpdate) {
    clearTimeout(lastUpdate);
  }
  lastUpdate = setTimeout(() => {
    regenerateFragments();
  }, maxUpdateRate);
};

/* MD
  ### 🏗️ Model Regeneration
  This function regenerates the entire steel structure including the wireframe geometry. It calculates all the structural connections and creates the appropriate steel element configurations:

  :::info Steel Structure Types
  We'll create various steel elements including main frames, transversal beams, base plates, connection details, and bolts. Each element has specific geometric requirements and connection details.
  :::
*/

const regenerate = () => {
  const points: THREE.Vector3[] = [];

  const lengthDistance = settings.length / settings.lengthModules;

  // Main frame

  for (let i = 0; i < settings.lengthModules; i++) {
    for (let j = 0; j < settings.startPoints.length; j++) {
      const point = settings.startPoints[j];
      const [x, y, z] = point;
      const offsetZ = z + lengthDistance * i;
      points.push(new THREE.Vector3(x, y, offsetZ));
    }
  }

  // Transversal beams

  for (let i = 0; i < settings.lengthModules - 1; i++) {
    for (let j = 0; j < settings.startPoints.length; j++) {
      const point = settings.startPoints[j];
      const [x1, y1, z1] = point;
      if (y1 === 0) {
        // We don't want transversal beams on the ground
        continue;
      }
      const offsetZ = z1 + lengthDistance * i;
      const x2 = x1;
      const y2 = y1;
      const z2 = offsetZ + lengthDistance;
      points.push(new THREE.Vector3(x1, y1, offsetZ));
      points.push(new THREE.Vector3(x2, y2, z2));
    }
  }

  wireGeom.deleteAttribute("position");
  wireGeom.setFromPoints(points);

  requestFragmentsUpdate();
};

regenerate();

/* MD
  ### 🧩 Adding User Interface
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">

      <bim-panel-section label="Controls">

      <bim-number-input label="Length Modules" slider min=2 max=10 step=1 value=${settings.lengthModules} @change=${(
        e: any,
      ) => {
        settings.lengthModules = e.target.value;
        regenerate();
      }}></bim-number-input>

      <bim-number-input label="Length" slider min=10 max=100 step=1 value=${settings.length} @change=${(
        e: any,
      ) => {
        settings.length = e.target.value;
        regenerate();
      }}></bim-number-input>
      

      </bim-panel-section>

    </bim-panel>
  `;
}, {});

document.body.append(panel);

/* MD
  ### 📱 Mobile-Friendly Menu
  We will make some logic that adds a button to the screen when the user is visiting our app from their phone, allowing to show or hide the menu. Otherwise, the menu would make the app unusable.
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
  ### ⏱️ Measuring the Performance (optional)
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
  You've successfully learned how to create detailed steel structures using the Fragments API! 🚀
  Now you can create parametric steel frames with customizable dimensions, connections, and detailing. Ready to explore more? Check out our other tutorials to unlock the full potential of Fragments! 💡
*/
