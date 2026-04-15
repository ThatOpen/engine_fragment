var q=Object.defineProperty;var k=(n,e,t)=>e in n?q(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var h=(n,e,t)=>(k(n,typeof e!="symbol"?e+"":e,t),t);import{C as R,W as U,fs as G,a as P,ft as z,fv as B,fu as V,fK as A,fX as E,fY as S,fJ as $,fZ as F,fL as H,f_ as O}from"./virtual-memory-controller-Csr3h_Gq.js";import{S as W}from"./stats.min-Cj8wREqt.js";import{a as j,R as p,m as c}from"./index-CWj6LyOo.js";import{F as D}from"./index-SYjZb1lV.js";const _=new R,N=_.get(U),X=document.getElementById("container"),a=N.create();a.scene=new G(_);a.renderer=new P(_,X);a.camera=new z(_);_.init();a.scene.three.add(new B);a.camera.three.far=1e4;a.renderer.three.shadowMap.enabled=!0;a.renderer.three.shadowMap.type=V;a.scene.setup({shadows:{cascade:1,resolution:2048}});await a.scene.updateShadows();a.camera.controls.addEventListener("rest",async()=>{await a.scene.updateShadows()});const Y="https://thatopen.github.io/engine_fragment/resources/worker.mjs",J=await fetch(Y),K=await J.blob(),Z=new File([K],"worker.mjs",{type:"text/javascript"}),Q=URL.createObjectURL(Z),d=new D(Q);a.camera.controls.addEventListener("control",()=>d.update());d.models.materials.list.onItemSet.add(({value:n})=>{"isLodMaterial"in n&&n.isLodMaterial||(n.polygonOffset=!0,n.polygonOffsetUnits=1,n.polygonOffsetFactor=Math.random())});d.models.list.onItemSet.add(({value:n})=>{n.useCamera(a.camera.three),a.scene.three.add(n.object),n.tiles.onItemSet.add(({value:e})=>{"isMesh"in e&&e.material[0].opacity===1&&(e.castShadow=!0,e.receiveShadow=!0)})});const ee=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),te=await ee.arrayBuffer(),u=await d.load(te,{modelId:"medium_test",camera:a.camera.three});a.scene.three.add(u.object);await d.update(!0);class se{constructor(e){h(this,"onUpdated",new E);h(this,"sampleMaterialsUpdated",new E);h(this,"_world");h(this,"_element",null);h(this,"_mesh",null);h(this,"_gControls");h(this,"_lControls",[]);h(this,"_controlType","global");h(this,"_materials",null);h(this,"_localTransformsIds",[]);h(this,"_geometriesIds",[]);this._world=e,this._gControls=new S(e.camera.three,e.renderer.three.domElement),this.setupEvents()}get materials(){if(!this._materials)throw new Error("Editor not initialized");return this._materials}get localTransformsIds(){if(!this._localTransformsIds.length)throw new Error("Editor not initialized");return this._localTransformsIds}get geometriesIds(){if(!this._geometriesIds.length)throw new Error("Editor not initialized");return this._geometriesIds}get samples(){if(!this._element)throw new Error("No element selected");return this._element.core.samples}get elementSelected(){return this._element!==null}async init(){this._materials=await u.getMaterials();const e=await u.getLocalTransformsIds(),t=await u.getRepresentationsIds();this._localTransformsIds=[e[0],e[1]],this._geometriesIds=[t[0],t[1]]}get3dMaterials(){if(!this._mesh)return[];const e=new Map;return this._mesh.traverse(t=>{t instanceof $&&e.set(t.material.userData.localId,t.material)}),Array.from(e.values())}async setSampleMaterial(e,t){this._element&&(this._element.core.samples[e].material=t,await this.updateSamples(),this.sampleMaterialsUpdated.trigger())}async updateMaterials(){this._materials&&(this._materials=await u.getMaterials())}overrideGeometryWithCube(){this._mesh&&this._mesh.traverse(e=>{if(e instanceof $){const t=e.geometry,s=new F(1,1,1);t.setAttribute("position",s.attributes.position),t.setIndex(s.index),t.setAttribute("normal",s.attributes.normal)}})}async applyChanges(){if(!this._element||!this._mesh)return;await this._element.setMeshes(this._mesh),this.dispose();const e=this._element.getRequests();e&&await d.editor.edit(u.modelId,e),this._element.elementChanged||await this.setVisible(!0),await d.update(!0),this._element=null,this._mesh=null,this.onUpdated.trigger()}setControlsMode(e){this._gControls.setMode(e);for(const t of this._lControls)t.setMode(e)}setControlsTarget(e=this._controlType){const t=this._gControls.getHelper();if(e==="global"){this._world.scene.three.add(t),this._gControls.enabled=!0;for(const s of this._lControls)s.getHelper().removeFromParent(),s.enabled=!1}else{t.removeFromParent(),this._gControls.enabled=!1;for(const s of this._lControls){const r=s.getHelper();this._world.scene.three.add(r),s.enabled=!0}}this._controlType=e}async updateSamples(){if(!this._element||!this._mesh)return;const e=this._mesh.matrixWorld.clone();await this._element.updateSamples(),this.dispose(),this._mesh=await this._element.getMeshes(),this._world.scene.three.add(this._mesh),await this.createControls(),this._mesh.position.set(0,0,0),this._mesh.rotation.set(0,0,0),this._mesh.applyMatrix4(e)}async createControls(){if(this._mesh){this._gControls.attach(this._mesh);for(const e of this._mesh.children){const t=new S(a.camera.three,a.renderer.three.domElement);t.attach(e),t.setMode(this._gControls.mode),this._lControls.push(t),t.addEventListener("dragging-changed",s=>{a.camera.hasCameraControls()&&(a.camera.controls.enabled=!s.value)})}this.setControlsTarget()}}dispose(){if(this._mesh&&this._element&&this._element.disposeMeshes(this._mesh),this._gControls.getHelper().removeFromParent(),this._gControls.detach(),!(!this._mesh||!this._element)){for(const t of this._lControls)t.detach(),t.dispose();this._lControls.length=0}}async setVisible(e){if(!this._element)return;const t=[];for(const[,s]of d.models.list){if(s.deltaModelId&&e===!0){const r=new Set(await s.getEditedElements());if(e&&r.has(this._element.localId))continue}t.push(s.setVisible([this._element.localId],e))}await Promise.all(t)}setupEvents(){this._gControls.addEventListener("dragging-changed",s=>{this._world.camera.hasCameraControls()&&(this._world.camera.controls.enabled=!s.value)});const e=new H;this._world.renderer.three.domElement.addEventListener("dblclick",async s=>{e.x=s.clientX,e.y=s.clientY;let r;for(const[,b]of d.models.list){const g=[];g.push(b.raycast({camera:a.camera.three,mouse:e,dom:a.renderer.three.domElement}));const o=await Promise.all(g);let m=1/0;for(const w of o)w&&w.distance<m&&(m=w.distance,r=w)}if(!r)return;this._element&&await this.setVisible(!0);const[i]=await d.editor.getElements(u.modelId,[r.localId]);this._element=i,i&&(this._mesh&&this.dispose(),await this.setVisible(!1),this._mesh=await i.getMeshes(),this._world.scene.three.add(this._mesh),await this.createControls(),await d.update(!0),this.onUpdated.trigger())}),window.addEventListener("keydown",async s=>{if(s.key==="Escape"){if(!this._element||!this._mesh)return;this._element.getRequests(),this.dispose(),this.setVisible(!0),await d.update(!0),this._element=null,this._mesh=null,this.onUpdated.trigger()}})}}const l=new se(a);await l.init();j.init();const[oe,ae]=p.create(n=>{const e=new A,t=[];if(l.elementSelected){const s=l.samples;for(const r in s){const i=s[r],b=p.create(()=>c`
             <bim-dropdown label="Material" @change=${async o=>{if(!o.target.value[0])return;const m=parseInt(r,10);await l.setSampleMaterial(m,o.target.value[0])}}>
            </bim-dropdown>
        `);l.updateMaterials().then(()=>{for(const[o,m]of l.materials){const{r:w,g:y,b:M}=m;e.setRGB(w/255,y/255,M/255);const x=`#${e.getHexString()}`,L=p.create(()=>c`<bim-option icon="icon-park-outline:material" label=${o} ?checked=${i.material===o}>
            <div style="width: 1rem; height: 1rem; background-color: ${x}"></div>
          </bim-option>`);b.appendChild(L)}});const g=p.create(()=>c`
          <div style="display: flex; gap: 0.5rem; flex-direction: column;">

            <div style="display: flex; gap: 0.5rem;">
              <bim-label icon="f7:cube" style="font-weight: bold;">Sample ${r}</bim-label>
            </div>

            ${b}

            <bim-dropdown label="Local Transform" @change=${async o=>{if(!o.target.value[0])return;const m=s[r];m&&(m.localTransform=o.target.value[0],await l.updateSamples())}}>

              ${[...new Set([...l.localTransformsIds,i.localTransform])].map(o=>c`<bim-option icon="iconoir:axes" label=${o} ?checked=${i.localTransform===o}>
                </bim-option>`)}
            </bim-dropdown>

            <bim-dropdown label="Geometry" @change=${async o=>{if(!o.target.value[0])return;const m=s[r];m&&(m.representation=o.target.value[0],await l.updateSamples())}}>

              ${[...new Set([...l.geometriesIds,i.representation])].map(o=>c`<bim-option icon="fluent:select-object-24-filled" label=${o} ?checked=${i.representation===o}>
                </bim-option>`)}
            </bim-dropdown>
          </div>
          `);t.push(g)}}return c`<bim-panel-section label="Samples">
  ${t.map(s=>s)}
  </bim-panel-section>`},{}),[ne,T]=p.create(n=>{const e=l.get3dMaterials();return c`
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${e.map(t=>c`

          <div style="display: flex; gap: 0.5rem;">
          <bim-color-input color=#${t.color.getHexString()} label=${t.userData.localId} @input=${s=>{t.color.set(s.target.color)}}>
          </bim-color-input>

          <bim-number-input slider min=0 max=1 step=0.01 value=${t.opacity} @change=${s=>{t.opacity=s.target.value}}></bim-number-input>

          </div>`)}
        </div>
  `},{});l.sampleMaterialsUpdated.add(T);const I=document.getElementById("history-menu");let v=null;const re=async()=>{const{requests:n,undoneRequests:e}=await d.editor.getModelRequests(u.modelId),t=[...n,...e],s=[...I.children];for(const i of s)I.removeChild(i),i.remove();let r=null;for(let i=0;i<t.length;i++){const b=t[i],g=i<t.length-1,o=p.create(()=>c`
        <bim-button icon="solar:arrow-right-bold"></bim-button>
      `);(v===i||v===null&&!g)&&(o.classList.add("selected-request"),r=o);const y=i;o.addEventListener("click",async()=>{r&&r.classList.remove("selected-request"),r=o,o.classList.add("selected-request"),await d.editor.selectRequest(u.modelId,y),await u.setVisible(void 0,!0),v=y,await d.editor.edit(u.modelId,[],{removeRedo:!1}),await d.update(!0)});const M=p.create(()=>c`
      <div class="history-request">
        ${g?c`<div class="history-line"></div>`:""}
        ${o}
        <div>
          <bim-label class="history-request-title">${O[b.type]}</bim-label>
          <bim-label class="history-request-subtitle">ID: ${b.localId}</bim-label>
        </div>
      </div>
      `);I.appendChild(M)}v=null};d.editor.onEdit.add(re);const[C,ie]=p.create(n=>{const e=c`<bim-button label="Change geometry" @click=${()=>{l.overrideGeometryWithCube()}}></bim-button>`;return ae(),T(),c`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">
      <bim-panel-section label="Controls">
        <bim-button data-name="arq" label="Apply changes" @click=${()=>l.applyChanges()}></bim-button>
        <bim-dropdown required label="Tranform Mode" 
            @change="${({target:t})=>{const s=t.value[0];l.setControlsMode(s)}}">
          <bim-option checked  label="translate"></bim-option>
          <bim-option label="rotate"></bim-option>
        </bim-dropdown>
        <bim-dropdown required label="Transform Target" 
            @change="${({target:t})=>{const s=t.value[0];l.setControlsTarget(s)}}">
          <bim-option checked  label="global"></bim-option>
          <bim-option label="local"></bim-option>
        </bim-dropdown>
        ${e}
        ${ne}
      </bim-panel-section>
      ${oe}
    </bim-panel>
  `},{});l.onUpdated.add(()=>{ie()});document.body.append(C);const le=p.create(()=>c`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{C.classList.contains("options-menu-visible")?C.classList.remove("options-menu-visible"):C.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(le);window.dispatchEvent(new Event("resize"));const f=new W;f.showPanel(2);document.body.append(f.dom);f.dom.style.right="0px";f.dom.style.bottom="0px";f.dom.style.left="unset";f.dom.style.top="unset";f.dom.style.zIndex="unset";a.renderer.onBeforeUpdate.add(()=>f.begin());a.renderer.onAfterUpdate.add(()=>f.end());
