import{c5 as B,c6 as E,c7 as F,c8 as q,c9 as O,ca as U,cb as _,cm as R,bS as T,cc as V,cd as S,ce as v,cn as L,co as H,cf as M}from"./pako.esm-9qfSKSXL.js";import{R as j}from"./rendered-faces-DtNZp-Dg.js";const p=new B,G=p.get(E),l=G.create();l.scene=new F(p);l.scene.setup();l.scene.three.background=null;const x=document.getElementById("container");l.renderer=new q(p,x);l.camera=new O(p);l.camera.controls.setLookAt(183,11,-102,27,-52,-11);p.init();const W=p.get(U);W.create(l);const Y="https://thatopen.github.io/engine_fragment/resources/worker.mjs",y=new _(Y);l.camera.controls.addEventListener("rest",()=>y.update(!0));y.models.list.onItemSet.add(({value:e})=>{e.useCamera(l.camera.three),l.scene.three.add(e.object),y.update(!0)});const z=await fetch("/resources/frags/school_arq.frag"),X=await z.arrayBuffer(),c=await y.load(X,{modelId:"example"}),J={color:new R("gold"),renderedFaces:j.TWO,opacity:1,transparent:!1};let o=null;const K=async()=>{o&&await c.highlight([o],J)},k=async()=>{o&&await c.resetHighlight([o])};let D=()=>{},$=()=>{};const N=new T;x.addEventListener("click",async e=>{N.x=e.clientX,N.y=e.clientY;const a=await c.raycast({camera:l.camera.three,mouse:N,dom:l.renderer.three.domElement}),m=[];a?(m.push(k()),o=a.localId,D(),m.push(K())):(m.push(k()),o=null,$()),m.push(y.update(!0)),Promise.all(m)});const P=async e=>{if(!o)return null;const[a]=await c.getItemsData([o],{attributesDefault:!e,attributes:e});return a},Q=async()=>{const e=await P(["Name"]),a=e==null?void 0:e.Name;return a&&"value"in a?a.value:null},Z=async()=>{if(!o)return null;const[e]=await c.getItemsData([o],{attributesDefault:!1,attributes:["Name","NominalValue"],relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOcurrence:{attributes:!1,relations:!1}}});return e.IsDefinedBy??[]},ee=e=>{const a={};for(const[m,u]of e.entries()){const{Name:b,HasProperties:i}=u;if(!("value"in b&&Array.isArray(i)))continue;const s={};for(const[t,n]of i.entries()){const{Name:r,NominalValue:d}=n;if(!("value"in r&&"value"in d))continue;const f=r.value,h=d.value;f&&h!==void 0&&(s[f]=h)}a[b.value]=s}return a},te=async(e,a=!1)=>{const m=await c.getItemsOfCategory(e),u=(await Promise.all(m.map(s=>s.getLocalId()))).filter(s=>s!==null),i=(await c.getItemsData(u,{attributesDefault:!1,attributes:["Name"]})).map(s=>{const{Name:t}=s;return t&&!Array.isArray(t)?t.value:null}).filter(s=>s);return a?[...new Set(i)]:i},ae=async()=>await c.getSpatialStructure(),ne=async()=>{const e=await c.getItemsOfCategory("IFCBUILDINGSTOREY"),a=(await Promise.all(e.map(i=>i.getLocalId()))).filter(i=>i!==null),m=await c.getItemsData(a,{attributesDefault:!1,attributes:["Name"]});let u=null;for(const[i,s]of m.entries())"Name"in s&&"value"in s.Name&&s.Name.value==="01 - Entry Level"&&(u=a[i]);return u===null?null:await c.getItemsChildren([u])};V.init();const se=await c.getCategories(),C=S.create(()=>v`<bim-dropdown name="categories">
    ${se.map(e=>v`<bim-option label=${e}></bim-option>`)}
  </bim-dropdown>`),[w,A]=S.create(e=>{const a=async()=>{const t=await P();t&&console.log(t)},m=async()=>{const t=await Z();if(!t)return;const n=document.getElementById("controls-panel"),r=n==null?void 0:n.querySelector('[name="format"]'),d=r!=null&&r.value?ee(t):t;console.log(d)},u=async({target:t})=>{const n=document.getElementById("controls-panel"),[r]=C.value;if(!r)return;t.loading=!0;const d=n==null?void 0:n.querySelector('[name="unique"]'),f=await te(r,d==null?void 0:d.value);t.loading=!1,console.log(f)},b=async t=>{if(!t)return;const n=t;n.textContent=await Q()},i=async({target:t})=>{t.loading=!0;const n=await ae();console.log(n),t.loading=!1},s=async({target:t})=>{t.loading=!0;const n=await ne();if(!n){t.loading=!1;return}const r=document.getElementById("controls-panel");if(r==null?void 0:r.querySelector('[name="displayNames"]')){const h=(await c.getItemsData(n,{attributesDefault:!1,attributes:["Name"]})).map(I=>"Name"in I&&"value"in I.Name?I.Name.value:null);console.log(h)}else console.log(n);t.loading=!1};return v`
    <bim-panel id="controls-panel" active label="Model Information" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
      <bim-panel-section label="Selected Item">
        <bim-label style=${L({whiteSpace:"normal",display:o?"none":"unset"})}>💡 Click any element in the viewer to activate the data log options.</bim-label>
        <bim-label ${H(b)} style=${L({whiteSpace:"normal",display:o?"unset":"none"})}></bim-label>
        <bim-button ?disabled=${!o} label="Log Attributes" @click=${a}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button ?disabled=${!o} label="Log Psets" @click=${m}></bim-button>
          <bim-checkbox name="format" label="Format" inverted checked></bim-checkbox>
        </div>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${C}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${u}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
      <bim-panel-section label="Spatial Structure">
        <bim-button label="Log Spatial Structure" @click=${i}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log First Level Items" @click=${s}></bim-button>
          <bim-checkbox name="displayNames" label="Names" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
    </bim-panel>
  `},{});D=()=>A();$=()=>A();document.body.append(w);const oe=S.create(()=>v`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{w.classList.contains("options-menu-visible")?w.classList.remove("options-menu-visible"):w.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(oe);const g=new M;g.showPanel(2);document.body.append(g.dom);g.dom.style.left="0px";g.dom.style.zIndex="unset";l.renderer.onBeforeUpdate.add(()=>g.begin());l.renderer.onAfterUpdate.add(()=>g.end());
