import{c3 as p,c4 as y,c5 as w,c6 as f,c7 as C,c8 as h,c9 as I,ca as m,cb as u,cc as v}from"./pako.esm-TbDA1OGb.js";import{h as V}from"./index-DUcvzWcL.js";const o=new p,$=o.get(y),e=$.create();e.scene=new w(o);e.scene.setup();e.scene.three.background=null;const k=document.getElementById("container");e.renderer=new f(o,k);e.camera=new C(o);e.camera.controls.setLookAt(58,22,-25,13,0,4.2);o.init();const S=o.get(h);S.create(e);const L="../../src/multithreading/fragments-thread.ts",a=new V(L);e.camera.controls.addEventListener("rest",()=>a.update(!0));a.models.list.onItemSet.add(({value:t})=>{t.useCamera(e.camera.three),e.scene.three.add(t.object),a.update(!0)});const O=await fetch("/resources/frags/school_arq.frag"),B=await O.arrayBuffer(),s=await a.load(B,{modelId:"example"}),F=await s.getItemsOfCategories([/ROOF/]),x=Object.values(F).flat();await s.setVisible(x,!1);await a.update(!0);const d=async t=>{const n=await s.getItemsOfCategories([new RegExp(`^${t}$`)]),i=Object.values(n).flat();await s.toggleVisible(i),await a.update(!0)},D=async t=>{const n=await s.getItemsOfCategories([new RegExp(`^${t}$`)]),i=Object.values(n).flat();return(await s.getVisible(i)).reduce((b,g)=>(g?b.visible++:b.hidden++,b),{visible:0,hidden:0})},R=async()=>{const t=await s.getItemsByVisibility(!0),n=await s.getItemsByVisibility(!1);return{visible:t.length,hidden:n.length}};I.init();const r=m.create(()=>u`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Roofs" @click=${()=>d("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${()=>d("IFCWALL")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${()=>d("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${async()=>{const{visible:i,hidden:c}=await D("IFCSLAB");window.alert(`Visible Slabs: ${i}.
Hidden Slabs: ${c}.`)}}></bim-button>  
        <bim-button label="Display Visibility State" @click=${async()=>{const{visible:i,hidden:c}=await R();window.alert(`Visible: ${i} items.
Hidden: ${c} items.`)}}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `);document.body.append(r);const A=m.create(()=>u`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${()=>{r.classList.contains("options-menu-visible")?r.classList.remove("options-menu-visible"):r.classList.add("options-menu-visible")}}>
    </bim-button>
  `);document.body.append(A);const l=new v;l.showPanel(2);document.body.append(l.dom);l.dom.style.left="0px";l.dom.style.zIndex="unset";e.renderer.onBeforeUpdate.add(()=>l.begin());e.renderer.onAfterUpdate.add(()=>l.end());
