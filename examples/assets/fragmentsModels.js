import{C as M,W as A,S as C,a as U,b as D,G as F}from"./virtual-memory-controller-BZ3qkwUg.js";import{a as q,R as v,m}from"./index-CWj6LyOo.js";import{S as B}from"./stats.min-Cj8wREqt.js";import{F as _}from"./index-D7PcC6sb.js";const i=new M,j=i.get(A),t=j.create();t.scene=new C(i);t.scene.setup();t.scene.three.background=null;const x=document.getElementById("container");t.renderer=new U(i,x);t.camera=new D(i);t.camera.controls.setLookAt(58,22,-25,13,0,4.2);i.init();const E=i.get(F);E.create(t);const P="https://thatopen.github.io/engine_fragment/resources/worker.mjs",a=new _(P);t.camera.controls.addEventListener("rest",()=>a.update(!0));a.models.list.onItemSet.add(({value:n})=>{n.useCamera(t.camera.three),t.scene.three.add(n.object),a.update(!0)});const G=async(n,e)=>{const b=await(await fetch(n)).arrayBuffer();await a.load(b,{modelId:e})},O=async n=>{const e=a.models.list.get(n);if(!e)return null;const s=await e.getBuffer(!1);return{name:e.modelId,buffer:s}},L=()=>[...a.models.list.values()].map(s=>s.modelId),y=async(n=L())=>{const e=[];for(const s of n)e.push(a.disposeModel(s));await Promise.all(e)};q.init();const[u,$]=v.create(n=>{const e=L(),s=async({target:o})=>{const d=o.getAttribute("data-name");if(!d)return;const l=`school_${d}`;o.loading=!0,e.includes(l)?await y([l]):await G(`https://thatopen.github.io/engine_fragment/resources/frags/${l}.frag`,l),o.loading=!1},b=()=>y(),p=async({target:o})=>{const d=o.getAttribute("data-name");if(!d)return;const l=`school_${d}`;o.loading=!0;const w=await O(l);if(w){const{name:R,buffer:I}=w,c=document.createElement("a"),h=new File([I],`${R}.frag`);c.href=URL.createObjectURL(h),c.download=h.name,c.click(),URL.revokeObjectURL(c.href)}o.loading=!1},f=e.some(o=>o.includes("arq")),g=e.some(o=>o.includes("str")),k=f?"Remove Architecture":"Load Architecture",S=g?"Remove Structure":"Load Structure";return m`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${k} @click=${s}></bim-button>
          ${f?m`<bim-button data-name="arq" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="str" label=${S} @click=${s}></bim-button>
          ${g?m`<bim-button data-name="str" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${e.length===0} label="Remove All" @click=${b}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});a.models.list.onItemSet.add(()=>$());a.models.list.onItemDeleted.add(()=>$());document.body.append(u);const W=v.create(()=>m`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{u.classList.contains("options-menu-visible")?u.classList.remove("options-menu-visible"):u.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(W);const r=new B;r.showPanel(2);document.body.append(r.dom);r.dom.style.left="0px";r.dom.style.zIndex="unset";t.renderer.onBeforeUpdate.add(()=>r.begin());t.renderer.onAfterUpdate.add(()=>r.end());
