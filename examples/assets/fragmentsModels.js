import"./encoding-OofKfb5O.js";import{bU as M,bV as j,bW as A,bX as D,bY as F,bZ as B,b_ as C,b$ as _,c0 as v,c1 as d,c2 as q}from"./pako.esm-CxPC41x8.js";const i=new M,E=i.get(j),n=E.create();n.scene=new A(i);n.scene.setup();n.scene.three.background=null;const O=document.getElementById("container");n.renderer=new D(i,O);n.camera=new F(i);n.camera.controls.setLookAt(183,11,-102,27,-52,-11);i.init();const P=i.get(B);P.create(n);const W="https://thatopen.github.io/engine_fragment/resources/worker.mjs",T=await fetch(W),z=await T.text(),G=new File([new Blob([z])],"worker.mjs",{type:"text/javascript"}),V=URL.createObjectURL(G),s=new C(V);n.camera.controls.addEventListener("rest",()=>s.update(!0));n.camera.controls.addEventListener("update",()=>s.update());s.models.list.onItemSet.add(({value:o})=>{o.useCamera(n.camera.three),n.scene.three.add(o.object),s.update(!0)});const X=async(o,e)=>{const u=await(await fetch(o)).arrayBuffer();await s.load(u,{modelId:e})},Y=async o=>{const e=s.models.list.get(o);if(!e)return null;const a=await e.getBuffer(!1);return{name:e.modelId,buffer:a}},k=()=>[...s.models.list.values()].map(a=>a.modelId),L=async(o=k())=>{const e=[];for(const a of o)e.push(s.disposeModel(a));await Promise.all(e)};_.init();const[b,$]=v.create(o=>{const e=k(),a=async({target:t})=>{const r=t.getAttribute("data-name");if(!r)return;const l=`school_${r}`;t.loading=!0,e.includes(l)?await L([l]):await X(`https://thatopen.github.io/engine_fragment/resources/frags/${l}.frag`,l),t.loading=!1},u=()=>L(),p=async({target:t})=>{const r=t.getAttribute("data-name");if(!r)return;const l=`school_${r}`;t.loading=!0;const h=await Y(l);if(h){const{name:U,buffer:x}=h,m=document.createElement("a"),y=new File([x],`${U}.frag`);m.href=URL.createObjectURL(y),m.download=y.name,m.click(),URL.revokeObjectURL(m.href)}t.loading=!1},f=e.some(t=>t.includes("arq")),g=e.some(t=>t.includes("str")),w=e.some(t=>t.includes("mep")),R=f?"Remove Architecture":"Load Architecture",S=g?"Remove Structure":"Load Structure",I=w?"Remove Systems":"Load Systems";return d`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${R} @click=${a}></bim-button>
          ${f?d`<bim-button data-name="arq" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="str" label=${S} @click=${a}></bim-button>
          ${g?d`<bim-button data-name="str" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="mep" label=${I} @click=${a}></bim-button>
          ${w?d`<bim-button data-name="mep" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${e.length===0} label="Remove All" @click=${u}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});s.models.list.onItemSet.add(()=>$());s.models.list.onItemDeleted.add(()=>$());document.body.append(b);const Z=v.create(()=>d`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{b.classList.contains("options-menu-visible")?b.classList.remove("options-menu-visible"):b.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(Z);const c=new q;c.showPanel(2);document.body.append(c.dom);c.dom.style.left="0px";c.dom.style.zIndex="unset";n.renderer.onBeforeUpdate.add(()=>c.begin());n.renderer.onAfterUpdate.add(()=>c.end());
