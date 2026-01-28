import{C as h,W as g,S as y,a as k,b as F,G as v}from"./virtual-memory-controller-CejF-vhY.js";import{a as L,R as b,m as c}from"./index-CWj6LyOo.js";import{S as C}from"./stats.min-Cj8wREqt.js";import{F as I}from"./index-ClKYDA-N.js";import{I as U}from"./index-DRJYs0hv.js";import"./rendered-faces-DtNZp-Dg.js";const a=new h,R=a.get(g),e=R.create();e.scene=new y(a);e.scene.setup();e.scene.three.background=null;const M=document.getElementById("container");e.renderer=new k(a,M);e.camera=new F(a);e.camera.controls.setLookAt(74,16,.2,30,-4,27);a.init();const S=a.get(v);S.create(e);const p=new U;p.wasm={absolute:!0,path:"https://unpkg.com/web-ifc@0.0.75/"};let n=null,u=()=>{};const j=async()=>{const l=await(await fetch("https://thatopen.github.io/engine_fragment/resources/ifc/school_str.ifc")).arrayBuffer(),i=new Uint8Array(l);n=await p.process({bytes:i,progressCallback:(o,w)=>console.log(o,w)}),u()},B="https://thatopen.github.io/engine_fragment/resources/worker.mjs",O=await fetch(B),$=await O.blob(),x=new File([$],"worker.mjs",{type:"text/javascript"}),A=URL.createObjectURL(x),s=new I(A);e.camera.controls.addEventListener("update",()=>s.update());s.models.materials.list.onItemSet.add(({value:t})=>{"isLodMaterial"in t&&t.isLodMaterial||(t.polygonOffset=!0,t.polygonOffsetUnits=1,t.polygonOffsetFactor=Math.random())});const _=async()=>{if(!n)return;const t=await s.load(n,{modelId:"example"});t.useCamera(e.camera.three),e.scene.three.add(t.object),await s.update(!0)},D=async()=>{await s.disposeModel("example")};L.init();const[m,f]=b.create(t=>{const d=()=>{if(!n)return;const i=new File([n],"sample.frag"),o=document.createElement("a");o.href=URL.createObjectURL(i),o.download=i.name,o.click(),URL.revokeObjectURL(o.href)};let l=c`
      <bim-label style="white-space: normal;">💡 Open the console to see more information</bim-label>
      <bim-button label="Load IFC" @click=${j}></bim-button>
    `;return n&&(l=c`
        <bim-label style="white-space: normal;">🚀 The IFC has been converted to Fragments binary data. Add the model to the scene!</bim-label>
        <bim-button label="Add Model" @click=${_}></bim-button>
        <bim-button label="Remove Model" @click=${D}></bim-button>
        <bim-button label="Download Fragments" @click=${d}></bim-button>
      `),c`
    <bim-panel id="controls-panel" active label="IFC Importer" class="options-menu">
      <bim-panel-section label="Controls">
        ${l}
      </bim-panel-section>
    </bim-panel>
  `},{});u=()=>f();s.models.list.onItemDeleted.add(()=>f());document.body.append(m);const E=b.create(()=>c`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{m.classList.contains("options-menu-visible")?m.classList.remove("options-menu-visible"):m.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(E);const r=new C;r.showPanel(2);document.body.append(r.dom);r.dom.style.left="0px";r.dom.style.zIndex="unset";e.renderer.onBeforeUpdate.add(()=>r.begin());e.renderer.onAfterUpdate.add(()=>r.end());
