/* MD
  ## Building a Configurator 🤏
  ---
  In this tutorial, we'll learn how to build a configurator using the Fragments API. We'll define some basic parameters (like building width and length) and generate one or multiple floors of a simple building based on them. Let’s dive in!
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as WEBIFC from "web-ifc";
import Stats from "stats.js";
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from "../../../index";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
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

const prevBackground = world.scene.three.background;

await world.scene.updateShadows();

world.camera.controls.addEventListener("rest", async () => {
  await world.scene.updateShadows();
});

const axes = new THREE.AxesHelper(1);
world.scene.three.add(axes);

/* MD
  We will also define some settings that will be used to create the building.
*/

const settings = {
  width: 20,
  length: 30,
  columnLengthDistance: 5,
  columnWidthDistance: 5,
  floorHeight: 4,
  exteriorColumnWidth: 0.5,
  exteriorColumnLength: 0.5,
  interiorColumnWidth: 0.25,
  interiorColumnLength: 0.25,
  floorThickness: 0.3,
  numberOfFloors: 10,
  clipPlaneHeight: 1.5,
  windowHeight: 2,
  windowWidth: 1,
  roofHeight: 2,
};

/* MD
  :::info Do I need @thatopen/components?

  Not necessarily! While @thatopen/components simplifies the process of setting up a scene, you can always use plain ThreeJS to create your own custom scene setup. It's entirely up to your preference and project requirements! 😉

  :::

  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start manipulating them with ease:
*/

const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl);

// Temp until we publish the libraries, to be able to use postproduction
// @ts-ignore

fragments.core.settings.graphicsQuality = 1;

world.camera.controls.addEventListener("control", () => {
  fragments.core.update();
});

// Once a model is available in the list, we can tell it
// to use shadows and to use the clipping planes we are using
fragments.core.models.list.onItemSet.add(({ value: model }) => {
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
  ### 📐 Setting Up a global clipping plane
  Now, let's set up a global clipping plane. We'll use it to clip the building and see inside the floors.

  :::info Clipping Planes?

  If you are unfamiliar with this API, check out the Clipping Planes and the ClipStyler tutorials!

  :::
*/

const clipper = components.get(OBC.Clipper);

const clipStyler = components.get(OBF.ClipStyler);
clipStyler.world = world;

const fillsMaterial = new THREE.MeshBasicMaterial({
  color: 0x222222,
  side: 2,
});

world.renderer!.postproduction.excludedObjectsEnabled = true;
world.renderer!.postproduction.excludedObjectsPass.addExcludedMaterial(
  fillsMaterial,
);

clipStyler.styles.set("BlackFill", {
  fillsMaterial,
});

const planeId = clipper.createFromNormalAndCoplanarPoint(
  world,
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, settings.clipPlaneHeight, 0),
);

const plane = clipper.list.get(planeId)!;
plane.visible = false;

let edges: OBF.ClipEdges | null = null;

const clearEdges = () => {
  const keys = [...clipStyler.list.keys()];
  for (const key of keys) clipStyler.list.delete(key);
  clipStyler.list.clear();

  edges = clipStyler.createFromClipping(planeId, {
    items: { All: { style: "BlackFill" } },
  });
};

let planeTimeOut: any = null;
const planeTimeBuffer = 1000;
const updateClipPlane = () => {
  plane.setFromNormalAndCoplanarPoint(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, settings.clipPlaneHeight, 0),
  );
  plane.update();

  if (planeTimeOut) {
    clearTimeout(planeTimeOut);
  }
  planeTimeOut = setTimeout(() => {
    plane.onDraggingEnded.trigger();
    if (edges) {
      edges.three.frustumCulled = false;
      for (const child of edges.three.children) {
        child.frustumCulled = false;
      }
    }
  }, planeTimeBuffer);
};

/* MD
  ### 📂 Create a new Fragments Model
  Now, let's create a new empty Fragments model. We'll use it to store the building geometry.
*/

const bytes = FRAGS.EditUtils.newModel({ raw: true });
const model = await fragments.core.load(bytes, {
  modelId: "example",
  camera: world.camera.three,
  raw: true,
});

world.scene.three.add(model.object);
await fragments.core.update(true);

/* MD
  ### 🧊 Setting up the Geometry Engine
  
  Now, let's set up the Geometry Engine. We'll use it to generate the building geometry.

  :::warning Geometry Engine?

  The Geometry Engine is a library that allows us to easily generate geometry parametrically using the Fragments API.

  :::
*/

const api = new WEBIFC.IfcAPI();
api.SetWasmPath("https://unpkg.com/web-ifc@0.0.74/", true);
await api.Init();
const geometryEngine = new FRAGS.GeometryEngine(api);

/* MD
  ### 🔧 Creating Basic Geometries
  Now we'll create all the basic geometries that will be used to construct our building. These include materials, floor, columns, walls, windows, and more:
*/

// Materials

const defaultMat = new THREE.MeshLambertMaterial({ color: "white", side: 2 });

// Floor

const ground = new THREE.Mesh<
  THREE.BufferGeometry,
  THREE.MeshLambertMaterial | THREE.MeshBasicMaterial
>(new THREE.BufferGeometry(), defaultMat);

world.scene.three.add(ground);
ground.receiveShadow = true;
ground.frustumCulled = false;

// Grid

// Column

const exteriorColumnGeometry = new THREE.BufferGeometry();
const interiorColumnGeometry = new THREE.BufferGeometry();
const cornerWallGeometry = new THREE.BufferGeometry();
const windowFrameGeometry = new THREE.BufferGeometry();
const windowTopGeometry = new THREE.BufferGeometry();
const roofTopGeometry = new THREE.BufferGeometry();
const floorGeometry = new THREE.BufferGeometry();
const cutFloorGeometry = new THREE.BufferGeometry();
const staircaseHoleGeometry = new THREE.BufferGeometry();

const staircaseWallGeometry1 = new THREE.BufferGeometry();
const staircaseWallGeometry2 = new THREE.BufferGeometry();

/* MD
  ### 🏗️ Building Generation Logic
  Now let's define the main function that will regenerate the building fragments based on our settings. This function will create all the building elements and position them correctly:
*/

let processing = false;

// We'll use this for boolean operations

// Corner cuts
const fullFloorMesh = new THREE.Mesh(floorGeometry);
const corner1Mesh = new THREE.Mesh(exteriorColumnGeometry);
const corner2Mesh = new THREE.Mesh(exteriorColumnGeometry);
const corner3Mesh = new THREE.Mesh(exteriorColumnGeometry);
const corner4Mesh = new THREE.Mesh(exteriorColumnGeometry);

const staircaseHoleMesh = new THREE.Mesh(staircaseHoleGeometry);

const regenerateFragments = async () => {
  const elementsData: FRAGS.NewElementData[] = [];

  await fragments.core.editor.reset(model.modelId);

  // Create floor

  const floorPadding = 10;
  const fw = settings.width + floorPadding * 2;
  const fl = settings.length + floorPadding * 2;

  // prettier-ignore
  geometryEngine.getExtrusion(ground.geometry, {
  profilePoints: [
    0, 0, 0,
    0, 0, fl,
    fw, 0, fl,
    fw, 0, 0,
    0, 0, 0,
  ],
  direction: [0, 1, 0],
  cap: true,
  length: settings.floorThickness,
});

  ground.position.y = -settings.floorThickness;
  ground.position.x = -floorPadding;
  ground.position.z = -floorPadding;
  ground.geometry.computeBoundingBox();

  // Create base items

  const matId = fragments.core.editor.createMaterial(
    model.modelId,
    new THREE.MeshLambertMaterial({
      color: new THREE.Color(1, 1, 1),
      side: THREE.DoubleSide,
    }),
  );

  const ltId = fragments.core.editor.createLocalTransform(
    model.modelId,
    new THREE.Matrix4().identity(),
  );

  // CREATE GEOMETRIES

  /* MD
    ### 📐 Geometry Creation Process
    Now we'll create all the individual geometries that make up our building. This includes exterior columns, interior columns, walls, windows, floors, and more. Each geometry is carefully calculated based on our building parameters:
  */

  const w = settings.width;
  const l = settings.length;

  const corners = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(settings.width, 0, 0),
    new THREE.Vector3(settings.width, 0, settings.length),
    new THREE.Vector3(0, 0, settings.length),
    new THREE.Vector3(0, 0, 0), // Repeating this make facade iteration easier
  ];

  const extColumnX = settings.width - settings.exteriorColumnWidth;
  const extColumnZ = settings.length - settings.exteriorColumnLength;

  const exteriorColumnPositions: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(extColumnX, 0, 0),
    new THREE.Vector3(extColumnX, 0, extColumnZ),
    new THREE.Vector3(0, 0, extColumnZ),
  ];

  // Exterior column

  const ecl = settings.exteriorColumnLength;
  const ecw = settings.exteriorColumnWidth;
  // prettier-ignore
  geometryEngine.getExtrusion(exteriorColumnGeometry, {
    profilePoints: [
      0, 0, 0,
      0, 0, ecl,
      ecw, 0, ecl,
      ecw, 0, 0,
    ],
    direction: [0, 1, 0],
    cap: true,
    length: settings.floorHeight,
  });

  const extColumnGeoId = fragments.core.editor.createShell(
    model.modelId,
    exteriorColumnGeometry,
  );

  // Corner wall

  // Windows are 1 m wide, so we need this to solve the corners

  const cwLength = settings.exteriorColumnLength * 2;
  const cwWidth = 1 - ecw;

  // prettier-ignore
  geometryEngine.getExtrusion(cornerWallGeometry, {
    profilePoints: [
      0, 0, 0,
      0, 0, cwLength,
      cwWidth, 0, cwLength,
      cwWidth, 0, 0,
      0, 0, 0,
    ],
    direction: [0, 1, 0],
    length: settings.floorHeight,
  });

  const cornerWallGeoId = fragments.core.editor.createShell(
    model.modelId,
    cornerWallGeometry,
  );

  // Interior column

  const icProfilePoints = geometryEngine.getProfilePoints({
    type: FRAGS.ProfileType.H,
    width: settings.interiorColumnWidth,
    depth: settings.interiorColumnLength,
    thickness: 0.03,
    flangeThickness: 0.02,
  });

  const icProfilePointsHorizontal = geometryEngine.transformPoints(
    icProfilePoints,
    new THREE.Matrix4().makeRotationX(Math.PI / 2),
  );

  // prettier-ignore
  geometryEngine.getExtrusion(interiorColumnGeometry, {
    profilePoints: icProfilePointsHorizontal,
    direction: [0, 1, 0],
    length: settings.floorHeight - settings.floorThickness,
  });

  const intColumnGeoId = fragments.core.editor.createShell(
    model.modelId,
    interiorColumnGeometry,
  );

  // Staircase hole

  const stairCaseWidth = 3;
  const stairCaseLength = 5;

  // prettier-ignore
  geometryEngine.getExtrusion(staircaseHoleGeometry, {
    profilePoints: [
      0, 0, 0,
      0, 0, stairCaseLength,
      stairCaseWidth, 0, stairCaseLength,
      stairCaseWidth, 0, 0,
    ],
    direction: [0, 1, 0],
    length: 1,
  });

  staircaseHoleMesh.position.set(0, -0.5, 0);

  // Staircase walls

  const wallThickness = 0.2;

  // prettier-ignore
  geometryEngine.getWall(staircaseWallGeometry1, {
    start: [stairCaseWidth, 0, settings.windowWidth],
    end: [stairCaseWidth, settings.floorHeight - settings.floorThickness, stairCaseLength + wallThickness / 2],
    direction: [0, 1, 0],
    elevation: 0,
    offset: 0,
    thickness: wallThickness,
    cuttingPlaneNormal: [0, 0, 0],
    cuttingPlanePosition: [0, 0, 0],
    height: settings.floorHeight - settings.floorThickness,
  });

  const staircaseWall1GeoId = fragments.core.editor.createShell(
    model.modelId,
    staircaseWallGeometry1,
  );

  // prettier-ignore
  geometryEngine.getWall(staircaseWallGeometry2, {
    start: [0, 0, stairCaseLength],
    end: [stairCaseWidth - wallThickness / 2, 0, stairCaseLength],
    direction: [0, 1, 0],
    elevation: 0,
    offset: 0,
    thickness: wallThickness,
    cuttingPlaneNormal: [0, 0, 0],
    cuttingPlanePosition: [0, 0, 0],
    height: settings.floorHeight - settings.floorThickness,
  });

  const staircaseWall2GeoId = fragments.core.editor.createShell(
    model.modelId,
    staircaseWallGeometry2,
  );

  // Floor

  // prettier-ignore
  geometryEngine.getExtrusion(floorGeometry, {
    profilePoints: [
      0, 0, 0,
      0, 0, l,
      w, 0, l,
      w, 0, 0,
    ],
    direction: [0, 1, 0],
    cap: true,
    length: settings.floorThickness,
  });

  // Subtract floor corners with columns using booleans

  corner1Mesh.position.copy(exteriorColumnPositions[0]);
  corner2Mesh.position.copy(exteriorColumnPositions[1]);
  corner3Mesh.position.copy(exteriorColumnPositions[2]);
  corner4Mesh.position.copy(exteriorColumnPositions[3]);
  fullFloorMesh.updateMatrixWorld(true);
  corner1Mesh.updateMatrixWorld(true);
  corner2Mesh.updateMatrixWorld(true);
  corner3Mesh.updateMatrixWorld(true);
  corner4Mesh.updateMatrixWorld(true);
  staircaseHoleMesh.updateMatrixWorld(true);
  geometryEngine.getBooleanOperation(cutFloorGeometry, {
    target: fullFloorMesh,
    operands: [
      corner1Mesh,
      corner2Mesh,
      corner3Mesh,
      corner4Mesh,
      staircaseHoleMesh,
    ],
    type: "DIFFERENCE",
  });

  const tempMesh6 = new THREE.Mesh(cutFloorGeometry, defaultMat);
  world.scene.three.add(tempMesh6);
  tempMesh6.position.y += 10;

  const floorGeoId = fragments.core.editor.createShell(
    model.modelId,
    cutFloorGeometry,
  );

  // Window frame

  // prettier-ignore
  geometryEngine.getSweep(windowFrameGeometry, {
    profilePoints: [
      0, 0, 0,
      0.1, 0, 0,
      0.1, 0.1, 0,
      0, 0.1, 0,
      0, 0, 0,
    ],
    curvePoints: [
      0, 0, 0,
      0, settings.windowHeight, 0,
      settings.windowWidth, settings.windowHeight, 0,
      settings.windowWidth, 0, 0,
      0, 0, 0,
    ],
  });

  const windowFrameGeoId = fragments.core.editor.createShell(
    model.modelId,
    windowFrameGeometry,
  );

  // Window top

  const wtHeight = settings.floorHeight - settings.windowHeight;

  // prettier-ignore
  geometryEngine.getExtrusion(windowTopGeometry, {
      profilePoints: [
        0, 0, 0,
        0, wtHeight, 0,
        settings.windowWidth, wtHeight, 0,
        settings.windowWidth, 0, 0,
      ],
      direction: [0, 0, 1],
      cap: true,
      length: settings.floorThickness,
    });

  const windowTopGeoId = fragments.core.editor.createShell(
    model.modelId,
    windowTopGeometry,
  );

  // Roof top

  const roofTopThickness = 0.15;
  const roofTopWidth = 0.2;

  // prettier-ignore
  geometryEngine.getSweep(roofTopGeometry, {
    profilePoints: [
      0, 0, 0,
      1, 0, 0,
      1, roofTopThickness, 0,
      0, roofTopThickness, 0,
      0, 0, 0,
    ],
    curvePoints: [
      0, 0, 0,
      0, 0, roofTopWidth,
      0, settings.windowHeight, roofTopWidth,
      0, settings.windowHeight, 0,
    ],
  });

  const roofTopGeoId = fragments.core.editor.createShell(
    model.modelId,
    roofTopGeometry,
  );

  // CREATE ELEMENTS

  /* MD
    ### 🏢 Element Assembly
    Now we'll create all the building elements by positioning our geometries throughout the building. This includes placing columns, floors, walls, windows, and other structural elements at the correct locations:
  */

  const tempObject = new THREE.Object3D();

  // Exterior columns

  for (const position of exteriorColumnPositions) {
    for (let i = 0; i < settings.numberOfFloors; i++) {
      tempObject.position.copy(position);
      tempObject.position.y = i * settings.floorHeight;
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
            representation: extColumnGeoId,
            material: matId,
          },
        ],
      });
    }
  }

  // Interior columns

  const interiorColumnPositions: THREE.Vector3[] = [];

  const icLenthCount = Math.floor(
    settings.length / settings.columnLengthDistance,
  );

  const icWidthCount = Math.floor(
    settings.width / settings.columnWidthDistance,
  );

  for (let i = 0; i <= icLenthCount; i++) {
    const z = i * settings.columnLengthDistance;
    for (let j = 0; j <= icWidthCount; j++) {
      const isCorner1 = i === 0 && j === 0;
      const isCorner2 = i === 0 && j === icWidthCount;
      const isCorner3 = i === icLenthCount && j === 0;
      const isCorner4 = i === icLenthCount && j === icWidthCount;

      if (isCorner1 || isCorner2 || isCorner3 || isCorner4) {
        continue;
      }

      const x = j * settings.columnWidthDistance;
      interiorColumnPositions.push(new THREE.Vector3(x, 0, z));
    }
  }

  for (const position of interiorColumnPositions) {
    for (let i = 0; i < settings.numberOfFloors; i++) {
      tempObject.position.copy(position);
      tempObject.position.y = i * settings.floorHeight;
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
            representation: intColumnGeoId,
            material: matId,
          },
        ],
      });
    }
  }

  // Floors

  for (let i = 0; i < settings.numberOfFloors; i++) {
    const fh = (i + 1) * settings.floorHeight - settings.floorThickness;
    tempObject.position.set(0, fh, 0);
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
          representation: floorGeoId,
          material: matId,
        },
      ],
    });
  }

  // Staircase walls

  for (let i = 0; i < settings.numberOfFloors; i++) {
    tempObject.position.set(0, i * settings.floorHeight, 0);
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
          representation: staircaseWall1GeoId,
          material: matId,
        },
      ],
    });

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
          representation: staircaseWall2GeoId,
          material: matId,
        },
      ],
    });

    // We'll reuse the window frame for the door

    tempObject.position.set(
      stairCaseWidth,
      i * settings.floorHeight,
      settings.windowWidth,
    );

    tempObject.rotation.y = Math.PI / 2;
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
          representation: windowFrameGeoId,
          material: matId,
        },
      ],
    });

    tempObject.position.y += settings.windowHeight;
    tempObject.position.x -= 0.1;
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
          representation: windowTopGeoId,
          material: matId,
        },
      ],
    });
  }

  // Corner walls

  for (let j = 0; j < settings.numberOfFloors; j++) {
    for (let i = 0; i < corners.length - 1; i++) {
      const corner = corners[i];
      const nextCorner = corners[i + 1];
      const direction = nextCorner.clone().sub(corner).normalize();
      const distance = corner.distanceTo(nextCorner);

      const dirNormal = new THREE.Vector3();
      dirNormal.crossVectors(direction, new THREE.Vector3(0, 1, 0));

      tempObject.position.copy(corner);
      tempObject.lookAt(nextCorner);
      tempObject.rotateY(-Math.PI / 2);
      tempObject.position.add(
        direction.clone().multiplyScalar(settings.exteriorColumnLength),
      );
      tempObject.position.add(
        dirNormal.clone().multiplyScalar(-settings.exteriorColumnWidth / 2),
      );
      tempObject.position.y = j * settings.floorHeight;
      tempObject.updateMatrix();

      // First wall

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
            representation: cornerWallGeoId,
            material: matId,
          },
        ],
      });

      // Second wall

      // We subtract 2 because the first and last windows that are missing
      const offsetToNextCornerWall = distance - 2 + cwWidth;

      tempObject.position.add(
        direction.clone().multiplyScalar(offsetToNextCornerWall),
      );

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
            representation: cornerWallGeoId,
            material: matId,
          },
        ],
      });
    }
  }

  // Window frames and tops

  // Windows are 1m wide, so each meter has one window

  for (let k = 0; k < settings.numberOfFloors; k++) {
    for (let i = 0; i < corners.length - 1; i++) {
      const corner = corners[i];
      const nextCorner = corners[i + 1];
      const distance = corner.distanceTo(nextCorner);
      const direction = nextCorner.clone().sub(corner).normalize();

      for (let j = 1; j < distance - 1; j++) {
        tempObject.position.copy(corner);
        tempObject.lookAt(nextCorner);
        tempObject.rotateY(-Math.PI / 2);
        tempObject.position.add(direction.clone().multiplyScalar(j));
        tempObject.position.y = k * settings.floorHeight;
        tempObject.updateMatrix();

        const norDir = new THREE.Vector3();
        norDir.crossVectors(direction, new THREE.Vector3(0, 1, 0));

        // Window frame

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
              representation: windowFrameGeoId,
              material: matId,
            },
          ],
        });

        // Window top

        tempObject.position.y += settings.windowHeight;
        tempObject.position.add(norDir.clone().multiplyScalar(-0.3));
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
              representation: windowTopGeoId,
              material: matId,
            },
          ],
        });
      }
    }
  }

  // Roof

  for (let i = 0; i < corners.length - 1; i++) {
    const corner = corners[i];
    const nextCorner = corners[i + 1];
    const distance = corner.distanceTo(nextCorner);
    const direction = nextCorner.clone().sub(corner).normalize();

    for (let j = 0; j < distance; j++) {
      tempObject.position.copy(corner);
      tempObject.lookAt(nextCorner);
      tempObject.rotateY(Math.PI / 2);
      tempObject.position.add(direction.clone().multiplyScalar(j));
      tempObject.position.y = settings.floorHeight * settings.numberOfFloors;
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
            representation: roofTopGeoId,
            material: matId,
          },
        ],
      });
    }
  }

  await fragments.core.editor.createElements(model.modelId, elementsData);

  clearEdges();

  await fragments.core.update(true);

  processing = false;
};

/* MD
    ### 🎯 Final Steps
    Once all elements are created, we update the fragments model and clear any processing flags to prepare for the next regeneration cycle.
  */

await regenerateFragments();

/* MD
  ### 🔄 Update Management
  To ensure smooth performance, we'll implement a throttled update system that prevents excessive regeneration of the building when parameters change rapidly:
*/

let lastUpdate: any = null;
const maxUpdateRate = 1000; // ms
const requestFragmentsUpdate = async () => {
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
  ### 🎯 View Mode Management
  We'll implement different view modes to allow users to switch between 3D model view and floor plan view, enhancing the user experience:
*/

enum ViewMode {
  MODEL,
  PLAN,
}

const viewModes: [ViewMode, string][] = [
  [ViewMode.MODEL, "Model"],
  [ViewMode.PLAN, "Plan"],
];

const updateCamera = (
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
) => {
  for (const [, model] of fragments.core.models.list) {
    model.useCamera(camera);
  }
  world.renderer!.postproduction.updateCamera();
};

let viewMode = ViewMode.MODEL;
const setViewMode = async (mode: ViewMode) => {
  viewMode = mode;
  if (viewMode === ViewMode.MODEL) {
    world.camera.controls.setLookAt(5, 5, 5, 0, 0, 0);
    await world.camera.projection.set("Perspective");
    await world.camera.set("Orbit");
    world.scene.three.background = prevBackground;
    world.renderer!.postproduction.style = OBF.PostproductionAspect.COLOR_PEN;
    world.scene.shadowsEnabled = true;
    updateCamera(world.camera.three);
  } else {
    world.camera.controls.setLookAt(5, 5, 5, 5, 0, 5);
    await world.camera.projection.set("Orthographic");
    await world.camera.set("Plan");
    world.renderer!.postproduction.style = OBF.PostproductionAspect.PEN;
    world.scene.three.background = null;
    world.scene.shadowsEnabled = false;
    updateCamera(world.camera.three);
  }
};

/* MD
  ### 🧩 Adding User Interface
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">

      <bim-panel-section label="Controls">

      <bim-dropdown label="View mode" @change=${(e: any) => {
        setViewMode(e.target.value[0]);
      }}>
        ${viewModes.map(([key, value]) => BUI.html`<bim-option label=${value} ?checked=${key === ViewMode.MODEL} value=${key}></bim-option>`)}
      </bim-dropdown>

      <bim-number-input label="Width" slider min=20 max=50 step=1 value=${settings.width} @change=${(
        e: any,
      ) => {
        settings.width = e.target.value;
        requestFragmentsUpdate();
      }}></bim-number-input>

      <bim-number-input label="Length" slider min=20 max=50 step=1 value=${settings.length} @change=${(
        e: any,
      ) => {
        settings.length = e.target.value;
        requestFragmentsUpdate();
      }}></bim-number-input>

      <bim-number-input label="Floor Height" slider min=3 max=5 step=0.1 value=${settings.floorHeight} @change=${(
        e: any,
      ) => {
        settings.floorHeight = e.target.value;
        requestFragmentsUpdate();
      }}></bim-number-input>

      <bim-number-input label="Number of floors" slider min=2 max=40 step=1 value=${settings.numberOfFloors} @change=${(
        e: any,
      ) => {
        settings.numberOfFloors = e.target.value;
        requestFragmentsUpdate();
      }}></bim-number-input>

      <bim-number-input label="Column Length Distance" slider min=5 max=10 step=1 value=${settings.columnLengthDistance} @change=${(
        e: any,
      ) => {
        settings.columnLengthDistance = e.target.value;
        requestFragmentsUpdate();
      }}></bim-number-input>
      
      <bim-number-input label="Column Width Distance" slider min=5 max=10 step=1 value=${settings.columnWidthDistance} @change=${(
        e: any,
      ) => {
        settings.columnWidthDistance = e.target.value;
        requestFragmentsUpdate();
      }}></bim-number-input>

      <bim-number-input label="Clip Plane Height" slider min=0 max=100 step=0.1 value=${settings.clipPlaneHeight} @change=${(
        e: any,
      ) => {
        settings.clipPlaneHeight = e.target.value;
        updateClipPlane();
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
  You've successfully built a building configurator using the Fragments API! 🚀
  Now you can create parametric buildings with customizable dimensions, floors, and structural elements. Ready to explore more? Check out our other tutorials to unlock the full potential of Fragments! 💡
*/
