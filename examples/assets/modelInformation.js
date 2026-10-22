import{C as q,W as U,S as R,a as V,b as _,G as T,F as M,y as W,i as H,p as Y,g as j,B as K,w as D,h as z}from"./index-CCztv3eI.js";import{K as X,n as $,b as L,o as A,a as J}from"./index-CKQNNdoX.js";import{S as Q}from"./stats.min-CgKsrbbR.js";const y=new q,Z=y.get(U),r=Z.create();r.scene=new R(y);r.scene.setup();r.scene.three.background=null;const B=document.getElementById("container");r.renderer=new V(y,B);r.camera=new _(y);r.camera.controls.setLookAt(58,22,-25,13,0,4.2);y.init();const ee=y.get(T);ee.create(r);const te=await M.getWorker(),b=new M(te);r.camera.controls.addEventListener("update",()=>b.update());b.models.list.onItemSet.add(({value:t})=>{t.useCamera(r.camera.three),r.scene.three.add(t.object),b.update(!0)});b.models.materials.list.onItemSet.add(({value:t})=>{"isLodMaterial"in t&&t.isLodMaterial||(t.polygonOffset=!0,t.polygonOffsetUnits=1,t.polygonOffsetFactor=Math.random())});const ae=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),ne=await ae.arrayBuffer(),o=await b.load(ne,{modelId:"example"}),oe={color:new H("gold"),renderedFaces:W.TWO,opacity:1,transparent:!1};let l=null;const se=async()=>{l&&await o.highlight([l],oe)},F=async()=>{l&&await o.resetHighlight([l])};let G=()=>{},E=()=>{};const S=new Y;B.addEventListener("click",async t=>{S.x=t.clientX,S.y=t.clientY;const a=await o.raycast({camera:r.camera.three,mouse:S,dom:r.renderer.three.domElement}),s=[];a?(s.push(F()),l=a.localId,G(),s.push(se())):(s.push(F()),l=null,E()),s.push(b.update(!0)),Promise.all(s)});const O=async t=>{if(!l)return null;const[a]=await o.getItemsData([l],{attributesDefault:!t,attributes:t});return a},le=async()=>{const a=(await O(["Name"]))?.Name;return a&&"value"in a?a.value:null},ie=async()=>{if(!l)return null;const[t]=await o.getItemsData([l],{attributesDefault:!1,attributes:["Name","NominalValue"],relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOccurrence:{attributes:!1,relations:!1}}});return t.IsDefinedBy??[]},re=t=>{const a={};for(const[s,c]of t.entries()){const{Name:d,HasProperties:m}=c;if(!("value"in d&&Array.isArray(m)))continue;const i={};for(const[g,k]of m.entries()){const{Name:w,NominalValue:e}=k;if(!("value"in w&&"value"in e))continue;const n=w.value,u=e.value;n&&u!==void 0&&(i[n]=u)}a[d.value]=i}return a},ce=async(t,a=!1)=>{const c=(await o.getItemsOfCategories([new RegExp(`^${t}$`)]))[t],m=(await o.getItemsData(c,{attributesDefault:!1,attributes:["Name"]})).map(i=>{const{Name:g}=i;return g&&!Array.isArray(g)?g.value:null}).filter(i=>i);return a?[...new Set(m)]:m},me=async()=>await o.getSpatialStructure(),ue=async()=>{const a=(await o.getItemsOfCategories([/BUILDINGSTOREY/])).IFCBUILDINGSTOREY,s=await o.getItemsData(a,{attributesDefault:!1,attributes:["Name"]});let c=null;for(const[m,i]of s.entries())"Name"in i&&"value"in i.Name&&i.Name.value==="01 - Entry Level"&&(c=a[m]);return c===null?null:await o.getItemsChildren([c])},de=async()=>{if(!l)return null;const[t]=await o.getItemsGeometry([l]);return t},be=async t=>{const a=await o.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(a).flat(),c=await o.getItemsGeometry(s);return{localIds:s,geometries:c}};let C=[];const pe=new j({color:"purple"}),ge=t=>{const{positions:a,indices:s,normals:c,transform:d}=t;if(!(a&&s&&c))return null;const m=new K;m.setAttribute("position",new D(a,3)),m.setAttribute("normal",new D(c,3)),m.setIndex(Array.from(s));const i=new z(m,pe);return i.applyMatrix4(d),C.push(i),i};X.init();const fe=await o.getCategories(),x=$.create(()=>L`<bim-dropdown name="categories">
    ${fe.map(t=>L`<bim-option label=${t}></bim-option>`)}
  </bim-dropdown>`),[v,P]=$.create(t=>{const a=async()=>{const e=await O();e&&console.log(e)},s=async()=>{const e=await ie();if(!e)return;const p=document.getElementById("controls-panel")?.querySelector('[name="format"]')?.value?re(e):e;console.log(p)},c=async({target:e})=>{e.loading=!0;const n=await de();if(!n){e.loading=!1;return}e.loading=!1,console.log(n)},d=async({target:e})=>{const n=document.getElementById("controls-panel"),[u]=x.value;if(!u)return;e.loading=!0;const p=n?.querySelector('[name="unique"]'),I=await ce(u,p?.value);e.loading=!1,console.log(I)},m=async({target:e})=>{const[n]=x.value;if(!n)return;e.loading=!0;const{localIds:u,geometries:p}=await be(n);for(const I of p)for(const N of I){const f=ge(N);f&&r.scene.three.add(f)}await o.setVisible(u,!1),await b.update(!0),e.loading=!1,console.log(p)},i=async()=>{for(const e of C){e.removeFromParent(),e.geometry.dispose();const n=Array.isArray(e.material)?e.material:[e.material];for(const u of n)u.dispose()}C=[],await o.setVisible(void 0,!0),await b.update(!0)},g=async e=>{if(!e)return;const n=e;n.textContent=await le()},k=async({target:e})=>{e.loading=!0;const n=await me();console.log(n),e.loading=!1},w=async({target:e})=>{e.loading=!0;const n=await ue();if(!n){e.loading=!1;return}if(document.getElementById("controls-panel")?.querySelector('[name="displayNames"]')){const N=(await o.getItemsData(n,{attributesDefault:!1,attributes:["Name"]})).map(f=>"Name"in f&&"value"in f.Name?f.Name.value:null);console.log(N)}else console.log(n);e.loading=!1};return L`
    <bim-panel id="controls-panel" active label="Model Information" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
      <bim-panel-section label="Selected Item">
        <bim-label style=${A({whiteSpace:"normal",display:l?"none":"unset"})}>💡 Click any element in the viewer to activate the data log options.</bim-label>
        <bim-label ${J(g)} style=${A({whiteSpace:"normal",display:l?"unset":"none"})}></bim-label>
        <bim-button ?disabled=${!l} label="Log Attributes" @click=${a}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button ?disabled=${!l} label="Log Psets" @click=${s}></bim-button>
          <bim-checkbox name="format" label="Format" inverted checked></bim-checkbox>
        </div>
          <bim-button ?disabled=${!l} label="Log Geometry" @click=${c}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${x}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${d}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
        <bim-button label="Log Geometries" @click=${m}></bim-button>
        <bim-button label="Dispose Meshes" @click=${i}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Spatial Structure">
        <bim-button label="Log Spatial Structure" @click=${k}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log First Level Items" @click=${w}></bim-button>
          <bim-checkbox name="displayNames" label="Names" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
    </bim-panel>
  `},{});G=()=>P();E=()=>P();document.body.append(v);const ye=$.create(()=>L`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{v.classList.contains("options-menu-visible")?v.classList.remove("options-menu-visible"):v.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(ye);const h=new Q;h.showPanel(2);document.body.append(h.dom);h.dom.style.left="0px";h.dom.style.zIndex="unset";r.renderer.onBeforeUpdate.add(()=>h.begin());r.renderer.onAfterUpdate.add(()=>h.end());
