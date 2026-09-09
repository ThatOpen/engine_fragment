export * from "./flatbuffers-json-converter";
export * from "./ifc-category-map";
export * from "./event";
export * from "./async-event";
export * from "./data-map";
export * from "./data-set";
export * from "./edit";
export * from "./shells";
export * from "./ifc-utils";
export * from "./ifc-geometries-map";
export * from "./ifc-relations-map";
export * from "./worker-utils";
// ifc-splitter, ifc-parsing-utils and ifc-stream are exported from the package
// root instead: this barrel is imported by worker-side code and ifc-stream
// depends on web-ifc, which must not end up in the worker bundle.
