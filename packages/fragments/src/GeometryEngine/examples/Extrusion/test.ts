// Disable no extraneous dependencies as this is just for the examples
/* eslint-disable import/no-extraneous-dependencies */

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as BUI from "@thatopen/ui";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { ExtrusionData } from "../../src/extrusion";
import { GeometryEngine } from "../../index";
import { Profile, ProfileData } from "../../src";

// Set up scene

const container = document.getElementById("container")!;

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.ShadowedScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.ShadowedScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

components.init();

world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);

world.renderer.three.shadowMap.enabled = true;
world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;

world.scene.setup({
  shadows: {
    cascade: 1,
    resolution: 1024,
  },
});

await world.scene.updateShadows();

world.camera.controls.addEventListener("rest", async () => {
  await world.scene.updateShadows();
});

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

const extrusionMesh = new THREE.Mesh(
  new THREE.BufferGeometry(),
  new THREE.MeshLambertMaterial({ color: "red", side: 2 }),
);
world.scene.three.add(extrusionMesh);
extrusionMesh.castShadow = true;
extrusionMesh.receiveShadow = true;

const planeGround = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 5),
  new THREE.MeshLambertMaterial({ color: "white" }),
);
planeGround.rotation.x = -Math.PI / 2;
planeGround.position.y = -0.1;
world.scene.three.add(planeGround);
planeGround.receiveShadow = true;

const profileMesh = new THREE.LineSegments(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xffffff }),
);
world.scene.three.add(profileMesh);

const extrusionData: ExtrusionData = {};
const profileData: ProfileData = {};

// Transform controls

const endPoint = new THREE.Object3D();
endPoint.position.set(0, 2, 2);
world.scene.three.add(endPoint);

const targetControl = new TransformControls(
  world.camera.three,
  world.renderer.three.domElement,
);

targetControl.addEventListener("dragging-changed", (event) => {
  if (world.camera.hasCameraControls()) {
    world.camera.controls.enabled = !event.value;
  }
});

targetControl.attach(endPoint);

const gizmo = targetControl.getHelper();
world.scene.three.add(gizmo);

targetControl.enabled = true;

const start = new THREE.Vector3(0, 0, 0);

const update = () => {
  const end = endPoint.position.clone();
  const length = start.distanceTo(end);
  const dir = end.sub(start).normalize();

  profileMesh.position.copy(endPoint.position);

  extrusionData.length = length;
  extrusionData.direction = [dir.x, dir.y, dir.z];

  geometryEngine.getProfile(profileMesh.geometry, profileData);
  extrusionData.profilePoints = geometryEngine.getProfilePoints(profileData);
  geometryEngine.getExtrusion(extrusionMesh.geometry, extrusionData);
};

targetControl.addEventListener("change", () => {
  update();
});

update();

// UI

BUI.Manager.init();

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Extrusions" class="options-menu">

      </bim-panel-section>

      <bim-panel-section label="Profile">

        <bim-dropdown label="Type" @change=${(e: any) => {
          profileData.type = e.target.value;
          update();
        }}>
          ${Array.from(Profile.map.entries()).map(
            ([name, value]) =>
              BUI.html`<bim-option ?checked=${name === "H"} label=${name} value=${value}></bim-option>`,
          )}
        </bim-dropdown>
        
        <bim-number-input label="Width" slider min=0.05 max=0.3 step=0.01 value=${0.2} @change=${(
          e: any,
        ) => {
          profileData.width = e.target.value;
          update();
        }}></bim-number-input>
        
        <bim-number-input label="Depth" slider min=0.05 max=0.3 step=0.01 value=${0.2} @change=${(
          e: any,
        ) => {
          profileData.depth = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Thickness" slider min=0.001 max=0.1 step=0.005 value=${0.005} @change=${(
          e: any,
        ) => {
          profileData.thickness = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Flange thickness" slider min=0.001 max=0.1 step=0.005 value=${0.005} @change=${(
          e: any,
        ) => {
          profileData.flangeThickness = e.target.value;
          update();
        }}></bim-number-input>
        
        <bim-checkbox label="Fillet" value=${false} @change=${(e: any) => {
          profileData.hasFillet = e.target.value;
          update();
        }}></bim-checkbox>

        <bim-number-input label="Fillet radius" slider min=0.001 max=0.1 step=0.005 value=${0.005} @change=${(
          e: any,
        ) => {
          profileData.filletRadius = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Radius" slider min=0.001 max=0.1 step=0.005 value=${0.005} @change=${(
          e: any,
        ) => {
          profileData.radius = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Slope" slider min=0.001 max=0.1 step=0.005 value=${0.005} @change=${(
          e: any,
        ) => {
          profileData.slope = e.target.value;
          update();
        }}></bim-number-input>

        <bim-number-input label="Circle segments" slider min=1 max=40 step=1 value=${1} @change=${(
          e: any,
        ) => {
          profileData.circleSegments = e.target.value;
          update();
        }}></bim-number-input>

        </bim-panel-section>

        <bim-panel-section label="Extrusion">

        <bim-number-input label="Length Count" slider min=1 max=10 step=0.5 value=${1} @change=${(
          e: any,
        ) => {
          extrusionData.length = e.target.value;
          update();
        }}></bim-number-input>

        <bim-checkbox label="Cap" value=${true} @change=${(e: any) => {
          extrusionData.cap = e.target.value;
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
