// Disable no extraneous dependencies as this is just for the examples
/* eslint-disable import/no-extraneous-dependencies */

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as BUI from "@thatopen/ui";
import { GeometryEngine } from "../../index";
import { ParabolaData } from "../../src";

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

const parabola = new THREE.LineSegments(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xffffff }),
);
world.scene.three.add(parabola);

const parabolaData: ParabolaData = {};

const update = () => {
  geometryEngine.getParabola(parabola.geometry, parabolaData);
};

update();

// UI

BUI.Manager.init();

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Parabola" class="options-menu">

      </bim-panel-section>

      <bim-panel-section label="Controls">

        <bim-number-input label="Segment count" slider min=3 max=60 step=1 value=${12} @change=${(
          e: any,
        ) => {
          parabolaData.segmentCount = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Horizontal Length" slider min=1 max=10 step=0.1 value=${10} @change=${(
          e: any,
        ) => {
          parabolaData.horizontalLength = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Start height" slider min=1 max=10 step=0.1 value=${2} @change=${(
          e: any,
        ) => {
          parabolaData.startHeight = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Start gradient" slider min=0 max=10 step=0.1 value=${5} @change=${(
          e: any,
        ) => {
          parabolaData.startGradient = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Start gradient" slider min=0 max=10 step=0.1 value=${0} @change=${(
          e: any,
        ) => {
          parabolaData.endGradient = e.target.value;
          update();
        }}></bim-number-input>


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
