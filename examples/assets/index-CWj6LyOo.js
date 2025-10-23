var Nr=Object.defineProperty,qr=(i,t,e)=>t in i?Nr(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,dt=(i,t,e)=>(qr(i,typeof t!="symbol"?t+"":t,e),e);const Ct=Math.min,Z=Math.max,ve=Math.round,st=i=>({x:i,y:i}),Dr={left:"right",right:"left",bottom:"top",top:"bottom"},Ur={start:"end",end:"start"};function Ei(i,t,e){return Z(i,Ct(t,e))}function ie(i,t){return typeof i=="function"?i(t):i}function G(i){return i.split("-")[0]}function Oe(i){return i.split("-")[1]}function hn(i){return i==="x"?"y":"x"}function dn(i){return i==="y"?"height":"width"}function bt(i){return["top","bottom"].includes(G(i))?"y":"x"}function pn(i){return hn(bt(i))}function Vr(i,t,e){e===void 0&&(e=!1);const n=Oe(i),r=pn(i),s=dn(r);let o=r==="x"?n===(e?"end":"start")?"right":"left":n==="start"?"bottom":"top";return t.reference[s]>t.floating[s]&&(o=ye(o)),[o,ye(o)]}function Yr(i){const t=ye(i);return[Qe(i),t,Qe(t)]}function Qe(i){return i.replace(/start|end/g,t=>Ur[t])}function Wr(i,t,e){const n=["left","right"],r=["right","left"],s=["top","bottom"],o=["bottom","top"];switch(i){case"top":case"bottom":return e?t?r:n:t?n:r;case"left":case"right":return t?s:o;default:return[]}}function Qr(i,t,e,n){const r=Oe(i);let s=Wr(G(i),e==="start",n);return r&&(s=s.map(o=>o+"-"+r),t&&(s=s.concat(s.map(Qe)))),s}function ye(i){return i.replace(/left|right|bottom|top/g,t=>Dr[t])}function Jr(i){return{top:0,right:0,bottom:0,left:0,...i}}function fn(i){return typeof i!="number"?Jr(i):{top:i,right:i,bottom:i,left:i}}function At(i){const{x:t,y:e,width:n,height:r}=i;return{width:n,height:r,top:e,left:t,right:t+n,bottom:e+r,x:t,y:e}}function ki(i,t,e){let{reference:n,floating:r}=i;const s=bt(t),o=pn(t),a=dn(o),l=G(t),c=s==="y",u=n.x+n.width/2-r.width/2,d=n.y+n.height/2-r.height/2,f=n[a]/2-r[a]/2;let p;switch(l){case"top":p={x:u,y:n.y-r.height};break;case"bottom":p={x:u,y:n.y+n.height};break;case"right":p={x:n.x+n.width,y:d};break;case"left":p={x:n.x-r.width,y:d};break;default:p={x:n.x,y:n.y}}switch(Oe(t)){case"start":p[o]-=f*(e&&c?-1:1);break;case"end":p[o]+=f*(e&&c?-1:1);break}return p}const Xr=async(i,t,e)=>{const{placement:n="bottom",strategy:r="absolute",middleware:s=[],platform:o}=e,a=s.filter(Boolean),l=await(o.isRTL==null?void 0:o.isRTL(t));let c=await o.getElementRects({reference:i,floating:t,strategy:r}),{x:u,y:d}=ki(c,n,l),f=n,p={},g=0;for(let v=0;v<a.length;v++){const{name:b,fn:$}=a[v],{x,y,data:k,reset:P}=await $({x:u,y:d,initialPlacement:n,placement:f,strategy:r,middlewareData:p,rects:c,platform:o,elements:{reference:i,floating:t}});u=x??u,d=y??d,p={...p,[b]:{...p[b],...k}},P&&g<=50&&(g++,typeof P=="object"&&(P.placement&&(f=P.placement),P.rects&&(c=P.rects===!0?await o.getElementRects({reference:i,floating:t,strategy:r}):P.rects),{x:u,y:d}=ki(c,f,l)),v=-1)}return{x:u,y:d,placement:f,strategy:r,middlewareData:p}};async function mn(i,t){var e;t===void 0&&(t={});const{x:n,y:r,platform:s,rects:o,elements:a,strategy:l}=i,{boundary:c="clippingAncestors",rootBoundary:u="viewport",elementContext:d="floating",altBoundary:f=!1,padding:p=0}=ie(t,i),g=fn(p),v=a[f?d==="floating"?"reference":"floating":d],b=At(await s.getClippingRect({element:(e=await(s.isElement==null?void 0:s.isElement(v)))==null||e?v:v.contextElement||await(s.getDocumentElement==null?void 0:s.getDocumentElement(a.floating)),boundary:c,rootBoundary:u,strategy:l})),$=d==="floating"?{x:n,y:r,width:o.floating.width,height:o.floating.height}:o.reference,x=await(s.getOffsetParent==null?void 0:s.getOffsetParent(a.floating)),y=await(s.isElement==null?void 0:s.isElement(x))?await(s.getScale==null?void 0:s.getScale(x))||{x:1,y:1}:{x:1,y:1},k=At(s.convertOffsetParentRelativeRectToViewportRelativeRect?await s.convertOffsetParentRelativeRectToViewportRelativeRect({elements:a,rect:$,offsetParent:x,strategy:l}):$);return{top:(b.top-k.top+g.top)/y.y,bottom:(k.bottom-b.bottom+g.bottom)/y.y,left:(b.left-k.left+g.left)/y.x,right:(k.right-b.right+g.right)/y.x}}const Zr=function(i){return i===void 0&&(i={}),{name:"flip",options:i,async fn(t){var e,n;const{placement:r,middlewareData:s,rects:o,initialPlacement:a,platform:l,elements:c}=t,{mainAxis:u=!0,crossAxis:d=!0,fallbackPlacements:f,fallbackStrategy:p="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:v=!0,...b}=ie(i,t);if((e=s.arrow)!=null&&e.alignmentOffset)return{};const $=G(r),x=bt(a),y=G(a)===a,k=await(l.isRTL==null?void 0:l.isRTL(c.floating)),P=f||(y||!v?[ye(a)]:Yr(a)),_=g!=="none";!f&&_&&P.push(...Qr(a,v,g,k));const z=[a,...P],q=await mn(t,b),D=[];let A=((n=s.flip)==null?void 0:n.overflows)||[];if(u&&D.push(q[$]),d){const Y=Vr(r,o,k);D.push(q[Y[0]],q[Y[1]])}if(A=[...A,{placement:r,overflows:D}],!D.every(Y=>Y<=0)){var xt,qt;const Y=(((xt=s.flip)==null?void 0:xt.index)||0)+1,$t=z[Y];if($t)return{data:{index:Y,overflows:A},reset:{placement:$t}};let et=(qt=A.filter(it=>it.overflows[0]<=0).sort((it,W)=>it.overflows[1]-W.overflows[1])[0])==null?void 0:qt.placement;if(!et)switch(p){case"bestFit":{var wt;const it=(wt=A.filter(W=>{if(_){const nt=bt(W.placement);return nt===x||nt==="y"}return!0}).map(W=>[W.placement,W.overflows.filter(nt=>nt>0).reduce((nt,Fr)=>nt+Fr,0)]).sort((W,nt)=>W[1]-nt[1])[0])==null?void 0:wt[0];it&&(et=it);break}case"initialPlacement":et=a;break}if(r!==et)return{reset:{placement:et}}}return{}}}};function bn(i){const t=Ct(...i.map(s=>s.left)),e=Ct(...i.map(s=>s.top)),n=Z(...i.map(s=>s.right)),r=Z(...i.map(s=>s.bottom));return{x:t,y:e,width:n-t,height:r-e}}function Gr(i){const t=i.slice().sort((r,s)=>r.y-s.y),e=[];let n=null;for(let r=0;r<t.length;r++){const s=t[r];!n||s.y-n.y>n.height/2?e.push([s]):e[e.length-1].push(s),n=s}return e.map(r=>At(bn(r)))}const Kr=function(i){return i===void 0&&(i={}),{name:"inline",options:i,async fn(t){const{placement:e,elements:n,rects:r,platform:s,strategy:o}=t,{padding:a=2,x:l,y:c}=ie(i,t),u=Array.from(await(s.getClientRects==null?void 0:s.getClientRects(n.reference))||[]),d=Gr(u),f=At(bn(u)),p=fn(a);function g(){if(d.length===2&&d[0].left>d[1].right&&l!=null&&c!=null)return d.find(b=>l>b.left-p.left&&l<b.right+p.right&&c>b.top-p.top&&c<b.bottom+p.bottom)||f;if(d.length>=2){if(bt(e)==="y"){const A=d[0],xt=d[d.length-1],qt=G(e)==="top",wt=A.top,Y=xt.bottom,$t=qt?A.left:xt.left,et=qt?A.right:xt.right,it=et-$t,W=Y-wt;return{top:wt,bottom:Y,left:$t,right:et,width:it,height:W,x:$t,y:wt}}const b=G(e)==="left",$=Z(...d.map(A=>A.right)),x=Ct(...d.map(A=>A.left)),y=d.filter(A=>b?A.left===x:A.right===$),k=y[0].top,P=y[y.length-1].bottom,_=x,z=$,q=z-_,D=P-k;return{top:k,bottom:P,left:_,right:z,width:q,height:D,x:_,y:k}}return f}const v=await s.getElementRects({reference:{getBoundingClientRect:g},floating:n.floating,strategy:o});return r.reference.x!==v.reference.x||r.reference.y!==v.reference.y||r.reference.width!==v.reference.width||r.reference.height!==v.reference.height?{reset:{rects:v}}:{}}}};async function ts(i,t){const{placement:e,platform:n,elements:r}=i,s=await(n.isRTL==null?void 0:n.isRTL(r.floating)),o=G(e),a=Oe(e),l=bt(e)==="y",c=["left","top"].includes(o)?-1:1,u=s&&l?-1:1,d=ie(t,i);let{mainAxis:f,crossAxis:p,alignmentAxis:g}=typeof d=="number"?{mainAxis:d,crossAxis:0,alignmentAxis:null}:{mainAxis:d.mainAxis||0,crossAxis:d.crossAxis||0,alignmentAxis:d.alignmentAxis};return a&&typeof g=="number"&&(p=a==="end"?g*-1:g),l?{x:p*u,y:f*c}:{x:f*c,y:p*u}}const gn=function(i){return{name:"offset",options:i,async fn(t){var e,n;const{x:r,y:s,placement:o,middlewareData:a}=t,l=await ts(t,i);return o===((e=a.offset)==null?void 0:e.placement)&&(n=a.arrow)!=null&&n.alignmentOffset?{}:{x:r+l.x,y:s+l.y,data:{...l,placement:o}}}}},es=function(i){return i===void 0&&(i={}),{name:"shift",options:i,async fn(t){const{x:e,y:n,placement:r}=t,{mainAxis:s=!0,crossAxis:o=!1,limiter:a={fn:b=>{let{x:$,y:x}=b;return{x:$,y:x}}},...l}=ie(i,t),c={x:e,y:n},u=await mn(t,l),d=bt(G(r)),f=hn(d);let p=c[f],g=c[d];if(s){const b=f==="y"?"top":"left",$=f==="y"?"bottom":"right",x=p+u[b],y=p-u[$];p=Ei(x,p,y)}if(o){const b=d==="y"?"top":"left",$=d==="y"?"bottom":"right",x=g+u[b],y=g-u[$];g=Ei(x,g,y)}const v=a.fn({...t,[f]:p,[d]:g});return{...v,data:{x:v.x-e,y:v.y-n,enabled:{[f]:s,[d]:o}}}}}};function Te(){return typeof window<"u"}function ot(i){return vn(i)?(i.nodeName||"").toLowerCase():"#document"}function L(i){var t;return(i==null||(t=i.ownerDocument)==null?void 0:t.defaultView)||window}function lt(i){var t;return(t=(vn(i)?i.ownerDocument:i.document)||window.document)==null?void 0:t.documentElement}function vn(i){return Te()?i instanceof Node||i instanceof L(i).Node:!1}function Q(i){return Te()?i instanceof Element||i instanceof L(i).Element:!1}function J(i){return Te()?i instanceof HTMLElement||i instanceof L(i).HTMLElement:!1}function Ci(i){return!Te()||typeof ShadowRoot>"u"?!1:i instanceof ShadowRoot||i instanceof L(i).ShadowRoot}function ne(i){const{overflow:t,overflowX:e,overflowY:n,display:r}=M(i);return/auto|scroll|overlay|hidden|clip/.test(t+n+e)&&!["inline","contents"].includes(r)}function is(i){return["table","td","th"].includes(ot(i))}function ns(i){return[":popover-open",":modal"].some(t=>{try{return i.matches(t)}catch{return!1}})}function li(i){const t=ci(),e=Q(i)?M(i):i;return e.transform!=="none"||e.perspective!=="none"||(e.containerType?e.containerType!=="normal":!1)||!t&&(e.backdropFilter?e.backdropFilter!=="none":!1)||!t&&(e.filter?e.filter!=="none":!1)||["transform","perspective","filter"].some(n=>(e.willChange||"").includes(n))||["paint","layout","strict","content"].some(n=>(e.contain||"").includes(n))}function rs(i){let t=St(i);for(;J(t)&&!Pe(t);){if(li(t))return t;if(ns(t))return null;t=St(t)}return null}function ci(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}function Pe(i){return["html","body","#document"].includes(ot(i))}function M(i){return L(i).getComputedStyle(i)}function ze(i){return Q(i)?{scrollLeft:i.scrollLeft,scrollTop:i.scrollTop}:{scrollLeft:i.scrollX,scrollTop:i.scrollY}}function St(i){if(ot(i)==="html")return i;const t=i.assignedSlot||i.parentNode||Ci(i)&&i.host||lt(i);return Ci(t)?t.host:t}function yn(i){const t=St(i);return Pe(t)?i.ownerDocument?i.ownerDocument.body:i.body:J(t)&&ne(t)?t:yn(t)}function _n(i,t,e){var n;t===void 0&&(t=[]);const r=yn(i),s=r===((n=i.ownerDocument)==null?void 0:n.body),o=L(r);return s?(ss(o),t.concat(o,o.visualViewport||[],ne(r)?r:[],[])):t.concat(r,_n(r,[]))}function ss(i){return i.parent&&Object.getPrototypeOf(i.parent)?i.frameElement:null}function xn(i){const t=M(i);let e=parseFloat(t.width)||0,n=parseFloat(t.height)||0;const r=J(i),s=r?i.offsetWidth:e,o=r?i.offsetHeight:n,a=ve(e)!==s||ve(n)!==o;return a&&(e=s,n=o),{width:e,height:n,$:a}}function wn(i){return Q(i)?i:i.contextElement}function kt(i){const t=wn(i);if(!J(t))return st(1);const e=t.getBoundingClientRect(),{width:n,height:r,$:s}=xn(t);let o=(s?ve(e.width):e.width)/n,a=(s?ve(e.height):e.height)/r;return(!o||!Number.isFinite(o))&&(o=1),(!a||!Number.isFinite(a))&&(a=1),{x:o,y:a}}const os=st(0);function $n(i){const t=L(i);return!ci()||!t.visualViewport?os:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function as(i,t,e){return t===void 0&&(t=!1),!e||t&&e!==L(i)?!1:t}function Jt(i,t,e,n){t===void 0&&(t=!1),e===void 0&&(e=!1);const r=i.getBoundingClientRect(),s=wn(i);let o=st(1);t&&(n?Q(n)&&(o=kt(n)):o=kt(i));const a=as(s,e,n)?$n(s):st(0);let l=(r.left+a.x)/o.x,c=(r.top+a.y)/o.y,u=r.width/o.x,d=r.height/o.y;if(s){const f=L(s),p=n&&Q(n)?L(n):n;let g=f,v=g.frameElement;for(;v&&n&&p!==g;){const b=kt(v),$=v.getBoundingClientRect(),x=M(v),y=$.left+(v.clientLeft+parseFloat(x.paddingLeft))*b.x,k=$.top+(v.clientTop+parseFloat(x.paddingTop))*b.y;l*=b.x,c*=b.y,u*=b.x,d*=b.y,l+=y,c+=k,g=L(v),v=g.frameElement}}return At({width:u,height:d,x:l,y:c})}const ls=[":popover-open",":modal"];function En(i){return ls.some(t=>{try{return i.matches(t)}catch{return!1}})}function cs(i){let{elements:t,rect:e,offsetParent:n,strategy:r}=i;const s=r==="fixed",o=lt(n),a=t?En(t.floating):!1;if(n===o||a&&s)return e;let l={scrollLeft:0,scrollTop:0},c=st(1);const u=st(0),d=J(n);if((d||!d&&!s)&&((ot(n)!=="body"||ne(o))&&(l=ze(n)),J(n))){const f=Jt(n);c=kt(n),u.x=f.x+n.clientLeft,u.y=f.y+n.clientTop}return{width:e.width*c.x,height:e.height*c.y,x:e.x*c.x-l.scrollLeft*c.x+u.x,y:e.y*c.y-l.scrollTop*c.y+u.y}}function us(i){return Array.from(i.getClientRects())}function kn(i){return Jt(lt(i)).left+ze(i).scrollLeft}function hs(i){const t=lt(i),e=ze(i),n=i.ownerDocument.body,r=Z(t.scrollWidth,t.clientWidth,n.scrollWidth,n.clientWidth),s=Z(t.scrollHeight,t.clientHeight,n.scrollHeight,n.clientHeight);let o=-e.scrollLeft+kn(i);const a=-e.scrollTop;return M(n).direction==="rtl"&&(o+=Z(t.clientWidth,n.clientWidth)-r),{width:r,height:s,x:o,y:a}}function ds(i,t){const e=L(i),n=lt(i),r=e.visualViewport;let s=n.clientWidth,o=n.clientHeight,a=0,l=0;if(r){s=r.width,o=r.height;const c=ci();(!c||c&&t==="fixed")&&(a=r.offsetLeft,l=r.offsetTop)}return{width:s,height:o,x:a,y:l}}function ps(i,t){const e=Jt(i,!0,t==="fixed"),n=e.top+i.clientTop,r=e.left+i.clientLeft,s=J(i)?kt(i):st(1),o=i.clientWidth*s.x,a=i.clientHeight*s.y,l=r*s.x,c=n*s.y;return{width:o,height:a,x:l,y:c}}function Ai(i,t,e){let n;if(t==="viewport")n=ds(i,e);else if(t==="document")n=hs(lt(i));else if(Q(t))n=ps(t,e);else{const r=$n(i);n={...t,x:t.x-r.x,y:t.y-r.y}}return At(n)}function Cn(i,t){const e=St(i);return e===t||!Q(e)||Pe(e)?!1:M(e).position==="fixed"||Cn(e,t)}function fs(i,t){const e=t.get(i);if(e)return e;let n=_n(i,[]).filter(a=>Q(a)&&ot(a)!=="body"),r=null;const s=M(i).position==="fixed";let o=s?St(i):i;for(;Q(o)&&!Pe(o);){const a=M(o),l=li(o);!l&&a.position==="fixed"&&(r=null),(s?!l&&!r:!l&&a.position==="static"&&r&&["absolute","fixed"].includes(r.position)||ne(o)&&!l&&Cn(i,o))?n=n.filter(c=>c!==o):r=a,o=St(o)}return t.set(i,n),n}function ms(i){let{element:t,boundary:e,rootBoundary:n,strategy:r}=i;const s=[...e==="clippingAncestors"?fs(t,this._c):[].concat(e),n],o=s[0],a=s.reduce((l,c)=>{const u=Ai(t,c,r);return l.top=Z(u.top,l.top),l.right=Ct(u.right,l.right),l.bottom=Ct(u.bottom,l.bottom),l.left=Z(u.left,l.left),l},Ai(t,o,r));return{width:a.right-a.left,height:a.bottom-a.top,x:a.left,y:a.top}}function bs(i){const{width:t,height:e}=xn(i);return{width:t,height:e}}function gs(i,t,e){const n=J(t),r=lt(t),s=e==="fixed",o=Jt(i,!0,s,t);let a={scrollLeft:0,scrollTop:0};const l=st(0);if(n||!n&&!s)if((ot(t)!=="body"||ne(r))&&(a=ze(t)),n){const d=Jt(t,!0,s,t);l.x=d.x+t.clientLeft,l.y=d.y+t.clientTop}else r&&(l.x=kn(r));const c=o.left+a.scrollLeft-l.x,u=o.top+a.scrollTop-l.y;return{x:c,y:u,width:o.width,height:o.height}}function Si(i,t){return!J(i)||M(i).position==="fixed"?null:t?t(i):i.offsetParent}function An(i,t){const e=L(i);if(!J(i)||En(i))return e;let n=Si(i,t);for(;n&&is(n)&&M(n).position==="static";)n=Si(n,t);return n&&(ot(n)==="html"||ot(n)==="body"&&M(n).position==="static"&&!li(n))?e:n||rs(i)||e}const vs=async function(i){const t=this.getOffsetParent||An,e=this.getDimensions;return{reference:gs(i.reference,await t(i.floating),i.strategy),floating:{x:0,y:0,...await e(i.floating)}}};function ys(i){return M(i).direction==="rtl"}const _s={convertOffsetParentRelativeRectToViewportRelativeRect:cs,getDocumentElement:lt,getClippingRect:ms,getOffsetParent:An,getElementRects:vs,getClientRects:us,getDimensions:bs,getScale:kt,isElement:Q,isRTL:ys},Sn=es,On=Zr,Tn=Kr,Pn=(i,t,e)=>{const n=new Map,r={platform:_s,...e},s={...r.platform,_c:n};return Xr(i,t,{...r,platform:s})};/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const be=globalThis,ui=be.ShadowRoot&&(be.ShadyCSS===void 0||be.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,hi=Symbol(),Oi=new WeakMap;let zn=class{constructor(i,t,e){if(this._$cssResult$=!0,e!==hi)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=i,this.t=t}get styleSheet(){let i=this.o;const t=this.t;if(ui&&i===void 0){const e=t!==void 0&&t.length===1;e&&(i=Oi.get(t)),i===void 0&&((this.o=i=new CSSStyleSheet).replaceSync(this.cssText),e&&Oi.set(t,i))}return i}toString(){return this.cssText}};const xs=i=>new zn(typeof i=="string"?i:i+"",void 0,hi),C=(i,...t)=>{const e=i.length===1?i[0]:t.reduce((n,r,s)=>n+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+i[s+1],i[0]);return new zn(e,i,hi)},ws=(i,t)=>{if(ui)i.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const e of t){const n=document.createElement("style"),r=be.litNonce;r!==void 0&&n.setAttribute("nonce",r),n.textContent=e.cssText,i.appendChild(n)}},Ti=ui?i=>i:i=>i instanceof CSSStyleSheet?(t=>{let e="";for(const n of t.cssRules)e+=n.cssText;return xs(e)})(i):i;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:$s,defineProperty:Es,getOwnPropertyDescriptor:ks,getOwnPropertyNames:Cs,getOwnPropertySymbols:As,getPrototypeOf:Ss}=Object,Ot=globalThis,Pi=Ot.trustedTypes,Os=Pi?Pi.emptyScript:"",zi=Ot.reactiveElementPolyfillSupport,Vt=(i,t)=>i,_e={toAttribute(i,t){switch(t){case Boolean:i=i?Os:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,t){let e=i;switch(t){case Boolean:e=i!==null;break;case Number:e=i===null?null:Number(i);break;case Object:case Array:try{e=JSON.parse(i)}catch{e=null}}return e}},di=(i,t)=>!$s(i,t),Ri={attribute:!0,type:String,converter:_e,reflect:!1,hasChanged:di};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),Ot.litPropertyMetadata??(Ot.litPropertyMetadata=new WeakMap);class Et extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??(this.l=[])).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=Ri){if(e.state&&(e.attribute=!1),this._$Ei(),this.elementProperties.set(t,e),!e.noAccessor){const n=Symbol(),r=this.getPropertyDescriptor(t,n,e);r!==void 0&&Es(this.prototype,t,r)}}static getPropertyDescriptor(t,e,n){const{get:r,set:s}=ks(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get(){return r==null?void 0:r.call(this)},set(o){const a=r==null?void 0:r.call(this);s.call(this,o),this.requestUpdate(t,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Ri}static _$Ei(){if(this.hasOwnProperty(Vt("elementProperties")))return;const t=Ss(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(Vt("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(Vt("properties"))){const e=this.properties,n=[...Cs(e),...As(e)];for(const r of n)this.createProperty(r,e[r])}const t=this[Symbol.metadata];if(t!==null){const e=litPropertyMetadata.get(t);if(e!==void 0)for(const[n,r]of e)this.elementProperties.set(n,r)}this._$Eh=new Map;for(const[e,n]of this.elementProperties){const r=this._$Eu(e,n);r!==void 0&&this._$Eh.set(r,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const n=new Set(t.flat(1/0).reverse());for(const r of n)e.unshift(Ti(r))}else t!==void 0&&e.push(Ti(t));return e}static _$Eu(t,e){const n=e.attribute;return n===!1?void 0:typeof n=="string"?n:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var t;this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),(t=this.constructor.l)==null||t.forEach(e=>e(this))}addController(t){var e;(this._$EO??(this._$EO=new Set)).add(t),this.renderRoot!==void 0&&this.isConnected&&((e=t.hostConnected)==null||e.call(t))}removeController(t){var e;(e=this._$EO)==null||e.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const n of e.keys())this.hasOwnProperty(n)&&(t.set(n,this[n]),delete this[n]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ws(t,this.constructor.elementStyles),t}connectedCallback(){var t;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$EO)==null||t.forEach(e=>{var n;return(n=e.hostConnected)==null?void 0:n.call(e)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$EO)==null||t.forEach(e=>{var n;return(n=e.hostDisconnected)==null?void 0:n.call(e)})}attributeChangedCallback(t,e,n){this._$AK(t,n)}_$EC(t,e){var n;const r=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,r);if(s!==void 0&&r.reflect===!0){const o=(((n=r.converter)==null?void 0:n.toAttribute)!==void 0?r.converter:_e).toAttribute(e,r.type);this._$Em=t,o==null?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(t,e){var n;const r=this.constructor,s=r._$Eh.get(t);if(s!==void 0&&this._$Em!==s){const o=r.getPropertyOptions(s),a=typeof o.converter=="function"?{fromAttribute:o.converter}:((n=o.converter)==null?void 0:n.fromAttribute)!==void 0?o.converter:_e;this._$Em=s,this[s]=a.fromAttribute(e,o.type),this._$Em=null}}requestUpdate(t,e,n){if(t!==void 0){if(n??(n=this.constructor.getPropertyOptions(t)),!(n.hasChanged??di)(this[t],e))return;this.P(t,e,n)}this.isUpdatePending===!1&&(this._$ES=this._$ET())}P(t,e,n){this._$AL.has(t)||this._$AL.set(t,e),n.reflect===!0&&this._$Em!==t&&(this._$Ej??(this._$Ej=new Set)).add(t)}async _$ET(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var t;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[s,o]of this._$Ep)this[s]=o;this._$Ep=void 0}const r=this.constructor.elementProperties;if(r.size>0)for(const[s,o]of r)o.wrapped!==!0||this._$AL.has(s)||this[s]===void 0||this.P(s,this[s],o)}let e=!1;const n=this._$AL;try{e=this.shouldUpdate(n),e?(this.willUpdate(n),(t=this._$EO)==null||t.forEach(r=>{var s;return(s=r.hostUpdate)==null?void 0:s.call(r)}),this.update(n)):this._$EU()}catch(r){throw e=!1,this._$EU(),r}e&&this._$AE(n)}willUpdate(t){}_$AE(t){var e;(e=this._$EO)==null||e.forEach(n=>{var r;return(r=n.hostUpdated)==null?void 0:r.call(n)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EU(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Ej&&(this._$Ej=this._$Ej.forEach(e=>this._$EC(e,this[e]))),this._$EU()}updated(t){}firstUpdated(t){}}Et.elementStyles=[],Et.shadowRootOptions={mode:"open"},Et[Vt("elementProperties")]=new Map,Et[Vt("finalized")]=new Map,zi==null||zi({ReactiveElement:Et}),(Ot.reactiveElementVersions??(Ot.reactiveElementVersions=[])).push("2.0.4");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const xe=globalThis,we=xe.trustedTypes,Li=we?we.createPolicy("lit-html",{createHTML:i=>i}):void 0,Rn="$lit$",rt=`lit$${Math.random().toFixed(9).slice(2)}$`,Ln="?"+rt,Ts=`<${Ln}>`,gt=document,Xt=()=>gt.createComment(""),Zt=i=>i===null||typeof i!="object"&&typeof i!="function",pi=Array.isArray,Ps=i=>pi(i)||typeof(i==null?void 0:i[Symbol.iterator])=="function",qe=`[ 	
\f\r]`,Dt=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ji=/-->/g,Hi=/>/g,pt=RegExp(`>|${qe}(?:([^\\s"'>=/]+)(${qe}*=${qe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Mi=/'/g,Bi=/"/g,jn=/^(?:script|style|textarea|title)$/i,zs=i=>(t,...e)=>({_$litType$:i,strings:t,values:e}),m=zs(1),vt=Symbol.for("lit-noChange"),S=Symbol.for("lit-nothing"),Ii=new WeakMap,ft=gt.createTreeWalker(gt,129);function Hn(i,t){if(!pi(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return Li!==void 0?Li.createHTML(t):t}const Rs=(i,t)=>{const e=i.length-1,n=[];let r,s=t===2?"<svg>":t===3?"<math>":"",o=Dt;for(let a=0;a<e;a++){const l=i[a];let c,u,d=-1,f=0;for(;f<l.length&&(o.lastIndex=f,u=o.exec(l),u!==null);)f=o.lastIndex,o===Dt?u[1]==="!--"?o=ji:u[1]!==void 0?o=Hi:u[2]!==void 0?(jn.test(u[2])&&(r=RegExp("</"+u[2],"g")),o=pt):u[3]!==void 0&&(o=pt):o===pt?u[0]===">"?(o=r??Dt,d=-1):u[1]===void 0?d=-2:(d=o.lastIndex-u[2].length,c=u[1],o=u[3]===void 0?pt:u[3]==='"'?Bi:Mi):o===Bi||o===Mi?o=pt:o===ji||o===Hi?o=Dt:(o=pt,r=void 0);const p=o===pt&&i[a+1].startsWith("/>")?" ":"";s+=o===Dt?l+Ts:d>=0?(n.push(c),l.slice(0,d)+Rn+l.slice(d)+rt+p):l+rt+(d===-2?a:p)}return[Hn(i,s+(i[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),n]};class Gt{constructor({strings:t,_$litType$:e},n){let r;this.parts=[];let s=0,o=0;const a=t.length-1,l=this.parts,[c,u]=Rs(t,e);if(this.el=Gt.createElement(c,n),ft.currentNode=this.el.content,e===2||e===3){const d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(r=ft.nextNode())!==null&&l.length<a;){if(r.nodeType===1){if(r.hasAttributes())for(const d of r.getAttributeNames())if(d.endsWith(Rn)){const f=u[o++],p=r.getAttribute(d).split(rt),g=/([.?@])?(.*)/.exec(f);l.push({type:1,index:s,name:g[2],strings:p,ctor:g[1]==="."?js:g[1]==="?"?Hs:g[1]==="@"?Ms:Re}),r.removeAttribute(d)}else d.startsWith(rt)&&(l.push({type:6,index:s}),r.removeAttribute(d));if(jn.test(r.tagName)){const d=r.textContent.split(rt),f=d.length-1;if(f>0){r.textContent=we?we.emptyScript:"";for(let p=0;p<f;p++)r.append(d[p],Xt()),ft.nextNode(),l.push({type:2,index:++s});r.append(d[f],Xt())}}}else if(r.nodeType===8)if(r.data===Ln)l.push({type:2,index:s});else{let d=-1;for(;(d=r.data.indexOf(rt,d+1))!==-1;)l.push({type:7,index:s}),d+=rt.length-1}s++}}static createElement(t,e){const n=gt.createElement("template");return n.innerHTML=t,n}}function Tt(i,t,e=i,n){var r,s;if(t===vt)return t;let o=n!==void 0?(r=e._$Co)==null?void 0:r[n]:e._$Cl;const a=Zt(t)?void 0:t._$litDirective$;return(o==null?void 0:o.constructor)!==a&&((s=o==null?void 0:o._$AO)==null||s.call(o,!1),a===void 0?o=void 0:(o=new a(i),o._$AT(i,e,n)),n!==void 0?(e._$Co??(e._$Co=[]))[n]=o:e._$Cl=o),o!==void 0&&(t=Tt(i,o._$AS(i,t.values),o,n)),t}class Ls{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:n}=this._$AD,r=((t==null?void 0:t.creationScope)??gt).importNode(e,!0);ft.currentNode=r;let s=ft.nextNode(),o=0,a=0,l=n[0];for(;l!==void 0;){if(o===l.index){let c;l.type===2?c=new re(s,s.nextSibling,this,t):l.type===1?c=new l.ctor(s,l.name,l.strings,this,t):l.type===6&&(c=new Bs(s,this,t)),this._$AV.push(c),l=n[++a]}o!==(l==null?void 0:l.index)&&(s=ft.nextNode(),o++)}return ft.currentNode=gt,r}p(t){let e=0;for(const n of this._$AV)n!==void 0&&(n.strings!==void 0?(n._$AI(t,n,e),e+=n.strings.length-2):n._$AI(t[e])),e++}}class re{get _$AU(){var t;return((t=this._$AM)==null?void 0:t._$AU)??this._$Cv}constructor(t,e,n,r){this.type=2,this._$AH=S,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=n,this.options=r,this._$Cv=(r==null?void 0:r.isConnected)??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return e!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Tt(this,t,e),Zt(t)?t===S||t==null||t===""?(this._$AH!==S&&this._$AR(),this._$AH=S):t!==this._$AH&&t!==vt&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Ps(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==S&&Zt(this._$AH)?this._$AA.nextSibling.data=t:this.T(gt.createTextNode(t)),this._$AH=t}$(t){var e;const{values:n,_$litType$:r}=t,s=typeof r=="number"?this._$AC(t):(r.el===void 0&&(r.el=Gt.createElement(Hn(r.h,r.h[0]),this.options)),r);if(((e=this._$AH)==null?void 0:e._$AD)===s)this._$AH.p(n);else{const o=new Ls(s,this),a=o.u(this.options);o.p(n),this.T(a),this._$AH=o}}_$AC(t){let e=Ii.get(t.strings);return e===void 0&&Ii.set(t.strings,e=new Gt(t)),e}k(t){pi(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let n,r=0;for(const s of t)r===e.length?e.push(n=new re(this.O(Xt()),this.O(Xt()),this,this.options)):n=e[r],n._$AI(s),r++;r<e.length&&(this._$AR(n&&n._$AB.nextSibling,r),e.length=r)}_$AR(t=this._$AA.nextSibling,e){var n;for((n=this._$AP)==null?void 0:n.call(this,!1,!0,e);t&&t!==this._$AB;){const r=t.nextSibling;t.remove(),t=r}}setConnected(t){var e;this._$AM===void 0&&(this._$Cv=t,(e=this._$AP)==null||e.call(this,t))}}class Re{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,n,r,s){this.type=1,this._$AH=S,this._$AN=void 0,this.element=t,this.name=e,this._$AM=r,this.options=s,n.length>2||n[0]!==""||n[1]!==""?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=S}_$AI(t,e=this,n,r){const s=this.strings;let o=!1;if(s===void 0)t=Tt(this,t,e,0),o=!Zt(t)||t!==this._$AH&&t!==vt,o&&(this._$AH=t);else{const a=t;let l,c;for(t=s[0],l=0;l<s.length-1;l++)c=Tt(this,a[n+l],e,l),c===vt&&(c=this._$AH[l]),o||(o=!Zt(c)||c!==this._$AH[l]),c===S?t=S:t!==S&&(t+=(c??"")+s[l+1]),this._$AH[l]=c}o&&!r&&this.j(t)}j(t){t===S?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class js extends Re{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===S?void 0:t}}class Hs extends Re{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==S)}}class Ms extends Re{constructor(t,e,n,r,s){super(t,e,n,r,s),this.type=5}_$AI(t,e=this){if((t=Tt(this,t,e,0)??S)===vt)return;const n=this._$AH,r=t===S&&n!==S||t.capture!==n.capture||t.once!==n.once||t.passive!==n.passive,s=t!==S&&(n===S||r);r&&this.element.removeEventListener(this.name,this,n),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var e;typeof this._$AH=="function"?this._$AH.call(((e=this.options)==null?void 0:e.host)??this.element,t):this._$AH.handleEvent(t)}}class Bs{constructor(t,e,n){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(t){Tt(this,t)}}const Fi=xe.litHtmlPolyfillSupport;Fi==null||Fi(Gt,re),(xe.litHtmlVersions??(xe.litHtmlVersions=[])).push("3.2.1");const Pt=(i,t,e)=>{const n=(e==null?void 0:e.renderBefore)??t;let r=n._$litPart$;if(r===void 0){const s=(e==null?void 0:e.renderBefore)??null;n._$litPart$=r=new re(t.insertBefore(Xt(),s),s,void 0,e??{})}return r._$AI(i),r};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let E=class extends Et{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var i;const t=super.createRenderRoot();return(i=this.renderOptions).renderBefore??(i.renderBefore=t.firstChild),t}update(i){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(i),this._$Do=Pt(t,this.renderRoot,this.renderOptions)}connectedCallback(){var i;super.connectedCallback(),(i=this._$Do)==null||i.setConnected(!0)}disconnectedCallback(){var i;super.disconnectedCallback(),(i=this._$Do)==null||i.setConnected(!1)}render(){return vt}};var Ni;E._$litElement$=!0,E.finalized=!0,(Ni=globalThis.litElementHydrateSupport)==null||Ni.call(globalThis,{LitElement:E});const qi=globalThis.litElementPolyfillSupport;qi==null||qi({LitElement:E});(globalThis.litElementVersions??(globalThis.litElementVersions=[])).push("4.1.1");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Is={attribute:!0,type:String,converter:_e,reflect:!1,hasChanged:di},Fs=(i=Is,t,e)=>{const{kind:n,metadata:r}=e;let s=globalThis.litPropertyMetadata.get(r);if(s===void 0&&globalThis.litPropertyMetadata.set(r,s=new Map),s.set(e.name,i),n==="accessor"){const{name:o}=e;return{set(a){const l=t.get.call(this);t.set.call(this,a),this.requestUpdate(o,l,i)},init(a){return a!==void 0&&this.P(o,void 0,i),a}}}if(n==="setter"){const{name:o}=e;return function(a){const l=this[o];t.call(this,a),this.requestUpdate(o,l,i)}}throw Error("Unsupported decorator location: "+n)};function h(i){return(t,e)=>typeof e=="object"?Fs(i,t,e):((n,r,s)=>{const o=r.hasOwnProperty(s);return r.constructor.createProperty(s,o?{...n,wrapped:!0}:n),o?Object.getOwnPropertyDescriptor(r,s):void 0})(i,t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Lt(i){return h({...i,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ns=i=>i.strings===void 0;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Mn={ATTRIBUTE:1,CHILD:2},Bn=i=>(...t)=>({_$litDirective$:i,values:t});let In=class{constructor(i){}get _$AU(){return this._$AM._$AU}_$AT(i,t,e){this._$Ct=i,this._$AM=t,this._$Ci=e}_$AS(i,t){return this.update(i,t)}update(i,t){return this.render(...t)}};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Yt=(i,t)=>{var e;const n=i._$AN;if(n===void 0)return!1;for(const r of n)(e=r._$AO)==null||e.call(r,t,!1),Yt(r,t);return!0},$e=i=>{let t,e;do{if((t=i._$AM)===void 0)break;e=t._$AN,e.delete(i),i=t}while((e==null?void 0:e.size)===0)},Fn=i=>{for(let t;t=i._$AM;i=t){let e=t._$AN;if(e===void 0)t._$AN=e=new Set;else if(e.has(i))break;e.add(i),Us(t)}};function qs(i){this._$AN!==void 0?($e(this),this._$AM=i,Fn(this)):this._$AM=i}function Ds(i,t=!1,e=0){const n=this._$AH,r=this._$AN;if(r!==void 0&&r.size!==0)if(t)if(Array.isArray(n))for(let s=e;s<n.length;s++)Yt(n[s],!1),$e(n[s]);else n!=null&&(Yt(n,!1),$e(n));else Yt(this,i)}const Us=i=>{i.type==Mn.CHILD&&(i._$AP??(i._$AP=Ds),i._$AQ??(i._$AQ=qs))};class Vs extends In{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,e,n){super._$AT(t,e,n),Fn(this),this.isConnected=t._$AU}_$AO(t,e=!0){var n,r;t!==this.isConnected&&(this.isConnected=t,t?(n=this.reconnected)==null||n.call(this):(r=this.disconnected)==null||r.call(this)),e&&(Yt(this,t),$e(this))}setValue(t){if(Ns(this._$Ct))this._$Ct._$AI(t,this);else{const e=[...this._$Ct._$AH];e[this._$Ci]=t,this._$Ct._$AI(e,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const zt=()=>new Ys;class Ys{}const De=new WeakMap,Rt=Bn(class extends Vs{render(i){return S}update(i,[t]){var e;const n=t!==this.Y;return n&&this.Y!==void 0&&this.rt(void 0),(n||this.lt!==this.ct)&&(this.Y=t,this.ht=(e=i.options)==null?void 0:e.host,this.rt(this.ct=i.element)),S}rt(i){if(this.isConnected||(i=void 0),typeof this.Y=="function"){const t=this.ht??globalThis;let e=De.get(t);e===void 0&&(e=new WeakMap,De.set(t,e)),e.get(this.Y)!==void 0&&this.Y.call(this.ht,void 0),e.set(this.Y,i),i!==void 0&&this.Y.call(this.ht,i)}else this.Y.value=i}get lt(){var i,t;return typeof this.Y=="function"?(i=De.get(this.ht??globalThis))==null?void 0:i.get(this.Y):(t=this.Y)==null?void 0:t.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});/**
* (c) Iconify
*
* For the full copyright and license information, please view the license.txt
* files at https://github.com/iconify/iconify
*
* Licensed under MIT.
*
* @license MIT
* @version 2.0.0
*/const Nn=Object.freeze({left:0,top:0,width:16,height:16}),Ee=Object.freeze({rotate:0,vFlip:!1,hFlip:!1}),se=Object.freeze({...Nn,...Ee}),Je=Object.freeze({...se,body:"",hidden:!1}),Ws=Object.freeze({width:null,height:null}),qn=Object.freeze({...Ws,...Ee});function Qs(i,t=0){const e=i.replace(/^-?[0-9.]*/,"");function n(r){for(;r<0;)r+=4;return r%4}if(e===""){const r=parseInt(i);return isNaN(r)?0:n(r)}else if(e!==i){let r=0;switch(e){case"%":r=25;break;case"deg":r=90}if(r){let s=parseFloat(i.slice(0,i.length-e.length));return isNaN(s)?0:(s=s/r,s%1===0?n(s):0)}}return t}const Js=/[\s,]+/;function Xs(i,t){t.split(Js).forEach(e=>{switch(e.trim()){case"horizontal":i.hFlip=!0;break;case"vertical":i.vFlip=!0;break}})}const Dn={...qn,preserveAspectRatio:""};function Di(i){const t={...Dn},e=(n,r)=>i.getAttribute(n)||r;return t.width=e("width",null),t.height=e("height",null),t.rotate=Qs(e("rotate","")),Xs(t,e("flip","")),t.preserveAspectRatio=e("preserveAspectRatio",e("preserveaspectratio","")),t}function Zs(i,t){for(const e in Dn)if(i[e]!==t[e])return!0;return!1}const Wt=/^[a-z0-9]+(-[a-z0-9]+)*$/,oe=(i,t,e,n="")=>{const r=i.split(":");if(i.slice(0,1)==="@"){if(r.length<2||r.length>3)return null;n=r.shift().slice(1)}if(r.length>3||!r.length)return null;if(r.length>1){const a=r.pop(),l=r.pop(),c={provider:r.length>0?r[0]:n,prefix:l,name:a};return t&&!ge(c)?null:c}const s=r[0],o=s.split("-");if(o.length>1){const a={provider:n,prefix:o.shift(),name:o.join("-")};return t&&!ge(a)?null:a}if(e&&n===""){const a={provider:n,prefix:"",name:s};return t&&!ge(a,e)?null:a}return null},ge=(i,t)=>i?!!((i.provider===""||i.provider.match(Wt))&&(t&&i.prefix===""||i.prefix.match(Wt))&&i.name.match(Wt)):!1;function Gs(i,t){const e={};!i.hFlip!=!t.hFlip&&(e.hFlip=!0),!i.vFlip!=!t.vFlip&&(e.vFlip=!0);const n=((i.rotate||0)+(t.rotate||0))%4;return n&&(e.rotate=n),e}function Ui(i,t){const e=Gs(i,t);for(const n in Je)n in Ee?n in i&&!(n in e)&&(e[n]=Ee[n]):n in t?e[n]=t[n]:n in i&&(e[n]=i[n]);return e}function Ks(i,t){const e=i.icons,n=i.aliases||Object.create(null),r=Object.create(null);function s(o){if(e[o])return r[o]=[];if(!(o in r)){r[o]=null;const a=n[o]&&n[o].parent,l=a&&s(a);l&&(r[o]=[a].concat(l))}return r[o]}return Object.keys(e).concat(Object.keys(n)).forEach(s),r}function to(i,t,e){const n=i.icons,r=i.aliases||Object.create(null);let s={};function o(a){s=Ui(n[a]||r[a],s)}return o(t),e.forEach(o),Ui(i,s)}function Un(i,t){const e=[];if(typeof i!="object"||typeof i.icons!="object")return e;i.not_found instanceof Array&&i.not_found.forEach(r=>{t(r,null),e.push(r)});const n=Ks(i);for(const r in n){const s=n[r];s&&(t(r,to(i,r,s)),e.push(r))}return e}const eo={provider:"",aliases:{},not_found:{},...Nn};function Ue(i,t){for(const e in t)if(e in i&&typeof i[e]!=typeof t[e])return!1;return!0}function Vn(i){if(typeof i!="object"||i===null)return null;const t=i;if(typeof t.prefix!="string"||!i.icons||typeof i.icons!="object"||!Ue(i,eo))return null;const e=t.icons;for(const r in e){const s=e[r];if(!r.match(Wt)||typeof s.body!="string"||!Ue(s,Je))return null}const n=t.aliases||Object.create(null);for(const r in n){const s=n[r],o=s.parent;if(!r.match(Wt)||typeof o!="string"||!e[o]&&!n[o]||!Ue(s,Je))return null}return t}const ke=Object.create(null);function io(i,t){return{provider:i,prefix:t,icons:Object.create(null),missing:new Set}}function at(i,t){const e=ke[i]||(ke[i]=Object.create(null));return e[t]||(e[t]=io(i,t))}function fi(i,t){return Vn(t)?Un(t,(e,n)=>{n?i.icons[e]=n:i.missing.add(e)}):[]}function no(i,t,e){try{if(typeof e.body=="string")return i.icons[t]={...e},!0}catch{}return!1}function ro(i,t){let e=[];return(typeof i=="string"?[i]:Object.keys(ke)).forEach(n=>{(typeof n=="string"&&typeof t=="string"?[t]:Object.keys(ke[n]||{})).forEach(r=>{const s=at(n,r);e=e.concat(Object.keys(s.icons).map(o=>(n!==""?"@"+n+":":"")+r+":"+o))})}),e}let Kt=!1;function Yn(i){return typeof i=="boolean"&&(Kt=i),Kt}function te(i){const t=typeof i=="string"?oe(i,!0,Kt):i;if(t){const e=at(t.provider,t.prefix),n=t.name;return e.icons[n]||(e.missing.has(n)?null:void 0)}}function Wn(i,t){const e=oe(i,!0,Kt);if(!e)return!1;const n=at(e.provider,e.prefix);return no(n,e.name,t)}function Vi(i,t){if(typeof i!="object")return!1;if(typeof t!="string"&&(t=i.provider||""),Kt&&!t&&!i.prefix){let r=!1;return Vn(i)&&(i.prefix="",Un(i,(s,o)=>{o&&Wn(s,o)&&(r=!0)})),r}const e=i.prefix;if(!ge({provider:t,prefix:e,name:"a"}))return!1;const n=at(t,e);return!!fi(n,i)}function Yi(i){return!!te(i)}function so(i){const t=te(i);return t?{...se,...t}:null}function oo(i){const t={loaded:[],missing:[],pending:[]},e=Object.create(null);i.sort((r,s)=>r.provider!==s.provider?r.provider.localeCompare(s.provider):r.prefix!==s.prefix?r.prefix.localeCompare(s.prefix):r.name.localeCompare(s.name));let n={provider:"",prefix:"",name:""};return i.forEach(r=>{if(n.name===r.name&&n.prefix===r.prefix&&n.provider===r.provider)return;n=r;const s=r.provider,o=r.prefix,a=r.name,l=e[s]||(e[s]=Object.create(null)),c=l[o]||(l[o]=at(s,o));let u;a in c.icons?u=t.loaded:o===""||c.missing.has(a)?u=t.missing:u=t.pending;const d={provider:s,prefix:o,name:a};u.push(d)}),t}function Qn(i,t){i.forEach(e=>{const n=e.loaderCallbacks;n&&(e.loaderCallbacks=n.filter(r=>r.id!==t))})}function ao(i){i.pendingCallbacksFlag||(i.pendingCallbacksFlag=!0,setTimeout(()=>{i.pendingCallbacksFlag=!1;const t=i.loaderCallbacks?i.loaderCallbacks.slice(0):[];if(!t.length)return;let e=!1;const n=i.provider,r=i.prefix;t.forEach(s=>{const o=s.icons,a=o.pending.length;o.pending=o.pending.filter(l=>{if(l.prefix!==r)return!0;const c=l.name;if(i.icons[c])o.loaded.push({provider:n,prefix:r,name:c});else if(i.missing.has(c))o.missing.push({provider:n,prefix:r,name:c});else return e=!0,!0;return!1}),o.pending.length!==a&&(e||Qn([i],s.id),s.callback(o.loaded.slice(0),o.missing.slice(0),o.pending.slice(0),s.abort))})}))}let lo=0;function co(i,t,e){const n=lo++,r=Qn.bind(null,e,n);if(!t.pending.length)return r;const s={id:n,icons:t,callback:i,abort:r};return e.forEach(o=>{(o.loaderCallbacks||(o.loaderCallbacks=[])).push(s)}),r}const Xe=Object.create(null);function Wi(i,t){Xe[i]=t}function Ze(i){return Xe[i]||Xe[""]}function uo(i,t=!0,e=!1){const n=[];return i.forEach(r=>{const s=typeof r=="string"?oe(r,t,e):r;s&&n.push(s)}),n}var ho={resources:[],index:0,timeout:2e3,rotate:750,random:!1,dataAfterTimeout:!1};function po(i,t,e,n){const r=i.resources.length,s=i.random?Math.floor(Math.random()*r):i.index;let o;if(i.random){let _=i.resources.slice(0);for(o=[];_.length>1;){const z=Math.floor(Math.random()*_.length);o.push(_[z]),_=_.slice(0,z).concat(_.slice(z+1))}o=o.concat(_)}else o=i.resources.slice(s).concat(i.resources.slice(0,s));const a=Date.now();let l="pending",c=0,u,d=null,f=[],p=[];typeof n=="function"&&p.push(n);function g(){d&&(clearTimeout(d),d=null)}function v(){l==="pending"&&(l="aborted"),g(),f.forEach(_=>{_.status==="pending"&&(_.status="aborted")}),f=[]}function b(_,z){z&&(p=[]),typeof _=="function"&&p.push(_)}function $(){return{startTime:a,payload:t,status:l,queriesSent:c,queriesPending:f.length,subscribe:b,abort:v}}function x(){l="failed",p.forEach(_=>{_(void 0,u)})}function y(){f.forEach(_=>{_.status==="pending"&&(_.status="aborted")}),f=[]}function k(_,z,q){const D=z!=="success";switch(f=f.filter(A=>A!==_),l){case"pending":break;case"failed":if(D||!i.dataAfterTimeout)return;break;default:return}if(z==="abort"){u=q,x();return}if(D){u=q,f.length||(o.length?P():x());return}if(g(),y(),!i.random){const A=i.resources.indexOf(_.resource);A!==-1&&A!==i.index&&(i.index=A)}l="completed",p.forEach(A=>{A(q)})}function P(){if(l!=="pending")return;g();const _=o.shift();if(_===void 0){if(f.length){d=setTimeout(()=>{g(),l==="pending"&&(y(),x())},i.timeout);return}x();return}const z={status:"pending",resource:_,callback:(q,D)=>{k(z,q,D)}};f.push(z),c++,d=setTimeout(P,i.rotate),e(_,t,z.callback)}return setTimeout(P),$}function Jn(i){const t={...ho,...i};let e=[];function n(){e=e.filter(o=>o().status==="pending")}function r(o,a,l){const c=po(t,o,a,(u,d)=>{n(),l&&l(u,d)});return e.push(c),c}function s(o){return e.find(a=>o(a))||null}return{query:r,find:s,setIndex:o=>{t.index=o},getIndex:()=>t.index,cleanup:n}}function mi(i){let t;if(typeof i.resources=="string")t=[i.resources];else if(t=i.resources,!(t instanceof Array)||!t.length)return null;return{resources:t,path:i.path||"/",maxURL:i.maxURL||500,rotate:i.rotate||750,timeout:i.timeout||5e3,random:i.random===!0,index:i.index||0,dataAfterTimeout:i.dataAfterTimeout!==!1}}const Le=Object.create(null),fe=["https://api.simplesvg.com","https://api.unisvg.com"],Ge=[];for(;fe.length>0;)fe.length===1||Math.random()>.5?Ge.push(fe.shift()):Ge.push(fe.pop());Le[""]=mi({resources:["https://api.iconify.design"].concat(Ge)});function Qi(i,t){const e=mi(t);return e===null?!1:(Le[i]=e,!0)}function je(i){return Le[i]}function fo(){return Object.keys(Le)}function Ji(){}const Ve=Object.create(null);function mo(i){if(!Ve[i]){const t=je(i);if(!t)return;const e=Jn(t),n={config:t,redundancy:e};Ve[i]=n}return Ve[i]}function Xn(i,t,e){let n,r;if(typeof i=="string"){const s=Ze(i);if(!s)return e(void 0,424),Ji;r=s.send;const o=mo(i);o&&(n=o.redundancy)}else{const s=mi(i);if(s){n=Jn(s);const o=i.resources?i.resources[0]:"",a=Ze(o);a&&(r=a.send)}}return!n||!r?(e(void 0,424),Ji):n.query(t,r,e)().abort}const Xi="iconify2",ee="iconify",Zn=ee+"-count",Zi=ee+"-version",Gn=36e5,bo=168,go=50;function Ke(i,t){try{return i.getItem(t)}catch{}}function bi(i,t,e){try{return i.setItem(t,e),!0}catch{}}function Gi(i,t){try{i.removeItem(t)}catch{}}function ti(i,t){return bi(i,Zn,t.toString())}function ei(i){return parseInt(Ke(i,Zn))||0}const mt={local:!0,session:!0},Kn={local:new Set,session:new Set};let gi=!1;function vo(i){gi=i}let me=typeof window>"u"?{}:window;function tr(i){const t=i+"Storage";try{if(me&&me[t]&&typeof me[t].length=="number")return me[t]}catch{}mt[i]=!1}function er(i,t){const e=tr(i);if(!e)return;const n=Ke(e,Zi);if(n!==Xi){if(n){const a=ei(e);for(let l=0;l<a;l++)Gi(e,ee+l.toString())}bi(e,Zi,Xi),ti(e,0);return}const r=Math.floor(Date.now()/Gn)-bo,s=a=>{const l=ee+a.toString(),c=Ke(e,l);if(typeof c=="string"){try{const u=JSON.parse(c);if(typeof u=="object"&&typeof u.cached=="number"&&u.cached>r&&typeof u.provider=="string"&&typeof u.data=="object"&&typeof u.data.prefix=="string"&&t(u,a))return!0}catch{}Gi(e,l)}};let o=ei(e);for(let a=o-1;a>=0;a--)s(a)||(a===o-1?(o--,ti(e,o)):Kn[i].add(a))}function ir(){if(!gi){vo(!0);for(const i in mt)er(i,t=>{const e=t.data,n=t.provider,r=e.prefix,s=at(n,r);if(!fi(s,e).length)return!1;const o=e.lastModified||-1;return s.lastModifiedCached=s.lastModifiedCached?Math.min(s.lastModifiedCached,o):o,!0})}}function yo(i,t){const e=i.lastModifiedCached;if(e&&e>=t)return e===t;if(i.lastModifiedCached=t,e)for(const n in mt)er(n,r=>{const s=r.data;return r.provider!==i.provider||s.prefix!==i.prefix||s.lastModified===t});return!0}function _o(i,t){gi||ir();function e(n){let r;if(!mt[n]||!(r=tr(n)))return;const s=Kn[n];let o;if(s.size)s.delete(o=Array.from(s).shift());else if(o=ei(r),o>=go||!ti(r,o+1))return;const a={cached:Math.floor(Date.now()/Gn),provider:i.provider,data:t};return bi(r,ee+o.toString(),JSON.stringify(a))}t.lastModified&&!yo(i,t.lastModified)||Object.keys(t.icons).length&&(t.not_found&&(t=Object.assign({},t),delete t.not_found),e("local")||e("session"))}function Ki(){}function xo(i){i.iconsLoaderFlag||(i.iconsLoaderFlag=!0,setTimeout(()=>{i.iconsLoaderFlag=!1,ao(i)}))}function wo(i,t){i.iconsToLoad?i.iconsToLoad=i.iconsToLoad.concat(t).sort():i.iconsToLoad=t,i.iconsQueueFlag||(i.iconsQueueFlag=!0,setTimeout(()=>{i.iconsQueueFlag=!1;const{provider:e,prefix:n}=i,r=i.iconsToLoad;delete i.iconsToLoad;let s;!r||!(s=Ze(e))||s.prepare(e,n,r).forEach(o=>{Xn(e,o,a=>{if(typeof a!="object")o.icons.forEach(l=>{i.missing.add(l)});else try{const l=fi(i,a);if(!l.length)return;const c=i.pendingIcons;c&&l.forEach(u=>{c.delete(u)}),_o(i,a)}catch(l){console.error(l)}xo(i)})})}))}const vi=(i,t)=>{const e=uo(i,!0,Yn()),n=oo(e);if(!n.pending.length){let l=!0;return t&&setTimeout(()=>{l&&t(n.loaded,n.missing,n.pending,Ki)}),()=>{l=!1}}const r=Object.create(null),s=[];let o,a;return n.pending.forEach(l=>{const{provider:c,prefix:u}=l;if(u===a&&c===o)return;o=c,a=u,s.push(at(c,u));const d=r[c]||(r[c]=Object.create(null));d[u]||(d[u]=[])}),n.pending.forEach(l=>{const{provider:c,prefix:u,name:d}=l,f=at(c,u),p=f.pendingIcons||(f.pendingIcons=new Set);p.has(d)||(p.add(d),r[c][u].push(d))}),s.forEach(l=>{const{provider:c,prefix:u}=l;r[c][u].length&&wo(l,r[c][u])}),t?co(t,n,s):Ki},$o=i=>new Promise((t,e)=>{const n=typeof i=="string"?oe(i,!0):i;if(!n){e(i);return}vi([n||i],r=>{if(r.length&&n){const s=te(n);if(s){t({...se,...s});return}}e(i)})});function Eo(i){try{const t=typeof i=="string"?JSON.parse(i):i;if(typeof t.body=="string")return{...t}}catch{}}function ko(i,t){const e=typeof i=="string"?oe(i,!0,!0):null;if(!e){const s=Eo(i);return{value:i,data:s}}const n=te(e);if(n!==void 0||!e.prefix)return{value:i,name:e,data:n};const r=vi([e],()=>t(i,e,te(e)));return{value:i,name:e,loading:r}}function Ye(i){return i.hasAttribute("inline")}let nr=!1;try{nr=navigator.vendor.indexOf("Apple")===0}catch{}function Co(i,t){switch(t){case"svg":case"bg":case"mask":return t}return t!=="style"&&(nr||i.indexOf("<a")===-1)?"svg":i.indexOf("currentColor")===-1?"bg":"mask"}const Ao=/(-?[0-9.]*[0-9]+[0-9.]*)/g,So=/^-?[0-9.]*[0-9]+[0-9.]*$/g;function ii(i,t,e){if(t===1)return i;if(e=e||100,typeof i=="number")return Math.ceil(i*t*e)/e;if(typeof i!="string")return i;const n=i.split(Ao);if(n===null||!n.length)return i;const r=[];let s=n.shift(),o=So.test(s);for(;;){if(o){const a=parseFloat(s);isNaN(a)?r.push(s):r.push(Math.ceil(a*t*e)/e)}else r.push(s);if(s=n.shift(),s===void 0)return r.join("");o=!o}}function Oo(i,t="defs"){let e="";const n=i.indexOf("<"+t);for(;n>=0;){const r=i.indexOf(">",n),s=i.indexOf("</"+t);if(r===-1||s===-1)break;const o=i.indexOf(">",s);if(o===-1)break;e+=i.slice(r+1,s).trim(),i=i.slice(0,n).trim()+i.slice(o+1)}return{defs:e,content:i}}function To(i,t){return i?"<defs>"+i+"</defs>"+t:t}function Po(i,t,e){const n=Oo(i);return To(n.defs,t+n.content+e)}const zo=i=>i==="unset"||i==="undefined"||i==="none";function rr(i,t){const e={...se,...i},n={...qn,...t},r={left:e.left,top:e.top,width:e.width,height:e.height};let s=e.body;[e,n].forEach(v=>{const b=[],$=v.hFlip,x=v.vFlip;let y=v.rotate;$?x?y+=2:(b.push("translate("+(r.width+r.left).toString()+" "+(0-r.top).toString()+")"),b.push("scale(-1 1)"),r.top=r.left=0):x&&(b.push("translate("+(0-r.left).toString()+" "+(r.height+r.top).toString()+")"),b.push("scale(1 -1)"),r.top=r.left=0);let k;switch(y<0&&(y-=Math.floor(y/4)*4),y=y%4,y){case 1:k=r.height/2+r.top,b.unshift("rotate(90 "+k.toString()+" "+k.toString()+")");break;case 2:b.unshift("rotate(180 "+(r.width/2+r.left).toString()+" "+(r.height/2+r.top).toString()+")");break;case 3:k=r.width/2+r.left,b.unshift("rotate(-90 "+k.toString()+" "+k.toString()+")");break}y%2===1&&(r.left!==r.top&&(k=r.left,r.left=r.top,r.top=k),r.width!==r.height&&(k=r.width,r.width=r.height,r.height=k)),b.length&&(s=Po(s,'<g transform="'+b.join(" ")+'">',"</g>"))});const o=n.width,a=n.height,l=r.width,c=r.height;let u,d;o===null?(d=a===null?"1em":a==="auto"?c:a,u=ii(d,l/c)):(u=o==="auto"?l:o,d=a===null?ii(u,c/l):a==="auto"?c:a);const f={},p=(v,b)=>{zo(b)||(f[v]=b.toString())};p("width",u),p("height",d);const g=[r.left,r.top,l,c];return f.viewBox=g.join(" "),{attributes:f,viewBox:g,body:s}}function yi(i,t){let e=i.indexOf("xlink:")===-1?"":' xmlns:xlink="http://www.w3.org/1999/xlink"';for(const n in t)e+=" "+n+'="'+t[n]+'"';return'<svg xmlns="http://www.w3.org/2000/svg"'+e+">"+i+"</svg>"}function Ro(i){return i.replace(/"/g,"'").replace(/%/g,"%25").replace(/#/g,"%23").replace(/</g,"%3C").replace(/>/g,"%3E").replace(/\s+/g," ")}function Lo(i){return"data:image/svg+xml,"+Ro(i)}function sr(i){return'url("'+Lo(i)+'")'}const jo=()=>{let i;try{if(i=fetch,typeof i=="function")return i}catch{}};let Ce=jo();function Ho(i){Ce=i}function Mo(){return Ce}function Bo(i,t){const e=je(i);if(!e)return 0;let n;if(!e.maxURL)n=0;else{let r=0;e.resources.forEach(o=>{r=Math.max(r,o.length)});const s=t+".json?icons=";n=e.maxURL-r-e.path.length-s.length}return n}function Io(i){return i===404}const Fo=(i,t,e)=>{const n=[],r=Bo(i,t),s="icons";let o={type:s,provider:i,prefix:t,icons:[]},a=0;return e.forEach((l,c)=>{a+=l.length+1,a>=r&&c>0&&(n.push(o),o={type:s,provider:i,prefix:t,icons:[]},a=l.length),o.icons.push(l)}),n.push(o),n};function No(i){if(typeof i=="string"){const t=je(i);if(t)return t.path}return"/"}const qo=(i,t,e)=>{if(!Ce){e("abort",424);return}let n=No(t.provider);switch(t.type){case"icons":{const s=t.prefix,o=t.icons.join(","),a=new URLSearchParams({icons:o});n+=s+".json?"+a.toString();break}case"custom":{const s=t.uri;n+=s.slice(0,1)==="/"?s.slice(1):s;break}default:e("abort",400);return}let r=503;Ce(i+n).then(s=>{const o=s.status;if(o!==200){setTimeout(()=>{e(Io(o)?"abort":"next",o)});return}return r=501,s.json()}).then(s=>{if(typeof s!="object"||s===null){setTimeout(()=>{s===404?e("abort",s):e("next",r)});return}setTimeout(()=>{e("success",s)})}).catch(()=>{e("next",r)})},Do={prepare:Fo,send:qo};function tn(i,t){switch(i){case"local":case"session":mt[i]=t;break;case"all":for(const e in mt)mt[e]=t;break}}const We="data-style";let or="";function Uo(i){or=i}function en(i,t){let e=Array.from(i.childNodes).find(n=>n.hasAttribute&&n.hasAttribute(We));e||(e=document.createElement("style"),e.setAttribute(We,We),i.appendChild(e)),e.textContent=":host{display:inline-block;vertical-align:"+(t?"-0.125em":"0")+"}span,svg{display:block}"+or}function ar(){Wi("",Do),Yn(!0);let i;try{i=window}catch{}if(i){if(ir(),i.IconifyPreload!==void 0){const t=i.IconifyPreload,e="Invalid IconifyPreload syntax.";typeof t=="object"&&t!==null&&(t instanceof Array?t:[t]).forEach(n=>{try{(typeof n!="object"||n===null||n instanceof Array||typeof n.icons!="object"||typeof n.prefix!="string"||!Vi(n))&&console.error(e)}catch{console.error(e)}})}if(i.IconifyProviders!==void 0){const t=i.IconifyProviders;if(typeof t=="object"&&t!==null)for(const e in t){const n="IconifyProviders["+e+"] is invalid.";try{const r=t[e];if(typeof r!="object"||!r||r.resources===void 0)continue;Qi(e,r)||console.error(n)}catch{console.error(n)}}}}return{enableCache:t=>tn(t,!0),disableCache:t=>tn(t,!1),iconLoaded:Yi,iconExists:Yi,getIcon:so,listIcons:ro,addIcon:Wn,addCollection:Vi,calculateSize:ii,buildIcon:rr,iconToHTML:yi,svgToURL:sr,loadIcons:vi,loadIcon:$o,addAPIProvider:Qi,appendCustomStyle:Uo,_api:{getAPIConfig:je,setAPIModule:Wi,sendAPIQuery:Xn,setFetch:Ho,getFetch:Mo,listAPIProviders:fo}}}const ni={"background-color":"currentColor"},lr={"background-color":"transparent"},nn={image:"var(--svg)",repeat:"no-repeat",size:"100% 100%"},rn={"-webkit-mask":ni,mask:ni,background:lr};for(const i in rn){const t=rn[i];for(const e in nn)t[i+"-"+e]=nn[e]}function sn(i){return i?i+(i.match(/^[-0-9.]+$/)?"px":""):"inherit"}function Vo(i,t,e){const n=document.createElement("span");let r=i.body;r.indexOf("<a")!==-1&&(r+="<!-- "+Date.now()+" -->");const s=i.attributes,o=yi(r,{...s,width:t.width+"",height:t.height+""}),a=sr(o),l=n.style,c={"--svg":a,width:sn(s.width),height:sn(s.height),...e?ni:lr};for(const u in c)l.setProperty(u,c[u]);return n}let Qt;function Yo(){try{Qt=window.trustedTypes.createPolicy("iconify",{createHTML:i=>i})}catch{Qt=null}}function Wo(i){return Qt===void 0&&Yo(),Qt?Qt.createHTML(i):i}function Qo(i){const t=document.createElement("span"),e=i.attributes;let n="";e.width||(n="width: inherit;"),e.height||(n+="height: inherit;"),n&&(e.style=n);const r=yi(i.body,e);return t.innerHTML=Wo(r),t.firstChild}function ri(i){return Array.from(i.childNodes).find(t=>{const e=t.tagName&&t.tagName.toUpperCase();return e==="SPAN"||e==="SVG"})}function on(i,t){const e=t.icon.data,n=t.customisations,r=rr(e,n);n.preserveAspectRatio&&(r.attributes.preserveAspectRatio=n.preserveAspectRatio);const s=t.renderedMode;let o;switch(s){case"svg":o=Qo(r);break;default:o=Vo(r,{...se,...e},s==="mask")}const a=ri(i);a?o.tagName==="SPAN"&&a.tagName===o.tagName?a.setAttribute("style",o.getAttribute("style")):i.replaceChild(o,a):i.appendChild(o)}function an(i,t,e){const n=e&&(e.rendered?e:e.lastRender);return{rendered:!1,inline:t,icon:i,lastRender:n}}function Jo(i="iconify-icon"){let t,e;try{t=window.customElements,e=window.HTMLElement}catch{return}if(!t||!e)return;const n=t.get(i);if(n)return n;const r=["icon","mode","inline","observe","width","height","rotate","flip"],s=class extends e{constructor(){super(),dt(this,"_shadowRoot"),dt(this,"_initialised",!1),dt(this,"_state"),dt(this,"_checkQueued",!1),dt(this,"_connected",!1),dt(this,"_observer",null),dt(this,"_visible",!0);const a=this._shadowRoot=this.attachShadow({mode:"open"}),l=Ye(this);en(a,l),this._state=an({value:""},l),this._queueCheck()}connectedCallback(){this._connected=!0,this.startObserver()}disconnectedCallback(){this._connected=!1,this.stopObserver()}static get observedAttributes(){return r.slice(0)}attributeChangedCallback(a){switch(a){case"inline":{const l=Ye(this),c=this._state;l!==c.inline&&(c.inline=l,en(this._shadowRoot,l));break}case"observer":{this.observer?this.startObserver():this.stopObserver();break}default:this._queueCheck()}}get icon(){const a=this.getAttribute("icon");if(a&&a.slice(0,1)==="{")try{return JSON.parse(a)}catch{}return a}set icon(a){typeof a=="object"&&(a=JSON.stringify(a)),this.setAttribute("icon",a)}get inline(){return Ye(this)}set inline(a){a?this.setAttribute("inline","true"):this.removeAttribute("inline")}get observer(){return this.hasAttribute("observer")}set observer(a){a?this.setAttribute("observer","true"):this.removeAttribute("observer")}restartAnimation(){const a=this._state;if(a.rendered){const l=this._shadowRoot;if(a.renderedMode==="svg")try{l.lastChild.setCurrentTime(0);return}catch{}on(l,a)}}get status(){const a=this._state;return a.rendered?"rendered":a.icon.data===null?"failed":"loading"}_queueCheck(){this._checkQueued||(this._checkQueued=!0,setTimeout(()=>{this._check()}))}_check(){if(!this._checkQueued)return;this._checkQueued=!1;const a=this._state,l=this.getAttribute("icon");if(l!==a.icon.value){this._iconChanged(l);return}if(!a.rendered||!this._visible)return;const c=this.getAttribute("mode"),u=Di(this);(a.attrMode!==c||Zs(a.customisations,u)||!ri(this._shadowRoot))&&this._renderIcon(a.icon,u,c)}_iconChanged(a){const l=ko(a,(c,u,d)=>{const f=this._state;if(f.rendered||this.getAttribute("icon")!==c)return;const p={value:c,name:u,data:d};p.data?this._gotIconData(p):f.icon=p});l.data?this._gotIconData(l):this._state=an(l,this._state.inline,this._state)}_forceRender(){if(!this._visible){const a=ri(this._shadowRoot);a&&this._shadowRoot.removeChild(a);return}this._queueCheck()}_gotIconData(a){this._checkQueued=!1,this._renderIcon(a,Di(this),this.getAttribute("mode"))}_renderIcon(a,l,c){const u=Co(a.data.body,c),d=this._state.inline;on(this._shadowRoot,this._state={rendered:!0,icon:a,inline:d,customisations:l,attrMode:c,renderedMode:u})}startObserver(){if(!this._observer)try{this._observer=new IntersectionObserver(a=>{const l=a.some(c=>c.isIntersecting);l!==this._visible&&(this._visible=l,this._forceRender())}),this._observer.observe(this)}catch{if(this._observer){try{this._observer.disconnect()}catch{}this._observer=null}}}stopObserver(){this._observer&&(this._observer.disconnect(),this._observer=null,this._visible=!0,this._connected&&this._forceRender())}};r.forEach(a=>{a in s.prototype||Object.defineProperty(s.prototype,a,{get:function(){return this.getAttribute(a)},set:function(l){l!==null?this.setAttribute(a,l):this.removeAttribute(a)}})});const o=ar();for(const a in o)s[a]=s.prototype[a]=o[a];return t.define(i,s),s}Jo()||ar();const Xo=C`
  ::-webkit-scrollbar {
    width: 0.4rem;
    height: 0.4rem;
    overflow: hidden;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 0.25rem;
    background-color: var(
      --bim-scrollbar--c,
      color-mix(in lab, var(--bim-ui_main-base), white 15%)
    );
  }

  ::-webkit-scrollbar-track {
    background-color: var(--bim-scrollbar--bgc, var(--bim-ui_bg-base));
  }
`,Zo=C`
  :root {
    /* Grayscale Colors */
    --bim-ui_gray-0: hsl(210 10% 5%);
    --bim-ui_gray-1: hsl(210 10% 10%);
    --bim-ui_gray-2: hsl(210 10% 20%);
    --bim-ui_gray-3: hsl(210 10% 30%);
    --bim-ui_gray-4: hsl(210 10% 40%);
    --bim-ui_gray-6: hsl(210 10% 60%);
    --bim-ui_gray-7: hsl(210 10% 70%);
    --bim-ui_gray-8: hsl(210 10% 80%);
    --bim-ui_gray-9: hsl(210 10% 90%);
    --bim-ui_gray-10: hsl(210 10% 95%);

    /* Brand Colors */
    --bim-ui_main-base: #6528d7;
    --bim-ui_accent-base: #bcf124;

    /* Brand Colors Contrasts */
    --bim-ui_main-contrast: var(--bim-ui_gray-10);
    --bim-ui_accent-contrast: var(--bim-ui_gray-0);

    /* Sizes */
    --bim-ui_size-4xs: 0.375rem;
    --bim-ui_size-3xs: 0.5rem;
    --bim-ui_size-2xs: 0.625rem;
    --bim-ui_size-xs: 0.75rem;
    --bim-ui_size-sm: 0.875rem;
    --bim-ui_size-base: 1rem;
    --bim-ui_size-lg: 1.125rem;
    --bim-ui_size-xl: 1.25rem;
    --bim-ui_size-2xl: 1.375rem;
    --bim-ui_size-3xl: 1.5rem;
    --bim-ui_size-4xl: 1.625rem;
    --bim-ui_size-5xl: 1.75rem;
    --bim-ui_size-6xl: 1.875rem;
    --bim-ui_size-7xl: 2rem;
    --bim-ui_size-8xl: 2.125rem;
    --bim-ui_size-9xl: 2.25rem;
  }

  /* Background Colors */
  @media (prefers-color-scheme: dark) {
    :root {
      --bim-ui_bg-base: var(--bim-ui_gray-0);
      --bim-ui_bg-contrast-10: var(--bim-ui_gray-1);
      --bim-ui_bg-contrast-20: var(--bim-ui_gray-2);
      --bim-ui_bg-contrast-30: var(--bim-ui_gray-3);
      --bim-ui_bg-contrast-40: var(--bim-ui_gray-4);
      --bim-ui_bg-contrast-60: var(--bim-ui_gray-6);
      --bim-ui_bg-contrast-80: var(--bim-ui_gray-8);
      --bim-ui_bg-contrast-100: var(--bim-ui_gray-10);
    }
  }

  @media (prefers-color-scheme: light) {
    :root {
      --bim-ui_bg-base: var(--bim-ui_gray-10);
      --bim-ui_bg-contrast-10: var(--bim-ui_gray-9);
      --bim-ui_bg-contrast-20: var(--bim-ui_gray-8);
      --bim-ui_bg-contrast-30: var(--bim-ui_gray-7);
      --bim-ui_bg-contrast-40: var(--bim-ui_gray-6);
      --bim-ui_bg-contrast-60: var(--bim-ui_gray-4);
      --bim-ui_bg-contrast-80: var(--bim-ui_gray-2);
      --bim-ui_bg-contrast-100: var(--bim-ui_gray-0);
      --bim-ui_accent-base: #6528d7;
    }
  }

  .theme-transition-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    filter: drop-shadow(0 0 10px var(--bim-ui_bg-base));
    z-index: 9999;
  }

  .theme-transition-overlay > div {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--bim-ui_bg-base);
  }

  html.bim-ui-dark {
    --bim-ui_bg-base: var(--bim-ui_gray-0);
    --bim-ui_bg-contrast-10: var(--bim-ui_gray-1);
    --bim-ui_bg-contrast-20: var(--bim-ui_gray-2);
    --bim-ui_bg-contrast-30: var(--bim-ui_gray-3);
    --bim-ui_bg-contrast-40: var(--bim-ui_gray-4);
    --bim-ui_bg-contrast-60: var(--bim-ui_gray-6);
    --bim-ui_bg-contrast-80: var(--bim-ui_gray-8);
    --bim-ui_bg-contrast-100: var(--bim-ui_gray-10);
  }

  html.bim-ui-light {
    --bim-ui_bg-base: var(--bim-ui_gray-10);
    --bim-ui_bg-contrast-10: var(--bim-ui_gray-9);
    --bim-ui_bg-contrast-20: var(--bim-ui_gray-8);
    --bim-ui_bg-contrast-30: var(--bim-ui_gray-7);
    --bim-ui_bg-contrast-40: var(--bim-ui_gray-6);
    --bim-ui_bg-contrast-60: var(--bim-ui_gray-4);
    --bim-ui_bg-contrast-80: var(--bim-ui_gray-2);
    --bim-ui_bg-contrast-100: var(--bim-ui_gray-0);
    --bim-ui_accent-base: #6528d7;
  }

  @keyframes toggleOverlay {
    0%,
    99% {
      display: block;
    }

    100% {
      display: none;
    }
  }

  @keyframes toggleThemeAnimation {
    0% {
      clip-path: circle(0% at center top);
    }
    45%,
    55% {
      clip-path: circle(150% at center center);
    }
    100% {
      clip-path: circle(0% at center bottom);
    }
  }

  [data-context-dialog]::backdrop {
    background-color: transparent;
  }
`,ct={scrollbar:Xo,globalStyles:Zo},cr=class w{static set config(t){this._config={...w._config,...t}}static get config(){return w._config}static addGlobalStyles(){let t=document.querySelector("style[id='bim-ui']");if(t)return;t=document.createElement("style"),t.id="bim-ui",t.textContent=ct.globalStyles.cssText;const e=document.head.firstChild;e?document.head.insertBefore(t,e):document.head.append(t)}static defineCustomElement(t,e){customElements.get(t)||customElements.define(t,e)}static registerComponents(){w.init()}static init(t="",e=!0){w.addGlobalStyles(),w.defineCustomElement("bim-button",na),w.defineCustomElement("bim-checkbox",jt),w.defineCustomElement("bim-color-input",ut),w.defineCustomElement("bim-context-menu",oi),w.defineCustomElement("bim-dropdown",X),w.defineCustomElement("bim-grid",wi),w.defineCustomElement("bim-icon",ha),w.defineCustomElement("bim-input",le),w.defineCustomElement("bim-label",Ht),w.defineCustomElement("bim-number-input",j),w.defineCustomElement("bim-option",T),w.defineCustomElement("bim-panel",_t),w.defineCustomElement("bim-panel-section",Mt),w.defineCustomElement("bim-selector",Bt),w.defineCustomElement("bim-table",H),w.defineCustomElement("bim-tabs",K),w.defineCustomElement("bim-tab",R),w.defineCustomElement("bim-table-cell",Er),w.defineCustomElement("bim-table-children",Ea),w.defineCustomElement("bim-table-group",Ar),w.defineCustomElement("bim-table-row",It),w.defineCustomElement("bim-text-input",N),w.defineCustomElement("bim-toolbar",Ne),w.defineCustomElement("bim-toolbar-group",Ie),w.defineCustomElement("bim-toolbar-section",Nt),w.defineCustomElement("bim-viewport",Br),e&&this.animateOnLoad(t)}static newRandomId(){const t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";let e="";for(let n=0;n<10;n++){const r=Math.floor(Math.random()*t.length);e+=t.charAt(r)}return e}static animateOnLoad(t=""){const e=`
      bim-input,
      bim-button,
      bim-checkbox,
      bim-selector,
      bim-label,
      bim-table-row,
      bim-panel-section,
      bim-table-children .branch-vertical,
      .switchers
    `,n=[];function r(s,o=document,a=new Set){const l=[];return Array.from(o.querySelectorAll(s)).forEach(c=>{a.has(c)||(a.add(c),l.push(c))}),Array.from(o.querySelectorAll("*")).filter(c=>c.shadowRoot).forEach(c=>{a.has(c)||(a.add(c),l.push(...r(s,c.shadowRoot,a)))}),l}requestAnimationFrame(()=>{r(t||e).forEach(o=>{const a=o;let l="auto";l=window.getComputedStyle(a).getPropertyValue("transition"),a.style.setProperty("opacity","0"),a.style.setProperty("transition","none"),requestAnimationFrame(()=>{a.style.setProperty("transition",l)}),n.push(a)});const s=()=>{n.forEach(o=>{const a=o,l=(a.getBoundingClientRect().x+a.getBoundingClientRect().y)/(window.innerWidth+window.innerHeight),c=window.getComputedStyle(a).getPropertyValue("transform"),u=400,d=200+l*1e3;a.animate([{transform:"translateY(-20px)",opacity:"0"},{transform:"translateY(0)",opacity:"1"}],{duration:u,easing:"ease-in-out",delay:d}),setTimeout(()=>{a.style.removeProperty("opacity"),c!=="none"?a.style.setProperty("transform",c):a.style.removeProperty("transform")},d+u)})};document.readyState==="complete"?s():window.addEventListener("load",s)})}static toggleTheme(t=!0){const e=document.querySelector("html");if(!e)return;const n=()=>{e.classList.contains("bim-ui-dark")?e.classList.replace("bim-ui-dark","bim-ui-light"):e.classList.contains("bim-ui-light")?e.classList.replace("bim-ui-light","bim-ui-dark"):e.classList.add("bim-ui-light")};if(t){const r=document.createElement("div");r.classList.add("theme-transition-overlay");const s=document.createElement("div");r.appendChild(s),s.style.setProperty("transition",`background-color ${1e3/3200}s`),document.body.appendChild(r),r.style.setProperty("animation",`toggleOverlay ${1e3/1e3}s ease-in forwards`),s.style.setProperty("animation",`toggleThemeAnimation ${1e3/1e3}s ease forwards`),setTimeout(()=>{n()},1e3/4),setTimeout(()=>{document.body.querySelectorAll(".theme-transition-overlay").forEach(o=>{document.body.removeChild(o)})},1e3)}else n()}};cr._config={sectionLabelOnVerticalToolbar:!1};let _i=cr;class Ae extends E{constructor(){super(...arguments),this._lazyLoadObserver=null,this._visibleElements=[],this.ELEMENTS_BEFORE_OBSERVER=20,this.useObserver=!1,this.elements=new Set,this.observe=t=>{if(!this.useObserver)return;for(const n of t)this.elements.add(n);const e=t.slice(this.ELEMENTS_BEFORE_OBSERVER);for(const n of e)n.remove();this.observeLastElement()}}set visibleElements(t){this._visibleElements=this.useObserver?t:[],this.requestUpdate()}get visibleElements(){return this._visibleElements}getLazyObserver(){if(!this.useObserver)return null;if(this._lazyLoadObserver)return this._lazyLoadObserver;const t=new IntersectionObserver(e=>{const n=e[0];if(!n.isIntersecting)return;const r=n.target;t.unobserve(r);const s=this.ELEMENTS_BEFORE_OBSERVER+this.visibleElements.length,o=[...this.elements][s];o&&(this.visibleElements=[...this.visibleElements,o],t.observe(o))},{threshold:.5});return t}observeLastElement(){const t=this.getLazyObserver();if(!t)return;const e=this.ELEMENTS_BEFORE_OBSERVER+this.visibleElements.length-1,n=[...this.elements][e];n&&t.observe(n)}resetVisibleElements(){const t=this.getLazyObserver();if(t){for(const e of this.elements)t.unobserve(e);this.visibleElements=[],this.observeLastElement()}}static create(t,e){const n=document.createDocumentFragment();if(t.length===0)return Pt(t(),n),n.firstElementChild;if(!e)throw new Error("UIComponent: Initial state is required for statefull components.");let r=e;const s=t,o=l=>(r={...r,...l},Pt(s(r,o),n),r);o(e);const a=()=>r;return[n.firstElementChild,o,a]}}const Se=(i,t={},e=!0)=>{let n={};for(const r of i.children){const s=r,o=s.getAttribute("name")||s.getAttribute("label"),a=o?t[o]:void 0;if(o){if("value"in s&&typeof s.value<"u"&&s.value!==null){const l=s.value;if(typeof l=="object"&&!Array.isArray(l)&&Object.keys(l).length===0)continue;n[o]=a?a(s.value):s.value}else if(e){const l=Se(s,t);if(Object.keys(l).length===0)continue;n[o]=a?a(l):l}}else e&&(n={...n,...Se(s,t)})}return n},He=i=>i==="true"||i==="false"?i==="true":i&&!isNaN(Number(i))&&i.trim()!==""?Number(i):i,Go=[">=","<=","=",">","<","?","/","#"];function ln(i){const t=Go.find(o=>i.split(o).length===2),e=i.split(t).map(o=>o.trim()),[n,r]=e,s=r.startsWith("'")&&r.endsWith("'")?r.replace(/'/g,""):He(r);return{key:n,condition:t,value:s}}const si=i=>{try{const t=[],e=i.split(/&(?![^()]*\))/).map(n=>n.trim());for(const n of e){const r=!n.startsWith("(")&&!n.endsWith(")"),s=n.startsWith("(")&&n.endsWith(")");if(r){const o=ln(n);t.push(o)}if(s){const o={operator:"&",queries:n.replace(/^(\()|(\))$/g,"").split("&").map(a=>a.trim()).map((a,l)=>{const c=ln(a);return l>0&&(c.operator="&"),c})};t.push(o)}}return t}catch{return null}},cn=(i,t,e)=>{let n=!1;switch(t){case"=":n=i===e;break;case"?":n=String(i).includes(String(e));break;case"<":(typeof i=="number"||typeof e=="number")&&(n=i<e);break;case"<=":(typeof i=="number"||typeof e=="number")&&(n=i<=e);break;case">":(typeof i=="number"||typeof e=="number")&&(n=i>e);break;case">=":(typeof i=="number"||typeof e=="number")&&(n=i>=e);break;case"/":n=String(i).startsWith(String(e));break}return n};var Ko=Object.defineProperty,ta=Object.getOwnPropertyDescriptor,ur=(i,t,e,n)=>{for(var r=ta(t,e),s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&Ko(t,e,r),r},O;const xi=(O=class extends E{constructor(){super(...arguments),this._previousContainer=null,this._visible=!1}get placement(){return this._placement}set placement(i){this._placement=i,this.updatePosition()}static removeMenus(){for(const i of O.menus)i instanceof O&&(i.visible=!1);setTimeout(()=>{O.dialog.close(),O.dialog.remove()},310)}get visible(){return this._visible}set visible(i){this._visible=i,i?(O.dialog.parentElement||document.body.append(O.dialog),this._previousContainer=this.parentElement,O.dialog.style.top=`${window.scrollY||document.documentElement.scrollTop}px`,this.style.setProperty("display","flex"),O.dialog.append(this),O.dialog.showModal(),this.updatePosition(),this.dispatchEvent(new Event("visible"))):setTimeout(()=>{var t;(t=this._previousContainer)==null||t.append(this),this._previousContainer=null,this.style.setProperty("display","none"),this.dispatchEvent(new Event("hidden"))},310)}async updatePosition(){if(!(this.visible&&this._previousContainer))return;const i=this.placement??"right",t=await Pn(this._previousContainer,this,{placement:i,middleware:[gn(10),Tn(),On(),Sn({padding:5})]}),{x:e,y:n}=t;this.style.left=`${e}px`,this.style.top=`${n}px`}connectedCallback(){super.connectedCallback(),O.menus.push(this),this.visible?(this.style.setProperty("width","auto"),this.style.setProperty("height","auto")):(this.style.setProperty("display","none"),this.style.setProperty("width","0"),this.style.setProperty("height","0"))}render(){return m` <slot></slot> `}},O.styles=[ct.scrollbar,C`
      :host {
        pointer-events: auto;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 999;
        overflow: auto;
        max-height: 20rem;
        min-width: 3rem;
        flex-direction: column;
        box-shadow: 1px 2px 8px 2px rgba(0, 0, 0, 0.15);
        padding: 0.5rem;
        border-radius: var(--bim-ui_size-4xs);
        display: flex;
        transform-origin: top left;
        transform: scale(1);
        clip-path: circle(150% at top left);
        background-color: var(--bim-ui_bg-contrast-20);
        transition:
          clip-path 0.2s cubic-bezier(0.72, 0.1, 0.43, 0.93),
          transform 0.3s cubic-bezier(0.72, 0.1, 0.45, 2.35);
      }

      :host(:not([visible])) {
        transform: scale(0.8);
        clip-path: circle(0 at top left);
      }
    `],O.dialog=Ae.create(()=>m` <dialog
      @click=${i=>{i.target===O.dialog&&O.removeMenus()}}
      @cancel=${()=>O.removeMenus()}
      data-context-dialog
      style="
      width: 0;
      height: 0;
      position: relative;
      padding: 0;
      border: none;
      outline: none;
      margin: none;
      overflow: visible;
      background-color: transparent;
    "
    ></dialog>`),O.menus=[],O);ur([h({type:String,reflect:!0})],xi.prototype,"placement");ur([h({type:Boolean,reflect:!0})],xi.prototype,"visible");let oi=xi;var ea=Object.defineProperty,ia=Object.getOwnPropertyDescriptor,U=(i,t,e,n)=>{for(var r=n>1?void 0:n?ia(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&ea(t,e,r),r},Ut;const B=(Ut=class extends E{constructor(){super(),this.labelHidden=!1,this.active=!1,this.disabled=!1,this.vertical=!1,this.tooltipVisible=!1,this._stateBeforeLoading={disabled:!1,icon:""},this._loading=!1,this._parent=zt(),this._tooltip=zt(),this._mouseLeave=!1,this.onClick=i=>{i.stopPropagation(),this.disabled||this.dispatchEvent(new Event("click"))},this.showContextMenu=()=>{const i=this._contextMenu;if(i){const t=this.getAttribute("data-context-group");t&&i.setAttribute("data-context-group",t),this.closeNestedContexts();const e=_i.newRandomId();for(const n of i.children)n instanceof Ut&&n.setAttribute("data-context-group",e);i.visible=!0}},this.mouseLeave=!0}set loading(i){if(this._loading=i,i)this._stateBeforeLoading={disabled:this.disabled,icon:this.icon},this.disabled=i,this.icon="eos-icons:loading";else{const{disabled:t,icon:e}=this._stateBeforeLoading;this.disabled=t,this.icon=e}}get loading(){return this._loading}set mouseLeave(i){this._mouseLeave=i,i&&(this.tooltipVisible=!1,clearTimeout(this.timeoutID))}get mouseLeave(){return this._mouseLeave}computeTooltipPosition(){const{value:i}=this._parent,{value:t}=this._tooltip;i&&t&&Pn(i,t,{placement:"bottom",middleware:[gn(10),Tn(),On(),Sn({padding:5})]}).then(e=>{const{x:n,y:r}=e;Object.assign(t.style,{left:`${n}px`,top:`${r}px`})})}onMouseEnter(){if(!(this.tooltipTitle||this.tooltipText))return;this.mouseLeave=!1;const i=this.tooltipTime??700;this.timeoutID=setTimeout(()=>{this.mouseLeave||(this.computeTooltipPosition(),this.tooltipVisible=!0)},i)}closeNestedContexts(){const i=this.getAttribute("data-context-group");if(i)for(const t of oi.dialog.children){const e=t.getAttribute("data-context-group");if(t instanceof oi&&e===i){t.visible=!1,t.removeAttribute("data-context-group");for(const n of t.children)n instanceof Ut&&(n.closeNestedContexts(),n.removeAttribute("data-context-group"))}}}click(){this.disabled||super.click()}get _contextMenu(){return this.querySelector("bim-context-menu")}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.showContextMenu)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.showContextMenu)}render(){const i=m`
      <div ${Rt(this._tooltip)} class="tooltip">
        ${this.tooltipTitle?m`<p style="text-wrap: nowrap;">
              <strong>${this.tooltipTitle}</strong>
            </p>`:null}
        ${this.tooltipText?m`<p style="width: 9rem;">${this.tooltipText}</p>`:null}
      </div>
    `,t=m`<svg
      xmlns="http://www.w3.org/2000/svg"
      height="1.125rem"
      viewBox="0 0 24 24"
      width="1.125rem"
      style="fill: var(--bim-label--c)"
    >
      <path d="M0 0h24v24H0V0z" fill="none" />
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
    </svg>`;return m`
      <div ${Rt(this._parent)} class="parent" @click=${this.onClick}>
        ${this.label||this.icon?m`
              <div
                class="button"
                @mouseenter=${this.onMouseEnter}
                @mouseleave=${()=>this.mouseLeave=!0}
              >
                <bim-label
                  .icon=${this.icon}
                  .vertical=${this.vertical}
                  .labelHidden=${this.labelHidden}
                  >${this.label}${this.label&&this._contextMenu?t:null}</bim-label
                >
              </div>
            `:null}
        ${this.tooltipTitle||this.tooltipText?i:null}
      </div>
      <slot></slot>
    `}},Ut.styles=C`
    :host {
      --bim-label--c: var(--bim-ui_bg-contrast-100, white);
      position: relative;
      display: block;
      flex: 1;
      pointer-events: none;
      background-color: var(--bim-button--bgc, var(--bim-ui_bg-contrast-20));
      border-radius: var(--bim-ui_size-4xs);
      transition: all 0.15s;
    }

    :host(:not([disabled]))::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background-color: var(--bim-ui_main-base);
      clip-path: circle(0 at center center);
      box-sizing: border-box;
      transition:
        clip-path 0.3s cubic-bezier(0.65, 0.05, 0.36, 1),
        transform 0.15s;
    }

    :host(:not([disabled]):hover) {
      cursor: pointer;
    }

    bim-label {
      pointer-events: none;
    }

    .parent {
      --bim-icon--c: var(--bim-label--c);
      position: relative;
      display: flex;
      height: 100%;
      user-select: none;
      row-gap: 0.125rem;
      min-height: var(--bim-ui_size-5xl);
      min-width: var(--bim-ui_size-5xl);
    }

    .button,
    .children {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }

    .children {
      padding: 0 0.375rem;
      position: absolute;
      height: 100%;
      right: 0;
    }

    :host(:not([label-hidden])[icon][vertical]) .parent {
      min-height: 2.5rem;
    }

    .button {
      flex-grow: 1;
      transition: transform 0.15s;
    }

    :host(:not([label-hidden])[label]) .button {
      justify-content: var(--bim-button--jc, center);
    }

    :host(:hover)::before {
      clip-path: circle(120% at center center);
    }

    :host(:hover) {
      --bim-label--c: var(--bim-ui_main-contrast);
      z-index: 2;
    }

    :host([active]) {
      background-color: var(--bim-ui_main-base);
    }

    :host(:not([disabled]):active) {
      background: transparent;
    }

    :host(:not([disabled]):active) .button,
    :host(:not([disabled]):active)::before {
      transform: scale(0.98);
    }

    :host(:not([label]):not([icon])) .children {
      flex: 1;
    }

    :host([vertical]) .parent {
      justify-content: center;
    }

    :host(:not([label-hidden])[label]) .button {
      padding: 0 0.5rem;
    }

    :host([disabled]) {
      --bim-label--c: var(--bim-ui_bg-contrast-80) !important;
      background-color: gray !important;
    }

    ::slotted(bim-button) {
      --bim-icon--fz: var(--bim-ui_size-base);
      --bim-button--bdrs: var(--bim-ui_size-4xs);
      --bim-button--olw: 0;
      --bim-button--olc: transparent;
    }

    .tooltip {
      position: absolute;
      padding: 0.75rem;
      z-index: 99;
      display: flex;
      flex-flow: column;
      row-gap: 0.375rem;
      box-shadow: 0 0 10px 3px rgba(0 0 0 / 20%);
      outline: 1px solid var(--bim-ui_bg-contrast-40);
      font-size: var(--bim-ui_size-xs);
      border-radius: var(--bim-ui_size-4xs);
      background-color: var(--bim-ui_bg-contrast-20);
      color: var(--bim-ui_bg-contrast-100);
      animation: openTooltips 0.15s ease-out forwards;
      transition: visibility 0.2s;
    }

    .tooltip p {
      margin: 0;
      padding: 0;
    }

    :host(:not([tooltip-visible])) .tooltip {
      animation: closeTooltips 0.15s ease-in forwards;
      visibility: hidden;
      display: none;
    }

    @keyframes closeTooltips {
      0% {
        display: flex;
        padding: 0.75rem;
        transform: translateY(0);
        opacity: 1;
      }
      90% {
        padding: 0.75rem;
      }
      100% {
        display: none;
        padding: 0;
        transform: translateY(-10px);
        opacity: 0;
      }
    }

    @keyframes openTooltips {
      0% {
        display: flex;
        transform: translateY(-10px);
        opacity: 0;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `,Ut);U([h({type:String,reflect:!0})],B.prototype,"label",2);U([h({type:Boolean,attribute:"label-hidden",reflect:!0})],B.prototype,"labelHidden",2);U([h({type:Boolean,reflect:!0})],B.prototype,"active",2);U([h({type:Boolean,reflect:!0,attribute:"disabled"})],B.prototype,"disabled",2);U([h({type:String,reflect:!0})],B.prototype,"icon",2);U([h({type:Boolean,reflect:!0})],B.prototype,"vertical",2);U([h({type:Number,attribute:"tooltip-time",reflect:!0})],B.prototype,"tooltipTime",2);U([h({type:Boolean,attribute:"tooltip-visible",reflect:!0})],B.prototype,"tooltipVisible",2);U([h({type:String,attribute:"tooltip-title",reflect:!0})],B.prototype,"tooltipTitle",2);U([h({type:String,attribute:"tooltip-text",reflect:!0})],B.prototype,"tooltipText",2);U([h({type:Boolean,reflect:!0})],B.prototype,"loading",1);let na=B;var ra=Object.defineProperty,ae=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&ra(t,e,r),r};const hr=class extends E{constructor(){super(...arguments),this.checked=!1,this.inverted=!1,this.onValueChange=new Event("change")}get value(){return this.checked}onChange(t){t.stopPropagation(),this.checked=t.target.checked,this.dispatchEvent(this.onValueChange)}render(){const t=m`
      <svg viewBox="0 0 21 21">
        <polyline points="5 10.75 8.5 14.25 16 6"></polyline>
      </svg>
    `;return m`
      <div class="parent">
        <label class="parent-label">
          ${this.label?m`<bim-label .icon="${this.icon}">${this.label}</bim-label> `:null}
          <div class="input-container">
            <input
              type="checkbox"
              aria-label=${this.label||this.name||"Checkbox Input"}
              @change="${this.onChange}"
              .checked="${this.checked}"
            />
            ${t}
          </div>
        </label>
      </div>
    `}};hr.styles=C`
    :host {
      display: block;
    }

    .parent-label {
      --background: #fff;
      --border: #dfdfe6;
      --stroke: #fff;
      --border-hover: var(--bim-ui_main-base);
      --border-active: var(--bim-ui_main-base);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      width: 100%;
      height: 1.75rem;
      column-gap: 0.25rem;
      position: relative;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }

    :host([inverted]) .parent-label {
      flex-direction: row-reverse;
      justify-content: start;
    }

    input,
    svg {
      width: 1rem;
      height: 1rem;
      display: block;
    }

    input {
      -webkit-appearance: none;
      -moz-appearance: none;
      position: relative;
      outline: none;
      background: var(--background);
      border: none;
      margin: 0;
      padding: 0;
      cursor: pointer;
      border-radius: 4px;
      transition: box-shadow 0.3s;
      box-shadow: inset 0 0 0 var(--s, 1px) var(--b, var(--border));
    }

    svg {
      pointer-events: none;
      fill: none;
      stroke-width: 2.2px;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke: var(--stroke, var(--border-active));
      transform: translateY(-100%) scale(0);
      position: absolute;
      width: 1rem;
      height: 1rem;
    }

    input:hover {
      --s: 2px;
      --b: var(--border-hover);
    }

    input:checked {
      --b: var(--border-active);
      --s: 11px;
    }

    input:checked + svg {
      -webkit-animation: bounce 0.4s linear forwards 0.2s;
      animation: bounce 0.4s linear forwards 0.2s;
    }

    @keyframes bounce {
      0% {
        transform: translateY(-100%) scale(0);
      }
      50% {
        transform: translateY(-100%) scale(1.2);
      }
      75% {
        transform: translateY(-100%) scale(0.9);
      }
      100% {
        transform: translateY(-100%) scale(1);
      }
    }
  `;let jt=hr;ae([h({type:String,reflect:!0})],jt.prototype,"icon");ae([h({type:String,reflect:!0})],jt.prototype,"name");ae([h({type:String,reflect:!0})],jt.prototype,"label");ae([h({type:Boolean,reflect:!0})],jt.prototype,"checked");ae([h({type:Boolean,reflect:!0})],jt.prototype,"inverted");var sa=Object.defineProperty,yt=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&sa(t,e,r),r};const dr=class extends E{constructor(){super(...arguments),this.vertical=!1,this.color="#bcf124",this.disabled=!1,this._colorInput=zt(),this._textInput=zt(),this.onValueChange=new Event("input"),this.onOpacityInput=t=>{const e=t.target;this.opacity=e.value,this.dispatchEvent(this.onValueChange)}}set value(t){const{color:e,opacity:n}=t;this.color=e,n&&(this.opacity=n)}get value(){const t={color:this.color};return this.opacity&&(t.opacity=this.opacity),t}onColorInput(t){t.stopPropagation();const{value:e}=this._colorInput;e&&(this.color=e.value,this.dispatchEvent(this.onValueChange))}onTextInput(t){t.stopPropagation();const{value:e}=this._textInput;if(!e)return;const{value:n}=e;let r=n.replace(/[^a-fA-F0-9]/g,"");r.startsWith("#")||(r=`#${r}`),e.value=r.slice(0,7),e.value.length===7&&(this.color=e.value,this.dispatchEvent(this.onValueChange))}focus(){const{value:t}=this._colorInput;t&&t.click()}render(){return m`
      <div class="parent">
        <bim-input
          .label=${this.label}
          .icon=${this.icon}
          .vertical="${this.vertical}"
        >
          <div class="color-container">
            <div
              style="display: flex; align-items: center; gap: .375rem; height: 100%; flex: 1; padding: 0 0.5rem;"
            >
              <input
                ${Rt(this._colorInput)}
                @input="${this.onColorInput}"
                type="color"
                aria-label=${this.label||this.name||"Color Input"}
                value="${this.color}"
                ?disabled=${this.disabled}
              />
              <div
                @click=${this.focus}
                class="sample"
                style="background-color: ${this.color}"
              ></div>
              <input
                ${Rt(this._textInput)}
                @input="${this.onTextInput}"
                value="${this.color}"
                type="text"
                aria-label=${this.label||this.name||"Text Color Input"}
                ?disabled=${this.disabled}
              />
            </div>
            ${this.opacity!==void 0?m`<bim-number-input
                  @change=${this.onOpacityInput}
                  slider
                  suffix="%"
                  min="0"
                  value=${this.opacity}
                  max="100"
                ></bim-number-input>`:null}
          </div>
        </bim-input>
      </div>
    `}};dr.styles=C`
    :host {
      --bim-input--bgc: var(--bim-ui_bg-contrast-20);
      flex: 1;
      display: block;
    }

    :host(:focus) {
      --bim-input--olw: var(--bim-number-input--olw, 2px);
      --bim-input--olc: var(--bim-ui_accent-base);
    }

    .parent {
      display: flex;
      gap: 0.375rem;
    }

    .color-container {
      position: relative;
      outline: none;
      display: flex;
      height: 100%;
      gap: 0.5rem;
      justify-content: flex-start;
      align-items: center;
      flex: 1;
      border-radius: var(--bim-color-input--bdrs, var(--bim-ui_size-4xs));
    }

    .color-container input[type="color"] {
      position: absolute;
      bottom: -0.25rem;
      visibility: hidden;
      width: 0;
      height: 0;
    }

    .color-container .sample {
      width: 1rem;
      height: 1rem;
      border-radius: 0.125rem;
      background-color: #fff;
    }

    .color-container input[type="text"] {
      height: 100%;
      flex: 1;
      width: 3.25rem;
      text-transform: uppercase;
      font-size: 0.75rem;
      background-color: transparent;
      padding: 0%;
      outline: none;
      border: none;
      color: var(--bim-color-input--c, var(--bim-ui_bg-contrast-100));
    }

    :host([disabled]) .color-container input[type="text"] {
      color: var(--bim-ui_bg-contrast-60);
    }

    bim-number-input {
      flex-grow: 0;
    }
  `;let ut=dr;yt([h({type:String,reflect:!0})],ut.prototype,"name");yt([h({type:String,reflect:!0})],ut.prototype,"label");yt([h({type:String,reflect:!0})],ut.prototype,"icon");yt([h({type:Boolean,reflect:!0})],ut.prototype,"vertical");yt([h({type:Number,reflect:!0})],ut.prototype,"opacity");yt([h({type:String,reflect:!0})],ut.prototype,"color");yt([h({type:Boolean,reflect:!0})],ut.prototype,"disabled");var oa=Object.defineProperty,aa=Object.getOwnPropertyDescriptor,ht=(i,t,e,n)=>{for(var r=n>1?void 0:n?aa(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&oa(t,e,r),r};const pr=class extends E{constructor(){super(...arguments),this.checked=!1,this.checkbox=!1,this.noMark=!1,this.vertical=!1}get value(){return this._value!==void 0?this._value:this.label?He(this.label):this.label}set value(t){this._value=t}render(){return m`
      <div class="parent" .title=${this.label??""}>
        ${this.img||this.icon||this.label?m` <div style="display: flex; column-gap: 0.375rem">
              ${this.checkbox&&!this.noMark?m`<bim-checkbox
                    style="pointer-events: none"
                    .checked=${this.checked}
                  ></bim-checkbox>`:null}
              <bim-label
                .vertical=${this.vertical}
                .icon=${this.icon}
                .img=${this.img}
                >${this.label}</bim-label
              >
            </div>`:null}
        ${!this.checkbox&&!this.noMark&&this.checked?m`<svg
              xmlns="http://www.w3.org/2000/svg"
              height="1.125rem"
              viewBox="0 0 24 24"
              width="1.125rem"
              fill="#FFFFFF"
            >
              <path d="M0 0h24v24H0z" fill="none" />
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>`:null}
        <slot></slot>
      </div>
    `}};pr.styles=C`
    :host {
      --bim-label--c: var(--bim-ui_bg-contrast-100);
      display: block;
      box-sizing: border-box;
      flex: 1;
      padding: 0rem 0.5rem;
      border-radius: var(--bim-ui_size-4xs);
      transition: all 0.15s;
    }

    :host(:hover) {
      cursor: pointer;
    }

    :host([checked]) {
      --bim-label--c: color-mix(in lab, var(--bim-ui_main-base), white 30%);
    }

    :host([checked]) svg {
      fill: color-mix(in lab, var(--bim-ui_main-base), white 30%);
    }

    .parent {
      box-sizing: border-box;
      display: flex;
      justify-content: var(--bim-option--jc, space-between);
      column-gap: 0.5rem;
      align-items: center;
      min-height: 1.75rem;
      height: 100%;
    }

    input {
      height: 1rem;
      width: 1rem;
      cursor: pointer;
      border: none;
      outline: none;
      accent-color: var(--bim-checkbox--c, var(--bim-ui_main-base));
    }

    input:focus {
      outline: var(--bim-checkbox--olw, 2px) solid
        var(--bim-checkbox--olc, var(--bim-ui_accent-base));
    }

    bim-label {
      pointer-events: none;
      z-index: 1;
    }
  `;let T=pr;ht([h({type:String,reflect:!0})],T.prototype,"img",2);ht([h({type:String,reflect:!0})],T.prototype,"label",2);ht([h({type:String,reflect:!0})],T.prototype,"icon",2);ht([h({type:Boolean,reflect:!0})],T.prototype,"checked",2);ht([h({type:Boolean,reflect:!0})],T.prototype,"checkbox",2);ht([h({type:Boolean,attribute:"no-mark",reflect:!0})],T.prototype,"noMark",2);ht([h({converter:{fromAttribute(i){return i&&He(i)}}})],T.prototype,"value",1);ht([h({type:Boolean,reflect:!0})],T.prototype,"vertical",2);var la=Object.defineProperty,ca=Object.getOwnPropertyDescriptor,tt=(i,t,e,n)=>{for(var r=n>1?void 0:n?ca(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&la(t,e,r),r};const fr=class extends Ae{constructor(){super(),this.multiple=!1,this.required=!1,this.vertical=!1,this._visible=!1,this._value=new Set,this.onValueChange=new Event("change"),this._contextMenu=zt(),this.onOptionClick=t=>{const e=t.target,n=this._value.has(e);if(!this.multiple&&!this.required&&!n)this._value=new Set([e]);else if(!this.multiple&&!this.required&&n)this._value=new Set([]);else if(!this.multiple&&this.required&&!n)this._value=new Set([e]);else if(this.multiple&&!this.required&&!n)this._value=new Set([...this._value,e]);else if(this.multiple&&!this.required&&n){const r=[...this._value].filter(s=>s!==e);this._value=new Set(r)}else if(this.multiple&&this.required&&!n)this._value=new Set([...this._value,e]);else if(this.multiple&&this.required&&n){const r=[...this._value].filter(o=>o!==e),s=new Set(r);s.size!==0&&(this._value=s)}this.updateOptionsState(),this.dispatchEvent(this.onValueChange)},this.useObserver=!0}set visible(t){if(t){const{value:e}=this._contextMenu;if(!e)return;for(const n of this.elements)e.append(n);this._visible=!0}else{for(const e of this.elements)this.append(e);this._visible=!1,this.resetVisibleElements()}}get visible(){return this._visible}set value(t){if(this.required&&Object.keys(t).length===0)return;const e=new Set;for(const n of t){const r=this.findOption(n);if(r&&(e.add(r),!this.multiple&&Object.keys(t).length===1))break}this._value=e,this.updateOptionsState(),this.dispatchEvent(this.onValueChange)}get value(){return[...this._value].filter(t=>t instanceof T&&t.checked).map(t=>t.value)}get _options(){const t=new Set([...this.elements]);for(const e of this.children)e instanceof T&&t.add(e);return[...t]}onSlotChange(t){const e=t.target.assignedElements();this.observe(e);const n=new Set;for(const r of this.elements){if(!(r instanceof T)){r.remove();continue}r.checked&&n.add(r),r.removeEventListener("click",this.onOptionClick),r.addEventListener("click",this.onOptionClick)}this._value=n}updateOptionsState(){for(const t of this._options)t instanceof T&&(t.checked=this._value.has(t))}findOption(t){return this._options.find(e=>e instanceof T?e.label===t||e.value===t:!1)}render(){let t,e,n;if(this._value.size===0)t=this.placeholder??"Select an option...";else if(this._value.size===1){const r=[...this._value][0];t=(r==null?void 0:r.label)||(r==null?void 0:r.value),e=r==null?void 0:r.img,n=r==null?void 0:r.icon}else t=`Multiple (${this._value.size})`;return m`
      <bim-input
        title=${this.label??""}
        .label=${this.label}
        .icon=${this.icon}
        .vertical=${this.vertical}
      >
        <div class="input" @click=${()=>this.visible=!this.visible}>
          <bim-label
            .img=${e}
            .icon=${n}
            style="overflow: hidden;"
            >${t}</bim-label
          >
          <svg
            style="flex-shrink: 0; fill: var(--bim-dropdown--c, var(--bim-ui_bg-contrast-100))"
            xmlns="http://www.w3.org/2000/svg"
            height="1.125rem"
            viewBox="0 0 24 24"
            width="1.125rem"
            fill="#9ca3af"
          >
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
          <bim-context-menu
            ${Rt(this._contextMenu)}
            .visible=${this.visible}
            @hidden=${()=>{this.visible&&(this.visible=!1)}}
          >
            <slot @slotchange=${this.onSlotChange}></slot>
          </bim-context-menu>
        </div>
      </bim-input>
    `}};fr.styles=[ct.scrollbar,C`
      :host {
        --bim-input--bgc: var(
          --bim-dropdown--bgc,
          var(--bim-ui_bg-contrast-20)
        );
        --bim-input--olw: 2px;
        --bim-input--olc: transparent;
        --bim-input--bdrs: var(--bim-ui_size-4xs);
        flex: 1;
        display: block;
      }

      :host([visible]) {
        --bim-input--olc: var(--bim-ui_accent-base);
      }

      .input {
        --bim-label--fz: var(--bim-drodown--fz, var(--bim-ui_size-xs));
        --bim-label--c: var(--bim-dropdown--c, var(--bim-ui_bg-contrast-100));
        height: 100%;
        display: flex;
        flex: 1;
        overflow: hidden;
        column-gap: 0.25rem;
        outline: none;
        cursor: pointer;
        align-items: center;
        justify-content: space-between;
        padding: 0 0.5rem;
      }

      bim-label {
        pointer-events: none;
      }
    `];let X=fr;tt([h({type:String,reflect:!0})],X.prototype,"name",2);tt([h({type:String,reflect:!0})],X.prototype,"icon",2);tt([h({type:String,reflect:!0})],X.prototype,"label",2);tt([h({type:Boolean,reflect:!0})],X.prototype,"multiple",2);tt([h({type:Boolean,reflect:!0})],X.prototype,"required",2);tt([h({type:Boolean,reflect:!0})],X.prototype,"vertical",2);tt([h({type:String,reflect:!0})],X.prototype,"placeholder",2);tt([h({type:Boolean,reflect:!0})],X.prototype,"visible",1);tt([Lt()],X.prototype,"_value",2);var ua=Object.defineProperty,mr=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&ua(t,e,r),r};const br=class extends E{constructor(){super(...arguments),this.floating=!1,this._layouts={},this._elements={},this._templateIds=new Map,this._updateFunctions={},this.updateComponent={}}set layouts(t){this._layouts=t,this._templateIds.clear()}get layouts(){return this._layouts}set elements(t){this._elements=t;const e={};for(const[n,r]of Object.entries(this.elements))"template"in r&&(e[n]=s=>{const o=this._updateFunctions[n];o&&o(s)});this.updateComponent=e}get elements(){return this._elements}getLayoutAreas(t){const{template:e}=t,n=e.split(`
`).map(r=>r.trim()).map(r=>r.split('"')[1]).filter(r=>r!==void 0).flatMap(r=>r.split(/\s+/));return[...new Set(n)].filter(r=>r!=="")}firstUpdated(){this._onLayoutChange=new Event("layoutchange")}getTemplateId(t){let e=this._templateIds.get(t);return e||(e=_i.newRandomId(),this._templateIds.set(t,e)),e}cleanUpdateFunctions(){if(!this.layout){this._updateFunctions={};return}const t=this.layouts[this.layout],e=this.getLayoutAreas(t);for(const n in this.elements)e.includes(n)||delete this._updateFunctions[n]}render(){if(this.layout){if(this.layouts[this.layout]){const t=this.layouts[this.layout],e=this.getLayoutAreas(t).map(n=>{var r;const s=((r=t.elements)==null?void 0:r[n])||this.elements[n];if(!s)return null;if(s instanceof HTMLElement)return s.style.gridArea=n,s;if("template"in s){const{template:c,initialState:u}=s,d=this.getTemplateId(c),f=this.querySelector(`[data-grid-template-id="${d}"]`);if(f)return f;const[p,g]=Ae.create(c,u);return p.setAttribute("data-grid-template-id",d),p.style.gridArea=n,this._updateFunctions[n]=g,p}const o=this.getTemplateId(s),a=this.querySelector(`[data-grid-template-id="${o}"]`);if(a)return a;const l=Ae.create(s);return l.setAttribute("data-grid-template-id",this.getTemplateId(s)),l.style.gridArea=n,l}).filter(n=>n!==null);this.innerHTML="",this.style.gridTemplate=t.template,this.append(...e),this._onLayoutChange&&this.dispatchEvent(this._onLayoutChange)}}else this.innerHTML="",this.style.gridTemplate="",this._onLayoutChange&&this.dispatchEvent(this._onLayoutChange);return this.cleanUpdateFunctions(),m`<slot></slot>`}};br.styles=C`
    :host {
      display: grid;
      height: 100%;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }

    /* :host(:not([layout])) {
      display: none;
    } */

    :host([floating]) {
      --bim-panel--bdrs: var(--bim-ui_size-4xs);
      background-color: transparent;
      padding: 1rem;
      gap: 1rem;
      position: absolute;
      pointer-events: none;
      top: 0px;
      left: 0px;
    }

    :host(:not([floating])) {
      --bim-panel--bdrs: 0;
      background-color: var(--bim-ui_bg-contrast-20);
      gap: 1px;
    }
  `;let wi=br;mr([h({type:Boolean,reflect:!0})],wi.prototype,"floating");mr([h({type:String,reflect:!0})],wi.prototype,"layout");const ai=class extends E{render(){return m`
      <iconify-icon .icon=${this.icon} height="none"></iconify-icon>
    `}};ai.styles=C`
    :host {
      height: var(--bim-icon--fz, var(--bim-ui_size-sm));
      width: var(--bim-icon--fz, var(--bim-ui_size-sm));
    }

    iconify-icon {
      height: var(--bim-icon--fz, var(--bim-ui_size-sm));
      width: var(--bim-icon--fz, var(--bim-ui_size-sm));
      color: var(--bim-icon--c);
      transition: all 0.15s;
      display: flex;
    }
  `,ai.properties={icon:{type:String}};let ha=ai;var da=Object.defineProperty,Me=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&da(t,e,r),r};const gr=class extends E{constructor(){super(...arguments),this.vertical=!1,this.onValueChange=new Event("change")}get value(){const t={};for(const e of this.children){const n=e;"value"in n?t[n.name||n.label]=n.value:"checked"in n&&(t[n.name||n.label]=n.checked)}return t}set value(t){const e=[...this.children];for(const n in t){const r=e.find(a=>{const l=a;return l.name===n||l.label===n});if(!r)continue;const s=r,o=t[n];typeof o=="boolean"?s.checked=o:s.value=o}}render(){return m`
      <div class="parent">
        ${this.label||this.icon?m`<bim-label .icon=${this.icon}>${this.label}</bim-label>`:null}
        <div class="input">
          <slot></slot>
        </div>
      </div>
    `}};gr.styles=C`
    :host {
      flex: 1;
      display: block;
    }

    .parent {
      display: flex;
      flex-wrap: wrap;
      column-gap: 1rem;
      row-gap: 0.375rem;
      user-select: none;
      flex: 1;
    }

    :host(:not([vertical])) .parent {
      justify-content: space-between;
    }

    :host([vertical]) .parent {
      flex-direction: column;
    }

    .input {
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      min-height: 1.75rem;
      min-width: 3rem;
      gap: var(--bim-input--g, var(--bim-ui_size-4xs));
      padding: var(--bim-input--p, 0);
      background-color: var(--bim-input--bgc, transparent);
      border: var(--bim-input--olw, 2px) solid
        var(--bim-input--olc, transparent);
      border-radius: var(--bim-input--bdrs, var(--bim-ui_size-4xs));
      transition: all 0.15s;
    }

    :host(:not([vertical])) .input {
      flex: 1;
      justify-content: flex-end;
    }

    :host(:not([vertical])[label]) .input {
      max-width: fit-content;
    }
  `;let le=gr;Me([h({type:String,reflect:!0})],le.prototype,"name");Me([h({type:String,reflect:!0})],le.prototype,"label");Me([h({type:String,reflect:!0})],le.prototype,"icon");Me([h({type:Boolean,reflect:!0})],le.prototype,"vertical");var pa=Object.defineProperty,ce=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&pa(t,e,r),r};const vr=class extends E{constructor(){super(...arguments),this.labelHidden=!1,this.iconHidden=!1,this.vertical=!1}get value(){return this.textContent?He(this.textContent):this.textContent}render(){return m`
      <div class="parent" .title=${this.textContent??""}>
        ${this.img?m`<img .src=${this.img} .alt=${this.textContent||""} />`:null}
        ${!this.iconHidden&&this.icon?m`<bim-icon .icon=${this.icon}></bim-icon>`:null}
        <p><slot></slot></p>
      </div>
    `}};vr.styles=C`
    :host {
      --bim-icon--c: var(--bim-label--c);
      overflow: auto;
      color: var(--bim-label--c, var(--bim-ui_bg-contrast-60));
      font-size: var(--bim-label--fz, var(--bim-ui_size-xs));
      display: block;
      white-space: nowrap;
      transition: all 0.15s;
    }

    :host([icon]) {
      line-height: 1.1rem;
    }

    .parent {
      display: flex;
      align-items: center;
      column-gap: 0.25rem;
      row-gap: 0.125rem;
      user-select: none;
      height: 100%;
    }

    :host([vertical]) .parent {
      flex-direction: column;
    }

    .parent p {
      display: flex;
      margin: 0;
      text-overflow: ellipsis;
      overflow: hidden;
      align-items: center;
      gap: 0.125rem;
    }

    :host([label-hidden]) .parent p,
    :host(:empty) .parent p {
      display: none;
    }

    img {
      height: 100%;
      aspect-ratio: 1;
      border-radius: 100%;
      margin-right: 0.125rem;
    }

    :host(:not([vertical])) img {
      max-height: var(
        --bim-label_icon--sz,
        calc(var(--bim-label--fz, var(--bim-ui_size-xs)) * 1.8)
      );
    }

    :host([vertical]) img {
      max-height: var(
        --bim-label_icon--sz,
        calc(var(--bim-label--fz, var(--bim-ui_size-xs)) * 4)
      );
    }
  `;let Ht=vr;ce([h({type:String,reflect:!0})],Ht.prototype,"img");ce([h({type:Boolean,attribute:"label-hidden",reflect:!0})],Ht.prototype,"labelHidden");ce([h({type:String,reflect:!0})],Ht.prototype,"icon");ce([h({type:Boolean,attribute:"icon-hidden",reflect:!0})],Ht.prototype,"iconHidden");ce([h({type:Boolean,reflect:!0})],Ht.prototype,"vertical");var fa=Object.defineProperty,ma=Object.getOwnPropertyDescriptor,I=(i,t,e,n)=>{for(var r=n>1?void 0:n?ma(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&fa(t,e,r),r};const yr=class extends E{constructor(){super(...arguments),this._value=0,this.vertical=!1,this.slider=!1,this._input=zt(),this.onValueChange=new Event("change")}set value(t){this.setValue(t.toString())}get value(){return this._value}onChange(t){t.stopPropagation();const{value:e}=this._input;e&&this.setValue(e.value)}setValue(t){const{value:e}=this._input;let n=t;if(n=n.replace(/[^0-9.-]/g,""),n=n.replace(/(\..*)\./g,"$1"),n.endsWith(".")||(n.lastIndexOf("-")>0&&(n=n[0]+n.substring(1).replace(/-/g,"")),n==="-"||n==="-0"))return;let r=Number(n);Number.isNaN(r)||(r=this.min!==void 0?Math.max(r,this.min):r,r=this.max!==void 0?Math.min(r,this.max):r,this.value!==r&&(this._value=r,e&&(e.value=this.value.toString()),this.requestUpdate(),this.dispatchEvent(this.onValueChange)))}onBlur(){const{value:t}=this._input;t&&Number.isNaN(Number(t.value))&&(t.value=this.value.toString())}onSliderMouseDown(t){document.body.style.cursor="w-resize";const{clientX:e}=t,n=this.value;let r=!1;const s=l=>{var c;r=!0;const{clientX:u}=l,d=this.step??1,f=((c=d.toString().split(".")[1])==null?void 0:c.length)||0,p=1/(this.sensitivity??1),g=(u-e)/p;if(Math.floor(Math.abs(g))!==Math.abs(g))return;const v=n+g*d;this.setValue(v.toFixed(f))},o=()=>{this.slider=!0,this.removeEventListener("blur",o)},a=()=>{document.removeEventListener("mousemove",s),document.body.style.cursor="default",r?r=!1:(this.addEventListener("blur",o),this.slider=!1,requestAnimationFrame(()=>this.focus())),document.removeEventListener("mouseup",a)};document.addEventListener("mousemove",s),document.addEventListener("mouseup",a)}onFocus(t){t.stopPropagation();const e=n=>{n.key==="Escape"&&(this.blur(),window.removeEventListener("keydown",e))};window.addEventListener("keydown",e)}connectedCallback(){super.connectedCallback(),this.min&&this.min>this.value&&(this._value=this.min),this.max&&this.max<this.value&&(this._value=this.max)}focus(){const{value:t}=this._input;t&&t.focus()}render(){const t=m`
      ${this.pref||this.icon?m`<bim-label
            style="pointer-events: auto"
            @mousedown=${this.onSliderMouseDown}
            .icon=${this.icon}
            >${this.pref}</bim-label
          >`:null}
      <input
        ${Rt(this._input)}
        type="text"
        aria-label=${this.label||this.name||"Number Input"}
        size="1"
        @input=${a=>a.stopPropagation()}
        @change=${this.onChange}
        @blur=${this.onBlur}
        @focus=${this.onFocus}
        .value=${this.value.toString()}
      />
      ${this.suffix?m`<bim-label
            style="pointer-events: auto"
            @mousedown=${this.onSliderMouseDown}
            >${this.suffix}</bim-label
          >`:null}
    `,e=this.min??-1/0,n=this.max??1/0,r=100*(this.value-e)/(n-e),s=m`
      <style>
        .slider-indicator {
          width: ${`${r}%`};
        }
      </style>
      <div class="slider" @mousedown=${this.onSliderMouseDown}>
        <div class="slider-indicator"></div>
        ${this.pref||this.icon?m`<bim-label
              style="z-index: 1; margin-right: 0.125rem"
              .icon=${this.icon}
              >${`${this.pref}: `}</bim-label
            >`:null}
        <bim-label style="z-index: 1;">${this.value}</bim-label>
        ${this.suffix?m`<bim-label style="z-index: 1;">${this.suffix}</bim-label>`:null}
      </div>
    `,o=`${this.label||this.name||this.pref?`${this.label||this.name||this.pref}: `:""}${this.value}${this.suffix??""}`;return m`
      <bim-input
        title=${o}
        .label=${this.label}
        .icon=${this.icon}
        .vertical=${this.vertical}
      >
        ${this.slider?s:t}
      </bim-input>
    `}};yr.styles=C`
    :host {
      --bim-input--bgc: var(
        --bim-number-input--bgc,
        var(--bim-ui_bg-contrast-20)
      );
      --bim-input--olw: var(--bim-number-input--olw, 2px);
      --bim-input--olc: var(--bim-number-input--olc, transparent);
      --bim-input--bdrs: var(--bim-number-input--bdrs, var(--bim-ui_size-4xs));
      --bim-input--p: 0 0.375rem;
      flex: 1;
      display: block;
    }

    :host(:focus) {
      --bim-input--olw: var(--bim-number-input--olw, 2px);
      --bim-input--olc: var(
        --bim-number-input¡focus--c,
        var(--bim-ui_accent-base)
      );
    }

    :host(:not([slider])) bim-label {
      --bim-label--c: var(
        --bim-number-input_affixes--c,
        var(--bim-ui_bg-contrast-60)
      );
      --bim-label--fz: var(
        --bim-number-input_affixes--fz,
        var(--bim-ui_size-xs)
      );
    }

    p {
      margin: 0;
      padding: 0;
    }

    input {
      background-color: transparent;
      outline: none;
      border: none;
      padding: 0;
      flex-grow: 1;
      text-align: right;
      font-family: inherit;
      font-feature-settings: inherit;
      font-variation-settings: inherit;
      font-size: var(--bim-number-input--fz, var(--bim-ui_size-xs));
      color: var(--bim-number-input--c, var(--bim-ui_bg-contrast-100));
    }

    :host([suffix]:not([pref])) input {
      text-align: left;
    }

    :host([slider]) {
      --bim-input--p: 0;
    }

    :host([slider]) .slider {
      --bim-label--c: var(--bim-ui_bg-contrast-100);
    }

    .slider {
      position: relative;
      display: flex;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 0 0.5rem;
    }

    .slider-indicator {
      height: 100%;
      background-color: var(--bim-ui_main-base);
      position: absolute;
      top: 0;
      left: 0;
      border-radius: var(--bim-input--bdrs, var(--bim-ui_size-4xs));
    }

    bim-input {
      display: flex;
    }

    bim-label {
      pointer-events: none;
    }
  `;let j=yr;I([h({type:String,reflect:!0})],j.prototype,"name",2);I([h({type:String,reflect:!0})],j.prototype,"icon",2);I([h({type:String,reflect:!0})],j.prototype,"label",2);I([h({type:String,reflect:!0})],j.prototype,"pref",2);I([h({type:Number,reflect:!0})],j.prototype,"min",2);I([h({type:Number,reflect:!0})],j.prototype,"value",1);I([h({type:Number,reflect:!0})],j.prototype,"step",2);I([h({type:Number,reflect:!0})],j.prototype,"sensitivity",2);I([h({type:Number,reflect:!0})],j.prototype,"max",2);I([h({type:String,reflect:!0})],j.prototype,"suffix",2);I([h({type:Boolean,reflect:!0})],j.prototype,"vertical",2);I([h({type:Boolean,reflect:!0})],j.prototype,"slider",2);var ba=Object.defineProperty,ga=Object.getOwnPropertyDescriptor,ue=(i,t,e,n)=>{for(var r=n>1?void 0:n?ga(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&ba(t,e,r),r};const _r=class extends E{constructor(){super(...arguments),this.onValueChange=new Event("change"),this._hidden=!1,this.headerHidden=!1,this.valueTransform={},this.activationButton=document.createElement("bim-button")}set hidden(t){this._hidden=t,this.activationButton.active=!t,this.dispatchEvent(new Event("hiddenchange"))}get hidden(){return this._hidden}get value(){return Se(this,this.valueTransform)}set value(t){const e=[...this.children];for(const n in t){const r=e.find(o=>{const a=o;return a.name===n||a.label===n});if(!r)continue;const s=r;s.value=t[n]}}animatePanles(){const t=[{maxHeight:"100vh",maxWidth:"100vw",opacity:1},{maxHeight:"100vh",maxWidth:"100vw",opacity:0},{maxHeight:0,maxWidth:0,opacity:0}];this.animate(t,{duration:300,easing:"cubic-bezier(0.65, 0.05, 0.36, 1)",direction:this.hidden?"normal":"reverse",fill:"forwards"})}connectedCallback(){super.connectedCallback(),this.activationButton.active=!this.hidden,this.activationButton.onclick=()=>{this.hidden=!this.hidden,this.animatePanles()}}disconnectedCallback(){super.disconnectedCallback(),this.activationButton.remove()}collapseSections(){const t=this.querySelectorAll("bim-panel-section");for(const e of t)e.collapsed=!0}expandSections(){const t=this.querySelectorAll("bim-panel-section");for(const e of t)e.collapsed=!1}render(){return this.activationButton.icon=this.icon,this.activationButton.label=this.label||this.name,this.activationButton.tooltipTitle=this.label||this.name,m`
      <div class="parent">
        ${this.label||this.name||this.icon?m`<bim-label .icon=${this.icon}>${this.label}</bim-label>`:null}
        <div class="sections">
          <slot></slot>
        </div>
      </div>
    `}};_r.styles=[ct.scrollbar,C`
      :host {
        display: flex;
        border-radius: var(--bim-ui_size-base);
        background-color: var(--bim-ui_bg-base);
        overflow: auto;
      }

      :host([hidden]) {
        max-height: 0;
        max-width: 0;
        opacity: 0;
      }

      .parent {
        display: flex;
        flex: 1;
        flex-direction: column;
        pointer-events: auto;
        overflow: auto;
      }

      .parent bim-label {
        --bim-label--c: var(--bim-panel--c, var(--bim-ui_bg-contrast-80));
        --bim-label--fz: var(--bim-panel--fz, var(--bim-ui_size-sm));
        font-weight: 600;
        padding: 1rem;
        flex-shrink: 0;
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
      }

      :host([header-hidden]) .parent bim-label {
        display: none;
      }

      .sections {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: auto;
        flex: 1;
      }

      ::slotted(bim-panel-section:not(:last-child)) {
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
      }
    `];let _t=_r;ue([h({type:String,reflect:!0})],_t.prototype,"icon",2);ue([h({type:String,reflect:!0})],_t.prototype,"name",2);ue([h({type:String,reflect:!0})],_t.prototype,"label",2);ue([h({type:Boolean,reflect:!0})],_t.prototype,"hidden",1);ue([h({type:Boolean,attribute:"header-hidden",reflect:!0})],_t.prototype,"headerHidden",2);var va=Object.defineProperty,he=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&va(t,e,r),r};const xr=class extends E{constructor(){super(...arguments),this.onValueChange=new Event("change"),this.valueTransform={},this.componentHeight=-1}get value(){const t=this.parentElement;let e;return t instanceof _t&&(e=t.valueTransform),Object.values(this.valueTransform).length!==0&&(e=this.valueTransform),Se(this,e)}set value(t){const e=[...this.children];for(const n in t){const r=e.find(o=>{const a=o;return a.name===n||a.label===n});if(!r)continue;const s=r;s.value=t[n]}}setFlexAfterTransition(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".components");e&&setTimeout(()=>{this.collapsed?e.style.removeProperty("flex"):e.style.setProperty("flex","1")},150)}animateHeader(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".components");this.componentHeight<0&&(this.collapsed?this.componentHeight=e.clientHeight:(e.style.setProperty("transition","none"),e.style.setProperty("height","auto"),e.style.setProperty("padding","0.125rem 1rem 1rem"),this.componentHeight=e.clientHeight,requestAnimationFrame(()=>{e.style.setProperty("height","0px"),e.style.setProperty("padding","0 1rem 0"),e.style.setProperty("transition","height 0.25s cubic-bezier(0.65, 0.05, 0.36, 1), padding 0.25s cubic-bezier(0.65, 0.05, 0.36, 1)")}))),this.collapsed?(e.style.setProperty("height",`${this.componentHeight}px`),requestAnimationFrame(()=>{e.style.setProperty("height","0px"),e.style.setProperty("padding","0 1rem 0")})):(e.style.setProperty("height","0px"),e.style.setProperty("padding","0 1rem 0"),requestAnimationFrame(()=>{e.style.setProperty("height",`${this.componentHeight}px`),e.style.setProperty("padding","0.125rem 1rem 1rem")})),this.setFlexAfterTransition()}onHeaderClick(){this.fixed||(this.collapsed=!this.collapsed,this.animateHeader())}handelSlotChange(t){t.target.assignedElements({flatten:!0}).forEach((e,n)=>{const r=n*.05;e.style.setProperty("transition-delay",`${r}s`)})}handlePointerEnter(){const t=this.renderRoot.querySelector(".expand-icon");this.collapsed?t==null||t.style.setProperty("animation","collapseAnim 0.5s"):t==null||t.style.setProperty("animation","expandAnim 0.5s")}handlePointerLeave(){const t=this.renderRoot.querySelector(".expand-icon");t==null||t.style.setProperty("animation","none")}render(){const t=this.label||this.icon||this.name||this.fixed,e=m`<svg
      xmlns="http://www.w3.org/2000/svg"
      height="1.125rem"
      viewBox="0 0 24 24"
      width="1.125rem"
      class="expand-icon"
    >
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
    </svg>`,n=m`
      <div
        class="header"
        title=${this.label??""}
        @pointerenter=${this.handlePointerEnter}
        @pointerleave=${this.handlePointerLeave}
        @click=${this.onHeaderClick}
      >
        ${this.label||this.icon||this.name?m`<bim-label .icon=${this.icon}>${this.label}</bim-label>`:null}
        ${this.fixed?null:e}
      </div>
    `;return m`
      <div class="parent">
        ${t?n:null}
        <div class="components" style="flex: 1;">
          <div>
            <slot @slotchange=${this.handelSlotChange}></slot>
          </div>
        </div>
      </div>
    `}};xr.styles=[ct.scrollbar,C`
      :host {
        display: block;
        pointer-events: auto;
      }

      :host .parent {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      :host(:not([fixed])) .header:hover {
        --bim-label--c: var(--bim-ui_accent-base);
        color: var(--bim-ui_accent-base);
        cursor: pointer;
      }

      :host(:not([fixed])) .header:hover .expand-icon {
        fill: var(--bim-ui_accent-base);
      }

      .header {
        --bim-label--fz: var(--bim-ui_size-sm);
        --bim-label--c: var(
          --bim-panel-section_hc,
          var(--bim-ui_bg-contrast-80)
        );
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        height: 1.5rem;
        padding: 0.75rem 1rem;
      }

      .expand-icon {
        fill: var(--bim-ui_bg-contrast-80);
        transition: transform 0.2s;
      }

      :host([collapsed]) .expand-icon {
        transform: rotateZ(-180deg);
      }

      .title {
        display: flex;
        align-items: center;
        column-gap: 0.5rem;
      }

      .title p {
        font-size: var(--bim-ui_size-sm);
      }

      .components {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        row-gap: 0.75rem;
        padding: 0 1rem 1rem;
        box-sizing: border-box;
        transition:
          height 0.25s cubic-bezier(0.65, 0.05, 0.36, 1),
          padding 0.25s cubic-bezier(0.65, 0.05, 0.36, 1);
      }

      .components > div {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex: 1;
        overflow: auto;
      }

      :host(:not([icon]):not([label])) .components {
        padding: 1rem;
      }

      :host(:not([fixed])[collapsed]) .components {
        padding: 0 1rem 0;
        height: 0px;
      }

      bim-label {
        pointer-events: none;
      }

      ::slotted(*) {
        transition:
          transform 0.25s cubic-bezier(0.65, 0.05, 0.36, 1),
          opacity 0.25s cubic-bezier(0.65, 0.05, 0.36, 1);
      }

      :host(:not([fixed])[collapsed]) ::slotted(*) {
        transform: translateX(-20%);
        opacity: 0;
      }

      @keyframes expandAnim {
        0%,
        100% {
          transform: translateY(0%);
        }
        25% {
          transform: translateY(-30%);
        }
        50% {
          transform: translateY(10%);
        }
        75% {
          transform: translateY(-30%);
        }
      }

      @keyframes collapseAnim {
        0%,
        100% {
          transform: translateY(0%) rotateZ(-180deg);
        }
        25% {
          transform: translateY(30%) rotateZ(-180deg);
        }
        50% {
          transform: translateY(-10%) rotateZ(-180deg);
        }
        75% {
          transform: translateY(30%) rotateZ(-180deg);
        }
      }
    `];let Mt=xr;he([h({type:String,reflect:!0})],Mt.prototype,"icon");he([h({type:String,reflect:!0})],Mt.prototype,"label");he([h({type:String,reflect:!0})],Mt.prototype,"name");he([h({type:Boolean,reflect:!0})],Mt.prototype,"fixed");he([h({type:Boolean,reflect:!0})],Mt.prototype,"collapsed");var ya=Object.defineProperty,de=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&ya(t,e,r),r};const wr=class extends E{constructor(){super(...arguments),this.vertical=!1,this.onValueChange=new Event("change"),this._canEmitEvents=!1,this._value=document.createElement("bim-option"),this.onOptionClick=t=>{this._value=t.target,this.setAnimatedBackgound(),this.dispatchEvent(this.onValueChange);for(const e of this.children)e instanceof T&&(e.checked=e===t.target)}}get _options(){return[...this.querySelectorAll("bim-option")]}set value(t){const e=this.findOption(t);if(e){for(const n of this._options)n.checked=n===e;this._value=e,this.setAnimatedBackgound(),this._canEmitEvents&&this.dispatchEvent(this.onValueChange)}}get value(){return this._value.value}onSlotChange(t){const e=t.target.assignedElements();for(const n of e)n instanceof T&&(n.noMark=!0,n.removeEventListener("click",this.onOptionClick),n.addEventListener("click",this.onOptionClick))}findOption(t){return this._options.find(e=>e instanceof T?e.label===t||e.value===t:!1)}doubleRequestAnimationFrames(t){requestAnimationFrame(()=>requestAnimationFrame(t))}setAnimatedBackgound(t=!1){const e=this.renderRoot.querySelector(".animated-background"),n=this._value;requestAnimationFrame(()=>{var r,s,o,a;const l=(a=(o=(s=(r=n==null?void 0:n.parentElement)==null?void 0:r.shadowRoot)==null?void 0:s.querySelector("bim-input"))==null?void 0:o.shadowRoot)==null?void 0:a.querySelector(".input"),c={width:n==null?void 0:n.clientWidth,height:n==null?void 0:n.clientHeight,top:((n==null?void 0:n.offsetTop)??0)-((l==null?void 0:l.offsetTop)??0),left:((n==null?void 0:n.offsetLeft)??0)-((l==null?void 0:l.offsetLeft)??0)};e==null||e.style.setProperty("width",`${c.width}px`),e==null||e.style.setProperty("height",`${c.height}px`),e==null||e.style.setProperty("top",`${c.top}px`),e==null||e.style.setProperty("left",`${c.left}px`)}),t&&this.doubleRequestAnimationFrames(()=>{const r="ease";e==null||e.style.setProperty("transition",`width ${.3}s ${r}, height ${.3}s ${r}, top ${.3}s ${r}, left ${.3}s ${r}`)})}firstUpdated(){const t=[...this.children].find(e=>e instanceof T&&e.checked);t&&(this._value=t),window.addEventListener("load",()=>{this.setAnimatedBackgound(!0)}),new ResizeObserver(()=>{this.setAnimatedBackgound()}).observe(this)}render(){return m`
      <bim-input
        .vertical=${this.vertical}
        .label=${this.label}
        .icon=${this.icon}
      >
        <div class="animated-background"></div>
        <slot @slotchange=${this.onSlotChange}></slot>
      </bim-input>
    `}};wr.styles=C`
    :host {
      --bim-input--bgc: var(--bim-ui_bg-contrast-20);
      --bim-input--g: 0;
      --bim-option--jc: center;
      flex: 1;
      display: block;
    }

    ::slotted(bim-option) {
      position: relative;
      border-radius: 0;
      overflow: hidden;
      min-width: min-content;
      min-height: min-content;
      transition: background-color 0.2s;
    }

    .animated-background {
      position: absolute;
      background: var(--bim-ui_main-base);
      width: 0;
      height: 0;
      top: 0;
      left: 0;
    }

    ::slotted(bim-option[checked]) {
      --bim-label--c: var(--bim-ui_main-contrast);
    }

    ::slotted(bim-option:not([checked]):hover) {
      background-color: #0003;
    }
  `;let Bt=wr;de([h({type:String,reflect:!0})],Bt.prototype,"name");de([h({type:String,reflect:!0})],Bt.prototype,"icon");de([h({type:String,reflect:!0})],Bt.prototype,"label");de([h({type:Boolean,reflect:!0})],Bt.prototype,"vertical");de([Lt()],Bt.prototype,"_value");const _a=()=>m`
    <style>
      div {
        display: flex;
        gap: 0.375rem;
        border-radius: 0.25rem;
        min-height: 1.25rem;
      }

      [data-type="row"] {
        background-color: var(--bim-ui_bg-contrast-10);
        animation: row-loading 1s linear infinite alternate;
        padding: 0.5rem;
      }

      [data-type="cell"] {
        background-color: var(--bim-ui_bg-contrast-20);
        flex: 0.25;
      }

      @keyframes row-loading {
        0% {
          background-color: var(--bim-ui_bg-contrast-10);
        }
        100% {
          background-color: var(--bim-ui_bg-contrast-20);
        }
      }
    </style>
    <div style="display: flex; flex-direction: column;">
      <div data-type="row" style="gap: 2rem">
        <div data-type="cell" style="flex: 1"></div>
        <div data-type="cell" style="flex: 2"></div>
        <div data-type="cell" style="flex: 1"></div>
        <div data-type="cell" style="flex: 0.5"></div>
      </div>
      <div style="display: flex;">
        <div data-type="row" style="flex: 1">
          <div data-type="cell" style="flex: 0.5"></div>
        </div>
        <div data-type="row" style="flex: 2">
          <div data-type="cell" style="flex: 0.75"></div>
        </div>
        <div data-type="row" style="flex: 1">
          <div data-type="cell"></div>
        </div>
        <div data-type="row" style="flex: 0.5">
          <div data-type="cell" style="flex: 0.75"></div>
        </div>
      </div>
      <div style="display: flex;">
        <div data-type="row" style="flex: 1">
          <div data-type="cell" style="flex: 0.75"></div>
        </div>
        <div data-type="row" style="flex: 2">
          <div data-type="cell"></div>
        </div>
        <div data-type="row" style="flex: 1">
          <div data-type="cell" style="flex: 0.5"></div>
        </div>
        <div data-type="row" style="flex: 0.5">
          <div data-type="cell" style="flex: 0.5"></div>
        </div>
      </div>
      <div style="display: flex;">
        <div data-type="row" style="flex: 1">
          <div data-type="cell"></div>
        </div>
        <div data-type="row" style="flex: 2">
          <div data-type="cell" style="flex: 0.5"></div>
        </div>
        <div data-type="row" style="flex: 1">
          <div data-type="cell" style="flex: 0.75"></div>
        </div>
        <div data-type="row" style="flex: 0.5">
          <div data-type="cell" style="flex: 0.7s5"></div>
        </div>
      </div>
    </div>
  `,xa=()=>m`
    <style>
      .loader {
        grid-area: Processing;
        position: relative;
        padding: 0.125rem;
      }
      .loader:before {
        content: "";
        position: absolute;
      }
      .loader .loaderBar {
        position: absolute;
        top: 0;
        right: 100%;
        bottom: 0;
        left: 0;
        background: var(--bim-ui_main-base);
        /* width: 25%; */
        width: 0;
        animation: borealisBar 2s linear infinite;
      }

      @keyframes borealisBar {
        0% {
          left: 0%;
          right: 100%;
          width: 0%;
        }
        10% {
          left: 0%;
          right: 75%;
          width: 25%;
        }
        90% {
          right: 0%;
          left: 75%;
          width: 25%;
        }
        100% {
          left: 100%;
          right: 0%;
          width: 0%;
        }
      }
    </style>
    <div class="loader">
      <div class="loaderBar"></div>
    </div>
  `;var wa=Object.defineProperty,$a=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&wa(t,e,r),r};const $r=class extends E{constructor(){super(...arguments),this.column="",this.columnIndex=0,this.rowData={}}get data(){return this.column?this.rowData[this.column]:null}render(){return m`
      <style>
        :host {
          grid-area: ${this.column??"unset"};
        }
      </style>
      <slot></slot>
    `}};$r.styles=C`
    :host {
      padding: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host([data-column-index="0"]) {
      justify-content: normal;
    }

    :host([data-column-index="0"]:not([data-cell-header]))
      ::slotted(bim-label) {
      text-align: left;
    }

    ::slotted(*) {
      --bim-input--bgc: transparent;
      --bim-input--olc: var(--bim-ui_bg-contrast-20);
      --bim-input--olw: 1px;
    }

    ::slotted(bim-input) {
      --bim-input--olw: 0;
    }

    ::slotted(bim-label) {
      white-space: normal;
      text-align: center;
    }
  `;let Er=$r;$a([h({type:String,reflect:!0})],Er.prototype,"column");const kr=class extends E{constructor(){super(...arguments),this._groups=[],this.group=this.closest("bim-table-group"),this._data=[],this.table=this.closest("bim-table")}get data(){var t;return((t=this.group)==null?void 0:t.data.children)??this._data}set data(t){this._data=t}render(){return this._groups=[],m`
      <slot></slot>
      ${this.data.map(t=>{const e=document.createElement("bim-table-group");return this._groups.push(e),e.table=this.table,e.data=t,e})}
    `}};kr.styles=C`
    :host {
      --bim-button--bgc: transparent;
      position: relative;
      display: block;
      overflow: hidden;
      grid-area: Children;
    }

    :host([hidden]) {
      height: 0;
      opacity: 0;
    }

    ::slotted(.branch.branch-vertical) {
      top: 0;
      bottom: 1.125rem;
    }
  `;let Ea=kr;var ka=Object.defineProperty,Ca=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&ka(t,e,r),r};const Cr=class extends E{constructor(){super(...arguments),this.childrenHidden=!0,this.table=this.closest("bim-table"),this.data={data:{}}}get rowElement(){const t=this.shadowRoot;return t?t.querySelector("bim-table-row"):null}get childrenElement(){const t=this.shadowRoot;return t?t.querySelector("bim-table-children"):null}get _isChildrenEmpty(){return!(this.data.children&&this.data.children.length!==0)}connectedCallback(){super.connectedCallback(),this.table&&this.table.expanded?this.childrenHidden=!1:this.childrenHidden=!0}toggleChildren(t){this.childrenHidden=typeof t>"u"?!this.childrenHidden:!t,this.animateTableChildren(!0)}animateTableChildren(t=!0){if(!t){requestAnimationFrame(()=>{var o;const a=this.renderRoot.querySelector(".caret"),l=this.renderRoot.querySelector(".branch-vertical"),c=(o=this.renderRoot.querySelector("bim-table-children"))==null?void 0:o.querySelector(".branch-vertical");a.style.setProperty("transform",`translateY(-50%) rotate(${this.childrenHidden?"0":"90"}deg)`),l.style.setProperty("transform",`scaleY(${this.childrenHidden?"0":"1"})`),c==null||c.style.setProperty("transform",`scaleY(${this.childrenHidden?"0":"1"})`)});return}const e=500,n=0,r=200,s=350;requestAnimationFrame(()=>{var o;const a=this.renderRoot.querySelector("bim-table-children"),l=this.renderRoot.querySelector(".caret"),c=this.renderRoot.querySelector(".branch-vertical"),u=(o=this.renderRoot.querySelector("bim-table-children"))==null?void 0:o.querySelector(".branch-vertical"),d=()=>{const b=a==null?void 0:a.renderRoot.querySelectorAll("bim-table-group");b==null||b.forEach(($,x)=>{$.style.setProperty("opacity","0"),$.style.setProperty("left","-30px");const y=[{opacity:"0",left:"-30px"},{opacity:"1",left:"0"}];$.animate(y,{duration:e/2,delay:50+x*n,easing:"cubic-bezier(0.65, 0.05, 0.36, 1)",fill:"forwards"})})},f=()=>{const b=[{transform:"translateY(-50%) rotate(90deg)"},{transform:"translateY(-50%) rotate(0deg)"}];l==null||l.animate(b,{duration:s,easing:"cubic-bezier(0.68, -0.55, 0.27, 1.55)",fill:"forwards",direction:this.childrenHidden?"normal":"reverse"})},p=()=>{const b=[{transform:"scaleY(1)"},{transform:"scaleY(0)"}];c==null||c.animate(b,{duration:r,easing:"cubic-bezier(0.4, 0, 0.2, 1)",delay:n,fill:"forwards",direction:this.childrenHidden?"normal":"reverse"})},g=()=>{var b;const $=(b=this.renderRoot.querySelector("bim-table-row"))==null?void 0:b.querySelector(".branch-horizontal");if($){$.style.setProperty("transform-origin","center right");const x=[{transform:"scaleX(0)"},{transform:"scaleX(1)"}];$.animate(x,{duration:r,easing:"cubic-bezier(0.4, 0, 0.2, 1)",fill:"forwards",direction:this.childrenHidden?"normal":"reverse"})}},v=()=>{const b=[{transform:"scaleY(0)"},{transform:"scaleY(1)"}];u==null||u.animate(b,{duration:r*1.2,easing:"cubic-bezier(0.4, 0, 0.2, 1)",fill:"forwards",delay:(n+r)*.7})};d(),f(),p(),g(),v()})}firstUpdated(){this.renderRoot.querySelectorAll(".caret").forEach(t=>{var e,n,r;if(!this.childrenHidden){t.style.setProperty("transform","translateY(-50%) rotate(90deg)");const s=(e=t.parentElement)==null?void 0:e.querySelector(".branch-horizontal");s&&s.style.setProperty("transform","scaleX(0)");const o=(r=(n=t.parentElement)==null?void 0:n.parentElement)==null?void 0:r.querySelectorAll(".branch-vertical");o==null||o.forEach(a=>{a.style.setProperty("transform","scaleY(1)")})}})}render(){if(!this.table)throw new Error("TableGroup: parent table wasn't found!");const t=this.table.getGroupIndentation(this.data)??0,e=m`
      ${this.table.noIndentation?null:m`
            <style>
              .branch-vertical {
                left: ${t+(this.table.selectableRows?1.9375:.5625)}rem;
              }
            </style>
            <div class="branch branch-vertical"></div>
          `}
    `;let n=null;this.table.noIndentation||(n=document.createElement("div"),n.classList.add("branch","branch-horizontal"),n.style.left=`${t-1+(this.table.selectableRows?2.05:.5625)}rem`);let r=null;if(!this.table.noIndentation){r=document.createElement("div");const a=document.createElementNS("http://www.w3.org/2000/svg","svg");if(a.setAttribute("height","9.9"),a.setAttribute("width","7.5"),a.setAttribute("viewBox","0 0 4.6666672 7.7"),this.table.noCarets){const l=document.createElementNS("http://www.w3.org/2000/svg","circle");l.setAttribute("cx","2.3333336"),l.setAttribute("cy","3.85"),l.setAttribute("r","2.5"),a.append(l)}else{const l=document.createElementNS("http://www.w3.org/2000/svg","path");l.setAttribute("d","m 1.7470835,6.9583848 2.5899999,-2.59 c 0.39,-0.39 0.39,-1.02 0,-1.41 L 1.7470835,0.36838483 c -0.63,-0.62000003 -1.71000005,-0.18 -1.71000005,0.70999997 v 5.17 c 0,0.9 1.08000005,1.34 1.71000005,0.71 z"),a.append(l),r.style.cursor="pointer",r.addEventListener("click",c=>{c.stopPropagation(),this.toggleChildren()})}r.classList.add("caret"),r.style.left=`${(this.table.selectableRows?1.5:.125)+t}rem`,r.append(a)}const s=document.createElement("bim-table-row");if(!this._isChildrenEmpty){const a=document.createDocumentFragment();Pt(e,a),s.append(a)}s.table=this.table,s.group=this,this.table.dispatchEvent(new CustomEvent("rowcreated",{detail:{row:s}})),r&&!this._isChildrenEmpty&&s.append(r),t!==0&&n&&s.append(n);let o;if(!this._isChildrenEmpty&&!this.childrenHidden){o=document.createElement("bim-table-children"),o.table=this.table,o.group=this;const a=document.createDocumentFragment();Pt(e,a),o.append(a),this.animateTableChildren()}return m`<div class="parent">${s} ${o}</div>`}};Cr.styles=C`
    :host {
      position: relative;
    }

    .parent {
      display: grid;
      grid-template-areas: "Data" "Children";
    }

    .branch {
      position: absolute;
      z-index: 1;
    }

    .branch-vertical {
      border-left: 1px dotted var(--bim-ui_bg-contrast-40);
      transform-origin: top center;
      transform: scaleY(0);
    }

    .branch-horizontal {
      top: 50%;
      width: 1rem;
      border-bottom: 1px dotted var(--bim-ui_bg-contrast-40);
    }

    .branch-horizontal {
      transform-origin: center left;
    }

    .caret {
      position: absolute;
      z-index: 2;
      transform: translateY(-50%) rotate(0deg);
      top: 50%;
      display: flex;
      width: 0.95rem;
      height: 0.95rem;
      justify-content: center;
      align-items: center;
    }

    .caret svg {
      fill: var(--bim-ui_bg-contrast-60);
    }
  `;let Ar=Cr;Ca([h({type:Boolean,attribute:"children-hidden",reflect:!0})],Ar.prototype,"childrenHidden");var Aa=Object.defineProperty,pe=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&Aa(t,e,r),r};const Sr=class extends E{constructor(){super(...arguments),this.selected=!1,this.columns=[],this.hiddenColumns=[],this.group=this.closest("bim-table-group"),this._data={},this.isHeader=!1,this.table=this.closest("bim-table"),this.onTableColumnsChange=()=>{this.table&&(this.columns=this.table.columns)},this.onTableColumnsHidden=()=>{this.table&&(this.hiddenColumns=this.table.hiddenColumns)},this._observer=new IntersectionObserver(t=>{this._intersecting=t[0].isIntersecting},{rootMargin:"36px"})}get groupData(){var t;return(t=this.group)==null?void 0:t.data}get data(){var t;return((t=this.group)==null?void 0:t.data.data)??this._data}set data(t){this._data=t}get _columnNames(){return this.columns.filter(t=>!this.hiddenColumns.includes(t.name)).map(t=>t.name)}get _columnWidths(){return this.columns.filter(t=>!this.hiddenColumns.includes(t.name)).map(t=>t.width)}get _isSelected(){var t;return(t=this.table)==null?void 0:t.selection.has(this.data)}onSelectionChange(t){if(!this.table)return;const e=t.target;this.selected=e.value,e.value?(this.table.selection.add(this.data),this.table.dispatchEvent(new CustomEvent("rowselected",{detail:{data:this.data}}))):(this.table.selection.delete(this.data),this.table.dispatchEvent(new CustomEvent("rowdeselected",{detail:{data:this.data}})))}connectedCallback(){super.connectedCallback(),this._observer.observe(this),this.table&&(this.columns=this.table.columns,this.hiddenColumns=this.table.hiddenColumns,this.table.addEventListener("columnschange",this.onTableColumnsChange),this.table.addEventListener("columnshidden",this.onTableColumnsHidden),this.toggleAttribute("selected",this._isSelected))}disconnectedCallback(){super.disconnectedCallback(),this._observer.unobserve(this),this.table&&(this.columns=[],this.hiddenColumns=[],this.table.removeEventListener("columnschange",this.onTableColumnsChange),this.table.removeEventListener("columnshidden",this.onTableColumnsHidden),this.toggleAttribute("selected",!1))}compute(){if(!this.table)throw new Error("TableRow: parent table wasn't found!");const t=this.table.getRowIndentation(this.data)??0,e=this.isHeader?this.data:this.table.applyDataTransform(this.group)??this.data,n=[];for(const r in e){if(this.hiddenColumns.includes(r))continue;const s=e[r];let o;if(typeof s=="string"||typeof s=="boolean"||typeof s=="number"?(o=document.createElement("bim-label"),o.textContent=String(s)):s instanceof HTMLElement?o=s:(o=document.createDocumentFragment(),Pt(s,o)),!o)continue;const a=document.createElement("bim-table-cell");a.append(o),a.column=r,this._columnNames.indexOf(r)===0&&(a.style.marginLeft=`${this.table.noIndentation?0:t+.75}rem`);const l=this._columnNames.indexOf(r);a.setAttribute("data-column-index",String(l)),a.toggleAttribute("data-no-indentation",l===0&&this.table.noIndentation),a.toggleAttribute("data-cell-header",this.isHeader),a.rowData=this.data,this.table.dispatchEvent(new CustomEvent("cellcreated",{detail:{cell:a}})),n.push(a)}return this.style.gridTemplateAreas=`"${this.table.selectableRows?"Selection":""} ${this._columnNames.join(" ")}"`,this.style.gridTemplateColumns=`${this.table.selectableRows?"1.6rem":""} ${this._columnWidths.join(" ")}`,m`
      ${!this.isHeader&&this.table.selectableRows?m`<bim-checkbox
            @change=${this.onSelectionChange}
            .checked=${this._isSelected}
            style="align-self: center; justify-self: center"
          ></bim-checkbox>`:null}
      ${n}
      <slot></slot>
    `}render(){return m`${this._intersecting?this.compute():m``}`}};Sr.styles=C`
    :host {
      position: relative;
      grid-area: Data;
      display: grid;
      min-height: 2.25rem;
      transition: all 0.15s;
    }

    ::slotted(.branch.branch-vertical) {
      top: 50%;
      bottom: 0;
    }

    :host([selected]) {
      background-color: color-mix(
        in lab,
        var(--bim-ui_bg-contrast-20) 30%,
        var(--bim-ui_main-base) 10%
      );
    }
  `;let It=Sr;pe([h({type:Boolean,reflect:!0})],It.prototype,"selected");pe([h({attribute:!1})],It.prototype,"columns");pe([h({attribute:!1})],It.prototype,"hiddenColumns");pe([h({type:Boolean,attribute:"is-header",reflect:!0})],It.prototype,"isHeader");pe([Lt()],It.prototype,"_intersecting");var Sa=Object.defineProperty,Oa=Object.getOwnPropertyDescriptor,F=(i,t,e,n)=>{for(var r=n>1?void 0:n?Oa(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&Sa(t,e,r),r};const Or=class extends E{constructor(){super(...arguments),this._filteredData=[],this.headersHidden=!1,this.minColWidth="4rem",this._columns=[],this._textDelimiters={comma:",",tab:"	"},this._queryString=null,this._data=[],this.expanded=!1,this.preserveStructureOnFilter=!1,this.indentationInText=!1,this.dataTransform={},this.selectableRows=!1,this.selection=new Set,this.noIndentation=!1,this.noCarets=!1,this.loading=!1,this._errorLoading=!1,this._onColumnsHidden=new Event("columnshidden"),this._hiddenColumns=[],this._stringFilterFunction=(t,e)=>Object.values(e.data).some(n=>String(n).toLowerCase().includes(t.toLowerCase())),this._queryFilterFunction=(t,e)=>{let n=!1;const r=si(t)??[];for(const s of r){if("queries"in s){n=!1;break}const{condition:o,value:a}=s;let{key:l}=s;if(l.startsWith("[")&&l.endsWith("]")){const c=l.replace("[","").replace("]","");l=c,n=Object.keys(e.data).filter(u=>u.includes(c)).map(u=>cn(e.data[u],o,a)).some(u=>u)}else n=cn(e.data[l],o,a);if(!n)break}return n}}set columns(t){const e=[];for(const n of t){const r=typeof n=="string"?{name:n,width:`minmax(${this.minColWidth}, 1fr)`}:n;e.push(r)}this._columns=e,this.computeMissingColumns(this.data),this.dispatchEvent(new Event("columnschange"))}get columns(){return this._columns}get _headerRowData(){const t={};for(const e of this.columns){const{name:n}=e;t[n]=String(n)}return t}get value(){return this._filteredData}set queryString(t){this.toggleAttribute("data-processing",!0),this._queryString=t&&t.trim()!==""?t.trim():null,this.updateFilteredData(),this.toggleAttribute("data-processing",!1)}get queryString(){return this._queryString}set data(t){this._data=t,this.updateFilteredData(),this.computeMissingColumns(t)&&(this.columns=this._columns)}get data(){return this._data}get dataAsync(){return new Promise(t=>{setTimeout(()=>{t(this.data)})})}set hiddenColumns(t){this._hiddenColumns=t,setTimeout(()=>{this.dispatchEvent(this._onColumnsHidden)})}get hiddenColumns(){return this._hiddenColumns}updateFilteredData(){this.queryString?(si(this.queryString)?(this.filterFunction=this._queryFilterFunction,this._filteredData=this.filter(this.queryString)):(this.filterFunction=this._stringFilterFunction,this._filteredData=this.filter(this.queryString)),this.preserveStructureOnFilter&&(this._expandedBeforeFilter===void 0&&(this._expandedBeforeFilter=this.expanded),this.expanded=!0)):(this.preserveStructureOnFilter&&this._expandedBeforeFilter!==void 0&&(this.expanded=this._expandedBeforeFilter,this._expandedBeforeFilter=void 0),this._filteredData=this.data)}computeMissingColumns(t){let e=!1;for(const n of t){const{children:r,data:s}=n;for(const o in s)this._columns.map(a=>typeof a=="string"?a:a.name).includes(o)||(this._columns.push({name:o,width:`minmax(${this.minColWidth}, 1fr)`}),e=!0);if(r){const o=this.computeMissingColumns(r);o&&!e&&(e=o)}}return e}generateText(t="comma",e=this.value,n="",r=!0){const s=this._textDelimiters[t];let o="";const a=this.columns.map(l=>l.name);if(r){this.indentationInText&&(o+=`Indentation${s}`);const l=`${a.join(s)}
`;o+=l}for(const[l,c]of e.entries()){const{data:u,children:d}=c,f=this.indentationInText?`${n}${l+1}${s}`:"",p=a.map(v=>u[v]??""),g=`${f}${p.join(s)}
`;o+=g,d&&(o+=this.generateText(t,c.children,`${n}${l+1}.`,!1))}return o}get csv(){return this.generateText("comma")}get tsv(){return this.generateText("tab")}applyDataTransform(t){const e={};if(!t)return e;const{data:n}=t.data;for(const s of Object.keys(this.dataTransform)){const o=this.columns.find(a=>a.name===s);o&&o.forceDataTransform&&(s in n||(n[s]=""))}const r=n;for(const s in r){const o=this.dataTransform[s];o?e[s]=o(r[s],n,t):e[s]=n[s]}return e}downloadData(t="BIM Table Data",e="json"){let n=null;if(e==="json"&&(n=new File([JSON.stringify(this.value,void 0,2)],`${t}.json`)),e==="csv"&&(n=new File([this.csv],`${t}.csv`)),e==="tsv"&&(n=new File([this.tsv],`${t}.tsv`)),!n)return;const r=document.createElement("a");r.href=URL.createObjectURL(n),r.download=n.name,r.click(),URL.revokeObjectURL(r.href)}getRowIndentation(t,e=this.value,n=0){for(const r of e){if(r.data===t)return n;if(r.children){const s=this.getRowIndentation(t,r.children,n+1);if(s!==null)return s}}return null}getGroupIndentation(t,e=this.value,n=0){for(const r of e){if(r===t)return n;if(r.children){const s=this.getGroupIndentation(t,r.children,n+1);if(s!==null)return s}}return null}connectedCallback(){super.connectedCallback(),this.dispatchEvent(new Event("connected"))}disconnectedCallback(){super.disconnectedCallback(),this.dispatchEvent(new Event("disconnected"))}async loadData(t=!1){if(this._filteredData.length!==0&&!t||!this.loadFunction)return!1;this.loading=!0;try{const e=await this.loadFunction();return this.data=e,this.loading=!1,this._errorLoading=!1,!0}catch(e){if(this.loading=!1,this._filteredData.length!==0)return!1;const n=this.querySelector("[slot='error-loading']"),r=n==null?void 0:n.querySelector("[data-table-element='error-message']");return e instanceof Error&&r&&e.message.trim()!==""&&(r.textContent=e.message),this._errorLoading=!0,!1}}filter(t,e=this.filterFunction??this._stringFilterFunction,n=this.data){const r=[];for(const s of n)if(e(t,s)){if(this.preserveStructureOnFilter){const o={data:s.data};if(s.children){const a=this.filter(t,e,s.children);a.length&&(o.children=a)}r.push(o)}else if(r.push({data:s.data}),s.children){const o=this.filter(t,e,s.children);r.push(...o)}}else if(s.children){const o=this.filter(t,e,s.children);this.preserveStructureOnFilter&&o.length?r.push({data:s.data,children:o}):r.push(...o)}return r}get _missingDataElement(){return this.querySelector("[slot='missing-data']")}render(){if(this.loading)return _a();if(this._errorLoading)return m`<slot name="error-loading"></slot>`;if(this._filteredData.length===0&&this._missingDataElement)return m`<slot name="missing-data"></slot>`;const t=document.createElement("bim-table-row");t.table=this,t.isHeader=!0,t.data=this._headerRowData,t.style.gridArea="Header",t.style.position="sticky",t.style.top="0",t.style.zIndex="5";const e=document.createElement("bim-table-children");return e.table=this,e.data=this.value,e.style.gridArea="Body",e.style.backgroundColor="transparent",m`
      <div class="parent">
        ${this.headersHidden?null:t} ${xa()}
        <div style="overflow-x: hidden; grid-area: Body">${e}</div>
      </div>
    `}};Or.styles=[ct.scrollbar,C`
      :host {
        position: relative;
        overflow: auto;
        display: block;
        pointer-events: auto;
      }

      :host(:not([data-processing])) .loader {
        display: none;
      }

      .parent {
        display: grid;
        grid-template:
          "Header" auto
          "Processing" auto
          "Body" 1fr
          "Footer" auto;
        overflow: auto;
        height: 100%;
      }

      .parent > bim-table-row[is-header] {
        color: var(--bim-table_header--c, var(--bim-ui_bg-contrast-100));
        background-color: var(
          --bim-table_header--bgc,
          var(--bim-ui_bg-contrast-20)
        );
      }

      .controls {
        display: flex;
        gap: 0.375rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
      }
    `];let H=Or;F([Lt()],H.prototype,"_filteredData",2);F([h({type:Boolean,attribute:"headers-hidden",reflect:!0})],H.prototype,"headersHidden",2);F([h({type:String,attribute:"min-col-width",reflect:!0})],H.prototype,"minColWidth",2);F([h({type:Array,attribute:!1})],H.prototype,"columns",1);F([h({type:Array,attribute:!1})],H.prototype,"data",1);F([h({type:Boolean,reflect:!0})],H.prototype,"expanded",2);F([h({type:Boolean,reflect:!0,attribute:"selectable-rows"})],H.prototype,"selectableRows",2);F([h({attribute:!1})],H.prototype,"selection",2);F([h({type:Boolean,attribute:"no-indentation",reflect:!0})],H.prototype,"noIndentation",2);F([h({type:Boolean,attribute:"no-carets",reflect:!0})],H.prototype,"noCarets",2);F([h({type:Boolean,reflect:!0})],H.prototype,"loading",2);F([Lt()],H.prototype,"_errorLoading",2);var Ta=Object.defineProperty,Pa=Object.getOwnPropertyDescriptor,Ft=(i,t,e,n)=>{for(var r=n>1?void 0:n?Pa(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&Ta(t,e,r),r};const Tr=class extends E{constructor(){super(...arguments),this._switchers=[],this.bottom=!1,this.switchersHidden=!1,this.floating=!1,this.switchersFull=!1,this.onTabHiddenChange=t=>{const e=t.target;e instanceof R&&!e.hidden&&(e.removeEventListener("hiddenchange",this.onTabHiddenChange),this.tab=e.name,e.addEventListener("hiddenchange",this.onTabHiddenChange))}}set tab(t){this._tab=t;const e=[...this.children],n=e.find(r=>r instanceof R&&r.name===t);for(const r of e){if(!(r instanceof R))continue;r.hidden=n!==r;const s=this.getTabSwitcher(r.name);s&&s.toggleAttribute("data-active",!r.hidden)}n||(this._tab="hidden",this.setAttribute("tab","hidden"))}get tab(){return this._tab}getTabSwitcher(t){return this._switchers.find(e=>e.getAttribute("data-name")===t)}createSwitchers(){this._switchers=[];for(const t of this.children){if(!(t instanceof R))continue;const e=document.createElement("div");e.addEventListener("click",()=>{this.tab===t.name?this.toggleAttribute("tab",!1):this.tab=t.name,this.setAnimatedBackgound()}),e.setAttribute("data-name",t.name),e.className="switcher";const n=document.createElement("bim-label");n.textContent=t.label??null,n.icon=t.icon,e.append(n),this._switchers.push(e)}}updateSwitchers(){for(const t of this.children){if(!(t instanceof R))continue;const e=this._switchers.find(r=>r.getAttribute("data-name")===t.name);if(!e)continue;const n=e.querySelector("bim-label");n&&(n.textContent=t.label??null,n.icon=t.icon)}}onSlotChange(t){this.createSwitchers();const e=t.target.assignedElements(),n=e.find(r=>r instanceof R?this.tab?r.name===this.tab:!r.hidden:!1);n&&n instanceof R&&(this.tab=n.name);for(const r of e){if(!(r instanceof R)){r.remove();continue}r.removeEventListener("hiddenchange",this.onTabHiddenChange),n!==r&&(r.hidden=!0),r.addEventListener("hiddenchange",this.onTabHiddenChange)}}doubleRequestAnimationFrames(t){requestAnimationFrame(()=>requestAnimationFrame(t))}setAnimatedBackgound(t=!1){var e;const n=this.renderRoot.querySelector(".animated-background"),r=[...((e=this.renderRoot.querySelector(".switchers"))==null?void 0:e.querySelectorAll(".switcher"))||[]].filter(s=>s.hasAttribute("data-active"))[0];requestAnimationFrame(()=>{var s,o,a,l;const c=(l=(a=(o=(s=r==null?void 0:r.parentElement)==null?void 0:s.shadowRoot)==null?void 0:o.querySelector("bim-input"))==null?void 0:a.shadowRoot)==null?void 0:l.querySelector(".input"),u={width:r==null?void 0:r.clientWidth,height:r==null?void 0:r.clientHeight,top:((r==null?void 0:r.offsetTop)??0)-((c==null?void 0:c.offsetTop)??0),left:((r==null?void 0:r.offsetLeft)??0)-((c==null?void 0:c.offsetLeft)??0)};r?(n==null||n.style.setProperty("width",`${u.width}px`),n==null||n.style.setProperty("height",`${u.height}px`),n==null||n.style.setProperty("left",`${u.left}px`)):n==null||n.style.setProperty("width","0"),this.bottom?(n==null||n.style.setProperty("top","100%"),n==null||n.style.setProperty("transform","translateY(-100%)")):n==null||n.style.setProperty("top",`${u.top}px`)}),t&&this.doubleRequestAnimationFrames(()=>{const s="ease";n==null||n.style.setProperty("transition",`width ${.3}s ${s}, height ${.3}s ${s}, top ${.3}s ${s}, left ${.3}s ${s}`)})}firstUpdated(){requestAnimationFrame(()=>{this.setAnimatedBackgound(!0)}),new ResizeObserver(()=>{this.setAnimatedBackgound()}).observe(this)}render(){return m`
      <div class="parent">
        <div class="switchers">
          <div class="animated-background"></div>
          ${this._switchers}
        </div>
        <div class="content">
          <slot @slotchange=${this.onSlotChange}></slot>
        </div>
      </div>
    `}};Tr.styles=[ct.scrollbar,C`
      * {
        box-sizing: border-box;
      }

      :host {
        background-color: var(--bim-ui_bg-base);
        display: block;
        overflow: auto;
      }

      .parent {
        display: grid;
        overflow: hidden;
        position: relative;
        grid-template: "switchers" auto "content" 1fr;
        height: 100%;
      }

      :host([bottom]) .parent {
        grid-template: "content" 1fr "switchers" auto;
      }

      .switchers {
        position: relative;
        display: flex;
        height: 2.25rem;
        font-weight: 600;
        grid-area: switchers;
      }

      .switcher {
        --bim-label--c: var(--bim-ui_bg-contrast-80);
        background-color: transparent;
        position: relative;
        cursor: pointer;
        pointer-events: auto;
        padding: 0rem 0.75rem;
        display: flex;
        justify-content: center;
        z-index: 2;
        transition: all 0.15s;
      }

      .switcher:not([data-active]):hover {
        filter: brightness(150%);
      }

      :host([switchers-full]) .switcher {
        flex: 1;
      }

      .switcher[data-active] {
        --bim-label--c: var(--bim-ui_main-contrast);
      }

      .switchers bim-label {
        pointer-events: none;
      }

      :host([switchers-hidden]) .switchers {
        display: none;
      }

      .content {
        position: relative;
        display: grid;
        grid-template-columns: 1fr;
        grid-area: content;
        max-height: 100vh;
        overflow: auto;
        transition: max-height 0.2s;
      }

      :host([tab="hidden"]) .content {
        max-height: 0;
      }

      .animated-background {
        position: absolute;
        background: var(--bim-ui_main-base);
        width: 0;
        height: 0;
        top: 0;
        left: 0;
      }

      :host(:not([bottom])) .content {
        border-top: 1px solid var(--bim-ui_bg-contrast-20);
      }

      :host([bottom]) .content {
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
      }

      :host([floating]) {
        background-color: transparent;
      }

      :host([floating]) .switchers {
        justify-self: center;
        overflow: hidden;
        background-color: var(--bim-ui_bg-base);
      }

      :host([floating]:not([bottom])) .switchers {
        border-radius: var(--bim-ui_size-2xs) var(--bim-ui_size-2xs) 0 0;
        border-top: 1px solid var(--bim-ui_bg-contrast-20);
        border-left: 1px solid var(--bim-ui_bg-contrast-20);
        border-right: 1px solid var(--bim-ui_bg-contrast-20);
      }

      :host([floating][bottom]) .switchers {
        border-radius: 0 0 var(--bim-ui_size-2xs) var(--bim-ui_size-2xs);
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
        border-left: 1px solid var(--bim-ui_bg-contrast-20);
        border-right: 1px solid var(--bim-ui_bg-contrast-20);
      }

      :host([floating][tab="hidden"]) .switchers {
        border-radius: var(--bim-ui_size-2xs);
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
      }

      :host([floating][bottom][tab="hidden"]) .switchers {
        border-top: 1px solid var(--bim-ui_bg-contrast-20);
      }

      :host([floating]) .content {
        border: 1px solid var(--bim-ui_bg-contrast-20);
        border-radius: var(--bim-ui_size-2xs);
        background-color: var(--bim-ui_bg-base);
      }
    `];let K=Tr;Ft([Lt()],K.prototype,"_switchers",2);Ft([h({type:Boolean,reflect:!0})],K.prototype,"bottom",2);Ft([h({type:Boolean,attribute:"switchers-hidden",reflect:!0})],K.prototype,"switchersHidden",2);Ft([h({type:Boolean,reflect:!0})],K.prototype,"floating",2);Ft([h({type:String,reflect:!0})],K.prototype,"tab",1);Ft([h({type:Boolean,attribute:"switchers-full",reflect:!0})],K.prototype,"switchersFull",2);var za=Object.defineProperty,Ra=Object.getOwnPropertyDescriptor,Be=(i,t,e,n)=>{for(var r=n>1?void 0:n?Ra(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&za(t,e,r),r};const Pr=class extends E{constructor(){super(...arguments),this._defaultName="__unnamed__",this.name=this._defaultName,this._hidden=!1}set label(t){this._label=t;const e=this.parentElement;e instanceof K&&e.updateSwitchers()}get label(){return this._label}set icon(t){this._icon=t;const e=this.parentElement;e instanceof K&&e.updateSwitchers()}get icon(){return this._icon}set hidden(t){this._hidden=t,this.dispatchEvent(new Event("hiddenchange"))}get hidden(){return this._hidden}connectedCallback(){super.connectedCallback();const{parentElement:t}=this;if(t&&this.name===this._defaultName){const e=[...t.children].indexOf(this);this.name=`${this._defaultName}${e}`}}render(){return m` <slot></slot> `}};Pr.styles=C`
    :host {
      display: block;
      height: 100%;
      grid-row-start: 1;
      grid-column-start: 1;
      animation: openAnim 3s forwards;
      transform: translateY(0);
      max-height: 100vh;
      transition:
        opacity 0.3s ease,
        max-height 0.6s ease,
        transform 0.3s ease;
    }

    :host([hidden]) {
      transform: translateY(-20px);
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      visibility: hidden;
    }
  `;let R=Pr;Be([h({type:String,reflect:!0})],R.prototype,"name",2);Be([h({type:String,reflect:!0})],R.prototype,"label",1);Be([h({type:String,reflect:!0})],R.prototype,"icon",1);Be([h({type:Boolean,reflect:!0})],R.prototype,"hidden",1);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const un=i=>i??S;var La=Object.defineProperty,ja=Object.getOwnPropertyDescriptor,V=(i,t,e,n)=>{for(var r=n>1?void 0:n?ja(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&La(t,e,r),r};const zr=class extends E{constructor(){super(...arguments),this._inputTypes=["date","datetime-local","email","month","password","search","tel","text","time","url","week","area"],this.value="",this.vertical=!1,this.disabled=!1,this.resize="vertical",this._type="text",this.onValueChange=new Event("input")}set type(t){this._inputTypes.includes(t)&&(this._type=t)}get type(){return this._type}get query(){return si(this.value)}onInputChange(t){t.stopPropagation();const e=t.target;clearTimeout(this._debounceTimeoutID),this._debounceTimeoutID=setTimeout(()=>{this.value=e.value,this.dispatchEvent(this.onValueChange)},this.debounce)}focus(){setTimeout(()=>{var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("input");e==null||e.focus()})}render(){return m`
      <bim-input
        .name=${this.name}
        .icon=${this.icon}
        .label=${this.label}
        .vertical=${this.vertical}
      >
        ${this.type==="area"?m` <textarea
              aria-label=${this.label||this.name||"Text Input"}
              .value=${this.value}
              .rows=${this.rows??5}
              ?disabled=${this.disabled}
              placeholder=${un(this.placeholder)}
              @input=${this.onInputChange}
              style="resize: ${this.resize};"
            ></textarea>`:m` <input
              aria-label=${this.label||this.name||"Text Input"}
              .type=${this.type}
              .value=${this.value}
              ?disabled=${this.disabled}
              placeholder=${un(this.placeholder)}
              @input=${this.onInputChange}
            />`}
      </bim-input>
    `}};zr.styles=[ct.scrollbar,C`
      :host {
        --bim-input--bgc: var(--bim-ui_bg-contrast-20);
        flex: 1;
        display: block;
      }

      input,
      textarea {
        font-family: inherit;
        background-color: transparent;
        border: none;
        width: 100%;
        padding: var(--bim-ui_size-3xs);
        color: var(--bim-text-input--c, var(--bim-ui_bg-contrast-100));
      }

      input {
        outline: none;
        height: 100%;
        padding: 0 var(--bim-ui_size-3xs); /* Override padding */
        border-radius: var(--bim-text-input--bdrs, var(--bim-ui_size-4xs));
      }

      :host([disabled]) input,
      :host([disabled]) textarea {
        color: var(--bim-ui_bg-contrast-60);
      }

      textarea {
        line-height: 1.1rem;
        outline: none;
      }

      :host(:focus) {
        --bim-input--olc: var(--bim-ui_accent-base);
      }

      /* :host([disabled]) {
      --bim-input--bgc: var(--bim-ui_bg-contrast-20);
    } */
    `];let N=zr;V([h({type:String,reflect:!0})],N.prototype,"icon",2);V([h({type:String,reflect:!0})],N.prototype,"label",2);V([h({type:String,reflect:!0})],N.prototype,"name",2);V([h({type:String,reflect:!0})],N.prototype,"placeholder",2);V([h({type:String,reflect:!0})],N.prototype,"value",2);V([h({type:Boolean,reflect:!0})],N.prototype,"vertical",2);V([h({type:Number,reflect:!0})],N.prototype,"debounce",2);V([h({type:Number,reflect:!0})],N.prototype,"rows",2);V([h({type:Boolean,reflect:!0})],N.prototype,"disabled",2);V([h({type:String,reflect:!0})],N.prototype,"resize",2);V([h({type:String,reflect:!0})],N.prototype,"type",1);var Ha=Object.defineProperty,Ma=Object.getOwnPropertyDescriptor,Rr=(i,t,e,n)=>{for(var r=n>1?void 0:n?Ma(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&Ha(t,e,r),r};const Lr=class extends E{constructor(){super(...arguments),this.rows=2,this._vertical=!1}set vertical(t){this._vertical=t,this.updateChildren()}get vertical(){return this._vertical}updateChildren(){const t=this.children;for(const e of t)this.vertical?e.setAttribute("label-hidden",""):e.removeAttribute("label-hidden")}render(){return m`
      <style>
        .parent {
          grid-auto-flow: ${this.vertical?"row":"column"};
          grid-template-rows: repeat(${this.rows}, 1fr);
        }
      </style>
      <div class="parent">
        <slot @slotchange=${this.updateChildren}></slot>
      </div>
    `}};Lr.styles=C`
    .parent {
      display: grid;
      gap: 0.25rem;
    }

    ::slotted(bim-button[label]:not([vertical])) {
      --bim-button--jc: flex-start;
    }

    ::slotted(bim-button) {
      --bim-label--c: var(--bim-ui_bg-contrast-80);
    }
  `;let Ie=Lr;Rr([h({type:Number,reflect:!0})],Ie.prototype,"rows",2);Rr([h({type:Boolean,reflect:!0})],Ie.prototype,"vertical",1);var Ba=Object.defineProperty,Ia=Object.getOwnPropertyDescriptor,Fe=(i,t,e,n)=>{for(var r=n>1?void 0:n?Ia(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&Ba(t,e,r),r};const jr=class extends E{constructor(){super(...arguments),this._vertical=!1,this._labelHidden=!1}set vertical(t){this._vertical=t,this.updateChildren()}get vertical(){return this._vertical}set labelHidden(t){this._labelHidden=t,this.updateChildren()}get labelHidden(){return this._labelHidden}updateChildren(){const t=this.children;for(const e of t)e instanceof Ie&&(e.vertical=this.vertical),e.toggleAttribute("label-hidden",this.vertical)}render(){return m`
      <div class="parent">
        <div class="children">
          <slot @slotchange=${this.updateChildren}></slot>
        </div>
        ${!this.labelHidden&&(this.label||this.icon)?m`<bim-label .icon=${this.icon}>${this.label}</bim-label>`:null}
      </div>
    `}};jr.styles=C`
    :host {
      --bim-label--fz: var(--bim-ui_size-xs);
      --bim-label--c: var(--bim-ui_bg-contrast-60);
      display: block;
      flex: 1;
    }

    :host(:not([vertical])) ::slotted(bim-button[vertical]) {
      --bim-icon--fz: var(--bim-ui_size-5xl);
      min-height: 3.75rem;
    }

    .parent {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem;
      height: 100%;
      box-sizing: border-box;
      justify-content: space-between;
    }

    :host([vertical]) .parent {
      flex-direction: row-reverse;
    }

    :host([vertical]) .parent > bim-label {
      writing-mode: tb;
    }

    .children {
      display: flex;
      gap: 0.25rem;
    }

    :host([vertical]) .children {
      flex-direction: column;
    }
  `;let Nt=jr;Fe([h({type:String,reflect:!0})],Nt.prototype,"label",2);Fe([h({type:String,reflect:!0})],Nt.prototype,"icon",2);Fe([h({type:Boolean,reflect:!0})],Nt.prototype,"vertical",1);Fe([h({type:Boolean,attribute:"label-hidden",reflect:!0})],Nt.prototype,"labelHidden",1);var Fa=Object.defineProperty,Na=Object.getOwnPropertyDescriptor,$i=(i,t,e,n)=>{for(var r=n>1?void 0:n?Na(t,e):t,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=(n?o(t,e,r):o(r))||r);return n&&r&&Fa(t,e,r),r};const Hr=class extends E{constructor(){super(...arguments),this.labelsHidden=!1,this._vertical=!1,this._hidden=!1}set vertical(t){this._vertical=t,this.updateSections()}get vertical(){return this._vertical}set hidden(t){this._hidden=t,this.dispatchEvent(new Event("hiddenchange"))}get hidden(){return this._hidden}updateSections(){const t=this.children;for(const e of t)e instanceof Nt&&(e.labelHidden=this.vertical&&!_i.config.sectionLabelOnVerticalToolbar,e.vertical=this.vertical)}render(){return m`
      <div class="parent">
        <slot @slotchange=${this.updateSections}></slot>
      </div>
    `}};Hr.styles=C`
    :host {
      --bim-button--bgc: transparent;
      background-color: var(--bim-ui_bg-base);
      border-radius: var(--bim-ui_size-2xs);
      display: block;
    }

    :host([hidden]) {
      display: none;
    }

    .parent {
      display: flex;
      width: max-content;
      pointer-events: auto;
    }

    :host([vertical]) .parent {
      flex-direction: column;
    }

    :host([vertical]) {
      width: min-content;
      border-radius: var(--bim-ui_size-2xs);
      border: 1px solid var(--bim-ui_bg-contrast-20);
    }

    ::slotted(bim-toolbar-section:not(:last-child)) {
      border-right: 1px solid var(--bim-ui_bg-contrast-20);
      border-bottom: none;
    }

    :host([vertical]) ::slotted(bim-toolbar-section:not(:last-child)) {
      border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
      border-right: none;
    }
  `;let Ne=Hr;$i([h({type:String,reflect:!0})],Ne.prototype,"icon",2);$i([h({type:Boolean,attribute:"labels-hidden",reflect:!0})],Ne.prototype,"labelsHidden",2);$i([h({type:Boolean,reflect:!0})],Ne.prototype,"vertical",1);var qa=Object.defineProperty,Da=(i,t,e,n)=>{for(var r=void 0,s=i.length-1,o;s>=0;s--)(o=i[s])&&(r=o(t,e,r)||r);return r&&qa(t,e,r),r};const Mr=class extends E{constructor(){super(),this._onResize=new Event("resize"),new ResizeObserver(()=>{setTimeout(()=>{this.dispatchEvent(this._onResize)})}).observe(this)}render(){return m`
      <div class="parent">
        <slot></slot>
      </div>
    `}};Mr.styles=C`
    :host {
      display: grid;
      min-width: 0;
      min-height: 0;
      height: 100%;
    }

    .parent {
      overflow: hidden;
      position: relative;
    }
  `;let Br=Mr;Da([h({type:String,reflect:!0})],Br.prototype,"name");/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ir="important",Ua=" !"+Ir,ml=Bn(class extends In{constructor(i){var t;if(super(i),i.type!==Mn.ATTRIBUTE||i.name!=="style"||((t=i.strings)==null?void 0:t.length)>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(i){return Object.keys(i).reduce((t,e)=>{const n=i[e];return n==null?t:t+`${e=e.includes("-")?e:e.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,"-$&").toLowerCase()}:${n};`},"")}update(i,[t]){const{style:e}=i.element;if(this.ft===void 0)return this.ft=new Set(Object.keys(t)),this.render(t);for(const n of this.ft)t[n]==null&&(this.ft.delete(n),n.includes("-")?e.removeProperty(n):e[n]=null);for(const n in t){const r=t[n];if(r!=null){this.ft.add(n);const s=typeof r=="string"&&r.endsWith(Ua);n.includes("-")||s?e.setProperty(n,s?r.slice(0,-11):r,s?Ir:""):e[n]=r}}return vt}});export{Rt as F,ml as Q,Ae as R,_i as a,m};
