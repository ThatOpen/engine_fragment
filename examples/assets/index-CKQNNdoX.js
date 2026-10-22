const Zs=globalThis,qr=Zs.ShadowRoot&&(Zs.ShadyCSS===void 0||Zs.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Yr=Symbol(),Mo=new WeakMap;let Il=class{constructor(t,i,s){if(this._$cssResult$=!0,s!==Yr)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=i}get styleSheet(){let t=this.o;const i=this.t;if(qr&&t===void 0){const s=i!==void 0&&i.length===1;s&&(t=Mo.get(i)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&Mo.set(i,t))}return t}toString(){return this.cssText}};const wd=e=>new Il(typeof e=="string"?e:e+"",void 0,Yr),H=(e,...t)=>{const i=e.length===1?e[0]:t.reduce((s,n,r)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+e[r+1],e[0]);return new Il(i,e,Yr)},kd=(e,t)=>{if(qr)e.adoptedStyleSheets=t.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of t){const s=document.createElement("style"),n=Zs.litNonce;n!==void 0&&s.setAttribute("nonce",n),s.textContent=i.cssText,e.appendChild(s)}},Ao=qr?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let i="";for(const s of t.cssRules)i+=s.cssText;return wd(i)})(e):e;const{is:Cd,defineProperty:Sd,getOwnPropertyDescriptor:Md,getOwnPropertyNames:Ad,getOwnPropertySymbols:$d,getPrototypeOf:Ed}=Object,$n=globalThis,$o=$n.trustedTypes,Pd=$o?$o.emptyScript:"",Dd=$n.reactiveElementPolyfillSupport,Ui=(e,t)=>e,cn={toAttribute(e,t){switch(t){case Boolean:e=e?Pd:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=e!==null;break;case Number:i=e===null?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch{i=null}}return i}},Kr=(e,t)=>!Cd(e,t),Eo={attribute:!0,type:String,converter:cn,reflect:!1,useDefault:!1,hasChanged:Kr};Symbol.metadata??=Symbol("metadata"),$n.litPropertyMetadata??=new WeakMap;let li=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,i=Eo){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(t,i),!i.noAccessor){const s=Symbol(),n=this.getPropertyDescriptor(t,s,i);n!==void 0&&Sd(this.prototype,t,n)}}static getPropertyDescriptor(t,i,s){const{get:n,set:r}=Md(this.prototype,t)??{get(){return this[i]},set(o){this[i]=o}};return{get:n,set(o){const a=n?.call(this);r?.call(this,o),this.requestUpdate(t,a,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Eo}static _$Ei(){if(this.hasOwnProperty(Ui("elementProperties")))return;const t=Ed(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(Ui("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(Ui("properties"))){const i=this.properties,s=[...Ad(i),...$d(i)];for(const n of s)this.createProperty(n,i[n])}const t=this[Symbol.metadata];if(t!==null){const i=litPropertyMetadata.get(t);if(i!==void 0)for(const[s,n]of i)this.elementProperties.set(s,n)}this._$Eh=new Map;for(const[i,s]of this.elementProperties){const n=this._$Eu(i,s);n!==void 0&&this._$Eh.set(n,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const i=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const n of s)i.unshift(Ao(n))}else t!==void 0&&i.push(Ao(t));return i}static _$Eu(t,i){const s=i.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,i=this.constructor.elementProperties;for(const s of i.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return kd(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,i,s){this._$AK(t,s)}_$ET(t,i){const s=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,s);if(n!==void 0&&s.reflect===!0){const r=(s.converter?.toAttribute!==void 0?s.converter:cn).toAttribute(i,s.type);this._$Em=t,r==null?this.removeAttribute(n):this.setAttribute(n,r),this._$Em=null}}_$AK(t,i){const s=this.constructor,n=s._$Eh.get(t);if(n!==void 0&&this._$Em!==n){const r=s.getPropertyOptions(n),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:cn;this._$Em=n;const a=o.fromAttribute(i,r.type);this[n]=a??this._$Ej?.get(n)??a,this._$Em=null}}requestUpdate(t,i,s,n=!1,r){if(t!==void 0){const o=this.constructor;if(n===!1&&(r=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??Kr)(r,i)||s.useDefault&&s.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,i,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,i,{useDefault:s,reflect:n,wrapped:r},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??i??this[t]),r!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(i=void 0),this._$AL.set(t,i)),n===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[n,r]of this._$Ep)this[n]=r;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[n,r]of s){const{wrapped:o}=r,a=this[n];o!==!0||this._$AL.has(n)||a===void 0||this.C(n,void 0,r,a)}}let t=!1;const i=this._$AL;try{t=this.shouldUpdate(i),t?(this.willUpdate(i),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(i)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(i)}willUpdate(t){}_$AE(t){this._$EO?.forEach(i=>i.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(i=>this._$ET(i,this[i])),this._$EM()}updated(t){}firstUpdated(t){}};li.elementStyles=[],li.shadowRootOptions={mode:"open"},li[Ui("elementProperties")]=new Map,li[Ui("finalized")]=new Map,Dd?.({ReactiveElement:li}),($n.reactiveElementVersions??=[]).push("2.1.2");const Gr=globalThis,Po=e=>e,hn=Gr.trustedTypes,Do=hn?hn.createPolicy("lit-html",{createHTML:e=>e}):void 0,Bl="$lit$",fe=`lit$${Math.random().toFixed(9).slice(2)}$`,Fl="?"+fe,Od=`<${Fl}>`,qe=document,ss=()=>qe.createComment(""),ns=e=>e===null||typeof e!="object"&&typeof e!="function",Xr=Array.isArray,Td=e=>Xr(e)||typeof e?.[Symbol.iterator]=="function",Gn=`[ 	
\f\r]`,Ei=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Oo=/-->/g,To=/>/g,Oe=RegExp(`>|${Gn}(?:([^\\s"'>=/]+)(${Gn}*=${Gn}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Lo=/'/g,zo=/"/g,Hl=/^(?:script|style|textarea|title)$/i,Ld=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),w=Ld(1),Ct=Symbol.for("lit-noChange"),T=Symbol.for("lit-nothing"),Ro=new WeakMap,Ve=qe.createTreeWalker(qe,129);function jl(e,t){if(!Xr(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return Do!==void 0?Do.createHTML(t):t}const zd=(e,t)=>{const i=e.length-1,s=[];let n,r=t===2?"<svg>":t===3?"<math>":"",o=Ei;for(let a=0;a<i;a++){const l=e[a];let c,h,d=-1,u=0;for(;u<l.length&&(o.lastIndex=u,h=o.exec(l),h!==null);)u=o.lastIndex,o===Ei?h[1]==="!--"?o=Oo:h[1]!==void 0?o=To:h[2]!==void 0?(Hl.test(h[2])&&(n=RegExp("</"+h[2],"g")),o=Oe):h[3]!==void 0&&(o=Oe):o===Oe?h[0]===">"?(o=n??Ei,d=-1):h[1]===void 0?d=-2:(d=o.lastIndex-h[2].length,c=h[1],o=h[3]===void 0?Oe:h[3]==='"'?zo:Lo):o===zo||o===Lo?o=Oe:o===Oo||o===To?o=Ei:(o=Oe,n=void 0);const p=o===Oe&&e[a+1].startsWith("/>")?" ":"";r+=o===Ei?l+Od:d>=0?(s.push(c),l.slice(0,d)+Bl+l.slice(d)+fe+p):l+fe+(d===-2?a:p)}return[jl(e,r+(e[i]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]};class rs{constructor({strings:t,_$litType$:i},s){let n;this.parts=[];let r=0,o=0;const a=t.length-1,l=this.parts,[c,h]=zd(t,i);if(this.el=rs.createElement(c,s),Ve.currentNode=this.el.content,i===2||i===3){const d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(n=Ve.nextNode())!==null&&l.length<a;){if(n.nodeType===1){if(n.hasAttributes())for(const d of n.getAttributeNames())if(d.endsWith(Bl)){const u=h[o++],p=n.getAttribute(d).split(fe),b=/([.?@])?(.*)/.exec(u);l.push({type:1,index:r,name:b[2],strings:p,ctor:b[1]==="."?Id:b[1]==="?"?Bd:b[1]==="@"?Fd:En}),n.removeAttribute(d)}else d.startsWith(fe)&&(l.push({type:6,index:r}),n.removeAttribute(d));if(Hl.test(n.tagName)){const d=n.textContent.split(fe),u=d.length-1;if(u>0){n.textContent=hn?hn.emptyScript:"";for(let p=0;p<u;p++)n.append(d[p],ss()),Ve.nextNode(),l.push({type:2,index:++r});n.append(d[u],ss())}}}else if(n.nodeType===8)if(n.data===Fl)l.push({type:2,index:r});else{let d=-1;for(;(d=n.data.indexOf(fe,d+1))!==-1;)l.push({type:7,index:r}),d+=fe.length-1}r++}}static createElement(t,i){const s=qe.createElement("template");return s.innerHTML=t,s}}function pi(e,t,i=e,s){if(t===Ct)return t;let n=s!==void 0?i._$Co?.[s]:i._$Cl;const r=ns(t)?void 0:t._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),r===void 0?n=void 0:(n=new r(e),n._$AT(e,i,s)),s!==void 0?(i._$Co??=[])[s]=n:i._$Cl=n),n!==void 0&&(t=pi(e,n._$AS(e,t.values),n,s)),t}let Rd=class{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,n=(t?.creationScope??qe).importNode(i,!0);Ve.currentNode=n;let r=Ve.nextNode(),o=0,a=0,l=s[0];for(;l!==void 0;){if(o===l.index){let c;l.type===2?c=new _i(r,r.nextSibling,this,t):l.type===1?c=new l.ctor(r,l.name,l.strings,this,t):l.type===6&&(c=new Hd(r,this,t)),this._$AV.push(c),l=s[++a]}o!==l?.index&&(r=Ve.nextNode(),o++)}return Ve.currentNode=qe,n}p(t){let i=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++}};class _i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,n){this.type=2,this._$AH=T,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&t?.nodeType===11&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=pi(this,t,i),ns(t)?t===T||t==null||t===""?(this._$AH!==T&&this._$AR(),this._$AH=T):t!==this._$AH&&t!==Ct&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Td(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==T&&ns(this._$AH)?this._$AA.nextSibling.data=t:this.T(qe.createTextNode(t)),this._$AH=t}$(t){const{values:i,_$litType$:s}=t,n=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=rs.createElement(jl(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===n)this._$AH.p(i);else{const r=new Rd(n,this),o=r.u(this.options);r.p(i),this.T(o),this._$AH=r}}_$AC(t){let i=Ro.get(t.strings);return i===void 0&&Ro.set(t.strings,i=new rs(t)),i}k(t){Xr(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,n=0;for(const r of t)n===i.length?i.push(s=new _i(this.O(ss()),this.O(ss()),this,this.options)):s=i[n],s._$AI(r),n++;n<i.length&&(this._$AR(s&&s._$AB.nextSibling,n),i.length=n)}_$AR(t=this._$AA.nextSibling,i){for(this._$AP?.(!1,!0,i);t!==this._$AB;){const s=Po(t).nextSibling;Po(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class En{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,n,r){this.type=1,this._$AH=T,this._$AN=void 0,this.element=t,this.name=i,this._$AM=n,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=T}_$AI(t,i=this,s,n){const r=this.strings;let o=!1;if(r===void 0)t=pi(this,t,i,0),o=!ns(t)||t!==this._$AH&&t!==Ct,o&&(this._$AH=t);else{const a=t;let l,c;for(t=r[0],l=0;l<r.length-1;l++)c=pi(this,a[s+l],i,l),c===Ct&&(c=this._$AH[l]),o||=!ns(c)||c!==this._$AH[l],c===T?t=T:t!==T&&(t+=(c??"")+r[l+1]),this._$AH[l]=c}o&&!n&&this.j(t)}j(t){t===T?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Id extends En{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===T?void 0:t}}let Bd=class extends En{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==T)}};class Fd extends En{constructor(t,i,s,n,r){super(t,i,s,n,r),this.type=5}_$AI(t,i=this){if((t=pi(this,t,i,0)??T)===Ct)return;const s=this._$AH,n=t===T&&s!==T||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==T&&(s===T||n);n&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}let Hd=class{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){pi(this,t)}};const jd={I:_i},Vd=Gr.litHtmlPolyfillSupport;Vd?.(rs,_i),(Gr.litHtmlVersions??=[]).push("3.3.3");const dn=(e,t,i)=>{const s=i?.renderBefore??t;let n=s._$litPart$;if(n===void 0){const r=i?.renderBefore??null;s._$litPart$=n=new _i(t.insertBefore(ss(),r),r,void 0,i??{})}return n._$AI(e),n};const Qr=globalThis;let I=class extends li{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=dn(i,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return Ct}};I._$litElement$=!0,I.finalized=!0,Qr.litElementHydrateSupport?.({LitElement:I});const Nd=Qr.litElementPolyfillSupport;Nd?.({LitElement:I});(Qr.litElementVersions??=[]).push("4.2.2");const Wd={attribute:!0,type:String,converter:cn,reflect:!1,hasChanged:Kr},Ud=(e=Wd,t,i)=>{const{kind:s,metadata:n}=i;let r=globalThis.litPropertyMetadata.get(n);if(r===void 0&&globalThis.litPropertyMetadata.set(n,r=new Map),s==="setter"&&((e=Object.create(e)).wrapped=!0),r.set(i.name,e),s==="accessor"){const{name:o}=i;return{set(a){const l=t.get.call(this);t.set.call(this,a),this.requestUpdate(o,l,e,!0,a)},init(a){return a!==void 0&&this.C(o,void 0,e,a),a}}}if(s==="setter"){const{name:o}=i;return function(a){const l=this[o];t.call(this,a),this.requestUpdate(o,l,e,!0,a)}}throw Error("Unsupported decorator location: "+s)};function v(e){return(t,i)=>typeof i=="object"?Ud(e,t,i):((s,n,r)=>{const o=n.hasOwnProperty(r);return n.constructor.createProperty(r,s),o?Object.getOwnPropertyDescriptor(n,r):void 0})(e,t,i)}function Z(e){return v({...e,state:!0,attribute:!1})}const qd=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);function Vl(e,t){return(i,s,n)=>{const r=o=>o.renderRoot?.querySelector(e)??null;return qd(i,s,{get(){return r(this)}})}}const{I:Yd}=jd,Io=e=>e,Nl=e=>e.strings===void 0,Bo=()=>document.createComment(""),Pi=(e,t,i)=>{const s=e._$AA.parentNode,n=t===void 0?e._$AB:t._$AA;if(i===void 0){const r=s.insertBefore(Bo(),n),o=s.insertBefore(Bo(),n);i=new Yd(r,o,e,e.options)}else{const r=i._$AB.nextSibling,o=i._$AM,a=o!==e;if(a){let l;i._$AQ?.(e),i._$AM=e,i._$AP!==void 0&&(l=e._$AU)!==o._$AU&&i._$AP(l)}if(r!==n||a){let l=i._$AA;for(;l!==r;){const c=Io(l).nextSibling;Io(s).insertBefore(l,n),l=c}}}return i},Te=(e,t,i=e)=>(e._$AI(t,i),e),Kd={},Wl=(e,t=Kd)=>e._$AH=t,Gd=e=>e._$AH,Xn=e=>{e._$AR(),e._$AA.remove()};const jt={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},ms=e=>(...t)=>({_$litDirective$:e,values:t});let gs=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,s){this._$Ct=t,this._$AM=i,this._$Ci=s}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}};const qi=(e,t)=>{const i=e._$AN;if(i===void 0)return!1;for(const s of i)s._$AO?.(t,!1),qi(s,t);return!0},un=e=>{let t,i;do{if((t=e._$AM)===void 0)break;i=t._$AN,i.delete(e),e=t}while(i?.size===0)},Ul=e=>{for(let t;t=e._$AM;e=t){let i=t._$AN;if(i===void 0)t._$AN=i=new Set;else if(i.has(e))break;i.add(e),Zd(t)}};function Xd(e){this._$AN!==void 0?(un(this),this._$AM=e,Ul(this)):this._$AM=e}function Qd(e,t=!1,i=0){const s=this._$AH,n=this._$AN;if(n!==void 0&&n.size!==0)if(t)if(Array.isArray(s))for(let r=i;r<s.length;r++)qi(s[r],!1),un(s[r]);else s!=null&&(qi(s,!1),un(s));else qi(this,e)}const Zd=e=>{e.type==jt.CHILD&&(e._$AP??=Qd,e._$AQ??=Xd)};class Jd extends gs{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,i,s){super._$AT(t,i,s),Ul(this),this.isConnected=t._$AU}_$AO(t,i=!0){t!==this.isConnected&&(this.isConnected=t,t?this.reconnected?.():this.disconnected?.()),i&&(qi(this,t),un(this))}setValue(t){if(Nl(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}const ae=()=>new tu;class tu{}const Qn=new WeakMap,At=ms(class extends Jd{render(e){return T}update(e,[t]){const i=t!==this.G;return i&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=t,this.ht=e.options?.host,this.rt(this.ct=e.element)),T}rt(e){if(this.G!==void 0)if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let i=Qn.get(t);i===void 0&&(i=new WeakMap,Qn.set(t,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return typeof this.G=="function"?Qn.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});const Jt=e=>e??T;const Fo=(e,t,i)=>{const s=new Map;for(let n=t;n<=i;n++)s.set(e[n],n);return s},ql=ms(class extends gs{constructor(e){if(super(e),e.type!==jt.CHILD)throw Error("repeat() can only be used in text expressions")}dt(e,t,i){let s;i===void 0?i=t:t!==void 0&&(s=t);const n=[],r=[];let o=0;for(const a of e)n[o]=s?s(a,o):o,r[o]=i(a,o),o++;return{values:r,keys:n}}render(e,t,i){return this.dt(e,t,i).values}update(e,[t,i,s]){const n=Gd(e),{values:r,keys:o}=this.dt(t,i,s);if(!Array.isArray(n))return this.ut=o,r;const a=this.ut??=[],l=[];let c,h,d=0,u=n.length-1,p=0,b=r.length-1;for(;d<=u&&p<=b;)if(n[d]===null)d++;else if(n[u]===null)u--;else if(a[d]===o[p])l[p]=Te(n[d],r[p]),d++,p++;else if(a[u]===o[b])l[b]=Te(n[u],r[b]),u--,b--;else if(a[d]===o[b])l[b]=Te(n[d],r[b]),Pi(e,l[b+1],n[d]),d++,b--;else if(a[u]===o[p])l[p]=Te(n[u],r[p]),Pi(e,n[d],n[u]),u--,p++;else if(c===void 0&&(c=Fo(o,p,b),h=Fo(a,d,u)),c.has(a[d]))if(c.has(a[u])){const f=h.get(o[p]),m=f!==void 0?n[f]:null;if(m===null){const g=Pi(e,n[d]);Te(g,r[p]),l[p]=g}else l[p]=Te(m,r[p]),Pi(e,n[d],m),n[f]=null;p++}else Xn(n[u]),u--;else Xn(n[d]),d++;for(;p<=b;){const f=Pi(e,l[b+1]);Te(f,r[p]),l[p++]=f}for(;d<=u;){const f=n[d++];f!==null&&Xn(f)}return this.ut=o,Wl(e,l),Ct}});const Yl=ms(class extends gs{constructor(e){if(super(e),e.type!==jt.ATTRIBUTE||e.name!=="class"||e.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(s=>s!=="")));for(const s in t)t[s]&&!this.nt?.has(s)&&this.st.add(s);return this.render(t)}const i=e.element.classList;for(const s of this.st)s in t||(i.remove(s),this.st.delete(s));for(const s in t){const n=!!t[s];n===this.st.has(s)||this.nt?.has(s)||(n?(i.add(s),this.st.add(s)):(i.remove(s),this.st.delete(s)))}return Ct}});const Kl="important",eu=" !"+Kl,Zt=ms(class extends gs{constructor(e){if(super(e),e.type!==jt.ATTRIBUTE||e.name!=="style"||e.strings?.length>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(e){return Object.keys(e).reduce((t,i)=>{const s=e[i];return s==null?t:t+`${i=i.includes("-")?i:i.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,"-$&").toLowerCase()}:${s};`},"")}update(e,[t]){const{style:i}=e.element;if(this.ft===void 0)return this.ft=new Set(Object.keys(t)),this.render(t);for(const s of this.ft)t[s]==null&&(this.ft.delete(s),s.includes("-")?i.removeProperty(s):i[s]=null);for(const s in t){const n=t[s];if(n!=null){this.ft.add(s);const r=typeof n=="string"&&n.endsWith(eu);s.includes("-")||r?i.setProperty(s,r?n.slice(0,-11):n,r?Kl:""):i[s]=n}}return Ct}});function St(e,t,i){return e?t(e):i?.(e)}const Ho=ms(class extends gs{constructor(e){if(super(e),e.type!==jt.PROPERTY&&e.type!==jt.ATTRIBUTE&&e.type!==jt.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!Nl(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===Ct||t===T)return t;const i=e.element,s=e.name;if(e.type===jt.PROPERTY){if(t===i[s])return Ct}else if(e.type===jt.BOOLEAN_ATTRIBUTE){if(!!t===i.hasAttribute(s))return Ct}else if(e.type===jt.ATTRIBUTE&&i.getAttribute(s)===t+"")return Ct;return Wl(e),t}});var iu=Object.defineProperty,su=(e,t,i)=>t in e?iu(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i,A=(e,t,i)=>(su(e,typeof t!="symbol"?t+"":t,i),i);const Gl=Object.freeze({left:0,top:0,width:16,height:16}),pn=Object.freeze({rotate:0,vFlip:!1,hFlip:!1}),vs=Object.freeze({...Gl,...pn}),yr=Object.freeze({...vs,body:"",hidden:!1}),nu=Object.freeze({width:null,height:null}),Xl=Object.freeze({...nu,...pn});function ru(e,t=0){const i=e.replace(/^-?[0-9.]*/,"");function s(n){for(;n<0;)n+=4;return n%4}if(i===""){const n=parseInt(e);return isNaN(n)?0:s(n)}else if(i!==e){let n=0;switch(i){case"%":n=25;break;case"deg":n=90}if(n){let r=parseFloat(e.slice(0,e.length-i.length));return isNaN(r)?0:(r=r/n,r%1===0?s(r):0)}}return t}const ou=/[\s,]+/;function au(e,t){t.split(ou).forEach(i=>{switch(i.trim()){case"horizontal":e.hFlip=!0;break;case"vertical":e.vFlip=!0;break}})}const Ql={...Xl,preserveAspectRatio:""};function jo(e){const t={...Ql},i=(s,n)=>e.getAttribute(s)||n;return t.width=i("width",null),t.height=i("height",null),t.rotate=ru(i("rotate","")),au(t,i("flip","")),t.preserveAspectRatio=i("preserveAspectRatio",i("preserveaspectratio","")),t}function lu(e,t){for(const i in Ql)if(e[i]!==t[i])return!0;return!1}const Zl=/^[a-z0-9]+(-[a-z0-9]+)*$/,ys=(e,t,i,s="")=>{const n=e.split(":");if(e.slice(0,1)==="@"){if(n.length<2||n.length>3)return null;s=n.shift().slice(1)}if(n.length>3||!n.length)return null;if(n.length>1){const a=n.pop(),l=n.pop(),c={provider:n.length>0?n[0]:s,prefix:l,name:a};return t&&!Js(c)?null:c}const r=n[0],o=r.split("-");if(o.length>1){const a={provider:s,prefix:o.shift(),name:o.join("-")};return t&&!Js(a)?null:a}if(i&&s===""){const a={provider:s,prefix:"",name:r};return t&&!Js(a,i)?null:a}return null},Js=(e,t)=>e?!!((t&&e.prefix===""||e.prefix)&&e.name):!1;function cu(e,t){const i=e.icons,s=e.aliases||Object.create(null),n=Object.create(null);function r(o){if(i[o])return n[o]=[];if(!(o in n)){n[o]=null;const a=s[o]&&s[o].parent,l=a&&r(a);l&&(n[o]=[a].concat(l))}return n[o]}return Object.keys(i).concat(Object.keys(s)).forEach(r),n}function hu(e,t){const i={};!e.hFlip!=!t.hFlip&&(i.hFlip=!0),!e.vFlip!=!t.vFlip&&(i.vFlip=!0);const s=((e.rotate||0)+(t.rotate||0))%4;return s&&(i.rotate=s),i}function Vo(e,t){const i=hu(e,t);for(const s in yr)s in pn?s in e&&!(s in i)&&(i[s]=pn[s]):s in t?i[s]=t[s]:s in e&&(i[s]=e[s]);return i}function du(e,t,i){const s=e.icons,n=e.aliases||Object.create(null);let r={};function o(a){r=Vo(s[a]||n[a],r)}return o(t),i.forEach(o),Vo(e,r)}function Jl(e,t){const i=[];if(typeof e!="object"||typeof e.icons!="object")return i;e.not_found instanceof Array&&e.not_found.forEach(n=>{t(n,null),i.push(n)});const s=cu(e);for(const n in s){const r=s[n];r&&(t(n,du(e,n,r)),i.push(n))}return i}const uu={provider:"",aliases:{},not_found:{},...Gl};function Zn(e,t){for(const i in t)if(i in e&&typeof e[i]!=typeof t[i])return!1;return!0}function tc(e){if(typeof e!="object"||e===null)return null;const t=e;if(typeof t.prefix!="string"||!e.icons||typeof e.icons!="object"||!Zn(e,uu))return null;const i=t.icons;for(const n in i){const r=i[n];if(!n||typeof r.body!="string"||!Zn(r,yr))return null}const s=t.aliases||Object.create(null);for(const n in s){const r=s[n],o=r.parent;if(!n||typeof o!="string"||!i[o]&&!s[o]||!Zn(r,yr))return null}return t}const fn=Object.create(null);function pu(e,t){return{provider:e,prefix:t,icons:Object.create(null),missing:new Set}}function le(e,t){const i=fn[e]||(fn[e]=Object.create(null));return i[t]||(i[t]=pu(e,t))}function ec(e,t){return tc(t)?Jl(t,(i,s)=>{s?e.icons[i]=s:e.missing.add(i)}):[]}function fu(e,t,i){try{if(typeof i.body=="string")return e.icons[t]={...i},!0}catch{}return!1}function bu(e,t){let i=[];return(typeof e=="string"?[e]:Object.keys(fn)).forEach(s=>{(typeof s=="string"&&typeof t=="string"?[t]:Object.keys(fn[s]||{})).forEach(n=>{const r=le(s,n);i=i.concat(Object.keys(r.icons).map(o=>(s!==""?"@"+s+":":"")+n+":"+o))})}),i}let os=!1;function ic(e){return typeof e=="boolean"&&(os=e),os}function as(e){const t=typeof e=="string"?ys(e,!0,os):e;if(t){const i=le(t.provider,t.prefix),s=t.name;return i.icons[s]||(i.missing.has(s)?null:void 0)}}function sc(e,t){const i=ys(e,!0,os);if(!i)return!1;const s=le(i.provider,i.prefix);return t?fu(s,i.name,t):(s.missing.add(i.name),!0)}function No(e,t){if(typeof e!="object")return!1;if(typeof t!="string"&&(t=e.provider||""),os&&!t&&!e.prefix){let n=!1;return tc(e)&&(e.prefix="",Jl(e,(r,o)=>{sc(r,o)&&(n=!0)})),n}const i=e.prefix;if(!Js({prefix:i,name:"a"}))return!1;const s=le(t,i);return!!ec(s,e)}function mu(e){return!!as(e)}function gu(e){const t=as(e);return t&&{...vs,...t}}function nc(e,t){e.forEach(i=>{const s=i.loaderCallbacks;s&&(i.loaderCallbacks=s.filter(n=>n.id!==t))})}function vu(e){e.pendingCallbacksFlag||(e.pendingCallbacksFlag=!0,setTimeout(()=>{e.pendingCallbacksFlag=!1;const t=e.loaderCallbacks?e.loaderCallbacks.slice(0):[];if(!t.length)return;let i=!1;const s=e.provider,n=e.prefix;t.forEach(r=>{const o=r.icons,a=o.pending.length;o.pending=o.pending.filter(l=>{if(l.prefix!==n)return!0;const c=l.name;if(e.icons[c])o.loaded.push({provider:s,prefix:n,name:c});else if(e.missing.has(c))o.missing.push({provider:s,prefix:n,name:c});else return i=!0,!0;return!1}),o.pending.length!==a&&(i||nc([e],r.id),r.callback(o.loaded.slice(0),o.missing.slice(0),o.pending.slice(0),r.abort))})}))}let yu=0;function xu(e,t,i){const s=yu++,n=nc.bind(null,i,s);if(!t.pending.length)return n;const r={id:s,icons:t,callback:e,abort:n};return i.forEach(o=>{(o.loaderCallbacks||(o.loaderCallbacks=[])).push(r)}),n}function _u(e){const t={loaded:[],missing:[],pending:[]},i=Object.create(null);e.sort((n,r)=>n.provider!==r.provider?n.provider.localeCompare(r.provider):n.prefix!==r.prefix?n.prefix.localeCompare(r.prefix):n.name.localeCompare(r.name));let s={provider:"",prefix:"",name:""};return e.forEach(n=>{if(s.name===n.name&&s.prefix===n.prefix&&s.provider===n.provider)return;s=n;const r=n.provider,o=n.prefix,a=n.name,l=i[r]||(i[r]=Object.create(null)),c=l[o]||(l[o]=le(r,o));let h;a in c.icons?h=t.loaded:o===""||c.missing.has(a)?h=t.missing:h=t.pending;const d={provider:r,prefix:o,name:a};h.push(d)}),t}const xr=Object.create(null);function Wo(e,t){xr[e]=t}function _r(e){return xr[e]||xr[""]}function wu(e,t=!0,i=!1){const s=[];return e.forEach(n=>{const r=typeof n=="string"?ys(n,t,i):n;r&&s.push(r)}),s}function Zr(e){let t;if(typeof e.resources=="string")t=[e.resources];else if(t=e.resources,!(t instanceof Array)||!t.length)return null;return{resources:t,path:e.path||"/",maxURL:e.maxURL||500,rotate:e.rotate||750,timeout:e.timeout||5e3,random:e.random===!0,index:e.index||0,dataAfterTimeout:e.dataAfterTimeout!==!1}}const Pn=Object.create(null),Ds=["https://api.simplesvg.com","https://api.unisvg.com"],wr=[];for(;Ds.length>0;)Ds.length===1||Math.random()>.5?wr.push(Ds.shift()):wr.push(Ds.pop());Pn[""]=Zr({resources:["https://api.iconify.design"].concat(wr)});function Uo(e,t){const i=Zr(t);return i===null?!1:(Pn[e]=i,!0)}function Dn(e){return Pn[e]}function ku(){return Object.keys(Pn)}const Cu={resources:[],index:0,timeout:2e3,rotate:750,random:!1,dataAfterTimeout:!1};function Su(e,t,i,s){const n=e.resources.length,r=e.random?Math.floor(Math.random()*n):e.index;let o;if(e.random){let k=e.resources.slice(0);for(o=[];k.length>1;){const S=Math.floor(Math.random()*k.length);o.push(k[S]),k=k.slice(0,S).concat(k.slice(S+1))}o=o.concat(k)}else o=e.resources.slice(r).concat(e.resources.slice(0,r));const a=Date.now();let l="pending",c=0,h,d=null,u=[],p=[];typeof s=="function"&&p.push(s);function b(){d&&(clearTimeout(d),d=null)}function f(){l==="pending"&&(l="aborted"),b(),u.forEach(k=>{k.status==="pending"&&(k.status="aborted")}),u=[]}function m(k,S){S&&(p=[]),typeof k=="function"&&p.push(k)}function g(){return{startTime:a,payload:t,status:l,queriesSent:c,queriesPending:u.length,subscribe:m,abort:f}}function y(){l="failed",p.forEach(k=>{k(void 0,h)})}function x(){u.forEach(k=>{k.status==="pending"&&(k.status="aborted")}),u=[]}function _(k,S,M){const E=S!=="success";switch(u=u.filter($=>$!==k),l){case"pending":break;case"failed":if(E||!e.dataAfterTimeout)return;break;default:return}if(S==="abort"){h=M,y();return}if(E){h=M,u.length||(o.length?C():y());return}if(b(),x(),!e.random){const $=e.resources.indexOf(k.resource);$!==-1&&$!==e.index&&(e.index=$)}l="completed",p.forEach($=>{$(M)})}function C(){if(l!=="pending")return;b();const k=o.shift();if(k===void 0){if(u.length){d=setTimeout(()=>{b(),l==="pending"&&(x(),y())},e.timeout);return}y();return}const S={status:"pending",resource:k,callback:(M,E)=>{_(S,M,E)}};u.push(S),c++,d=setTimeout(C,e.rotate),i(k,t,S.callback)}return setTimeout(C),g}function rc(e){const t={...Cu,...e};let i=[];function s(){i=i.filter(o=>o().status==="pending")}function n(o,a,l){const c=Su(t,o,a,(h,d)=>{s(),l&&l(h,d)});return i.push(c),c}function r(o){return i.find(a=>o(a))||null}return{query:n,find:r,setIndex:o=>{t.index=o},getIndex:()=>t.index,cleanup:s}}function qo(){}const Jn=Object.create(null);function Mu(e){if(!Jn[e]){const t=Dn(e);if(!t)return;const i=rc(t),s={config:t,redundancy:i};Jn[e]=s}return Jn[e]}function oc(e,t,i){let s,n;if(typeof e=="string"){const r=_r(e);if(!r)return i(void 0,424),qo;n=r.send;const o=Mu(e);o&&(s=o.redundancy)}else{const r=Zr(e);if(r){s=rc(r);const o=e.resources?e.resources[0]:"",a=_r(o);a&&(n=a.send)}}return!s||!n?(i(void 0,424),qo):s.query(t,n,i)().abort}function Yo(){}function Au(e){e.iconsLoaderFlag||(e.iconsLoaderFlag=!0,setTimeout(()=>{e.iconsLoaderFlag=!1,vu(e)}))}function $u(e){const t=[],i=[];return e.forEach(s=>{(s.match(Zl)?t:i).push(s)}),{valid:t,invalid:i}}function Di(e,t,i){function s(){const n=e.pendingIcons;t.forEach(r=>{n&&n.delete(r),e.icons[r]||e.missing.add(r)})}if(i&&typeof i=="object")try{if(!ec(e,i).length){s();return}}catch(n){console.error(n)}s(),Au(e)}function Ko(e,t){e instanceof Promise?e.then(i=>{t(i)}).catch(()=>{t(null)}):t(e)}function Eu(e,t){e.iconsToLoad?e.iconsToLoad=e.iconsToLoad.concat(t).sort():e.iconsToLoad=t,e.iconsQueueFlag||(e.iconsQueueFlag=!0,setTimeout(()=>{e.iconsQueueFlag=!1;const{provider:i,prefix:s}=e,n=e.iconsToLoad;if(delete e.iconsToLoad,!n||!n.length)return;const r=e.loadIcon;if(e.loadIcons&&(n.length>1||!r)){Ko(e.loadIcons(n,s,i),c=>{Di(e,n,c)});return}if(r){n.forEach(c=>{const h=r(c,s,i);Ko(h,d=>{const u=d?{prefix:s,icons:{[c]:d}}:null;Di(e,[c],u)})});return}const{valid:o,invalid:a}=$u(n);if(a.length&&Di(e,a,null),!o.length)return;const l=s.match(Zl)?_r(i):null;if(!l){Di(e,o,null);return}l.prepare(i,s,o).forEach(c=>{oc(i,c,h=>{Di(e,c.icons,h)})})}))}const Jr=(e,t)=>{const i=wu(e,!0,ic()),s=_u(i);if(!s.pending.length){let l=!0;return t&&setTimeout(()=>{l&&t(s.loaded,s.missing,s.pending,Yo)}),()=>{l=!1}}const n=Object.create(null),r=[];let o,a;return s.pending.forEach(l=>{const{provider:c,prefix:h}=l;if(h===a&&c===o)return;o=c,a=h,r.push(le(c,h));const d=n[c]||(n[c]=Object.create(null));d[h]||(d[h]=[])}),s.pending.forEach(l=>{const{provider:c,prefix:h,name:d}=l,u=le(c,h),p=u.pendingIcons||(u.pendingIcons=new Set);p.has(d)||(p.add(d),n[c][h].push(d))}),r.forEach(l=>{const c=n[l.provider][l.prefix];c.length&&Eu(l,c)}),t?xu(t,s,r):Yo},Pu=e=>new Promise((t,i)=>{const s=typeof e=="string"?ys(e,!0):e;if(!s){i(e);return}Jr([s||e],n=>{if(n.length&&s){const r=as(s);if(r){t({...vs,...r});return}}i(e)})});function Go(e){try{const t=typeof e=="string"?JSON.parse(e):e;if(typeof t.body=="string")return{...t}}catch{}}function Du(e,t){if(typeof e=="object")return{data:Go(e),value:e};if(typeof e!="string")return{value:e};if(e.includes("{")){const r=Go(e);if(r)return{data:r,value:e}}const i=ys(e,!0,!0);if(!i)return{value:e};const s=as(i);if(s!==void 0||!i.prefix)return{value:e,name:i,data:s};const n=Jr([i],()=>t(e,i,as(i)));return{value:e,name:i,loading:n}}let ac=!1;try{ac=navigator.vendor.indexOf("Apple")===0}catch{}function Ou(e,t){switch(t){case"svg":case"bg":case"mask":return t}return t!=="style"&&(ac||e.indexOf("<a")===-1)?"svg":e.indexOf("currentColor")===-1?"bg":"mask"}const Tu=/(-?[0-9.]*[0-9]+[0-9.]*)/g,Lu=/^-?[0-9.]*[0-9]+[0-9.]*$/g;function kr(e,t,i){if(t===1)return e;if(i=i||100,typeof e=="number")return Math.ceil(e*t*i)/i;if(typeof e!="string")return e;const s=e.split(Tu);if(s===null||!s.length)return e;const n=[];let r=s.shift(),o=Lu.test(r);for(;;){if(o){const a=parseFloat(r);isNaN(a)?n.push(r):n.push(Math.ceil(a*t*i)/i)}else n.push(r);if(r=s.shift(),r===void 0)return n.join("");o=!o}}function zu(e,t="defs"){let i="";const s=e.indexOf("<"+t);for(;s>=0;){const n=e.indexOf(">",s),r=e.indexOf("</"+t);if(n===-1||r===-1)break;const o=e.indexOf(">",r);if(o===-1)break;i+=e.slice(n+1,r).trim(),e=e.slice(0,s).trim()+e.slice(o+1)}return{defs:i,content:e}}function Ru(e,t){return e?"<defs>"+e+"</defs>"+t:t}function Iu(e,t,i){const s=zu(e);return Ru(s.defs,t+s.content+i)}const Bu=e=>e==="unset"||e==="undefined"||e==="none";function lc(e,t){const i={...vs,...e},s={...Xl,...t},n={left:i.left,top:i.top,width:i.width,height:i.height};let r=i.body;[i,s].forEach(f=>{const m=[],g=f.hFlip,y=f.vFlip;let x=f.rotate;g?y?x+=2:(m.push("translate("+(n.width+n.left).toString()+" "+(0-n.top).toString()+")"),m.push("scale(-1 1)"),n.top=n.left=0):y&&(m.push("translate("+(0-n.left).toString()+" "+(n.height+n.top).toString()+")"),m.push("scale(1 -1)"),n.top=n.left=0);let _;switch(x<0&&(x-=Math.floor(x/4)*4),x=x%4,x){case 1:_=n.height/2+n.top,m.unshift("rotate(90 "+_.toString()+" "+_.toString()+")");break;case 2:m.unshift("rotate(180 "+(n.width/2+n.left).toString()+" "+(n.height/2+n.top).toString()+")");break;case 3:_=n.width/2+n.left,m.unshift("rotate(-90 "+_.toString()+" "+_.toString()+")");break}x%2===1&&(n.left!==n.top&&(_=n.left,n.left=n.top,n.top=_),n.width!==n.height&&(_=n.width,n.width=n.height,n.height=_)),m.length&&(r=Iu(r,'<g transform="'+m.join(" ")+'">',"</g>"))});const o=s.width,a=s.height,l=n.width,c=n.height;let h,d;o===null?(d=a===null?"1em":a==="auto"?c:a,h=kr(d,l/c)):(h=o==="auto"?l:o,d=a===null?kr(h,c/l):a==="auto"?c:a);const u={},p=(f,m)=>{Bu(m)||(u[f]=m.toString())};p("width",h),p("height",d);const b=[n.left,n.top,l,c];return u.viewBox=b.join(" "),{attributes:u,viewBox:b,body:r}}function to(e,t){let i=e.indexOf("xlink:")===-1?"":' xmlns:xlink="http://www.w3.org/1999/xlink"';for(const s in t)i+=" "+s+'="'+t[s]+'"';return'<svg xmlns="http://www.w3.org/2000/svg"'+i+">"+e+"</svg>"}function Fu(e){return e.replace(/"/g,"'").replace(/%/g,"%25").replace(/#/g,"%23").replace(/</g,"%3C").replace(/>/g,"%3E").replace(/\s+/g," ")}function Hu(e){return"data:image/svg+xml,"+Fu(e)}function cc(e){return'url("'+Hu(e)+'")'}const ju=()=>{let e;try{if(e=fetch,typeof e=="function")return e}catch{}};let bn=ju();function Vu(e){bn=e}function Nu(){return bn}function Wu(e,t){const i=Dn(e);if(!i)return 0;let s;if(!i.maxURL)s=0;else{let n=0;i.resources.forEach(o=>{n=Math.max(n,o.length)});const r=t+".json?icons=";s=i.maxURL-n-i.path.length-r.length}return s}function Uu(e){return e===404}const qu=(e,t,i)=>{const s=[],n=Wu(e,t),r="icons";let o={type:r,provider:e,prefix:t,icons:[]},a=0;return i.forEach((l,c)=>{a+=l.length+1,a>=n&&c>0&&(s.push(o),o={type:r,provider:e,prefix:t,icons:[]},a=l.length),o.icons.push(l)}),s.push(o),s};function Yu(e){if(typeof e=="string"){const t=Dn(e);if(t)return t.path}return"/"}const Ku=(e,t,i)=>{if(!bn){i("abort",424);return}let s=Yu(t.provider);switch(t.type){case"icons":{const r=t.prefix,o=t.icons.join(","),a=new URLSearchParams({icons:o});s+=r+".json?"+a.toString();break}case"custom":{const r=t.uri;s+=r.slice(0,1)==="/"?r.slice(1):r;break}default:i("abort",400);return}let n=503;bn(e+s).then(r=>{const o=r.status;if(o!==200){setTimeout(()=>{i(Uu(o)?"abort":"next",o)});return}return n=501,r.json()}).then(r=>{if(typeof r!="object"||r===null){setTimeout(()=>{r===404?i("abort",r):i("next",n)});return}setTimeout(()=>{i("success",r)})}).catch(()=>{i("next",n)})},Gu={prepare:qu,send:Ku};function Xu(e,t,i){le(i||"",t).loadIcons=e}function Qu(e,t,i){le(i||"",t).loadIcon=e}const tr="data-style";let hc="";function Zu(e){hc=e}function Xo(e,t){let i=Array.from(e.childNodes).find(s=>s.hasAttribute&&s.hasAttribute(tr));i||(i=document.createElement("style"),i.setAttribute(tr,tr),e.appendChild(i)),i.textContent=":host{display:inline-block;vertical-align:"+(t?"-0.125em":"0")+"}span,svg{display:block;margin:auto}"+hc}function dc(){Wo("",Gu),ic(!0);let e;try{e=window}catch{}if(e){if(e.IconifyPreload!==void 0){const t=e.IconifyPreload,i="Invalid IconifyPreload syntax.";typeof t=="object"&&t!==null&&(t instanceof Array?t:[t]).forEach(s=>{try{(typeof s!="object"||s===null||s instanceof Array||typeof s.icons!="object"||typeof s.prefix!="string"||!No(s))&&console.error(i)}catch{console.error(i)}})}if(e.IconifyProviders!==void 0){const t=e.IconifyProviders;if(typeof t=="object"&&t!==null)for(const i in t){const s="IconifyProviders["+i+"] is invalid.";try{const n=t[i];if(typeof n!="object"||!n||n.resources===void 0)continue;Uo(i,n)||console.error(s)}catch{console.error(s)}}}}return{iconLoaded:mu,getIcon:gu,listIcons:bu,addIcon:sc,addCollection:No,calculateSize:kr,buildIcon:lc,iconToHTML:to,svgToURL:cc,loadIcons:Jr,loadIcon:Pu,addAPIProvider:Uo,setCustomIconLoader:Qu,setCustomIconsLoader:Xu,appendCustomStyle:Zu,_api:{getAPIConfig:Dn,setAPIModule:Wo,sendAPIQuery:oc,setFetch:Vu,getFetch:Nu,listAPIProviders:ku}}}const Cr={"background-color":"currentColor"},uc={"background-color":"transparent"},Qo={image:"var(--svg)",repeat:"no-repeat",size:"100% 100%"},Zo={"-webkit-mask":Cr,mask:Cr,background:uc};for(const e in Zo){const t=Zo[e];for(const i in Qo)t[e+"-"+i]=Qo[i]}function Jo(e){return e?e+(e.match(/^[-0-9.]+$/)?"px":""):"inherit"}function Ju(e,t,i){const s=document.createElement("span");let n=e.body;n.indexOf("<a")!==-1&&(n+="<!-- "+Date.now()+" -->");const r=e.attributes,o=to(n,{...r,width:t.width+"",height:t.height+""}),a=cc(o),l=s.style,c={"--svg":a,width:Jo(r.width),height:Jo(r.height),...i?Cr:uc};for(const h in c)l.setProperty(h,c[h]);return s}let Yi;function tp(){try{Yi=window.trustedTypes.createPolicy("iconify",{createHTML:e=>e})}catch{Yi=null}}function ep(e){return Yi===void 0&&tp(),Yi?Yi.createHTML(e):e}function ip(e){const t=document.createElement("span"),i=e.attributes;let s="";i.width||(s="width: inherit;"),i.height||(s+="height: inherit;"),s&&(i.style=s);const n=to(e.body,i);return t.innerHTML=ep(n),t.firstChild}function Sr(e){return Array.from(e.childNodes).find(t=>{const i=t.tagName&&t.tagName.toUpperCase();return i==="SPAN"||i==="SVG"})}function ta(e,t){const i=t.icon.data,s=t.customisations,n=lc(i,s);s.preserveAspectRatio&&(n.attributes.preserveAspectRatio=s.preserveAspectRatio);const r=t.renderedMode;let o;r==="svg"?o=ip(n):o=Ju(n,{...vs,...i},r==="mask");const a=Sr(e);a?o.tagName==="SPAN"&&a.tagName===o.tagName?a.setAttribute("style",o.getAttribute("style")):e.replaceChild(o,a):e.appendChild(o)}function ea(e,t,i){const s=i&&(i.rendered?i:i.lastRender);return{rendered:!1,inline:t,icon:e,lastRender:s}}function sp(e="iconify-icon"){let t,i;try{t=window.customElements,i=window.HTMLElement}catch{return}if(!t||!i)return;const s=t.get(e);if(s)return s;const n=["icon","mode","inline","noobserver","width","height","rotate","flip"],r=class extends i{constructor(){super(),A(this,"_shadowRoot"),A(this,"_initialised",!1),A(this,"_state"),A(this,"_checkQueued",!1),A(this,"_connected",!1),A(this,"_observer",null),A(this,"_visible",!0);const a=this._shadowRoot=this.attachShadow({mode:"open"}),l=this.hasAttribute("inline");Xo(a,l),this._state=ea({value:""},l),this._queueCheck()}connectedCallback(){this._connected=!0,this.startObserver()}disconnectedCallback(){this._connected=!1,this.stopObserver()}static get observedAttributes(){return n.slice(0)}attributeChangedCallback(a){switch(a){case"inline":{const l=this.hasAttribute("inline"),c=this._state;l!==c.inline&&(c.inline=l,Xo(this._shadowRoot,l));break}case"noobserver":{this.hasAttribute("noobserver")?this.startObserver():this.stopObserver();break}default:this._queueCheck()}}get icon(){const a=this.getAttribute("icon");if(a&&a.slice(0,1)==="{")try{return JSON.parse(a)}catch{}return a}set icon(a){typeof a=="object"&&(a=JSON.stringify(a)),this.setAttribute("icon",a)}get inline(){return this.hasAttribute("inline")}set inline(a){a?this.setAttribute("inline","true"):this.removeAttribute("inline")}get observer(){return this.hasAttribute("observer")}set observer(a){a?this.setAttribute("observer","true"):this.removeAttribute("observer")}restartAnimation(){const a=this._state;if(a.rendered){const l=this._shadowRoot;if(a.renderedMode==="svg")try{l.lastChild.setCurrentTime(0);return}catch{}ta(l,a)}}get status(){const a=this._state;return a.rendered?"rendered":a.icon.data===null?"failed":"loading"}_queueCheck(){this._checkQueued||(this._checkQueued=!0,setTimeout(()=>{this._check()}))}_check(){if(!this._checkQueued)return;this._checkQueued=!1;const a=this._state,l=this.getAttribute("icon");if(l!==a.icon.value){this._iconChanged(l);return}if(!a.rendered||!this._visible)return;const c=this.getAttribute("mode"),h=jo(this);(a.attrMode!==c||lu(a.customisations,h)||!Sr(this._shadowRoot))&&this._renderIcon(a.icon,h,c)}_iconChanged(a){const l=Du(a,(c,h,d)=>{const u=this._state;if(u.rendered||this.getAttribute("icon")!==c)return;const p={value:c,name:h,data:d};p.data?this._gotIconData(p):u.icon=p});l.data?this._gotIconData(l):this._state=ea(l,this._state.inline,this._state)}_forceRender(){if(!this._visible){const a=Sr(this._shadowRoot);a&&this._shadowRoot.removeChild(a);return}this._queueCheck()}_gotIconData(a){this._checkQueued=!1,this._renderIcon(a,jo(this),this.getAttribute("mode"))}_renderIcon(a,l,c){const h=Ou(a.data.body,c),d=this._state.inline;ta(this._shadowRoot,this._state={rendered:!0,icon:a,inline:d,customisations:l,attrMode:c,renderedMode:h})}startObserver(){if(!this._observer&&!this.hasAttribute("noobserver"))try{this._observer=new IntersectionObserver(a=>{const l=a.some(c=>c.isIntersecting);l!==this._visible&&(this._visible=l,this._forceRender())}),this._observer.observe(this)}catch{if(this._observer){try{this._observer.disconnect()}catch{}this._observer=null}}}stopObserver(){this._observer&&(this._observer.disconnect(),this._observer=null,this._visible=!0,this._connected&&this._forceRender())}};n.forEach(a=>{a in r.prototype||Object.defineProperty(r.prototype,a,{get:function(){return this.getAttribute(a)},set:function(l){l!==null?this.setAttribute(a,l):this.removeAttribute(a)}})});const o=dc();for(const a in o)r[a]=r.prototype[a]=o[a];return t.define(e,r),r}const np=sp()||dc(),{iconLoaded:nx,getIcon:rx,listIcons:ox,addIcon:ax,addCollection:rp,calculateSize:lx,buildIcon:cx,iconToHTML:hx,svgToURL:dx,loadIcons:op,loadIcon:ux,setCustomIconLoader:px,setCustomIconsLoader:fx,addAPIProvider:bx,_api:mx}=np,ap=H`
  ::-webkit-scrollbar {
    width: 0.4rem;
    height: 0.4rem;
    overflow: hidden;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 0.25rem;
    background-color: var(
      --bim-scrollbar--c,
      var(--bim-ui_bg-contrast-60)
    );
  }

  ::-webkit-scrollbar-track {
    background-color: var(--bim-scrollbar--bgc, var(--bim-ui_bg-contrast-40));
  }
`,lp=H`
  :root {
    /* Grayscale Colors */
    --bim-ui_gray-0: #19191E; /* app background */
    --bim-ui_gray-1: #262629; /* card / elevated surface */
    --bim-ui_gray-2: #3C3C41; /* button bg / component surface */
    --bim-ui_gray-3: #46464B; /* button hover */
    --bim-ui_gray-4: #5F5F64;
    --bim-ui_gray-5: #76767B;
    --bim-ui_gray-6: #909095;
    --bim-ui_gray-7: #A7A7AB; /* icon / secondary text */
    --bim-ui_gray-8: #BEBEC2;
    --bim-ui_gray-9: #D7D7DA;
    --bim-ui_gray-10: #F0F0F0; /* near-white text / light bg */

    /* Brand Colors */
    --bim-ui_main-base: #6528d7;
    --bim-ui_accent-base: #bcf124;

    /* Brand Colors Contrasts */
    --bim-ui_main-contrast: var(--bim-ui_gray-10);
    --bim-ui_accent-contrast: var(--bim-ui_gray-0);

    /* Status Colors */
    --bim-ui_danger-base: #f04f4f;
    --bim-ui_danger-contrast: var(--bim-ui_gray-10);
    --bim-ui_warning-base: #f0a030;
    --bim-ui_warning-contrast: var(--bim-ui_gray-0);
    --bim-ui_success-base: #4caf72;
    --bim-ui_success-contrast: var(--bim-ui_gray-0);
    --bim-ui_info-base: #4a90d9;
    --bim-ui_info-contrast: var(--bim-ui_gray-10);

    /* Sizes */
    --bim-ui_size-4xs: 0.0625rem; /* 1px */
    --bim-ui_size-3xs: 0.1875rem; /* 3px */
    --bim-ui_size-2xs: 0.3125rem; /* 5px */
    --bim-ui_size-xs: 0.4375rem; /* 7px */
    --bim-ui_size-sm: 0.5625rem; /* 9px */
    --bim-ui_size-base: 0.6875rem; /* 11px */
    --bim-ui_size-lg: 0.8125rem; /* 13px */
    --bim-ui_size-xl: 0.9375rem; /* 15px */
    --bim-ui_size-2xl: 1.0625rem; /* 17px */
    --bim-ui_size-3xl: 1.1875rem; /* 19px */
    --bim-ui_size-4xl: 1.3125rem; /* 21px */
    --bim-ui_size-5xl: 1.4375rem; /* 23px */
    --bim-ui_size-6xl: 1.5625rem; /* 25px */
    --bim-ui_size-7xl: 1.6875rem; /* 27px */
    --bim-ui_size-8xl: 1.8125rem; /* 29px */
    --bim-ui_size-9xl: 1.9375rem; /* 31px */
    --bim-ui_size-10xl: 2.0625rem; /* 33px */
    --bim-ui_size-11xl: 2.1875rem; /* 35px */
    --bim-ui_size-12xl: 2.3125rem; /* 37px */
    --bim-ui_size-13xl: 2.4375rem; /* 39px */
    --bim-ui_size-14xl: 2.5625rem; /* 41px */
    --bim-ui_size-15xl: 2.6875rem; /* 43px */
    --bim-ui_size-16xl: 2.8125rem; /* 45px */
    --bim-ui_size-17xl: 2.9375rem; /* 47px */
    --bim-ui_size-18xl: 3.0625rem; /* 49px */
    --bim-ui_size-19xl: 3.1875rem; /* 51px */
    --bim-ui_size-20xl: 3.3125rem; /* 53px */
    --bim-ui_size-21xl: 3.4375rem; /* 55px */
    --bim-ui_size-22xl: 3.5625rem; /* 57px */
  }

  /* Background Colors */
  @media (prefers-color-scheme: dark) {
    :root {
      --bim-ui_bg-base: var(--bim-ui_gray-0);
      --bim-ui_bg-contrast-10: var(--bim-ui_gray-1);
      --bim-ui_bg-contrast-20: var(--bim-ui_gray-2);
      --bim-ui_bg-contrast-30: var(--bim-ui_gray-3);
      --bim-ui_bg-contrast-40: var(--bim-ui_gray-4);
      --bim-ui_bg-contrast-50: var(--bim-ui_gray-5);
      --bim-ui_bg-contrast-60: var(--bim-ui_gray-6);
      --bim-ui_bg-contrast-70: var(--bim-ui_gray-7);
      --bim-ui_bg-contrast-80: var(--bim-ui_gray-8);
      --bim-ui_bg-contrast-90: var(--bim-ui_gray-9);
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
      --bim-ui_bg-contrast-50: var(--bim-ui_gray-5);
      --bim-ui_bg-contrast-60: var(--bim-ui_gray-4);
      --bim-ui_bg-contrast-70: var(--bim-ui_gray-3);
      --bim-ui_bg-contrast-80: var(--bim-ui_gray-2);
      --bim-ui_bg-contrast-90: var(--bim-ui_gray-1);
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
    --bim-ui_bg-contrast-50: var(--bim-ui_gray-5);
    --bim-ui_bg-contrast-60: var(--bim-ui_gray-6);
    --bim-ui_bg-contrast-70: var(--bim-ui_gray-7);
    --bim-ui_bg-contrast-80: var(--bim-ui_gray-8);
    --bim-ui_bg-contrast-90: var(--bim-ui_gray-9);
    --bim-ui_bg-contrast-100: var(--bim-ui_gray-10);
  }

  html.bim-ui-light {
    --bim-ui_bg-base: var(--bim-ui_gray-10);
    --bim-ui_bg-contrast-10: var(--bim-ui_gray-9);
    --bim-ui_bg-contrast-20: var(--bim-ui_gray-8);
    --bim-ui_bg-contrast-30: var(--bim-ui_gray-7);
    --bim-ui_bg-contrast-40: var(--bim-ui_gray-6);
    --bim-ui_bg-contrast-50: var(--bim-ui_gray-5);
    --bim-ui_bg-contrast-60: var(--bim-ui_gray-4);
    --bim-ui_bg-contrast-70: var(--bim-ui_gray-3);
    --bim-ui_bg-contrast-80: var(--bim-ui_gray-2);
    --bim-ui_bg-contrast-90: var(--bim-ui_gray-1);
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
`,Se={scrollbar:ap,globalStyles:lp},pc=class R{static set config(t){this._config={...R._config,...t}}static get config(){return R._config}static addGlobalStyles(){let t=document.querySelector("style[id='bim-ui']");if(t)return;t=document.createElement("style"),t.id="bim-ui",t.textContent=Se.globalStyles.cssText;const i=document.head.firstChild;i?document.head.insertBefore(t,i):document.head.append(t)}static preloadIcons(t,i=!1){op(t,(s,n,r)=>{i&&(console.log("Icons loaded:",s),n.length&&console.warn("Icons missing:",n),r.length&&console.info("Icons pending:",r))})}static addIconsCollection(t,i){rp({prefix:i?.prefix??"bim",icons:t,width:24,height:24})}static defineCustomElement(t,i){customElements.get(t)||customElements.define(t,i)}static registerComponents(){R.init()}static init(t="",i=!0){R.addGlobalStyles(),R.defineCustomElement("bim-button",fp),R.defineCustomElement("bim-checkbox",Me),R.defineCustomElement("bim-color-input",Ae),R.defineCustomElement("bim-context-menu",lf),R.defineCustomElement("bim-dropdown",Et),R.defineCustomElement("bim-empty-state",uf),R.defineCustomElement("bim-grid",ks),R.defineCustomElement("bim-icon",ro),R.defineCustomElement("bim-input",Cs),R.defineCustomElement("bim-label",Qe),R.defineCustomElement("bim-number-input",mt),R.defineCustomElement("bim-option",ee),R.defineCustomElement("bim-panel",Ze),R.defineCustomElement("bim-panel-section",Je),R.defineCustomElement("bim-selector",Ee),R.defineCustomElement("bim-table",ci),R.defineCustomElement("bim-tabs",qt),R.defineCustomElement("bim-tab",yt),R.defineCustomElement("bim-table-cell",Xc),R.defineCustomElement("bim-table-children",Ff),R.defineCustomElement("bim-table-group",Zc),R.defineCustomElement("bim-table-row",Ms),R.defineCustomElement("bim-text-input",Zf),R.defineCustomElement("bim-toolbar",ao),R.defineCustomElement("bim-toolbar-group",Hn),R.defineCustomElement("bim-toolbar-section",ei),R.defineCustomElement("bim-viewport",lh),R.defineCustomElement("bim-chart-legend",hh),R.defineCustomElement("bim-chart",it),R.defineCustomElement("bim-tooltip",Wy),R.defineCustomElement("bim-slider",ot),R.defineCustomElement("bim-paper-space",wt),R.defineCustomElement("bim-modal",si),R.defineCustomElement("bim-sortable-list",ni),i&&this.animateOnLoad(t)}static newRandomId(){const t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";let i="";for(let s=0;s<10;s++){const n=Math.floor(Math.random()*t.length);i+=t.charAt(n)}return i}static animateOnLoad(t=""){const i=`
      bim-input,
      bim-button,
      bim-checkbox,
      bim-selector,
      bim-table-row,
      bim-panel-section,
      bim-table-children .branch-vertical,
      .switchers
    `,s=[];function n(r,o=document,a=new Set){const l=[];return Array.from(o.querySelectorAll(r)).forEach(c=>{a.has(c)||(a.add(c),l.push(c))}),Array.from(o.querySelectorAll("*")).filter(c=>c.shadowRoot).forEach(c=>{a.has(c)||(a.add(c),l.push(...n(r,c.shadowRoot,a)))}),l}requestAnimationFrame(()=>{n(t||i).forEach(o=>{const a=o;let l="auto";l=window.getComputedStyle(a).getPropertyValue("transition"),a.style.setProperty("opacity","0"),a.style.setProperty("transition","none"),requestAnimationFrame(()=>{a.style.setProperty("transition",l)}),s.push(a)});const r=()=>{s.forEach(o=>{const a=o,l=(a.getBoundingClientRect().x+a.getBoundingClientRect().y)/(window.innerWidth+window.innerHeight),c=window.getComputedStyle(a).getPropertyValue("transform"),h=400,d=200+l*1e3;window.matchMedia("(prefers-reduced-motion: reduce)").matches||(a.animate([{transform:"translateY(-20px)",opacity:"0"},{transform:"translateY(0)",opacity:"1"}],{duration:h,easing:"ease-in-out",delay:d}),setTimeout(()=>{a.style.removeProperty("opacity"),c!=="none"?a.style.setProperty("transform",c):a.style.removeProperty("transform")},d+h))})};document.readyState==="complete"?r():window.addEventListener("load",r)})}static toggleTheme(t=!0){const i=document.querySelector("html");if(!i)return;const s=()=>{i.classList.contains("bim-ui-dark")?i.classList.replace("bim-ui-dark","bim-ui-light"):i.classList.contains("bim-ui-light")?i.classList.replace("bim-ui-light","bim-ui-dark"):i.classList.add("bim-ui-light")};if(t){const n=document.createElement("div");n.classList.add("theme-transition-overlay");const r=document.createElement("div");n.appendChild(r),r.style.setProperty("transition",`background-color ${1e3/3200}s`),document.body.appendChild(n),n.style.setProperty("animation",`toggleOverlay ${1e3/1e3}s ease-in forwards`),r.style.setProperty("animation",`toggleThemeAnimation ${1e3/1e3}s ease forwards`),setTimeout(()=>{s()},1e3/4),setTimeout(()=>{document.body.querySelectorAll(".theme-transition-overlay").forEach(o=>{document.body.removeChild(o)})},1e3)}else s()}};pc._config={sectionLabelOnVerticalToolbar:!1,internalComponentNameAttribute:"bim-element-name"};let xs=pc;class Mr extends I{constructor(){super(...arguments),this._lazyLoadObserver=null,this._visibleElements=[],this.ELEMENTS_BEFORE_OBSERVER=20,this.useObserver=!1,this.elements=new Set,this.observe=t=>{if(!this.useObserver)return;for(const s of t)this.elements.add(s);const i=t.slice(this.ELEMENTS_BEFORE_OBSERVER);for(const s of i)s.remove();this.observeLastElement()}}set visibleElements(t){this._visibleElements=this.useObserver?t:[],this.requestUpdate()}get visibleElements(){return this._visibleElements}getLazyObserver(){if(!this.useObserver)return null;if(this._lazyLoadObserver)return this._lazyLoadObserver;const t=new IntersectionObserver(i=>{const s=i[0];if(!s.isIntersecting)return;const n=s.target;t.unobserve(n);const r=this.ELEMENTS_BEFORE_OBSERVER+this.visibleElements.length,o=[...this.elements][r];o&&(this.visibleElements=[...this.visibleElements,o],t.observe(o))},{threshold:.5});return t}observeLastElement(){const t=this.getLazyObserver();if(!t)return;const i=this.ELEMENTS_BEFORE_OBSERVER+this.visibleElements.length-1,s=[...this.elements][i];s&&t.observe(s)}resetVisibleElements(){const t=this.getLazyObserver();if(t){for(const i of this.elements)t.unobserve(i);this.visibleElements=[],this.observeLastElement()}}static create(t,i){const s=document.createDocumentFragment();if(t.length===0)return dn(t(),s),s.firstElementChild;if(!i)throw new Error("UIComponent: Initial state is required for statefull components.");let n=i;const r=t,o=c=>(n={...n,...c},dn(r(n,o),s),n);o(i);const a=s.firstElementChild,l={getElement:c=>a.querySelector(`[data-${xs.config.internalComponentNameAttribute}="${c}"]`),getCurrentState:()=>n,dispose:()=>{a.remove(),n={},l.updates={}},updates:{}};return[a,o,l]}}const mn=(e,t={},i=!0)=>{let s={};for(const n of e.children){const r=n,o=r.getAttribute("name")||r.getAttribute("label"),a=o?t[o]:void 0;if(o){if("value"in r&&typeof r.value<"u"&&r.value!==null){const l=r.value;if(typeof l=="object"&&!Array.isArray(l)&&Object.keys(l).length===0)continue;s[o]=a?a(r.value):r.value}else if(i){const l=mn(r,t);if(Object.keys(l).length===0)continue;s[o]=a?a(l):l}}else i&&(s={...s,...mn(r,t)})}return s},cp=(e,t)=>{let i=e;for(;i;){if(i.matches(t))return i;const s=i.assignedSlot??i.parentElement??(i.getRootNode()instanceof ShadowRoot?i.getRootNode().host:null);i=s instanceof Element?s:null}return null},gn=e=>e==="true"||e==="false"?e==="true":e&&!isNaN(Number(e))&&e.trim()!==""?Number(e):e,hp=[">=","<=","=",">","<","?","/","#"];function ia(e){const t=hp.find(o=>e.split(o).length===2),i=e.split(t).map(o=>o.trim()),[s,n]=i,r=n.startsWith("'")&&n.endsWith("'")?n.replace(/'/g,""):gn(n);return{key:s,condition:t,value:r}}const Ar=e=>{try{const t=[],i=e.split(/&(?![^()]*\))/).map(s=>s.trim());for(const s of i){const n=!s.startsWith("(")&&!s.endsWith(")"),r=s.startsWith("(")&&s.endsWith(")");if(n){const o=ia(s);t.push(o)}if(r){const o={operator:"&",queries:s.replace(/^(\()|(\))$/g,"").split("&").map(a=>a.trim()).map((a,l)=>{const c=ia(a);return l>0&&(c.operator="&"),c})};t.push(o)}}return t}catch{return null}},sa=(e,t,i)=>{let s=!1;switch(t){case"=":s=e===i;break;case"?":s=String(e).includes(String(i));break;case"<":(typeof e=="number"||typeof i=="number")&&(s=e<i);break;case"<=":(typeof e=="number"||typeof i=="number")&&(s=e<=i);break;case">":(typeof e=="number"||typeof i=="number")&&(s=e>i);break;case">=":(typeof e=="number"||typeof i=="number")&&(s=e>=i);break;case"/":s=String(e).startsWith(String(i));break}return s};let Le=class{constructor(){this.enabled=!0,this.trigger=e=>{if(!this.enabled)return;const t=this.handlers.slice(0);for(const i of t)i(e)},this.handlers=[]}add(e){this.handlers.push(e)}remove(e){this.handlers=this.handlers.filter(t=>t!==e)}reset(){this.handlers.length=0}};class dp extends Set{constructor(t){super(t),this.onUpdated=new Le,this.onItemAdded=new Le,this.onBeforeDelete=new Le,this.onItemDeleted=new Le,this.onCleared=new Le,this.guard=()=>!0,this.deleteGuard=()=>!0}set eventsEnabled(t){this.onUpdated.enabled=t,this.onItemAdded.enabled=t,this.onItemDeleted.enabled=t,this.onBeforeDelete.enabled=t,this.onCleared.enabled=t}clear(){for(const t of this)this.onBeforeDelete.trigger(t);super.clear(),this.onCleared.trigger(),this.onUpdated.trigger()}add(...t){for(const i of t)this.has(i)||!(this.guard??(()=>!0))(i)||(super.add(i),this.onItemAdded||(this.onItemAdded=new Le),this.onItemAdded.trigger(i));return this.onUpdated||(this.onUpdated=new Le),this.onUpdated.trigger(),this}delete(t){if(!this.has(t)||!this.deleteGuard(t))return!1;this.onBeforeDelete.trigger(t);const i=super.delete(t);return i&&(this.onItemDeleted.trigger(t),this.onUpdated.trigger()),i}deleteIf(t){for(const i of this)t(i)&&this.delete(i)}getIndex(t){let i=0;for(const s of this){if(s===t)return i;i++}return-1}dispose(){this.clear(),this.onItemAdded.reset(),this.onItemDeleted.reset(),this.onCleared.reset(),this.onBeforeDelete.reset(),this.onUpdated.reset()}}var up=Object.defineProperty,pp=Object.getOwnPropertyDescriptor,Bt=(e,t,i,s)=>{for(var n=s>1?void 0:s?pp(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&up(t,i,n),n},Yt;const Lt=(Yt=class extends I{constructor(){super(),this.labelHidden=!1,this.active=!1,this.disabled=!1,this.vertical=!1,this.ghost=!1,this._loading=!1,this._menuToken=0,this._menuDialog=ae(),this._movedChildren=[],this._onWindowResize=()=>this._updateMenuPosition(),this._onParentClick=e=>{e.stopPropagation(),!this.disabled&&!this._loading&&this.dispatchEvent(new Event("click"))},this._onHostClick=()=>{!this.disabled&&!this._loading&&this._hasContextMenu()&&this._openMenu()},this._onKeyDown=e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this._onParentClick(e))},this._onDialogClick=e=>{e.stopPropagation(),e.target===this._menuDialog.value&&this._closeMenu()},this._onDialogCancel=e=>{e.preventDefault(),this._closeMenu()},this.hasAttribute("role")||this.setAttribute("role","button"),this.hasAttribute("tabindex")||this.setAttribute("tabindex","0")}get tooltipTime(){return this._tooltipTime}set tooltipTime(e){const t=this._tooltipTime;this._tooltipTime=e,e!==void 0&&console.warn('[bim-button] tooltipTime is deprecated. Use <bim-tooltip timeout="..."> inside the button instead.'),this.requestUpdate("tooltipTime",t)}get tooltipTitle(){return this._tooltipTitle}set tooltipTitle(e){const t=this._tooltipTitle;this._tooltipTitle=e,e!==void 0&&console.warn("[bim-button] tooltipTitle is deprecated. Use <bim-tooltip> inside the button instead."),this.requestUpdate("tooltipTitle",t)}get tooltipText(){return this._tooltipText}set tooltipText(e){const t=this._tooltipText;this._tooltipText=e,e!==void 0&&console.warn("[bim-button] tooltipText is deprecated. Use <bim-tooltip> inside the button instead."),this.requestUpdate("tooltipText",t)}set loading(e){const t=this._loading;this._loading=e,this.requestUpdate("loading",t)}get loading(){return this._loading}_hasContextMenu(){return!!(this.querySelector("bim-context-menu")||this.contextMenuTemplate)}_updateMenuPosition(){const e=this._menuDialog.value;if(!e)return;const t=10,i=5,s=window.innerWidth,n=window.innerHeight,r=this.getBoundingClientRect(),o=e.getBoundingClientRect();let a=r.right+t,l=r.top;if(a+o.width>s-i&&(a=r.left-o.width-t),l+o.height>n-i){const c=r.bottom-o.height;c>=i?l=c:l=n-o.height-i}l=Math.max(i,l),e.style.left=`${a}px`,e.style.top=`${l}px`}_watchMenuPosition(e){this._unwatchMenuPosition(),window.addEventListener("resize",this._onWindowResize),typeof ResizeObserver<"u"&&(this._menuResizeObserver=new ResizeObserver(()=>this._updateMenuPosition()),this._menuResizeObserver.observe(e)),this._menuRaf=requestAnimationFrame(()=>{this._menuRaf=void 0,this._updateMenuPosition()});const t=[...e.children].map(i=>i.updateComplete);Promise.all(t).then(()=>{e.open&&this._updateMenuPosition()})}_unwatchMenuPosition(){var e;window.removeEventListener("resize",this._onWindowResize),(e=this._menuResizeObserver)==null||e.disconnect(),this._menuResizeObserver=void 0,this._menuRaf!==void 0&&cancelAnimationFrame(this._menuRaf),this._menuRaf=void 0}_openMenu(){const e=this._menuDialog.value;if(!e)return;for(;e.firstChild;)e.removeChild(e.firstChild);this._movedChildren=[];const t=this.querySelector("bim-context-menu"),i=++this._menuToken;if(this.contextMenuTemplate){const s=this.contextMenuTemplate();if(typeof s?.then=="function"){this._openAsyncMenu(e,s,i);return}this._fillFromTemplate(e,s)}else if(t){this._movedChildren=[...t.children];for(const s of this._movedChildren)e.append(s)}e.children.length&&(this.getAttribute("data-context-group")&&(this.closeNestedContexts(),this._assignChildGroups(e)),this._showMenu(e))}_fillFromTemplate(e,t){const i=document.createElement("div");dn(t,i);const s=i.querySelector("bim-context-menu")??i;for(const n of[...s.children])e.append(n)}_assignChildGroups(e){const t=xs.newRandomId();for(const i of e.children)i.tagName==="BIM-BUTTON"&&i.setAttribute("data-context-group",t)}_openAsyncMenu(e,t,i){const s=document.createElement("bim-label");s.icon="eos-icons:loading",s.textContent="Loading…",s.setAttribute("aria-busy","true"),s.style.setProperty("--bim-label--c","var(--bim-ui_bg-contrast-50)"),e.append(s),this.getAttribute("data-context-group")&&this.closeNestedContexts(),this._showMenu(e),t.then(n=>{if(i===this._menuToken){for(;e.firstChild;)e.removeChild(e.firstChild);if(this._fillFromTemplate(e,n),!e.children.length){this._closeMenu();return}this.getAttribute("data-context-group")&&this._assignChildGroups(e),this._updateMenuPosition(),this._watchMenuPosition(e)}},n=>{i===this._menuToken&&(console.error("[bim-button] contextMenuTemplate rejected:",n),this._closeMenu())})}_showMenu(e){Yt._openMenuButtons.add(this),this.dispatchEvent(new Event("bim-tooltip-suppress")),e.showModal(),this._updateMenuPosition(),this._watchMenuPosition(e)}_closeMenu(){this._menuToken++,this._unwatchMenuPosition();const e=this._menuDialog.value;if(!e||!e.open)return;e.close(),this.dispatchEvent(new Event("bim-tooltip-unsuppress")),Yt._openMenuButtons.delete(this),this.dispatchEvent(new Event("menuclose",{bubbles:!0,composed:!0}));const t=this.querySelector("bim-context-menu");if(t&&this._movedChildren.length)for(const i of this._movedChildren)t.append(i);for(this._movedChildren=[];e.firstChild;)e.removeChild(e.firstChild);for(const i of[...e.children])i.tagName==="BIM-BUTTON"&&i.removeAttribute("data-context-group");this.dispatchEvent(new Event("hidden"))}closeMenu(){this._closeMenu()}closeNestedContexts(){const e=this.getAttribute("data-context-group");if(e)for(const t of Yt._openMenuButtons)t!==this&&t.getAttribute("data-context-group")===e&&(t._closeMenu(),t.removeAttribute("data-context-group"))}click(){!this.disabled&&!this._loading&&this.dispatchEvent(new Event("click"))}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onHostClick),this.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this._onHostClick),this.removeEventListener("keydown",this._onKeyDown),this._closeMenu()}updated(e){super.updated(e),(e.has("disabled")||e.has("loading"))&&(this.disabled||this._loading?this.setAttribute("aria-disabled","true"):this.removeAttribute("aria-disabled")),(e.has("label")||e.has("labelHidden")||e.has("icon")||e.has("tooltipTitle"))&&(this.labelHidden&&this.label?this.setAttribute("aria-label",this.label):!this.label&&this.icon&&this.setAttribute("aria-label",this._tooltipTitle??this.icon))}render(){const e=this._hasContextMenu(),t=this._loading?"eos-icons:loading":this.icon;let i=w`${this.label}`;return e&&this.label&&(i=w`
        <div style="display: flex; align-items: center;">
          ${this.label}
          ${Yt._chevron}
        </div>
      `),w`
      <div class="parent" @click=${this._onParentClick}>
        ${this.label||t?w`
              <div class="button">
                <bim-label
                  .icon=${t}
                  .vertical=${this.vertical}
                  .labelHidden=${this.labelHidden}
                  >${i}</bim-label
                >
              </div>
            `:null}
      </div>
      <slot></slot>
      <dialog
        ${At(this._menuDialog)}
        @click=${this._onDialogClick}
        @cancel=${this._onDialogCancel}
      ></dialog>
    `}},Yt._chevron=w`<svg
    xmlns="http://www.w3.org/2000/svg"
    height="1.125rem"
    viewBox="0 0 24 24"
    width="1.125rem"
    class="chevron"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
  </svg>`,Yt._openMenuButtons=new Set,Yt.styles=H`
    :host {
      --bim-label--c: var(--bim-ui_bg-contrast-100, white);
      position: relative;
      display: block;
      pointer-events: none;
      background-color: var(--bim-button--bgc, var(--bim-ui_bg-contrast-20));
      border-radius: var(--bim-ui_size-2xs);
      transition: background-color 0.15s;
    }

    :host(:not([disabled]):not([loading]):hover) {
      background-color: var(--bim-button--bgc-h, var(--bim-ui_bg-contrast-30));
      cursor: pointer;
    }

    :host(:focus-visible) {
      outline: 2px solid var(--bim-ui_main-base);
      outline-offset: 2px;
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
      min-height: 25px;
      min-width: 25px;
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
      min-height: var(--bim-ui_size-10xl);
      min-width: var(--bim-ui_size-10xl);
    }

    .button {
      flex-grow: 1;
    }

    :host(:not([label-hidden])[label]) .button {
      justify-content: var(--bim-button--jc, center);
    }

    :host([active]) {
      --bim-label--c: var(--bim-ui_main-contrast);
      background-color: var(--bim-ui_main-base);
    }

    :host(:not([label]):not([icon])) .children {
      flex: 1;
    }

    :host([vertical]) .parent {
      justify-content: center;
    }

    :host(:not([label-hidden])[label]) .button {
      padding: 0 6px;
    }

    :host([disabled]),
    :host([loading]) {
      --bim-label--c: var(--bim-ui_bg-contrast-50);
      background-color: var(--bim-button--disabled-bgc, var(--bim-ui_bg-contrast-20));
    }

    :host([ghost]) {
      background-color: transparent;
      --bim-label--c: var(--bim-ui_bg-contrast-60);
    }

    :host([ghost]:not([disabled]):not([loading]):hover) {
      background-color: transparent;
      --bim-label--c: var(--bim-ui_bg-contrast-100);
    }

    :host([ghost][disabled]),
    :host([ghost][loading]) {
      background-color: transparent;
    }

    .chevron {
      fill: var(--bim-label--c);
      flex-shrink: 0;
    }

    /* Buttons inside the context menu dialog */
    dialog bim-button {
      --bim-icon--fz: var(--bim-ui_size-base);
      --bim-button--bdrs: var(--bim-ui_size-4xs);
      --bim-button--bgc: transparent;
      --bim-button--bgc-h: var(--bim-ui_bg-contrast-20);
      --bim-button--olw: 0;
      --bim-button--olc: transparent;
    }

    dialog {
      position: fixed;
      margin: 0;
      padding: 0.375rem;
      border: none;
      outline: none;
      border-radius: 4px;
      background-color: var(--bim-ui_bg-contrast-10);
      box-shadow: 1px 2px 8px 2px rgba(0, 0, 0, 0.15);
      overflow: auto;
      max-height: 20rem;
      min-width: 3rem;
      display: none;
      flex-direction: column;
      pointer-events: auto;
    }

    dialog[open] {
      display: flex;
    }

    dialog::backdrop {
      background: transparent;
      pointer-events: auto;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `,Yt);Bt([v({type:String,reflect:!0})],Lt.prototype,"label",2);Bt([v({type:Boolean,attribute:"label-hidden",reflect:!0})],Lt.prototype,"labelHidden",2);Bt([v({type:Boolean,reflect:!0})],Lt.prototype,"active",2);Bt([v({type:Boolean,reflect:!0,attribute:"disabled"})],Lt.prototype,"disabled",2);Bt([v({type:String,reflect:!0})],Lt.prototype,"icon",2);Bt([v({type:Boolean,reflect:!0})],Lt.prototype,"vertical",2);Bt([v({type:Boolean,reflect:!0})],Lt.prototype,"ghost",2);Bt([v({type:Number,attribute:"tooltip-time",reflect:!0})],Lt.prototype,"tooltipTime",1);Bt([v({type:String,attribute:"tooltip-title",reflect:!0})],Lt.prototype,"tooltipTitle",1);Bt([v({type:String,attribute:"tooltip-text",reflect:!0})],Lt.prototype,"tooltipText",1);Bt([v({type:Boolean,reflect:!0})],Lt.prototype,"loading",1);let fp=Lt;var bp=Object.defineProperty,Ge=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&bp(t,i,n),n};const mp=w`<svg part="checkmark" viewBox="0 0 21 21"><polyline points="5 10.75 8.5 14.25 16 6"></polyline></svg>`,gp=w`<svg part="checkmark" viewBox="0 0 21 21"><line x1="5" y1="10.5" x2="16" y2="10.5"></line></svg>`,$r=class extends I{constructor(){super(...arguments),this.checked=!1,this.indeterminate=!1,this.disabled=!1,this.inverted=!1,this.onValueChange=new Event("change")}get value(){return this.checked}set value(t){this.checked=t}updated(t){super.updated(t),t.has("disabled")&&this.setAttribute("aria-disabled",String(this.disabled))}onChange(t){t.stopPropagation();const i=t.target;i&&(this.checked=i.checked,this.indeterminate=!1,this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0})))}render(){return w`
      <label class="parent-label">
        ${this.icon||this.label?w`<bim-label .icon="${this.icon}">${this.label??""}</bim-label>`:T}
        <div class="input-container">
          <input
            part="input"
            type="checkbox"
            name=${Jt(this.name)}
            aria-label=${this.label||this.name||"Checkbox Input"}
            @change="${this.onChange}"
            .checked="${this.checked}"
            .indeterminate="${this.indeterminate}"
            .disabled="${this.disabled}"
          />
          ${this.indeterminate?gp:mp}
        </div>
      </label>
    `}};$r.shadowRootOptions={...I.shadowRootOptions,delegatesFocus:!0},$r.styles=H`
    :host {
      display: block;
    }

    .parent-label {
      --background: var(--bim-checkbox--bg, var(--bim-ui_bg-contrast-30));
      --border: var(--bim-checkbox--bd-c, var(--bim-ui_bg-contrast-50));
      --stroke: var(--bim-checkbox--stroke-c, var(--bim-ui_main-contrast));
      --border-hover: var(--bim-checkbox--bd-h-c, var(--bim-ui_bg-contrast-70));
      --border-active: var(--bim-checkbox--bd-active-c, var(--bim-ui_main-base));
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      width: 100%;
      height: 25px;
      column-gap: 0.25rem;
      position: relative;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }

    :host([inverted]) .parent-label {
      flex-direction: row-reverse;
      justify-content: start;
    }

    :host([disabled]) {
      cursor: not-allowed;
    }

    :host([disabled]) .parent-label {
      pointer-events: none;
      opacity: 0.4;
    }

    input,
    svg {
      width: 1rem;
      height: 1rem;
      display: block;
    }

    .input-container {
      position: relative;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }

    input {
      -webkit-appearance: none;
      -moz-appearance: none;
      outline: none;
      background: var(--background);
      border: none;
      margin: 0;
      padding: 0;
      cursor: pointer;
      border-radius: var(--bim-checkbox--bdrs, 4px);
      transition: box-shadow 0.3s;
      box-shadow: inset 0 0 0 var(--s, 1px) var(--b, var(--border));
    }

    input:focus-visible {
      outline: 2px solid var(--bim-ui_main-base);
      outline-offset: 2px;
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

    input:checked,
    input:indeterminate {
      --b: var(--border-active);
      --s: 11px;
    }

    input:checked + svg,
    input:indeterminate + svg {
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

    @media (prefers-reduced-motion: reduce) {
      input:checked + svg,
      input:indeterminate + svg {
        animation: none;
        transform: translateY(-100%) scale(1);
      }
    }
  `;let Me=$r;Ge([v({type:String,reflect:!0})],Me.prototype,"icon");Ge([v({type:String})],Me.prototype,"name");Ge([v({type:String,reflect:!0})],Me.prototype,"label");Ge([v({type:Boolean})],Me.prototype,"checked");Ge([v({type:Boolean})],Me.prototype,"indeterminate");Ge([v({type:Boolean,reflect:!0})],Me.prototype,"disabled");Ge([v({type:Boolean,reflect:!0})],Me.prototype,"inverted");var vp=Object.defineProperty,yp=Object.getOwnPropertyDescriptor,$t=(e,t,i,s)=>{for(var n=s>1?void 0:s?yp(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&vp(t,i,n),n};const fc=class extends I{constructor(){super(...arguments),this._value=0,this.vertical=!1,this.slider=!1,this._input=ae(),this.onValueChange=new Event("change")}set value(t){Number.isFinite(t)&&this.setValue(t.toString())}get value(){return this._value}onChange(t){t.stopPropagation();const{value:i}=this._input;i&&this.setValue(i.value)}onInput(t){t.stopPropagation();const i=t.target,s=i.value,n=s.replace(/[^0-9.-]/g,"");if(n===s)return;const r=i.selectionStart??n.length,o=s.slice(0,r).length-s.slice(0,r).replace(/[^0-9.-]/g,"").length;i.value=n;const a=r-o;i.setSelectionRange(a,a)}onInputKeyDown(t){t.key!=="ArrowUp"&&t.key!=="ArrowDown"||(t.preventDefault(),this.stepValue(t.key==="ArrowUp"?1:-1))}onSliderKeyDown(t){let i=0;if(t.key==="ArrowUp"||t.key==="ArrowRight")i=1;else if(t.key==="ArrowDown"||t.key==="ArrowLeft")i=-1;else return;t.preventDefault(),this.stepValue(i)}stepValue(t){var i;const s=this.step??1,n=((i=s.toString().split(".")[1])==null?void 0:i.length)||0;this.setValue((this.value+t*s).toFixed(n))}setValue(t){const{value:i}=this._input;let s=t;if(s=s.replace(/[^0-9.-]/g,""),s=s.replace(/(\..*)\./g,"$1"),s.endsWith(".")||(s.lastIndexOf("-")>0&&(s=s[0]+s.substring(1).replace(/-/g,"")),s==="-"||s==="-0"))return;let n=Number(s);Number.isNaN(n)||(n=this.min!==void 0?Math.max(n,this.min):n,n=this.max!==void 0?Math.min(n,this.max):n,this.value!==n&&(this._value=n,i&&(i.value=this.value.toString()),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))))}onBlur(){this._escapeKeyListener&&(window.removeEventListener("keydown",this._escapeKeyListener),this._escapeKeyListener=void 0);const{value:t}=this._input;t&&(this.setValue(t.value),t.value=this.value.toString())}onSliderMouseDown(t){document.body.style.cursor="w-resize";const{clientX:i}=t,s=this.value;let n=!1;const r=l=>{var c;n=!0;const{clientX:h}=l,d=this.step??1,u=((c=d.toString().split(".")[1])==null?void 0:c.length)||0,p=1/(this.sensitivity??1),b=(h-i)/p;if(Math.floor(Math.abs(b))!==Math.abs(b))return;const f=s+b*d;this.setValue(f.toFixed(u))},o=()=>{this.slider=!0,this.removeEventListener("blur",o)},a=()=>{document.removeEventListener("mousemove",r),document.removeEventListener("mouseup",a),this._sliderMouseMove=void 0,this._sliderMouseUp=void 0,document.body.style.cursor="default",n?n=!1:(this.addEventListener("blur",o),this.slider=!1,requestAnimationFrame(()=>this.focus()))};this._sliderMouseMove=r,this._sliderMouseUp=a,document.addEventListener("mousemove",r),document.addEventListener("mouseup",a)}onFocus(){this._escapeKeyListener&&window.removeEventListener("keydown",this._escapeKeyListener),this._escapeKeyListener=t=>{t.key==="Escape"&&this.blur()},window.addEventListener("keydown",this._escapeKeyListener)}connectedCallback(){super.connectedCallback(),this.min!==void 0&&this.min>this._value&&(this._value=this.min),this.max!==void 0&&this.max<this._value&&(this._value=this.max)}disconnectedCallback(){super.disconnectedCallback(),this._sliderMouseMove&&(document.removeEventListener("mousemove",this._sliderMouseMove),this._sliderMouseMove=void 0),this._sliderMouseUp&&(document.removeEventListener("mouseup",this._sliderMouseUp),this._sliderMouseUp=void 0),this._escapeKeyListener&&(window.removeEventListener("keydown",this._escapeKeyListener),this._escapeKeyListener=void 0)}updated(t){if(!t.has("min")&&!t.has("max"))return;let i=this._value;this.min!==void 0&&(i=Math.max(i,this.min)),this.max!==void 0&&(i=Math.min(i,this.max)),i!==this._value&&(this._value=i)}focus(t){const{value:i}=this._input;i&&i.focus(t)}renderRegular(){return w`
      ${this.pref?w`<bim-label class="affix" @mousedown=${this.onSliderMouseDown}
            >${this.pref}</bim-label
          >`:null}
      <input
        ${At(this._input)}
        type="text"
        role="spinbutton"
        aria-label=${this.label||this.name||"Number Input"}
        aria-valuenow=${this.value}
        aria-valuemin=${Jt(this.min)}
        aria-valuemax=${Jt(this.max)}
        size="1"
        @input=${this.onInput}
        @change=${this.onChange}
        @blur=${this.onBlur}
        @focus=${this.onFocus}
        @keydown=${this.onInputKeyDown}
        .value=${this.value.toString()}
      />
      ${this.suffix?w`<bim-label class="affix" @mousedown=${this.onSliderMouseDown}
            >${this.suffix}</bim-label
          >`:null}
    `}renderSlider(){const t=this.min??-1/0,i=this.max??1/0,s=100*(this.value-t)/(i-t);return this.style.setProperty("--_number-input-slider-pct",Number.isFinite(s)?`${s}%`:"0%"),w`
      <div
        class="slider"
        role="slider"
        tabindex="0"
        aria-label=${this.label||this.name||"Slider"}
        aria-valuenow=${this.value}
        aria-valuemin=${Jt(this.min)}
        aria-valuemax=${Jt(this.max)}
        @mousedown=${this.onSliderMouseDown}
        @keydown=${this.onSliderKeyDown}
      >
        <div class="slider-indicator"></div>
        ${this.pref?w`<bim-label class="affix slider-affix pref"
              >${`${this.pref}: `}</bim-label
            >`:null}
        <bim-label class="affix slider-affix">${this.value}</bim-label>
        ${this.suffix?w`<bim-label class="affix slider-affix">${this.suffix}</bim-label>`:null}
      </div>
    `}render(){const t=`${this.label||this.name||this.pref?`${this.label||this.name||this.pref}: `:""}${this.value}${this.suffix??""}`;return w`
      <div class="parent">
        ${this.label||this.icon?w`<bim-label .icon=${this.icon}>${this.label}</bim-label>`:null}
        <div class="input" title=${t}>
          ${this.slider?this.renderSlider():this.renderRegular()}
        </div>
      </div>
    `}};fc.styles=H`
    :host {
      display: block;
    }

    .parent {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      user-select: none;
      flex: 1;
      align-items: normal;
    }

    :host(:not([vertical])) .parent {
      justify-content: space-between;
    }

    :host([vertical]) .parent {
      flex-direction: column;
    }

    bim-label {
      margin-top: var(--bim-input--label-mt, 0);
      pointer-events: none;
    }

    .input {
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      height: 25px;
      min-width: 3rem;
      gap: 4px;
      padding: 0 7px;
      background-color: var(--bim-input--bgc, var(--bim-ui_bg-contrast-20));
      border: var(--bim-input--olw, 2px) solid var(--bim-input--olc, transparent);
      border-radius: var(--bim-input--bdrs, var(--bim-ui_size-2xs));
      transition: border-color 0.15s;
    }

    :host(:not([vertical])) .input {
      flex: 1;
      justify-content: flex-end;
    }

    :host(:not([vertical])[label]) .input {
      max-width: var(--bim-input--maxw, fit-content);
    }

    :host(:focus-within) .input {
      border-color: var(--bim-number-input--focus-c, var(--bim-ui_bg-contrast-40));
    }

    input {
      background-color: transparent;
      outline: none;
      border: none;
      padding: 0;
      flex-grow: 1;
      text-align: var(--bim-input--ta, right);
      font-family: inherit;
      font-feature-settings: inherit;
      font-variation-settings: inherit;
      font-size: var(--bim-ui_size-base);
      color: var(--bim-number-input--c, var(--bim-ui_bg-contrast-100));
      color-scheme: dark;
    }

    :host-context(html.bim-ui-light) input {
      color-scheme: light;
    }

    @media (prefers-color-scheme: light) {
      input {
        color-scheme: light;
      }
    }

    :host([suffix]:not([pref])) input {
      text-align: var(--bim-input--ta, left);
    }

    bim-label.affix {
      pointer-events: auto;
      --bim-label--c: var(--bim-ui_bg-contrast-80);
      --bim-label--fz: var(--bim-ui_size-sm);
    }

    :host([slider]) .input {
      padding: 0;
    }

    .slider {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 0 0.5rem;
    }

    .slider bim-label.affix {
      --bim-label--c: var(--bim-ui_bg-contrast-100);
    }

    .slider-affix {
      position: relative;
      z-index: 1;
    }

    .slider-affix.pref {
      margin-right: 0.125rem;
    }

    .slider-indicator {
      height: 100%;
      width: var(--_number-input-slider-pct, 0%);
      background-color: var(--bim-ui_main-base);
      position: absolute;
      top: 0;
      left: 0;
      border-radius: var(--bim-input--bdrs, var(--bim-ui_size-2xs));
    }

    @media (prefers-reduced-motion: reduce) {
      .input {
        transition: none;
      }
    }
  `;let mt=fc;$t([v({type:String,reflect:!0})],mt.prototype,"name",2);$t([v({type:String,reflect:!0})],mt.prototype,"icon",2);$t([v({type:String,reflect:!0})],mt.prototype,"label",2);$t([v({type:String,reflect:!0})],mt.prototype,"pref",2);$t([v({type:Number,reflect:!0})],mt.prototype,"min",2);$t([Z()],mt.prototype,"_value",2);$t([v({type:Number})],mt.prototype,"value",1);$t([v({type:Number})],mt.prototype,"step",2);$t([v({type:Number})],mt.prototype,"sensitivity",2);$t([v({type:Number,reflect:!0})],mt.prototype,"max",2);$t([v({type:String,reflect:!0})],mt.prototype,"suffix",2);$t([v({type:Boolean,reflect:!0})],mt.prototype,"vertical",2);$t([v({type:Boolean,reflect:!0})],mt.prototype,"slider",2);var xp=Object.defineProperty,Xe=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&xp(t,i,n),n};const bc=class extends I{constructor(){super(...arguments),this.vertical=!1,this.color="#ffffff",this.disabled=!1,this._colorInput=ae(),this._textInput=ae(),this.onValueChange=new Event("input")}set value(t){const{color:i,opacity:s}=t;this.color=i,s!==void 0&&(this.opacity=s)}get value(){const t={color:this.color};return this.opacity!==void 0&&(t.opacity=this.opacity),t}updated(t){super.updated(t),t.has("disabled")&&(this.disabled?this.setAttribute("aria-disabled","true"):this.removeAttribute("aria-disabled"))}_onColorInput(t){t.stopPropagation();const i=this._colorInput.value;i&&(this.color=i.value,this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})))}_onTextInput(t){t.stopPropagation();const i=this._textInput.value;if(!i)return;const s="#"+i.value.replace(/[^a-fA-F0-9]/g,"").slice(0,6);i.value=s,s.length===7&&(this.color=s,this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})))}_onOpacityInput(t){t.target instanceof mt&&(this.opacity=Math.max(0,Math.min(100,t.target.value)),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})))}focus(){var t;(t=this._textInput.value)==null||t.focus()}render(){return w`
      <div class="parent">
        ${this.label||this.icon?w`<bim-label .icon=${this.icon}>${this.label}</bim-label>`:T}
        <div
          class="input"
          role="group"
          aria-label=${this.label||this.name||"Color input"}
          style="--_swatch-c: ${this.color}"
        >
          <input
            ${At(this._colorInput)}
            type="color"
            .value=${this.color}
            ?disabled=${this.disabled}
            aria-hidden="true"
            tabindex="-1"
            @input=${this._onColorInput}
          />
          <button
            class="sample"
            type="button"
            aria-label="Open color picker"
            ?disabled=${this.disabled}
            @click=${()=>{var t;return(t=this._colorInput.value)==null?void 0:t.click()}}
          ></button>
          <input
            ${At(this._textInput)}
            type="text"
            .value=${this.color}
            ?disabled=${this.disabled}
            aria-label=${this.label||this.name||"Hex color value (e.g. #FF0000)"}
            @input=${this._onTextInput}
          />
          ${this.opacity!==void 0?w`<bim-number-input
                label="Opacity"
                label-hidden
                suffix="%"
                min="0"
                max="100"
                slider
                .value=${this.opacity}
                @change=${this._onOpacityInput}
              ></bim-number-input>`:T}
        </div>
      </div>
    `}};bc.styles=H`
    :host {
      display: block;
    }

    .parent {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      user-select: none;
    }

    :host(:not([vertical])) .parent {
      justify-content: space-between;
    }

    :host([vertical]) .parent {
      flex-direction: column;
    }

    bim-label {
      margin-top: var(--bim-input--label-mt, 0);
    }

    .input {
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      height: 25px;
      min-width: 3rem;
      gap: var(--bim-input--g, var(--bim-ui_size-4xs));
      padding: 0 7px;
      background-color: var(--bim-input--bgc, var(--bim-ui_bg-contrast-20));
      border: var(--bim-input--olw, 2px) solid var(--bim-input--olc, transparent);
      border-radius: var(--bim-input--bdrs, var(--bim-ui_size-2xs));
      transition: border-color 0.15s;
    }

    :host(:not([vertical])) .input {
      flex: 1;
    }

    :host(:not([vertical])[label]) .input,
    :host(:not([vertical])[icon]) .input {
      max-width: var(--bim-input--maxw, fit-content);
    }

    :host(:focus-within) .input {
      border-color: var(--bim-ui_bg-contrast-40);
    }

    input[type="color"] {
      position: absolute;
      visibility: hidden;
      width: 0;
      height: 0;
    }

    .sample {
      width: var(--bim-color-input--swatch-sz, 1rem);
      height: var(--bim-color-input--swatch-sz, 1rem);
      border-radius: var(--bim-color-input--swatch-bdrs, var(--bim-ui_size-4xs));
      border: none;
      padding: 0;
      cursor: pointer;
      flex-shrink: 0;
      background-color: var(--_swatch-c);
    }

    :host([disabled]) .sample {
      cursor: default;
      pointer-events: none;
    }

    .sample:focus-visible {
      outline: 2px solid var(--bim-ui_accent-base);
      outline-offset: 1px;
    }

    input[type="text"] {
      height: 100%;
      flex: 1;
      min-width: 0;
      text-transform: uppercase;
      font-size: var(--bim-ui_size-sm);
      font-family: inherit;
      background-color: transparent;
      padding: 0;
      outline: none;
      border: none;
      color: var(--bim-color-input--c, var(--bim-ui_bg-contrast-100));
    }

    :host([disabled]) input[type="text"] {
      color: var(--bim-ui_bg-contrast-60);
    }

    bim-number-input {
      flex-shrink: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .input {
        transition: none;
      }
    }
  `;let Ae=bc;Xe([v({type:String,reflect:!0})],Ae.prototype,"name");Xe([v({type:String,reflect:!0})],Ae.prototype,"label");Xe([v({type:String,reflect:!0})],Ae.prototype,"icon");Xe([v({type:Boolean,reflect:!0})],Ae.prototype,"vertical");Xe([v({type:Number})],Ae.prototype,"opacity");Xe([v({type:String})],Ae.prototype,"color");Xe([v({type:Boolean,reflect:!0})],Ae.prototype,"disabled");const fi=Math.min,oe=Math.max,vn=Math.round,_e=e=>({x:e,y:e}),_p={left:"right",right:"left",bottom:"top",top:"bottom"};function na(e,t,i){return oe(e,fi(t,i))}function _s(e,t){return typeof e=="function"?e(t):e}function ce(e){return e.split("-")[0]}function On(e){return e.split("-")[1]}function mc(e){return e==="x"?"y":"x"}function gc(e){return e==="y"?"height":"width"}function te(e){const t=e[0];return t==="t"||t==="b"?"y":"x"}function vc(e){return mc(te(e))}function wp(e,t,i){i===void 0&&(i=!1);const s=On(e),n=vc(e),r=gc(n);let o=n==="x"?s===(i?"end":"start")?"right":"left":s==="start"?"bottom":"top";return t.reference[r]>t.floating[r]&&(o=yn(o)),[o,yn(o)]}function kp(e){const t=yn(e);return[Er(e),t,Er(t)]}function Er(e){return e.includes("start")?e.replace("start","end"):e.replace("end","start")}const ra=["left","right"],oa=["right","left"],Cp=["top","bottom"],Sp=["bottom","top"];function Mp(e,t,i){switch(e){case"top":case"bottom":return i?t?oa:ra:t?ra:oa;case"left":case"right":return t?Cp:Sp;default:return[]}}function Ap(e,t,i,s){const n=On(e);let r=Mp(ce(e),i==="start",s);return n&&(r=r.map(o=>o+"-"+n),t&&(r=r.concat(r.map(Er)))),r}function yn(e){const t=ce(e);return _p[t]+e.slice(t.length)}function $p(e){return{top:0,right:0,bottom:0,left:0,...e}}function yc(e){return typeof e!="number"?$p(e):{top:e,right:e,bottom:e,left:e}}function bi(e){const{x:t,y:i,width:s,height:n}=e;return{width:s,height:n,top:i,left:t,right:t+s,bottom:i+n,x:t,y:i}}function aa(e,t,i){let{reference:s,floating:n}=e;const r=te(t),o=vc(t),a=gc(o),l=ce(t),c=r==="y",h=s.x+s.width/2-n.width/2,d=s.y+s.height/2-n.height/2,u=s[a]/2-n[a]/2;let p;switch(l){case"top":p={x:h,y:s.y-n.height};break;case"bottom":p={x:h,y:s.y+s.height};break;case"right":p={x:s.x+s.width,y:d};break;case"left":p={x:s.x-n.width,y:d};break;default:p={x:s.x,y:s.y}}switch(On(t)){case"start":p[o]-=u*(i&&c?-1:1);break;case"end":p[o]+=u*(i&&c?-1:1);break}return p}async function Ep(e,t){var i;t===void 0&&(t={});const{x:s,y:n,platform:r,rects:o,elements:a,strategy:l}=e,{boundary:c="clippingAncestors",rootBoundary:h="viewport",elementContext:d="floating",altBoundary:u=!1,padding:p=0}=_s(t,e),b=yc(p),f=a[u?d==="floating"?"reference":"floating":d],m=bi(await r.getClippingRect({element:(i=await(r.isElement==null?void 0:r.isElement(f)))==null||i?f:f.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(a.floating)),boundary:c,rootBoundary:h,strategy:l})),g=d==="floating"?{x:s,y:n,width:o.floating.width,height:o.floating.height}:o.reference,y=await(r.getOffsetParent==null?void 0:r.getOffsetParent(a.floating)),x=await(r.isElement==null?void 0:r.isElement(y))?await(r.getScale==null?void 0:r.getScale(y))||{x:1,y:1}:{x:1,y:1},_=bi(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:a,rect:g,offsetParent:y,strategy:l}):g);return{top:(m.top-_.top+b.top)/x.y,bottom:(_.bottom-m.bottom+b.bottom)/x.y,left:(m.left-_.left+b.left)/x.x,right:(_.right-m.right+b.right)/x.x}}const Pp=50,Dp=async(e,t,i)=>{const{placement:s="bottom",strategy:n="absolute",middleware:r=[],platform:o}=i,a=o.detectOverflow?o:{...o,detectOverflow:Ep},l=await(o.isRTL==null?void 0:o.isRTL(t));let c=await o.getElementRects({reference:e,floating:t,strategy:n}),{x:h,y:d}=aa(c,s,l),u=s,p=0;const b={};for(let f=0;f<r.length;f++){const m=r[f];if(!m)continue;const{name:g,fn:y}=m,{x,y:_,data:C,reset:k}=await y({x:h,y:d,initialPlacement:s,placement:u,strategy:n,middlewareData:b,rects:c,platform:a,elements:{reference:e,floating:t}});h=x??h,d=_??d,b[g]={...b[g],...C},k&&p<Pp&&(p++,typeof k=="object"&&(k.placement&&(u=k.placement),k.rects&&(c=k.rects===!0?await o.getElementRects({reference:e,floating:t,strategy:n}):k.rects),{x:h,y:d}=aa(c,u,l)),f=-1)}return{x:h,y:d,placement:u,strategy:n,middlewareData:b}},Op=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var i,s;const{placement:n,middlewareData:r,rects:o,initialPlacement:a,platform:l,elements:c}=t,{mainAxis:h=!0,crossAxis:d=!0,fallbackPlacements:u,fallbackStrategy:p="bestFit",fallbackAxisSideDirection:b="none",flipAlignment:f=!0,...m}=_s(e,t);if((i=r.arrow)!=null&&i.alignmentOffset)return{};const g=ce(n),y=te(a),x=ce(a)===a,_=await(l.isRTL==null?void 0:l.isRTL(c.floating)),C=u||(x||!f?[yn(a)]:kp(a)),k=b!=="none";!u&&k&&C.push(...Ap(a,f,b,_));const S=[a,...C],M=await l.detectOverflow(t,m),E=[];let $=((s=r.flip)==null?void 0:s.overflows)||[];if(h&&E.push(M[g]),d){const V=wp(n,o,_);E.push(M[V[0]],M[V[1]])}if($=[...$,{placement:n,overflows:E}],!E.every(V=>V<=0)){var P,O;const V=(((P=r.flip)==null?void 0:P.index)||0)+1,D=S[V];if(D&&(!(d==="alignment"&&y!==te(D))||$.every(W=>te(W.placement)===y?W.overflows[0]>0:!0)))return{data:{index:V,overflows:$},reset:{placement:D}};let F=(O=$.filter(W=>W.overflows[0]<=0).sort((W,J)=>W.overflows[1]-J.overflows[1])[0])==null?void 0:O.placement;if(!F)switch(p){case"bestFit":{var Q;const W=(Q=$.filter(J=>{if(k){const X=te(J.placement);return X===y||X==="y"}return!0}).map(J=>[J.placement,J.overflows.filter(X=>X>0).reduce((X,ue)=>X+ue,0)]).sort((J,X)=>J[1]-X[1])[0])==null?void 0:Q[0];W&&(F=W);break}case"initialPlacement":F=a;break}if(n!==F)return{reset:{placement:F}}}return{}}}};function xc(e){const t=fi(...e.map(r=>r.left)),i=fi(...e.map(r=>r.top)),s=oe(...e.map(r=>r.right)),n=oe(...e.map(r=>r.bottom));return{x:t,y:i,width:s-t,height:n-i}}function Tp(e){const t=e.slice().sort((n,r)=>n.y-r.y),i=[];let s=null;for(let n=0;n<t.length;n++){const r=t[n];!s||r.y-s.y>s.height/2?i.push([r]):i[i.length-1].push(r),s=r}return i.map(n=>bi(xc(n)))}const Lp=function(e){return e===void 0&&(e={}),{name:"inline",options:e,async fn(t){const{placement:i,elements:s,rects:n,platform:r,strategy:o}=t,{padding:a=2,x:l,y:c}=_s(e,t),h=Array.from(await(r.getClientRects==null?void 0:r.getClientRects(s.reference))||[]),d=Tp(h),u=bi(xc(h)),p=yc(a);function b(){if(d.length===2&&d[0].left>d[1].right&&l!=null&&c!=null)return d.find(m=>l>m.left-p.left&&l<m.right+p.right&&c>m.top-p.top&&c<m.bottom+p.bottom)||u;if(d.length>=2){if(te(i)==="y"){const $=d[0],P=d[d.length-1],O=ce(i)==="top",Q=$.top,V=P.bottom,D=O?$.left:P.left,F=O?$.right:P.right,W=F-D,J=V-Q;return{top:Q,bottom:V,left:D,right:F,width:W,height:J,x:D,y:Q}}const m=ce(i)==="left",g=oe(...d.map($=>$.right)),y=fi(...d.map($=>$.left)),x=d.filter($=>m?$.left===y:$.right===g),_=x[0].top,C=x[x.length-1].bottom,k=y,S=g,M=S-k,E=C-_;return{top:_,bottom:C,left:k,right:S,width:M,height:E,x:k,y:_}}return u}const f=await r.getElementRects({reference:{getBoundingClientRect:b},floating:s.floating,strategy:o});return n.reference.x!==f.reference.x||n.reference.y!==f.reference.y||n.reference.width!==f.reference.width||n.reference.height!==f.reference.height?{reset:{rects:f}}:{}}}},zp=new Set(["left","top"]);async function Rp(e,t){const{placement:i,platform:s,elements:n}=e,r=await(s.isRTL==null?void 0:s.isRTL(n.floating)),o=ce(i),a=On(i),l=te(i)==="y",c=zp.has(o)?-1:1,h=r&&l?-1:1,d=_s(t,e);let{mainAxis:u,crossAxis:p,alignmentAxis:b}=typeof d=="number"?{mainAxis:d,crossAxis:0,alignmentAxis:null}:{mainAxis:d.mainAxis||0,crossAxis:d.crossAxis||0,alignmentAxis:d.alignmentAxis};return a&&typeof b=="number"&&(p=a==="end"?b*-1:b),l?{x:p*h,y:u*c}:{x:u*c,y:p*h}}const _c=function(e){return{name:"offset",options:e,async fn(t){var i,s;const{x:n,y:r,placement:o,middlewareData:a}=t,l=await Rp(t,e);return o===((i=a.offset)==null?void 0:i.placement)&&(s=a.arrow)!=null&&s.alignmentOffset?{}:{x:n+l.x,y:r+l.y,data:{...l,placement:o}}}}},Ip=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:i,y:s,placement:n,platform:r}=t,{mainAxis:o=!0,crossAxis:a=!1,limiter:l={fn:g=>{let{x:y,y:x}=g;return{x:y,y:x}}},...c}=_s(e,t),h={x:i,y:s},d=await r.detectOverflow(t,c),u=te(ce(n)),p=mc(u);let b=h[p],f=h[u];if(o){const g=p==="y"?"top":"left",y=p==="y"?"bottom":"right",x=b+d[g],_=b-d[y];b=na(x,b,_)}if(a){const g=u==="y"?"top":"left",y=u==="y"?"bottom":"right",x=f+d[g],_=f-d[y];f=na(x,f,_)}const m=l.fn({...t,[p]:b,[u]:f});return{...m,data:{x:m.x-i,y:m.y-s,enabled:{[p]:o,[u]:a}}}}}};function Tn(){return typeof window<"u"}function we(e){return wc(e)?(e.nodeName||"").toLowerCase():"#document"}function Mt(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function $e(e){var t;return(t=(wc(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function wc(e){return Tn()?e instanceof Node||e instanceof Mt(e).Node:!1}function Nt(e){return Tn()?e instanceof Element||e instanceof Mt(e).Element:!1}function Wt(e){return Tn()?e instanceof HTMLElement||e instanceof Mt(e).HTMLElement:!1}function la(e){return!Tn()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof Mt(e).ShadowRoot}function ws(e){const{overflow:t,overflowX:i,overflowY:s,display:n}=Tt(e);return/auto|scroll|overlay|hidden|clip/.test(t+s+i)&&n!=="inline"&&n!=="contents"}function Bp(e){return/^(table|td|th)$/.test(we(e))}function Fp(e){try{if(e.matches(":popover-open"))return!0}catch{}try{return e.matches(":modal")}catch{return!1}}const Hp=/transform|translate|scale|rotate|perspective|filter/,jp=/paint|layout|strict|content/,ze=e=>!!e&&e!=="none";let er;function eo(e){const t=Nt(e)?Tt(e):e;return ze(t.transform)||ze(t.translate)||ze(t.scale)||ze(t.rotate)||ze(t.perspective)||!io()&&(ze(t.backdropFilter)||ze(t.filter))||Hp.test(t.willChange||"")||jp.test(t.contain||"")}function Vp(e){let t=mi(e);for(;Wt(t)&&!Ln(t);){if(eo(t))return t;if(Fp(t))return null;t=mi(t)}return null}function io(){return er==null&&(er=typeof CSS<"u"&&CSS.supports&&CSS.supports("-webkit-backdrop-filter","none")),er}function Ln(e){return/^(html|body|#document)$/.test(we(e))}function Tt(e){return Mt(e).getComputedStyle(e)}function zn(e){return Nt(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function mi(e){if(we(e)==="html")return e;const t=e.assignedSlot||e.parentNode||la(e)&&e.host||$e(e);return la(t)?t.host:t}function kc(e){const t=mi(e);return Ln(t)?e.ownerDocument?e.ownerDocument.body:e.body:Wt(t)&&ws(t)?t:kc(t)}function Cc(e,t,i){var s;t===void 0&&(t=[]);const n=kc(e),r=n===((s=e.ownerDocument)==null?void 0:s.body),o=Mt(n);return r?(Np(o),t.concat(o,o.visualViewport||[],ws(n)?n:[],[])):t.concat(n,Cc(n,[]))}function Np(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function Sc(e){const t=Tt(e);let i=parseFloat(t.width)||0,s=parseFloat(t.height)||0;const n=Wt(e),r=n?e.offsetWidth:i,o=n?e.offsetHeight:s,a=vn(i)!==r||vn(s)!==o;return a&&(i=r,s=o),{width:i,height:s,$:a}}function Mc(e){return Nt(e)?e:e.contextElement}function di(e){const t=Mc(e);if(!Wt(t))return _e(1);const i=t.getBoundingClientRect(),{width:s,height:n,$:r}=Sc(t);let o=(r?vn(i.width):i.width)/s,a=(r?vn(i.height):i.height)/n;return(!o||!Number.isFinite(o))&&(o=1),(!a||!Number.isFinite(a))&&(a=1),{x:o,y:a}}const Wp=_e(0);function Ac(e){const t=Mt(e);return!io()||!t.visualViewport?Wp:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function Up(e,t,i){return t===void 0&&(t=!1),!i||t&&i!==Mt(e)?!1:t}function ls(e,t,i,s){t===void 0&&(t=!1),i===void 0&&(i=!1);const n=e.getBoundingClientRect(),r=Mc(e);let o=_e(1);t&&(s?Nt(s)&&(o=di(s)):o=di(e));const a=Up(r,i,s)?Ac(r):_e(0);let l=(n.left+a.x)/o.x,c=(n.top+a.y)/o.y,h=n.width/o.x,d=n.height/o.y;if(r){const u=Mt(r),p=s&&Nt(s)?Mt(s):s;let b=u,f=b.frameElement;for(;f&&s&&p!==b;){const m=di(f),g=f.getBoundingClientRect(),y=Tt(f),x=g.left+(f.clientLeft+parseFloat(y.paddingLeft))*m.x,_=g.top+(f.clientTop+parseFloat(y.paddingTop))*m.y;l*=m.x,c*=m.y,h*=m.x,d*=m.y,l+=x,c+=_,b=Mt(f),f=b.frameElement}}return bi({width:h,height:d,x:l,y:c})}const qp=[":popover-open",":modal"];function $c(e){return qp.some(t=>{try{return e.matches(t)}catch{return!1}})}function Yp(e){let{elements:t,rect:i,offsetParent:s,strategy:n}=e;const r=n==="fixed",o=$e(s),a=t?$c(t.floating):!1;if(s===o||a&&r)return i;let l={scrollLeft:0,scrollTop:0},c=_e(1);const h=_e(0),d=Wt(s);if((d||!d&&!r)&&((we(s)!=="body"||ws(o))&&(l=zn(s)),Wt(s))){const u=ls(s);c=di(s),h.x=u.x+s.clientLeft,h.y=u.y+s.clientTop}return{width:i.width*c.x,height:i.height*c.y,x:i.x*c.x-l.scrollLeft*c.x+h.x,y:i.y*c.y-l.scrollTop*c.y+h.y}}function Kp(e){return Array.from(e.getClientRects())}function Ec(e){return ls($e(e)).left+zn(e).scrollLeft}function Gp(e){const t=$e(e),i=zn(e),s=e.ownerDocument.body,n=oe(t.scrollWidth,t.clientWidth,s.scrollWidth,s.clientWidth),r=oe(t.scrollHeight,t.clientHeight,s.scrollHeight,s.clientHeight);let o=-i.scrollLeft+Ec(e);const a=-i.scrollTop;return Tt(s).direction==="rtl"&&(o+=oe(t.clientWidth,s.clientWidth)-n),{width:n,height:r,x:o,y:a}}function Xp(e,t){const i=Mt(e),s=$e(e),n=i.visualViewport;let r=s.clientWidth,o=s.clientHeight,a=0,l=0;if(n){r=n.width,o=n.height;const c=io();(!c||c&&t==="fixed")&&(a=n.offsetLeft,l=n.offsetTop)}return{width:r,height:o,x:a,y:l}}function Qp(e,t){const i=ls(e,!0,t==="fixed"),s=i.top+e.clientTop,n=i.left+e.clientLeft,r=Wt(e)?di(e):_e(1),o=e.clientWidth*r.x,a=e.clientHeight*r.y,l=n*r.x,c=s*r.y;return{width:o,height:a,x:l,y:c}}function ca(e,t,i){let s;if(t==="viewport")s=Xp(e,i);else if(t==="document")s=Gp($e(e));else if(Nt(t))s=Qp(t,i);else{const n=Ac(e);s={...t,x:t.x-n.x,y:t.y-n.y}}return bi(s)}function Pc(e,t){const i=mi(e);return i===t||!Nt(i)||Ln(i)?!1:Tt(i).position==="fixed"||Pc(i,t)}function Zp(e,t){const i=t.get(e);if(i)return i;let s=Cc(e,[]).filter(a=>Nt(a)&&we(a)!=="body"),n=null;const r=Tt(e).position==="fixed";let o=r?mi(e):e;for(;Nt(o)&&!Ln(o);){const a=Tt(o),l=eo(o);!l&&a.position==="fixed"&&(n=null),(r?!l&&!n:!l&&a.position==="static"&&n&&["absolute","fixed"].includes(n.position)||ws(o)&&!l&&Pc(e,o))?s=s.filter(c=>c!==o):n=a,o=mi(o)}return t.set(e,s),s}function Jp(e){let{element:t,boundary:i,rootBoundary:s,strategy:n}=e;const r=[...i==="clippingAncestors"?Zp(t,this._c):[].concat(i),s],o=r[0],a=r.reduce((l,c)=>{const h=ca(t,c,n);return l.top=oe(h.top,l.top),l.right=fi(h.right,l.right),l.bottom=fi(h.bottom,l.bottom),l.left=oe(h.left,l.left),l},ca(t,o,n));return{width:a.right-a.left,height:a.bottom-a.top,x:a.left,y:a.top}}function tf(e){const{width:t,height:i}=Sc(e);return{width:t,height:i}}function ef(e,t,i){const s=Wt(t),n=$e(t),r=i==="fixed",o=ls(e,!0,r,t);let a={scrollLeft:0,scrollTop:0};const l=_e(0);if(s||!s&&!r)if((we(t)!=="body"||ws(n))&&(a=zn(t)),s){const d=ls(t,!0,r,t);l.x=d.x+t.clientLeft,l.y=d.y+t.clientTop}else n&&(l.x=Ec(n));const c=o.left+a.scrollLeft-l.x,h=o.top+a.scrollTop-l.y;return{x:c,y:h,width:o.width,height:o.height}}function ha(e,t){return!Wt(e)||Tt(e).position==="fixed"?null:t?t(e):e.offsetParent}function Dc(e,t){const i=Mt(e);if(!Wt(e)||$c(e))return i;let s=ha(e,t);for(;s&&Bp(s)&&Tt(s).position==="static";)s=ha(s,t);return s&&(we(s)==="html"||we(s)==="body"&&Tt(s).position==="static"&&!eo(s))?i:s||Vp(e)||i}const sf=async function(e){const t=this.getOffsetParent||Dc,i=this.getDimensions;return{reference:ef(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,...await i(e.floating)}}};function nf(e){return Tt(e).direction==="rtl"}const rf={convertOffsetParentRelativeRectToViewportRelativeRect:Yp,getDocumentElement:$e,getClippingRect:Jp,getOffsetParent:Dc,getElementRects:sf,getClientRects:Kp,getDimensions:tf,getScale:di,isElement:Nt,isRTL:nf},Oc=Ip,Tc=Op,Lc=Lp,zc=(e,t,i)=>{const s=new Map,n={platform:rf,...i},r={...n.platform,_c:s};return Dp(e,t,{...n,platform:r})};var of=Object.defineProperty,af=Object.getOwnPropertyDescriptor,Rc=(e,t,i,s)=>{for(var n=af(t,i),r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&of(t,i,n),n},ut;const so=(ut=class extends I{constructor(){super(...arguments),this._previousContainer=null,this._visible=!1}get placement(){return this._placement}set placement(e){this._placement=e,this.updatePosition()}static removeMenus(){for(const e of[...ut.dialog.children])e instanceof ut&&(e.remove(),e.visible=!1);setTimeout(()=>{ut.dialog.close(),ut.dialog.remove()},310)}get visible(){return this._visible}set visible(e){this._visible=e,e?(ut.dialog.parentElement||document.body.append(ut.dialog),this._previousContainer=this.parentElement,ut.dialog.style.top=`${window.scrollY||document.documentElement.scrollTop}px`,this.style.setProperty("display","flex"),ut.dialog.append(this),ut.dialog.showModal(),this.updatePosition(),this.dispatchEvent(new Event("visible"))):setTimeout(()=>{var t;(t=this._previousContainer)==null||t.append(this),this._previousContainer=null,this.style.setProperty("display","none"),this.dispatchEvent(new Event("hidden"))},310)}async updatePosition(){if(!(this.visible&&this._previousContainer))return;const e=this.placement??"right",t=await zc(this._previousContainer,this,{placement:e,middleware:[_c(10),Lc(),Tc(),Oc({padding:5})]}),{x:i,y:s}=t;this.style.left=`${i}px`,this.style.top=`${s}px`}connectedCallback(){super.connectedCallback(),this.visible?(this.style.setProperty("width","auto"),this.style.setProperty("height","auto")):(this.style.setProperty("display","none"),this.style.setProperty("width","0"),this.style.setProperty("height","0"))}render(){return w` <slot></slot> `}},ut.styles=[Se.scrollbar,H`
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
        background-color: var(--bim-ui_bg-contrast-50);
        transition:
          clip-path 0.2s cubic-bezier(0.72, 0.1, 0.43, 0.93),
          transform 0.3s cubic-bezier(0.72, 0.1, 0.45, 2.35);
      }

      ::slotted(bim-button) {
        background-color: transparent;
      }

      :host(:not([visible])) {
        transform: scale(0.8);
        clip-path: circle(0 at top left);
      }
    `],ut.dialog=Mr.create(()=>w` <dialog
      @click=${e=>{e.target===ut.dialog&&ut.removeMenus()}}
      @cancel=${()=>ut.removeMenus()}
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
    ></dialog>`),ut);Rc([v({type:String,reflect:!0})],so.prototype,"placement");Rc([v({type:Boolean,reflect:!0})],so.prototype,"visible");let lf=so;class ee extends HTMLElement{get label(){return this.getAttribute("label")??void 0}set label(t){t!=null?this.setAttribute("label",t):this.removeAttribute("label")}get icon(){return this.getAttribute("icon")??void 0}set icon(t){t!=null?this.setAttribute("icon",t):this.removeAttribute("icon")}get img(){return this.getAttribute("img")??void 0}set img(t){t!=null?this.setAttribute("img",t):this.removeAttribute("img")}get checked(){return this.hasAttribute("checked")}set checked(t){t?this.setAttribute("checked",""):this.removeAttribute("checked")}get noMark(){return this.hasAttribute("no-mark")}set noMark(t){t?this.setAttribute("no-mark",""):this.removeAttribute("no-mark")}get vertical(){return this.hasAttribute("vertical")}set vertical(t){t?this.setAttribute("vertical",""):this.removeAttribute("vertical")}get checkbox(){return this.hasAttribute("checkbox")}set checkbox(t){t?this.setAttribute("checkbox",""):this.removeAttribute("checkbox")}get value(){if(this._value!==void 0)return this._value;const t=this.getAttribute("value");if(t!==null)return gn(t);if(this.label)return gn(this.label)}set value(t){this._value=t}}var cf=Object.defineProperty,hf=Object.getOwnPropertyDescriptor,zt=(e,t,i,s)=>{for(var n=s>1?void 0:s?hf(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&cf(t,i,n),n};const Ic=class extends I{constructor(){super(...arguments),this.multiple=!1,this.required=!1,this.vertical=!1,this.searchBox=!1,this._visible=!1,this._options=[],this._value=new Set,this._searchValue="",this._dirty=!1,this.onValueChange=new Event("change"),this._dialog=ae(),this._trigger=ae(),this._mutationObserver=new MutationObserver(()=>this._syncOptions()),this._onTriggerKeydown=t=>{t.key==="Enter"||t.key===" "?(t.preventDefault(),this.visible?this.visible=!1:this._openWithFocus()):t.key==="ArrowDown"?(t.preventDefault(),this.visible?this._focusOption(0):this._openWithFocus()):t.key==="ArrowUp"&&(t.preventDefault(),this.visible?this._focusOption(-1):this._openWithFocus())},this._onOptionKeydown=(t,i,s)=>{t.key==="Enter"||t.key===" "?(t.preventDefault(),this._onOptionClick(i)):t.key==="ArrowDown"?(t.preventDefault(),this._focusOption(s+1)):t.key==="ArrowUp"?(t.preventDefault(),this._focusOption(s-1)):t.key==="Home"?(t.preventDefault(),this._focusOption(0)):t.key==="End"?(t.preventDefault(),this._focusOption(-1)):t.key==="Escape"&&(t.preventDefault(),this.visible=!1)},this._onDialogClick=t=>{t.target===this._dialog.value&&(this.visible=!1)},this._onCancel=t=>{t.preventDefault(),this.visible=!1},this._onOptionClick=t=>{const i=this._value.has(t);!this.multiple&&!this.required&&!i?this._value=new Set([t]):!this.multiple&&!this.required&&i?this._value=new Set([]):!this.multiple&&this.required&&!i?this._value=new Set([t]):!this.multiple&&this.required&&i?this._value=new Set([]):this.multiple&&!this.required&&!i?this._value=new Set([...this._value,t]):this.multiple&&!this.required&&i?this._value=new Set([...this._value].filter(s=>s!==t)):this.multiple&&this.required&&!i?this._value=new Set([...this._value,t]):this.multiple&&this.required&&i&&(this._value=new Set([...this._value].filter(s=>s!==t))),this._dirty=!0,this._updateOptionsState(),this.dispatchEvent(new Event("change"))},this._onSearch=t=>{this._searchValue=(t.target.value??"").toLowerCase()}}set visible(t){var i,s;const n=this._visible;if(t!==n){if(this._visible=t,t){const r=this._dialog.value;if(!r){this._visible=!1;return}r.showModal(),this._updatePosition()}else(i=this._dialog.value)==null||i.close(),this._resetState(),(s=this._trigger.value)==null||s.focus(),this.dispatchEvent(new Event("close",{bubbles:!0,composed:!0}));this.requestUpdate("visible",n)}}get visible(){return this._visible}get validation(){return this._validation}set validation(t){this._validation=t,this.requestUpdate()}get isValid(){var t;return this._dirty?this.required&&this.value.length===0?!1:((t=this._currentValidation)==null?void 0:t.valid)??!0:!0}get _validationMessage(){var t;return this.required&&this.value.length===0?"This field is required.":(t=this._currentValidation)==null?void 0:t.message}get _hasVisibleOptions(){return this._searchValue?this._options.some(t=>(t.label??String(t.value)??"").toLowerCase().includes(this._searchValue)):this._options.length>0}set value(t){const i=new Set;for(const s of t){const n=this._findOption(s);if(n&&(i.add(n),!this.multiple&&t.length===1))break}(i.size!==this._value.size||[...i].some(s=>!this._value.has(s)))&&(this._value=i,this._updateOptionsState(),this.dispatchEvent(new Event("change")))}get value(){return[...this._value].filter(t=>t instanceof ee&&t.checked).map(t=>t.value)}connectedCallback(){super.connectedCallback(),this._mutationObserver.observe(this,{childList:!0}),customElements.whenDefined("bim-option").then(()=>this._syncOptions())}disconnectedCallback(){super.disconnectedCallback(),this._mutationObserver.disconnect()}willUpdate(t){this._currentValidation=this._validation?this._validation(this.value):void 0}updated(){this.toggleAttribute("invalid",!this.isValid)}firstUpdated(){var t;this._visible&&((t=this._dialog.value)==null||t.showModal(),this._updatePosition())}_syncOptions(){const t=Array.from(this.children).filter(n=>n.tagName==="BIM-OPTION");this._options=t;const i=new Set(t.filter(n=>n.hasAttribute("checked"))),s=[...this._value].some(n=>!i.has(n));this._value=i,s&&this.dispatchEvent(new Event("change"))}_findOption(t){for(const i of Array.from(this.children))if(i instanceof ee&&(i.label===t||i.value===t))return i}_updateOptionsState(){for(const t of Array.from(this.children))t instanceof ee&&(t.checked=this._value.has(t))}_updatePosition(){const t=this._dialog.value,i=this._trigger.value;if(!t||!i)return;const s=4,n=5,r=window.innerWidth,o=window.innerHeight,a=i.getBoundingClientRect(),l=t.getBoundingClientRect();let c=a.left,h=a.bottom+s;h+l.height>o-n&&(h=a.top-l.height-s),c+l.width>r-n&&(c=a.right-l.width),c=Math.max(n,Math.min(c,r-l.width-n)),h=Math.max(n,Math.min(h,o-l.height-n)),t.style.minWidth=`${a.width}px`,t.style.left=`${c}px`,t.style.top=`${h}px`}_resetState(){this._searchValue="";for(const t of Array.from(this.children))t instanceof ee&&(t.style.display="")}_focusOption(t){var i,s;const n=[...((i=this._dialog.value)==null?void 0:i.querySelectorAll(".option"))??[]];if(!n.length)return;const r=t<0?n.length+t:t;(s=n[Math.max(0,Math.min(r,n.length-1))])==null||s.focus()}_openWithFocus(){this.visible=!0,requestAnimationFrame(()=>{var t;const i=this._dialog.value;if(!i)return;const s=i.querySelector(".option.checked"),n=i.querySelector(".option");(t=s??n)==null||t.focus()})}_renderOption(t,i){const s=this._value.has(t);return this._searchValue&&!(t.label??String(t.value)??"").toLowerCase().includes(this._searchValue)?T:w`
      <div
        class=${Yl({option:!0,checked:s})}
        role="option"
        aria-selected=${s}
        tabindex="-1"
        @click=${()=>this._onOptionClick(t)}
        @keydown=${n=>this._onOptionKeydown(n,t,i)}
      >
        <bim-label
          .icon=${t.icon}
          .img=${t.img}
          .vertical=${t.vertical}
        >${t.label}</bim-label>
        ${s&&!t.noMark?w`<svg xmlns="http://www.w3.org/2000/svg" height="1.125rem" viewBox="0 0 24 24" width="1.125rem">
              <path d="M0 0h24v24H0z" fill="none"/>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>`:T}
      </div>
    `}render(){let t,i,s;if(this._value.size===0)t=this.placeholder??"Select an option...";else if(this._value.size===1){const n=[...this._value][0];t=n?.label??String(n?.value??""),i=n?.img,s=n?.icon}else t=this.multipleLabel?this.multipleLabel(this._value.size):`Multiple (${this._value.size})`;return w`
      <div class="parent" title=${this.label??""}>
        ${this.label||this.icon?w`<bim-label class="field-label" .icon=${this.icon}>${this.label}</bim-label>`:null}
        <div class="wrapper">
          <div
            ${At(this._trigger)}
            class="input"
            tabindex="0"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded=${this.visible}
            aria-controls="bim-dropdown-listbox"
            aria-label=${this.label??"Dropdown"}
            @click=${()=>this.visible=!this.visible}
            @keydown=${this._onTriggerKeydown}
          >
            <bim-label aria-hidden="true" .img=${i} .icon=${s}>${t}</bim-label>
            <svg xmlns="http://www.w3.org/2000/svg" height="1.125rem" viewBox="0 0 24 24" width="1.125rem">
              <path d="M0 0h24v24H0V0z" fill="none"/>
              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
          </div>
        </div>
      </div>
      ${!this.isValid&&this._validationMessage?w`<span class="validation-message">${this._validationMessage}</span>`:T}
      <dialog
        id="bim-dropdown-listbox"
        role="listbox"
        aria-label=${this.label??"Options"}
        aria-multiselectable=${this.multiple}
        ${At(this._dialog)}
        @click=${this._onDialogClick}
        @cancel=${this._onCancel}
      >
        ${this.searchBox?w`<bim-text-input
              @input=${this._onSearch}
              placeholder="Search..."
              debounce="200"
            ></bim-text-input>`:T}
        ${ql(this._options,n=>n,(n,r)=>this._renderOption(n,r))}
        ${this._hasVisibleOptions?T:w`<bim-label class="no-options">No options found...</bim-label>`}
      </dialog>
    `}};Ic.styles=[Se.scrollbar,H`
      :host {
        --bim-input--olw: 2px;
        --bim-input--olc: transparent;
        --bim-input--bdrs: var(--bim-ui_size-2xs);
        --bim-input--bgc: var(--bim-ui_bg-contrast-20);
        display: block;
      }

      :host([visible]) {
        --bim-input--olc: var(--bim-ui_accent-base);
      }

      :host(:focus-within:not([visible])) {
        --bim-input--olc: var(--bim-ui_bg-contrast-40);
      }

      .parent {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        user-select: none;
        flex: 1;
        align-items: normal;
      }

      :host(:not([vertical])) .parent {
        justify-content: space-between;
      }

      :host([vertical]) .parent {
        flex-direction: column;
      }

      bim-label.field-label {
        margin-top: var(--bim-input--label-mt, 0);
      }

      .wrapper {
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        min-height: 25px;
        min-width: 3rem;
        gap: var(--bim-input--g, var(--bim-ui_size-4xs));
        padding: var(--bim-input--p, 0 7px);
        background-color: var(--bim-input--bgc, var(--bim-ui_bg-contrast-50));
        border: var(--bim-input--olw, 2px) solid var(--bim-input--olc, transparent);
        border-radius: var(--bim-input--bdrs, var(--bim-ui_size-2xs));
        transition: border-color 0.15s;
      }

      :host(:not([vertical])) .wrapper {
        flex: 1;
      }

      :host(:not([vertical])[label]) .wrapper {
        max-width: var(--bim-input--maxw, fit-content);
      }

      @media (prefers-reduced-motion: reduce) {
        .wrapper {
          transition: none;
        }
      }

      /* --bim-dropdown--c: color of the trigger label and chevron. Default: --bim-ui_bg-contrast-100 */
      .input {
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
      }

      /* --bim-input--ta: horizontal alignment of the selected value. Default: current (start) */
      .input bim-label {
        --bim-label--p-grow: 1;
        flex: 1;
        min-width: 0;
        text-align: var(--bim-input--ta, inherit);
        pointer-events: none;
        overflow: hidden;
      }

      .input svg {
        flex-shrink: 0;
        fill: var(--bim-dropdown--c, var(--bim-ui_bg-contrast-100));
      }

      dialog {
        position: fixed;
        margin: 0;
        padding: 0.375rem 0;
        border: none;
        outline: none;
        border-radius: 4px;
        background-color: var(--bim-ui_bg-contrast-10);
        box-shadow: 1px 2px 8px 2px rgba(0, 0, 0, 0.15);
        overflow: auto;
        max-height: 20rem;
        min-width: 3rem;
        display: none;
        flex-direction: column;
        transform-origin: top left;
      }

      dialog[open] {
        display: flex;
        animation: bim-dropdown-open 0.15s cubic-bezier(0.72, 0.1, 0.45, 2.35);
      }

      dialog::backdrop {
        background: transparent;
      }

      dialog bim-text-input {
        --bim-input--bgc: var(--bim-ui_bg-contrast-30);
        margin: 0 0.375rem 0.125rem;
      }

      .option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        column-gap: 0.5rem;
        padding: 0 0.5rem;
        min-height: 1.75rem;
        cursor: pointer;
        user-select: none;
        box-sizing: border-box;
      }

      .option:hover {
        background-color: var(--bim-ui_bg-contrast-20);
      }

      .option:focus-visible {
        outline: 2px solid var(--bim-ui_accent-base);
        outline-offset: -2px;
      }

      .option.checked {
        --bim-label--c: color-mix(in lab, var(--bim-ui_main-base), white 30%);
      }

      .option.checked svg {
        flex-shrink: 0;
        fill: color-mix(in lab, var(--bim-ui_main-base), white 30%);
      }

      .no-options {
        --bim-label--c: var(--bim-ui_bg-contrast-60);
        padding: 0.25rem 0.5rem;
      }

      :host([invalid]) {
        --bim-input--olc: var(--bim-ui_danger-base);
      }

      .validation-message {
        display: block;
        font-size: var(--bim-ui_size-base);
        color: var(--bim-ui_danger-base);
        padding: 2px var(--bim-ui_size-xs);
      }

      :host(:not([vertical])) .validation-message {
        text-align: right;
      }

      @keyframes bim-dropdown-open {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }

      @media (prefers-reduced-motion: reduce) {
        dialog[open] { animation: none; }
      }
    `];let Et=Ic;zt([v({type:String,reflect:!0})],Et.prototype,"name",2);zt([v({type:String,reflect:!0})],Et.prototype,"icon",2);zt([v({type:String,reflect:!0})],Et.prototype,"label",2);zt([v({type:Boolean,reflect:!0})],Et.prototype,"multiple",2);zt([v({type:Boolean,reflect:!0})],Et.prototype,"required",2);zt([v({type:Boolean,reflect:!0})],Et.prototype,"vertical",2);zt([v({type:String,reflect:!0})],Et.prototype,"placeholder",2);zt([v({type:Boolean,reflect:!0,attribute:"search-box"})],Et.prototype,"searchBox",2);zt([v({type:Boolean,reflect:!0})],Et.prototype,"visible",1);zt([Z()],Et.prototype,"_options",2);zt([Z()],Et.prototype,"_value",2);zt([Z()],Et.prototype,"_searchValue",2);var df=Object.defineProperty,Bc=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&df(t,i,n),n},Oi;const no=(Oi=class extends I{render(){return w`
      <div class="parent">
        <div class="content">
          <div class="illustration">
            ${Oi._illustration}
            ${this.label?w`<bim-label class="title">${this.label}</bim-label>`:null}
          </div>
          ${this.description?w`<bim-label class="description">${this.description}</bim-label>`:null}
        </div>
        <slot></slot>
      </div>
    `}},Oi._illustration=w`<svg
    width="157"
    height="156"
    viewBox="0 0 157 156"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clip-path="url(#bim-empty-state-clip)">
      <mask
        id="bim-empty-state-mask"
        style="mask-type:alpha"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="157"
        height="156"
      >
        <ellipse cx="78.5" cy="78" rx="78.5" ry="78" fill="url(#bim-empty-state-radial)" />
      </mask>
      <g mask="url(#bim-empty-state-mask)">
        <path d="M2.33321 94.9001H34.2999C38.7803 94.9001 41.0205 94.9001 42.7318 94.0281C44.2371 93.2611 45.4609 92.0373 46.2279 90.532C47.0999 88.8207 47.0999 86.5805 47.0999 82.1V50.4353C47.0999 48.1467 47.0999 47.0024 46.8058 45.948C46.5453 45.0139 46.1172 44.135 45.5423 43.3541C44.8933 42.4726 43.9922 41.7672 42.1902 40.3565L28.9883 30.0212C27.6995 29.0123 27.0551 28.5078 26.3403 28.1493C25.7061 27.8311 25.0324 27.5988 24.3369 27.4583C23.5531 27.3 22.7347 27.3 21.098 27.3H2.33321C-2.14722 27.3 -4.38743 27.3 -6.09872 28.172C-7.60402 28.939 -8.82786 30.1628 -9.59485 31.6681C-10.4668 33.3794 -10.4668 35.6196 -10.4668 40.1V82.1001C-10.4668 86.5805 -10.4668 88.8207 -9.59485 90.532C-8.82786 92.0373 -7.60402 93.2611 -6.09872 94.0281C-4.38743 94.9001 -2.14722 94.9001 2.33321 94.9001Z" fill="#F8F8F8" fill-opacity="0.08" style="mix-blend-mode:luminosity" />
        <path d="M2.33321 94.9001H34.2999C38.7803 94.9001 41.0205 94.9001 42.7318 94.0281C44.2371 93.2611 45.4609 92.0373 46.2279 90.532C47.0999 88.8207 47.0999 86.5805 47.0999 82.1V50.4353C47.0999 48.1467 47.0999 47.0024 46.8058 45.948C46.5453 45.0139 46.1172 44.135 45.5423 43.3541C44.8933 42.4726 43.9922 41.7672 42.1902 40.3565L28.9883 30.0212C27.6995 29.0123 27.0551 28.5078 26.3403 28.1493C25.7061 27.8311 25.0324 27.5988 24.3369 27.4583C23.5531 27.3 22.7347 27.3 21.098 27.3H2.33321C-2.14722 27.3 -4.38743 27.3 -6.09872 28.172C-7.60402 28.939 -8.82786 30.1628 -9.59485 31.6681C-10.4668 33.3794 -10.4668 35.6196 -10.4668 40.1V82.1001C-10.4668 86.5805 -10.4668 88.8207 -9.59485 90.532C-8.82786 92.0373 -7.60402 93.2611 -6.09872 94.0281C-4.38743 94.9001 -2.14722 94.9001 2.33321 94.9001Z" stroke="white" stroke-opacity="0.15" stroke-width="1.5" />
        <path d="M154.667 61.0999H122.7C118.22 61.0999 115.98 61.0999 114.268 61.9719C112.763 62.7389 111.539 63.9627 110.772 65.468C109.9 67.1793 109.9 69.4195 109.9 73.9V105.565C109.9 107.853 109.9 108.998 110.194 110.052C110.455 110.986 110.883 111.865 111.458 112.646C112.107 113.527 113.008 114.233 114.81 115.644L128.012 125.979C129.3 126.988 129.945 127.492 130.66 127.851C131.294 128.169 131.968 128.401 132.663 128.542C133.447 128.7 134.265 128.7 135.902 128.7H154.667C159.147 128.7 161.387 128.7 163.099 127.828C164.604 127.061 165.828 125.837 166.595 124.332C167.467 122.621 167.467 120.38 167.467 115.9V73.8999C167.467 69.4195 167.467 67.1793 166.595 65.468C165.828 63.9627 164.604 62.7389 163.099 61.9719C161.387 61.0999 159.147 61.0999 154.667 61.0999Z" fill="#F8F8F8" fill-opacity="0.08" style="mix-blend-mode:luminosity" />
        <path d="M84.758 182H116.725C121.205 182 123.445 182 125.157 181.128C126.662 180.361 127.886 179.137 128.653 177.632C129.525 175.921 129.525 173.68 129.525 169.2V137.535C129.525 135.247 129.525 134.102 129.231 133.048C128.97 132.114 128.542 131.235 127.967 130.454C127.318 129.573 126.417 128.867 124.615 127.456L111.413 117.121C110.124 116.112 109.48 115.608 108.765 115.249C108.131 114.931 107.457 114.699 106.762 114.558C105.978 114.4 105.16 114.4 103.523 114.4H84.758C80.2776 114.4 78.0374 114.4 76.3261 115.272C74.8208 116.039 73.5969 117.263 72.83 118.768C71.958 120.479 71.958 122.72 71.958 127.2V169.2C71.958 173.68 71.958 175.921 72.83 177.632C73.5969 179.137 74.8208 180.361 76.3261 181.128C78.0374 182 80.2776 182 84.758 182Z" fill="#F8F8F8" fill-opacity="0.08" style="mix-blend-mode:luminosity" />
      </g>
      <path d="M63.2502 111.583H93.7502C98.2306 111.583 100.471 111.583 102.182 110.711C103.687 109.944 104.911 108.721 105.678 107.215C106.55 105.504 106.55 103.264 106.55 98.7833V67.3691C106.55 65.1068 106.55 63.9756 106.262 62.9315C106.007 62.0065 105.588 61.1349 105.024 60.3584C104.387 59.482 103.503 58.7763 101.735 57.3651L89.0157 47.2126C87.7173 46.1763 87.0681 45.6581 86.3455 45.2897C85.7044 44.9628 85.0221 44.7239 84.3172 44.5794C83.5226 44.4166 82.6919 44.4166 81.0307 44.4166H63.2502C58.7698 44.4166 56.5296 44.4166 54.8183 45.2886C53.313 46.0556 52.0891 47.2794 51.3221 48.7847C50.4502 50.496 50.4502 52.7362 50.4502 57.2166V98.7833C50.4502 103.264 50.4502 105.504 51.3221 107.215C52.0891 108.721 53.313 109.944 54.8183 110.711C56.5296 111.583 58.7698 111.583 63.2502 111.583Z" fill="#F8F8F8" fill-opacity="0.05" style="mix-blend-mode:luminosity" />
      <g filter="url(#bim-empty-state-shadow)">
        <path d="M62.6 109H94.4C97.7603 109 99.4405 109 100.724 108.346C101.853 107.771 102.771 106.853 103.346 105.724C104 104.44 104 102.76 104 99.4V67.0766C104 65.3954 104 64.5548 103.788 63.7778C103.599 63.0894 103.29 62.4402 102.873 61.8605C102.404 61.2062 101.751 60.677 100.445 59.6184L87.5178 49.1419C86.5385 48.3482 86.0489 47.9514 85.5023 47.6691C85.0175 47.4187 84.5007 47.2355 83.9664 47.1248C83.364 47 82.7338 47 81.4733 47H62.6C59.2397 47 57.5595 47 56.2761 47.654C55.1471 48.2292 54.2292 49.1471 53.654 50.2761C53 51.5595 53 53.2397 53 56.6V99.4C53 102.76 53 104.44 53.654 105.724C54.2292 106.853 55.1471 107.771 56.2761 108.346C57.5595 109 59.2397 109 62.6 109Z" fill="#F8F8F8" fill-opacity="0.08" style="mix-blend-mode:luminosity" />
        <path d="M62.6 109H94.4C97.7603 109 99.4405 109 100.724 108.346C101.853 107.771 102.771 106.853 103.346 105.724C104 104.44 104 102.76 104 99.4V67.0766C104 65.3954 104 64.5548 103.788 63.7778C103.599 63.0894 103.29 62.4402 102.873 61.8605C102.404 61.2062 101.751 60.677 100.445 59.6184L87.5178 49.1419C86.5385 48.3482 86.0489 47.9514 85.5023 47.6691C85.0175 47.4187 84.5007 47.2355 83.9664 47.1248C83.364 47 82.7338 47 81.4733 47H62.6C59.2397 47 57.5595 47 56.2761 47.654C55.1471 48.2292 54.2292 49.1471 53.654 50.2761C53 51.5595 53 53.2397 53 56.6V99.4C53 102.76 53 104.44 53.654 105.724C54.2292 106.853 55.1471 107.771 56.2761 108.346C57.5595 109 59.2397 109 62.6 109Z" stroke="white" stroke-opacity="0.18" stroke-width="1.5" />
      </g>
      <path d="M75.9031 85.0833C74.6481 85.0833 73.5803 84.6373 72.6998 83.7452C71.8192 82.8531 71.3789 81.7713 71.3789 80.5V75.5C71.3789 74.2286 71.8192 73.1468 72.6998 72.2548C73.5803 71.3627 74.6481 70.9166 75.9031 70.9166H80.8386C82.0936 70.9166 83.1613 71.3627 84.0419 72.2548C84.9225 73.1468 85.3628 74.2286 85.3628 75.5V80.5C85.3628 81.7713 84.9225 82.8531 84.0419 83.7452C83.1613 84.6373 82.0936 85.0833 80.8386 85.0833H75.9031ZM77.5483 79.2885L76.1721 77.8941C76.0582 77.7788 75.915 77.7198 75.7425 77.717C75.5702 77.7144 75.4244 77.7734 75.3051 77.8941C75.1859 78.015 75.1264 78.1613 75.1264 78.3333C75.1264 78.5052 75.1859 78.6516 75.3051 78.7725L77.0278 80.5177C77.1765 80.6682 77.35 80.7435 77.5483 80.7435C77.7465 80.7435 77.92 80.6682 78.0688 80.5177L81.7656 76.7725C81.8794 76.657 81.9377 76.512 81.9404 76.3373C81.943 76.1627 81.8848 76.015 81.7656 75.8941C81.6464 75.7734 81.5019 75.7131 81.3321 75.7131C81.1624 75.7131 81.0179 75.7734 80.8986 75.8941L77.5483 79.2885Z" fill="#F8F8F8" fill-opacity="0.85" />
    </g>
    <defs>
      <filter id="bim-empty-state-shadow" x="20.25" y="14.25" width="116.5" height="143.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <feOffset dy="24" />
        <feGaussianBlur stdDeviation="12" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0" />
        <feBlend mode="multiply" in2="BackgroundImageFix" result="bim-empty-state-shadow-blend" />
        <feBlend mode="normal" in="SourceGraphic" in2="bim-empty-state-shadow-blend" result="shape" />
      </filter>
      <radialGradient id="bim-empty-state-radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(78.5 78) rotate(90) scale(78 78.5)">
        <stop stop-color="#D9D9D9" />
        <stop offset="1" stop-color="#737373" stop-opacity="0" />
      </radialGradient>
      <clipPath id="bim-empty-state-clip">
        <rect width="157" height="156" fill="white" />
      </clipPath>
    </defs>
  </svg>`,Oi.styles=H`
    :host {
      display: block;
    }

    .parent {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      height: 100%;
      min-height: 12rem;
      padding: 1rem;
      text-align: center;
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .illustration {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    svg {
      width: 7.5rem;
      height: auto;
      opacity: 0.9;
      flex-shrink: 0;
    }

    bim-label.title {
      font-size: var(--bim-ui_size-lg);
      font-weight: 500;
    }

    bim-label.description {
      --bim-label--c: var(--bim-ui_bg-contrast-60);
      max-width: 220px;
      white-space: normal;
    }
  `,Oi);Bc([v({type:String,reflect:!0})],no.prototype,"label");Bc([v({type:String,reflect:!0})],no.prototype,"description");let uf=no;function da(e){const t=[];let i="",s=0;for(const n of e)n==="["||n==="("?(s++,i+=n):n==="]"||n===")"?(s--,i+=n):n===" "&&s===0?i!==""&&(t.push(i==="."?null:i),i=""):i+=n;return i!==""&&t.push(i==="."?null:i),t}function Fc(e){const t=[],i=/(["'])(.*?)\1/g;let s;for(;(s=i.exec(e))!==null;){const n=s[2].trim();if(n===""){t.push([]);continue}t.push(da(n))}if(t.length===0){const n=e.split(/\r?\n/).map(r=>r.trim()).filter(Boolean);for(const r of n){const o=r.replace(/^["']|["']$/g,"").trim();o&&t.push(da(o))}}return t}function pf(e){const t=Fc(e),i=new Set;for(const s of t)for(const n of s)n!==null&&n!==""&&i.add(n);return[...i]}function ff(e){var t;const i=[],s=e.length,n=((t=e[0])==null?void 0:t.length)||0;for(let r=0;r<s;r++)for(let o=0;o<n-1;o++){const a=e[r][o],l=e[r][o+1];if(a!==l){const c=i.find(h=>h.type==="vertical"&&h.from[0]===o+1&&h.to[0]===o+1&&h.from[1]<=r&&h.to[1]>=r);c?(c.to[1]=r+1,c.left&&a&&c.left.push(a),c.right&&l&&c.right.push(l)):i.push({type:"vertical",from:[o+1,r],to:[o+1,r+1],left:a?[a]:[],right:l?[l]:[]})}}for(let r=0;r<s-1;r++)for(let o=0;o<n;o++){const a=e[r][o],l=e[r+1][o];if(a!==l){const c=i.find(h=>h.type==="horizontal"&&h.from[1]===r+1&&h.to[1]===r+1&&h.from[0]<=o&&h.to[0]>=o);c?(c.to[0]=o+1,c.above&&a&&c.above.push(a),c.below&&l&&c.below.push(l)):i.push({type:"horizontal",from:[o,r+1],to:[o+1,r+1],above:a?[a]:[],below:l?[l]:[]})}}return bf(i)}function bf(e){for(const t of e)t.left&&(t.left=[...new Set(t.left)]),t.right&&(t.right=[...new Set(t.right)]),t.above&&(t.above=[...new Set(t.above)]),t.below&&(t.below=[...new Set(t.below)]);return e}function mf(e,t,i,s){const n=(parseFloat(e.colSizesComputed[i-1])||0)+t;let r;return r=(parseFloat(e.colSizesComputed[i])||0)-t,{left:n,right:r}}function gf(e,t,i,s){const n=(parseFloat(e.rowSizesComputed[i-1])||0)+t;let r;return r=(parseFloat(e.rowSizesComputed[i])||0)-t,{top:n,bottom:r}}function vf(e,t,i,s){return!(e<s&&i<0||t<s&&i>0)}function yf(e,t,i,s){return!(e<s&&i<0||t<s&&i>0)}function xf(e,t){const[i,s]=e.from,[n,r]=e.to,o=t.gap.split(" "),a=o[1]||o[0]||"0px",l=o[0]||"0px",c=e.type==="horizontal"?"0":`calc(-50% - ${a} / 2)`,h=e.type==="horizontal"?`calc(-50% - ${l} / 2)`:"0",d={"grid-column":`${i+1} / ${n+1}`,"grid-row":`${s+1} / ${r+1}`,transform:`translate(${c}, ${h})`},u=parseFloat(t.fontSize);return e.type==="vertical"?d.width=`${Math.max(parseFloat(a),u)}px`:d.height=`${Math.max(parseFloat(l),u)}px`,d}var _f=Object.defineProperty,Rn=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&_f(t,i,n),n};const Hc=class extends I{constructor(){super(...arguments),this.floating=!1,this.resizeableAreas=!1,this.areasResizeExceptions=[],this._layouts={},this._elements={},this.areaGroups={},this._templateIds=new Map,this._updateFunctions={},this._slotNames={notAllowed:"not-allowed",notFound:"not-found",emptyLayout:"empty-layout"},this._colSizesRaw=[],this._rowSizesRaw=[],this._colSizesComputed=[],this._rowSizesComputed=[],this._start=null,this.layoutsResize={},this._onMouseMove=t=>{if(!this._start||!this.layout)return;const i=t.clientX-this._start.x,s=t.clientY-this._start.y,n=this._start.divider,r=getComputedStyle(this),o=parseFloat(r.fontSize)*3;if(n.type==="vertical"){const a=n.from[0],l=this._colSizesRaw.length-1,c=a===l,h=mf(this._start,i,a);if(!vf(h.left,h.right,i,o))return;const d=Math.max(o,h.left),u=Math.max(o,h.right);this._colSizesRaw[a-1]=`${d}px`,this._colSizesRaw[a]=c?"1fr":`${u}px`,this.style.gridTemplateColumns=this._colSizesRaw.join(" ")}if(n.type==="horizontal"){const a=n.from[1],l=this._rowSizesRaw.length-1,c=a===l,h=gf(this._start,s,a);if(!yf(h.top,h.bottom,s,o))return;const d=Math.max(o,h.top),u=Math.max(o,h.bottom);this._rowSizesRaw[a-1]=`${d}px`,this._rowSizesRaw[a]=c?"1fr":`${u}px`,this.style.gridTemplateRows=this._rowSizesRaw.join(" ")}this.layoutsResize[this.layout]={cols:this._colSizesRaw,rows:this._rowSizesRaw}},this._onMouseUp=()=>{window.removeEventListener("mousemove",this._onMouseMove),window.removeEventListener("mouseup",this._onMouseUp),this._start=null},this.updateComponent={},this.emitLayoutChange=()=>{this.dispatchEvent(new Event("layoutchange"))}}set layouts(t){this._layouts=t,this._templateIds.clear()}get layouts(){return this._layouts}set elements(t){this._elements=t,this.setUpdateFunctions()}get elements(){return this._elements}getLayoutAreas(t){return pf(t.template)}setUpdateFunctions(){const t={};for(const[i,s]of Object.entries(this.elements))"template"in s&&(t[i]=n=>{var r,o;(o=(r=this._updateFunctions)[i])==null||o.call(r,n)});this.updateComponent=t}disconnectedCallback(){super.disconnectedCallback(),this._templateIds.clear(),this._updateFunctions={},this.updateComponent={}}getTemplateId(t){let i=this._templateIds.get(t);return i||(i=xs.newRandomId(),this._templateIds.set(t,i)),i}isAreaResizeable(t){return this.areasResizeExceptions.includes(t)?!1:this.resizeableAreas}canResizeVerticalDivider(t){const i=t.left||[],s=t.right||[];for(const n of i)if(!this.isAreaResizeable(n))return!1;for(const n of s)if(!this.isAreaResizeable(n))return!1;return!0}canResizeHorizontalDivider(t){const i=t.above||[],s=t.below||[];for(const n of i)if(!this.isAreaResizeable(n))return!1;for(const n of s)if(!this.isAreaResizeable(n))return!1;return!0}computeDividers(){var t;if(!this.layout)return;const i=(t=this.layouts[this.layout])==null?void 0:t.template;if(!i)return;const s=Fc(i),n=ff(s),r=getComputedStyle(this),o=[];for(const a of n){let l=!1;if(a.type==="vertical"?l=this.canResizeVerticalDivider(a):l=this.canResizeHorizontalDivider(a),!l)continue;const c=p=>{this._colSizesRaw=this.style.gridTemplateColumns.split(" "),this._rowSizesRaw=this.style.gridTemplateRows.split(" "),this._rowSizesComputed=r.gridTemplateRows.split(" "),this._colSizesComputed=r.gridTemplateColumns.split(" "),this._start={x:p.clientX,y:p.clientY,divider:a,colSizesRaw:[...this._colSizesRaw],rowSizesRaw:[...this._rowSizesRaw],colSizesComputed:[...this._colSizesComputed],rowSizesComputed:[...this._rowSizesComputed]},window.addEventListener("mousemove",this._onMouseMove),window.addEventListener("mouseup",this._onMouseUp)},h=p=>{p.preventDefault()},d=xf(a,r),u=w`
        <div @mousedown=${c} @contextmenu=${h} class="grid-divider divider-${a.type}" style=${Zt(d)}>
          <div></div>
        </div>
      `;o.push(u)}return o}parseTabToken(t){const i=t.match(/^(\w+)\[([^\]]+)\]$/);return i?{name:i[1],keys:i[2].split(",").map(s=>s.trim())}:t}parseTabElementTokens(t){const i=[];let s="",n=0;for(const r of t)if(r==="[")n++,s+=r;else if(r==="]")n--,s+=r;else if(r===","&&n===0){const o=s.trim();o&&i.push(this.parseTabToken(o)),s=""}else s+=r;return s.trim()&&i.push(this.parseTabToken(s.trim())),i}extractElementKeys(t){const i=t.match(/^\w+:\w+\(([^)]+)\)$/);return i?this.parseTabElementTokens(i[1]).flatMap(s=>typeof s=="string"?[s]:s.keys):[t]}cleanUpdateFunctions(){if(!this.layout){this._updateFunctions={};return}const t=this.layouts[this.layout],i=this.getLayoutAreas(t).flatMap(s=>this.extractElementKeys(s));for(const s in this.elements)i.includes(s)||delete this._updateFunctions[s]}clean(){this.style.gridTemplate="";for(const t of[...this.children])Object.values(this._slotNames).some(i=>t.getAttribute("slot")===i)||t.remove();this.cleanUpdateFunctions()}emitElementCreation(t){this.dispatchEvent(new CustomEvent("elementcreated",{detail:t}))}getSanitizedLayoutTemplate(t){return t.replace(/\w+:(\w+)\([^)]*\)/g,"$1")}createElementFromDefinition(t,i){if(i instanceof HTMLElement)return i;if("template"in i){const{template:o,initialState:a}=i,l=this.getTemplateId(o),c=this.querySelector(`[data-grid-template-id="${l}"]`);if(c){let u=this._updateFunctions[t];if(!u){for(const[,p]of Object.entries(this._updateFunctions))if(this.querySelector(`[data-grid-template-id="${this.getTemplateId(o)}"]`)===c){u=p;break}}return u&&(this._updateFunctions[t]=u),c}const[h,d]=Mr.create(o,a);return h.setAttribute("data-grid-template-id",l),this._updateFunctions[t]=d,h}const s=this.getTemplateId(i),n=this.querySelector(`[data-grid-template-id="${s}"]`);if(n)return n;const r=Mr.create(i);return r.setAttribute("data-grid-template-id",this.getTemplateId(i)),r}render(){if(this.layout){const t=this.layouts[this.layout];if(t){if(!(t.guard??(()=>!0))())return this.clean(),w`<slot name=${this._slotNames.notAllowed}></slot>`;const i=this.getLayoutAreas(t),s=c=>c.split(",").map(h=>h.trim()).filter(Boolean),n=c=>{var h;return((h=t.elements)==null?void 0:h[c])||this.elements[c]},r=c=>{const h=n(c);return h&&typeof h=="object"&&"label"in h&&h.label?h.label:c},o=c=>{const h=n(c);if(h&&typeof h=="object"&&"icon"in h&&typeof h.icon=="string")return h.icon},a=i.map(c=>{const h=c.match(/^tabs:([^(]+)\(([^)]+)\)$/),d=c.match(/^panel:([^(]+)\(([^)]+)\)$/);if(!h&&!d){const y=n(c);if(!y)return null;const x=this.createElementFromDefinition(c,y);return x?(this.emitElementCreation({name:c,element:x}),x.style.gridArea=c,x):null}const u=h?h[1]:d[1],p=s(h?h[2]:d[2]);if(h){const y=`tabs-${u}`;let x=this.querySelector(`[data-grid-tabs-id="${y}"]`);x||(x=document.createElement("bim-tabs"),x.setAttribute("data-grid-tabs-id",y));const _=this.areaGroups[u];_!=null&&_.switchersFull?x.setAttribute("switchers-full",""):x.removeAttribute("switchers-full"),_!=null&&_.switchersCompact?x.setAttribute("switchers-compact",""):x.removeAttribute("switchers-compact"),x.style.gridArea=u;const C=[],k=this.parseTabElementTokens(h[2]);for(const S of k)if(typeof S=="string"){const M=n(S);if(!M)continue;const E=this.createElementFromDefinition(S,M);if(!E)continue;this.emitElementCreation({name:S,element:E});const $=`tab-${u}-${S}`;let P=x.querySelector(`[data-grid-tab-id="${$}"]`);P||(P=document.createElement("bim-tab"),P.setAttribute("data-grid-tab-id",$),P.name=S),P.label=r(S),P.icon=o(S),P.innerHTML="",P.appendChild(E),C.push(P)}else{const{name:M,keys:E}=S,$=this.areaGroups[M],P=`tab-${u}-${M}`;let O=x.querySelector(`[data-grid-tab-id="${P}"]`);O||(O=document.createElement("bim-tab"),O.setAttribute("data-grid-tab-id",P),O.name=M),O.label=$?.label??M,O.icon=$?.icon;const Q=`panel-${u}-${M}`;let V=O.querySelector(`[data-grid-panel-id="${Q}"]`);V||(V=document.createElement("bim-panel"),V.setAttribute("data-grid-panel-id",Q)),V.innerHTML="";for(const D of E){const F=n(D);if(!F)continue;const W=this.createElementFromDefinition(D,F);W&&(this.emitElementCreation({name:D,element:W}),V.appendChild(W))}O.innerHTML="",O.appendChild(V),C.push(O)}return x.innerHTML="",x.append(...C),x}const b=`panel-${u}`;let f=this.querySelector(`[data-grid-panel-id="${b}"]`);f||(f=document.createElement("bim-panel"),f.setAttribute("data-grid-panel-id",b));const m=this.areaGroups[u];m!=null&&m.label?f.setAttribute("label",m.label):f.removeAttribute("label"),m!=null&&m.icon?f.setAttribute("icon",m.icon):f.removeAttribute("icon"),f.style.gridArea=u;const g=[];for(const y of p){const x=n(y);if(!x)continue;const _=this.createElementFromDefinition(y,x);_&&(this.emitElementCreation({name:y,element:_}),g.push(_))}return f.innerHTML="",f.append(...g),f}).filter(c=>c!==null);this.clean(),this.style.gridTemplate=this.getSanitizedLayoutTemplate(t.template);const l=this.layoutsResize[this.layout];l&&(this.style.gridTemplateColumns=l.cols.join(" "),this.style.gridTemplateRows=l.rows.join(" ")),this.append(...a),this.emitLayoutChange()}else return this.clean(),w`<slot name=${this._slotNames.notFound}></slot>`}else return this.clean(),this.emitLayoutChange(),w`<slot name=${this._slotNames.emptyLayout}></slot>`;return w`
      ${this.resizeableAreas?this.computeDividers():null}
      <slot></slot>
    `}};Hc.styles=H`
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
      padding: 1rem;
      gap: 1rem;
      position: absolute;
      pointer-events: none;
      top: 0px;
      left: 0px;
    }

    :host(:not([floating])) {
      --bim-panel--bdrs: 0;
      /* background-color: var(--bim-ui_bg-base); */
      gap: 1px;
    }

    .grid-divider {
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      user-select: none;
    }

    .grid-divider > div {
      transition: background-color 150ms ease-in-out;
    }
    
    .grid-divider:hover > div {
      background-color: var(--bim-ui_accent-base);
    }
    
    .divider-horizontal {
      /* background-color: #ff00003d; */
      transform: translateY(-50%);
      cursor: n-resize;
    }
    
    .divider-horizontal > div {
      height: 3px;
      width: 100%;
      /* transform: translateY(-50%); */
    }
    
    .divider-vertical {
      /* background-color: #ff00003d; */
      transform: translateX(-50%);
      cursor: e-resize;
    }
    
    .divider-vertical > div {
      width: 3px;
      height: 100%;
      /* transform: translateX(-50%); */
    }
  `;let ks=Hc;Rn([v({type:Boolean,reflect:!0})],ks.prototype,"floating");Rn([v({type:String,reflect:!0})],ks.prototype,"layout");Rn([v({type:Boolean,attribute:"areas-resizeable",reflect:!0})],ks.prototype,"resizeableAreas");Rn([v({type:Array,attribute:!1})],ks.prototype,"areasResizeExceptions");var wf=Object.defineProperty,jc=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&wf(t,i,n),n};const Vc=class extends I{constructor(){super(...arguments),this.ariaLabel=null}updated(){this.ariaLabel?(this.setAttribute("role","img"),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.setAttribute("aria-hidden","true"))}render(){return this.icon?w`
      <iconify-icon
        .icon=${this.icon}
        height="none"
        noobserver
        aria-hidden=${this.ariaLabel?T:"true"}
      ></iconify-icon>
    `:T}};Vc.styles=H`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--bim-icon--sz, var(--bim-icon--fz, var(--bim-ui_size-xl)));
      height: var(--bim-icon--sz, var(--bim-icon--fz, var(--bim-ui_size-xl)));
    }

    iconify-icon {
      width: 100%;
      height: 100%;
      color: var(--bim-icon--c, currentColor);
      transition: color 0.15s, width 0.15s, height 0.15s;
      display: flex;
    }

    @media (prefers-reduced-motion: reduce) {
      iconify-icon {
        transition: none;
      }
    }
  `;let ro=Vc;jc([v({type:String,reflect:!0})],ro.prototype,"icon");jc([v({type:String,attribute:"aria-label",reflect:!0})],ro.prototype,"ariaLabel");var kf=Object.defineProperty,In=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&kf(t,i,n),n};const Nc=class extends I{constructor(){super(...arguments),this.vertical=!1,this.onValueChange=new Event("change")}connectedCallback(){super.connectedCallback(),console.warn("[bim-input] This component is deprecated and will be removed in a future version of the library.")}get value(){const t={};for(const i of this.children){const s=i;"value"in s?t[s.name||s.label]=s.value:"checked"in s&&(t[s.name||s.label]=s.checked)}return t}set value(t){const i=[...this.children];for(const s in t){const n=i.find(a=>{const l=a;return l.name===s||l.label===s});if(!n)continue;const r=n,o=t[s];typeof o=="boolean"?r.checked=o:r.value=o}}render(){return w`
      <div class="parent">
        ${this.label||this.icon?w`<bim-label .icon=${this.icon}>${this.label}</bim-label>`:null}
        <div class="input">
          <slot></slot>
        </div>
      </div>
    `}};Nc.styles=H`
    :host {
      flex: 1;
      display: block;
    }

    .parent {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      user-select: none;
      flex: 1;
      align-items: var(--bim-input--ai, normal);
    }

    bim-label {
      margin-top: var(--bim-input--label-mt, 0);
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
      min-height: 25px;
      min-width: 3rem;
      gap: var(--bim-input--g, var(--bim-ui_size-4xs));
      padding: var(--bim-input--p, 0 12px);
      background-color: var(--bim-input--bgc, var(--bim-ui_bg-contrast-50));
      border: var(--bim-input--olw, 2px) solid
        var(--bim-input--olc, transparent);
      border-radius: var(--bim-input--bdrs, var(--bim-ui_size-2xs));
      transition: all 0.15s;
    }

    :host(:not([vertical])) .input {
      flex: 1;
      justify-content: flex-end;
    }

    :host(:not([vertical])[label]) .input {
      max-width: var(--bim-input--maxw, fit-content);
    }
  `;let Cs=Nc;In([v({type:String,reflect:!0})],Cs.prototype,"name");In([v({type:String,reflect:!0})],Cs.prototype,"label");In([v({type:String,reflect:!0})],Cs.prototype,"icon");In([v({type:Boolean,reflect:!0})],Cs.prototype,"vertical");var Cf=Object.defineProperty,wi=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&Cf(t,i,n),n},ir;let Qe=(ir=class extends I{constructor(){super(...arguments),this.labelHidden=!1,this.iconHidden=!1,this.vertical=!1}get value(){var e;const t=(e=this.label??this.textContent)==null?void 0:e.trim();if(t)return gn(t)}updated(){var e;const t=((e=this.label??this.textContent)==null?void 0:e.trim())??"";this.labelHidden&&t?this.setAttribute("aria-label",t):this.removeAttribute("aria-label")}render(){const e=this.label??this.textContent??"";return w`
      <div class="parent" title=${e}>
        ${St(this.img,()=>w`<img src=${this.img} alt=${e} />`)}
        ${St(!this.iconHidden&&this.icon,()=>w`<bim-icon .icon=${this.icon}></bim-icon>`)}
        ${this.label!==void 0?this.label?w`<p>${this.label}</p>`:T:w`<p><slot></slot></p>`}
      </div>
    `}},ir.styles=H`
    :host {
      --bim-icon--c: var(--bim-label--ic);
      box-sizing: border-box;
      color: var(--bim-label--c, var(--bim-ui_bg-contrast-80));
      font-size: var(--bim-label--fz, var(--bim-ui_size-base));
      display: block;
      white-space: nowrap;
      transition: color var(--bim-ui_duration-fast, 0.15s),
                  opacity var(--bim-ui_duration-fast, 0.15s);
      user-select: var(--bim-label--us, none);
      overflow: hidden;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }

    /* :host([icon]) {
      line-height: 1;
    } */

    .parent {
      display: flex;
      align-items: center;
      gap: var(--bim-label--gap, 0.375rem);
      height: 100%;
    }

    :host([vertical]) .parent {
      flex-direction: column;
    }

    .parent p {
      flex-grow: var(--bim-label--p-grow, 0);
      margin: 0;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    :host([label-hidden]) .parent p,
    :host(:empty) .parent p {
      display: none;
    }

    bim-icon {
      flex-shrink: 0;
      /* align-self: baseline; */
    }

    img {
      height: 100%;
      aspect-ratio: 1;
      border-radius: var(--bim-label_img--bdrs, 100%);
      margin-right: 0.125rem;
      flex-shrink: 0;
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
  `,ir);wi([v({type:String})],Qe.prototype,"img");wi([v({type:Boolean,attribute:"label-hidden",reflect:!0})],Qe.prototype,"labelHidden");wi([v({type:String,reflect:!0})],Qe.prototype,"icon");wi([v({type:Boolean,attribute:"icon-hidden"})],Qe.prototype,"iconHidden");wi([v({type:Boolean,reflect:!0})],Qe.prototype,"vertical");wi([v({type:String})],Qe.prototype,"label");var Sf=Object.defineProperty,Mf=Object.getOwnPropertyDescriptor,Ss=(e,t,i,s)=>{for(var n=s>1?void 0:s?Mf(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&Sf(t,i,n),n};const Wc=class extends I{constructor(){super(...arguments),this._hidden=!1,this.headerHidden=!1,this.valueTransform={},this._animation=null}set hidden(t){this._hidden=t,this.isConnected&&(this.animatePanel(),this.dispatchEvent(new Event("hiddenchange")))}get hidden(){return this._hidden}get value(){return mn(this,this.valueTransform)}get activationButton(){console.warn("[bim-panel] activationButton is deprecated. Wire up your own bim-button instead: btn.onclick = () => (panel.hidden = !panel.hidden).")}animatePanel(){var t;const i=[{maxHeight:"100vh",maxWidth:"100vw",opacity:1},{maxHeight:"100vh",maxWidth:"100vw",opacity:0},{maxHeight:0,maxWidth:0,opacity:0}];(t=this._animation)==null||t.cancel(),this._animation=this.animate(i,{duration:300,easing:"cubic-bezier(0.65, 0.05, 0.36, 1)",direction:this.hidden?"normal":"reverse",fill:"forwards"})}disconnectedCallback(){super.disconnectedCallback()}collapseSections(){const t=this.querySelectorAll("bim-panel-section");for(const i of t)i.collapsed=!0}expandSections(){const t=this.querySelectorAll("bim-panel-section");for(const i of t)i.collapsed=!1}render(){return w`
      <div class="parent" role="region" aria-label=${this.label||this.name||T}>
        ${this.label||this.name||this.icon?w`
            <div class="header">
              <div class="title">
                <slot name="header-start"></slot>
                <bim-label .icon=${this.icon}>${this.label||this.name}</bim-label>
              </div>
              <div class="header-end">
                <slot name="header-end"></slot>
              </div>
            </div>`:null}
        <div class="sections">
          <slot></slot>
        </div>
      </div>
    `}};Wc.styles=[Se.scrollbar,H`
      :host {
        flex: 1;
        /* display: flex; */
        display: block;
        height: 100%;
        background-color: var(--bim-panel--bg, var(--bim-ui_bg-contrast-10));
        overflow: auto;
        border-radius: 0.75rem;
        border: var(--bim-panel--border, 1px solid var(--bim-ui_bg-contrast-20));
        --bim-panel-section--header-display: flex;
        --bim-panel-section--border: none;
        --bim-panel-section--bdrs: 0;
        --bim-panel-section--bg: transparent;
      }

      :host([hidden]) {
        max-height: 0;
        max-width: 0;
        opacity: 0;
      }

      .parent {
        /* display: flex; */
        display: grid;
        grid-template: "header" auto "content" minmax(0, 1fr) / minmax(0, 1fr);
        height: 100%;
        overflow: auto;
        /* flex: 1; */
        /* flex-direction: column; */
        /* pointer-events: auto; */
      }

      .header {
        grid-area: header;
        display: var(--bim-panel--header-display, flex);
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
        box-sizing: border-box;
        height: 35px;
        min-width: 180px;
        padding: 2px 6px;
        gap: 0.375rem;
        flex-shrink: 0;
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
      }

      .title {
        display: flex;
        align-items: center;
        column-gap: 0.5rem;
        min-width: 0;
      }

      .title bim-label {
        --bim-label--c: transparent;
        --bim-icon--c: var(--bim-ui_bg-contrast-60);
        --bim-label--fz: var(--bim-panel--fz, var(--bim-ui_size-lg));
        background: linear-gradient(90deg, var(--bim-ui_bg-contrast-100) 0%, var(--bim-ui_bg-contrast-60) 130%);
        -webkit-background-clip: text;
        background-clip: text;
        pointer-events: none;
        min-width: 0;
      }

      .header-end {
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      :host([header-hidden]) .header {
        display: none;
      }

      .sections {
        grid-area: content;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: auto;
        flex: 1;
      }

    `];let Ze=Wc;Ss([v({type:String,reflect:!0})],Ze.prototype,"icon",2);Ss([v({type:String,reflect:!0})],Ze.prototype,"name",2);Ss([v({type:String,reflect:!0})],Ze.prototype,"label",2);Ss([v({type:Boolean,reflect:!0})],Ze.prototype,"hidden",1);Ss([v({type:Boolean,attribute:"header-hidden",reflect:!0})],Ze.prototype,"headerHidden",2);var Af=Object.defineProperty,ki=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&Af(t,i,n),n};const Uc=class extends I{constructor(){super(...arguments),this.scrollable=!1,this.valueTransform={}}connectedCallback(){super.connectedCallback(),this.fixed===void 0&&queueMicrotask(()=>{this.fixed===void 0&&(this.fixed=!cp(this,"bim-panel"))})}get value(){const t=this.parentElement;let i;return t instanceof Ze&&(i=t.valueTransform),Object.keys(this.valueTransform).length!==0&&(i=this.valueTransform),mn(this,i)}onHeaderClick(){this.fixed||(this.collapsed=!this.collapsed)}onHeaderKeydown(t){(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.onHeaderClick())}render(){const t=this.label||this.icon||this.name||this.fixed,i=w`<svg
      xmlns="http://www.w3.org/2000/svg"
      height="1.125rem"
      viewBox="0 0 24 24"
      width="1.125rem"
      class="expand-icon"
      aria-hidden="true"
    >
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
    </svg>`,s=w`
      <div
        class="header"
        role="button"
        tabindex=${this.fixed?-1:0}
        aria-expanded=${!this.collapsed}
        title=${this.label||T}
        @click=${this.onHeaderClick}
        @keydown=${this.onHeaderKeydown}
      >
        <div class="title">
          <slot name="header-start"></slot>
          ${this.label||this.icon||this.name?w`<bim-label aria-hidden="true" .icon=${this.icon}>${this.label}</bim-label>`:null}
          <slot name="header-tag"></slot>
        </div>
        <div class="header-end">
          <slot name="header-end"></slot>
          ${this.fixed?null:i}
        </div>
      </div>
    `;return w`
      <div class="parent">
        ${t?s:null}
        <div class="components">
          <slot></slot>
        </div>
      </div>
    `}};Uc.styles=[Se.scrollbar,H`
      :host {
        /* flex: 1; */
        display: block;
        pointer-events: auto;
        background-color: var(--bim-panel-section--bg, var(--bim-ui_bg-contrast-10));
        border: var(--bim-panel-section--border, 1px solid var(--bim-ui_bg-contrast-20));
        border-radius: var(--bim-panel-section--bdrs, 0.75rem);
      }

      :host(:last-child:not([collapsed])) {
        flex: 1;
      }

      :host([scrollable]) {
        height: 100%;
      }

      :host .parent {
        display: grid;
        grid-template: "header" auto "content" minmax(0, 1fr) / minmax(0, 1fr);
        height: 100%;
        overflow: auto;
        /* display: flex; */
        /* flex-direction: column; */
        /* height: 100%; */
      }

      :host(:not([fixed])) .header:hover {
        cursor: pointer;
      }

      :host(:not([fixed])) .header:focus-visible {
        outline: 2px solid var(--bim-ui_accent-base);
        outline-offset: -2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .expand-icon {
          transition: none;
        }
      }

      :host(:not([fixed])) .header:hover .title > bim-label {
        --bim-label--c: transparent;
        background: linear-gradient(90deg, var(--bim-ui_accent-base) 0%, color-mix(in srgb, var(--bim-ui_accent-base) 60%, var(--bim-ui_bg-contrast-60)) 130%);
        -webkit-background-clip: text;
        background-clip: text;
      }

      :host(:not([fixed])) .header:hover .expand-icon {
        fill: var(--bim-ui_accent-base);
      }

      .title > bim-label {
        --bim-label--fz: var(--bim-panel-section--fz, var(--bim-ui_size-lg));
        --bim-label--c: transparent;
        --bim-icon--c: var(--bim-ui_bg-contrast-60);
        background: linear-gradient(90deg, var(--bim-ui_bg-contrast-100) 0%, var(--bim-ui_bg-contrast-60) 130%);
        -webkit-background-clip: text;
        background-clip: text;
        min-width: 0;
      }

      .header {
        grid-area: header;
        display: var(--bim-panel-section--header-display, flex);
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        box-sizing: border-box;
        height: 35px;
        min-width: 180px;
        padding: 2px 6px;
        gap: 0.375rem;
      }

      .expand-icon {
        fill: var(--bim-ui_bg-contrast-80);
        transition: transform 0.2s, fill 0.15s;
      }

      :host([collapsed]) .expand-icon {
        transform: rotateZ(-180deg);
      }

      .title {
        display: flex;
        align-items: center;
        column-gap: 0.5rem;
        min-width: 0;
      }

      .title p {
        font-size: var(--bim-ui_size-sm);
      }

      .header {
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
      }

      /* Temporarily disabled for visual testing.
      :host(:last-child[collapsed]) .header {
        border-bottom: none;
      }
      */

      .components {
        grid-area: content;
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 0.5rem;
        gap: 0.5rem;
        box-sizing: border-box;
        overflow: auto;
      }

      :host(:not([fixed])[collapsed]) .components {
        display: none;
      }
      /* Inside a panel, the panel is the one scroll container: a section
         grows with its content instead of scrolling on its own, so menus
         never show two scrollbars. Sections that must scroll by themselves
         opt in with the scrollable attribute. */
      :host(:not([scrollable])) .parent {
        height: auto;
        overflow: visible;
      }

      :host(:not([scrollable])) .components {
        overflow: visible;
      }

      /* Tables scroll on their own by default; inside a non-scrollable
         section they grow too, so the panel stays the only scrollbar. */
      :host(:not([scrollable])) ::slotted(bim-table) {
        overflow: visible;
        height: auto;
      }

      .header-start,
      .header-end {
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      bim-label {
        pointer-events: none;
      }

    `];let Je=Uc;ki([v({type:String,reflect:!0})],Je.prototype,"icon");ki([v({type:String,reflect:!0})],Je.prototype,"label");ki([v({type:String,reflect:!0})],Je.prototype,"name");ki([v({type:Boolean,reflect:!0})],Je.prototype,"fixed");ki([v({type:Boolean,reflect:!0})],Je.prototype,"scrollable");ki([v({type:Boolean,reflect:!0})],Je.prototype,"collapsed");var $f=Object.defineProperty,ti=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&$f(t,i,n),n};const qc=class extends I{constructor(){super(...arguments),this.vertical=!1,this.onValueChange=new Event("change"),this._canEmitEvents=!1,this._pendingValue=void 0,this._mutationObserver=new MutationObserver(()=>this._syncOptions()),this._options=[],this._value=null,this._onOptionClick=t=>{for(const i of Array.from(this.children))i instanceof ee&&(i.checked=i===t);this._value=t,this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))},this._onKeyDown=t=>{const i=this._options;if(!i.length)return;const s=this._value?i.indexOf(this._value):0;let n=s;if(t.key==="ArrowRight"||t.key==="ArrowDown")t.preventDefault(),n=(s+1)%i.length;else if(t.key==="ArrowLeft"||t.key==="ArrowUp")t.preventDefault(),n=(s-1+i.length)%i.length;else if(t.key==="Home")t.preventDefault(),n=0;else if(t.key==="End")t.preventDefault(),n=i.length-1;else return;this._onOptionClick(i[n]),this.updateComplete.then(()=>{var r;(r=this.renderRoot.querySelectorAll(".option")[n])==null||r.focus()})}}set value(t){const i=this._findOption(t);if(!i){this._pendingValue=t;return}this._pendingValue=void 0;for(const s of Array.from(this.children))s instanceof ee&&(s.checked=s===i);this._value=i,this._canEmitEvents&&this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))}get value(){var t;return(t=this._value)==null?void 0:t.value}connectedCallback(){super.connectedCallback(),this._mutationObserver.observe(this,{childList:!0}),customElements.whenDefined("bim-option").then(()=>this._syncOptions())}disconnectedCallback(){super.disconnectedCallback(),this._mutationObserver.disconnect()}firstUpdated(){const t=Array.from(this.children).find(i=>i instanceof ee&&i.checked);t&&(this._value=t),this._canEmitEvents=!0}_syncOptions(){this._options=Array.from(this.children).filter(t=>t.tagName==="BIM-OPTION"),this._pendingValue!==void 0&&(this.value=this._pendingValue)}_findOption(t){for(const i of Array.from(this.children))if(i instanceof ee&&(i.label===t||i.value===t))return i}render(){return w`
      <div class="parent">
        ${this.label||this.icon?w`<bim-label class="field-label" .icon=${this.icon}>${this.label}</bim-label>`:null}
        <div class="wrapper">
          <div
            class="options"
            role="tablist"
            aria-label=${Jt(this.label)}
            @keydown=${this._onKeyDown}
          >
            ${this._options.map(t=>{const i=t===this._value;return w`
                <div
                  class="option ${i?"checked":""}"
                  role="tab"
                  aria-selected=${i}
                  tabindex=${i?0:-1}
                  @click=${()=>this._onOptionClick(t)}
                >
                  <bim-label
                    .icon=${t.icon}
                    .img=${t.img}
                    .vertical=${t.vertical}
                  >${t.label}</bim-label>
                </div>
              `})}
          </div>
        </div>
      </div>
    `}};qc.styles=H`
    :host {
      display: block;
    }

    .parent {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      user-select: none;
      flex: 1;
      align-items: normal;
    }

    :host(:not([vertical])) .parent {
      justify-content: space-between;
    }

    :host([vertical]) .parent {
      flex-direction: column;
    }

    bim-label.field-label {
      margin-top: var(--bim-input--label-mt, 0);
    }

    .wrapper {
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      min-height: 25px;
      min-width: 3rem;
      background-color: var(--bim-input--bgc, var(--bim-ui_bg-contrast-20));
      border-radius: var(--bim-input--bdrs, var(--bim-ui_size-2xs));
    }

    :host(:not([vertical])) .wrapper {
      flex: 1;
    }

    :host(:not([vertical])[label]) .wrapper {
      max-width: var(--bim-input--maxw, fit-content);
    }

    .options {
      display: flex;
      flex: 1;
      align-self: stretch;
    }

    .option {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 0 0.5rem;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s;
      --bim-label--c: var(--bim-ui_bg-contrast-80);
    }

    .option:not(.checked):hover {
      background-color: var(--bim-selector--option-hover-bgc, var(--bim-ui_bg-contrast-30));
    }

    .option.checked {
      background-color: var(--bim-selector--option-checked-bgc, var(--bim-ui_bg-contrast-40));
      --bim-label--c: var(--bim-ui_bg-contrast-100);
    }

    .option:focus-visible {
      outline: 2px solid var(--bim-ui_main-base);
      outline-offset: -2px;
    }

    /* ── Underline variant ── */

    :host([variant="underline"]) {
      --bim-input--bgc: transparent;
      --bim-input--bdrs: 0;
    }

    :host([variant="underline"]) .option {
      border-radius: 0;
      --bim-label--c: var(--bim-ui_bg-contrast-80);
      border-bottom: 2px solid transparent;
      transition: border-color 0.15s;
    }

    :host([variant="underline"]) .option.checked {
      background-color: transparent;
      --bim-label--c: var(--bim-ui_accent-base);
      border-bottom-color: var(--bim-ui_accent-base);
    }

    :host([variant="underline"]) .option:not(.checked):hover {
      background-color: transparent;
      --bim-label--c: var(--bim-ui_bg-contrast-80);
    }

    :host([variant="underline"]) .option:focus-visible {
      outline-offset: -3px;
    }

    @media (prefers-reduced-motion: reduce) {
      .option,
      :host([variant="underline"]) .option {
        transition: none;
      }
    }
  `;let Ee=qc;ti([v({type:String,reflect:!0})],Ee.prototype,"name");ti([v({type:String,reflect:!0})],Ee.prototype,"icon");ti([v({type:String,reflect:!0})],Ee.prototype,"label");ti([v({type:Boolean,reflect:!0})],Ee.prototype,"vertical");ti([v({type:String,reflect:!0})],Ee.prototype,"variant");ti([Z()],Ee.prototype,"_options");ti([Z()],Ee.prototype,"_value");const Ef="\0bim-group",Yc=(e,t,i)=>e===void 0?void 0:`${e}|${JSON.stringify([String(t),typeof i,String(i)])}`,Kc=(e,t)=>(e!==void 0&&(t.id=e),t);function Pf(e,t,i){if(t.length===0||e.length===0)return e;const s=ci.flattenData(e),n=s.some(r=>r.id!=null);return oo(s,t,i,n?Ef:void 0)}function oo(e,t,i,s){if(t.length===0)return e;const[n,...r]=t,o=i?.[n];return o?Df(e,n,o,r,i,s):Tf(e,n,r,i,s)}function Df(e,t,i,s,n,r){const o=new Map;for(const a of e){const l=a.data[t];if(l===void 0)continue;const c=i(l,a.data),h=c.join("|");o.has(h)||o.set(h,{path:c,rows:[]}),o.get(h).rows.push(a)}return Of(o,t,s,n,r)}function Of(e,t,i,s,n){const r=new Lf;for(const{path:o,rows:a}of e.values())r.addPath(o,a,t);return r.buildResult(i,s,n)}function Tf(e,t,i,s,n){const r=new Map;for(const a of e){const l=a.data[t];r.has(l)||r.set(l,[]),r.get(l).push(a)}const o=[];for(const[a,l]of r){const c=Yc(n,t,a),h=i.length>0?oo(l,i,s,c):l;o.push(Kc(c,{data:{[t]:a},children:h,_isComputedGroup:!0}))}return o}class Lf{constructor(){this.tree=new Map}addPath(t,i,s){let n=this.tree;for(let r=0;r<t.length;r++){const o=t[r];n.has(o)||n.set(o,{value:o,column:s,children:new Map,rows:[]});const a=n.get(o);r===t.length-1&&a.rows.push(...i),n=a.children}}buildResult(t,i,s){return this.convertMapToResult(this.tree,t,i,s)}convertMapToResult(t,i,s,n){const r=[];for(const o of t.values()){const a=[],l=Yc(n,o.column,o.value);if(o.children.size>0&&a.push(...this.convertMapToResult(o.children,i,s,l)),o.rows.length>0){const c=i.length>0?oo(o.rows,i,s,l):o.rows;a.push(...c)}r.push(Kc(l,{data:{[o.column]:o.value},children:a,_isComputedGroup:!0}))}return r}}const zf=()=>w`
    <style>
      div {
        display: flex;
        gap: 0.375rem;
        border-radius: 0.25rem;
        min-height: 1.25rem;
      }

      [data-type="row"] {
        background-color: var(--bim-ui_bg-contrast-20);
        animation: row-loading 1s linear infinite alternate;
        padding: 0.5rem;
      }

      [data-type="cell"] {
        background-color: var(--bim-ui_bg-contrast-40);
        flex: 0.25;
      }

      @keyframes row-loading {
        0% {
          background-color: var(--bim-ui_bg-contrast-20);
        }
        100% {
          background-color: var(--bim-ui_bg-contrast-40);
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
  `,Rf=()=>w`
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
  `;var If=Object.defineProperty,Bf=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&If(t,i,n),n};const Gc=class extends I{constructor(){super(...arguments),this.column="",this.columnIndex=0,this.table=null,this.group=null,this.row=null,this.rowData={}}get data(){return this.column?this.rowData[this.column]:null}get dataTransform(){var t,i,s,n;const r=(i=(t=this.row)==null?void 0:t.dataTransform)==null?void 0:i[this.column],o=(s=this.table)==null?void 0:s.dataTransform[this.column],a=(n=this.table)==null?void 0:n.defaultContentTemplate;return r||o||a}get headersTransform(){var t;return(t=this.table)==null?void 0:t.headersTransform[this.column]}_renderValue(t){return typeof t=="string"||typeof t=="boolean"||typeof t=="number"?w`<bim-label>${t}</bim-label>`:t}get templateValue(){var t;const{data:i,rowData:s,group:n}=this;if((t=this.row)!=null&&t.isHeader){const o=this.headersTransform;return o&&i!==null&&i!==void 0?this._renderValue(o(this.column)):i!=null?w`<bim-label>${i}</bim-label>`:T}const r=this.dataTransform;return r&&i!=null&&n?this._renderValue(r(i,s,n)):i!=null?w`<bim-label>${i}</bim-label>`:T}connectedCallback(){var t,i;super.connectedCallback(),(t=this.group)!=null&&t.data._isComputedGroup&&(i=this.table)!=null&&i.groupedBy.includes(this.column)?(this.style.gridColumn="1",this.style.gridRow="1"):this.style.gridArea=this.column.toString()}render(){return w`${this.templateValue}`}};Gc.styles=H`
    :host {
      --bim-label--c: var(--bim-ui_bg-contrast-100);
      padding: var(--bim-table-cell--padding, 4px);
      display: flex;
      align-items: center;
      overflow: hidden;
    }
    
    :host([data-cell-header]) {
      --bim-label--c: var(--bim-ui_bg-contrast-80);
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
  `;let Xc=Gc;Bf([v({type:String,reflect:!0})],Xc.prototype,"column");const tn=class Hi extends I{constructor(){super(...arguments),this._groupCache=new WeakMap,this._idCache=new Map,this._claimedIds=new Map,this.group=this.closest("bim-table-group"),this._data=[],this.table=this.closest("bim-table"),this._keyOf=t=>{const{id:i}=t;if(i!=null){const s=String(i);if(!this._claimedKeys.has(s))return this._claimedKeys.add(s),this._claimedIds.set(t,s),`id:${s}`}return Hi._dataId(t)},this._claimedKeys=new Set}static _dataId(t){let i=Hi._dataIds.get(t);return i===void 0&&(i=Hi._nextDataId++,Hi._dataIds.set(t,i)),i}get data(){var t;return((t=this.group)==null?void 0:t.data.children)??this._data}set data(t){this._data=t}get groupElements(){return Array.from(this.renderRoot.querySelectorAll("bim-table-group"))}_createGroup(t,i){const s=document.createElement("bim-table-group");return s.table=this.table,s.data=t,s.depth=i,s}render(){var t;this._claimedIds.clear(),this._claimedKeys.clear();const i=(((t=this.group)==null?void 0:t.depth)??-1)+1;return w`
      <slot></slot>
      ${ql(this.data,this._keyOf,s=>{const n=this._claimedIds.get(s);if(n!==void 0){let o=this._idCache.get(n);return o?o.reuse(s,i):(o=this._createGroup(s,i),this._idCache.set(n,o)),o}let r=this._groupCache.get(s);return r||(r=this._createGroup(s,i),this._groupCache.set(s,r)),r})}
    `}updated(){for(const t of this._idCache.keys())this._claimedKeys.has(t)||this._idCache.delete(t)}};tn.styles=H`
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
  `,tn._dataIds=new WeakMap,tn._nextDataId=0;let Ff=tn;var Hf=Object.defineProperty,jf=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&Hf(t,i,n),n};const Qc=class extends I{constructor(){super(...arguments),this.childrenHidden=!0,this.table=null,this.depth=0,this.data={data:{}},this._disconnectPending=!1,this._visualSyncPending=!1,this._visualKey=""}get rowElement(){const t=this.shadowRoot;return t?t.querySelector("bim-table-row"):null}get childrenElement(){const t=this.shadowRoot;return t?t.querySelector("bim-table-children"):null}get _isChildrenEmpty(){return!(this.data.children&&this.data.children.length!==0)}get _initialChildrenHidden(){if(!this.table)return!0;const{expandedLevels:t}=this.table;return typeof t=="number"?this.depth>=t:!this.table.expanded}connectedCallback(){var t,i;if(super.connectedCallback(),this._registeredId=this.data.id,(t=this.table)==null||t._registerGroup(this,this._registeredId),this._disconnectPending){this._disconnectPending=!1;return}const{id:s}=this.data,n=s!=null?(i=this.table)==null?void 0:i._expansionMemory.get(s):void 0;this.childrenHidden=n??this._initialChildrenHidden}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.table)==null||t._unregisterGroup(this,this._registeredId),this._disconnectPending=!0,queueMicrotask(()=>{this._disconnectPending&&(this._disconnectPending=!1,this.data={data:{}})})}reuse(t,i){var s;this.depth=i,this.data!==t&&(this.data=t,this._visualSyncPending=!0,this.requestUpdate(),this.refreshRow(),(s=this.childrenElement)==null||s.requestUpdate())}refreshRow(t=!1){var i,s;if((i=this.rowElement)==null||i.requestUpdate(),!!t)for(const n of((s=this.childrenElement)==null?void 0:s.groupElements)??[])n.refreshRow(!0)}applyExpansion(){const t=this._initialChildrenHidden;t!==this.childrenHidden&&(this.childrenHidden=t,this._visualSyncPending=!0)}get _showChildren(){var t,i;const s=((t=this.data.children)==null?void 0:t.some(n=>n._isComputedGroup))??!1;return!this._isChildrenEmpty&&(!((i=this.table)!=null&&i.groupsOnly)||s)}_syncVisuals(){var t;const i=this.childrenHidden,s=(n,r)=>{n instanceof HTMLElement&&(n.getAnimations().forEach(o=>o.cancel()),n.style.setProperty("transform",r))};s(this.renderRoot.querySelector(".caret"),`translateY(-50%) rotate(${i?0:90}deg)`),s(this.renderRoot.querySelector("bim-table-row .branch-vertical"),`scaleY(${i?0:1})`),s(this.renderRoot.querySelector("bim-table-row .branch-horizontal"),`scaleX(${i?1:0})`),s((t=this.renderRoot.querySelector("bim-table-children"))==null?void 0:t.querySelector(".branch-vertical"),`scaleY(${i?0:1})`)}updated(){const t=`${this._showChildren}|${this.childrenHidden}`;this._visualSyncPending&&t!==this._visualKey&&this._syncVisuals(),this._visualSyncPending=!1,this._visualKey=t}toggleChildren(t){var i;this.childrenHidden=typeof t>"u"?!this.childrenHidden:!t;const{id:s,_isComputedGroup:n}=this.data;s!=null&&!n&&((i=this.table)==null||i._expansionMemory.set(s,this.childrenHidden)),this.animateTableChildren(!0)}animateTableChildren(t=!0){if(!t){requestAnimationFrame(()=>{var o;const a=this.renderRoot.querySelector(".caret"),l=this.renderRoot.querySelector(".branch-vertical"),c=(o=this.renderRoot.querySelector("bim-table-children"))==null?void 0:o.querySelector(".branch-vertical");a.style.setProperty("transform",`translateY(-50%) rotate(${this.childrenHidden?"0":"90"}deg)`),l.style.setProperty("transform",`scaleY(${this.childrenHidden?"0":"1"})`),c?.style.setProperty("transform",`scaleY(${this.childrenHidden?"0":"1"})`)});return}const i=500,s=0,n=200,r=350;requestAnimationFrame(()=>{var o;const a=this.renderRoot.querySelector("bim-table-children"),l=this.renderRoot.querySelector(".caret"),c=this.renderRoot.querySelector(".branch-vertical"),h=(o=this.renderRoot.querySelector("bim-table-children"))==null?void 0:o.querySelector(".branch-vertical"),d=()=>{var m;const g=(m=a?.renderRoot)==null?void 0:m.querySelectorAll("bim-table-group");g?.forEach((y,x)=>{y.style.setProperty("opacity","0"),y.style.setProperty("left","-30px");const _=[{opacity:"0",left:"-30px"},{opacity:"1",left:"0"}];y.animate(_,{duration:i/2,delay:50+x*s,easing:"cubic-bezier(0.65, 0.05, 0.36, 1)",fill:"forwards"})})},u=()=>{const m=[{transform:"translateY(-50%) rotate(90deg)"},{transform:"translateY(-50%) rotate(0deg)"}];l?.animate(m,{duration:r,easing:"cubic-bezier(0.68, -0.55, 0.27, 1.55)",fill:"forwards",direction:this.childrenHidden?"normal":"reverse"})},p=()=>{const m=[{transform:"scaleY(1)"},{transform:"scaleY(0)"}];c?.animate(m,{duration:n,easing:"cubic-bezier(0.4, 0, 0.2, 1)",delay:s,fill:"forwards",direction:this.childrenHidden?"normal":"reverse"})},b=()=>{var m;const g=(m=this.renderRoot.querySelector("bim-table-row"))==null?void 0:m.querySelector(".branch-horizontal");if(g){g.style.setProperty("transform-origin","center right");const y=[{transform:"scaleX(0)"},{transform:"scaleX(1)"}];g.animate(y,{duration:n,easing:"cubic-bezier(0.4, 0, 0.2, 1)",fill:"forwards",direction:this.childrenHidden?"normal":"reverse"})}},f=()=>{const m=[{transform:"scaleY(0)"},{transform:"scaleY(1)"}];h?.animate(m,{duration:n*1.2,easing:"cubic-bezier(0.4, 0, 0.2, 1)",fill:"forwards",delay:(s+n)*.7})};d(),u(),p(),b(),f()})}firstUpdated(){this.renderRoot.querySelectorAll(".caret").forEach(t=>{var i,s,n;if(!this.childrenHidden){t.style.setProperty("transform","translateY(-50%) rotate(90deg)");const r=(i=t.parentElement)==null?void 0:i.querySelector(".branch-horizontal");r&&r.style.setProperty("transform","scaleX(0)");const o=(n=(s=t.parentElement)==null?void 0:s.parentElement)==null?void 0:n.querySelectorAll(".branch-vertical");o?.forEach(a=>{a.style.setProperty("transform","scaleY(1)")})}})}render(){if(!this.table)return w`${T}`;const t=this.table.getGroupIndentation(this.data)??0;let i;if(!this.table.noIndentation){const a={left:`calc(${t-1} * var(--bim-table--indent-step, 1rem) + ${this.table.selectableRows?2.05:.5625}rem)`};i=w`<div style=${Zt(a)} class="branch branch-horizontal"></div>`}const s=w`
      ${this.table.noIndentation?null:w`
            <style>
              .branch-vertical {
                left: calc(${t} * var(--bim-table--indent-step, 1rem) + ${this.table.selectableRows?1.9375:.5625}rem);
              }
            </style>
            <div class="branch branch-vertical"></div>
          `}
    `;let n;if(!this.table.noIndentation){const a=document.createElementNS("http://www.w3.org/2000/svg","svg");if(a.setAttribute("height","9.9"),a.setAttribute("width","7.5"),a.setAttribute("viewBox","0 0 4.6666672 7.7"),this.table.noCarets){const c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("cx","2.3333336"),c.setAttribute("cy","3.85"),c.setAttribute("r","2.5"),a.append(c)}else{const c=document.createElementNS("http://www.w3.org/2000/svg","path");c.setAttribute("d","m 1.7470835,6.9583848 2.5899999,-2.59 c 0.39,-0.39 0.39,-1.02 0,-1.41 L 1.7470835,0.36838483 c -0.63,-0.62000003 -1.71000005,-0.18 -1.71000005,0.70999997 v 5.17 c 0,0.9 1.08000005,1.34 1.71000005,0.71 z"),a.append(c)}const l={left:`calc(${t} * var(--bim-table--indent-step, 1rem) + ${this.table.selectableRows?1.5:.125}rem)`,cursor:`${this.table.noCarets?"unset":"pointer"}`};n=w`<div @click=${c=>{var h;(h=this.table)!=null&&h.noCarets||(c.stopPropagation(),this.toggleChildren())}} style=${Zt(l)} class="caret">${a}</div>`}const r=this._showChildren;let o;return r&&!this.childrenHidden&&(o=w`
        <bim-table-children ${At(a=>{if(!a)return;const l=a;l.table=this.table,l.group=this})}>${s}</bim-table-children>
      `),w`
      <div class="parent">
        <bim-table-row ${At(a=>{var l;if(!a)return;const c=a;c.table=this.table,c.group=this,(l=this.table)==null||l.dispatchEvent(new CustomEvent("rowcreated",{detail:{row:c}}))})}>
          ${St(r,()=>s)}
          ${St(t!==0,()=>i)}
          ${St(!this.table.noIndentation&&r,()=>n)}
        </bim-table-row>
        ${o}
      </div>
    `}};Qc.styles=H`
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
  `;let Zc=Qc;jf([v({type:Boolean,attribute:"children-hidden",reflect:!0})],Zc.prototype,"childrenHidden");var Vf=Object.defineProperty,Bn=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&Vf(t,i,n),n};const Jc=class extends I{constructor(){super(...arguments),this.selected=!1,this.group=null,this._data={},this.isHeader=!1,this.table=null,this.onTableColumnsChange=()=>{this.table&&this.requestUpdate()},this._intersecting=!1,this._timeOutDelay=250,this._observer=new IntersectionObserver(t=>{window.clearTimeout(this._intersectTimeout),this._intersectTimeout=void 0,t[0].isIntersecting?this._intersectTimeout=window.setTimeout(()=>{this._intersecting=!0},this._timeOutDelay):this._intersecting=!1},{rootMargin:"36px"}),this._isRangeClick=!1,this._onCheckboxClick=t=>{var i;t.stopPropagation();const s=((i=this.table)==null?void 0:i.rangeSelectKey)??"ctrlKey";this._isRangeClick=t[s]},this._headerCheckboxUpdatePending=!1,this._onDataSelected=()=>{var t;if(this.isHeader){this._updateHeaderCheckbox();return}this.toggleAttribute("selected",(t=this.table)==null?void 0:t.selection.has(this.data))},this._onDataDeselected=()=>{var t;if(this.isHeader){this._updateHeaderCheckbox();return}(t=this.table)!=null&&t.selection.has(this.data)||this.removeAttribute("selected")},this._onDataSelectionCleared=()=>{if(this.isHeader){this._updateHeaderCheckbox();return}this.removeAttribute("selected")},this._disconnectPending=!1,this.dataTransform=null,this._interval=null,this.clearDataTransform=()=>{this.dataTransform=null,this._interval!==null&&(clearInterval(this._interval),this._interval=null)}}get columns(){var t;return((t=this.table)==null?void 0:t.columns)??[]}get hiddenColumns(){var t;return((t=this.table)==null?void 0:t.hiddenColumns)??[]}get groupData(){var t;return(t=this.group)==null?void 0:t.data}get data(){var t;return((t=this.group)==null?void 0:t.data.data)??this._data}set data(t){this._data=t}get _isSelected(){var t;return(t=this.table)==null?void 0:t.selection.has(this.data)}onSelectionChange(t){if(!this.table)return;const i=t.target;if(this.isHeader||(this.selected=i.value),i.value)if(!this.isHeader&&this._isRangeClick&&this.table._lastSelectedData){const s=ci.flattenData(this.table.value).map(o=>o.data),n=s.indexOf(this.table._lastSelectedData),r=s.indexOf(this.data);if(n!==-1&&r!==-1){const[o,a]=n<r?[n,r]:[r,n];this.table.selection.add(...s.slice(o,a+1))}}else{let s=[this.data];this.isHeader&&(s=ci.flattenData(this.table.value).map(n=>n.data)),this.table.selection.add(...s),this.isHeader&&this.table.dispatchEvent(new CustomEvent("rowselected",{detail:{data:this.data}})),this.isHeader||(this.table._lastSelectedData=this.data)}else this.isHeader?this.table.selection.clear():(this.table.selection.delete(this.data),this.table.dispatchEvent(new CustomEvent("rowdeselected",{detail:{data:this.data}})));this._isRangeClick=!1}firstUpdated(t){super.firstUpdated(t),queueMicrotask(()=>{if(!this.isConnected)return;const i=this.getBoundingClientRect();i.top<window.innerHeight&&i.bottom>0&&(this._intersecting=!0),this._observer.observe(this)})}_updateHeaderCheckbox(){this._headerCheckboxUpdatePending||(this._headerCheckboxUpdatePending=!0,requestAnimationFrame(()=>{this._headerCheckboxUpdatePending=!1;const t=this.renderRoot.querySelector("bim-checkbox");if(!t||!this.table)return;const i=ci.flattenData(this.table.value).map(n=>n.data),s=i.filter(n=>this.table.selection.has(n)).length;t.checked=s>0&&s===i.length,t.indeterminate=s>0&&!t.checked}))}connectedCallback(){super.connectedCallback(),this.table&&(this.table.addEventListener("dataselected",this._onDataSelected),this.table.addEventListener("datadeselected",this._onDataDeselected),this.table.addEventListener("dataselectioncleared",this._onDataSelectionCleared),this.toggleAttribute("selected",this._isSelected),this.table.addEventListener("columnschange",this.onTableColumnsChange),this._disconnectPending&&(this._disconnectPending=!1,this.hasUpdated&&this._observer.observe(this)))}disconnectedCallback(){var t,i,s;super.disconnectedCallback(),this._observer.unobserve(this),(t=this.table)==null||t.removeEventListener("dataselected",this._onDataSelected),(i=this.table)==null||i.removeEventListener("datadeselected",this._onDataDeselected),(s=this.table)==null||s.removeEventListener("dataselectioncleared",this._onDataSelectionCleared),this._disconnectPending=!0,queueMicrotask(()=>{this._disconnectPending&&(this._disconnectPending=!1,this.data={},this.table=null)})}applyAdaptativeDataTransform(t){this.addEventListener("pointerenter",()=>{this.dataTransform=t,this._interval=window.setInterval(()=>{this.matches(":hover")||this.clearDataTransform()},50)})}render(){var t,i,s;if(!(this.table&&this._intersecting))return w`${T}`;const n=this.columns.filter(u=>!this.hiddenColumns.includes(u.name)),r=n.map(u=>u.name),o=n.map(u=>u.width);this.style.gridTemplateAreas=`"${this.table.selectableRows?"Selection":""} ${r.join(" ")}"`,this.style.gridTemplateColumns=`${this.table.selectableRows?"1.6rem":""} ${o.join(" ")}`;let a=!1,l=!1;if(this.isHeader&&this.table.selectableRows){const u=ci.flattenData(this.table.value).map(b=>b.data),p=u.filter(b=>this.table.selection.has(b)).length;a=p>0&&p===u.length,l=p>0&&!a}const c=this.table.getRowIndentation(this.data)??0,h=[];let d=this.data;if((t=this.groupData)!=null&&t._isComputedGroup){const u=this.table.dataKeys.filter(p=>{var b;return!((b=this.table)!=null&&b.hiddenColumns.includes(p))});for(const p of u)r.indexOf(p)!==0&&(d[p]="")}for(const u in d){if(!((i=this.groupData)!=null&&i._isComputedGroup)&&this.hiddenColumns.includes(u))continue;const p=document.createElement("bim-table-cell");p.group=this.group,p.table=this.table,p.row=this,p.column=u;const b=(s=this.group)!=null&&s.data._isComputedGroup&&this.table.groupedBy.includes(u)?0:r.indexOf(u);b===0&&(p.style.marginLeft=this.table.noIndentation?"0":`calc(${c} * var(--bim-table--indent-step, 1rem) + 0.9375rem)`),p.setAttribute("data-column-index",String(b)),p.toggleAttribute("data-no-indentation",b===0&&this.table.noIndentation),p.toggleAttribute("data-cell-header",this.isHeader),p.rowData=this.data,this.table.dispatchEvent(new CustomEvent("cellcreated",{detail:{cell:p}})),h.push(p)}return this._timeOutDelay=0,w`
      ${this.table.selectableRows?w`<bim-checkbox
            @click=${this._onCheckboxClick}
            @change=${this.onSelectionChange}
            .checked=${this.isHeader?a:this._isSelected??!1}
            .indeterminate=${l}
            .disabled=${this.table.rowsSelectionDisabled}
            style="align-self: center; justify-self: center"
          ></bim-checkbox>`:null}
      ${h}
      <slot></slot>
    `}};Jc.styles=H`
    :host {
      position: relative;
      grid-area: Data;
      display: grid;
      min-height: var(--bim-table-row--min-h, 30px);
      transition: all 0.15s;
      gap: var(--bim-table-row--gap, 4px);
      /* Off by default; consumers opt into row dividers by setting the
         bim-table-row--border-bottom token on the bim-table host
         (e.g. 1px solid #2d2d33). */
      border-bottom: var(--bim-table-row--border-bottom, none);
    }

    ::slotted(.branch.branch-vertical) {
      top: 50%;
      bottom: 0;
    }

    :host([selected]) {
      background-color: color-mix(in lab, var(--bim-ui_bg-contrast-20) 30%, var(--bim-ui_bg-contrast-70) 10%);
    }

    :host([is-header]) {
      min-height: auto;
      height: var(--bim-ui_size-10xl);
      border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
    }
  `;let Ms=Jc;Bn([v({type:Boolean,reflect:!0})],Ms.prototype,"selected");Bn([v({type:Boolean,attribute:"is-header",reflect:!0})],Ms.prototype,"isHeader");Bn([Z()],Ms.prototype,"_intersecting");Bn([Z()],Ms.prototype,"dataTransform");var Nf=Object.defineProperty,Wf=Object.getOwnPropertyDescriptor,nt=(e,t,i,s)=>{for(var n=s>1?void 0:s?Wf(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&Nf(t,i,n),n};const Os=(e,t)=>(e.id!==void 0&&(t.id=e.id),t),Uf=e=>{let t;const i=new Set,s=l=>{for(const c of l)c.id!=null&&(t??(t=new Set),t.has(c.id)?i.add(c.id):t.add(c.id)),c.children&&s(c.children)};if(s(e),i.size===0)return t;const n=10,r=[...i],o=r.slice(0,n).map(l=>JSON.stringify(l)).join(", "),a=r.length>n?` and ${r.length-n} more`:"";return console.warn(`bim-table: duplicated row ids (${o}${a}). Row ids must be unique across the table; duplicates fall back to object identity.`),t};var Ts;const et=(Ts=class extends I{constructor(){super(),this._value=[],this.headersHidden=!1,this.minColWidth="4rem",this._columns=[],this._textDelimiters={comma:",",tab:"	"},this._queryString=null,this._data=[],this.expanded=!1,this._connectedGroups=new Set,this._groupsById=new Map,this._expansionMemory=new Map,this.preserveStructureOnFilter=!1,this.indentationInText=!1,this.dataTransform={},this.headersTransform={},this.groupingTransform={},this.selectableRows=!1,this.selection=new dp,this.rowsSelectionDisabled=!1,this.noIndentation=!1,this.noCarets=!1,this.groupsOnly=!1,this.loading=!1,this._groupedBy=[],this._lastSelectedData=null,this.rangeSelectKey="ctrlKey",this._errorLoading=!1,this._defaultVisibility=!0,this._visibilityExceptions=[],this.defaultContentTemplate=e=>w`<bim-label style="white-space: normal; user-select: text;"
      >${e}</bim-label
    >`,this._stringFilterFunction=(e,t)=>Object.values(t.data).some(i=>String(i).toLowerCase().includes(e.toLowerCase())),this._queryFilterFunction=(e,t)=>{let i=!1;const s=Ar(e)??[];for(const n of s){if("queries"in n){i=!1;break}const{condition:r,value:o}=n;let{key:a}=n;if(a.startsWith("[")&&a.endsWith("]")){const l=a.replace("[","").replace("]","");a=l,i=Object.keys(t.data).filter(c=>c.includes(l)).map(c=>sa(t.data[c],r,o)).some(c=>c)}else i=sa(t.data[a],r,o);if(!i)break}return i},this.selection.deleteGuard=()=>!this.rowsSelectionDisabled,this.selection.onItemAdded.add(e=>this.emitDataSelected({data:e})),this.selection.onItemDeleted.add(e=>this.emitDataDeselected({data:e})),this.selection.onCleared.add(()=>{this.emitDataCleared(),this._lastSelectedData=null})}static flattenData(e){const t=[];for(const i of e)t.push(Os(i,{data:i.data})),i.children&&i.children.length>0&&t.push(...Ts.flattenData(i.children));return t}set columns(e){const t=[];for(const i of e){const s=typeof i=="string"?{name:i,width:`minmax(${this.minColWidth}, 1fr)`}:i;t.push(s)}this._columns=t,this.computeMissingColumns(this.data),this.dispatchEvent(new Event("columnschange"))}get columns(){return this._columns}get _headerRowData(){const e={};for(const t of this.columns){const{name:i}=t;e[i]=String(i)}return e}get value(){return this._value}set queryString(e){this.toggleAttribute("data-processing",!0),this._queryString=e&&e.trim()!==""?e.trim():null,this.updateValue(),this.toggleAttribute("data-processing",!1)}get queryString(){return this._queryString}set data(e){this._data=e;const t=Uf(e);for(const i of this._expansionMemory.keys())t!=null&&t.has(i)||this._expansionMemory.delete(i);this.updateValue(),this.computeMissingColumns(e)&&(this.columns=this._columns)}get data(){return this._data}get dataAsync(){return new Promise(e=>{setTimeout(()=>{e(this.data)})})}_registerGroup(e,t){if(this._connectedGroups.add(e),t===void 0)return;const i=this._groupsById.get(t);i?i.includes(e)||i.push(e):this._groupsById.set(t,[e])}_unregisterGroup(e,t){if(this._connectedGroups.delete(e),t===void 0)return;const i=this._groupsById.get(t);if(!i)return;const s=i.indexOf(e);s!==-1&&i.splice(s,1),i.length===0&&this._groupsById.delete(t)}_applyExpansion(){this._expansionMemory.clear();for(const e of this._connectedGroups)e.applyExpansion()}refreshRows(e,t){var i,s;const n=t?.deep??!1;for(const r of e)(s=(i=this._groupsById.get(r))==null?void 0:i[0])==null||s.refreshRow(n)}willUpdate(e){super.willUpdate(e),(e.has("expanded")||e.has("expandedLevels"))&&this._applyExpansion()}_setExpansion(e){this._expandedBeforeFilter!==void 0&&(this._expandedBeforeFilter=e),this.expandedLevels=void 0,this.expanded=e,this._applyExpansion()}expandAll(){this._setExpansion(!0)}collapseAll(){this._setExpansion(!1)}set groupedBy(e){this._groupedBy=e,this.updateValue()}get groupedBy(){return this._groupedBy}get body(){return this._bodyScroll??null}set defaultVisibility(e){this._defaultVisibility=e}get defaultVisibility(){return this._defaultVisibility}set visibilityExceptions(e){this._visibilityExceptions=e}get visibilityExceptions(){return this._visibilityExceptions}set hiddenColumns(e){this.defaultVisibility=!0,this.visibilityExceptions=e}get hiddenColumns(){const e=this.dataKeys,t=[];for(const i of e){const s=this._visibilityExceptions.includes(i);(this._defaultVisibility?s:!s)&&t.push(i)}return t}set visibleColumns(e){this.defaultVisibility=!1,this.visibilityExceptions=e}get visibleColumns(){const e=this.dataKeys,t=[];for(const i of e){const s=this._visibilityExceptions.includes(i);(this._defaultVisibility?!s:s)&&t.push(i)}return t}emitDataSelected(e){this.dispatchEvent(new CustomEvent("dataselected",{detail:e}))}emitDataDeselected(e){this.dispatchEvent(new CustomEvent("datadeselected",{detail:e}))}emitDataCleared(){this.dispatchEvent(new Event("dataselectioncleared"))}filterData(e=this.data){let t=[];if(this.queryString){let i=this.filterFunction;i||(i=Ar(this.queryString)?this._queryFilterFunction:this._stringFilterFunction),t=this.filter(this.queryString,i,e),this.preserveStructureOnFilter&&(this._expandedBeforeFilter===void 0&&(this._expandedBeforeFilter=this.expanded),this.expanded=!0)}else this.preserveStructureOnFilter&&this._expandedBeforeFilter!==void 0&&(this.expanded=this._expandedBeforeFilter,this._expandedBeforeFilter=void 0),t=e;return t}computeMissingColumns(e){let t=!1;for(const i of e){const{children:s,data:n}=i;for(const r in n)this._columns.map(o=>typeof o=="string"?o:o.name).includes(r)||(this._columns.push({name:r,width:`minmax(${this.minColWidth}, 1fr)`}),t=!0);if(s){const r=this.computeMissingColumns(s);r&&!t&&(t=r)}}return t}generateText(e="comma",t=this.value,i="",s=!0){const n=this._textDelimiters[e];let r="";const o=this.columns.map(a=>a.name);if(s){this.indentationInText&&(r+=`Indentation${n}`);const a=`${o.join(n)}
`;r+=a}for(const[a,l]of t.entries()){const{data:c,children:h}=l,d=this.indentationInText?`${i}${a+1}${n}`:"",u=o.map(b=>c[b]??""),p=`${d}${u.join(n)}
`;r+=p,h&&(r+=this.generateText(e,l.children,`${i}${a+1}.`,!1))}return r}get csv(){return this.generateText("comma")}get tsv(){return this.generateText("tab")}get dataKeys(){const e=new Set,t=i=>{for(const s of i){for(const n in s.data)e.add(n);s.children&&t(s.children)}};return t(this.data),Array.from(e)}applyDataTransform(e){const t={};if(!e)return t;const{data:i}=e.data;for(const n of Object.keys(this.dataTransform)){const r=this.columns.find(o=>o.name===n);r&&r.forceDataTransform&&(n in i||(i[n]=""))}const s=i;for(const n in s){const r=this.dataTransform[n];r?t[n]=r(s[n],i,e):t[n]=i[n]}return t}downloadData(e="BIM Table Data",t="json"){let i=null;if(t==="json"&&(i=new File([JSON.stringify(this.value,void 0,2)],`${e}.json`)),t==="csv"&&(i=new File([this.csv],`${e}.csv`)),t==="tsv"&&(i=new File([this.tsv],`${e}.tsv`)),!i)return;const s=document.createElement("a");s.href=URL.createObjectURL(i),s.download=i.name,s.click(),URL.revokeObjectURL(s.href)}getRowIndentation(e,t=this.value,i=0){for(const s of t){if(s.data===e)return i;if(s.children){const n=this.getRowIndentation(e,s.children,i+1);if(n!==null)return n}}return null}getGroupIndentation(e,t=this.value,i=0){for(const s of t){if(s===e)return i;if(s.children){const n=this.getGroupIndentation(e,s.children,i+1);if(n!==null)return n}}return null}connectedCallback(){super.connectedCallback(),this.dispatchEvent(new Event("connected"))}disconnectedCallback(){super.disconnectedCallback(),this.dispatchEvent(new Event("disconnected"))}async loadData(e=!1){var t;if(this._value.length!==0&&!e||!this.loadFunction)return!1;const i=this._value.length>0,s=((t=this._bodyScroll)==null?void 0:t.scrollTop)??0;i||(this.loading=!0);try{const n=await this.loadFunction();return this.data=n,this.loading=!1,this._errorLoading=!1,i&&s>0&&(await this.updateComplete,requestAnimationFrame(()=>{this._bodyScroll.scrollTop=s})),!0}catch(n){if(this.loading=!1,this._value.length!==0)return!1;const r=this.querySelector("[slot='error-loading']"),o=r?.querySelector("[data-table-element='error-message']");return n instanceof Error&&o&&n.message.trim()!==""&&(o.textContent=n.message),this._errorLoading=!0,!1}}groupData(e=this.data){return Pf(e,this.groupedBy,this.groupingTransform)}updateValue(){const e=this.filterData(),t=this.groupData(e);this._value=t}filter(e,t=this.filterFunction??this._stringFilterFunction,i=this.data){const s=[];for(const n of i)if(t(e,n)){if(this.preserveStructureOnFilter){const r=Os(n,{data:n.data});if(n.children){const o=this.filter(e,t,n.children);o.length&&(r.children=o)}s.push(r)}else if(s.push(Os(n,{data:n.data})),n.children){const r=this.filter(e,t,n.children);s.push(...r)}}else if(n.children){const r=this.filter(e,t,n.children);this.preserveStructureOnFilter&&r.length?s.push(Os(n,{data:n.data,children:r})):s.push(...r)}return s}get _missingDataElement(){return this.querySelector("[slot='missing-data']")}getGroupingMessageTemplate(){if(this.groupedBy.length===0)return T;const e=this.groupedBy.join(" → ");return w`
      <bim-label
        part="grouping-message"
        style="
        background-color: var(--bim-ui_bg-contrast-10);
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
        padding: 0.5rem 0.75rem;
        font-weight: 500;
        display: block;
      "
      >
        Grouped By: ${e}
      </bim-label>
    `}render(){if(this.loading)return zf();if(this._errorLoading)return w`<slot name="error-loading"></slot>`;if(this._value.length===0&&this._missingDataElement)return w`<slot name="missing-data"></slot>`;const e=i=>{if(!i)return;const s=i;s.table=this,s.data=this._headerRowData,s.requestUpdate()},t=i=>{if(!i)return;const s=i;s.table=this,s.data=this.value,s.requestUpdate()};return w`
      <div class="parent">
        ${Rf()}
        <div
          style="
          grid-area: Header;
          position: sticky;
          top: 0;
          z-index: 5;
        "
        >
          ${St(!this.headersHidden,()=>w`<bim-table-row
                is-header
                ${At(e)}
              ></bim-table-row>`)}
          ${this.getGroupingMessageTemplate()}
        </div>
        <div class="body-scroll" style="overflow-x: hidden; grid-area: Body">
          <bim-table-children
            ${At(t)}
            style="grid-area: Body; background-color: transparent"
          ></bim-table-children>
        </div>
      </div>
    `}},Ts.styles=[Se.scrollbar,H`
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
      }

      .controls {
        display: flex;
        gap: 0.375rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
      }
    `],Ts);nt([Z()],et.prototype,"_value",2);nt([v({type:Boolean,attribute:"headers-hidden",reflect:!0})],et.prototype,"headersHidden",2);nt([v({type:String,attribute:"min-col-width",reflect:!0})],et.prototype,"minColWidth",2);nt([v({type:Array,attribute:!1})],et.prototype,"columns",1);nt([v({type:Array,attribute:!1})],et.prototype,"data",1);nt([v({type:Boolean,reflect:!0})],et.prototype,"expanded",2);nt([v({type:Number,attribute:"expanded-levels",reflect:!0})],et.prototype,"expandedLevels",2);nt([v({attribute:!1})],et.prototype,"headersTransform",2);nt([v({attribute:!1})],et.prototype,"groupingTransform",2);nt([v({type:Boolean,reflect:!0,attribute:"selectable-rows"})],et.prototype,"selectableRows",2);nt([v({type:Boolean,attribute:"rows-selection-disabled",reflect:!0})],et.prototype,"rowsSelectionDisabled",2);nt([v({type:Boolean,attribute:"no-indentation",reflect:!0})],et.prototype,"noIndentation",2);nt([v({type:Boolean,attribute:"no-carets",reflect:!0})],et.prototype,"noCarets",2);nt([v({type:Boolean,attribute:"groups-only",reflect:!0})],et.prototype,"groupsOnly",2);nt([v({type:Boolean,reflect:!0})],et.prototype,"loading",2);nt([v({type:String,attribute:"grouped-by",reflect:!0,converter:{toAttribute:e=>Array.isArray(e)&&e.length>0?e.join(","):null,fromAttribute:e=>e&&e.trim()!==""?e.split(",").map(t=>t.trim()):[]}})],et.prototype,"groupedBy",1);nt([v({type:String,attribute:"range-select-key",reflect:!0})],et.prototype,"rangeSelectKey",2);nt([Z()],et.prototype,"_errorLoading",2);nt([Vl(".body-scroll")],et.prototype,"_bodyScroll",2);nt([v({type:Boolean,attribute:"columns-hidden",reflect:!0,converter:{toAttribute:e=>e?null:"",fromAttribute:e=>e===null}})],et.prototype,"defaultVisibility",1);nt([v({type:String,attribute:"visibility-exceptions",reflect:!0,converter:{toAttribute:e=>Array.isArray(e)&&e.length>0?e.join(","):null,fromAttribute:e=>e&&e.trim()!==""?e.split(",").map(t=>t.trim()):[]}})],et.prototype,"visibilityExceptions",1);let ci=et;var qf=Object.defineProperty,Yf=Object.getOwnPropertyDescriptor,Fn=(e,t,i,s)=>{for(var n=s>1?void 0:s?Yf(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&qf(t,i,n),n};const th=class extends I{constructor(){super(),this._defaultName="__unnamed__",this._autoNamed=!1,this.name=this._defaultName,this._hidden=!1,this.setAttribute("role","tabpanel")}set label(t){this._label=t,this.dispatchEvent(new CustomEvent("tab-update",{bubbles:!0}))}get label(){return this._label}set icon(t){this._icon=t,this.dispatchEvent(new CustomEvent("tab-update",{bubbles:!0}))}get icon(){return this._icon}set hidden(t){const i=this._hidden;this._hidden=t,this.requestUpdate("hidden",i),this.dispatchEvent(new CustomEvent("hiddenchange",{detail:{hidden:t}}))}get hidden(){return this._hidden}connectedCallback(){super.connectedCallback();const{parentElement:t}=this;if(t&&(this.name===this._defaultName||this._autoNamed)){const i=[...t.children].indexOf(this);this.name=`${this._defaultName}${i}`,this._autoNamed=!0}}render(){return w`<slot></slot>`}};th.styles=H`
    :host {
      display: block;
      height: 100%;
      grid-row-start: 1;
      grid-column-start: 1;
    }

    :host([hidden]) {
      display: none;
    }
  `;let yt=th;Fn([v({type:String,reflect:!0})],yt.prototype,"name",2);Fn([v({type:String,reflect:!0})],yt.prototype,"label",1);Fn([v({type:String,reflect:!0})],yt.prototype,"icon",1);Fn([v({type:Boolean,reflect:!0})],yt.prototype,"hidden",1);var Kf=Object.defineProperty,Gf=Object.getOwnPropertyDescriptor,he=(e,t,i,s)=>{for(var n=s>1?void 0:s?Gf(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&Kf(t,i,n),n};const eh=class extends I{constructor(){super(...arguments),this._switcherData=[],this._useDropdown=!1,this._initialized=!1,this._updatingTab=!1,this._dialogRef=ae(),this._triggerRef=ae(),this.bottom=!1,this.switchersHidden=!1,this.floating=!1,this.switchersFull=!1,this.switchersCompact=!1,this._onTabHiddenChange=t=>{if(this._updatingTab)return;const i=t.target;i instanceof yt&&!i.hidden&&(this.tab=i.name)},this._updateSwitchers=()=>{for(const t of this.children){if(!(t instanceof yt))continue;const i=this._switcherData.find(s=>s.name===t.name);i&&(i.label=t.label,i.icon=t.icon)}this.requestUpdate()},this._onSwitchersKeyDown=t=>{const i=[...this.renderRoot.querySelectorAll(".switcher")],s=i.length;if(!s)return;const n=i.findIndex(a=>a.getAttribute("data-name")===this._tab);let r=n;if(t.key==="ArrowRight"||t.key==="ArrowDown")t.preventDefault(),r=(n+1)%s;else if(t.key==="ArrowLeft"||t.key==="ArrowUp")t.preventDefault(),r=(n-1+s)%s;else if(t.key==="Home")t.preventDefault(),r=0;else if(t.key==="End")t.preventDefault(),r=s-1;else return;const o=i[r];o&&(this.tab=o.getAttribute("data-name")??void 0,o.focus())}}set tab(t){if(!this._initialized&&t&&t!=="hidden"){this._pendingTab=t;return}const i=this._tab,s=[...this.children],n=s.find(r=>r instanceof yt&&r.name===t);this._tab=n?t:"hidden",this._updatingTab=!0;for(const r of s)r instanceof yt&&(r.hidden=n!==r);this._updatingTab=!1,this.requestUpdate("tab",i)}get tab(){return this._tab}connectedCallback(){super.connectedCallback(),this.addEventListener("tab-update",this._updateSwitchers)}disconnectedCallback(){var t,i;super.disconnectedCallback(),this.removeEventListener("tab-update",this._updateSwitchers);for(const s of this.children)s instanceof yt&&s.removeEventListener("hiddenchange",this._onTabHiddenChange);(t=this._ro)==null||t.disconnect(),(i=this._dialogRef.value)==null||i.close()}firstUpdated(){this._ro=new ResizeObserver(()=>this._checkOverflow()),this._ro.observe(this),requestAnimationFrame(()=>this._checkOverflow())}updated(t){super.updated(t),t.has("_switcherData")&&requestAnimationFrame(()=>this._checkOverflow())}_checkOverflow(){const t=this.renderRoot.querySelector(".switchers-measure");if(!t)return;const i=t.offsetWidth,s=this.clientWidth,n=i>s;n!==this._useDropdown&&(this._useDropdown=n)}_onTriggerClick(){const t=this._dialogRef.value,i=this._triggerRef.value;if(!t||!i)return;if(t.open){t.close();return}const s=i.getBoundingClientRect();t.style.top=`${s.top}px`,t.style.left=`${s.right+4}px`,t.showModal();const n=t.getBoundingClientRect();n.right>window.innerWidth-4&&(t.style.left=`${s.left-n.width-4}px`),n.bottom>window.innerHeight-4&&(t.style.top=`${Math.max(4,window.innerHeight-n.height-4)}px`)}_onDialogClick(t){const i=t.currentTarget,s=i.getBoundingClientRect();(t.clientX<s.left||t.clientX>s.right||t.clientY<s.top||t.clientY>s.bottom)&&i.close()}_createSwitchers(){this._switcherData=[];for(const t of this.children)t instanceof yt&&(t.id||(t.id=`bim-tab-panel-${t.name}`),this._switcherData.push({name:t.name,label:t.label,icon:t.icon,panelId:t.id}))}_onSlotChange(t){this._initialized=!0,this._createSwitchers();const i=t.target.assignedElements(),s=this._pendingTab??this._tab;this._pendingTab=void 0;const n=i.find(r=>r instanceof yt?s&&s!=="hidden"?r.name===s:!r.hidden:!1);n instanceof yt&&(this.tab=n.name);for(const r of i){if(!(r instanceof yt)){console.warn("[bim-tabs] Only bim-tab elements are allowed as children. Removing:",r),r.remove();continue}r.setAttribute("aria-label",r.label||r.name||""),r.removeEventListener("hiddenchange",this._onTabHiddenChange),n!==r&&(r.hidden=!0),r.addEventListener("hiddenchange",this._onTabHiddenChange)}}render(){const t=this._switcherData.find(i=>i.name===this._tab);return w`
      <div class="parent">
        <div class="switchers-measure" aria-hidden="true">
          ${this._switcherData.map(i=>w`
              <div class="switcher-ghost">
                <bim-label .icon=${i.icon}>${i.label??""}</bim-label>
              </div>
            `)}
        </div>
        <div
          class="switchers"
          role=${this._useDropdown?T:"tablist"}
          aria-label=${this.label??T}
          @keydown=${this._useDropdown?T:this._onSwitchersKeyDown}
        >
          ${this._useDropdown?w`
                <button
                  class="tab-trigger"
                  ${At(this._triggerRef)}
                  @click=${this._onTriggerClick}
                  aria-haspopup="listbox"
                >
                  <bim-label .icon=${t?.icon}
                    >${t?.label??""}</bim-label
                  >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 6l5 5 5-5" />
                  </svg>
                </button>
                <dialog ${At(this._dialogRef)} @click=${this._onDialogClick}>
                  ${this._switcherData.map(i=>{const s=this._tab===i.name;return w`<div
                      class="tab-option"
                      ?data-active=${s}
                      @click=${()=>{var n;this.tab=i.name,(n=this._dialogRef.value)==null||n.close()}}
                    >
                      <bim-label .icon=${i.icon}>${i.label??""}</bim-label>
                    </div>`})}
                </dialog>
              `:this._switcherData.map(i=>{const s=this._tab===i.name;return w`<div
                  class="switcher"
                  data-name=${i.name}
                  role="tab"
                  aria-selected=${s}
                  tabindex=${s?0:-1}
                  aria-controls=${i.panelId}
                  ?data-active=${s}
                  @click=${()=>{if(this._tab===i.name){this.floating&&(this.tab=void 0);return}this.tab=i.name}}
                ><bim-label .icon=${i.icon}>${i.label??""}</bim-label></div>`})}
        </div>
        <div class="content">
          <slot @slotchange=${this._onSlotChange}></slot>
        </div>
      </div>
    `}};eh.styles=[Se.scrollbar,H`
      * {
        box-sizing: border-box;
      }

      :host {
        flex: 1;
        display: block;
        height: 100%;
        background-color: var(--bim-tabs--bg, var(--bim-ui_bg-contrast-10));
        overflow: auto;
        border: var(--bim-tabs--border, 1px solid var(--bim-ui_bg-contrast-20));
        border-radius: 0.75rem;
        --bim-panel--header-display: none;
        --bim-panel-section--header-display: none;
        --bim-panel-section--border: none;
        --bim-panel-section--bdrs: 0;
        --bim-panel-section--bg: transparent;
        --bim-panel--border: none;
        --bim-toolbar--border: none;
        --bim-toolbar--bdrs: 0;
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
        height: 35px;
        border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
        position: relative;
        display: flex;
        flex-wrap: wrap;
        grid-area: switchers;
        overflow: hidden;
      }

      :host([bottom]) .switchers {
        border-bottom: none;
        border-top: 1px solid var(--bim-ui_bg-contrast-20);
      }

      .switcher {
        --bim-label--c: var(--bim-ui_bg-contrast-80);
        position: relative;
        cursor: pointer;
        pointer-events: auto;
        padding: 0 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--bim-tabs-switcher--z, 2);
        transition: background-color 0.15s;
        min-height: var(--bim-tabs-switcher--minh, 30px);
      }

      .switcher:not([data-active]):hover {
        background-color: var(--bim-ui_bg-contrast-20);
      }

      .switcher[data-active] {
        --bim-label--c: var(--bim-ui_bg-contrast-100);
        /* Active tab = the ThatOpen brand purple (main-base #6528d7) by default,
           not a gray. Themeable via --bim-tabs-switcher--active-bgc. */
        background-color: var(--bim-tabs-switcher--active-bgc, var(--bim-ui_main-base));
      }

      .switcher:focus-visible {
        outline: 2px solid var(--bim-ui_accent-base);
        outline-offset: -2px;
      }

      .switchers bim-label {
        pointer-events: none;
      }

      :host([switchers-full]) .switcher {
        flex: 1;
      }

      :host([switchers-hidden]) .switchers {
        display: none;
      }

      :host([switchers-compact]) .switchers {
        width: fit-content;
        border-bottom: none;
        padding: 0;
        margin: var(--bim-ui_size-sm);
        gap: 0;
        overflow: auto;
        border-radius: var(--bim-ui_size-2xs);
      }

      :host([switchers-compact]) .switcher {
        min-width: unset;
        padding: 0 var(--bim-ui_size-sm);
        border-radius: 0;
        background-color: var(--bim-ui_bg-contrast-20);
      }

      :host([switchers-compact]) .switcher[data-active] {
        background-color: var(--bim-tabs-switcher--active-bgc, var(--bim-ui_main-base));
      }

      /* Invisible measure strip — always rendered to detect overflow */
      .switchers-measure {
        position: absolute;
        top: 0;
        left: 0;
        height: 0;
        visibility: hidden;
        pointer-events: none;
        display: flex;
        flex-wrap: nowrap;
      }

      .switcher-ghost {
        padding: 0 0.75rem;
        display: flex;
        align-items: center;
        min-height: var(--bim-tabs-switcher--minh, 30px);
        flex-shrink: 0;
        white-space: nowrap;
      }

      /* Overflow dropdown trigger */
      .tab-trigger {
        --bim-label--c: var(--bim-ui_bg-contrast-80);
        all: unset;
        box-sizing: border-box;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.375rem;
        padding: 0 0.75rem;
        cursor: pointer;
        min-height: var(--bim-tabs-switcher--minh, 30px);
        user-select: none;
      }

      .tab-trigger svg {
        flex-shrink: 0;
      }

      .tab-trigger:hover {
        background-color: var(--bim-ui_bg-contrast-20);
      }

      .tab-trigger:focus-visible {
        outline: 2px solid var(--bim-ui_accent-base);
        outline-offset: -2px;
      }

      /* Overflow dropdown dialog */
      dialog {
        position: fixed;
        margin: 0;
        padding: 0.25rem 0;
        border: 1px solid var(--bim-ui_bg-contrast-20);
        border-radius: var(--bim-ui_size-2xs);
        background-color: var(--bim-ui_bg-contrast-10);
        box-shadow: 1px 2px 8px 2px rgba(0, 0, 0, 0.15);
        overflow: auto;
        max-height: 20rem;
        min-width: 8rem;
      }

      dialog::backdrop {
        background: transparent;
      }

      .tab-option {
        --bim-label--c: var(--bim-ui_bg-contrast-80);
        display: flex;
        align-items: center;
        padding: 0 0.75rem;
        min-height: var(--bim-tabs-switcher--minh, 30px);
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
      }

      .tab-option:hover {
        background-color: var(--bim-ui_bg-contrast-20);
      }

      .tab-option[data-active] {
        --bim-label--c: var(--bim-ui_bg-contrast-100);
        background-color: var(--bim-ui_bg-contrast-30);
      }

      .content {
        position: relative;
        display: grid;
        grid-template-columns: 1fr;
        grid-area: content;
        overflow: auto;
      }

      :host([tab="hidden"]) .content {
        display: none;
      }

      :host([floating]) {
        background-color: transparent;
        border: none;
        --bim-toolbar--w: 100%;
        overflow: visible;
      }

      :host([floating]) .parent {
        overflow: visible;
      }

      :host([floating]) .switchers {
        justify-self: center;
        overflow: hidden;
        /* Switcher bar = panel surface (#262629 = bg-contrast-10). Themeable. */
        background-color: var(--bim-tabs--switchers-bgc, var(--bim-ui_bg-contrast-10));
      }

      /* Floating dock borders match the panel/toolbar border (1px bg-contrast-20
         = #3C3C41), so the whole dock frames uniformly. Was contrast-40
         (#5F5F64, lighter). Themeable via --bim-tabs--switchers-bdc. */
      :host([floating]:not([bottom])) .switchers {
        border-radius: var(--bim-ui_size-2xs) var(--bim-ui_size-2xs) 0 0;
        border: 1px solid var(--bim-tabs--switchers-bdc, var(--bim-ui_bg-contrast-20));
        border-bottom: none;
      }

      :host([floating][bottom]) .switchers {
        border-radius: 0 0 var(--bim-ui_size-2xs) var(--bim-ui_size-2xs);
        border: 1px solid var(--bim-tabs--switchers-bdc, var(--bim-ui_bg-contrast-20));
        border-top: none;
      }

      :host([floating][tab="hidden"]) .switchers {
        border-radius: var(--bim-ui_size-2xs);
        border: 1px solid var(--bim-tabs--switchers-bdc, var(--bim-ui_bg-contrast-20));
      }

      :host([floating]) .content {
        border: 1px solid var(--bim-tabs--switchers-bdc, var(--bim-ui_bg-contrast-20));
        border-radius: var(--bim-ui_size-2xs);
        background-color: var(--bim-ui_bg-base);
      }

      :host([floating][tab="hidden"]) .content {
        border: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .switcher {
          transition: none;
        }
      }
    `];let qt=eh;he([Z()],qt.prototype,"_switcherData",2);he([Z()],qt.prototype,"_useDropdown",2);he([v({type:Boolean,reflect:!0})],qt.prototype,"bottom",2);he([v({type:Boolean,attribute:"switchers-hidden",reflect:!0})],qt.prototype,"switchersHidden",2);he([v({type:Boolean,reflect:!0})],qt.prototype,"floating",2);he([v({type:String,reflect:!0})],qt.prototype,"label",2);he([v({type:String,reflect:!0})],qt.prototype,"tab",1);he([v({type:Boolean,attribute:"switchers-full",reflect:!0})],qt.prototype,"switchersFull",2);he([v({type:Boolean,attribute:"switchers-compact",reflect:!0})],qt.prototype,"switchersCompact",2);var Xf=Object.defineProperty,Qf=Object.getOwnPropertyDescriptor,Pt=(e,t,i,s)=>{for(var n=s>1?void 0:s?Qf(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&Xf(t,i,n),n},Ti;const _t=(Ti=class extends I{constructor(){super(...arguments),this._type="text",this._cachedQuery=void 0,this._dirty=!1,this.value="",this.vertical=!1,this.disabled=!1,this.iconInside=!1,this.resize="vertical",this.onValueChange=new Event("input")}set type(e){Ti._inputTypes.includes(e)?this._type=e:console.warn(`[bim-text-input] Unknown type "${e}". Ignored.`)}get type(){return this._type}get query(){return this._cachedQuery===void 0&&(this._cachedQuery=Ar(this.value)),this._cachedQuery}get validation(){return this._validation}set validation(e){this._validation=e,this.requestUpdate()}get isValid(){var e;return this._dirty?((e=this._currentValidation)==null?void 0:e.valid)??!0:!0}willUpdate(e){e.has("value")&&(this._cachedQuery=void 0),this._currentValidation=this._validation?this._validation(this.value):void 0}updated(){this.toggleAttribute("invalid",!this.isValid)}onInputChange(e){this._dirty=!0,e.stopPropagation();const t=e.target;clearTimeout(this._debounceTimeoutID),this.debounce==null?(this.value=t.value,this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))):this._debounceTimeoutID=setTimeout(()=>{this.value=t.value,this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))},this.debounce)}async focus(){var e;await this.updateComplete;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("input, textarea");t?.focus()}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this._debounceTimeoutID)}render(){var e;const t=this.iconInside&&this.type!=="area",i=t?void 0:this.icon;return w`
      <div class="parent">
        ${this.label||i?w`<bim-label .icon=${i}>${this.label}</bim-label>`:T}
        <div class="input">
          ${t&&this.icon?w`<bim-label .icon=${this.icon}></bim-label>`:T}
          ${this.type==="area"?w`<textarea
                aria-label=${this.label||"Text Input"}
                .value=${this.value}
                .rows=${this.rows??5}
                ?disabled=${this.disabled}
                placeholder=${Jt(this.placeholder)}
                @input=${this.onInputChange}
                style=${Zt({"--bim-text-input--resize":this.resize})}
              ></textarea>`:w`<input
                aria-label=${this.label||"Text Input"}
                .type=${this.type}
                .value=${this.value}
                ?disabled=${this.disabled}
                placeholder=${Jt(this.placeholder)}
                autocomplete=${Jt(this.autocomplete)}
                @input=${this.onInputChange}
              />`}
        </div>
      </div>
      ${!this.isValid&&(e=this._currentValidation)!=null&&e.message?w`<span class="validation-message">${this._currentValidation.message}</span>`:T}
    `}},Ti.styles=[Se.scrollbar,H`
      :host {
        display: block;
      }

      .parent {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        user-select: none;
        flex: 1;
        align-items: normal;
      }

      :host(:not([vertical])) .parent {
        justify-content: space-between;
      }

      :host([vertical]) .parent {
        flex-direction: column;
      }

      :host(:not([vertical])[type="area"]) .parent {
        align-items: flex-start;
      }

      bim-label {
        margin-top: var(--bim-input--label-mt, 0);
      }

      :host(:not([vertical])[type="area"]) bim-label {
        margin-top: 4px;
      }

      .input {
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        height: 25px;
        min-width: 3rem;
        gap: var(--bim-input--g, var(--bim-ui_size-4xs));
        padding: 0 7px;
        background-color: var(--bim-input--bgc, var(--bim-ui_bg-contrast-20));
        border: var(--bim-input--olw, 2px) solid var(--bim-input--olc, transparent);
        border-radius: var(--bim-input--bdrs, var(--bim-ui_size-2xs));
        transition: border-color 0.15s;
      }

      :host([type="area"]) .input {
        height: auto;
        min-height: 25px;
        align-items: flex-start;
        padding: 4px 7px;
      }

      :host(:not([vertical])) .input {
        flex: 1;
        justify-content: flex-end;
      }

      :host(:not([vertical])[label]) .input {
        max-width: var(--bim-input--maxw, fit-content);
      }

      :host(:focus-within) .input {
        border-color: var(--bim-ui_bg-contrast-40);
      }

      :host([invalid]) .input {
        border-color: var(--bim-ui_danger-base);
      }

      input,
      textarea {
        font-size: var(--bim-ui_size-base);
        font-family: inherit;
        background-color: transparent;
        border: none;
        width: 100%;
        text-align: var(--bim-input--ta, start);
        color: var(--bim-text-input--c, var(--bim-ui_bg-contrast-100));
      }

      input {
        outline: none;
        color-scheme: dark;
      }

      :host-context(html.bim-ui-light) input {
        color-scheme: light;
      }

      @media (prefers-color-scheme: light) {
        input {
          color-scheme: light;
        }
      }

      :host([disabled]) input,
      :host([disabled]) textarea {
        color: var(--bim-text-input--disabled-c, var(--bim-ui_bg-contrast-60));
      }

      textarea {
        line-height: 1.1rem;
        outline: none;
        resize: var(--bim-text-input--resize, vertical);
      }

      .validation-message {
        display: block;
        font-size: var(--bim-ui_size-base);
        color: var(--bim-ui_danger-base);
        padding: 2px var(--bim-ui_size-xs);
      }

      :host(:not([vertical])) .validation-message {
        text-align: right;
      }

      :host([icon-inside]) input,
      :host([icon-inside]) textarea {
        width: auto;
        flex: 1;
        min-width: 0;
      }

      @media (prefers-reduced-motion: reduce) {
        .input {
          transition: none;
        }
      }
    `],Ti._inputTypes=["date","datetime-local","email","month","password","search","tel","text","time","url","week","area"],Ti);Pt([v({type:String,reflect:!0})],_t.prototype,"icon",2);Pt([v({type:String,reflect:!0})],_t.prototype,"label",2);Pt([v({type:String,reflect:!0})],_t.prototype,"name",2);Pt([v({type:String,reflect:!0})],_t.prototype,"placeholder",2);Pt([v({type:String})],_t.prototype,"value",2);Pt([v({type:Boolean,reflect:!0})],_t.prototype,"vertical",2);Pt([v({type:Number})],_t.prototype,"debounce",2);Pt([v({type:Number})],_t.prototype,"rows",2);Pt([v({type:Boolean,reflect:!0})],_t.prototype,"disabled",2);Pt([v({type:String,reflect:!0})],_t.prototype,"autocomplete",2);Pt([v({type:Boolean,reflect:!0,attribute:"icon-inside"})],_t.prototype,"iconInside",2);Pt([v({type:String,reflect:!0})],_t.prototype,"resize",2);Pt([v({type:String,reflect:!0})],_t.prototype,"type",1);let Zf=_t;var Jf=Object.defineProperty,tb=Object.getOwnPropertyDescriptor,ih=(e,t,i,s)=>{for(var n=tb(t,i),r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&Jf(t,i,n),n};const sh=class extends I{constructor(){super(...arguments),this._rows=2,this._vertical=!1,this._rafId=0,this._scheduleUpdateChildren=()=>{cancelAnimationFrame(this._rafId),this._rafId=requestAnimationFrame(()=>this.updateChildren())}}set rows(t){this._rows=Math.max(1,Math.floor(t))}get rows(){return this._rows}set vertical(t){t!==this._vertical&&(this._vertical=t,this.updateChildren())}get vertical(){return this._vertical}connectedCallback(){super.connectedCallback(),this.hasAttribute("role")||this.setAttribute("role","group")}disconnectedCallback(){super.disconnectedCallback(),cancelAnimationFrame(this._rafId)}updated(){this.style.setProperty("--_flow",this.vertical?"row":"column"),this.style.setProperty("--_rows",String(this.rows))}updateChildren(){for(const t of this.children)t.tagName.startsWith("BIM-")&&t.toggleAttribute("label-hidden",this.vertical)}render(){return w`
      <div class="parent">
        <slot @slotchange=${this._scheduleUpdateChildren}></slot>
      </div>
    `}};sh.styles=H`
    :host(:focus-visible) {
      outline: 2px solid var(--bim-ui_accent-base);
      outline-offset: -2px;
    }

    .parent {
      display: grid;
      gap: 0.25rem;
      grid-auto-flow: var(--_flow, column);
      grid-template-rows: repeat(var(--_rows, 2), 1fr);
    }

    ::slotted(bim-button[label]:not([vertical])) {
      --bim-button--jc: flex-start;
    }
  `;let Hn=sh;ih([v({type:Number,reflect:!0})],Hn.prototype,"rows");ih([v({type:Boolean,reflect:!0})],Hn.prototype,"vertical");var eb=Object.defineProperty,ib=Object.getOwnPropertyDescriptor,As=(e,t,i,s)=>{for(var n=s>1?void 0:s?ib(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&eb(t,i,n),n};const nh=class extends I{constructor(){super(...arguments),this._vertical=!1,this._labelHidden=!1,this._rafId=0,this._scheduleUpdateChildren=()=>{cancelAnimationFrame(this._rafId),this._rafId=requestAnimationFrame(()=>this.updateChildren())}}set vertical(t){t!==this._vertical&&(this._vertical=t,this.updateChildren())}get vertical(){return this._vertical}set labelHidden(t){t!==this._labelHidden&&(this._labelHidden=t,this.updateChildren())}get labelHidden(){return this._labelHidden}connectedCallback(){super.connectedCallback(),this.hasAttribute("role")||this.setAttribute("role","group")}disconnectedCallback(){super.disconnectedCallback(),cancelAnimationFrame(this._rafId)}updated(){this.label&&this.setAttribute("aria-label",this.label)}updateChildren(){for(const t of this.children)t.tagName.startsWith("BIM-")&&(t instanceof Hn&&(t.vertical=this.vertical),t.toggleAttribute("label-hidden",this.vertical))}render(){return w`
      <div class="parent">
        <div class="children">
          <slot @slotchange=${this._scheduleUpdateChildren}></slot>
        </div>
        ${!this.labelHidden&&(this.label||this.icon)?w`<bim-label class="name" .icon=${this.icon}>${this.label}</bim-label>`:null}
      </div>
    `}};nh.styles=H`
    :host {
      --bim-label--c: var(--bim-ui_bg-contrast-80);
      display: block;
      flex: 1;
    }

    :host(:focus-visible) {
      outline: 2px solid var(--bim-ui_accent-base);
      outline-offset: -2px;
    }

    :host(:not([vertical])) ::slotted(bim-button[vertical]) {
      --bim-icon--fz: var(--bim-ui_size-5xl);
      min-height: 3.75rem;
    }

    .parent {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1px;
      height: 100%;
      box-sizing: border-box;
      justify-content: space-between;
    }

    :host([vertical]) .parent {
      flex-direction: row-reverse;
    }

    :host([vertical]) .parent > bim-label {
      writing-mode: vertical-rl;
    }

    .name {
      height: 20px;
      padding: 0 10px;
      font-size: var(--bim-ui_size-sm);
      flex-shrink: 0;
    }

    .children {
      display: flex;
      gap: var(--bim-toolbar-section--gap, 6px);
      height: 100%;
      padding: var(--bim-toolbar-section--p, 4px);
    }

    :host([vertical]) .children {
      flex-direction: column;
    }
  `;let ei=nh;As([v({type:String,reflect:!0})],ei.prototype,"label",2);As([v({type:String,reflect:!0})],ei.prototype,"name",2);As([v({type:String,reflect:!0})],ei.prototype,"icon",2);As([v({type:Boolean,reflect:!0})],ei.prototype,"vertical",1);As([v({type:Boolean,attribute:"label-hidden",reflect:!0})],ei.prototype,"labelHidden",1);var sb=Object.defineProperty,rh=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&sb(t,i,n),n};const oh=class extends I{constructor(){super(...arguments),this.labelsHidden=!1,this.vertical=!1,this._onKeyDown=t=>{const i=Array.from(this.querySelectorAll("bim-button:not([disabled])"));if(!i.length)return;const s=i.indexOf(document.activeElement);if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(t.key))return;t.preventDefault();let n;t.key==="Home"?n=i[0]:t.key==="End"?n=i[i.length-1]:t.key==="ArrowRight"||t.key==="ArrowDown"?n=i[(s+1)%i.length]:n=i[(s-1+i.length)%i.length],n?.focus()}}set hidden(t){super.hidden=t,this.dispatchEvent(new Event("hiddenchange"))}get hidden(){return super.hidden}connectedCallback(){super.connectedCallback(),this.hasAttribute("role")||this.setAttribute("role","toolbar"),this.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._onKeyDown)}updated(t){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal"),(t.has("vertical")||t.has("labelsHidden"))&&this.updateSections()}updateSections(){for(const t of this.children)t instanceof ei&&(t.labelHidden=this.labelsHidden||this.vertical&&!xs.config.sectionLabelOnVerticalToolbar,t.vertical=this.vertical)}render(){return w`
      <div class="parent">
        <slot @slotchange=${this.updateSections}></slot>
      </div>
    `}};oh.styles=H`
    :host {
      --bim-button--bgc: transparent;
      overflow: auto;
      display: block;
      contain: layout style;
      background-color: var(--bim-toolbar--bgc, var(--bim-ui_bg-contrast-10));
      border: var(--bim-toolbar--border, 1px solid var(--bim-ui_bg-contrast-20));
      border-radius: var(--bim-toolbar--bdrs, var(--bim-ui_size-2xs));
    }

    :host([hidden]) {
      display: none;
    }

    .parent {
      display: flex;
      width: var(--bim-toolbar--w, max-content);
      pointer-events: auto;
    }

    :host([vertical]) .parent {
      flex-direction: column;
    }

    :host([vertical]) {
      width: var(--bim-toolbar--vertical-w, min-content);
    }

    ::slotted(bim-toolbar-section:not(:last-child)) {
      border-right: var(--bim-toolbar--divider, 1px solid var(--bim-ui_bg-contrast-20));
      border-bottom: none;
    }

    :host([vertical]) ::slotted(bim-toolbar-section:not(:last-child)) {
      border-bottom: var(--bim-toolbar--divider, 1px solid var(--bim-ui_bg-contrast-20));
      border-right: none;
    }
  `;let ao=oh;rh([v({type:Boolean,attribute:"labels-hidden",reflect:!0})],ao.prototype,"labelsHidden");rh([v({type:Boolean,reflect:!0})],ao.prototype,"vertical");var nb=Object.defineProperty,rb=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&nb(t,i,n),n};const ah=class extends I{constructor(){super(),this._onResize=new Event("resize"),new ResizeObserver(()=>{setTimeout(()=>{this.dispatchEvent(this._onResize)})}).observe(this)}render(){return w`
      <div class="parent">
        <slot></slot>
      </div>
    `}};ah.styles=H`
    :host {
      display: grid;
      min-width: 0;
      min-height: 0;
      height: 100%;
      /* border: 1px solid var(--bim-ui_bg-contrast-40); */
    }

    .parent {
      overflow: hidden;
      position: relative;
    }
  `;let lh=ah;rb([v({type:String,reflect:!0})],lh.prototype,"name");var ob=Object.defineProperty,ab=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&ob(t,i,n),n};const ch=class extends I{constructor(){super(...arguments),this.charts=[],this._charts=[],this.labels=[]}willUpdate(t){const i=[];this.charts&&i.push(...this.charts),this._charts=[...new Set(i)]}_getLabelColorMap(t){const i={};return t.colors&&this.labels.forEach((s,n)=>{i[s]=t.colors[n%t.colors.length]}),i}_getHideEventData(){var t;const i={};for(const s in this.labels){const n=this.labels[s],r=[];for(const o of Object.values(this._charts[0].inputData.datasets))r.push((t=o[s])==null?void 0:t.data);i[n]=r}return i}render(){if(this._charts.length===0||!this._charts[0].data)return w`<slot name="no-chart"></slot>`;const t=this._charts[0];this.labels=t.inputData.labels;const i=this._getLabelColorMap(t),s=this._getHideEventData();return this.labels.length===0?w`<slot name="missing-data"></slot>`:w`
      <div class="parent">
        ${this.labels.map(n=>w`
            <div style="display: flex; gap: 0.25rem; align-items: center;">
              <span
                style="
                display: inline-block;
                width: 0.6rem;
                height: 0.6rem;
                border-radius: 50%;
                background: ${i[n]??"gray"};
              "
                aria-hidden="true"
              ></span>
              <bim-label
                @click=${r=>{const o=r.currentTarget,a=o.style.textDecoration==="line-through";o.style.textDecoration=a?"none":"line-through";const l=s[n];this.dispatchEvent(new CustomEvent("label-click",{detail:{label:n,data:l,visibility:a}}));for(const c of this._charts)c.filterByLabel(n)}}
              >
                ${n}
              </bim-label>
            </div>
          `)}
      </div>
    `}};ch.styles=H`
    :host {
      display: block;
      box-sizing: border-box;
      padding: 0.5rem;
    }

    .parent {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
      /* height: 100%;
      width: 100%; */
    }
  `;let hh=ch;ab([v({type:Array,attribute:!1,hasChanged:()=>!0})],hh.prototype,"charts");function $s(e){return e+.5|0}const be=(e,t,i)=>Math.max(Math.min(e,i),t);function ji(e){return be($s(e*2.55),0,255)}function xe(e){return be($s(e*255),0,255)}function Qt(e){return be($s(e/2.55)/100,0,1)}function ua(e){return be($s(e*100),0,100)}const Ot={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,A:10,B:11,C:12,D:13,E:14,F:15,a:10,b:11,c:12,d:13,e:14,f:15},Pr=[..."0123456789ABCDEF"],lb=e=>Pr[e&15],cb=e=>Pr[(e&240)>>4]+Pr[e&15],Ls=e=>(e&240)>>4===(e&15),hb=e=>Ls(e.r)&&Ls(e.g)&&Ls(e.b)&&Ls(e.a);function db(e){var t=e.length,i;return e[0]==="#"&&(t===4||t===5?i={r:255&Ot[e[1]]*17,g:255&Ot[e[2]]*17,b:255&Ot[e[3]]*17,a:t===5?Ot[e[4]]*17:255}:(t===7||t===9)&&(i={r:Ot[e[1]]<<4|Ot[e[2]],g:Ot[e[3]]<<4|Ot[e[4]],b:Ot[e[5]]<<4|Ot[e[6]],a:t===9?Ot[e[7]]<<4|Ot[e[8]]:255})),i}const ub=(e,t)=>e<255?t(e):"";function pb(e){var t=hb(e)?lb:cb;return e?"#"+t(e.r)+t(e.g)+t(e.b)+ub(e.a,t):void 0}const fb=/^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;function dh(e,t,i){const s=t*Math.min(i,1-i),n=(r,o=(r+e/30)%12)=>i-s*Math.max(Math.min(o-3,9-o,1),-1);return[n(0),n(8),n(4)]}function bb(e,t,i){const s=(n,r=(n+e/60)%6)=>i-i*t*Math.max(Math.min(r,4-r,1),0);return[s(5),s(3),s(1)]}function mb(e,t,i){const s=dh(e,1,.5);let n;for(t+i>1&&(n=1/(t+i),t*=n,i*=n),n=0;n<3;n++)s[n]*=1-t-i,s[n]+=t;return s}function gb(e,t,i,s,n){return e===n?(t-i)/s+(t<i?6:0):t===n?(i-e)/s+2:(e-t)/s+4}function lo(e){const t=e.r/255,i=e.g/255,s=e.b/255,n=Math.max(t,i,s),r=Math.min(t,i,s),o=(n+r)/2;let a,l,c;return n!==r&&(c=n-r,l=o>.5?c/(2-n-r):c/(n+r),a=gb(t,i,s,c,n),a=a*60+.5),[a|0,l||0,o]}function co(e,t,i,s){return(Array.isArray(t)?e(t[0],t[1],t[2]):e(t,i,s)).map(xe)}function ho(e,t,i){return co(dh,e,t,i)}function vb(e,t,i){return co(mb,e,t,i)}function yb(e,t,i){return co(bb,e,t,i)}function uh(e){return(e%360+360)%360}function xb(e){const t=fb.exec(e);let i=255,s;if(!t)return;t[5]!==s&&(i=t[6]?ji(+t[5]):xe(+t[5]));const n=uh(+t[2]),r=+t[3]/100,o=+t[4]/100;return t[1]==="hwb"?s=vb(n,r,o):t[1]==="hsv"?s=yb(n,r,o):s=ho(n,r,o),{r:s[0],g:s[1],b:s[2],a:i}}function _b(e,t){var i=lo(e);i[0]=uh(i[0]+t),i=ho(i),e.r=i[0],e.g=i[1],e.b=i[2]}function wb(e){if(!e)return;const t=lo(e),i=t[0],s=ua(t[1]),n=ua(t[2]);return e.a<255?`hsla(${i}, ${s}%, ${n}%, ${Qt(e.a)})`:`hsl(${i}, ${s}%, ${n}%)`}const pa={x:"dark",Z:"light",Y:"re",X:"blu",W:"gr",V:"medium",U:"slate",A:"ee",T:"ol",S:"or",B:"ra",C:"lateg",D:"ights",R:"in",Q:"turquois",E:"hi",P:"ro",O:"al",N:"le",M:"de",L:"yello",F:"en",K:"ch",G:"arks",H:"ea",I:"ightg",J:"wh"},fa={OiceXe:"f0f8ff",antiquewEte:"faebd7",aqua:"ffff",aquamarRe:"7fffd4",azuY:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"0",blanKedOmond:"ffebcd",Xe:"ff",XeviTet:"8a2be2",bPwn:"a52a2a",burlywood:"deb887",caMtXe:"5f9ea0",KartYuse:"7fff00",KocTate:"d2691e",cSO:"ff7f50",cSnflowerXe:"6495ed",cSnsilk:"fff8dc",crimson:"dc143c",cyan:"ffff",xXe:"8b",xcyan:"8b8b",xgTMnPd:"b8860b",xWay:"a9a9a9",xgYF:"6400",xgYy:"a9a9a9",xkhaki:"bdb76b",xmagFta:"8b008b",xTivegYF:"556b2f",xSange:"ff8c00",xScEd:"9932cc",xYd:"8b0000",xsOmon:"e9967a",xsHgYF:"8fbc8f",xUXe:"483d8b",xUWay:"2f4f4f",xUgYy:"2f4f4f",xQe:"ced1",xviTet:"9400d3",dAppRk:"ff1493",dApskyXe:"bfff",dimWay:"696969",dimgYy:"696969",dodgerXe:"1e90ff",fiYbrick:"b22222",flSOwEte:"fffaf0",foYstWAn:"228b22",fuKsia:"ff00ff",gaRsbSo:"dcdcdc",ghostwEte:"f8f8ff",gTd:"ffd700",gTMnPd:"daa520",Way:"808080",gYF:"8000",gYFLw:"adff2f",gYy:"808080",honeyMw:"f0fff0",hotpRk:"ff69b4",RdianYd:"cd5c5c",Rdigo:"4b0082",ivSy:"fffff0",khaki:"f0e68c",lavFMr:"e6e6fa",lavFMrXsh:"fff0f5",lawngYF:"7cfc00",NmoncEffon:"fffacd",ZXe:"add8e6",ZcSO:"f08080",Zcyan:"e0ffff",ZgTMnPdLw:"fafad2",ZWay:"d3d3d3",ZgYF:"90ee90",ZgYy:"d3d3d3",ZpRk:"ffb6c1",ZsOmon:"ffa07a",ZsHgYF:"20b2aa",ZskyXe:"87cefa",ZUWay:"778899",ZUgYy:"778899",ZstAlXe:"b0c4de",ZLw:"ffffe0",lime:"ff00",limegYF:"32cd32",lRF:"faf0e6",magFta:"ff00ff",maPon:"800000",VaquamarRe:"66cdaa",VXe:"cd",VScEd:"ba55d3",VpurpN:"9370db",VsHgYF:"3cb371",VUXe:"7b68ee",VsprRggYF:"fa9a",VQe:"48d1cc",VviTetYd:"c71585",midnightXe:"191970",mRtcYam:"f5fffa",mistyPse:"ffe4e1",moccasR:"ffe4b5",navajowEte:"ffdead",navy:"80",Tdlace:"fdf5e6",Tive:"808000",TivedBb:"6b8e23",Sange:"ffa500",SangeYd:"ff4500",ScEd:"da70d6",pOegTMnPd:"eee8aa",pOegYF:"98fb98",pOeQe:"afeeee",pOeviTetYd:"db7093",papayawEp:"ffefd5",pHKpuff:"ffdab9",peru:"cd853f",pRk:"ffc0cb",plum:"dda0dd",powMrXe:"b0e0e6",purpN:"800080",YbeccapurpN:"663399",Yd:"ff0000",Psybrown:"bc8f8f",PyOXe:"4169e1",saddNbPwn:"8b4513",sOmon:"fa8072",sandybPwn:"f4a460",sHgYF:"2e8b57",sHshell:"fff5ee",siFna:"a0522d",silver:"c0c0c0",skyXe:"87ceeb",UXe:"6a5acd",UWay:"708090",UgYy:"708090",snow:"fffafa",sprRggYF:"ff7f",stAlXe:"4682b4",tan:"d2b48c",teO:"8080",tEstN:"d8bfd8",tomato:"ff6347",Qe:"40e0d0",viTet:"ee82ee",JHt:"f5deb3",wEte:"ffffff",wEtesmoke:"f5f5f5",Lw:"ffff00",LwgYF:"9acd32"};function kb(){const e={},t=Object.keys(fa),i=Object.keys(pa);let s,n,r,o,a;for(s=0;s<t.length;s++){for(o=a=t[s],n=0;n<i.length;n++)r=i[n],a=a.replace(r,pa[r]);r=parseInt(fa[o],16),e[a]=[r>>16&255,r>>8&255,r&255]}return e}let zs;function Cb(e){zs||(zs=kb(),zs.transparent=[0,0,0,0]);const t=zs[e.toLowerCase()];return t&&{r:t[0],g:t[1],b:t[2],a:t.length===4?t[3]:255}}const Sb=/^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;function Mb(e){const t=Sb.exec(e);let i=255,s,n,r;if(t){if(t[7]!==s){const o=+t[7];i=t[8]?ji(o):be(o*255,0,255)}return s=+t[1],n=+t[3],r=+t[5],s=255&(t[2]?ji(s):be(s,0,255)),n=255&(t[4]?ji(n):be(n,0,255)),r=255&(t[6]?ji(r):be(r,0,255)),{r:s,g:n,b:r,a:i}}}function Ab(e){return e&&(e.a<255?`rgba(${e.r}, ${e.g}, ${e.b}, ${Qt(e.a)})`:`rgb(${e.r}, ${e.g}, ${e.b})`)}const sr=e=>e<=.0031308?e*12.92:Math.pow(e,1/2.4)*1.055-.055,oi=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4);function $b(e,t,i){const s=oi(Qt(e.r)),n=oi(Qt(e.g)),r=oi(Qt(e.b));return{r:xe(sr(s+i*(oi(Qt(t.r))-s))),g:xe(sr(n+i*(oi(Qt(t.g))-n))),b:xe(sr(r+i*(oi(Qt(t.b))-r))),a:e.a+i*(t.a-e.a)}}function Rs(e,t,i){if(e){let s=lo(e);s[t]=Math.max(0,Math.min(s[t]+s[t]*i,t===0?360:1)),s=ho(s),e.r=s[0],e.g=s[1],e.b=s[2]}}function ph(e,t){return e&&Object.assign(t||{},e)}function ba(e){var t={r:0,g:0,b:0,a:255};return Array.isArray(e)?e.length>=3&&(t={r:e[0],g:e[1],b:e[2],a:255},e.length>3&&(t.a=xe(e[3]))):(t=ph(e,{r:0,g:0,b:0,a:1}),t.a=xe(t.a)),t}function Eb(e){return e.charAt(0)==="r"?Mb(e):xb(e)}class gi{constructor(t){if(t instanceof gi)return t;const i=typeof t;let s;i==="object"?s=ba(t):i==="string"&&(s=db(t)||Cb(t)||Eb(t)),this._rgb=s,this._valid=!!s}get valid(){return this._valid}get rgb(){var t=ph(this._rgb);return t&&(t.a=Qt(t.a)),t}set rgb(t){this._rgb=ba(t)}rgbString(){return this._valid?Ab(this._rgb):void 0}hexString(){return this._valid?pb(this._rgb):void 0}hslString(){return this._valid?wb(this._rgb):void 0}mix(t,i){if(t){const s=this.rgb,n=t.rgb;let r;const o=i===r?.5:i,a=2*o-1,l=s.a-n.a,c=((a*l===-1?a:(a+l)/(1+a*l))+1)/2;r=1-c,s.r=255&c*s.r+r*n.r+.5,s.g=255&c*s.g+r*n.g+.5,s.b=255&c*s.b+r*n.b+.5,s.a=o*s.a+(1-o)*n.a,this.rgb=s}return this}interpolate(t,i){return t&&(this._rgb=$b(this._rgb,t._rgb,i)),this}clone(){return new gi(this.rgb)}alpha(t){return this._rgb.a=xe(t),this}clearer(t){const i=this._rgb;return i.a*=1-t,this}greyscale(){const t=this._rgb,i=$s(t.r*.3+t.g*.59+t.b*.11);return t.r=t.g=t.b=i,this}opaquer(t){const i=this._rgb;return i.a*=1+t,this}negate(){const t=this._rgb;return t.r=255-t.r,t.g=255-t.g,t.b=255-t.b,this}lighten(t){return Rs(this._rgb,2,t),this}darken(t){return Rs(this._rgb,2,-t),this}saturate(t){return Rs(this._rgb,1,t),this}desaturate(t){return Rs(this._rgb,1,-t),this}rotate(t){return _b(this._rgb,t),this}}function Pb(e){return new gi(e)}function Kt(){}const Db=(()=>{let e=0;return()=>e++})();function z(e){return e==null}function Y(e){if(Array.isArray&&Array.isArray(e))return!0;const t=Object.prototype.toString.call(e);return t.slice(0,7)==="[object"&&t.slice(-6)==="Array]"}function B(e){return e!==null&&Object.prototype.toString.call(e)==="[object Object]"}function tt(e){return(typeof e=="number"||e instanceof Number)&&isFinite(+e)}function kt(e,t){return tt(e)?e:t}function L(e,t){return typeof e>"u"?t:e}const Ob=(e,t)=>typeof e=="string"&&e.endsWith("%")?parseFloat(e)/100:+e/t,fh=(e,t)=>typeof e=="string"&&e.endsWith("%")?parseFloat(e)/100*t:+e;function U(e,t,i){if(e&&typeof e.call=="function")return e.apply(i,t)}function N(e,t,i,s){let n,r,o;if(Y(e))for(r=e.length,n=0;n<r;n++)t.call(i,e[n],n);else if(B(e))for(o=Object.keys(e),r=o.length,n=0;n<r;n++)t.call(i,e[o[n]],o[n])}function xn(e,t){let i,s,n,r;if(!e||!t||e.length!==t.length)return!1;for(i=0,s=e.length;i<s;++i)if(n=e[i],r=t[i],n.datasetIndex!==r.datasetIndex||n.index!==r.index)return!1;return!0}function _n(e){if(Y(e))return e.map(_n);if(B(e)){const t=Object.create(null),i=Object.keys(e),s=i.length;let n=0;for(;n<s;++n)t[i[n]]=_n(e[i[n]]);return t}return e}function bh(e){return["__proto__","prototype","constructor"].indexOf(e)===-1}function Tb(e,t,i,s){if(!bh(e))return;const n=t[e],r=i[e];B(n)&&B(r)?Ut(n,r,s):t[e]=_n(r)}function Ut(e,t,i){const s=Y(t)?t:[t],n=s.length;if(!B(e))return e;i=i||{};const r=i.merger||Tb;let o;for(let a=0;a<n;++a){if(o=s[a],!B(o))continue;const l=Object.keys(o);for(let c=0,h=l.length;c<h;++c)r(l[c],e,o,i)}return e}function Ki(e,t){return Ut(e,t,{merger:Lb})}function Lb(e,t,i){if(!bh(e))return;const s=t[e],n=i[e];B(s)&&B(n)?Ki(s,n):Object.prototype.hasOwnProperty.call(t,e)||(t[e]=_n(n))}const ma={"":e=>e,x:e=>e.x,y:e=>e.y};function zb(e){const t=e.split("."),i=[];let s="";for(const n of t)s+=n,s.endsWith("\\")?s=s.slice(0,-1)+".":(i.push(s),s="");return i}function Rb(e){const t=zb(e);return i=>{for(const s of t){if(s==="")break;i=i&&i[s]}return i}}function ke(e,t){return(ma[t]||(ma[t]=Rb(t)))(e)}function uo(e){return e.charAt(0).toUpperCase()+e.slice(1)}const cs=e=>typeof e<"u",Ce=e=>typeof e=="function",ga=(e,t)=>{if(e.size!==t.size)return!1;for(const i of e)if(!t.has(i))return!1;return!0};function Ib(e){return e.type==="mouseup"||e.type==="click"||e.type==="contextmenu"}const j=Math.PI,K=2*j,Bb=K+j,wn=Number.POSITIVE_INFINITY,Fb=j/180,st=j/2,Re=j/4,va=j*2/3,me=Math.log10,Vt=Math.sign;function Gi(e,t,i){return Math.abs(e-t)<i}function ya(e){const t=Math.round(e);e=Gi(e,t,e/1e3)?t:e;const i=Math.pow(10,Math.floor(me(e))),s=e/i;return(s<=1?1:s<=2?2:s<=5?5:10)*i}function Hb(e){const t=[],i=Math.sqrt(e);let s;for(s=1;s<i;s++)e%s===0&&(t.push(s),t.push(e/s));return i===(i|0)&&t.push(i),t.sort((n,r)=>n-r).pop(),t}function jb(e){return typeof e=="symbol"||typeof e=="object"&&e!==null&&!(Symbol.toPrimitive in e||"toString"in e||"valueOf"in e)}function vi(e){return!jb(e)&&!isNaN(parseFloat(e))&&isFinite(e)}function Vb(e,t){const i=Math.round(e);return i-t<=e&&i+t>=e}function mh(e,t,i){let s,n,r;for(s=0,n=e.length;s<n;s++)r=e[s][i],isNaN(r)||(t.min=Math.min(t.min,r),t.max=Math.max(t.max,r))}function Rt(e){return e*(j/180)}function po(e){return e*(180/j)}function xa(e){if(!tt(e))return;let t=1,i=0;for(;Math.round(e*t)/t!==e;)t*=10,i++;return i}function gh(e,t){const i=t.x-e.x,s=t.y-e.y,n=Math.sqrt(i*i+s*s);let r=Math.atan2(s,i);return r<-.5*j&&(r+=K),{angle:r,distance:n}}function Dr(e,t){return Math.sqrt(Math.pow(t.x-e.x,2)+Math.pow(t.y-e.y,2))}function Nb(e,t){return(e-t+Bb)%K-j}function ft(e){return(e%K+K)%K}function hs(e,t,i,s){const n=ft(e),r=ft(t),o=ft(i),a=ft(r-n),l=ft(o-n),c=ft(n-r),h=ft(n-o);return n===r||n===o||s&&r===o||a>l&&c<h}function ct(e,t,i){return Math.max(t,Math.min(i,e))}function Wb(e){return ct(e,-32768,32767)}function ie(e,t,i,s=1e-6){return e>=Math.min(t,i)-s&&e<=Math.max(t,i)+s}function fo(e,t,i){i=i||(o=>e[o]<t);let s=e.length-1,n=0,r;for(;s-n>1;)r=n+s>>1,i(r)?n=r:s=r;return{lo:n,hi:s}}const se=(e,t,i,s)=>fo(e,i,s?n=>{const r=e[n][t];return r<i||r===i&&e[n+1][t]===i}:n=>e[n][t]<i),Ub=(e,t,i)=>fo(e,i,s=>e[s][t]>=i);function qb(e,t,i){let s=0,n=e.length;for(;s<n&&e[s]<t;)s++;for(;n>s&&e[n-1]>i;)n--;return s>0||n<e.length?e.slice(s,n):e}const vh=["push","pop","shift","splice","unshift"];function Yb(e,t){if(e._chartjs){e._chartjs.listeners.push(t);return}Object.defineProperty(e,"_chartjs",{configurable:!0,enumerable:!1,value:{listeners:[t]}}),vh.forEach(i=>{const s="_onData"+uo(i),n=e[i];Object.defineProperty(e,i,{configurable:!0,enumerable:!1,value(...r){const o=n.apply(this,r);return e._chartjs.listeners.forEach(a=>{typeof a[s]=="function"&&a[s](...r)}),o}})})}function _a(e,t){const i=e._chartjs;if(!i)return;const s=i.listeners,n=s.indexOf(t);n!==-1&&s.splice(n,1),!(s.length>0)&&(vh.forEach(r=>{delete e[r]}),delete e._chartjs)}function yh(e){const t=new Set(e);return t.size===e.length?e:Array.from(t)}const xh=(function(){return typeof window>"u"?function(e){return e()}:window.requestAnimationFrame})();function _h(e,t){let i=[],s=!1;return function(...n){i=n,s||(s=!0,xh.call(window,()=>{s=!1,e.apply(t,i)}))}}function Kb(e,t){let i;return function(...s){return t?(clearTimeout(i),i=setTimeout(e,t,s)):e.apply(this,s),t}}const bo=e=>e==="start"?"left":e==="end"?"right":"center",pt=(e,t,i)=>e==="start"?t:e==="end"?i:(t+i)/2,Gb=(e,t,i,s)=>e===(s?"left":"right")?i:e==="center"?(t+i)/2:t;function wh(e,t,i){const s=t.length;let n=0,r=s;if(e._sorted){const{iScale:o,vScale:a,_parsed:l}=e,c=e.dataset&&e.dataset.options?e.dataset.options.spanGaps:null,h=o.axis,{min:d,max:u,minDefined:p,maxDefined:b}=o.getUserBounds();if(p){if(n=Math.min(se(l,h,d).lo,i?s:se(t,h,o.getPixelForValue(d)).lo),c){const f=l.slice(0,n+1).reverse().findIndex(m=>!z(m[a.axis]));n-=Math.max(0,f)}n=ct(n,0,s-1)}if(b){let f=Math.max(se(l,o.axis,u,!0).hi+1,i?0:se(t,h,o.getPixelForValue(u),!0).hi+1);if(c){const m=l.slice(f-1).findIndex(g=>!z(g[a.axis]));f+=Math.max(0,m)}r=ct(f,n,s)-n}else r=s-n}return{start:n,count:r}}function kh(e){const{xScale:t,yScale:i,_scaleRanges:s}=e,n={xmin:t.min,xmax:t.max,ymin:i.min,ymax:i.max};if(!s)return e._scaleRanges=n,!0;const r=s.xmin!==t.min||s.xmax!==t.max||s.ymin!==i.min||s.ymax!==i.max;return Object.assign(s,n),r}const Is=e=>e===0||e===1,wa=(e,t,i)=>-(Math.pow(2,10*(e-=1))*Math.sin((e-t)*K/i)),ka=(e,t,i)=>Math.pow(2,-10*e)*Math.sin((e-t)*K/i)+1,Xi={linear:e=>e,easeInQuad:e=>e*e,easeOutQuad:e=>-e*(e-2),easeInOutQuad:e=>(e/=.5)<1?.5*e*e:-.5*(--e*(e-2)-1),easeInCubic:e=>e*e*e,easeOutCubic:e=>(e-=1)*e*e+1,easeInOutCubic:e=>(e/=.5)<1?.5*e*e*e:.5*((e-=2)*e*e+2),easeInQuart:e=>e*e*e*e,easeOutQuart:e=>-((e-=1)*e*e*e-1),easeInOutQuart:e=>(e/=.5)<1?.5*e*e*e*e:-.5*((e-=2)*e*e*e-2),easeInQuint:e=>e*e*e*e*e,easeOutQuint:e=>(e-=1)*e*e*e*e+1,easeInOutQuint:e=>(e/=.5)<1?.5*e*e*e*e*e:.5*((e-=2)*e*e*e*e+2),easeInSine:e=>-Math.cos(e*st)+1,easeOutSine:e=>Math.sin(e*st),easeInOutSine:e=>-.5*(Math.cos(j*e)-1),easeInExpo:e=>e===0?0:Math.pow(2,10*(e-1)),easeOutExpo:e=>e===1?1:-Math.pow(2,-10*e)+1,easeInOutExpo:e=>Is(e)?e:e<.5?.5*Math.pow(2,10*(e*2-1)):.5*(-Math.pow(2,-10*(e*2-1))+2),easeInCirc:e=>e>=1?e:-(Math.sqrt(1-e*e)-1),easeOutCirc:e=>Math.sqrt(1-(e-=1)*e),easeInOutCirc:e=>(e/=.5)<1?-.5*(Math.sqrt(1-e*e)-1):.5*(Math.sqrt(1-(e-=2)*e)+1),easeInElastic:e=>Is(e)?e:wa(e,.075,.3),easeOutElastic:e=>Is(e)?e:ka(e,.075,.3),easeInOutElastic(e){return Is(e)?e:e<.5?.5*wa(e*2,.1125,.45):.5+.5*ka(e*2-1,.1125,.45)},easeInBack(e){return e*e*((1.70158+1)*e-1.70158)},easeOutBack(e){return(e-=1)*e*((1.70158+1)*e+1.70158)+1},easeInOutBack(e){let t=1.70158;return(e/=.5)<1?.5*(e*e*(((t*=1.525)+1)*e-t)):.5*((e-=2)*e*(((t*=1.525)+1)*e+t)+2)},easeInBounce:e=>1-Xi.easeOutBounce(1-e),easeOutBounce(e){return e<1/2.75?7.5625*e*e:e<2/2.75?7.5625*(e-=1.5/2.75)*e+.75:e<2.5/2.75?7.5625*(e-=2.25/2.75)*e+.9375:7.5625*(e-=2.625/2.75)*e+.984375},easeInOutBounce:e=>e<.5?Xi.easeInBounce(e*2)*.5:Xi.easeOutBounce(e*2-1)*.5+.5};function mo(e){if(e&&typeof e=="object"){const t=e.toString();return t==="[object CanvasPattern]"||t==="[object CanvasGradient]"}return!1}function Ca(e){return mo(e)?e:new gi(e)}function nr(e){return mo(e)?e:new gi(e).saturate(.5).darken(.1).hexString()}const Xb=["x","y","borderWidth","radius","tension"],Qb=["color","borderColor","backgroundColor"];function Zb(e){e.set("animation",{delay:void 0,duration:1e3,easing:"easeOutQuart",fn:void 0,from:void 0,loop:void 0,to:void 0,type:void 0}),e.describe("animation",{_fallback:!1,_indexable:!1,_scriptable:t=>t!=="onProgress"&&t!=="onComplete"&&t!=="fn"}),e.set("animations",{colors:{type:"color",properties:Qb},numbers:{type:"number",properties:Xb}}),e.describe("animations",{_fallback:"animation"}),e.set("transitions",{active:{animation:{duration:400}},resize:{animation:{duration:0}},show:{animations:{colors:{from:"transparent"},visible:{type:"boolean",duration:0}}},hide:{animations:{colors:{to:"transparent"},visible:{type:"boolean",easing:"linear",fn:t=>t|0}}}})}function Jb(e){e.set("layout",{autoPadding:!0,padding:{top:0,right:0,bottom:0,left:0}})}const Sa=new Map;function tm(e,t){t=t||{};const i=e+JSON.stringify(t);let s=Sa.get(i);return s||(s=new Intl.NumberFormat(e,t),Sa.set(i,s)),s}function Es(e,t,i){return tm(t,i).format(e)}const Ch={values(e){return Y(e)?e:""+e},numeric(e,t,i){if(e===0)return"0";const s=this.chart.options.locale;let n,r=e;if(i.length>1){const c=Math.max(Math.abs(i[0].value),Math.abs(i[i.length-1].value));(c<1e-4||c>1e15)&&(n="scientific"),r=em(e,i)}const o=me(Math.abs(r)),a=isNaN(o)?1:Math.max(Math.min(-1*Math.floor(o),20),0),l={notation:n,minimumFractionDigits:a,maximumFractionDigits:a};return Object.assign(l,this.options.ticks.format),Es(e,s,l)},logarithmic(e,t,i){if(e===0)return"0";const s=i[t].significand||e/Math.pow(10,Math.floor(me(e)));return[1,2,3,5,10,15].includes(s)||t>.8*i.length?Ch.numeric.call(this,e,t,i):""}};function em(e,t){let i=t.length>3?t[2].value-t[1].value:t[1].value-t[0].value;return Math.abs(i)>=1&&e!==Math.floor(e)&&(i=e-Math.floor(e)),i}var jn={formatters:Ch};function im(e){e.set("scale",{display:!0,offset:!1,reverse:!1,beginAtZero:!1,bounds:"ticks",clip:!0,grace:0,grid:{display:!0,lineWidth:1,drawOnChartArea:!0,drawTicks:!0,tickLength:8,tickWidth:(t,i)=>i.lineWidth,tickColor:(t,i)=>i.color,offset:!1},border:{display:!0,dash:[],dashOffset:0,width:1},title:{display:!1,text:"",padding:{top:4,bottom:4}},ticks:{minRotation:0,maxRotation:50,mirror:!1,textStrokeWidth:0,textStrokeColor:"",padding:3,display:!0,autoSkip:!0,autoSkipPadding:3,labelOffset:0,callback:jn.formatters.values,minor:{},major:{},align:"center",crossAlign:"near",showLabelBackdrop:!1,backdropColor:"rgba(255, 255, 255, 0.75)",backdropPadding:2}}),e.route("scale.ticks","color","","color"),e.route("scale.grid","color","","borderColor"),e.route("scale.border","color","","borderColor"),e.route("scale.title","color","","color"),e.describe("scale",{_fallback:!1,_scriptable:t=>!t.startsWith("before")&&!t.startsWith("after")&&t!=="callback"&&t!=="parser",_indexable:t=>t!=="borderDash"&&t!=="tickBorderDash"&&t!=="dash"}),e.describe("scales",{_fallback:"scale"}),e.describe("scale.ticks",{_scriptable:t=>t!=="backdropPadding"&&t!=="callback",_indexable:t=>t!=="backdropPadding"})}const Ye=Object.create(null),Or=Object.create(null);function Qi(e,t){if(!t)return e;const i=t.split(".");for(let s=0,n=i.length;s<n;++s){const r=i[s];e=e[r]||(e[r]=Object.create(null))}return e}function rr(e,t,i){return typeof t=="string"?Ut(Qi(e,t),i):Ut(Qi(e,""),t)}class sm{constructor(t,i){this.animation=void 0,this.backgroundColor="rgba(0,0,0,0.1)",this.borderColor="rgba(0,0,0,0.1)",this.color="#666",this.datasets={},this.devicePixelRatio=s=>s.chart.platform.getDevicePixelRatio(),this.elements={},this.events=["mousemove","mouseout","click","touchstart","touchmove"],this.font={family:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",size:12,style:"normal",lineHeight:1.2,weight:null},this.hover={},this.hoverBackgroundColor=(s,n)=>nr(n.backgroundColor),this.hoverBorderColor=(s,n)=>nr(n.borderColor),this.hoverColor=(s,n)=>nr(n.color),this.indexAxis="x",this.interaction={mode:"nearest",intersect:!0,includeInvisible:!1},this.maintainAspectRatio=!0,this.onHover=null,this.onClick=null,this.parsing=!0,this.plugins={},this.responsive=!0,this.scale=void 0,this.scales={},this.showLine=!0,this.drawActiveElementsOnTop=!0,this.describe(t),this.apply(i)}set(t,i){return rr(this,t,i)}get(t){return Qi(this,t)}describe(t,i){return rr(Or,t,i)}override(t,i){return rr(Ye,t,i)}route(t,i,s,n){const r=Qi(this,t),o=Qi(this,s),a="_"+i;Object.defineProperties(r,{[a]:{value:r[i],writable:!0},[i]:{enumerable:!0,get(){const l=this[a],c=o[n];return B(l)?Object.assign({},c,l):L(l,c)},set(l){this[a]=l}}})}apply(t){t.forEach(i=>i(this))}}var G=new sm({_scriptable:e=>!e.startsWith("on"),_indexable:e=>e!=="events",hover:{_fallback:"interaction"},interaction:{_scriptable:!1,_indexable:!1}},[Zb,Jb,im]);function nm(e){return!e||z(e.size)||z(e.family)?null:(e.style?e.style+" ":"")+(e.weight?e.weight+" ":"")+e.size+"px "+e.family}function kn(e,t,i,s,n){let r=t[n];return r||(r=t[n]=e.measureText(n).width,i.push(n)),r>s&&(s=r),s}function rm(e,t,i,s){s=s||{};let n=s.data=s.data||{},r=s.garbageCollect=s.garbageCollect||[];s.font!==t&&(n=s.data={},r=s.garbageCollect=[],s.font=t),e.save(),e.font=t;let o=0;const a=i.length;let l,c,h,d,u;for(l=0;l<a;l++)if(d=i[l],d!=null&&!Y(d))o=kn(e,n,r,o,d);else if(Y(d))for(c=0,h=d.length;c<h;c++)u=d[c],u!=null&&!Y(u)&&(o=kn(e,n,r,o,u));e.restore();const p=r.length/2;if(p>i.length){for(l=0;l<p;l++)delete n[r[l]];r.splice(0,p)}return o}function Ie(e,t,i){const s=e.currentDevicePixelRatio,n=i!==0?Math.max(i/2,.5):0;return Math.round((t-n)*s)/s+n}function Ma(e,t){!t&&!e||(t=t||e.getContext("2d"),t.save(),t.resetTransform(),t.clearRect(0,0,e.width,e.height),t.restore())}function Tr(e,t,i,s){Sh(e,t,i,s,null)}function Sh(e,t,i,s,n){let r,o,a,l,c,h,d,u;const p=t.pointStyle,b=t.rotation,f=t.radius;let m=(b||0)*Fb;if(p&&typeof p=="object"&&(r=p.toString(),r==="[object HTMLImageElement]"||r==="[object HTMLCanvasElement]")){e.save(),e.translate(i,s),e.rotate(m),e.drawImage(p,-p.width/2,-p.height/2,p.width,p.height),e.restore();return}if(!(isNaN(f)||f<=0)){switch(e.beginPath(),p){default:n?e.ellipse(i,s,n/2,f,0,0,K):e.arc(i,s,f,0,K),e.closePath();break;case"triangle":h=n?n/2:f,e.moveTo(i+Math.sin(m)*h,s-Math.cos(m)*f),m+=va,e.lineTo(i+Math.sin(m)*h,s-Math.cos(m)*f),m+=va,e.lineTo(i+Math.sin(m)*h,s-Math.cos(m)*f),e.closePath();break;case"rectRounded":c=f*.516,l=f-c,o=Math.cos(m+Re)*l,d=Math.cos(m+Re)*(n?n/2-c:l),a=Math.sin(m+Re)*l,u=Math.sin(m+Re)*(n?n/2-c:l),e.arc(i-d,s-a,c,m-j,m-st),e.arc(i+u,s-o,c,m-st,m),e.arc(i+d,s+a,c,m,m+st),e.arc(i-u,s+o,c,m+st,m+j),e.closePath();break;case"rect":if(!b){l=Math.SQRT1_2*f,h=n?n/2:l,e.rect(i-h,s-l,2*h,2*l);break}m+=Re;case"rectRot":d=Math.cos(m)*(n?n/2:f),o=Math.cos(m)*f,a=Math.sin(m)*f,u=Math.sin(m)*(n?n/2:f),e.moveTo(i-d,s-a),e.lineTo(i+u,s-o),e.lineTo(i+d,s+a),e.lineTo(i-u,s+o),e.closePath();break;case"crossRot":m+=Re;case"cross":d=Math.cos(m)*(n?n/2:f),o=Math.cos(m)*f,a=Math.sin(m)*f,u=Math.sin(m)*(n?n/2:f),e.moveTo(i-d,s-a),e.lineTo(i+d,s+a),e.moveTo(i+u,s-o),e.lineTo(i-u,s+o);break;case"star":d=Math.cos(m)*(n?n/2:f),o=Math.cos(m)*f,a=Math.sin(m)*f,u=Math.sin(m)*(n?n/2:f),e.moveTo(i-d,s-a),e.lineTo(i+d,s+a),e.moveTo(i+u,s-o),e.lineTo(i-u,s+o),m+=Re,d=Math.cos(m)*(n?n/2:f),o=Math.cos(m)*f,a=Math.sin(m)*f,u=Math.sin(m)*(n?n/2:f),e.moveTo(i-d,s-a),e.lineTo(i+d,s+a),e.moveTo(i+u,s-o),e.lineTo(i-u,s+o);break;case"line":o=n?n/2:Math.cos(m)*f,a=Math.sin(m)*f,e.moveTo(i-o,s-a),e.lineTo(i+o,s+a);break;case"dash":e.moveTo(i,s),e.lineTo(i+Math.cos(m)*(n?n/2:f),s+Math.sin(m)*f);break;case!1:e.closePath();break}e.fill(),t.borderWidth>0&&e.stroke()}}function ne(e,t,i){return i=i||.5,!t||e&&e.x>t.left-i&&e.x<t.right+i&&e.y>t.top-i&&e.y<t.bottom+i}function Vn(e,t){e.save(),e.beginPath(),e.rect(t.left,t.top,t.right-t.left,t.bottom-t.top),e.clip()}function Nn(e){e.restore()}function om(e,t,i,s,n){if(!t)return e.lineTo(i.x,i.y);if(n==="middle"){const r=(t.x+i.x)/2;e.lineTo(r,t.y),e.lineTo(r,i.y)}else n==="after"!=!!s?e.lineTo(t.x,i.y):e.lineTo(i.x,t.y);e.lineTo(i.x,i.y)}function am(e,t,i,s){if(!t)return e.lineTo(i.x,i.y);e.bezierCurveTo(s?t.cp1x:t.cp2x,s?t.cp1y:t.cp2y,s?i.cp2x:i.cp1x,s?i.cp2y:i.cp1y,i.x,i.y)}function lm(e,t){t.translation&&e.translate(t.translation[0],t.translation[1]),z(t.rotation)||e.rotate(t.rotation),t.color&&(e.fillStyle=t.color),t.textAlign&&(e.textAlign=t.textAlign),t.textBaseline&&(e.textBaseline=t.textBaseline)}function cm(e,t,i,s,n){if(n.strikethrough||n.underline){const r=e.measureText(s),o=t-r.actualBoundingBoxLeft,a=t+r.actualBoundingBoxRight,l=i-r.actualBoundingBoxAscent,c=i+r.actualBoundingBoxDescent,h=n.strikethrough?(l+c)/2:c;e.strokeStyle=e.fillStyle,e.beginPath(),e.lineWidth=n.decorationWidth||2,e.moveTo(o,h),e.lineTo(a,h),e.stroke()}}function hm(e,t){const i=e.fillStyle;e.fillStyle=t.color,e.fillRect(t.left,t.top,t.width,t.height),e.fillStyle=i}function Ke(e,t,i,s,n,r={}){const o=Y(t)?t:[t],a=r.strokeWidth>0&&r.strokeColor!=="";let l,c;for(e.save(),e.font=n.string,lm(e,r),l=0;l<o.length;++l)c=o[l],r.backdrop&&hm(e,r.backdrop),a&&(r.strokeColor&&(e.strokeStyle=r.strokeColor),z(r.strokeWidth)||(e.lineWidth=r.strokeWidth),e.strokeText(c,i,s,r.maxWidth)),e.fillText(c,i,s,r.maxWidth),cm(e,i,s,c,r),s+=Number(n.lineHeight);e.restore()}function ds(e,t){const{x:i,y:s,w:n,h:r,radius:o}=t;e.arc(i+o.topLeft,s+o.topLeft,o.topLeft,1.5*j,j,!0),e.lineTo(i,s+r-o.bottomLeft),e.arc(i+o.bottomLeft,s+r-o.bottomLeft,o.bottomLeft,j,st,!0),e.lineTo(i+n-o.bottomRight,s+r),e.arc(i+n-o.bottomRight,s+r-o.bottomRight,o.bottomRight,st,0,!0),e.lineTo(i+n,s+o.topRight),e.arc(i+n-o.topRight,s+o.topRight,o.topRight,0,-st,!0),e.lineTo(i+o.topLeft,s)}const dm=/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/,um=/^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;function pm(e,t){const i=(""+e).match(dm);if(!i||i[1]==="normal")return t*1.2;switch(e=+i[2],i[3]){case"px":return e;case"%":e/=100;break}return t*e}const fm=e=>+e||0;function go(e,t){const i={},s=B(t),n=s?Object.keys(t):t,r=B(e)?s?o=>L(e[o],e[t[o]]):o=>e[o]:()=>e;for(const o of n)i[o]=fm(r(o));return i}function Mh(e){return go(e,{top:"y",right:"x",bottom:"y",left:"x"})}function We(e){return go(e,["topLeft","topRight","bottomLeft","bottomRight"])}function dt(e){const t=Mh(e);return t.width=t.left+t.right,t.height=t.top+t.bottom,t}function at(e,t){e=e||{},t=t||G.font;let i=L(e.size,t.size);typeof i=="string"&&(i=parseInt(i,10));let s=L(e.style,t.style);s&&!(""+s).match(um)&&(console.warn('Invalid font style specified: "'+s+'"'),s=void 0);const n={family:L(e.family,t.family),lineHeight:pm(L(e.lineHeight,t.lineHeight),i),size:i,style:s,weight:L(e.weight,t.weight),string:""};return n.string=nm(n),n}function q(e,t,i,s){let n,r,o;for(n=0,r=e.length;n<r;++n)if(o=e[n],o!==void 0&&(t!==void 0&&typeof o=="function"&&(o=o(t)),i!==void 0&&Y(o)&&(o=o[i%o.length]),o!==void 0))return o}function bm(e,t,i){const{min:s,max:n}=e,r=fh(t,(n-s)/2),o=(a,l)=>i&&a===0?0:a+l;return{min:o(s,-Math.abs(r)),max:o(n,r)}}function Pe(e,t){return Object.assign(Object.create(e),t)}function vo(e,t=[""],i,s,n=()=>e[0]){const r=i||e;typeof s>"u"&&(s=Ph("_fallback",e));const o={[Symbol.toStringTag]:"Object",_cacheable:!0,_scopes:e,_rootScopes:r,_fallback:s,_getTarget:n,override:a=>vo([a,...e],t,r,s)};return new Proxy(o,{deleteProperty(a,l){return delete a[l],delete a._keys,delete e[0][l],!0},get(a,l){return $h(a,l,()=>km(l,t,e,a))},getOwnPropertyDescriptor(a,l){return Reflect.getOwnPropertyDescriptor(a._scopes[0],l)},getPrototypeOf(){return Reflect.getPrototypeOf(e[0])},has(a,l){return $a(a).includes(l)},ownKeys(a){return $a(a)},set(a,l,c){const h=a._storage||(a._storage=n());return a[l]=h[l]=c,delete a._keys,!0}})}function yi(e,t,i,s){const n={_cacheable:!1,_proxy:e,_context:t,_subProxy:i,_stack:new Set,_descriptors:Ah(e,s),setContext:r=>yi(e,r,i,s),override:r=>yi(e.override(r),t,i,s)};return new Proxy(n,{deleteProperty(r,o){return delete r[o],delete e[o],!0},get(r,o,a){return $h(r,o,()=>gm(r,o,a))},getOwnPropertyDescriptor(r,o){return r._descriptors.allKeys?Reflect.has(e,o)?{enumerable:!0,configurable:!0}:void 0:Reflect.getOwnPropertyDescriptor(e,o)},getPrototypeOf(){return Reflect.getPrototypeOf(e)},has(r,o){return Reflect.has(e,o)},ownKeys(){return Reflect.ownKeys(e)},set(r,o,a){return e[o]=a,delete r[o],!0}})}function Ah(e,t={scriptable:!0,indexable:!0}){const{_scriptable:i=t.scriptable,_indexable:s=t.indexable,_allKeys:n=t.allKeys}=e;return{allKeys:n,scriptable:i,indexable:s,isScriptable:Ce(i)?i:()=>i,isIndexable:Ce(s)?s:()=>s}}const mm=(e,t)=>e?e+uo(t):t,yo=(e,t)=>B(t)&&e!=="adapters"&&(Object.getPrototypeOf(t)===null||t.constructor===Object);function $h(e,t,i){if(Object.prototype.hasOwnProperty.call(e,t)||t==="constructor")return e[t];const s=i();return e[t]=s,s}function gm(e,t,i){const{_proxy:s,_context:n,_subProxy:r,_descriptors:o}=e;let a=s[t];return Ce(a)&&o.isScriptable(t)&&(a=vm(t,a,e,i)),Y(a)&&a.length&&(a=ym(t,a,e,o.isIndexable)),yo(t,a)&&(a=yi(a,n,r&&r[t],o)),a}function vm(e,t,i,s){const{_proxy:n,_context:r,_subProxy:o,_stack:a}=i;if(a.has(e))throw new Error("Recursion detected: "+Array.from(a).join("->")+"->"+e);a.add(e);let l=t(r,o||s);return a.delete(e),yo(e,l)&&(l=xo(n._scopes,n,e,l)),l}function ym(e,t,i,s){const{_proxy:n,_context:r,_subProxy:o,_descriptors:a}=i;if(typeof r.index<"u"&&s(e))return t[r.index%t.length];if(B(t[0])){const l=t,c=n._scopes.filter(h=>h!==l);t=[];for(const h of l){const d=xo(c,n,e,h);t.push(yi(d,r,o&&o[e],a))}}return t}function Eh(e,t,i){return Ce(e)?e(t,i):e}const xm=(e,t)=>e===!0?t:typeof e=="string"?ke(t,e):void 0;function _m(e,t,i,s,n){for(const r of t){const o=xm(i,r);if(o){e.add(o);const a=Eh(o._fallback,i,n);if(typeof a<"u"&&a!==i&&a!==s)return a}else if(o===!1&&typeof s<"u"&&i!==s)return null}return!1}function xo(e,t,i,s){const n=t._rootScopes,r=Eh(t._fallback,i,s),o=[...e,...n],a=new Set;a.add(s);let l=Aa(a,o,i,r||i,s);return l===null||typeof r<"u"&&r!==i&&(l=Aa(a,o,r,l,s),l===null)?!1:vo(Array.from(a),[""],n,r,()=>wm(t,i,s))}function Aa(e,t,i,s,n){for(;i;)i=_m(e,t,i,s,n);return i}function wm(e,t,i){const s=e._getTarget();t in s||(s[t]={});const n=s[t];return Y(n)&&B(i)?i:n||{}}function km(e,t,i,s){let n;for(const r of t)if(n=Ph(mm(r,e),i),typeof n<"u")return yo(e,n)?xo(i,s,e,n):n}function Ph(e,t){for(const i of t){if(!i)continue;const s=i[e];if(typeof s<"u")return s}}function $a(e){let t=e._keys;return t||(t=e._keys=Cm(e._scopes)),t}function Cm(e){const t=new Set;for(const i of e)for(const s of Object.keys(i).filter(n=>!n.startsWith("_")))t.add(s);return Array.from(t)}function Dh(e,t,i,s){const{iScale:n}=e,{key:r="r"}=this._parsing,o=new Array(s);let a,l,c,h;for(a=0,l=s;a<l;++a)c=a+i,h=t[c],o[a]={r:n.parse(ke(h,r),c)};return o}const Sm=Number.EPSILON||1e-14,xi=(e,t)=>t<e.length&&!e[t].skip&&e[t],Oh=e=>e==="x"?"y":"x";function Mm(e,t,i,s){const n=e.skip?t:e,r=t,o=i.skip?t:i,a=Dr(r,n),l=Dr(o,r);let c=a/(a+l),h=l/(a+l);c=isNaN(c)?0:c,h=isNaN(h)?0:h;const d=s*c,u=s*h;return{previous:{x:r.x-d*(o.x-n.x),y:r.y-d*(o.y-n.y)},next:{x:r.x+u*(o.x-n.x),y:r.y+u*(o.y-n.y)}}}function Am(e,t,i){const s=e.length;let n,r,o,a,l,c=xi(e,0);for(let h=0;h<s-1;++h)if(l=c,c=xi(e,h+1),!(!l||!c)){if(Gi(t[h],0,Sm)){i[h]=i[h+1]=0;continue}n=i[h]/t[h],r=i[h+1]/t[h],a=Math.pow(n,2)+Math.pow(r,2),!(a<=9)&&(o=3/Math.sqrt(a),i[h]=n*o*t[h],i[h+1]=r*o*t[h])}}function $m(e,t,i="x"){const s=Oh(i),n=e.length;let r,o,a,l=xi(e,0);for(let c=0;c<n;++c){if(o=a,a=l,l=xi(e,c+1),!a)continue;const h=a[i],d=a[s];o&&(r=(h-o[i])/3,a[`cp1${i}`]=h-r,a[`cp1${s}`]=d-r*t[c]),l&&(r=(l[i]-h)/3,a[`cp2${i}`]=h+r,a[`cp2${s}`]=d+r*t[c])}}function Em(e,t="x"){const i=Oh(t),s=e.length,n=Array(s).fill(0),r=Array(s);let o,a,l,c=xi(e,0);for(o=0;o<s;++o)if(a=l,l=c,c=xi(e,o+1),!!l){if(c){const h=c[t]-l[t];n[o]=h!==0?(c[i]-l[i])/h:0}r[o]=a?c?Vt(n[o-1])!==Vt(n[o])?0:(n[o-1]+n[o])/2:n[o-1]:n[o]}Am(e,n,r),$m(e,r,t)}function Bs(e,t,i){return Math.max(Math.min(e,i),t)}function Pm(e,t){let i,s,n,r,o,a=ne(e[0],t);for(i=0,s=e.length;i<s;++i)o=r,r=a,a=i<s-1&&ne(e[i+1],t),r&&(n=e[i],o&&(n.cp1x=Bs(n.cp1x,t.left,t.right),n.cp1y=Bs(n.cp1y,t.top,t.bottom)),a&&(n.cp2x=Bs(n.cp2x,t.left,t.right),n.cp2y=Bs(n.cp2y,t.top,t.bottom)))}function Dm(e,t,i,s,n){let r,o,a,l;if(t.spanGaps&&(e=e.filter(c=>!c.skip)),t.cubicInterpolationMode==="monotone")Em(e,n);else{let c=s?e[e.length-1]:e[0];for(r=0,o=e.length;r<o;++r)a=e[r],l=Mm(c,a,e[Math.min(r+1,o-(s?0:1))%o],t.tension),a.cp1x=l.previous.x,a.cp1y=l.previous.y,a.cp2x=l.next.x,a.cp2y=l.next.y,c=a}t.capBezierPoints&&Pm(e,i)}function _o(){return typeof window<"u"&&typeof document<"u"}function wo(e){let t=e.parentNode;return t&&t.toString()==="[object ShadowRoot]"&&(t=t.host),t}function Cn(e,t,i){let s;return typeof e=="string"?(s=parseInt(e,10),e.indexOf("%")!==-1&&(s=s/100*t.parentNode[i])):s=e,s}const Wn=e=>e.ownerDocument.defaultView.getComputedStyle(e,null);function Om(e,t){return Wn(e).getPropertyValue(t)}const Tm=["top","right","bottom","left"];function Ue(e,t,i){const s={};i=i?"-"+i:"";for(let n=0;n<4;n++){const r=Tm[n];s[r]=parseFloat(e[t+"-"+r+i])||0}return s.width=s.left+s.right,s.height=s.top+s.bottom,s}const Lm=(e,t,i)=>(e>0||t>0)&&(!i||!i.shadowRoot);function zm(e,t){const i=e.touches,s=i&&i.length?i[0]:e,{offsetX:n,offsetY:r}=s;let o=!1,a,l;if(Lm(n,r,e.target))a=n,l=r;else{const c=t.getBoundingClientRect();a=s.clientX-c.left,l=s.clientY-c.top,o=!0}return{x:a,y:l,box:o}}function He(e,t){if("native"in e)return e;const{canvas:i,currentDevicePixelRatio:s}=t,n=Wn(i),r=n.boxSizing==="border-box",o=Ue(n,"padding"),a=Ue(n,"border","width"),{x:l,y:c,box:h}=zm(e,i),d=o.left+(h&&a.left),u=o.top+(h&&a.top);let{width:p,height:b}=t;return r&&(p-=o.width+a.width,b-=o.height+a.height),{x:Math.round((l-d)/p*i.width/s),y:Math.round((c-u)/b*i.height/s)}}function Rm(e,t,i){let s,n;if(t===void 0||i===void 0){const r=e&&wo(e);if(!r)t=e.clientWidth,i=e.clientHeight;else{const o=r.getBoundingClientRect(),a=Wn(r),l=Ue(a,"border","width"),c=Ue(a,"padding");t=o.width-c.width-l.width,i=o.height-c.height-l.height,s=Cn(a.maxWidth,r,"clientWidth"),n=Cn(a.maxHeight,r,"clientHeight")}}return{width:t,height:i,maxWidth:s||wn,maxHeight:n||wn}}const ge=e=>Math.round(e*10)/10;function Im(e,t,i,s){const n=Wn(e),r=Ue(n,"margin"),o=Cn(n.maxWidth,e,"clientWidth")||wn,a=Cn(n.maxHeight,e,"clientHeight")||wn,l=Rm(e,t,i);let{width:c,height:h}=l;if(n.boxSizing==="content-box"){const d=Ue(n,"border","width"),u=Ue(n,"padding");c-=u.width+d.width,h-=u.height+d.height}return c=Math.max(0,c-r.width),h=Math.max(0,s?c/s:h-r.height),c=ge(Math.min(c,o,l.maxWidth)),h=ge(Math.min(h,a,l.maxHeight)),c&&!h&&(h=ge(c/2)),(t!==void 0||i!==void 0)&&s&&l.height&&h>l.height&&(h=l.height,c=ge(Math.floor(h*s))),{width:c,height:h}}function Ea(e,t,i){const s=t||1,n=ge(e.height*s),r=ge(e.width*s);e.height=ge(e.height),e.width=ge(e.width);const o=e.canvas;return o.style&&(i||!o.style.height&&!o.style.width)&&(o.style.height=`${e.height}px`,o.style.width=`${e.width}px`),e.currentDevicePixelRatio!==s||o.height!==n||o.width!==r?(e.currentDevicePixelRatio=s,o.height=n,o.width=r,e.ctx.setTransform(s,0,0,s,0,0),!0):!1}const Bm=(function(){let e=!1;try{const t={get passive(){return e=!0,!1}};_o()&&(window.addEventListener("test",null,t),window.removeEventListener("test",null,t))}catch{}return e})();function Pa(e,t){const i=Om(e,t),s=i&&i.match(/^(\d+)(\.\d+)?px$/);return s?+s[1]:void 0}function je(e,t,i,s){return{x:e.x+i*(t.x-e.x),y:e.y+i*(t.y-e.y)}}function Fm(e,t,i,s){return{x:e.x+i*(t.x-e.x),y:s==="middle"?i<.5?e.y:t.y:s==="after"?i<1?e.y:t.y:i>0?t.y:e.y}}function Hm(e,t,i,s){const n={x:e.cp2x,y:e.cp2y},r={x:t.cp1x,y:t.cp1y},o=je(e,n,i),a=je(n,r,i),l=je(r,t,i),c=je(o,a,i),h=je(a,l,i);return je(c,h,i)}const jm=function(e,t){return{x(i){return e+e+t-i},setWidth(i){t=i},textAlign(i){return i==="center"?i:i==="right"?"left":"right"},xPlus(i,s){return i-s},leftForLtr(i,s){return i-s}}},Vm=function(){return{x(e){return e},setWidth(e){},textAlign(e){return e},xPlus(e,t){return e+t},leftForLtr(e,t){return e}}};function ui(e,t,i){return e?jm(t,i):Vm()}function Th(e,t){let i,s;(t==="ltr"||t==="rtl")&&(i=e.canvas.style,s=[i.getPropertyValue("direction"),i.getPropertyPriority("direction")],i.setProperty("direction",t,"important"),e.prevTextDirection=s)}function Lh(e,t){t!==void 0&&(delete e.prevTextDirection,e.canvas.style.setProperty("direction",t[0],t[1]))}function zh(e){return e==="angle"?{between:hs,compare:Nb,normalize:ft}:{between:ie,compare:(t,i)=>t-i,normalize:t=>t}}function Da({start:e,end:t,count:i,loop:s,style:n}){return{start:e%i,end:t%i,loop:s&&(t-e+1)%i===0,style:n}}function Nm(e,t,i){const{property:s,start:n,end:r}=i,{between:o,normalize:a}=zh(s),l=t.length;let{start:c,end:h,loop:d}=e,u,p;if(d){for(c+=l,h+=l,u=0,p=l;u<p&&o(a(t[c%l][s]),n,r);++u)c--,h--;c%=l,h%=l}return h<c&&(h+=l),{start:c,end:h,loop:d,style:e.style}}function Rh(e,t,i){if(!i)return[e];const{property:s,start:n,end:r}=i,o=t.length,{compare:a,between:l,normalize:c}=zh(s),{start:h,end:d,loop:u,style:p}=Nm(e,t,i),b=[];let f=!1,m=null,g,y,x;const _=()=>l(n,x,g)&&a(n,x)!==0,C=()=>a(r,g)===0||l(r,x,g),k=()=>f||_(),S=()=>!f||C();for(let M=h,E=h;M<=d;++M)y=t[M%o],!y.skip&&(g=c(y[s]),g!==x&&(f=l(g,n,r),m===null&&k()&&(m=a(g,n)===0?M:E),m!==null&&S()&&(b.push(Da({start:m,end:M,loop:u,count:o,style:p})),m=null),E=M,x=g));return m!==null&&b.push(Da({start:m,end:d,loop:u,count:o,style:p})),b}function Ih(e,t){const i=[],s=e.segments;for(let n=0;n<s.length;n++){const r=Rh(s[n],e.points,t);r.length&&i.push(...r)}return i}function Wm(e,t,i,s){let n=0,r=t-1;if(i&&!s)for(;n<t&&!e[n].skip;)n++;for(;n<t&&e[n].skip;)n++;for(n%=t,i&&(r+=n);r>n&&e[r%t].skip;)r--;return r%=t,{start:n,end:r}}function Um(e,t,i,s){const n=e.length,r=[];let o=t,a=e[t],l;for(l=t+1;l<=i;++l){const c=e[l%n];c.skip||c.stop?a.skip||(s=!1,r.push({start:t%n,end:(l-1)%n,loop:s}),t=o=c.stop?l:null):(o=l,a.skip&&(t=l)),a=c}return o!==null&&r.push({start:t%n,end:o%n,loop:s}),r}function qm(e,t){const i=e.points,s=e.options.spanGaps,n=i.length;if(!n)return[];const r=!!e._loop,{start:o,end:a}=Wm(i,n,r,s);if(s===!0)return Oa(e,[{start:o,end:a,loop:r}],i,t);const l=a<o?a+n:a,c=!!e._fullLoop&&o===0&&a===n-1;return Oa(e,Um(i,o,l,c),i,t)}function Oa(e,t,i,s){return!s||!s.setContext||!i?t:Ym(e,t,i,s)}function Ym(e,t,i,s){const n=e._chart.getContext(),r=Ta(e.options),{_datasetIndex:o,options:{spanGaps:a}}=e,l=i.length,c=[];let h=r,d=t[0].start,u=d;function p(b,f,m,g){const y=a?-1:1;if(b!==f){for(b+=l;i[b%l].skip;)b-=y;for(;i[f%l].skip;)f+=y;b%l!==f%l&&(c.push({start:b%l,end:f%l,loop:m,style:g}),h=g,d=f%l)}}for(const b of t){d=a?d:b.start;let f=i[d%l],m;for(u=d+1;u<=b.end;u++){const g=i[u%l];m=Ta(s.setContext(Pe(n,{type:"segment",p0:f,p1:g,p0DataIndex:(u-1)%l,p1DataIndex:u%l,datasetIndex:o}))),Km(m,h)&&p(d,u-1,b.loop,h),f=g,h=m}d<u-1&&p(d,u-1,b.loop,h)}return c}function Ta(e){return{backgroundColor:e.backgroundColor,borderCapStyle:e.borderCapStyle,borderDash:e.borderDash,borderDashOffset:e.borderDashOffset,borderJoinStyle:e.borderJoinStyle,borderWidth:e.borderWidth,borderColor:e.borderColor}}function Km(e,t){if(!t)return!1;const i=[],s=function(n,r){return mo(r)?(i.includes(r)||i.push(r),i.indexOf(r)):r};return JSON.stringify(e,s)!==JSON.stringify(t,s)}function Fs(e,t,i){return e.options.clip?e[i]:t[i]}function Gm(e,t){const{xScale:i,yScale:s}=e;return i&&s?{left:Fs(i,t,"left"),right:Fs(i,t,"right"),top:Fs(s,t,"top"),bottom:Fs(s,t,"bottom")}:t}function Bh(e,t){const i=t._clip;if(i.disabled)return!1;const s=Gm(t,e.chartArea);return{left:i.left===!1?0:s.left-(i.left===!0?0:i.left),right:i.right===!1?e.width:s.right+(i.right===!0?0:i.right),top:i.top===!1?0:s.top-(i.top===!0?0:i.top),bottom:i.bottom===!1?e.height:s.bottom+(i.bottom===!0?0:i.bottom)}}class Xm{constructor(){this._request=null,this._charts=new Map,this._running=!1,this._lastDate=void 0}_notify(t,i,s,n){const r=i.listeners[n],o=i.duration;r.forEach(a=>a({chart:t,initial:i.initial,numSteps:o,currentStep:Math.min(s-i.start,o)}))}_refresh(){this._request||(this._running=!0,this._request=xh.call(window,()=>{this._update(),this._request=null,this._running&&this._refresh()}))}_update(t=Date.now()){let i=0;this._charts.forEach((s,n)=>{if(!s.running||!s.items.length)return;const r=s.items;let o=r.length-1,a=!1,l;for(;o>=0;--o)l=r[o],l._active?(l._total>s.duration&&(s.duration=l._total),l.tick(t),a=!0):(r[o]=r[r.length-1],r.pop());a&&(n.draw(),this._notify(n,s,t,"progress")),r.length||(s.running=!1,this._notify(n,s,t,"complete"),s.initial=!1),i+=r.length}),this._lastDate=t,i===0&&(this._running=!1)}_getAnims(t){const i=this._charts;let s=i.get(t);return s||(s={running:!1,initial:!0,items:[],listeners:{complete:[],progress:[]}},i.set(t,s)),s}listen(t,i,s){this._getAnims(t).listeners[i].push(s)}add(t,i){!i||!i.length||this._getAnims(t).items.push(...i)}has(t){return this._getAnims(t).items.length>0}start(t){const i=this._charts.get(t);i&&(i.running=!0,i.start=Date.now(),i.duration=i.items.reduce((s,n)=>Math.max(s,n._duration),0),this._refresh())}running(t){if(!this._running)return!1;const i=this._charts.get(t);return!(!i||!i.running||!i.items.length)}stop(t){const i=this._charts.get(t);if(!i||!i.items.length)return;const s=i.items;let n=s.length-1;for(;n>=0;--n)s[n].cancel();i.items=[],this._notify(t,i,Date.now(),"complete")}remove(t){return this._charts.delete(t)}}var Gt=new Xm;const La="transparent",Qm={boolean(e,t,i){return i>.5?t:e},color(e,t,i){const s=Ca(e||La),n=s.valid&&Ca(t||La);return n&&n.valid?n.mix(s,i).hexString():t},number(e,t,i){return e+(t-e)*i}};class Zm{constructor(t,i,s,n){const r=i[s];n=q([t.to,n,r,t.from]);const o=q([t.from,r,n]);this._active=!0,this._fn=t.fn||Qm[t.type||typeof o],this._easing=Xi[t.easing]||Xi.linear,this._start=Math.floor(Date.now()+(t.delay||0)),this._duration=this._total=Math.floor(t.duration),this._loop=!!t.loop,this._target=i,this._prop=s,this._from=o,this._to=n,this._promises=void 0}active(){return this._active}update(t,i,s){if(this._active){this._notify(!1);const n=this._target[this._prop],r=s-this._start,o=this._duration-r;this._start=s,this._duration=Math.floor(Math.max(o,t.duration)),this._total+=r,this._loop=!!t.loop,this._to=q([t.to,i,n,t.from]),this._from=q([t.from,n,i])}}cancel(){this._active&&(this.tick(Date.now()),this._active=!1,this._notify(!1))}tick(t){const i=t-this._start,s=this._duration,n=this._prop,r=this._from,o=this._loop,a=this._to;let l;if(this._active=r!==a&&(o||i<s),!this._active){this._target[n]=a,this._notify(!0);return}if(i<0){this._target[n]=r;return}l=i/s%2,l=o&&l>1?2-l:l,l=this._easing(Math.min(1,Math.max(0,l))),this._target[n]=this._fn(r,a,l)}wait(){const t=this._promises||(this._promises=[]);return new Promise((i,s)=>{t.push({res:i,rej:s})})}_notify(t){const i=t?"res":"rej",s=this._promises||[];for(let n=0;n<s.length;n++)s[n][i]()}}class Fh{constructor(t,i){this._chart=t,this._properties=new Map,this.configure(i)}configure(t){if(!B(t))return;const i=Object.keys(G.animation),s=this._properties;Object.getOwnPropertyNames(t).forEach(n=>{const r=t[n];if(!B(r))return;const o={};for(const a of i)o[a]=r[a];(Y(r.properties)&&r.properties||[n]).forEach(a=>{(a===n||!s.has(a))&&s.set(a,o)})})}_animateOptions(t,i){const s=i.options,n=tg(t,s);if(!n)return[];const r=this._createAnimations(n,s);return s.$shared&&Jm(t.options.$animations,s).then(()=>{t.options=s},()=>{}),r}_createAnimations(t,i){const s=this._properties,n=[],r=t.$animations||(t.$animations={}),o=Object.keys(i),a=Date.now();let l;for(l=o.length-1;l>=0;--l){const c=o[l];if(c.charAt(0)==="$")continue;if(c==="options"){n.push(...this._animateOptions(t,i));continue}const h=i[c];let d=r[c];const u=s.get(c);if(d)if(u&&d.active()){d.update(u,h,a);continue}else d.cancel();if(!u||!u.duration){t[c]=h;continue}r[c]=d=new Zm(u,t,c,h),n.push(d)}return n}update(t,i){if(this._properties.size===0){Object.assign(t,i);return}const s=this._createAnimations(t,i);if(s.length)return Gt.add(this._chart,s),!0}}function Jm(e,t){const i=[],s=Object.keys(t);for(let n=0;n<s.length;n++){const r=e[s[n]];r&&r.active()&&i.push(r.wait())}return Promise.all(i)}function tg(e,t){if(!t)return;let i=e.options;if(!i){e.options=t;return}return i.$shared&&(e.options=i=Object.assign({},i,{$shared:!1,$animations:{}})),i}function za(e,t){const i=e&&e.options||{},s=i.reverse,n=i.min===void 0?t:0,r=i.max===void 0?t:0;return{start:s?r:n,end:s?n:r}}function eg(e,t,i){if(i===!1)return!1;const s=za(e,i),n=za(t,i);return{top:n.end,right:s.end,bottom:n.start,left:s.start}}function ig(e){let t,i,s,n;return B(e)?(t=e.top,i=e.right,s=e.bottom,n=e.left):t=i=s=n=e,{top:t,right:i,bottom:s,left:n,disabled:e===!1}}function Hh(e,t){const i=[],s=e._getSortedDatasetMetas(t);let n,r;for(n=0,r=s.length;n<r;++n)i.push(s[n].index);return i}function Ra(e,t,i,s={}){const n=e.keys,r=s.mode==="single";let o,a,l,c;if(t===null)return;let h=!1;for(o=0,a=n.length;o<a;++o){if(l=+n[o],l===i){if(h=!0,s.all)continue;break}c=e.values[l],tt(c)&&(r||t===0||Vt(t)===Vt(c))&&(t+=c)}return!h&&!s.all?0:t}function sg(e,t){const{iScale:i,vScale:s}=t,n=i.axis==="x"?"x":"y",r=s.axis==="x"?"x":"y",o=Object.keys(e),a=new Array(o.length);let l,c,h;for(l=0,c=o.length;l<c;++l)h=o[l],a[l]={[n]:h,[r]:e[h]};return a}function or(e,t){const i=e&&e.options.stacked;return i||i===void 0&&t.stack!==void 0}function ng(e,t,i){return`${e.id}.${t.id}.${i.stack||i.type}`}function rg(e){const{min:t,max:i,minDefined:s,maxDefined:n}=e.getUserBounds();return{min:s?t:Number.NEGATIVE_INFINITY,max:n?i:Number.POSITIVE_INFINITY}}function og(e,t,i){const s=e[t]||(e[t]={});return s[i]||(s[i]={})}function Ia(e,t,i,s){for(const n of t.getMatchingVisibleMetas(s).reverse()){const r=e[n.index];if(i&&r>0||!i&&r<0)return n.index}return null}function Ba(e,t){const{chart:i,_cachedMeta:s}=e,n=i._stacks||(i._stacks={}),{iScale:r,vScale:o,index:a}=s,l=r.axis,c=o.axis,h=ng(r,o,s),d=t.length;let u;for(let p=0;p<d;++p){const b=t[p],{[l]:f,[c]:m}=b,g=b._stacks||(b._stacks={});u=g[c]=og(n,h,f),u[a]=m,u._top=Ia(u,o,!0,s.type),u._bottom=Ia(u,o,!1,s.type);const y=u._visualValues||(u._visualValues={});y[a]=m}}function ar(e,t){const i=e.scales;return Object.keys(i).filter(s=>i[s].axis===t).shift()}function ag(e,t){return Pe(e,{active:!1,dataset:void 0,datasetIndex:t,index:t,mode:"default",type:"dataset"})}function lg(e,t,i){return Pe(e,{active:!1,dataIndex:t,parsed:void 0,raw:void 0,element:i,index:t,mode:"default",type:"data"})}function Li(e,t){const i=e.controller.index,s=e.vScale&&e.vScale.axis;if(s){t=t||e._parsed;for(const n of t){const r=n._stacks;if(!r||r[s]===void 0||r[s][i]===void 0)return;delete r[s][i],r[s]._visualValues!==void 0&&r[s]._visualValues[i]!==void 0&&delete r[s]._visualValues[i]}}}const lr=e=>e==="reset"||e==="none",Fa=(e,t)=>t?e:Object.assign({},e),cg=(e,t,i)=>e&&!t.hidden&&t._stacked&&{keys:Hh(i,!0),values:null};class It{constructor(t,i){this.chart=t,this._ctx=t.ctx,this.index=i,this._cachedDataOpts={},this._cachedMeta=this.getMeta(),this._type=this._cachedMeta.type,this.options=void 0,this._parsing=!1,this._data=void 0,this._objectData=void 0,this._sharedOptions=void 0,this._drawStart=void 0,this._drawCount=void 0,this.enableOptionSharing=!1,this.supportsDecimation=!1,this.$context=void 0,this._syncList=[],this.datasetElementType=new.target.datasetElementType,this.dataElementType=new.target.dataElementType,this.initialize()}initialize(){const t=this._cachedMeta;this.configure(),this.linkScales(),t._stacked=or(t.vScale,t),this.addElements(),this.options.fill&&!this.chart.isPluginEnabled("filler")&&console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options")}updateIndex(t){this.index!==t&&Li(this._cachedMeta),this.index=t}linkScales(){const t=this.chart,i=this._cachedMeta,s=this.getDataset(),n=(d,u,p,b)=>d==="x"?u:d==="r"?b:p,r=i.xAxisID=L(s.xAxisID,ar(t,"x")),o=i.yAxisID=L(s.yAxisID,ar(t,"y")),a=i.rAxisID=L(s.rAxisID,ar(t,"r")),l=i.indexAxis,c=i.iAxisID=n(l,r,o,a),h=i.vAxisID=n(l,o,r,a);i.xScale=this.getScaleForId(r),i.yScale=this.getScaleForId(o),i.rScale=this.getScaleForId(a),i.iScale=this.getScaleForId(c),i.vScale=this.getScaleForId(h)}getDataset(){return this.chart.data.datasets[this.index]}getMeta(){return this.chart.getDatasetMeta(this.index)}getScaleForId(t){return this.chart.scales[t]}_getOtherScale(t){const i=this._cachedMeta;return t===i.iScale?i.vScale:i.iScale}reset(){this._update("reset")}_destroy(){const t=this._cachedMeta;this._data&&_a(this._data,this),t._stacked&&Li(t)}_dataCheck(){const t=this.getDataset(),i=t.data||(t.data=[]),s=this._data;if(B(i)){const n=this._cachedMeta;this._data=sg(i,n)}else if(s!==i){if(s){_a(s,this);const n=this._cachedMeta;Li(n),n._parsed=[]}i&&Object.isExtensible(i)&&Yb(i,this),this._syncList=[],this._data=i}}addElements(){const t=this._cachedMeta;this._dataCheck(),this.datasetElementType&&(t.dataset=new this.datasetElementType)}buildOrUpdateElements(t){const i=this._cachedMeta,s=this.getDataset();let n=!1;this._dataCheck();const r=i._stacked;i._stacked=or(i.vScale,i),i.stack!==s.stack&&(n=!0,Li(i),i.stack=s.stack),this._resyncElements(t),(n||r!==i._stacked)&&(Ba(this,i._parsed),i._stacked=or(i.vScale,i))}configure(){const t=this.chart.config,i=t.datasetScopeKeys(this._type),s=t.getOptionScopes(this.getDataset(),i,!0);this.options=t.createResolver(s,this.getContext()),this._parsing=this.options.parsing,this._cachedDataOpts={}}parse(t,i){const{_cachedMeta:s,_data:n}=this,{iScale:r,_stacked:o}=s,a=r.axis;let l=t===0&&i===n.length?!0:s._sorted,c=t>0&&s._parsed[t-1],h,d,u;if(this._parsing===!1)s._parsed=n,s._sorted=!0,u=n;else{Y(n[t])?u=this.parseArrayData(s,n,t,i):B(n[t])?u=this.parseObjectData(s,n,t,i):u=this.parsePrimitiveData(s,n,t,i);const p=()=>d[a]===null||c&&d[a]<c[a];for(h=0;h<i;++h)s._parsed[h+t]=d=u[h],l&&(p()&&(l=!1),c=d);s._sorted=l}o&&Ba(this,u)}parsePrimitiveData(t,i,s,n){const{iScale:r,vScale:o}=t,a=r.axis,l=o.axis,c=r.getLabels(),h=r===o,d=new Array(n);let u,p,b;for(u=0,p=n;u<p;++u)b=u+s,d[u]={[a]:h||r.parse(c[b],b),[l]:o.parse(i[b],b)};return d}parseArrayData(t,i,s,n){const{xScale:r,yScale:o}=t,a=new Array(n);let l,c,h,d;for(l=0,c=n;l<c;++l)h=l+s,d=i[h],a[l]={x:r.parse(d[0],h),y:o.parse(d[1],h)};return a}parseObjectData(t,i,s,n){const{xScale:r,yScale:o}=t,{xAxisKey:a="x",yAxisKey:l="y"}=this._parsing,c=new Array(n);let h,d,u,p;for(h=0,d=n;h<d;++h)u=h+s,p=i[u],c[h]={x:r.parse(ke(p,a),u),y:o.parse(ke(p,l),u)};return c}getParsed(t){return this._cachedMeta._parsed[t]}getDataElement(t){return this._cachedMeta.data[t]}applyStack(t,i,s){const n=this.chart,r=this._cachedMeta,o=i[t.axis],a={keys:Hh(n,!0),values:i._stacks[t.axis]._visualValues};return Ra(a,o,r.index,{mode:s})}updateRangeFromParsed(t,i,s,n){const r=s[i.axis];let o=r===null?NaN:r;const a=n&&s._stacks[i.axis];n&&a&&(n.values=a,o=Ra(n,r,this._cachedMeta.index)),t.min=Math.min(t.min,o),t.max=Math.max(t.max,o)}getMinMax(t,i){const s=this._cachedMeta,n=s._parsed,r=s._sorted&&t===s.iScale,o=n.length,a=this._getOtherScale(t),l=cg(i,s,this.chart),c={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY},{min:h,max:d}=rg(a);let u,p;function b(){p=n[u];const f=p[a.axis];return!tt(p[t.axis])||h>f||d<f}for(u=0;u<o&&!(!b()&&(this.updateRangeFromParsed(c,t,p,l),r));++u);if(r){for(u=o-1;u>=0;--u)if(!b()){this.updateRangeFromParsed(c,t,p,l);break}}return c}getAllParsedValues(t){const i=this._cachedMeta._parsed,s=[];let n,r,o;for(n=0,r=i.length;n<r;++n)o=i[n][t.axis],tt(o)&&s.push(o);return s}getMaxOverflow(){return!1}getLabelAndValue(t){const i=this._cachedMeta,s=i.iScale,n=i.vScale,r=this.getParsed(t);return{label:s?""+s.getLabelForValue(r[s.axis]):"",value:n?""+n.getLabelForValue(r[n.axis]):""}}_update(t){const i=this._cachedMeta;this.update(t||"default"),i._clip=ig(L(this.options.clip,eg(i.xScale,i.yScale,this.getMaxOverflow())))}update(t){}draw(){const t=this._ctx,i=this.chart,s=this._cachedMeta,n=s.data||[],r=i.chartArea,o=[],a=this._drawStart||0,l=this._drawCount||n.length-a,c=this.options.drawActiveElementsOnTop;let h;for(s.dataset&&s.dataset.draw(t,r,a,l),h=a;h<a+l;++h){const d=n[h];d.hidden||(d.active&&c?o.push(d):d.draw(t,r))}for(h=0;h<o.length;++h)o[h].draw(t,r)}getStyle(t,i){const s=i?"active":"default";return t===void 0&&this._cachedMeta.dataset?this.resolveDatasetElementOptions(s):this.resolveDataElementOptions(t||0,s)}getContext(t,i,s){const n=this.getDataset();let r;if(t>=0&&t<this._cachedMeta.data.length){const o=this._cachedMeta.data[t];r=o.$context||(o.$context=lg(this.getContext(),t,o)),r.parsed=this.getParsed(t),r.raw=n.data[t],r.index=r.dataIndex=t}else r=this.$context||(this.$context=ag(this.chart.getContext(),this.index)),r.dataset=n,r.index=r.datasetIndex=this.index;return r.active=!!i,r.mode=s,r}resolveDatasetElementOptions(t){return this._resolveElementOptions(this.datasetElementType.id,t)}resolveDataElementOptions(t,i){return this._resolveElementOptions(this.dataElementType.id,i,t)}_resolveElementOptions(t,i="default",s){const n=i==="active",r=this._cachedDataOpts,o=t+"-"+i,a=r[o],l=this.enableOptionSharing&&cs(s);if(a)return Fa(a,l);const c=this.chart.config,h=c.datasetElementScopeKeys(this._type,t),d=n?[`${t}Hover`,"hover",t,""]:[t,""],u=c.getOptionScopes(this.getDataset(),h),p=Object.keys(G.elements[t]),b=()=>this.getContext(s,n,i),f=c.resolveNamedOptions(u,p,b,d);return f.$shared&&(f.$shared=l,r[o]=Object.freeze(Fa(f,l))),f}_resolveAnimations(t,i,s){const n=this.chart,r=this._cachedDataOpts,o=`animation-${i}`,a=r[o];if(a)return a;let l;if(n.options.animation!==!1){const h=this.chart.config,d=h.datasetAnimationScopeKeys(this._type,i),u=h.getOptionScopes(this.getDataset(),d);l=h.createResolver(u,this.getContext(t,s,i))}const c=new Fh(n,l&&l.animations);return l&&l._cacheable&&(r[o]=Object.freeze(c)),c}getSharedOptions(t){if(t.$shared)return this._sharedOptions||(this._sharedOptions=Object.assign({},t))}includeOptions(t,i){return!i||lr(t)||this.chart._animationsDisabled}_getSharedOptions(t,i){const s=this.resolveDataElementOptions(t,i),n=this._sharedOptions,r=this.getSharedOptions(s),o=this.includeOptions(i,r)||r!==n;return this.updateSharedOptions(r,i,s),{sharedOptions:r,includeOptions:o}}updateElement(t,i,s,n){lr(n)?Object.assign(t,s):this._resolveAnimations(i,n).update(t,s)}updateSharedOptions(t,i,s){t&&!lr(i)&&this._resolveAnimations(void 0,i).update(t,s)}_setStyle(t,i,s,n){t.active=n;const r=this.getStyle(i,n);this._resolveAnimations(i,s,n).update(t,{options:!n&&this.getSharedOptions(r)||r})}removeHoverStyle(t,i,s){this._setStyle(t,s,"active",!1)}setHoverStyle(t,i,s){this._setStyle(t,s,"active",!0)}_removeDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!1)}_setDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!0)}_resyncElements(t){const i=this._data,s=this._cachedMeta.data;for(const[a,l,c]of this._syncList)this[a](l,c);this._syncList=[];const n=s.length,r=i.length,o=Math.min(r,n);o&&this.parse(0,o),r>n?this._insertElements(n,r-n,t):r<n&&this._removeElements(r,n-r)}_insertElements(t,i,s=!0){const n=this._cachedMeta,r=n.data,o=t+i;let a;const l=c=>{for(c.length+=i,a=c.length-1;a>=o;a--)c[a]=c[a-i]};for(l(r),a=t;a<o;++a)r[a]=new this.dataElementType;this._parsing&&l(n._parsed),this.parse(t,i),s&&this.updateElements(r,t,i,"reset")}updateElements(t,i,s,n){}_removeElements(t,i){const s=this._cachedMeta;if(this._parsing){const n=s._parsed.splice(t,i);s._stacked&&Li(s,n)}s.data.splice(t,i)}_sync(t){if(this._parsing)this._syncList.push(t);else{const[i,s,n]=t;this[i](s,n)}this.chart._dataChanges.push([this.index,...t])}_onDataPush(){const t=arguments.length;this._sync(["_insertElements",this.getDataset().data.length-t,t])}_onDataPop(){this._sync(["_removeElements",this._cachedMeta.data.length-1,1])}_onDataShift(){this._sync(["_removeElements",0,1])}_onDataSplice(t,i){i&&this._sync(["_removeElements",t,i]);const s=arguments.length-2;s&&this._sync(["_insertElements",t,s])}_onDataUnshift(){this._sync(["_insertElements",0,arguments.length])}}A(It,"defaults",{}),A(It,"datasetElementType",null),A(It,"dataElementType",null);function hg(e,t){if(!e._cache.$bar){const i=e.getMatchingVisibleMetas(t);let s=[];for(let n=0,r=i.length;n<r;n++)s=s.concat(i[n].controller.getAllParsedValues(e));e._cache.$bar=yh(s.sort((n,r)=>n-r))}return e._cache.$bar}function dg(e){const t=e.iScale,i=hg(t,e.type);let s=t._length,n,r,o,a;const l=()=>{o===32767||o===-32768||(cs(a)&&(s=Math.min(s,Math.abs(o-a)||s)),a=o)};for(n=0,r=i.length;n<r;++n)o=t.getPixelForValue(i[n]),l();for(a=void 0,n=0,r=t.ticks.length;n<r;++n)o=t.getPixelForTick(n),l();return s}function ug(e,t,i,s){const n=i.barThickness;let r,o;return z(n)?(r=t.min*i.categoryPercentage,o=i.barPercentage):(r=n*s,o=1),{chunk:r/s,ratio:o,start:t.pixels[e]-r/2}}function pg(e,t,i,s){const n=t.pixels,r=n[e];let o=e>0?n[e-1]:null,a=e<n.length-1?n[e+1]:null;const l=i.categoryPercentage;o===null&&(o=r-(a===null?t.end-t.start:a-r)),a===null&&(a=r+r-o);const c=r-(r-Math.min(o,a))/2*l;return{chunk:Math.abs(a-o)/2*l/s,ratio:i.barPercentage,start:c}}function fg(e,t,i,s){const n=i.parse(e[0],s),r=i.parse(e[1],s),o=Math.min(n,r),a=Math.max(n,r);let l=o,c=a;Math.abs(o)>Math.abs(a)&&(l=a,c=o),t[i.axis]=c,t._custom={barStart:l,barEnd:c,start:n,end:r,min:o,max:a}}function jh(e,t,i,s){return Y(e)?fg(e,t,i,s):t[i.axis]=i.parse(e,s),t}function Ha(e,t,i,s){const n=e.iScale,r=e.vScale,o=n.getLabels(),a=n===r,l=[];let c,h,d,u;for(c=i,h=i+s;c<h;++c)u=t[c],d={},d[n.axis]=a||n.parse(o[c],c),l.push(jh(u,d,r,c));return l}function cr(e){return e&&e.barStart!==void 0&&e.barEnd!==void 0}function bg(e,t,i){return e!==0?Vt(e):(t.isHorizontal()?1:-1)*(t.min>=i?1:-1)}function mg(e){let t,i,s,n,r;return e.horizontal?(t=e.base>e.x,i="left",s="right"):(t=e.base<e.y,i="bottom",s="top"),t?(n="end",r="start"):(n="start",r="end"),{start:i,end:s,reverse:t,top:n,bottom:r}}function gg(e,t,i,s){let n=t.borderSkipped;const r={};if(!n){e.borderSkipped=r;return}if(n===!0){e.borderSkipped={top:!0,right:!0,bottom:!0,left:!0};return}const{start:o,end:a,reverse:l,top:c,bottom:h}=mg(e);n==="middle"&&i&&(e.enableBorderRadius=!0,(i._top||0)===s?n=c:(i._bottom||0)===s?n=h:(r[ja(h,o,a,l)]=!0,n=c)),r[ja(n,o,a,l)]=!0,e.borderSkipped=r}function ja(e,t,i,s){return s?(e=vg(e,t,i),e=Va(e,i,t)):e=Va(e,t,i),e}function vg(e,t,i){return e===t?i:e===i?t:e}function Va(e,t,i){return e==="start"?t:e==="end"?i:e}function yg(e,{inflateAmount:t},i){e.inflateAmount=t==="auto"?i===1?.33:0:t}class en extends It{parsePrimitiveData(t,i,s,n){return Ha(t,i,s,n)}parseArrayData(t,i,s,n){return Ha(t,i,s,n)}parseObjectData(t,i,s,n){const{iScale:r,vScale:o}=t,{xAxisKey:a="x",yAxisKey:l="y"}=this._parsing,c=r.axis==="x"?a:l,h=o.axis==="x"?a:l,d=[];let u,p,b,f;for(u=s,p=s+n;u<p;++u)f=i[u],b={},b[r.axis]=r.parse(ke(f,c),u),d.push(jh(ke(f,h),b,o,u));return d}updateRangeFromParsed(t,i,s,n){super.updateRangeFromParsed(t,i,s,n);const r=s._custom;r&&i===this._cachedMeta.vScale&&(t.min=Math.min(t.min,r.min),t.max=Math.max(t.max,r.max))}getMaxOverflow(){return 0}getLabelAndValue(t){const i=this._cachedMeta,{iScale:s,vScale:n}=i,r=this.getParsed(t),o=r._custom,a=cr(o)?"["+o.start+", "+o.end+"]":""+n.getLabelForValue(r[n.axis]);return{label:""+s.getLabelForValue(r[s.axis]),value:a}}initialize(){this.enableOptionSharing=!0,super.initialize();const t=this._cachedMeta;t.stack=this.getDataset().stack}update(t){const i=this._cachedMeta;this.updateElements(i.data,0,i.data.length,t)}updateElements(t,i,s,n){const r=n==="reset",{index:o,_cachedMeta:{vScale:a}}=this,l=a.getBasePixel(),c=a.isHorizontal(),h=this._getRuler(),{sharedOptions:d,includeOptions:u}=this._getSharedOptions(i,n);for(let p=i;p<i+s;p++){const b=this.getParsed(p),f=r||z(b[a.axis])?{base:l,head:l}:this._calculateBarValuePixels(p),m=this._calculateBarIndexPixels(p,h),g=(b._stacks||{})[a.axis],y={horizontal:c,base:f.base,enableBorderRadius:!g||cr(b._custom)||o===g._top||o===g._bottom,x:c?f.head:m.center,y:c?m.center:f.head,height:c?m.size:Math.abs(f.size),width:c?Math.abs(f.size):m.size};u&&(y.options=d||this.resolveDataElementOptions(p,t[p].active?"active":n));const x=y.options||t[p].options;gg(y,x,g,o),yg(y,x,h.ratio),this.updateElement(t[p],p,y,n)}}_getStacks(t,i){const{iScale:s}=this._cachedMeta,n=s.getMatchingVisibleMetas(this._type).filter(h=>h.controller.options.grouped),r=s.options.stacked,o=[],a=this._cachedMeta.controller.getParsed(i),l=a&&a[s.axis],c=h=>{const d=h._parsed.find(p=>p[s.axis]===l),u=d&&d[h.vScale.axis];if(z(u)||isNaN(u))return!0};for(const h of n)if(!(i!==void 0&&c(h))&&((r===!1||o.indexOf(h.stack)===-1||r===void 0&&h.stack===void 0)&&o.push(h.stack),h.index===t))break;return o.length||o.push(void 0),o}_getStackCount(t){return this._getStacks(void 0,t).length}_getAxisCount(){return this._getAxis().length}getFirstScaleIdForIndexAxis(){const t=this.chart.scales,i=this.chart.options.indexAxis;return Object.keys(t).filter(s=>t[s].axis===i).shift()}_getAxis(){const t={},i=this.getFirstScaleIdForIndexAxis();for(const s of this.chart.data.datasets)t[L(this.chart.options.indexAxis==="x"?s.xAxisID:s.yAxisID,i)]=!0;return Object.keys(t)}_getStackIndex(t,i,s){const n=this._getStacks(t,s),r=i!==void 0?n.indexOf(i):-1;return r===-1?n.length-1:r}_getRuler(){const t=this.options,i=this._cachedMeta,s=i.iScale,n=[];let r,o;for(r=0,o=i.data.length;r<o;++r)n.push(s.getPixelForValue(this.getParsed(r)[s.axis],r));const a=t.barThickness;return{min:a||dg(i),pixels:n,start:s._startPixel,end:s._endPixel,stackCount:this._getStackCount(),scale:s,grouped:t.grouped,ratio:a?1:t.categoryPercentage*t.barPercentage}}_calculateBarValuePixels(t){const{_cachedMeta:{vScale:i,_stacked:s,index:n},options:{base:r,minBarLength:o}}=this,a=r||0,l=this.getParsed(t),c=l._custom,h=cr(c);let d=l[i.axis],u=0,p=s?this.applyStack(i,l,s):d,b,f;p!==d&&(u=p-d,p=d),h&&(d=c.barStart,p=c.barEnd-c.barStart,d!==0&&Vt(d)!==Vt(c.barEnd)&&(u=0),u+=d);const m=!z(r)&&!h?r:u;let g=i.getPixelForValue(m);if(this.chart.getDataVisibility(t)?b=i.getPixelForValue(u+p):b=g,f=b-g,Math.abs(f)<o){f=bg(f,i,a)*o,d===a&&(g-=f/2);const y=i.getPixelForDecimal(0),x=i.getPixelForDecimal(1),_=Math.min(y,x),C=Math.max(y,x);g=Math.max(Math.min(g,C),_),b=g+f,s&&!h&&(l._stacks[i.axis]._visualValues[n]=i.getValueForPixel(b)-i.getValueForPixel(g))}if(g===i.getPixelForValue(a)){const y=Vt(f)*i.getLineWidthForValue(a)/2;g+=y,f-=y}return{size:f,base:g,head:b,center:b+f/2}}_calculateBarIndexPixels(t,i){const s=i.scale,n=this.options,r=n.skipNull,o=L(n.maxBarThickness,1/0);let a,l;const c=this._getAxisCount();if(i.grouped){const h=r?this._getStackCount(t):i.stackCount,d=n.barThickness==="flex"?pg(t,i,n,h*c):ug(t,i,n,h*c),u=this.chart.options.indexAxis==="x"?this.getDataset().xAxisID:this.getDataset().yAxisID,p=this._getAxis().indexOf(L(u,this.getFirstScaleIdForIndexAxis())),b=this._getStackIndex(this.index,this._cachedMeta.stack,r?t:void 0)+p;a=d.start+d.chunk*b+d.chunk/2,l=Math.min(o,d.chunk*d.ratio)}else a=s.getPixelForValue(this.getParsed(t)[s.axis],t),l=Math.min(o,i.min*i.ratio);return{base:a-l/2,head:a+l/2,center:a,size:l}}draw(){const t=this._cachedMeta,i=t.vScale,s=t.data,n=s.length;let r=0;for(;r<n;++r)this.getParsed(r)[i.axis]!==null&&!s[r].hidden&&s[r].draw(this._ctx)}}A(en,"id","bar"),A(en,"defaults",{datasetElementType:!1,dataElementType:"bar",categoryPercentage:.8,barPercentage:.9,grouped:!0,animations:{numbers:{type:"number",properties:["x","y","base","width","height"]}}}),A(en,"overrides",{scales:{_index_:{type:"category",offset:!0,grid:{offset:!0}},_value_:{type:"linear",beginAtZero:!0}}});class sn extends It{initialize(){this.enableOptionSharing=!0,super.initialize()}parsePrimitiveData(t,i,s,n){const r=super.parsePrimitiveData(t,i,s,n);for(let o=0;o<r.length;o++)r[o]._custom=this.resolveDataElementOptions(o+s).radius;return r}parseArrayData(t,i,s,n){const r=super.parseArrayData(t,i,s,n);for(let o=0;o<r.length;o++){const a=i[s+o];r[o]._custom=L(a[2],this.resolveDataElementOptions(o+s).radius)}return r}parseObjectData(t,i,s,n){const r=super.parseObjectData(t,i,s,n);for(let o=0;o<r.length;o++){const a=i[s+o];r[o]._custom=L(a&&a.r&&+a.r,this.resolveDataElementOptions(o+s).radius)}return r}getMaxOverflow(){const t=this._cachedMeta.data;let i=0;for(let s=t.length-1;s>=0;--s)i=Math.max(i,t[s].size(this.resolveDataElementOptions(s))/2);return i>0&&i}getLabelAndValue(t){const i=this._cachedMeta,s=this.chart.data.labels||[],{xScale:n,yScale:r}=i,o=this.getParsed(t),a=n.getLabelForValue(o.x),l=r.getLabelForValue(o.y),c=o._custom;return{label:s[t]||"",value:"("+a+", "+l+(c?", "+c:"")+")"}}update(t){const i=this._cachedMeta.data;this.updateElements(i,0,i.length,t)}updateElements(t,i,s,n){const r=n==="reset",{iScale:o,vScale:a}=this._cachedMeta,{sharedOptions:l,includeOptions:c}=this._getSharedOptions(i,n),h=o.axis,d=a.axis;for(let u=i;u<i+s;u++){const p=t[u],b=!r&&this.getParsed(u),f={},m=f[h]=r?o.getPixelForDecimal(.5):o.getPixelForValue(b[h]),g=f[d]=r?a.getBasePixel():a.getPixelForValue(b[d]);f.skip=isNaN(m)||isNaN(g),c&&(f.options=l||this.resolveDataElementOptions(u,p.active?"active":n),r&&(f.options.radius=0)),this.updateElement(p,u,f,n)}}resolveDataElementOptions(t,i){const s=this.getParsed(t);let n=super.resolveDataElementOptions(t,i);n.$shared&&(n=Object.assign({},n,{$shared:!1}));const r=n.radius;return i!=="active"&&(n.radius=0),n.radius+=L(s&&s._custom,r),n}}A(sn,"id","bubble"),A(sn,"defaults",{datasetElementType:!1,dataElementType:"point",animations:{numbers:{type:"number",properties:["x","y","borderWidth","radius"]}}}),A(sn,"overrides",{scales:{x:{type:"linear"},y:{type:"linear"}}});function xg(e,t,i){let s=1,n=1,r=0,o=0;if(t<K){const a=e,l=a+t,c=Math.cos(a),h=Math.sin(a),d=Math.cos(l),u=Math.sin(l),p=(x,_,C)=>hs(x,a,l,!0)?1:Math.max(_,_*i,C,C*i),b=(x,_,C)=>hs(x,a,l,!0)?-1:Math.min(_,_*i,C,C*i),f=p(0,c,d),m=p(st,h,u),g=b(j,c,d),y=b(j+st,h,u);s=(f-g)/2,n=(m-y)/2,r=-(f+g)/2,o=-(m+y)/2}return{ratioX:s,ratioY:n,offsetX:r,offsetY:o}}class Ne extends It{constructor(t,i){super(t,i),this.enableOptionSharing=!0,this.innerRadius=void 0,this.outerRadius=void 0,this.offsetX=void 0,this.offsetY=void 0}linkScales(){}parse(t,i){const s=this.getDataset().data,n=this._cachedMeta;if(this._parsing===!1)n._parsed=s;else{let r=l=>+s[l];if(B(s[t])){const{key:l="value"}=this._parsing;r=c=>+ke(s[c],l)}let o,a;for(o=t,a=t+i;o<a;++o)n._parsed[o]=r(o)}}_getRotation(){return Rt(this.options.rotation-90)}_getCircumference(){return Rt(this.options.circumference)}_getRotationExtents(){let t=K,i=-K;for(let s=0;s<this.chart.data.datasets.length;++s)if(this.chart.isDatasetVisible(s)&&this.chart.getDatasetMeta(s).type===this._type){const n=this.chart.getDatasetMeta(s).controller,r=n._getRotation(),o=n._getCircumference();t=Math.min(t,r),i=Math.max(i,r+o)}return{rotation:t,circumference:i-t}}update(t){const i=this.chart,{chartArea:s}=i,n=this._cachedMeta,r=n.data,o=this.getMaxBorderWidth()+this.getMaxOffset(r)+this.options.spacing,a=Math.max((Math.min(s.width,s.height)-o)/2,0),l=Math.min(Ob(this.options.cutout,a),1),c=this._getRingWeight(this.index),{circumference:h,rotation:d}=this._getRotationExtents(),{ratioX:u,ratioY:p,offsetX:b,offsetY:f}=xg(d,h,l),m=(s.width-o)/u,g=(s.height-o)/p,y=Math.max(Math.min(m,g)/2,0),x=fh(this.options.radius,y),_=Math.max(x*l,0),C=(x-_)/this._getVisibleDatasetWeightTotal();this.offsetX=b*x,this.offsetY=f*x,n.total=this.calculateTotal(),this.outerRadius=x-C*this._getRingWeightOffset(this.index),this.innerRadius=Math.max(this.outerRadius-C*c,0),this.updateElements(r,0,r.length,t)}_circumference(t,i){const s=this.options,n=this._cachedMeta,r=this._getCircumference();return i&&s.animation.animateRotate||!this.chart.getDataVisibility(t)||n._parsed[t]===null||n.data[t].hidden?0:this.calculateCircumference(n._parsed[t]*r/K)}updateElements(t,i,s,n){const r=n==="reset",o=this.chart,a=o.chartArea,l=o.options.animation,c=(a.left+a.right)/2,h=(a.top+a.bottom)/2,d=r&&l.animateScale,u=d?0:this.innerRadius,p=d?0:this.outerRadius,{sharedOptions:b,includeOptions:f}=this._getSharedOptions(i,n);let m=this._getRotation(),g;for(g=0;g<i;++g)m+=this._circumference(g,r);for(g=i;g<i+s;++g){const y=this._circumference(g,r),x=t[g],_={x:c+this.offsetX,y:h+this.offsetY,startAngle:m,endAngle:m+y,circumference:y,outerRadius:p,innerRadius:u};f&&(_.options=b||this.resolveDataElementOptions(g,x.active?"active":n)),m+=y,this.updateElement(x,g,_,n)}}calculateTotal(){const t=this._cachedMeta,i=t.data;let s=0,n;for(n=0;n<i.length;n++){const r=t._parsed[n];r!==null&&!isNaN(r)&&this.chart.getDataVisibility(n)&&!i[n].hidden&&(s+=Math.abs(r))}return s}calculateCircumference(t){const i=this._cachedMeta.total;return i>0&&!isNaN(t)?K*(Math.abs(t)/i):0}getLabelAndValue(t){const i=this._cachedMeta,s=this.chart,n=s.data.labels||[],r=Es(i._parsed[t],s.options.locale);return{label:n[t]||"",value:r}}getMaxBorderWidth(t){let i=0;const s=this.chart;let n,r,o,a,l;if(!t){for(n=0,r=s.data.datasets.length;n<r;++n)if(s.isDatasetVisible(n)){o=s.getDatasetMeta(n),t=o.data,a=o.controller;break}}if(!t)return 0;for(n=0,r=t.length;n<r;++n)l=a.resolveDataElementOptions(n),l.borderAlign!=="inner"&&(i=Math.max(i,l.borderWidth||0,l.hoverBorderWidth||0));return i}getMaxOffset(t){let i=0;for(let s=0,n=t.length;s<n;++s){const r=this.resolveDataElementOptions(s);i=Math.max(i,r.offset||0,r.hoverOffset||0)}return i}_getRingWeightOffset(t){let i=0;for(let s=0;s<t;++s)this.chart.isDatasetVisible(s)&&(i+=this._getRingWeight(s));return i}_getRingWeight(t){return Math.max(L(this.chart.data.datasets[t].weight,1),0)}_getVisibleDatasetWeightTotal(){return this._getRingWeightOffset(this.chart.data.datasets.length)||1}}A(Ne,"id","doughnut"),A(Ne,"defaults",{datasetElementType:!1,dataElementType:"arc",animation:{animateRotate:!0,animateScale:!1},animations:{numbers:{type:"number",properties:["circumference","endAngle","innerRadius","outerRadius","startAngle","x","y","offset","borderWidth","spacing"]}},cutout:"50%",rotation:0,circumference:360,radius:"100%",spacing:0,indexAxis:"r"}),A(Ne,"descriptors",{_scriptable:e=>e!=="spacing",_indexable:e=>e!=="spacing"&&!e.startsWith("borderDash")&&!e.startsWith("hoverBorderDash")}),A(Ne,"overrides",{aspectRatio:1,plugins:{legend:{labels:{generateLabels(e){const t=e.data,{labels:{pointStyle:i,textAlign:s,color:n,useBorderRadius:r,borderRadius:o}}=e.legend.options;return t.labels.length&&t.datasets.length?t.labels.map((a,l)=>{const c=e.getDatasetMeta(0).controller.getStyle(l);return{text:a,fillStyle:c.backgroundColor,fontColor:n,hidden:!e.getDataVisibility(l),lineDash:c.borderDash,lineDashOffset:c.borderDashOffset,lineJoin:c.borderJoinStyle,lineWidth:c.borderWidth,strokeStyle:c.borderColor,textAlign:s,pointStyle:i,borderRadius:r&&(o||c.borderRadius),index:l}}):[]}},onClick(e,t,i){i.chart.toggleDataVisibility(t.index),i.chart.update()}}}});class nn extends It{initialize(){this.enableOptionSharing=!0,this.supportsDecimation=!0,super.initialize()}update(t){const i=this._cachedMeta,{dataset:s,data:n=[],_dataset:r}=i,o=this.chart._animationsDisabled;let{start:a,count:l}=wh(i,n,o);this._drawStart=a,this._drawCount=l,kh(i)&&(a=0,l=n.length),s._chart=this.chart,s._datasetIndex=this.index,s._decimated=!!r._decimated,s.points=n;const c=this.resolveDatasetElementOptions(t);this.options.showLine||(c.borderWidth=0),c.segment=this.options.segment,this.updateElement(s,void 0,{animated:!o,options:c},t),this.updateElements(n,a,l,t)}updateElements(t,i,s,n){const r=n==="reset",{iScale:o,vScale:a,_stacked:l,_dataset:c}=this._cachedMeta,{sharedOptions:h,includeOptions:d}=this._getSharedOptions(i,n),u=o.axis,p=a.axis,{spanGaps:b,segment:f}=this.options,m=vi(b)?b:Number.POSITIVE_INFINITY,g=this.chart._animationsDisabled||r||n==="none",y=i+s,x=t.length;let _=i>0&&this.getParsed(i-1);for(let C=0;C<x;++C){const k=t[C],S=g?k:{};if(C<i||C>=y){S.skip=!0;continue}const M=this.getParsed(C),E=z(M[p]),$=S[u]=o.getPixelForValue(M[u],C),P=S[p]=r||E?a.getBasePixel():a.getPixelForValue(l?this.applyStack(a,M,l):M[p],C);S.skip=isNaN($)||isNaN(P)||E,S.stop=C>0&&Math.abs(M[u]-_[u])>m,f&&(S.parsed=M,S.raw=c.data[C]),d&&(S.options=h||this.resolveDataElementOptions(C,k.active?"active":n)),g||this.updateElement(k,C,S,n),_=M}}getMaxOverflow(){const t=this._cachedMeta,i=t.dataset,s=i.options&&i.options.borderWidth||0,n=t.data||[];if(!n.length)return s;const r=n[0].size(this.resolveDataElementOptions(0)),o=n[n.length-1].size(this.resolveDataElementOptions(n.length-1));return Math.max(s,r,o)/2}draw(){const t=this._cachedMeta;t.dataset.updateControlPoints(this.chart.chartArea,t.iScale.axis),super.draw()}}A(nn,"id","line"),A(nn,"defaults",{datasetElementType:"line",dataElementType:"point",showLine:!0,spanGaps:!1}),A(nn,"overrides",{scales:{_index_:{type:"category"},_value_:{type:"linear"}}});class Zi extends It{constructor(t,i){super(t,i),this.innerRadius=void 0,this.outerRadius=void 0}getLabelAndValue(t){const i=this._cachedMeta,s=this.chart,n=s.data.labels||[],r=Es(i._parsed[t].r,s.options.locale);return{label:n[t]||"",value:r}}parseObjectData(t,i,s,n){return Dh.bind(this)(t,i,s,n)}update(t){const i=this._cachedMeta.data;this._updateRadius(),this.updateElements(i,0,i.length,t)}getMinMax(){const t=this._cachedMeta,i={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY};return t.data.forEach((s,n)=>{const r=this.getParsed(n).r;!isNaN(r)&&this.chart.getDataVisibility(n)&&(r<i.min&&(i.min=r),r>i.max&&(i.max=r))}),i}_updateRadius(){const t=this.chart,i=t.chartArea,s=t.options,n=Math.min(i.right-i.left,i.bottom-i.top),r=Math.max(n/2,0),o=Math.max(s.cutoutPercentage?r/100*s.cutoutPercentage:1,0),a=(r-o)/t.getVisibleDatasetCount();this.outerRadius=r-a*this.index,this.innerRadius=this.outerRadius-a}updateElements(t,i,s,n){const r=n==="reset",o=this.chart,a=o.options.animation,l=this._cachedMeta.rScale,c=l.xCenter,h=l.yCenter,d=l.getIndexAngle(0)-.5*j;let u=d,p;const b=360/this.countVisibleElements();for(p=0;p<i;++p)u+=this._computeAngle(p,n,b);for(p=i;p<i+s;p++){const f=t[p];let m=u,g=u+this._computeAngle(p,n,b),y=o.getDataVisibility(p)?l.getDistanceFromCenterForValue(this.getParsed(p).r):0;u=g,r&&(a.animateScale&&(y=0),a.animateRotate&&(m=g=d));const x={x:c,y:h,innerRadius:0,outerRadius:y,startAngle:m,endAngle:g,options:this.resolveDataElementOptions(p,f.active?"active":n)};this.updateElement(f,p,x,n)}}countVisibleElements(){const t=this._cachedMeta;let i=0;return t.data.forEach((s,n)=>{!isNaN(this.getParsed(n).r)&&this.chart.getDataVisibility(n)&&i++}),i}_computeAngle(t,i,s){return this.chart.getDataVisibility(t)?Rt(this.resolveDataElementOptions(t,i).angle||s):0}}A(Zi,"id","polarArea"),A(Zi,"defaults",{dataElementType:"arc",animation:{animateRotate:!0,animateScale:!0},animations:{numbers:{type:"number",properties:["x","y","startAngle","endAngle","innerRadius","outerRadius"]}},indexAxis:"r",startAngle:0}),A(Zi,"overrides",{aspectRatio:1,plugins:{legend:{labels:{generateLabels(e){const t=e.data;if(t.labels.length&&t.datasets.length){const{labels:{pointStyle:i,color:s}}=e.legend.options;return t.labels.map((n,r)=>{const o=e.getDatasetMeta(0).controller.getStyle(r);return{text:n,fillStyle:o.backgroundColor,strokeStyle:o.borderColor,fontColor:s,lineWidth:o.borderWidth,pointStyle:i,hidden:!e.getDataVisibility(r),index:r}})}return[]}},onClick(e,t,i){i.chart.toggleDataVisibility(t.index),i.chart.update()}}},scales:{r:{type:"radialLinear",angleLines:{display:!1},beginAtZero:!0,grid:{circular:!0},pointLabels:{display:!1},startAngle:0}}});class Lr extends Ne{}A(Lr,"id","pie"),A(Lr,"defaults",{cutout:0,rotation:0,circumference:360,radius:"100%"});class rn extends It{getLabelAndValue(t){const i=this._cachedMeta.vScale,s=this.getParsed(t);return{label:i.getLabels()[t],value:""+i.getLabelForValue(s[i.axis])}}parseObjectData(t,i,s,n){return Dh.bind(this)(t,i,s,n)}update(t){const i=this._cachedMeta,s=i.dataset,n=i.data||[],r=i.iScale.getLabels();if(s.points=n,t!=="resize"){const o=this.resolveDatasetElementOptions(t);this.options.showLine||(o.borderWidth=0);const a={_loop:!0,_fullLoop:r.length===n.length,options:o};this.updateElement(s,void 0,a,t)}this.updateElements(n,0,n.length,t)}updateElements(t,i,s,n){const r=this._cachedMeta.rScale,o=n==="reset";for(let a=i;a<i+s;a++){const l=t[a],c=this.resolveDataElementOptions(a,l.active?"active":n),h=r.getPointPositionForValue(a,this.getParsed(a).r),d=o?r.xCenter:h.x,u=o?r.yCenter:h.y,p={x:d,y:u,angle:h.angle,skip:isNaN(d)||isNaN(u),options:c};this.updateElement(l,a,p,n)}}}A(rn,"id","radar"),A(rn,"defaults",{datasetElementType:"line",dataElementType:"point",indexAxis:"r",showLine:!0,elements:{line:{fill:"start"}}}),A(rn,"overrides",{aspectRatio:1,scales:{r:{type:"radialLinear"}}});class on extends It{getLabelAndValue(t){const i=this._cachedMeta,s=this.chart.data.labels||[],{xScale:n,yScale:r}=i,o=this.getParsed(t),a=n.getLabelForValue(o.x),l=r.getLabelForValue(o.y);return{label:s[t]||"",value:"("+a+", "+l+")"}}update(t){const i=this._cachedMeta,{data:s=[]}=i,n=this.chart._animationsDisabled;let{start:r,count:o}=wh(i,s,n);if(this._drawStart=r,this._drawCount=o,kh(i)&&(r=0,o=s.length),this.options.showLine){this.datasetElementType||this.addElements();const{dataset:a,_dataset:l}=i;a._chart=this.chart,a._datasetIndex=this.index,a._decimated=!!l._decimated,a.points=s;const c=this.resolveDatasetElementOptions(t);c.segment=this.options.segment,this.updateElement(a,void 0,{animated:!n,options:c},t)}else this.datasetElementType&&(delete i.dataset,this.datasetElementType=!1);this.updateElements(s,r,o,t)}addElements(){const{showLine:t}=this.options;!this.datasetElementType&&t&&(this.datasetElementType=this.chart.registry.getElement("line")),super.addElements()}updateElements(t,i,s,n){const r=n==="reset",{iScale:o,vScale:a,_stacked:l,_dataset:c}=this._cachedMeta,h=this.resolveDataElementOptions(i,n),d=this.getSharedOptions(h),u=this.includeOptions(n,d),p=o.axis,b=a.axis,{spanGaps:f,segment:m}=this.options,g=vi(f)?f:Number.POSITIVE_INFINITY,y=this.chart._animationsDisabled||r||n==="none";let x=i>0&&this.getParsed(i-1);for(let _=i;_<i+s;++_){const C=t[_],k=this.getParsed(_),S=y?C:{},M=z(k[b]),E=S[p]=o.getPixelForValue(k[p],_),$=S[b]=r||M?a.getBasePixel():a.getPixelForValue(l?this.applyStack(a,k,l):k[b],_);S.skip=isNaN(E)||isNaN($)||M,S.stop=_>0&&Math.abs(k[p]-x[p])>g,m&&(S.parsed=k,S.raw=c.data[_]),u&&(S.options=d||this.resolveDataElementOptions(_,C.active?"active":n)),y||this.updateElement(C,_,S,n),x=k}this.updateSharedOptions(d,n,h)}getMaxOverflow(){const t=this._cachedMeta,i=t.data||[];if(!this.options.showLine){let a=0;for(let l=i.length-1;l>=0;--l)a=Math.max(a,i[l].size(this.resolveDataElementOptions(l))/2);return a>0&&a}const s=t.dataset,n=s.options&&s.options.borderWidth||0;if(!i.length)return n;const r=i[0].size(this.resolveDataElementOptions(0)),o=i[i.length-1].size(this.resolveDataElementOptions(i.length-1));return Math.max(n,r,o)/2}}A(on,"id","scatter"),A(on,"defaults",{datasetElementType:!1,dataElementType:"point",showLine:!1,fill:!1}),A(on,"overrides",{interaction:{mode:"point"},scales:{x:{type:"linear"},y:{type:"linear"}}});var _g=Object.freeze({__proto__:null,BarController:en,BubbleController:sn,DoughnutController:Ne,LineController:nn,PieController:Lr,PolarAreaController:Zi,RadarController:rn,ScatterController:on});function Be(){throw new Error("This method is not implemented: Check that a complete date adapter is provided.")}class ko{constructor(t){A(this,"options"),this.options=t||{}}static override(t){Object.assign(ko.prototype,t)}init(){}formats(){return Be()}parse(){return Be()}format(){return Be()}add(){return Be()}diff(){return Be()}startOf(){return Be()}endOf(){return Be()}}var wg={_date:ko};function kg(e,t,i,s){const{controller:n,data:r,_sorted:o}=e,a=n._cachedMeta.iScale,l=e.dataset&&e.dataset.options?e.dataset.options.spanGaps:null;if(a&&t===a.axis&&t!=="r"&&o&&r.length){const c=a._reversePixels?Ub:se;if(s){if(n._sharedOptions){const h=r[0],d=typeof h.getRange=="function"&&h.getRange(t);if(d){const u=c(r,t,i-d),p=c(r,t,i+d);return{lo:u.lo,hi:p.hi}}}}else{const h=c(r,t,i);if(l){const{vScale:d}=n._cachedMeta,{_parsed:u}=e,p=u.slice(0,h.lo+1).reverse().findIndex(f=>!z(f[d.axis]));h.lo-=Math.max(0,p);const b=u.slice(h.hi).findIndex(f=>!z(f[d.axis]));h.hi+=Math.max(0,b)}return h}}return{lo:0,hi:r.length-1}}function Un(e,t,i,s,n){const r=e.getSortedVisibleDatasetMetas(),o=i[t];for(let a=0,l=r.length;a<l;++a){const{index:c,data:h}=r[a],{lo:d,hi:u}=kg(r[a],t,o,n);for(let p=d;p<=u;++p){const b=h[p];b.skip||s(b,c,p)}}}function Cg(e){const t=e.indexOf("x")!==-1,i=e.indexOf("y")!==-1;return function(s,n){const r=t?Math.abs(s.x-n.x):0,o=i?Math.abs(s.y-n.y):0;return Math.sqrt(Math.pow(r,2)+Math.pow(o,2))}}function hr(e,t,i,s,n){const r=[];return!n&&!e.isPointInArea(t)||Un(e,i,t,function(o,a,l){!n&&!ne(o,e.chartArea,0)||o.inRange(t.x,t.y,s)&&r.push({element:o,datasetIndex:a,index:l})},!0),r}function Sg(e,t,i,s){let n=[];function r(o,a,l){const{startAngle:c,endAngle:h}=o.getProps(["startAngle","endAngle"],s),{angle:d}=gh(o,{x:t.x,y:t.y});hs(d,c,h)&&n.push({element:o,datasetIndex:a,index:l})}return Un(e,i,t,r),n}function Mg(e,t,i,s,n,r){let o=[];const a=Cg(i);let l=Number.POSITIVE_INFINITY;function c(h,d,u){const p=h.inRange(t.x,t.y,n);if(s&&!p)return;const b=h.getCenterPoint(n);if(!(r||e.isPointInArea(b))&&!p)return;const f=a(t,b);f<l?(o=[{element:h,datasetIndex:d,index:u}],l=f):f===l&&o.push({element:h,datasetIndex:d,index:u})}return Un(e,i,t,c),o}function dr(e,t,i,s,n,r){return!r&&!e.isPointInArea(t)?[]:i==="r"&&!s?Sg(e,t,i,n):Mg(e,t,i,s,n,r)}function Na(e,t,i,s,n){const r=[],o=i==="x"?"inXRange":"inYRange";let a=!1;return Un(e,i,t,(l,c,h)=>{l[o]&&l[o](t[i],n)&&(r.push({element:l,datasetIndex:c,index:h}),a=a||l.inRange(t.x,t.y,n))}),s&&!a?[]:r}var Ag={modes:{index(e,t,i,s){const n=He(t,e),r=i.axis||"x",o=i.includeInvisible||!1,a=i.intersect?hr(e,n,r,s,o):dr(e,n,r,!1,s,o),l=[];return a.length?(e.getSortedVisibleDatasetMetas().forEach(c=>{const h=a[0].index,d=c.data[h];d&&!d.skip&&l.push({element:d,datasetIndex:c.index,index:h})}),l):[]},dataset(e,t,i,s){const n=He(t,e),r=i.axis||"xy",o=i.includeInvisible||!1;let a=i.intersect?hr(e,n,r,s,o):dr(e,n,r,!1,s,o);if(a.length>0){const l=a[0].datasetIndex,c=e.getDatasetMeta(l).data;a=[];for(let h=0;h<c.length;++h)a.push({element:c[h],datasetIndex:l,index:h})}return a},point(e,t,i,s){const n=He(t,e),r=i.axis||"xy",o=i.includeInvisible||!1;return hr(e,n,r,s,o)},nearest(e,t,i,s){const n=He(t,e),r=i.axis||"xy",o=i.includeInvisible||!1;return dr(e,n,r,i.intersect,s,o)},x(e,t,i,s){const n=He(t,e);return Na(e,n,"x",i.intersect,s)},y(e,t,i,s){const n=He(t,e);return Na(e,n,"y",i.intersect,s)}}};const Vh=["left","top","right","bottom"];function zi(e,t){return e.filter(i=>i.pos===t)}function Wa(e,t){return e.filter(i=>Vh.indexOf(i.pos)===-1&&i.box.axis===t)}function Ri(e,t){return e.sort((i,s)=>{const n=t?s:i,r=t?i:s;return n.weight===r.weight?n.index-r.index:n.weight-r.weight})}function $g(e){const t=[];let i,s,n,r,o,a;for(i=0,s=(e||[]).length;i<s;++i)n=e[i],{position:r,options:{stack:o,stackWeight:a=1}}=n,t.push({index:i,box:n,pos:r,horizontal:n.isHorizontal(),weight:n.weight,stack:o&&r+o,stackWeight:a});return t}function Eg(e){const t={};for(const i of e){const{stack:s,pos:n,stackWeight:r}=i;if(!s||!Vh.includes(n))continue;const o=t[s]||(t[s]={count:0,placed:0,weight:0,size:0});o.count++,o.weight+=r}return t}function Pg(e,t){const i=Eg(e),{vBoxMaxWidth:s,hBoxMaxHeight:n}=t;let r,o,a;for(r=0,o=e.length;r<o;++r){a=e[r];const{fullSize:l}=a.box,c=i[a.stack],h=c&&a.stackWeight/c.weight;a.horizontal?(a.width=h?h*s:l&&t.availableWidth,a.height=n):(a.width=s,a.height=h?h*n:l&&t.availableHeight)}return i}function Dg(e){const t=$g(e),i=Ri(t.filter(c=>c.box.fullSize),!0),s=Ri(zi(t,"left"),!0),n=Ri(zi(t,"right")),r=Ri(zi(t,"top"),!0),o=Ri(zi(t,"bottom")),a=Wa(t,"x"),l=Wa(t,"y");return{fullSize:i,leftAndTop:s.concat(r),rightAndBottom:n.concat(l).concat(o).concat(a),chartArea:zi(t,"chartArea"),vertical:s.concat(n).concat(l),horizontal:r.concat(o).concat(a)}}function Ua(e,t,i,s){return Math.max(e[i],t[i])+Math.max(e[s],t[s])}function Nh(e,t){e.top=Math.max(e.top,t.top),e.left=Math.max(e.left,t.left),e.bottom=Math.max(e.bottom,t.bottom),e.right=Math.max(e.right,t.right)}function Og(e,t,i,s){const{pos:n,box:r}=i,o=e.maxPadding;if(!B(n)){i.size&&(e[n]-=i.size);const d=s[i.stack]||{size:0,count:1};d.size=Math.max(d.size,i.horizontal?r.height:r.width),i.size=d.size/d.count,e[n]+=i.size}r.getPadding&&Nh(o,r.getPadding());const a=Math.max(0,t.outerWidth-Ua(o,e,"left","right")),l=Math.max(0,t.outerHeight-Ua(o,e,"top","bottom")),c=a!==e.w,h=l!==e.h;return e.w=a,e.h=l,i.horizontal?{same:c,other:h}:{same:h,other:c}}function Tg(e){const t=e.maxPadding;function i(s){const n=Math.max(t[s]-e[s],0);return e[s]+=n,n}e.y+=i("top"),e.x+=i("left"),i("right"),i("bottom")}function Lg(e,t){const i=t.maxPadding;function s(n){const r={left:0,top:0,right:0,bottom:0};return n.forEach(o=>{r[o]=Math.max(t[o],i[o])}),r}return s(e?["left","right"]:["top","bottom"])}function Vi(e,t,i,s){const n=[];let r,o,a,l,c,h;for(r=0,o=e.length,c=0;r<o;++r){a=e[r],l=a.box,l.update(a.width||t.w,a.height||t.h,Lg(a.horizontal,t));const{same:d,other:u}=Og(t,i,a,s);c|=d&&n.length,h=h||u,l.fullSize||n.push(a)}return c&&Vi(n,t,i,s)||h}function Hs(e,t,i,s,n){e.top=i,e.left=t,e.right=t+s,e.bottom=i+n,e.width=s,e.height=n}function qa(e,t,i,s){const n=i.padding;let{x:r,y:o}=t;for(const a of e){const l=a.box,c=s[a.stack]||{placed:0,weight:1},h=a.stackWeight/c.weight||1;if(a.horizontal){const d=t.w*h,u=c.size||l.height;cs(c.start)&&(o=c.start),l.fullSize?Hs(l,n.left,o,i.outerWidth-n.right-n.left,u):Hs(l,t.left+c.placed,o,d,u),c.start=o,c.placed+=d,o=l.bottom}else{const d=t.h*h,u=c.size||l.width;cs(c.start)&&(r=c.start),l.fullSize?Hs(l,r,n.top,u,i.outerHeight-n.bottom-n.top):Hs(l,r,t.top+c.placed,u,d),c.start=r,c.placed+=d,r=l.right}}t.x=r,t.y=o}var bt={addBox(e,t){e.boxes||(e.boxes=[]),t.fullSize=t.fullSize||!1,t.position=t.position||"top",t.weight=t.weight||0,t._layers=t._layers||function(){return[{z:0,draw(i){t.draw(i)}}]},e.boxes.push(t)},removeBox(e,t){const i=e.boxes?e.boxes.indexOf(t):-1;i!==-1&&e.boxes.splice(i,1)},configure(e,t,i){t.fullSize=i.fullSize,t.position=i.position,t.weight=i.weight},update(e,t,i,s){if(!e)return;const n=dt(e.options.layout.padding),r=Math.max(t-n.width,0),o=Math.max(i-n.height,0),a=Dg(e.boxes),l=a.vertical,c=a.horizontal;N(e.boxes,f=>{typeof f.beforeLayout=="function"&&f.beforeLayout()});const h=l.reduce((f,m)=>m.box.options&&m.box.options.display===!1?f:f+1,0)||1,d=Object.freeze({outerWidth:t,outerHeight:i,padding:n,availableWidth:r,availableHeight:o,vBoxMaxWidth:r/2/h,hBoxMaxHeight:o/2}),u=Object.assign({},n);Nh(u,dt(s));const p=Object.assign({maxPadding:u,w:r,h:o,x:n.left,y:n.top},n),b=Pg(l.concat(c),d);Vi(a.fullSize,p,d,b),Vi(l,p,d,b),Vi(c,p,d,b)&&Vi(l,p,d,b),Tg(p),qa(a.leftAndTop,p,d,b),p.x+=p.w,p.y+=p.h,qa(a.rightAndBottom,p,d,b),e.chartArea={left:p.left,top:p.top,right:p.left+p.w,bottom:p.top+p.h,height:p.h,width:p.w},N(a.chartArea,f=>{const m=f.box;Object.assign(m,e.chartArea),m.update(p.w,p.h,{left:0,top:0,right:0,bottom:0})})}};class Wh{acquireContext(t,i){}releaseContext(t){return!1}addEventListener(t,i,s){}removeEventListener(t,i,s){}getDevicePixelRatio(){return 1}getMaximumSize(t,i,s,n){return i=Math.max(0,i||t.width),s=s||t.height,{width:i,height:Math.max(0,n?Math.floor(i/n):s)}}isAttached(t){return!0}updateConfig(t){}}class zg extends Wh{acquireContext(t){return t&&t.getContext&&t.getContext("2d")||null}updateConfig(t){t.options.animation=!1}}const an="$chartjs",Rg={touchstart:"mousedown",touchmove:"mousemove",touchend:"mouseup",pointerenter:"mouseenter",pointerdown:"mousedown",pointermove:"mousemove",pointerup:"mouseup",pointerleave:"mouseout",pointerout:"mouseout"},Ya=e=>e===null||e==="";function Ig(e,t){const i=e.style,s=e.getAttribute("height"),n=e.getAttribute("width");if(e[an]={initial:{height:s,width:n,style:{display:i.display,height:i.height,width:i.width}}},i.display=i.display||"block",i.boxSizing=i.boxSizing||"border-box",Ya(n)){const r=Pa(e,"width");r!==void 0&&(e.width=r)}if(Ya(s))if(e.style.height==="")e.height=e.width/(t||2);else{const r=Pa(e,"height");r!==void 0&&(e.height=r)}return e}const Uh=Bm?{passive:!0}:!1;function Bg(e,t,i){e&&e.addEventListener(t,i,Uh)}function Fg(e,t,i){e&&e.canvas&&e.canvas.removeEventListener(t,i,Uh)}function Hg(e,t){const i=Rg[e.type]||e.type,{x:s,y:n}=He(e,t);return{type:i,chart:t,native:e,x:s!==void 0?s:null,y:n!==void 0?n:null}}function Sn(e,t){for(const i of e)if(i===t||i.contains(t))return!0}function jg(e,t,i){const s=e.canvas,n=new MutationObserver(r=>{let o=!1;for(const a of r)o=o||Sn(a.addedNodes,s),o=o&&!Sn(a.removedNodes,s);o&&i()});return n.observe(document,{childList:!0,subtree:!0}),n}function Vg(e,t,i){const s=e.canvas,n=new MutationObserver(r=>{let o=!1;for(const a of r)o=o||Sn(a.removedNodes,s),o=o&&!Sn(a.addedNodes,s);o&&i()});return n.observe(document,{childList:!0,subtree:!0}),n}const us=new Map;let Ka=0;function qh(){const e=window.devicePixelRatio;e!==Ka&&(Ka=e,us.forEach((t,i)=>{i.currentDevicePixelRatio!==e&&t()}))}function Ng(e,t){us.size||window.addEventListener("resize",qh),us.set(e,t)}function Wg(e){us.delete(e),us.size||window.removeEventListener("resize",qh)}function Ug(e,t,i){const s=e.canvas,n=s&&wo(s);if(!n)return;const r=_h((a,l)=>{const c=n.clientWidth;i(a,l),c<n.clientWidth&&i()},window),o=new ResizeObserver(a=>{const l=a[0],c=l.contentRect.width,h=l.contentRect.height;c===0&&h===0||r(c,h)});return o.observe(n),Ng(e,r),o}function ur(e,t,i){i&&i.disconnect(),t==="resize"&&Wg(e)}function qg(e,t,i){const s=e.canvas,n=_h(r=>{e.ctx!==null&&i(Hg(r,e))},e);return Bg(s,t,n),n}class Yg extends Wh{acquireContext(t,i){const s=t&&t.getContext&&t.getContext("2d");return s&&s.canvas===t?(Ig(t,i),s):null}releaseContext(t){const i=t.canvas;if(!i[an])return!1;const s=i[an].initial;["height","width"].forEach(r=>{const o=s[r];z(o)?i.removeAttribute(r):i.setAttribute(r,o)});const n=s.style||{};return Object.keys(n).forEach(r=>{i.style[r]=n[r]}),i.width=i.width,delete i[an],!0}addEventListener(t,i,s){this.removeEventListener(t,i);const n=t.$proxies||(t.$proxies={}),r={attach:jg,detach:Vg,resize:Ug}[i]||qg;n[i]=r(t,i,s)}removeEventListener(t,i){const s=t.$proxies||(t.$proxies={}),n=s[i];n&&(({attach:ur,detach:ur,resize:ur}[i]||Fg)(t,i,n),s[i]=void 0)}getDevicePixelRatio(){return window.devicePixelRatio}getMaximumSize(t,i,s,n){return Im(t,i,s,n)}isAttached(t){const i=t&&wo(t);return!!(i&&i.isConnected)}}function Kg(e){return!_o()||typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas?zg:Yg}var js;let de=(js=class{constructor(){A(this,"x"),A(this,"y"),A(this,"active",!1),A(this,"options"),A(this,"$animations")}tooltipPosition(e){const{x:t,y:i}=this.getProps(["x","y"],e);return{x:t,y:i}}hasValue(){return vi(this.x)&&vi(this.y)}getProps(e,t){const i=this.$animations;if(!t||!i)return this;const s={};return e.forEach(n=>{s[n]=i[n]&&i[n].active()?i[n]._to:this[n]}),s}},A(js,"defaults",{}),A(js,"defaultRoutes"),js);function Gg(e,t){const i=e.options.ticks,s=Xg(e),n=Math.min(i.maxTicksLimit||s,s),r=i.major.enabled?Zg(t):[],o=r.length,a=r[0],l=r[o-1],c=[];if(o>n)return Jg(t,c,r,o/n),c;const h=Qg(r,t,n);if(o>0){let d,u;const p=o>1?Math.round((l-a)/(o-1)):null;for(Vs(t,c,h,z(p)?0:a-p,a),d=0,u=o-1;d<u;d++)Vs(t,c,h,r[d],r[d+1]);return Vs(t,c,h,l,z(p)?t.length:l+p),c}return Vs(t,c,h),c}function Xg(e){const t=e.options.offset,i=e._tickSize(),s=e._length/i+(t?0:1),n=e._maxLength/i;return Math.floor(Math.min(s,n))}function Qg(e,t,i){const s=tv(e),n=t.length/i;if(!s)return Math.max(n,1);const r=Hb(s);for(let o=0,a=r.length-1;o<a;o++){const l=r[o];if(l>n)return l}return Math.max(n,1)}function Zg(e){const t=[];let i,s;for(i=0,s=e.length;i<s;i++)e[i].major&&t.push(i);return t}function Jg(e,t,i,s){let n=0,r=i[0],o;for(s=Math.ceil(s),o=0;o<e.length;o++)o===r&&(t.push(e[o]),n++,r=i[n*s])}function Vs(e,t,i,s,n){const r=L(s,0),o=Math.min(L(n,e.length),e.length);let a=0,l,c,h;for(i=Math.ceil(i),n&&(l=n-s,i=l/Math.floor(l/i)),h=r;h<0;)a++,h=Math.round(r+a*i);for(c=Math.max(r,0);c<o;c++)c===h&&(t.push(e[c]),a++,h=Math.round(r+a*i))}function tv(e){const t=e.length;let i,s;if(t<2)return!1;for(s=e[0],i=1;i<t;++i)if(e[i]-e[i-1]!==s)return!1;return s}const ev=e=>e==="left"?"right":e==="right"?"left":e,Ga=(e,t,i)=>t==="top"||t==="left"?e[t]+i:e[t]-i,Xa=(e,t)=>Math.min(t||e,e);function Qa(e,t){const i=[],s=e.length/t,n=e.length;let r=0;for(;r<n;r+=s)i.push(e[Math.floor(r)]);return i}function iv(e,t,i){const s=e.ticks.length,n=Math.min(t,s-1),r=e._startPixel,o=e._endPixel,a=1e-6;let l=e.getPixelForTick(n),c;if(!(i&&(s===1?c=Math.max(l-r,o-l):t===0?c=(e.getPixelForTick(1)-l)/2:c=(l-e.getPixelForTick(n-1))/2,l+=n<t?c:-c,l<r-a||l>o+a)))return l}function sv(e,t){N(e,i=>{const s=i.gc,n=s.length/2;let r;if(n>t){for(r=0;r<n;++r)delete i.data[s[r]];s.splice(0,n)}})}function Ii(e){return e.drawTicks?e.tickLength:0}function Za(e,t){if(!e.display)return 0;const i=at(e.font,t),s=dt(e.padding);return(Y(e.text)?e.text.length:1)*i.lineHeight+s.height}function nv(e,t){return Pe(e,{scale:t,type:"scale"})}function rv(e,t,i){return Pe(e,{tick:i,index:t,type:"tick"})}function ov(e,t,i){let s=bo(e);return(i&&t!=="right"||!i&&t==="right")&&(s=ev(s)),s}function av(e,t,i,s){const{top:n,left:r,bottom:o,right:a,chart:l}=e,{chartArea:c,scales:h}=l;let d=0,u,p,b;const f=o-n,m=a-r;if(e.isHorizontal()){if(p=pt(s,r,a),B(i)){const g=Object.keys(i)[0],y=i[g];b=h[g].getPixelForValue(y)+f-t}else i==="center"?b=(c.bottom+c.top)/2+f-t:b=Ga(e,i,t);u=a-r}else{if(B(i)){const g=Object.keys(i)[0],y=i[g];p=h[g].getPixelForValue(y)-m+t}else i==="center"?p=(c.left+c.right)/2-m+t:p=Ga(e,i,t);b=pt(s,o,n),d=i==="left"?-st:st}return{titleX:p,titleY:b,maxWidth:u,rotation:d}}class ii extends de{constructor(t){super(),this.id=t.id,this.type=t.type,this.options=void 0,this.ctx=t.ctx,this.chart=t.chart,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this._margins={left:0,right:0,top:0,bottom:0},this.maxWidth=void 0,this.maxHeight=void 0,this.paddingTop=void 0,this.paddingBottom=void 0,this.paddingLeft=void 0,this.paddingRight=void 0,this.axis=void 0,this.labelRotation=void 0,this.min=void 0,this.max=void 0,this._range=void 0,this.ticks=[],this._gridLineItems=null,this._labelItems=null,this._labelSizes=null,this._length=0,this._maxLength=0,this._longestTextCache={},this._startPixel=void 0,this._endPixel=void 0,this._reversePixels=!1,this._userMax=void 0,this._userMin=void 0,this._suggestedMax=void 0,this._suggestedMin=void 0,this._ticksLength=0,this._borderValue=0,this._cache={},this._dataLimitsCached=!1,this.$context=void 0}init(t){this.options=t.setContext(this.getContext()),this.axis=t.axis,this._userMin=this.parse(t.min),this._userMax=this.parse(t.max),this._suggestedMin=this.parse(t.suggestedMin),this._suggestedMax=this.parse(t.suggestedMax)}parse(t,i){return t}getUserBounds(){let{_userMin:t,_userMax:i,_suggestedMin:s,_suggestedMax:n}=this;return t=kt(t,Number.POSITIVE_INFINITY),i=kt(i,Number.NEGATIVE_INFINITY),s=kt(s,Number.POSITIVE_INFINITY),n=kt(n,Number.NEGATIVE_INFINITY),{min:kt(t,s),max:kt(i,n),minDefined:tt(t),maxDefined:tt(i)}}getMinMax(t){let{min:i,max:s,minDefined:n,maxDefined:r}=this.getUserBounds(),o;if(n&&r)return{min:i,max:s};const a=this.getMatchingVisibleMetas();for(let l=0,c=a.length;l<c;++l)o=a[l].controller.getMinMax(this,t),n||(i=Math.min(i,o.min)),r||(s=Math.max(s,o.max));return i=r&&i>s?s:i,s=n&&i>s?i:s,{min:kt(i,kt(s,i)),max:kt(s,kt(i,s))}}getPadding(){return{left:this.paddingLeft||0,top:this.paddingTop||0,right:this.paddingRight||0,bottom:this.paddingBottom||0}}getTicks(){return this.ticks}getLabels(){const t=this.chart.data;return this.options.labels||(this.isHorizontal()?t.xLabels:t.yLabels)||t.labels||[]}getLabelItems(t=this.chart.chartArea){return this._labelItems||(this._labelItems=this._computeLabelItems(t))}beforeLayout(){this._cache={},this._dataLimitsCached=!1}beforeUpdate(){U(this.options.beforeUpdate,[this])}update(t,i,s){const{beginAtZero:n,grace:r,ticks:o}=this.options,a=o.sampleSize;this.beforeUpdate(),this.maxWidth=t,this.maxHeight=i,this._margins=s=Object.assign({left:0,right:0,top:0,bottom:0},s),this.ticks=null,this._labelSizes=null,this._gridLineItems=null,this._labelItems=null,this.beforeSetDimensions(),this.setDimensions(),this.afterSetDimensions(),this._maxLength=this.isHorizontal()?this.width+s.left+s.right:this.height+s.top+s.bottom,this._dataLimitsCached||(this.beforeDataLimits(),this.determineDataLimits(),this.afterDataLimits(),this._range=bm(this,r,n),this._dataLimitsCached=!0),this.beforeBuildTicks(),this.ticks=this.buildTicks()||[],this.afterBuildTicks();const l=a<this.ticks.length;this._convertTicksToLabels(l?Qa(this.ticks,a):this.ticks),this.configure(),this.beforeCalculateLabelRotation(),this.calculateLabelRotation(),this.afterCalculateLabelRotation(),o.display&&(o.autoSkip||o.source==="auto")&&(this.ticks=Gg(this,this.ticks),this._labelSizes=null,this.afterAutoSkip()),l&&this._convertTicksToLabels(this.ticks),this.beforeFit(),this.fit(),this.afterFit(),this.afterUpdate()}configure(){let t=this.options.reverse,i,s;this.isHorizontal()?(i=this.left,s=this.right):(i=this.top,s=this.bottom,t=!t),this._startPixel=i,this._endPixel=s,this._reversePixels=t,this._length=s-i,this._alignToPixels=this.options.alignToPixels}afterUpdate(){U(this.options.afterUpdate,[this])}beforeSetDimensions(){U(this.options.beforeSetDimensions,[this])}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=0,this.right=this.width):(this.height=this.maxHeight,this.top=0,this.bottom=this.height),this.paddingLeft=0,this.paddingTop=0,this.paddingRight=0,this.paddingBottom=0}afterSetDimensions(){U(this.options.afterSetDimensions,[this])}_callHooks(t){this.chart.notifyPlugins(t,this.getContext()),U(this.options[t],[this])}beforeDataLimits(){this._callHooks("beforeDataLimits")}determineDataLimits(){}afterDataLimits(){this._callHooks("afterDataLimits")}beforeBuildTicks(){this._callHooks("beforeBuildTicks")}buildTicks(){return[]}afterBuildTicks(){this._callHooks("afterBuildTicks")}beforeTickToLabelConversion(){U(this.options.beforeTickToLabelConversion,[this])}generateTickLabels(t){const i=this.options.ticks;let s,n,r;for(s=0,n=t.length;s<n;s++)r=t[s],r.label=U(i.callback,[r.value,s,t],this)}afterTickToLabelConversion(){U(this.options.afterTickToLabelConversion,[this])}beforeCalculateLabelRotation(){U(this.options.beforeCalculateLabelRotation,[this])}calculateLabelRotation(){const t=this.options,i=t.ticks,s=Xa(this.ticks.length,t.ticks.maxTicksLimit),n=i.minRotation||0,r=i.maxRotation;let o=n,a,l,c;if(!this._isVisible()||!i.display||n>=r||s<=1||!this.isHorizontal()){this.labelRotation=n;return}const h=this._getLabelSizes(),d=h.widest.width,u=h.highest.height,p=ct(this.chart.width-d,0,this.maxWidth);a=t.offset?this.maxWidth/s:p/(s-1),d+6>a&&(a=p/(s-(t.offset?.5:1)),l=this.maxHeight-Ii(t.grid)-i.padding-Za(t.title,this.chart.options.font),c=Math.sqrt(d*d+u*u),o=po(Math.min(Math.asin(ct((h.highest.height+6)/a,-1,1)),Math.asin(ct(l/c,-1,1))-Math.asin(ct(u/c,-1,1)))),o=Math.max(n,Math.min(r,o))),this.labelRotation=o}afterCalculateLabelRotation(){U(this.options.afterCalculateLabelRotation,[this])}afterAutoSkip(){}beforeFit(){U(this.options.beforeFit,[this])}fit(){const t={width:0,height:0},{chart:i,options:{ticks:s,title:n,grid:r}}=this,o=this._isVisible(),a=this.isHorizontal();if(o){const l=Za(n,i.options.font);if(a?(t.width=this.maxWidth,t.height=Ii(r)+l):(t.height=this.maxHeight,t.width=Ii(r)+l),s.display&&this.ticks.length){const{first:c,last:h,widest:d,highest:u}=this._getLabelSizes(),p=s.padding*2,b=Rt(this.labelRotation),f=Math.cos(b),m=Math.sin(b);if(a){const g=s.mirror?0:m*d.width+f*u.height;t.height=Math.min(this.maxHeight,t.height+g+p)}else{const g=s.mirror?0:f*d.width+m*u.height;t.width=Math.min(this.maxWidth,t.width+g+p)}this._calculatePadding(c,h,m,f)}}this._handleMargins(),a?(this.width=this._length=i.width-this._margins.left-this._margins.right,this.height=t.height):(this.width=t.width,this.height=this._length=i.height-this._margins.top-this._margins.bottom)}_calculatePadding(t,i,s,n){const{ticks:{align:r,padding:o},position:a}=this.options,l=this.labelRotation!==0,c=a!=="top"&&this.axis==="x";if(this.isHorizontal()){const h=this.getPixelForTick(0)-this.left,d=this.right-this.getPixelForTick(this.ticks.length-1);let u=0,p=0;l?c?(u=n*t.width,p=s*i.height):(u=s*t.height,p=n*i.width):r==="start"?p=i.width:r==="end"?u=t.width:r!=="inner"&&(u=t.width/2,p=i.width/2),this.paddingLeft=Math.max((u-h+o)*this.width/(this.width-h),0),this.paddingRight=Math.max((p-d+o)*this.width/(this.width-d),0)}else{let h=i.height/2,d=t.height/2;r==="start"?(h=0,d=t.height):r==="end"&&(h=i.height,d=0),this.paddingTop=h+o,this.paddingBottom=d+o}}_handleMargins(){this._margins&&(this._margins.left=Math.max(this.paddingLeft,this._margins.left),this._margins.top=Math.max(this.paddingTop,this._margins.top),this._margins.right=Math.max(this.paddingRight,this._margins.right),this._margins.bottom=Math.max(this.paddingBottom,this._margins.bottom))}afterFit(){U(this.options.afterFit,[this])}isHorizontal(){const{axis:t,position:i}=this.options;return i==="top"||i==="bottom"||t==="x"}isFullSize(){return this.options.fullSize}_convertTicksToLabels(t){this.beforeTickToLabelConversion(),this.generateTickLabels(t);let i,s;for(i=0,s=t.length;i<s;i++)z(t[i].label)&&(t.splice(i,1),s--,i--);this.afterTickToLabelConversion()}_getLabelSizes(){let t=this._labelSizes;if(!t){const i=this.options.ticks.sampleSize;let s=this.ticks;i<s.length&&(s=Qa(s,i)),this._labelSizes=t=this._computeLabelSizes(s,s.length,this.options.ticks.maxTicksLimit)}return t}_computeLabelSizes(t,i,s){const{ctx:n,_longestTextCache:r}=this,o=[],a=[],l=Math.floor(i/Xa(i,s));let c=0,h=0,d,u,p,b,f,m,g,y,x,_,C;for(d=0;d<i;d+=l){if(b=t[d].label,f=this._resolveTickFontOptions(d),n.font=m=f.string,g=r[m]=r[m]||{data:{},gc:[]},y=f.lineHeight,x=_=0,!z(b)&&!Y(b))x=kn(n,g.data,g.gc,x,b),_=y;else if(Y(b))for(u=0,p=b.length;u<p;++u)C=b[u],!z(C)&&!Y(C)&&(x=kn(n,g.data,g.gc,x,C),_+=y);o.push(x),a.push(_),c=Math.max(x,c),h=Math.max(_,h)}sv(r,i);const k=o.indexOf(c),S=a.indexOf(h),M=E=>({width:o[E]||0,height:a[E]||0});return{first:M(0),last:M(i-1),widest:M(k),highest:M(S),widths:o,heights:a}}getLabelForValue(t){return t}getPixelForValue(t,i){return NaN}getValueForPixel(t){}getPixelForTick(t){const i=this.ticks;return t<0||t>i.length-1?null:this.getPixelForValue(i[t].value)}getPixelForDecimal(t){this._reversePixels&&(t=1-t);const i=this._startPixel+t*this._length;return Wb(this._alignToPixels?Ie(this.chart,i,0):i)}getDecimalForPixel(t){const i=(t-this._startPixel)/this._length;return this._reversePixels?1-i:i}getBasePixel(){return this.getPixelForValue(this.getBaseValue())}getBaseValue(){const{min:t,max:i}=this;return t<0&&i<0?i:t>0&&i>0?t:0}getContext(t){const i=this.ticks||[];if(t>=0&&t<i.length){const s=i[t];return s.$context||(s.$context=rv(this.getContext(),t,s))}return this.$context||(this.$context=nv(this.chart.getContext(),this))}_tickSize(){const t=this.options.ticks,i=Rt(this.labelRotation),s=Math.abs(Math.cos(i)),n=Math.abs(Math.sin(i)),r=this._getLabelSizes(),o=t.autoSkipPadding||0,a=r?r.widest.width+o:0,l=r?r.highest.height+o:0;return this.isHorizontal()?l*s>a*n?a/s:l/n:l*n<a*s?l/s:a/n}_isVisible(){const t=this.options.display;return t!=="auto"?!!t:this.getMatchingVisibleMetas().length>0}_computeGridLineItems(t){const i=this.axis,s=this.chart,n=this.options,{grid:r,position:o,border:a}=n,l=r.offset,c=this.isHorizontal(),h=this.ticks.length+(l?1:0),d=Ii(r),u=[],p=a.setContext(this.getContext()),b=p.display?p.width:0,f=b/2,m=function(D){return Ie(s,D,b)};let g,y,x,_,C,k,S,M,E,$,P,O;if(o==="top")g=m(this.bottom),k=this.bottom-d,M=g-f,$=m(t.top)+f,O=t.bottom;else if(o==="bottom")g=m(this.top),$=t.top,O=m(t.bottom)-f,k=g+f,M=this.top+d;else if(o==="left")g=m(this.right),C=this.right-d,S=g-f,E=m(t.left)+f,P=t.right;else if(o==="right")g=m(this.left),E=t.left,P=m(t.right)-f,C=g+f,S=this.left+d;else if(i==="x"){if(o==="center")g=m((t.top+t.bottom)/2+.5);else if(B(o)){const D=Object.keys(o)[0],F=o[D];g=m(this.chart.scales[D].getPixelForValue(F))}$=t.top,O=t.bottom,k=g+f,M=k+d}else if(i==="y"){if(o==="center")g=m((t.left+t.right)/2);else if(B(o)){const D=Object.keys(o)[0],F=o[D];g=m(this.chart.scales[D].getPixelForValue(F))}C=g-f,S=C-d,E=t.left,P=t.right}const Q=L(n.ticks.maxTicksLimit,h),V=Math.max(1,Math.ceil(h/Q));for(y=0;y<h;y+=V){const D=this.getContext(y),F=r.setContext(D),W=a.setContext(D),J=F.lineWidth,X=F.color,ue=W.dash||[],Ps=W.dashOffset,ri=F.tickWidth,Mi=F.tickColor,De=F.tickBorderDash||[],Ai=F.tickBorderDashOffset;x=iv(this,y,l),x!==void 0&&(_=Ie(s,x,J),c?C=S=E=P=_:k=M=$=O=_,u.push({tx1:C,ty1:k,tx2:S,ty2:M,x1:E,y1:$,x2:P,y2:O,width:J,color:X,borderDash:ue,borderDashOffset:Ps,tickWidth:ri,tickColor:Mi,tickBorderDash:De,tickBorderDashOffset:Ai}))}return this._ticksLength=h,this._borderValue=g,u}_computeLabelItems(t){const i=this.axis,s=this.options,{position:n,ticks:r}=s,o=this.isHorizontal(),a=this.ticks,{align:l,crossAlign:c,padding:h,mirror:d}=r,u=Ii(s.grid),p=u+h,b=d?-h:p,f=-Rt(this.labelRotation),m=[];let g,y,x,_,C,k,S,M,E,$,P,O,Q="middle";if(n==="top")k=this.bottom-b,S=this._getXAxisLabelAlignment();else if(n==="bottom")k=this.top+b,S=this._getXAxisLabelAlignment();else if(n==="left"){const D=this._getYAxisLabelAlignment(u);S=D.textAlign,C=D.x}else if(n==="right"){const D=this._getYAxisLabelAlignment(u);S=D.textAlign,C=D.x}else if(i==="x"){if(n==="center")k=(t.top+t.bottom)/2+p;else if(B(n)){const D=Object.keys(n)[0],F=n[D];k=this.chart.scales[D].getPixelForValue(F)+p}S=this._getXAxisLabelAlignment()}else if(i==="y"){if(n==="center")C=(t.left+t.right)/2-p;else if(B(n)){const D=Object.keys(n)[0],F=n[D];C=this.chart.scales[D].getPixelForValue(F)}S=this._getYAxisLabelAlignment(u).textAlign}i==="y"&&(l==="start"?Q="top":l==="end"&&(Q="bottom"));const V=this._getLabelSizes();for(g=0,y=a.length;g<y;++g){x=a[g],_=x.label;const D=r.setContext(this.getContext(g));M=this.getPixelForTick(g)+r.labelOffset,E=this._resolveTickFontOptions(g),$=E.lineHeight,P=Y(_)?_.length:1;const F=P/2,W=D.color,J=D.textStrokeColor,X=D.textStrokeWidth;let ue=S;o?(C=M,S==="inner"&&(g===y-1?ue=this.options.reverse?"left":"right":g===0?ue=this.options.reverse?"right":"left":ue="center"),n==="top"?c==="near"||f!==0?O=-P*$+$/2:c==="center"?O=-V.highest.height/2-F*$+$:O=-V.highest.height+$/2:c==="near"||f!==0?O=$/2:c==="center"?O=V.highest.height/2-F*$:O=V.highest.height-P*$,d&&(O*=-1),f!==0&&!D.showLabelBackdrop&&(C+=$/2*Math.sin(f))):(k=M,O=(1-P)*$/2);let Ps;if(D.showLabelBackdrop){const ri=dt(D.backdropPadding),Mi=V.heights[g],De=V.widths[g];let Ai=O-ri.top,$i=0-ri.left;switch(Q){case"middle":Ai-=Mi/2;break;case"bottom":Ai-=Mi;break}switch(S){case"center":$i-=De/2;break;case"right":$i-=De;break;case"inner":g===y-1?$i-=De:g>0&&($i-=De/2);break}Ps={left:$i,top:Ai,width:De+ri.width,height:Mi+ri.height,color:D.backdropColor}}m.push({label:_,font:E,textOffset:O,options:{rotation:f,color:W,strokeColor:J,strokeWidth:X,textAlign:ue,textBaseline:Q,translation:[C,k],backdrop:Ps}})}return m}_getXAxisLabelAlignment(){const{position:t,ticks:i}=this.options;if(-Rt(this.labelRotation))return t==="top"?"left":"right";let s="center";return i.align==="start"?s="left":i.align==="end"?s="right":i.align==="inner"&&(s="inner"),s}_getYAxisLabelAlignment(t){const{position:i,ticks:{crossAlign:s,mirror:n,padding:r}}=this.options,o=this._getLabelSizes(),a=t+r,l=o.widest.width;let c,h;return i==="left"?n?(h=this.right+r,s==="near"?c="left":s==="center"?(c="center",h+=l/2):(c="right",h+=l)):(h=this.right-a,s==="near"?c="right":s==="center"?(c="center",h-=l/2):(c="left",h=this.left)):i==="right"?n?(h=this.left+r,s==="near"?c="right":s==="center"?(c="center",h-=l/2):(c="left",h-=l)):(h=this.left+a,s==="near"?c="left":s==="center"?(c="center",h+=l/2):(c="right",h=this.right)):c="right",{textAlign:c,x:h}}_computeLabelArea(){if(this.options.ticks.mirror)return;const t=this.chart,i=this.options.position;if(i==="left"||i==="right")return{top:0,left:this.left,bottom:t.height,right:this.right};if(i==="top"||i==="bottom")return{top:this.top,left:0,bottom:this.bottom,right:t.width}}drawBackground(){const{ctx:t,options:{backgroundColor:i},left:s,top:n,width:r,height:o}=this;i&&(t.save(),t.fillStyle=i,t.fillRect(s,n,r,o),t.restore())}getLineWidthForValue(t){const i=this.options.grid;if(!this._isVisible()||!i.display)return 0;const s=this.ticks.findIndex(n=>n.value===t);return s>=0?i.setContext(this.getContext(s)).lineWidth:0}drawGrid(t){const i=this.options.grid,s=this.ctx,n=this._gridLineItems||(this._gridLineItems=this._computeGridLineItems(t));let r,o;const a=(l,c,h)=>{!h.width||!h.color||(s.save(),s.lineWidth=h.width,s.strokeStyle=h.color,s.setLineDash(h.borderDash||[]),s.lineDashOffset=h.borderDashOffset,s.beginPath(),s.moveTo(l.x,l.y),s.lineTo(c.x,c.y),s.stroke(),s.restore())};if(i.display)for(r=0,o=n.length;r<o;++r){const l=n[r];i.drawOnChartArea&&a({x:l.x1,y:l.y1},{x:l.x2,y:l.y2},l),i.drawTicks&&a({x:l.tx1,y:l.ty1},{x:l.tx2,y:l.ty2},{color:l.tickColor,width:l.tickWidth,borderDash:l.tickBorderDash,borderDashOffset:l.tickBorderDashOffset})}}drawBorder(){const{chart:t,ctx:i,options:{border:s,grid:n}}=this,r=s.setContext(this.getContext()),o=s.display?r.width:0;if(!o)return;const a=n.setContext(this.getContext(0)).lineWidth,l=this._borderValue;let c,h,d,u;this.isHorizontal()?(c=Ie(t,this.left,o)-o/2,h=Ie(t,this.right,a)+a/2,d=u=l):(d=Ie(t,this.top,o)-o/2,u=Ie(t,this.bottom,a)+a/2,c=h=l),i.save(),i.lineWidth=r.width,i.strokeStyle=r.color,i.beginPath(),i.moveTo(c,d),i.lineTo(h,u),i.stroke(),i.restore()}drawLabels(t){if(!this.options.ticks.display)return;const i=this.ctx,s=this._computeLabelArea();s&&Vn(i,s);const n=this.getLabelItems(t);for(const r of n){const o=r.options,a=r.font,l=r.label,c=r.textOffset;Ke(i,l,0,c,a,o)}s&&Nn(i)}drawTitle(){const{ctx:t,options:{position:i,title:s,reverse:n}}=this;if(!s.display)return;const r=at(s.font),o=dt(s.padding),a=s.align;let l=r.lineHeight/2;i==="bottom"||i==="center"||B(i)?(l+=o.bottom,Y(s.text)&&(l+=r.lineHeight*(s.text.length-1))):l+=o.top;const{titleX:c,titleY:h,maxWidth:d,rotation:u}=av(this,l,i,a);Ke(t,s.text,0,0,r,{color:s.color,maxWidth:d,rotation:u,textAlign:ov(a,i,n),textBaseline:"middle",translation:[c,h]})}draw(t){this._isVisible()&&(this.drawBackground(),this.drawGrid(t),this.drawBorder(),this.drawTitle(),this.drawLabels(t))}_layers(){const t=this.options,i=t.ticks&&t.ticks.z||0,s=L(t.grid&&t.grid.z,-1),n=L(t.border&&t.border.z,0);return!this._isVisible()||this.draw!==ii.prototype.draw?[{z:i,draw:r=>{this.draw(r)}}]:[{z:s,draw:r=>{this.drawBackground(),this.drawGrid(r),this.drawTitle()}},{z:n,draw:()=>{this.drawBorder()}},{z:i,draw:r=>{this.drawLabels(r)}}]}getMatchingVisibleMetas(t){const i=this.chart.getSortedVisibleDatasetMetas(),s=this.axis+"AxisID",n=[];let r,o;for(r=0,o=i.length;r<o;++r){const a=i[r];a[s]===this.id&&(!t||a.type===t)&&n.push(a)}return n}_resolveTickFontOptions(t){const i=this.options.ticks.setContext(this.getContext(t));return at(i.font)}_maxDigits(){const t=this._resolveTickFontOptions(0).lineHeight;return(this.isHorizontal()?this.width:this.height)/t}}class Ns{constructor(t,i,s){this.type=t,this.scope=i,this.override=s,this.items=Object.create(null)}isForType(t){return Object.prototype.isPrototypeOf.call(this.type.prototype,t.prototype)}register(t){const i=Object.getPrototypeOf(t);let s;hv(i)&&(s=this.register(i));const n=this.items,r=t.id,o=this.scope+"."+r;if(!r)throw new Error("class does not have id: "+t);return r in n||(n[r]=t,lv(t,o,s),this.override&&G.override(t.id,t.overrides)),o}get(t){return this.items[t]}unregister(t){const i=this.items,s=t.id,n=this.scope;s in i&&delete i[s],n&&s in G[n]&&(delete G[n][s],this.override&&delete Ye[s])}}function lv(e,t,i){const s=Ut(Object.create(null),[i?G.get(i):{},G.get(t),e.defaults]);G.set(t,s),e.defaultRoutes&&cv(t,e.defaultRoutes),e.descriptors&&G.describe(t,e.descriptors)}function cv(e,t){Object.keys(t).forEach(i=>{const s=i.split("."),n=s.pop(),r=[e].concat(s).join("."),o=t[i].split("."),a=o.pop(),l=o.join(".");G.route(r,n,l,a)})}function hv(e){return"id"in e&&"defaults"in e}class dv{constructor(){this.controllers=new Ns(It,"datasets",!0),this.elements=new Ns(de,"elements"),this.plugins=new Ns(Object,"plugins"),this.scales=new Ns(ii,"scales"),this._typedRegistries=[this.controllers,this.scales,this.elements]}add(...t){this._each("register",t)}remove(...t){this._each("unregister",t)}addControllers(...t){this._each("register",t,this.controllers)}addElements(...t){this._each("register",t,this.elements)}addPlugins(...t){this._each("register",t,this.plugins)}addScales(...t){this._each("register",t,this.scales)}getController(t){return this._get(t,this.controllers,"controller")}getElement(t){return this._get(t,this.elements,"element")}getPlugin(t){return this._get(t,this.plugins,"plugin")}getScale(t){return this._get(t,this.scales,"scale")}removeControllers(...t){this._each("unregister",t,this.controllers)}removeElements(...t){this._each("unregister",t,this.elements)}removePlugins(...t){this._each("unregister",t,this.plugins)}removeScales(...t){this._each("unregister",t,this.scales)}_each(t,i,s){[...i].forEach(n=>{const r=s||this._getRegistryForType(n);s||r.isForType(n)||r===this.plugins&&n.id?this._exec(t,r,n):N(n,o=>{const a=s||this._getRegistryForType(o);this._exec(t,a,o)})})}_exec(t,i,s){const n=uo(t);U(s["before"+n],[],s),i[t](s),U(s["after"+n],[],s)}_getRegistryForType(t){for(let i=0;i<this._typedRegistries.length;i++){const s=this._typedRegistries[i];if(s.isForType(t))return s}return this.plugins}_get(t,i,s){const n=i.get(t);if(n===void 0)throw new Error('"'+t+'" is not a registered '+s+".");return n}}var Ht=new dv;class uv{constructor(){this._init=void 0}notify(t,i,s,n){if(i==="beforeInit"&&(this._init=this._createDescriptors(t,!0),this._notify(this._init,t,"install")),this._init===void 0)return;const r=n?this._descriptors(t).filter(n):this._descriptors(t),o=this._notify(r,t,i,s);return i==="afterDestroy"&&(this._notify(r,t,"stop"),this._notify(this._init,t,"uninstall"),this._init=void 0),o}_notify(t,i,s,n){n=n||{};for(const r of t){const o=r.plugin,a=o[s],l=[i,n,r.options];if(U(a,l,o)===!1&&n.cancelable)return!1}return!0}invalidate(){z(this._cache)||(this._oldCache=this._cache,this._cache=void 0)}_descriptors(t){if(this._cache)return this._cache;const i=this._cache=this._createDescriptors(t);return this._notifyStateChanges(t),i}_createDescriptors(t,i){const s=t&&t.config,n=L(s.options&&s.options.plugins,{}),r=pv(s);return n===!1&&!i?[]:bv(t,r,n,i)}_notifyStateChanges(t){const i=this._oldCache||[],s=this._cache,n=(r,o)=>r.filter(a=>!o.some(l=>a.plugin.id===l.plugin.id));this._notify(n(i,s),t,"stop"),this._notify(n(s,i),t,"start")}}function pv(e){const t={},i=[],s=Object.keys(Ht.plugins.items);for(let r=0;r<s.length;r++)i.push(Ht.getPlugin(s[r]));const n=e.plugins||[];for(let r=0;r<n.length;r++){const o=n[r];i.indexOf(o)===-1&&(i.push(o),t[o.id]=!0)}return{plugins:i,localIds:t}}function fv(e,t){return!t&&e===!1?null:e===!0?{}:e}function bv(e,{plugins:t,localIds:i},s,n){const r=[],o=e.getContext();for(const a of t){const l=a.id,c=fv(s[l],n);c!==null&&r.push({plugin:a,options:mv(e.config,{plugin:a,local:i[l]},c,o)})}return r}function mv(e,{plugin:t,local:i},s,n){const r=e.pluginScopeKeys(t),o=e.getOptionScopes(s,r);return i&&t.defaults&&o.push(t.defaults),e.createResolver(o,n,[""],{scriptable:!1,indexable:!1,allKeys:!0})}function zr(e,t){const i=G.datasets[e]||{};return((t.datasets||{})[e]||{}).indexAxis||t.indexAxis||i.indexAxis||"x"}function gv(e,t){let i=e;return e==="_index_"?i=t:e==="_value_"&&(i=t==="x"?"y":"x"),i}function vv(e,t){return e===t?"_index_":"_value_"}function Ja(e){if(e==="x"||e==="y"||e==="r")return e}function yv(e){if(e==="top"||e==="bottom")return"x";if(e==="left"||e==="right")return"y"}function Rr(e,...t){if(Ja(e))return e;for(const i of t){const s=i.axis||yv(i.position)||e.length>1&&Ja(e[0].toLowerCase());if(s)return s}throw new Error(`Cannot determine type of '${e}' axis. Please provide 'axis' or 'position' option.`)}function tl(e,t,i){if(i[t+"AxisID"]===e)return{axis:t}}function xv(e,t){if(t.data&&t.data.datasets){const i=t.data.datasets.filter(s=>s.xAxisID===e||s.yAxisID===e);if(i.length)return tl(e,"x",i[0])||tl(e,"y",i[0])}return{}}function _v(e,t){const i=Ye[e.type]||{scales:{}},s=t.scales||{},n=zr(e.type,t),r=Object.create(null);return Object.keys(s).forEach(o=>{const a=s[o];if(!B(a))return console.error(`Invalid scale configuration for scale: ${o}`);if(a._proxy)return console.warn(`Ignoring resolver passed as options for scale: ${o}`);const l=Rr(o,a,xv(o,e),G.scales[a.type]),c=vv(l,n),h=i.scales||{};r[o]=Ki(Object.create(null),[{axis:l},a,h[l],h[c]])}),e.data.datasets.forEach(o=>{const a=o.type||e.type,l=o.indexAxis||zr(a,t),c=(Ye[a]||{}).scales||{};Object.keys(c).forEach(h=>{const d=gv(h,l),u=o[d+"AxisID"]||d;r[u]=r[u]||Object.create(null),Ki(r[u],[{axis:d},s[u],c[h]])})}),Object.keys(r).forEach(o=>{const a=r[o];Ki(a,[G.scales[a.type],G.scale])}),r}function Yh(e){const t=e.options||(e.options={});t.plugins=L(t.plugins,{}),t.scales=_v(e,t)}function Kh(e){return e=e||{},e.datasets=e.datasets||[],e.labels=e.labels||[],e}function wv(e){return e=e||{},e.data=Kh(e.data),Yh(e),e}const el=new Map,Gh=new Set;function Ws(e,t){let i=el.get(e);return i||(i=t(),el.set(e,i),Gh.add(i)),i}const Bi=(e,t,i)=>{const s=ke(t,i);s!==void 0&&e.add(s)};class kv{constructor(t){this._config=wv(t),this._scopeCache=new Map,this._resolverCache=new Map}get platform(){return this._config.platform}get type(){return this._config.type}set type(t){this._config.type=t}get data(){return this._config.data}set data(t){this._config.data=Kh(t)}get options(){return this._config.options}set options(t){this._config.options=t}get plugins(){return this._config.plugins}update(){const t=this._config;this.clearCache(),Yh(t)}clearCache(){this._scopeCache.clear(),this._resolverCache.clear()}datasetScopeKeys(t){return Ws(t,()=>[[`datasets.${t}`,""]])}datasetAnimationScopeKeys(t,i){return Ws(`${t}.transition.${i}`,()=>[[`datasets.${t}.transitions.${i}`,`transitions.${i}`],[`datasets.${t}`,""]])}datasetElementScopeKeys(t,i){return Ws(`${t}-${i}`,()=>[[`datasets.${t}.elements.${i}`,`datasets.${t}`,`elements.${i}`,""]])}pluginScopeKeys(t){const i=t.id,s=this.type;return Ws(`${s}-plugin-${i}`,()=>[[`plugins.${i}`,...t.additionalOptionScopes||[]]])}_cachedScopes(t,i){const s=this._scopeCache;let n=s.get(t);return(!n||i)&&(n=new Map,s.set(t,n)),n}getOptionScopes(t,i,s){const{options:n,type:r}=this,o=this._cachedScopes(t,s),a=o.get(i);if(a)return a;const l=new Set;i.forEach(h=>{t&&(l.add(t),h.forEach(d=>Bi(l,t,d))),h.forEach(d=>Bi(l,n,d)),h.forEach(d=>Bi(l,Ye[r]||{},d)),h.forEach(d=>Bi(l,G,d)),h.forEach(d=>Bi(l,Or,d))});const c=Array.from(l);return c.length===0&&c.push(Object.create(null)),Gh.has(i)&&o.set(i,c),c}chartOptionScopes(){const{options:t,type:i}=this;return[t,Ye[i]||{},G.datasets[i]||{},{type:i},G,Or]}resolveNamedOptions(t,i,s,n=[""]){const r={$shared:!0},{resolver:o,subPrefixes:a}=il(this._resolverCache,t,n);let l=o;if(Sv(o,i)){r.$shared=!1,s=Ce(s)?s():s;const c=this.createResolver(t,s,a);l=yi(o,s,c)}for(const c of i)r[c]=l[c];return r}createResolver(t,i,s=[""],n){const{resolver:r}=il(this._resolverCache,t,s);return B(i)?yi(r,i,void 0,n):r}}function il(e,t,i){let s=e.get(t);s||(s=new Map,e.set(t,s));const n=i.join();let r=s.get(n);return r||(r={resolver:vo(t,i),subPrefixes:i.filter(o=>!o.toLowerCase().includes("hover"))},s.set(n,r)),r}const Cv=e=>B(e)&&Object.getOwnPropertyNames(e).some(t=>Ce(e[t]));function Sv(e,t){const{isScriptable:i,isIndexable:s}=Ah(e);for(const n of t){const r=i(n),o=s(n),a=(o||r)&&e[n];if(r&&(Ce(a)||Cv(a))||o&&Y(a))return!0}return!1}var Mv="4.5.1";const Av=["top","bottom","left","right","chartArea"];function sl(e,t){return e==="top"||e==="bottom"||Av.indexOf(e)===-1&&t==="x"}function nl(e,t){return function(i,s){return i[e]===s[e]?i[t]-s[t]:i[e]-s[e]}}function rl(e){const t=e.chart,i=t.options.animation;t.notifyPlugins("afterRender"),U(i&&i.onComplete,[e],t)}function $v(e){const t=e.chart,i=t.options.animation;U(i&&i.onProgress,[e],t)}function Xh(e){return _o()&&typeof e=="string"?e=document.getElementById(e):e&&e.length&&(e=e[0]),e&&e.canvas&&(e=e.canvas),e}const ln={},ol=e=>{const t=Xh(e);return Object.values(ln).filter(i=>i.canvas===t).pop()};function Ev(e,t,i){const s=Object.keys(e);for(const n of s){const r=+n;if(r>=t){const o=e[n];delete e[n],(i>0||r>t)&&(e[r+i]=o)}}}function Pv(e,t,i,s){return!i||e.type==="mouseout"?null:s?t:e}var pe;let ps=(pe=class{static register(...e){Ht.add(...e),al()}static unregister(...e){Ht.remove(...e),al()}constructor(e,t){const i=this.config=new kv(t),s=Xh(e),n=ol(s);if(n)throw new Error("Canvas is already in use. Chart with ID '"+n.id+"' must be destroyed before the canvas with ID '"+n.canvas.id+"' can be reused.");const r=i.createResolver(i.chartOptionScopes(),this.getContext());this.platform=new(i.platform||Kg(s)),this.platform.updateConfig(i);const o=this.platform.acquireContext(s,r.aspectRatio),a=o&&o.canvas,l=a&&a.height,c=a&&a.width;if(this.id=Db(),this.ctx=o,this.canvas=a,this.width=c,this.height=l,this._options=r,this._aspectRatio=this.aspectRatio,this._layers=[],this._metasets=[],this._stacks=void 0,this.boxes=[],this.currentDevicePixelRatio=void 0,this.chartArea=void 0,this._active=[],this._lastEvent=void 0,this._listeners={},this._responsiveListeners=void 0,this._sortedMetasets=[],this.scales={},this._plugins=new uv,this.$proxies={},this._hiddenIndices={},this.attached=!1,this._animationsDisabled=void 0,this.$context=void 0,this._doResize=Kb(h=>this.update(h),r.resizeDelay||0),this._dataChanges=[],ln[this.id]=this,!o||!a){console.error("Failed to create chart: can't acquire context from the given item");return}Gt.listen(this,"complete",rl),Gt.listen(this,"progress",$v),this._initialize(),this.attached&&this.update()}get aspectRatio(){const{options:{aspectRatio:e,maintainAspectRatio:t},width:i,height:s,_aspectRatio:n}=this;return z(e)?t&&n?n:s?i/s:null:e}get data(){return this.config.data}set data(e){this.config.data=e}get options(){return this._options}set options(e){this.config.options=e}get registry(){return Ht}_initialize(){return this.notifyPlugins("beforeInit"),this.options.responsive?this.resize():Ea(this,this.options.devicePixelRatio),this.bindEvents(),this.notifyPlugins("afterInit"),this}clear(){return Ma(this.canvas,this.ctx),this}stop(){return Gt.stop(this),this}resize(e,t){Gt.running(this)?this._resizeBeforeDraw={width:e,height:t}:this._resize(e,t)}_resize(e,t){const i=this.options,s=this.canvas,n=i.maintainAspectRatio&&this.aspectRatio,r=this.platform.getMaximumSize(s,e,t,n),o=i.devicePixelRatio||this.platform.getDevicePixelRatio(),a=this.width?"resize":"attach";this.width=r.width,this.height=r.height,this._aspectRatio=this.aspectRatio,Ea(this,o,!0)&&(this.notifyPlugins("resize",{size:r}),U(i.onResize,[this,r],this),this.attached&&this._doResize(a)&&this.render())}ensureScalesHaveIDs(){const e=this.options.scales||{};N(e,(t,i)=>{t.id=i})}buildOrUpdateScales(){const e=this.options,t=e.scales,i=this.scales,s=Object.keys(i).reduce((r,o)=>(r[o]=!1,r),{});let n=[];t&&(n=n.concat(Object.keys(t).map(r=>{const o=t[r],a=Rr(r,o),l=a==="r",c=a==="x";return{options:o,dposition:l?"chartArea":c?"bottom":"left",dtype:l?"radialLinear":c?"category":"linear"}}))),N(n,r=>{const o=r.options,a=o.id,l=Rr(a,o),c=L(o.type,r.dtype);(o.position===void 0||sl(o.position,l)!==sl(r.dposition))&&(o.position=r.dposition),s[a]=!0;let h=null;if(a in i&&i[a].type===c)h=i[a];else{const d=Ht.getScale(c);h=new d({id:a,type:c,ctx:this.ctx,chart:this}),i[h.id]=h}h.init(o,e)}),N(s,(r,o)=>{r||delete i[o]}),N(i,r=>{bt.configure(this,r,r.options),bt.addBox(this,r)})}_updateMetasets(){const e=this._metasets,t=this.data.datasets.length,i=e.length;if(e.sort((s,n)=>s.index-n.index),i>t){for(let s=t;s<i;++s)this._destroyDatasetMeta(s);e.splice(t,i-t)}this._sortedMetasets=e.slice(0).sort(nl("order","index"))}_removeUnreferencedMetasets(){const{_metasets:e,data:{datasets:t}}=this;e.length>t.length&&delete this._stacks,e.forEach((i,s)=>{t.filter(n=>n===i._dataset).length===0&&this._destroyDatasetMeta(s)})}buildOrUpdateControllers(){const e=[],t=this.data.datasets;let i,s;for(this._removeUnreferencedMetasets(),i=0,s=t.length;i<s;i++){const n=t[i];let r=this.getDatasetMeta(i);const o=n.type||this.config.type;if(r.type&&r.type!==o&&(this._destroyDatasetMeta(i),r=this.getDatasetMeta(i)),r.type=o,r.indexAxis=n.indexAxis||zr(o,this.options),r.order=n.order||0,r.index=i,r.label=""+n.label,r.visible=this.isDatasetVisible(i),r.controller)r.controller.updateIndex(i),r.controller.linkScales();else{const a=Ht.getController(o),{datasetElementType:l,dataElementType:c}=G.datasets[o];Object.assign(a,{dataElementType:Ht.getElement(c),datasetElementType:l&&Ht.getElement(l)}),r.controller=new a(this,i),e.push(r.controller)}}return this._updateMetasets(),e}_resetElements(){N(this.data.datasets,(e,t)=>{this.getDatasetMeta(t).controller.reset()},this)}reset(){this._resetElements(),this.notifyPlugins("reset")}update(e){const t=this.config;t.update();const i=this._options=t.createResolver(t.chartOptionScopes(),this.getContext()),s=this._animationsDisabled=!i.animation;if(this._updateScales(),this._checkEventBindings(),this._updateHiddenIndices(),this._plugins.invalidate(),this.notifyPlugins("beforeUpdate",{mode:e,cancelable:!0})===!1)return;const n=this.buildOrUpdateControllers();this.notifyPlugins("beforeElementsUpdate");let r=0;for(let l=0,c=this.data.datasets.length;l<c;l++){const{controller:h}=this.getDatasetMeta(l),d=!s&&n.indexOf(h)===-1;h.buildOrUpdateElements(d),r=Math.max(+h.getMaxOverflow(),r)}r=this._minPadding=i.layout.autoPadding?r:0,this._updateLayout(r),s||N(n,l=>{l.reset()}),this._updateDatasets(e),this.notifyPlugins("afterUpdate",{mode:e}),this._layers.sort(nl("z","_idx"));const{_active:o,_lastEvent:a}=this;a?this._eventHandler(a,!0):o.length&&this._updateHoverStyles(o,o,!0),this.render()}_updateScales(){N(this.scales,e=>{bt.removeBox(this,e)}),this.ensureScalesHaveIDs(),this.buildOrUpdateScales()}_checkEventBindings(){const e=this.options,t=new Set(Object.keys(this._listeners)),i=new Set(e.events);(!ga(t,i)||!!this._responsiveListeners!==e.responsive)&&(this.unbindEvents(),this.bindEvents())}_updateHiddenIndices(){const{_hiddenIndices:e}=this,t=this._getUniformDataChanges()||[];for(const{method:i,start:s,count:n}of t){const r=i==="_removeElements"?-n:n;Ev(e,s,r)}}_getUniformDataChanges(){const e=this._dataChanges;if(!e||!e.length)return;this._dataChanges=[];const t=this.data.datasets.length,i=n=>new Set(e.filter(r=>r[0]===n).map((r,o)=>o+","+r.splice(1).join(","))),s=i(0);for(let n=1;n<t;n++)if(!ga(s,i(n)))return;return Array.from(s).map(n=>n.split(",")).map(n=>({method:n[1],start:+n[2],count:+n[3]}))}_updateLayout(e){if(this.notifyPlugins("beforeLayout",{cancelable:!0})===!1)return;bt.update(this,this.width,this.height,e);const t=this.chartArea,i=t.width<=0||t.height<=0;this._layers=[],N(this.boxes,s=>{i&&s.position==="chartArea"||(s.configure&&s.configure(),this._layers.push(...s._layers()))},this),this._layers.forEach((s,n)=>{s._idx=n}),this.notifyPlugins("afterLayout")}_updateDatasets(e){if(this.notifyPlugins("beforeDatasetsUpdate",{mode:e,cancelable:!0})!==!1){for(let t=0,i=this.data.datasets.length;t<i;++t)this.getDatasetMeta(t).controller.configure();for(let t=0,i=this.data.datasets.length;t<i;++t)this._updateDataset(t,Ce(e)?e({datasetIndex:t}):e);this.notifyPlugins("afterDatasetsUpdate",{mode:e})}}_updateDataset(e,t){const i=this.getDatasetMeta(e),s={meta:i,index:e,mode:t,cancelable:!0};this.notifyPlugins("beforeDatasetUpdate",s)!==!1&&(i.controller._update(t),s.cancelable=!1,this.notifyPlugins("afterDatasetUpdate",s))}render(){this.notifyPlugins("beforeRender",{cancelable:!0})!==!1&&(Gt.has(this)?this.attached&&!Gt.running(this)&&Gt.start(this):(this.draw(),rl({chart:this})))}draw(){let e;if(this._resizeBeforeDraw){const{width:i,height:s}=this._resizeBeforeDraw;this._resizeBeforeDraw=null,this._resize(i,s)}if(this.clear(),this.width<=0||this.height<=0||this.notifyPlugins("beforeDraw",{cancelable:!0})===!1)return;const t=this._layers;for(e=0;e<t.length&&t[e].z<=0;++e)t[e].draw(this.chartArea);for(this._drawDatasets();e<t.length;++e)t[e].draw(this.chartArea);this.notifyPlugins("afterDraw")}_getSortedDatasetMetas(e){const t=this._sortedMetasets,i=[];let s,n;for(s=0,n=t.length;s<n;++s){const r=t[s];(!e||r.visible)&&i.push(r)}return i}getSortedVisibleDatasetMetas(){return this._getSortedDatasetMetas(!0)}_drawDatasets(){if(this.notifyPlugins("beforeDatasetsDraw",{cancelable:!0})===!1)return;const e=this.getSortedVisibleDatasetMetas();for(let t=e.length-1;t>=0;--t)this._drawDataset(e[t]);this.notifyPlugins("afterDatasetsDraw")}_drawDataset(e){const t=this.ctx,i={meta:e,index:e.index,cancelable:!0},s=Bh(this,e);this.notifyPlugins("beforeDatasetDraw",i)!==!1&&(s&&Vn(t,s),e.controller.draw(),s&&Nn(t),i.cancelable=!1,this.notifyPlugins("afterDatasetDraw",i))}isPointInArea(e){return ne(e,this.chartArea,this._minPadding)}getElementsAtEventForMode(e,t,i,s){const n=Ag.modes[t];return typeof n=="function"?n(this,e,i,s):[]}getDatasetMeta(e){const t=this.data.datasets[e],i=this._metasets;let s=i.filter(n=>n&&n._dataset===t).pop();return s||(s={type:null,data:[],dataset:null,controller:null,hidden:null,xAxisID:null,yAxisID:null,order:t&&t.order||0,index:e,_dataset:t,_parsed:[],_sorted:!1},i.push(s)),s}getContext(){return this.$context||(this.$context=Pe(null,{chart:this,type:"chart"}))}getVisibleDatasetCount(){return this.getSortedVisibleDatasetMetas().length}isDatasetVisible(e){const t=this.data.datasets[e];if(!t)return!1;const i=this.getDatasetMeta(e);return typeof i.hidden=="boolean"?!i.hidden:!t.hidden}setDatasetVisibility(e,t){const i=this.getDatasetMeta(e);i.hidden=!t}toggleDataVisibility(e){this._hiddenIndices[e]=!this._hiddenIndices[e]}getDataVisibility(e){return!this._hiddenIndices[e]}_updateVisibility(e,t,i){const s=i?"show":"hide",n=this.getDatasetMeta(e),r=n.controller._resolveAnimations(void 0,s);cs(t)?(n.data[t].hidden=!i,this.update()):(this.setDatasetVisibility(e,i),r.update(n,{visible:i}),this.update(o=>o.datasetIndex===e?s:void 0))}hide(e,t){this._updateVisibility(e,t,!1)}show(e,t){this._updateVisibility(e,t,!0)}_destroyDatasetMeta(e){const t=this._metasets[e];t&&t.controller&&t.controller._destroy(),delete this._metasets[e]}_stop(){let e,t;for(this.stop(),Gt.remove(this),e=0,t=this.data.datasets.length;e<t;++e)this._destroyDatasetMeta(e)}destroy(){this.notifyPlugins("beforeDestroy");const{canvas:e,ctx:t}=this;this._stop(),this.config.clearCache(),e&&(this.unbindEvents(),Ma(e,t),this.platform.releaseContext(t),this.canvas=null,this.ctx=null),delete ln[this.id],this.notifyPlugins("afterDestroy")}toBase64Image(...e){return this.canvas.toDataURL(...e)}bindEvents(){this.bindUserEvents(),this.options.responsive?this.bindResponsiveEvents():this.attached=!0}bindUserEvents(){const e=this._listeners,t=this.platform,i=(n,r)=>{t.addEventListener(this,n,r),e[n]=r},s=(n,r,o)=>{n.offsetX=r,n.offsetY=o,this._eventHandler(n)};N(this.options.events,n=>i(n,s))}bindResponsiveEvents(){this._responsiveListeners||(this._responsiveListeners={});const e=this._responsiveListeners,t=this.platform,i=(a,l)=>{t.addEventListener(this,a,l),e[a]=l},s=(a,l)=>{e[a]&&(t.removeEventListener(this,a,l),delete e[a])},n=(a,l)=>{this.canvas&&this.resize(a,l)};let r;const o=()=>{s("attach",o),this.attached=!0,this.resize(),i("resize",n),i("detach",r)};r=()=>{this.attached=!1,s("resize",n),this._stop(),this._resize(0,0),i("attach",o)},t.isAttached(this.canvas)?o():r()}unbindEvents(){N(this._listeners,(e,t)=>{this.platform.removeEventListener(this,t,e)}),this._listeners={},N(this._responsiveListeners,(e,t)=>{this.platform.removeEventListener(this,t,e)}),this._responsiveListeners=void 0}updateHoverStyle(e,t,i){const s=i?"set":"remove";let n,r,o,a;for(t==="dataset"&&(n=this.getDatasetMeta(e[0].datasetIndex),n.controller["_"+s+"DatasetHoverStyle"]()),o=0,a=e.length;o<a;++o){r=e[o];const l=r&&this.getDatasetMeta(r.datasetIndex).controller;l&&l[s+"HoverStyle"](r.element,r.datasetIndex,r.index)}}getActiveElements(){return this._active||[]}setActiveElements(e){const t=this._active||[],i=e.map(({datasetIndex:s,index:n})=>{const r=this.getDatasetMeta(s);if(!r)throw new Error("No dataset found at index "+s);return{datasetIndex:s,element:r.data[n],index:n}});!xn(i,t)&&(this._active=i,this._lastEvent=null,this._updateHoverStyles(i,t))}notifyPlugins(e,t,i){return this._plugins.notify(this,e,t,i)}isPluginEnabled(e){return this._plugins._cache.filter(t=>t.plugin.id===e).length===1}_updateHoverStyles(e,t,i){const s=this.options.hover,n=(a,l)=>a.filter(c=>!l.some(h=>c.datasetIndex===h.datasetIndex&&c.index===h.index)),r=n(t,e),o=i?e:n(e,t);r.length&&this.updateHoverStyle(r,s.mode,!1),o.length&&s.mode&&this.updateHoverStyle(o,s.mode,!0)}_eventHandler(e,t){const i={event:e,replay:t,cancelable:!0,inChartArea:this.isPointInArea(e)},s=r=>(r.options.events||this.options.events).includes(e.native.type);if(this.notifyPlugins("beforeEvent",i,s)===!1)return;const n=this._handleEvent(e,t,i.inChartArea);return i.cancelable=!1,this.notifyPlugins("afterEvent",i,s),(n||i.changed)&&this.render(),this}_handleEvent(e,t,i){const{_active:s=[],options:n}=this,r=t,o=this._getActiveElements(e,s,i,r),a=Ib(e),l=Pv(e,this._lastEvent,i,a);i&&(this._lastEvent=null,U(n.onHover,[e,o,this],this),a&&U(n.onClick,[e,o,this],this));const c=!xn(o,s);return(c||t)&&(this._active=o,this._updateHoverStyles(o,s,t)),this._lastEvent=l,c}_getActiveElements(e,t,i,s){if(e.type==="mouseout")return[];if(!i)return t;const n=this.options.hover;return this.getElementsAtEventForMode(e,n.mode,n,s)}},A(pe,"defaults",G),A(pe,"instances",ln),A(pe,"overrides",Ye),A(pe,"registry",Ht),A(pe,"version",Mv),A(pe,"getChart",ol),pe);function al(){return N(ps.instances,e=>e._plugins.invalidate())}function Dv(e,t,i){const{startAngle:s,x:n,y:r,outerRadius:o,innerRadius:a,options:l}=t,{borderWidth:c,borderJoinStyle:h}=l,d=Math.min(c/o,ft(s-i));if(e.beginPath(),e.arc(n,r,o-c/2,s+d/2,i-d/2),a>0){const u=Math.min(c/a,ft(s-i));e.arc(n,r,a+c/2,i-u/2,s+u/2,!0)}else{const u=Math.min(c/2,o*ft(s-i));if(h==="round")e.arc(n,r,u,i-j/2,s+j/2,!0);else if(h==="bevel"){const p=2*u*u,b=-p*Math.cos(i+j/2)+n,f=-p*Math.sin(i+j/2)+r,m=p*Math.cos(s+j/2)+n,g=p*Math.sin(s+j/2)+r;e.lineTo(b,f),e.lineTo(m,g)}}e.closePath(),e.moveTo(0,0),e.rect(0,0,e.canvas.width,e.canvas.height),e.clip("evenodd")}function Ov(e,t,i){const{startAngle:s,pixelMargin:n,x:r,y:o,outerRadius:a,innerRadius:l}=t;let c=n/a;e.beginPath(),e.arc(r,o,a,s-c,i+c),l>n?(c=n/l,e.arc(r,o,l,i+c,s-c,!0)):e.arc(r,o,n,i+st,s-st),e.closePath(),e.clip()}function Tv(e){return go(e,["outerStart","outerEnd","innerStart","innerEnd"])}function Lv(e,t,i,s){const n=Tv(e.options.borderRadius),r=(i-t)/2,o=Math.min(r,s*t/2),a=l=>{const c=(i-Math.min(r,l))*s/2;return ct(l,0,Math.min(r,c))};return{outerStart:a(n.outerStart),outerEnd:a(n.outerEnd),innerStart:ct(n.innerStart,0,o),innerEnd:ct(n.innerEnd,0,o)}}function ai(e,t,i,s){return{x:i+e*Math.cos(t),y:s+e*Math.sin(t)}}function Mn(e,t,i,s,n,r){const{x:o,y:a,startAngle:l,pixelMargin:c,innerRadius:h}=t,d=Math.max(t.outerRadius+s+i-c,0),u=h>0?h+s+i+c:0;let p=0;const b=n-l;if(s){const D=h>0?h-s:0,F=d>0?d-s:0,W=(D+F)/2,J=W!==0?b*W/(W+s):b;p=(b-J)/2}const f=Math.max(.001,b*d-i/j)/d,m=(b-f)/2,g=l+m+p,y=n-m-p,{outerStart:x,outerEnd:_,innerStart:C,innerEnd:k}=Lv(t,u,d,y-g),S=d-x,M=d-_,E=g+x/S,$=y-_/M,P=u+C,O=u+k,Q=g+C/P,V=y-k/O;if(e.beginPath(),r){const D=(E+$)/2;if(e.arc(o,a,d,E,D),e.arc(o,a,d,D,$),_>0){const X=ai(M,$,o,a);e.arc(X.x,X.y,_,$,y+st)}const F=ai(O,y,o,a);if(e.lineTo(F.x,F.y),k>0){const X=ai(O,V,o,a);e.arc(X.x,X.y,k,y+st,V+Math.PI)}const W=(y-k/u+(g+C/u))/2;if(e.arc(o,a,u,y-k/u,W,!0),e.arc(o,a,u,W,g+C/u,!0),C>0){const X=ai(P,Q,o,a);e.arc(X.x,X.y,C,Q+Math.PI,g-st)}const J=ai(S,g,o,a);if(e.lineTo(J.x,J.y),x>0){const X=ai(S,E,o,a);e.arc(X.x,X.y,x,g-st,E)}}else{e.moveTo(o,a);const D=Math.cos(E)*d+o,F=Math.sin(E)*d+a;e.lineTo(D,F);const W=Math.cos($)*d+o,J=Math.sin($)*d+a;e.lineTo(W,J)}e.closePath()}function zv(e,t,i,s,n){const{fullCircles:r,startAngle:o,circumference:a}=t;let l=t.endAngle;if(r){Mn(e,t,i,s,l,n);for(let c=0;c<r;++c)e.fill();isNaN(a)||(l=o+(a%K||K))}return Mn(e,t,i,s,l,n),e.fill(),l}function Rv(e,t,i,s,n){const{fullCircles:r,startAngle:o,circumference:a,options:l}=t,{borderWidth:c,borderJoinStyle:h,borderDash:d,borderDashOffset:u,borderRadius:p}=l,b=l.borderAlign==="inner";if(!c)return;e.setLineDash(d||[]),e.lineDashOffset=u,b?(e.lineWidth=c*2,e.lineJoin=h||"round"):(e.lineWidth=c,e.lineJoin=h||"bevel");let f=t.endAngle;if(r){Mn(e,t,i,s,f,n);for(let m=0;m<r;++m)e.stroke();isNaN(a)||(f=o+(a%K||K))}b&&Ov(e,t,f),l.selfJoin&&f-o>=j&&p===0&&h!=="miter"&&Dv(e,t,f),r||(Mn(e,t,i,s,f,n),e.stroke())}class hi extends de{constructor(t){super(),A(this,"circumference"),A(this,"endAngle"),A(this,"fullCircles"),A(this,"innerRadius"),A(this,"outerRadius"),A(this,"pixelMargin"),A(this,"startAngle"),this.options=void 0,this.circumference=void 0,this.startAngle=void 0,this.endAngle=void 0,this.innerRadius=void 0,this.outerRadius=void 0,this.pixelMargin=0,this.fullCircles=0,t&&Object.assign(this,t)}inRange(t,i,s){const n=this.getProps(["x","y"],s),{angle:r,distance:o}=gh(n,{x:t,y:i}),{startAngle:a,endAngle:l,innerRadius:c,outerRadius:h,circumference:d}=this.getProps(["startAngle","endAngle","innerRadius","outerRadius","circumference"],s),u=(this.options.spacing+this.options.borderWidth)/2,p=L(d,l-a),b=hs(r,a,l)&&a!==l,f=p>=K||b,m=ie(o,c+u,h+u);return f&&m}getCenterPoint(t){const{x:i,y:s,startAngle:n,endAngle:r,innerRadius:o,outerRadius:a}=this.getProps(["x","y","startAngle","endAngle","innerRadius","outerRadius"],t),{offset:l,spacing:c}=this.options,h=(n+r)/2,d=(o+a+c+l)/2;return{x:i+Math.cos(h)*d,y:s+Math.sin(h)*d}}tooltipPosition(t){return this.getCenterPoint(t)}draw(t){const{options:i,circumference:s}=this,n=(i.offset||0)/4,r=(i.spacing||0)/2,o=i.circular;if(this.pixelMargin=i.borderAlign==="inner"?.33:0,this.fullCircles=s>K?Math.floor(s/K):0,s===0||this.innerRadius<0||this.outerRadius<0)return;t.save();const a=(this.startAngle+this.endAngle)/2;t.translate(Math.cos(a)*n,Math.sin(a)*n);const l=1-Math.sin(Math.min(j,s||0)),c=n*l;t.fillStyle=i.backgroundColor,t.strokeStyle=i.borderColor,zv(t,this,c,r,o),Rv(t,this,c,r,o),t.restore()}}A(hi,"id","arc"),A(hi,"defaults",{borderAlign:"center",borderColor:"#fff",borderDash:[],borderDashOffset:0,borderJoinStyle:void 0,borderRadius:0,borderWidth:2,offset:0,spacing:0,angle:void 0,circular:!0,selfJoin:!1}),A(hi,"defaultRoutes",{backgroundColor:"backgroundColor"}),A(hi,"descriptors",{_scriptable:!0,_indexable:e=>e!=="borderDash"});function Qh(e,t,i=t){e.lineCap=L(i.borderCapStyle,t.borderCapStyle),e.setLineDash(L(i.borderDash,t.borderDash)),e.lineDashOffset=L(i.borderDashOffset,t.borderDashOffset),e.lineJoin=L(i.borderJoinStyle,t.borderJoinStyle),e.lineWidth=L(i.borderWidth,t.borderWidth),e.strokeStyle=L(i.borderColor,t.borderColor)}function Iv(e,t,i){e.lineTo(i.x,i.y)}function Bv(e){return e.stepped?om:e.tension||e.cubicInterpolationMode==="monotone"?am:Iv}function Zh(e,t,i={}){const s=e.length,{start:n=0,end:r=s-1}=i,{start:o,end:a}=t,l=Math.max(n,o),c=Math.min(r,a),h=n<o&&r<o||n>a&&r>a;return{count:s,start:l,loop:t.loop,ilen:c<l&&!h?s+c-l:c-l}}function Fv(e,t,i,s){const{points:n,options:r}=t,{count:o,start:a,loop:l,ilen:c}=Zh(n,i,s),h=Bv(r);let{move:d=!0,reverse:u}=s||{},p,b,f;for(p=0;p<=c;++p)b=n[(a+(u?c-p:p))%o],!b.skip&&(d?(e.moveTo(b.x,b.y),d=!1):h(e,f,b,u,r.stepped),f=b);return l&&(b=n[(a+(u?c:0))%o],h(e,f,b,u,r.stepped)),!!l}function Hv(e,t,i,s){const n=t.points,{count:r,start:o,ilen:a}=Zh(n,i,s),{move:l=!0,reverse:c}=s||{};let h=0,d=0,u,p,b,f,m,g;const y=_=>(o+(c?a-_:_))%r,x=()=>{f!==m&&(e.lineTo(h,m),e.lineTo(h,f),e.lineTo(h,g))};for(l&&(p=n[y(0)],e.moveTo(p.x,p.y)),u=0;u<=a;++u){if(p=n[y(u)],p.skip)continue;const _=p.x,C=p.y,k=_|0;k===b?(C<f?f=C:C>m&&(m=C),h=(d*h+_)/++d):(x(),e.lineTo(_,C),b=k,d=0,f=m=C),g=C}x()}function Ir(e){const t=e.options,i=t.borderDash&&t.borderDash.length;return!e._decimated&&!e._loop&&!t.tension&&t.cubicInterpolationMode!=="monotone"&&!t.stepped&&!i?Hv:Fv}function jv(e){return e.stepped?Fm:e.tension||e.cubicInterpolationMode==="monotone"?Hm:je}function Vv(e,t,i,s){let n=t._path;n||(n=t._path=new Path2D,t.path(n,i,s)&&n.closePath()),Qh(e,t.options),e.stroke(n)}function Nv(e,t,i,s){const{segments:n,options:r}=t,o=Ir(t);for(const a of n)Qh(e,r,a.style),e.beginPath(),o(e,t,a,{start:i,end:i+s-1})&&e.closePath(),e.stroke()}const Wv=typeof Path2D=="function";function Uv(e,t,i,s){Wv&&!t.options.segment?Vv(e,t,i,s):Nv(e,t,i,s)}class ve extends de{constructor(t){super(),this.animated=!0,this.options=void 0,this._chart=void 0,this._loop=void 0,this._fullLoop=void 0,this._path=void 0,this._points=void 0,this._segments=void 0,this._decimated=!1,this._pointsUpdated=!1,this._datasetIndex=void 0,t&&Object.assign(this,t)}updateControlPoints(t,i){const s=this.options;if((s.tension||s.cubicInterpolationMode==="monotone")&&!s.stepped&&!this._pointsUpdated){const n=s.spanGaps?this._loop:this._fullLoop;Dm(this._points,s,t,n,i),this._pointsUpdated=!0}}set points(t){this._points=t,delete this._segments,delete this._path,this._pointsUpdated=!1}get points(){return this._points}get segments(){return this._segments||(this._segments=qm(this,this.options.segment))}first(){const t=this.segments,i=this.points;return t.length&&i[t[0].start]}last(){const t=this.segments,i=this.points,s=t.length;return s&&i[t[s-1].end]}interpolate(t,i){const s=this.options,n=t[i],r=this.points,o=Ih(this,{property:i,start:n,end:n});if(!o.length)return;const a=[],l=jv(s);let c,h;for(c=0,h=o.length;c<h;++c){const{start:d,end:u}=o[c],p=r[d],b=r[u];if(p===b){a.push(p);continue}const f=Math.abs((n-p[i])/(b[i]-p[i])),m=l(p,b,f,s.stepped);m[i]=t[i],a.push(m)}return a.length===1?a[0]:a}pathSegment(t,i,s){return Ir(this)(t,this,i,s)}path(t,i,s){const n=this.segments,r=Ir(this);let o=this._loop;i=i||0,s=s||this.points.length-i;for(const a of n)o&=r(t,this,a,{start:i,end:i+s-1});return!!o}draw(t,i,s,n){const r=this.options||{};(this.points||[]).length&&r.borderWidth&&(t.save(),Uv(t,this,s,n),t.restore()),this.animated&&(this._pointsUpdated=!1,this._path=void 0)}}A(ve,"id","line"),A(ve,"defaults",{borderCapStyle:"butt",borderDash:[],borderDashOffset:0,borderJoinStyle:"miter",borderWidth:3,capBezierPoints:!0,cubicInterpolationMode:"default",fill:!1,spanGaps:!1,stepped:!1,tension:0}),A(ve,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"}),A(ve,"descriptors",{_scriptable:!0,_indexable:e=>e!=="borderDash"&&e!=="fill"});function ll(e,t,i,s){const n=e.options,{[i]:r}=e.getProps([i],s);return Math.abs(t-r)<n.radius+n.hitRadius}class Ji extends de{constructor(t){super(),A(this,"parsed"),A(this,"skip"),A(this,"stop"),this.options=void 0,this.parsed=void 0,this.skip=void 0,this.stop=void 0,t&&Object.assign(this,t)}inRange(t,i,s){const n=this.options,{x:r,y:o}=this.getProps(["x","y"],s);return Math.pow(t-r,2)+Math.pow(i-o,2)<Math.pow(n.hitRadius+n.radius,2)}inXRange(t,i){return ll(this,t,"x",i)}inYRange(t,i){return ll(this,t,"y",i)}getCenterPoint(t){const{x:i,y:s}=this.getProps(["x","y"],t);return{x:i,y:s}}size(t){t=t||this.options||{};let i=t.radius||0;i=Math.max(i,i&&t.hoverRadius||0);const s=i&&t.borderWidth||0;return(i+s)*2}draw(t,i){const s=this.options;this.skip||s.radius<.1||!ne(this,i,this.size(s)/2)||(t.strokeStyle=s.borderColor,t.lineWidth=s.borderWidth,t.fillStyle=s.backgroundColor,Tr(t,s,this.x,this.y))}getRange(){const t=this.options||{};return t.radius+t.hitRadius}}A(Ji,"id","point"),A(Ji,"defaults",{borderWidth:1,hitRadius:1,hoverBorderWidth:1,hoverRadius:4,pointStyle:"circle",radius:3,rotation:0}),A(Ji,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"});function Jh(e,t){const{x:i,y:s,base:n,width:r,height:o}=e.getProps(["x","y","base","width","height"],t);let a,l,c,h,d;return e.horizontal?(d=o/2,a=Math.min(i,n),l=Math.max(i,n),c=s-d,h=s+d):(d=r/2,a=i-d,l=i+d,c=Math.min(s,n),h=Math.max(s,n)),{left:a,top:c,right:l,bottom:h}}function ye(e,t,i,s){return e?0:ct(t,i,s)}function qv(e,t,i){const s=e.options.borderWidth,n=e.borderSkipped,r=Mh(s);return{t:ye(n.top,r.top,0,i),r:ye(n.right,r.right,0,t),b:ye(n.bottom,r.bottom,0,i),l:ye(n.left,r.left,0,t)}}function Yv(e,t,i){const{enableBorderRadius:s}=e.getProps(["enableBorderRadius"]),n=e.options.borderRadius,r=We(n),o=Math.min(t,i),a=e.borderSkipped,l=s||B(n);return{topLeft:ye(!l||a.top||a.left,r.topLeft,0,o),topRight:ye(!l||a.top||a.right,r.topRight,0,o),bottomLeft:ye(!l||a.bottom||a.left,r.bottomLeft,0,o),bottomRight:ye(!l||a.bottom||a.right,r.bottomRight,0,o)}}function Kv(e){const t=Jh(e),i=t.right-t.left,s=t.bottom-t.top,n=qv(e,i/2,s/2),r=Yv(e,i/2,s/2);return{outer:{x:t.left,y:t.top,w:i,h:s,radius:r},inner:{x:t.left+n.l,y:t.top+n.t,w:i-n.l-n.r,h:s-n.t-n.b,radius:{topLeft:Math.max(0,r.topLeft-Math.max(n.t,n.l)),topRight:Math.max(0,r.topRight-Math.max(n.t,n.r)),bottomLeft:Math.max(0,r.bottomLeft-Math.max(n.b,n.l)),bottomRight:Math.max(0,r.bottomRight-Math.max(n.b,n.r))}}}}function pr(e,t,i,s){const n=t===null,r=i===null,o=e&&!(n&&r)&&Jh(e,s);return o&&(n||ie(t,o.left,o.right))&&(r||ie(i,o.top,o.bottom))}function Gv(e){return e.topLeft||e.topRight||e.bottomLeft||e.bottomRight}function Xv(e,t){e.rect(t.x,t.y,t.w,t.h)}function fr(e,t,i={}){const s=e.x!==i.x?-t:0,n=e.y!==i.y?-t:0,r=(e.x+e.w!==i.x+i.w?t:0)-s,o=(e.y+e.h!==i.y+i.h?t:0)-n;return{x:e.x+s,y:e.y+n,w:e.w+r,h:e.h+o,radius:e.radius}}class ts extends de{constructor(t){super(),this.options=void 0,this.horizontal=void 0,this.base=void 0,this.width=void 0,this.height=void 0,this.inflateAmount=void 0,t&&Object.assign(this,t)}draw(t){const{inflateAmount:i,options:{borderColor:s,backgroundColor:n}}=this,{inner:r,outer:o}=Kv(this),a=Gv(o.radius)?ds:Xv;t.save(),(o.w!==r.w||o.h!==r.h)&&(t.beginPath(),a(t,fr(o,i,r)),t.clip(),a(t,fr(r,-i,o)),t.fillStyle=s,t.fill("evenodd")),t.beginPath(),a(t,fr(r,i)),t.fillStyle=n,t.fill(),t.restore()}inRange(t,i,s){return pr(this,t,i,s)}inXRange(t,i){return pr(this,t,null,i)}inYRange(t,i){return pr(this,null,t,i)}getCenterPoint(t){const{x:i,y:s,base:n,horizontal:r}=this.getProps(["x","y","base","horizontal"],t);return{x:r?(i+n)/2:i,y:r?s:(s+n)/2}}getRange(t){return t==="x"?this.width/2:this.height/2}}A(ts,"id","bar"),A(ts,"defaults",{borderSkipped:"start",borderWidth:0,borderRadius:0,inflateAmount:"auto",pointStyle:void 0}),A(ts,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"});var Qv=Object.freeze({__proto__:null,ArcElement:hi,BarElement:ts,LineElement:ve,PointElement:Ji});const Br=["rgb(54, 162, 235)","rgb(255, 99, 132)","rgb(255, 159, 64)","rgb(255, 205, 86)","rgb(75, 192, 192)","rgb(153, 102, 255)","rgb(201, 203, 207)"],cl=Br.map(e=>e.replace("rgb(","rgba(").replace(")",", 0.5)"));function td(e){return Br[e%Br.length]}function ed(e){return cl[e%cl.length]}function Zv(e,t){return e.borderColor=td(t),e.backgroundColor=ed(t),++t}function Jv(e,t){return e.backgroundColor=e.data.map(()=>td(t++)),t}function t0(e,t){return e.backgroundColor=e.data.map(()=>ed(t++)),t}function e0(e){let t=0;return(i,s)=>{const n=e.getDatasetMeta(s).controller;n instanceof Ne?t=Jv(i,t):n instanceof Zi?t=t0(i,t):n&&(t=Zv(i,t))}}function hl(e){let t;for(t in e)if(e[t].borderColor||e[t].backgroundColor)return!0;return!1}function i0(e){return e&&(e.borderColor||e.backgroundColor)}function s0(){return G.borderColor!=="rgba(0,0,0,0.1)"||G.backgroundColor!=="rgba(0,0,0,0.1)"}var n0={id:"colors",defaults:{enabled:!0,forceOverride:!1},beforeLayout(e,t,i){if(!i.enabled)return;const{data:{datasets:s},options:n}=e.config,{elements:r}=n,o=hl(s)||i0(n)||r&&hl(r)||s0();if(!i.forceOverride&&o)return;const a=e0(e);s.forEach(a)}};function r0(e,t,i,s,n){const r=n.samples||s;if(r>=i)return e.slice(t,t+i);const o=[],a=(i-2)/(r-2);let l=0;const c=t+i-1;let h=t,d,u,p,b,f;for(o[l++]=e[h],d=0;d<r-2;d++){let m=0,g=0,y;const x=Math.floor((d+1)*a)+1+t,_=Math.min(Math.floor((d+2)*a)+1,i)+t,C=_-x;for(y=x;y<_;y++)m+=e[y].x,g+=e[y].y;m/=C,g/=C;const k=Math.floor(d*a)+1+t,S=Math.min(Math.floor((d+1)*a)+1,i)+t,{x:M,y:E}=e[h];for(p=b=-1,y=k;y<S;y++)b=.5*Math.abs((M-m)*(e[y].y-E)-(M-e[y].x)*(g-E)),b>p&&(p=b,u=e[y],f=y);o[l++]=u,h=f}return o[l++]=e[c],o}function o0(e,t,i,s){let n=0,r=0,o,a,l,c,h,d,u,p,b,f;const m=[],g=t+i-1,y=e[t].x,x=e[g].x-y;for(o=t;o<t+i;++o){a=e[o],l=(a.x-y)/x*s,c=a.y;const _=l|0;if(_===h)c<b?(b=c,d=o):c>f&&(f=c,u=o),n=(r*n+a.x)/++r;else{const C=o-1;if(!z(d)&&!z(u)){const k=Math.min(d,u),S=Math.max(d,u);k!==p&&k!==C&&m.push({...e[k],x:n}),S!==p&&S!==C&&m.push({...e[S],x:n})}o>0&&C!==p&&m.push(e[C]),m.push(a),h=_,r=0,b=f=c,d=u=p=o}}return m}function id(e){if(e._decimated){const t=e._data;delete e._decimated,delete e._data,Object.defineProperty(e,"data",{configurable:!0,enumerable:!0,writable:!0,value:t})}}function dl(e){e.data.datasets.forEach(t=>{id(t)})}function a0(e,t){const i=t.length;let s=0,n;const{iScale:r}=e,{min:o,max:a,minDefined:l,maxDefined:c}=r.getUserBounds();return l&&(s=ct(se(t,r.axis,o).lo,0,i-1)),c?n=ct(se(t,r.axis,a).hi+1,s,i)-s:n=i-s,{start:s,count:n}}var l0={id:"decimation",defaults:{algorithm:"min-max",enabled:!1},beforeElementsUpdate:(e,t,i)=>{if(!i.enabled){dl(e);return}const s=e.width;e.data.datasets.forEach((n,r)=>{const{_data:o,indexAxis:a}=n,l=e.getDatasetMeta(r),c=o||n.data;if(q([a,e.options.indexAxis])==="y"||!l.controller.supportsDecimation)return;const h=e.scales[l.xAxisID];if(h.type!=="linear"&&h.type!=="time"||e.options.parsing)return;let{start:d,count:u}=a0(l,c);const p=i.threshold||4*s;if(u<=p){id(n);return}z(o)&&(n._data=c,delete n.data,Object.defineProperty(n,"data",{configurable:!0,enumerable:!0,get:function(){return this._decimated},set:function(f){this._data=f}}));let b;switch(i.algorithm){case"lttb":b=r0(c,d,u,s,i);break;case"min-max":b=o0(c,d,u,s);break;default:throw new Error(`Unsupported decimation algorithm '${i.algorithm}'`)}n._decimated=b})},destroy(e){dl(e)}};function c0(e,t,i){const s=e.segments,n=e.points,r=t.points,o=[];for(const a of s){let{start:l,end:c}=a;c=qn(l,c,n);const h=Fr(i,n[l],n[c],a.loop);if(!t.segments){o.push({source:a,target:h,start:n[l],end:n[c]});continue}const d=Ih(t,h);for(const u of d){const p=Fr(i,r[u.start],r[u.end],u.loop),b=Rh(a,n,p);for(const f of b)o.push({source:f,target:u,start:{[i]:ul(h,p,"start",Math.max)},end:{[i]:ul(h,p,"end",Math.min)}})}}return o}function Fr(e,t,i,s){if(s)return;let n=t[e],r=i[e];return e==="angle"&&(n=ft(n),r=ft(r)),{property:e,start:n,end:r}}function h0(e,t){const{x:i=null,y:s=null}=e||{},n=t.points,r=[];return t.segments.forEach(({start:o,end:a})=>{a=qn(o,a,n);const l=n[o],c=n[a];s!==null?(r.push({x:l.x,y:s}),r.push({x:c.x,y:s})):i!==null&&(r.push({x:i,y:l.y}),r.push({x:i,y:c.y}))}),r}function qn(e,t,i){for(;t>e;t--){const s=i[t];if(!isNaN(s.x)&&!isNaN(s.y))break}return t}function ul(e,t,i,s){return e&&t?s(e[i],t[i]):e?e[i]:t?t[i]:0}function sd(e,t){let i=[],s=!1;return Y(e)?(s=!0,i=e):i=h0(e,t),i.length?new ve({points:i,options:{tension:0},_loop:s,_fullLoop:s}):null}function pl(e){return e&&e.fill!==!1}function d0(e,t,i){let s=e[t].fill;const n=[t];let r;if(!i)return s;for(;s!==!1&&n.indexOf(s)===-1;){if(!tt(s))return s;if(r=e[s],!r)return!1;if(r.visible)return s;n.push(s),s=r.fill}return!1}function u0(e,t,i){const s=m0(e);if(B(s))return isNaN(s.value)?!1:s;let n=parseFloat(s);return tt(n)&&Math.floor(n)===n?p0(s[0],t,n,i):["origin","start","end","stack","shape"].indexOf(s)>=0&&s}function p0(e,t,i,s){return(e==="-"||e==="+")&&(i=t+i),i===t||i<0||i>=s?!1:i}function f0(e,t){let i=null;return e==="start"?i=t.bottom:e==="end"?i=t.top:B(e)?i=t.getPixelForValue(e.value):t.getBasePixel&&(i=t.getBasePixel()),i}function b0(e,t,i){let s;return e==="start"?s=i:e==="end"?s=t.options.reverse?t.min:t.max:B(e)?s=e.value:s=t.getBaseValue(),s}function m0(e){const t=e.options,i=t.fill;let s=L(i&&i.target,i);return s===void 0&&(s=!!t.backgroundColor),s===!1||s===null?!1:s===!0?"origin":s}function g0(e){const{scale:t,index:i,line:s}=e,n=[],r=s.segments,o=s.points,a=v0(t,i);a.push(sd({x:null,y:t.bottom},s));for(let l=0;l<r.length;l++){const c=r[l];for(let h=c.start;h<=c.end;h++)y0(n,o[h],a)}return new ve({points:n,options:{}})}function v0(e,t){const i=[],s=e.getMatchingVisibleMetas("line");for(let n=0;n<s.length;n++){const r=s[n];if(r.index===t)break;r.hidden||i.unshift(r.dataset)}return i}function y0(e,t,i){const s=[];for(let n=0;n<i.length;n++){const r=i[n],{first:o,last:a,point:l}=x0(r,t,"x");if(!(!l||o&&a)){if(o)s.unshift(l);else if(e.push(l),!a)break}}e.push(...s)}function x0(e,t,i){const s=e.interpolate(t,i);if(!s)return{};const n=s[i],r=e.segments,o=e.points;let a=!1,l=!1;for(let c=0;c<r.length;c++){const h=r[c],d=o[h.start][i],u=o[h.end][i];if(ie(n,d,u)){a=n===d,l=n===u;break}}return{first:a,last:l,point:s}}class nd{constructor(t){this.x=t.x,this.y=t.y,this.radius=t.radius}pathSegment(t,i,s){const{x:n,y:r,radius:o}=this;return i=i||{start:0,end:K},t.arc(n,r,o,i.end,i.start,!0),!s.bounds}interpolate(t){const{x:i,y:s,radius:n}=this,r=t.angle;return{x:i+Math.cos(r)*n,y:s+Math.sin(r)*n,angle:r}}}function _0(e){const{chart:t,fill:i,line:s}=e;if(tt(i))return w0(t,i);if(i==="stack")return g0(e);if(i==="shape")return!0;const n=k0(e);return n instanceof nd?n:sd(n,s)}function w0(e,t){const i=e.getDatasetMeta(t);return i&&e.isDatasetVisible(t)?i.dataset:null}function k0(e){return(e.scale||{}).getPointPositionForValue?S0(e):C0(e)}function C0(e){const{scale:t={},fill:i}=e,s=f0(i,t);if(tt(s)){const n=t.isHorizontal();return{x:n?s:null,y:n?null:s}}return null}function S0(e){const{scale:t,fill:i}=e,s=t.options,n=t.getLabels().length,r=s.reverse?t.max:t.min,o=b0(i,t,r),a=[];if(s.grid.circular){const l=t.getPointPositionForValue(0,r);return new nd({x:l.x,y:l.y,radius:t.getDistanceFromCenterForValue(o)})}for(let l=0;l<n;++l)a.push(t.getPointPositionForValue(l,o));return a}function br(e,t,i){const s=_0(t),{chart:n,index:r,line:o,scale:a,axis:l}=t,c=o.options,h=c.fill,d=c.backgroundColor,{above:u=d,below:p=d}=h||{},b=n.getDatasetMeta(r),f=Bh(n,b);s&&o.points.length&&(Vn(e,i),M0(e,{line:o,target:s,above:u,below:p,area:i,scale:a,axis:l,clip:f}),Nn(e))}function M0(e,t){const{line:i,target:s,above:n,below:r,area:o,scale:a,clip:l}=t,c=i._loop?"angle":t.axis;e.save();let h=r;r!==n&&(c==="x"?(fl(e,s,o.top),mr(e,{line:i,target:s,color:n,scale:a,property:c,clip:l}),e.restore(),e.save(),fl(e,s,o.bottom)):c==="y"&&(bl(e,s,o.left),mr(e,{line:i,target:s,color:r,scale:a,property:c,clip:l}),e.restore(),e.save(),bl(e,s,o.right),h=n)),mr(e,{line:i,target:s,color:h,scale:a,property:c,clip:l}),e.restore()}function fl(e,t,i){const{segments:s,points:n}=t;let r=!0,o=!1;e.beginPath();for(const a of s){const{start:l,end:c}=a,h=n[l],d=n[qn(l,c,n)];r?(e.moveTo(h.x,h.y),r=!1):(e.lineTo(h.x,i),e.lineTo(h.x,h.y)),o=!!t.pathSegment(e,a,{move:o}),o?e.closePath():e.lineTo(d.x,i)}e.lineTo(t.first().x,i),e.closePath(),e.clip()}function bl(e,t,i){const{segments:s,points:n}=t;let r=!0,o=!1;e.beginPath();for(const a of s){const{start:l,end:c}=a,h=n[l],d=n[qn(l,c,n)];r?(e.moveTo(h.x,h.y),r=!1):(e.lineTo(i,h.y),e.lineTo(h.x,h.y)),o=!!t.pathSegment(e,a,{move:o}),o?e.closePath():e.lineTo(i,d.y)}e.lineTo(i,t.first().y),e.closePath(),e.clip()}function mr(e,t){const{line:i,target:s,property:n,color:r,scale:o,clip:a}=t,l=c0(i,s,n);for(const{source:c,target:h,start:d,end:u}of l){const{style:{backgroundColor:p=r}={}}=c,b=s!==!0;e.save(),e.fillStyle=p,A0(e,o,a,b&&Fr(n,d,u)),e.beginPath();const f=!!i.pathSegment(e,c);let m;if(b){f?e.closePath():ml(e,s,u,n);const g=!!s.pathSegment(e,h,{move:f,reverse:!0});m=f&&g,m||ml(e,s,d,n)}e.closePath(),e.fill(m?"evenodd":"nonzero"),e.restore()}}function A0(e,t,i,s){const n=t.chart.chartArea,{property:r,start:o,end:a}=s||{};if(r==="x"||r==="y"){let l,c,h,d;r==="x"?(l=o,c=n.top,h=a,d=n.bottom):(l=n.left,c=o,h=n.right,d=a),e.beginPath(),i&&(l=Math.max(l,i.left),h=Math.min(h,i.right),c=Math.max(c,i.top),d=Math.min(d,i.bottom)),e.rect(l,c,h-l,d-c),e.clip()}}function ml(e,t,i,s){const n=t.interpolate(i,s);n&&e.lineTo(n.x,n.y)}var $0={id:"filler",afterDatasetsUpdate(e,t,i){const s=(e.data.datasets||[]).length,n=[];let r,o,a,l;for(o=0;o<s;++o)r=e.getDatasetMeta(o),a=r.dataset,l=null,a&&a.options&&a instanceof ve&&(l={visible:e.isDatasetVisible(o),index:o,fill:u0(a,o,s),chart:e,axis:r.controller.options.indexAxis,scale:r.vScale,line:a}),r.$filler=l,n.push(l);for(o=0;o<s;++o)l=n[o],!(!l||l.fill===!1)&&(l.fill=d0(n,o,i.propagate))},beforeDraw(e,t,i){const s=i.drawTime==="beforeDraw",n=e.getSortedVisibleDatasetMetas(),r=e.chartArea;for(let o=n.length-1;o>=0;--o){const a=n[o].$filler;a&&(a.line.updateControlPoints(r,a.axis),s&&a.fill&&br(e.ctx,a,r))}},beforeDatasetsDraw(e,t,i){if(i.drawTime!=="beforeDatasetsDraw")return;const s=e.getSortedVisibleDatasetMetas();for(let n=s.length-1;n>=0;--n){const r=s[n].$filler;pl(r)&&br(e.ctx,r,e.chartArea)}},beforeDatasetDraw(e,t,i){const s=t.meta.$filler;!pl(s)||i.drawTime!=="beforeDatasetDraw"||br(e.ctx,s,e.chartArea)},defaults:{propagate:!0,drawTime:"beforeDatasetDraw"}};const gl=(e,t)=>{let{boxHeight:i=t,boxWidth:s=t}=e;return e.usePointStyle&&(i=Math.min(i,t),s=e.pointStyleWidth||Math.min(s,t)),{boxWidth:s,boxHeight:i,itemHeight:Math.max(t,i)}},E0=(e,t)=>e!==null&&t!==null&&e.datasetIndex===t.datasetIndex&&e.index===t.index;class vl extends de{constructor(t){super(),this._added=!1,this.legendHitBoxes=[],this._hoveredItem=null,this.doughnutMode=!1,this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this.legendItems=void 0,this.columnSizes=void 0,this.lineWidths=void 0,this.maxHeight=void 0,this.maxWidth=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.height=void 0,this.width=void 0,this._margins=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,i,s){this.maxWidth=t,this.maxHeight=i,this._margins=s,this.setDimensions(),this.buildLabels(),this.fit()}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=this._margins.left,this.right=this.width):(this.height=this.maxHeight,this.top=this._margins.top,this.bottom=this.height)}buildLabels(){const t=this.options.labels||{};let i=U(t.generateLabels,[this.chart],this)||[];t.filter&&(i=i.filter(s=>t.filter(s,this.chart.data))),t.sort&&(i=i.sort((s,n)=>t.sort(s,n,this.chart.data))),this.options.reverse&&i.reverse(),this.legendItems=i}fit(){const{options:t,ctx:i}=this;if(!t.display){this.width=this.height=0;return}const s=t.labels,n=at(s.font),r=n.size,o=this._computeTitleHeight(),{boxWidth:a,itemHeight:l}=gl(s,r);let c,h;i.font=n.string,this.isHorizontal()?(c=this.maxWidth,h=this._fitRows(o,r,a,l)+10):(h=this.maxHeight,c=this._fitCols(o,n,a,l)+10),this.width=Math.min(c,t.maxWidth||this.maxWidth),this.height=Math.min(h,t.maxHeight||this.maxHeight)}_fitRows(t,i,s,n){const{ctx:r,maxWidth:o,options:{labels:{padding:a}}}=this,l=this.legendHitBoxes=[],c=this.lineWidths=[0],h=n+a;let d=t;r.textAlign="left",r.textBaseline="middle";let u=-1,p=-h;return this.legendItems.forEach((b,f)=>{const m=s+i/2+r.measureText(b.text).width;(f===0||c[c.length-1]+m+2*a>o)&&(d+=h,c[c.length-(f>0?0:1)]=0,p+=h,u++),l[f]={left:0,top:p,row:u,width:m,height:n},c[c.length-1]+=m+a}),d}_fitCols(t,i,s,n){const{ctx:r,maxHeight:o,options:{labels:{padding:a}}}=this,l=this.legendHitBoxes=[],c=this.columnSizes=[],h=o-t;let d=a,u=0,p=0,b=0,f=0;return this.legendItems.forEach((m,g)=>{const{itemWidth:y,itemHeight:x}=P0(s,i,r,m,n);g>0&&p+x+2*a>h&&(d+=u+a,c.push({width:u,height:p}),b+=u+a,f++,u=p=0),l[g]={left:b,top:p,col:f,width:y,height:x},u=Math.max(u,y),p+=x+a}),d+=u,c.push({width:u,height:p}),d}adjustHitBoxes(){if(!this.options.display)return;const t=this._computeTitleHeight(),{legendHitBoxes:i,options:{align:s,labels:{padding:n},rtl:r}}=this,o=ui(r,this.left,this.width);if(this.isHorizontal()){let a=0,l=pt(s,this.left+n,this.right-this.lineWidths[a]);for(const c of i)a!==c.row&&(a=c.row,l=pt(s,this.left+n,this.right-this.lineWidths[a])),c.top+=this.top+t+n,c.left=o.leftForLtr(o.x(l),c.width),l+=c.width+n}else{let a=0,l=pt(s,this.top+t+n,this.bottom-this.columnSizes[a].height);for(const c of i)c.col!==a&&(a=c.col,l=pt(s,this.top+t+n,this.bottom-this.columnSizes[a].height)),c.top=l,c.left+=this.left+n,c.left=o.leftForLtr(o.x(c.left),c.width),l+=c.height+n}}isHorizontal(){return this.options.position==="top"||this.options.position==="bottom"}draw(){if(this.options.display){const t=this.ctx;Vn(t,this),this._draw(),Nn(t)}}_draw(){const{options:t,columnSizes:i,lineWidths:s,ctx:n}=this,{align:r,labels:o}=t,a=G.color,l=ui(t.rtl,this.left,this.width),c=at(o.font),{padding:h}=o,d=c.size,u=d/2;let p;this.drawTitle(),n.textAlign=l.textAlign("left"),n.textBaseline="middle",n.lineWidth=.5,n.font=c.string;const{boxWidth:b,boxHeight:f,itemHeight:m}=gl(o,d),g=function(k,S,M){if(isNaN(b)||b<=0||isNaN(f)||f<0)return;n.save();const E=L(M.lineWidth,1);if(n.fillStyle=L(M.fillStyle,a),n.lineCap=L(M.lineCap,"butt"),n.lineDashOffset=L(M.lineDashOffset,0),n.lineJoin=L(M.lineJoin,"miter"),n.lineWidth=E,n.strokeStyle=L(M.strokeStyle,a),n.setLineDash(L(M.lineDash,[])),o.usePointStyle){const $={radius:f*Math.SQRT2/2,pointStyle:M.pointStyle,rotation:M.rotation,borderWidth:E},P=l.xPlus(k,b/2),O=S+u;Sh(n,$,P,O,o.pointStyleWidth&&b)}else{const $=S+Math.max((d-f)/2,0),P=l.leftForLtr(k,b),O=We(M.borderRadius);n.beginPath(),Object.values(O).some(Q=>Q!==0)?ds(n,{x:P,y:$,w:b,h:f,radius:O}):n.rect(P,$,b,f),n.fill(),E!==0&&n.stroke()}n.restore()},y=function(k,S,M){Ke(n,M.text,k,S+m/2,c,{strikethrough:M.hidden,textAlign:l.textAlign(M.textAlign)})},x=this.isHorizontal(),_=this._computeTitleHeight();x?p={x:pt(r,this.left+h,this.right-s[0]),y:this.top+h+_,line:0}:p={x:this.left+h,y:pt(r,this.top+_+h,this.bottom-i[0].height),line:0},Th(this.ctx,t.textDirection);const C=m+h;this.legendItems.forEach((k,S)=>{n.strokeStyle=k.fontColor,n.fillStyle=k.fontColor;const M=n.measureText(k.text).width,E=l.textAlign(k.textAlign||(k.textAlign=o.textAlign)),$=b+u+M;let P=p.x,O=p.y;l.setWidth(this.width),x?S>0&&P+$+h>this.right&&(O=p.y+=C,p.line++,P=p.x=pt(r,this.left+h,this.right-s[p.line])):S>0&&O+C>this.bottom&&(P=p.x=P+i[p.line].width+h,p.line++,O=p.y=pt(r,this.top+_+h,this.bottom-i[p.line].height));const Q=l.x(P);if(g(Q,O,k),P=Gb(E,P+b+u,x?P+$:this.right,t.rtl),y(l.x(P),O,k),x)p.x+=$+h;else if(typeof k.text!="string"){const V=c.lineHeight;p.y+=rd(k,V)+h}else p.y+=C}),Lh(this.ctx,t.textDirection)}drawTitle(){const t=this.options,i=t.title,s=at(i.font),n=dt(i.padding);if(!i.display)return;const r=ui(t.rtl,this.left,this.width),o=this.ctx,a=i.position,l=s.size/2,c=n.top+l;let h,d=this.left,u=this.width;if(this.isHorizontal())u=Math.max(...this.lineWidths),h=this.top+c,d=pt(t.align,d,this.right-u);else{const b=this.columnSizes.reduce((f,m)=>Math.max(f,m.height),0);h=c+pt(t.align,this.top,this.bottom-b-t.labels.padding-this._computeTitleHeight())}const p=pt(a,d,d+u);o.textAlign=r.textAlign(bo(a)),o.textBaseline="middle",o.strokeStyle=i.color,o.fillStyle=i.color,o.font=s.string,Ke(o,i.text,p,h,s)}_computeTitleHeight(){const t=this.options.title,i=at(t.font),s=dt(t.padding);return t.display?i.lineHeight+s.height:0}_getLegendItemAt(t,i){let s,n,r;if(ie(t,this.left,this.right)&&ie(i,this.top,this.bottom)){for(r=this.legendHitBoxes,s=0;s<r.length;++s)if(n=r[s],ie(t,n.left,n.left+n.width)&&ie(i,n.top,n.top+n.height))return this.legendItems[s]}return null}handleEvent(t){const i=this.options;if(!T0(t.type,i))return;const s=this._getLegendItemAt(t.x,t.y);if(t.type==="mousemove"||t.type==="mouseout"){const n=this._hoveredItem,r=E0(n,s);n&&!r&&U(i.onLeave,[t,n,this],this),this._hoveredItem=s,s&&!r&&U(i.onHover,[t,s,this],this)}else s&&U(i.onClick,[t,s,this],this)}}function P0(e,t,i,s,n){const r=D0(s,e,t,i),o=O0(n,s,t.lineHeight);return{itemWidth:r,itemHeight:o}}function D0(e,t,i,s){let n=e.text;return n&&typeof n!="string"&&(n=n.reduce((r,o)=>r.length>o.length?r:o)),t+i.size/2+s.measureText(n).width}function O0(e,t,i){let s=e;return typeof t.text!="string"&&(s=rd(t,i)),s}function rd(e,t){const i=e.text?e.text.length:0;return t*i}function T0(e,t){return!!((e==="mousemove"||e==="mouseout")&&(t.onHover||t.onLeave)||t.onClick&&(e==="click"||e==="mouseup"))}var L0={id:"legend",_element:vl,start(e,t,i){const s=e.legend=new vl({ctx:e.ctx,options:i,chart:e});bt.configure(e,s,i),bt.addBox(e,s)},stop(e){bt.removeBox(e,e.legend),delete e.legend},beforeUpdate(e,t,i){const s=e.legend;bt.configure(e,s,i),s.options=i},afterUpdate(e){const t=e.legend;t.buildLabels(),t.adjustHitBoxes()},afterEvent(e,t){t.replay||e.legend.handleEvent(t.event)},defaults:{display:!0,position:"top",align:"center",fullSize:!0,reverse:!1,weight:1e3,onClick(e,t,i){const s=t.datasetIndex,n=i.chart;n.isDatasetVisible(s)?(n.hide(s),t.hidden=!0):(n.show(s),t.hidden=!1)},onHover:null,onLeave:null,labels:{color:e=>e.chart.options.color,boxWidth:40,padding:10,generateLabels(e){const t=e.data.datasets,{labels:{usePointStyle:i,pointStyle:s,textAlign:n,color:r,useBorderRadius:o,borderRadius:a}}=e.legend.options;return e._getSortedDatasetMetas().map(l=>{const c=l.controller.getStyle(i?0:void 0),h=dt(c.borderWidth);return{text:t[l.index].label,fillStyle:c.backgroundColor,fontColor:r,hidden:!l.visible,lineCap:c.borderCapStyle,lineDash:c.borderDash,lineDashOffset:c.borderDashOffset,lineJoin:c.borderJoinStyle,lineWidth:(h.width+h.height)/4,strokeStyle:c.borderColor,pointStyle:s||c.pointStyle,rotation:c.rotation,textAlign:n||c.textAlign,borderRadius:o&&(a||c.borderRadius),datasetIndex:l.index}},this)}},title:{color:e=>e.chart.options.color,display:!1,position:"center",text:""}},descriptors:{_scriptable:e=>!e.startsWith("on"),labels:{_scriptable:e=>!["generateLabels","filter","sort"].includes(e)}}};class Co extends de{constructor(t){super(),this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this._padding=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,i){const s=this.options;if(this.left=0,this.top=0,!s.display){this.width=this.height=this.right=this.bottom=0;return}this.width=this.right=t,this.height=this.bottom=i;const n=Y(s.text)?s.text.length:1;this._padding=dt(s.padding);const r=n*at(s.font).lineHeight+this._padding.height;this.isHorizontal()?this.height=r:this.width=r}isHorizontal(){const t=this.options.position;return t==="top"||t==="bottom"}_drawArgs(t){const{top:i,left:s,bottom:n,right:r,options:o}=this,a=o.align;let l=0,c,h,d;return this.isHorizontal()?(h=pt(a,s,r),d=i+t,c=r-s):(o.position==="left"?(h=s+t,d=pt(a,n,i),l=j*-.5):(h=r-t,d=pt(a,i,n),l=j*.5),c=n-i),{titleX:h,titleY:d,maxWidth:c,rotation:l}}draw(){const t=this.ctx,i=this.options;if(!i.display)return;const s=at(i.font),n=s.lineHeight/2+this._padding.top,{titleX:r,titleY:o,maxWidth:a,rotation:l}=this._drawArgs(n);Ke(t,i.text,0,0,s,{color:i.color,maxWidth:a,rotation:l,textAlign:bo(i.align),textBaseline:"middle",translation:[r,o]})}}function z0(e,t){const i=new Co({ctx:e.ctx,options:t,chart:e});bt.configure(e,i,t),bt.addBox(e,i),e.titleBlock=i}var R0={id:"title",_element:Co,start(e,t,i){z0(e,i)},stop(e){const t=e.titleBlock;bt.removeBox(e,t),delete e.titleBlock},beforeUpdate(e,t,i){const s=e.titleBlock;bt.configure(e,s,i),s.options=i},defaults:{align:"center",display:!1,font:{weight:"bold"},fullSize:!0,padding:10,position:"top",text:"",weight:2e3},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Us=new WeakMap;var I0={id:"subtitle",start(e,t,i){const s=new Co({ctx:e.ctx,options:i,chart:e});bt.configure(e,s,i),bt.addBox(e,s),Us.set(e,s)},stop(e){bt.removeBox(e,Us.get(e)),Us.delete(e)},beforeUpdate(e,t,i){const s=Us.get(e);bt.configure(e,s,i),s.options=i},defaults:{align:"center",display:!1,font:{weight:"normal"},fullSize:!0,padding:0,position:"top",text:"",weight:1500},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Ni={average(e){if(!e.length)return!1;let t,i,s=new Set,n=0,r=0;for(t=0,i=e.length;t<i;++t){const o=e[t].element;if(o&&o.hasValue()){const a=o.tooltipPosition();s.add(a.x),n+=a.y,++r}}return r===0||s.size===0?!1:{x:[...s].reduce((o,a)=>o+a)/s.size,y:n/r}},nearest(e,t){if(!e.length)return!1;let i=t.x,s=t.y,n=Number.POSITIVE_INFINITY,r,o,a;for(r=0,o=e.length;r<o;++r){const l=e[r].element;if(l&&l.hasValue()){const c=l.getCenterPoint(),h=Dr(t,c);h<n&&(n=h,a=l)}}if(a){const l=a.tooltipPosition();i=l.x,s=l.y}return{x:i,y:s}}};function Ft(e,t){return t&&(Y(t)?Array.prototype.push.apply(e,t):e.push(t)),e}function Xt(e){return(typeof e=="string"||e instanceof String)&&e.indexOf(`
`)>-1?e.split(`
`):e}function B0(e,t){const{element:i,datasetIndex:s,index:n}=t,r=e.getDatasetMeta(s).controller,{label:o,value:a}=r.getLabelAndValue(n);return{chart:e,label:o,parsed:r.getParsed(n),raw:e.data.datasets[s].data[n],formattedValue:a,dataset:r.getDataset(),dataIndex:n,datasetIndex:s,element:i}}function yl(e,t){const i=e.chart.ctx,{body:s,footer:n,title:r}=e,{boxWidth:o,boxHeight:a}=t,l=at(t.bodyFont),c=at(t.titleFont),h=at(t.footerFont),d=r.length,u=n.length,p=s.length,b=dt(t.padding);let f=b.height,m=0,g=s.reduce((_,C)=>_+C.before.length+C.lines.length+C.after.length,0);if(g+=e.beforeBody.length+e.afterBody.length,d&&(f+=d*c.lineHeight+(d-1)*t.titleSpacing+t.titleMarginBottom),g){const _=t.displayColors?Math.max(a,l.lineHeight):l.lineHeight;f+=p*_+(g-p)*l.lineHeight+(g-1)*t.bodySpacing}u&&(f+=t.footerMarginTop+u*h.lineHeight+(u-1)*t.footerSpacing);let y=0;const x=function(_){m=Math.max(m,i.measureText(_).width+y)};return i.save(),i.font=c.string,N(e.title,x),i.font=l.string,N(e.beforeBody.concat(e.afterBody),x),y=t.displayColors?o+2+t.boxPadding:0,N(s,_=>{N(_.before,x),N(_.lines,x),N(_.after,x)}),y=0,i.font=h.string,N(e.footer,x),i.restore(),m+=b.width,{width:m,height:f}}function F0(e,t){const{y:i,height:s}=t;return i<s/2?"top":i>e.height-s/2?"bottom":"center"}function H0(e,t,i,s){const{x:n,width:r}=s,o=i.caretSize+i.caretPadding;if(e==="left"&&n+r+o>t.width||e==="right"&&n-r-o<0)return!0}function j0(e,t,i,s){const{x:n,width:r}=i,{width:o,chartArea:{left:a,right:l}}=e;let c="center";return s==="center"?c=n<=(a+l)/2?"left":"right":n<=r/2?c="left":n>=o-r/2&&(c="right"),H0(c,e,t,i)&&(c="center"),c}function xl(e,t,i){const s=i.yAlign||t.yAlign||F0(e,i);return{xAlign:i.xAlign||t.xAlign||j0(e,t,i,s),yAlign:s}}function V0(e,t){let{x:i,width:s}=e;return t==="right"?i-=s:t==="center"&&(i-=s/2),i}function N0(e,t,i){let{y:s,height:n}=e;return t==="top"?s+=i:t==="bottom"?s-=n+i:s-=n/2,s}function _l(e,t,i,s){const{caretSize:n,caretPadding:r,cornerRadius:o}=e,{xAlign:a,yAlign:l}=i,c=n+r,{topLeft:h,topRight:d,bottomLeft:u,bottomRight:p}=We(o);let b=V0(t,a);const f=N0(t,l,c);return l==="center"?a==="left"?b+=c:a==="right"&&(b-=c):a==="left"?b-=Math.max(h,u)+n:a==="right"&&(b+=Math.max(d,p)+n),{x:ct(b,0,s.width-t.width),y:ct(f,0,s.height-t.height)}}function qs(e,t,i){const s=dt(i.padding);return t==="center"?e.x+e.width/2:t==="right"?e.x+e.width-s.right:e.x+s.left}function wl(e){return Ft([],Xt(e))}function W0(e,t,i){return Pe(e,{tooltip:t,tooltipItems:i,type:"tooltip"})}function kl(e,t){const i=t&&t.dataset&&t.dataset.tooltip&&t.dataset.tooltip.callbacks;return i?e.override(i):e}const od={beforeTitle:Kt,title(e){if(e.length>0){const t=e[0],i=t.chart.data.labels,s=i?i.length:0;if(this&&this.options&&this.options.mode==="dataset")return t.dataset.label||"";if(t.label)return t.label;if(s>0&&t.dataIndex<s)return i[t.dataIndex]}return""},afterTitle:Kt,beforeBody:Kt,beforeLabel:Kt,label(e){if(this&&this.options&&this.options.mode==="dataset")return e.label+": "+e.formattedValue||e.formattedValue;let t=e.dataset.label||"";t&&(t+=": ");const i=e.formattedValue;return z(i)||(t+=i),t},labelColor(e){const t=e.chart.getDatasetMeta(e.datasetIndex).controller.getStyle(e.dataIndex);return{borderColor:t.borderColor,backgroundColor:t.backgroundColor,borderWidth:t.borderWidth,borderDash:t.borderDash,borderDashOffset:t.borderDashOffset,borderRadius:0}},labelTextColor(){return this.options.bodyColor},labelPointStyle(e){const t=e.chart.getDatasetMeta(e.datasetIndex).controller.getStyle(e.dataIndex);return{pointStyle:t.pointStyle,rotation:t.rotation}},afterLabel:Kt,afterBody:Kt,beforeFooter:Kt,footer:Kt,afterFooter:Kt};function gt(e,t,i,s){const n=e[t].call(i,s);return typeof n>"u"?od[t].call(i,s):n}var gr;let Cl=(gr=class extends de{constructor(e){super(),this.opacity=0,this._active=[],this._eventPosition=void 0,this._size=void 0,this._cachedAnimations=void 0,this._tooltipItems=[],this.$animations=void 0,this.$context=void 0,this.chart=e.chart,this.options=e.options,this.dataPoints=void 0,this.title=void 0,this.beforeBody=void 0,this.body=void 0,this.afterBody=void 0,this.footer=void 0,this.xAlign=void 0,this.yAlign=void 0,this.x=void 0,this.y=void 0,this.height=void 0,this.width=void 0,this.caretX=void 0,this.caretY=void 0,this.labelColors=void 0,this.labelPointStyles=void 0,this.labelTextColors=void 0}initialize(e){this.options=e,this._cachedAnimations=void 0,this.$context=void 0}_resolveAnimations(){const e=this._cachedAnimations;if(e)return e;const t=this.chart,i=this.options.setContext(this.getContext()),s=i.enabled&&t.options.animation&&i.animations,n=new Fh(this.chart,s);return s._cacheable&&(this._cachedAnimations=Object.freeze(n)),n}getContext(){return this.$context||(this.$context=W0(this.chart.getContext(),this,this._tooltipItems))}getTitle(e,t){const{callbacks:i}=t,s=gt(i,"beforeTitle",this,e),n=gt(i,"title",this,e),r=gt(i,"afterTitle",this,e);let o=[];return o=Ft(o,Xt(s)),o=Ft(o,Xt(n)),o=Ft(o,Xt(r)),o}getBeforeBody(e,t){return wl(gt(t.callbacks,"beforeBody",this,e))}getBody(e,t){const{callbacks:i}=t,s=[];return N(e,n=>{const r={before:[],lines:[],after:[]},o=kl(i,n);Ft(r.before,Xt(gt(o,"beforeLabel",this,n))),Ft(r.lines,gt(o,"label",this,n)),Ft(r.after,Xt(gt(o,"afterLabel",this,n))),s.push(r)}),s}getAfterBody(e,t){return wl(gt(t.callbacks,"afterBody",this,e))}getFooter(e,t){const{callbacks:i}=t,s=gt(i,"beforeFooter",this,e),n=gt(i,"footer",this,e),r=gt(i,"afterFooter",this,e);let o=[];return o=Ft(o,Xt(s)),o=Ft(o,Xt(n)),o=Ft(o,Xt(r)),o}_createItems(e){const t=this._active,i=this.chart.data,s=[],n=[],r=[];let o=[],a,l;for(a=0,l=t.length;a<l;++a)o.push(B0(this.chart,t[a]));return e.filter&&(o=o.filter((c,h,d)=>e.filter(c,h,d,i))),e.itemSort&&(o=o.sort((c,h)=>e.itemSort(c,h,i))),N(o,c=>{const h=kl(e.callbacks,c);s.push(gt(h,"labelColor",this,c)),n.push(gt(h,"labelPointStyle",this,c)),r.push(gt(h,"labelTextColor",this,c))}),this.labelColors=s,this.labelPointStyles=n,this.labelTextColors=r,this.dataPoints=o,o}update(e,t){const i=this.options.setContext(this.getContext()),s=this._active;let n,r=[];if(!s.length)this.opacity!==0&&(n={opacity:0});else{const o=Ni[i.position].call(this,s,this._eventPosition);r=this._createItems(i),this.title=this.getTitle(r,i),this.beforeBody=this.getBeforeBody(r,i),this.body=this.getBody(r,i),this.afterBody=this.getAfterBody(r,i),this.footer=this.getFooter(r,i);const a=this._size=yl(this,i),l=Object.assign({},o,a),c=xl(this.chart,i,l),h=_l(i,l,c,this.chart);this.xAlign=c.xAlign,this.yAlign=c.yAlign,n={opacity:1,x:h.x,y:h.y,width:a.width,height:a.height,caretX:o.x,caretY:o.y}}this._tooltipItems=r,this.$context=void 0,n&&this._resolveAnimations().update(this,n),e&&i.external&&i.external.call(this,{chart:this.chart,tooltip:this,replay:t})}drawCaret(e,t,i,s){const n=this.getCaretPosition(e,i,s);t.lineTo(n.x1,n.y1),t.lineTo(n.x2,n.y2),t.lineTo(n.x3,n.y3)}getCaretPosition(e,t,i){const{xAlign:s,yAlign:n}=this,{caretSize:r,cornerRadius:o}=i,{topLeft:a,topRight:l,bottomLeft:c,bottomRight:h}=We(o),{x:d,y:u}=e,{width:p,height:b}=t;let f,m,g,y,x,_;return n==="center"?(x=u+b/2,s==="left"?(f=d,m=f-r,y=x+r,_=x-r):(f=d+p,m=f+r,y=x-r,_=x+r),g=f):(s==="left"?m=d+Math.max(a,c)+r:s==="right"?m=d+p-Math.max(l,h)-r:m=this.caretX,n==="top"?(y=u,x=y-r,f=m-r,g=m+r):(y=u+b,x=y+r,f=m+r,g=m-r),_=y),{x1:f,x2:m,x3:g,y1:y,y2:x,y3:_}}drawTitle(e,t,i){const s=this.title,n=s.length;let r,o,a;if(n){const l=ui(i.rtl,this.x,this.width);for(e.x=qs(this,i.titleAlign,i),t.textAlign=l.textAlign(i.titleAlign),t.textBaseline="middle",r=at(i.titleFont),o=i.titleSpacing,t.fillStyle=i.titleColor,t.font=r.string,a=0;a<n;++a)t.fillText(s[a],l.x(e.x),e.y+r.lineHeight/2),e.y+=r.lineHeight+o,a+1===n&&(e.y+=i.titleMarginBottom-o)}}_drawColorBox(e,t,i,s,n){const r=this.labelColors[i],o=this.labelPointStyles[i],{boxHeight:a,boxWidth:l}=n,c=at(n.bodyFont),h=qs(this,"left",n),d=s.x(h),u=a<c.lineHeight?(c.lineHeight-a)/2:0,p=t.y+u;if(n.usePointStyle){const b={radius:Math.min(l,a)/2,pointStyle:o.pointStyle,rotation:o.rotation,borderWidth:1},f=s.leftForLtr(d,l)+l/2,m=p+a/2;e.strokeStyle=n.multiKeyBackground,e.fillStyle=n.multiKeyBackground,Tr(e,b,f,m),e.strokeStyle=r.borderColor,e.fillStyle=r.backgroundColor,Tr(e,b,f,m)}else{e.lineWidth=B(r.borderWidth)?Math.max(...Object.values(r.borderWidth)):r.borderWidth||1,e.strokeStyle=r.borderColor,e.setLineDash(r.borderDash||[]),e.lineDashOffset=r.borderDashOffset||0;const b=s.leftForLtr(d,l),f=s.leftForLtr(s.xPlus(d,1),l-2),m=We(r.borderRadius);Object.values(m).some(g=>g!==0)?(e.beginPath(),e.fillStyle=n.multiKeyBackground,ds(e,{x:b,y:p,w:l,h:a,radius:m}),e.fill(),e.stroke(),e.fillStyle=r.backgroundColor,e.beginPath(),ds(e,{x:f,y:p+1,w:l-2,h:a-2,radius:m}),e.fill()):(e.fillStyle=n.multiKeyBackground,e.fillRect(b,p,l,a),e.strokeRect(b,p,l,a),e.fillStyle=r.backgroundColor,e.fillRect(f,p+1,l-2,a-2))}e.fillStyle=this.labelTextColors[i]}drawBody(e,t,i){const{body:s}=this,{bodySpacing:n,bodyAlign:r,displayColors:o,boxHeight:a,boxWidth:l,boxPadding:c}=i,h=at(i.bodyFont);let d=h.lineHeight,u=0;const p=ui(i.rtl,this.x,this.width),b=function(S){t.fillText(S,p.x(e.x+u),e.y+d/2),e.y+=d+n},f=p.textAlign(r);let m,g,y,x,_,C,k;for(t.textAlign=r,t.textBaseline="middle",t.font=h.string,e.x=qs(this,f,i),t.fillStyle=i.bodyColor,N(this.beforeBody,b),u=o&&f!=="right"?r==="center"?l/2+c:l+2+c:0,x=0,C=s.length;x<C;++x){for(m=s[x],g=this.labelTextColors[x],t.fillStyle=g,N(m.before,b),y=m.lines,o&&y.length&&(this._drawColorBox(t,e,x,p,i),d=Math.max(h.lineHeight,a)),_=0,k=y.length;_<k;++_)b(y[_]),d=h.lineHeight;N(m.after,b)}u=0,d=h.lineHeight,N(this.afterBody,b),e.y-=n}drawFooter(e,t,i){const s=this.footer,n=s.length;let r,o;if(n){const a=ui(i.rtl,this.x,this.width);for(e.x=qs(this,i.footerAlign,i),e.y+=i.footerMarginTop,t.textAlign=a.textAlign(i.footerAlign),t.textBaseline="middle",r=at(i.footerFont),t.fillStyle=i.footerColor,t.font=r.string,o=0;o<n;++o)t.fillText(s[o],a.x(e.x),e.y+r.lineHeight/2),e.y+=r.lineHeight+i.footerSpacing}}drawBackground(e,t,i,s){const{xAlign:n,yAlign:r}=this,{x:o,y:a}=e,{width:l,height:c}=i,{topLeft:h,topRight:d,bottomLeft:u,bottomRight:p}=We(s.cornerRadius);t.fillStyle=s.backgroundColor,t.strokeStyle=s.borderColor,t.lineWidth=s.borderWidth,t.beginPath(),t.moveTo(o+h,a),r==="top"&&this.drawCaret(e,t,i,s),t.lineTo(o+l-d,a),t.quadraticCurveTo(o+l,a,o+l,a+d),r==="center"&&n==="right"&&this.drawCaret(e,t,i,s),t.lineTo(o+l,a+c-p),t.quadraticCurveTo(o+l,a+c,o+l-p,a+c),r==="bottom"&&this.drawCaret(e,t,i,s),t.lineTo(o+u,a+c),t.quadraticCurveTo(o,a+c,o,a+c-u),r==="center"&&n==="left"&&this.drawCaret(e,t,i,s),t.lineTo(o,a+h),t.quadraticCurveTo(o,a,o+h,a),t.closePath(),t.fill(),s.borderWidth>0&&t.stroke()}_updateAnimationTarget(e){const t=this.chart,i=this.$animations,s=i&&i.x,n=i&&i.y;if(s||n){const r=Ni[e.position].call(this,this._active,this._eventPosition);if(!r)return;const o=this._size=yl(this,e),a=Object.assign({},r,this._size),l=xl(t,e,a),c=_l(e,a,l,t);(s._to!==c.x||n._to!==c.y)&&(this.xAlign=l.xAlign,this.yAlign=l.yAlign,this.width=o.width,this.height=o.height,this.caretX=r.x,this.caretY=r.y,this._resolveAnimations().update(this,c))}}_willRender(){return!!this.opacity}draw(e){const t=this.options.setContext(this.getContext());let i=this.opacity;if(!i)return;this._updateAnimationTarget(t);const s={width:this.width,height:this.height},n={x:this.x,y:this.y};i=Math.abs(i)<.001?0:i;const r=dt(t.padding),o=this.title.length||this.beforeBody.length||this.body.length||this.afterBody.length||this.footer.length;t.enabled&&o&&(e.save(),e.globalAlpha=i,this.drawBackground(n,e,s,t),Th(e,t.textDirection),n.y+=r.top,this.drawTitle(n,e,t),this.drawBody(n,e,t),this.drawFooter(n,e,t),Lh(e,t.textDirection),e.restore())}getActiveElements(){return this._active||[]}setActiveElements(e,t){const i=this._active,s=e.map(({datasetIndex:o,index:a})=>{const l=this.chart.getDatasetMeta(o);if(!l)throw new Error("Cannot find a dataset at index "+o);return{datasetIndex:o,element:l.data[a],index:a}}),n=!xn(i,s),r=this._positionChanged(s,t);(n||r)&&(this._active=s,this._eventPosition=t,this._ignoreReplayEvents=!0,this.update(!0))}handleEvent(e,t,i=!0){if(t&&this._ignoreReplayEvents)return!1;this._ignoreReplayEvents=!1;const s=this.options,n=this._active||[],r=this._getActiveElements(e,n,t,i),o=this._positionChanged(r,e),a=t||!xn(r,n)||o;return a&&(this._active=r,(s.enabled||s.external)&&(this._eventPosition={x:e.x,y:e.y},this.update(!0,t))),a}_getActiveElements(e,t,i,s){const n=this.options;if(e.type==="mouseout")return[];if(!s)return t.filter(o=>this.chart.data.datasets[o.datasetIndex]&&this.chart.getDatasetMeta(o.datasetIndex).controller.getParsed(o.index)!==void 0);const r=this.chart.getElementsAtEventForMode(e,n.mode,n,i);return n.reverse&&r.reverse(),r}_positionChanged(e,t){const{caretX:i,caretY:s,options:n}=this,r=Ni[n.position].call(this,e,t);return r!==!1&&(i!==r.x||s!==r.y)}},A(gr,"positioners",Ni),gr);var U0={id:"tooltip",_element:Cl,positioners:Ni,afterInit(e,t,i){i&&(e.tooltip=new Cl({chart:e,options:i}))},beforeUpdate(e,t,i){e.tooltip&&e.tooltip.initialize(i)},reset(e,t,i){e.tooltip&&e.tooltip.initialize(i)},afterDraw(e){const t=e.tooltip;if(t&&t._willRender()){const i={tooltip:t};if(e.notifyPlugins("beforeTooltipDraw",{...i,cancelable:!0})===!1)return;t.draw(e.ctx),e.notifyPlugins("afterTooltipDraw",i)}},afterEvent(e,t){if(e.tooltip){const i=t.replay;e.tooltip.handleEvent(t.event,i,t.inChartArea)&&(t.changed=!0)}},defaults:{enabled:!0,external:null,position:"average",backgroundColor:"rgba(0,0,0,0.8)",titleColor:"#fff",titleFont:{weight:"bold"},titleSpacing:2,titleMarginBottom:6,titleAlign:"left",bodyColor:"#fff",bodySpacing:2,bodyFont:{},bodyAlign:"left",footerColor:"#fff",footerSpacing:2,footerMarginTop:6,footerFont:{weight:"bold"},footerAlign:"left",padding:6,caretPadding:2,caretSize:5,cornerRadius:6,boxHeight:(e,t)=>t.bodyFont.size,boxWidth:(e,t)=>t.bodyFont.size,multiKeyBackground:"#fff",displayColors:!0,boxPadding:0,borderColor:"rgba(0,0,0,0)",borderWidth:0,animation:{duration:400,easing:"easeOutQuart"},animations:{numbers:{type:"number",properties:["x","y","width","height","caretX","caretY"]},opacity:{easing:"linear",duration:200}},callbacks:od},defaultRoutes:{bodyFont:"font",footerFont:"font",titleFont:"font"},descriptors:{_scriptable:e=>e!=="filter"&&e!=="itemSort"&&e!=="external",_indexable:!1,callbacks:{_scriptable:!1,_indexable:!1},animation:{_fallback:!1},animations:{_fallback:"animation"}},additionalOptionScopes:["interaction"]},q0=Object.freeze({__proto__:null,Colors:n0,Decimation:l0,Filler:$0,Legend:L0,SubTitle:I0,Title:R0,Tooltip:U0});const Y0=(e,t,i,s)=>(typeof t=="string"?(i=e.push(t)-1,s.unshift({index:i,label:t})):isNaN(t)&&(i=null),i);function K0(e,t,i,s){const n=e.indexOf(t);if(n===-1)return Y0(e,t,i,s);const r=e.lastIndexOf(t);return n!==r?i:n}const G0=(e,t)=>e===null?null:ct(Math.round(e),0,t);function ad(e){const t=this.getLabels();return e>=0&&e<t.length?t[e]:e}class Hr extends ii{constructor(t){super(t),this._startValue=void 0,this._valueRange=0,this._addedLabels=[]}init(t){const i=this._addedLabels;if(i.length){const s=this.getLabels();for(const{index:n,label:r}of i)s[n]===r&&s.splice(n,1);this._addedLabels=[]}super.init(t)}parse(t,i){if(z(t))return null;const s=this.getLabels();return i=isFinite(i)&&s[i]===t?i:K0(s,t,L(i,t),this._addedLabels),G0(i,s.length-1)}determineDataLimits(){const{minDefined:t,maxDefined:i}=this.getUserBounds();let{min:s,max:n}=this.getMinMax(!0);this.options.bounds==="ticks"&&(t||(s=0),i||(n=this.getLabels().length-1)),this.min=s,this.max=n}buildTicks(){const t=this.min,i=this.max,s=this.options.offset,n=[];let r=this.getLabels();r=t===0&&i===r.length-1?r:r.slice(t,i+1),this._valueRange=Math.max(r.length-(s?0:1),1),this._startValue=this.min-(s?.5:0);for(let o=t;o<=i;o++)n.push({value:o});return n}getLabelForValue(t){return ad.call(this,t)}configure(){super.configure(),this.isHorizontal()||(this._reversePixels=!this._reversePixels)}getPixelForValue(t){return typeof t!="number"&&(t=this.parse(t)),t===null?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getPixelForTick(t){const i=this.ticks;return t<0||t>i.length-1?null:this.getPixelForValue(i[t].value)}getValueForPixel(t){return Math.round(this._startValue+this.getDecimalForPixel(t)*this._valueRange)}getBasePixel(){return this.bottom}}A(Hr,"id","category"),A(Hr,"defaults",{ticks:{callback:ad}});function X0(e,t){const i=[],{bounds:s,step:n,min:r,max:o,precision:a,count:l,maxTicks:c,maxDigits:h,includeBounds:d}=e,u=n||1,p=c-1,{min:b,max:f}=t,m=!z(r),g=!z(o),y=!z(l),x=(f-b)/(h+1);let _=ya((f-b)/p/u)*u,C,k,S,M;if(_<1e-14&&!m&&!g)return[{value:b},{value:f}];M=Math.ceil(f/_)-Math.floor(b/_),M>p&&(_=ya(M*_/p/u)*u),z(a)||(C=Math.pow(10,a),_=Math.ceil(_*C)/C),s==="ticks"?(k=Math.floor(b/_)*_,S=Math.ceil(f/_)*_):(k=b,S=f),m&&g&&n&&Vb((o-r)/n,_/1e3)?(M=Math.round(Math.min((o-r)/_,c)),_=(o-r)/M,k=r,S=o):y?(k=m?r:k,S=g?o:S,M=l-1,_=(S-k)/M):(M=(S-k)/_,Gi(M,Math.round(M),_/1e3)?M=Math.round(M):M=Math.ceil(M));const E=Math.max(xa(_),xa(k));C=Math.pow(10,z(a)?E:a),k=Math.round(k*C)/C,S=Math.round(S*C)/C;let $=0;for(m&&(d&&k!==r?(i.push({value:r}),k<r&&$++,Gi(Math.round((k+$*_)*C)/C,r,Sl(r,x,e))&&$++):k<r&&$++);$<M;++$){const P=Math.round((k+$*_)*C)/C;if(g&&P>o)break;i.push({value:P})}return g&&d&&S!==o?i.length&&Gi(i[i.length-1].value,o,Sl(o,x,e))?i[i.length-1].value=o:i.push({value:o}):(!g||S===o)&&i.push({value:S}),i}function Sl(e,t,{horizontal:i,minRotation:s}){const n=Rt(s),r=(i?Math.sin(n):Math.cos(n))||.001,o=.75*t*(""+e).length;return Math.min(t/r,o)}class An extends ii{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._endValue=void 0,this._valueRange=0}parse(t,i){return z(t)||(typeof t=="number"||t instanceof Number)&&!isFinite(+t)?null:+t}handleTickRangeOptions(){const{beginAtZero:t}=this.options,{minDefined:i,maxDefined:s}=this.getUserBounds();let{min:n,max:r}=this;const o=l=>n=i?n:l,a=l=>r=s?r:l;if(t){const l=Vt(n),c=Vt(r);l<0&&c<0?a(0):l>0&&c>0&&o(0)}if(n===r){let l=r===0?1:Math.abs(r*.05);a(r+l),t||o(n-l)}this.min=n,this.max=r}getTickLimit(){const t=this.options.ticks;let{maxTicksLimit:i,stepSize:s}=t,n;return s?(n=Math.ceil(this.max/s)-Math.floor(this.min/s)+1,n>1e3&&(console.warn(`scales.${this.id}.ticks.stepSize: ${s} would result generating up to ${n} ticks. Limiting to 1000.`),n=1e3)):(n=this.computeTickLimit(),i=i||11),i&&(n=Math.min(i,n)),n}computeTickLimit(){return Number.POSITIVE_INFINITY}buildTicks(){const t=this.options,i=t.ticks;let s=this.getTickLimit();s=Math.max(2,s);const n={maxTicks:s,bounds:t.bounds,min:t.min,max:t.max,precision:i.precision,step:i.stepSize,count:i.count,maxDigits:this._maxDigits(),horizontal:this.isHorizontal(),minRotation:i.minRotation||0,includeBounds:i.includeBounds!==!1},r=this._range||this,o=X0(n,r);return t.bounds==="ticks"&&mh(o,this,"value"),t.reverse?(o.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),o}configure(){const t=this.ticks;let i=this.min,s=this.max;if(super.configure(),this.options.offset&&t.length){const n=(s-i)/Math.max(t.length-1,1)/2;i-=n,s+=n}this._startValue=i,this._endValue=s,this._valueRange=s-i}getLabelForValue(t){return Es(t,this.chart.options.locale,this.options.ticks.format)}}class jr extends An{determineDataLimits(){const{min:t,max:i}=this.getMinMax(!0);this.min=tt(t)?t:0,this.max=tt(i)?i:1,this.handleTickRangeOptions()}computeTickLimit(){const t=this.isHorizontal(),i=t?this.width:this.height,s=Rt(this.options.ticks.minRotation),n=(t?Math.sin(s):Math.cos(s))||.001,r=this._resolveTickFontOptions(0);return Math.ceil(i/Math.min(40,r.lineHeight/n))}getPixelForValue(t){return t===null?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getValueForPixel(t){return this._startValue+this.getDecimalForPixel(t)*this._valueRange}}A(jr,"id","linear"),A(jr,"defaults",{ticks:{callback:jn.formatters.numeric}});const fs=e=>Math.floor(me(e)),Fe=(e,t)=>Math.pow(10,fs(e)+t);function Ml(e){return e/Math.pow(10,fs(e))===1}function Al(e,t,i){const s=Math.pow(10,i),n=Math.floor(e/s);return Math.ceil(t/s)-n}function Q0(e,t){const i=t-e;let s=fs(i);for(;Al(e,t,s)>10;)s++;for(;Al(e,t,s)<10;)s--;return Math.min(s,fs(e))}function Z0(e,{min:t,max:i}){t=kt(e.min,t);const s=[],n=fs(t);let r=Q0(t,i),o=r<0?Math.pow(10,Math.abs(r)):1;const a=Math.pow(10,r),l=n>r?Math.pow(10,n):0,c=Math.round((t-l)*o)/o,h=Math.floor((t-l)/a/10)*a*10;let d=Math.floor((c-h)/Math.pow(10,r)),u=kt(e.min,Math.round((l+h+d*Math.pow(10,r))*o)/o);for(;u<i;)s.push({value:u,major:Ml(u),significand:d}),d>=10?d=d<15?15:20:d++,d>=20&&(r++,d=2,o=r>=0?1:o),u=Math.round((l+h+d*Math.pow(10,r))*o)/o;const p=kt(e.max,u);return s.push({value:p,major:Ml(p),significand:d}),s}class Vr extends ii{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._valueRange=0}parse(t,i){const s=An.prototype.parse.apply(this,[t,i]);if(s===0){this._zero=!0;return}return tt(s)&&s>0?s:null}determineDataLimits(){const{min:t,max:i}=this.getMinMax(!0);this.min=tt(t)?Math.max(0,t):null,this.max=tt(i)?Math.max(0,i):null,this.options.beginAtZero&&(this._zero=!0),this._zero&&this.min!==this._suggestedMin&&!tt(this._userMin)&&(this.min=t===Fe(this.min,0)?Fe(this.min,-1):Fe(this.min,0)),this.handleTickRangeOptions()}handleTickRangeOptions(){const{minDefined:t,maxDefined:i}=this.getUserBounds();let s=this.min,n=this.max;const r=a=>s=t?s:a,o=a=>n=i?n:a;s===n&&(s<=0?(r(1),o(10)):(r(Fe(s,-1)),o(Fe(n,1)))),s<=0&&r(Fe(n,-1)),n<=0&&o(Fe(s,1)),this.min=s,this.max=n}buildTicks(){const t=this.options,i={min:this._userMin,max:this._userMax},s=Z0(i,this);return t.bounds==="ticks"&&mh(s,this,"value"),t.reverse?(s.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),s}getLabelForValue(t){return t===void 0?"0":Es(t,this.chart.options.locale,this.options.ticks.format)}configure(){const t=this.min;super.configure(),this._startValue=me(t),this._valueRange=me(this.max)-me(t)}getPixelForValue(t){return(t===void 0||t===0)&&(t=this.min),t===null||isNaN(t)?NaN:this.getPixelForDecimal(t===this.min?0:(me(t)-this._startValue)/this._valueRange)}getValueForPixel(t){const i=this.getDecimalForPixel(t);return Math.pow(10,this._startValue+i*this._valueRange)}}A(Vr,"id","logarithmic"),A(Vr,"defaults",{ticks:{callback:jn.formatters.logarithmic,major:{enabled:!0}}});function Nr(e){const t=e.ticks;if(t.display&&e.display){const i=dt(t.backdropPadding);return L(t.font&&t.font.size,G.font.size)+i.height}return 0}function J0(e,t,i){return i=Y(i)?i:[i],{w:rm(e,t.string,i),h:i.length*t.lineHeight}}function $l(e,t,i,s,n){return e===s||e===n?{start:t-i/2,end:t+i/2}:e<s||e>n?{start:t-i,end:t}:{start:t,end:t+i}}function ty(e){const t={l:e.left+e._padding.left,r:e.right-e._padding.right,t:e.top+e._padding.top,b:e.bottom-e._padding.bottom},i=Object.assign({},t),s=[],n=[],r=e._pointLabels.length,o=e.options.pointLabels,a=o.centerPointLabels?j/r:0;for(let l=0;l<r;l++){const c=o.setContext(e.getPointLabelContext(l));n[l]=c.padding;const h=e.getPointPosition(l,e.drawingArea+n[l],a),d=at(c.font),u=J0(e.ctx,d,e._pointLabels[l]);s[l]=u;const p=ft(e.getIndexAngle(l)+a),b=Math.round(po(p)),f=$l(b,h.x,u.w,0,180),m=$l(b,h.y,u.h,90,270);ey(i,t,p,f,m)}e.setCenterPoint(t.l-i.l,i.r-t.r,t.t-i.t,i.b-t.b),e._pointLabelItems=ny(e,s,n)}function ey(e,t,i,s,n){const r=Math.abs(Math.sin(i)),o=Math.abs(Math.cos(i));let a=0,l=0;s.start<t.l?(a=(t.l-s.start)/r,e.l=Math.min(e.l,t.l-a)):s.end>t.r&&(a=(s.end-t.r)/r,e.r=Math.max(e.r,t.r+a)),n.start<t.t?(l=(t.t-n.start)/o,e.t=Math.min(e.t,t.t-l)):n.end>t.b&&(l=(n.end-t.b)/o,e.b=Math.max(e.b,t.b+l))}function iy(e,t,i){const s=e.drawingArea,{extra:n,additionalAngle:r,padding:o,size:a}=i,l=e.getPointPosition(t,s+n+o,r),c=Math.round(po(ft(l.angle+st))),h=ay(l.y,a.h,c),d=ry(c),u=oy(l.x,a.w,d);return{visible:!0,x:l.x,y:h,textAlign:d,left:u,top:h,right:u+a.w,bottom:h+a.h}}function sy(e,t){if(!t)return!0;const{left:i,top:s,right:n,bottom:r}=e;return!(ne({x:i,y:s},t)||ne({x:i,y:r},t)||ne({x:n,y:s},t)||ne({x:n,y:r},t))}function ny(e,t,i){const s=[],n=e._pointLabels.length,r=e.options,{centerPointLabels:o,display:a}=r.pointLabels,l={extra:Nr(r)/2,additionalAngle:o?j/n:0};let c;for(let h=0;h<n;h++){l.padding=i[h],l.size=t[h];const d=iy(e,h,l);s.push(d),a==="auto"&&(d.visible=sy(d,c),d.visible&&(c=d))}return s}function ry(e){return e===0||e===180?"center":e<180?"left":"right"}function oy(e,t,i){return i==="right"?e-=t:i==="center"&&(e-=t/2),e}function ay(e,t,i){return i===90||i===270?e-=t/2:(i>270||i<90)&&(e-=t),e}function ly(e,t,i){const{left:s,top:n,right:r,bottom:o}=i,{backdropColor:a}=t;if(!z(a)){const l=We(t.borderRadius),c=dt(t.backdropPadding);e.fillStyle=a;const h=s-c.left,d=n-c.top,u=r-s+c.width,p=o-n+c.height;Object.values(l).some(b=>b!==0)?(e.beginPath(),ds(e,{x:h,y:d,w:u,h:p,radius:l}),e.fill()):e.fillRect(h,d,u,p)}}function cy(e,t){const{ctx:i,options:{pointLabels:s}}=e;for(let n=t-1;n>=0;n--){const r=e._pointLabelItems[n];if(!r.visible)continue;const o=s.setContext(e.getPointLabelContext(n));ly(i,o,r);const a=at(o.font),{x:l,y:c,textAlign:h}=r;Ke(i,e._pointLabels[n],l,c+a.lineHeight/2,a,{color:o.color,textAlign:h,textBaseline:"middle"})}}function ld(e,t,i,s){const{ctx:n}=e;if(i)n.arc(e.xCenter,e.yCenter,t,0,K);else{let r=e.getPointPosition(0,t);n.moveTo(r.x,r.y);for(let o=1;o<s;o++)r=e.getPointPosition(o,t),n.lineTo(r.x,r.y)}}function hy(e,t,i,s,n){const r=e.ctx,o=t.circular,{color:a,lineWidth:l}=t;!o&&!s||!a||!l||i<0||(r.save(),r.strokeStyle=a,r.lineWidth=l,r.setLineDash(n.dash||[]),r.lineDashOffset=n.dashOffset,r.beginPath(),ld(e,i,o,s),r.closePath(),r.stroke(),r.restore())}function dy(e,t,i){return Pe(e,{label:i,index:t,type:"pointLabel"})}class Wi extends An{constructor(t){super(t),this.xCenter=void 0,this.yCenter=void 0,this.drawingArea=void 0,this._pointLabels=[],this._pointLabelItems=[]}setDimensions(){const t=this._padding=dt(Nr(this.options)/2),i=this.width=this.maxWidth-t.width,s=this.height=this.maxHeight-t.height;this.xCenter=Math.floor(this.left+i/2+t.left),this.yCenter=Math.floor(this.top+s/2+t.top),this.drawingArea=Math.floor(Math.min(i,s)/2)}determineDataLimits(){const{min:t,max:i}=this.getMinMax(!1);this.min=tt(t)&&!isNaN(t)?t:0,this.max=tt(i)&&!isNaN(i)?i:0,this.handleTickRangeOptions()}computeTickLimit(){return Math.ceil(this.drawingArea/Nr(this.options))}generateTickLabels(t){An.prototype.generateTickLabels.call(this,t),this._pointLabels=this.getLabels().map((i,s)=>{const n=U(this.options.pointLabels.callback,[i,s],this);return n||n===0?n:""}).filter((i,s)=>this.chart.getDataVisibility(s))}fit(){const t=this.options;t.display&&t.pointLabels.display?ty(this):this.setCenterPoint(0,0,0,0)}setCenterPoint(t,i,s,n){this.xCenter+=Math.floor((t-i)/2),this.yCenter+=Math.floor((s-n)/2),this.drawingArea-=Math.min(this.drawingArea/2,Math.max(t,i,s,n))}getIndexAngle(t){const i=K/(this._pointLabels.length||1),s=this.options.startAngle||0;return ft(t*i+Rt(s))}getDistanceFromCenterForValue(t){if(z(t))return NaN;const i=this.drawingArea/(this.max-this.min);return this.options.reverse?(this.max-t)*i:(t-this.min)*i}getValueForDistanceFromCenter(t){if(z(t))return NaN;const i=t/(this.drawingArea/(this.max-this.min));return this.options.reverse?this.max-i:this.min+i}getPointLabelContext(t){const i=this._pointLabels||[];if(t>=0&&t<i.length){const s=i[t];return dy(this.getContext(),t,s)}}getPointPosition(t,i,s=0){const n=this.getIndexAngle(t)-st+s;return{x:Math.cos(n)*i+this.xCenter,y:Math.sin(n)*i+this.yCenter,angle:n}}getPointPositionForValue(t,i){return this.getPointPosition(t,this.getDistanceFromCenterForValue(i))}getBasePosition(t){return this.getPointPositionForValue(t||0,this.getBaseValue())}getPointLabelPosition(t){const{left:i,top:s,right:n,bottom:r}=this._pointLabelItems[t];return{left:i,top:s,right:n,bottom:r}}drawBackground(){const{backgroundColor:t,grid:{circular:i}}=this.options;if(t){const s=this.ctx;s.save(),s.beginPath(),ld(this,this.getDistanceFromCenterForValue(this._endValue),i,this._pointLabels.length),s.closePath(),s.fillStyle=t,s.fill(),s.restore()}}drawGrid(){const t=this.ctx,i=this.options,{angleLines:s,grid:n,border:r}=i,o=this._pointLabels.length;let a,l,c;if(i.pointLabels.display&&cy(this,o),n.display&&this.ticks.forEach((h,d)=>{if(d!==0||d===0&&this.min<0){l=this.getDistanceFromCenterForValue(h.value);const u=this.getContext(d),p=n.setContext(u),b=r.setContext(u);hy(this,p,l,o,b)}}),s.display){for(t.save(),a=o-1;a>=0;a--){const h=s.setContext(this.getPointLabelContext(a)),{color:d,lineWidth:u}=h;!u||!d||(t.lineWidth=u,t.strokeStyle=d,t.setLineDash(h.borderDash),t.lineDashOffset=h.borderDashOffset,l=this.getDistanceFromCenterForValue(i.reverse?this.min:this.max),c=this.getPointPosition(a,l),t.beginPath(),t.moveTo(this.xCenter,this.yCenter),t.lineTo(c.x,c.y),t.stroke())}t.restore()}}drawBorder(){}drawLabels(){const t=this.ctx,i=this.options,s=i.ticks;if(!s.display)return;const n=this.getIndexAngle(0);let r,o;t.save(),t.translate(this.xCenter,this.yCenter),t.rotate(n),t.textAlign="center",t.textBaseline="middle",this.ticks.forEach((a,l)=>{if(l===0&&this.min>=0&&!i.reverse)return;const c=s.setContext(this.getContext(l)),h=at(c.font);if(r=this.getDistanceFromCenterForValue(this.ticks[l].value),c.showLabelBackdrop){t.font=h.string,o=t.measureText(a.label).width,t.fillStyle=c.backdropColor;const d=dt(c.backdropPadding);t.fillRect(-o/2-d.left,-r-h.size/2-d.top,o+d.width,h.size+d.height)}Ke(t,a.label,0,-r,h,{color:c.color,strokeColor:c.textStrokeColor,strokeWidth:c.textStrokeWidth})}),t.restore()}drawTitle(){}}A(Wi,"id","radialLinear"),A(Wi,"defaults",{display:!0,animate:!0,position:"chartArea",angleLines:{display:!0,lineWidth:1,borderDash:[],borderDashOffset:0},grid:{circular:!1},startAngle:0,ticks:{showLabelBackdrop:!0,callback:jn.formatters.numeric},pointLabels:{backdropColor:void 0,backdropPadding:2,display:!0,font:{size:10},callback(e){return e},padding:5,centerPointLabels:!1}}),A(Wi,"defaultRoutes",{"angleLines.color":"borderColor","pointLabels.color":"color","ticks.color":"color"}),A(Wi,"descriptors",{angleLines:{_fallback:"grid"}});const Yn={millisecond:{common:!0,size:1,steps:1e3},second:{common:!0,size:1e3,steps:60},minute:{common:!0,size:6e4,steps:60},hour:{common:!0,size:36e5,steps:24},day:{common:!0,size:864e5,steps:30},week:{common:!1,size:6048e5,steps:4},month:{common:!0,size:2628e6,steps:12},quarter:{common:!1,size:7884e6,steps:4},year:{common:!0,size:3154e7}},xt=Object.keys(Yn);function El(e,t){return e-t}function Pl(e,t){if(z(t))return null;const i=e._adapter,{parser:s,round:n,isoWeekday:r}=e._parseOpts;let o=t;return typeof s=="function"&&(o=s(o)),tt(o)||(o=typeof s=="string"?i.parse(o,s):i.parse(o)),o===null?null:(n&&(o=n==="week"&&(vi(r)||r===!0)?i.startOf(o,"isoWeek",r):i.startOf(o,n)),+o)}function Dl(e,t,i,s){const n=xt.length;for(let r=xt.indexOf(e);r<n-1;++r){const o=Yn[xt[r]],a=o.steps?o.steps:Number.MAX_SAFE_INTEGER;if(o.common&&Math.ceil((i-t)/(a*o.size))<=s)return xt[r]}return xt[n-1]}function uy(e,t,i,s,n){for(let r=xt.length-1;r>=xt.indexOf(i);r--){const o=xt[r];if(Yn[o].common&&e._adapter.diff(n,s,o)>=t-1)return o}return xt[i?xt.indexOf(i):0]}function py(e){for(let t=xt.indexOf(e)+1,i=xt.length;t<i;++t)if(Yn[xt[t]].common)return xt[t]}function Ol(e,t,i){if(!i)e[t]=!0;else if(i.length){const{lo:s,hi:n}=fo(i,t),r=i[s]>=t?i[s]:i[n];e[r]=!0}}function fy(e,t,i,s){const n=e._adapter,r=+n.startOf(t[0].value,s),o=t[t.length-1].value;let a,l;for(a=r;a<=o;a=+n.add(a,1,s))l=i[a],l>=0&&(t[l].major=!0);return t}function Tl(e,t,i){const s=[],n={},r=t.length;let o,a;for(o=0;o<r;++o)a=t[o],n[a]=o,s.push({value:a,major:!1});return r===0||!i?s:fy(e,s,n,i)}class bs extends ii{constructor(t){super(t),this._cache={data:[],labels:[],all:[]},this._unit="day",this._majorUnit=void 0,this._offsets={},this._normalized=!1,this._parseOpts=void 0}init(t,i={}){const s=t.time||(t.time={}),n=this._adapter=new wg._date(t.adapters.date);n.init(i),Ki(s.displayFormats,n.formats()),this._parseOpts={parser:s.parser,round:s.round,isoWeekday:s.isoWeekday},super.init(t),this._normalized=i.normalized}parse(t,i){return t===void 0?null:Pl(this,t)}beforeLayout(){super.beforeLayout(),this._cache={data:[],labels:[],all:[]}}determineDataLimits(){const t=this.options,i=this._adapter,s=t.time.unit||"day";let{min:n,max:r,minDefined:o,maxDefined:a}=this.getUserBounds();function l(c){!o&&!isNaN(c.min)&&(n=Math.min(n,c.min)),!a&&!isNaN(c.max)&&(r=Math.max(r,c.max))}(!o||!a)&&(l(this._getLabelBounds()),(t.bounds!=="ticks"||t.ticks.source!=="labels")&&l(this.getMinMax(!1))),n=tt(n)&&!isNaN(n)?n:+i.startOf(Date.now(),s),r=tt(r)&&!isNaN(r)?r:+i.endOf(Date.now(),s)+1,this.min=Math.min(n,r-1),this.max=Math.max(n+1,r)}_getLabelBounds(){const t=this.getLabelTimestamps();let i=Number.POSITIVE_INFINITY,s=Number.NEGATIVE_INFINITY;return t.length&&(i=t[0],s=t[t.length-1]),{min:i,max:s}}buildTicks(){const t=this.options,i=t.time,s=t.ticks,n=s.source==="labels"?this.getLabelTimestamps():this._generate();t.bounds==="ticks"&&n.length&&(this.min=this._userMin||n[0],this.max=this._userMax||n[n.length-1]);const r=this.min,o=this.max,a=qb(n,r,o);return this._unit=i.unit||(s.autoSkip?Dl(i.minUnit,this.min,this.max,this._getLabelCapacity(r)):uy(this,a.length,i.minUnit,this.min,this.max)),this._majorUnit=!s.major.enabled||this._unit==="year"?void 0:py(this._unit),this.initOffsets(n),t.reverse&&a.reverse(),Tl(this,a,this._majorUnit)}afterAutoSkip(){this.options.offsetAfterAutoskip&&this.initOffsets(this.ticks.map(t=>+t.value))}initOffsets(t=[]){let i=0,s=0,n,r;this.options.offset&&t.length&&(n=this.getDecimalForValue(t[0]),t.length===1?i=1-n:i=(this.getDecimalForValue(t[1])-n)/2,r=this.getDecimalForValue(t[t.length-1]),t.length===1?s=r:s=(r-this.getDecimalForValue(t[t.length-2]))/2);const o=t.length<3?.5:.25;i=ct(i,0,o),s=ct(s,0,o),this._offsets={start:i,end:s,factor:1/(i+1+s)}}_generate(){const t=this._adapter,i=this.min,s=this.max,n=this.options,r=n.time,o=r.unit||Dl(r.minUnit,i,s,this._getLabelCapacity(i)),a=L(n.ticks.stepSize,1),l=o==="week"?r.isoWeekday:!1,c=vi(l)||l===!0,h={};let d=i,u,p;if(c&&(d=+t.startOf(d,"isoWeek",l)),d=+t.startOf(d,c?"day":o),t.diff(s,i,o)>1e5*a)throw new Error(i+" and "+s+" are too far apart with stepSize of "+a+" "+o);const b=n.ticks.source==="data"&&this.getDataTimestamps();for(u=d,p=0;u<s;u=+t.add(u,a,o),p++)Ol(h,u,b);return(u===s||n.bounds==="ticks"||p===1)&&Ol(h,u,b),Object.keys(h).sort(El).map(f=>+f)}getLabelForValue(t){const i=this._adapter,s=this.options.time;return s.tooltipFormat?i.format(t,s.tooltipFormat):i.format(t,s.displayFormats.datetime)}format(t,i){const s=this.options.time.displayFormats,n=this._unit,r=i||s[n];return this._adapter.format(t,r)}_tickFormatFunction(t,i,s,n){const r=this.options,o=r.ticks.callback;if(o)return U(o,[t,i,s],this);const a=r.time.displayFormats,l=this._unit,c=this._majorUnit,h=l&&a[l],d=c&&a[c],u=s[i],p=c&&d&&u&&u.major;return this._adapter.format(t,n||(p?d:h))}generateTickLabels(t){let i,s,n;for(i=0,s=t.length;i<s;++i)n=t[i],n.label=this._tickFormatFunction(n.value,i,t)}getDecimalForValue(t){return t===null?NaN:(t-this.min)/(this.max-this.min)}getPixelForValue(t){const i=this._offsets,s=this.getDecimalForValue(t);return this.getPixelForDecimal((i.start+s)*i.factor)}getValueForPixel(t){const i=this._offsets,s=this.getDecimalForPixel(t)/i.factor-i.end;return this.min+s*(this.max-this.min)}_getLabelSize(t){const i=this.options.ticks,s=this.ctx.measureText(t).width,n=Rt(this.isHorizontal()?i.maxRotation:i.minRotation),r=Math.cos(n),o=Math.sin(n),a=this._resolveTickFontOptions(0).size;return{w:s*r+a*o,h:s*o+a*r}}_getLabelCapacity(t){const i=this.options.time,s=i.displayFormats,n=s[i.unit]||s.millisecond,r=this._tickFormatFunction(t,0,Tl(this,[t],this._majorUnit),n),o=this._getLabelSize(r),a=Math.floor(this.isHorizontal()?this.width/o.w:this.height/o.h)-1;return a>0?a:1}getDataTimestamps(){let t=this._cache.data||[],i,s;if(t.length)return t;const n=this.getMatchingVisibleMetas();if(this._normalized&&n.length)return this._cache.data=n[0].controller.getAllParsedValues(this);for(i=0,s=n.length;i<s;++i)t=t.concat(n[i].controller.getAllParsedValues(this));return this._cache.data=this.normalize(t)}getLabelTimestamps(){const t=this._cache.labels||[];let i,s;if(t.length)return t;const n=this.getLabels();for(i=0,s=n.length;i<s;++i)t.push(Pl(this,n[i]));return this._cache.labels=this._normalized?t:this.normalize(t)}normalize(t){return yh(t.sort(El))}}A(bs,"id","time"),A(bs,"defaults",{bounds:"data",adapters:{},time:{parser:!1,unit:!1,round:!1,isoWeekday:!1,minUnit:"millisecond",displayFormats:{}},ticks:{source:"auto",callback:!1,major:{enabled:!1}}});function Ys(e,t,i){let s=0,n=e.length-1,r,o,a,l;i?(t>=e[s].pos&&t<=e[n].pos&&({lo:s,hi:n}=se(e,"pos",t)),{pos:r,time:a}=e[s],{pos:o,time:l}=e[n]):(t>=e[s].time&&t<=e[n].time&&({lo:s,hi:n}=se(e,"time",t)),{time:r,pos:a}=e[s],{time:o,pos:l}=e[n]);const c=o-r;return c?a+(l-a)*(t-r)/c:a}class Wr extends bs{constructor(t){super(t),this._table=[],this._minPos=void 0,this._tableRange=void 0}initOffsets(){const t=this._getTimestampsForTable(),i=this._table=this.buildLookupTable(t);this._minPos=Ys(i,this.min),this._tableRange=Ys(i,this.max)-this._minPos,super.initOffsets(t)}buildLookupTable(t){const{min:i,max:s}=this,n=[],r=[];let o,a,l,c,h;for(o=0,a=t.length;o<a;++o)c=t[o],c>=i&&c<=s&&n.push(c);if(n.length<2)return[{time:i,pos:0},{time:s,pos:1}];for(o=0,a=n.length;o<a;++o)h=n[o+1],l=n[o-1],c=n[o],Math.round((h+l)/2)!==c&&r.push({time:c,pos:o/(a-1)});return r}_generate(){const t=this.min,i=this.max;let s=super.getDataTimestamps();return(!s.includes(t)||!s.length)&&s.splice(0,0,t),(!s.includes(i)||s.length===1)&&s.push(i),s.sort((n,r)=>n-r)}_getTimestampsForTable(){let t=this._cache.all||[];if(t.length)return t;const i=this.getDataTimestamps(),s=this.getLabelTimestamps();return i.length&&s.length?t=this.normalize(i.concat(s)):t=i.length?i:s,t=this._cache.all=t,t}getDecimalForValue(t){return(Ys(this._table,t)-this._minPos)/this._tableRange}getValueForPixel(t){const i=this._offsets,s=this.getDecimalForPixel(t)/i.factor-i.end;return Ys(this._table,s*this._tableRange+this._minPos,!0)}}A(Wr,"id","timeseries"),A(Wr,"defaults",bs.defaults);var by=Object.freeze({__proto__:null,CategoryScale:Hr,LinearScale:jr,LogarithmicScale:Vr,RadialLinearScale:Wi,TimeScale:bs,TimeSeriesScale:Wr});const my=[_g,Qv,q0,by];ps.register(...my);var Ll=(function(){if(typeof window<"u"){if(window.devicePixelRatio)return window.devicePixelRatio;var e=window.screen;if(e)return(e.deviceXDPI||1)/(e.logicalXDPI||1)}return 1})(),es={toTextLines:function(e){var t=[],i;for(e=[].concat(e);e.length;)i=e.pop(),typeof i=="string"?t.unshift.apply(t,i.split(`
`)):Array.isArray(i)?e.push.apply(e,i):z(e)||t.unshift(""+i);return t},textSize:function(e,t,i){var s=[].concat(t),n=s.length,r=e.font,o=0,a;for(e.font=i.string,a=0;a<n;++a)o=Math.max(e.measureText(s[a]).width,o);return e.font=r,{height:n*i.lineHeight,width:o}},bound:function(e,t,i){return Math.max(e,Math.min(t,i))},arrayDiff:function(e,t){var i=e.slice(),s=[],n,r,o,a;for(n=0,o=t.length;n<o;++n)a=t[n],r=i.indexOf(a),r===-1?s.push([a,1]):i.splice(r,1);for(n=0,o=i.length;n<o;++n)s.push([i[n],-1]);return s},rasterize:function(e){return Math.round(e*Ll)/Ll}};function vr(e,t){var i=t.x,s=t.y;if(i===null)return{x:0,y:-1};if(s===null)return{x:1,y:0};var n=e.x-i,r=e.y-s,o=Math.sqrt(n*n+r*r);return{x:o?n/o:0,y:o?r/o:-1}}function gy(e,t,i,s,n){switch(n){case"center":i=s=0;break;case"bottom":i=0,s=1;break;case"right":i=1,s=0;break;case"left":i=-1,s=0;break;case"top":i=0,s=-1;break;case"start":i=-i,s=-s;break;case"end":break;default:n*=Math.PI/180,i=Math.cos(n),s=Math.sin(n);break}return{x:e,y:t,vx:i,vy:s}}var vy=0,cd=1,hd=2,dd=4,ud=8;function Ks(e,t,i){var s=vy;return e<i.left?s|=cd:e>i.right&&(s|=hd),t<i.top?s|=ud:t>i.bottom&&(s|=dd),s}function yy(e,t){for(var i=e.x0,s=e.y0,n=e.x1,r=e.y1,o=Ks(i,s,t),a=Ks(n,r,t),l,c,h;!(!(o|a)||o&a);)l=o||a,l&ud?(c=i+(n-i)*(t.top-s)/(r-s),h=t.top):l&dd?(c=i+(n-i)*(t.bottom-s)/(r-s),h=t.bottom):l&hd?(h=s+(r-s)*(t.right-i)/(n-i),c=t.right):l&cd&&(h=s+(r-s)*(t.left-i)/(n-i),c=t.left),l===o?(i=c,s=h,o=Ks(i,s,t)):(n=c,r=h,a=Ks(n,r,t));return{x0:i,x1:n,y0:s,y1:r}}function Gs(e,t){var i=t.anchor,s=e,n,r;return t.clamp&&(s=yy(s,t.area)),i==="start"?(n=s.x0,r=s.y0):i==="end"?(n=s.x1,r=s.y1):(n=(s.x0+s.x1)/2,r=(s.y0+s.y1)/2),gy(n,r,e.vx,e.vy,t.align)}var Xs={arc:function(e,t){var i=(e.startAngle+e.endAngle)/2,s=Math.cos(i),n=Math.sin(i),r=e.innerRadius,o=e.outerRadius;return Gs({x0:e.x+s*r,y0:e.y+n*r,x1:e.x+s*o,y1:e.y+n*o,vx:s,vy:n},t)},point:function(e,t){var i=vr(e,t.origin),s=i.x*e.options.radius,n=i.y*e.options.radius;return Gs({x0:e.x-s,y0:e.y-n,x1:e.x+s,y1:e.y+n,vx:i.x,vy:i.y},t)},bar:function(e,t){var i=vr(e,t.origin),s=e.x,n=e.y,r=0,o=0;return e.horizontal?(s=Math.min(e.x,e.base),r=Math.abs(e.base-e.x)):(n=Math.min(e.y,e.base),o=Math.abs(e.base-e.y)),Gs({x0:s,y0:n+o,x1:s+r,y1:n,vx:i.x,vy:i.y},t)},fallback:function(e,t){var i=vr(e,t.origin);return Gs({x0:e.x,y0:e.y,x1:e.x+(e.width||0),y1:e.y+(e.height||0),vx:i.x,vy:i.y},t)}},re=es.rasterize;function xy(e){var t=e.borderWidth||0,i=e.padding,s=e.size.height,n=e.size.width,r=-n/2,o=-s/2;return{frame:{x:r-i.left-t,y:o-i.top-t,w:n+i.width+t*2,h:s+i.height+t*2},text:{x:r,y:o,w:n,h:s}}}function _y(e,t){var i=t.chart.getDatasetMeta(t.datasetIndex).vScale;if(!i)return null;if(i.xCenter!==void 0&&i.yCenter!==void 0)return{x:i.xCenter,y:i.yCenter};var s=i.getBasePixel();return e.horizontal?{x:s,y:null}:{x:null,y:s}}function wy(e){return e instanceof hi?Xs.arc:e instanceof Ji?Xs.point:e instanceof ts?Xs.bar:Xs.fallback}function ky(e,t,i,s,n,r){var o=Math.PI/2;if(r){var a=Math.min(r,n/2,s/2),l=t+a,c=i+a,h=t+s-a,d=i+n-a;e.moveTo(t,c),l<h&&c<d?(e.arc(l,c,a,-Math.PI,-o),e.arc(h,c,a,-o,0),e.arc(h,d,a,0,o),e.arc(l,d,a,o,Math.PI)):l<h?(e.moveTo(l,i),e.arc(h,c,a,-o,o),e.arc(l,c,a,o,Math.PI+o)):c<d?(e.arc(l,c,a,-Math.PI,0),e.arc(l,d,a,0,Math.PI)):e.arc(l,c,a,-Math.PI,Math.PI),e.closePath(),e.moveTo(t,i)}else e.rect(t,i,s,n)}function Cy(e,t,i){var s=i.backgroundColor,n=i.borderColor,r=i.borderWidth;!s&&(!n||!r)||(e.beginPath(),ky(e,re(t.x)+r/2,re(t.y)+r/2,re(t.w)-r,re(t.h)-r,i.borderRadius),e.closePath(),s&&(e.fillStyle=s,e.fill()),n&&r&&(e.strokeStyle=n,e.lineWidth=r,e.lineJoin="miter",e.stroke()))}function Sy(e,t,i){var s=i.lineHeight,n=e.w,r=e.x,o=e.y+s/2;return t==="center"?r+=n/2:(t==="end"||t==="right")&&(r+=n),{h:s,w:n,x:r,y:o}}function My(e,t,i){var s=e.shadowBlur,n=i.stroked,r=re(i.x),o=re(i.y),a=re(i.w);n&&e.strokeText(t,r,o,a),i.filled&&(s&&n&&(e.shadowBlur=0),e.fillText(t,r,o,a),s&&n&&(e.shadowBlur=s))}function Ay(e,t,i,s){var n=s.textAlign,r=s.color,o=!!r,a=s.font,l=t.length,c=s.textStrokeColor,h=s.textStrokeWidth,d=c&&h,u;if(!(!l||!o&&!d))for(i=Sy(i,n,a),e.font=a.string,e.textAlign=n,e.textBaseline="middle",e.shadowBlur=s.textShadowBlur,e.shadowColor=s.textShadowColor,o&&(e.fillStyle=r),d&&(e.lineJoin="round",e.lineWidth=h,e.strokeStyle=c),u=0,l=t.length;u<l;++u)My(e,t[u],{stroked:d,filled:o,w:i.w,x:i.x,y:i.y+i.h*u})}var pd=function(e,t,i,s){var n=this;n._config=e,n._index=s,n._model=null,n._rects=null,n._ctx=t,n._el=i};Ut(pd.prototype,{_modelize:function(e,t,i,s){var n=this,r=n._index,o=at(q([i.font,{}],s,r)),a=q([i.color,G.color],s,r);return{align:q([i.align,"center"],s,r),anchor:q([i.anchor,"center"],s,r),area:s.chart.chartArea,backgroundColor:q([i.backgroundColor,null],s,r),borderColor:q([i.borderColor,null],s,r),borderRadius:q([i.borderRadius,0],s,r),borderWidth:q([i.borderWidth,0],s,r),clamp:q([i.clamp,!1],s,r),clip:q([i.clip,!1],s,r),color:a,display:e,font:o,lines:t,offset:q([i.offset,4],s,r),opacity:q([i.opacity,1],s,r),origin:_y(n._el,s),padding:dt(q([i.padding,4],s,r)),positioner:wy(n._el),rotation:q([i.rotation,0],s,r)*(Math.PI/180),size:es.textSize(n._ctx,t,o),textAlign:q([i.textAlign,"start"],s,r),textShadowBlur:q([i.textShadowBlur,0],s,r),textShadowColor:q([i.textShadowColor,a],s,r),textStrokeColor:q([i.textStrokeColor,a],s,r),textStrokeWidth:q([i.textStrokeWidth,0],s,r)}},update:function(e){var t=this,i=null,s=null,n=t._index,r=t._config,o,a,l,c=q([r.display,!0],e,n);c&&(o=e.dataset.data[n],a=L(U(r.formatter,[o,e]),o),l=z(a)?[]:es.toTextLines(a),l.length&&(i=t._modelize(c,l,r,e),s=xy(i))),t._model=i,t._rects=s},geometry:function(){return this._rects?this._rects.frame:{}},rotation:function(){return this._model?this._model.rotation:0},visible:function(){return this._model&&this._model.opacity},model:function(){return this._model},draw:function(e,t){var i=this,s=e.ctx,n=i._model,r=i._rects,o;this.visible()&&(s.save(),n.clip&&(o=n.area,s.beginPath(),s.rect(o.left,o.top,o.right-o.left,o.bottom-o.top),s.clip()),s.globalAlpha=es.bound(0,n.opacity,1),s.translate(re(t.x),re(t.y)),s.rotate(n.rotation),Cy(s,r.frame,n),Ay(s,n.lines,r.text,n),s.restore())}});var $y=Number.MIN_SAFE_INTEGER||-9007199254740991,Ey=Number.MAX_SAFE_INTEGER||9007199254740991;function Fi(e,t,i){var s=Math.cos(i),n=Math.sin(i),r=t.x,o=t.y;return{x:r+s*(e.x-r)-n*(e.y-o),y:o+n*(e.x-r)+s*(e.y-o)}}function zl(e,t){var i=Ey,s=$y,n=t.origin,r,o,a,l,c;for(r=0;r<e.length;++r)o=e[r],a=o.x-n.x,l=o.y-n.y,c=t.vx*a+t.vy*l,i=Math.min(i,c),s=Math.max(s,c);return{min:i,max:s}}function Qs(e,t){var i=t.x-e.x,s=t.y-e.y,n=Math.sqrt(i*i+s*s);return{vx:(t.x-e.x)/n,vy:(t.y-e.y)/n,origin:e,ln:n}}var fd=function(){this._rotation=0,this._rect={x:0,y:0,w:0,h:0}};Ut(fd.prototype,{center:function(){var e=this._rect;return{x:e.x+e.w/2,y:e.y+e.h/2}},update:function(e,t,i){this._rotation=i,this._rect={x:t.x+e.x,y:t.y+e.y,w:t.w,h:t.h}},contains:function(e){var t=this,i=1,s=t._rect;return e=Fi(e,t.center(),-t._rotation),!(e.x<s.x-i||e.y<s.y-i||e.x>s.x+s.w+i*2||e.y>s.y+s.h+i*2)},intersects:function(e){var t=this._points(),i=e._points(),s=[Qs(t[0],t[1]),Qs(t[0],t[3])],n,r,o;for(this._rotation!==e._rotation&&s.push(Qs(i[0],i[1]),Qs(i[0],i[3])),n=0;n<s.length;++n)if(r=zl(t,s[n]),o=zl(i,s[n]),r.max<o.min||o.max<r.min)return!1;return!0},_points:function(){var e=this,t=e._rect,i=e._rotation,s=e.center();return[Fi({x:t.x,y:t.y},s,i),Fi({x:t.x+t.w,y:t.y},s,i),Fi({x:t.x+t.w,y:t.y+t.h},s,i),Fi({x:t.x,y:t.y+t.h},s,i)]}});function bd(e,t,i){var s=t.positioner(e,t),n=s.vx,r=s.vy;if(!n&&!r)return{x:s.x,y:s.y};var o=i.w,a=i.h,l=t.rotation,c=Math.abs(o/2*Math.cos(l))+Math.abs(a/2*Math.sin(l)),h=Math.abs(o/2*Math.sin(l))+Math.abs(a/2*Math.cos(l)),d=1/Math.max(Math.abs(n),Math.abs(r));return c*=n*d,h*=r*d,c+=t.offset*n,h+=t.offset*r,{x:s.x+c,y:s.y+h}}function Py(e,t){var i,s,n,r;for(i=e.length-1;i>=0;--i)for(n=e[i].$layout,s=i-1;s>=0&&n._visible;--s)r=e[s].$layout,r._visible&&n._box.intersects(r._box)&&t(n,r);return e}function Dy(e){var t,i,s,n,r,o,a;for(t=0,i=e.length;t<i;++t)s=e[t],n=s.$layout,n._visible&&(a=new Proxy(s._el,{get:(l,c)=>l.getProps([c],!0)[c]}),r=s.geometry(),o=bd(a,s.model(),r),n._box.update(o,r,s.rotation()));return Py(e,function(l,c){var h=l._hidable,d=c._hidable;h&&d||d?c._visible=!1:h&&(l._visible=!1)})}var is={prepare:function(e){var t=[],i,s,n,r,o;for(i=0,n=e.length;i<n;++i)for(s=0,r=e[i].length;s<r;++s)o=e[i][s],t.push(o),o.$layout={_box:new fd,_hidable:!1,_visible:!0,_set:i,_idx:o._index};return t.sort(function(a,l){var c=a.$layout,h=l.$layout;return c._idx===h._idx?h._set-c._set:h._idx-c._idx}),this.update(t),t},update:function(e){var t=!1,i,s,n,r,o;for(i=0,s=e.length;i<s;++i)n=e[i],r=n.model(),o=n.$layout,o._hidable=r&&r.display==="auto",o._visible=n.visible(),t|=o._hidable;t&&Dy(e)},lookup:function(e,t){var i,s;for(i=e.length-1;i>=0;--i)if(s=e[i].$layout,s&&s._visible&&s._box.contains(t))return e[i];return null},draw:function(e,t){var i,s,n,r,o,a;for(i=0,s=t.length;i<s;++i)n=t[i],r=n.$layout,r._visible&&(o=n.geometry(),a=bd(n._el,n.model(),o),r._box.update(a,o,n.rotation()),n.draw(e,a))}},Oy=function(e){if(z(e))return null;var t=e,i,s,n;if(B(e))if(!z(e.label))t=e.label;else if(!z(e.r))t=e.r;else for(t="",i=Object.keys(e),n=0,s=i.length;n<s;++n)t+=(n!==0?", ":"")+i[n]+": "+e[i[n]];return""+t},Ty={align:"center",anchor:"center",backgroundColor:null,borderColor:null,borderRadius:0,borderWidth:0,clamp:!1,clip:!1,color:void 0,display:!0,font:{family:void 0,lineHeight:1.2,size:void 0,style:void 0,weight:null},formatter:Oy,labels:void 0,listeners:{},offset:4,opacity:1,padding:{top:4,right:4,bottom:4,left:4},rotation:0,textAlign:"start",textStrokeColor:void 0,textStrokeWidth:0,textShadowBlur:0,textShadowColor:void 0},vt="$datalabels",md="$default";function Ly(e,t){var i=e.datalabels,s={},n=[],r,o;return i===!1?null:(i===!0&&(i={}),t=Ut({},[t,i]),r=t.labels||{},o=Object.keys(r),delete t.labels,o.length?o.forEach(function(a){r[a]&&n.push(Ut({},[t,r[a],{_key:a}]))}):n.push(t),s=n.reduce(function(a,l){return N(l.listeners||{},function(c,h){a[h]=a[h]||{},a[h][l._key||md]=c}),delete l.listeners,a},{}),{labels:n,listeners:s})}function Ur(e,t,i,s){if(t){var n=i.$context,r=i.$groups,o;t[r._set]&&(o=t[r._set][r._key],o&&U(o,[n,s])===!0&&(e[vt]._dirty=!0,i.update(n)))}}function zy(e,t,i,s,n){var r,o;!i&&!s||(i?s?i!==s&&(o=r=!0):o=!0:r=!0,o&&Ur(e,t.leave,i,n),r&&Ur(e,t.enter,s,n))}function Ry(e,t){var i=e[vt],s=i._listeners,n,r;if(!(!s.enter&&!s.leave)){if(t.type==="mousemove")r=is.lookup(i._labels,t);else if(t.type!=="mouseout")return;n=i._hovered,i._hovered=r,zy(e,s,n,r,t)}}function Iy(e,t){var i=e[vt],s=i._listeners.click,n=s&&is.lookup(i._labels,t);n&&Ur(e,s,n,t)}var By={id:"datalabels",defaults:Ty,beforeInit:function(e){e[vt]={_actives:[]}},beforeUpdate:function(e){var t=e[vt];t._listened=!1,t._listeners={},t._datasets=[],t._labels=[]},afterDatasetUpdate:function(e,t,i){var s=t.index,n=e[vt],r=n._datasets[s]=[],o=e.isDatasetVisible(s),a=e.data.datasets[s],l=Ly(a,i),c=t.meta.data||[],h=e.ctx,d,u,p,b,f,m,g,y;for(h.save(),d=0,p=c.length;d<p;++d)if(g=c[d],g[vt]=[],o&&g&&e.getDataVisibility(d)&&!g.skip)for(u=0,b=l.labels.length;u<b;++u)f=l.labels[u],m=f._key,y=new pd(f,h,g,d),y.$groups={_set:s,_key:m||md},y.$context={active:!1,chart:e,dataIndex:d,dataset:a,datasetIndex:s},y.update(y.$context),g[vt].push(y),r.push(y);h.restore(),Ut(n._listeners,l.listeners,{merger:function(x,_,C){_[x]=_[x]||{},_[x][t.index]=C[x],n._listened=!0}})},afterUpdate:function(e){e[vt]._labels=is.prepare(e[vt]._datasets)},afterDatasetsDraw:function(e){is.draw(e,e[vt]._labels)},beforeEvent:function(e,t){if(e[vt]._listened){var i=t.event;switch(i.type){case"mousemove":case"mouseout":Ry(e,i);break;case"click":Iy(e,i);break}}},afterEvent:function(e){var t=e[vt],i=t._actives,s=t._actives=e.getActiveElements(),n=es.arrayDiff(i,s),r,o,a,l,c,h,d;for(r=0,o=n.length;r<o;++r)if(c=n[r],c[1])for(d=c[0].element[vt]||[],a=0,l=d.length;a<l;++a)h=d[a],h.$context.active=c[1]===1,h.update(h.$context);(t._dirty||n.length)&&(is.update(t._labels),e.render()),delete t._dirty}};const Fy=()=>w`
    <style>
      .chart-skeleton {
        display: flex;
        gap: 1rem;
        height: 100%;
        width: 100%;
      }

      .y-axis {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding-bottom: 2.25rem; /* Space for x-axis labels and gap */
      }

      .y-label {
        height: 1rem;
        border-radius: 0.25rem;
        background-color: var(--bim-ui_bg-contrast-10);
        animation: bar-loading 1s linear infinite alternate;
      }

      .main-chart-area {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .bars-container {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        flex-grow: 1;
        gap: 0.5rem;
        padding: 0 1rem;
        border-left: 2px solid var(--bim-ui_bg-contrast-20);
        border-bottom: 2px solid var(--bim-ui_bg-contrast-20);
        position: relative;
      }

      .grid-lines {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .grid-line {
        width: 100%;
        height: 1px;
        background-color: var(--bim-ui_bg-contrast-10);
        opacity: 0.5;
      }

      .bar {
        flex: 1;
        background-color: var(--bim-ui_bg-contrast-10);
        animation: bar-loading 1s linear infinite alternate;
        z-index: 1; /* To appear above grid lines */
      }

      .x-axis {
        display: flex;
        justify-content: space-around;
        gap: 0.5rem;
        padding: 0 1rem;
        height: 1.25rem;
        margin-top: 1rem;
      }

      .x-label {
        flex: 1;
        height: 100%;
        border-radius: 0.25rem;
        background-color: var(--bim-ui_bg-contrast-10);
        animation: bar-loading 1s linear infinite alternate;
      }

      @keyframes bar-loading {
        0% {
          background-color: var(--bim-ui_bg-contrast-10);
        }
        100% {
          background-color: var(--bim-ui_bg-contrast-20);
        }
      }
    </style>
    <div class="chart-skeleton">
      <div class="y-axis">
        <div class="y-label" style="width: 2.5rem"></div>
        <div class="y-label" style="width: 1.5rem"></div>
        <div class="y-label" style="width: 2rem"></div>
        <div class="y-label" style="width: 1rem"></div>
      </div>
      <div class="main-chart-area">
        <div class="bars-container">
          <div class="grid-lines">
            <div class="grid-line"></div>
            <div class="grid-line"></div>
            <div class="grid-line"></div>
            <div class="grid-line"></div>
            <div class="grid-line"></div>
          </div>
          <div class="bar" style="height: 60%"></div>
          <div class="bar" style="height: 30%"></div>
          <div class="bar" style="height: 80%"></div>
          <div class="bar" style="height: 50%"></div>
          <div class="bar" style="height: 90%"></div>
        </div>
        <div class="x-axis">
          <div class="x-label"></div>
          <div class="x-label"></div>
          <div class="x-label"></div>
          <div class="x-label"></div>
          <div class="x-label"></div>
        </div>
      </div>
    </div>
  `;var Hy=Object.defineProperty,rt=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&Hy(t,i,n),n};ps.register(By);const gd=class extends I{constructor(){super(...arguments),this.colors=Array.from({length:20},(t,i)=>this.generateColor(i)),this.type=null,this.xBeginAtZero=!0,this.yBeginAtZero=!0,this.indexAxis="x",this.loading=!1,this.hoverBorderColor="#ffffffff",this.linePointStyle="circle",this.pointRadius=10,this.lineFill=!1,this.transparentBackground=!0,this.displayLabels=!0,this.dataLabelsColor="#ffffffff",this.smoothLine=!1,this.borderColor="#000000",this.inputData={labels:[],datasets:{}},this.colorfulBars=!1,this._errorLoading=!1,this._options={responsive:!1,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",display:!1},datalabels:{display:this.displayLabels,color:this.dataLabelsColor,font:{weight:"bold",family:"'Plus Jakarta Sans', sans-serif, 'Fira Code'"}},title:{text:this.label,display:!0}},elements:{line:{tension:this.smoothLine?.4:0}}},this._chartCfg={type:this.type,data:{labels:[],datasets:[]},options:this._options},this._canvas=document.createElement("canvas")}generateColor(t){return`hsl(${t*137.5%360}, 70%, 50%)`}async loadData(t=!1){if(this.inputData.labels.length!==0&&!t||!this.loadFunction)return!1;this.loading=!0;try{const i=await this.loadFunction();return this.inputData=i,this.loading=!1,this._errorLoading=!1,this.dispatchEvent(new Event("data-loaded")),!0}catch(i){if(this.loading=!1,this.inputData.labels.length!==0)return!1;const s=this.querySelector("[slot='error-loading']"),n=s?.querySelector("[data-chart-element='error-message']");return i instanceof Error&&n&&i.message.trim()!==""&&(n.textContent=i.message),this._errorLoading=!0,!1}}get data(){return this.chart.data}_getDefaultColors(t){const i=Object.keys(t.datasets).length;return Array.from({length:i},(s,n)=>this.generateColor(n))}isScatterData(t){return"x"in t&&"y"in t}parseInputData(t){const{labels:i}=t,s=this.colors.length<Object.keys(t.datasets).length?this._getDefaultColors(t):this.colors,n=Object.entries(t.datasets).map(([r,o],a)=>{const l=s[a%s.length],c=this.type==="scatter"||this.type==="bubble",h=this.type==="bar";let d;return c||h&&!this.colorfulBars?d=this.transparentBackground?this.transparentize(l):l:d=this.transparentBackground?s.map(u=>this.transparentize(u)):s,{label:r,data:Object.values(o).map(u=>{if(c){if(this.isScatterData(u)){const p={x:u.x,y:u.y};return this.type==="bubble"&&u.r!==void 0&&(p.r=u.r),p}return{x:0,y:0}}return this.isScatterData(u)?0:u.value}),backgroundColor:d,borderColor:c?void 0:this.borderColor,pointStyle:c?void 0:this.linePointStyle,pointRadius:c?void 0:this.pointRadius,fill:c?void 0:this.lineFill,hoverBorderColor:c?void 0:this.hoverBorderColor}});return{labels:i,datasets:n}}transparentize(t,i){const s=i===void 0?.5:1-i;return Pb(t).alpha(s).rgbString()}updateFromTable(t){const i=t.data,s=[],n={},r=[];let o=0;const a=`dataset_${o}`;o++;for(const l of i){const{data:c}=l;let h,d;for(const[u,p]of Object.entries(c))u==="name"&&typeof p=="string"?h=p:typeof p=="number"&&(d=p);h&&d!==void 0&&(s.push(h),r.push({value:d}))}n[a]=r,this.inputData={labels:s,datasets:n}}highlight(t){if(!this.chart)return;const i=[],s=Object.values(this.inputData.datasets);for(const n in s){const r=s[n];for(const o in r){const a=r[o];if(!t(a))continue;const l={datasetIndex:Number(n),index:Number(o)};i.push(l)}}this.chart.setActiveElements(i),this.chart.update()}filterByValue(t){if(!this.chart)return;const i=structuredClone(this.inputData);for(const s of Object.values(i.datasets))for(const n in s)t(s[n])||delete s[n];this.chart.data=this.parseInputData(i),this.chart.update()}triggerFilter(t){this.dispatchEvent(new CustomEvent("labelfilter",{detail:t}))}filterByLabel(t){if(!this.chart||!this.chart.data.labels)return;const i=this.chart.data.labels.indexOf(t);if(i===-1)return;this.chart.toggleDataVisibility(i);const s=this.chart.data.labels.filter((r,o)=>this.chart.getDataVisibility(o)),n=this.chart.data.labels.filter((r,o)=>!this.chart.getDataVisibility(o));this.chart.update(),this.triggerFilter({label:t,visible:s,hidden:n})}reset(){this.chart.data=this.parseInputData(this.inputData),this.chart.update()}updated(t){var i,s;if(this.chart){if(t.has("type")||t.has("indexAxis")||t.has("linePointStyle")||t.has("pointRadius")||t.has("lineFill")){this.chart.destroy();const n=structuredClone(this._options);this.label!==void 0&&(n.plugins||(n.plugins={}),n.plugins.title={text:this.label,display:!0}),this.indexAxis!==void 0&&(n.indexAxis=this.indexAxis),this.chart=new ps(this._canvas,{type:this.type,data:this.parseInputData(this.inputData),options:n})}else for(const n of t.keys())switch(n){case"label":this.chart.options.plugins.title={text:this.label,display:this.label!==void 0};break;case"inputData":this.chart.data=this.parseInputData(this.inputData);break;case"smoothLine":this.chart.options.elements&&this.chart.options.elements.line&&(this.chart.options.elements.line.tension=this.smoothLine?.4:0);break;case"dataLabelsColor":this.chart.options.plugins.datalabels.color=this.dataLabelsColor;break;case"displayLabels":this.chart.options.plugins.datalabels.display=this.displayLabels;break;case"borderColor":this.chart.data.datasets.forEach(r=>{r.borderColor=this.borderColor});break;case"xStacked":this.type==="bar"&&(i=this.chart.options.scales)!=null&&i.x&&Object.assign(this.chart.options.scales.x,{stacked:this.xStacked});break;case"yStacked":this.type==="bar"&&(s=this.chart.options.scales)!=null&&s.y&&Object.assign(this.chart.options.scales.y,{stacked:this.yStacked});break;case"transparentBackground":{const r=this.colors||this._getDefaultColors(this.inputData),o=this.type==="scatter"||this.type==="bubble",a=this.type==="bar";this.chart.data.datasets.forEach((l,c)=>{const h=r[c%r.length];let d;o||a&&!this.colorfulBars?d=this.transparentBackground?this.transparentize(h):h:d=this.transparentBackground?r.map(u=>this.transparentize(u)):r,l.backgroundColor=d});break}case"colors":{const r=this.colors||this._getDefaultColors(this.inputData),o=this.type==="scatter"||this.type==="bubble",a=this.type==="bar";this.chart.data.datasets.forEach((l,c)=>{const h=r[c%r.length];let d;o||a&&!this.colorfulBars?d=this.transparentBackground?this.transparentize(h):h:d=this.transparentBackground?r.map(u=>this.transparentize(u)):r,l.backgroundColor=d});break}}this.chart.update(),this.chart.resize()}}updateChartTitle(){if(this.chart)try{const t=this.chart.options;t&&t.plugins&&t.plugins.title&&(t.plugins.title.text=this.label,this.chart.update())}catch(t){console.warn("Chart: failed to update chart title",t)}}firstUpdated(){this.chart=new ps(this._canvas,this._chartCfg);const t=this.renderRoot.querySelector(".parent");t&&new ResizeObserver(()=>this.chart.resize()).observe(t),this._canvas.onclick=i=>{if(this.inputData.labels.length===0)return;const s=this.chart.getElementsAtEventForMode(i,"point",{intersect:!0},!1);for(const n of s){const{index:r,datasetIndex:o}=n,a=this.inputData.labels[r],l=[];for(const d of Object.values(this.inputData.datasets))l.push(d[r]);const c={datasetIndex:o,index:r,values:l,label:a,value:{value:0}},h=()=>{var d,u;return(u=(d=Object.values(this.inputData.datasets))==null?void 0:d[o])==null?void 0:u[r]};Object.defineProperty(c,"value",{get:()=>h()}),this.dispatchEvent(new CustomEvent("sectionclick",{detail:c}))}}}render(){if(this.loading)return Fy();if(this._errorLoading)return w`<slot name="error-loading"></slot>`;let t;return this.inputData.labels.length===0?(this._canvas.style.display="none",t=w`
        <slot name="missing-data">
          <bim-label>No data to display in this chart.</bim-label>
        </slot>
      `):this._canvas.style.display="block",w`
      <div class="parent">
        ${t} ${this._canvas}
        <slot name="labels"></slot>
      </div>
    `}};gd.styles=H`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 10rem;
      min-height: 10rem;
      padding: 1rem;
      box-sizing: border-box;
      flex: 1;
    }

    .parent {
      position: relative;
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  `;let it=gd;rt([v({type:Array})],it.prototype,"colors");rt([v({type:String,reflect:!0})],it.prototype,"type");rt([v({type:Boolean,reflect:!0,attribute:"x-zero"})],it.prototype,"xBeginAtZero");rt([v({type:Boolean,reflect:!0,attribute:"y-zero"})],it.prototype,"yBeginAtZero");rt([v({type:String,reflect:!0,attribute:"index-axis"})],it.prototype,"indexAxis");rt([v({type:Boolean,reflect:!0,attribute:"x-stacked"})],it.prototype,"xStacked");rt([v({type:Boolean,reflect:!0,attribute:"y-stacked"})],it.prototype,"yStacked");rt([v({type:Boolean,reflect:!0})],it.prototype,"loading");rt([v({type:String,reflect:!1})],it.prototype,"hoverBorderColor");rt([v({type:String,reflect:!0})],it.prototype,"label");rt([v({type:String,reflect:!0,attribute:"point-style"})],it.prototype,"linePointStyle");rt([v({type:Number,reflect:!0})],it.prototype,"pointRadius");rt([v({type:String,reflect:!0})],it.prototype,"lineFill");rt([v({type:Boolean,reflect:!0,attribute:"transparent-background"})],it.prototype,"transparentBackground");rt([v({type:Boolean,reflect:!0})],it.prototype,"displayLabels");rt([v({type:String,reflect:!0,attribute:"data-label-color"})],it.prototype,"dataLabelsColor");rt([v({type:Boolean,reflect:!0})],it.prototype,"smoothLine");rt([v({type:String,reflect:!0})],it.prototype,"borderColor");rt([v({type:Object,attribute:!1})],it.prototype,"inputData");rt([v({type:Boolean,reflect:!0})],it.prototype,"colorfulBars");rt([Z()],it.prototype,"_errorLoading");var jy=Object.defineProperty,Vy=Object.getOwnPropertyDescriptor,So=(e,t,i,s)=>{for(var n=s>1?void 0:s?Vy(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&jy(t,i,n),n};const Ny=["top","top-start","top-end","right","right-start","right-end","bottom","bottom-start","bottom-end","left","left-start","left-end"];var ht;const Kn=(ht=class extends I{constructor(){super(...arguments),this.visible=!1,this._previousContainer=null,this._hostParent=null,this._suppressed=!1,this._suppress=()=>{this._suppressed=!0,this._cancelAndHide()},this._unsuppress=()=>{this._suppressed=!1},this._scheduleShow=()=>{this._suppressed||(clearTimeout(this.timeoutId),this.timeoutId=setTimeout(()=>{this.visible=!0},this.timeout??800))},this._cancelAndHide=()=>{clearTimeout(this.timeoutId),this.visible=!1},this._onEscape=e=>{e.key==="Escape"&&(this.visible=!1)}}static get container(){return ht._container||(ht._container=document.createElement("div"),ht._container.style.cssText=`
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        overflow: visible;
        pointer-events: none;
        z-index: var(--bim-tooltip--z, 9999);
      `),ht._container}set timeout(e){this._timeout=e===void 0||!Number.isFinite(e)?void 0:Math.max(0,e)}get timeout(){return this._timeout}set placement(e){if(e!==void 0&&!Ny.includes(e)){console.warn(`[bim-tooltip] Invalid placement "${e}". Ignored.`),this._placement=void 0;return}this._placement=e}get placement(){return this._placement}async _show(){if(!ht.container.isConnected){const e=document.querySelector("[data-context-dialog]");e?e.append(ht.container):document.body.append(ht.container)}this._previousContainer=this._hostParent,ht.container.style.top=`${window.scrollY||document.documentElement.scrollTop}px`,ht.container.append(this),this._escapeListener||(this._escapeListener=this._onEscape,document.addEventListener("keydown",this._escapeListener));try{await this._updatePosition()}catch(e){console.error("[bim-tooltip] Failed to position tooltip.",e)}}_hide(){this._escapeListener&&(document.removeEventListener("keydown",this._escapeListener),this._escapeListener=void 0),this._previousContainer&&(this._previousContainer.append(this),this._previousContainer=null),ht.container.children.length===0&&ht.container.parentElement&&(ht.container.remove(),ht._container=null)}async _updatePosition(){const e=this._previousContainer;if(!e)return;this.style.display="block",this.style.visibility="hidden",this.offsetHeight;const t=getComputedStyle(e).display,i=[_c(10),Tc(),Oc({padding:8})];t.startsWith("inline")&&i.push(Lc());const{x:s,y:n}=await zc(e,this,{placement:this.placement,middleware:i});this.style.left=`${s}px`,this.style.top=`${n}px`,this.style.removeProperty("display"),this.style.removeProperty("visibility")}updated(e){e.has("visible")&&(this.hidden=!this.visible,this.visible?this._show():this._hide())}connectedCallback(){if(super.connectedCallback(),this._hostParent)return;const e=this.parentElement;e&&(this._hostParent=e,this.id||(this.id=`bim-tooltip-${xs.newRandomId()}`),this._hostParent.setAttribute("aria-describedby",this.id),this._hostParent.addEventListener("mouseenter",this._scheduleShow),this._hostParent.addEventListener("mouseleave",this._cancelAndHide),this._hostParent.addEventListener("focus",this._scheduleShow),this._hostParent.addEventListener("blur",this._cancelAndHide),this._hostParent.addEventListener("bim-tooltip-suppress",this._suppress),this._hostParent.addEventListener("bim-tooltip-unsuppress",this._unsuppress))}disconnectedCallback(){super.disconnectedCallback(),queueMicrotask(()=>{this.isConnected||(clearTimeout(this.timeoutId),this._escapeListener&&(document.removeEventListener("keydown",this._escapeListener),this._escapeListener=void 0),this._hostParent&&(this._hostParent.removeEventListener("mouseenter",this._scheduleShow),this._hostParent.removeEventListener("mouseleave",this._cancelAndHide),this._hostParent.removeEventListener("focus",this._scheduleShow),this._hostParent.removeEventListener("blur",this._cancelAndHide),this._hostParent.removeEventListener("bim-tooltip-suppress",this._suppress),this._hostParent.removeEventListener("bim-tooltip-unsuppress",this._unsuppress),this._hostParent.removeAttribute("aria-describedby"),this._hostParent=null))})}render(){return w`<bim-label role="tooltip" aria-live="polite"><slot></slot></bim-label>`}},ht.styles=H`
    :host {
      position: absolute;
      background: var(--bim-ui_bg-contrast-10);
      border-radius: 4px;
      box-shadow: var(--bim-tooltip--shadow, 0 0 10px 3px rgba(0, 0, 0, 0.2));
      padding: var(--bim-tooltip--p, 0.75rem);
      max-width: var(--bim-tooltip--maxw, 20rem);
      font-size: var(--bim-tooltip--fs, var(--bim-ui_size-xs, 0.875rem));
      display: none;
    }
    :host([visible]) {
      display: flex;
    }
  `,ht._container=null,ht);So([v({type:Boolean,reflect:!0})],Kn.prototype,"visible",2);So([v({type:Number,reflect:!0})],Kn.prototype,"timeout",1);So([v({type:String,reflect:!0})],Kn.prototype,"placement",1);let Wy=Kn;var Uy=Object.defineProperty,qy=Object.getOwnPropertyDescriptor,lt=(e,t,i,s)=>{for(var n=s>1?void 0:s?qy(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&Uy(t,i,n),n};const vd=class extends I{constructor(){super(...arguments),this.min=0,this.max=100,this.step=1,this.shiftStep=10,this.marks=[],this.showMarks=!1,this._value=0,this.valueLabelDisplay="auto",this.disableSwap=!1,this.disabled=!1,this.vertical=!1,this.markLabelOrientation="horizontal",this._activeThumb=-1,this.onValueChange=new Event("change"),this._effectiveMarks=[],this._keydownHandlers=[]}set value(t){if(Array.isArray(t)){const i=[this._clamp(t[0]),this._clamp(t[1])];this._value=this.disableSwap?i:i.sort((s,n)=>s-n)}else this._value=this._clamp(t)}get value(){return this._value}_clamp(t){return Math.min(Math.max(t,this.min),this.max)}_valueToPercent(t){return(t-this.min)*100/(this.max-this.min)}_percentToValue(t){return(this.max-this.min)*t+this.min}_roundToStep(t,i){const s=Math.round((t-this.min)/i)*i+this.min,n=(i.toString().split(".")[1]??"").length;return Number(s.toFixed(n))}_findClosest(t,i){return t.length===0?-1:t.reduce((s,n,r)=>Math.abs(n-i)<Math.abs(t[s]-i)?r:s,0)}_getSnappedValue(t){let i=this._percentToValue(t);if(this.step!==null)i=this._roundToStep(i,this.step);else if(this.marks.length>0){const s=this.marks.map(n=>n.value);i=s[this._findClosest(s,i)]}return this._clamp(i)}_formatValue(t){const i=this.scale?this.scale(t):t;return typeof this.valueLabelFormat=="function"?this.valueLabelFormat(i):String(i)}_getFormattedValues(t){var i;const s=`${t.join(",")}|${this.scale}|${this.valueLabelFormat}`;if(((i=this._formatCache)==null?void 0:i.key)===s)return this._formatCache.values;const n=t.map(r=>this._formatValue(r));return this._formatCache={key:s,values:n},n}_getValueLabelMinWidth(t){const i=this._formatValue(this.min),s=this._formatValue(this.max);return`${(t?`${i} – ${s}`:i.length>=s.length?i:s).length+.5}ch`}_getKeydownHandler(t){var i;return(i=this._keydownHandlers)[t]??(i[t]=s=>this._onKeyDown(s,t))}_getFraction(t,i){const s=this._trackWrapper;if(!s)return 0;const n=s.getBoundingClientRect();return this.vertical?1-(i-n.top)/n.height:(t-n.left)/n.width}_onPointerDown(t){if(this.disabled||t instanceof MouseEvent&&t.button!==0)return;const{clientX:i,clientY:s}=t instanceof TouchEvent?t.changedTouches[0]:t,n=this._getFraction(i,s),r=this._getSnappedValue(n);let o=0;if(Array.isArray(this._value)){const c=this._value.map(h=>Math.abs(h-r));o=c[0]<=c[1]?0:1}this._activeThumb=o,this._focusInput(o),o=this._updateValue(r,o),this._activeThumb=o;const a=c=>{const{clientX:h,clientY:d}=c instanceof TouchEvent?c.changedTouches[0]:c,u=this._getFraction(h,d),p=this._getSnappedValue(u);o=this._updateValue(p,o),this._activeThumb=o},l=()=>{this._activeThumb=-1,this._dispatchChangeCommitted(),document.removeEventListener("mousemove",a),document.removeEventListener("mouseup",l),document.removeEventListener("touchmove",a),document.removeEventListener("touchend",l)};document.addEventListener("mousemove",a,{passive:!0}),document.addEventListener("mouseup",l),document.addEventListener("touchmove",a,{passive:!0}),document.addEventListener("touchend",l)}_focusInput(t){var i,s;const n=(i=this.shadowRoot)==null?void 0:i.querySelectorAll('input[type="range"]');(s=n?.[t])==null||s.focus({preventScroll:!0})}_dispatchChange(){this.dispatchEvent(new CustomEvent("change",{detail:{value:this._value},bubbles:!0,composed:!0}))}_dispatchChangeCommitted(){this.dispatchEvent(new CustomEvent("changecommitted",{detail:{value:this._value},bubbles:!0,composed:!0}))}_updateValue(t,i){let s=i;if(Array.isArray(this._value)){const n=[...this._value];n[i]=t,!this.disableSwap&&n[0]>n[1]&&(n.sort((r,o)=>r-o),s=i===0?1:0),this._value=n}else this._value=t;return this._dispatchChange(),s}_onKeyDown(t,i){if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","PageUp","PageDown","Home","End"].includes(t.key))return;t.preventDefault();const s=Array.isArray(this._value)?this._value[i]:this._value,n=this.step??1,r=this.shiftStep,o=t.shiftKey;let a=null;const l=this.marks.map(c=>c.value);if(this.step!==null){const c=o?r:n;switch(t.key){case"ArrowRight":case"ArrowUp":a=this._clamp(s+c);break;case"ArrowLeft":case"ArrowDown":a=this._clamp(s-c);break;case"PageUp":a=this._clamp(s+r);break;case"PageDown":a=this._clamp(s-r);break;case"Home":a=this.min;break;case"End":a=this.max;break}}else if(l.length>0){const c=this._findClosest(l,s);switch(t.key){case"ArrowRight":case"ArrowUp":a=l[Math.min(c+1,l.length-1)];break;case"ArrowLeft":case"ArrowDown":a=l[Math.max(c-1,0)];break;case"Home":a=l[0];break;case"End":a=l[l.length-1];break}}else{const c=o?r:1;switch(t.key){case"ArrowRight":case"ArrowUp":a=this._clamp(s+c);break;case"ArrowLeft":case"ArrowDown":a=this._clamp(s-c);break;case"Home":a=this.min;break;case"End":a=this.max;break}}a!==null&&(this._updateValue(a,i),this._dispatchChangeCommitted())}willUpdate(t){(t.has("min")||t.has("max"))&&(this.min>=this.max&&console.error(`[bim-slider] min (${this.min}) must be less than max (${this.max}).`),this._value=Array.isArray(this._value)?[this._clamp(this._value[0]),this._clamp(this._value[1])].sort((i,s)=>i-s):this._clamp(this._value)),t.has("step")&&this.step!==null&&this.step<=0&&console.error(`[bim-slider] step (${this.step}) must be greater than 0.`),(t.has("step")||t.has("marks"))&&this.step===null&&this.marks.length===0&&console.warn("[bim-slider] step is null and marks is empty — the slider has no snap points. Set step or provide marks."),(t.has("showMarks")||t.has("step")||t.has("min")||t.has("max")||t.has("marks"))&&(this._effectiveMarks=this.showMarks&&this.step!==null?Array.from({length:Math.floor((this.max-this.min)/this.step)+1},(i,s)=>({value:this.min+this.step*s})):this.marks)}updated(){this.setAttribute("aria-disabled",String(this.disabled)),Array.isArray(this._value)?(this.setAttribute("role","group"),this.label&&this.setAttribute("aria-label",this.label)):this.removeAttribute("role")}render(){const t=Array.isArray(this._value),i=t?this._value:[this._value],s=this._getFormattedValues(i),n=t?this._valueToPercent(i[0]):0,r=this._valueToPercent(i[i.length-1]),o=this.vertical?{bottom:`${n}%`,height:`${r-n}%`}:{left:`${n}%`,width:`${r-n}%`};return w`
      ${St(this.label||this.icon,()=>w`
          <bim-label .icon=${this.icon}>${this.label}</bim-label>
        `)}

      <div class="track-row">
        <div
          class="track-wrapper"
          @mousedown=${this._onPointerDown}
          @touchstart=${this._onPointerDown}
        >
          <div class="rail"></div>
          <div class="track" style=${Zt(o)}></div>

          ${this._effectiveMarks.map(a=>{const l=this._valueToPercent(a.value),c=t?a.value>=i[0]&&a.value<=i[1]:a.value<=i[0];return w`
              <div
                class="mark"
                ?data-active=${c}
                style=${Zt(this.vertical?{bottom:`${l}%`}:{left:`${l}%`})}
              ></div>
              ${St(a.label,()=>w`
                  <span
                    class="mark-label"
                    style=${Zt(this.vertical?{bottom:`${l}%`}:{left:`${l}%`})}
                  >
                    ${a.label}
                  </span>
                `)}
            `})}
          ${i.map((a,l)=>{const c=this._valueToPercent(a),h=this._activeThumb===l,d=this.label??(t?l===0?"Lower bound":"Upper bound":"Slider");return w`
              <div
                class="thumb"
                ?data-active=${h}
                style=${Zt(this.vertical?{bottom:`${c}%`,left:"50%"}:{left:`${c}%`,top:"50%"})}
              >
                ${St(this.valueLabelDisplay!=="off",()=>w`
                    <div class="value-label">${s[l]}</div>
                  `)}
                <input
                  type="range"
                  .min=${String(this.min)}
                  .max=${String(this.max)}
                  .step=${this.step!==null?String(this.step):"any"}
                  .value=${String(a)}
                  aria-label=${d}
                  aria-valuemin=${this.min}
                  aria-valuemax=${this.max}
                  aria-valuenow=${a}
                  data-index=${l}
                  ?disabled=${this.disabled}
                  @keydown=${this._getKeydownHandler(l)}
                />
              </div>
            `})}
        </div>

        ${St(!this.vertical&&this.valueLabelDisplay!=="off",()=>w`
            <bim-label
              class="value"
              style=${Zt({minWidth:this._getValueLabelMinWidth(t)})}
            >
              ${t?`${s[0]} – ${s[1]}`:s[0]}
            </bim-label>
          `)}
      </div>
    `}};vd.styles=H`
    :host {
      display: block;
      user-select: none;
    }

    /* ── Track row (track + side value) ──────────────────────── */
    .track-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    /* ── Track wrapper ────────────────────────────────────────── */
    .track-wrapper {
      flex: 1;
      position: relative;
      height: var(--bim-slider_track--h, 0.25rem);
      margin: 0.75rem var(--bim-slider--mx, 0.5rem);
      display: flex;
      align-items: center;
    }


    /* ── Rail ─────────────────────────────────────────────────── */
    .rail {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: var(--bim-slider_rail--bdrs, var(--bim-ui_size-4xs));
      background-color: var(
        --bim-slider_rail--bgc,
        var(--bim-ui_bg-contrast-20)
      );
    }

    /* ── Track (filled portion) ───────────────────────────────── */
    .track {
      position: absolute;
      height: 100%;
      border-radius: var(--bim-slider_track--bdrs, var(--bim-ui_size-4xs));
      background-color: var(--bim-slider_track--bgc, var(--bim-ui_main-base));
      pointer-events: none;
    }

    /* ── Thumb ────────────────────────────────────────────────── */
    .thumb {
      position: absolute;
      width: var(--bim-slider_thumb--sz, 0.875rem);
      height: var(--bim-slider_thumb--sz, 0.875rem);
      border-radius: 50%;
      background-color: var(--bim-slider_thumb--bgc, var(--bim-ui_main-base));
      transform: translate(-50%, -50%);
      top: 50%;
      cursor: pointer;
      transition: box-shadow var(--bim-slider_thumb--transition-duration, 0.15s);
      z-index: var(--bim-slider_thumb--z, 2);
    }

    .thumb:hover,
    .thumb[data-active] {
      box-shadow: 0 0 0 0.5rem
        var(
          --bim-slider_thumb-focus--shadow,
          color-mix(in srgb, var(--bim-ui_main-base) 20%, transparent)
        );
    }

    /* ── Hidden native input (a11y + keyboard) ────────────────── */
    /* Sized/positioned to exactly cover its own thumb (not the whole track),
       so a focus-visible ring here reads as "this thumb is focused" rather
       than drawing around the entire slider. Kept pointer-events: none —
       the drag interaction is driven by .track-wrapper's own mousedown
       handler; removing it would let the native input's own click/drag
       behavior compete with that. Click-to-focus is instead done explicitly
       in _onPointerDown (inputEl.focus()), so keyboard users still get a
       correct, visible focus target without touching the hit-testing at all. */
    .thumb input[type="range"] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      pointer-events: none;
      margin: 0;
    }

    .thumb input[type="range"]:focus-visible {
      outline: 2px solid var(--bim-ui_main-base);
      outline-offset: 2px;
      border-radius: 50%;
    }

    /* ── Side value label (next to the track) ────────────────── */
    .track-row bim-label.value {
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }

    /* ── Value label (tooltip) ────────────────────────────────── */
    .value-label {
      position: absolute;
      bottom: calc(100% + 0.5rem);
      left: 50%;
      transform: translateX(-50%);
      background-color: var(
        --bim-slider_value-label--bgc,
        var(--bim-ui_bg-contrast-10)
      );
      color: var(--bim-slider_value-label--c, var(--bim-ui_bg-contrast-80));
      box-shadow: var(
        --bim-slider_value-label--shadow,
        0 0 10px 3px rgba(0, 0, 0, 0.2)
      );
      font-size: var(--bim-slider_value-label--fz, var(--bim-ui_size-sm));
      padding: var(--bim-slider_value-label--p, 0.125rem 0.375rem);
      border-radius: var(--bim-slider_value-label--bdrs, 4px);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--bim-slider_value-label--transition-duration, 0.15s);
    }

    .thumb:hover .value-label,
    .thumb[data-active] .value-label {
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .thumb,
      .value-label {
        transition: none;
      }
    }

    /* ── Marks ────────────────────────────────────────────────── */
    .mark {
      position: absolute;
      width: var(--bim-slider_mark--sz, 0.25rem);
      height: var(--bim-slider_mark--sz, 0.25rem);
      border-radius: 50%;
      background-color: var(
        --bim-slider_mark--bgc,
        var(--bim-ui_bg-contrast-40)
      );
      transform: translateX(-50%);
      pointer-events: none;
      z-index: var(--bim-slider_mark--z, 1);
    }

    .mark[data-active] {
      background-color: var(
        --bim-slider_mark-active--bgc,
        var(--bim-ui_bg-base)
      );
    }

    .mark-label {
      position: absolute;
      top: calc(100% + 0.375rem);
      transform: var(--bim-slider_mark-label--transform, translateX(-50%));
      font-size: var(--bim-slider_mark-label--fz, var(--bim-ui_size-xs));
      color: var(--bim-slider_mark-label--c, var(--bim-ui_bg-contrast-60));
      white-space: nowrap;
      pointer-events: none;
      transform-origin: top left;
    }

    /* ── Mark label orientations ───────────────────────────────── */
    :host([mark-label-orientation="vertical"]) .mark-label {
      transform: var(--bim-slider_mark-label--transform, translateX(-50%) rotate(90deg));
      transform-origin: top left;
    }

    :host([mark-label-orientation="diagonal"]) .mark-label {
      transform: var(--bim-slider_mark-label--transform, translateX(-100%) rotate(-45deg));
      transform-origin: top right;
    }

    /* ── Disabled state ───────────────────────────────────────── */
    :host([disabled]) {
      opacity: 0.4;
      pointer-events: none;
    }

    /* ── Vertical orientation ─────────────────────────────────── */
    :host([vertical]) .track-wrapper {
      width: var(--bim-slider_track--w, var(--bim-slider_track--h, 0.25rem));
      height: 100%;
      flex-direction: column;
      margin: var(--bim-slider--mx, 0.5rem) 0.75rem;
    }
  `;let ot=vd;lt([v({type:String,reflect:!0})],ot.prototype,"name",2);lt([v({type:String,reflect:!0})],ot.prototype,"label",2);lt([v({type:String,reflect:!0})],ot.prototype,"icon",2);lt([v({type:Number,reflect:!0})],ot.prototype,"min",2);lt([v({type:Number,reflect:!0})],ot.prototype,"max",2);lt([v({reflect:!0,converter:{fromAttribute:e=>{if(e===null)return 1;if(e.toLowerCase()==="none")return null;const t=Number(e);return Number.isFinite(t)?t:1},toAttribute:e=>e===null?"none":String(e)}})],ot.prototype,"step",2);lt([v({type:Number,attribute:"shift-step",reflect:!0})],ot.prototype,"shiftStep",2);lt([v({type:Array})],ot.prototype,"marks",2);lt([v({type:Boolean,attribute:"show-marks",reflect:!0})],ot.prototype,"showMarks",2);lt([Z()],ot.prototype,"_value",2);lt([v({attribute:!1})],ot.prototype,"value",1);lt([v({type:String,attribute:"value-label-display",reflect:!0})],ot.prototype,"valueLabelDisplay",2);lt([v({attribute:!1})],ot.prototype,"valueLabelFormat",2);lt([v({attribute:!1})],ot.prototype,"scale",2);lt([v({type:Boolean,attribute:"disable-swap",reflect:!0})],ot.prototype,"disableSwap",2);lt([v({type:Boolean,reflect:!0})],ot.prototype,"disabled",2);lt([v({type:Boolean,reflect:!0})],ot.prototype,"vertical",2);lt([v({type:String,attribute:"mark-label-orientation",reflect:!0})],ot.prototype,"markLabelOrientation",2);lt([Z()],ot.prototype,"_activeThumb",2);lt([Vl(".track-wrapper")],ot.prototype,"_trackWrapper",2);var Yy=Object.defineProperty,Dt=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&Yy(t,i,n),n};const Rl={A0:{width:841,height:1189},A1:{width:594,height:841},A2:{width:420,height:594},A3:{width:297,height:420},A4:{width:210,height:297}},yd=class extends I{constructor(){super(...arguments),this.label="",this.sheetNumber="",this.size="A4",this.orientation="portrait",this.margin=10,this.debug=!1,this.ruler=!1,this.rulerLength=100,this._pxPerMm=3.7795275591,this._rulerPosition={x:20,y:20},this._rulerDragging=!1,this._rulerOrientation="horizontal",this._mediaQueryList=null,this._mediaQueryListener=null,this._rulerDragStart={x:0,y:0},this.handleRulerMouseMove=t=>{this._rulerDragging&&(this._rulerPosition={x:t.clientX-this._rulerDragStart.x,y:t.clientY-this._rulerDragStart.y},this.requestUpdate())},this.handleRulerMouseUp=()=>{this._rulerDragging=!1,this.removeRulerDragListeners()}}get widthMm(){const t=Rl[this.size];return this.orientation==="portrait"?t.width:t.height}get heightMm(){const t=Rl[this.size];return this.orientation==="portrait"?t.height:t.width}get pxPerMm(){return this._pxPerMm}get drawingAreaEl(){return this.shadowRoot.querySelector(".printable-area")}get drawingSlotEl(){var t;return((t=this.shadowRoot)==null?void 0:t.querySelector(".drawing-slot"))??null}mmToPx(t){return t*this._pxPerMm}mm(t){return`${this.mmToPx(t)}px`}calibrate(){var t;const i=(t=this.shadowRoot)==null?void 0:t.querySelector(".calibration-ruler");if(!i)return;i.offsetHeight;const s=i.getBoundingClientRect().width;s>0&&(this._pxPerMm=s/100)}setupDPRListener(){const t=window.devicePixelRatio||1;this._mediaQueryList=window.matchMedia(`(resolution: ${t}dppx)`),this._mediaQueryListener=()=>{this.calibrate(),this.requestUpdate(),this._mediaQueryList&&this._mediaQueryListener&&this._mediaQueryList.removeEventListener("change",this._mediaQueryListener),this.setupDPRListener()},this._mediaQueryList.addEventListener("change",this._mediaQueryListener)}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this.calibrate(),this.setupDPRListener()})}disconnectedCallback(){super.disconnectedCallback(),this._mediaQueryList&&this._mediaQueryListener&&this._mediaQueryList.removeEventListener("change",this._mediaQueryListener),this._mediaQueryList=null,this._mediaQueryListener=null,this.removeRulerDragListeners()}handleRulerMouseDown(t){t.preventDefault(),this._rulerDragging=!0,this._rulerDragStart={x:t.clientX-this._rulerPosition.x,y:t.clientY-this._rulerPosition.y},document.addEventListener("mousemove",this.handleRulerMouseMove),document.addEventListener("mouseup",this.handleRulerMouseUp)}removeRulerDragListeners(){document.removeEventListener("mousemove",this.handleRulerMouseMove),document.removeEventListener("mouseup",this.handleRulerMouseUp)}toggleRulerOrientation(t){t.stopPropagation(),this._rulerOrientation=this._rulerOrientation==="horizontal"?"vertical":"horizontal"}renderRulerGizmo(){if(!this.ruler)return null;const t=this.mmToPx(this.rulerLength),i=Math.floor(this.rulerLength/10),s=this._rulerOrientation==="horizontal";return w`
      <div
        class="ruler-gizmo ${this._rulerOrientation}"
        style="left: ${this._rulerPosition.x}px; top: ${this._rulerPosition.y}px;"
        @mousedown=${this.handleRulerMouseDown}
      >
        <div class="ruler-label">${this.rulerLength}mm</div>
        <button
          class="ruler-rotate-btn"
          @click=${this.toggleRulerOrientation}
          title="Toggle horizontal/vertical"
        >
          ${s?"⇅":"⇄"}
        </button>
        <div
          class="ruler-line ${this._rulerOrientation}"
          style="${s?`width: ${t}px`:`height: ${t}px`};"
        >
          ${Array.from({length:i+1},(n,r)=>{const o=r/i*100,a=r%1===0,l=r*10/10;return w`
              <div
                class="ruler-tick ${this._rulerOrientation} ${a?"cm-marker":""}"
                style="${s?`left: ${o}%`:`top: ${o}%`};"
              >
                ${a?w`<div class="ruler-cm-label ${this._rulerOrientation}">
                      ${l}
                    </div>`:null}
              </div>
            `})}
        </div>
      </div>
    `}render(){const t=this.mmToPx(this.widthMm),i=this.mmToPx(this.heightMm);return this.style.width=`${t}px`,this.style.height=`${i}px`,this.style.padding=this.mm(this.margin),w`
      <!-- Calibration ruler: hidden element used to measure mm→px -->
      <div class="calibration-ruler"></div>

      <!-- Ruler gizmo for scale validation -->
      ${this.renderRulerGizmo()}

      <!-- Printable area -->
      <div class="printable-area ${this.debug?"debug":""}">
        <!-- Title block template or drawing area slot -->
        ${this.titleBlockTemplate?this.titleBlockTemplate(this.mm.bind(this),w`<div class="drawing-slot"><slot></slot></div>`,{label:this.label,sheetNumber:this.sheetNumber}):w`<div class="drawing-slot"><slot></slot></div>`}
      </div>
    `}};yd.styles=H`
    :host {
      display: inline-block;
      position: relative;
      overflow: visible;
      background: white;
      box-sizing: border-box;
    }

    .printable-area {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    .drawing-slot {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }

    .printable-area.debug {
      border: 1px dashed #999;
    }

    .calibration-ruler {
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 100mm;
      height: 100mm;
      visibility: hidden;
      pointer-events: none;
    }

    .ruler-gizmo {
      position: absolute;
      background: rgba(255, 255, 0, 0.15);
      border: 1px solid #ff9800;
      cursor: move;
      user-select: none;
      z-index: 1000;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .ruler-gizmo.vertical {
      flex-direction: column;
    }

    .ruler-gizmo:active {
      background: rgba(255, 255, 0, 0.3);
      cursor: grabbing;
    }

    .ruler-line {
      position: relative;
      background: #ff9800;
      border-radius: 2px;
    }

    .ruler-line.horizontal {
      height: 3px;
    }

    .ruler-line.vertical {
      width: 3px;
    }

    .ruler-tick {
      position: absolute;
      background: #ff9800;
    }

    .ruler-tick.horizontal {
      width: 1px;
      height: 8px;
      top: -2.5px;
    }

    .ruler-tick.vertical {
      width: 8px;
      height: 1px;
      left: -2.5px;
    }

    .ruler-tick.cm-marker.horizontal {
      height: 12px;
      top: -4.5px;
      width: 2px;
    }

    .ruler-tick.cm-marker.vertical {
      width: 12px;
      left: -4.5px;
      height: 2px;
    }

    .ruler-cm-label {
      position: absolute;
      color: #ff9800;
      font-weight: bold;
      font-size: 9px;
    }

    .ruler-cm-label.horizontal {
      top: -18px;
      transform: translateX(-50%);
    }

    .ruler-cm-label.vertical {
      left: -22px;
      transform: translateY(-50%);
    }

    .ruler-label {
      color: #ff9800;
      font-weight: bold;
      white-space: nowrap;
    }

    .ruler-rotate-btn {
      background: #ff9800;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 4px 6px;
      cursor: pointer;
      font-size: 10px;
      font-weight: bold;
      line-height: 1;
    }

    .ruler-rotate-btn:hover {
      background: #f57c00;
    }

    .ruler-rotate-btn:active {
      background: #ef6c00;
    }
  `;let wt=yd;Dt([v({type:String})],wt.prototype,"label");Dt([v({type:String})],wt.prototype,"sheetNumber");Dt([v({type:String})],wt.prototype,"size");Dt([v({type:String})],wt.prototype,"orientation");Dt([v({type:Number})],wt.prototype,"margin");Dt([v({type:Boolean})],wt.prototype,"debug");Dt([v({type:Boolean,attribute:"ruler"})],wt.prototype,"ruler");Dt([v({type:Number,attribute:"ruler-length"})],wt.prototype,"rulerLength");Dt([v({attribute:!1})],wt.prototype,"titleBlockTemplate");Dt([Z()],wt.prototype,"_pxPerMm");Dt([Z()],wt.prototype,"_rulerPosition");Dt([Z()],wt.prototype,"_rulerDragging");Dt([Z()],wt.prototype,"_rulerOrientation");var Ky=Object.defineProperty,Ci=(e,t,i,s)=>{for(var n=void 0,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=o(t,i,n)||n);return n&&Ky(t,i,n),n};const xd=class extends I{constructor(){super(...arguments),this.confirmLabel="Confirm",this.cancelLabel="Cancel",this.open=!1,this.loading=!1,this._dialog=ae()}updated(t){if(super.updated(t),!t.has("open"))return;const i=this._dialog.value;i&&(this.open?i.open||i.showModal():i.open&&i.close())}_confirm(){this.dispatchEvent(new Event("confirm",{bubbles:!0,composed:!0}))}_cancel(){this.open=!1,this.dispatchEvent(new Event("cancel",{bubbles:!0,composed:!0}))}_onDialogCancel(t){t.preventDefault(),!this.loading&&this._cancel()}_onDialogClose(){var t;this.loading&&((t=this._dialog.value)==null||t.showModal())}render(){return w`
      <dialog
        ${At(this._dialog)}
        @cancel=${this._onDialogCancel}
        @close=${this._onDialogClose}
      >
        ${this.label||this.icon?w`
          <div class="header">
            <bim-label .icon=${this.icon}>${this.label??""}</bim-label>
          </div>
        `:T}
        <div class="content">
          <slot></slot>
        </div>
        <div class="footer">
          <bim-button
            label=${this.cancelLabel}
            ?disabled=${this.loading}
            @click=${this._cancel}>
          </bim-button>
          <bim-button
            label=${this.confirmLabel}
            .loading=${this.loading}
            ?disabled=${this.loading}
            style="background-color: var(--bim-ui_main-base);"
            @click=${this._confirm}>
          </bim-button>
        </div>
      </dialog>
    `}};xd.styles=H`
    :host {
      display: contents;
    }

    dialog {
      padding: 0;
      border: none;
      border-radius: 0.75rem;
      background-color: var(--bim-modal--bg, var(--bim-ui_bg-contrast-10));
      color: var(--bim-modal--c, var(--bim-ui_bg-contrast-80));
      min-width: 20rem;
      max-width: min(90vw, 36rem);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    dialog::backdrop {
      background-color: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(2px);
    }

    .header {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      border-bottom: 1px solid var(--bim-ui_bg-contrast-20);
      box-sizing: border-box;
      height: 35px;
    }

    .header bim-label {
      flex: 1;
      font-weight: 600;
      font-size: 13px;
    }

    .content {
      padding: 1rem;
      max-height: 60vh;
      overflow-y: auto;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
    }
  `;let si=xd;Ci([v({type:String,reflect:!0})],si.prototype,"label");Ci([v({type:String,reflect:!0})],si.prototype,"icon");Ci([v({type:String,attribute:"confirm-label"})],si.prototype,"confirmLabel");Ci([v({type:String,attribute:"cancel-label"})],si.prototype,"cancelLabel");Ci([v({type:Boolean,reflect:!0})],si.prototype,"open");Ci([v({type:Boolean,reflect:!0})],si.prototype,"loading");var Gy=Object.defineProperty,Xy=Object.getOwnPropertyDescriptor,Si=(e,t,i,s)=>{for(var n=s>1?void 0:s?Xy(t,i):t,r=e.length-1,o;r>=0;r--)(o=e[r])&&(n=(s?o(t,i,n):o(n))||n);return s&&n&&Gy(t,i,n),n};const _d=class extends I{constructor(){super(...arguments),this.sortOnly=!1,this._items=[],this._activeIds=[],this._availableIds=[],this._dragIndex=-1,this._dragOverIndex=-1}set items(t){this._items=t;const i=new Set(t.map(n=>n.id));this._activeIds=this._activeIds.filter(n=>i.has(n)),this._availableIds=this._availableIds.filter(n=>i.has(n));const s=new Set([...this._activeIds,...this._availableIds]);for(const n of t)s.has(n.id)||(this._activeIds=[...this._activeIds,n.id])}get items(){return this._items}_byId(t){return this._items.find(i=>i.id===t)}_activate(t){this._availableIds=this._availableIds.filter(i=>i!==t),this._activeIds=[...this._activeIds,t],this._dispatchChange()}_deactivate(t){this._activeIds=this._activeIds.filter(i=>i!==t),this._availableIds=[...this._availableIds,t],this._dispatchChange()}_onDragStart(t,i){this._dragIndex=i,t.dataTransfer.effectAllowed="move",t.dataTransfer.setData("text/plain",String(i))}_onDragOver(t,i){t.preventDefault(),t.dataTransfer.dropEffect="move",this._dragOverIndex!==i&&(this._dragOverIndex=i)}_onDrop(t,i){t.preventDefault();const s=this._dragIndex;if(this._dragIndex=-1,this._dragOverIndex=-1,s===-1||s===i)return;const n=[...this._activeIds],[r]=n.splice(s,1);n.splice(i,0,r),this._activeIds=n,this._dispatchChange()}_onDragEnd(){this._dragIndex=-1,this._dragOverIndex=-1}_dispatchChange(){this.dispatchEvent(new CustomEvent("change",{detail:[...this._activeIds],bubbles:!0,composed:!0}))}render(){const t=this._activeIds.map(s=>this._byId(s)).filter(Boolean),i=this._availableIds.map(s=>this._byId(s)).filter(Boolean);return w`
      ${St(!this.sortOnly&&t.length>0,()=>w`<bim-label>Active</bim-label>`)}

      <div class="fields-list">
        ${t.map((s,n)=>w`
            <div
              class=${Yl({"field-item":!0,"field-item--dragging":this._dragIndex===n,"field-item--drag-over":this._dragOverIndex===n&&this._dragIndex!==n})}
              draggable="true"
              @dragstart=${r=>this._onDragStart(r,n)}
              @dragover=${r=>this._onDragOver(r,n)}
              @drop=${r=>this._onDrop(r,n)}
              @dragend=${()=>this._onDragEnd()}
            >
              <bim-label
                icon="tabler:grip-vertical"
                style="cursor:grab; color:var(--bim-ui_bg-contrast-60); flex-shrink:0;"
              ></bim-label>
              ${St(!this.sortOnly,()=>w`
                  <bim-checkbox
                    .checked=${Ho(!0)}
                    @change=${r=>{r.stopPropagation(),this._deactivate(s.id)}}
                  ></bim-checkbox>
                `)}
              <bim-label .icon=${s.icon} style="flex:1;"
                >${s.label}</bim-label
              >
            </div>
          `)}
      </div>

      ${St(!this.sortOnly&&i.length>0,()=>w`
          <bim-label>Available</bim-label>
          <div class="fields-list">
            ${i.map(s=>w`
                <div class="field-item">
                  <bim-checkbox
                    .checked=${Ho(!1)}
                    @change=${n=>{n.stopPropagation(),this._activate(s.id)}}
                  ></bim-checkbox>
                  <bim-label .icon=${s.icon} style="flex:1;"
                    >${s.label}</bim-label
                  >
                </div>
              `)}
          </div>
        `)}
    `}};_d.styles=H`
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .fields-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .field-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      border-radius: 6px;
      user-select: none;
      min-height: 25px;
    }

    .field-item:hover {
      background: var(--bim-ui_bg-contrast-20);
    }

    .field-item--drag-over {
      border-top: 2px solid var(--bim-ui_accent-base);
      border-radius: 0;
    }

    .field-item--dragging {
      opacity: 0.4;
    }
  `;let ni=_d;Si([v({attribute:!1})],ni.prototype,"items",1);Si([v({attribute:!1})],ni.prototype,"sortOnly",2);Si([Z()],ni.prototype,"_activeIds",2);Si([Z()],ni.prototype,"_availableIds",2);Si([Z()],ni.prototype,"_dragIndex",2);Si([Z()],ni.prototype,"_dragOverIndex",2);export{xs as K,At as a,w as b,Mr as n,Zt as o};
