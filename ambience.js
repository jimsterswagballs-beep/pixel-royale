// Season 2 (v38): the mood of an infected place. The closer you are to a corrupted site (and the worse its tier), the more:
//  - the fog turns purple and closes in,
//  - the sky and the light go cold and violet and the sun dims,
//  - low purple haze and slow spores hang near the ground around you,
//  - the glowing mushrooms shine brighter against the gloom,
//  - a faint violet glow rings the edge of the screen, and a low hum rises,
//  - a banner names the place when you walk in.
// Runs after the weather update each frame (weather sets the base look, this blends on top of it) and never touches the match itself.
import * as THREE from 'three';
import * as W from './world.js';
import {AMBIENCE} from './season2.js';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const PURPLE=new THREE.Color('#5a3a8c'),SKY_TOP=[.16,.08,.3],SKY_MID=[.3,.16,.46],SKY_HZ=[.46,.26,.6];
const HEMI_SKY=new THREE.Color('#dcecff'),HEMI_SKY_VIO=new THREE.Color('#a890e8'),SUN=new THREE.Color('#ffeac4'),SUN_VIO=new THREE.Color('#b8a0ff');
const FOG0=new THREE.Color();

export const ambienceMethods={
 // match start
 fungusReset(){if(this.cosSprouts){for(const m of this.cosSprouts)this.dynamic.remove(m.obj)}this.cosSprouts=[];this.fgK=0;this.fgSite=null;this.fgBanner=0;this.fgHaze=0;if(this.audio&&this.audio.setFungusHum)this.audio.setFungusHum(0)},
 // every frame, after updateWeatherVis
 updateFungusAmbience(dt){
  const cam=this.camera.position,fog=this.scene.fog;
  if(this.fgNear0===undefined)this.fgNear0=fog.near;
  // how infected is the ground under the camera (only near the ground: flying over on the bus does not count)
  let k=0,site=null;
  if(this.running&&this.state!=='bus'){
   const gy=W.H(cam.x,cam.z);k=W.fungusAt(cam.x,cam.z);site=W.fungusSite();
   k*=clamp(1-(cam.y-gy-18)/50,0,1)}
  this.fgK=(this.fgK||0)+(k-(this.fgK||0))*Math.min(1,dt*AMBIENCE.rate);
  const f=this.fgK<.004?0:this.fgK;
  this.fungusUi(f,site,dt);
  if(f<=0){ // nothing to blend: put the base values back (the weather code does not reset the near plane or the light colours)
   fog.near=this.fgNear0;this.hemi.color.copy(HEMI_SKY);this.sun.color.copy(SUN);
   if(this.audio.setFungusHum)this.audio.setFungusHum(0);
   return}
  if(site)this.fgSite=site;
  const th=(this.fgSite&&this.fgSite.theme)||{};
  // fog: purple, tinted a little by the place's own palette, thicker and nearer
  FOG0.copy(PURPLE);if(th.fog)FOG0.lerp(new THREE.Color(th.fog),.45);
  fog.color.lerp(FOG0,clamp(f*.9,0,.88));
  fog.far=Math.max(70,fog.far*(1-AMBIENCE.fogFar*f));
  fog.near=Math.max(4,Math.min(this.fgNear0*(1-AMBIENCE.fogNear*f),fog.far*.12));
  this.fogFar=fog.far;                       // the weather code eases toward its own value next frame, so there is no jump
  // sky and light
  const u=this.sky.material.uniforms,s=f*AMBIENCE.sky;
  u.uTop.value.lerp(new THREE.Vector3(...SKY_TOP),s);u.uMid.value.lerp(new THREE.Vector3(...SKY_MID),s);u.uHz.value.lerp(new THREE.Vector3(...SKY_HZ),s);
  this.hemi.color.copy(HEMI_SKY).lerp(HEMI_SKY_VIO,f*.8);this.sun.color.copy(SUN).lerp(SUN_VIO,f*.7);
  this.sun.intensity*=1-AMBIENCE.light*f;this.hemi.intensity*=1-.15*f;
  // low haze and slow spores hanging around the camera
  this.fgHaze=(this.fgHaze||0)+dt*(6+26*f);
  while(this.fgHaze>1){this.fgHaze-=1;const a=Math.random()*6.283,d=3+Math.random()*26,x=cam.x+Math.cos(a)*d,z=cam.z+Math.sin(a)*d,y=W.H(x,z);
   if(Math.random()<.6)this.fx.puff(x,y+.3+Math.random()*1.2,z,(Math.random()-.5)*.5,.05+Math.random()*.25,(Math.random()-.5)*.5,Math.random()<.7?'#7a52b8':'#5a8ad8',3.2,2.6+Math.random()*2.4,.6,.2*Math.min(1,f*1.4),0,.4);
   else this.fx.emit(x,y+.5+Math.random()*3,z,(Math.random()-.5)*.4,.15+Math.random()*.3,(Math.random()-.5)*.4,Math.random()<.5?'#c9a8ff':'#9bff78',3,0,.1,0,0,.4)}
  if(this.fungus)this.fungus.boost=f;
  if(this.audio.setFungusHum)this.audio.setFungusHum(f*AMBIENCE.hum);
 },
 // the violet screen glow and the "you are entering" banner
 // back in the menus: put everything the ambience bends back to its base look
 fungusMenu(){
  this.fgK=0;this.fgIn=null;if(this.fgTint&&this.fgTintV){this.fgTintV=0;this.fgTint.style.opacity='0'}
  if(this.fgNear0!==undefined)this.scene.fog.near=this.fgNear0;
  this.hemi.color.copy(HEMI_SKY);this.sun.color.copy(SUN);if(this.fungus)this.fungus.boost=0;
  if(this.audio.setFungusHum)this.audio.setFungusHum(0);
 },
 fungusUi(f,site,dt){
  let el=this.fgTint;
  if(!el){el=this.fgTint=document.createElement('div');el.id='fgTint';const gl=document.getElementById('gl');if(gl)gl.after(el);else document.body.appendChild(el)}
  const want=this.running&&this.state!=='bus'?f:0;
  const v=Math.round(want*100)/100;if(v!==this.fgTintV){this.fgTintV=v;el.style.opacity=v>0?String(Math.min(.85,v*.9)):'0'}
  // banner: once when you walk into a new site, not again until you have left it
  if(want>.5&&site&&this.fgIn!==site.n){this.fgIn=site.n;if(this.hud)this.hud.toast('Infected zone: '+site.n,'#c58bff')}
  else if(want<.18)this.fgIn=null;
 }
};
