import { LRUCache } from "lru-cache";
import { AnyTileBasicData, AnyTileData, TileData } from "../virtual-meshes";

export class VirtualMemoryController {
  private static readonly oneHundredMb = 100000000;

  private static _meshes = this.setupMeshes();
  private static _capacity: number;

  private static readonly _memoryAttributes: (keyof TileData)[] = [
    "positionBuffer",
    "indexBuffer",
    "normalBuffer",
  ];

  static get(id: number) {
    return this._meshes.get(id);
  }

  static lockIn(mesh: AnyTileBasicData) {
    Object.seal(mesh);
  }

  static add(id: number, mesh: AnyTileData) {
    this._meshes.set(id, mesh);
  }

  static delete(ids: Iterable<number>) {
    for (const id of ids) {
      this._meshes.delete(id);
    }
  }

  static updateMeshMemory = (mesh: TileData) => {
    mesh.usedMemory = 0;
    for (const key of this._memoryAttributes) {
      if (mesh.usedMemory !== undefined && mesh[key]) {
        mesh.usedMemory += (mesh[key] as any).byteLength;
      }
    }
    this.lockIn(mesh);
  };

  static setCapacity(value: number) {
    if (value === this._capacity) return;
    this._meshes.clear();
    this._meshes = this.setupMeshes(value);
    this._capacity = value;
  }

  private static setupMeshes(size?: number) {
    const maxSize = Math.max(size ?? this.computeCapacity(), 1);
    const sizeCalculation = this.getSizeCalculationEvent();
    const lruInput = { maxSize, sizeCalculation };
    return new LRUCache<number, AnyTileData>(lruInput);
  }

  private static computeCapacity(): number {
    const deviceMemory = (navigator as any).deviceMemory;
    const fallbackMemory = 2;
    const baseMemory = deviceMemory ?? fallbackMemory;
    const result = this.oneHundredMb * baseMemory;
    return Math.trunc(result);
  }

  private static getDataSetMemory(mesh: TileData[]) {
    let usedMemory = 0;
    for (const item of mesh) {
      usedMemory += item.usedMemory!;
    }
    return Math.max(usedMemory, 1);
  }

  private static getSizeCalculationEvent() {
    return (mesh: AnyTileData) => {
      if (!Array.isArray(mesh)) {
        return Math.max(mesh.usedMemory!, 1);
      }
      return this.getDataSetMemory(mesh);
    };
  }
}
