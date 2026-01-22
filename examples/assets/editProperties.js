var N=Object.defineProperty;var B=(i,e,t)=>e in i?N(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var p=(i,e,t)=>(B(i,typeof e!="symbol"?e+"":e,t),t);import{C as S,W as _,fq as O,a as V,fr as j,ft as z,fs as q,fV as w,fo as F,fJ as H,fH as W}from"./virtual-memory-controller-BZ3qkwUg.js";import{S as J}from"./stats.min-Cj8wREqt.js";import{a as X,R as u,m as o}from"./index-CWj6LyOo.js";import{F as Y}from"./index-D7PcC6sb.js";const v=new S,G=v.get(_),K=document.getElementById("container"),l=G.create();l.scene=new O(v);l.renderer=new V(v,K);l.camera=new j(v);v.init();l.scene.three.add(new z);l.camera.three.far=1e4;l.renderer.three.shadowMap.enabled=!0;l.renderer.three.shadowMap.type=q;l.scene.setup({shadows:{cascade:1,resolution:1024}});await l.scene.updateShadows();l.camera.controls.addEventListener("rest",async()=>{await l.scene.updateShadows()});const Q="https://thatopen.github.io/engine_fragment/resources/worker.mjs",d=new Y(Q);l.camera.controls.addEventListener("control",()=>d.update());d.models.list.onItemSet.add(({value:i})=>{i.tiles.onItemSet.add(({value:e})=>{"isMesh"in e&&e.material[0].opacity===1&&(e.castShadow=!0,e.receiveShadow=!0)})});const Z=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),ee=await Z.arrayBuffer(),c=await d.load(ee,{modelId:"medium_test",camera:l.camera.three});l.scene.three.add(c.object);await d.update(!0);class te{constructor(e){p(this,"onItemCreated",new w);p(this,"onPropertiesUpdated",new w);p(this,"onCategoriesUpdated",new w);p(this,"elementConfig",{data:{attributesDefault:!0,relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOcurrence:{attributes:!1,relations:!1}}}});p(this,"currentElement",null);p(this,"currentMesh",null);p(this,"itemsDataById",new Map);p(this,"updatedItems",new Set);p(this,"currentRelation",null);p(this,"currentCategory",null);p(this,"currentAttributes",[]);p(this,"allCategories",[]);p(this,"_world");p(this,"updatePropertiesTable",async()=>{if(!this.currentElement)return;this.itemsDataById.clear(),this.updatedItems.clear();const e=await this.currentElement.getData(),t=this.getTableRecursively(e);this.onPropertiesUpdated.trigger([t])});this._world=e,this.setupEvents()}async init(){this.allCategories=await c.getCategories()}addEmptyAttribute(){this.currentAttributes.push({name:"",type:"",value:""})}deleteAttribute(e){const t=this.currentAttributes.indexOf(e);this.currentAttributes.splice(t,1)}updateAttribute(e,t){if(!this.currentElement)return;const r=e.LocalId,n=this.itemsDataById.get(r);if(!n)throw new Error(`Item ${r} not found`);const s=n[e.Name];s.value=t.target.value,this.updatedItems.add(r)}async applyChanges(){if(this.currentElement){for(const e of this.updatedItems){const t=this.itemsDataById.get(e);if(!t)throw new Error(`Item ${e} not found`);d.editor.setItem(c.modelId,t)}await d.editor.applyChanges(c.modelId),this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh),this.onPropertiesUpdated.trigger([]),this.itemsDataById.clear(),await d.update(!0),this.currentElement=null,this.updatePropertiesTable()}}async relate(){if(!this.currentRelation)return;const{id:e,name:t,ids:r}=this.currentRelation;await d.editor.relate(c.modelId,e,t,r),await d.editor.applyChanges(c.modelId),await this.updatePropertiesTable()}async unrelate(){if(!this.currentRelation)return;const{id:e,name:t,ids:r}=this.currentRelation;await d.editor.unrelate(c.modelId,e,t,r),await d.editor.applyChanges(c.modelId),await this.updatePropertiesTable()}async createItem(){if(!this.currentCategory)return;const e={},t=F.generateUUID();for(const r of this.currentAttributes)r.name&&r.value&&(e[r.name]={type:r.type,value:r.value});d.editor.createItem(c.modelId,{data:e,category:this.currentCategory,guid:t}),await d.editor.applyChanges(c.modelId),this.allCategories=await c.getCategories(),this.onCategoriesUpdated.trigger(),this.onItemCreated.trigger()}async deleteItem(e){this.currentElement&&(await d.editor.deleteData(c.modelId,{itemIds:[e]}),await d.editor.applyChanges(c.modelId),await this.updatePropertiesTable())}getTableRecursively(e,t){const r=e._localId.value;this.itemsDataById.set(r,e);const n={data:{Name:r,LocalId:r,Type:"related"},children:[]};t&&(t.children.push(n),n.data.ParentLocalId=t.data.LocalId,n.data.ParentName=t.data.Name);for(const s in e){const m=e[s];if(Array.isArray(m)){const b={data:{Name:s,LocalId:r,Type:"relation"},children:[]};n.children.push(b);for(const g of m)this.getTableRecursively(g,b)}else{if(m.value===void 0||m.value===null||s.startsWith("_"))continue;n.children.push({data:{Name:s,Value:m.value,LocalId:r}})}}return n}setupEvents(){const e=new H;l.renderer.three.domElement.addEventListener("dblclick",async r=>{e.x=r.clientX,e.y=r.clientY;let n;this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh);for(const[,m]of d.models.list){const b=[];b.push(m.raycast({camera:l.camera.three,mouse:e,dom:l.renderer.three.domElement}));const g=await Promise.all(b);let f=1/0;for(const h of g)h&&h.distance<f&&(f=h.distance,n=h)}if(!n)return;const[s]=await d.editor.getElements(c.modelId,[n.localId]);this.currentElement=s,this.currentElement.config=this.elementConfig,s&&(this.currentMesh=await s.getMeshes(),this.currentMesh.traverse(m=>{if(m instanceof W){const b=m.material;b.depthTest=!1,b.color.set("gold")}}),this._world.scene.three.add(this.currentMesh),this.updatePropertiesTable())}),window.addEventListener("keydown",async r=>{if(r.key==="Escape"){if(!this.currentElement)return;this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh),this.currentElement.getRequests(),this.currentAttributes=[],this.onPropertiesUpdated.trigger([]),this.itemsDataById.clear(),await d.update(!0),this.currentElement=null,this.updatePropertiesTable()}})}}const a=new te(l);await a.init();X.init();const y=document.createElement("bim-table");y.headersHidden=!0;y.expanded=!0;y.hiddenColumns=["LocalId","Type","ParentLocalId","ParentName"];const M=new w,[R,P]=u.create(i=>{const e=u.create(()=>o`
    <div></div>
    `),t=async n=>{const s=[...e.children];for(const f of s)f.remove();const m=u.create(()=>o`
      <bim-dropdown label="Select items" multiple @change=${f=>{a.currentRelation&&(a.currentRelation.ids=f.target.value)}}>
      </bim-dropdown>
      `);if(e.appendChild(m),!n)return;const b=new RegExp(n),g=await c.getItemsOfCategories([b]);for(const f in g){const h=g[f];for(const C of h){const $=u.create(()=>o`
          <bim-option value=${C} label=${C}></bim-option>
          `);m.appendChild($)}}},r=u.create(()=>o`
        <bim-dropdown label="Select category" @change=${n=>{n.target.value[0]&&t(n.target.value[0])}}>
        ${a.allCategories.map(n=>o`
          <bim-option value=${n} label=${n}>
          </bim-option>`)}
        </bim-dropdown>
    `);return M.reset(),M.add(()=>{r.value=[],P()}),o`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
      <bim-panel-section fixed label="Add item to relation">
        ${r}
        ${e}
        <bim-button label="Apply" @click=${()=>{a.currentElement&&a.currentRelation&&a.relate().then(()=>{R.close()})}}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `},{});document.body.appendChild(R);R.addEventListener("close",()=>{M.trigger()});a.onCategoriesUpdated.add(()=>{P()});const k=new w,[A,E]=u.create(i=>{const e=u.create(()=>o`
    <div style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
    `);a.currentAttributes.length===0&&a.addEmptyAttribute();for(const t of a.currentAttributes){const r=u.create(()=>o`
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <bim-text-input placeholder="Name" value=${t.name} @input=${n=>{t.name=n.target.value}}></bim-text-input>
        <bim-text-input placeholder="Type" value=${t.type} @input=${n=>{t.type=n.target.value}}></bim-text-input>
        <bim-text-input placeholder="Value" value=${t.value} @input=${n=>{t.value=n.target.value}}></bim-text-input>
        <bim-button icon="material-symbols:delete" @click=${()=>{a.deleteAttribute(t),E()}}></bim-button>
      </div>
      `);e.appendChild(r)}return k.reset(),k.add(()=>{a.currentAttributes=[],E()}),o`
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
  `},{});document.body.appendChild(A);a.onItemCreated.add(()=>{A.close()});A.addEventListener("close",()=>{k.trigger()});a.onCategoriesUpdated.add(()=>{E()});const T=new w,[L,ae]=u.create(i=>{const e=u.create(()=>o`
    <div></div>
    `),t=u.create(()=>o`
    <bim-text-input label="Relation name" @input=${s=>{a.currentRelation&&(a.currentRelation.name=s.target.value)}}>
    </bim-text-input>
    `),r=async s=>{const m=[...e.children];for(const h of m)h.remove();const b=u.create(()=>o`
      <bim-dropdown label="Select items" multiple @change=${h=>{a.currentRelation&&(a.currentRelation.ids=h.target.value)}}>
      </bim-dropdown>
      `);if(e.appendChild(b),!s)return;const g=new RegExp(s),f=await c.getItemsOfCategories([g]);for(const h in f){const C=f[h];for(const $ of C){const D=u.create(()=>o`
          <bim-option value=${$} label=${$}></bim-option>
          `);b.appendChild(D)}}},n=u.create(()=>o`
        <bim-dropdown label="Select category" @change=${s=>{s.target.value[0]&&r(s.target.value[0])}}>
        ${a.allCategories.map(s=>o`<bim-option value=${s} label=${s}></bim-option>`)}
        </bim-dropdown>
    `);return M.reset(),T.add(()=>{n.value=[],ae()}),o`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
      <bim-panel-section fixed label="Add new relation">
        ${t}
        ${n}
        ${e}
        <bim-button label="Create relation" @click=${()=>{a.currentElement&&a.currentRelation&&(a.elementConfig.data.relations[a.currentRelation.name]={attributes:!0,relations:!0},a.relate().then(()=>{L.close()}))}}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `},{});document.body.appendChild(L);L.addEventListener("close",()=>{T.trigger()});y.dataTransform={Name:(i,e)=>!e.Name||e.Name[0]==="_"?i:e.Type==="relation"?o`
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <bim-label>${i}</bim-label>
          <bim-button icon="ic:baseline-plus" style="border: 1px solid var(--bim-ui_main-base); transform: scale(0.8);" @click=${()=>{a.currentRelation={id:e.LocalId,name:i,ids:[]},R.showModal()}}></bim-button>
        </div>
      `:e.Type==="related"?o`
        <div style="display: flex; align-items: center;">
          <bim-label>${i}</bim-label>
          ${e.ParentLocalId!==void 0?o`<bim-button icon="ic:baseline-close" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&(a.currentRelation={id:e.ParentLocalId,name:e.ParentName,ids:[e.LocalId]},a.unrelate())}}></bim-button>

                <bim-button icon="material-symbols:delete" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&a.deleteItem(e.LocalId)}}></bim-button>
              `:""}

          <bim-button icon="flowbite:paper-clip-outline" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&(a.currentRelation={id:e.LocalId,name:i,ids:[]},L.showModal())}}></bim-button>
          
        </div>
      `:i,Value:(i,e)=>!e.Name||e.Name[0]==="_"?i:typeof i=="string"?o`<bim-text-input value=${i} @input=${t=>{a.updateAttribute(e,t)}}></bim-text-input>`:typeof i=="number"?o`<bim-number-input value=${i} @change=${t=>{a.updateAttribute(e,t)}}></bim-number-input>`:o`<bim-checkbox ?checked=${i} @change=${t=>{a.updateAttribute(e,t)}}></bim-checkbox>`};const ne=async()=>{await d.editor.save(c.modelId),window.setTimeout(async()=>{const i=await c.getBuffer(),e=new Uint8Array(i),t=new Blob([e]),r=URL.createObjectURL(t),n=document.createElement("a");n.href=r,n.download="exported.frag",document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(r)},1e3)},U=u.create(()=>o`
    <bim-button label="Apply changes" @click=${()=>{a.applyChanges()}}></bim-button>
  `);a.onPropertiesUpdated.add(i=>{y.data=i;const e=y.data.length>0;U.style.display=e?"block":"none"});const[x]=u.create(i=>o`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">
      <bim-panel-section label="Controls">
      <bim-button label="Save" @click=${ne}></bim-button>
      <bim-button label="Create new item" @click=${()=>{A.showModal()}}></bim-button>
      ${U}
        ${y}
      </bim-panel-section>
    </bim-panel>
  `,{});document.body.append(x);const re=u.create(()=>o`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{x.classList.contains("options-menu-visible")?x.classList.remove("options-menu-visible"):x.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(re);const I=new J;I.showPanel(2);document.body.append(I.dom);I.dom.style.left="0px";I.dom.style.zIndex="unset";l.renderer.onBeforeUpdate.add(()=>I.begin());l.renderer.onAfterUpdate.add(()=>I.end());
