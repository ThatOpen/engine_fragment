import{c3 as j,c4 as A,c5 as D,c6 as F,c7 as x,c8 as B,c9 as C,ca as v,cb as d,cc as q}from"./pako.esm-CNfj-wfU.js";import{h as _}from"./index-BoGUiZul.js";const c=new j,E=c.get(A),n=E.create();n.scene=new D(c);n.scene.setup();n.scene.three.background=null;const O=document.getElementById("container");n.renderer=new F(c,O);n.camera=new x(c);n.camera.controls.setLookAt(58,22,-25,13,0,4.2);c.init();const P=c.get(B);P.create(n);const z="https://thatopen.github.io/engine_fragment/resources/worker.mjs",G=await fetch(z),W=await G.blob(),H=new File([W],"worker.mjs",{type:"text/javascript"}),J=URL.createObjectURL(H),s=new _(J);n.camera.controls.addEventListener("rest",()=>s.update(!0));s.models.list.onItemSet.add(({value:o})=>{o.useCamera(n.camera.three),n.scene.three.add(o.object),s.update(!0)});const K=async(o,e)=>{const b=await(await fetch(o)).arrayBuffer();await s.load(b,{modelId:e})},N=async o=>{const e=s.models.list.get(o);if(!e)return null;const a=await e.getBuffer(!1);return{name:e.modelId,buffer:a}},k=()=>[...s.models.list.values()].map(a=>a.modelId),L=async(o=k())=>{const e=[];for(const a of o)e.push(s.disposeModel(a));await Promise.all(e)};C.init();const[u,$]=v.create(o=>{const e=k(),a=async({target:t})=>{const r=t.getAttribute("data-name");if(!r)return;const l=`school_${r}`;t.loading=!0,e.includes(l)?await L([l]):await K(`https://thatopen.github.io/engine_fragment/resources/frags/${l}.frag`,l),t.loading=!1},b=()=>L(),p=async({target:t})=>{const r=t.getAttribute("data-name");if(!r)return;const l=`school_${r}`;t.loading=!0;const h=await N(l);if(h){const{name:I,buffer:M}=h,m=document.createElement("a"),y=new File([M],`${I}.frag`);m.href=URL.createObjectURL(y),m.download=y.name,m.click(),URL.revokeObjectURL(m.href)}t.loading=!1},f=e.some(t=>t.includes("arq")),g=e.some(t=>t.includes("str")),w=e.some(t=>t.includes("mep")),R=f?"Remove Architecture":"Load Architecture",S=g?"Remove Structure":"Load Structure",U=w?"Remove Systems":"Load Systems";return d`
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
          <bim-button data-name="mep" label=${U} @click=${a}></bim-button>
          ${w?d`<bim-button data-name="mep" label="Download" @click=${p}></bim-button>`:null}
        </div>
        <bim-button ?disabled=${e.length===0} label="Remove All" @click=${b}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `},{});s.models.list.onItemSet.add(()=>$());s.models.list.onItemDeleted.add(()=>$());document.body.append(u);const Q=v.create(()=>d`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{u.classList.contains("options-menu-visible")?u.classList.remove("options-menu-visible"):u.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(Q);const i=new q;i.showPanel(2);document.body.append(i.dom);i.dom.style.left="0px";i.dom.style.zIndex="unset";n.renderer.onBeforeUpdate.add(()=>i.begin());n.renderer.onAfterUpdate.add(()=>i.end());
