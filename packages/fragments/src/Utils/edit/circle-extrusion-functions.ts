import * as FB from "flatbuffers";
import * as TFB from "../../Schema";
import * as ET from "./edit-types";

export function copyCircleExtrusion(
  builder: FB.Builder,
  current: TFB.CircleExtrusion,
) {
  const radiuses = current.radiusArray() as Float64Array;
  const radiusRef = TFB.CircleExtrusion.createRadiusVector(builder, radiuses);

  // Meshes.circleExtrusions.axes
  const axesLength = current.axesLength();
  const axesOffsets: number[] = [];

  for (let j = 0; j < axesLength; j++) {
    const currentAxis = current.axes(j) as TFB.Axis;

    // Meshes.circleExtrusions.axes.circleCurves
    const circleCurvesLength = currentAxis.circleCurvesLength();
    TFB.Axis.startCircleCurvesVector(builder, circleCurvesLength);
    for (let k = 0; k < circleCurvesLength; k++) {
      const h = circleCurvesLength - 1 - k;
      const currentCc = currentAxis.circleCurves(h) as TFB.CircleCurve;

      const position = currentCc.position() as TFB.DoubleVector;
      const radius = currentCc.radius();
      const aperture = currentCc.aperture();
      const xDir = currentCc.xDirection() as TFB.FloatVector;
      const yDir = currentCc.yDirection() as TFB.FloatVector;
      const px = position.x();
      const py = position.y();
      const pz = position.z();
      const dxx = xDir.x();
      const dxy = xDir.y();
      const dxz = xDir.z();
      const dyx = yDir.x();
      const dyy = yDir.y();
      const dyz = yDir.z();

      // prettier-ignore
      TFB.CircleCurve.createCircleCurve(
          builder, aperture, px, py, pz, radius,
          dxx, dxy, dxz, dyx, dyy, dyz
        );
    }

    const circleCurvesOffset = builder.endVector();

    // Meshes.circleExtrusions.axes.wires
    const wiresLength = currentAxis.wiresLength();
    TFB.Axis.startWiresVector(builder, wiresLength);
    for (let k = 0; k < wiresLength; k++) {
      const h = wiresLength - 1 - k;
      const currentWire = currentAxis.wires(h) as TFB.Wire;
      const p1 = currentWire.p1() as TFB.FloatVector;
      const p2 = currentWire.p2() as TFB.FloatVector;
      // prettier-ignore
      TFB.Wire.createWire(builder,
          p1.x(), p1.y(), p1.z(),
          p2.x(), p2.y(), p2.z()
        );
    }

    const wiresOffset = builder.endVector();

    // Meshes.circleExtrusions.axes.wireSets
    // TODO: Implement wire sets
    TFB.Axis.startWireSetsVector(builder, 0);
    const wireSetOffset = builder.endVector();

    // Meshes.circleExtrusions.axes.order
    const ordersArray = currentAxis.orderArray() as Uint32Array;
    const ordersOffset = TFB.Axis.createOrderVector(builder, ordersArray);

    // Meshes.circleExtrusions.axes.parts
    const partsArray = Array.from(currentAxis.partsArray() as Int8Array);
    const axisPartsOffset = TFB.Axis.createPartsVector(builder, partsArray);

    TFB.Axis.startAxis(builder);
    TFB.Axis.addCircleCurves(builder, circleCurvesOffset);
    TFB.Axis.addOrder(builder, ordersOffset);
    TFB.Axis.addWires(builder, wiresOffset);
    TFB.Axis.addWireSets(builder, wireSetOffset);
    TFB.Axis.addParts(builder, axisPartsOffset);
    const axisOffset = TFB.Axis.endAxis(builder);
    axesOffsets.push(axisOffset);
  }

  const axesRef = TFB.CircleExtrusion.createAxesVector(builder, axesOffsets);

  TFB.CircleExtrusion.startCircleExtrusion(builder);
  TFB.CircleExtrusion.addAxes(builder, axesRef);
  TFB.CircleExtrusion.addRadius(builder, radiusRef);
  const ceOffset = TFB.CircleExtrusion.endCircleExtrusion(builder);
  return ceOffset;
}

export function createCircleExtrusion(
  builder: FB.Builder,
  circleExtrusion: ET.RawCircleExtrusion,
) {
  const radiuses = circleExtrusion.radius;
  const radiusRef = TFB.CircleExtrusion.createRadiusVector(builder, radiuses);

  const axesOffsets: number[] = [];
  for (const axis of circleExtrusion.axes) {
    const circleCurvesLength = axis.circleCurves.length;
    TFB.Axis.startCircleCurvesVector(builder, circleCurvesLength);
    for (const circleCurve of axis.circleCurves) {
      TFB.CircleCurve.createCircleCurve(
        builder,
        circleCurve.aperture,
        circleCurve.position[0],
        circleCurve.position[1],
        circleCurve.position[2],
        circleCurve.radius,
        circleCurve.xDirection[0],
        circleCurve.xDirection[1],
        circleCurve.xDirection[2],
        circleCurve.yDirection[0],
        circleCurve.yDirection[1],
        circleCurve.yDirection[2],
      );
    }

    const circleCurvesOffset = builder.endVector();

    const wiresLength = axis.wires.length;
    TFB.Axis.startWiresVector(builder, wiresLength);
    for (const wire of axis.wires) {
      TFB.Wire.createWire(
        builder,
        wire[0],
        wire[1],
        wire[2],
        wire[3],
        wire[4],
        wire[5],
      );
    }
    const wiresOffset = builder.endVector();

    const allWireSetsOffsets: number[] = [];
    for (const wireSet of axis.wireSets) {
      TFB.WireSet.startPsVector(builder, wireSet.length / 3);
      for (let i = 0; i < wireSet.length - 2; i += 3) {
        TFB.FloatVector.createFloatVector(
          builder,
          wireSet[i],
          wireSet[i + 1],
          wireSet[i + 2],
        );
      }
      const psOffset = builder.endVector();

      TFB.WireSet.startWireSet(builder);
      TFB.WireSet.addPs(builder, psOffset);
      const wireSetOffset = TFB.WireSet.endWireSet(builder);
      allWireSetsOffsets.push(wireSetOffset);
    }

    const wireSetOffset = TFB.Axis.createWireSetsVector(
      builder,
      allWireSetsOffsets,
    );

    const ordersOffset = TFB.Axis.createOrderVector(builder, axis.order);
    const axisPartsOffset = TFB.Axis.createPartsVector(builder, axis.parts);

    TFB.Axis.startAxis(builder);
    TFB.Axis.addCircleCurves(builder, circleCurvesOffset);
    TFB.Axis.addOrder(builder, ordersOffset);
    TFB.Axis.addWires(builder, wiresOffset);
    TFB.Axis.addWireSets(builder, wireSetOffset);
    TFB.Axis.addParts(builder, axisPartsOffset);
    const axisOffset = TFB.Axis.endAxis(builder);
    axesOffsets.push(axisOffset);
  }

  const axesRef = TFB.CircleExtrusion.createAxesVector(builder, axesOffsets);

  TFB.CircleExtrusion.startCircleExtrusion(builder);
  TFB.CircleExtrusion.addAxes(builder, axesRef);
  TFB.CircleExtrusion.addRadius(builder, radiusRef);
  const ceOffset = TFB.CircleExtrusion.endCircleExtrusion(builder);
  return ceOffset;
}
