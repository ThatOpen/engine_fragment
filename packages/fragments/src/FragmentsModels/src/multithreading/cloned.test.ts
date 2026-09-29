import * as THREE from "three";
import { expectTypeOf, test } from "vitest";
import type { Cloned } from "./cloned";
import type { ItemData, MeshData } from "../model/model-types";

// Checked by the type checker; the test itself only runs these as no-ops.
test("Cloned drops class prototypes but keeps plain data", () => {
  // What a class instance arrives as isn't the class anymore.
  expectTypeOf<Cloned<THREE.Matrix4>>().not.toMatchTypeOf<THREE.Matrix4>();
  expectTypeOf<Cloned<THREE.Color>>().toEqualTypeOf<{
    readonly isColor: true;
    r: number;
    g: number;
    b: number;
  }>();
  expectTypeOf<Cloned<MeshData[]>>().not.toMatchTypeOf<MeshData[]>();

  // Plain data, containers and binary data arrive as they are.
  expectTypeOf<Cloned<ItemData[]>>().toMatchTypeOf<ItemData[]>();
  expectTypeOf<Cloned<Map<number, string[]>>>().toEqualTypeOf<
    Map<number, string[]>
  >();
  expectTypeOf<Cloned<[Uint8Array, number | null]>>().toEqualTypeOf<
    [Uint8Array, number | null]
  >();
  expectTypeOf<Cloned<any>>().toBeAny();
});
