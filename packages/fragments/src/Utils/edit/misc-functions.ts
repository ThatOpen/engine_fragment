import * as FB from "flatbuffers";
import * as TFB from "../../Schema";

export function copyFloatVector(builder: FB.Builder, vector: TFB.FloatVector) {
  return TFB.FloatVector.createFloatVector(
    builder,
    vector.x(),
    vector.y(),
    vector.z(),
  );
}
