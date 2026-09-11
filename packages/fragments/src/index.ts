export * from "./Utils";
// Exported directly (not through the Utils barrel) so the worker bundle,
// which imports Utils, does not retain web-ifc through these modules.
export * from "./Utils/ifc-index";
export * from "./Utils/ifc-parsing-utils";
export * from "./Utils/ifc-resolver";
export * from "./Utils/ifc-scanner";
export * from "./Utils/ifc-splitter";
export * from "./Utils/ifc-stream";

export * from "./FragmentsModels";
export * from "./GeometryEngine";
export * from "./Importers";
export * from "./Schema";
