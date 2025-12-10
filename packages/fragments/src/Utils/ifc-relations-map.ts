import * as WEBIFC from "web-ifc";

export const ifcRelationsMap = new Map<
  number,
  { forRelating: string; forRelated: string }
>([
  [
    WEBIFC.IFCRELADHERESTOELEMENT,
    {
      forRelating: "HasSurfaceFeatures",
      forRelated: "AdheresToElement",
    },
  ],
  [
    WEBIFC.IFCRELPOSITIONS,
    {
      forRelating: "Positions",
      forRelated: "PositionedRelativeTo",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESPROFILEDEF,
    {
      forRelating: "AssociatedTo",
      forRelated: "HasAssociations",
    },
  ],
  [
    WEBIFC.IFCRELSPACEBOUNDARY2NDLEVEL,
    {
      forRelating: "BoundedBy",
      forRelated: "ProvidesBoundaries",
    },
  ],
  [
    WEBIFC.IFCRELSPACEBOUNDARY1STLEVEL,
    {
      forRelating: "BoundedBy",
      forRelated: "ProvidesBoundaries",
    },
  ],
  [
    WEBIFC.IFCRELINTERFERESELEMENTS,
    {
      forRelating: "InterferesElements",
      forRelated: "IsInterferedByElements",
    },
  ],
  [
    WEBIFC.IFCRELDEFINESBYTEMPLATE,
    {
      forRelating: "Defines",
      forRelated: "IsDefinedBy",
    },
  ],
  [
    WEBIFC.IFCRELDEFINESBYOBJECT,
    {
      forRelating: "Declares",
      forRelated: "IsDeclaredBy",
    },
  ],
  [
    WEBIFC.IFCRELDECLARES,
    {
      forRelating: "Declares",
      forRelated: "HasContext",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTOGROUPBYFACTOR,
    {
      forRelating: "IsGroupedBy",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTASKS,
    {
      forRelating: "Controls",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELAGGREGATES,
    {
      forRelating: "IsDecomposedBy",
      forRelated: "Decomposes",
    },
  ],
  [
    WEBIFC.IFCRELVOIDSELEMENT,
    {
      forRelating: "HasOpenings",
      forRelated: "VoidsElements",
    },
  ],
  [
    WEBIFC.IFCRELSPACEBOUNDARY,
    {
      forRelating: "BoundedBy",
      forRelated: "ProvidesBoundaries",
    },
  ],
  [
    WEBIFC.IFCRELSERVICESBUILDINGS,
    {
      forRelating: "ServicesBuildings",
      forRelated: "ServicedBySystems",
    },
  ],
  [
    WEBIFC.IFCRELSEQUENCE,
    {
      forRelating: "IsPredecessorTo",
      forRelated: "IsSuccessorFrom",
    },
  ],
  [
    WEBIFC.IFCRELSCHEDULESCOSTITEMS,
    {
      forRelating: "ReferencedBy",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELREFERENCEDINSPATIALSTRUCTURE,
    {
      forRelating: "ReferencesElements",
      forRelated: "ReferencedInStructures",
    },
  ],
  [
    WEBIFC.IFCRELPROJECTSELEMENT,
    {
      forRelating: "HasProjections",
      forRelated: "ProjectsElements",
    },
  ],
  [
    WEBIFC.IFCRELOVERRIDESPROPERTIES,
    {
      forRelating: "DefinesOccurrence",
      forRelated: "IsDefinedBy",
    },
  ],
  [
    WEBIFC.IFCRELOCCUPIESSPACES,
    {
      forRelating: "IsActingUpon",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELNESTS,
    {
      forRelating: "IsNestedBy",
      forRelated: "Nests",
    },
  ],
  [
    WEBIFC.IFCRELINTERACTIONREQUIREMENTS,
    {
      forRelating: "HasInteractionReqsTo",
      forRelated: "HasInteractionReqsFrom",
    },
  ],
  [
    WEBIFC.IFCRELFLOWCONTROLELEMENTS,
    {
      forRelating: "HasControlElements",
      forRelated: "AssignedToFlowElement",
    },
  ],
  [
    WEBIFC.IFCRELFILLSELEMENT,
    {
      forRelating: "HasFillings",
      forRelated: "FillsVoids",
    },
  ],
  [
    WEBIFC.IFCRELDEFINESBYTYPE,
    {
      forRelating: "Types",
      forRelated: "IsTypedBy",
    },
  ],
  [
    WEBIFC.IFCRELDEFINESBYPROPERTIES,
    {
      forRelating: "DefinesOccurrence",
      forRelated: "IsDefinedBy",
    },
  ],
  [
    WEBIFC.IFCRELDEFINES,
    {
      forRelating: "DefinesOccurrence",
      forRelated: "IsDefinedBy",
    },
  ],
  [
    WEBIFC.IFCRELDECOMPOSES,
    {
      forRelating: "IsDecomposedBy",
      forRelated: "Decomposes",
    },
  ],
  [
    WEBIFC.IFCRELCOVERSSPACES,
    {
      forRelating: "HasCoverings",
      forRelated: "CoversSpaces",
    },
  ],
  [
    WEBIFC.IFCRELCOVERSBLDGELEMENTS,
    {
      forRelating: "HasCoverings",
      forRelated: "CoversElements",
    },
  ],
  [
    WEBIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
    {
      forRelating: "ContainsElements",
      forRelated: "ContainedInStructure",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSWITHREALIZINGELEMENTS,
    {
      forRelating: "ConnectedTo",
      forRelated: "ConnectedFrom",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSWITHECCENTRICITY,
    {
      forRelating: "ConnectedBy",
      forRelated: "ConnectsStructuralMembers",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSSTRUCTURALMEMBER,
    {
      forRelating: "ConnectedBy",
      forRelated: "ConnectsStructuralMembers",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSSTRUCTURALELEMENT,
    {
      forRelating: "HasStructuralMember",
      forRelated: "ReferencesElement",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSSTRUCTURALACTIVITY,
    {
      forRelating: "AssignedStructuralActivity",
      forRelated: "AssignedToStructuralItem",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSPORTS,
    {
      forRelating: "ConnectedTo",
      forRelated: "ConnectedFrom",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSPORTTOELEMENT,
    {
      forRelating: "ContainedIn",
      forRelated: "HasPorts",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSPATHELEMENTS,
    {
      forRelating: "ConnectedTo",
      forRelated: "ConnectedFrom",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTSELEMENTS,
    {
      forRelating: "ConnectedTo",
      forRelated: "ConnectedFrom",
    },
  ],
  [
    WEBIFC.IFCRELCONNECTS,
    {
      forRelating: "ConnectedTo",
      forRelated: "ConnectedFrom",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESPROFILEPROPERTIES,
    {
      forRelating: "AssociatedTo",
      forRelated: "HasAssociations",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESMATERIAL,
    {
      forRelating: "AssociatedTo",
      forRelated: "HasAssociations",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESLIBRARY,
    {
      forRelating: "LibraryInfoForObjects",
      forRelated: "HasAssociations",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESDOCUMENT,
    {
      forRelating: "DocumentInfoForObjects",
      forRelated: "DocumentRefForObjects",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESCONSTRAINT,
    {
      forRelating: "AssociatedTo",
      forRelated: "HasAssociations",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESCLASSIFICATION,
    {
      forRelating: "HasReferences",
      forRelated: "ClassificationRefForObjects",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESAPPROVAL,
    {
      forRelating: "ApprovedObjects",
      forRelated: "HasAssociations",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATESAPPLIEDVALUE,
    {
      forRelating: "AssociatedTo",
      forRelated: "HasAssociations",
    },
  ],
  [
    WEBIFC.IFCRELASSOCIATES,
    {
      forRelating: "AssociatedTo",
      forRelated: "HasAssociations",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTORESOURCE,
    {
      forRelating: "ResourceOf",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTOPROJECTORDER,
    {
      forRelating: "ReferencedBy",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTOPRODUCT,
    {
      forRelating: "ReferencedBy",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTOPROCESS,
    {
      forRelating: "OperatesOn",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTOGROUP,
    {
      forRelating: "IsGroupedBy",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTOCONTROL,
    {
      forRelating: "Controls",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNSTOACTOR,
    {
      forRelating: "IsActingUpon",
      forRelated: "HasAssignments",
    },
  ],
  [
    WEBIFC.IFCRELASSIGNS,
    {
      forRelating: "ReferencedBy",
      forRelated: "HasAssignments",
    },
  ],
]);
