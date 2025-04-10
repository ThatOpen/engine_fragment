import{c5 as M,c6 as j,c7 as A,c8 as D,c9 as F,ca as B,cb as C,cc as q,cd as v,ce as r,cf as _}from"./pako.esm-9qfSKSXL.js";const c=new M,E=c.get(j),n=E.create();n.scene=new A(c);n.scene.setup();n.scene.three.background=null;const O=document.getElementById("container");n.renderer=new D(c,O);n.camera=new F(c);n.camera.controls.setLookAt(183,11,-102,27,-52,-11);c.init();const P=c.get(B);P.create(n);const T="https://thatopen.github.io/engine_fragment/resources/worker.mjs",W=await fetch(T),z=await W.text(),G=new File([new Blob([z])],"worker.mjs",{type:"text/javascript"}),H=URL.createObjectURL(G),s=new C(H);n.camera.controls.addEventListener("rest",()=>s.update(!0));n.camera.controls.addEventListener("update",()=>s.update());s.models.list.onItemSet.add(({value:o})=>{o.useCamera(n.camera.three),n.scene.three.add(o.object),s.update(!0)});const J=async(o,e)=>{const b=await(await fetch(o)).arrayBuffer();await s.load(b,{modelId:e})},K=async o=>{const e=s.models.list.get(o);if(!e)return null;const a=await e.getBuffer(!1);return{name:e.modelId,buffer:a}},k=()=>[...s.models.list.values()].map(a=>a.modelId),L=async(o=k())=>{const e=[];for(const a of o)e.push(s.disposeModel(a));await Promise.all(e)};q.init();const[u,$]=v.create(o=>{const e=k(),a=async({target:t})=>{const d=t.getAttribute("data-name");if(!d)return;const l=`school_${d}`;t.loading=!0,e.includes(l)?await L([l]):await J(`https://thatopen.github.io/engine_fragment/resources/frags/${l}.frag`,l),t.loading=!1},b=()=>L(),p=async({target:t})=>{const d=t.getAttribute("data-name");if(!d)return;const l=`school_${d}`;t.loading=!0;const h=await K(l);if(h){const{name:U,buffer:x}=h,m=document.createElement("a"),y=new File([x],`${U}.frag`);m.href=URL.createObjectURL(y),m.download=y.name,m.click(),URL.revokeObjectURL(m.href)}t.loading=!1},f=e.some(t=>t.includes("arq")),g=e.some(t=>t.includes("str")),w=e.some(t=>t.includes("mep")),R=f?"Remove Architecture":"Load Architecture",S=g?"Remove Structure":"Load Structure",I=w?"Remove Systems":"Load Systems";return r`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${R} @click=${a}></bim-button>
          ${f?r`<bim-button data-name="arq" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="str" label=${S} @click=${a}></bim-button>
          ${g?r`<bim-button data-name="str" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="mep" label=${I} @click=${a}></bim-button>
          ${w?r`<bim-button data-name="mep" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${e.length===0} label="Remove All" @click=${b}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});s.models.list.onItemSet.add(()=>$());s.models.list.onItemDeleted.add(()=>$());document.body.append(u);const N=v.create(()=>r`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{u.classList.contains("options-menu-visible")?u.classList.remove("options-menu-visible"):u.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(N);const i=new _;i.showPanel(2);document.body.append(i.dom);i.dom.style.left="0px";i.dom.style.zIndex="unset";n.renderer.onBeforeUpdate.add(()=>i.begin());n.renderer.onAfterUpdate.add(()=>i.end());
