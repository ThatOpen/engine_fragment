import{c3 as p,c4 as w,c5 as y,c6 as f,c7 as h,c8 as C,c9 as k,ca as m,cb as u,cc as v}from"./pako.esm-CNfj-wfU.js";import{h as I}from"./index-BoGUiZul.js";const a=new p,V=a.get(w),e=V.create();e.scene=new y(a);e.scene.setup();e.scene.three.background=null;const $=document.getElementById("container");e.renderer=new f(a,$);e.camera=new h(a);e.camera.controls.setLookAt(58,22,-25,13,0,4.2);a.init();const S=a.get(C);S.create(e);const L="https://thatopen.github.io/engine_fragment/resources/worker.mjs",O=await fetch(L),B=await O.blob(),F=new File([B],"worker.mjs",{type:"text/javascript"}),R=URL.createObjectURL(F),o=new I(R);e.camera.controls.addEventListener("rest",()=>o.update(!0));o.models.list.onItemSet.add(({value:t})=>{t.useCamera(e.camera.three),e.scene.three.add(t.object),o.update(!0)});const j=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),x=await j.arrayBuffer(),i=await o.load(x,{modelId:"example"}),U=await i.getItemsOfCategories([/ROOF/]),D=Object.values(U).flat();await i.setVisible(D,!1);await o.update(!0);const d=async t=>{const n=await i.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(n).flat();await i.toggleVisible(s),await o.update(!0)},A=async t=>{const n=await i.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(n).flat();return(await i.getVisible(s)).reduce((b,g)=>(g?b.visible++:b.hidden++,b),{visible:0,hidden:0})},E=async()=>{const t=await i.getItemsByVisibility(!0),n=await i.getItemsByVisibility(!1);return{visible:t.length,hidden:n.length}};k.init();const r=m.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>d("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>d("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>d("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:s,hidden:c}=await A("IFCSLAB");window.alert(`Visible Slabs: ${s}.
Hidden Slabs: ${c}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:s,hidden:c}=await E();window.alert(`Visible: ${s} items.
Hidden: ${c} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(r);const T=m.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{r.classList.contains("options-menu-visible")?r.classList.remove("options-menu-visible"):r.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(T);const l=new v;l.showPanel(2);document.body.append(l.dom);l.dom.style.left="0px";l.dom.style.zIndex="unset";e.renderer.onBeforeUpdate.add(()=>l.begin());e.renderer.onAfterUpdate.add(()=>l.end());
