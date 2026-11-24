// The Battle Bus drop (v40). While you are on the bus, or falling, a gold ring on the ground shows where you would land
// if you jumped now (it uses the same fall and wind rules as movement.js), and the bus hint shows your height.
// Only your own view does this: other players' rings are not drawn and nothing here changes the match.
import * as THREE from 'three';
import * as W from './world.js';
import {R} from './shared.js';

const OPEN_AT=95;   // metres: a falling player whose glider opens automatically at this height
export const dropMethods={
 // where a player starting at (P, V) would land. `deployed` = the glider is already open. No steering: the straight line down.
 predictLanding(P0,V0,deployed){
  const P=P0.clone(),V=V0.clone();let open=deployed;const wind=this.windV||{x:0,z:0},dt=.1;
  for(let i=0;i<900;i++){
   const gnd=W.groundAt(P.x,P.z,P.y,R),alt=P.y-gnd;
   if(!open&&alt<OPEN_AT)open=true;
   if(open){V.y+=(-7.5-V.y)*Math.min(1,dt*2.5);V.x+=(wind.x-V.x)*Math.min(1,dt*2);V.z+=(wind.z-V.z)*Math.min(1,dt*2)}
   else{V.y+=(-40-V.y)*Math.min(1,dt*1.8);V.x+=(wind.x*.4-V.x)*Math.min(1,dt*1.5);V.z+=(wind.z*.4-V.z)*Math.min(1,dt*1.5)}
   P.x+=V.x*dt;P.y+=V.y*dt;P.z+=V.z*dt;
   if(P.y<=W.groundAt(P.x,P.z,P.y,R)+.02)break;
  }
  return{x:P.x,z:P.z,y:W.groundAt(P.x,P.z,P.y,R)}},
 // every frame: keep the ring under the predicted landing spot, and the height readout, up to date
 updateDropPreview(dt){
  const me=this.me;
  if(!this.dropRing){
   const m=new THREE.Mesh(new THREE.RingGeometry(2.6,3.2,48),new THREE.MeshBasicMaterial({color:'#ffd23d',transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide}));
   m.rotation.x=-Math.PI/2;m.renderOrder=4;m.visible=false;this.dynamic.add(m);this.dropRing=m;this.dropT=0;
  }
  const on=me&&me.alive&&(me.drop==='bus'||me.drop==='free'||me.drop==='glide'); 
  this.dropRing.visible=!!on&&(me.drop==='bus'||me.drop==='free');
  this.dropAlt=on?Math.max(0,Math.round(me.pos.y-W.groundAt(me.pos.x,me.pos.z,me.pos.y,R))):0;
  if(!this.dropRing.visible)return;
  this.dropT-=dt;
  if(this.dropT<=0||!this.dropP){
   this.dropT=.12;
   this.dropP=me.drop==='bus'
    ? this.predictLanding(this.bus.pos,new THREE.Vector3(this.bus.dx*this.bus.speed*.6,-2,this.bus.dz*this.bus.speed*.6),false)
    : this.predictLanding(me.pos,me.vel,false);
  }
  const p=this.dropP;this.dropRing.position.set(p.x,p.y+.12,p.z);
  this.dropRing.material.opacity=.55+.3*Math.sin(this.t*5);
 }
};
