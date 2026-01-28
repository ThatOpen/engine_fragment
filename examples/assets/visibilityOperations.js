import{C as g,W as f,S as w,a as y,b as h,G as C}from"./virtual-memory-controller-uf_sHEwD.js";import{a as v,R as m,m as u}from"./index-CWj6LyOo.js";import{S as k}from"./stats.min-Cj8wREqt.js";import{F as I}from"./index-UINVeUYY.js";const a=new g,S=a.get(f),t=S.create();t.scene=new w(a);t.scene.setup();t.scene.three.background=null;const V=document.getElementById("container");t.renderer=new y(a,V);t.camera=new h(a);t.camera.controls.setLookAt(58,22,-25,13,0,4.2);a.init();const L=a.get(C);L.create(t);const O="https://thatopen.github.io/engine_fragment/resources/worker.mjs",$=await fetch(O),F=await $.blob(),B=new File([F],"worker.mjs",{type:"text/javascript"}),R=URL.createObjectURL(B),n=new I(R);t.camera.controls.addEventListener("update",()=>n.update());n.models.list.onItemSet.add(({value:e})=>{e.useCamera(t.camera.three),t.scene.three.add(e.object),n.update(!0)});n.models.materials.list.onItemSet.add(({value:e})=>{"isLodMaterial"in e&&e.isLodMaterial||(e.polygonOffset=!0,e.polygonOffsetUnits=1,e.polygonOffsetFactor=Math.random())});const j=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),U=await j.arrayBuffer(),i=await n.load(U,{modelId:"example"}),x=await i.getItemsOfCategories([/ROOF/]),D=Object.values(x).flat();await i.setVisible(D,!1);await n.update(!0);const d=async e=>{const o=await i.getItemsOfCategories([new RegExp(`^${e}$`)]),s=Object.values(o).flat();await i.toggleVisible(s),await n.update(!0)},A=async e=>{const o=await i.getItemsOfCategories([new RegExp(`^${e}$`)]),s=Object.values(o).flat();return(await i.getVisible(s)).reduce((b,p)=>(p?b.visible++:b.hidden++,b),{visible:0,hidden:0})},E=async()=>{const e=await i.getItemsByVisibility(!0),o=await i.getItemsByVisibility(!1);return{visible:e.length,hidden:o.length}};v.init();const c=m.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>d("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>d("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>d("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:s,hidden:r}=await A("IFCSLAB");window.alert(`Visible Slabs: ${s}.
Hidden Slabs: ${r}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:s,hidden:r}=await E();window.alert(`Visible: ${s} items.
Hidden: ${r} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(c);const M=m.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{c.classList.contains("options-menu-visible")?c.classList.remove("options-menu-visible"):c.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(M);const l=new k;l.showPanel(2);document.body.append(l.dom);l.dom.style.left="0px";l.dom.style.zIndex="unset";t.renderer.onBeforeUpdate.add(()=>l.begin());t.renderer.onAfterUpdate.add(()=>l.end());
