import{C as h,W as g,S as y,a as k,b as C,G as v}from"./virtual-memory-controller-CFZpSOdq.js";import{a as F,R as b,m as c}from"./index-CWj6LyOo.js";import{S as I}from"./stats.min-Cj8wREqt.js";import{F as L}from"./index-MzIC0kit.js";import{I as R}from"./index-DF5P54gB.js";import"./rendered-faces-DtNZp-Dg.js";const n=new h,U=n.get(g),e=U.create();e.scene=new y(n);e.scene.setup();e.scene.three.background=null;const S=document.getElementById("container");e.renderer=new k(n,S);e.camera=new C(n);e.camera.controls.setLookAt(74,16,.2,30,-4,27);n.init();const B=n.get(v);B.create(e);const p=new R;p.wasm={absolute:!0,path:"https://unpkg.com/web-ifc@0.0.74/"};let o=null,u=()=>{};const M=async()=>{const l=await(await fetch("https://thatopen.github.io/engine_fragment/resources/ifc/school_str.ifc")).arrayBuffer(),i=new Uint8Array(l);o=await p.process({bytes:i,progressCallback:(t,w)=>console.log(t,w)}),u()},$="https://thatopen.github.io/engine_fragment/resources/worker.mjs",r=new L($);e.camera.controls.addEventListener("rest",()=>r.update(!0));const A=async()=>{if(!o)return;const s=await r.load(o,{modelId:"example"});s.useCamera(e.camera.three),e.scene.three.add(s.object),await r.update(!0)},j=async()=>{await r.disposeModel("example")};F.init();const[m,f]=b.create(s=>{const d=()=>{if(!o)return;const i=new File([o],"sample.frag"),t=document.createElement("a");t.href=URL.createObjectURL(i),t.download=i.name,t.click(),URL.revokeObjectURL(t.href)};let l=c`
      <bim-label style="white-space: normal;">💡 Open the console to see more information</bim-label>
      <bim-button label="Load IFC" @click=${M}></bim-button>
    `;return o&&(l=c`
        <bim-label style="white-space: normal;">🚀 The IFC has been converted to Fragments binary data. Add the model to the scene!</bim-label>
        <bim-button label="Add Model" @click=${A}></bim-button>
        <bim-button label="Remove Model" @click=${j}></bim-button>
        <bim-button label="Download Fragments" @click=${d}></bim-button>
      `),c`
    <bim-panel id="controls-panel" active label="IFC Importer" class="options-menu">
      <bim-panel-section label="Controls">
        ${l}
      </bim-panel-section>
    </bim-panel>
  `},{});u=()=>f();r.models.list.onItemDeleted.add(()=>f());document.body.append(m);const x=b.create(()=>c`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{m.classList.contains("options-menu-visible")?m.classList.remove("options-menu-visible"):m.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(x);const a=new I;a.showPanel(2);document.body.append(a.dom);a.dom.style.left="0px";a.dom.style.zIndex="unset";e.renderer.onBeforeUpdate.add(()=>a.begin());e.renderer.onAfterUpdate.add(()=>a.end());
