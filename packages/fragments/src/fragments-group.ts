import * as THREE from "three";
import { Fragment } from "./fragment";
import { Alignment, CivilCurve } from "./civil";
import { IfcProperties, IfcMetadata, FragmentIdMap } from "./base-types";

// TODO: Document this
export class FragmentsGroup extends THREE.Group {
  items: Fragment[] = [];

  boundingBox = new THREE.Box3();

  coordinationMatrix = new THREE.Matrix4();

  // Keys are uints mapped with fragmentIDs to save memory
  keyFragments = new Map<number, string>();

  // Map<expressID, [keys, rels]>
  // keys = fragmentKeys to which this asset belongs
  // rels = [floor, categoryid]
  data = new Map<number, [number[], number[]]>();

  // [geometryID, key]
  geometryIDs = {
    opaque: new Map<number, number>(),
    transparent: new Map<number, number>(),
  };

  ifcMetadata: IfcMetadata = {
    name: "",
    description: "",
    schema: "IFC2X3",
    maxExpressID: 0,
  };

  civilData?: {
    coordinationMatrix: THREE.Matrix4;
    alignments: Map<number, Alignment>;
  };

  streamSettings = {
    baseUrl: "",
    baseFileName: "",
    ids: new Map<number, number>(),
    types: new Map<number, number[]>(),
  };

  get hasProperties() {
    const hasLocalProps = this._properties !== undefined;
    const hasStreamProps = this.streamSettings.ids.size !== 0;
    return hasLocalProps || hasStreamProps;
  }

  protected _properties?: IfcProperties;

  getFragmentMap(expressIDs: Iterable<number>) {
    const fragmentMap: FragmentIdMap = {};
    for (const expressID of expressIDs) {
      const data = this.data.get(expressID);
      if (!data) continue;
      for (const key of data[0]) {
        const fragmentID = this.keyFragments.get(key);
        if (fragmentID === undefined) continue;
        if (!fragmentMap[fragmentID]) {
          fragmentMap[fragmentID] = new Set();
        }
        fragmentMap[fragmentID].add(expressID);
      }
    }
    return fragmentMap;
  }

  dispose(disposeResources = true) {
    for (const fragment of this.items) {
      fragment.dispose(disposeResources);
    }
    this.coordinationMatrix = new THREE.Matrix4();
    this.keyFragments.clear();
    this.data.clear();
    this._properties = {};
    this.removeFromParent();
    this.items = [];
    if (this.civilData) {
      const { alignments } = this.civilData;
      for (const [_id, alignment] of alignments) {
        this.disposeAlignment(alignment.vertical);
        this.disposeAlignment(alignment.horizontal);
        this.disposeAlignment(alignment.absolute);
      }
    }
    this.civilData = undefined;
  }

  setLocalProperties(properties: IfcProperties) {
    this._properties = properties;
  }

  getLocalProperties() {
    return this._properties;
  }

  getAllPropertiesIDs() {
    if (this._properties) {
      return Object.keys(this._properties).map((id) => parseInt(id, 10));
    }
    return Array.from(this.streamSettings.ids.keys());
  }

  getAllPropertiesTypes() {
    if (this._properties) {
      const types = new Set<number>();
      for (const id in this._properties) {
        const property = this._properties[id];
        if (property.type !== undefined) {
          types.add(property.type);
        }
      }
      return Array.from(types);
    }
    return Array.from(this.streamSettings.types.keys());
  }

  async getProperties(
    id: number,
  ): Promise<{ [attribute: string]: any } | null> {
    if (this._properties) {
      return this._properties[id] || null;
    }

    const url = this.getPropsURL(id);
    const data = await this.getPropertiesData(url);
    return data ? data[id] : null;
  }

  async setProperties(id: number, value: { [attribute: string]: any } | null) {
    if (this._properties) {
      if (value !== null) {
        this._properties[id] = value;
      } else {
        delete this._properties[id];
      }
      return;
    }

    // TODO: Fix this

    const url = this.getPropsURL(id);
    const data = await this.getPropertiesData(url);
    if (value !== null) {
      data[id] = value;
    } else {
      delete data[id];
    }

    // TODO: Finish defining this

    const formData = new FormData();
    formData.append("file", JSON.stringify(data));
    await fetch("api/KJAKDSJFAKÑSDFJAÑSFJDAÑJFÑA", {
      body: formData,
      method: "post",
    });
  }

  async getAllPropertiesOfType(type: number): Promise<IfcProperties | null> {
    if (this._properties) {
      const result: IfcProperties = {};
      let found = false;
      for (const id in this._properties) {
        const item = this._properties[id];
        if (item.type === type) {
          result[item.expressID] = item;
          found = true;
        }
      }
      return found ? result : null;
    }

    const { types } = this.streamSettings;
    const fileIDs = types.get(type);
    if (fileIDs === undefined) {
      return null;
    }

    const result: IfcProperties = {};
    for (const fileID of fileIDs) {
      const name = this.constructFileName(fileID);
      const url = this.constructURL(name);
      const data = await this.getPropertiesData(url);
      for (const key in data) {
        result[parseInt(key, 10)] = data[key];
      }
    }

    return result;
  }

  private getPropsURL(id: number) {
    const { ids } = this.streamSettings;
    const fileID = ids.get(id);
    if (fileID === undefined) {
      throw new Error("ID not found");
    }
    const name = this.constructFileName(fileID);
    return this.constructURL(name);
  }

  private async getPropertiesData(url: string) {
    const fetched = await fetch(url);
    return fetched.json();
  }

  private constructFileName(fileID: number) {
    const { baseFileName } = this.streamSettings;
    return `${baseFileName}-${fileID}`;
  }

  private constructURL(name: string) {
    const { baseUrl } = this.streamSettings;
    return `${baseUrl}${name}`;
  }

  private disposeAlignment(alignment: CivilCurve[]) {
    for (const curve of alignment) {
      curve.mesh.geometry.dispose();
      if (Array.isArray(curve.mesh.material)) {
        for (const mat of curve.mesh.material) {
          mat.dispose();
        }
      } else {
        curve.mesh.material.dispose();
      }
    }
    alignment.length = 0;
  }
}
