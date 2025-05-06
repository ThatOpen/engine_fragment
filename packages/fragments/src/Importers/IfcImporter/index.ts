import * as fb from "flatbuffers";
import { MathUtils } from "three";
import pako from "pako";
import * as WEBIFC from "web-ifc";
import * as TFB from "../../Schema";
import { IfcPropertyProcessor, IfcGeometryProcessor, ifcClasses } from "./src";
import { DataSet } from "../../Utils";

/**
 * An objet to convert IFC files into fragments.
 */
export class IfcImporter {
  private _builder: fb.Builder | null = null;

  /** Configuration for the web-ifc WASM module
   * @property {string} path - The path to the web-ifc WASM files
   * @property {boolean} absolute - Whether the path is absolute or relative
   */
  wasm = {
    path: "/node_modules/web-ifc/",
    absolute: false,
  };

  /** A set of attribute names to exclude from serialization.
   */
  attributesToExclude = new Set([
    "Representation",
    "ObjectPlacement",
    "CompositionType",
    "OwnerHistory",
  ]);

  relations = new Map([
    [
      WEBIFC.IFCRELDEFINESBYPROPERTIES,
      { forRelating: "DefinesOcurrence", forRelated: "IsDefinedBy" },
    ],
    [
      WEBIFC.IFCRELASSOCIATESMATERIAL,
      { forRelated: "HasAssociations", forRelating: "AssociatedTo" },
    ],
    [
      WEBIFC.IFCRELAGGREGATES,
      { forRelated: "Decomposes", forRelating: "IsDecomposedBy" },
    ],
    [
      WEBIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
      { forRelated: "ContainedInStructure", forRelating: "ContainsElements" },
    ],
  ]);

  classes = {
    elements: new DataSet<number>([...ifcClasses.elements]),
    abstract: new DataSet<number>([
      ...ifcClasses.base,
      ...ifcClasses.materials,
      ...ifcClasses.properties,
    ]),
  };

  private get builder() {
    if (!this._builder) {
      throw new Error("Fragments: Builder not initialized");
    }
    return this._builder;
  }

  /**
   * Processes IFC data and converts it into a fragments format.
   * @param data Configuration object for processing.
   * @param data.bytes Raw IFC file data as Uint8Array.
   * @param data.raw Whether to return raw uncompressed data. If false, the output fragments will be smaller.
   * @param data.readFromCallback Whether to read data from a callback function. Useful for node.js.
   * @param data.readCallback Callback function to read IFC data. Useful for node.js.
   */
  async process(data: {
    readFromCallback?: boolean;
    bytes?: Uint8Array;
    readCallback?: any;
    raw?: boolean;
  }) {
    this._builder = new fb.Builder(1024);

    // Get geometry

    const geometryProcessor = new IfcGeometryProcessor(this);
    geometryProcessor.wasm = this.wasm;
    const geomData = { ...data, builder: this.builder };
    const geoms = await geometryProcessor.process(geomData);
    const {
      modelMesh,
      maxLocalID,
      localIDs,
      modelGeometries,
      modelAlignments,
    } = geoms;

    // Get properties

    const properties = new IfcPropertyProcessor(this, this.builder);
    properties.wasm = this.wasm;
    const propsArgs = { ...data, geometryProcessedLocalIDs: localIDs };
    const propsData = await properties.process(propsArgs);
    const {
      relIndicesVector,
      relsVector,
      guidsVector,
      guidsItemsVector,
      metadataOffset,
      localIdsVector,
      spatialStrutureOffset,
      attributesVector,
      categoriesVector,
    } = propsData;

    // TODO: Allow user to pass a guid
    const guid = MathUtils.generateUUID();
    const guidRef = this.builder.createString(guid);

    TFB.Model.startModel(this.builder);
    TFB.Model.addMeshes(this.builder, modelMesh);
    TFB.Model.addMetadata(this.builder, metadataOffset);
    TFB.Model.addAttributes(this.builder, attributesVector);
    TFB.Model.addLocalIds(this.builder, localIdsVector);
    TFB.Model.addCategories(this.builder, categoriesVector);
    TFB.Model.addRelationsItems(this.builder, relIndicesVector);
    TFB.Model.addRelations(this.builder, relsVector);
    TFB.Model.addGuidsItems(this.builder, guidsItemsVector);
    TFB.Model.addGuids(this.builder, guidsVector);
    TFB.Model.addSpatialStructure(this.builder, spatialStrutureOffset);
    TFB.Model.addGuid(this.builder, guidRef);
    TFB.Model.addMaxLocalId(this.builder, maxLocalID);
    TFB.Model.addGeometries(this.builder, modelGeometries);
    TFB.Model.addAlignments(this.builder, modelAlignments);
    const outData = TFB.Model.endModel(this.builder);

    this.builder.finish(outData);
    const outBytes = this.builder.asUint8Array();
    this.clean();

    const content = data.raw ? outBytes : pako.deflate(outBytes);
    return content;
  }

  private clean() {
    this._builder?.clear();
    this._builder = null;
  }
}
