import { describe, it, expect } from "vitest";
import * as flatbuffers from "flatbuffers";
import {
  Shell,
  ShellProfile,
  ShellType,
  FloatVector,
} from "../../../../../Schema";
import { ShellTemplateConstructor } from "./shell-template-constructor";
import { ShellConstructor } from "./shell-constructor";
import { TileData, TileBasicData } from "../types";
import { limitOf2Bytes } from "../../../model/model-types";

/**
 * Regression coverage for the multi-buffer shell construction crash: a
 * shell (a single, densely-triangulated mesh) whose vertex/index data
 * exceeds `limitOf2Bytes` (65,536, a `uint16`-range unit) gets split
 * across multiple internal `TileData` buffers. Two separate passes decide
 * how many buffers a shell needs -
 * `ShellTemplateConstructor.manageMemory` (a sizing pass, run ahead of
 * time to pre-allocate the `TileData[]` array) and
 * `ShellConstructor.manageMemory` (the real construction pass, run later
 * against the actual geometry). Nothing in the type system enforces that
 * these two independently-implemented formulas always agree, and if the
 * construction pass ever needs MORE buffers than the sizing pass
 * predicted, `setTileData` used to read past the end of the pre-built
 * array (`bufferGeometries[this._indices]` on an array too short),
 * producing `undefined`, and the very next call
 * (`initializeIndices`'s `this._tileData.indexCount!`) threw
 * `Cannot read properties of undefined (reading 'indexCount')` - visibly,
 * a model failing to render with a repeating console exception every
 * frame.
 *
 * `ShellConstructor` now creates a buffer on demand instead of crashing
 * (see `createOverflowTileData`/`finalizeCurrentIfDynamic` in
 * shell-constructor.ts). These tests don't rely on finding a real shell
 * topology where the two passes actually disagree (extensive empirical
 * testing with large synthetic grid meshes - both `ShellType.NONE` and
 * `ShellType.BIG`, matching openskp's own triangulated-Face3-only export
 * shape - found no such divergence at production scale, so the exact
 * real-world trigger remains unconfirmed). Instead, they verify the
 * defensive mechanism itself directly by construction: artificially
 * truncating a correctly-predicted buffer array before handing it to the
 * construction pass, the same failure shape an under-prediction would
 * produce regardless of what causes it.
 */

function buildGridShell(cols: number, rows: number): Shell {
  const builder = new flatbuffers.Builder(1024 * 1024 * 8);

  const profileOffsets: number[] = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      const tris = [
        [a, b, d],
        [a, d, c],
      ];
      for (const tri of tris) {
        ShellProfile.startIndicesVector(builder, 3);
        builder.addInt16(tri[2]);
        builder.addInt16(tri[1]);
        builder.addInt16(tri[0]);
        const idxVec = builder.endVector();
        ShellProfile.startShellProfile(builder);
        ShellProfile.addIndices(builder, idxVec);
        profileOffsets.push(ShellProfile.endShellProfile(builder));
      }
    }
  }

  const profilesVec = Shell.createProfilesVector(builder, profileOffsets);
  const bigProfilesVec = Shell.createBigProfilesVector(builder, []);
  const holesVec = Shell.createHolesVector(builder, []);
  const bigHolesVec = Shell.createBigHolesVector(builder, []);

  Shell.startPointsVector(builder, cols * rows);
  for (let j = rows - 1; j >= 0; j--) {
    for (let i = cols - 1; i >= 0; i--) {
      FloatVector.createFloatVector(builder, i, j, 0);
    }
  }
  const pointsVec = builder.endVector();

  // A Uint16Array assignment already truncates to 16 bits on its own, so a
  // manual mask here would be redundant (and trips no-bitwise) - values
  // stay well under 65536 anyway since profileOffsets.length is bounded by
  // this test's own grid size.
  const faceIds = new Uint16Array(profileOffsets.length);
  for (let i = 0; i < faceIds.length; i++) faceIds[i] = i;
  const faceIdsVec = Shell.createProfilesFaceIdsVector(builder, faceIds);

  Shell.startShell(builder);
  Shell.addProfiles(builder, profilesVec);
  Shell.addBigProfiles(builder, bigProfilesVec);
  Shell.addHoles(builder, holesVec);
  Shell.addBigHoles(builder, bigHolesVec);
  Shell.addPoints(builder, pointsVec);
  Shell.addType(builder, ShellType.NONE);
  Shell.addProfilesFaceIds(builder, faceIdsVec);
  const shellOff = Shell.endShell(builder);
  builder.finish(shellOff);

  const buf = new flatbuffers.ByteBuffer(builder.asUint8Array());
  return Shell.getRootAsShell(buf);
}

describe("ShellConstructor: buffer-count under-prediction", () => {
  it("does not crash and produces correct, trimmed buffers when the sizing pass under-predicts", () => {
    const cols = 200;
    const rows = 200;
    const shell = buildGridShell(cols, rows);
    const totalTriangles = (cols - 1) * (rows - 1) * 2;

    const templates = new ShellTemplateConstructor();
    const predicted = templates.newMeshTemplate(shell) as
      | TileBasicData
      | TileBasicData[];
    const predictedArray = Array.isArray(predicted) ? predicted : [predicted];
    expect(predictedArray.length).toBeGreaterThan(1); // sanity: this fixture genuinely needs multiple buffers

    // Simulate ShellTemplateConstructor under-predicting: drop the last
    // buffer it correctly computed, so ShellConstructor's own real
    // accounting runs out of pre-built buffers partway through - the
    // exact failure shape a genuine Pass1/Pass2 divergence would produce.
    const truncated: TileData[] = predictedArray
      .slice(0, -1)
      .map((m) => ({ ...m }) as TileData);

    const ctor = new ShellConstructor();
    expect(() => {
      ctor.construct(shell, truncated);
    }).not.toThrow();

    // The constructor must have grown the array past what we gave it.
    expect(truncated.length).toBeGreaterThan(predictedArray.length - 1);

    let totalIndices = 0;
    let totalVertices = 0;
    for (const tile of truncated) {
      expect(tile.indexBuffer).toBeDefined();
      expect(tile.positionBuffer).toBeDefined();
      // The buffer's reported count must match its real trimmed length,
      // not the safe-upper-bound allocation size - downstream code
      // (VirtualTilesController.setupTileSampleAttributes) treats
      // indexCount/positionCount as an authoritative exact count when
      // copying this shell's data into the render tile.
      expect(tile.indexBuffer!.length).toBe(tile.indexCount);
      expect(tile.positionBuffer!.length).toBe(tile.positionCount);
      expect(tile.indexCount).toBeLessThanOrEqual(limitOf2Bytes);
      // Every index must address a real vertex within this SAME buffer.
      const vertexCount = tile.positionBuffer!.length / 3;
      for (let i = 0; i < tile.indexBuffer!.length; i++) {
        expect(tile.indexBuffer![i]).toBeLessThan(vertexCount);
      }
      totalIndices += tile.indexBuffer!.length;
      totalVertices += tile.positionBuffer!.length / 3;
    }

    // Every triangle got 3 indices and 3 (non-deduplicated) vertices
    // somewhere across the buffers - nothing silently dropped.
    expect(totalIndices).toBe(totalTriangles * 3);
    expect(totalVertices).toBe(totalTriangles * 3);
  });

  it("handles multiple consecutive under-predicted buffers, not just the last one", () => {
    const cols = 250;
    const rows = 250;
    const shell = buildGridShell(cols, rows);
    const totalTriangles = (cols - 1) * (rows - 1) * 2;

    const templates = new ShellTemplateConstructor();
    const predicted = templates.newMeshTemplate(shell) as
      | TileBasicData
      | TileBasicData[];
    const predictedArray = Array.isArray(predicted) ? predicted : [predicted];
    expect(predictedArray.length).toBeGreaterThan(3); // sanity: enough buffers to drop several

    // Drop the last THREE predicted buffers, not just one - exercises
    // consecutive dynamic-buffer creation (setTileData/
    // finalizeCurrentIfDynamic firing back-to-back for buffers whose
    // _currentTileIndex differs each time), not just a single isolated
    // overflow.
    const truncated: TileData[] = predictedArray
      .slice(0, -3)
      .map((m) => ({ ...m }) as TileData);

    const ctor = new ShellConstructor();
    expect(() => {
      ctor.construct(shell, truncated);
    }).not.toThrow();

    let totalIndices = 0;
    let totalVertices = 0;
    for (const tile of truncated) {
      expect(tile.indexBuffer!.length).toBe(tile.indexCount);
      expect(tile.positionBuffer!.length).toBe(tile.positionCount);
      const vertexCount = tile.positionBuffer!.length / 3;
      for (let i = 0; i < tile.indexBuffer!.length; i++) {
        expect(tile.indexBuffer![i]).toBeLessThan(vertexCount);
      }
      totalIndices += tile.indexBuffer!.length;
      totalVertices += tile.positionBuffer!.length / 3;
    }
    expect(totalIndices).toBe(totalTriangles * 3);
    expect(totalVertices).toBe(totalTriangles * 3);
  });

  it("still produces exactly the predicted buffer count when the sizing pass is correct (no regression)", () => {
    const cols = 100;
    const rows = 100;
    const shell = buildGridShell(cols, rows);

    const templates = new ShellTemplateConstructor();
    const predicted = templates.newMeshTemplate(shell) as
      | TileBasicData
      | TileBasicData[];
    const predictedArray = Array.isArray(predicted) ? predicted : [predicted];

    const real: TileData[] = predictedArray.map((m) => ({ ...m }) as TileData);
    const ctor = new ShellConstructor();
    ctor.construct(shell, real.length === 1 ? real[0] : real);

    expect(real.length).toBe(predictedArray.length);
    for (let i = 0; i < real.length; i++) {
      // Untouched (non-dynamic) buffers keep the sizing pass's own exact
      // prediction unchanged.
      expect(real[i].indexCount).toBe(predictedArray[i].indexCount);
      expect(real[i].positionCount).toBe(predictedArray[i].positionCount);
      expect(real[i].indexBuffer!.length).toBe(predictedArray[i].indexCount);
    }
  });
});
