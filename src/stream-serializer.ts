import * as flatbuffers from "flatbuffers";
import * as FB from "./flatbuffers/streamed-geometries";
import { StreamedGeometries } from "./base-types";

export class StreamSerializer {
  import(bytes: Uint8Array): StreamedGeometries {
    const buffer = new flatbuffers.ByteBuffer(bytes);

    const fbGeoms = FB.StreamedGeometries.getRootAsStreamedGeometries(buffer);

    const geometries: StreamedGeometries = {};

    const length = fbGeoms.geometriesLength();
    for (let i = 0; i < length; i++) {
      const fbGeom = fbGeoms.geometries(i);
      if (!fbGeom) continue;

      const id = fbGeom.geometryId();

      if (id === null) {
        throw new Error("Error finding ID!");
      }

      const position = fbGeom.positionArray();
      const normal = fbGeom.normalArray();
      const index = fbGeom.indexArray();

      if (!position || !normal || !index) {
        continue;
      }

      geometries[id] = { position, normal, index };
    }

    return geometries;
  }

  export(geometries: StreamedGeometries) {
    const builder = new flatbuffers.Builder(1024);
    const createdGeoms: number[] = [];

    const Gs = FB.StreamedGeometries;
    const G = FB.StreamedGeometry;

    for (const geometryID in geometries) {
      const idStr = builder.createString(geometryID);

      const { index, position, normal } = geometries[geometryID];
      const indexVector = G.createIndexVector(builder, index);
      const posVector = G.createPositionVector(builder, position);
      const norVector = G.createNormalVector(builder, normal);

      G.startStreamedGeometry(builder);
      G.addGeometryId(builder, idStr);
      G.addIndex(builder, indexVector);
      G.addPosition(builder, posVector);
      G.addNormal(builder, norVector);
      const created = G.endStreamedGeometry(builder);
      createdGeoms.push(created);
    }

    const allGeoms = Gs.createGeometriesVector(builder, createdGeoms);

    Gs.startStreamedGeometries(builder);
    Gs.addGeometries(builder, allGeoms);
    const result = Gs.endStreamedGeometries(builder);
    builder.finish(result);

    return builder.asUint8Array();
  }
}
