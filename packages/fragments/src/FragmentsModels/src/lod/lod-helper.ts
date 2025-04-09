import * as THREE from "three";
import { LineMaterialParameters } from "three/examples/jsm/Addons.js";
import { LODGeometry } from "./lod-geometry";
import { LodShaders } from "./lod-shaders";
import { LODMesh } from "./lod-mesh";

export class LodHelper {
  static tempVec = new THREE.Vector3();
  static tempBox = new THREE.Box3();

  static setupLodMeshResize(mesh: LODMesh) {
    mesh.onBeforeRender = (renderer) => {
      renderer.getSize(mesh.material[0].lodSize);
    };
  }

  static setupLodAttributes(geometry: THREE.InstancedBufferGeometry): void {
    geometry.setIndex(LodHelper.indices);
    geometry.setAttribute("position", LodHelper.vertices);
  }

  static setLodBuffer(
    lodGeometry: LODGeometry,
    data: Float32Array,
    onFinish?: () => void,
  ) {
    let itemFirst = lodGeometry.getItemFirst();
    let itemLast = lodGeometry.getItemLast();
    let dataBuffer = this.setItemFirst(lodGeometry, itemFirst, data, itemLast);
    const result = this.resetAttributes(itemFirst, dataBuffer, data, itemLast);
    ({ itemFirst, dataBuffer, itemLast } = result);
    this.setupFinish(onFinish, dataBuffer);
    lodGeometry.setAttribute("itemFirst", itemFirst);
    lodGeometry.setAttribute("itemLast", itemLast);
  }

  static setLodVisibility(lodGeometry: LODGeometry, visible: any): void {
    const itemFilter = this.setupItemFilter(lodGeometry);
    this.applyVisibilityState(lodGeometry, visible, itemFilter);
    itemFilter.needsUpdate = true;
  }

  static getInterAttribute(
    geometry: THREE.InstancedBufferGeometry,
    name: string,
  ) {
    return geometry.getAttribute(name) as THREE.InterleavedBufferAttribute;
  }

  static computeLodSphere(geometry: LODGeometry) {
    if (!geometry.boundingSphere) {
      return;
    }
    const itemFirst = geometry.getItemFirst();
    if (itemFirst) {
      const midPoint = LodHelper.getLodMidPoint(geometry, itemFirst);
      const radius = LodHelper.getLodRadius(midPoint, itemFirst);
      geometry.boundingSphere.radius = radius;
    }
  }

  static newLodMaterialParams(parameters: LineMaterialParameters) {
    const customUniforms = {
      lodColor: { value: new THREE.Color(parameters.color) },
      lodSize: { value: new THREE.Vector2(1, 1) },
      lodOpacity: { value: parameters.opacity ?? 1 },
    };

    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      customUniforms,
    ]);
    const transparent = parameters.transparent ?? false;

    return {
      uniforms,
      transparent,
      vertexShader: LodShaders.vertex,
      fragmentShader: LodShaders.fragment,
    };
  }

  static setLodFilter(geometry: LODGeometry, data: any): void {
    const itemFilter = geometry.getItemFilter();
    const bufferData = itemFilter.array as Uint8Array;

    for (let i = 0; i < data.position.length; ++i) {
      const first = data.position[i] / 2;
      const size = data.size[i] / 2;
      if (size === 0xffffffff) {
        bufferData.fill(1, first);
      } else {
        bufferData.fill(1, first, first + size);
      }
    }
    itemFilter.needsUpdate = true;
  }

  static getInstancedAttribute(
    geometry: THREE.InstancedBufferGeometry,
    name: string,
  ) {
    return geometry.getAttribute(name) as THREE.InstancedBufferAttribute;
  }

  static computeLodBox(geometry: LODGeometry) {
    if (!geometry.boundingBox) {
      return;
    }
    const position = geometry.getItemFirst();
    if (position) {
      const buffer = position.data.array;
      geometry.boundingBox.setFromArray(buffer);
      return;
    }
    geometry.boundingBox.makeEmpty();
  }

  private static setDataBuffer(
    dataBuffer: THREE.InstancedInterleavedBuffer | null,
    itemFirst: THREE.InterleavedBufferAttribute,
    data: Float32Array,
  ) {
    dataBuffer = itemFirst.data as THREE.InstancedInterleavedBuffer;
    dataBuffer.array = data;
    dataBuffer.needsUpdate = true;
    return dataBuffer;
  }

  private static disposeAllData(geometry: THREE.InstancedBufferGeometry) {
    delete geometry.attributes.itemFilter;
    delete geometry.attributes.position;
    geometry.index = null;
    geometry.dispose();
    LodHelper.setupLodAttributes(geometry);
  }

  private static setItemFirst(
    lodGeometry: LODGeometry,
    itemFirst: THREE.InterleavedBufferAttribute,
    data: Float32Array,
    itemLast: THREE.InterleavedBufferAttribute,
  ) {
    let dataBuffer: THREE.InstancedInterleavedBuffer | null = null;
    if (itemFirst) {
      const sizeMatch = data.length === itemFirst.data.array.length;
      if (sizeMatch) {
        dataBuffer = this.setDataBuffer(dataBuffer, itemFirst, data);
      } else {
        (itemFirst as any) = undefined;
        (itemLast as any) = undefined;
        this.disposeAllData(lodGeometry);
      }
    }
    return dataBuffer;
  }

  private static setupFinish(
    onFinish: (() => void) | undefined,
    dataBuffer: THREE.InstancedInterleavedBuffer | null,
  ) {
    if (onFinish) {
      // @ts-ignore
      dataBuffer.onUploadCallback = onFinish;
    }
  }

  private static resetAttributes(
    itemFirst: THREE.InterleavedBufferAttribute,
    dataBuffer: THREE.InstancedInterleavedBuffer | null,
    data: Float32Array,
    itemLast: THREE.InterleavedBufferAttribute,
  ) {
    if (!itemFirst) {
      dataBuffer = new THREE.InstancedInterleavedBuffer(data, 6, 1);
      itemFirst = new THREE.InterleavedBufferAttribute(dataBuffer, 3, 0);
      itemLast = new THREE.InterleavedBufferAttribute(dataBuffer, 3, 3);
    }
    return { itemFirst, dataBuffer, itemLast };
  }

  private static setupItemFilter(lodGeometry: LODGeometry) {
    const itemFirst = lodGeometry.getItemFirst();
    const size = itemFirst.count;

    let itemFilter = lodGeometry.getItemFilter();
    if (itemFilter) {
      itemFilter.array.fill(0);
    } else {
      itemFilter = new THREE.InstancedBufferAttribute(new Uint8Array(size), 1);
      lodGeometry.setAttribute("itemFilter", itemFilter);
    }
    return itemFilter;
  }

  private static applyVisibilityState(
    lodGeometry: LODGeometry,
    visible: any,
    itemFilter: THREE.InstancedBufferAttribute,
  ) {
    if (visible === true) {
      itemFilter.array.fill(1);
      return;
    }

    if (visible) {
      this.setLodFilter(lodGeometry, visible as any);
    }
  }

  private static getLodMidPoint(
    geometry: LODGeometry,
    itemFirst: THREE.InterleavedBufferAttribute,
  ) {
    const midpoint = geometry.boundingSphere!.center;
    this.tempBox.setFromArray(itemFirst.data.array);
    this.tempBox.getCenter(midpoint);
    return midpoint;
  }

  private static getLodRadius(
    midPoint: THREE.Vector3,
    itemFirst: THREE.InterleavedBufferAttribute,
  ) {
    let threshold = 0;
    const size = itemFirst.data.array.length;
    for (let i = 0; i < size; i += 3) {
      const dataBuffer = itemFirst.data.array;
      LodHelper.tempVec.fromArray(dataBuffer, i);
      const distance = midPoint.distanceToSquared(LodHelper.tempVec);
      threshold = Math.max(threshold, distance);
    }
    return Math.sqrt(threshold);
  }

  // prettier-ignore
  private static vertices = new THREE.Float32BufferAttribute(
    [
      -1, 2, 0, 
       1, 2, 0, 
      -1, 1, 0, 
       1, 1, 0, 
      -1, 0, 0, 
       1, 0, 0, 
      -1,-1, 0, 
       1,-1, 0,
    ],
    3,
  );

  // prettier-ignore
  private static indices = new THREE.Uint8BufferAttribute(
    [
      0, 2, 1, 
      2, 3, 1, 
      2, 4, 3, 
      4, 5, 3, 
      4, 6, 5, 
      6, 7, 5
    ],
    1,
  );
}
