// The storm look (v48). The wall is an animated violet shader: rolling bands that climb, a bright rim that
// brightens where you look at it edge-on, and lightning flashes that light it up. Wisps spin along its edge.
// Outside the circle the feel is heavier: a steady tremble, streaks of motes past the lens, and a pulsing
// purple vignette (style.css) and murky fog (weather.js).
import * as THREE from 'three';
import * as W from './world.js';

const WALL_V=`varying vec2 vUv;varying vec3 vN;varying vec3 vW;
void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`;
const WALL_F=`uniform float uT,uFlash,uNear,uAlpha;uniform vec3 uCam,uA,uB;varying vec2 vUv;varying vec3 vN;varying vec3 vW;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.1+vec2(3.1,1.7);a*=.5;}return v;}
void main(){
 float th=vUv.x*6.2831853,h=vUv.y;
 vec2 ring=vec2(cos(th),sin(th))*1.3;
 float n1=fbm(ring+vec2(0.,h*1.6-uT*.55));
 float n2=fbm(ring*2.3+vec2(uT*.35,h*5.-uT*1.9)+7.);
 float n=n1*.62+n2*.38;
 float band=smoothstep(.46,.8,n);
 float fade=smoothstep(0.,.14,h)*(1.-smoothstep(.8,1.,h));
 float rim=pow(1.-abs(dot(normalize(vN),normalize(uCam-vW))),2.2);
 vec3 col=mix(uA,uB,band)+vec3(1.,.9,1.)*pow(band,4.)*.4+uB*rim*.9+vec3(.7,.6,1.)*uFlash;
 float a=(band*.5+rim*.55+.22)*fade*uAlpha*(.8+.5*uNear)+uFlash*.25*fade;
 gl_FragColor=vec4(col,clamp(a,0.,1.));
}`;

export const stormFxMethods={
 // once per match: the storm wall (replaces the flat cylinder). Its scale and position are set in updateStormVis.
 initStormWall(){
  this.stormWallU={uT:{value:0},uFlash:{value:0},uNear:{value:0},uAlpha:{value:1},uCam:{value:new THREE.Vector3()},
   uA:{value:new THREE.Vector3(.165,.051,.341)},uB:{value:new THREE.Vector3(.788,.549,1)}};
  const m=new THREE.ShaderMaterial({uniforms:this.stormWallU,vertexShader:WALL_V,fragmentShader:WALL_F,transparent:true,side:THREE.DoubleSide,depthWrite:false});
  this.stormMesh=new THREE.Mesh(new THREE.CylinderGeometry(1,1,700,72,1,true),m);
  this.stormMesh.position.y=250;this.stormMesh.renderOrder=3;this.dynamic.add(this.stormMesh);
 },
 // every frame: the wall's clock, lightning light, how near the camera is to it, and wisps along its edge
 updateStormWall(dt){
  const s=this.storm,U=this.stormWallU,cam=this.camera.position;
  U.uT.value=this.t;U.uCam.value.copy(cam);U.uFlash.value=this.wxFlash||0;
  const dWall=Math.abs(Math.hypot(cam.x-s.cx,cam.z-s.cz)-s.r);
  U.uNear.value=Math.max(0,1-dWall/90);
  this.wispT=(this.wispT||0)-dt;
  if(this.wispT>0||dWall>200)return;
  this.wispT=.05;
  for(let j=0;j<3;j++){
   const a=Math.random()*6.283,rr=s.r+(Math.random()-.5)*5;
   const x=s.cx+Math.cos(a)*rr,z=s.cz+Math.sin(a)*rr;
   const y=Math.max(0,W.H(x,z))+Math.random()*30,sp=4+Math.random()*5;
   // swirl along the wall and rise
   this.fx.emit(x,y,z,-Math.sin(a)*sp,1+Math.random()*2.5,Math.cos(a)*sp,'#b98cff',1.4+Math.random()*.9,-1.1,.5+Math.random()*.4,1.2,.9,.85);
  }
 },
 // inside the storm (outside the circle, alive, on foot or gliding): a steady tremble and streaks of motes past the lens
 updateStormFeel(dt){
  const on=this.inStormTint&&this.running&&!this.over&&!!this.me&&this.me.alive&&this.me.drop===null;
  this.feelK=(this.feelK||0)+((on?1:0)-(this.feelK||0))*Math.min(1,dt*2.5);
  const k=this.feelK;if(k<.03)return;
  this.view.shake=Math.max(this.view.shake,.4*k);
  this.moteT=(this.moteT||0)-dt;
  if(this.moteT>0)return;
  this.moteT=.035;
  const cam=this.camera.position,w=this.windV||{x:0,z:0};
  for(let j=0;j<Math.ceil(5*k);j++){
   const a=Math.random()*6.283,d=2.5+Math.random()*14;
   this.fx.emit(cam.x+Math.cos(a)*d,cam.y+(Math.random()-.5)*8,cam.z+Math.sin(a)*d,w.x*1.6+(Math.random()-.5)*6,(Math.random()-.5)*2,w.z*1.6+(Math.random()-.5)*6,'#d2b0ff',.3+Math.random()*.2,0,.14+Math.random()*.1,0,0,.75);
  }
 },
};
