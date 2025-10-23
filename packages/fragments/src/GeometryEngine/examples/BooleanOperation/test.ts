// Disable no extraneous dependencies as this is just for the examples
/* eslint-disable import/no-extraneous-dependencies */

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as BUI from "@thatopen/ui";
import { GeometryEngine } from "../../index";
import { BooleanOperationData } from "../../src";

// Set up scene

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const container = document.getElementById("container") as HTMLDivElement;

const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.SimpleCamera(components);

components.init();

world.scene.setup();
// world.camera.three.far = 10000;

world.scene.three.add(new THREE.AxesHelper());

world.camera.three.far = 10000;

world.camera.controls.setLookAt(3, 3, 3, 0, 0, 0);

// Scene update

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

const api = new WEBIFC.IfcAPI();
api.SetWasmPath("/node_modules/web-ifc/", false);
await api.Init();

const geometryEngine = new GeometryEngine(api);

const cube1 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({
    color: "red",
    side: 2,
    transparent: true,
    opacity: 0.3,
  }),
);
// world.scene.three.add(cube1);
cube1.position.set(0.5, 0.5, 0.5);

const cube2 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({
    color: "blue",
    side: 2,
    transparent: true,
    opacity: 0.3,
  }),
);
cube2.position.set(1, 1, 1);
world.scene.three.add(cube2);

const cube3 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({
    color: "blue",
    side: 2,
    transparent: true,
    opacity: 0.3,
  }),
);
world.scene.three.add(cube3);

const result = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: "green", side: 2 }),
);
world.scene.three.add(result);

const booleanData: BooleanOperationData = {
  type: "DIFFERENCE",
  target: cube1,
  operands: [cube2, cube3],
};

const update = () => {
  cube1.rotation.x += Math.PI / 180;
  cube1.rotation.y += Math.PI / 180;
  cube1.rotation.z += Math.PI / 180;
  cube1.updateMatrixWorld(true);
  cube2.updateMatrixWorld(true);
  cube3.updateMatrixWorld(true);
  geometryEngine.getBooleanOperation(result.geometry, booleanData);
};

update();

world.renderer.onBeforeUpdate.add(() => {
  update();
});

// UI

BUI.Manager.init();

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Boolean operations" class="options-menu">

      </bim-panel-section>

      <bim-panel-section label="Controls">
      
        <bim-dropdown label="Type" @change=${(e: any) => {
          booleanData.type = e.target.value[0];
        }}>
          <bim-option checked label="Difference" value="DIFFERENCE"></bim-option>
          <bim-option label="Union" value="UNION"></bim-option>
        </bim-dropdown>

        <bim-checkbox label="Operands visible" @change=${(e: any) => {
          cube2.visible = e.target.value;
          cube3.visible = e.target.value;
        }}>
        
        </bim-checkbox>

      </bim-panel-section>

    </bim-panel>
  `;
}, {});

document.body.append(panel);

/* MD
  And we will make some logic that adds a button to the screen when the user is visiting our app from their phone, allowing to show or hide the menu. Otherwise, the menu would make the app unusable.
*/

const button = BUI.Component.create<BUI.PanelSection>(() => {
  const onClick = () => {
    if (panel.classList.contains("options-menu-visible")) {
      panel.classList.remove("options-menu-visible");
    } else {
      panel.classList.add("options-menu-visible");
    }
  };

  return BUI.html`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${onClick}>
    </bim-button>
  `;
});

document.body.append(button);
