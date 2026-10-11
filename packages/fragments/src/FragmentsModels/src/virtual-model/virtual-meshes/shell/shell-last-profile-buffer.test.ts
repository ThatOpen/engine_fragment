import { describe, expect, test } from "vitest";
import * as flatbuffers from "flatbuffers";
import {
  BigShellHole,
  BigShellProfile,
  FloatVector,
  Meshes,
  Shell,
  ShellHole,
  ShellProfile,
  ShellType,
} from "../../../../../Schema";
// Loaded first: the mesh managers and the controllers import each other,
// and the cycle only resolves when entered from the controllers.
import "../../virtual-controllers";
import { VirtualShellManager } from "../virtual-shell-manager";
import { TileData } from "../types";

/**
 * Reproduction of https://github.com/ThatOpen/engine_fragment/issues/307.
 *
 * Two passes walk a shell profile by profile and cut it into buffers of at
 * most 65,536 points. Both use the same sum (points so far + size of the
 * profile just read) and both cut when it goes over the limit, so they
 * agree everywhere but at the end:
 *
 * - `ShellTemplateConstructor` (sizing) cuts, then adds one last buffer
 *   only if something is left over (`manageDataLeft`).
 * - `ShellConstructor` (building) cuts by moving to the next buffer at
 *   once, whether a next profile exists or not.
 *
 * So when the cut falls exactly on the LAST profile of the shell, the
 * builder asks for one buffer more than was sized:
 *
 * - shell sized as several buffers: it reads past the array and throws
 *   `Cannot read properties of undefined (reading 'indexCount')`;
 * - shell sized as ONE buffer: "the next buffer" is the same object, so
 *   its arrays are allocated again and the finished geometry is replaced
 *   by zeros. No error, the shell is just not there.
 *
 * With triangles only, the cut falls every 21,845 triangles (65,535
 * points), so any shell with a multiple of 21,845 triangles trips it.
 *
 * The shells are run through the real `VirtualShellManager`, which is the
 * caller in the reported stack trace.
 */

// One polygon of each kind, laid on z = 0. The passes count indices, not
// distinct points, so the profiles share points. They take turns over
// COPIES copies of them: normals are averaged over every profile around a
// point, which is quadratic if all of them meet at the same three.
const COPIES = 3000;
const POINTS: number[][] = [
  // 0-2: triangle
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  // 3-6: convex quad
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  // 7-14: octagon
  ...Array.from({ length: 8 }, (_, i) => [
    5 + 2 * Math.cos((i * Math.PI) / 4),
    5 + 2 * Math.sin((i * Math.PI) / 4),
    0,
  ]),
  // 15-18: square hole inside the octagon
  [4.5, 4.5, 0],
  [4.5, 5.5, 0],
  [5.5, 5.5, 0],
  [5.5, 4.5, 0],
];

type Kind = "T" | "Q" | "O" | "H";

const KINDS: Record<
  Kind,
  { outer: number[]; hole?: number[]; vertices: number; triangles: number }
> = {
  // Triangle: ShellFace3.
  T: { outer: [0, 1, 2], vertices: 3, triangles: 1 },
  // Convex quad: ShellFace4.
  Q: { outer: [3, 4, 5, 6], vertices: 4, triangles: 2 },
  // Octagon: ShellFaceX through earcut.
  O: { outer: [7, 8, 9, 10, 11, 12, 13, 14], vertices: 8, triangles: 6 },
  // Octagon with a square hole: earcut with holes.
  H: {
    outer: [7, 8, 9, 10, 11, 12, 13, 14],
    hole: [15, 16, 17, 18],
    vertices: 12,
    triangles: 12,
  },
};

type Run = [kind: Kind, count: number];

const buildMeshes = (runs: Run[], big: boolean) => {
  const builder = new flatbuffers.Builder(1024 * 1024);
  const Profile = big ? BigShellProfile : ShellProfile;
  const Hole = big ? BigShellHole : ShellHole;

  const profiles: number[] = [];
  const holes: number[] = [];
  for (const [kind, count] of runs) {
    const kindData = KINDS[kind];
    for (let i = 0; i < count; i++) {
      const profileId = profiles.length;
      const offset = (profileId % COPIES) * POINTS.length;
      const outer = kindData.outer.map((index) => index + offset);
      const hole = kindData.hole?.map((index) => index + offset);
      const indices = Profile.createIndicesVector(builder, outer);
      if (big) {
        profiles.push(BigShellProfile.createBigShellProfile(builder, indices));
      } else {
        profiles.push(ShellProfile.createShellProfile(builder, indices));
      }
      if (!hole) continue;
      const holeIndices = Hole.createIndicesVector(builder, hole);
      if (big) {
        holes.push(
          BigShellHole.createBigShellHole(builder, holeIndices, profileId),
        );
      } else {
        holes.push(ShellHole.createShellHole(builder, holeIndices, profileId));
      }
    }
  }

  const profilesVector = Shell.createProfilesVector(builder, big ? [] : profiles);
  const bigProfilesVector = Shell.createBigProfilesVector(
    builder,
    big ? profiles : [],
  );
  const holesVector = Shell.createHolesVector(builder, big ? [] : holes);
  const bigHolesVector = Shell.createBigHolesVector(builder, big ? holes : []);

  const pointCount = POINTS.length * COPIES;
  Shell.startPointsVector(builder, pointCount);
  for (let i = pointCount - 1; i >= 0; i--) {
    const [x, y, z] = POINTS[i % POINTS.length];
    FloatVector.createFloatVector(builder, x, y, z);
  }
  const pointsVector = builder.endVector();
  const faceIdsVector = Shell.createProfilesFaceIdsVector(builder, []);

  const shell = Shell.createShell(
    builder,
    profilesVector,
    holesVector,
    pointsVector,
    bigProfilesVector,
    bigHolesVector,
    big ? ShellType.BIG : ShellType.NONE,
    faceIdsVector,
  );

  // Only the shells are read by the shell manager, so the rest of the
  // table is left out (`endMeshes` would demand every other vector).
  const shellsVector = Meshes.createShellsVector(builder, [shell]);
  Meshes.startMeshes(builder);
  Meshes.addShells(builder, shellsVector);
  builder.finish(builder.endObject());
  // Copied so the bytes start at offset 0 of their ArrayBuffer, as in a
  // loaded file: the points are read straight from that buffer.
  const bytes = builder.asUint8Array().slice();
  return Meshes.getRootAsMeshes(new flatbuffers.ByteBuffer(bytes));
};

let modelCount = 0;

/** Builds the shell the way the tiles controller does and measures it. */
const build = (runs: Run[], big = false) => {
  const meshes = buildMeshes(runs, big);
  const manager = new VirtualShellManager(`shell-307-${modelCount++}`, meshes);
  manager.setupTemplates();
  // What the tiles are laid out with, before any geometry exists.
  const sized = manager.fetchMeshes(0, false) as TileData | TileData[];
  const sizedBuffers = Array.isArray(sized) ? sized.length : 1;

  const result = manager.fetchMeshes(0, true) as TileData | TileData[];
  const tiles = Array.isArray(result) ? result : [result];

  let vertices = 0;
  let triangles = 0;
  let danglingIndices = 0;
  let allocatedBytes = 0;
  let reportedBytes = 0;
  for (const tile of tiles) {
    const position = tile.positionBuffer as Float32Array;
    const index = tile.indexBuffer as Uint16Array;
    // The counts are what the tiles controller copies by.
    expect(tile.indexCount).toBeLessThanOrEqual(index.length);
    expect(tile.positionCount).toBeLessThanOrEqual(position.length);
    vertices += tile.positionCount! / 3;
    for (let i = 0; i < tile.indexCount!; i += 3) {
      const a = index[i] * 3;
      const b = index[i + 1] * 3;
      const c = index[i + 2] * 3;
      if (Math.max(a, b, c) >= tile.positionCount!) danglingIndices++;
      // Everything lies on z = 0: twice the area of the triangle.
      const area =
        (position[b] - position[a]) * (position[c + 1] - position[a + 1]) -
        (position[c] - position[a]) * (position[b + 1] - position[a + 1]);
      if (Math.abs(area) > 1e-9) triangles++;
    }
    for (const name of [
      "positionBuffer",
      "indexBuffer",
      "normalBuffer",
      "faceIdBuffer",
    ] as const) {
      const buffer = tile[name] as Float32Array;
      allocatedBytes += buffer.buffer.byteLength;
      reportedBytes += buffer.byteLength;
    }
  }
  manager.dispose();
  expect(danglingIndices).toBe(0);
  return {
    sizedBuffers,
    builtBuffers: tiles.length,
    vertices,
    triangles,
    allocatedBytes,
    reportedBytes,
  };
};

const expected = (runs: Run[]) => {
  let vertices = 0;
  let triangles = 0;
  for (const [kind, count] of runs) {
    vertices += KINDS[kind].vertices * count;
    triangles += KINDS[kind].triangles * count;
  }
  return { vertices, triangles };
};

const counted = (built: ReturnType<typeof build>) => ({
  vertices: built.vertices,
  triangles: built.triangles,
});

const name = (runs: Run[], big = false) =>
  `${runs.map(([kind, count]) => `${count}${kind}`).join(" + ")}${big ? " (big)" : ""}`;

const options = { timeout: 30000 };

describe("a shell whose last profile fills its buffer (issue #307)", options, () => {
  // The cut falls after 21,845 triangles, 16,384 quads or 8,192 octagons,
  // or wherever a mix of them adds up to it. Holes are kept few: the sizing
  // pass looks at every hole for every profile.
  describe("sized as several buffers", () => {
    const shapes: [Run[], boolean][] = [
      [[["T", 43690]], false],
      [[["T", 43690]], true],
      [[["T", 65535]], false],
      [[["T", 21845], ["Q", 16384]], false],
      [[["T", 21845], ["O", 8192]], false],
      [[["T", 21845], ["Q", 16381], ["H", 1]], false],
      [[["Q", 16384], ["T", 100], ["H", 60], ["Q", 16129]], false],
    ];
    test.each(shapes.map(([runs, big]) => [name(runs, big), runs, big]))(
      "%s is built whole",
      (_label, runs, big) => {
        const built = build(runs as Run[], big as boolean);
        expect(built.sizedBuffers).toBeGreaterThan(1);
        expect(counted(built)).toEqual(expected(runs as Run[]));
      },
    );
  });

  describe("sized as one buffer", () => {
    const shapes: Run[][] = [
      [["T", 21845]],
      [["Q", 16384]],
      [["O", 8192]],
      [["Q", 16381], ["H", 1]],
    ];
    // With a single buffer "the next buffer" was the same object, so the
    // builder wiped it: no error, and no geometry.
    test.each(shapes.map((runs) => [name(runs), runs]))(
      "%s is built whole",
      (_label, runs) => {
        const built = build(runs as Run[]);
        expect(built.sizedBuffers).toBe(1);
        expect(counted(built)).toEqual(expected(runs as Run[]));
      },
    );
  });

  describe("controls: the cut does not fall on the last profile", () => {
    const shapes: [Run[], boolean][] = [
      [[["T", 21844]], false],
      [[["T", 21846]], false],
      [[["T", 43689]], false],
      [[["T", 43691]], false],
      [[["T", 43691]], true],
      // The size of the grid in the tests of #306.
      [[["T", 79202]], false],
      [[["Q", 16383]], false],
      [[["Q", 16385]], false],
      [[["O", 8191]], false],
      [[["O", 8193]], false],
      [[["Q", 16379], ["H", 1]], false],
      [[["T", 21845], ["H", 60]], false],
      [[["H", 60], ["O", 9000], ["Q", 20000], ["T", 30000]], false],
    ];
    test.each(shapes.map(([runs, big]) => [name(runs, big), runs, big]))(
      "%s is built whole",
      (_label, runs, big) => {
        const built = build(runs as Run[], big as boolean);
        expect(counted(built)).toEqual(expected(runs as Run[]));
        expect(built.builtBuffers).toBe(built.sizedBuffers);
      },
    );
  });
});
