import{C as N,W as S,c as B,a as _,O,A as V,V as z,F as k,n as y,r as W,p as j,h as F}from"./index-BwXuLbMn.js";import{S as q}from"./stats.min-CgKsrbbR.js";import{K as H,n as u,b as o}from"./index-Bt1juVKF.js";const I=new N,K=I.get(S),X=document.getElementById("container"),d=K.create();d.scene=new B(I);d.renderer=new _(I,X);d.camera=new O(I);I.init();d.scene.three.add(new V);d.camera.three.far=1e4;d.renderer.three.shadowMap.enabled=!0;d.renderer.three.shadowMap.type=z;d.scene.setup({shadows:{cascade:1,resolution:2048}});await d.scene.updateShadows();d.camera.controls.addEventListener("rest",async()=>{await d.scene.updateShadows()});const Y=await k.getWorker(),l=new k(Y);d.camera.controls.addEventListener("control",()=>l.update());l.models.materials.list.onItemSet.add(({value:i})=>{"isLodMaterial"in i&&i.isLodMaterial||(i.polygonOffset=!0,i.polygonOffsetUnits=1,i.polygonOffsetFactor=Math.random())});l.models.list.onItemSet.add(({value:i})=>{i.tiles.onItemSet.add(({value:e})=>{"isMesh"in e&&e.material[0].opacity===1&&(e.castShadow=!0,e.receiveShadow=!0)})});const G=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),J=await G.arrayBuffer(),c=await l.load(J,{modelId:"medium_test",camera:d.camera.three});d.scene.three.add(c.object);await l.update(!0);class Q{onItemCreated=new y;onPropertiesUpdated=new y;onCategoriesUpdated=new y;elementConfig={data:{attributesDefault:!0,relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOccurrence:{attributes:!1,relations:!1}}}};currentElement=null;currentMesh=null;itemsDataById=new Map;updatedItems=new Set;currentRelation=null;currentCategory=null;currentAttributes=[];allCategories=[];_world;constructor(e){this._world=e,this.setupEvents()}async init(){this.allCategories=await c.getCategories()}addEmptyAttribute(){this.currentAttributes.push({name:"",type:"",value:""})}deleteAttribute(e){const t=this.currentAttributes.indexOf(e);this.currentAttributes.splice(t,1)}updateAttribute(e,t){if(!this.currentElement)return;const r=e.LocalId,n=this.itemsDataById.get(r);if(!n)throw new Error(`Item ${r} not found`);const s=n[e.Name];s.value=t.target.value,this.updatedItems.add(r)}updatePropertiesTable=async()=>{if(!this.currentElement)return;this.itemsDataById.clear(),this.updatedItems.clear();const e=await this.currentElement.getData(),t=this.getTableRecursively(e);this.onPropertiesUpdated.trigger([t])};async applyChanges(){if(this.currentElement){for(const e of this.updatedItems){const t=this.itemsDataById.get(e);if(!t)throw new Error(`Item ${e} not found`);l.editor.setItem(c.modelId,t)}await l.editor.applyChanges(c.modelId),this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh),this.onPropertiesUpdated.trigger([]),this.itemsDataById.clear(),await l.update(!0),this.currentElement=null,this.updatePropertiesTable()}}async relate(){if(!this.currentRelation)return;const{id:e,name:t,ids:r}=this.currentRelation;await l.editor.relate(c.modelId,e,t,r),await l.editor.applyChanges(c.modelId),await this.updatePropertiesTable()}async unrelate(){if(!this.currentRelation)return;const{id:e,name:t,ids:r}=this.currentRelation;await l.editor.unrelate(c.modelId,e,t,r),await l.editor.applyChanges(c.modelId),await this.updatePropertiesTable()}async createItem(){if(!this.currentCategory)return;const e={},t=W.generateUUID();for(const r of this.currentAttributes)r.name&&r.value&&(e[r.name]={type:r.type,value:r.value});l.editor.createItem(c.modelId,{data:e,category:this.currentCategory,guid:t}),await l.editor.applyChanges(c.modelId),this.allCategories=await c.getCategories(),this.onCategoriesUpdated.trigger(),this.onItemCreated.trigger()}async deleteItem(e){this.currentElement&&(await l.editor.deleteData(c.modelId,{itemIds:[e]}),await l.editor.applyChanges(c.modelId),await this.updatePropertiesTable())}getTableRecursively(e,t){const r=e._localId.value;this.itemsDataById.set(r,e);const n={data:{Name:r,LocalId:r,Type:"related"},children:[]};t&&(t.children.push(n),n.data.ParentLocalId=t.data.LocalId,n.data.ParentName=t.data.Name);for(const s in e){const m=e[s];if(Array.isArray(m)){const p={data:{Name:s,LocalId:r,Type:"relation"},children:[]};n.children.push(p);for(const f of m)this.getTableRecursively(f,p)}else{if(m.value===void 0||m.value===null||s.startsWith("_"))continue;n.children.push({data:{Name:s,Value:m.value,LocalId:r}})}}return n}setupEvents(){const e=new j;d.renderer.three.domElement.addEventListener("dblclick",async r=>{e.x=r.clientX,e.y=r.clientY;let n;this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh);for(const[,m]of l.models.list){const p=[];p.push(m.raycast({camera:d.camera.three,mouse:e,dom:d.renderer.three.domElement}));const f=await Promise.all(p);let h=1/0;for(const b of f)b&&b.distance<h&&(h=b.distance,n=b)}if(!n)return;const[s]=await l.editor.getElements(c.modelId,[n.localId]);this.currentElement=s,this.currentElement.config=this.elementConfig,s&&(this.currentMesh=await s.getMeshes(),this.currentMesh.traverse(m=>{if(m instanceof F){const p=m.material;p.depthTest=!1,p.color.set("gold")}}),this._world.scene.three.add(this.currentMesh),this.updatePropertiesTable())}),window.addEventListener("keydown",async r=>{if(r.key==="Escape"){if(!this.currentElement)return;this.currentElement&&this.currentMesh&&this.currentElement.disposeMeshes(this.currentMesh),this.currentElement.getRequests(),this.currentAttributes=[],this.onPropertiesUpdated.trigger([]),this.itemsDataById.clear(),await l.update(!0),this.currentElement=null,this.updatePropertiesTable()}})}}const a=new Q(d);await a.init();H.init();const g=document.createElement("bim-table");g.headersHidden=!0;g.expanded=!0;g.hiddenColumns=["LocalId","Type","ParentLocalId","ParentName"];const x=new y,[M,P]=u.create(i=>{const e=u.create(()=>o`
    <div></div>
    `),t=async n=>{const s=[...e.children];for(const h of s)h.remove();const m=u.create(()=>o`
      <bim-dropdown label="Select items" multiple @change=${h=>{a.currentRelation&&(a.currentRelation.ids=h.target.value)}}>
      </bim-dropdown>
      `);if(e.appendChild(m),!n)return;const p=new RegExp(n),f=await c.getItemsOfCategories([p]);for(const h in f){const b=f[h];for(const v of b){const C=u.create(()=>o`
          <bim-option value=${v} label=${v}></bim-option>
          `);m.appendChild(C)}}},r=u.create(()=>o`
        <bim-dropdown label="Select category" @change=${n=>{n.target.value[0]&&t(n.target.value[0])}}>
        ${a.allCategories.map(n=>o`
          <bim-option value=${n} label=${n}>
          </bim-option>`)}
        </bim-dropdown>
    `);return x.reset(),x.add(()=>{r.value=[],P()}),o`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
      <bim-panel-section fixed label="Add item to relation">
        ${r}
        ${e}
        <bim-button label="Apply" @click=${()=>{a.currentElement&&a.currentRelation&&a.relate().then(()=>{M.close()})}}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `},{});document.body.appendChild(M);M.addEventListener("close",()=>{x.trigger()});a.onCategoriesUpdated.add(()=>{P()});const L=new y,[A,$]=u.create(i=>{const e=u.create(()=>o`
    <div style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
    `);a.currentAttributes.length===0&&a.addEmptyAttribute();for(const t of a.currentAttributes){const r=u.create(()=>o`
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <bim-text-input placeholder="Name" value=${t.name} @input=${n=>{t.name=n.target.value}}></bim-text-input>
        <bim-text-input placeholder="Type" value=${t.type} @input=${n=>{t.type=n.target.value}}></bim-text-input>
        <bim-text-input placeholder="Value" value=${t.value} @input=${n=>{t.value=n.target.value}}></bim-text-input>
        <bim-button icon="material-symbols:delete" @click=${()=>{a.deleteAttribute(t),$()}}></bim-button>
      </div>
      `);e.appendChild(r)}return L.reset(),L.add(()=>{a.currentAttributes=[],$()}),o`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
         
      <bim-panel-section fixed label="Create new element">

      <bim-text-input label="Category" @input=${t=>{a.currentCategory=t.target.value}}></bim-text-input>
        
        ${e}
        <bim-button label="Add attribute" icon="ic:baseline-add" @click=${()=>{a.addEmptyAttribute(),$()}}></bim-button>
        <bim-button label="Apply" @click=${()=>{a.createItem()}}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `},{});document.body.appendChild(A);a.onItemCreated.add(()=>{A.close()});A.addEventListener("close",()=>{L.trigger()});a.onCategoriesUpdated.add(()=>{$()});const U=new y,[R,Z]=u.create(i=>{const e=u.create(()=>o`
    <div></div>
    `),t=u.create(()=>o`
    <bim-text-input label="Relation name" @input=${s=>{a.currentRelation&&(a.currentRelation.name=s.target.value)}}>
    </bim-text-input>
    `),r=async s=>{const m=[...e.children];for(const b of m)b.remove();const p=u.create(()=>o`
      <bim-dropdown label="Select items" multiple @change=${b=>{a.currentRelation&&(a.currentRelation.ids=b.target.value)}}>
      </bim-dropdown>
      `);if(e.appendChild(p),!s)return;const f=new RegExp(s),h=await c.getItemsOfCategories([f]);for(const b in h){const v=h[b];for(const C of v){const D=u.create(()=>o`
          <bim-option value=${C} label=${C}></bim-option>
          `);p.appendChild(D)}}},n=u.create(()=>o`
        <bim-dropdown label="Select category" @change=${s=>{s.target.value[0]&&r(s.target.value[0])}}>
        ${a.allCategories.map(s=>o`<bim-option value=${s} label=${s}></bim-option>`)}
        </bim-dropdown>
    `);return x.reset(),U.add(()=>{n.value=[],Z()}),o`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
      <bim-panel-section fixed label="Add new relation">
        ${t}
        ${n}
        ${e}
        <bim-button label="Create relation" @click=${()=>{a.currentElement&&a.currentRelation&&(a.elementConfig.data.relations[a.currentRelation.name]={attributes:!0,relations:!0},a.relate().then(()=>{R.close()}))}}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `},{});document.body.appendChild(R);R.addEventListener("close",()=>{U.trigger()});g.dataTransform={Name:(i,e)=>!e.Name||e.Name[0]==="_"?i:e.Type==="relation"?o`
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <bim-label>${i}</bim-label>
          <bim-button icon="ic:baseline-plus" style="border: 1px solid var(--bim-ui_main-base); transform: scale(0.8);" @click=${()=>{a.currentRelation={id:e.LocalId,name:i,ids:[]},M.showModal()}}></bim-button>
        </div>
      `:e.Type==="related"?o`
        <div style="display: flex; align-items: center;">
          <bim-label>${i}</bim-label>
          ${e.ParentLocalId!==void 0?o`<bim-button icon="ic:baseline-close" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&(a.currentRelation={id:e.ParentLocalId,name:e.ParentName,ids:[e.LocalId]},a.unrelate())}}></bim-button>

                <bim-button icon="material-symbols:delete" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&a.deleteItem(e.LocalId)}}></bim-button>
              `:""}

          <bim-button icon="flowbite:paper-clip-outline" style="transform: scale(0.8);" @click=${()=>{a.currentElement&&(a.currentRelation={id:e.LocalId,name:i,ids:[]},R.showModal())}}></bim-button>
          
        </div>
      `:i,Value:(i,e)=>!e.Name||e.Name[0]==="_"?i:typeof i=="string"?o`<bim-text-input value=${i} @input=${t=>{a.updateAttribute(e,t)}}></bim-text-input>`:typeof i=="number"?o`<bim-number-input value=${i} @change=${t=>{a.updateAttribute(e,t)}}></bim-number-input>`:o`<bim-checkbox ?checked=${i} @change=${t=>{a.updateAttribute(e,t)}}></bim-checkbox>`};const ee=async()=>{await l.editor.save(c.modelId),window.setTimeout(async()=>{const i=await c.getBuffer(),e=new Uint8Array(i),t=new Blob([e]),r=URL.createObjectURL(t),n=document.createElement("a");n.href=r,n.download="exported.frag",document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(r)},1e3)},T=u.create(()=>o`
    <bim-button label="Apply changes" @click=${()=>{a.applyChanges()}}></bim-button>
  `);a.onPropertiesUpdated.add(i=>{g.data=i;const e=g.data.length>0;T.style.display=e?"block":"none"});const[E]=u.create(i=>o`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">
      <bim-panel-section label="Controls">
      <bim-button label="Save" @click=${ee}></bim-button>
      <bim-button label="Create new item" @click=${()=>{A.showModal()}}></bim-button>
      ${T}
        ${g}
      </bim-panel-section>
    </bim-panel>
  `,{});document.body.append(E);const te=u.create(()=>o`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{E.classList.contains("options-menu-visible")?E.classList.remove("options-menu-visible"):E.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(te);const w=new q;w.showPanel(2);document.body.append(w.dom);w.dom.style.left="0px";w.dom.style.zIndex="unset";d.renderer.onBeforeUpdate.add(()=>w.begin());d.renderer.onAfterUpdate.add(()=>w.end());
