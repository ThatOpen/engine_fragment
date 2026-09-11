export * from "./Utils";
// Exported directly (not through the Utils barrel) so the worker bundle,
// which imports Utils, does not retain web-ifc through these two modules.
export * from "./Utils/ifc-parsing-utils";
export * from "./Utils/ifc-stream";
export * from "./Utils/ifc-splitter";
export * from "./Schema";
export * from "./FragmentsModels";
export * from "./Importers";
export * from "./GeometryEngine";
