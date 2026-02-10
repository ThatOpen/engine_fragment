import{C as M,W as I,S as F,a as j,b as A,G as C}from"./virtual-memory-controller-CejF-vhY.js";import{a as B,R as L,m}from"./index-CWj6LyOo.js";import{S as D}from"./stats.min-Cj8wREqt.js";import{F as O}from"./index-ClKYDA-N.js";const i=new M,q=i.get(I),o=q.create();o.scene=new F(i);o.scene.setup();o.scene.three.background=null;const x=document.getElementById("container");o.renderer=new j(i,x);o.camera=new A(i);o.camera.controls.setLookAt(58,22,-25,13,0,4.2);i.init();const _=i.get(C);_.create(o);const E="https://thatopen.github.io/engine_fragment/resources/worker.mjs",P=await fetch(E),G=await P.blob(),W=new File([G],"worker.mjs",{type:"text/javascript"}),z=URL.createObjectURL(W),s=new O(z);o.camera.controls.addEventListener("update",()=>s.update());s.models.materials.list.onItemSet.add(({value:e})=>{"isLodMaterial"in e&&e.isLodMaterial||(e.polygonOffset=!0,e.polygonOffsetUnits=1,e.polygonOffsetFactor=Math.random())});s.models.list.onItemSet.add(({value:e})=>{e.useCamera(o.camera.three),o.scene.three.add(e.object),s.update(!0)});const H=async(e,t)=>{const b=await(await fetch(e)).arrayBuffer();await s.load(b,{modelId:t})},J=async e=>{const t=s.models.list.get(e);if(!t)return null;const a=await t.getBuffer(!1);return{name:t.modelId,buffer:a}},v=()=>[...s.models.list.values()].map(a=>a.modelId),y=async(e=v())=>{const t=[];for(const a of e)t.push(s.disposeModel(a));await Promise.all(t)};B.init();const[u,k]=L.create(e=>{const t=v(),a=async({target:n})=>{const c=n.getAttribute("data-name");if(!c)return;const l=`school_${c}`;n.loading=!0,t.includes(l)?await y([l]):await H(`https://thatopen.github.io/engine_fragment/resources/frags/${l}.frag`,l),n.loading=!1},b=()=>y(),p=async({target:n})=>{const c=n.getAttribute("data-name");if(!c)return;const l=`school_${c}`;n.loading=!0;const w=await J(l);if(w){const{name:S,buffer:U}=w,d=document.createElement("a"),h=new File([U],`${S}.frag`);d.href=URL.createObjectURL(h),d.download=h.name,d.click(),URL.revokeObjectURL(d.href)}n.loading=!1},f=t.some(n=>n.includes("arq")),g=t.some(n=>n.includes("str")),$=f?"Remove Architecture":"Load Architecture",R=g?"Remove Structure":"Load Structure";return m`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${$} @click=${a}></bim-button>
          ${f?m`<bim-button data-name="arq" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="str" label=${R} @click=${a}></bim-button>
          ${g?m`<bim-button data-name="str" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${t.length===0} label="Remove All" @click=${b}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});s.models.list.onItemSet.add(()=>k());s.models.list.onItemDeleted.add(()=>k());document.body.append(u);const K=L.create(()=>m`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{u.classList.contains("options-menu-visible")?u.classList.remove("options-menu-visible"):u.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(K);const r=new D;r.showPanel(2);document.body.append(r.dom);r.dom.style.left="0px";r.dom.style.zIndex="unset";o.renderer.onBeforeUpdate.add(()=>r.begin());o.renderer.onAfterUpdate.add(()=>r.end());
