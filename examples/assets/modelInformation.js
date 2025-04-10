import{C as E,a as P}from"./encoding-OofKfb5O.js";import{bU as A,bV as U,bW as q,bX as _,bY as O,bZ as R,b_ as j,b$ as T,c0 as L,c1 as v,c3 as k,c4 as V,c2 as W}from"./pako.esm-CxPC41x8.js";import{R as H}from"./rendered-faces-DtNZp-Dg.js";const g=new A,M=g.get(U),s=M.create();s.scene=new q(g);s.scene.setup();s.scene.three.background=null;const C=document.getElementById("container");s.renderer=new _(g,C);s.camera=new O(g);s.camera.controls.setLookAt(183,11,-102,27,-52,-11);g.init();const Y=g.get(R);Y.create(s);const G="https://thatopen.github.io/engine_fragment/resources/worker.mjs",X=await fetch(G),z=await X.text(),Z=new File([new Blob([z])],"worker.mjs",{type:"text/javascript"}),J=URL.createObjectURL(Z),p=new j(J);s.camera.controls.addEventListener("rest",()=>p.update(!0));s.camera.controls.addEventListener("update",()=>p.update());p.models.list.onItemSet.add(({value:e})=>{e.useCamera(s.camera.three),s.scene.three.add(e.object),p.update(!0)});const K=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),Q=await K.arrayBuffer(),c=await p.load(Q,{modelId:"example"}),ee={color:new E("gold"),renderedFaces:H.TWO,opacity:1,transparent:!1};let l=null;const te=async()=>{l&&await c.highlight([l],ee)},S=async()=>{l&&await c.resetHighlight([l])};let D=()=>{},$=()=>{};const N=new P;C.addEventListener("click",async e=>{N.x=e.clientX,N.y=e.clientY;const a=await c.raycast({camera:s.camera.three,mouse:N,dom:s.renderer.three.domElement}),m=[];a?(m.push(S()),l=a.localId,D(),m.push(te())):(m.push(S()),l=null,$()),m.push(p.update(!0)),Promise.all(m)});const F=async e=>{if(!l)return null;const[a]=await c.getItemsData([l],{attributesDefault:!e,attributes:e});return a},ae=async()=>{const e=await F(["Name"]),a=e==null?void 0:e.Name;return a&&"value"in a?a.value:null},ne=async()=>{if(!l)return null;const[e]=await c.getItemsData([l],{attributesDefault:!1,attributes:["Name","NominalValue"],relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOcurrence:{attributes:!1,relations:!1}}});return e.IsDefinedBy??[]},oe=e=>{const a={};for(const[m,u]of e.entries()){const{Name:b,HasProperties:i}=u;if(!("value"in b&&Array.isArray(i)))continue;const o={};for(const[t,n]of i.entries()){const{Name:r,NominalValue:d}=n;if(!("value"in r&&"value"in d))continue;const y=r.value,w=d.value;y&&w!==void 0&&(o[y]=w)}a[b.value]=o}return a},se=async(e,a=!1)=>{const m=await c.getItemsOfCategory(e),u=(await Promise.all(m.map(o=>o.getLocalId()))).filter(o=>o!==null),i=(await c.getItemsData(u,{attributesDefault:!1,attributes:["Name"]})).map(o=>{const{Name:t}=o;return t&&!Array.isArray(t)?t.value:null}).filter(o=>o);return a?[...new Set(i)]:i},le=async()=>await c.getSpatialStructure(),ie=async()=>{const e=await c.getItemsOfCategory("IFCBUILDINGSTOREY"),a=(await Promise.all(e.map(i=>i.getLocalId()))).filter(i=>i!==null),m=await c.getItemsData(a,{attributesDefault:!1,attributes:["Name"]});let u=null;for(const[i,o]of m.entries())"Name"in o&&"value"in o.Name&&o.Name.value==="01 - Entry Level"&&(u=a[i]);return u===null?null:await c.getItemsChildren([u])};T.init();const re=await c.getCategories(),x=L.create(()=>v`<bim-dropdown name="categories">
    ${re.map(e=>v`<bim-option label=${e}></bim-option>`)}
  </bim-dropdown>`),[h,B]=L.create(e=>{const a=async()=>{const t=await F();t&&console.log(t)},m=async()=>{const t=await ne();if(!t)return;const n=document.getElementById("controls-panel"),r=n==null?void 0:n.querySelector('[name="format"]'),d=r!=null&&r.value?oe(t):t;console.log(d)},u=async({target:t})=>{const n=document.getElementById("controls-panel"),[r]=x.value;if(!r)return;t.loading=!0;const d=n==null?void 0:n.querySelector('[name="unique"]'),y=await se(r,d==null?void 0:d.value);t.loading=!1,console.log(y)},b=async t=>{if(!t)return;const n=t;n.textContent=await ae()},i=async({target:t})=>{t.loading=!0;const n=await le();console.log(n),t.loading=!1},o=async({target:t})=>{t.loading=!0;const n=await ie();if(!n){t.loading=!1;return}const r=document.getElementById("controls-panel");if(r==null?void 0:r.querySelector('[name="displayNames"]')){const w=(await c.getItemsData(n,{attributesDefault:!1,attributes:["Name"]})).map(I=>"Name"in I&&"value"in I.Name?I.Name.value:null);console.log(w)}else console.log(n);t.loading=!1};return v`
    <bim-panel id="controls-panel" active label="Model Information" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
      <bim-panel-section label="Selected Item">
        <bim-label style=${k({whiteSpace:"normal",display:l?"none":"unset"})}>💡 Click any element in the viewer to activate the data log options.</bim-label>
        <bim-label ${V(b)} style=${k({whiteSpace:"normal",display:l?"unset":"none"})}></bim-label>
        <bim-button ?disabled=${!l} label="Log Attributes" @click=${a}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button ?disabled=${!l} label="Log Psets" @click=${m}></bim-button>
          <bim-checkbox name="format" label="Format" inverted checked></bim-checkbox>
        </div>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${x}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${u}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
      <bim-panel-section label="Spatial Structure">
        <bim-button label="Log Spatial Structure" @click=${i}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log First Level Items" @click=${o}></bim-button>
          <bim-checkbox name="displayNames" label="Names" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
    </bim-panel>
  `},{});D=()=>B();$=()=>B();document.body.append(h);const ce=L.create(()=>v`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{h.classList.contains("options-menu-visible")?h.classList.remove("options-menu-visible"):h.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(ce);const f=new W;f.showPanel(2);document.body.append(f.dom);f.dom.style.left="0px";f.dom.style.zIndex="unset";s.renderer.onBeforeUpdate.add(()=>f.begin());s.renderer.onAfterUpdate.add(()=>f.end());
