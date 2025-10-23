import{C as p,W as y,S as f,a as w,b as C,G as h}from"./virtual-memory-controller-ZSRKHGNY.js";import{a as v,R as m,m as u}from"./index-CWj6LyOo.js";import{S as I}from"./stats.min-Cj8wREqt.js";import{F as S}from"./index-CqDgYQyW.js";const o=new p,V=o.get(y),e=V.create();e.scene=new f(o);e.scene.setup();e.scene.three.background=null;const $=document.getElementById("container");e.renderer=new w(o,$);e.camera=new C(o);e.camera.controls.setLookAt(58,22,-25,13,0,4.2);o.init();const k=o.get(h);k.create(e);const L="../../src/multithreading/fragments-thread.ts",a=new S(L);e.camera.controls.addEventListener("rest",()=>a.update(!0));a.models.list.onItemSet.add(({value:t})=>{t.useCamera(e.camera.three),e.scene.three.add(t.object),a.update(!0)});const O=await fetch("/resources/frags/school_arq.frag"),B=await O.arrayBuffer(),i=await a.load(B,{modelId:"example"}),F=await i.getItemsOfCategories([/ROOF/]),R=Object.values(F).flat();await i.setVisible(R,!1);await a.update(!0);const d=async t=>{const n=await i.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(n).flat();await i.toggleVisible(s),await a.update(!0)},x=async t=>{const n=await i.getItemsOfCategories([new RegExp(`^${t}$`)]),s=Object.values(n).flat();return(await i.getVisible(s)).reduce((b,g)=>(g?b.visible++:b.hidden++,b),{visible:0,hidden:0})},D=async()=>{const t=await i.getItemsByVisibility(!0),n=await i.getItemsByVisibility(!1);return{visible:t.length,hidden:n.length}};v.init();const c=m.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>d("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>d("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>d("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:s,hidden:r}=await x("IFCSLAB");window.alert(`Visible Slabs: ${s}.
Hidden Slabs: ${r}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:s,hidden:r}=await D();window.alert(`Visible: ${s} items.
Hidden: ${r} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(c);const A=m.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{c.classList.contains("options-menu-visible")?c.classList.remove("options-menu-visible"):c.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(A);const l=new I;l.showPanel(2);document.body.append(l.dom);l.dom.style.left="0px";l.dom.style.zIndex="unset";e.renderer.onBeforeUpdate.add(()=>l.begin());e.renderer.onAfterUpdate.add(()=>l.end());
