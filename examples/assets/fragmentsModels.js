import{c4 as A,c5 as D,c6 as U,c7 as B,c8 as C,c9 as q,ca as F,cf as j,cb as E,cc as L,cd as r,ce as P}from"./index-B2CFg0Uj.js";import"./pako.esm-DwGzBETv.js";const c=new A,T=c.get(D),n=T.create();n.scene=new U(c);n.scene.setup();n.scene.three.background=null;const _=document.getElementById("container");n.renderer=new B(c,_);n.camera=new C(c);n.camera.controls.setLookAt(80,25,-52,11,-9.5,-3);c.init();const O=c.get(q);O.create(n);const z="./src/multithreading/fragments-thread.ts",s=new F(z);n.camera.controls.addEventListener("rest",()=>s.update(!0));s.models.list.onItemSet.add(async({value:o})=>{o.useCamera(n.camera.three),n.scene.three.add(o.object),await s.update(!0),setTimeout(async()=>{const e=new j;o.box.getBoundingSphere(e),await n.camera.controls.fitToSphere(e,!0)},1e3)});const G=async(o,e)=>{const b=await(await fetch(o)).arrayBuffer();await s.load(b,{modelId:e})},W=async o=>{const e=s.models.list.get(o);if(!e)return null;const a=await e.getBuffer(!1);return{name:e.modelId,buffer:a}},$=()=>[...s.models.list.values()].map(a=>a.modelId),v=async(o=$())=>{const e=[];for(const a of o)e.push(s.disposeModel(a));await Promise.all(e)};E.init();const[u,k]=L.create(o=>{const e=$(),a=async({target:t})=>{const d=t.getAttribute("data-name");if(!d)return;const l=`school_${d}`;t.loading=!0,e.includes(l)?await v([l]):await G(`/resources/frags/${l}.frag`,l),t.loading=!1},b=()=>v(),p=async({target:t})=>{const d=t.getAttribute("data-name");if(!d)return;const l=`school_${d}`;t.loading=!0;const y=await W(l);if(y){const{name:x,buffer:M}=y,m=document.createElement("a"),h=new File([M],`${x}.frag`);m.href=URL.createObjectURL(h),m.download=h.name,m.click(),URL.revokeObjectURL(m.href)}t.loading=!1},f=e.some(t=>t.includes("arq")),g=e.some(t=>t.includes("str")),w=e.some(t=>t.includes("mep")),S=f?"Remove Architecture":"Load Architecture",I=g?"Remove Structure":"Load Structure",R=w?"Remove Systems":"Load Systems";return r`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${S} @click=${a}></bim-button>
          ${f?r`<bim-button data-name="arq" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="str" label=${I} @click=${a}></bim-button>
          ${g?r`<bim-button data-name="str" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="mep" label=${R} @click=${a}></bim-button>
          ${w?r`<bim-button data-name="mep" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${e.length===0} label="Remove All" @click=${b}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});s.models.list.onItemSet.add(()=>k());s.models.list.onItemDeleted.add(()=>k());document.body.append(u);const H=L.create(()=>r`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{u.classList.contains("options-menu-visible")?u.classList.remove("options-menu-visible"):u.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(H);const i=new P;i.showPanel(2);document.body.append(i.dom);i.dom.style.left="0px";i.dom.style.zIndex="unset";n.renderer.onBeforeUpdate.add(()=>i.begin());n.renderer.onAfterUpdate.add(()=>i.end());
