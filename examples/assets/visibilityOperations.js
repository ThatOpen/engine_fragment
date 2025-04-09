import{c4 as p,c5 as y,c6 as w,c7 as f,c8 as C,c9 as I,ca as h,cb as V,cc as m,cd as u,ce as k}from"./index-BHBrVrON.js";import"./pako.esm-DwGzBETv.js";const c=new p,v=c.get(y),t=v.create();t.scene=new w(c);t.scene.setup();t.scene.three.background=null;const L=document.getElementById("container");t.renderer=new f(c,L);t.camera=new C(c);t.camera.controls.setLookAt(183,11,-102,27,-52,-11);c.init();const S=c.get(I);S.create(t);const $="../../src/multithreading/fragments-thread.ts",l=new h($);t.camera.controls.addEventListener("rest",()=>l.update(!0));l.models.list.onItemSet.add(({value:e})=>{e.useCamera(t.camera.three),t.scene.three.add(e.object),l.update(!0)});const B=await fetch("/resources/frags/school_arq.frag"),F=await B.arrayBuffer(),s=await l.load(F,{modelId:"example"}),O=await s.getItemsOfCategory("IFCROOF"),D=(await Promise.all(O.map(e=>e.getLocalId()))).filter(e=>typeof e<"u");await s.setVisible(D,!1);await l.update(!0);const b=async e=>{const o=await s.getItemsOfCategory(e),n=(await Promise.all(o.map(i=>i.getLocalId()))).filter(i=>typeof i<"u");await s.toggleVisible(n),await l.update(!0)},A=async e=>{const o=await s.getItemsOfCategory(e),n=(await Promise.all(o.map(a=>a.getLocalId()))).filter(a=>a!==null);return(await s.getVisible(n)).reduce((a,g)=>(g?a.visible++:a.hidden++,a),{visible:0,hidden:0})},x=async()=>{const e=await s.getItemsByVisibility(!0),o=await s.getItemsByVisibility(!1);return{visible:e.length,hidden:o.length}};V.init();const d=m.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>b("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>b("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>b("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:n,hidden:i}=await A("IFCSLAB");window.alert(`Visible Slabs: ${n}.
Hidden Slabs: ${i}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:n,hidden:i}=await x();window.alert(`Visible: ${n} items.
Hidden: ${i} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(d);const P=m.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{d.classList.contains("options-menu-visible")?d.classList.remove("options-menu-visible"):d.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(P);const r=new k;r.showPanel(2);document.body.append(r.dom);r.dom.style.left="0px";r.dom.style.zIndex="unset";t.renderer.onBeforeUpdate.add(()=>r.begin());t.renderer.onAfterUpdate.add(()=>r.end());
