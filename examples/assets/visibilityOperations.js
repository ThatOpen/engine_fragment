import"./encoding-OofKfb5O.js";import{bU as g,bV as w,bW as y,bX as f,bY as h,bZ as C,b_ as I,b$ as k,c0 as m,c1 as u,c2 as L}from"./pako.esm-CxPC41x8.js";const r=new g,V=r.get(w),t=V.create();t.scene=new y(r);t.scene.setup();t.scene.three.background=null;const v=document.getElementById("container");t.renderer=new f(r,v);t.camera=new h(r);t.camera.controls.setLookAt(183,11,-102,27,-52,-11);r.init();const S=r.get(C);S.create(t);const F="https://thatopen.github.io/engine_fragment/resources/worker.mjs",$=await fetch(F),B=await $.text(),O=new File([new Blob([B])],"worker.mjs",{type:"text/javascript"}),x=URL.createObjectURL(O),o=new I(x);t.camera.controls.addEventListener("rest",()=>o.update(!0));t.camera.controls.addEventListener("update",()=>o.update());o.models.list.onItemSet.add(({value:e})=>{e.useCamera(t.camera.three),t.scene.three.add(e.object),o.update(!0)});const D=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),R=await D.arrayBuffer(),s=await o.load(R,{modelId:"example"}),U=await s.getItemsOfCategory("IFCROOF"),j=(await Promise.all(U.map(e=>e.getLocalId()))).filter(e=>typeof e<"u");await s.setVisible(j,!1);await o.update(!0);const b=async e=>{const l=await s.getItemsOfCategory(e),n=(await Promise.all(l.map(i=>i.getLocalId()))).filter(i=>typeof i<"u");await s.toggleVisible(n),await o.update(!0)},A=async e=>{const l=await s.getItemsOfCategory(e),n=(await Promise.all(l.map(a=>a.getLocalId()))).filter(a=>a!==null);return(await s.getVisible(n)).reduce((a,p)=>(p?a.visible++:a.hidden++,a),{visible:0,hidden:0})},T=async()=>{const e=await s.getItemsByVisibility(!0),l=await s.getItemsByVisibility(!1);return{visible:e.length,hidden:l.length}};k.init();const d=m.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>b("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>b("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>b("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:n,hidden:i}=await A("IFCSLAB");window.alert(`Visible Slabs: ${n}.
Hidden Slabs: ${i}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:n,hidden:i}=await T();window.alert(`Visible: ${n} items.
Hidden: ${i} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(d);const W=m.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{d.classList.contains("options-menu-visible")?d.classList.remove("options-menu-visible"):d.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(W);const c=new L;c.showPanel(2);document.body.append(c.dom);c.dom.style.left="0px";c.dom.style.zIndex="unset";t.renderer.onBeforeUpdate.add(()=>c.begin());t.renderer.onAfterUpdate.add(()=>c.end());
