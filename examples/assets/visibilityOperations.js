import{c4 as g,c5 as y,c6 as w,c7 as f,c8 as C,c9 as I,ca as h,cb as S,cc as b,cd as u,ce as V}from"./index-B2CFg0Uj.js";import"./pako.esm-DwGzBETv.js";const c=new g,v=c.get(y),t=v.create();t.scene=new w(c);t.scene.setup();t.scene.three.background=null;const L=document.getElementById("container");t.renderer=new f(c,L);t.camera=new C(c);t.camera.controls.setLookAt(80,25,-52,11,-9.5,-3);c.init();const k=c.get(I);k.create(t);const A="../../src/multithreading/fragments-thread.ts",l=new h(A);t.camera.controls.addEventListener("rest",()=>l.update(!0));l.models.list.onItemSet.add(({value:e})=>{e.useCamera(t.camera.three),t.scene.three.add(e.object),l.update(!0)});const B=await fetch("/resources/frags/medium_test.frag"),$=await B.arrayBuffer(),s=await l.load($,{modelId:"example"}),D=await s.getItemsOfCategory("IFCSPACE"),F=(await Promise.all(D.map(e=>e.getLocalId()))).filter(e=>typeof e<"u");await s.setVisible(F,!1);await l.update(!0);const m=async e=>{const o=await s.getItemsOfCategory(e),n=(await Promise.all(o.map(i=>i.getLocalId()))).filter(i=>typeof i<"u");await s.toggleVisible(n),await l.update(!0)},P=async e=>{const o=await s.getItemsOfCategory(e),n=(await Promise.all(o.map(a=>a.getLocalId()))).filter(a=>a!==null);return(await s.getVisible(n)).reduce((a,p)=>(p?a.visible++:a.hidden++,a),{visible:0,hidden:0})},x=async()=>{const e=await s.getItemsByVisibility(!0),o=await s.getItemsByVisibility(!1);return{visible:e.length,hidden:o.length}};S.init();const d=b.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Walls" @click=${()=>m("IFCWALLSTANDARDCASE")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>m("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:n,hidden:i}=await P("IFCSLAB");window.alert(`Visible Slabs: ${n}.
Hidden Slabs: ${i}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:n,hidden:i}=await x();window.alert(`Visible: ${n} items.
Hidden: ${i} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(d);const E=b.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{d.classList.contains("options-menu-visible")?d.classList.remove("options-menu-visible"):d.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(E);const r=new V;r.showPanel(2);document.body.append(r.dom);r.dom.style.left="0px";r.dom.style.zIndex="unset";t.renderer.onBeforeUpdate.add(()=>r.begin());t.renderer.onAfterUpdate.add(()=>r.end());
