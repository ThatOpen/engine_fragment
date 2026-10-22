import{C as f,W as y,S as w,a as C,b as h,G as v,F as m}from"./index-BwXuLbMn.js";import{K as I,n as u,b as g}from"./index-Bt1juVKF.js";import{S}from"./stats.min-CgKsrbbR.js";const a=new f,V=a.get(y),t=V.create();t.scene=new w(a);t.scene.setup();t.scene.three.background=null;const k=document.getElementById("container");t.renderer=new C(a,k);t.camera=new h(a);t.camera.controls.setLookAt(58,22,-25,13,0,4.2);a.init();const $=a.get(v);$.create(t);const O=await m.getWorker(),n=new m(O);t.camera.controls.addEventListener("update",()=>n.update());n.models.list.onItemSet.add(({value:e})=>{e.useCamera(t.camera.three),t.scene.three.add(e.object),n.update(!0)});n.models.materials.list.onItemSet.add(({value:e})=>{"isLodMaterial"in e&&e.isLodMaterial||(e.polygonOffset=!0,e.polygonOffsetUnits=1,e.polygonOffsetFactor=Math.random())});const L=await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag"),F=await L.arrayBuffer(),i=await n.load(F,{modelId:"example"}),B=await i.getItemsOfCategories([/ROOF/]),x=Object.values(B).flat();await i.setVisible(x,!1);await n.update(!0);const b=async e=>{const o=await i.getItemsOfCategories([new RegExp(`^${e}$`)]),s=Object.values(o).flat();await i.toggleVisible(s),await n.update(!0)},D=async e=>{const o=await i.getItemsOfCategories([new RegExp(`^${e}$`)]),s=Object.values(o).flat();return(await i.getVisible(s)).reduce((d,p)=>(p?d.visible++:d.hidden++,d),{visible:0,hidden:0})},R=async()=>{const e=await i.getItemsByVisibility(!0),o=await i.getItemsByVisibility(!1);return{visible:e.length,hidden:o.length}};I.init();const r=u.create(()=>g`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>b("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>b("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>b("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:s,hidden:c}=await D("IFCSLAB");window.alert(`Visible Slabs: ${s}.
Hidden Slabs: ${c}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:s,hidden:c}=await R();window.alert(`Visible: ${s} items.
Hidden: ${c} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(r);const A=u.create(()=>g`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{r.classList.contains("options-menu-visible")?r.classList.remove("options-menu-visible"):r.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(A);const l=new S;l.showPanel(2);document.body.append(l.dom);l.dom.style.left="0px";l.dom.style.zIndex="unset";t.renderer.onBeforeUpdate.add(()=>l.begin());t.renderer.onAfterUpdate.add(()=>l.end());
