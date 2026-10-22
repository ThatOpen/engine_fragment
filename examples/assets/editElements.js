import{C as L,W as k,c as G,a as P,O as R,A as U,V as z,F as $,i as V,n as I,T as E,h as S,o as A,p as B,q as H}from"./index-CCztv3eI.js";import{S as F}from"./stats.min-CgKsrbbR.js";import{K as W,n as u,b as c}from"./index-CKQNNdoX.js";const w=new L,O=w.get(k),D=document.getElementById("container"),a=O.create();a.scene=new G(w);a.renderer=new P(w,D);a.camera=new R(w);w.init();a.scene.three.add(new U);a.camera.three.far=1e4;a.renderer.three.shadowMap.enabled=!0;a.renderer.three.shadowMap.type=z;a.scene.setup({shadows:{cascade:1,resolution:2048}});await a.scene.updateShadows();a.camera.controls.addEventListener("rest",async()=>{await a.scene.updateShadows()});const N=await $.getWorker(),l=new $(N);a.camera.controls.addEventListener("control",()=>l.update());l.models.materials.list.onItemSet.add(({value:d})=>{"isLodMaterial"in d&&d.isLodMaterial||(d.polygonOffset=!0,d.polygonOffsetUnits=1,d.polygonOffsetFactor=Math.random())});l.models.list.onItemSet.add(({value:d})=>{d.useCamera(a.camera.three),a.scene.three.add(d.object),d.tiles.onItemSet.add(({value:e})=>{"isMesh"in e&&e.material[0].opacity===1&&(e.castShadow=!0,e.receiveShadow=!0)})});const K=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),X=await K.arrayBuffer(),h=await l.load(X,{modelId:"medium_test",camera:a.camera.three});a.scene.three.add(h.object);await l.update(!0);class Y{onUpdated=new I;sampleMaterialsUpdated=new I;_world;_element=null;_mesh=null;_gControls;_lControls=[];_controlType="global";_materials=null;_localTransformsIds=[];_geometriesIds=[];get materials(){if(!this._materials)throw new Error("Editor not initialized");return this._materials}get localTransformsIds(){if(!this._localTransformsIds.length)throw new Error("Editor not initialized");return this._localTransformsIds}get geometriesIds(){if(!this._geometriesIds.length)throw new Error("Editor not initialized");return this._geometriesIds}get samples(){if(!this._element)throw new Error("No element selected");return this._element.core.samples}get elementSelected(){return this._element!==null}constructor(e){this._world=e,this._gControls=new E(e.camera.three,e.renderer.three.domElement),this.setupEvents()}async init(){this._materials=await h.getMaterials();const e=await h.getLocalTransformsIds(),t=await h.getRepresentationsIds();this._localTransformsIds=[e[0],e[1]],this._geometriesIds=[t[0],t[1]]}get3dMaterials(){if(!this._mesh)return[];const e=new Map;return this._mesh.traverse(t=>{t instanceof S&&e.set(t.material.userData.localId,t.material)}),Array.from(e.values())}async setSampleMaterial(e,t){this._element&&(this._element.core.samples[e].material=t,await this.updateSamples(),this.sampleMaterialsUpdated.trigger())}async updateMaterials(){this._materials&&(this._materials=await h.getMaterials())}overrideGeometryWithCube(){this._mesh&&this._mesh.traverse(e=>{if(e instanceof S){const t=e.geometry,s=new A(1,1,1);t.setAttribute("position",s.attributes.position),t.setIndex(s.index),t.setAttribute("normal",s.attributes.normal)}})}async applyChanges(){if(!this._element||!this._mesh)return;await this._element.setMeshes(this._mesh),this.dispose();const e=this._element.getRequests();e&&await l.editor.edit(h.modelId,e),this._element.elementChanged||await this.setVisible(!0),await l.update(!0),this._element=null,this._mesh=null,this.onUpdated.trigger()}setControlsMode(e){this._gControls.setMode(e);for(const t of this._lControls)t.setMode(e)}setControlsTarget(e=this._controlType){const t=this._gControls.getHelper();if(e==="global"){this._world.scene.three.add(t),this._gControls.enabled=!0;for(const s of this._lControls)s.getHelper().removeFromParent(),s.enabled=!1}else{t.removeFromParent(),this._gControls.enabled=!1;for(const s of this._lControls){const n=s.getHelper();this._world.scene.three.add(n),s.enabled=!0}}this._controlType=e}async updateSamples(){if(!this._element||!this._mesh)return;const e=this._mesh.matrixWorld.clone();await this._element.updateSamples(),this.dispose(),this._mesh=await this._element.getMeshes(),this._world.scene.three.add(this._mesh),await this.createControls(),this._mesh.position.set(0,0,0),this._mesh.rotation.set(0,0,0),this._mesh.applyMatrix4(e)}async createControls(){if(this._mesh){this._gControls.attach(this._mesh);for(const e of this._mesh.children){const t=new E(a.camera.three,a.renderer.three.domElement);t.attach(e),t.setMode(this._gControls.mode),this._lControls.push(t),t.addEventListener("dragging-changed",s=>{a.camera.hasCameraControls()&&(a.camera.controls.enabled=!s.value)})}this.setControlsTarget()}}dispose(){if(this._mesh&&this._element&&this._element.disposeMeshes(this._mesh),this._gControls.getHelper().removeFromParent(),this._gControls.detach(),!(!this._mesh||!this._element)){for(const t of this._lControls)t.detach(),t.dispose();this._lControls.length=0}}async setVisible(e){if(!this._element)return;const t=[];for(const[,s]of l.models.list){if(s.deltaModelId&&e===!0){const n=new Set(await s.getEditedElements());if(e&&n.has(this._element.localId))continue}t.push(s.setVisible([this._element.localId],e))}await Promise.all(t)}setupEvents(){this._gControls.addEventListener("dragging-changed",s=>{this._world.camera.hasCameraControls()&&(this._world.camera.controls.enabled=!s.value)});const e=new B;this._world.renderer.three.domElement.addEventListener("dblclick",async s=>{e.x=s.clientX,e.y=s.clientY;let n;for(const[,b]of l.models.list){const f=[];f.push(b.raycast({camera:a.camera.three,mouse:e,dom:a.renderer.three.domElement}));const o=await Promise.all(f);let m=1/0;for(const g of o)g&&g.distance<m&&(m=g.distance,n=g)}if(!n)return;this._element&&await this.setVisible(!0);const[r]=await l.editor.getElements(h.modelId,[n.localId]);this._element=r,r&&(this._mesh&&this.dispose(),await this.setVisible(!1),this._mesh=await r.getMeshes(),this._world.scene.three.add(this._mesh),await this.createControls(),await l.update(!0),this.onUpdated.trigger())}),window.addEventListener("keydown",async s=>{if(s.key==="Escape"){if(!this._element||!this._mesh)return;this._element.getRequests(),this.dispose(),this.setVisible(!0),await l.update(!0),this._element=null,this._mesh=null,this.onUpdated.trigger()}})}}const i=new Y(a);await i.init();W.init();const[j,J]=u.create(d=>{const e=new V,t=[];if(i.elementSelected){const s=i.samples;for(const n in s){const r=s[n],b=u.create(()=>c`
             <bim-dropdown label="Material" @change=${async o=>{if(!o.target.value[0])return;const m=parseInt(n,10);await i.setSampleMaterial(m,o.target.value[0])}}>
            </bim-dropdown>
        `);i.updateMaterials().then(()=>{for(const[o,m]of i.materials){const{r:g,g:_,b:C}=m;e.setRGB(g/255,_/255,C/255);const x=`#${e.getHexString()}`,q=u.create(()=>c`<bim-option icon="icon-park-outline:material" label=${o} ?checked=${r.material===o}>
            <div style="width: 1rem; height: 1rem; background-color: ${x}"></div>
          </bim-option>`);b.appendChild(q)}});const f=u.create(()=>c`
          <div style="display: flex; gap: 0.5rem; flex-direction: column;">

            <div style="display: flex; gap: 0.5rem;">
              <bim-label icon="f7:cube" style="font-weight: bold;">Sample ${n}</bim-label>
            </div>

            ${b}

            <bim-dropdown label="Local Transform" @change=${async o=>{if(!o.target.value[0])return;const m=s[n];m&&(m.localTransform=o.target.value[0],await i.updateSamples())}}>

              ${[...new Set([...i.localTransformsIds,r.localTransform])].map(o=>c`<bim-option icon="iconoir:axes" label=${o} ?checked=${r.localTransform===o}>
                </bim-option>`)}
            </bim-dropdown>

            <bim-dropdown label="Geometry" @change=${async o=>{if(!o.target.value[0])return;const m=s[n];m&&(m.representation=o.target.value[0],await i.updateSamples())}}>

              ${[...new Set([...i.geometriesIds,r.representation])].map(o=>c`<bim-option icon="fluent:select-object-24-filled" label=${o} ?checked=${r.representation===o}>
                </bim-option>`)}
            </bim-dropdown>
          </div>
          `);t.push(f)}}return c`<bim-panel-section label="Samples">
  ${t.map(s=>s)}
  </bim-panel-section>`},{}),[Q,T]=u.create(d=>{const e=i.get3dMaterials();return c`
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${e.map(t=>c`

          <div style="display: flex; gap: 0.5rem;">
          <bim-color-input color=#${t.color.getHexString()} label=${t.userData.localId} @input=${s=>{t.color.set(s.target.color)}}>
          </bim-color-input>

          <bim-number-input slider min=0 max=1 step=0.01 value=${t.opacity} @change=${s=>{t.opacity=s.target.value}}></bim-number-input>

          </div>`)}
        </div>
  `},{});i.sampleMaterialsUpdated.add(T);const M=document.getElementById("history-menu");let y=null;const Z=async()=>{const{requests:d,undoneRequests:e}=await l.editor.getModelRequests(h.modelId),t=[...d,...e],s=[...M.children];for(const r of s)M.removeChild(r),r.remove();let n=null;for(let r=0;r<t.length;r++){const b=t[r],f=r<t.length-1,o=u.create(()=>c`
        <bim-button icon="solar:arrow-right-bold"></bim-button>
      `);(y===r||y===null&&!f)&&(o.classList.add("selected-request"),n=o);const _=r;o.addEventListener("click",async()=>{n&&n.classList.remove("selected-request"),n=o,o.classList.add("selected-request"),await l.editor.selectRequest(h.modelId,_),await h.setVisible(void 0,!0),y=_,await l.editor.edit(h.modelId,[],{removeRedo:!1}),await l.update(!0)});const C=u.create(()=>c`
      <div class="history-request">
        ${f?c`<div class="history-line"></div>`:""}
        ${o}
        <div>
          <bim-label class="history-request-title">${H[b.type]}</bim-label>
          <bim-label class="history-request-subtitle">ID: ${"localId"in b?b.localId:"-"}</bim-label>
        </div>
      </div>
      `);M.appendChild(C)}y=null};l.editor.onEdit.add(Z);const[v,ee]=u.create(d=>{const e=c`<bim-button label="Change geometry" @click=${()=>{i.overrideGeometryWithCube()}}></bim-button>`;return J(),T(),c`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">
      <bim-panel-section label="Controls">
        <bim-button data-name="arq" label="Apply changes" @click=${()=>i.applyChanges()}></bim-button>
        <bim-dropdown required label="Tranform Mode" 
            @change="${({target:t})=>{const s=t.value[0];i.setControlsMode(s)}}">
          <bim-option checked  label="translate"></bim-option>
          <bim-option label="rotate"></bim-option>
        </bim-dropdown>
        <bim-dropdown required label="Transform Target" 
            @change="${({target:t})=>{const s=t.value[0];i.setControlsTarget(s)}}">
          <bim-option checked  label="global"></bim-option>
          <bim-option label="local"></bim-option>
        </bim-dropdown>
        ${e}
        ${Q}
      </bim-panel-section>
      ${j}
    </bim-panel>
  `},{});i.onUpdated.add(()=>{ee()});document.body.append(v);const te=u.create(()=>c`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{v.classList.contains("options-menu-visible")?v.classList.remove("options-menu-visible"):v.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(te);window.dispatchEvent(new Event("resize"));const p=new F;p.showPanel(2);document.body.append(p.dom);p.dom.style.right="0px";p.dom.style.bottom="0px";p.dom.style.left="unset";p.dom.style.top="unset";p.dom.style.zIndex="unset";a.renderer.onBeforeUpdate.add(()=>p.begin());a.renderer.onAfterUpdate.add(()=>p.end());
