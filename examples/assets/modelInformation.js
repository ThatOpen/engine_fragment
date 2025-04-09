import{c4 as E,c5 as F,c6 as B,c7 as q,c8 as O,c9 as U,ca as V,cm as R,bS as T,cb as _,cc as S,cd as I,cn as L,co as H,ce as M}from"./index-B2CFg0Uj.js";import{R as G}from"./rendered-faces-DtNZp-Dg.js";import"./pako.esm-DwGzBETv.js";const f=new E,W=f.get(F),i=W.create();i.scene=new B(f);i.scene.setup();i.scene.three.background=null;const x=document.getElementById("container");i.renderer=new q(f,x);i.camera=new O(f);i.camera.controls.setLookAt(80,25,-52,11,-9.5,-3);f.init();const Y=f.get(U);Y.create(i);const j="../../src/multithreading/fragments-thread.ts",b=new V(j);i.camera.controls.addEventListener("rest",()=>b.update(!0));b.models.list.onItemSet.add(({value:e})=>{e.useCamera(i.camera.three),i.scene.three.add(e.object),b.update(!0)});const z=await fetch("/resources/frags/medium_test.frag"),X=await z.arrayBuffer(),l=await b.load(X,{modelId:"example"}),J=await l.getItemsOfCategory("IFCSPACE"),K=(await Promise.all(J.map(e=>e.getLocalId()))).filter(e=>typeof e<"u");await l.setVisible(K,!1);b.update(!0);const Q={color:new R("gold"),renderedFaces:G.TWO,opacity:1,transparent:!1};let o=null;const Z=async()=>{o&&await b.highlight(Q,{[l.modelId]:[o]})},C=async()=>{o&&await b.resetHighlight({[l.modelId]:[o]})};let D=()=>{},$=()=>{};const N=new T;x.addEventListener("click",async e=>{N.x=e.clientX,N.y=e.clientY;const a=await b.raycast({camera:i.camera.three,mouse:N,dom:i.renderer.three.domElement}),m=[];a?(m.push(C()),o=a.localId,D(),m.push(Z())):(m.push(C()),o=null,$()),m.push(b.update(!0)),Promise.all(m)});const P=async e=>{if(!o)return null;const[a]=await l.getItemsData([o],{attributesDefault:!e,attributes:e});return a},ee=async()=>{const e=await P(["Name"]),a=e==null?void 0:e.Name;return a&&"value"in a?a.value:null},te=async()=>{if(!o)return null;const[e]=await l.getItemsData([o],{attributesDefault:!1,attributes:["Name","NominalValue"],relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOcurrence:{attributes:!1,relations:!1}}});return e.IsDefinedBy??[]},ae=e=>{const a={};for(const[m,u]of e.entries()){const{Name:p,HasProperties:r}=u;if(!("value"in p&&Array.isArray(r)))continue;const s={};for(const[t,n]of r.entries()){const{Name:c,NominalValue:d}=n;if(!("value"in c&&"value"in d))continue;const y=c.value,w=d.value;y&&w!==void 0&&(s[y]=w)}a[p.value]=s}return a},ne=async(e,a=!1)=>{const m=await l.getItemsOfCategory(e),u=(await Promise.all(m.map(s=>s.getLocalId()))).filter(s=>s!==null),r=(await l.getItemsData(u,{attributesDefault:!1,attributes:["Name"]})).map(s=>{const{Name:t}=s;return t&&!Array.isArray(t)?t.value:null}).filter(s=>s);return a?[...new Set(r)]:r},se=async()=>await l.getSpatialStructure(),oe=async()=>{const e=await l.getItemsOfCategory("IFCBUILDINGSTOREY"),a=(await Promise.all(e.map(r=>r.getLocalId()))).filter(r=>r!==null),m=await l.getItemsData(a,{attributesDefault:!1,attributes:["Name"]});let u=null;for(const[r,s]of m.entries())"Name"in s&&"value"in s.Name&&s.Name.value==="01 - Entry Level"&&(u=a[r]);return u===null?null:await l.getItemsChildren([u])};_.init();const le=await l.getCategories(),k=S.create(()=>I`<bim-dropdown name="categories">
    ${le.map(e=>I`<bim-option label=${e}></bim-option>`)}
  </bim-dropdown>`),[h,A]=S.create(e=>{const a=async()=>{const t=await P();t&&console.log(t)},m=async()=>{const t=await te();if(!t)return;const n=document.getElementById("controls-panel"),c=n==null?void 0:n.querySelector('[name="format"]'),d=c!=null&&c.value?ae(t):t;console.log(d)},u=async({target:t})=>{const n=document.getElementById("controls-panel"),[c]=k.value;if(!c)return;t.loading=!0;const d=n==null?void 0:n.querySelector('[name="unique"]'),y=await ne(c,d==null?void 0:d.value);t.loading=!1,console.log(y)},p=async t=>{if(!t)return;const n=t;n.textContent=await ee()},r=async({target:t})=>{t.loading=!0;const n=await se();console.log(n),t.loading=!1},s=async({target:t})=>{t.loading=!0;const n=await oe();if(!n){t.loading=!1;return}const c=document.getElementById("controls-panel");if(c==null?void 0:c.querySelector('[name="displayNames"]')){const w=(await l.getItemsData(n,{attributesDefault:!1,attributes:["Name"]})).map(v=>"Name"in v&&"value"in v.Name?v.Name.value:null);console.log(w)}else console.log(n);t.loading=!1};return I`
    <bim-panel id="controls-panel" active label="Model Information" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
      <bim-panel-section label="Selected Item">
        <bim-label style=${L({whiteSpace:"normal",display:o?"none":"unset"})}>💡 Click any element in the viewer to activate the data log options.</bim-label>
        <bim-label ${H(p)} style=${L({whiteSpace:"normal",display:o?"unset":"none"})}></bim-label>
        <bim-button ?disabled=${!o} label="Log Attributes" @click=${a}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button ?disabled=${!o} label="Log Psets" @click=${m}></bim-button>
          <bim-checkbox name="format" label="Format" inverted checked></bim-checkbox>
        </div>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${k}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${u}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
      <bim-panel-section label="Spatial Structure">
        <bim-button label="Log Spatial Structure" @click=${r}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log First Level Items" @click=${s}></bim-button>
          <bim-checkbox name="displayNames" label="Names" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
    </bim-panel>
  `},{});D=()=>A();$=()=>A();document.body.append(h);const ie=S.create(()=>I`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{h.classList.contains("options-menu-visible")?h.classList.remove("options-menu-visible"):h.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(ie);const g=new M;g.showPanel(2);document.body.append(g.dom);g.dom.style.left="0px";g.dom.style.zIndex="unset";i.renderer.onBeforeUpdate.add(()=>g.begin());i.renderer.onAfterUpdate.add(()=>g.end());
