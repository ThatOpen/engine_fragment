import type { FromAlignment, FromGeometries, FromModel } from "./types";

// What an alignment is from 3.2 on: an item of this category whose `data`
// attribute is the JSON of an AlignmentData. Spelled out here and not
// imported, because this is the format as it was when 3.2 moved to it.
export const ALIGNMENT_CATEGORY = "ThatOpenAlignment";

export interface AlignmentCurve {
  points: number[];
  type: number;
}

export interface AlignmentData {
  absolute: AlignmentCurve[];
  horizontal: AlignmentCurve[];
  vertical: AlignmentCurve[];
}

// The curve types by their 3.1 number (GeometryClass: lines 1, arc 2,
// clothoid 3, parabola 4), as 3.2 numbers them (AlignmentCurveType: lines 1,
// clothoid 2, arc 3, parabola 4).
const CURVE_TYPES = [0, 1, 3, 2, 4];

/** The points of a curve, last point first. */
function reversed(points: Float32Array) {
  const result: number[] = new Array(points.length);
  const count = points.length / 3;
  for (let i = 0; i < count; i++) {
    const from = (count - 1 - i) * 3;
    result[i * 3] = points[from];
    result[i * 3 + 1] = points[from + 1];
    result[i * 3 + 2] = points[from + 2];
  }
  return result;
}

/**
 * One alignment of a 3.1 file, as the 3.2 importer writes the same alignment.
 *
 * 3.1 kept alignments as three lists of curves (absolute, horizontal,
 * vertical), each curve a sample pointing at a representation pointing at a
 * line. Its importer filled those in three ways that this undoes:
 *
 * - The curves of a list are stored last curve first.
 * - The points of a curve are stored last point first. Read as stored, an
 *   alignment runs backwards, which is how 3.1 drew it.
 * - The curve types are stored against the wrong curves. The samples of an
 *   alignment are consecutive, absolute then horizontal then vertical, but
 *   over that same range the types were written vertical then horizontal
 *   then absolute, and first curve first. So 3.1 showed an absolute curve
 *   with the type of a vertical one.
 */
function convert(
  alignment: FromAlignment,
  geometries: FromGeometries,
): AlignmentData {
  const samples = geometries.samples!;
  const representations = geometries.representations!;
  const lines = geometries.lines!;
  const representationOf = (sample: number) =>
    representations.at(samples.at(sample)!.id)!;

  const absolute = alignment.absolute ?? new Uint32Array(0);
  const horizontal = alignment.horizontal ?? new Uint32Array(0);
  const vertical = alignment.vertical ?? new Uint32Array(0);
  const range = [...absolute, ...horizontal, ...vertical];

  // `typesFrom` is where the types of this list start in the range.
  const curves = (list: Uint32Array, typesFrom: number) => {
    const result: AlignmentCurve[] = [];
    for (let i = 0; i < list.length; i++) {
      const stored = representationOf(list[list.length - 1 - i]);
      const { points } = lines.at(stored.id)!;
      const typed = representationOf(range[typesFrom + i]);
      result.push({
        points: reversed(points!),
        type: CURVE_TYPES[typed.geometry_class] ?? 0,
      });
    }
    return result;
  };

  return {
    absolute: curves(absolute, vertical.length + horizontal.length),
    horizontal: curves(horizontal, vertical.length),
    vertical: curves(vertical, 0),
  };
}

/**
 * The alignments of a 3.1 file in the form 3.2 keeps them, and how many
 * could not be converted.
 *
 * A file written by 3.0 has the same root table but another layout for the
 * civil geometry, which nothing here describes. It is told by the two fields
 * 3.1 added to the root and always wrote, and its alignments are left out.
 */
export function convertAlignments(model: FromModel) {
  const stored = model.alignments;
  const count = stored?.length ?? 0;
  const is31 =
    model.unique_attributes !== null || model.relation_names !== null;
  if (!stored || !model.geometries || !is31) {
    return { alignments: [] as AlignmentData[], unconverted: count };
  }
  const alignments: AlignmentData[] = [];
  for (const alignment of stored) {
    alignments.push(convert(alignment, model.geometries));
  }
  return { alignments, unconverted: 0 };
}
