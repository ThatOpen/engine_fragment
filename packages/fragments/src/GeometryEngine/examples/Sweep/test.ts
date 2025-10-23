// Disable no extraneous dependencies as this is just for the examples
/* eslint-disable import/no-extraneous-dependencies */

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as BUI from "@thatopen/ui";
import { GeometryEngine } from "../../index";
import { SweepData } from "../../src";

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

const revolve = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({
    color: "red",
    side: 2,
  }),
);
world.scene.three.add(revolve);

// prettier-ignore
const sweepData: SweepData = {
  profilePoints: [
    0, 0, 0,
    1, 0, 0,
    1, 1, 0,
    0, 1, 0,
    0, 0, 0,
  ],
  curvePoints: [
    0, 0, 0,
    0, 5, 0,
    5, 5, 0,
  ],
}

const update = () => {
  geometryEngine.getSweep(revolve.geometry, sweepData);
};

update();

// UI

BUI.Manager.init();

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Revolve" class="options-menu">

      </bim-panel-section>

      <bim-panel-section label="Controls">

      <bim-checkbox label="Close" value=${false} @change=${(e: any) => {
        sweepData.close = e.target.value;
        update();
      }}></bim-checkbox>

      <bim-checkbox label="Rotate 90" value=${false} @change=${(e: any) => {
        sweepData.rotate90 = e.target.value;
        update();
      }}></bim-checkbox>

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
