import * as THREE from "three";
import { AxisPartClass } from "../../../../../Schema";

export interface LinkPoint {
  placement: THREE.Vector3;
  axisClass: AxisPartClass;
  first?: boolean;
  last?: boolean;
}
