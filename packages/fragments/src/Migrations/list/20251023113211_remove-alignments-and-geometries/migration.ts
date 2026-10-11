import { EditRequestType } from "../../../Utils/edit/edit-types";
import { defineMigration, drop } from "../../src/define";
import {
  ALIGNMENT_CATEGORY,
  AlignmentData,
  convertAlignments,
} from "./alignments";
import type { FromModel, Handlers } from "./types";

/**
 * 3.2 gave every transform, representation, material and sample a local id,
 * which editing relies on. Hands them out the way its importer does: from the
 * next free id of the file, in this order, the first two counting down.
 */
function allocate(model: FromModel) {
  const meshes = model.meshes;
  const first = model.max_local_id;
  let next = first;
  const take = (count: number | undefined, descending: boolean) => {
    const ids = new Uint32Array(count ?? 0);
    for (let i = 0; i < ids.length; i++) {
      ids[descending ? ids.length - 1 - i : i] = next++;
    }
    return ids;
  };
  const globalTransforms = take(meshes?.global_transforms?.length, true);
  const representations = take(meshes?.representations?.length, true);
  const materials = take(meshes?.materials?.length, false);
  const samples = take(meshes?.samples?.length, false);
  const localTransforms = take(meshes?.local_transforms?.length, false);
  return {
    globalTransforms,
    representations,
    materials,
    samples,
    localTransforms,
    next,
    count: next - first,
  };
}

interface Ctx {
  /** The alignments of the file, in the form 3.2 keeps them as items. */
  alignments: AlignmentData[];
  /** Alignments of a 3.0 file, whose civil geometry is not converted. */
  unconverted: number;
  ids?: ReturnType<typeof allocate>;
}

function idsOf(model: FromModel, ctx: Ctx) {
  ctx.ids ??= allocate(model);
  return ctx.ids;
}

type MaxLocalId = {
  "Model.max_local_id": (node: FromModel, ctx: Ctx) => number;
};

export default defineMigration<Ctx, Handlers<Ctx> & MaxLocalId>({
  title: "Alignments become items, geometry gets ids",

  context: () => ({ alignments: [], unconverted: 0 }),

  layout: {
    // 3.2 has no place for the two fields: an alignment is an item there.
    // They are read here, while the file is still in its old layout, and
    // `edit` creates the items once it is in the new one.
    "Model.alignments": (model, ctx) => {
      Object.assign(ctx, convertAlignments(model));
      return drop;
    },
    // Only held the curves of the alignments, which are converted above.
    "Model.geometries": () => drop,
    // The importer leaves one id unused after the geometry, and so does this.
    "Model.max_local_id": (model, ctx) => idsOf(model, ctx).next + 1,
    // Without face ids every profile is a face of its own, which is how a
    // 3.1 file was always drawn.
    "Shell.profiles_face_ids": () => new Uint16Array(0),
    "Meshes.global_transform_ids": (meshes, ctx) =>
      idsOf(meshes.root as FromModel, ctx).globalTransforms,
    "Meshes.representation_ids": (meshes, ctx) =>
      idsOf(meshes.root as FromModel, ctx).representations,
    "Meshes.material_ids": (meshes, ctx) =>
      idsOf(meshes.root as FromModel, ctx).materials,
    "Meshes.sample_ids": (meshes, ctx) =>
      idsOf(meshes.root as FromModel, ctx).samples,
    "Meshes.local_transform_ids": (meshes, ctx) =>
      idsOf(meshes.root as FromModel, ctx).localTransforms,
  },

  // The items get the next ids of the file, as they do from the importer:
  // it creates them after the geometry.
  edit: (ctx) =>
    ctx.alignments.map((alignment) => ({
      type: EditRequestType.CREATE_ITEM,
      data: {
        category: ALIGNMENT_CATEGORY,
        data: { data: { value: JSON.stringify(alignment), type: "UNDEFINED" } },
      },
    })),

  report: (ctx) => ({
    convertedAlignments: ctx.alignments.length,
    droppedAlignments: ctx.unconverted,
    assignedIds: ctx.ids?.count ?? 0,
  }),
});
