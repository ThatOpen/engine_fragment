import * as WEBIFC from "web-ifc";
import { Builder } from "flatbuffers";
import * as TFB from "../../../../Schema";
import { RawEntityAttrs } from "./types";
import { IfcImporter } from "../..";
import { ifcCategoryMap } from "../../../../Utils";
import { ProcessData } from "../types";

export interface PropertiesProcessData extends ProcessData {
  geometryProcessedLocalIDs: number[];
}

export class IfcPropertyProcessor {
  private _lengthUnitsFactor = 1;
  private _attributesOffsets: number[] = [];
  private _relationsMap: Record<number, { [name: string]: number[] }> = {};
  private _guids: string[] = [];
  private _guidsItems: number[] = [];
  private _uniqueAttributes = new Set<string>();
  private _uniqueRelNames = new Set<string>();

  private _ifcApi: WEBIFC.IfcAPI | null = null;
  wasm = {
    path: "/node_modules/web-ifc/",
    absolute: false,
  };

  readonly expressIDs: number[] = [];

  readonly classes: string[] = [];

  async getIfcApi() {
    if (!this._ifcApi) {
      const ifcApi = new WEBIFC.IfcAPI();
      ifcApi.SetWasmPath(this.wasm.path, this.wasm.absolute);
      await ifcApi.Init();
      ifcApi.SetLogLevel(WEBIFC.LogLevel.LOG_LEVEL_OFF);
      this._ifcApi = ifcApi;
    }
    return this._ifcApi;
  }

  private async getSchema(modelId = 0) {
    const ifcApi = await this.getIfcApi();
    const schema = ifcApi.GetModelSchema(modelId);
    if (!schema) {
      throw new Error("Fragments: IFC Schema not found");
    }
    if (schema.startsWith("IFC2X3")) {
      return "IFC2X3";
    }
    if (schema.startsWith("IFC4") && schema.replace("IFC4", "") === "") {
      return "IFC4";
    }
    if (schema.startsWith("IFC4X")) {
      return "IFC4X3";
    }
    return schema;
  }

  constructor(
    private _serializer: IfcImporter,
    private _builder: Builder,
  ) {}

  async process(data: PropertiesProcessData) {
    // Open the IFC
    const ifcApi = await this.getIfcApi();

    if (data.readFromCallback) {
      ifcApi.OpenModelFromCallback(data.readCallback, {
        COORDINATE_TO_ORIGIN: true,
      });
    } else if (data.bytes) {
      await ifcApi.OpenModel(data.bytes, {
        COORDINATE_TO_ORIGIN: true,
      });
    } else {
      throw new Error("Fragments: No data provided");
    }

    if (this._serializer.replaceStoreyElevation) {
      await this.setLengthUnitsFactor();
    }

    const modelClasses = ifcApi
      .GetAllTypesOfModel(0)
      .map((entry) => entry.typeID);

    const schema = await this.getSchema();
    const schemaNamespace = (WEBIFC as any)[schema];
    if (!schemaNamespace) {
      throw new Error(`Fragments: Model schema not recognized.`);
    }

    // First process items that been processed by geometry processor

    const itemsWithGeom = data.geometryProcessedLocalIDs;
    await this.processItems(itemsWithGeom);
    const visitedItems = new Set(itemsWithGeom);
    data.progressCallback?.(0.6, {
      process: "attributes",
      state: "start",
      entitiesProcessed: itemsWithGeom.length,
    });

    // Now process the rest of items

    const classes = new Set([
      ...this._serializer.classes.abstract,
      ...this._serializer.classes.elements,
    ]);

    const toProcess = modelClasses.filter((type) => classes.has(type));
    const categoryPercentage = 0.15 / toProcess.length;

    for (const [index, entityClass] of toProcess.entries()) {
      const classEntities = ifcApi.GetLineIDsWithType(0, entityClass);
      if (classEntities.size() === 0) continue;
      const items: number[] = [];
      for (let index = 0; index < classEntities.size(); index++) {
        const id = classEntities.get(index);
        if (visitedItems.has(id)) continue;
        items.push(id);
      }
      if (items.length === 0) continue;
      await this.processItems(items);
      data.progressCallback?.(categoryPercentage * (index + 1) + 0.6, {
        process: "attributes",
        state: index + 1 === toProcess.length ? "finish" : "inProgress",
        class: ifcCategoryMap[entityClass],
        entitiesProcessed: items.length,
      });
    }

    const relations = new Set([...this._serializer.relations.keys()]);
    const relsToProcess = modelClasses.filter((type) => relations.has(type));
    const relsPercentage = 0.15 / relsToProcess.length;

    for (const [index, rel] of relsToProcess.entries()) {
      const state = (() => {
        if (index === 0) return "start";
        if (index + 1 === relsToProcess.length) return "finish";
        return "inProgress";
      })();
      await this.processRelations([rel]);
      data.progressCallback?.(relsPercentage * (index + 1) + 0.75, {
        process: "relations",
        state,
        class: ifcCategoryMap[rel],
      });
    }

    const { relIndicesVector, relsVector } = this.getRelationsVector();
    const { guidsVector, guidsItemsVector } = this.getGuidsVector();
    const metadataOffset = await this.getMetadataOffset();
    const attributesVector = this.getAttributesVector();
    const uniqueAttributesVector = this.getUniqueAttributesVector();
    const relNamesVector = this.getRelNamesVector();

    const localIdsVector = TFB.Model.createLocalIdsVector(
      this._builder,
      this.expressIDs,
    );

    const categoriesVector = this.getCategoriesVector();

    const spatialStrutureOffset = await this.getSpatialStructureOffset();

    this.clean();

    return {
      relIndicesVector,
      relsVector,
      guidsVector,
      guidsItemsVector,
      metadataOffset,
      attributesVector,
      localIdsVector,
      categoriesVector,
      spatialStrutureOffset,
      uniqueAttributesVector,
      relNamesVector,
    };
  }

  private async processItems(items: number[]) {
    const ifcApi = await this.getIfcApi();
    for (let index = 0; index < items.length; index++) {
      const expressID = items[index];
      try {
        const attrs = (await ifcApi.properties.getItemProperties(
          0,
          expressID,
        )) as RawEntityAttrs;
        if (!attrs) continue;

        // @ts-ignore
        const className = ifcCategoryMap[attrs.type];
        this.classes.push(className);
        this.expressIDs.push(expressID);
        await this.serializeAttributes(expressID, attrs);
      } catch (e) {
        console.log(`Problem reading properties for ${expressID}`);
        console.log(e);
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
        continue;
      }
    }
  }

  private addRelation(expressID: number, relName: string, ids: number[]) {
    if (!this._relationsMap[expressID]) this._relationsMap[expressID] = {};
    if (!this._relationsMap[expressID][relName])
      this._relationsMap[expressID][relName] = [];
    for (const id of ids) {
      this._relationsMap[expressID][relName].push(id);
    }
    if (this._serializer.includeRelationNames) {
      this._uniqueRelNames.add(relName);
    }
  }

  private async getStoreyElevation(
    placement: number,
    height: { value: number },
  ) {
    const ifcApi = await this.getIfcApi();

    const localPlacementAttrs = await ifcApi.properties.getItemProperties(
      0,
      placement,
    );

    let relPlacementAttrs: RawEntityAttrs | undefined;

    if (
      localPlacementAttrs?.RelativePlacement &&
      "value" in localPlacementAttrs.RelativePlacement &&
      typeof localPlacementAttrs.RelativePlacement.value === "number"
    ) {
      relPlacementAttrs = await ifcApi.properties.getItemProperties(
        0,
        localPlacementAttrs.RelativePlacement.value,
      );
    }

    let locationAttrs: RawEntityAttrs | undefined;

    if (
      relPlacementAttrs?.Location &&
      "value" in relPlacementAttrs.Location &&
      typeof relPlacementAttrs.Location.value === "number"
    ) {
      locationAttrs = await ifcApi.properties.getItemProperties(
        0,
        relPlacementAttrs.Location.value,
      );
    }

    if (
      locationAttrs?.Coordinates &&
      Array.isArray(locationAttrs.Coordinates) &&
      "value" in locationAttrs.Coordinates[2] &&
      typeof locationAttrs.Coordinates[2].value === "number"
    ) {
      height.value += locationAttrs.Coordinates[2].value;
    }

    if (
      localPlacementAttrs?.PlacementRelTo &&
      "value" in localPlacementAttrs.PlacementRelTo &&
      typeof localPlacementAttrs.PlacementRelTo.value === "number"
    ) {
      await this.getStoreyElevation(
        localPlacementAttrs.PlacementRelTo.value,
        height,
      );
    }
  }

  async setLengthUnitsFactor() {
    const ifcApi = await this.getIfcApi();
    const unitAssignmentIds = ifcApi.GetLineIDsWithType(
      0,
      WEBIFC.IFCUNITASSIGNMENT,
    );

    if (unitAssignmentIds.size() === 0) return;

    for (let i = 0; i < unitAssignmentIds.size(); i++) {
      const assignmentId = unitAssignmentIds.get(i);
      const assignmentAttrs = await ifcApi.properties.getItemProperties(
        0,
        assignmentId,
      );

      for (const unitHandle of assignmentAttrs.Units) {
        const unit = await ifcApi.properties.getItemProperties(
          0,
          unitHandle.value,
        );

        const value = unit.UnitType?.value;
        if (value !== "LENGTHUNIT") continue;

        let factor = 1;
        let unitValue = 1;
        if (unit.Name.value === "METRE") unitValue = 1;
        if (unit.Name.value === "FOOT") unitValue = 0.3048;

        if (unit.Prefix?.value === "MILLI") {
          factor = 0.001;
        } else if (unit.Prefix?.value === "CENTI") {
          factor = 0.01;
        } else if (unit.Prefix?.value === "DECI") {
          factor = 0.1;
        }

        this._lengthUnitsFactor = unitValue * factor;
      }
    }
  }

  async serializeAttributes(expressID: number, attrs: RawEntityAttrs) {
    const attrOffsets: number[] = [];
    let guid: string | null = null;

    if (
      this._serializer.replaceStoreyElevation &&
      attrs.type &&
      typeof attrs.type === "number" &&
      attrs.type === WEBIFC.IFCBUILDINGSTOREY &&
      attrs.Elevation &&
      "value" in attrs.Elevation
    ) {
      const height = { value: 0 };
      if (
        attrs.ObjectPlacement &&
        "value" in attrs.ObjectPlacement &&
        typeof attrs.ObjectPlacement.value === "number"
      ) {
        await this.getStoreyElevation(attrs.ObjectPlacement.value, height);
      }
      attrs.Elevation.value = height.value * this._lengthUnitsFactor;
    }

    let index = 0;
    for (const [attrName, attrValue] of Object.entries(attrs)) {
      if (typeof attrValue === "number") continue;
      if (
        this._serializer.attributesToExclude.has(attrName) ||
        attrValue === null ||
        attrValue === undefined
      ) {
        index++;
        continue;
      }

      // Array attributes are **usually** references to other entities
      // They must be added as a relation
      // When they are not references to other entities, the value of them all
      // is taken and packed into a single array
      if (Array.isArray(attrValue)) {
        const noHandles = attrValue.filter((handle) => handle.type !== 5);

        if (noHandles.length > 0) {
          const noHandlesValue = noHandles.map(
            (handle) => handle.value,
          ) as number[];

          const attrData = [attrName, noHandlesValue];
          const dataTypeName =
            "name" in noHandles[0] && noHandles[0].name
              ? noHandles[0].name
              : noHandles[0].constructor.name.toUpperCase();
          attrData.push(dataTypeName !== "OBJECT" ? dataTypeName : "UNDEFINED");

          const hash = JSON.stringify(attrData);
          const attrOffset = this._builder.createSharedString(hash);
          attrOffsets.push(attrOffset);
        }

        const handles = attrValue.filter((handle) => handle.type === 5);
        const ids = handles.map((handle) => handle.value) as number[];
        this.addRelation(expressID, attrName, ids);
        index++;
        continue;
      }

      const { value, type } = attrValue;

      if (type === 5) {
        // Type 5 values are references to other entities
        // They must be added as a relation
        if (typeof value !== "number") continue;
        this.addRelation(expressID, attrName, [value]);
      } else {
        if (attrName === "GlobalId" && typeof value === "string") {
          guid = value;
          index++;
          continue;
        }
        // name and value must always be at index 0 and 1
        // other data can be set starting index 2
        const attrData = [attrName, value];
        const dataTypeName =
          "name" in attrValue && attrValue.name
            ? attrValue.name
            : attrValue.constructor.name.toUpperCase();
        attrData.push(dataTypeName !== "OBJECT" ? dataTypeName : "UNDEFINED");
        const hash = JSON.stringify(attrData);
        const attrOffset = this._builder.createSharedString(hash);
        attrOffsets.push(attrOffset);
        if (this._serializer.includeUniqueAttributes) {
          this._uniqueAttributes.add(hash);
        }
      }

      index++;
    }

    const dataVector = TFB.Attribute.createDataVector(
      this._builder,
      attrOffsets,
    );
    const attributeOffset = TFB.Attribute.createAttribute(
      this._builder,
      dataVector,
    );

    this._attributesOffsets.push(attributeOffset);
    if (guid) {
      this._guids.push(guid);
      this._guidsItems.push(expressID);
    }
  }

  getAttributesVector() {
    const attributesVector = TFB.Model.createAttributesVector(
      this._builder,
      this._attributesOffsets,
    );
    return attributesVector;
  }

  getUniqueAttributesVector() {
    const offsets: number[] = [];
    for (const hash of this._uniqueAttributes) {
      const offset = this._builder.createSharedString(hash);
      offsets.push(offset);
    }
    const uniqueAttributesVector = TFB.Model.createUniqueAttributesVector(
      this._builder,
      offsets,
    );
    return uniqueAttributesVector;
  }

  getRelNamesVector() {
    const offsets: number[] = [];
    for (const name of this._uniqueRelNames) {
      const offset = this._builder.createSharedString(name);
      offsets.push(offset);
    }
    const relationNamesVector = TFB.Model.createRelationNamesVector(
      this._builder,
      offsets,
    );
    return relationNamesVector;
  }

  getGuidsVector() {
    const guidOffsets: number[] = [];
    for (const guid of this._guids) {
      const offset = this._builder.createString(guid);
      guidOffsets.push(offset);
    }
    const guidsVector = TFB.Model.createGuidsVector(this._builder, guidOffsets);
    const guidsItemsVector = TFB.Model.createGuidsItemsVector(
      this._builder,
      this._guidsItems,
    );
    return { guidsVector, guidsItemsVector };
  }

  async processRelations(rels: number[]) {
    const ifcApi = await this.getIfcApi();
    for (const entityClass of rels) {
      const relNames = this._serializer.relations.get(entityClass);
      if (!relNames) continue;
      const { forRelating, forRelated } = relNames;
      const classEntities = ifcApi.GetLineIDsWithType(0, entityClass);
      if (classEntities.size() === 0) continue;
      for (let index = 0; index < classEntities.size(); index++) {
        const expressID = classEntities.get(index);
        const attrs = (await ifcApi.properties.getItemProperties(
          0,
          expressID,
        )) as Record<string, any>;
        if (!attrs) continue;
        const attrKeys = Object.keys(attrs);
        const relatingKey = attrKeys.find((attr) =>
          attr.startsWith("Relating"),
        );
        const relatedKey = attrKeys.find((attr) => attr.startsWith("Related"));
        if (!(relatingKey && relatedKey)) continue;
        const relatingID = attrs[relatingKey].value;
        const relatedIDs = attrs[relatedKey].map(
          ({ value }: { value: number }) => value,
        );
        this.addRelation(relatingID, forRelating, relatedIDs);
        for (const relatedID of relatedIDs) {
          this.addRelation(relatedID, forRelated, [relatingID]);
        }
      }
    }
  }

  getRelationsVector(clean = false) {
    const rels: number[] = [];
    const ids: number[] = [];
    for (const [expressID, entityRels] of Object.entries(this._relationsMap)) {
      if (clean && !this.expressIDs.includes(Number(expressID))) continue; // very expensive
      const definitions: number[] = [];
      for (const [attrName, _rels] of Object.entries(entityRels)) {
        let rels = _rels;
        if (clean) {
          rels = _rels.filter((id) => this.expressIDs.includes(id)); // very expensive
          if (rels.length === 0) continue;
        }
        const hash = JSON.stringify([attrName, ...rels]);
        const offset = this._builder.createSharedString(hash);
        definitions.push(offset);
      }
      if (clean && definitions.length === 0) continue;
      // ids.push(this._expressIDs.indexOf(Number(expressID)))
      ids.push(Number(expressID));
      const dataVector = TFB.Relation.createDataVector(
        this._builder,
        definitions,
      );
      const relOffset = TFB.Relation.createRelation(this._builder, dataVector);
      rels.push(relOffset);
    }
    const relsVector = TFB.Model.createRelationsVector(this._builder, rels);
    const relIndicesVector = TFB.Model.createRelationsItemsVector(
      this._builder,
      ids,
    );
    return { relIndicesVector, relsVector };
  }

  getCategoriesVector() {
    const classesOffset = this.classes.map((name) =>
      this._builder.createSharedString(name),
    );
    const categoriesVector = TFB.Model.createCategoriesVector(
      this._builder,
      classesOffset,
    );
    return categoriesVector;
  }

  async getMetadataOffset() {
    const ifcApi = await this.getIfcApi();
    const schema = ifcApi.GetModelSchema(0);
    const metadata = { schema };
    const metadataOffset = this._builder.createString(JSON.stringify(metadata));
    return metadataOffset;
  }

  private getEntityDecomposition(
    expressID: number,
    inverseAttributes: string[],
  ) {
    const offsets: number[] = [];

    for (const attrName of inverseAttributes) {
      const relations = this._relationsMap[expressID]?.[attrName];
      if (!relations) continue;

      const entityGroups: { [type: string]: number[] } = {};
      for (const expressID of relations) {
        const entityIndex = this.expressIDs.indexOf(expressID);
        if (entityIndex === -1) continue;
        const entityClass = this.classes[entityIndex];
        if (!entityClass) continue;
        if (!entityGroups[entityClass]) entityGroups[entityClass] = [];
        entityGroups[entityClass].push(expressID);
      }

      for (const category in entityGroups) {
        const entities = entityGroups[category];
        const childrenOffsets = entities.map((id) =>
          this.getEntityDecomposition(id, inverseAttributes),
        );
        const childrenVector = TFB.SpatialStructure.createChildrenVector(
          this._builder,
          childrenOffsets,
        );
        const categoryOffset = this._builder.createSharedString(category);

        TFB.SpatialStructure.startSpatialStructure(this._builder);
        TFB.SpatialStructure.addCategory(this._builder, categoryOffset);
        TFB.SpatialStructure.addChildren(this._builder, childrenVector);
        const offset = TFB.SpatialStructure.endSpatialStructure(this._builder);
        offsets.push(offset);
      }
    }

    const childrenVector = TFB.SpatialStructure.createChildrenVector(
      this._builder,
      offsets,
    );
    TFB.SpatialStructure.startSpatialStructure(this._builder);
    TFB.SpatialStructure.addLocalId(this._builder, expressID);
    TFB.SpatialStructure.addChildren(this._builder, childrenVector);
    const offset = TFB.SpatialStructure.endSpatialStructure(this._builder);

    return offset;
  }

  async getSpatialStructureOffset() {
    const ifcApi = await this.getIfcApi();
    const ifcClass = WEBIFC.IFCPROJECT;
    const classEntities = [...ifcApi.GetLineIDsWithType(0, ifcClass)];
    const childrenOffsets = classEntities.map((id) =>
      this.getEntityDecomposition(id, ["IsDecomposedBy", "ContainsElements"]),
    );

    const categoryOffset = this._builder.createSharedString("IFCPROJECT");
    const childrenVector = TFB.SpatialStructure.createChildrenVector(
      this._builder,
      childrenOffsets,
    );
    TFB.SpatialStructure.startSpatialStructure(this._builder);
    TFB.SpatialStructure.addCategory(this._builder, categoryOffset);
    TFB.SpatialStructure.addChildren(this._builder, childrenVector);
    const offset = TFB.SpatialStructure.endSpatialStructure(this._builder);
    return offset;
  }

  clean() {
    this._ifcApi?.Dispose();
    this._ifcApi = null;
    this._guids = [];
    this._guidsItems = [];
    this._attributesOffsets = [];
    this._relationsMap = {};
    this._uniqueAttributes.clear();
    this._uniqueRelNames.clear();
    (this.expressIDs as any) = [];
    (this.classes as any) = [];
  }
}
