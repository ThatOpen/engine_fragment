// Disable no extraneous dependencies as this is just for the examples
/* eslint-disable import/no-extraneous-dependencies */

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import { RenderedFaces } from "../Schema";
import { FragmentsModels } from "./index";

async function main() {
  // Set up scene

  const components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);
  const container = document.getElementById("container") as HTMLDivElement;

  const world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBC.SimpleRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.OrthoPerspectiveCamera(components);

  components.init();

  world.scene.setup();
  // world.camera.three.far = 10000;

  world.scene.three.add(new THREE.AxesHelper());

  const stats = new Stats();
  stats.showPanel(2);
  document.body.append(stats.dom);
  stats.dom.style.left = "0px";
  stats.dom.style.zIndex = "unset";
  world.renderer.onBeforeUpdate.add(() => stats.begin());
  world.renderer.onAfterUpdate.add(() => stats.end());

  world.camera.three.far = 10000;

  // Get fragments model

  const githubUrl =
    "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
  const fetchedUrl = await fetch(githubUrl);
  const workerBlob = await fetchedUrl.blob();
  const workerFile = new File([workerBlob], "worker.mjs", {
    type: "text/javascript",
  });
  const workerUrl = URL.createObjectURL(workerFile);
  // const workerUrl = "../../dist/Worker/worker.mjs";
  const fragments = new FragmentsModels(workerUrl);

  // Toggle camera projection
  // window.addEventListener("keydown", async (e) => {
  //   if (e.code === "KeyP") {
  //     await world.camera.projection.toggle();
  //     for (const model of fragments.models.models.values()) {
  //       model.setCamera(world.camera.three);
  //     }
  //     fragments.update();
  //   }
  // });

  // let translation: THREE.Vector3 | null = null;

  // DISPOSE
  window.addEventListener("keydown", async (e) => {
    if (e.code === "KeyD") {
      await fragments.dispose();
    }
  });

  async function loadModel(
    url: string,
    id = url,
    raw = false,
    transform = new THREE.Vector3(),
  ) {
    const fetched = await fetch(url);
    const buffer = await fetched.arrayBuffer();

    const model = await fragments.load(buffer, {
      modelId: id,
      camera: world.camera.three,
      raw,
    });

    // GET BUFFER
    // window.addEventListener("keydown", async (e) => {
    //   if (e.code === "KeyB") {
    //     const buffer = await model.getBuffer();
    //     console.log(buffer);
    //   }
    // });

    model.object.position.add(transform);
    world.scene.three.add(model.object);
    const now = performance.now();
    await fragments.update(true);
    const then = performance.now();
    console.log(`Time taken: ${then - now}ms`);

    return model;
  }

  // EDIT MATERIALS
  // fragments.models.materials.onItemSet.add((item) => {
  //   console.log(item);
  //   item.value.opacity = 0.5;
  //   item.value.transparent = true;
  // });

  const model = await loadModel(
    "https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag",
  );
  const mouse = new THREE.Vector2();

  // const columIds = await model.getItemsByQuery({
  //   categories: [/IFCCOLUMN/],
  //   relation: {
  //     name: "ContainedInStructure",
  //     query: { attributes: { queries: [{ name: /Name/, value: /Nivel 3/ }] } },
  //   },
  // });

  // const box = await model.getMergedBox(columIds);
  // const helper = new THREE.Box3Helper(box);
  // world.scene.three.add(helper);
  // console.log(box);

  // const previewSphere = new THREE.Mesh(
  //   new THREE.SphereGeometry(0.2),
  //   new THREE.MeshBasicMaterial({
  //     color: "red",
  //   }),
  // );
  // world.scene.three.add(previewSphere);

  window.addEventListener("dblclick", async (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;

    // if (event.code !== "KeyE") return;
    // RAYCASTING

    const result = await model.raycast({
      camera: world.camera.three,
      mouse,
      dom: world.renderer!.three.domElement!,
    });

    // RAYCASTING WITH SNAPPING
    // const model = fragments.models.list.values().next().value!;
    // const result = await model.raycastWithSnapping({
    //   camera: world.camera.three,
    //   mouse,
    //   dom: world.renderer!.three.domElement!,
    //   snappingClasses: [SnappingClass.FACE],
    // });
    // if (result && result.length) {
    //   previewSphere.visible = true;
    //   previewSphere.position.copy(result[0].point);

    //   // Get raycasted face data

    //   const facePoints = result[0].facePoints;
    //   const faceIndices = result[0].faceIndices;

    //   if (facePoints && faceIndices) {
    //     const geometry = new THREE.BufferGeometry();
    //     geometry.setIndex(Array.from(faceIndices));
    //     geometry.setAttribute(
    //       "position",
    //       new THREE.BufferAttribute(facePoints, 3),
    //     );

    //     const mesh = new THREE.Mesh(
    //       geometry,
    //       new THREE.MeshBasicMaterial({ color: "red", side: 2 }),
    //     );
    //     world.scene.three.add(mesh);
    //   }
    // } else {
    //   previewSphere.visible = false;
    // }
    // return;

    // RAYCASTING WITH AREA

    // const topLeft = mouse.clone().addScalar(20);
    // const bottomRight = mouse.clone().subScalar(20);
    // const model = fragments.models.list.values().next().value!;
    // const result = await model.rectangleRaycast({
    //   camera: world.camera.three,
    //   dom: world.renderer!.three.domElement!,
    //   bottomRight,
    //   topLeft,
    //   fullyIncluded: false,
    // });
    // if (result && result.localIds) {
    //   const modelIdMap = { [result?.fragments.modelId]: result.localIds };
    //   const material = {
    //     color: new THREE.Color(1, 0, 0),
    //     side: RenderedFaces.ONE,
    //     opacity: 0.1,
    //     transparent: true,
    //   };
    //   await fragments.highlight(material, modelIdMap);
    //   await fragments.update(true);
    // }
    // return;

    // TOGGLE ITEMS VISIBILITY
    // model.toggleVisible();
    // await fragments.update(true);

    if (!result) {
      return;
    }

    console.log(result);

    // ITEMS (to get properties and geometries)
    // const item = model.getItem(result.localId);
    // console.log(item);

    // Attributes
    // const attributes = await item.getAttributes();
    // console.log(attributes);

    // GET GEOMETRY
    // const tempMaterial = new THREE.MeshBasicMaterial({
    //   color: 0x00ff00,
    //   depthTest: false,
    //   transparent: true,
    //   opacity: 0.5,
    // });

    // const geometry = await item.getGeometry();
    // if (!geometry) return;
    // const allIndices = await geometry.getIndices();
    // const allPositions = await geometry.getPositions();
    // const allTransforms = await geometry.getTransform();
    // if (!allIndices || !allPositions || !allTransforms) return;

    // for (let i = 0; i < allIndices.length; i++) {
    //   const indices = allIndices[i];
    //   const positions = allPositions[i];
    //   const transform = allTransforms[i];
    //   if (!indices || !positions || !transform) return;

    //   const threeGeometry = new THREE.BufferGeometry();
    //   threeGeometry.setIndex(Array.from(indices));
    //   threeGeometry.setAttribute(
    //     "position",
    //     new THREE.BufferAttribute(positions, 3),
    //   );
    //   const mesh = new THREE.Mesh(threeGeometry, tempMaterial);
    //   mesh.applyMatrix4(transform);
    //   world.scene.three.add(mesh);
    //   console.log("hey");
    // }

    // Psets
    // const rels = await item.getRelations();
    // if (rels === null) return;
    // const psetsIds = await rels.get("IsDefinedBy")!;
    // for (const id of psetsIds) {
    //   const psetItem = model.getItem(id);
    //   const psetAttributes = await psetItem.getAttributes();
    //   console.log(psetAttributes);
    // }

    // const modelIdMap = { [result?.fragments.modelId]: [result.localId] };

    // BOUNDING BOXES
    // const boxes = await fragments.getBBoxes(modelIdMap);
    // console.log(boxes);
    // const boxGeom = new THREE.BoxGeometry(1, 1, 1);
    // const boxMat = new THREE.MeshBasicMaterial({
    //   transparent: true,
    //   opacity: 0.5,
    // });
    // for (const bbox of boxes) {
    //   const box = new THREE.Mesh(boxGeom, boxMat);
    //   box.position.set(
    //     (bbox.min.x + bbox.max.x) / 2,
    //     (bbox.min.y + bbox.max.y) / 2,
    //     (bbox.min.z + bbox.max.z) / 2,
    //   );
    //   box.scale.x = bbox.max.x - bbox.min.x;
    //   box.scale.y = bbox.max.y - bbox.min.y;
    //   box.scale.z = bbox.max.z - bbox.min.z;
    //   world.scene.three.add(box);
    // }

    // SET ITEM VISIBILITY
    // if (result) {
    //   model.setVisible([result.localId], false);
    //   await fragments.update(true);
    // }

    // GET POSITIONS
    // const positions = await fragments.getPositions(modelIdMap);
    // for (const position of positions) {
    //   const cube = new THREE.Mesh(
    //     new THREE.BoxGeometry(0.1, 0.1, 0.1),
    //     new THREE.MeshBasicMaterial({ color: "red", depthTest: false }),
    //   );
    //   cube.position.copy(position);
    //   world.scene.three.add(cube);
    // }

    // // SET CUSTOM MATERIAL
    const material = {
      color: new THREE.Color(1, 0, 0),
      renderedFaces: RenderedFaces.ONE,
      opacity: 0.6,
      transparent: true,
    };
    await model.highlight([result.localId], material);
    await fragments.update(true);

    // ISOLATE FOR OUTLINE
    // if (result) {
    //   await model.setCustomMaterial([result.id], {
    //     color: new THREE.Color(1, 0, 0),
    //     opacity: 1,
    //     side: RenderedFaces.ONE,
    //     transparent: true,
    //     customId: 1234,
    //   });
    //   const updateVisibility = (value: boolean) => {
    //     for(const [,material] of plugin.modelBuilder.materialFactory.materials) {
    //       if(material.userData.customId !== 1234) {
    //         material.visible = value;
    //       }
    //     }
    //   }
    //   world.renderer!.onBeforeUpdate.add(() => updateVisibility(false));
    //   world.renderer!.onAfterUpdate.add(() => updateVisibility(true));
    // }
    // CLIPPING PLANES
    //   model.getClippingPlanesEvent = () => {
    //     return Array.from(world.renderer!.three.clippingPlanes) || [];
    //   };
    //   const clipper = components.get(OBC.Clipper);
    //   let firstPlane: OBC.SimplePlane | null = null;
    //   if (result) {
    //     const plane = clipper.createFromNormalAndCoplanarPoint(
    //       world,
    //       result.normal!.multiplyScalar(-1),
    //       result.point,
    //     );
    //     if (!firstPlane) {
    //       firstPlane = plane;
    //     }
    //   }
    //   window.addEventListener("keydown", (event) => {
    //     if (event.code === "KeyP") {
    //       clipper.delete(world);
    //     }
    //   });

    //   const edgesGeometry = new THREE.BufferGeometry();
    //   const fillGeometry = new THREE.BufferGeometry();

    //   clipper.onAfterDrag.add(async () => {
    //     if (!firstPlane) {
    //       return;
    //     }

    //     firstPlane.update();

    //     const plane = firstPlane.three.clone();
    //     plane.constant -= 0.01;
    //     const { buffer, index, fillsIndices } = await model.getSection(plane);
    //     const posAttr = new THREE.BufferAttribute(buffer, 3, false);
    //     posAttr.setUsage(THREE.DynamicDrawUsage);
    //     edgesGeometry.setAttribute("position", posAttr);
    //     edgesGeometry.setDrawRange(0, index);
    //     const edges = new THREE.LineSegments(
    //       edgesGeometry,
    //       new THREE.LineBasicMaterial({
    //         color: "red",
    //         linewidth: 0.001,
    //         depthTest: false,
    //       }),
    //     );
    //     edges.frustumCulled = false;
    //     world.scene.three.add(edges);
    //     edges.applyMatrix4(model.object.matrixWorld);

    //     fillGeometry.attributes.position = edges.geometry.attributes.position;
    //     fillGeometry.setIndex(fillsIndices);
    //     const fills = new THREE.Mesh(
    //       fillGeometry,
    //       new THREE.MeshBasicMaterial({
    //         color: "blue",
    //         depthTest: false,
    //         side: 2,
    //       }),
    //     );

    //     fills.applyMatrix4(model.object.matrixWorld);
    //     world.scene.three.add(fills);
    //   });
  });

  // Scene update

  world.camera.controls.addEventListener("control", () => fragments.update());
}

main();
