// import * as WEBIFC from "web-ifc"
import * as FB from "flatbuffers";
import pako from "pako";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import Stats from "stats.js";
// import { FragmentsModels, IfcSerializer, getObject } from "../../../dist";
import { FragmentsModels, IfcImporter, getObject } from "../../index";
import * as TFB from "../../Schema";

// interface IfcMetadata {
//   schema: WEBIFC.Schemas.IFC2X3 | WEBIFC.Schemas.IFC4 | WEBIFC.Schemas.IFC4X3,
//   name: string,
//   description: string,
// }

const run = async (serialize: boolean) => {
  // const name = "small"
  // const extension = ".ifc"
  // const format = ".aec"

  if (serialize) {
    // Previous file size
    // let previousSize = "0"

    // try {
    //   const lastBinFile = fs.readFileSync(`${name}${format}`)
    //   previousSize = (lastBinFile.length / (1024 * 1024)).toFixed(3)
    // } catch (error) {
    //   console.log(`First time converting ${name}`)
    // }

    // Read the file
    // const ifcFile = fs.readFileSync(`${name}${extension}`)
    const url = "/resources/ifc/test/test.ifc";
    const ifcFile = await fetch(url);
    const ifcBuffer = await ifcFile.arrayBuffer();
    const typedArray = new Uint8Array(ifcBuffer);

    // Serialize the data
    // const serializationStart = performance.now()
    const serializer = new IfcImporter(); // The serializer can be other than IFC
    // serializer.classesToInclude = [{entities: [WEBIFC.IFCWALLSTANDARDCASE, WEBIFC.IFCBUILDINGSTOREY], rels: [WEBIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE]}]
    const raw = false;
    const conversionStart = performance.now();
    const bytes = await serializer.process({
      bytes: typedArray,
      raw,
      progressCallback: (progress) => console.log(progress),
    });
    const conversionEnd = (
      (performance.now() - conversionStart) /
      1000
    ).toFixed(4);
    console.log("Conversion time:", `${conversionEnd}s`);
    const download = () => {
      const a = document.createElement("a");
      const file = new File([bytes], "small_test.frag");
      const url = URL.createObjectURL(file);
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    };

    const downloadBtn = document.getElementById("download-btn")!;
    downloadBtn.addEventListener("click", download);

    // Data log
    const byteBuffer = new FB.ByteBuffer(raw ? bytes : pako.inflate(bytes));
    const readModel = TFB.Model.getRootAsModel(byteBuffer);
    const result = {};
    getObject(readModel, result);
    console.log(result);

    // download();
    // const serializationTime = ((performance.now() - serializationStart) / 1000).toFixed(4)
    // fs.writeFileSync(`${name}${format}`, bytes)
    // console.log("Serialization time:", `${serializationTime}s`)

    // Previous and new file size comparison
    // const newBinFile = fs.readFileSync(`${name}${format}`)
    // const newSize = (newBinFile.length / (1024 * 1024)).toFixed(3)
    // console.log("Old binary size:", `${previousSize}mb`)
    // console.log("New binary size:", `${newSize}mb`)
    // console.log(newSize < previousSize ? "New file is lower in size" : "Old file is lower in size")

    // const blob2 = new Blob([bytes], { type: "application/octet-stream" });
    // @ts-ignore
    // const path = URL.createObjectURL(blob2);

    // Download the file
    // const link = document.createElement("a");
    // link.href = path;
    // link.download = "model_data.frag"; // Specify the file name
    // link.click();

    // Load model in 3d

    // Set up scene

    const components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);
    const container = document.getElementById("container") as HTMLDivElement;

    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBF.PostproductionRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);

    components.init();

    // world.renderer.postproduction.enabled = true;
    // world.renderer.postproduction.style = OBF.PostproductionAspect.PEN;

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

    // Model loading

    // prettier-ignore
    const workerUrl = "../../FragmentsModels/src/multithreading/fragments-thread.ts";
    // const workerUrl = "../../../dist/Worker/worker.mjs";
    const fragments = new FragmentsModels(workerUrl);

    const model = await fragments.load(bytes, {
      modelId: url,
      camera: world.camera.three,
      raw,
    });

    world.scene.three.add(model.object);

    const absoluteAlignments = await model.getAlignments();
    world.scene.three.add(absoluteAlignments);

    // const horizontalAlignments = await model.getHorizontalAlignments();
    // world.scene.three.add(horizontalAlignments);

    // const verticalAlignments = await model.getVerticalAlignments();
    // world.scene.three.add(verticalAlignments);

    // console.log(model);
    // const localIds = await model.getLocalIdsByGuids([
    //   "0wQknZQiXEOBcv0evGzx_W",
    //   "not_existing_guid",
    //   "2Hot_6d719Bv3G_ALlffKB",
    //   "2idC0G3ezCdhA9WVjWemc$",
    // ]);

    // const guids = await model.getGuidsByLocalIds([24451, 813787, 24453, 186]);

    // console.log(localIds, guids);

    // const item = model.getItem(186);
    // console.log(
    //   await item.getLocalId(),
    //   await item.getGuid(),
    //   await item.getRelations(),
    //   await item.getAttributes(),
    // );

    // console.log(await model.getSpatialStructure());
    // console.log(await model.getSpatialStructure());

    // const clonedModel = await fragments.load(await model.getBuffer(), {
    //   modelId: `${url}-d`,
    //   camera: world.camera.three,
    //   raw: true,
    // });

    // clonedModel.object.position.set(10, 0, -10);
    // world.scene.three.add(clonedModel.object);

    world.scene.three.add(model.object);
    await fragments.update(true);
    world.camera.controls.addEventListener("control", () => fragments.update());

    const mouse = new THREE.Vector2();

    window.addEventListener("dblclick", async (event) => {
      // Get properites of picked element
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      const result = await model.raycast({
        camera: world.camera.three,
        mouse,
        dom: world.renderer!.three.domElement!,
      });

      if (result && result.localId) {
        const item = model.getItem(result.localId);
        console.log(item);
      }
    });

    // const expressID = 186
    // const attrs = (await model.getItemAttributes(expressID, { includeRelations: true }))!

    // Create a new property set
    // const psetId = await model.addItem("IFCPROPERTYSET", { Name: { value: "MyCustomPset" } })
    // attrs.relations.add("IsDefinedBy", psetId)

    // console.log(await model.getItemAttributes(attrs.localId, { includeRelations: true }))
    // console.log(await attrs.getRelationAttribute("IsDefinedBy", "Name"))
    // console.log(await model.getItemGuid(expressID))
    // console.log(await model.getLocalIdByGuid("2idC0G3ezCdhA9WVjWemc$"))
    // console.log(await model.getItemCategory("2idC0G3ezCdhA9WVjWemc$"))
  }

  // Data ready time
  // const dataReadyStart = performance.now()
  // const bytes = new Uint8Array(fs.readFileSync(`${name}${format}`))
  // const model = new Properties<IfcMetadata>(bytes)
};

run(true);
