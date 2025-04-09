import{c5 as D,c6 as U,c7 as C,c8 as q,c9 as x,ca as B,cb as F,cc as j,cd as $,ce as r,cf as _}from"./pako.esm-9qfSKSXL.js";const c=new D,E=c.get(U),n=E.create();n.scene=new C(c);n.scene.setup();n.scene.three.background=null;const P=document.getElementById("container");n.renderer=new q(c,P);n.camera=new x(c);n.camera.controls.setLookAt(183,11,-102,27,-52,-11);c.init();const O=c.get(B);O.create(n);const z="https://thatopen.github.io/engine_fragment/resources/worker.mjs",a=new F(z);n.camera.controls.addEventListener("rest",()=>a.update(!0));a.models.list.onItemSet.add(({value:o})=>{o.useCamera(n.camera.three),n.scene.three.add(o.object),a.update(!0)});const G=async(o,e)=>{const b=await(await fetch(o)).arrayBuffer();await a.load(b,{modelId:e})},T=async o=>{const e=a.models.list.get(o);if(!e)return null;const s=await e.getBuffer(!1);return{name:e.modelId,buffer:s}},h=()=>[...a.models.list.values()].map(s=>s.modelId),L=async(o=h())=>{const e=[];for(const s of o)e.push(a.disposeModel(s));await Promise.all(e)};j.init();const[u,k]=$.create(o=>{const e=h(),s=async({target:t})=>{const i=t.getAttribute("data-name");if(!i)return;const l=`school_${i}`;t.loading=!0,e.includes(l)?await L([l]):await G(`/resources/frags/${l}.frag`,l),t.loading=!1},b=()=>L(),p=async({target:t})=>{const i=t.getAttribute("data-name");if(!i)return;const l=`school_${i}`;t.loading=!0;const y=await T(l);if(y){const{name:M,buffer:A}=y,m=document.createElement("a"),v=new File([A],`${M}.frag`);m.href=URL.createObjectURL(v),m.download=v.name,m.click(),URL.revokeObjectURL(m.href)}t.loading=!1},f=e.some(t=>t.includes("arq")),g=e.some(t=>t.includes("str")),w=e.some(t=>t.includes("mep")),S=f?"Remove Architecture":"Load Architecture",I=g?"Remove Structure":"Load Structure",R=w?"Remove Systems":"Load Systems";return r`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${S} @click=${s}></bim-button>
          ${f?r`<bim-button data-name="arq" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="str" label=${I} @click=${s}></bim-button>
          ${g?r`<bim-button data-name="str" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="mep" label=${R} @click=${s}></bim-button>
          ${w?r`<bim-button data-name="mep" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${e.length===0} label="Remove All" @click=${b}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});a.models.list.onItemSet.add(()=>k());a.models.list.onItemDeleted.add(()=>k());document.body.append(u);const W=$.create(()=>r`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{u.classList.contains("options-menu-visible")?u.classList.remove("options-menu-visible"):u.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(W);const d=new _;d.showPanel(2);document.body.append(d.dom);d.dom.style.left="0px";d.dom.style.zIndex="unset";n.renderer.onBeforeUpdate.add(()=>d.begin());n.renderer.onAfterUpdate.add(()=>d.end());
