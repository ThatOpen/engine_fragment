var D=Object.defineProperty;var N=(n,e,t)=>e in n?D(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var p=(n,e,t)=>(N(n,typeof e!="symbol"?e+"":e,t),t);import{C as S,W as _,fq as O,a as j,fr as F,ft as V,fs as z,fV as w,fo as q,fJ as H,fH as W}from"./virtual-memory-controller-uf_sHEwD.js";import{S as J}from"./stats.min-Cj8wREqt.js";import{a as X,R as u,m as o}from"./index-CWj6LyOo.js";import{F as Y}from"./index-UINVeUYY.js";const v=new S,G=v.get(_),K=document.getElementById("container"),d=G.create();d.scene=new O(v);d.renderer=new j(v,K);d.camera=new F(v);v.init();d.scene.three.add(new V);d.camera.three.far=1e4;d.renderer.three.shadowMap.enabled=!0;d.renderer.three.shadowMap.type=z;d.scene.setup({shadows:{cascade:1,resolution:1024}});await d.scene.updateShadows();d.camera.controls.addEventListener("rest",async()=>{await d.scene.updateShadows()});const Q="https://thatopen.github.io/engine_fragment/resources/worker.mjs",Z=await fetch(Q),ee=await Z.blob(),te=new File([ee],"worker.mjs",{type:"text/javascript"}),ae=URL.createObjectURL(te),l=new Y(ae);d.camera.controls.addEventListener("control",()=>l.update());l.models.materials.list.onItemSet.add(({value:n})=>{"isLodMaterial"in n&&n.isLodMaterial||(n.polygonOffset=!0,n.polygonOffsetUnits=1,n.polygonOffsetFactor=Math.random())});l.models.list.onItemSet.add(({value:n})=>{n.tiles.onItemSet.add(({value:e})=>{"isMesh"in e&&e.material[0].opacity===1&&(e.castShadow=!0,e.receiveShadow=!0)})});const ne=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),re=await ne.arrayBuffer(),c=await l.load(re,{modelId:"medium_test",camera:d.camera.three});d.scene.three.add(c.object);await l.update(!0);class ie{constructor(e){p(this,"onItemCreated",new w);p(this,"onPropertiesUpdated",new w);p(this,"onCategoriesUpdated",new w);p(this,"elementConfig",{data:{attributesDefault:!0,relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOcurrence:{attributes:!1,relations:!1}}}});p(this,"currentElement",null);p(this,"currentMesh",null);p(this,"itemsDataById",new Map);p(this,"updatedItems",new Set);p(this,"currentRelation",null);p(this,"currentCategory",null);p(this,"currentAttributes",[]);p(this,"allCategories",[]);p(this,"_world");p(this,"updatePropertiesTable",async()=>{if(!this.currentElement)return;this.itemsDataById.clear(),this.updatedItems.clear();const e=await this.currentElement.getData(),t=this.getTableRecursively(e);this.onPropertiesUpdated.trigger([t])});this._world=e,this.setupEvents()}async init(){this.allCategories=await c.getCategories()}addEmptyAttribute(){this.currentAttributes.push({name:"",type:"",value:""})}deleteAttribute(e){const t=this.currentAttributes.indexOf(e);this.currentAttributes.splice(t,1)}updateAttribute(e,t){if(!this.currentElement)return;const i=e.LocalId,r=this.itemsDataById.get(i);if(!r)throw new Error(`Item ${i} not found`);const s=r[e.Name];s.value=t.target.value,this.updatedItems.add(i)}async applyChanges(){if(this.currentElement){for(const e of this.updatedItems){const t=this.itemsDataById.get(e);if(!t)throw new Error(`Item ${e} not found`);l.editor.setItem(c.modelId,t)}await l.editor.applyChanges(c.modelId),this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh),this.onPropertiesUpdated.trigger([]),this.itemsDataById.clear(),await l.update(!0),this.currentElement=null,this.updatePropertiesTable()}}async relate(){if(!this.currentRelation)return;const{id:e,name:t,ids:i}=this.currentRelation;await l.editor.relate(c.modelId,e,t,i),await l.editor.applyChanges(c.modelId),await this.updatePropertiesTable()}async unrelate(){if(!this.currentRelation)return;const{id:e,name:t,ids:i}=this.currentRelation;await l.editor.unrelate(c.modelId,e,t,i),await l.editor.applyChanges(c.modelId),await this.updatePropertiesTable()}async createItem(){if(!this.currentCategory)return;const e={},t=q.generateUUID();for(const i of this.currentAttributes)i.name&&i.value&&(e[i.name]={type:i.type,value:i.value});l.editor.createItem(c.modelId,{data:e,category:this.currentCategory,guid:t}),await l.editor.applyChanges(c.modelId),this.allCategories=await c.getCategories(),this.onCategoriesUpdated.trigger(),this.onItemCreated.trigger()}async deleteItem(e){this.currentElement&&(await l.editor.deleteData(c.modelId,{itemIds:[e]}),await l.editor.applyChanges(c.modelId),await this.updatePropertiesTable())}getTableRecursively(e,t){const i=e._localId.value;this.itemsDataById.set(i,e);const r={data:{Name:i,LocalId:i,Type:"related"},children:[]};t&&(t.children.push(r),r.data.ParentLocalId=t.data.LocalId,r.data.ParentName=t.data.Name);for(const s in e){const m=e[s];if(Array.isArray(m)){const b={data:{Name:s,LocalId:i,Type:"relation"},children:[]};r.children.push(b);for(const g of m)this.getTableRecursively(g,b)}else{if(m.value===void 0||m.value===null||s.startsWith("_"))continue;r.children.push({data:{Name:s,Value:m.value,LocalId:i}})}}return r}setupEvents(){const e=new H;d.renderer.three.domElement.addEventListener("dblclick",async i=>{e.x=i.clientX,e.y=i.clientY;let r;this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh);for(const[,m]of l.models.list){const b=[];b.push(m.raycast({camera:d.camera.three,mouse:e,dom:d.renderer.three.domElement}));const g=await Promise.all(b);let f=1/0;for(const h of g)h&&h.distance<f&&(f=h.distance,r=h)}if(!r)return;const[s]=await l.editor.getElements(c.modelId,[r.localId]);this.currentElement=s,this.currentElement.config=this.elementConfig,s&&(this.currentMesh=await s.getMeshes(),this.currentMesh.traverse(m=>{if(m instanceof W){const b=m.material;b.depthTest=!1,b.color.set("gold")}}),this._world.scene.three.add(this.currentMesh),this.updatePropertiesTable())}),window.addEventListener("keydown",async i=>{if(i.key==="Escape"){if(!this.currentElement)return;this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh),this.currentElement.getRequests(),this.currentAttributes=[],this.onPropertiesUpdated.trigger([]),this.itemsDataById.clear(),await l.update(!0),this.currentElement=null,this.updatePropertiesTable()}})}}const a=new ie(d);await a.init();X.init();const y=document.createElement("bim-table");y.headersHidden=!0;y.expanded=!0;y.hiddenColumns=["LocalId","Type","ParentLocalId","ParentName"];const M=new w,[R,U]=u.create(n=>{const e=u.create(()=>o`
    <div></div>
    `),t=async r=>{const s=[...e.children];for(const f of s)f.remove();const m=u.create(()=>o`
      <bim-dropdown label="Select items" multiple @change=${f=>{a.currentRelation&&(a.currentRelation.ids=f.target.value)}}>
      </bim-dropdown>
      `);if(e.appendChild(m),!r)return;const b=new RegExp(r),g=await c.getItemsOfCategories([b]);for(const f in g){const h=g[f];for(const C of h){const $=u.create(()=>o`
          <bim-option value=${C} label=${C}></bim-option>
          `);m.appendChild($)}}},i=u.create(()=>o`
        <bim-dropdown label="Select category" @change=${r=>{r.target.value[0]&&t(r.target.value[0])}}>
        ${a.allCategories.map(r=>o`
          <bim-option value=${r} label=${r}>
          </bim-option>`)}
        </bim-dropdown>
    `);return M.reset(),M.add(()=>{i.value=[],U()}),o`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
      <bim-panel-section fixed label="Add item to relation">
        ${i}
        ${e}
        <bim-button label="Apply" @click=${()=>{a.currentElement&&a.currentRelation&&a.relate().then(()=>{R.close()})}}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `},{});document.body.appendChild(R);R.addEventListener("close",()=>{M.trigger()});a.onCategoriesUpdated.add(()=>{U()});const k=new w,[A,E]=u.create(n=>{const e=u.create(()=>o`
    <div style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
    `);a.currentAttributes.length===0&&a.addEmptyAttribute();for(const t of a.currentAttributes){const i=u.create(()=>o`
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <bim-text-input placeholder="Name" value=${t.name} @input=${r=>{t.name=r.target.value}}></bim-text-input>
        <bim-text-input placeholder="Type" value=${t.type} @input=${r=>{t.type=r.target.value}}></bim-text-input>
        <bim-text-input placeholder="Value" value=${t.value} @input=${r=>{t.value=r.target.value}}></bim-text-input>
        <bim-button icon="material-symbols:delete" @click=${()=>{a.deleteAttribute(t),E()}}></bim-button>
      </div>
      `);e.appendChild(i)}return k.reset(),k.add(()=>{a.currentAttributes=[],E()}),o`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
         
      <bim-panel-section fixed label="Create new element">

      <bim-text-input label="Category" @input=${t=>{a.currentCategory=t.target.value}}></bim-text-input>
        
        ${e}
        <bim-button label="Add attribute" icon="ic:baseline-add" @click=${()=>{a.addEmptyAttribute(),E()}}></bim-button>
        <bim-button label="Apply" @click=${()=>{a.createItem()}}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `},{});document.body.appendChild(A);a.onItemCreated.add(()=>{A.close()});A.addEventListener("close",()=>{k.trigger()});a.onCategoriesUpdated.add(()=>{E()});const P=new w,[L,oe]=u.create(n=>{const e=u.create(()=>o`
    <div></div>
    `),t=u.create(()=>o`
    <bim-text-input label="Relation name" @input=${s=>{a.currentRelation&&(a.currentRelation.name=s.target.value)}}>
    </bim-text-input>
    `),i=async s=>{const m=[...e.children];for(const h of m)h.remove();const b=u.create(()=>o`
      <bim-dropdown label="Select items" multiple @change=${h=>{a.currentRelation&&(a.currentRelation.ids=h.target.value)}}>
      </bim-dropdown>
      `);if(e.appendChild(b),!s)return;const g=new RegExp(s),f=await c.getItemsOfCategories([g]);for(const h in f){const C=f[h];for(const $ of C){const B=u.create(()=>o`
          <bim-option value=${$} label=${$}></bim-option>
          `);b.appendChild(B)}}},r=u.create(()=>o`
        <bim-dropdown label="Select category" @change=${s=>{s.target.value[0]&&i(s.target.value[0])}}>
        ${a.allCategories.map(s=>o`<bim-option value=${s} label=${s}></bim-option>`)}
        </bim-dropdown>
    `);return M.reset(),P.add(()=>{r.value=[],oe()}),o`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
      <bim-panel-section fixed label="Add new relation">
        ${t}
        ${r}
        ${e}
        <bim-button label="Create relation" @click=${()=>{a.currentElement&&a.currentRelation&&(a.elementConfig.data.relations[a.currentRelation.name]={attributes:!0,relations:!0},a.relate().then(()=>{L.close()}))}}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `},{});document.body.appendChild(L);L.addEventListener("close",()=>{P.trigger()});y.dataTransform={Name:(n,e)=>!e.Name||e.Name[0]==="_"?n:e.Type==="relation"?o`
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <bim-label>${n}</bim-label>
          <bim-button icon="ic:baseline-plus" style="border: 1px solid var(--bim-ui_main-base); transform: scale(0.8);" @click=${()=>{a.currentRelation={id:e.LocalId,name:n,ids:[]},R.showModal()}}></bim-button>
        </div>
      `:e.Type==="related"?o`
        <div style="display: flex; align-items: center;">
          <bim-label>${n}</bim-label>
          ${e.ParentLocalId!==void 0?o`<bim-button icon="ic:baseline-close" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&(a.currentRelation={id:e.ParentLocalId,name:e.ParentName,ids:[e.LocalId]},a.unrelate())}}></bim-button>

                <bim-button icon="material-symbols:delete" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&a.deleteItem(e.LocalId)}}></bim-button>
              `:""}

          <bim-button icon="flowbite:paper-clip-outline" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&(a.currentRelation={id:e.LocalId,name:n,ids:[]},L.showModal())}}></bim-button>
          
        </div>
      `:n,Value:(n,e)=>!e.Name||e.Name[0]==="_"?n:typeof n=="string"?o`<bim-text-input value=${n} @input=${t=>{a.updateAttribute(e,t)}}></bim-text-input>`:typeof n=="number"?o`<bim-number-input value=${n} @change=${t=>{a.updateAttribute(e,t)}}></bim-number-input>`:o`<bim-checkbox ?checked=${n} @change=${t=>{a.updateAttribute(e,t)}}></bim-checkbox>`};const se=async()=>{await l.editor.save(c.modelId),window.setTimeout(async()=>{const n=await c.getBuffer(),e=new Uint8Array(n),t=new Blob([e]),i=URL.createObjectURL(t),r=document.createElement("a");r.href=i,r.download="exported.frag",document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(i)},1e3)},T=u.create(()=>o`
    <bim-button label="Apply changes" @click=${()=>{a.applyChanges()}}></bim-button>
  `);a.onPropertiesUpdated.add(n=>{y.data=n;const e=y.data.length>0;T.style.display=e?"block":"none"});const[x]=u.create(n=>o`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">
      <bim-panel-section label="Controls">
      <bim-button label="Save" @click=${se}></bim-button>
      <bim-button label="Create new item" @click=${()=>{A.showModal()}}></bim-button>
      ${T}
        ${y}
      </bim-panel-section>
    </bim-panel>
  `,{});document.body.append(x);const le=u.create(()=>o`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{x.classList.contains("options-menu-visible")?x.classList.remove("options-menu-visible"):x.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(le);const I=new J;I.showPanel(2);document.body.append(I.dom);I.dom.style.left="0px";I.dom.style.zIndex="unset";d.renderer.onBeforeUpdate.add(()=>I.begin());d.renderer.onAfterUpdate.add(()=>I.end());
