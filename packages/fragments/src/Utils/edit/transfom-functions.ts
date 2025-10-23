import * as FB from "flatbuffers";
import * as TFB from "../../Schema";
import * as ET from "./edit-types";

export function createTransform(
  transform: ET.RawTransformData,
  builder: FB.Builder,
) {
  const meshesPos = transform.position;
  const meshesDx = transform.xDirection;
  const meshesDy = transform.yDirection;

  // prettier-ignore
  const coordinatesOffset = TFB.Transform.createTransform(builder,
            meshesPos[0], meshesPos[1], meshesPos[2],
            meshesDx[0], meshesDx[1], meshesDx[2],
            meshesDy[0], meshesDy[1], meshesDy[2]);

  return coordinatesOffset;
}

export function copyTransform(builder: FB.Builder, transform: TFB.Transform) {
  const meshesPos = transform.position() as TFB.DoubleVector;
  const meshesDx = transform.xDirection() as TFB.FloatVector;
  const meshesDy = transform.yDirection() as TFB.FloatVector;

  // prettier-ignore
  const coordinatesOffset = TFB.Transform.createTransform(builder,
            meshesPos.x(), meshesPos.y(), meshesPos.z(),
            meshesDx.x(), meshesDx.y(), meshesDx.z(),
            meshesDy.x(), meshesDy.y(), meshesDy.z());

  return coordinatesOffset;
}
