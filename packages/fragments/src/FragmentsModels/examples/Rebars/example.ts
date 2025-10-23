/* MD
  ## Working with Rebars 🔩
  ---
  In this tutorial, we'll explore how to create and work with reinforced concrete elements using the Fragments API. We'll learn how to generate column and footing rebars with proper spacing, colors, and geometric relationships. Let's dive in!
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as WEBIFC from "web-ifc";
import * as FRAGS from "../../../index";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the reinforced concrete elements with proper lighting and shadows:
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

world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);

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

// Add axes helper
const axesHelper = new THREE.AxesHelper();
world.scene.three.add(axesHelper);

/* MD
  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start working with reinforced concrete elements:
*/

// prettier-ignore
const workerUrl = "../../src/multithreading/fragments-thread.ts";
// const workerUrl = "../../dist/Worker/worker.mjs";
const fragments = new FRAGS.FragmentsModels(workerUrl);

world.camera.controls.addEventListener("control", () => fragments.update());

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

  for (const child of model.object.children) {
    child.castShadow = true;
    child.receiveShadow = true;
  }
});

/* MD
  ### 📂 Creating a New Fragments Model
  We'll create a new empty Fragments model to store our reinforced concrete elements. This model will be built programmatically with concrete and rebar elements:
*/

const bytes = FRAGS.EditUtils.newModel({ raw: true });
const model = await fragments.load(bytes, {
  modelId: "example",
  camera: world.camera.three,
  raw: true,
});

world.scene.three.add(model.object);

await fragments.update(true);

/* MD
  ### 🧊 Setting up the Geometry Engine
  Now, let's set up the Geometry Engine. We'll use it to generate the concrete and rebar geometries:

  :::warning Geometry Engine?
  The Geometry Engine is a library that allows us to easily generate geometry parametrically using the Fragments API.
  :::
*/

const api = new WEBIFC.IfcAPI();
api.SetWasmPath("/node_modules/web-ifc/", false);
await api.Init();
const geometryEngine = new FRAGS.GeometryEngine(api);

/* MD
  ### ⚙️ Configuration Settings
  We'll define all the parameters that control the dimensions and properties of our reinforced concrete elements. These settings will allow us to create customizable footings and columns with proper rebar placement:
*/

const settings = {
  footingWidth: 1,
  footingLength: 1,
  footingHeight: 0.4,
  columnHeight: 1,
  columnWidth: 0.3,
  columnLength: 0.3,
  columnPadding: 0.05,
  bottomPadding: 0.05,
  columnLongRebarRadius: 0.01,
  columnTransRebarRadius: 0.01,
  columnTransRebarOffset: 0.15,
  transOverlap: 0.1,
  topColumnRebarOffset: 0.3,
  footingRebarRadius: 0.01,
  footingRebarOffset: 0.15,
  footingOverlap: 0.1,
  footingBendRadius: 0.05,
};

const temp = {
  clrx1: 0, // Column Long Rebar X1
  clrx2: 0, // Column Long Rebar X2
  cBottom: 0, // Column Bottom
  clrz1: 0, // Column Long Rebar Z1
  clrz2: 0, // Column Long Rebar Z2
  cTop: 0, // Column Top
};

const rebars: FRAGS.RawCircleExtrusion[] = [];
const materialMap = {
  red: "red",
  blue: "blue",
  green: "green",
};

enum Colors {
  RED,
  BLUE,
  GREEN,
}

const colors: Colors[] = [];

// Create lines geometry

const concreteMat = new THREE.MeshLambertMaterial({
  color: "gray",
  transparent: true,
  opacity: 1,
  side: THREE.DoubleSide,
});

const footing = new THREE.Mesh(new THREE.BufferGeometry(), concreteMat);
world.scene.three.add(footing);
footing.frustumCulled = false;

const column = new THREE.Mesh(new THREE.BufferGeometry(), concreteMat);
world.scene.three.add(column);
column.frustumCulled = false;

const wireGeom = new THREE.BufferGeometry();
const wireMat = new THREE.LineBasicMaterial({
  color: 0xff0000,
  depthTest: false,
});
const wireLines = new THREE.LineSegments(wireGeom, wireMat);
wireLines.frustumCulled = false;
world.scene.three.add(wireLines);

wireGeom.computeBoundingSphere();

// Reconstruct the fragments model

// const processing = false;

// Geometries

let timeout: any = null;

let updating = false;

const getLineRebar = (
  radius: number,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
) => {
  return {
    radius: [radius],
    axes: [
      {
        wires: [[x1, y1, z1, x2, y2, z2]],
        order: [0],
        parts: [FRAGS.AxisPartClass.WIRE],
        wireSets: [],
        circleCurves: [],
      },
    ],
  };
};

const getColumnTransRebar = (
  radius: number,
  height: number,
): FRAGS.RawCircleExtrusion => {
  //   p1 ---- p2
  // p8          p3
  // |           |
  // |           |
  // |           |
  // |           |
  // |           |
  // p7          p4
  //   p6 ---- p5

  const x1 = temp.clrx1;
  const z1 = temp.clrz1;
  const x2 = temp.clrx2;
  const z2 = temp.clrz2;
  const h = height;
  // Long Rebar Radius
  const ol = settings.columnLongRebarRadius;
  // Trans Rebar Radius
  const ot = settings.columnTransRebarRadius;

  const o = ol + ot;

  const p1x = x1;
  const p1z = z1 + o;
  const p2x = x2;
  const p2z = z1 + o;
  const p3x = x2 - o;
  const p3z = z1;
  const p4x = x2 - o;
  const p4z = z2;
  const p5x = x2;
  const p5z = z2 - o;
  const p6x = x1;
  const p6z = z2 - o;
  const p7x = x1 + o;
  const p7z = z2;
  const p8x = x1 + o;
  const p8z = z1;

  // We'll make the points for the overlap too
  const start1X = x1 + o;
  const start1Z = z1;
  const start2X = x1 + o;
  const start2Z = z1 - settings.transOverlap;

  const end1X = x1;
  const end1Z = z1 + o;
  const end2X = x1 - settings.transOverlap;
  const end2Z = z1 + o;

  const zRot = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
  const yRot = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
  const xDir1 = new THREE.Vector3(1, 0, 0);
  const yDir1 = new THREE.Vector3(0, 1, 0);
  xDir1.applyMatrix4(zRot);
  yDir1.applyMatrix4(zRot);

  const xDir2 = new THREE.Vector3(1, 0, 0);
  const yDir2 = new THREE.Vector3(0, 1, 0);
  xDir2.applyMatrix4(zRot);
  yDir2.applyMatrix4(zRot);
  xDir2.applyMatrix4(yRot);
  yDir2.applyMatrix4(yRot);

  const xDir3 = new THREE.Vector3(1, 0, 0);
  const yDir3 = new THREE.Vector3(0, 1, 0);
  xDir3.applyMatrix4(zRot);
  yDir3.applyMatrix4(zRot);
  xDir3.applyMatrix4(yRot);
  xDir3.applyMatrix4(yRot);
  yDir3.applyMatrix4(yRot);
  yDir3.applyMatrix4(yRot);

  const xDir4 = new THREE.Vector3(1, 0, 0);
  const yDir4 = new THREE.Vector3(0, 1, 0);
  xDir4.applyMatrix4(zRot);
  yDir4.applyMatrix4(zRot);
  xDir4.applyMatrix4(yRot);
  xDir4.applyMatrix4(yRot);
  xDir4.applyMatrix4(yRot);
  yDir4.applyMatrix4(yRot);
  yDir4.applyMatrix4(yRot);
  yDir4.applyMatrix4(yRot);

  return {
    radius: [radius],
    axes: [
      {
        wires: [
          [start1X, h, start1Z, start2X, h, start2Z],
          [p1x, h, p1z, p2x, h, p2z],
          [p3x, h, p3z, p4x, h, p4z],
          [p5x, h, p5z, p6x, h, p6z],
          [p7x, h, p7z, p8x, h - ot * 2, p8z],
          [end1X, h - ot * 2, end1Z, end2X, h - ot * 2, end2Z],
        ],
        order: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
        parts: [
          FRAGS.AxisPartClass.WIRE,
          FRAGS.AxisPartClass.CIRCLE_CURVE,
          FRAGS.AxisPartClass.WIRE,
          FRAGS.AxisPartClass.CIRCLE_CURVE,
          FRAGS.AxisPartClass.WIRE,
          FRAGS.AxisPartClass.CIRCLE_CURVE,
          FRAGS.AxisPartClass.WIRE,
          FRAGS.AxisPartClass.CIRCLE_CURVE,
          FRAGS.AxisPartClass.WIRE,
          FRAGS.AxisPartClass.CIRCLE_CURVE,
          FRAGS.AxisPartClass.WIRE,
        ],
        wireSets: [],
        circleCurves: [
          {
            aperture: Math.PI / 2,
            position: [x1, h, z1],
            radius: o,
            xDirection: [xDir4.x, xDir4.y, xDir4.z],
            yDirection: [yDir4.x, yDir4.y, yDir4.z],
          },
          {
            aperture: Math.PI / 2,
            position: [x2, h, z1],
            radius: o,
            xDirection: [xDir1.x, xDir1.y, xDir1.z],
            yDirection: [yDir1.x, yDir1.y, yDir1.z],
          },
          {
            aperture: Math.PI / 2,
            position: [x2, h, z2],
            radius: o,
            xDirection: [xDir2.x, xDir2.y, xDir2.z],
            yDirection: [yDir2.x, yDir2.y, yDir2.z],
          },
          {
            aperture: Math.PI / 2,
            position: [x1, h, z2],
            radius: o,
            xDirection: [xDir3.x, xDir3.y, xDir3.z],
            yDirection: [yDir3.x, yDir3.y, yDir3.z],
          },
          {
            aperture: Math.PI / 2,
            position: [x1, h - ot * 2, z1],
            radius: o,
            xDirection: [xDir4.x, xDir4.y, xDir4.z],
            yDirection: [yDir4.x, yDir4.y, yDir4.z],
          },
        ],
      },
    ],
  };
};

const getFootingRebar = (
  radius: number,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
) => {
  //  p1                  p6
  //  |                   |
  //  p2                 p5
  //  A p3 ---------- p4 B

  const bRadius = settings.footingBendRadius;
  const overlap = settings.footingOverlap;

  const a = new THREE.Vector3(x1, y1, z1);
  const b = new THREE.Vector3(x2, y2, z2);
  const dir = b.clone().sub(a.clone()).normalize();
  const up = new THREE.Vector3(0, 1, 0);

  const p1 = a.clone().add(up.clone().multiplyScalar(overlap));
  const p2 = a.clone().add(up.clone().multiplyScalar(bRadius));
  const p3 = a.clone().add(dir.clone().multiplyScalar(bRadius));
  const p4 = b.clone().sub(dir.clone().multiplyScalar(bRadius));
  const p5 = b.clone().add(up.clone().multiplyScalar(bRadius));
  const p6 = b.clone().add(up.clone().multiplyScalar(overlap));

  const c1 = a.clone();
  c1.y += bRadius;
  c1.add(dir.clone().multiplyScalar(bRadius));

  const c2 = b.clone();
  c2.y += bRadius;
  c2.sub(dir.clone().multiplyScalar(bRadius));

  let xDir1 = new THREE.Vector3(1, 0, 0);
  const yDir1 = new THREE.Vector3(0, 1, 0);
  let xDir2 = new THREE.Vector3(1, 0, 0);
  const yDir2 = new THREE.Vector3(0, 1, 0);

  const isZAxis = dir.x === 0 && dir.y === 0 && dir.z === 1;
  if (!isZAxis) {
    xDir1 = new THREE.Vector3(0, 0, 1);
    xDir2 = new THREE.Vector3(0, 0, 1);
  }

  if (isZAxis) {
    const xRotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    xDir1.applyMatrix4(xRotation);
    xDir1.applyMatrix4(xRotation);
    yDir1.applyMatrix4(xRotation);
    yDir1.applyMatrix4(xRotation);

    xDir2.applyMatrix4(xRotation);
    yDir2.applyMatrix4(xRotation);
  } else {
    const zRotation = new THREE.Matrix4().makeRotationZ(Math.PI / 2);

    xDir1.applyMatrix4(zRotation);
    yDir1.applyMatrix4(zRotation);

    xDir2.applyMatrix4(zRotation);
    yDir2.applyMatrix4(zRotation);
    xDir2.applyMatrix4(zRotation);
    yDir2.applyMatrix4(zRotation);
  }

  return {
    radius: [radius],
    axes: [
      {
        wires: [
          [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z],
          [p3.x, p3.y, p3.z, p4.x, p4.y, p4.z],
          [p5.x, p5.y, p5.z, p6.x, p6.y, p6.z],
        ],
        order: [0, 0, 1, 1, 2],
        parts: [
          FRAGS.AxisPartClass.WIRE,
          FRAGS.AxisPartClass.CIRCLE_CURVE,
          FRAGS.AxisPartClass.WIRE,
          FRAGS.AxisPartClass.CIRCLE_CURVE,
          FRAGS.AxisPartClass.WIRE,
        ],
        wireSets: [],
        circleCurves: [
          {
            aperture: Math.PI / 2,
            position: [c1.x, c1.y, c1.z],
            radius: bRadius,
            xDirection: [xDir1.x, xDir1.y, xDir1.z],
            yDirection: [yDir1.x, yDir1.y, yDir1.z],
          },
          {
            aperture: Math.PI / 2,
            position: [c2.x, c2.y, c2.z],
            radius: bRadius,
            xDirection: [xDir2.x, xDir2.y, xDir2.z],
            yDirection: [yDir2.x, yDir2.y, yDir2.z],
          },
        ],
      },
    ],
  };
};

/* MD
  ### 🔄 Fragment Regeneration Logic
  This function handles the regeneration of fragments when parameters change. It creates the necessary materials and processes all rebar elements with their assigned colors:
*/

const regenerateFragments = async () => {
  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(async () => {
    if (updating) {
      return;
    }
    updating = true;

    const elementsData: FRAGS.NewElementData[] = [];

    await fragments.editor.reset(model.modelId);
    fragments.settings.graphicsQuality = 1;

    const redMatId = fragments.editor.createMaterial(
      model.modelId,
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(1, 0, 0),
      }),
    );

    materialMap.red = redMatId;

    const blueMatId = fragments.editor.createMaterial(
      model.modelId,
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0, 0, 1),
      }),
    );

    materialMap.blue = blueMatId;

    const greenMatId = fragments.editor.createMaterial(
      model.modelId,
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0, 1, 0),
      }),
    );

    materialMap.green = greenMatId;

    const ltId = fragments.editor.createLocalTransform(
      model.modelId,
      new THREE.Matrix4().identity(),
    );

    let colorCounter = 0;
    for (const rebar of rebars) {
      const foundColor = colors[colorCounter];
      let colorId: string | null = null;
      if (foundColor === Colors.RED) {
        colorId = materialMap.red;
      } else if (foundColor === Colors.BLUE) {
        colorId = materialMap.blue;
      } else if (foundColor === Colors.GREEN) {
        colorId = materialMap.green;
      }
      if (!colorId) {
        throw new Error("Color not found");
      }
      colorCounter++;

      const rebarGeoId = fragments.editor.createCircleExtrusion(
        model.modelId,
        rebar,
      );

      const tempObject = new THREE.Object3D();

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
            representation: rebarGeoId,
            material: colorId,
          },
        ],
      });
    }

    await fragments.editor.createElements(model.modelId, elementsData);
    await fragments.update(true);

    updating = false;
  }, 500);
};

/* MD
  ### 🏗️ Model Regeneration
  This function regenerates the entire model including concrete elements and rebar placement. It calculates all the geometric relationships and creates the appropriate rebar configurations:

  :::info Rebar Types
  We'll create three types of rebars: longitudinal column rebars (red), transversal column rebars (blue), and footing rebars (green). Each type has specific spacing and geometric requirements.
  :::
*/

const regenerateModel = async () => {
  rebars.length = 0;
  colors.length = 0;

  await fragments.editor.reset(model.modelId);

  const fw = settings.footingWidth;
  const fl = settings.footingLength;
  const fh = settings.footingHeight;

  const cw = settings.columnWidth;
  const cl = settings.columnLength;
  const ch = settings.columnHeight;

  // Regenerate wire

  const points: THREE.Vector3[] = [];

  // Concrete elements

  // prettier-ignore
  geometryEngine.getExtrusion(footing.geometry, {
    profilePoints: [
      0, 0, 0,
      fw, 0, 0,
      fw, 0, fl,
      0, 0, fl,
    ],
    direction: [0, 1, 0],
    length: fh,
  });

  // prettier-ignore
  geometryEngine.getExtrusion(column.geometry, {
    profilePoints: [
      0, 0, 0,
      cw, 0, 0,
      cw, 0, cl,
      0, 0, cl,
    ],
    direction: [0, 1, 0],
    length: ch,
  });

  const cCenterX = fw / 2 - cw / 2;
  temp.cBottom = fh;
  const cCenterZ = fl / 2 - cl / 2;
  column.position.set(cCenterX, temp.cBottom, cCenterZ);

  // Rebars

  temp.cTop = temp.cBottom + ch;
  temp.clrx1 = fw / 2 + cw / 2 - settings.columnPadding;
  temp.clrz1 = fl / 2 + cl / 2 - settings.columnPadding;
  temp.clrx2 = fw / 2 - cw / 2 + settings.columnPadding;
  temp.clrz2 = fl / 2 - cl / 2 + settings.columnPadding;

  // Longitudinal Column Rebars

  const clrx1 = temp.clrx1;
  const clrz1 = temp.clrz1;
  const clrx2 = temp.clrx2;
  const clrz2 = temp.clrz2;
  const fBottom = settings.bottomPadding;
  const cTop = temp.cTop;
  const rTop = cTop + settings.topColumnRebarOffset;

  const lRadius = settings.columnLongRebarRadius;

  rebars.push(getLineRebar(lRadius, clrx1, fBottom, clrz1, clrx1, rTop, clrz1));
  rebars.push(getLineRebar(lRadius, clrx2, fBottom, clrz2, clrx2, rTop, clrz2));
  rebars.push(getLineRebar(lRadius, clrx1, fBottom, clrz2, clrx1, rTop, clrz2));
  rebars.push(getLineRebar(lRadius, clrx2, fBottom, clrz1, clrx2, rTop, clrz1));

  colors.push(Colors.RED);
  colors.push(Colors.RED);
  colors.push(Colors.RED);
  colors.push(Colors.RED);

  // Transversal Column Rebars

  const cTransIterations = Math.floor(cTop / settings.columnTransRebarOffset);

  for (let i = 1; i < cTransIterations; i++) {
    const h = fBottom + settings.columnTransRebarOffset * i;
    rebars.push(getColumnTransRebar(lRadius, h));
    colors.push(Colors.BLUE);
  }

  // Footing Rebars

  const fIterationsX = Math.ceil(fw / settings.footingRebarOffset);
  const fIterationsY = Math.ceil(fl / settings.footingRebarOffset);
  const fRadius = settings.footingRebarRadius;

  for (let i = 1; i < fIterationsX; i++) {
    const x = settings.footingRebarOffset * i;
    const y = settings.bottomPadding;
    const z1 = 0 + settings.bottomPadding;
    const z2 = fl - settings.bottomPadding;
    rebars.push(getFootingRebar(fRadius, x, y, z1, x, y, z2));
    colors.push(Colors.GREEN);
  }

  for (let i = 1; i < fIterationsY; i++) {
    const z = settings.footingRebarOffset * i;
    const y = settings.bottomPadding;
    const x1 = 0 + settings.bottomPadding;
    const x2 = fw - settings.bottomPadding;
    rebars.push(
      getFootingRebar(fRadius, x1, y + fRadius, z, x2, y + fRadius, z),
    );
    colors.push(Colors.GREEN);
  }

  // Create rebar preview

  for (const rebar of rebars) {
    for (const axe of rebar.axes) {
      for (const wire of axe.wires) {
        for (let i = 0; i < wire.length - 2; i += 3) {
          const x = wire[i];
          const y = wire[i + 1];
          const z = wire[i + 2];
          points.push(new THREE.Vector3(x, y, z));
        }
      }
    }
  }

  wireGeom.deleteAttribute("position");
  wireGeom.setFromPoints(points);

  // Update fragments
  await regenerateFragments();
};

await regenerateModel();

/* MD
  ### 💾 Save Functionality
  We'll implement a save function that allows users to export their reinforced concrete model as a Fragment file:
*/

const save = async () => {
  await fragments.editor.save(model.modelId);
  console.log("saved");
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
  ### 🧩 Adding User Interface
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">

      <bim-panel-section label="Controls">

      <bim-number-input label="Opacity" slider min=0 max=1 step=0.1 value=${concreteMat.opacity} @change=${(
        e: any,
      ) => {
        concreteMat.opacity = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Length" slider min=0.5 max=3 step=0.1 value=${settings.footingLength} @change=${(
        e: any,
      ) => {
        settings.footingLength = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Width" slider min=0.5 max=3 step=0.1 value=${settings.footingWidth} @change=${(
        e: any,
      ) => {
        settings.footingWidth = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Height" slider min=0.3 max=1 step=0.1 value=${settings.footingHeight} @change=${(
        e: any,
      ) => {
        settings.footingHeight = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Column Width" slider min=0.05 max=0.5 step=0.01 value=${settings.columnWidth} @change=${(
        e: any,
      ) => {
        settings.columnWidth = e.target.value;
        regenerateModel();
      }}></bim-number-input>
      
      <bim-number-input label="Column Length" slider min=0.05 max=0.5 step=0.01 value=${settings.columnLength} @change=${(
        e: any,
      ) => {
        settings.columnLength = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Column Height" slider min=0.3 max=1 step=0.1 value=${settings.columnHeight} @change=${(
        e: any,
      ) => {
        settings.columnHeight = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Column Padding" slider min=0.05 max=0.3 step=0.01 value=${settings.columnPadding} @change=${(
        e: any,
      ) => {
        settings.columnPadding = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Column Long Rebar Radius" slider min=0.005 max=0.015 step=0.001 value=${settings.columnLongRebarRadius} @change=${(
        e: any,
      ) => {
        settings.columnLongRebarRadius = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Column Trans Rebar Radius" slider min=0.005 max=0.015 step=0.001 value=${settings.columnTransRebarRadius} @change=${(
        e: any,
      ) => {
        settings.columnTransRebarRadius = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Column Trans Rebar Offset" slider min=0.05 max=0.3 step=0.01 value=${settings.columnTransRebarOffset} @change=${(
        e: any,
      ) => {
        settings.columnTransRebarOffset = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Column Trans Overlap" slider min=0.05 max=0.3 step=0.01 value=${settings.transOverlap} @change=${(
        e: any,
      ) => {
        settings.transOverlap = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Column Top Rebar Offset" slider min=0.05 max=0.3 step=0.01 value=${settings.topColumnRebarOffset} @change=${(
        e: any,
      ) => {
        settings.topColumnRebarOffset = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Footing Rebar Radius" slider min=0.005 max=0.015 step=0.001 value=${settings.footingRebarRadius} @change=${(
        e: any,
      ) => {
        settings.footingRebarRadius = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Footing Rebar Offset" slider min=0.05 max=0.3 step=0.01 value=${settings.footingRebarOffset} @change=${(
        e: any,
      ) => {
        settings.footingRebarOffset = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Footing Overlap" slider min=0.05 max=0.3 step=0.01 value=${settings.footingOverlap} @change=${(
        e: any,
      ) => {
        settings.footingOverlap = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-number-input label="Footing Bend Radius" slider min=0.005 max=0.015 step=0.001 value=${settings.footingBendRadius} @change=${(
        e: any,
      ) => {
        settings.footingBendRadius = e.target.value;
        regenerateModel();
      }}></bim-number-input>

      <bim-button icon="material-symbols:save" label="Save" @click=${save}></bim-button>

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
  ### 🎉 Congratulations!
  You've successfully learned how to work with rebars and reinforced concrete elements using the Fragments API! 🚀
  Now you can create parametric reinforced concrete structures with customizable dimensions, rebar spacing, and colors. Ready to explore more? Check out our other tutorials to unlock the full potential of Fragments! 💡
*/
