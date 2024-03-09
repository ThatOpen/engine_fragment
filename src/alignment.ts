import * as THREE from "three";

export interface CivilCurve {
  mesh: THREE.LineSegments;
  data: { [name: string]: any };
}

export interface Alignment {
  vertical: CivilCurve[];
  horizontal: CivilCurve[];
  absolute: CivilCurve[];
}
