const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./composition-Cfv_WSuu-BIQ8LVzg.js","./index-BwXuLbMn.js"])))=>i.map(i=>d[i]);
import{k as hs,p as D,j as ae,f as L,h as xe,P as tt,B as ge,Q as zt,U as C,X as ie,Y as F,Z as re,_ as K,$ as us,a0 as ke,x as Ke,a1 as ds,a2 as Se,a3 as _e,a4 as Ut,a5 as Lt,a6 as Ct,i as k,a7 as Pt,a8 as cs,a9 as fs,aa as z,ab as H,ac as X,ad as Qt,ae as ps,af as ms,ag as gs,ah as vs,ai as xs,aj as ws,ak as bs,N as Ss,al as _s,am as kt,an as R,ao as Et,n as Me,ap as wt,aq as ys,ar as bt,as as ve,at as Ts,au as Le,av as Ms,e as Ue,a as Cs,d as Te,aw as At,ax as Ps,ay as Es,az as Wt,w as Je,aA as As,J as Ds,aB as Os,aC as $e,aD as Rs,u as Bt,aE as Ce,aF as $,aG as Ns,aH as Mt,aI as Zt,D as Fs,aJ as st,M as zs,aK as Kt,aL as Us,aM as Ls}from"./index-BwXuLbMn.js";const ks="modulepreload",Ws=function(d,e){return new URL(d,e).href},It={},Bs=function(e,t,s){let i=Promise.resolve();if(t&&t.length>0){let l=function(h){return Promise.all(h.map(p=>Promise.resolve(p).then(v=>({status:"fulfilled",value:v}),v=>({status:"rejected",reason:v}))))};const a=document.getElementsByTagName("link"),o=document.querySelector("meta[property=csp-nonce]"),n=o?.nonce||o?.getAttribute("nonce");i=l(t.map(h=>{if(h=Ws(h,s),h in It)return;It[h]=!0;const p=h.endsWith(".css"),v=p?'[rel="stylesheet"]':"";if(s)for(let c=a.length-1;c>=0;c--){const m=a[c];if(m.href===h&&(!p||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${h}"]${v}`))return;const u=document.createElement("link");if(u.rel=p?"stylesheet":ks,p||(u.as="script"),u.crossOrigin="",u.href=h,n&&u.setAttribute("nonce",n),document.head.appendChild(u),p)return new Promise((c,m)=>{u.addEventListener("load",c),u.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${h}`)))})}))}function r(a){const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=a,window.dispatchEvent(o),!o.defaultPrevented)throw a}return i.then(a=>{for(const o of a||[])o.status==="rejected"&&r(o.reason);return e().catch(r)})};class Is extends hs{constructor(e=document.createElement("div")){super(),this.isCSS2DObject=!0,this.element=e,this.element.style.position="absolute",this.element.style.userSelect="none",this.element.setAttribute("draggable",!1),this.center=new D(.5,.5),this.addEventListener("removed",function(){this.traverse(function(t){t.element&&t.element instanceof t.element.ownerDocument.defaultView.Element&&t.element.parentNode!==null&&t.element.remove()})})}copy(e,t){return super.copy(e,t),this.element=e.element.cloneNode(!0),this.center=e.center,this}}const be=new L,Ht=new ae,Gt=new ae,Vt=new L,jt=new L;class Hs{constructor(e={}){const t=this;let s,i,r,a;const o={objects:new WeakMap},n=e.element!==void 0?e.element:document.createElement("div");n.style.overflow="hidden",this.domElement=n,this.sortObjects=!0,this.getSize=function(){return{width:s,height:i}},this.render=function(c,m){c.matrixWorldAutoUpdate===!0&&c.updateMatrixWorld(),m.parent===null&&m.matrixWorldAutoUpdate===!0&&m.updateMatrixWorld(),Ht.copy(m.matrixWorldInverse),Gt.multiplyMatrices(m.projectionMatrix,Ht),h(c,c,m),this.sortObjects&&u(c)},this.setSize=function(c,m){s=c,i=m,r=s/2,a=i/2,n.style.width=c+"px",n.style.height=m+"px"};function l(c){c.isCSS2DObject&&(c.element.style.display="none");for(let m=0,x=c.children.length;m<x;m++)l(c.children[m])}function h(c,m,x){if(c.visible===!1){l(c);return}if(c.isCSS2DObject){be.setFromMatrixPosition(c.matrixWorld),be.applyMatrix4(Gt);const b=be.z>=-1&&be.z<=1&&c.layers.test(x.layers)===!0,g=c.element;g.style.display=b===!0?"":"none",b===!0&&(c.onBeforeRender(t,m,x),g.style.transform="translate("+-100*c.center.x+"%,"+-100*c.center.y+"%)translate("+(be.x*r+r)+"px,"+(-be.y*a+a)+"px)",g.parentNode!==n&&n.appendChild(g),c.onAfterRender(t,m,x));const P={distanceToCameraSquared:p(x,c)};o.objects.set(c,P)}for(let b=0,g=c.children.length;b<g;b++)h(c.children[b],m,x)}function p(c,m){return Vt.setFromMatrixPosition(c.matrixWorld),jt.setFromMatrixPosition(m.matrixWorld),Vt.distanceToSquared(jt)}function v(c){const m=[];return c.traverseVisible(function(x){x.isCSS2DObject&&m.push(x)}),m}function u(c){const m=v(c).sort(function(b,g){if(b.renderOrder!==g.renderOrder)return g.renderOrder-b.renderOrder;const P=o.objects.get(b).distanceToCameraSquared,E=o.objects.get(g).distanceToCameraSquared;return P-E}),x=m.length;for(let b=0,g=m.length;b<g;b++)m[b].element.style.zIndex=x-b}}}const Ze={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class ee{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Gs=new tt(-1,1,1,-1,0,1);class Vs extends ge{constructor(){super(),this.setAttribute("position",new zt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new zt([0,2,0,0,2,0],2))}}const js=new Vs;class oe{constructor(e){this._mesh=new xe(js,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Gs)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class Xs extends ee{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof C?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=ie.clone(e.uniforms),this.material=new C({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new oe(this.material)}render(e,t,s){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=s.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class Xt extends ee{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,s){const i=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(i.REPLACE,i.REPLACE,i.REPLACE),r.buffers.stencil.setFunc(i.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),e.setRenderTarget(s),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(i.EQUAL,1,4294967295),r.buffers.stencil.setOp(i.KEEP,i.KEEP,i.KEEP),r.buffers.stencil.setLocked(!0)}}class Ys extends ee{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class qs{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const s=e.getSize(new D);this._width=s.width,this._height=s.height,t=new F(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:re}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Xs(Ze),this.copyPass.material.blending=K,this.clock=new us}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let s=!1;for(let i=0,r=this.passes.length;i<r;i++){const a=this.passes[i];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(i),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,s),a.needsSwap){if(s){const o=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}Xt!==void 0&&(a instanceof Xt?s=!0:a instanceof Ys&&(s=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new D);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const s=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(s,i),this.renderTarget2.setSize(s,i);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(s,i)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}const Ge={defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new D},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new ae},cameraProjectionMatrixInverse:{value:new ae},cameraWorldMatrix:{value:new ae},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new L(-1,-1,-1)},sceneBoxMax:{value:new L(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif

		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).DEPTH_SWIZZLING;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).DEPTH_SWIZZLING;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}

		void main() {
			float depth = getDepth(vUv.xy);
			if (depth >= 1.0) {
				discard;
				return;
			}
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {

				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w);
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				vec3 viewDir = normalize(-viewPos.xyz);
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));

				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},Ve={defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},St={uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`};function Qs(d=5){const e=Math.floor(d)%2===0?Math.floor(d)+1:Math.floor(d),t=Zs(e),s=t.length,i=new Uint8Array(s*4);for(let a=0;a<s;++a){const o=t[a],n=2*Math.PI*o/s,l=new L(Math.cos(n),Math.sin(n),0).normalize();i[a*4]=(l.x*.5+.5)*255,i[a*4+1]=(l.y*.5+.5)*255,i[a*4+2]=127,i[a*4+3]=255}const r=new ke(i,e,e);return r.wrapS=Ke,r.wrapT=Ke,r.needsUpdate=!0,r}function Zs(d){const e=Math.floor(d)%2===0?Math.floor(d)+1:Math.floor(d),t=e*e,s=Array(t).fill(0);let i=Math.floor(e/2),r=e-1;for(let a=1;a<=t;){if(i===-1&&r===e?(r=e-2,i=0):(r===e&&(r=0),i<0&&(i=e-1)),s[i*e+r]!==0){r-=2,i++;continue}else s[i*e+r]=a++;r++,i--}return s}const je={defines:{SAMPLES:16,SAMPLE_VECTORS:Jt(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new D},cameraProjectionMatrixInverse:{value:new ae},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;

		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
		#if DEPTH_VALUE_SOURCE == 1
			return textureLod(tDepth, uv.xy, 0.0).a;
		#else
			return textureLod(tDepth, uv.xy, 0.0).r;
		#endif
		}

		float fetchDepth(const ivec2 uv) {
			#if DEPTH_VALUE_SOURCE == 1
				return texelFetch(tDepth, uv.xy, 0).a;
			#else
				return texelFetch(tDepth, uv.xy, 0).r;
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);

			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;

			denoised += w * neighborColor;
			totalWeight += w;
		}

		void main() {
			float depth = getDepth(vUv.xy);
			vec3 viewNormal = getViewNormal(vUv);
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);

			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}

			if (totalWeight > 0.) {
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function Jt(d,e,t){const s=Ks(d,e,t);let i="vec3[SAMPLES](";for(let r=0;r<d;r++){const a=s[r];i+=`vec3(${a.x}, ${a.y}, ${a.z})${r<d-1?",":")"}`}return i}function Ks(d,e,t){const s=[];for(let i=0;i<d;i++){const r=2*Math.PI*e*i/d,a=Math.pow(i/(d-1),t);s.push(new L(Math.cos(r),Math.sin(r),a))}return s}class Js{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let s,i,r;const a=.5*(Math.sqrt(3)-1),o=(e+t)*a,n=Math.floor(e+o),l=Math.floor(t+o),h=(3-Math.sqrt(3))/6,p=(n+l)*h,v=n-p,u=l-p,c=e-v,m=t-u;let x,b;c>m?(x=1,b=0):(x=0,b=1);const g=c-x+h,P=m-b+h,E=c-1+2*h,_=m-1+2*h,y=n&255,T=l&255,O=this.perm[y+this.perm[T]]%12,M=this.perm[y+x+this.perm[T+b]]%12,f=this.perm[y+1+this.perm[T+1]]%12;let w=.5-c*c-m*m;w<0?s=0:(w*=w,s=w*w*this._dot(this.grad3[O],c,m));let S=.5-g*g-P*P;S<0?i=0:(S*=S,i=S*S*this._dot(this.grad3[M],g,P));let A=.5-E*E-_*_;return A<0?r=0:(A*=A,r=A*A*this._dot(this.grad3[f],E,_)),70*(s+i+r)}noise3d(e,t,s){let i,r,a,o;const l=(e+t+s)*.3333333333333333,h=Math.floor(e+l),p=Math.floor(t+l),v=Math.floor(s+l),u=1/6,c=(h+p+v)*u,m=h-c,x=p-c,b=v-c,g=e-m,P=t-x,E=s-b;let _,y,T,O,M,f;g>=P?P>=E?(_=1,y=0,T=0,O=1,M=1,f=0):g>=E?(_=1,y=0,T=0,O=1,M=0,f=1):(_=0,y=0,T=1,O=1,M=0,f=1):P<E?(_=0,y=0,T=1,O=0,M=1,f=1):g<E?(_=0,y=1,T=0,O=0,M=1,f=1):(_=0,y=1,T=0,O=1,M=1,f=0);const w=g-_+u,S=P-y+u,A=E-T+u,W=g-O+2*u,G=P-M+2*u,U=E-f+2*u,B=g-1+3*u,I=P-1+3*u,N=E-1+3*u,te=h&255,se=p&255,fe=v&255,We=this.perm[te+this.perm[se+this.perm[fe]]]%12,Be=this.perm[te+_+this.perm[se+y+this.perm[fe+T]]]%12,Ie=this.perm[te+O+this.perm[se+M+this.perm[fe+f]]]%12,He=this.perm[te+1+this.perm[se+1+this.perm[fe+1]]]%12;let ne=.6-g*g-P*P-E*E;ne<0?i=0:(ne*=ne,i=ne*ne*this._dot3(this.grad3[We],g,P,E));let le=.6-w*w-S*S-A*A;le<0?r=0:(le*=le,r=le*le*this._dot3(this.grad3[Be],w,S,A));let he=.6-W*W-G*G-U*U;he<0?a=0:(he*=he,a=he*he*this._dot3(this.grad3[Ie],W,G,U));let ue=.6-B*B-I*I-N*N;return ue<0?o=0:(ue*=ue,o=ue*ue*this._dot3(this.grad3[He],B,I,N)),32*(i+r+a+o)}noise4d(e,t,s,i){const r=this.grad4,a=this.simplex,o=this.perm,n=(Math.sqrt(5)-1)/4,l=(5-Math.sqrt(5))/20;let h,p,v,u,c;const m=(e+t+s+i)*n,x=Math.floor(e+m),b=Math.floor(t+m),g=Math.floor(s+m),P=Math.floor(i+m),E=(x+b+g+P)*l,_=x-E,y=b-E,T=g-E,O=P-E,M=e-_,f=t-y,w=s-T,S=i-O,A=M>f?32:0,W=M>w?16:0,G=f>w?8:0,U=M>S?4:0,B=f>S?2:0,I=w>S?1:0,N=A+W+G+U+B+I,te=a[N][0]>=3?1:0,se=a[N][1]>=3?1:0,fe=a[N][2]>=3?1:0,We=a[N][3]>=3?1:0,Be=a[N][0]>=2?1:0,Ie=a[N][1]>=2?1:0,He=a[N][2]>=2?1:0,ne=a[N][3]>=2?1:0,le=a[N][0]>=1?1:0,he=a[N][1]>=1?1:0,ue=a[N][2]>=1?1:0,Ft=a[N][3]>=1?1:0,it=M-te+l,rt=f-se+l,at=w-fe+l,ot=S-We+l,nt=M-Be+2*l,lt=f-Ie+2*l,ht=w-He+2*l,ut=S-ne+2*l,dt=M-le+3*l,ct=f-he+3*l,ft=w-ue+3*l,pt=S-Ft+3*l,mt=M-1+4*l,gt=f-1+4*l,vt=w-1+4*l,xt=S-1+4*l,Pe=x&255,Ee=b&255,Ae=g&255,De=P&255,rs=o[Pe+o[Ee+o[Ae+o[De]]]]%32,as=o[Pe+te+o[Ee+se+o[Ae+fe+o[De+We]]]]%32,os=o[Pe+Be+o[Ee+Ie+o[Ae+He+o[De+ne]]]]%32,ns=o[Pe+le+o[Ee+he+o[Ae+ue+o[De+Ft]]]]%32,ls=o[Pe+1+o[Ee+1+o[Ae+1+o[De+1]]]]%32;let Oe=.6-M*M-f*f-w*w-S*S;Oe<0?h=0:(Oe*=Oe,h=Oe*Oe*this._dot4(r[rs],M,f,w,S));let Re=.6-it*it-rt*rt-at*at-ot*ot;Re<0?p=0:(Re*=Re,p=Re*Re*this._dot4(r[as],it,rt,at,ot));let Ne=.6-nt*nt-lt*lt-ht*ht-ut*ut;Ne<0?v=0:(Ne*=Ne,v=Ne*Ne*this._dot4(r[os],nt,lt,ht,ut));let Fe=.6-dt*dt-ct*ct-ft*ft-pt*pt;Fe<0?u=0:(Fe*=Fe,u=Fe*Fe*this._dot4(r[ns],dt,ct,ft,pt));let ze=.6-mt*mt-gt*gt-vt*vt-xt*xt;return ze<0?c=0:(ze*=ze,c=ze*ze*this._dot4(r[ls],mt,gt,vt,xt)),27*(h+p+v+u+c)}_dot(e,t,s){return e[0]*t+e[1]*s}_dot3(e,t,s,i){return e[0]*t+e[1]*s+e[2]*i}_dot4(e,t,s,i,r){return e[0]*t+e[1]*s+e[2]*i+e[3]*r}}class q extends ee{constructor(e,t,s=512,i=512,r,a,o){super(),this.width=s,this.height=i,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=Qs(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new F(this.width,this.height,{type:re}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new C({defines:Object.assign({},Ge.defines),uniforms:ie.clone(Ge.uniforms),vertexShader:Ge.vertexShader,fragmentShader:Ge.fragmentShader,blending:K,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=this.camera.isPerspectiveCamera?1:0,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new ds,this.normalMaterial.blending=K,this.pdMaterial=new C({defines:Object.assign({},je.defines),uniforms:ie.clone(je.uniforms),vertexShader:je.vertexShader,fragmentShader:je.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new C({defines:Object.assign({},Ve.defines),uniforms:ie.clone(Ve.uniforms),vertexShader:Ve.vertexShader,fragmentShader:Ve.fragmentShader,blending:K}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new C({uniforms:ie.clone(Ze.uniforms),vertexShader:Ze.vertexShader,fragmentShader:Ze.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:Lt,blendDst:_e,blendEquation:Se,blendSrcAlpha:Ut,blendDstAlpha:_e,blendEquationAlpha:Se}),this.blendMaterial=new C({uniforms:ie.clone(St.uniforms),vertexShader:St.vertexShader,fragmentShader:St.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:Ct,blendSrc:Lt,blendDst:_e,blendEquation:Se,blendSrcAlpha:Ut,blendDstAlpha:_e,blendEquationAlpha:Se}),this._fsQuad=new oe(null),this._originalClearColor=new k,this.setGBuffer(r?r.depthTexture:void 0,r?r.normalTexture:void 0),a!==void 0&&this.updateGtaoMaterial(a),o!==void 0&&this.updatePdMaterial(o)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){e!==void 0?(this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1):(this.depthTexture=new Pt,this.depthTexture.format=cs,this.depthTexture.type=fs,this.normalRenderTarget=new F(this.width,this.height,{minFilter:z,magFilter:z,type:re,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);const s=this.normalTexture?1:0,i=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=s,this.gtaoMaterial.defines.DEPTH_SWIZZLING=i,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=s,this.pdMaterial.defines.DEPTH_SWIZZLING=i,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){e.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=e.radius),e.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),e.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),e.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),e.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=e.scale),e.samples!==void 0&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),e.screenSpaceRadius!==void 0&&(e.screenSpaceRadius?1:0)!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=e.screenSpaceRadius?1:0,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;e.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),e.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),e.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),e.radius!==void 0&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),e.radiusExponent!==void 0&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),e.rings!==void 0&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),e.samples!==void 0&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=Jt(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(e,t,s){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(e,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(e,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case q.OUTPUT.Off:break;case q.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=s.texture,this.copyMaterial.blending=K,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case q.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=K,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case q.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=K,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case q.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:t);break;case q.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=K,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case q.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=s.texture,this.copyMaterial.blending=K,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(e,this.blendMaterial,this.renderToScreen?null:t);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(e,t,s,i,r){e.getClearColor(this._originalClearColor);const a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(s),e.autoClear=!1,i!=null&&(e.setClearColor(i),e.setClearAlpha(r||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=o,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_renderOverride(e,t,s,i,r){e.getClearColor(this._originalClearColor);const a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(s),e.autoClear=!1,i=t.clearColor||i,r=t.clearAlpha||r,i!=null&&(e.setClearColor(i),e.setClearAlpha(r||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=o,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_overrideVisibility(){const e=this.scene,t=this._visibilityCache;e.traverse(function(s){(s.isPoints||s.isLine||s.isLine2)&&s.visible&&(s.visible=!1,t.push(s))})}_restoreVisibility(){const e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}_generateNoise(e=64){const t=new Js,s=e*e*4,i=new Uint8Array(s);for(let a=0;a<e;a++)for(let o=0;o<e;o++){const n=a,l=o;i[(a*e+o)*4]=(t.noise(n,l)*.5+.5)*255,i[(a*e+o)*4+1]=(t.noise(n+e,l)*.5+.5)*255,i[(a*e+o)*4+2]=(t.noise(n,l+e)*.5+.5)*255,i[(a*e+o)*4+3]=(t.noise(n+e,l+e)*.5+.5)*255}const r=new ke(i,e,e,H,X);return r.wrapS=Ke,r.wrapT=Ke,r.needsUpdate=!0,r}}q.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};const Xe={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class $s extends ee{constructor(){super(),this.isOutputPass=!0,this.uniforms=ie.clone(Xe.uniforms),this.material=new Qt({name:Xe.name,uniforms:this.uniforms,vertexShader:Xe.vertexShader,fragmentShader:Xe.fragmentShader}),this._fsQuad=new oe(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,s){this.uniforms.tDiffuse.value=s.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},ps.getTransfer(this._outputColorSpace)===ms&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===gs?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===vs?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===xs?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ws?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===bs?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Ss?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===_s&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}const Ye={defines:{SMAA_THRESHOLD:"0.1"},uniforms:{tDiffuse:{value:null},resolution:{value:new D(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		void SMAAEdgeDetectionVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAAEdgeDetectionVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
			vec2 threshold = vec2( SMAA_THRESHOLD, SMAA_THRESHOLD );

			// Calculate color deltas:
			vec4 delta;
			vec3 C = texture2D( colorTex, texcoord ).rgb;

			vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
			vec3 t = abs( C - Cleft );
			delta.x = max( max( t.r, t.g ), t.b );

			vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
			t = abs( C - Ctop );
			delta.y = max( max( t.r, t.g ), t.b );

			// We do the usual threshold:
			vec2 edges = step( threshold, delta.xy );

			// Then discard if there is no edge:
			if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
				discard;

			// Calculate right and bottom deltas:
			vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
			t = abs( C - Cright );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
			t = abs( C - Cbottom );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the maximum delta in the direct neighborhood:
			float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

			// Calculate left-left and top-top deltas:
			vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
			t = abs( C - Cleftleft );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
			t = abs( C - Ctoptop );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the final maximum delta:
			maxDelta = max( max( maxDelta, delta.z ), delta.w );

			// Local contrast adaptation in action:
			edges.xy *= step( 0.5 * maxDelta, delta.xy );

			return vec4( edges, 0.0, 0.0 );
		}

		void main() {

			gl_FragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );

		}`},qe={defines:{SMAA_MAX_SEARCH_STEPS:"8",SMAA_AREATEX_MAX_DISTANCE:"16",SMAA_AREATEX_PIXEL_SIZE:"( 1.0 / vec2( 160.0, 560.0 ) )",SMAA_AREATEX_SUBTEX_SIZE:"( 1.0 / 7.0 )"},uniforms:{tDiffuse:{value:null},tArea:{value:null},tSearch:{value:null},resolution:{value:new D(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];
		varying vec2 vPixcoord;

		void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
			vPixcoord = texcoord / resolution;

			// We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components

			// And these for the searches, they indicate the ends of the loops:
			vOffset[ 2 ] = vec4( vOffset[ 0 ].xz, vOffset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

		}

		void main() {

			vUv = uv;

			SMAABlendingWeightCalculationVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )

		uniform sampler2D tDiffuse;
		uniform sampler2D tArea;
		uniform sampler2D tSearch;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[3];
		varying vec2 vPixcoord;

		#if __VERSION__ == 100
		vec2 round( vec2 x ) {
			return sign( x ) * floor( abs( x ) + 0.5 );
		}
		#endif

		float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
			// Not required if searchTex accesses are set to point:
			// float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
			// e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
			//     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
			e.r = bias + e.r * scale;
			return 255.0 * texture2D( searchTex, e, 0.0 ).r;
		}

		float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			/**
				* @PSEUDO_GATHER4
				* This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
				* sample between edge, thus fetching four edges in a row.
				* Sampling with different offsets in each direction allows to disambiguate
				* which edges are active from the four fetched ones.
				*/
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			// We correct the previous (-0.25, -0.125) offset we applied:
			texcoord.x += 0.25 * resolution.x;

			// The searches are bias by 1, so adjust the coords accordingly:
			texcoord.x += resolution.x;

			// Disambiguate the length added by the last step:
			texcoord.x += 2.0 * resolution.x; // Undo last step
			texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);

			return texcoord.x;
		}

		float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			texcoord.x -= 0.25 * resolution.x;
			texcoord.x -= resolution.x;
			texcoord.x -= 2.0 * resolution.x;
			texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );

			return texcoord.x;
		}

		float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y; // WebGL port note: Changed sign
			texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y; // WebGL port note: Changed sign
			texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
			// Rounding prevents precision errors of bilinear filtering:
			vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;

			// We do a scale and bias for mapping to texel space:
			texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );

			// Move to proper place, according to the subpixel offset:
			texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

			return texture2D( areaTex, texcoord, 0.0 ).rg;
		}

		vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
			vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );

			vec2 e = texture2D( edgesTex, texcoord ).rg;

			if ( e.g > 0.0 ) { // Edge at north
				vec2 d;

				// Find the distance to the left:
				vec2 coords;
				coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
				coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
				d.x = coords.x;

				// Now fetch the left crossing edges, two at a time using bilinear
				// filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
				// discern what value each edge has:
				float e1 = texture2D( edgesTex, coords, 0.0 ).r;

				// Find the distance to the right:
				coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
				d.y = coords.x;

				// We want the distances to be in pixel units (doing this here allow to
				// better interleave arithmetic and memory accesses):
				d = d / resolution.x - pixcoord.x;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the right crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;

				// Ok, we know how this pattern looks like, now it is time for getting
				// the actual area:
				weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
			}

			if ( e.r > 0.0 ) { // Edge at west
				vec2 d;

				// Find the distance to the top:
				vec2 coords;

				coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
				coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
				d.x = coords.y;

				// Fetch the top crossing edges:
				float e1 = texture2D( edgesTex, coords, 0.0 ).g;

				// Find the distance to the bottom:
				coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
				d.y = coords.y;

				// We want the distances to be in pixel units:
				d = d / resolution.y - pixcoord.y;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the bottom crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;

				// Get the area for this direction:
				weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
			}

			return weights;
		}

		void main() {

			gl_FragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );

		}`},_t={uniforms:{tDiffuse:{value:null},tColor:{value:null},resolution:{value:new D(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		void SMAANeighborhoodBlendingVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAANeighborhoodBlendingVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform sampler2D tColor;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
			// Fetch the blending weights for current pixel:
			vec4 a;
			a.xz = texture2D( blendTex, texcoord ).xz;
			a.y = texture2D( blendTex, offset[ 1 ].zw ).g;
			a.w = texture2D( blendTex, offset[ 1 ].xy ).a;

			// Is there any blending weight with a value greater than 0.0?
			if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
				return texture2D( colorTex, texcoord, 0.0 );
			} else {
				// Up to 4 lines can be crossing a pixel (one through each edge). We
				// favor blending by choosing the line with the maximum weight for each
				// direction:
				vec2 offset;
				offset.x = a.a > a.b ? a.a : -a.b; // left vs. right
				offset.y = a.g > a.r ? -a.g : a.r; // top vs. bottom // WebGL port note: Changed signs

				// Then we go in the direction that has the maximum weight:
				if ( abs( offset.x ) > abs( offset.y )) { // horizontal vs. vertical
					offset.y = 0.0;
				} else {
					offset.x = 0.0;
				}

				// Fetch the opposite color and lerp by hand:
				vec4 C = texture2D( colorTex, texcoord, 0.0 );
				texcoord += sign( offset ) * resolution;
				vec4 Cop = texture2D( colorTex, texcoord, 0.0 );
				float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );

				// WebGL port note: Added gamma correction
				C.xyz = pow(C.xyz, vec3(2.2));
				Cop.xyz = pow(Cop.xyz, vec3(2.2));
				vec4 mixed = mix(C, Cop, s);
				mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));

				return mixed;
			}
		}

		void main() {

			gl_FragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );

		}`};class ei extends ee{constructor(){super(),this._edgesRT=new F(1,1,{depthBuffer:!1,type:re}),this._edgesRT.texture.name="SMAAPass.edges",this._weightsRT=new F(1,1,{depthBuffer:!1,type:re}),this._weightsRT.texture.name="SMAAPass.weights";const e=this,t=new Image;t.src=this._getAreaTexture(),t.onload=function(){e._areaTexture.needsUpdate=!0},this._areaTexture=new kt,this._areaTexture.name="SMAAPass.area",this._areaTexture.image=t,this._areaTexture.minFilter=R,this._areaTexture.generateMipmaps=!1,this._areaTexture.flipY=!1;const s=new Image;s.src=this._getSearchTexture(),s.onload=function(){e._searchTexture.needsUpdate=!0},this._searchTexture=new kt,this._searchTexture.name="SMAAPass.search",this._searchTexture.image=s,this._searchTexture.magFilter=z,this._searchTexture.minFilter=z,this._searchTexture.generateMipmaps=!1,this._searchTexture.flipY=!1,this._uniformsEdges=ie.clone(Ye.uniforms),this._materialEdges=new C({defines:Object.assign({},Ye.defines),uniforms:this._uniformsEdges,vertexShader:Ye.vertexShader,fragmentShader:Ye.fragmentShader}),this._uniformsWeights=ie.clone(qe.uniforms),this._uniformsWeights.tDiffuse.value=this._edgesRT.texture,this._uniformsWeights.tArea.value=this._areaTexture,this._uniformsWeights.tSearch.value=this._searchTexture,this._materialWeights=new C({defines:Object.assign({},qe.defines),uniforms:this._uniformsWeights,vertexShader:qe.vertexShader,fragmentShader:qe.fragmentShader}),this._uniformsBlend=ie.clone(_t.uniforms),this._uniformsBlend.tDiffuse.value=this._weightsRT.texture,this._materialBlend=new C({uniforms:this._uniformsBlend,vertexShader:_t.vertexShader,fragmentShader:_t.fragmentShader}),this._fsQuad=new oe(null)}render(e,t,s){this._uniformsEdges.tDiffuse.value=s.texture,this._fsQuad.material=this._materialEdges,e.setRenderTarget(this._edgesRT),this.clear&&e.clear(),this._fsQuad.render(e),this._fsQuad.material=this._materialWeights,e.setRenderTarget(this._weightsRT),this.clear&&e.clear(),this._fsQuad.render(e),this._uniformsBlend.tColor.value=s.texture,this._fsQuad.material=this._materialBlend,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(),this._fsQuad.render(e))}setSize(e,t){this._edgesRT.setSize(e,t),this._weightsRT.setSize(e,t),this._materialEdges.uniforms.resolution.value.set(1/e,1/t),this._materialWeights.uniforms.resolution.value.set(1/e,1/t),this._materialBlend.uniforms.resolution.value.set(1/e,1/t)}dispose(){this._edgesRT.dispose(),this._weightsRT.dispose(),this._areaTexture.dispose(),this._searchTexture.dispose(),this._materialEdges.dispose(),this._materialWeights.dispose(),this._materialBlend.dispose(),this._fsQuad.dispose()}_getAreaTexture(){return"data:image/png;base64,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"}_getSearchTexture(){return"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAhCAAAAABIXyLAAAAAOElEQVRIx2NgGAWjYBSMglEwEICREYRgFBZBqDCSLA2MGPUIVQETE9iNUAqLR5gIeoQKRgwXjwAAGn4AtaFeYLEAAAAASUVORK5CYII="}}class ti{three;world;wasVisible=!0;onDisposed=new Me;set visible(e){this.three.visible=e,this.wasVisible=e}get visible(){return this.three.visible}constructor(e,t,s){this.world=e;let i;if(t)i=t;else{i=document.createElement("div");const r="6px";i.style.color="white",i.style.height=r,i.style.width=r,i.style.borderRadius="50%",i.style.border="2px solid rgb(122, 75, 209)",i.style.zIndex="-20"}this.three=new Is(i),(s||e.scene.three).add(this.three),this.visible=!0}toggleVisibility(){this.visible=!this.visible}notDisplay(){this.visible=!1}dispose(){this.three.removeFromParent(),this.three.element.remove(),this.onDisposed.trigger(),this.onDisposed.reset()}}class si extends Cs{three2D=new Hs;constructor(e,t,s){super(e,t,s),this.onAfterUpdate.add(()=>{if(this.onBeforeUpdate.trigger(this),!this.enabled||!this.currentWorld)return;const i=this.currentWorld.scene.three,r=this.currentWorld.camera.three;i instanceof ve&&this.three2D.render(i,r)}),this.onDisposed.add(()=>{this.three2D.domElement.remove()}),this.onResize.add(({x:i,y:r})=>{this.three2D.setSize(i,r)}),this.setupHtmlRenderer(),this.resize()}setupHtmlRenderer(){this.three2D.domElement.style.position="absolute",this.three2D.domElement.style.top="0px",this.three2D.domElement.style.pointerEvents="none",this.container&&(this.container.appendChild(this.three2D.domElement),this.container.style.position="relative")}}class ii extends q{_fragments;_hiddenMaterials=new Map;constructor(e,t,s,i,r){super(t,s,i,r),this._fragments=e}render(e,t,s,i,r){this._hideLodMaterials(),super.render(e,t,s,i,r),this._restoreLodMaterials()}_hideLodMaterials(){if(this._hiddenMaterials.clear(),!!this._fragments.initialized)for(const[,e]of this._fragments.core.models.materials.list)"isLodMaterial"in e&&(this._hiddenMaterials.set(e,e.visible),e.visible=!1)}_restoreLodMaterials(){for(const[e,t]of this._hiddenMaterials)e.visible=t;this._hiddenMaterials.clear()}}var $t=(d=>(d[d.DEFAULT=0]="DEFAULT",d[d.GLOBAL=1]="GLOBAL",d))($t||{});class ri extends ee{_edgeMaterial;_combineMaterial;_fsQuad;_edgeRenderTarget;_vertexColorRenderTarget;_fragments;_renderer;_overrideMaterial;_depthBiasStrength=.005;_mode=0;xray=!1;get mode(){return this._mode}set mode(e){this._mode=e,this.setMaterialToMesh(!1)}get width(){return this._edgeMaterial.uniforms.width.value}set width(e){this._edgeMaterial.uniforms.width.value=e}get color(){return this._combineMaterial.uniforms.edgeColor.value}set color(e){this._combineMaterial.uniforms.edgeColor.value=e}get depthBiasStrength(){return this._depthBiasStrength}set depthBiasStrength(e){this._depthBiasStrength=e,this._overrideMaterial&&(this._overrideMaterial.uniforms.depthBiasStrength.value=e)}constructor(e,t,s=1){super(),this._renderer=e,this._fragments=t,this._overrideMaterial=new C({clipping:!0,side:Fs,uniforms:{depthBiasStrength:{value:this._depthBiasStrength}},vertexShader:`
        #include <common>
        #include <clipping_planes_pars_vertex>

        attribute vec3 color;
        varying vec3 vColor;
        uniform float depthBiasStrength;

        void main() {
          vColor = color;

          #include <begin_vertex>
          #include <project_vertex>

          // Coplanar priority, applied as a small WORLD-space nudge toward the
          // camera in view space (+Z is toward the camera), then re-projected.
          // A constant clip-space bias falls off ~1/d while the real depth gap
          // falls off ~1/d^2, so at distance it overran genuine occluders and
          // leaked their edges (#718). A view-space offset instead behaves like
          // a real epsilon separation: its projected depth gap scales like real
          // geometry, so it breaks coplanar ties at every distance without ever
          // pulling an occluder forward. Convention-independent (correct under
          // standard-Z and reversed-Z). mvPosition comes from <project_vertex>,
          // so instancing/batching are already applied.
          //
          // Two terms (mirrors beta's per-faceId band + hash, adapted to view
          // space): luminance priority so brighter surfaces render on top, plus
          // a deterministic per-colour hash so coplanar surfaces of EQUAL
          // priority still get a stable winner instead of z-fighting. The hash
          // is a fraction of the priority step, so priority still dominates.
          float priority = dot(color, vec3(0.299, 0.587, 0.114));
          float tie = fract(
            sin(dot(color, vec3(12.9898, 78.233, 37.719))) * 43758.5453
          );
          mvPosition.z += (priority + (tie - 0.5) * 0.25) * depthBiasStrength;
          gl_Position = projectionMatrix * mvPosition;

          #include <clipping_planes_vertex>
        }
      `,fragmentShader:`
        varying vec3 vColor;
        #include <clipping_planes_pars_fragment>

        void main() {
          #include <clipping_planes_fragment>
          gl_FragColor = vec4(vColor, 1.0);
        }
      `}),this._edgeMaterial=new C({uniforms:{tDiffuse:{value:null},width:{value:s}},vertexShader:`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform float width;
        varying vec2 vUv;

        void main() {
          vec2 texel = vec2(1.0 / float(textureSize(tDiffuse, 0).x), 1.0 / float(textureSize(tDiffuse, 0).y));
          vec2 offset = texel * width;
          
          vec4 center = texture2D(tDiffuse, vUv);
          vec4 right = texture2D(tDiffuse, vUv + vec2(offset.x, 0.0));
          vec4 up = texture2D(tDiffuse, vUv + vec2(0.0, offset.y));
          
          float diff = 0.0;
          diff += distance(center.rgb, right.rgb);
          diff += distance(center.rgb, up.rgb);
          gl_FragColor = vec4(vec3(step(0.0001, diff)), 1.0);
        }
      `}),this._combineMaterial=new C({uniforms:{tDiffuse:{value:null},tEdges:{value:null},edgeColor:{value:new k(8947848)}},vertexShader:`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform sampler2D tEdges;
        uniform vec3 edgeColor;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          vec4 edges = texture2D(tEdges, vUv);
          
          // Combine color with edges (edges are black, so we multiply)
          gl_FragColor = mix(color, vec4(edgeColor, 1.0), edges.r);
        }
      `}),this._fsQuad=new oe(this._edgeMaterial),this._edgeRenderTarget=new F(1,1,{minFilter:R,magFilter:R,format:H});const i={minFilter:R,magFilter:R,format:H};if(this._renderer.three.capabilities.reversedDepthBuffer===!0){const r=new Pt(1,1);r.type=st,i.depthTexture=r}this._vertexColorRenderTarget=new F(1,1,i)}setSize(e,t){this._edgeRenderTarget.setSize(e,t),this._vertexColorRenderTarget.setSize(e,t)}setWidth(e){this._edgeMaterial.uniforms.width.value=e}render(e,t,s){const i=this._renderer.currentWorld,r=i.scene.three,a=i.scene.three,o=a.fog,n=a.background;if(a.fog=null,a.background=null,this._mode===0)this.setMaterialToMesh(!0),e.setRenderTarget(this._vertexColorRenderTarget),e.render(r,i.camera.three),this.setMaterialToMesh(!1);else if(this._mode===1){const l=r.overrideMaterial;r.overrideMaterial=this._overrideMaterial,e.setRenderTarget(this._vertexColorRenderTarget),e.render(r,i.camera.three),r.overrideMaterial=l}a.fog=o,a.background=n,this._edgeMaterial.uniforms.tDiffuse.value=this._vertexColorRenderTarget.texture,this._fsQuad.material=this._edgeMaterial,e.setRenderTarget(this._edgeRenderTarget),this._fsQuad.render(e),this._combineMaterial.uniforms.tDiffuse.value=s.texture,this._combineMaterial.uniforms.tEdges.value=this._edgeRenderTarget.texture,this._fsQuad.material=this._combineMaterial,this.renderToScreen?e.setRenderTarget(null):e.setRenderTarget(t),this._fsQuad.render(e)}dispose(){this._edgeMaterial.dispose(),this._combineMaterial.dispose(),this._overrideMaterial.dispose(),this._fsQuad.dispose(),this._edgeRenderTarget.dispose(),this._vertexColorRenderTarget.dispose()}setMaterialToMesh(e){if(this._fragments.initialized){for(const[,t]of this._fragments.core.models.list)for(const[,s]of t.tiles)if(!("isLODGeometry"in s.geometry))if(e){s.userData.edgePassPreviousMaterial=s.material;const i=s.material;if(this.xray)s.material=this._overrideMaterial;else if(Array.isArray(i)){let r=s.userData.edgePassOverrideArray;(!r||r.length!==i.length)&&(r=new Array(i.length).fill(this._overrideMaterial),s.userData.edgePassOverrideArray=r),s.material=r}else s.material=[this._overrideMaterial]}else"edgePassPreviousMaterial"in s.userData&&(s.material=s.userData.edgePassPreviousMaterial)}}}const de=256,J="default",ai=`
  #include <clipping_planes_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
  }
`,oi=`
  #include <clipping_planes_pars_fragment>
  uniform vec4 idColor;
  void main() {
    #include <clipping_planes_fragment>
    gl_FragColor = idColor;
  }
`;class ni extends ee{debugShowMask=!1;_world;_maskTarget;_rootScene;_fsQuad;_debugQuad;_groups=new Map;_groupsById=new Map;_outlinedTiles=new Map;_nextId=1;_maxThickness=2;_paletteData;_paletteTexture;constructor(e,t,s){super(),this._world=s,this._maskTarget=new F(e,t,{minFilter:z,magFilter:z,format:H,type:X,depthBuffer:!0}),this._rootScene=new ve,this._rootScene.background=null,this._paletteData=new Uint8Array(de*2*4),this._paletteTexture=new ke(this._paletteData,de,2,H,X),this._paletteTexture.minFilter=z,this._paletteTexture.magFilter=z,this._paletteTexture.wrapS=$e,this._paletteTexture.wrapT=$e,this._paletteTexture.needsUpdate=!0,this._fsQuad=new oe(new C({uniforms:{tDiffuse:{value:null},tMask:{value:null},tPalette:{value:this._paletteTexture},resolution:{value:new D(e,t)},maxThickness:{value:this._maxThickness}},vertexShader:`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,fragmentShader:`
          precision highp float;
          varying vec2 vUv;

          uniform sampler2D tDiffuse;
          uniform sampler2D tMask;
          uniform sampler2D tPalette;
          uniform vec2 resolution;
          uniform float maxThickness;

          // Palette is 256x2. y=0.25 (row 0) line, y=0.75 (row 1) fill.
          vec4 paletteLine(float id) {
            return texture2D(tPalette, vec2((id + 0.5) / 256.0, 0.25));
          }
          vec4 paletteFill(float id) {
            return texture2D(tPalette, vec2((id + 0.5) / 256.0, 0.75));
          }

          float readId(vec2 uv) {
            return floor(texture2D(tMask, uv).r * 255.0 + 0.5);
          }

          void main() {
            vec4 scene = texture2D(tDiffuse, vUv);
            float centerId = readId(vUv);

            if (centerId < 0.5) {
              gl_FragColor = scene;
              return;
            }

            // Inward outline: we are inside group centerId. Apply its fill,
            // and if any pixel within this group's thickness belongs to a
            // different id, we are near the group's interior silhouette and
            // paint the outline color. This guarantees outlines never spill
            // past the group's own footprint.
            vec4 fill = paletteFill(centerId);
            vec4 line = paletteLine(centerId);
            float t = line.a * 255.0;
            vec2 texel = 1.0 / resolution;

            vec3 rgb = mix(scene.rgb, fill.rgb, fill.a);

            float edge = 0.0;
            for (float y = -maxThickness; y <= maxThickness; y += 1.0) {
              if (abs(y) > t) continue;
              for (float x = -maxThickness; x <= maxThickness; x += 1.0) {
                if (abs(x) > t) continue;
                float nId = readId(vUv + vec2(x, y) * texel);
                if (nId != centerId) { edge = 1.0; break; }
              }
              if (edge > 0.5) break;
            }

            if (edge > 0.5) rgb = line.rgb;
            gl_FragColor = vec4(rgb, 1.0);
          }
        `})),this._debugQuad=new oe(new C({uniforms:{tMask:{value:null}},vertexShader:`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,fragmentShader:`
          uniform sampler2D tMask;
          varying vec2 vUv;
          void main() {
            float id = texture2D(tMask, vUv).r;
            gl_FragColor = vec4(vec3(id * 8.0), 1.0);
          }
        `})),this.addGroup(J,{outlineColor:new k(16762880),fillColor:new k(16776960),fillOpacity:.3,thickness:2})}addGroup(e,t){let s=this._groups.get(e);if(s)return t&&this.configureGroup(e,t),s;const i=this.allocateId(),r=t?.priority??0,a=new C({uniforms:{idColor:{value:new Et(i/255,0,0,1)}},clipping:!0,vertexShader:ai,fragmentShader:oi,depthTest:!0,depthWrite:!0,transparent:!1,polygonOffset:r!==0,polygonOffsetFactor:-r,polygonOffsetUnits:-r}),o=new At;return o.name=`outline-group:${e}`,o.renderOrder=r,this._rootScene.add(o),s={id:i,name:e,container:o,material:a,outlineColor:t?.outlineColor?.clone()??new k(16762880),fillColor:t?.fillColor?.clone()??new k(16776960),fillOpacity:t?.fillOpacity??.3,thickness:t?.thickness??2,priority:r},this._groups.set(e,s),this._groupsById.set(i,s),this.writePaletteEntry(s),this.updateMaxThickness(),s}configureGroup(e,t){const s=this._groups.get(e);s&&(t.outlineColor&&s.outlineColor.copy(t.outlineColor),t.fillColor&&s.fillColor.copy(t.fillColor),t.fillOpacity!==void 0&&(s.fillOpacity=t.fillOpacity),t.thickness!==void 0&&(s.thickness=t.thickness),t.priority!==void 0&&(s.priority=t.priority,s.material.polygonOffset=t.priority!==0,s.material.polygonOffsetFactor=-t.priority,s.material.polygonOffsetUnits=-t.priority,s.container.renderOrder=t.priority),this.writePaletteEntry(s),this.updateMaxThickness())}removeGroup(e){if(e===J)return;const t=this._groups.get(e);if(t){for(const[s,i]of this._outlinedTiles)i.groupName===e&&(i.proxy.removeFromParent(),this._outlinedTiles.delete(s));for(;t.container.children.length;)t.container.children[0].removeFromParent();t.container.removeFromParent(),t.material.dispose(),this._groups.delete(e),this._groupsById.delete(t.id),this.clearPaletteEntry(t.id),this.updateMaxThickness()}}hasGroup(e){return this._groups.has(e)}getGroup(e){return this._groups.get(e)}addMeshToGroup(e,t){let s=this._groups.get(t);s||(s=this.addGroup(t)),e.material=s.material,s.container.add(e)}attachOutlinedTile(e,t,s=J){let i=this._groups.get(s);i||(i=this.addGroup(s));const r=this.getOutlinedTileKey(e,s),a=this._outlinedTiles.get(r);if(a){const h=a.proxy.geometry;h.clearGroups(),this.fillProxyGroups(h,t);return}const o=e.geometry,n=new ge;n.attributes=o.attributes,o.index&&n.setIndex(o.index),n.boundingBox=o.boundingBox,n.boundingSphere=o.boundingSphere,this.fillProxyGroups(n,t);const l=new xe(n,[i.material]);l.matrixAutoUpdate=!1,l.matrixWorldAutoUpdate=!1,l.frustumCulled=!1,l.matrixWorld.copy(e.matrixWorld),i.container.add(l),this._outlinedTiles.set(r,{source:e,proxy:l,groupName:s})}detachOutlinedTile(e,t){if(t!==void 0){const s=this.getOutlinedTileKey(e,t),i=this._outlinedTiles.get(s);if(!i)return;i.proxy.removeFromParent(),this._outlinedTiles.delete(s);return}for(const[s,i]of this._outlinedTiles)i.source===e&&(i.proxy.removeFromParent(),this._outlinedTiles.delete(s))}hasOutlinedTile(e,t){if(t!==void 0)return this._outlinedTiles.has(this.getOutlinedTileKey(e,t));for(const s of this._outlinedTiles.values())if(s.source===e)return!0;return!1}getGroupContainer(e){let t=this._groups.get(e);return t||(t=this.addGroup(e)),t.container}getGroupScene(e){return this.getGroupContainer(e)}listGroups(){return[...this._groups.keys()]}get scene(){return this._groups.get(J).container}get outlineColor(){return this._groups.get(J).outlineColor}set outlineColor(e){this.configureGroup(J,{outlineColor:e})}get thickness(){return this._groups.get(J).thickness}set thickness(e){this.configureGroup(J,{thickness:e})}get fillColor(){return this._groups.get(J).fillColor}set fillColor(e){this.configureGroup(J,{fillColor:e})}get fillOpacity(){return this._groups.get(J).fillOpacity}set fillOpacity(e){this.configureGroup(J,{fillOpacity:e})}setSize(e,t){this._maskTarget.setSize(e,t),this._fsQuad.material.uniforms.resolution.value.set(e,t)}render(e,t,s){const i=this._world.camera.three,r=e.getClearColor(new k),a=e.getClearAlpha();if(e.setClearColor(0,0),e.setRenderTarget(this._maskTarget),e.clear(!0,!0,!1),this._outlinedTiles.size>0)for(const n of this._outlinedTiles.values())n.proxy.matrixWorld.copy(n.source.matrixWorld);if(e.render(this._rootScene,i),e.setClearColor(r,a),this.debugShowMask){const n=this._debugQuad.material;n.uniforms.tMask.value=this._maskTarget.texture,this.renderToScreen?e.setRenderTarget(null):e.setRenderTarget(t),this._debugQuad.render(e);return}const o=this._fsQuad.material;o.uniforms.tDiffuse.value=s.texture,o.uniforms.tMask.value=this._maskTarget.texture,o.uniforms.maxThickness.value=this._maxThickness,this.renderToScreen?e.setRenderTarget(null):e.setRenderTarget(t),this._fsQuad.render(e)}dispose(){this._fsQuad.material.dispose(),this._debugQuad.material.dispose(),this._fsQuad.dispose(),this._debugQuad.dispose(),this._maskTarget.dispose(),this._paletteTexture.dispose();for(const e of this._outlinedTiles.values())e.proxy.removeFromParent();this._outlinedTiles.clear();for(const e of this._groups.values()){for(;e.container.children.length;)e.container.children[0].removeFromParent();e.container.removeFromParent(),e.material.dispose()}this._groups.clear(),this._groupsById.clear()}fillProxyGroups(e,t){const s=t.position,i=t.size,r=Math.min(s.length,i.length);for(let a=0;a<r;a++){const o=s[a],n=i[a],l=n===4294967295?1/0:n;e.addGroup(o,l,0)}}getOutlinedTileKey(e,t){return`${t}:${e.uuid}`}allocateId(){for(let e=0;e<de-1;e++){const t=(this._nextId-1+e)%(de-1)+1;if(!this._groupsById.has(t))return this._nextId=t%(de-1)+1,t}throw new Error(`SimpleOutlinePass: cannot allocate outline group id, ${de-1} groups active.`)}writePaletteEntry(e){const t=e.id,s=t*4,i=(de+t)*4,r=this._paletteData,a=o=>Math.max(0,Math.min(255,Math.round(o)));r[s]=a(e.outlineColor.r*255),r[s+1]=a(e.outlineColor.g*255),r[s+2]=a(e.outlineColor.b*255),r[s+3]=a(e.thickness),r[i]=a(e.fillColor.r*255),r[i+1]=a(e.fillColor.g*255),r[i+2]=a(e.fillColor.b*255),r[i+3]=a(e.fillOpacity*255),this._paletteTexture.needsUpdate=!0}clearPaletteEntry(e){const t=this._paletteData,s=e*4,i=(de+e)*4;for(let r=0;r<4;r++)t[s+r]=0;for(let r=0;r<4;r++)t[i+r]=0;this._paletteTexture.needsUpdate=!0}updateMaxThickness(){let e=1;for(const t of this._groups.values())t.thickness>e&&(e=t.thickness);this._maxThickness=Math.max(1,Math.round(e))}}class li extends ee{materialToExclude=new zs({color:0});_excludedMaterials=new Set;_originalMaterials=new Map;_renderer;_world;_fsQuad;_combineMaterial;_excludedRenderTarget;constructor(e,t){super(),this._renderer=e,this._world=t,this._excludedRenderTarget=new F(1,1,{minFilter:R,magFilter:R,format:H}),this._combineMaterial=new C({uniforms:{tDiffuse:{value:null},tExcluded:{value:null}},vertexShader:`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform sampler2D tExcluded;
        varying vec2 vUv;

        void main() {
          vec4 inputColor = texture2D(tDiffuse, vUv);
          vec4 excludedColor = texture2D(tExcluded, vUv);
          
          // If excluded pixel is black (or very dark), use input color
          // Otherwise, use excluded color
          float excludedLuminance = (excludedColor.r + excludedColor.g + excludedColor.b) / 3.0;
          float threshold = 0.01; // Adjust this threshold as needed
          
          if (excludedLuminance < threshold) {
            gl_FragColor = inputColor;
          } else {
            gl_FragColor = excludedColor;
          }
        }
      `}),this._fsQuad=new oe(this._combineMaterial)}addExcludedMaterial(e){this._excludedMaterials.add(e)}removeExcludedMaterial(e){this._excludedMaterials.delete(e)}clearExcludedMaterials(){this._excludedMaterials.clear()}get excludedMaterials(){return Array.from(this._excludedMaterials)}setSize(e,t){this._excludedRenderTarget.setSize(e,t)}render(e,t,s){const i=this._world.scene.three,r=this._world.camera.three,a=e.getClearColor(new k),o=e.getClearAlpha();e.setClearColor(0,0),this._substituteMaterials(i),e.setRenderTarget(this._excludedRenderTarget),e.render(i,r),this._restoreMaterials(),this._combineMaterial.uniforms.tDiffuse.value=s.texture,this._combineMaterial.uniforms.tExcluded.value=this._excludedRenderTarget.texture,this.renderToScreen?e.setRenderTarget(null):e.setRenderTarget(t),this._fsQuad.render(e),e.setClearColor(a,o)}_substituteMaterials(e){if(e instanceof xe){const t=e.material;if(Array.isArray(t)){for(const s of t)if("isLodMaterial"in s)return}else if("isLodMaterial"in t)return;this._excludedMaterials.has(t)||(this._originalMaterials.set(e,t),e.material=this.materialToExclude)}for(const t of e.children)this._substituteMaterials(t)}_restoreMaterials(){for(const[e,t]of this._originalMaterials)e.material=t;this._originalMaterials.clear()}dispose(){this.materialToExclude.dispose(),this._combineMaterial.dispose(),this._fsQuad.dispose(),this._excludedRenderTarget.dispose(),this._excludedMaterials.clear(),this._originalMaterials.clear()}}class hi extends ee{scene;camera;overrideMaterial;clearColor;clearAlpha;clearDepth;needsSwap;isolatedMaterials=[];_oldClearColor;constructor(e,t,s=null,i=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=s,this.clearColor=i,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new k}render(e,t,s){for(const o of this.isolatedMaterials)o.userData.wasVisibleBasePass!==void 0&&(o.visible=o.userData.wasVisibleBasePass);const i=e.autoClear;e.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth===!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:s),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=i;for(const o of this.isolatedMaterials)o.userData.wasVisibleBasePass=o.visible,o.visible=!1}}function ui(){return new C({clipping:!0,uniforms:{glossExponent:{value:10},fresnelExponent:{value:6},glossFactor:{value:.2},fresnelFactor:{value:1}},vertexShader:`
    varying vec3 vCameraPosition;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    #include <clipping_planes_pars_vertex>
  
    void main() {
       #include <begin_vertex>
       
       vec4 absPosition = vec4(position, 1.0);
       vNormal = normal;
       
       #ifdef USE_INSTANCING
          absPosition = instanceMatrix * absPosition;
          vNormal = (instanceMatrix * vec4(normal, 0.)).xyz;
       #endif
       
       absPosition = modelMatrix * absPosition;
       vNormal = (normalize(modelMatrix * vec4(vNormal, 0.))).xyz;
       
       gl_Position = projectionMatrix * viewMatrix * absPosition;
       
       vCameraPosition = cameraPosition;
       vPosition = absPosition.xyz;
       
       #include <project_vertex>
       #include <clipping_planes_vertex>
    }
    `,fragmentShader:`
    uniform float glossExponent;
    uniform float glossFactor;
    uniform float fresnelExponent;
    uniform float fresnelFactor;

    varying vec3 vCameraPosition;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    #include <clipping_planes_pars_fragment>
  
    void main() {
      #include <clipping_planes_fragment>
      vec3 cameraPixelVec = normalize(vCameraPosition - vPosition);
      float dotProduct = dot(vNormal, cameraPixelVec);

      // Use abs() for both gloss and fresnel to handle DoubleSide materials
      // On back faces, dotProduct is negative, which breaks the fresnel calculation

      float absDotProduct = abs(dotProduct);
      float gloss = absDotProduct;

      // Use absDotProduct instead of dotProduct to prevent values > 1.0
      
      float fresnel = pow(1.0 - absDotProduct, fresnelExponent) * fresnelFactor;

      gloss = pow(gloss, glossExponent) * glossFactor;

      float result = gloss + fresnel;

      gl_FragColor = vec4(result, result, result, 1.);
    }
    `})}class di extends ee{resolution;renderScene;renderCamera;fsQuad;glossOverrideMaterial;glossBuffer;_glossEnabled=!0;get glossEnabled(){return this._glossEnabled}set glossEnabled(e){this._glossEnabled=e;const t=this.fsQuad.material;t.uniforms.glossEnabled.value=e?1:0}get minGloss(){return this.fsQuad.material.uniforms.minGloss.value}set minGloss(e){const t=this.fsQuad.material;t.uniforms.minGloss.value=e}get maxGloss(){return this.fsQuad.material.uniforms.maxGloss.value}set maxGloss(e){const t=this.fsQuad.material;t.uniforms.maxGloss.value=e}get glossExponent(){return this.glossOverrideMaterial.uniforms.glossExponent.value}set glossExponent(e){this.glossOverrideMaterial.uniforms.glossExponent.value=e}get fresnelExponent(){return this.glossOverrideMaterial.uniforms.fresnelExponent.value}set fresnelExponent(e){this.glossOverrideMaterial.uniforms.fresnelExponent.value=e}get glossFactor(){return this.glossOverrideMaterial.uniforms.glossFactor.value}set glossFactor(e){this.glossOverrideMaterial.uniforms.glossFactor.value=e}get fresnelFactor(){return this.glossOverrideMaterial.uniforms.fresnelFactor.value}set fresnelFactor(e){this.glossOverrideMaterial.uniforms.fresnelFactor.value=e}constructor(e,t){super(),this.renderScene=t.scene.three,this.renderCamera=t.camera.three,this.resolution=new D(e.x,e.y),this.fsQuad=new oe,this.fsQuad.material=this.createGlossMaterial(),this.glossBuffer=this.newRenderTarget();const s=ui();this.glossOverrideMaterial=s}dispose(){this.glossBuffer.dispose(),this.glossOverrideMaterial.dispose(),this.fsQuad.dispose()}setSize(e,t){this.glossBuffer.setSize(e,t),this.resolution.set(e,t),this.fsQuad.material.uniforms.screenSize.value.set(this.resolution.x,this.resolution.y,1/this.resolution.x,1/this.resolution.y)}render(e,t,s){const i=t.depthBuffer;t.depthBuffer=!1;const r=this.renderScene.overrideMaterial,a=this.renderScene.background;this.renderScene.background=null,e.setRenderTarget(this.glossBuffer),this.renderScene.overrideMaterial=this.glossOverrideMaterial,e.render(this.renderScene,this.renderCamera),this.renderScene.overrideMaterial=r,this.renderScene.background=a;const o=this.fsQuad.material;o.uniforms.glossBuffer.value=this.glossBuffer.texture,o.uniforms.sceneColorBuffer.value=s.texture,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.fsQuad.render(e)),t.depthBuffer=i}get vertexShader(){return`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `}get fragmentShader(){return`
      uniform sampler2D sceneColorBuffer;
      uniform sampler2D glossBuffer;
      uniform vec4 screenSize;
      uniform float glossEnabled;
      uniform float minGloss;
      uniform float maxGloss;


      varying vec2 vUv;

      vec4 getValue(sampler2D buffer, int x, int y) {
        return texture2D(buffer, vUv + screenSize.zw * vec2(x, y));
      }

      void main() {
        vec4 sceneColor = getValue(sceneColorBuffer, 0, 0);
        
        // Apply gloss effect
        vec3 gloss = getValue(glossBuffer, 0, 0).xyz;
        // Prevent the gloss from being zero, which would break normalize() later
        gloss = max(gloss, vec3(0.001));
        
        vec3 glossEffect = gloss * glossEnabled;

        // Map glossEffect to range [minGloss, maxGloss]
        // All dimensions of the glossEffect are the same, so we can use the x dimension.
        float mappedGloss = minGloss + (maxGloss - minGloss) * glossEffect.x;


        glossEffect = normalize(glossEffect) * mappedGloss;

        vec4 glossedColor = sceneColor + vec4(glossEffect, 0.0);

        // Prevent the glossed color from being darker than zero
        glossedColor = max(glossedColor, vec4(0.0, 0.0, 0.0, sceneColor.a));
        
        gl_FragColor = glossedColor;
      }
    `}createGlossMaterial(){return new C({uniforms:{sceneColorBuffer:{value:null},glossBuffer:{value:null},glossEnabled:{value:this._glossEnabled?1:0},minGloss:{value:-.12},maxGloss:{value:.8},screenSize:{value:new Et(this.resolution.x,this.resolution.y,1/this.resolution.x,1/this.resolution.y)}},vertexShader:this.vertexShader,fragmentShader:this.fragmentShader})}newRenderTarget(){const e=new F(this.resolution.x,this.resolution.y);return e.texture.colorSpace="srgb-linear",e.texture.format=H,e.texture.type=re,e.texture.minFilter=z,e.texture.magFilter=z,e.texture.generateMipmaps=!1,e.stencilBuffer=!1,e}}class ci{renderTarget;depthTexture;_width;_height;constructor(e,t){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.depthTexture=new Pt(this._width,this._height),this.depthTexture.type=st,this.depthTexture.format=Ls,this.depthTexture.minFilter=z,this.depthTexture.magFilter=z,this.renderTarget=new F(this._width,this._height,{count:3,depthTexture:this.depthTexture,minFilter:z,magFilter:z,depthBuffer:!0,stencilBuffer:!1,generateMipmaps:!1});const[s,i,r]=this.renderTarget.textures;s.name="capturedColor",s.type=re,s.format=H,s.minFilter=R,s.magFilter=R,i.name="gNormalOcta",i.type=re,i.format=Kt,i.internalFormat="RG16F",r.name="gFaceId",r.type=X,r.format=H}get width(){return this._width}get height(){return this._height}get colorTexture(){return this.renderTarget.textures[0]}get normalTexture(){return this.renderTarget.textures[1]}get faceIdTexture(){return this.renderTarget.textures[2]}setSize(e,t){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.renderTarget.setSize(this._width,this._height),this.depthTexture.image.width=this._width,this.depthTexture.image.height=this._height,this.depthTexture.needsUpdate=!0}dispose(){this.renderTarget.dispose(),this.depthTexture.dispose()}}const es={value:0};function Qe(d){es.value=d==="veil"?2:d?1:0}const fi={value:.15},ts=16,pi={value:Array.from({length:ts},()=>new L)},mi={value:0},Yt="#include <project_vertex>",gi=`
#include <project_vertex>
  #ifdef TINT
    // 232 to 247 of 255: displaced by the view (see flat-tint.ts in components front). In view space, after the
    // instance and model matrices, so it is the same shift wherever the element's own frame points.
    float displacedBy = vTint.a * 255.0;
    if (displacedBy > 231.5 && displacedBy < 247.5) {
      mvPosition.xyz += (viewMatrix * vec4(flatTintDisplacements[int(displacedBy - 231.5)], 0.0)).xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  #endif
`,yt="gCaptureFaceId = vec4(vCaptureFaceId, captureRole);",vi=`
  // 250 of 255: see-through (see flat-tint.ts in components front). Outside the tint's own guard on purpose: with no
  // tint at all nothing is see-through, and the see-through pass must then draw nothing.
  bool seeThroughHere = false;
  #ifdef TINT
    seeThroughHere = vTint.a > 0.977 && vTint.a < 0.983;
  #endif
  if ((flatTintSeeThroughPass > 0.5) != seeThroughHere) discard;
  // A shaded view of a set: the surface's own colour, unlit, role 0.45 (see setUnlit). Opaque ones only, and what is
  // see-through in its veil alone (its ids pass writes the role the edges read).
  if (flatTintUnlit > 0.5 && captureRole < 0.5 && (!seeThroughHere || flatTintSeeThroughPass > 1.5)) {
    gl_FragColor = vec4(diffuseColor.rgb, gl_FragColor.a);
    gCaptureFaceId.a = 0.45;
  }
  if (seeThroughHere) {
    // The veil: its colour at the opacity the view leaves it (see setSeeThroughOpacity).
    if (flatTintSeeThroughPass > 1.5) gl_FragColor = vec4(gl_FragColor.rgb, flatTintSeeThroughOpacity);
    // Its id as a small hash, for the pass adds up every see-through face over a pixel (see the capture's edges).
    else gCaptureFaceId = vec4(0.03 + 0.2 * fract(sin(vec3(dot(vCaptureFaceId, vec3(12.9898, 78.233, 37.719)),
      dot(vCaptureFaceId, vec3(39.346, 11.135, 83.155)), dot(vCaptureFaceId, vec3(73.156, 52.235, 9.151)))) * 43758.5453), 1.0);
  }
  #ifdef TINT
    // 254 of 255: a flat tint (see flat-tint.ts in components front).
    if (captureRole > 0.3 && captureRole < 0.5 && vTint.a > 0.993 && vTint.a < 0.998) {
      gl_FragColor = vec4(vTint.rgb, gl_FragColor.a);
      gCaptureFaceId.a = 0.3;
    }
    // And a flat tint on a see-through material is laid as solid as on any other: Revit prints a solid surface
    // pattern whole whatever the material lets through. Its colour only (a translucent surface writes no role).
    else if (captureRole > 0.5 && vTint.a > 0.993 && vTint.a < 0.998) {
      gl_FragColor = vec4(vTint.rgb, 1.0);
    }
    // 252 of 255: halftone lines. The face is not repainted (its role drops below the repainted band), so a pen view
    // keeps it paper; the composite greys its lines.
    else if (captureRole > 0.3 && captureRole < 0.5 && vTint.a > 0.985 && vTint.a < 0.991) {
      gCaptureFaceId.a = 0.2;
    }
    // 248 of 255: lines in a colour of their own. The face's colour is the ink's (a pen view lays paper over it), role
    // 0.12: the composite inks its lines in it.
    else if (captureRole > 0.3 && captureRole < 0.5 && vTint.a > 0.9706 && vTint.a < 0.9745) {
      gl_FragColor = vec4(vTint.rgb, gl_FragColor.a);
      gCaptureFaceId.a = 0.12;
    }
  #endif
`;function xi(d){const e=d.userData;if(e.paintsFlatTints||!e.hasCaptureEmission||!e.hasTint)return;e.paintsFlatTints=!0;const t=d.onBeforeCompile;d.onBeforeCompile=function(i,r){t.call(this,i,r),i.fragmentShader.includes(yt)&&(i.uniforms.flatTintDisplacements=pi,i.vertexShader.includes(Yt)&&(i.vertexShader=`uniform vec3 flatTintDisplacements[${ts}];
${i.vertexShader.replace(Yt,gi)}`),i.uniforms.flatTintSeeThroughPass=es,i.uniforms.flatTintUnlit=mi,i.uniforms.flatTintSeeThroughOpacity=fi,i.fragmentShader=`uniform float flatTintSeeThroughPass;
uniform float flatTintUnlit;
uniform float flatTintSeeThroughOpacity;
${i.fragmentShader.replace(yt,`${yt}
${vi}`)}`)};const s=d.customProgramCacheKey.bind(d);d.customProgramCacheKey=()=>`${s()}|flatTint+seeThroughAdded+unlit+flatOverGlass+veil+inkedLines`,d.needsUpdate=!0}class ss{target;_clearColor=new k;_nonEmitters=[];_opaque=[];_translucent=[];_depthWriteSaved=[];onPixels=null;translucentAsOpaque=!1;noOpacityIsGlass=!1;translucentEdges=!1;seeThrough=!1;_edgesTarget=null;_edgesScene=null;_edgesMaterial=null;_edgesCamera=new tt(-1,1,1,-1,0,1);_madeOpaque=[];constructor(e,t){this.target=new ci(e,t)}setSize(e,t){this.target.setSize(e,t)}render(e,t,s,i=!0,r=!1){const a=e.getContext(),o=e.autoClear,n=e.getRenderTarget(),l=t.background;t.background=null,e.getClearColor(this._clearColor);const h=e.getClearAlpha(),p=this.__clock??(()=>{});if(this.classify(t),p("  classify"),e.autoClear=!1,e.setRenderTarget(this.target.renderTarget),this.onPixels?.(this.target.renderTarget.width,this.target.renderTarget.height),i&&r?a.clear(a.DEPTH_BUFFER_BIT):i&&(a.clearBufferfv(a.COLOR,0,[this._clearColor.r,this._clearColor.g,this._clearColor.b,h]),a.clearBufferfv(a.COLOR,1,[0,0,0,0]),a.clearBufferfv(a.COLOR,2,[1,1,1,0]),a.clear(a.DEPTH_BUFFER_BIT)),this.setVisible(this._nonEmitters,!1),p("  ocultar"),this.setVisible(this._translucent,!1),r&&a.drawBuffers([a.NONE,a.NONE,a.NONE]),e.render(t,s),r&&a.drawBuffers([a.COLOR_ATTACHMENT0,a.COLOR_ATTACHMENT1,a.COLOR_ATTACHMENT2]),p("  opacos"),this.setVisible(this._translucent,!0),!r&&this._translucent.length>0&&globalThis.__sinTranslucidos!==!0){this.setVisible(this._opaque,!1),this.suppressDepthWrite();try{a.drawBuffers([a.COLOR_ATTACHMENT0,a.NONE,a.NONE]),e.render(t,s)}finally{a.drawBuffers([a.COLOR_ATTACHMENT0,a.COLOR_ATTACHMENT1,a.COLOR_ATTACHMENT2]),this.restoreDepthWrite(),this.setVisible(this._opaque,!0)}}!r&&this.translucentEdges&&(this._translucent.length>0||this.seeThrough)&&this.translucentEdgesInto(e,t,s,a),p("  translucidos"),this.restoreOpaque(),this.setVisible(this._nonEmitters,!0),this._nonEmitters.length=0,this._opaque.length=0,this._translucent.length=0,e.setRenderTarget(n),e.autoClear=o,t.background=l}classify(e){e.traverse(t=>{const s=t.material;if(!(!s||!t.visible)){if(!this.emits(s)){this._nonEmitters.push(t);return}for(const i of Array.isArray(s)?s:[s])i&&xi(i);this.isTranslucent(s)&&(!this.translucentAsOpaque||this.unseen(s)&&!this.noOpacityIsGlass)?this._translucent.push(t):this.isTranslucent(s)?(this.makeOpaque(s),this._opaque.push(t)):this._opaque.push(t)}})}unseen(e){const t=Array.isArray(e)?e:[e];return t.length>0&&t.every(s=>!s||s.opacity<=0)}makeOpaque(e){for(const t of Array.isArray(e)?e:[e])if(!(!t||this._madeOpaque.some(s=>s.material===t))){if(t.opacity<=0&&!this.noOpacityIsGlass){this._madeOpaque.push({material:t,transparent:t.transparent,opacity:t.opacity,depthWrite:t.depthWrite,visible:t.visible}),t.visible=!1;continue}this._madeOpaque.push({material:t,transparent:t.transparent,opacity:t.opacity,depthWrite:t.depthWrite}),t.transparent=!1,t.opacity=1,t.depthWrite=!0}}restoreOpaque(){for(const e of this._madeOpaque)e.material.transparent=e.transparent,e.material.opacity=e.opacity,e.material.depthWrite=e.depthWrite,e.visible!==void 0&&(e.material.visible=e.visible);this._madeOpaque.length=0}setVisible(e,t){for(const s of e)s.visible=t}emits(e){return Array.isArray(e)?e.some(t=>!!t?.userData?.hasCaptureEmission):!!e?.userData?.hasCaptureEmission}isTranslucent(e){const t=s=>!!s&&(s.transparent===!0||typeof s.opacity=="number"&&s.opacity<1);return Array.isArray(e)?e.some(t):t(e)}suppressDepthWrite(){for(const e of this._translucent){const t=e.material,s=Array.isArray(t)?t:[t];for(const i of s)i?.userData?.hasCaptureEmission&&(this._depthWriteSaved.push({material:i,value:i.depthWrite}),i.depthWrite=!1)}}restoreDepthWrite(){for(const e of this._depthWriteSaved)e.material.depthWrite=e.value;this._depthWriteSaved.length=0}translucentEdgesInto(e,t,s,i){const r=this.target.renderTarget,{width:a,height:o}=this.target;if(this._edgesTarget&&(this._edgesTarget.width!==a||this._edgesTarget.height!==o)&&this.edgesTargetDropped(),!this._edgesTarget){this._edgesTarget=new F(a,o,{count:3,depthTexture:this.target.depthTexture,minFilter:z,magFilter:z,depthBuffer:!0,stencilBuffer:!1,generateMipmaps:!1});const[p,v,u]=this._edgesTarget.textures;p.type=re,v.type=re,v.format=Kt,v.internalFormat="RG16F",u.type=X,u.format=H}if(!this._edgesMaterial){this._edgesMaterial=new Qt({glslVersion:$,uniforms:{faces:{value:null}},vertexShader:`
          in vec3 position;
          void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
        `,fragmentShader:`
          precision highp float;
          precision highp sampler2D;
          uniform sampler2D faces;
          layout(location = 2) out vec4 seed;
          bool differs(vec4 a, vec4 b) {
            if (a.a < 0.5 && b.a < 0.5) return false;   // neither is a see-through surface
            return any(greaterThan(abs(a.rgb - b.rgb), vec3(0.5 / 255.0)));
          }
          void main() {
            ivec2 at = ivec2(gl_FragCoord.xy);
            ivec2 last = textureSize(faces, 0) - 1;
            vec4 here = texelFetch(faces, at, 0);
            vec4 right = texelFetch(faces, min(at + ivec2(1, 0), last), 0);
            vec4 up = texelFetch(faces, min(at + ivec2(0, 1), last), 0);
            if (!differs(here, right) && !differs(here, up)) discard;
            // Unlike its neighbours and never the empty id (1,1,1) nor near zero: a hash of the pixel.
            vec3 h = fract(sin(vec3(dot(vec2(at), vec2(12.9898, 78.233)), dot(vec2(at), vec2(39.346, 11.135)),
              dot(vec2(at), vec2(73.156, 52.235)))) * 43758.5453);
            seed = vec4(0.1 + 0.8 * h, 1.0);
          }
        `,depthTest:!1,depthWrite:!1,blending:Ct,blendEquation:Se,blendSrc:Mt,blendDst:_e,blendSrcAlpha:_e,blendDstAlpha:Mt});const p=new ge;p.setAttribute("position",new Je(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));const v=new xe(p,this._edgesMaterial);v.frustumCulled=!1,this._edgesScene=new ve,this._edgesScene.add(v)}const n=this._translucent.filter(p=>this.unseen(p.material)),l=n.length<this._translucent.length;if(!l&&!this.seeThrough)return;e.setRenderTarget(this._edgesTarget),i.drawBuffers([i.NONE,i.NONE,i.COLOR_ATTACHMENT2]),i.clearBufferfv(i.COLOR,2,[0,0,0,0]);const h=e.state.buffers.depth;h.setMask(!1),h.setLocked(!0),l&&(this.setVisible(this._opaque,!1),this.setVisible(n,!1),e.render(t,s),this.setVisible(n,!0),this.setVisible(this._opaque,!0)),this.seeThrough&&(this.blended(Us,()=>{Qe(!0);try{e.render(t,s)}finally{Qe(!1)}}),e.setRenderTarget(r),i.drawBuffers([i.COLOR_ATTACHMENT0,i.NONE,i.NONE]),this.blended(Zt,()=>{Qe("veil");try{e.render(t,s)}finally{Qe(!1),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1,i.COLOR_ATTACHMENT2])}})),h.setLocked(!1),h.setMask(!0),e.setRenderTarget(r),i.drawBuffers([i.NONE,i.NONE,i.COLOR_ATTACHMENT2]),this._edgesMaterial.uniforms.faces.value=this._edgesTarget.textures[2],e.render(this._edgesScene,this._edgesCamera),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1,i.COLOR_ATTACHMENT2])}blended(e,t){const s=new Map;for(const i of this._opaque){const r=i.material;for(const a of Array.isArray(r)?r:[r])!a||s.has(a)||(s.set(a,[a.blending,a.transparent]),a.blending=e,a.transparent=!0)}try{t()}finally{for(const[i,[r,a]]of s)i.blending=r,i.transparent=a}}edgesTargetDropped(){this._edgesTarget&&(this._edgesTarget.depthTexture=null,this._edgesTarget.dispose(),this._edgesTarget=null)}dispose(){this.edgesTargetDropped(),this.target.dispose(),this._edgesMaterial?.dispose()}}class Y{static _geometry=null;_mesh;_camera;_scene;constructor(e){if(!Y._geometry){const t=new ge;t.setAttribute("position",new Je(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),t.setAttribute("uv",new Je(new Float32Array([0,0,2,0,0,2]),2)),Y._geometry=t}this._camera=new tt(-1,1,1,-1,0,1),this._mesh=new xe(Y._geometry,e),this._mesh.frustumCulled=!1,this._scene=new ve,this._scene.add(this._mesh)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}render(e,t,s=0){const i=e.getRenderTarget(),r=e.autoClear;e.autoClear=!1,e.setRenderTarget(t,0,s),e.render(this._scene,this._camera),e.setRenderTarget(i),e.autoClear=r}dispose(){this.material.dispose()}}const wi=`
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;

  uniform sampler2D uDepthSheet;   // float32 NDC depth in [0,1]
  uniform float uNear;
  uniform float uFar;
  uniform bool uReversed;     // reversed-Z buffer (ZERO_TO_ONE, near->1 far->0)
  uniform bool uOrtho;        // orthographic projection (depth is already linear)

  // NDC depth -> positive linear eye distance. Reversed-Z keeps precision
  // near-uniform with the float32 buffer (no distance z-fighting); standard-Z is
  // the GL default. The host sets uReversed from the renderer's actual depth mode.
  //
  // Orthographic projection maps eye-Z to NDC depth LINEARLY (no perspective
  // divide), so the perspective rational formula below is wrong for it: eye
  // distance is just a linear remap of the [0,1] depth across [near, far]. Without
  // this branch every ortho frame reconstructs nonsensical depths and AO breaks.
  float linearizeDepth(float d) {
    if (uOrtho) {
      // d in [0,1]; reversed-Z flips near<->far. Positive eye distance.
      float t = uReversed ? (1.0 - d) : d;
      return uNear + t * (uFar - uNear);
    }
    if (uReversed) return (uNear * uFar) / (uNear - (uNear - uFar) * d);
    float z = d * 2.0 - 1.0;                       // NDC z in [-1,1]
    return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
  }

  void main() {
    float d = texture(uDepthSheet, vUv).r;
    // Cleared/far texels: depth 0 under reversed-Z, 1 under standard-Z. Mapped to
    // uFar; downstream treats >= uFar as "no geometry".
    bool isFar = uReversed ? (d <= 0.0) : (d >= 1.0);
    outColor = vec4(isFar ? uFar : linearizeDepth(d), 0.0, 0.0, 1.0);
  }
`,bi=`
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;

  uniform sampler2D uFinerLevel;   // finer level (its own target, sampled at lod 0)
  uniform vec2 uSourceTexel;   // 1 / finer-level size
  uniform float uFar;

  void main() {
    // Gather the 2x2 block of the finer level and keep the closest (min) depth.
    // Background/far texels are sentinelled out so they never win the min unless
    // the whole footprint is background.
    vec2 base = vUv - 0.5 * uSourceTexel;
    float a = texture(uFinerLevel, base + uSourceTexel * vec2(0.25, 0.25)).r;
    float b = texture(uFinerLevel, base + uSourceTexel * vec2(0.75, 0.25)).r;
    float c = texture(uFinerLevel, base + uSourceTexel * vec2(0.25, 0.75)).r;
    float d = texture(uFinerLevel, base + uSourceTexel * vec2(0.75, 0.75)).r;
    float SENT = 1.0e9;
    a = a >= uFar ? SENT : a;
    b = b >= uFar ? SENT : b;
    c = c >= uFar ? SENT : c;
    d = d >= uFar ? SENT : d;
    float m = min(min(a, b), min(c, d));
    if (m >= SENT) m = uFar;
    outColor = vec4(m, 0.0, 0.0, 1.0);
  }
`,we=8;class Si{levels;_targets=[];_width;_height;_linearizeMat;_minReduceMat;_quad;constructor(e,t){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.levels=Math.min(we,Math.floor(Math.log2(Math.max(this._width,this._height)))+1),this._linearizeMat=new C({glslVersion:$,vertexShader:this._vertex(),fragmentShader:wi,uniforms:{uDepthSheet:{value:null},uNear:{value:.1},uFar:{value:1e3},uReversed:{value:!1},uOrtho:{value:!1}},depthTest:!1,depthWrite:!1}),this._minReduceMat=new C({glslVersion:$,vertexShader:this._vertex(),fragmentShader:bi,uniforms:{uFinerLevel:{value:null},uSourceTexel:{value:new D},uFar:{value:1e3}},depthTest:!1,depthWrite:!1}),this._quad=new Y(this._linearizeMat),this._allocate()}_vertex(){return`
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `}_levelSize(e){return{w:Math.max(1,this._width>>e),h:Math.max(1,this._height>>e)}}_allocate(){for(const e of this._targets)e.dispose();this._targets=[];for(let e=0;e<this.levels;e++){const{w:t,h:s}=this._levelSize(e),i=new F(t,s,{format:Ce,type:st,minFilter:z,magFilter:z,generateMipmaps:!1,depthBuffer:!1,stencilBuffer:!1});i.texture.name=`hiZLevel${e}`,this._targets.push(i)}}get texture(){return this._targets[0].texture}get textures(){return this._targets.map(e=>e.texture)}setSize(e,t){const s=Math.max(1,Math.floor(e)),i=Math.max(1,Math.floor(t));s===this._width&&i===this._height||(this._width=s,this._height=i,this._allocate())}build(e,t,s){this._linearizeMat.uniforms.uDepthSheet.value=t,this._linearizeMat.uniforms.uNear.value=s.near,this._linearizeMat.uniforms.uFar.value=s.far,this._linearizeMat.uniforms.uReversed.value=e.capabilities.reversedDepthBuffer===!0,this._linearizeMat.uniforms.uOrtho.value=s.projectionMatrix.elements[15]!==0,this._quad.material=this._linearizeMat,this._quad.render(e,this._targets[0]),this._quad.material=this._minReduceMat,this._minReduceMat.uniforms.uFar.value=s.far;for(let i=1;i<this.levels;i++){const r=this._levelSize(i-1);this._minReduceMat.uniforms.uFinerLevel.value=this._targets[i-1].texture,this._minReduceMat.uniforms.uSourceTexel.value.set(1/r.w,1/r.h),this._quad.render(e,this._targets[i])}}dispose(){this._linearizeMat.dispose(),this._minReduceMat.dispose();for(const e of this._targets)e.dispose();this._targets=[]}}const _i=Array.from({length:we},(d,e)=>e===0?null:`    if (lvl == ${e}) result = texture(uHiZ[${e}], uv).r;`).filter(Boolean).join(`
`),yi=`
  precision highp float;
  #define MAX_MIPS ${we}
  in vec2 vUv;
  out vec4 outColor;

  uniform sampler2D uHiZ[MAX_MIPS]; // per-level linear eye depth (Hi-Z min-mip chain)
  uniform sampler2D uNormal;    // RG = octahedral view normal
  uniform sampler2D uFaceId;    // RGBA8: A = role byte (1 = translucent)
  uniform vec2 uDrawnPixels;     // full-res pixel size
  uniform float uMaxMip;
  uniform vec2 uProjScaleXY;    // (P00, P11) of the projection matrix
  uniform float uProjScalePx;   // pixels-per-world-unit (perspective: at unit eye distance; ortho: constant)
  uniform bool uOrtho;          // orthographic projection
  uniform float uRadius;        // world-space AO radius
  uniform float uBias;          // beta: normal self-occlusion bias
  uniform float uEpsilon;       // denominator guard
  uniform float uIntensity;     // sigma
  uniform float uContrast;      // k
  uniform float uFar;
  uniform int uSamples;

  const float TWO_PI = 6.2831853071795864;
  const float SPIRAL_TURNS = 7.0;

  vec3 octDecode(vec2 e) {
    vec3 n = vec3(e.xy, 1.0 - abs(e.x) - abs(e.y));
    if (n.z < 0.0) {
      n.xy = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
    }
    return normalize(n);
  }

  // View-space position from linear eye depth at uv. Perspective: x_view scales
  // with depth (x = ndc.x * z / P00). Orthographic: the eye-X/Y of a pixel is
  // INDEPENDENT of depth (x = ndc.x / P00, where ortho P00 = 2/(r-l)); applying
  // the perspective formula there skews every reconstructed point and breaks AO.
  vec3 viewPos(vec2 uv, float linearDepth) {
    vec2 ndc = uv * 2.0 - 1.0;
    float sx = uOrtho ? 1.0 : linearDepth;
    return vec3(
      ndc.x * sx / uProjScaleXY.x,
      ndc.y * sx / uProjScaleXY.y,
      -linearDepth
    );
  }

  float hash(vec2 p) {
    // Per-pixel spiral rotation (decorrelation).
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  }

  // Sample a chosen Hi-Z level. A sampler array must be indexed by a literal
  // constant integral expression in GLSL ES 3.00, so the level selector is
  // unrolled into literal-indexed branches (generated from MAX_MIPS).
  float sampleHiZ(vec2 uv, int lvl) {
    // Level 0 is the initializer/fallback; higher levels overwrite it. See
    // sampleHiZChain for why this is a single-result/single-return form.
    float result = texture(uHiZ[0], uv).r;
${_i}
    return result;
  }

  void main() {
    float depth = sampleHiZ(vUv, 0);
    if (depth >= uFar) { outColor = vec4(1.0); return; } // background: fully open

    // Translucent surfaces opt out of AO: emit fully open so the denoise has a
    // clean value to spread instead of a hole.
    if (texture(uFaceId, vUv).a > 0.5) { outColor = vec4(1.0); return; }

    vec3 P = viewPos(vUv, depth);
    vec3 N = octDecode(texture(uNormal, vUv).rg);

    // Screen-space disk radius for the world AO radius. Perspective: apparent
    // size shrinks with distance (divide by depth). Orthographic: world->screen
    // scale is constant, so the disk radius is depth-independent.
    float screenRadiusPx = uOrtho ? (uProjScalePx * uRadius)
                                  : (uProjScalePx * uRadius / depth);
    float rotation = hash(gl_FragCoord.xy) * TWO_PI;

    int n = uSamples;
    float occlusion = 0.0;
    for (int i = 0; i < 64; i++) {
      if (i >= n) break;
      float alpha = (float(i) + 0.5) / float(n);
      float angle = alpha * SPIRAL_TURNS * TWO_PI + rotation;
      float sampleRadiusPx = alpha * screenRadiusPx;
      vec2 offsetPx = vec2(cos(angle), sin(angle)) * sampleRadiusPx;
      vec2 sampleUv = vUv + offsetPx / uDrawnPixels;
      if (sampleUv.x < 0.0 || sampleUv.x > 1.0 || sampleUv.y < 0.0 || sampleUv.y > 1.0) continue;

      // Mip selection from screen distance: distant taps read coarser mips so the
      // working set stays bounded (Hi-Z). base step ~ a few texels.
      float mip = clamp(floor(log2(max(sampleRadiusPx, 1.0) / 4.0)), 0.0, uMaxMip);
      float sampleDepth = sampleHiZ(sampleUv, int(mip));
      if (sampleDepth >= uFar) continue;

      // Translucent occluders do not cast AO onto opaque geometry.
      if (texture(uFaceId, sampleUv).a > 0.5) continue;

      vec3 Q = viewPos(sampleUv, sampleDepth);
      vec3 V = Q - P;
      float vv = dot(V, V);
      float vn = dot(V, N);
      occlusion += max(0.0, vn - uBias) / (vv + uEpsilon);
    }

    float ao = max(0.0, 1.0 - (2.0 * uIntensity / float(n)) * occlusion);
    ao = pow(ao, uContrast);
    outColor = vec4(ao, ao, ao, 1.0);
  }
`,Dt={radius:.5,bias:.012,epsilon:.05,intensity:.85,contrast:1,samples:16};class Ti{renderTarget;settings;_material;_quad;_width;_height;constructor(e,t,s=Dt){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.settings={...s},this.renderTarget=new F(this._width,this._height,{format:Ce,type:X,minFilter:R,magFilter:R,depthBuffer:!1,stencilBuffer:!1}),this.renderTarget.texture.name="aoRaw",this._material=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:yi,uniforms:{uHiZ:{value:[]},uNormal:{value:null},uFaceId:{value:null},uDrawnPixels:{value:new D(this._width,this._height)},uMaxMip:{value:1},uProjScaleXY:{value:new D(1,1)},uProjScalePx:{value:1},uOrtho:{value:!1},uRadius:{value:this.settings.radius},uBias:{value:this.settings.bias},uEpsilon:{value:this.settings.epsilon},uIntensity:{value:this.settings.intensity},uContrast:{value:this.settings.contrast},uFar:{value:1e3},uSamples:{value:this.settings.samples}},depthTest:!1,depthWrite:!1}),this._quad=new Y(this._material)}get texture(){return this.renderTarget.texture}setSize(e,t){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.renderTarget.setSize(this._width,this._height),this._material.uniforms.uDrawnPixels.value.set(this._width,this._height)}render(e,t,s,i,r){const a=this._material.uniforms,o=t.textures,n=[];for(let h=0;h<we;h++)n.push(o[Math.min(h,o.length-1)]);a.uHiZ.value=n,a.uNormal.value=s,a.uFaceId.value=i,a.uMaxMip.value=t.levels-1,a.uFar.value=r.far;const l=r.projectionMatrix.elements;a.uProjScaleXY.value.set(l[0],l[5]),a.uProjScalePx.value=.5*this._height*l[5],a.uOrtho.value=r.projectionMatrix.elements[15]!==0,a.uRadius.value=this.settings.radius,a.uBias.value=this.settings.bias,a.uEpsilon.value=this.settings.epsilon,a.uIntensity.value=this.settings.intensity,a.uContrast.value=this.settings.contrast,a.uSamples.value=this.settings.samples,this._quad.render(e,this.renderTarget)}dispose(){this._material.dispose(),this.renderTarget.dispose()}}const Mi=Array.from({length:we},(d,e)=>`    if (slot == ${e}) return texture(uDepthChain[${e}], at).r;`).join(`
`),Ci=`
  precision highp float;
  #define LEVEL_COUNT ${we}
  in vec2 vUv;
  out vec4 outColor;

  uniform sampler2D uDepthChain[LEVEL_COUNT]; // per-level linear eye depth (Hi-Z)
  uniform sampler2D uNormal;       // RG = octahedral view normal
  uniform sampler2D uFaceId;       // RGBA8: A = role byte (1 = translucent)
  uniform vec2 uViewport;          // AO target pixel size
  uniform float uTopLevel;         // highest valid Hi-Z level index
  uniform vec2 uLens;              // (P00, P11) of the projection matrix
  uniform bool uOrtho;             // orthographic projection
  uniform float uHorizon;          // camera far plane
  uniform float uReach;            // hemisphere radius, world units
  uniform float uLift;             // normal push-off, world units
  uniform float uDecay;            // exponential range-falloff rate
  uniform float uPowerValue;            // occlusion strength
  uniform float uForm;            // output contrast (gamma)
  uniform int uRays;               // probe count
  uniform float uVanishStart;      // eye-depth/far where the fade begins
  uniform float uVanishEnd;        // eye-depth/far where AO is fully gone

  const float TAU = 6.2831853071795864;
  const float WHIRL = 6.0;

  vec3 unfoldNormal(vec2 e) {
    vec3 n = vec3(e, 1.0 - abs(e.x) - abs(e.y));
    if (n.z < 0.0) {
      n.xy = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
    }
    return normalize(n);
  }

  // View-space point from a UV and its linear eye distance. Perspective: eye-X/Y
  // scale with depth; orthographic: eye-X/Y are depth-independent (x = ndc.x/P00).
  vec3 unproject(vec2 uv, float eye) {
    vec2 ndc = uv * 2.0 - 1.0;
    float s = uOrtho ? 1.0 : eye;
    return vec3(ndc.x * s / uLens.x, ndc.y * s / uLens.y, -eye);
  }

  // View-space point -> screen UV. Perspective: project with the perspective
  // divide by -z. Orthographic: NO divide — ndc = (P00*x, P11*y) directly; the
  // perspective divide here would warp every probe's screen position under ortho.
  vec2 toScreen(vec3 v) {
    vec2 ndc = uOrtho ? vec2(uLens.x * v.x, uLens.y * v.y)
                      : vec2(uLens.x * v.x, uLens.y * v.y) / (-v.z);
    return ndc * 0.5 + 0.5;
  }

  float scramble(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  }

  // A Hi-Z sampler array must be indexed by a literal in GLSL ES 3.00, so the
  // level pick is unrolled into literal-indexed branches.
  float fetchDepth(vec2 at, int slot) {
${Mi}
    return texture(uDepthChain[0], at).r;
  }

  void main() {
    float eye = fetchDepth(vUv, 0);
    if (eye >= uHorizon) { outColor = vec4(1.0); return; } // background stays open

    // Translucent surfaces opt out of AO: emit fully open so the denoise has a
    // clean value to spread instead of a hole.
    if (texture(uFaceId, vUv).a > 0.5) { outColor = vec4(1.0); return; }

    vec3 P = unproject(vUv, eye);
    vec3 N = unfoldNormal(texture(uNormal, vUv).rg);

    // Per-pixel rotated tangent frame around N.
    vec3 guide = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent = normalize(cross(guide, N));
    vec3 bitangent = cross(N, tangent);
    float spin = scramble(gl_FragCoord.xy) * TAU;

    float zBias = 0.012 * uReach;
    float buried = 0.0;
    int count = uRays;
    for (int i = 0; i < 64; i++) {
      if (i >= count) break;
      float t = (float(i) + 0.5) / float(count);
      float angle = t * WHIRL * TAU + spin;
      float disk = sqrt(t);                       // even areal spread on the disk
      float dome = sqrt(max(0.0, 1.0 - disk * disk));
      vec3 dir = tangent * (cos(angle) * disk)
               + bitangent * (sin(angle) * disk)
               + N * dome;
      // Probe sits at a growing fraction of the world reach, lifted off N.
      vec3 probe = P + dir * (uReach * mix(0.18, 1.0, t)) + N * uLift;
      if (probe.z >= 0.0) continue;               // behind the camera

      vec2 puv = toScreen(probe);
      if (puv.x < 0.0 || puv.x > 1.0 || puv.y < 0.0 || puv.y > 1.0) continue;

      // Coarser Hi-Z for probes that landed far from the centre texel.
      vec2 stepPx = (puv - vUv) * uViewport;
      float span = max(abs(stepPx.x), abs(stepPx.y));
      float slot = clamp(floor(log2(max(span, 1.0) / 4.0)), 0.0, uTopLevel);
      float sceneEye = fetchDepth(puv, int(slot));
      if (sceneEye >= uHorizon) continue;

      // Translucent occluders do not cast AO onto opaque geometry.
      if (texture(uFaceId, puv).a > 0.5) continue;

      // Probe is buried when the scene surface is nearer the camera than it.
      float gap = (-probe.z) - sceneEye;
      if (gap <= zBias) continue;

      vec3 sceneP = unproject(puv, sceneEye);
      float worldDist = length(sceneP - P);
      buried += exp(-worldDist * uDecay / uReach);
    }

    float ao = 1.0 - uPowerValue * buried / float(count);
    ao = pow(clamp(ao, 0.0, 1.0), uForm);

    // Ease the effect off as geometry nears the far plane.
    float fade = clamp(
      (eye / uHorizon - uVanishStart) / max(1.0e-4, uVanishEnd - uVanishStart),
      0.0, 1.0);
    ao = mix(ao, 1.0, fade);

    outColor = vec4(ao, ao, ao, 1.0);
  }
`,Ot={reach:.7,lift:.025,decay:2,power:1.3,shape:1,rays:18,vanishStart:.5,vanishEnd:.9};class Pi{renderTarget;settings;_material;_quad;_width;_height;constructor(e,t,s=Ot){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.settings={...s},this.renderTarget=new F(this._width,this._height,{format:Ce,type:X,minFilter:R,magFilter:R,depthBuffer:!1,stencilBuffer:!1}),this.renderTarget.texture.name="worldAoRaw",this._material=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:Ci,uniforms:{uDepthChain:{value:[]},uNormal:{value:null},uFaceId:{value:null},uViewport:{value:new D(this._width,this._height)},uTopLevel:{value:1},uLens:{value:new D(1,1)},uOrtho:{value:!1},uHorizon:{value:1e3},uReach:{value:this.settings.reach},uLift:{value:this.settings.lift},uDecay:{value:this.settings.decay},uPowerValue:{value:this.settings.power},uForm:{value:this.settings.shape},uRays:{value:this.settings.rays},uVanishStart:{value:this.settings.vanishStart},uVanishEnd:{value:this.settings.vanishEnd}},depthTest:!1,depthWrite:!1}),this._quad=new Y(this._material)}get texture(){return this.renderTarget.texture}setSize(e,t){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.renderTarget.setSize(this._width,this._height),this._material.uniforms.uViewport.value.set(this._width,this._height)}render(e,t,s,i,r){const a=this._material.uniforms,o=t.textures,n=[];for(let h=0;h<we;h++)n.push(o[Math.min(h,o.length-1)]);a.uDepthChain.value=n,a.uNormal.value=s,a.uFaceId.value=i,a.uTopLevel.value=t.levels-1,a.uHorizon.value=r.far;const l=r.projectionMatrix.elements;a.uLens.value.set(l[0],l[5]),a.uOrtho.value=r.projectionMatrix.elements[15]!==0,a.uReach.value=this.settings.reach,a.uLift.value=this.settings.lift,a.uDecay.value=this.settings.decay,a.uPowerValue.value=this.settings.power,a.uForm.value=this.settings.shape,a.uRays.value=this.settings.rays,a.uVanishStart.value=this.settings.vanishStart,a.uVanishEnd.value=this.settings.vanishEnd,this._quad.render(e,this.renderTarget)}dispose(){this._material.dispose(),this.renderTarget.dispose()}}const Ei=`
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;

  uniform sampler2D uOcclusion;        // R = AO
  uniform sampler2D uHiZ;       // R = linear eye depth (level 0)
  uniform sampler2D uNormal;    // RG = octahedral view normal
  uniform vec2 uTexel;          // 1 / resolution
  uniform vec2 uDirection;      // (1,0) horizontal | (0,1) vertical
  uniform int uRadius;          // taps each side
  uniform float uDepthSigma;    // depth edge sensitivity (linear units)
  uniform float uNormalSigma;   // crease sensitivity

  vec3 octDecode(vec2 e) {
    vec3 n = vec3(e.xy, 1.0 - abs(e.x) - abs(e.y));
    if (n.z < 0.0) {
      n.xy = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
    }
    return normalize(n);
  }

  void main() {
    float aoC = texture(uOcclusion, vUv).r;
    float depthC = texture(uHiZ, vUv).r;
    vec3 nC = octDecode(texture(uNormal, vUv).rg);

    float sum = aoC;          // centre tap, weight 1
    float wsum = 1.0;

    for (int i = 1; i <= 16; i++) {
      if (i > uRadius) break;
      float spatial = exp(-float(i * i) / (2.0 * float(uRadius) * float(uRadius)));
      for (int s = -1; s <= 1; s += 2) {
        vec2 off = uDirection * uTexel * float(i * s);
        vec2 uv = vUv + off;
        float ao = texture(uOcclusion, uv).r;
        float depth = texture(uHiZ, uv).r;
        vec3 n = octDecode(texture(uNormal, uv).rg);

        float dd = (depth - depthC) / max(uDepthSigma, 1e-4);
        float wDepth = exp(-dd * dd);
        float nDiff = 1.0 - max(dot(nC, n), 0.0);
        float wNormal = exp(-(nDiff * nDiff) / max(uNormalSigma * uNormalSigma, 1e-6));

        float w = spatial * wDepth * wNormal;
        sum += ao * w;
        wsum += w;
      }
    }

    outColor = vec4(sum / max(wsum, 1e-4), 0.0, 0.0, 1.0);
  }
`,Rt={radius:5,depthSigma:.5,normalSigma:.3};class Ai{settings;outputTarget;_scratch;_material;_quad;_width;_height;constructor(e,t,s=Rt){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.settings={...s};const i={format:Ce,type:X,minFilter:R,magFilter:R,depthBuffer:!1,stencilBuffer:!1};this._scratch=new F(this._width,this._height,i),this.outputTarget=new F(this._width,this._height,i),this._scratch.texture.name="aoDenoiseH",this.outputTarget.texture.name="aoDenoised",this._material=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:Ei,uniforms:{uOcclusion:{value:null},uHiZ:{value:null},uNormal:{value:null},uTexel:{value:new D(1/this._width,1/this._height)},uDirection:{value:new D(1,0)},uRadius:{value:this.settings.radius},uDepthSigma:{value:this.settings.depthSigma},uNormalSigma:{value:this.settings.normalSigma}},depthTest:!1,depthWrite:!1}),this._quad=new Y(this._material)}get texture(){return this.outputTarget.texture}setSize(e,t){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this._scratch.setSize(this._width,this._height),this.outputTarget.setSize(this._width,this._height),this._material.uniforms.uTexel.value.set(1/this._width,1/this._height)}render(e,t,s,i){const r=this._material.uniforms;r.uHiZ.value=s,r.uNormal.value=i,r.uRadius.value=this.settings.radius,r.uDepthSigma.value=this.settings.depthSigma,r.uNormalSigma.value=this.settings.normalSigma,r.uOcclusion.value=t,r.uDirection.value.set(1,0),this._quad.render(e,this._scratch),r.uOcclusion.value=this._scratch.texture,r.uDirection.value.set(0,1),this._quad.render(e,this.outputTarget)}dispose(){this._material.dispose(),this._scratch.dispose(),this.outputTarget.dispose()}}const Di=`
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;

  uniform sampler2D uColor;     // forward-shaded scene colour (HDR-ish, linear)
  uniform sampler2D uOcclusion;        // R = denoised AO
  uniform sampler2D uDepthSheet;     // R = float32 NDC depth in [0,1] (capture depth)
  uniform sampler2D uNormal;    // RG = octahedral view normal
  uniform sampler2D uFaceId;    // RGBA8 packed faceId (+ role byte)
  uniform sampler2D uSeed;      // R = 1.0 where a pixel is a contour seed (pre-pass)
  uniform vec2 uTexel;
  uniform vec2 uProjScaleXY;    // (P00, P11)
  uniform float uNear;
  uniform float uFar;
  uniform bool uReversed;       // reversed-Z buffer (ZERO_TO_ONE, near->1 far->0)
  uniform bool uOrtho;          // orthographic projection

  // Surface colour vs flat "paper" (NPR styles drop the shaded colour and draw
  // on white, so AO reads as shadow and the contour reads as ink).
  uniform float uColorEnabled;  // 0 = paper white, 1 = shaded colour
  uniform vec3 uPaper;          // the paper's colour, linear: white unless a view is drawn on another ground
  // AO
  uniform float uAoStrength;
  // Tonal orientation shade (view-angle darkening)
  uniform float uTonalEnabled; // 0 = off, 1 = on
  uniform float uTonalFloor;   // brightness of fully-grazing surfaces (1 = no effect)
  // Contour
  uniform vec3 uEdgeColor;
  uniform float uEdgeStrength;
  uniform float uContourEnabled; // 0 = no ink, 1 = draw contour
  uniform float uEdgeHalfWidth;  // distance-coverage line half-width (px)
  uniform float uEdgeAA;         // smoothstep softness (px)
  // Sheen
  uniform float uGlossExp;
  uniform float uGlossFactor;
  uniform float uFresnelExp;
  uniform float uFresnelFactor;
  uniform float uSheenOutMin;
  uniform float uSheenOutMax;
  uniform vec3 uSheenColor;
  // Dither
  uniform float uDitherAmount;
  // Cast shadow of the sun (see sun-shadow-pass.ts): a depth map seen from the sun and a flat tone.
  uniform float uSunOn;
  uniform sampler2D uSunDepth;
  uniform mat4 uViewToSunClip;  // this camera's view space -> the sun camera's clip space
  uniform mat4 uViewToSunView;  // this camera's view space -> the sun camera's view space
  uniform float uSunNear;
  uniform float uSunFar;
  uniform float uSunTone;
  uniform float uGroundOn;      // the view's shadows also fall on a plane that is not drawn
  uniform float uGroundAt;      // its height, world +Y
  uniform float uSunNormalBias; // metres the lookup is pushed along the normal, against acne
  uniform float uSunBias;       // metres of slack in the depth comparison
  uniform vec2 uProjOffsetXY;   // ortho (P12, P13), perspective (P8, P9): an off-centre frustum's shift
  // The view's sky (see ViewBackgroundSettings): colours, the crop it is painted inside, and its heights.
  uniform float uSkyOn;
  uniform vec3 uSky;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform mat4 uViewToWorld;
  uniform vec3 uCropCentre;
  uniform vec3 uCropRight;
  uniform vec3 uCropUp;
  uniform vec2 uCropHalf;
  uniform float uSkyTop;        // world height of the crop's top edge; the horizon is at zero
  uniform float uSkyBottom;     // and of its bottom edge

  vec3 octDecode(vec2 e) {
    vec3 n = vec3(e.xy, 1.0 - abs(e.x) - abs(e.y));
    if (n.z < 0.0) {
      n.xy = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
    }
    return normalize(n);
  }

  vec3 viewPos(vec2 uv, float d) {
    vec2 ndc = uv * 2.0 - 1.0;
    // Orthographic eye-X/Y are depth-independent (x = ndc.x / P00); only the
    // perspective frustum scales them by depth.
    float s = uOrtho ? 1.0 : d;
    return vec3(ndc.x * s / uProjScaleXY.x, ndc.y * s / uProjScaleXY.y, -d);
  }

  // The view-space point, exact for an OFF-CENTRE frustum too.
  //
  // viewPos above assumes a symmetric one, which is right for the AO and the sheen and wrong here: the canvas
  // photographs a sheet in tiles, each through a camera cropped to its region, and ignoring the crop put
  // every pixel metres away from where it is — the sun's lookup fell off its map and nothing was shadowed.
  vec3 viewPosExact(vec2 uv, float d) {
    vec2 ndc = uv * 2.0 - 1.0;
    if (uOrtho) {
      return vec3((ndc.x - uProjOffsetXY.x) / uProjScaleXY.x, (ndc.y - uProjOffsetXY.y) / uProjScaleXY.y, -d);
    }
    return vec3(d * (ndc.x + uProjOffsetXY.x) / uProjScaleXY.x, d * (ndc.y + uProjOffsetXY.y) / uProjScaleXY.y, -d);
  }

  // The sky behind the model at this pixel, and whether there is any: none outside the view's crop.
  vec4 skyAt(vec2 uv) {
    if (uSkyOn < 0.5) return vec4(0.0);
    vec3 W = (uViewToWorld * vec4(viewPosExact(uv, uNear), 1.0)).xyz;
    vec3 fromCentre = W - uCropCentre;
    if (abs(dot(fromCentre, uCropRight)) > uCropHalf.x || abs(dot(fromCentre, uCropUp)) > uCropHalf.y) return vec4(0.0);
    float h = W.y;
    vec3 c = h >= 0.0
      ? mix(uHorizon, uSky, uSkyTop > 0.0 ? clamp(h / uSkyTop, 0.0, 1.0) : 1.0)
      : mix(uHorizon, uGround, uSkyBottom < 0.0 ? clamp(h / uSkyBottom, 0.0, 1.0) : 1.0);
    return vec4(c, 1.0);
  }

  // Whether the sun's shadow falls on the view's ground plane at this pixel, where no model was drawn.
  // The plane is where this pixel's ray crosses the ground height; it is in shadow when something the sun's
  // map holds is nearer the sun. A texel the map never wrote (cleared to its far end) holds nothing, so a
  // point beyond the model's box is lit, not dark.
  bool groundInShadow(vec2 uv) {
    if (uSunOn < 0.5 || uGroundOn < 0.5) return false;
    vec3 A = viewPosExact(uv, uNear);
    vec3 B = viewPosExact(uv, uFar);
    float ya = (uViewToWorld * vec4(A, 1.0)).y;
    float yb = (uViewToWorld * vec4(B, 1.0)).y;
    if (abs(yb - ya) < 1e-6) return false;
    float s = (uGroundAt - ya) / (yb - ya);
    if (s < 0.0 || s > 1.0) return false;
    vec3 P = mix(A, B, s);
    vec4 clip = uViewToSunClip * vec4(P, 1.0);
    vec2 suv = clip.xy / clip.w * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) return false;
    float d = texture(uSunDepth, suv).r;
    float t = uReversed ? (1.0 - d) : d;
    if (t >= 0.9999) return false;
    float mapDist = uSunNear + t * (uSunFar - uSunNear);
    float pixelDist = -(uViewToSunView * vec4(P, 1.0)).z;
    return pixelDist > mapDist + uSunBias;
  }

  // NDC depth -> positive linear eye distance. The same mapping the Hi-Z
  // linearize uses, so AO-on and AO-off frames agree. We read the raw capture
  // depth here rather than the Hi-Z level-0 texture, so the composite needs no
  // depth pyramid: with AO off none is built at all. Orthographic depth is already
  // linear in eye-Z, so it gets a plain [near,far] remap, not the perspective
  // rational fit (which would be wrong for it).
  float linearizeDepth(float d) {
    if (uOrtho) {
      float t = uReversed ? (1.0 - d) : d;
      return uNear + t * (uFar - uNear);
    }
    if (uReversed) return (uNear * uFar) / (uNear - (uNear - uFar) * d);
    float z = d * 2.0 - 1.0;
    return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
  }

  // 24-bit packed faceId -> integer (exact). +0.5 rounds the byte channels losslessly.
  int decodeFaceId(vec4 packed) {
    int r = int(packed.r * 255.0 + 0.5);
    int g = int(packed.g * 255.0 + 0.5);
    int b = int(packed.b * 255.0 + 0.5);
    return (r << 16) | (g << 8) | b;
  }

  // Narkowicz ACES rational fit (2015). Input clamped >= 0: a slightly negative
  // channel crosses x < -b/a and tonemaps to a positive hue-shifted value.
  vec3 narkowiczAces(vec3 x) {
    x = max(x, vec3(0.0));
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  float luminanceDither(vec2 fragCoord) {
    return fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Isotropic distance-transform contour coverage at a pixel. A seed pixel is one
  // whose faceId differs from ANY 4-neighbour -- a SYMMETRIC test, so it fires on
  // BOTH sides of every boundary (interior id-change AND silhouette vs the NO_ID
  // background). We then take the Euclidean distance to the nearest seed and ramp
  // coverage with smoothstep, giving a band of uniform perpendicular width at any
  // angle. Because the seed is symmetric and this runs for background pixels too
  // (see main), silhouette and interior edges inflate the same on both sides.
  // Reads the precomputed seed mask (uSeed.r == 1.0 where a pixel's faceId differs from
  // ANY 4-neighbour — the SAME symmetric test, computed once in the seed pre-pass). Single
  // taps instead of re-deriving seeds inline; output is identical.
  //
  // The search window follows the requested width. It used to be a fixed 5x5, so the
  // nearest seed it could see was about 2 px away: any uEdgeHalfWidth past that drew the
  // same line as 2 without saying so, and a caller asking for a wide pen (a drawing at a
  // real paper weight, seen close) got a thin one. The radius is now the band's outer
  // edge, uEdgeHalfWidth + uEdgeAA, rounded up and capped at MAX_EDGE_RADIUS. At the
  // default width (0.6 + 0.7) that is 2, which is the same 25 taps as before.
  float edgeCoverage(vec2 uv0) {
    const int MAX_EDGE_RADIUS = 6;
    int radius = int(clamp(ceil(uEdgeHalfWidth + uEdgeAA), 1.0, float(MAX_EDGE_RADIUS)));
    float best = 1e3;
    for (int oy = -MAX_EDGE_RADIUS; oy <= MAX_EDGE_RADIUS; oy++) {
      if (oy < -radius || oy > radius) continue;
      for (int ox = -MAX_EDGE_RADIUS; ox <= MAX_EDGE_RADIUS; ox++) {
        if (ox < -radius || ox > radius) continue;
        vec2 off = vec2(float(ox), float(oy));
        if (texture(uSeed, uv0 + off * uTexel).r > 0.5) best = min(best, length(off));
      }
    }
    return 1.0 - smoothstep(uEdgeHalfWidth - uEdgeAA, uEdgeHalfWidth + uEdgeAA, best);
  }

  void main() {
    vec3 base = texture(uColor, vUv).rgb;
    float rawDepth = texture(uDepthSheet, vUv).r;
    // Cleared/far texels: depth 0 under reversed-Z, 1 under standard-Z. Mapped to
    // uFar so the background test below fires.
    bool isFar = uReversed ? (rawDepth <= 0.0) : (rawDepth >= 1.0);
    float depth = isFar ? uFar : linearizeDepth(rawDepth);

    // No opaque geometry here. A translucent surface writes colour but (by the
    // capture's depth-write-off rule) no depth, so it lands here too: colour alpha
    // marks it. True background keeps the zero clear alpha and passes through
    // untonemapped, so a zero-alpha clear stays transparent and the page/scene
    // behind shows through. Glass over background has alpha > 0; paper styles paint
    // it white so a pen view stays pure white, colour styles keep the tint.
    if (depth >= uFar) {
      vec4 bg = texture(uColor, vUv);
      if (uColorEnabled < 0.5 && bg.a > 0.001) bg = vec4(uPaper, 1.0);
      // The view's sky, under whatever the pass left here (glass keeps its tint over it).
      vec4 sky = skyAt(vUv);
      if (sky.a > 0.0) bg = vec4(mix(sky.rgb, bg.rgb, bg.a), 1.0);
      // The ground plane's shadow, over whatever is behind: where nothing is painted here, a black of the
      // shadow's strength over the paper, so white prints at the tone exactly (a tone of 0.40 prints 102 of 255).
      if (groundInShadow(vUv)) {
        bg = bg.a > 0.001 ? vec4(bg.rgb * uSunTone, bg.a) : vec4(0.0, 0.0, 0.0, 1.0 - uSunTone);
      }
      vec3 bgCol = bg.rgb;
      // Silhouette ink on the BACKGROUND side: without this the outline only
      // grows inward from geometry, so silhouettes read half as thick as interior
      // edges. A background pixel within the line half-width of a silhouette gets
      // the same coverage ramp, so exterior and interior lines inflate equally.
      if (uContourEnabled > 0.5) {
        float covBg = edgeCoverage(vUv);
        if (covBg > 0.0) {
          float a = bg.a;
          outColor = vec4(mix(bgCol, uEdgeColor, uEdgeStrength * covBg),
                          max(a, uEdgeStrength * covBg));
          return;
        }
      }
      outColor = bg;
      return;
    }

    vec3 P = viewPos(vUv, depth);
    vec3 N = octDecode(texture(uNormal, vUv).rg);
    vec4 faceTexel = texture(uFaceId, vUv);
    int idC = decodeFaceId(faceTexel);
    // Role byte (faceId alpha): 1 = translucent surface. Those are excluded from
    // ambient occlusion, so they never read as darkened glass.
    bool translucent = faceTexel.a > 0.5;

    // View direction. Perspective: rays diverge from the eye at the origin, so it
    // is normalize(-P). Orthographic: all rays are parallel down the view axis, so
    // V is the constant +Z (toward the camera) — using normalize(-P) under ortho
    // makes N.V vary across a flat plane and produces a spurious moving hotspot.
    vec3 V = uOrtho ? vec3(0.0, 0.0, 1.0) : normalize(-P);

    // --- Surface colour vs paper ---
    // Tonemap ONLY the real shaded colour here (scene-referred HDR -> display
    // range). The pen styles then drop it for flat display-white paper, so the AO,
    // tonal shade and contour below read as graphite shadow + ink on TRUE white,
    // never a tonemapped off-white. Everything past this point is display-referred.
    // A surface printed in its own colour (role 0.45, see setUnlit in flat-tint.ts) is display-referred already.
    bool ownColour = faceTexel.a > 0.425 && faceTexel.a < 0.5;
    vec3 shaded = ownColour ? clamp(base, 0.0, 1.0) : narkowiczAces(base);
    // A surface its view repaints keeps the paint on paper too (role 0.4, written by fragments' capture only
    // for a tinted shell): DACH's line drawings print their furniture beige, not white.
    bool repainted = faceTexel.a > 0.25 && faceTexel.a < 0.5;
    // And one it fills SOLID (role 0.3, see flat-tint.ts) is paint on the paper: its colour as stated, unlit, with no
    // occlusion, facing shade or sheen, as Revit prints a solid surface-pattern override.
    bool flatPaint = faceTexel.a > 0.25 && faceTexel.a < 0.35;
    vec3 surface = flatPaint ? clamp(base, 0.0, 1.0) : mix(uPaper, shaded, repainted ? 1.0 : uColorEnabled);

    // --- AO multiply ---
    // Translucent surfaces opt out entirely (ao = 1, fully lit).
    float ao = translucent || flatPaint ? 1.0 : texture(uOcclusion, vUv).r;
    ao = mix(1.0, ao, uAoStrength);
    vec3 colour = surface * ao;

    // --- Cast shadow (flat) ---
    // Is this point the first thing the sun meets along its ray? Read in the sun's own depth map, after
    // pushing the point a little off its surface along the normal so a face does not shadow itself.
    // What is behind something else, as the sun sees it, takes one flat tone: a drawing's shadow, not a
    // lighting term. Before the contour, so the ink stays black over it; translucent surfaces opt out.
    // 🔴 BELOW THE GROUND PLANE, THE PLANE TAKES THE SHADOW. A surface lower than the view's ground plane is
    // under it: the shadow is read where this pixel's ray crosses the plane, as for a pixel with no model.
    // Measured on racbasic's site plan: the ground falls to -6 m south of the house, and shaded where it lay
    // the house threw a long blot across it; a plan shadow should stop where the
    // ground drops below Level 1.
    // Only where the view looks down through the plane: an elevation's rays run along it and never cross it,
    // so a surface there keeps its own shadow.
    float viewDrop = (uViewToWorld * vec4(viewPosExact(vUv, uNear), 1.0)).y - (uViewToWorld * vec4(viewPosExact(vUv, uFar), 1.0)).y;
    bool underTheGround = uSunOn > 0.5 && uGroundOn > 0.5 && viewDrop > 1e-3
      && (uViewToWorld * vec4(viewPosExact(vUv, depth), 1.0)).y < uGroundAt - uSunBias;
    if (underTheGround && !translucent) {
      if (groundInShadow(vUv)) colour *= pow(uSunTone, 2.2);
    } else if (uSunOn > 0.5 && !translucent) {
      // 🔴 A FACE THE SUN GRAZES IS NOT ASKED OF THE MAP WITH A FLAT SLACK. An elevation's sun stands ten degrees up
      // (DACH 4-01's three elevations), nearly along every floor, roof and return wall, and there one texel of the map
      // spans metres of the face: with a fixed slack those faces came out striped, lit and shadowed by turns. The
      // slack grows as the face turns along the light, and a face turned away from it is in shadow with no lookup,
      // as it is in the original. (The normal is taken towards the eye: a face is drawn from either side.)
      vec3 toSun = normalize(transpose(mat3(uViewToSunView)) * vec3(0.0, 0.0, 1.0));
      vec3 seen = N.z < 0.0 ? -N : N;
      float facing = dot(seen, toSun);
      float slack = min(8.0, 1.0 / max(facing, 0.125));
      vec3 Pn = viewPosExact(vUv, depth) + N * uSunNormalBias * slack;
      vec4 clip = uViewToSunClip * vec4(Pn, 1.0);
      vec2 suv = clip.xy / clip.w * 0.5 + 0.5;
      if (facing <= 0.02) {
        colour *= pow(uSunTone, 2.2);
      } else if (suv.x >= 0.0 && suv.x <= 1.0 && suv.y >= 0.0 && suv.y <= 1.0) {
        float d = texture(uSunDepth, suv).r;
        float t = uReversed ? (1.0 - d) : d;
        float mapDist = uSunNear + t * (uSunFar - uSunNear);
        float pixelDist = -(uViewToSunView * vec4(Pn, 1.0)).z;
        // The tone is a fraction of the PRINTED light (a tone of 0.40 prints 102 of 255), and
        // this colour is encoded with gamma 2.2 at the end, so the fraction is decoded here. Multiplied as it
        // came, 0.40 printed as 0.66 and the site plan's shadows read pale grey where the original is dark.
        if (pixelDist > mapDist + uSunBias * slack) colour *= pow(uSunTone, 2.2);
      }
    }

    // --- Tonal orientation shade ---
    // Cheap form cue: surfaces facing the camera keep full brightness, grazing
    // surfaces fall toward uTonalFloor. abs() so DoubleSide back-faces shade
    // too. A multiply (like AO), so it darkens without shifting hue.
    float facing = abs(dot(N, V));
    float tonal = mix(uTonalFloor, 1.0, facing);
    colour *= flatPaint ? 1.0 : mix(1.0, tonal, uTonalEnabled);

    // --- Sheen (grazing-edge sheen + facing highlight) ---
    // gloss  = pow(1 - N.V): peaks at GRAZING angles -> a thin rim sheen.
    // facing = pow(N.V):     peaks when the surface faces the camera -> a soft
    //          central highlight. On a large matte plane (roof/slab) that facing
    //          highlight reads as a stray "reflected light" hotspot that slides
    //          around as the camera moves (and, before the ortho fix above, sat
    //          wherever N.V happened to peak). It is additive white on top of the
    //          matte colour, so it vanishes when Surface colour is off (the paper
    //          is already white). The facing term is off by default (factor 0) so
    //          matte surfaces stay matte; raise uFresnelFactor to opt back in.
    float NdotV = max(dot(N, V), 0.0);
    float gloss = uGlossFactor * pow(1.0 - NdotV, uGlossExp);
    float facingHighlight = uFresnelFactor * pow(NdotV, uFresnelExp);
    float combined = uSheenOutMin + (uSheenOutMax - uSheenOutMin) * (gloss + facingHighlight);
    if (!flatPaint && !ownColour) colour += uSheenColor * combined;

    // --- faceId contour ---
    // Isotropic distance-transform coverage (see edgeCoverage). A hard 1px id
    // test inks exactly one pixel per scanline, so a diagonal staircases ~sqrt(2)
    // thicker than an axis-aligned edge; ramping coverage by the Euclidean
    // distance to the nearest edge instead gives a band of uniform perpendicular
    // width at every orientation. The silhouette's outer (background) side is
    // inked in the background branch above so exterior and interior lines match.
    if (uContourEnabled > 0.5) {
      float coverage = edgeCoverage(vUv);
      // Halftone lines (role 0.2, see flat-tint.ts): the ink half way to the paper, as Revit draws them.
      bool halftoneInk = faceTexel.a > 0.15 && faceTexel.a < 0.25;
      // Lines in a colour of their own (role 0.12, see flat-tint.ts): the colour the capture left where the face's is.
      bool ownInk = faceTexel.a > 0.09 && faceTexel.a < 0.15;
      vec3 ink = ownInk ? clamp(base, 0.0, 1.0) : halftoneInk ? mix(uEdgeColor, uPaper, 0.6) : uEdgeColor;
      colour = mix(colour, ink, uEdgeStrength * coverage);
    }

    // --- sRGB encode -> dither ---
    // No second tonemap: the shaded term was already tonemapped above, and the
    // paper / AO / ink composite in display space. Only the gamma encode remains.
    colour = pow(colour, vec3(1.0 / 2.2)); // sRGB-ish encode (gamma 2.2)
    colour += (luminanceDither(gl_FragCoord.xy) - 0.5) * uDitherAmount;

    outColor = vec4(colour, 1.0);
  }
`,Oi=`
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  uniform sampler2D uFaceId;
  uniform vec2 uTexel;
  // The view's crop on the frame (min x, min y, max x, max y, in uv). Outside it the model was clipped away,
  // not absent, so the change from model to nothing there is not a silhouette and seeds no line.
  uniform vec4 uCropUv;
  int decodeFaceId(vec4 packed) {
    int r = int(packed.r * 255.0 + 0.5);
    int g = int(packed.g * 255.0 + 0.5);
    int b = int(packed.b * 255.0 + 0.5);
    return (r << 16) | (g << 8) | b;
  }
  bool inCrop(vec2 uv) {
    return uv.x >= uCropUv.x && uv.y >= uCropUv.y && uv.x <= uCropUv.z && uv.y <= uCropUv.w;
  }
  bool differs(int c, vec2 uv) {
    return inCrop(uv) && decodeFaceId(texture(uFaceId, uv)) != c;
  }
  void main() {
    if (!inCrop(vUv)) {
      outColor = vec4(0.0);
      return;
    }
    int c = decodeFaceId(texture(uFaceId, vUv));
    bool isEdge = differs(c, vUv + vec2(uTexel.x, 0.0)) || differs(c, vUv + vec2(0.0, uTexel.y))
      || differs(c, vUv + vec2(-uTexel.x, 0.0)) || differs(c, vUv + vec2(0.0, -uTexel.y));
    outColor = vec4(isEdge ? 1.0 : 0.0);
  }
`,qt=new Et(-1,-1,2,2),ye={colorEnabled:!0,contourEnabled:!0,aoStrength:1,tonalShadingEnabled:!0,tonalFloor:.7,edgeColor:new k(0,0,0),paperColor:new k(1,1,1),edgeStrength:.8,edgeHalfWidth:.6,edgeAA:.7,glossExp:10,glossFactor:.2,fresnelExp:7,fresnelFactor:0,sheenOutMin:0,sheenOutMax:.5,sheenColor:new k(1,1,1),ditherAmount:1/255},Ri=new k(1,1,1);class Ni{settings;_material;_quad;_width;_height;_seedMaterial;_seedQuad;_seedTarget;constructor(e,t,s=ye){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.settings={...s,paperColor:(s.paperColor??new k(1,1,1)).clone()},this._seedMaterial=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:Oi,uniforms:{uFaceId:{value:null},uTexel:{value:new D(1/this._width,1/this._height)},uCropUv:{value:qt.clone()}},depthTest:!1,depthWrite:!1}),this._seedQuad=new Y(this._seedMaterial),this._seedTarget=new F(this._width,this._height,{type:X,format:Ce,minFilter:z,magFilter:z,depthBuffer:!1,stencilBuffer:!1}),this._seedTarget.texture.name="contourSeed",this._material=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:Di,uniforms:{uColor:{value:null},uOcclusion:{value:null},uDepthSheet:{value:null},uNormal:{value:null},uFaceId:{value:null},uSeed:{value:this._seedTarget.texture},uTexel:{value:new D(1/this._width,1/this._height)},uProjScaleXY:{value:new D(1,1)},uNear:{value:.1},uFar:{value:1e3},uReversed:{value:!1},uOrtho:{value:!1},uColorEnabled:{value:this.settings.colorEnabled?1:0},uPaper:{value:this.settings.paperColor},uContourEnabled:{value:this.settings.contourEnabled?1:0},uAoStrength:{value:this.settings.aoStrength},uTonalEnabled:{value:this.settings.tonalShadingEnabled?1:0},uTonalFloor:{value:this.settings.tonalFloor},uEdgeColor:{value:this.settings.edgeColor},uEdgeStrength:{value:this.settings.edgeStrength},uEdgeHalfWidth:{value:this.settings.edgeHalfWidth},uEdgeAA:{value:this.settings.edgeAA},uGlossExp:{value:this.settings.glossExp},uGlossFactor:{value:this.settings.glossFactor},uFresnelExp:{value:this.settings.fresnelExp},uFresnelFactor:{value:this.settings.fresnelFactor},uSheenOutMin:{value:this.settings.sheenOutMin},uSheenOutMax:{value:this.settings.sheenOutMax},uSheenColor:{value:this.settings.sheenColor},uDitherAmount:{value:this.settings.ditherAmount},uSunOn:{value:0},uSunDepth:{value:null},uViewToSunClip:{value:new ae},uViewToSunView:{value:new ae},uSunNear:{value:.01},uSunFar:{value:10},uSunTone:{value:1},uGroundOn:{value:0},uGroundAt:{value:0},uSunNormalBias:{value:0},uSunBias:{value:0},uProjOffsetXY:{value:new D(0,0)},uSkyOn:{value:0},uSky:{value:new L},uHorizon:{value:new L},uGround:{value:new L},uViewToWorld:{value:new ae},uCropCentre:{value:new L},uCropRight:{value:new L(1,0,0)},uCropUp:{value:new L(0,1,0)},uCropHalf:{value:new D},uSkyTop:{value:0},uSkyBottom:{value:0}},depthTest:!1,depthWrite:!1}),this._quad=new Y(this._material)}setSize(e,t){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this._material.uniforms.uTexel.value.set(1/this._width,1/this._height),this._seedMaterial.uniforms.uTexel.value.set(1/this._width,1/this._height),this._seedTarget.setSize(this._width,this._height)}render(e,t,s,i,r,a,o){this._cropOnFrame(i,o??null,this._seedMaterial.uniforms.uCropUv.value);const n=this._material.uniforms;if(n.uSkyOn.value=a?1:0,a){i.updateMatrixWorld(),n.uSky.value.fromArray(a.sky),n.uHorizon.value.fromArray(a.horizon),n.uGround.value.fromArray(a.ground),n.uViewToWorld.value.copy(i.matrixWorld),n.uCropCentre.value.copy(a.centre),n.uCropRight.value.copy(a.right).normalize(),n.uCropUp.value.copy(a.up).normalize(),n.uCropHalf.value.set(a.width/2,a.height/2);const p=n.uCropUp.value.y*(a.height/2);n.uSkyTop.value=a.centre.y+Math.abs(p),n.uSkyBottom.value=a.centre.y-Math.abs(p)}if(n.uSunOn.value=r?1:0,r){i.updateMatrixWorld(),n.uSunDepth.value=r.depth,n.uViewToSunView.value.multiplyMatrices(r.camera.matrixWorldInverse,i.matrixWorld),n.uViewToSunClip.value.multiplyMatrices(r.camera.projectionMatrix,n.uViewToSunView.value),n.uSunNear.value=r.camera.near,n.uSunFar.value=r.camera.far,n.uSunTone.value=r.tone;const p=r.groundAt??null;n.uGroundOn.value=p===null?0:1,n.uGroundAt.value=p??0,n.uViewToWorld.value.copy(i.matrixWorld),n.uSunNormalBias.value=r.texel*1.5,n.uSunBias.value=r.texel}n.uColor.value=s.color,n.uOcclusion.value=s.ao,n.uDepthSheet.value=s.depth,n.uNormal.value=s.normal,n.uFaceId.value=s.faceId,n.uNear.value=i.near,n.uFar.value=i.far,n.uReversed.value=e.capabilities.reversedDepthBuffer===!0,n.uOrtho.value=i.projectionMatrix.elements[15]!==0;const l=i.projectionMatrix.elements;n.uProjScaleXY.value.set(l[0],l[5]),n.uOrtho.value?n.uProjOffsetXY.value.set(l[12],l[13]):n.uProjOffsetXY.value.set(l[8],l[9]);const h=this.settings;if(n.uColorEnabled.value=h.colorEnabled?1:0,n.uPaper.value=h.paperColor??Ri,n.uEdgeColor.value=h.edgeColor,n.uContourEnabled.value=h.contourEnabled?1:0,n.uAoStrength.value=h.aoStrength,n.uTonalEnabled.value=h.tonalShadingEnabled?1:0,n.uTonalFloor.value=h.tonalFloor,n.uEdgeStrength.value=h.edgeStrength,n.uEdgeHalfWidth.value=h.edgeHalfWidth,n.uEdgeAA.value=h.edgeAA,n.uGlossExp.value=h.glossExp,n.uGlossFactor.value=h.glossFactor,n.uFresnelExp.value=h.fresnelExp,n.uFresnelFactor.value=h.fresnelFactor,n.uSheenOutMin.value=h.sheenOutMin,n.uSheenOutMax.value=h.sheenOutMax,n.uDitherAmount.value=h.ditherAmount,h.contourEnabled){const p=e.getRenderTarget();this._seedMaterial.uniforms.uFaceId.value=s.faceId,this._seedQuad.render(e,this._seedTarget),e.setRenderTarget(p)}this._quad.render(e,t)}_corner=new L;_cropOnFrame(e,t,s){if(s.copy(qt),!t||!e.isOrthographicCamera)return;e.updateMatrixWorld();let i=1/0,r=1/0,a=-1/0,o=-1/0;for(const n of[-1,1])for(const l of[-1,1]){const h=this._corner.copy(t.centre).addScaledVector(t.right,n*t.width/2/t.right.length()).addScaledVector(t.up,l*t.height/2/t.up.length()).project(e);i=Math.min(i,h.x*.5+.5),a=Math.max(a,h.x*.5+.5),r=Math.min(r,h.y*.5+.5),o=Math.max(o,h.y*.5+.5)}[i,r,a,o].every(Number.isFinite)&&s.set(i,r,a,o)}dispose(){this._material.dispose(),this._seedMaterial.dispose(),this._seedTarget.dispose()}}const Fi=`
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;

  uniform sampler2D uImage;
  uniform vec2 uTexel;

  const float EDGE_MIN = 1.0 / 24.0;
  const float EDGE_THRESHOLD = 1.0 / 8.0;
  const float SUBPIX = 0.75;
  const float SPAN_MAX = 8.0;

  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    vec4 texM = texture(uImage, vUv);
    vec3 rgbM = texM.rgb;
    float lumaHere = luma(rgbM);
    float lNW = luma(texture(uImage, vUv + vec2(-uTexel.x, -uTexel.y)).rgb);
    float lNE = luma(texture(uImage, vUv + vec2( uTexel.x, -uTexel.y)).rgb);
    float lSW = luma(texture(uImage, vUv + vec2(-uTexel.x,  uTexel.y)).rgb);
    float lSE = luma(texture(uImage, vUv + vec2( uTexel.x,  uTexel.y)).rgb);

    float lMin = min(lumaHere, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lumaHere, max(max(lNW, lNE), max(lSW, lSE)));
    float range = lMax - lMin;

    // Not an edge: pass through (alpha preserved so a transparent background survives).
    if (range < max(EDGE_MIN, lMax * EDGE_THRESHOLD)) {
      outColor = vec4(rgbM, texM.a);
      return;
    }

    // Edge direction from the corner luma gradient.
    vec2 dir;
    dir.x = -((lNW + lNE) - (lSW + lSE));
    dir.y =  ((lNW + lSW) - (lNE + lSE));

    float reduce = max((lNW + lNE + lSW + lSE) * 0.25 * (1.0 / 8.0), 1.0 / 128.0);
    float rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcpMin, -SPAN_MAX, SPAN_MAX) * uTexel;

    vec3 rgbA = 0.5 * (
      texture(uImage, vUv + dir * (1.0 / 3.0 - 0.5)).rgb +
      texture(uImage, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
    vec3 rgbB = rgbA * 0.5 + 0.25 * (
      texture(uImage, vUv + dir * -0.5).rgb +
      texture(uImage, vUv + dir * 0.5).rgb);

    float lumaFar = luma(rgbB);
    vec3 result = (lumaFar < lMin || lumaFar > lMax) ? rgbA : rgbB;
    outColor = vec4(mix(rgbM, result, SUBPIX), texM.a);
  }
`;class zi{_material;_quad;constructor(e,t){this._material=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:Fi,uniforms:{uImage:{value:null},uTexel:{value:new D(1/Math.max(1,e),1/Math.max(1,t))}},depthTest:!1,depthWrite:!1}),this._quad=new Y(this._material)}setSize(e,t){this._material.uniforms.uTexel.value.set(1/Math.max(1,e),1/Math.max(1,t))}render(e,t,s){this._material.uniforms.uImage.value=t,this._quad.render(e,s)}dispose(){this._material.dispose()}}const V=16,Ui=`
  precision highp float;
  uniform sampler2D uDepthSheet;
  uniform ivec2 uSize;
  uniform bool uReversed;
  void main() {
    ivec2 block = ivec2(gl_FragCoord.xy);
    ivec2 from = block * uSize / ${V};
    ivec2 to = (block + 1) * uSize / ${V};
    float nearest = uReversed ? 0.0 : 1.0;
    float farthest = uReversed ? 1.0 : 0.0;
    float seen = 0.0;
    // A block is walked in steps so a large pass costs a bounded number of reads; a surface narrower than a
    // step can be missed, which only makes the map slightly smaller than it could be at worst.
    ivec2 span = max(to - from, ivec2(1));
    ivec2 step = max(span / 24, ivec2(1));
    for (int y = from.y; y < to.y; y += step.y) {
      for (int x = from.x; x < to.x; x += step.x) {
        float d = texelFetch(uDepthSheet, ivec2(x, y), 0).r;
        // Cleared texels are no surface: nothing there to receive a shadow.
        if (uReversed ? d <= 0.0 : d >= 1.0) continue;
        seen = 1.0;
        nearest = uReversed ? max(nearest, d) : min(nearest, d);
        farthest = uReversed ? min(farthest, d) : max(farthest, d);
      }
    }
    gl_FragColor = vec4(nearest, farthest, seen, 1.0);
  }
`;class Li{camera=new tt(-1,1,1,-1,.01,10);_capture=null;_captures=new Map;_side=0;_ranges=null;_rangeQuad=null;_rangePixels=new Float32Array(V*V*4);onPixels=null;lastFit=null;get depthTexture(){return this._capture?.target.depthTexture??null}get texelInMetres(){return this._side>0?(this.camera.right-this.camera.left)/this._side:0}render(e,t,s,i,r){const a=Math.max(256,Math.min(8192,Math.round(s.resolution??4096))),o=s.bounds.getCenter(new L),n=Math.max(.001,s.bounds.getSize(new L).length()/2),l=s.towardSun.clone().normalize();this.camera.position.copy(o).addScaledVector(l,n*2),this.camera.up.set(0,1,0),Math.abs(l.y)>.99&&this.camera.up.set(0,0,1),this.camera.lookAt(o),this.camera.updateMatrixWorld(!0);const{sides:h,side:p}=this.fitTo(e,s.bounds,n,a,r??null,s.groundAt??null),[v,u,c,m]=h;let x=this._captures.get(p);x||(x=new ss(p,p),this._captures.set(p,x)),x.onPixels=this.onPixels,this._capture=x,this._side=p,this.camera.left=v,this.camera.right=u,this.camera.top=m,this.camera.bottom=c,this.camera.near=n*.5,this.camera.far=n*3.5,this.camera.updateProjectionMatrix(),this.camera.updateMatrixWorld(!0);const b=[];for(const g of i)g.visible&&(g.visible=!1,b.push(g));this._capture.render(e,t,this.camera,!0,!globalThis.__sunFullCapture);for(const g of b)g.visible=!0}fitTo(e,t,s,i,r,a=null){const o=[-s,s,-s,s],n=(f,w)=>!globalThis.__sunFixedSide&&Number.isFinite(w)&&w>0?Math.min(i,Math.max(256,2**Math.ceil(Math.log2(f/w)))):i,l=(f,w,S=2*s,A=0)=>{this.lastFit={width:S,texel:S/w,blocksSeen:A,why:f}};if(!r||!r.width||!r.height)return l("no pass to fit to",i),{sides:o,side:i};const h=new L(0,0,.5).unproject(r.camera).distanceTo(new L(2/r.width,0,.5).unproject(r.camera)),p=(f,w=0)=>{const S=n(2*s,h);return l(f,S,2*s,w),{sides:o,side:S}},v=this.camera.matrixWorldInverse,u=new L,c=()=>({lowX:1/0,highX:-1/0,lowY:1/0,highY:-1/0}),m=f=>(w,S,A)=>{u.set(w,S,A).unproject(r.camera).applyMatrix4(v),f.lowX=Math.min(f.lowX,u.x),f.highX=Math.max(f.highX,u.x),f.lowY=Math.min(f.lowY,u.y),f.highY=Math.max(f.highY,u.y)},x=new L,b=f=>{if(a===null)return;const w=r.reversed?1:-1,S=r.reversed?0:1;for(const[A,W]of[[-1,-1],[1,-1],[-1,1],[1,1]]){x.set(A,W,w).unproject(r.camera),u.set(A,W,S).unproject(r.camera);const G=u.y-x.y;if(Math.abs(G)<1e-9)continue;const U=(a-x.y)/G;U<0||U>1||(u.sub(x).multiplyScalar(U).add(x).applyMatrix4(v),f.lowX=Math.min(f.lowX,u.x),f.highX=Math.max(f.highX,u.x),f.lowY=Math.min(f.lowY,u.y),f.highY=Math.max(f.highY,u.y))}},g=c();for(let f=0;f<8;f+=1)u.set(f&1?t.max.x:t.min.x,f&2?t.max.y:t.min.y,f&4?t.max.z:t.min.z),u.applyMatrix4(v),g.lowX=Math.min(g.lowX,u.x),g.highX=Math.max(g.highX,u.x),g.lowY=Math.min(g.lowY,u.y),g.highY=Math.max(g.highY,u.y);const P=f=>{const w=Math.max(f.lowX,g.lowX),S=Math.min(f.highX,g.highX),A=Math.max(f.lowY,g.lowY),W=Math.min(f.highY,g.highY);if(!(S>w&&W>A)||!Number.isFinite(w+S+A+W))return null;const G=Math.max((S-w)*1.05,(W-A)*1.05),U=n(G,h),B=Math.max(G,Number.isFinite(h)?h*U:0),I=Math.min(2*s,2**(Math.ceil(Math.log2(B)*4)/4));if(I>=2*s)return null;const N=I/U,te=Math.round((w+S)/2/N)*N,se=Math.round((A+W)/2/N)*N;return{sides:[te-I/2,te+I/2,se-I/2,se+I/2],side:U,width:I,texel:N}};if(2*s/i<=h)return p("the whole box is as fine as the pass");{let f=1/0,w=-1/0;for(let B=0;B<8;B+=1){u.set(B&1?t.max.x:t.min.x,B&2?t.max.y:t.min.y,B&4?t.max.z:t.min.z);const I=u.project(r.camera).z;f=Math.min(f,I),w=Math.max(w,I)}const S=r.reversed?0:-1,A=[Math.max(S,Math.min(1,f)),Math.max(S,Math.min(1,w))],W=c(),G=m(W);for(const B of A)for(const[I,N]of[[-1,-1],[1,-1],[-1,1],[1,1]])G(I,N,B);b(W);const U=P(W);if(U&&U.texel<=h)return l("fitted to the frame through the box",U.side,U.width),{sides:U.sides,side:U.side}}const E=this.rangesOf(e,r),_=c(),y=m(_),T=f=>r.reversed?f:f*2-1;let O=0;for(let f=0;f<V;f+=1)for(let w=0;w<V;w+=1){const S=(f*V+w)*4;if(!(E[S+2]>0))continue;O+=1;const A=w/V*2-1,W=(w+1)/V*2-1,G=f/V*2-1,U=(f+1)/V*2-1;for(const B of[T(E[S]),T(E[S+1])])y(A,G,B),y(W,G,B),y(A,U,B),y(W,U,B)}if(b(_),!O&&a===null)return l("the pass shows no surface",256),{sides:o,side:256};const M=P(_);return M?(l("fitted to the surfaces the pass shows",M.side,M.width,O),{sides:M.sides,side:M.side}):p("what the pass shows spans the whole box",O)}rangesOf(e,t){this._ranges||(this._ranges=new F(V,V,{type:st,format:H,minFilter:z,magFilter:z,depthBuffer:!1}),this._rangeQuad=new Y(new C({uniforms:{uDepthSheet:{value:null},uSize:{value:new D},uReversed:{value:!1}},vertexShader:"void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }",fragmentShader:Ui,depthTest:!1,depthWrite:!1})));const s=this._rangeQuad.material;return s.uniforms.uDepthSheet.value=t.depth,s.uniforms.uSize.value.set(t.width,t.height),s.uniforms.uReversed.value=t.reversed,this._rangeQuad.render(e,this._ranges),e.readRenderTargetPixels(this._ranges,0,0,V,V,this._rangePixels),this._rangePixels}dispose(){for(const e of this._captures.values())e.dispose();this._captures.clear(),this._capture=null,this._ranges?.dispose(),this._ranges=null,this._rangeQuad?.material?.dispose(),this._rangeQuad=null}}var is=(d=>(d[d.SCREEN_SPACE=0]="SCREEN_SPACE",d[d.WORLD_SPACE=1]="WORLD_SPACE",d))(is||{});class ki{settings;sunShadow=new Li;_sunDrawn=!1;capture;pyramid;ao;worldAo;denoise;composite;fxaa;_ldrTarget;_directFrame=null;_gridColor=null;_overlayColor=null;_occlusionColor=null;_gridBlendQuad;_screenCopyQuad;_occlusionBlendQuad;_whiteAo;_lastAo=null;_hasCaptured=!1;_width;_height;constructor(e,t,s){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t)),this.settings={ao:{...Dt,...s?.ao??{}},worldAo:{...Ot,...s?.worldAo??{}},denoise:{...Rt,...s?.denoise??{}},composite:{...ye,...s?.composite??{}},fxaaEnabled:s?.fxaaEnabled??!0,aoEnabled:s?.aoEnabled??!0,aoMode:s?.aoMode??0,aoHalfRes:s?.aoHalfRes??!0,hizHalfRes:s?.hizHalfRes??!1,renderScale:s?.renderScale??1,sunShadow:s?.sunShadow??null,background:s?.background??null,crop:s?.crop??null,overTheTarget:s?.overTheTarget??!1};const i=this.fullSize(),r=this.aoSize();this.capture=new ss(i.w,i.h),this._ldrTarget=new F(i.w,i.h,{type:X,format:H,minFilter:R,magFilter:R,depthBuffer:!1,stencilBuffer:!1}),this._ldrTarget.texture.name="compositeLdr",this.pyramid=new Si(i.w,i.h),this.ao=new Ti(r.w,r.h,this.settings.ao),this.worldAo=new Pi(r.w,r.h,this.settings.worldAo),this.denoise=new Ai(r.w,r.h,this.settings.denoise),this.composite=new Ni(i.w,i.h,this.settings.composite),this.fxaa=new zi(i.w,i.h),this._whiteAo=new ke(new Uint8Array([255]),1,1,Ce),this._whiteAo.needsUpdate=!0;const a=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:`
        precision highp float;
        in vec2 vUv;
        out vec4 outColor;
        uniform sampler2D uImage;
        void main() { outColor = texture(uImage, vUv); }
      `,uniforms:{uImage:{value:null}},transparent:!0,depthTest:!1,depthWrite:!1});this._gridBlendQuad=new Y(a);const o=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:`
        precision highp float;
        in vec2 vUv;
        out vec4 outColor;
        uniform sampler2D uImage;
        void main() { outColor = texture(uImage, vUv); }
      `,uniforms:{uImage:{value:null}},depthTest:!1,depthWrite:!1,blending:K});this._screenCopyQuad=new Y(o);const n=new C({glslVersion:$,vertexShader:`
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,fragmentShader:`
        precision highp float;
        in vec2 vUv;
        out vec4 outColor;
        uniform sampler2D uImage;
        void main() { outColor = texture(uImage, vUv); }
      `,uniforms:{uImage:{value:null}},transparent:!0,depthTest:!1,depthWrite:!1,blending:Ct,blendEquation:Se,blendSrc:Mt,blendDst:Ns});this._occlusionBlendQuad=new Y(n)}get depthTexture(){return this.capture.target.depthTexture}get renderScale(){return this.settings.renderScale}set renderScale(e){this.settings.renderScale=Math.max(.1,Math.min(1,e)),this.setSize(this._width,this._height)}get aoHalfRes(){return this.settings.aoHalfRes}set aoHalfRes(e){e!==this.settings.aoHalfRes&&(this.settings.aoHalfRes=e,this.setSize(this._width,this._height))}get hizHalfRes(){return this.settings.hizHalfRes}set hizHalfRes(e){e!==this.settings.hizHalfRes&&(this.settings.hizHalfRes=e,this.setSize(this._width,this._height))}fullSize(){const e=Math.max(.1,Math.min(1,this.settings.renderScale));return{w:Math.max(1,Math.floor(this._width*e)),h:Math.max(1,Math.floor(this._height*e))}}hizSize(){const e=this.fullSize();return this.settings.hizHalfRes?{w:Math.max(1,Math.floor(e.w/2)),h:Math.max(1,Math.floor(e.h/2))}:e}aoSize(){const e=this.fullSize();return this.settings.aoHalfRes?{w:Math.max(1,Math.floor(e.w/2)),h:Math.max(1,Math.floor(e.h/2))}:e}setSize(e,t){this._width=Math.max(1,Math.floor(e)),this._height=Math.max(1,Math.floor(t));const s=this.fullSize(),i=this.aoSize();this.capture.setSize(s.w,s.h),this._ldrTarget.setSize(s.w,s.h);const r=this.hizSize();this.pyramid.setSize(r.w,r.h),this.ao.setSize(i.w,i.h),this.worldAo.setSize(i.w,i.h),this.denoise.setSize(i.w,i.h),this.composite.setSize(s.w,s.h),this.fxaa.setSize(s.w,s.h),this.releaseGridColor(),this.releaseDirectFrame(),this.releaseOcclusionColor(),this.releaseOverlayColor()}captureChunk(e,t,s,i){const r=e.getRenderTarget();this.capture.render(e,t,s,i),this._hasCaptured=!0,e.setRenderTarget(r)}markChunksFinished(){this._finishingChunks=!0}_finishingChunks=!1;render(e,t,s,i,r,a,o=!1,n=[]){const l=t.matrixWorldAutoUpdate;l&&t.updateMatrixWorld(),t.matrixWorldAutoUpdate=!1;try{this.renderFrame(e,t,s,i,r,a,o,n)}finally{t.matrixWorldAutoUpdate=l}}renderFrame(e,t,s,i,r,a,o,n){const l=globalThis.__pipelinePhases?[]:null,h=l?_=>l.push([_,performance.now()]):()=>{};h("start");const p=e.getRenderTarget(),v=this.ensureDirectFrame();h("ensureDirectFrame");const u=o&&this._hasCaptured,c=this._finishingChunks;this._finishingChunks=!1;const m=u||c,x=u&&!c;let b=this._lastAo??this._whiteAo;if(!m){const _=[],y=T=>{if(T)for(const O of T)O.visible&&(O.visible=!1,_.push(O))};y(r),y(a),l&&(this.capture.__clock=h);try{this.capture.render(e,t,s)}finally{for(const T of _)T.visible=!0}h("capture"),this._hasCaptured=!0}if(!x){if(b=this._whiteAo,this.settings.aoEnabled){this.pyramid.build(e,this.capture.target.depthTexture,s);const _=this.settings.aoMode===1?this.worldAo:this.ao;_.render(e,this.pyramid,this.capture.target.normalTexture,this.capture.target.faceIdTexture,s),this.denoise.render(e,_.texture,this.pyramid.texture,this.capture.target.normalTexture),b=this.denoise.texture}this._lastAo=b,h("ao")}const g=this.settings.sunShadow;g&&(!u||!this._sunDrawn)&&(this.sunShadow.render(e,t,g,[...r??[],...a??[]],{camera:s,depth:this.capture.target.depthTexture,width:this.capture.target.depthTexture.image.width,height:this.capture.target.depthTexture.image.height,reversed:e.capabilities.reversedDepthBuffer===!0}),this._sunDrawn=!0,h("sun")),g||(this._sunDrawn=!1),this.composite.render(e,this._ldrTarget,{color:this.capture.target.colorTexture,ao:b,depth:this.capture.target.depthTexture,normal:this.capture.target.normalTexture,faceId:this.capture.target.faceIdTexture},s,g&&this.sunShadow.depthTexture?{depth:this.sunShadow.depthTexture,camera:this.sunShadow.camera,tone:g.tone,texel:this.sunShadow.texelInMetres,groundAt:g.groundAt??null}:null,this.settings.background,this.settings.crop),h("composite");const P=!this.settings.overTheTarget&&!i&&n.length===0&&!(a&&a.length)&&!(r&&r.length),E=P?p:v;if(this.settings.fxaaEnabled)this.fxaa.render(e,this._ldrTarget.texture,E);else{const _=this._screenCopyQuad.material;_.uniforms.uImage.value=this._ldrTarget.texture,this._screenCopyQuad.render(e,E)}if(h("fxaa"),P){if(e.setRenderTarget(p),l){h("cola y blit");const _={};for(let T=1;T<l.length;T++)_[l[T][0]]=Math.round((l[T][1]-l[T-1][1])*100)/100;const y=this.fullSize();globalThis.__lastPipeline={size:`${y.w}x${y.h}`,direct:!0,why:"nothing to draw on top",aoEnabled:this.settings.aoEnabled,fxaaEnabled:this.settings.fxaaEnabled,reuse:u,total:Math.round((l[l.length-1][1]-l[0][1])*100)/100,parts:_}}return}if(n.length){const _=this.capture.target.depthTexture,y=this.fullSize(),T=e.autoClear;e.autoClear=!1;for(const{pass:O,direct:M}of n)M&&(e.setRenderTarget(v),O({renderer:e,camera:s,target:v,depth:_,width:y.w,height:y.h}));for(const{pass:O,direct:M}of n){if(M)continue;const f=this.ensureOcclusionColor();e.setRenderTarget(f);const w=e.getContext();w.clearBufferfv(w.COLOR,0,[0,0,0,0]),O({renderer:e,camera:s,target:f,depth:_,width:y.w,height:y.h});const S=this._occlusionBlendQuad.material;S.uniforms.uImage.value=f.texture,this._occlusionBlendQuad.render(e,v)}e.autoClear=T,e.setRenderTarget(p)}if(a&&a.length&&this.renderDepthOverlay(e,t,s,v,a),r&&r.length&&this.paintOverlay(e,t,s,v,r),i&&i(v),!i){const _=this._screenCopyQuad.material;_.uniforms.uImage.value=v.texture;const y=this.settings.overTheTarget;_.blending=y?Zt:K,_.transparent=y,this._screenCopyQuad.render(e,p)}if(e.setRenderTarget(p),l){h("cola y blit");const _={};for(let T=1;T<l.length;T++)_[l[T][0]]=Math.round((l[T][1]-l[T-1][1])*100)/100;const y=this.fullSize();globalThis.__lastPipeline={size:`${y.w}x${y.h}`,direct:!1,stallingPasses:{tail:!!i,occlusion:n.length,overprintDepth:a?.length??0,overlayPlane:r?.length??0},aoEnabled:this.settings.aoEnabled,fxaaEnabled:this.settings.fxaaEnabled,reuse:u,total:Math.round((l[l.length-1][1]-l[0][1])*100)/100,parts:_}}}renderDepthOverlay(e,t,s,i,r){const a=this.ensureGridColor(),o=new Set(r),n=[],l=[];t.traverse(u=>{if(!u.visible)return;const c=u.material;if(!c)return;const m=Array.isArray(c)?c:[c];if(!m.some(x=>o.has(x))){u.visible=!1,n.push(u);return}for(const x of m)o.has(x)&&(l.push({material:x,blending:x.blending,depthWrite:x.depthWrite}),x.blending=K,x.depthWrite=!1)});const h=e.getRenderTarget(),p=e.autoClear;e.autoClear=!1,e.setRenderTarget(a);const v=e.getContext();v.clearBufferfv(v.COLOR,0,[0,0,0,0]);try{e.render(t,s),e.autoClear=p;const u=this._gridBlendQuad.material;u.uniforms.uImage.value=a.texture,this._gridBlendQuad.render(e,i)}finally{e.autoClear=p,e.setRenderTarget(h);for(const u of n)u.visible=!0;for(const u of l)u.material.blending=u.blending,u.material.depthWrite=u.depthWrite}}ensureGridColor(){const e=this.fullSize();return this._gridColor&&(this._gridColor.width!==e.w||this._gridColor.height!==e.h)&&this.releaseGridColor(),this._gridColor||(this._gridColor=new F(e.w,e.h,{type:X,format:H,minFilter:R,magFilter:R,depthBuffer:!0,stencilBuffer:!1}),this._gridColor.texture.name="v2GridOverlay",this._gridColor.depthTexture=this.capture.target.depthTexture),this._gridColor}releaseGridColor(){this._gridColor&&(this._gridColor.depthTexture=null,this._gridColor.dispose(),this._gridColor=null)}paintOverlay(e,t,s,i,r){const a=new Set(r),o=[],n=[];let l=!1;if(t.traverse(c=>{if(!c.visible)return;const m=c.material;if(!m)return;const x=Array.isArray(m)?m:[m];if(!x.some(b=>a.has(b))){c.visible=!1,o.push(c);return}l=!0;for(const b of x)a.has(b)&&(b.userData?.preserveBlending||(n.push({material:b,blending:b.blending}),b.blending=K))}),!l){for(const c of o)c.visible=!0;return}const h=this.ensureOverlayColor(),p=e.getRenderTarget(),v=e.autoClear;e.autoClear=!1,e.setRenderTarget(h);const u=e.getContext();u.clearBufferfv(u.COLOR,0,[0,0,0,0]);try{e.render(t,s),e.autoClear=v;const c=this._gridBlendQuad.material;c.uniforms.uImage.value=h.texture,this._gridBlendQuad.render(e,i)}finally{e.autoClear=v,e.setRenderTarget(p);for(const c of o)c.visible=!0;for(const c of n)c.material.blending=c.blending}}ensureOverlayColor(){const e=this.fullSize();return this._overlayColor&&(this._overlayColor.width!==e.w||this._overlayColor.height!==e.h)&&this.releaseOverlayColor(),this._overlayColor||(this._overlayColor=new F(e.w,e.h,{type:X,format:H,minFilter:R,magFilter:R,depthBuffer:!1,stencilBuffer:!1}),this._overlayColor.texture.name="v2HoverOverlay"),this._overlayColor}releaseOverlayColor(){this._overlayColor&&(this._overlayColor.dispose(),this._overlayColor=null)}ensureOcclusionColor(){const e=this.fullSize();return this._occlusionColor&&(this._occlusionColor.width!==e.w||this._occlusionColor.height!==e.h)&&this.releaseOcclusionColor(),this._occlusionColor||(this._occlusionColor=new F(e.w,e.h,{type:X,format:H,minFilter:R,magFilter:R,depthBuffer:!0,stencilBuffer:!1}),this._occlusionColor.texture.name="v2SplatOcclusion",this._occlusionColor.depthTexture=this.capture.target.depthTexture),this._occlusionColor}releaseOcclusionColor(){this._occlusionColor&&(this._occlusionColor.depthTexture=null,this._occlusionColor.dispose(),this._occlusionColor=null)}ensureDirectFrame(){const e=this.fullSize();return this._directFrame&&(this._directFrame.width!==e.w||this._directFrame.height!==e.h)&&this.releaseDirectFrame(),this._directFrame||(this._directFrame=new F(e.w,e.h,{type:X,format:H,minFilter:R,magFilter:R,depthBuffer:!0,stencilBuffer:!1}),this._directFrame.texture.name="v2DirectFrame",this._directFrame.depthTexture=this.capture.target.depthTexture),this._directFrame}releaseDirectFrame(){this._directFrame&&(this._directFrame.depthTexture=null,this._directFrame.dispose(),this._directFrame=null)}dispose(){this._ldrTarget.dispose(),this.releaseGridColor(),this.releaseDirectFrame(),this.releaseOcclusionColor(),this.releaseOverlayColor(),this._gridBlendQuad.dispose(),this._screenCopyQuad.dispose(),this._occlusionBlendQuad.dispose(),this._whiteAo.dispose(),this.capture.dispose(),this.pyramid.dispose(),this.ao.dispose(),this.worldAo.dispose(),this.denoise.dispose(),this.composite.dispose(),this.fxaa.dispose()}}var j=(d=>(d[d.COLOR=0]="COLOR",d[d.PEN=1]="PEN",d[d.PEN_SHADOWS=2]="PEN_SHADOWS",d[d.COLOR_PEN=3]="COLOR_PEN",d[d.COLOR_SHADOWS=4]="COLOR_SHADOWS",d[d.COLOR_PEN_SHADOWS=5]="COLOR_PEN_SHADOWS",d))(j||{}),Z=(d=>(d[d.COMPOSER=0]="COMPOSER",d[d.DEFERRED=1]="DEFERRED",d))(Z||{});class Nt{invisibleMaterials=new Set;composer;occlusionPasses=new Map;addOcclusionPass(e,t=!1){this.occlusionPasses.set(e,{direct:t})}removeOcclusionPass(e){this.occlusionPasses.delete(e)}setOcclusionDirect(e,t){const s=this.occlusionPasses.get(e);s&&(s.direct=t)}get deferredDepthTexture(){return this._deferred?.depthTexture}onStyleChanged=new Me;_enabled=!1;_initialized=!1;_basePass;_aoPass;_outputPass;_edgeDetectionPass;_smaaPass;_simpleOutlinePass;_excludedObjectsPass;_glossPass;_style=j.COLOR;_outlinesEnabled=!1;_glossEnabled=!1;_smaaEnabled=!1;_excludedObjectsEnabled=!1;_msaaEnabled=!1;_components;_renderer;_clearColor=new k;_mode=Z.COMPOSER;_deferred;defaultAoParameters={radius:.25,distanceExponent:5.7,thickness:10,scale:2,samples:16,distanceFallOff:1,screenSpaceRadius:!0};get basePass(){if(!this._basePass)throw new Error("Base pass not initialized");return this._basePass}get enabled(){return this._enabled}set enabled(e){if(this._enabled=e,e&&!this._initialized&&this.initialize(),!e)for(const t of this.basePass.isolatedMaterials)t.visible=!0}get aoPass(){if(!this._aoPass)throw new Error("AO pass not initialized");return this._aoPass}get outlinePass(){if(!this._simpleOutlinePass)throw new Error("Outline pass not initialized");return this._simpleOutlinePass}get edgesPass(){if(!this._edgeDetectionPass)throw new Error("Edge detection pass not initialized");return this._edgeDetectionPass}get excludedObjectsPass(){if(!this._excludedObjectsPass)throw new Error("Excluded objects pass not initialized");return this._excludedObjectsPass}get glossPass(){if(!this._glossPass)throw new Error("Gloss pass not initialized");return this._glossPass}get outlinesEnabled(){return this._outlinesEnabled}set outlinesEnabled(e){this._outlinesEnabled=e,this.style=this._style}get excludedObjectsEnabled(){return this._excludedObjectsEnabled}set excludedObjectsEnabled(e){this._excludedObjectsEnabled=e,this.style=this._style}get glossEnabled(){return this._glossEnabled}set glossEnabled(e){this._glossEnabled=e,this.style=this._style}get smaaEnabled(){return this._smaaEnabled}set smaaEnabled(e){this._smaaEnabled=e,this.style=this._style}get msaaEnabled(){return this._msaaEnabled}set msaaEnabled(e){this._msaaEnabled=e,this.applySamples()}get style(){return this._style}set style(e){if(this._mode===Z.DEFERRED){this._style=e,this._applyDeferredStyle(e),this.onStyleChanged.trigger(e);return}this.composer&&(!this.composer||!this._basePass||!this._smaaPass||!this._outputPass||!this._aoPass||!this._edgeDetectionPass||!this._simpleOutlinePass||!this._excludedObjectsPass||!this._glossPass||(this._style===j.PEN_SHADOWS&&this._aoPass.updateGtaoMaterial(this.defaultAoParameters),this._style=e,this.clear(),e===j.COLOR&&(this.composer.addPass(this._basePass),this._glossEnabled&&this.composer.addPass(this._glossPass),this._outlinesEnabled&&this.composer.addPass(this._simpleOutlinePass),this._excludedObjectsEnabled&&this.composer.addPass(this._excludedObjectsPass),this._smaaEnabled&&this.composer.addPass(this._smaaPass),this.composer.addPass(this._outputPass)),e===j.PEN&&(this.composer.addPass(this._edgeDetectionPass),this._outlinesEnabled&&this.composer.addPass(this._simpleOutlinePass),this._excludedObjectsEnabled&&this.composer.addPass(this._excludedObjectsPass),this._smaaEnabled&&this.composer.addPass(this._smaaPass)),e===j.PEN_SHADOWS&&(this.composer.addPass(this._basePass),this.composer.addPass(this._aoPass),this._aoPass.output=q.OUTPUT.AO,this.composer.addPass(this._edgeDetectionPass),this._outlinesEnabled&&this.composer.addPass(this._simpleOutlinePass),this._excludedObjectsEnabled&&this.composer.addPass(this._excludedObjectsPass),this._smaaEnabled&&this.composer.addPass(this._smaaPass),this.composer.addPass(this._outputPass)),e===j.COLOR_PEN&&(this.composer.addPass(this._basePass),this._glossEnabled&&this.composer.addPass(this._glossPass),this.composer.addPass(this._edgeDetectionPass),this._outlinesEnabled&&this.composer.addPass(this._simpleOutlinePass),this._excludedObjectsEnabled&&this.composer.addPass(this._excludedObjectsPass),this._smaaEnabled&&this.composer.addPass(this._smaaPass),this.composer.addPass(this._outputPass)),e===j.COLOR_SHADOWS&&(this.composer.addPass(this._basePass),this._glossEnabled&&this.composer.addPass(this._glossPass),this.composer.addPass(this._aoPass),this._aoPass.output=q.OUTPUT.Default,this._outlinesEnabled&&this.composer.addPass(this._simpleOutlinePass),this._excludedObjectsEnabled&&this.composer.addPass(this._excludedObjectsPass),this._smaaEnabled&&this.composer.addPass(this._smaaPass),this.composer.addPass(this._outputPass)),e===j.COLOR_PEN_SHADOWS&&(this.composer.addPass(this._basePass),this._glossEnabled&&this.composer.addPass(this._glossPass),this.composer.addPass(this._aoPass),this._aoPass.output=q.OUTPUT.Default,this.composer.addPass(this._edgeDetectionPass),this._outlinesEnabled&&this.composer.addPass(this._simpleOutlinePass),this._excludedObjectsEnabled&&this.composer.addPass(this._excludedObjectsPass),this._smaaEnabled&&this.composer.addPass(this._smaaPass),this.composer.addPass(this._outputPass)),this.onStyleChanged.trigger(e)))}_applyDeferredStyle(e){if(!this._deferred)return;const t=j,s=e===t.COLOR||e===t.COLOR_PEN||e===t.COLOR_SHADOWS||e===t.COLOR_PEN_SHADOWS,i=e===t.PEN||e===t.PEN_SHADOWS||e===t.COLOR_PEN||e===t.COLOR_PEN_SHADOWS,r=e===t.PEN_SHADOWS||e===t.COLOR_SHADOWS||e===t.COLOR_PEN_SHADOWS,a=this._deferred.composite.settings;a.colorEnabled=s,a.contourEnabled=i,this._deferred.settings.aoEnabled=r}get mode(){return this._mode}set mode(e){const t=this._mode===Z.DEFERRED;this._mode=e,e===Z.DEFERRED?(this.deferred,this.setCaptureEmission(!0),this.style=this._style):(t&&(this.setCaptureEmission(!1),this.releaseDeferred()),this.style=this._style)}captureEmitters=new Set;addCaptureEmitter(e){this.captureEmitters.add(e),this._mode===Z.DEFERRED&&e(!0)}removeCaptureEmitter(e){if(this.captureEmitters.delete(e))try{e(!1)}catch{}}setCaptureEmission(e){try{this._components.get(Te)?.core?.models?.materials?.setCaptureEmission?.(e)}catch{}for(const t of this.captureEmitters)try{t(e)}catch{}}get deferred(){if(!this._deferred){const e=Math.max(1,this._renderer.three.domElement.width),t=Math.max(1,this._renderer.three.domElement.height);this._deferred=new ki(e,t,this._deferredSettings);const s=(i,r)=>{try{this._components.get(Te)?.core?.models?.materials?.setCapturePixels?.(i,r)}catch{}};this._deferred.capture.onPixels=s,this._deferred.sunShadow.onPixels=s,this._renderer.applyPostproductionSize()}return this._deferred}_deferredSettings;releaseDeferred(){this._deferred&&(this._deferredSettings=this._deferred.settings,this._deferred.dispose(),this._deferred=void 0)}constructor(e,t){this._components=e,this._renderer=t}update(){if(this._mode===Z.DEFERRED){this.updateDeferred();return}if(!this.composer)return;for(const s of this.invisibleMaterials)s.userData.wasVisibleForPostproduction=s.visible,s.visible=!1;const e=this._renderer.three;e.getClearColor(this._clearColor);const t=e.getClearAlpha();e.setClearColor(16777215,1),e.setRenderTarget(this.composer.renderTarget1),e.clear(),e.setRenderTarget(this.composer.renderTarget2),e.clear(),e.setRenderTarget(null),e.setClearColor(this._clearColor,t),this.composer.render();for(const s of this.invisibleMaterials)s.visible=s.userData.wasVisibleForPostproduction}updateOverlayOnly(){this._mode===Z.DEFERRED&&this.updateDeferred(!0)}finishChunks(){this._mode!==Z.DEFERRED||!this._deferred||(this._deferred.markChunksFinished(),this.updateDeferred(!0))}captureChunk(e){if(this._mode!==Z.DEFERRED||!this._deferred)return;const t=this._renderer.currentWorld;if(!t)return;const s=t.scene.three,i=t.camera.three;e&&this.setCaptureEmission(!0);for(const r of this.invisibleMaterials)r.userData.wasVisibleForPostproduction=r.visible,r.visible=!1;this._deferred.captureChunk(this._renderer.three,s,i,e);for(const r of this.invisibleMaterials)r.visible=r.userData.wasVisibleForPostproduction}updateDeferred(e=!1){const t=this._renderer.currentWorld;if(!t)return;const s=t.scene.three,i=t.camera.three,r=this._renderer.three;e||this.setCaptureEmission(!0);for(const u of this.invisibleMaterials)u.userData.wasVisibleForPostproduction=u.visible,u.visible=!1;r.getClearColor(this._clearColor);const a=r.getClearAlpha(),o=this._outlinesEnabled&&this._simpleOutlinePass&&!this._deferred?.settings?.overTheTarget?this._simpleOutlinePass:null,n=this._basePass?.isolatedMaterials??[],l=n.filter(u=>u.depthTest===!1),h=n.filter(u=>u.depthTest!==!1),p=o?u=>{o.renderToScreen=!0,o.render(r,u,u)}:void 0,v=[];for(const[u,c]of this.occlusionPasses)v.push({pass:u,direct:c.direct});try{this.deferred.render(r,s,i,p,l,h,e,v)}finally{r.setClearColor(this._clearColor,a);for(const u of this.invisibleMaterials)u.visible=u.userData.wasVisibleForPostproduction}}dispose(){this._mode===Z.DEFERRED&&this.setCaptureEmission(!1),this.releaseDeferred(),this._deferredSettings=void 0,this.occlusionPasses.clear(),this.captureEmitters.clear(),this.composer?.dispose(),this._aoPass?.dispose(),this._outputPass?.dispose(),this._edgeDetectionPass?.dispose(),this._smaaPass?.dispose(),this._simpleOutlinePass?.dispose(),this._excludedObjectsPass?.dispose(),this._glossPass?.dispose()}setSize(e,t){e===0||t===0||(this.composer&&this.composer.setSize(e,t),this._deferred&&this._deferred.setSize(e,t),this._simpleOutlinePass&&this._simpleOutlinePass.setSize(e,t),this._excludedObjectsPass&&this._excludedObjectsPass.setSize(e,t),this._glossPass&&this._glossPass.setSize(e,t))}updateCamera(){const e=this._renderer.currentWorld.camera.three;this._basePass&&(this._basePass.camera=e),this._aoPass&&(this._aoPass.camera=e)}clear(){if(!this.composer)return;const e=[...this.composer.passes];for(const t of e)this.composer.removePass(t);this._renderer.three.setClearColor(0,0),this._renderer.three.setRenderTarget(this.composer.renderTarget1),this._renderer.three.clear(),this._renderer.three.setRenderTarget(this.composer.renderTarget2),this._renderer.three.clear(),this._renderer.three.setRenderTarget(null)}static MSAA_SAMPLES=4;applySamples(){if(!this.composer)return;const e=this._renderer.three.capabilities.maxSamples,t=this._msaaEnabled?Nt.MSAA_SAMPLES:0,s=Math.max(0,Math.min(t,e)),i=[this.composer.renderTarget1,this.composer.renderTarget2];for(const r of i)r.samples!==s&&(r.samples=s,r.dispose())}initialize(){this._initialized=!0;const e=this._renderer.currentWorld.scene.three,t=this._renderer.currentWorld.camera.three;this._renderer.three.setClearColor(0,0),this.composer=new qs(this._renderer.three),this.applySamples();const s=new hi(e,t);this._basePass=s,this._smaaPass=new ei;const i=this._components.get(Te);this._aoPass=new ii(i,e,t,this._renderer.three.domElement.width,this._renderer.three.domElement.height),this._aoPass.output=q.OUTPUT.Default,this._edgeDetectionPass=new ri(this._renderer,i),this._outputPass=new $s,this._simpleOutlinePass=new ni(this._renderer.three.domElement.width,this._renderer.three.domElement.height,this._renderer.currentWorld),this._excludedObjectsPass=new li(this._renderer,this._renderer.currentWorld),this._glossPass=new di(new D(this._renderer.three.domElement.width,this._renderer.three.domElement.height),this._renderer.currentWorld),this.style=j.COLOR}}const ce=256,Q="default";class Wi{debugShowMask=!1;resolutionScale=1;_rootScene=new ve;_groups=new Map;_groupsById=new Map;_outlinedTiles=new Map;_nextId=1;_paletteData=new Uint8Array(ce*2*4);_paletteTexture;constructor(){this._rootScene.background=null,this._paletteTexture=new ke(this._paletteData,ce,2,H,X),this._paletteTexture.minFilter=z,this._paletteTexture.magFilter=z,this._paletteTexture.wrapS=$e,this._paletteTexture.wrapT=$e,this._paletteTexture.colorSpace=Rs,this._paletteTexture.needsUpdate=!0,this.addGroup(Q,{outlineColor:new k(16762880),fillColor:new k(16776960),fillOpacity:.3,thickness:2})}get maskScene(){return this._rootScene}get paletteTexture(){return this._paletteTexture}get active(){for(const e of this._groups.values())if(e.container.children.length>0)return!0;return!1}_everActive=!1;get everActive(){return this._everActive}advance(){for(const e of this._outlinedTiles.values())for(const t of e.values())t.proxy.matrixWorld.copy(t.source.matrixWorld)}addGroup(e,t){let s=this._groups.get(e);if(s)return t&&this.configureGroup(e,t),s;const i=this.allocateId(),r=t?.priority??0,a=this.buildGhostMaterial(i,r),o=new At;return o.name=`outline-group:${e}`,o.renderOrder=r,this._rootScene.add(o),s={id:i,name:e,container:o,material:a,outlineColor:t?.outlineColor?.clone()??new k(16762880),fillColor:t?.fillColor?.clone()??new k(16776960),fillOpacity:t?.fillOpacity??.3,thickness:t?.thickness??2,priority:r},this._groups.set(e,s),this._groupsById.set(i,s),this.writePaletteEntry(s),s}configureGroup(e,t){const s=this._groups.get(e);s&&(t.outlineColor&&s.outlineColor.copy(t.outlineColor),t.fillColor&&s.fillColor.copy(t.fillColor),t.fillOpacity!==void 0&&(s.fillOpacity=t.fillOpacity),t.thickness!==void 0&&(s.thickness=t.thickness),t.priority!==void 0&&(s.priority=t.priority,s.material.polygonOffset=t.priority!==0,s.material.polygonOffsetFactor=-t.priority,s.material.polygonOffsetUnits=-t.priority,s.container.renderOrder=t.priority),this.writePaletteEntry(s))}removeGroup(e){if(e===Q)return;const t=this._groups.get(e);if(t){for(;t.container.children.length;)t.container.children[0].removeFromParent();t.container.removeFromParent(),t.material.dispose(),this._groups.delete(e),this._groupsById.delete(t.id);for(const[s,i]of this._outlinedTiles)i.delete(e)&&i.size===0&&this._outlinedTiles.delete(s);this.clearPaletteEntry(t.id)}}hasGroup(e){return this._groups.has(e)}getGroup(e){return this._groups.get(e)}addMeshToGroup(e,t){let s=this._groups.get(t);s||(s=this.addGroup(t));const i=e.geometry.groups&&e.geometry.groups.length>0;e.material=i?[s.material]:s.material,s.container.add(e),this._everActive=!0}attachOutlinedTile(e,t,s=Q){let i=this._groups.get(s);i||(i=this.addGroup(s));let r=this._outlinedTiles.get(e);r||(r=new Map,this._outlinedTiles.set(e,r));const a=r.get(s);if(a){const h=a.proxy.geometry;h.clearGroups(),this.fillProxyGroups(h,t);return}const o=e.geometry,n=new ge;n.attributes=o.attributes,o.index&&n.setIndex(o.index),n.boundingBox=o.boundingBox,n.boundingSphere=o.boundingSphere,this.fillProxyGroups(n,t);const l=new xe(n,[i.material]);l.matrixAutoUpdate=!1,l.matrixWorldAutoUpdate=!1,l.frustumCulled=!1,l.matrixWorld.copy(e.matrixWorld),i.container.add(l),r.set(s,{source:e,proxy:l,groupName:s}),this._everActive=!0}detachOutlinedTile(e,t=Q){const s=this._outlinedTiles.get(e);if(!s)return;const i=s.get(t);i&&(i.proxy.removeFromParent(),s.delete(t),s.size===0&&this._outlinedTiles.delete(e))}hasOutlinedTile(e,t){const s=this._outlinedTiles.get(e);return s?t===void 0?s.size>0:s.has(t):!1}getGroupContainer(e){let t=this._groups.get(e);return t||(t=this.addGroup(e)),t.container}getGroupScene(e){return this.getGroupContainer(e)}listGroups(){return[...this._groups.keys()]}get scene(){return this._groups.get(Q).container}get outlineColor(){return this._groups.get(Q).outlineColor}set outlineColor(e){this.configureGroup(Q,{outlineColor:e})}get thickness(){return this._groups.get(Q).thickness}set thickness(e){this.configureGroup(Q,{thickness:e})}get fillColor(){return this._groups.get(Q).fillColor}set fillColor(e){this.configureGroup(Q,{fillColor:e})}get fillOpacity(){return this._groups.get(Q).fillOpacity}set fillOpacity(e){this.configureGroup(Q,{fillOpacity:e})}dispose(){for(const e of this._outlinedTiles.values())for(const t of e.values())t.proxy.removeFromParent();this._outlinedTiles.clear();for(const e of this._groups.values()){for(;e.container.children.length;)e.container.children[0].removeFromParent();e.container.removeFromParent(),e.material.dispose()}this._groups.clear(),this._groupsById.clear(),this._paletteTexture.dispose()}buildGhostMaterial(e,t){throw new Error("WebGPUOutlinePass: `three` must resolve to the webgpu build (ESGPU) before outline groups are created.")}fillProxyGroups(e,t){const s=t.position,i=t.size,r=Math.min(s.length,i.length);for(let a=0;a<r;a++){const o=s[a],n=i[a],l=n===4294967295?1/0:n;e.addGroup(o,l,0)}}allocateId(){for(let e=0;e<ce-1;e++){const t=(this._nextId-1+e)%(ce-1)+1;if(!this._groupsById.has(t))return this._nextId=t%(ce-1)+1,t}throw new Error(`WebGPUOutlinePass: cannot allocate outline group id, ${ce-1} groups active.`)}writePaletteEntry(e){const t=e.id,s=t*4,i=(ce+t)*4,r=this._paletteData,a=l=>Math.max(0,Math.min(255,Math.round(l))),o=e.outlineColor.getRGB({r:0,g:0,b:0},Bt),n=e.fillColor.getRGB({r:0,g:0,b:0},Bt);r[s]=a(o.r*255),r[s+1]=a(o.g*255),r[s+2]=a(o.b*255),r[s+3]=a(e.thickness),r[i]=a(n.r*255),r[i+1]=a(n.g*255),r[i+2]=a(n.b*255),r[i+3]=a(e.fillOpacity*255),this._paletteTexture.needsUpdate=!0}clearPaletteEntry(e){const t=this._paletteData,s=e*4,i=(ce+e)*4;for(let r=0;r<4;r++)t[s+r]=0;for(let r=0;r<4;r++)t[i+r]=0;this._paletteTexture.needsUpdate=!0}}const Tt=[1,Math.SQRT2,2,3,4,5,6];function Bi(d){for(const e of Tt)if(d<=e)return e;return Tt[Tt.length-1]}class Ii{onStyleChanged=new Me;mode=Z.DEFERRED;deferred={settings:{aoEnabled:!0,aoMode:is.SCREEN_SPACE,fxaaEnabled:!0,sunShadow:null,background:null,crop:null,overTheTarget:!1},capture:{translucentAsOpaque:!1},aoHalfRes:!0,renderScale:1,ao:{settings:{...Dt}},worldAo:{settings:{...Ot}},denoise:{settings:{...Rt}},composite:{settings:{...ye,edgeColor:ye.edgeColor.clone(),paperColor:ye.paperColor.clone(),sheenColor:ye.sheenColor.clone()}}};deferredDepthTexture=void 0;basePass={isolatedMaterials:[]};excludedObjectsPass={addExcludedMaterial:e=>{},removeExcludedMaterial:e=>{}};edgesPass={width:1,color:new k(0),mode:$t.DEFAULT};glossPass={minGloss:0,maxGloss:0,glossExponent:1,fresnelExponent:1,glossFactor:0,fresnelFactor:0};aoPass={blendIntensity:1,updateGtaoMaterial:e=>{},updatePdMaterial:e=>{}};defaultAoParameters={radius:.25,distanceExponent:5.7,thickness:10,scale:2,samples:16,distanceFallOff:1,screenSpaceRadius:!0};outlinePass=new Wi;invisibleMaterials=new Set;outlinesEnabled=!1;excludedObjectsEnabled=!1;glossEnabled=!1;smaaEnabled=!1;_style=j.COLOR;_enabled=!1;_host;_occlusionPasses=new Map;constructor(e){this._host=e,this._applyStyle(this._style)}get enabled(){return this._enabled}set enabled(e){this._enabled=e,this._host.needsUpdate=!0}get style(){return this._style}set style(e){this._style=e,this._applyStyle(e),this._host.needsUpdate=!0,this.onStyleChanged.trigger(e)}addOcclusionPass(e,t=!0){this._occlusionPasses.set(e,t),this._host.needsUpdate=!0}removeOcclusionPass(e){this._occlusionPasses.delete(e)&&(this._host.needsUpdate=!0)}setOcclusionDirect(e,t){this._occlusionPasses.has(e)&&this._occlusionPasses.get(e)!==t&&(this._occlusionPasses.set(e,t),this._host.needsUpdate=!0)}_seamSignature(){let e="";for(const t of this._occlusionPasses.values())e+=t?"d":"l";return e}updateCamera(){}setSize(e,t){}mountOptions(e){return{...e,composite:this.deferred.composite.settings,view:this._viewSaid()?this.deferred.settings:null,sunMost:this._sunMost,capture:this.deferred.capture,overlays:this.basePass.isolatedMaterials,ao:e.ao!==!1&&this.deferred.settings.aoEnabled,fxaa:e.fxaa!==!1&&this.deferred.settings.fxaaEnabled,outline:this.outlinesEnabled&&this.outlinePass.everActive?this.outlinePass:null,seams:[...this._occlusionPasses].map(([t,s])=>({pass:t,direct:s}))}}needsRemount(e,t){if(!e)return!0;const s=this.deferred.composite.settings,{settings:i}=this.deferred,r=this.basePass.isolatedMaterials,a=r.some(n=>n.depthTest!==!1),o=r.some(n=>n.depthTest===!1);return e.depthOverlays!==a||e.flatOverlays!==o||e.colorEnabled!==s.colorEnabled||e.contourEnabled!==s.contourEnabled||e.normal!==(s.tonalShadingEnabled===!0||s.glossFactor>0||s.fresnelFactor>0)||e.faceR8!==(t.faceR8===!0)||e.reach!==Bi(s.edgeHalfWidth+s.edgeAA)||e.ao!==(t.ao!==!1&&i.aoEnabled)||e.fxaa!==(t.fxaa!==!1&&i.fxaaEnabled)||e.edges!==(t.edges!==!1)||e.outlines!==(this.outlinesEnabled&&this.outlinePass.everActive)||e.seams!==this._seamSignature()||!!e.view!==this._viewSaid()||(e.sunMost??0)!==this._sunMost}_viewEverSaid=!1;_sunMost=0;_viewSaid(){const{settings:e}=this.deferred;(e.crop||e.background||e.sunShadow)&&(this._viewEverSaid=!0);const t=e.sunShadow;return t&&(this._sunMost=Math.max(this._sunMost,Math.round(t.resolution??4096))),this._viewEverSaid}dispose(){this.onStyleChanged.reset(),this._occlusionPasses.clear()}_applyStyle(e){const t=j,s=e===t.COLOR||e===t.COLOR_PEN||e===t.COLOR_SHADOWS||e===t.COLOR_PEN_SHADOWS,i=e===t.PEN||e===t.PEN_SHADOWS||e===t.COLOR_PEN||e===t.COLOR_PEN_SHADOWS,r=e===t.PEN_SHADOWS||e===t.COLOR_SHADOWS||e===t.COLOR_PEN_SHADOWS,a=this.deferred.composite.settings;a.colorEnabled=s,a.contourEnabled=i,this.deferred.settings.aoEnabled=r}}class Gi extends si{manualDefaultStyle=j.COLOR;turnOffOnManualMode=!0;manualModeDelay=50;_postproduction;_timeout=null;_previousStyle=j.COLOR;_previousEnabled=!1;get postproduction(){if(this.api==="webgpu")return this._gpuPostproduction;if(!this._postproduction)throw new Error("Renderer not initialized yet with a world!");return this._postproduction}pipeline=null;webgpuPost={face:!0,ao:!0,edges:!0,fxaa:!0,scene8:!1,faceR8:!1,tonal:!0,sheen:!0,dither:!0};pipelineStats={compiled:0,disposed:0};_pipelineCamera=null;_mounting=0;_composition=null;_lastGpuRenderAt=-1/0;_webgpuPostproduction;get _gpuPostproduction(){return this._webgpuPostproduction||(this._webgpuPostproduction=new Ii(this)),this._webgpuPostproduction}_pageColor=new k(1,1,1);constructor(e,t,s){super(e,t,s),this.onResize.add(i=>{if(this.api==="webgpu"){this._pageColorForCanvas();return}this.setPostproductionSize(i)}),this.onWorldChanged.add(()=>{if(this.currentWorld&&this.api==="webgpu"){this._mountPipeline();return}this.currentWorld&&(this._postproduction&&this._postproduction.dispose(),this._postproduction=new Nt(e,this),this._postproduction.onStyleChanged.add(i=>{this._previousStyle=i}),this.setPostproductionSize())})}remountPipeline(){this.api!=="webgpu"||!this.currentWorld||this._mountPipeline()}async _mountPipeline(){const e=this.currentWorld;if(e){this._mounting++;try{const t=this._pipelineCamera;try{this._pipelineCamera=e.camera.three}catch{this._pipelineCamera=null}if(this._composition||(this._composition=await Bs(()=>import("./composition-Cfv_WSuu-BIQ8LVzg.js"),__vite__mapDeps([0,1]),import.meta.url)),this.currentWorld!==e)return;let s;try{s=e.camera.three}catch{this._pipelineCamera=null;return}const i=this.pipeline;if(i&&t===s&&!this._gpuPostproduction.needsRemount(i.compiled,this.webgpuPost)){this._pipelineCamera=s;return}this._composeNow(e,s)}finally{this._mounting--}}}_composeNow(e,t){const s=this.pipeline;this.pipeline=this._composition.mountComposition(this.three,e.scene.three,t,{...this._gpuPostproduction.mountOptions(this.webgpuPost),page:this._pageColorForCanvas()}),this._pipelineCamera=t,this.pipelineStats.compiled++,s&&(s.dispose?.(),this.pipelineStats.disposed++),this.needsUpdate=!0}_pageColorForCanvas(){if(this.three.alpha===!0)return null;let e=this.container,t=!1;for(;e&&!t;){const s=getComputedStyle(e).backgroundColor.match(/[\d.]+/g)?.map(Number)??[],i=s.length>=4?s[3]:s.length===3?1:0;s.length>=3&&i>0&&(this._pageColor.setRGB(s[0]/255,s[1]/255,s[2]/255),t=!0);const r=e.getRootNode();e=e.parentElement??r.host??null}return t||this._pageColor.setRGB(1,1,1),this._pageColor}_updateWebGPU(){if(!this.currentWorld)return;if(!this._webgpuInitialized){this.needsUpdate=!0;return}const e=performance.now();if(e-this._lastGpuRenderAt<4){this.needsUpdate=!0;return}this._lastGpuRenderAt=e,this.onBeforeUpdate.trigger();const t=this.currentWorld.scene.three,s=this.currentWorld.camera.three;this.syncWebGPUClipping(t);const i=this._gpuPostproduction;i.enabled&&!this.pipeline&&this._mounting===0&&this._mountPipeline(),i.enabled&&this.pipeline&&this._mounting===0&&(s!==this._pipelineCamera||i.needsRemount(this.pipeline.compiled,this.webgpuPost))&&(this._composition?this._composeNow(this.currentWorld,s):this._mountPipeline()),i.enabled&&this.pipeline?(this.pipeline.__refresh?.(),this.pipeline.render()):this.renderOverPage(t,s),this.onAfterUpdate.trigger()}update(){if(!this.enabled||!this.currentWorld||this.mode===bt.MANUAL&&!this.needsUpdate)return;if(this.needsUpdate=!1,this.api==="webgpu"){this._updateWebGPU();return}this.onBeforeUpdate.trigger();const e=this.currentWorld.scene.three,t=this.currentWorld.camera.three;this.mode===bt.MANUAL&&(this.turnOffOnManualMode&&(this._timeout===null&&(this._previousEnabled=this.postproduction.enabled),this.postproduction.enabled&&(this.postproduction.enabled=!1)),this.manualDefaultStyle!==this.postproduction.style&&this.setStyleWithoutEvent(this.manualDefaultStyle)),this.postproduction.enabled?this.postproduction.update():this.three.render(e,t),e instanceof ve&&this.three2D.render(e,t),this.mode===bt.MANUAL&&(this._timeout&&clearTimeout(this._timeout),this._timeout=setTimeout(()=>{this._timeout=null,this.turnOffOnManualMode&&(this.postproduction.enabled=this._previousEnabled),this.setStyleWithoutEvent(this._previousStyle),this.postproduction.enabled&&this.postproduction.update()},this.manualModeDelay)),this.onAfterUpdate.trigger()}updateOverlayOnly(){if(!this.enabled||!this.currentWorld)return;if(this.api==="webgpu"){this.update();return}if(!this.postproduction.enabled||this.postproduction.mode!==Z.DEFERRED){this.update();return}this.onBeforeUpdate.trigger(),this.postproduction.updateOverlayOnly();const e=this.currentWorld.scene.three,t=this.currentWorld.camera.three;e instanceof ve&&this.three2D.render(e,t),this.onAfterUpdate.trigger()}applyPostproductionSize(){this.setPostproductionSize()}dispose(){if(this._timeout!==null&&(clearTimeout(this._timeout),this._timeout=null),super.dispose(),this.api==="webgpu"){this.pipeline?.dispose?.(),this.pipeline=null,this._webgpuPostproduction?.dispose();return}this.postproduction.dispose()}setStyleWithoutEvent(e){this.postproduction.onStyleChanged.enabled=!1,this.postproduction.style=e,this.postproduction.onStyleChanged.enabled=!0}setPostproductionSize(e){if(e&&(e.x===0||e.y===0)||!this.container||!this._postproduction)return;const t=Math.min(window.devicePixelRatio,2),s=e?.x??this.container.clientWidth*t,i=e?.y??this.container.clientHeight*t;s===0||i===0||this.postproduction.setSize(s,i)}}class et{_components;_modelStyleGeometries=new Le;_clipperUnlisten=[];onDisposed=new Me;three=new At;plane;items=new Le;_world=null;_onClippingPlanesUpdated=()=>this.refreshClippingPlanes();set world(e){const t=this._world;t?.renderer&&t.renderer.onClippingPlanesUpdated.remove(this._onClippingPlanesUpdated),this._world=e,e?.renderer&&e.renderer.onClippingPlanesUpdated.add(this._onClippingPlanesUpdated)}get world(){return this._world}_visible=!1;set visible(e){e?this.world&&(this.world.scene.three.add(this.three),this._visible=!0):(this.three.removeFromParent(),this._visible=!1)}get visible(){return this._visible}constructor(e,t){this._components=e,this.plane=t,this.setupEvents()}setupEvents(){const e=this._components.get(me);this.items.guard=(i,{style:r})=>!!e.styles.get(r),this.items.onItemSet.add(({value:i})=>{const{style:r,data:a}=i;this.create(r,a)});const t=this._components.get(Ue);if(!t.localClippingPlanes)return;const s=()=>this.refreshClippingPlanes();t.onAfterCreate.add(s),t.onAfterDelete.add(s),this._clipperUnlisten.push(()=>t.onAfterCreate.remove(s)),this._clipperUnlisten.push(()=>t.onAfterDelete.remove(s))}refreshClippingPlanes(){if(!this._components.get(Ue).localClippingPlanes)return;const e=this.world?.renderer;if(!e)return;const t=e.clippingPlanes.filter(s=>s!==this.plane);for(const[,s]of this._modelStyleGeometries)for(const[,{edges:i,fills:r}]of s)i&&(i.material.clippingPlanes=t),r&&(r.material.clippingPlanes=t)}syncStyle(e){const t=this._components.get(me).styles.get(e);if(t)for(const[,s]of this._modelStyleGeometries){const i=s.get(e);if(!i)continue;const{edges:r,fills:a}=i;r&&t.linesMaterial&&et.copyStyleProps(t.linesMaterial,r.material),a&&t.fillsMaterial&&et.copyStyleProps(t.fillsMaterial,a.material)}}get _webgpu(){return this.world?.renderer?.three?.isWebGPURenderer===!0}get _perMaterialClipping(){return this._components.get(Ue).localClippingPlanes&&!this._webgpu}static copyStyleProps(e,t){if(e===t)return;const s=e,i=t;s.color&&i.color&&i.color.copy(s.color),"opacity"in s&&(i.opacity=s.opacity),"transparent"in s&&(i.transparent=s.transparent),"linewidth"in s&&"linewidth"in i&&(i.linewidth=s.linewidth),i.needsUpdate=!0}async getStyleMeshes(e,t){const s=this._components.get(me).styles.get(t);if(!s)throw new Error(`ClipStyler: "${t}" style not found.`);const i=this._components.get(Te),r=i.list.get(e);if(!r)throw new Error(`ClipEdges: model with id "${e}" not found.`);const{linesMaterial:a,fillsMaterial:o}=s;let n=this._modelStyleGeometries.get(e);n||(n=new Le,this._modelStyleGeometries.set(e,n));let l=n.get(t);if(!l){const h=a?a.clone():void 0,p=o?o.clone():void 0;let v;if(h){const c=new Ps;this._webgpu&&c.setPositions([]),v=new Es(c,h),v.frustumCulled=!1,r&&i.applyBaseCoordinateSystem(v,await r.getCoordinationMatrix()),this.three.add(v)}let u;p&&(u=new xe(new ge,p),r&&i.applyBaseCoordinateSystem(u,await r.getCoordinationMatrix()),this.three.add(u)),l={edges:v,fills:u},n.set(t,l)}return l}async updateMeshes(e,t,s){const i=this._components.get(Te),r=i.list.get(e);if(!r)return;const a=this._components.get(Wt),o=this._components.get(Ue).localClippingPlanes,n=this.plane.clone(),l=(await r.getCoordinationMatrix()).clone().multiply(i.baseCoordinationMatrix.clone().invert());n.applyMatrix4(l),this._perMaterialClipping||(n.constant-=.01);const h=await r.getSection(n,s),{buffer:p,index:v,fillsIndices:u}=h,c=await this.getStyleMeshes(e,t),{edges:m,fills:x}=c;o&&this.refreshClippingPlanes();const b=new Je(p,3,!1);if(m){b.setUsage(As);const g=new ge;g.setAttribute("position",b),g.setDrawRange(0,v);const P=new Ds(g);m.geometry.fromLineSegments(P),a.destroy(P)}x&&(x.geometry.attributes.position=b,x.geometry.setIndex(u),this._webgpu&&(x.visible=u.length>0))}async create(e,t){if(!this._components.get(me).styles.get(e))throw new Error(`ClipEdges: "${e}" style not found.`);const s=this._components.get(Os);let i=null;t&&(i=await s.find(t));const r=this._components.get(Te);if(i)for(const[a,o]of Object.entries(i))r.list.get(a)&&this.updateMeshes(a,e,[...o]);else for(const[a]of r.list)this.updateMeshes(a,e)}async update(e){for(const[t,{data:s,style:i}]of this.items)e&&!e.includes(t)||this.create(i,s)}dispose(){this._components.get(Wt).destroy(this.three,!0,!0),this._modelStyleGeometries.clear();for(const e of this._clipperUnlisten)e();this._clipperUnlisten.length=0,this.world=null}}class me extends Ts{static uuid="24dfc306-a3c4-410f-8071-babc4afa5e4d";onDisposed=new Me;enabled=!0;world=null;styles=new Le;list=new Le;_visible=!0;get visible(){return this._visible}set visible(e){this._visible=e;for(const[,t]of this.list)t.visible=e}constructor(e){super(e),this.components.list.set(me.uuid,this),this.setEvents()}setEvents(){this.list.onBeforeDelete.add(({value:e})=>e.dispose())}setEdgesConfig(e,t){if(e.world=t?.world??this.world,t?.items)for(const[i,r]of Object.entries(t.items))e.items.set(i,r);const s=t?.id??Ms.create();this.list.set(s,e)}create(e,t){const s=new et(this.components,e);return t&&this.setEdgesConfig(s,t),s}createFromView(e,t){const s=this.create(e.plane,t);return(t?.link===void 0||t.link)&&(e.onDisposed.add(()=>s.dispose()),e.onUpdated.add(()=>s.update()),e.onStateChanged.add(()=>s.visible=e.open)),s}createFromClipping(e,t){const s=this.components.get(Ue).list.get(e);if(!s)throw new Error(`ClipStyler: Clipping plane with ID ${e} not found.`);const i=this.create(s.three,t);return i.visible=!0,(t?.link===void 0||t.link)&&(s.onDraggingEnded.add(()=>i.update()),s.onDisposed.add(()=>i.dispose())),i}updateStyle(e){for(const[,t]of this.list)t.syncStyle(e)}dispose(){this.styles.clear(),this.list.clear(),this.onDisposed.trigger(me.uuid)}}class pe{onDisposed=new Me;marker=null;_world=null;set world(e){e!==this._world&&(this.detachCursorTracking(),this._world=e,e&&this.attachCursorTracking())}get world(){return this._world}_pointerMoveHandler=null;mode=0;maxDistance=1;_pickerSize=6;get pickerSize(){return this._pickerSize}set pickerSize(e){this._pickerSize=e;const t=`${e}px`;this.marker&&(this.marker.three.element.style.width=t,this.marker.three.element.style.height=t)}_enabled=!1;set enabled(e){this._enabled=e,this.marker&&(this.marker.visible=e),e&&this.get()}get enabled(){return this._enabled}_components;static baseSnappingStyle={height:"6px",width:"6px",borderRadius:"100%",borderWidth:"2px",borderColor:"rgb(122, 75, 209)",borderStyle:"solid",zIndex:"-20"};static snappingStyles={[wt.FACE]:{...pe.baseSnappingStyle},[wt.POINT]:{...pe.baseSnappingStyle,borderColor:"#e25959",borderRadius:"0"},[wt.LINE]:{...pe.baseSnappingStyle,borderColor:"#2d2d2d",borderRadius:"0"}};constructor(e){this._components=e}dispose(){this.detachCursorTracking(),this.marker&&this.marker.dispose()}async get(e){const t=e?.world??this.world;if(!t)throw new Error("GraphicVertexPicker: a world is need to get a casting result.");const s=await this._components.get(ys).get(t).castRay({snappingClasses:e?.snappingClasses});if(s){if(!this.marker){const i=document.createElement("div");this.marker=new ti(t,i)}if(this.marker.world!==t&&(this.marker.world=t,this.marker.three.removeFromParent(),t.scene.three.add(this.marker.three)),this.marker.visible=!0,this.marker.three.position.copy(s.point),this._snapStickyClient={x:this._lastClient.x,y:this._lastClient.y},"snappingClass"in s&&typeof s.snappingClass=="number"&&(s.snappingClass===0||s.snappingClass===1||s.snappingClass===2)){const i=pe.snappingStyles[s.snappingClass]??pe.baseSnappingStyle;Object.assign(this.marker.three.element.style,i)}else Object.assign(this.marker.three.element.style,pe.baseSnappingStyle);this.applyMarkerSize()}else this.marker&&(this.marker.visible=!1,this._snapStickyClient=null);return s}applyMarkerSize(){if(!this.marker)return;const e=`${this._pickerSize}px`;this.marker.three.element.style.width=e,this.marker.three.element.style.height=e}stickyRadiusPx=12;_lastNdc=new D(2,2);_lastClient={x:0,y:0};_ndcWorld=new L;_cursorRafScheduled=!1;_snapStickyClient=null;attachCursorTracking(){if(!this._world?.renderer)return;const e=this._world.renderer.three.domElement;this._pointerMoveHandler=t=>{const s=e.getBoundingClientRect(),i=(t.clientX-s.left)/s.width*2-1,r=-((t.clientY-s.top)/s.height)*2+1;if(this._lastNdc.set(i,r),this._lastClient.x=t.clientX,this._lastClient.y=t.clientY,this._snapStickyClient){const a=t.clientX-this._snapStickyClient.x,o=t.clientY-this._snapStickyClient.y;if(a*a+o*o<=this.stickyRadiusPx*this.stickyRadiusPx)return;this._snapStickyClient=null}this._cursorRafScheduled||(this._cursorRafScheduled=!0,requestAnimationFrame(()=>{this._cursorRafScheduled=!1,this.syncMarkerToCursor(),this._world?.renderer?.update()}))},e.addEventListener("pointermove",this._pointerMoveHandler)}detachCursorTracking(){!this._pointerMoveHandler||!this._world?.renderer||(this._world.renderer.three.domElement.removeEventListener("pointermove",this._pointerMoveHandler),this._pointerMoveHandler=null)}syncMarkerToCursor(){if(!this.marker||!this._world?.camera)return;const e=this._world.camera.three;this._ndcWorld.set(this._lastNdc.x,this._lastNdc.y,.5).unproject(e),this.marker.three.position.copy(this._ndcWorld)}}export{j as G,Gi as O,me as g};
