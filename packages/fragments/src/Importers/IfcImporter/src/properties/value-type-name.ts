import * as WEBIFC from "web-ifc";

// web-ifc exposes each schema as a namespace object whose keys are the IFC
// class names ("IfcCompoundPlaneAngleMeasure", ...). Property keys survive
// minification; class names (`constructor.name`) do not, so a bundled app
// would otherwise write names like "K" into the .frag.
let classNames: Map<unknown, string> | null = null;

function getClassNames() {
  if (classNames) return classNames;
  classNames = new Map();
  const schemas = [WEBIFC.IFC2X3, WEBIFC.IFC4, WEBIFC.IFC4X3] as unknown[];
  for (const schema of schemas) {
    if (!schema || typeof schema !== "object") continue;
    for (const [key, value] of Object.entries(schema)) {
      if (typeof value !== "function" || classNames.has(value)) continue;
      classNames.set(value, key.toUpperCase());
    }
  }
  return classNames;
}

/**
 * The IFC type name of a web-ifc value wrapper (e.g. "IFCLABEL"), or
 * undefined when it is not one. Most wrappers carry it in `name`; a few
 * (IfcCompoundPlaneAngleMeasure, IfcComplexNumber, IfcLineIndex,
 * IfcArcIndex, IfcPropertySetDefinitionSet) don't, and for those the name
 * comes from the schema namespace key, never from `constructor.name`.
 */
export function ifcValueTypeName(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const own = (value as { name?: unknown }).name;
  if (typeof own === "string" && own) return own;
  return getClassNames().get((value as object).constructor);
}
