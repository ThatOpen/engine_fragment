import{C as R,W as O,S as q,a as U,b as V,G as _,cM as T,cN as j,cI as H,cF as W,cC as D,cL as Y}from"./virtual-memory-controller-CWnYvOUm.js";import{a as Q,R as x,m as N,Q as F,F as z}from"./index-CWj6LyOo.js";import{S as X}from"./stats.min-Cj8wREqt.js";import{R as J}from"./rendered-faces-DtNZp-Dg.js";import{F as K}from"./index-gTtqA1ko.js";const y=new R,Z=y.get(O),c=Z.create();c.scene=new q(y);c.scene.setup();c.scene.three.background=null;const G=document.getElementById("container");c.renderer=new U(y,G);c.camera=new V(y);c.camera.controls.setLookAt(58,22,-25,13,0,4.2);y.init();const ee=y.get(_);ee.create(c);const te="https://thatopen.github.io/engine_fragment/resources/worker.mjs",g=new K(te);c.camera.controls.addEventListener("rest",()=>g.update(!0));g.models.list.onItemSet.add(({value:t})=>{t.useCamera(c.camera.three),c.scene.three.add(t.object),g.update(!0)});const ae=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),ne=await ae.arrayBuffer(),o=await g.load(ne,{modelId:"example"}),oe={color:new T("gold"),renderedFaces:J.TWO,opacity:1,transparent:!1};let i=null;const se=async()=>{i&&await o.highlight([i],oe)},A=async()=>{i&&await o.resetHighlight([i])};let B=()=>{},E=()=>{};const k=new j;G.addEventListener("click",async t=>{k.x=t.clientX,k.y=t.clientY;const n=await o.raycast({camera:c.camera.three,mouse:k,dom:c.renderer.three.domElement}),s=[];n?(s.push(A()),i=n.localId,B(),s.push(se())):(s.push(A()),i=null,E()),s.push(g.update(!0)),Promise.all(s)});const M=async t=>{if(!i)return null;const[n]=await o.getItemsData([i],{attributesDefault:!t,attributes:t});return n},re=async()=>{const t=await M(["Name"]),n=t==null?void 0:t.Name;return n&&"value"in n?n.value:null},ie=async()=>{if(!i)return null;const[t]=await o.getItemsData([i],{attributesDefault:!1,attributes:["Name","NominalValue"],relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOcurrence:{attributes:!1,relations:!1}}});return t.IsDefinedBy??[]},le=t=>{const n={};for(const[s,m]of t.entries()){const{Name:b,HasProperties:u}=m;if(!("value"in b&&Array.isArray(u)))continue;const l={};for(const[f,L]of u.entries()){const{Name:w,NominalValue:e}=L;if(!("value"in w&&"value"in e))continue;const a=w.value,r=e.value;a&&r!==void 0&&(l[a]=r)}n[b.value]=l}return n},ce=async(t,n=!1)=>{const m=(await o.getItemsOfCategories([new RegExp(`^${t}$`)]))[t],u=(await o.getItemsData(m,{attributesDefault:!1,attributes:["Name"]})).map(l=>{const{Name:f}=l;return f&&!Array.isArray(f)?f.value:null}).filter(l=>l);return n?[...new Set(u)]:u},me=async()=>await o.getSpatialStructure(),ue=async()=>{const n=(await o.getItemsOfCategories([/BUILDINGSTOREY/])).IFCBUILDINGSTOREY,s=await o.getItemsData(n,{attributesDefault:!1,attributes:["Name"]});let m=null;for(const[u,l]of s.entries())"Name"in l&&"value"in l.Name&&l.Name.value==="01 - Entry Level"&&(m=n[u]);return m===null?null:await o.getItemsChildren([m])},de=async()=>{if(!i)return null;const[t]=await o.getItemsGeometry([i]);return t},be=async t=>{const n=await o.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(n).flat(),m=await o.getItemsGeometry(s);return{localIds:s,geometries:m}};let $=[];const ge=new H({color:"purple"}),fe=t=>{const{positions:n,indices:s,normals:m,transform:b}=t;if(!(n&&s&&m))return null;const u=new W;u.setAttribute("position",new D(n,3)),u.setAttribute("normal",new D(m,3)),u.setIndex(Array.from(s));const l=new Y(u,ge);return l.applyMatrix4(b),$.push(l),l};Q.init();const pe=await o.getCategories(),C=x.create(()=>N`<bim-dropdown name="categories">
    ${pe.map(t=>N`<bim-option label=${t}></bim-option>`)}
  </bim-dropdown>`),[v,P]=x.create(t=>{const n=async()=>{const e=await M();e&&console.log(e)},s=async()=>{const e=await ie();if(!e)return;const a=document.getElementById("controls-panel"),r=a==null?void 0:a.querySelector('[name="format"]'),d=r!=null&&r.value?le(e):e;console.log(d)},m=async({target:e})=>{e.loading=!0;const a=await de();if(!a){e.loading=!1;return}e.loading=!1,console.log(a)},b=async({target:e})=>{const a=document.getElementById("controls-panel"),[r]=C.value;if(!r)return;e.loading=!0;const d=a==null?void 0:a.querySelector('[name="unique"]'),I=await ce(r,d==null?void 0:d.value);e.loading=!1,console.log(I)},u=async({target:e})=>{const[a]=C.value;if(!a)return;e.loading=!0;const{localIds:r,geometries:d}=await be(a);for(const I of d)for(const S of I){const p=fe(S);p&&c.scene.three.add(p)}await o.setVisible(r,!1),await g.update(!0),e.loading=!1,console.log(d)},l=async()=>{for(const e of $){e.removeFromParent(),e.geometry.dispose();const a=Array.isArray(e.material)?e.material:[e.material];for(const r of a)r.dispose()}$=[],await o.setVisible(void 0,!0),await g.update(!0)},f=async e=>{if(!e)return;const a=e;a.textContent=await re()},L=async({target:e})=>{e.loading=!0;const a=await me();console.log(a),e.loading=!1},w=async({target:e})=>{e.loading=!0;const a=await ue();if(!a){e.loading=!1;return}const r=document.getElementById("controls-panel");if(r==null?void 0:r.querySelector('[name="displayNames"]')){const S=(await o.getItemsData(a,{attributesDefault:!1,attributes:["Name"]})).map(p=>"Name"in p&&"value"in p.Name?p.Name.value:null);console.log(S)}else console.log(a);e.loading=!1};return N`
    <bim-panel id="controls-panel" active label="Model Information" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
      <bim-panel-section label="Selected Item">
        <bim-label style=${F({whiteSpace:"normal",display:i?"none":"unset"})}>💡 Click any element in the viewer to activate the data log options.</bim-label>
        <bim-label ${z(f)} style=${F({whiteSpace:"normal",display:i?"unset":"none"})}></bim-label>
        <bim-button ?disabled=${!i} label="Log Attributes" @click=${n}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button ?disabled=${!i} label="Log Psets" @click=${s}></bim-button>
          <bim-checkbox name="format" label="Format" inverted checked></bim-checkbox>
        </div>
          <bim-button ?disabled=${!i} label="Log Geometry" @click=${m}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${C}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${b}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
        <bim-button label="Log Geometries" @click=${u}></bim-button>
        <bim-button label="Dispose Meshes" @click=${l}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Spatial Structure">
        <bim-button label="Log Spatial Structure" @click=${L}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log First Level Items" @click=${w}></bim-button>
          <bim-checkbox name="displayNames" label="Names" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
    </bim-panel>
  `},{});B=()=>P();E=()=>P();document.body.append(v);const ye=x.create(()=>N`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{v.classList.contains("options-menu-visible")?v.classList.remove("options-menu-visible"):v.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(ye);const h=new X;h.showPanel(2);document.body.append(h.dom);h.dom.style.left="0px";h.dom.style.zIndex="unset";c.renderer.onBeforeUpdate.add(()=>h.begin());c.renderer.onAfterUpdate.add(()=>h.end());
