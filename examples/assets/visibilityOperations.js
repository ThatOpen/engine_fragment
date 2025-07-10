import{c3 as p,c4 as y,c5 as w,c6 as f,c7 as h,c8 as C,c9 as v,ca as m,cb as u,cc as I}from"./pako.esm-CNfj-wfU.js";import{h as V}from"./index-BoGUiZul.js";const o=new p,k=o.get(y),e=k.create();e.scene=new w(o);e.scene.setup();e.scene.three.background=null;const $=document.getElementById("container");e.renderer=new f(o,$);e.camera=new h(o);e.camera.controls.setLookAt(58,22,-25,13,0,4.2);o.init();const S=o.get(C);S.create(e);const L="https://thatopen.github.io/engine_fragment/resources/worker.mjs",a=new V(L);e.camera.controls.addEventListener("rest",()=>a.update(!0));a.models.list.onItemSet.add(({value:t})=>{t.useCamera(e.camera.three),e.scene.three.add(t.object),a.update(!0)});const O=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),B=await O.arrayBuffer(),i=await a.load(B,{modelId:"example"}),F=await i.getItemsOfCategories([/ROOF/]),R=Object.values(F).flat();await i.setVisible(R,!1);await a.update(!0);const d=async t=>{const n=await i.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(n).flat();await i.toggleVisible(s),await a.update(!0)},x=async t=>{const n=await i.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(n).flat();return(await i.getVisible(s)).reduce((b,g)=>(g?b.visible++:b.hidden++,b),{visible:0,hidden:0})},D=async()=>{const t=await i.getItemsByVisibility(!0),n=await i.getItemsByVisibility(!1);return{visible:t.length,hidden:n.length}};v.init();const r=m.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>d("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>d("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>d("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:s,hidden:c}=await x("IFCSLAB");window.alert(`Visible Slabs: ${s}.
Hidden Slabs: ${c}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:s,hidden:c}=await D();window.alert(`Visible: ${s} items.
Hidden: ${c} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(r);const j=m.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{r.classList.contains("options-menu-visible")?r.classList.remove("options-menu-visible"):r.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(j);const l=new I;l.showPanel(2);document.body.append(l.dom);l.dom.style.left="0px";l.dom.style.zIndex="unset";e.renderer.onBeforeUpdate.add(()=>l.begin());e.renderer.onAfterUpdate.add(()=>l.end());
