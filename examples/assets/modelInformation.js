import{c3 as U,c4 as O,c5 as P,c6 as q,c7 as j,c8 as V,cs as _,f as T,cq as H,c9 as Y,ca as $,cb as L,ct as D,cu as W,cc as z,cm as Q,cv as A,cr as X}from"./pako.esm-CNfj-wfU.js";import{R as J}from"./rendered-faces-DtNZp-Dg.js";import{h as K}from"./index-BoGUiZul.js";const y=new U,Z=y.get(O),c=Z.create();c.scene=new P(y);c.scene.setup();c.scene.three.background=null;const B=document.getElementById("container");c.renderer=new q(y,B);c.camera=new j(y);c.camera.controls.setLookAt(58,22,-25,13,0,4.2);y.init();const ee=y.get(V);ee.create(c);const te="https://thatopen.github.io/engine_fragment/resources/worker.mjs",ae=await fetch(te),ne=await ae.blob(),oe=new File([ne],"worker.mjs",{type:"text/javascript"}),se=URL.createObjectURL(oe),g=new K(se);c.camera.controls.addEventListener("rest",()=>g.update(!0));g.models.list.onItemSet.add(({value:t})=>{t.useCamera(c.camera.three),c.scene.three.add(t.object),g.update(!0)});const re=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),ie=await re.arrayBuffer(),o=await g.load(ie,{modelId:"example"}),le={color:new _("gold"),renderedFaces:J.TWO,opacity:1,transparent:!1};let i=null;const ce=async()=>{i&&await o.highlight([i],le)},F=async()=>{i&&await o.resetHighlight([i])};let E=()=>{},G=()=>{};const S=new T;B.addEventListener("click",async t=>{S.x=t.clientX,S.y=t.clientY;const n=await o.raycast({camera:c.camera.three,mouse:S,dom:c.renderer.three.domElement}),s=[];n?(s.push(F()),i=n.localId,E(),s.push(ce())):(s.push(F()),i=null,G()),s.push(g.update(!0)),Promise.all(s)});const M=async t=>{if(!i)return null;const[n]=await o.getItemsData([i],{attributesDefault:!t,attributes:t});return n},me=async()=>{const t=await M(["Name"]),n=t==null?void 0:t.Name;return n&&"value"in n?n.value:null},ue=async()=>{if(!i)return null;const[t]=await o.getItemsData([i],{attributesDefault:!1,attributes:["Name","NominalValue"],relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOcurrence:{attributes:!1,relations:!1}}});return t.IsDefinedBy??[]},de=t=>{const n={};for(const[s,m]of t.entries()){const{Name:b,HasProperties:u}=m;if(!("value"in b&&Array.isArray(u)))continue;const l={};for(const[f,N]of u.entries()){const{Name:w,NominalValue:e}=N;if(!("value"in w&&"value"in e))continue;const a=w.value,r=e.value;a&&r!==void 0&&(l[a]=r)}n[b.value]=l}return n},be=async(t,n=!1)=>{const m=(await o.getItemsOfCategories([new RegExp(`^${t}$`)]))[t],u=(await o.getItemsData(m,{attributesDefault:!1,attributes:["Name"]})).map(l=>{const{Name:f}=l;return f&&!Array.isArray(f)?f.value:null}).filter(l=>l);return n?[...new Set(u)]:u},ge=async()=>await o.getSpatialStructure(),fe=async()=>{const n=(await o.getItemsOfCategories([/BUILDINGSTOREY/])).IFCBUILDINGSTOREY,s=await o.getItemsData(n,{attributesDefault:!1,attributes:["Name"]});let m=null;for(const[u,l]of s.entries())"Name"in l&&"value"in l.Name&&l.Name.value==="01 - Entry Level"&&(m=n[u]);return m===null?null:await o.getItemsChildren([m])},pe=async()=>{if(!i)return null;const[t]=await o.getItemsGeometry([i]);return t},ye=async t=>{const n=await o.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(n).flat(),m=await o.getItemsGeometry(s);return{localIds:s,geometries:m}};let C=[];const he=new H({color:"purple"}),we=t=>{const{positions:n,indices:s,normals:m,transform:b}=t;if(!(n&&s&&m))return null;const u=new Q;u.setAttribute("position",new A(n,3)),u.setAttribute("normal",new A(m,3)),u.setIndex(Array.from(s));const l=new X(u,he);return l.applyMatrix4(b),C.push(l),l};Y.init();const ve=await o.getCategories(),x=$.create(()=>L`<bim-dropdown name="categories">
    ${ve.map(t=>L`<bim-option label=${t}></bim-option>`)}
  </bim-dropdown>`),[I,R]=$.create(t=>{const n=async()=>{const e=await M();e&&console.log(e)},s=async()=>{const e=await ue();if(!e)return;const a=document.getElementById("controls-panel"),r=a==null?void 0:a.querySelector('[name="format"]'),d=r!=null&&r.value?de(e):e;console.log(d)},m=async({target:e})=>{e.loading=!0;const a=await pe();if(!a){e.loading=!1;return}e.loading=!1,console.log(a)},b=async({target:e})=>{const a=document.getElementById("controls-panel"),[r]=x.value;if(!r)return;e.loading=!0;const d=a==null?void 0:a.querySelector('[name="unique"]'),v=await be(r,d==null?void 0:d.value);e.loading=!1,console.log(v)},u=async({target:e})=>{const[a]=x.value;if(!a)return;e.loading=!0;const{localIds:r,geometries:d}=await ye(a);for(const v of d)for(const k of v){const p=we(k);p&&c.scene.three.add(p)}await o.setVisible(r,!1),await g.update(!0),e.loading=!1,console.log(d)},l=async()=>{for(const e of C){e.removeFromParent(),e.geometry.dispose();const a=Array.isArray(e.material)?e.material:[e.material];for(const r of a)r.dispose()}C=[],await o.setVisible(void 0,!0),await g.update(!0)},f=async e=>{if(!e)return;const a=e;a.textContent=await me()},N=async({target:e})=>{e.loading=!0;const a=await ge();console.log(a),e.loading=!1},w=async({target:e})=>{e.loading=!0;const a=await fe();if(!a){e.loading=!1;return}const r=document.getElementById("controls-panel");if(r==null?void 0:r.querySelector('[name="displayNames"]')){const k=(await o.getItemsData(a,{attributesDefault:!1,attributes:["Name"]})).map(p=>"Name"in p&&"value"in p.Name?p.Name.value:null);console.log(k)}else console.log(a);e.loading=!1};return L`
    <bim-panel id="controls-panel" active label="Model Information" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
      <bim-panel-section label="Selected Item">
        <bim-label style=${D({whiteSpace:"normal",display:i?"none":"unset"})}>💡 Click any element in the viewer to activate the data log options.</bim-label>
        <bim-label ${W(f)} style=${D({whiteSpace:"normal",display:i?"unset":"none"})}></bim-label>
        <bim-button ?disabled=${!i} label="Log Attributes" @click=${n}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button ?disabled=${!i} label="Log Psets" @click=${s}></bim-button>
          <bim-checkbox name="format" label="Format" inverted checked></bim-checkbox>
        </div>
          <bim-button ?disabled=${!i} label="Log Geometry" @click=${m}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${x}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${b}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
        <bim-button label="Log Geometries" @click=${u}></bim-button>
        <bim-button label="Dispose Meshes" @click=${l}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Spatial Structure">
        <bim-button label="Log Spatial Structure" @click=${N}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log First Level Items" @click=${w}></bim-button>
          <bim-checkbox name="displayNames" label="Names" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
    </bim-panel>
  `},{});E=()=>R();G=()=>R();document.body.append(I);const Ie=$.create(()=>L`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{I.classList.contains("options-menu-visible")?I.classList.remove("options-menu-visible"):I.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(Ie);const h=new z;h.showPanel(2);document.body.append(h.dom);h.dom.style.left="0px";h.dom.style.zIndex="unset";c.renderer.onBeforeUpdate.add(()=>h.begin());c.renderer.onAfterUpdate.add(()=>h.end());
