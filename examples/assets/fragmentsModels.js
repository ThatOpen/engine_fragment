import{C as U,W as A,S as C,a as F,b as D,G as q,F as L}from"./index-CCztv3eI.js";import{K as B,n as v,b as m}from"./index-Bt1juVKF.js";import{S as O}from"./stats.min-CgKsrbbR.js";const i=new U,x=i.get(A),n=x.create();n.scene=new C(i);n.scene.setup();n.scene.three.background=null;const _=document.getElementById("container");n.renderer=new F(i,_);n.camera=new D(i);n.camera.controls.setLookAt(58,22,-25,13,0,4.2);i.init();const j=i.get(q);j.create(n);const E=await L.getWorker(),s=new L(E);n.camera.controls.addEventListener("update",()=>s.update());s.models.materials.list.onItemSet.add(({value:e})=>{"isLodMaterial"in e&&e.isLodMaterial||(e.polygonOffset=!0,e.polygonOffsetUnits=1,e.polygonOffsetFactor=Math.random())});s.models.list.onItemSet.add(({value:e})=>{e.useCamera(n.camera.three),n.scene.three.add(e.object),s.update(!0)});const P=async(e,t)=>{const b=await(await fetch(e)).arrayBuffer();await s.load(b,{modelId:t})},W=async e=>{const t=s.models.list.get(e);if(!t)return null;const a=await t.getBuffer(!1);return{name:t.modelId,buffer:a}},$=()=>[...s.models.list.values()].map(a=>a.modelId),h=async(e=$())=>{const t=[];for(const a of e)t.push(s.disposeModel(a));await Promise.all(t)};B.init();const[u,k]=v.create(e=>{const t=$(),a=async({target:o})=>{const r=o.getAttribute("data-name");if(!r)return;const l=`school_${r}`;o.loading=!0,t.includes(l)?await h([l]):await P(`https://thatopen.github.io/engine_fragment/resources/frags/${l}.frag`,l),o.loading=!1},b=()=>h(),p=async({target:o})=>{const r=o.getAttribute("data-name");if(!r)return;const l=`school_${r}`;o.loading=!0;const w=await W(l);if(w){const{name:I,buffer:R}=w,c=document.createElement("a"),y=new File([R],`${I}.frag`);c.href=URL.createObjectURL(y),c.download=y.name,c.click(),URL.revokeObjectURL(c.href)}o.loading=!1},f=t.some(o=>o.includes("arq")),g=t.some(o=>o.includes("str")),S=f?"Remove Architecture":"Load Architecture",M=g?"Remove Structure":"Load Structure";return m`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${S} @click=${a}></bim-button>
          ${f?m`<bim-button data-name="arq" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="str" label=${M} @click=${a}></bim-button>
          ${g?m`<bim-button data-name="str" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${t.length===0} label="Remove All" @click=${b}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});s.models.list.onItemSet.add(()=>k());s.models.list.onItemDeleted.add(()=>k());document.body.append(u);const G=v.create(()=>m`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{u.classList.contains("options-menu-visible")?u.classList.remove("options-menu-visible"):u.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(G);const d=new O;d.showPanel(2);document.body.append(d.dom);d.dom.style.left="0px";d.dom.style.zIndex="unset";n.renderer.onBeforeUpdate.add(()=>d.begin());n.renderer.onAfterUpdate.add(()=>d.end());
