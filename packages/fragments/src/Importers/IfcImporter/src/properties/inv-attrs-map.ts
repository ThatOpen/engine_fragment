import * as WEBIFC from "web-ifc";

export const invAttrsMap = new Map([
  [
    WEBIFC.IFCRELDEFINESBYPROPERTIES,
    { forRelating: "DefinesOcurrence", forRelated: "IsDefinedBy" },
  ],
  [
    WEBIFC.IFCRELASSOCIATESMATERIAL,
    { forRelated: "HasAssociations", forRelating: "AssociatedTo" },
  ],
  [
    WEBIFC.IFCRELAGGREGATES,
    { forRelated: "Decomposes", forRelating: "IsDecomposedBy" },
  ],
  [
    WEBIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
    { forRelated: "ContainedInStructure", forRelating: "ContainsElements" },
  ],
]);
