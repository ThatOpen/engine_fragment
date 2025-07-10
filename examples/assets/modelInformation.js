import{c3 as O,c4 as q,c5 as R,c6 as U,c7 as V,c8 as T,cn as _,f as H,cv as Y,c9 as j,ca as x,cb as N,cM as D,cN as W,cc as z,cr as X,ct as A,cs as J}from"./pako.esm-TbDA1OGb.js";import{R as K}from"./rendered-faces-DtNZp-Dg.js";import{h as Q}from"./index-DUcvzWcL.js";const y=new O,Z=y.get(q),c=Z.create();c.scene=new R(y);c.scene.setup();c.scene.three.background=null;const E=document.getElementById("container");c.renderer=new U(y,E);c.camera=new V(y);c.camera.controls.setLookAt(58,22,-25,13,0,4.2);y.init();const ee=y.get(T);ee.create(c);const te="../../src/multithreading/fragments-thread.ts",g=new Q(te);c.camera.controls.addEventListener("rest",()=>g.update(!0));g.models.list.onItemSet.add(({value:t})=>{t.useCamera(c.camera.three),c.scene.three.add(t.object),g.update(!0)});const ae=await fetch("/resources/frags/school_arq.frag"),ne=await ae.arrayBuffer(),s=await g.load(ne,{modelId:"example"}),se={color:new _("gold"),renderedFaces:K.TWO,opacity:1,transparent:!1};let l=null;const oe=async()=>{l&&await s.highlight([l],se)},B=async()=>{l&&await s.resetHighlight([l])};let F=()=>{},G=()=>{};const k=new H;E.addEventListener("click",async t=>{k.x=t.clientX,k.y=t.clientY;const n=await s.raycast({camera:c.camera.three,mouse:k,dom:c.renderer.three.domElement}),o=[];n?(o.push(B()),l=n.localId,F(),o.push(oe())):(o.push(B()),l=null,G()),o.push(g.update(!0)),Promise.all(o)});const M=async t=>{if(!l)return null;const[n]=await s.getItemsData([l],{attributesDefault:!t,attributes:t});return n},re=async()=>{const t=await M(["Name"]),n=t==null?void 0:t.Name;return n&&"value"in n?n.value:null},le=async()=>{if(!l)return null;const[t]=await s.getItemsData([l],{attributesDefault:!1,attributes:["Name","NominalValue"],relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOcurrence:{attributes:!1,relations:!1}}});return t.IsDefinedBy??[]},ie=t=>{const n={};for(const[o,m]of t.entries()){const{Name:b,HasProperties:u}=m;if(!("value"in b&&Array.isArray(u)))continue;const i={};for(const[f,L]of u.entries()){const{Name:w,NominalValue:e}=L;if(!("value"in w&&"value"in e))continue;const a=w.value,r=e.value;a&&r!==void 0&&(i[a]=r)}n[b.value]=i}return n},ce=async(t,n=!1)=>{const m=(await s.getItemsOfCategories([new RegExp(`^${t}$`)]))[t],u=(await s.getItemsData(m,{attributesDefault:!1,attributes:["Name"]})).map(i=>{const{Name:f}=i;return f&&!Array.isArray(f)?f.value:null}).filter(i=>i);return n?[...new Set(u)]:u},me=async()=>await s.getSpatialStructure(),ue=async()=>{const n=(await s.getItemsOfCategories([/BUILDINGSTOREY/])).IFCBUILDINGSTOREY,o=await s.getItemsData(n,{attributesDefault:!1,attributes:["Name"]});let m=null;for(const[u,i]of o.entries())"Name"in i&&"value"in i.Name&&i.Name.value==="01 - Entry Level"&&(m=n[u]);return m===null?null:await s.getItemsChildren([m])},de=async()=>{if(!l)return null;const[t]=await s.getItemsGeometry([l]);return t},be=async t=>{const n=await s.getItemsOfCategories([new RegExp(`^${t}$`)]),o=Object.values(n).flat(),m=await s.getItemsGeometry(o);return{localIds:o,geometries:m}};let $=[];const ge=new Y({color:"purple"}),fe=t=>{const{positions:n,indices:o,normals:m,transform:b}=t;if(!(n&&o&&m))return null;const u=new X;u.setAttribute("position",new A(n,3)),u.setAttribute("normal",new A(m,3)),u.setIndex(Array.from(o));const i=new J(u,ge);return i.applyMatrix4(b),$.push(i),i};j.init();const pe=await s.getCategories(),C=x.create(()=>N`<bim-dropdown name="categories">
    ${pe.map(t=>N`<bim-option label=${t}></bim-option>`)}
  </bim-dropdown>`),[v,P]=x.create(t=>{const n=async()=>{const e=await M();e&&console.log(e)},o=async()=>{const e=await le();if(!e)return;const a=document.getElementById("controls-panel"),r=a==null?void 0:a.querySelector('[name="format"]'),d=r!=null&&r.value?ie(e):e;console.log(d)},m=async({target:e})=>{e.loading=!0;const a=await de();if(!a){e.loading=!1;return}e.loading=!1,console.log(a)},b=async({target:e})=>{const a=document.getElementById("controls-panel"),[r]=C.value;if(!r)return;e.loading=!0;const d=a==null?void 0:a.querySelector('[name="unique"]'),I=await ce(r,d==null?void 0:d.value);e.loading=!1,console.log(I)},u=async({target:e})=>{const[a]=C.value;if(!a)return;e.loading=!0;const{localIds:r,geometries:d}=await be(a);for(const I of d)for(const S of I){const p=fe(S);p&&c.scene.three.add(p)}await s.setVisible(r,!1),await g.update(!0),e.loading=!1,console.log(d)},i=async()=>{for(const e of $){e.removeFromParent(),e.geometry.dispose();const a=Array.isArray(e.material)?e.material:[e.material];for(const r of a)r.dispose()}$=[],await s.setVisible(void 0,!0),await g.update(!0)},f=async e=>{if(!e)return;const a=e;a.textContent=await re()},L=async({target:e})=>{e.loading=!0;const a=await me();console.log(a),e.loading=!1},w=async({target:e})=>{e.loading=!0;const a=await ue();if(!a){e.loading=!1;return}const r=document.getElementById("controls-panel");if(r==null?void 0:r.querySelector('[name="displayNames"]')){const S=(await s.getItemsData(a,{attributesDefault:!1,attributes:["Name"]})).map(p=>"Name"in p&&"value"in p.Name?p.Name.value:null);console.log(S)}else console.log(a);e.loading=!1};return N`
    <bim-panel id="controls-panel" active label="Model Information" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
      <bim-panel-section label="Selected Item">
        <bim-label style=${D({whiteSpace:"normal",display:l?"none":"unset"})}>💡 Click any element in the viewer to activate the data log options.</bim-label>
        <bim-label ${W(f)} style=${D({whiteSpace:"normal",display:l?"unset":"none"})}></bim-label>
        <bim-button ?disabled=${!l} label="Log Attributes" @click=${n}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button ?disabled=${!l} label="Log Psets" @click=${o}></bim-button>
          <bim-checkbox name="format" label="Format" inverted checked></bim-checkbox>
        </div>
          <bim-button ?disabled=${!l} label="Log Geometry" @click=${m}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${C}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${b}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
        <bim-button label="Log Geometries" @click=${u}></bim-button>
        <bim-button label="Dispose Meshes" @click=${i}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Spatial Structure">
        <bim-button label="Log Spatial Structure" @click=${L}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log First Level Items" @click=${w}></bim-button>
          <bim-checkbox name="displayNames" label="Names" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
    </bim-panel>
  `},{});F=()=>P();G=()=>P();document.body.append(v);const ye=x.create(()=>N`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{v.classList.contains("options-menu-visible")?v.classList.remove("options-menu-visible"):v.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(ye);const h=new z;h.showPanel(2);document.body.append(h.dom);h.dom.style.left="0px";h.dom.style.zIndex="unset";c.renderer.onBeforeUpdate.add(()=>h.begin());c.renderer.onAfterUpdate.add(()=>h.end());
