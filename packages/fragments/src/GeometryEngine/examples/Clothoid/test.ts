// Disable no extraneous dependencies as this is just for the examples
/* eslint-disable import/no-extraneous-dependencies */

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as BUI from "@thatopen/ui";
import { GeometryEngine } from "../../index";
import { ClothoidData } from "../../src/clothoid";

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

const arc = new THREE.LineSegments(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xffffff }),
);
world.scene.three.add(arc);

const clothoidData: ClothoidData = {};

const update = () => {
  geometryEngine.getClothoid(arc.geometry, clothoidData);
};

update();

// UI

BUI.Manager.init();

// <bim-number-input label="Radius X" slider min=0 max=5 step=0.01 value=${1} @change=${(
//   e: any,
// ) => {
//   arcData.radiusX = e.target.value;
//   update();
// }}></bim-number-input>

// <bim-number-input label="Radius Y" slider min=0 max=5 step=0.01 value=${1} @change=${(
//   e: any,
// ) => {
//   arcData.radiusY = e.target.value;
//   update();
// }}></bim-number-input>

// <bim-number-input label="Number of segments" slider min=0 max=64 step=1 value=${12} @change=${(
//   e: any,
// ) => {
//   arcData.numSegments = e.target.value;
//   update();
// }}></bim-number-input>

// <bim-number-input label="Start" slider min=0 max=360 step=1 value=${0} @change=${(
//   e: any,
// ) => {
//   arcData.start = e.target.value * Math.PI / 180;
//   update();
// }}></bim-number-input>

// <bim-number-input label="End" slider min=0 max=360 step=1 value=${180} @change=${(
//   e: any,
// ) => {
//   arcData.end = e.target.value * Math.PI / 180;
//   update();
// }}></bim-number-input>

// <bim-checkbox label="Swap" value=${false} @change=${(e: any) => {
//   arcData.swap = e.target.value;
//   update();
// }}></bim-checkbox>

// <bim-checkbox label="Ending normal to center" value=${false} @change=${(e: any) => {
//   arcData.endingNormalToCenter = e.target.value;
//   update();
// }}></bim-checkbox>

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Clothoid" class="options-menu">

      </bim-panel-section>

      <bim-panel-section label="Controls">

      <bim-number-input label="Segments" slider min=5 max=100 step=1 value=${12} @change=${(
        e: any,
      ) => {
        clothoidData.segments = e.target.value;
        update();
      }}></bim-number-input>

      <bim-number-input label="Segments length" slider min=0.1 max=10 step=0.1 value=${12} @change=${(
        e: any,
      ) => {
        clothoidData.segmentLength = e.target.value;
        update();
      }}></bim-number-input>

      <bim-number-input label="Start Direction" slider min=0 max=1 step=0.1 value=${1} @change=${(
        e: any,
      ) => {
        clothoidData.startDirection = e.target.value;
        update();
      }}></bim-number-input>

      <bim-number-input label="Start Radius" slider min=0 max=10 step=0.1 value=${1} @change=${(
        e: any,
      ) => {
        clothoidData.startRadius = e.target.value;
        update();
      }}></bim-number-input>

      <bim-number-input label="End Radius" slider min=0 max=10 step=0.1 value=${1} @change=${(
        e: any,
      ) => {
        clothoidData.endRadius = e.target.value;
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
