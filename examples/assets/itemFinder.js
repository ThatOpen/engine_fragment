import{c4 as I,c5 as S,c6 as M,c7 as A,c8 as R,c9 as U,ca as q,cf as x,cb as B,cc as h,cd as b,ce as C}from"./index-B2CFg0Uj.js";const l=new I,D=l.get(S),t=D.create();t.scene=new M(l);t.scene.setup();t.scene.three.background=null;const F=document.getElementById("container");t.renderer=new A(l,F);t.camera=new R(l);t.camera.controls.setLookAt(80,25,-52,11,-9.5,-3);l.init();const j=l.get(U);j.create(t);const E="./../../src/multithreading/fragments-thread.ts",a=new q(E);t.camera.controls.addEventListener("rest",()=>a.update(!0));a.models.list.onItemSet.add(async({value:n})=>{n.useCamera(t.camera.three),t.scene.three.add(n.object),await a.update(!0),setTimeout(async()=>{const e=new x;n.box.getBoundingSphere(e),await t.camera.controls.fitToSphere(e,!0)},1e3)});const P=async(n,e)=>{const u=await(await fetch(n)).arrayBuffer();await a.load(u,{modelId:e})},T=async n=>{const e=a.models.list.get(n);if(!e)return null;const o=await e.getBuffer(!1);return{name:e.modelId,buffer:o}},y=()=>[...a.models.list.values()].map(o=>o.modelId),w=async(n=y())=>{const e=[];for(const o of n)e.push(a.disposeModel(o));await Promise.all(e)};B.init();const[m,L]=h.create(n=>{const e=y(),o=async({target:s})=>{const i=s.getAttribute("data-name");if(!i)return;const c=`school_${i}`;s.loading=!0,e.includes(c)?await w([c]):await P(`/resources/frags/${c}.frag`,c),s.loading=!1},u=async({target:s})=>{const i=s.getAttribute("data-name");if(!i)return;const c=`school_${i}`;s.loading=!0;const f=await T(c);if(f){const{name:k,buffer:$}=f,d=document.createElement("a"),g=new File([$],`${k}.frag`);d.href=URL.createObjectURL(g),d.download=g.name,d.click(),URL.revokeObjectURL(d.href)}s.loading=!1},v=()=>w(),p=e.some(s=>s.includes("arq"));return b`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${p?"Remove Architecture":"Load Architecture"} @click=${o}></bim-button>
           ${p?b`<bim-button data-name="arq" label="Download" @click=${u}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${e.length===0} label="Remove All" @click=${v}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});a.models.list.onItemSet.add(()=>L());a.models.list.onItemDeleted.add(()=>L());document.body.append(m);const _=h.create(()=>b`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{m.classList.contains("options-menu-visible")?m.classList.remove("options-menu-visible"):m.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(_);const r=new C;r.showPanel(2);document.body.append(r.dom);r.dom.style.left="0px";r.dom.style.zIndex="unset";t.renderer.onBeforeUpdate.add(()=>r.begin());t.renderer.onAfterUpdate.add(()=>r.end());
