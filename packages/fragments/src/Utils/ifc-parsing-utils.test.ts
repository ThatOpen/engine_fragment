import { describe, expect, it } from "vitest";
import * as webIfc from "web-ifc";
import { STEP_TOKEN, parseStepArguments } from "./ifc-parsing-utils";

// The tokenizer must keep producing web-ifc's raw tape shape without importing
// web-ifc at runtime (that would drag the whole module into the worker bundle),
// so the codes are mirrored here and checked against the real thing.
describe("ifc-parsing-utils web-ifc parity", () => {
  it("token codes match web-ifc's constants", () => {
    expect(STEP_TOKEN.UNKNOWN).toBe(webIfc.UNKNOWN);
    expect(STEP_TOKEN.STRING).toBe(webIfc.STRING);
    expect(STEP_TOKEN.LABEL).toBe(webIfc.LABEL);
    expect(STEP_TOKEN.ENUM).toBe(webIfc.ENUM);
    expect(STEP_TOKEN.REAL).toBe(webIfc.REAL);
    expect(STEP_TOKEN.REF).toBe(webIfc.REF);
    expect(STEP_TOKEN.INTEGER).toBe(webIfc.INTEGER);
  });

  it("typed values resolve to web-ifc's typecodes", () => {
    const [measure, label, unknown] = parseStepArguments(
      "#1=IFCWALL(IFCLENGTHMEASURE(3.14),IFCLABEL('x'),NOTATYPE(1));",
    ) as { type: number; typecode?: number }[];
    expect(measure.type).toBe(webIfc.LABEL);
    expect(measure.typecode).toBe(webIfc.IFCLENGTHMEASURE);
    expect(label.typecode).toBe(webIfc.IFCLABEL);
    expect(unknown.typecode).toBeUndefined();
  });
});
