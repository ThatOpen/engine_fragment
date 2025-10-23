import{C as g,W as h,S as y,a as k,b as C,G as F}from"./virtual-memory-controller-ZSRKHGNY.js";import{a as v,R as b,m as i}from"./index-CWj6LyOo.js";import{S as I}from"./stats.min-Cj8wREqt.js";import{F as L}from"./index-CqDgYQyW.js";import{I as R}from"./index-DDB1NBqw.js";import"./rendered-faces-DtNZp-Dg.js";const o=new g,U=o.get(h),e=U.create();e.scene=new y(o);e.scene.setup();e.scene.three.background=null;const M=document.getElementById("container");e.renderer=new k(o,M);e.camera=new C(o);e.camera.controls.setLookAt(74,16,.2,30,-4,27);o.init();const S=o.get(F);S.create(e);const p=new R;p.wasm={absolute:!0,path:"https://unpkg.com/web-ifc@0.0.72/"};let n=null,u=()=>{};const B=async()=>{const r=await(await fetch("/resources/ifc/just_wall.ifc")).arrayBuffer(),c=new Uint8Array(r);n=await p.process({bytes:c,progressCallback:(t,w)=>console.log(t,w)}),u()},$="../../FragmentsModels/src/multithreading/fragments-thread.ts",l=new L($);e.camera.controls.addEventListener("rest",()=>l.update(!0));const A=async()=>{if(!n)return;const s=await l.load(n,{modelId:"example"});s.useCamera(e.camera.three),e.scene.three.add(s.object),await l.update(!0)},j=async()=>{await l.disposeModel("example")};v.init();const[m,f]=b.create(s=>{const d=()=>{if(!n)return;const c=new File([n],"sample.frag"),t=document.createElement("a");t.href=URL.createObjectURL(c),t.download=c.name,t.click(),URL.revokeObjectURL(t.href)};let r=i`
      <bim-label style="white-space: normal;">💡 Open the console to see more information</bim-label>
      <bim-button label="Load IFC" @click=${B}></bim-button>
    `;return n&&(r=i`
        <bim-label style="white-space: normal;">🚀 The IFC has been converted to Fragments binary data. Add the model to the scene!</bim-label>
        <bim-button label="Add Model" @click=${A}></bim-button>
        <bim-button label="Remove Model" @click=${j}></bim-button>
        <bim-button label="Download Fragments" @click=${d}></bim-button>
      `),i`
    <bim-panel id="controls-panel" active label="IFC Importer" class="options-menu">
      <bim-panel-section label="Controls">
        ${r}
      </bim-panel-section>
    </bim-panel>
  `},{});u=()=>f();l.models.list.onItemDeleted.add(()=>f());document.body.append(m);const x=b.create(()=>i`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{m.classList.contains("options-menu-visible")?m.classList.remove("options-menu-visible"):m.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(x);const a=new I;a.showPanel(2);document.body.append(a.dom);a.dom.style.left="0px";a.dom.style.zIndex="unset";e.renderer.onBeforeUpdate.add(()=>a.begin());e.renderer.onAfterUpdate.add(()=>a.end());
