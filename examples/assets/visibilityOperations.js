import{c5 as g,c6 as w,c7 as y,c8 as f,c9 as h,ca as C,cb as I,cc as k,cd as m,ce as u,cf as L}from"./pako.esm-9qfSKSXL.js";const c=new g,v=c.get(w),t=v.create();t.scene=new y(c);t.scene.setup();t.scene.three.background=null;const V=document.getElementById("container");t.renderer=new f(c,V);t.camera=new h(c);t.camera.controls.setLookAt(183,11,-102,27,-52,-11);c.init();const S=c.get(C);S.create(t);const F="https://thatopen.github.io/engine_fragment/resources/worker.mjs",B=await fetch(F),$=await B.text(),O=new File([new Blob([$])],"worker.mjs",{type:"text/javascript"}),x=URL.createObjectURL(O),o=new I(x);t.camera.controls.addEventListener("rest",()=>o.update(!0));t.camera.controls.addEventListener("update",()=>o.update());o.models.list.onItemSet.add(({value:e})=>{e.useCamera(t.camera.three),t.scene.three.add(e.object),o.update(!0)});const D=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),R=await D.arrayBuffer(),s=await o.load(R,{modelId:"example"}),j=await s.getItemsOfCategory("IFCROOF"),A=(await Promise.all(j.map(e=>e.getLocalId()))).filter(e=>typeof e<"u");await s.setVisible(A,!1);await o.update(!0);const b=async e=>{const l=await s.getItemsOfCategory(e),n=(await Promise.all(l.map(i=>i.getLocalId()))).filter(i=>typeof i<"u");await s.toggleVisible(n),await o.update(!0)},T=async e=>{const l=await s.getItemsOfCategory(e),n=(await Promise.all(l.map(a=>a.getLocalId()))).filter(a=>a!==null);return(await s.getVisible(n)).reduce((a,p)=>(p?a.visible++:a.hidden++,a),{visible:0,hidden:0})},U=async()=>{const e=await s.getItemsByVisibility(!0),l=await s.getItemsByVisibility(!1);return{visible:e.length,hidden:l.length}};k.init();const d=m.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>b("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>b("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>b("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:n,hidden:i}=await T("IFCSLAB");window.alert(`Visible Slabs: ${n}.
Hidden Slabs: ${i}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:n,hidden:i}=await U();window.alert(`Visible: ${n} items.
Hidden: ${i} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(d);const P=m.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{d.classList.contains("options-menu-visible")?d.classList.remove("options-menu-visible"):d.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(P);const r=new L;r.showPanel(2);document.body.append(r.dom);r.dom.style.left="0px";r.dom.style.zIndex="unset";t.renderer.onBeforeUpdate.add(()=>r.begin());t.renderer.onAfterUpdate.add(()=>r.end());
