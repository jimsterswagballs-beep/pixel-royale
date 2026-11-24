// Twisters (v49): tornadoes in thunderstorms and a hurricane in its own weather period.
// The times and paths come from the match seed, so every player gets the same twisters with no extra messages.
// The host does the pushes and damage (sent as knockback events, like the gale). Everyone sees the funnels,
// the debris and the warnings, and each twister forms on screen for a few seconds before it touches down.
import * as THREE from 'three';
import * as W from './world.js';
import {mulberry32} from './data.js';

const TORNADO_R=9, TORNADO_H=170, TORNADO_DUR=[22,30];   // ground radius, height of the funnel, length of a touchdown (s)
const HURR_R=55, HURR_H=150, HURR_MAX=95, HURR_EYE=12;   // the hurricane: its outer radius, its height, its longest run, and the calm eye
const WARN=8;                                            // seconds of warning before a twister touches down
const TW_WID=-30, HU_WID=-31;                            // causes of death (KILL_NAMES in data.js)

// the plan for a match: a list of twisters, built from the weather periods (segs) and the seed
export function twisterPlan(seed,segs){
 const r=mulberry32((seed|0)+4242);
 const out=[];
 const spot=()=>({x:(r()*2-1)*W.ISL*.38,z:(r()*2-1)*W.ISL*.38});
 for(const sg of segs){
  const len=sg.t1-sg.t0;
  if(sg.k==='storm'){
   // one tornado most of the time, sometimes two in a long thunderstorm
   const n=len>120&&r()<.5?2:(r()<.7?1:0);
   for(let i=0;i<n;i++){
    const dur=TORNADO_DUR[0]+r()*(TORNADO_DUR[1]-TORNADO_DUR[0]);
    const t0=sg.t0+12+r()*Math.max(1,len-12-dur-6);
    const p=spot(),a=r()*6.283,sp=6+r()*4;
    out.push({kind:'tornado',t0,t1:t0+dur,x0:p.x,z0:p.z,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,r:TORNADO_R,h:TORNADO_H});
   }
  }else if(sg.k==='hurricane'){
   const dur=Math.min(HURR_MAX,len-4),t0=sg.t0+3;
   const p=spot(),a=r()*6.283;
   out.push({kind:'hurricane',t0,t1:t0+dur,x0:p.x,z0:p.z,vx:Math.cos(a)*2.2,vz:Math.sin(a)*2.2,r:HURR_R,h:HURR_H});
  }
 }
 return out;
}

// where a twister is at match time t (it drifts in a straight line)
export function twisterAt(v,t){const k=Math.max(0,t-v.t0);return{x:v.x0+v.vx*k,z:v.z0+v.vz*k}}

const TW_V=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const TW_F=`uniform float uT,uOp;uniform vec3 uA;varying vec2 vUv;
void main(){
 float th=vUv.x*6.2831853,h=vUv.y;
 float s=sin(th*3.+h*11.-uT*7.)+.5*sin(th*7.-h*17.+uT*11.);
 float band=smoothstep(-.2,1.1,s);
 float fade=smoothstep(0.,.15,h)*(1.-smoothstep(.85,1.,h));
 gl_FragColor=vec4(mix(uA*.7,uA*2.2,band),(.7+.3*band)*fade*uOp);
}`;

export const twisterMethods={
 // host, every 0.35 s: twisters pull, lift and spin whoever is in reach, and tornadoes hurt
 updateTwisters(dt){
  if(!this.twisters||!this.running||this.over)return;
  this.twT=(this.twT||0)-dt;if(this.twT>0)return;this.twT=.35;
  for(const v of this.twisters){
   if(this.t<v.t0||this.t>v.t1)continue;
   const c=twisterAt(v,this.t),hu=v.kind==='hurricane';
   const zone=hu?v.r:v.r*1.5;
   for(const e of this.chaosTargets()){
    const dx=e.pos.x-c.x,dz=e.pos.z-c.z,d=Math.hypot(dx,dz);
    if(d>zone||d<.01)continue;
    const s=1-d/zone,tx=-dz/d,tz=dx/d,ix=-dx/d,iz=-dz/d;
    let vx,vy,vz;
    if(hu){ // hurricane: a steady spinning wind, gentler inside the calm eye
     const k=d<HURR_EYE?.4:1;
     vx=(tx*5+v.vx*.4+ix*1.5)*s*k;vy=0;vz=(tz*5+v.vz*.4+iz*1.5)*s*k;
    }else{ // tornado: swirl, pull toward the funnel and lift it
     vx=tx*6*s+ix*2.5*s;vy=d<v.r*1.2?5*s:0;vz=tz*6*s+iz*2.5*s;
    }
    this.emit({k:'st',i:e.id,s:'kb',vx,vy,vz},e.id);
    if(!hu&&d<v.r&&this.t-(e.twHitT||-9)>=1){e.twHitT=this.t;this.damage(e,5,null,TW_WID)}
   }
  }
 },
 // everyone, every frame: the forming funnel, its warning, and the debris around it
 updateTwisterVis(dt){
  if(!this.twisters)return;
  if(!this.twV)this.twV=new Map();
  const cam=this.camera.position;
  for(const v of this.twisters){
   // warning (once per twister), then the funnel forms, touches down and fades away
   if(!v.warned&&this.t>=v.t0-WARN&&this.t<=v.t1){v.warned=true;this.hud.announce(v.kind==='tornado'?'Tornado warning!':'Hurricane warning!','#9be0ff');this.audio.play('storm')}
   const show=this.t>=v.t0-WARN&&this.t<=v.t1+1;
   let m=this.twV.get(v);
   if(!show){if(m){this.dynamic.remove(m);m.geometry.dispose();m.material.dispose();this.twV.delete(v)}continue}
   if(!m){m=this.makeTwisterMesh(v);this.twV.set(v,m)}
   const c=twisterAt(v,this.t);
   m.position.x=c.x;m.position.z=c.z;
   const form=Math.min(1,Math.max(0,(this.t-(v.t0-WARN))/WARN)),end=Math.min(1,Math.max(0,(v.t1+1-this.t)/1));
   m.material.uniforms.uT.value=this.t;m.material.uniforms.uOp.value=Math.min(form,end)*(v.kind==='tornado'?.9:.75);
   // debris and dust while it is on the ground, if you can see it
   if(this.t>=v.t0&&this.t<=v.t1&&Math.hypot(c.x-cam.x,c.z-cam.z)<160){
    v.fxT=(v.fxT||0)-dt;
    if(v.fxT<=0){v.fxT=.08;
     const hu=v.kind==='hurricane';
     for(let j=0;j<(hu?2:4);j++){
      const a=Math.random()*6.283,rr=(hu?v.r*.9:v.r)*(.5+Math.random()*.6);
      const x=c.x+Math.cos(a)*rr,z=c.z+Math.sin(a)*rr;
      if(hu){this.fx.puff(x,v.h*.9+Math.random()*10,z,Math.cos(a)*4,-2,Math.sin(a)*4,'#9aa3ad',2.2,6,1.2,.45,0,1)}
      else{this.fx.emit(x,.5+Math.random()*2,z,-Math.sin(a)*14,4+Math.random()*6,Math.cos(a)*14,'#7a6a52',.9+Math.random()*.5,8,.25+Math.random()*.2,-.4,.8)}
     }
    }
   }
  }
 },
 makeTwisterMesh(v){
  const hu=v.kind==='hurricane';
  // narrow at the ground, wide under the cloud base
  const g=new THREE.CylinderGeometry(hu?v.r*1.4:v.r*2.4,hu?12:v.r*.7,v.h,40,1,true);
  const col=hu?new THREE.Vector3(.15,.18,.22):new THREE.Vector3(.2,.19,.18);
  const m=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uOp:{value:0},uA:{value:col}},vertexShader:TW_V,fragmentShader:TW_F,transparent:true,side:THREE.DoubleSide,depthWrite:false});
  const mesh=new THREE.Mesh(g,m);mesh.position.set(v.x0,v.h/2,v.z0);mesh.renderOrder=4;this.dynamic.add(mesh);
  return mesh;
 },
 // at the start of a match: clear any funnels left from the last one
 twisterReset(){
  if(this.twV){for(const m of this.twV.values()){this.dynamic.remove(m);m.geometry.dispose();m.material.dispose()}}
  this.twV=new Map();
 },
};
