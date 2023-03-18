import * as flatbuffers from "flatbuffers";
import * as FB from "./flatbuffers/fragments";
import { Fragment } from "./fragment";

export class Exporter {
  export(fragments: Fragment[]) {
    const builder = new flatbuffers.Builder(1024);
    const items: number[] = [];

    for (const fragment of fragments) {
      const result = fragment.export();
      const posVector = FB.Fragment.createPositionVector(
        builder,
        result.position
      );
      const normalVector = FB.Fragment.createNormalVector(
        builder,
        result.normal
      );
      const blockVector = FB.Fragment.createBlockIdVector(
        builder,
        result.blockID
      );
      const groupsVector = FB.Fragment.createGroupsVector(
        builder,
        result.groups
      );
      const matsVector = FB.Fragment.createMaterialsVector(
        builder,
        result.materials
      );
      const matricesVector = FB.Fragment.createMatricesVector(
        builder,
        result.matrices
      );

      const idsStr = builder.createString(result.ids);
      const idStr = builder.createString(result.id);

      FB.Fragment.startFragment(builder);
      FB.Fragment.addPosition(builder, posVector);
      FB.Fragment.addNormal(builder, normalVector);
      FB.Fragment.addBlockId(builder, blockVector);
      FB.Fragment.addGroups(builder, groupsVector);
      FB.Fragment.addMaterials(builder, matsVector);
      FB.Fragment.addMatrices(builder, matricesVector);
      FB.Fragment.addIds(builder, idsStr);
      FB.Fragment.addId(builder, idStr);
      const exported = FB.Fragment.endFragment(builder);
      items.push(exported);
    }

    const itemsVector = FB.Fragments.createItemsVector(builder, items);

    FB.Fragments.startFragments(builder);
    FB.Fragments.addItems(builder, itemsVector);
    const result = FB.Fragments.endFragments(builder);
    builder.finish(result);

    return builder.asUint8Array();
  }
}
