import{C as u,W as b,S as g,a as f,b as w,G as h,F as d}from"./index-CCztv3eI.js";import{K as S,n as i,b as c}from"./index-Bt1juVKF.js";import{S as y}from"./stats.min-CgKsrbbR.js";const n=new u,v=n.get(b),e=v.create();e.scene=new g(n);e.scene.setup();e.scene.three.background=null;const k=document.getElementById("container");e.renderer=new f(n,k);e.camera=new w(n);e.camera.controls.setLookAt(58,22,-25,13,0,4.2);n.init();const G=n.get(h);G.create(e);const $=await d.getWorker(),o=new d($,{threadGroups:{data:1}});e.camera.controls.addEventListener("update",()=>o.update());o.models.list.onItemSet.add(({value:t})=>{t.useCamera(e.camera.three),e.scene.three.add(t.object),o.update(!0)});o.models.materials.list.onItemSet.add(({value:t})=>{"isLodMaterial"in t&&t.isLodMaterial||(t.polygonOffset=!0,t.polygonOffsetUnits=1,t.polygonOffsetFactor=Math.random())});console.log("Effective max workers:",o.maxWorkers);console.log("Declared thread groups:",o.threadGroups);const C="https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag",M=await fetch(C),m=await M.arrayBuffer(),x=await o.load(m.slice(0),{modelId:"school-data",threadGroup:"data"}),I=await o.load(m.slice(0),{modelId:"school-view"});console.log("Data model group:",x.threadGroup);console.log("View model group:",I.threadGroup);S.init();const l=i.create(()=>c`
    <bim-panel active label="Thread Groups" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Show Capacity" @click=${()=>{const a=Object.entries(o.threadGroups).map(([r,p])=>`${r}: ${p}`).join(", ");window.alert(`Max workers: ${o.maxWorkers}.
Declared groups: ${a||"(none)"}.`)}}></bim-button>
        <bim-button label="Show Model Assignments" @click=${()=>{const a=[];for(const r of o.models.list.values())a.push(`${r.modelId} -> ${r.threadGroup??"(default)"}`);window.alert(a.join(`
`)||"No models loaded.")}}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(l);const L=i.create(()=>c`
      <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
        @click="${()=>{l.classList.contains("options-menu-visible")?l.classList.remove("options-menu-visible"):l.classList.add("options-menu-visible")}}">
      </bim-button>
    `);document.body.append(L);const s=new y;s.showPanel(2);document.body.append(s.dom);s.dom.style.left="0px";s.dom.style.zIndex="unset";e.renderer.onBeforeUpdate.add(()=>s.begin());e.renderer.onAfterUpdate.add(()=>s.end());
