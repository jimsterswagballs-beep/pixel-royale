// Season 2 (v38): spore traps. Hidden fungal pods in the corrupted places.
// - Placement is deterministic from the map (same on every machine), about 10 per heavy site, 5 per medium and 2 per light.
// - Dormant until a player comes within TRAP.trigger metres. Then it bursts into a TRAP.radius metre spore cloud that lasts
//   TRAP.life seconds and gives each player inside one infection stack (once per burst). It re-arms TRAP.rearm seconds after it fired.
// - The host decides everything. Everyone gets {k:'strap'} to draw the cloud; only the players caught in it get {k:'strapfx'},
//   which starts their screen overlay (overlay.js), so nobody else sees it.
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as W from './world.js';
import {TRAP} from './season2.js';

const TAU=Math.PI*2;
const rngOf=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
const near=(x,z,list,pad)=>list.some(b=>Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad);

let cache=null;
// every trap on the map: {x,y,z,site,tier,theme}. Built once, after W.buildMap().
export function trapSpots(){
 if(cache)return cache;
 const out=[];
 W.SITES.forEach((s,si)=>{
  const r=rngOf(7000+si*131),want=TRAP.count[s.tier]||0,blds=W.buildings.filter(b=>Math.hypot(b.x-s.x,b.z-s.z)<s.r*1.25),mine=[];
  for(let n=0;n<want;n++){
   for(let k=0;k<80;k++){
    // heavy places are trapped right through the middle, light ones only near the edge of the glow
    const a=r()*TAU,d=s.r*(.12+.9*Math.sqrt(r())),x=s.x+Math.cos(a)*d,z=s.z+Math.sin(a)*d,h=W.H(x,z);
    if(h<2.1||h>30||W.roadDist(x,z)<2.4||W.riverDist(x,z)<8||near(x,z,blds,1.4))continue;
    if(W.LAKES.some(L=>Math.hypot(x-L.x,z-L.z)<L.r+3))continue;
    if(mine.some(p=>Math.hypot(p.x-x,p.z-z)<TRAP.gap))continue;
    if(W.lootSpots.some(l=>Math.hypot(l.x-x,l.z-z)<2.6))continue;
    mine.push({x,y:h,z,site:s.n,tier:s.tier,theme:s.theme});break}}
  for(const p of mine)out.push(p)});
 cache=out;return out;
}

// ---------- visuals: a squat spotted pod on the ground, one instanced mesh, coloured per instance
const prep=g=>{g=g.index?g.toNonIndexed():g;if(g.attributes.uv)g.deleteAttribute('uv');return g};
const paint=(g,v)=>{const n=g.attributes.position.count,a=new Float32Array(n*3).fill(v);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g};
function podGeo(){
 const dome=prep(new THREE.SphereGeometry(1,8,4,0,TAU,0,Math.PI/2));dome.scale(.62,.42,.62);dome.translate(0,.12,0);paint(dome,.8);
 const rim=prep(new THREE.CylinderGeometry(.66,.7,.12,8));rim.translate(0,.06,0);paint(rim,.45);
 const parts=[dome,rim];
 for(let i=0;i<6;i++){const a=i*1.05,rr=.2+.18*(i%2),s=prep(new THREE.SphereGeometry(1,5,3));s.scale(.09,.05,.09);s.translate(Math.cos(a)*rr,.12+.4*Math.sqrt(Math.max(0,1-(rr/.62)**2))+.01,Math.sin(a)*rr);paint(s,1);parts.push(s)}
 return mergeGeometries(parts);
}
function glowTex(){
 const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.5,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function buildSporeTrapVis(scene){
 const spots=trapSpots();if(!spots.length)return null;
 const n=spots.length,m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3(),C=new THREE.Color();
 const pods=new THREE.InstancedMesh(podGeo(),new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}),n);
 const gg=new THREE.PlaneGeometry(1,1);gg.rotateX(-Math.PI/2);
 const glow=new THREE.InstancedMesh(gg,new THREE.MeshBasicMaterial({map:glowTex(),transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}),n);
 pods.frustumCulled=false;glow.frustumCulled=false;glow.renderOrder=3;pods.receiveShadow=false;
 const root=new THREE.Group();root.name='sporeTraps';root.add(pods,glow);scene.add(root);
 const yaw=spots.map((_,i)=>(i*2.399)%TAU);
 const cols=spots.map(sp=>({cap:new THREE.Color(sp.theme.caps[0]),glow:new THREE.Color(sp.theme.glow[0]),dead:new THREE.Color('#4b4450')}));
 // st: 0 armed, 1 bursting, 2 cooling. age: seconds since it burst.
 return{root,n,
  // every frame: dormant pods breathe a faint glow, a burst flashes, a spent pod sags and goes grey, and swells back before it re-arms
  update(t,traps,cam){
   for(let i=0;i<n;i++){
    const sp=spots[i],tr=traps[i];
    const far=Math.abs(sp.x-cam.x)+Math.abs(sp.z-cam.z)>170;
    let sc=1,sy=1,k=0,gk=0;
    if(far){m4.makeScale(0,0,0);pods.setMatrixAt(i,m4);glow.setMatrixAt(i,m4);continue}
    if(tr.st===0){k=0;gk=.45+.35*Math.sin(t*2.2+i*1.7);sy=1+.05*Math.sin(t*2.2+i*1.7)}
    else if(tr.st===1){const u=Math.min(1,tr.age/.5);k=1-u*.7;gk=1-u*.6;sc=1.35-.35*u;sy=1.5-.7*u}
    else{const back=Math.max(0,(tr.age-(TRAP.rearm-2.5))/2.5);k=.9-back*.9;sy=.55+.45*back;gk=back*.3;sc=1}
    // the cap colour: armed = its theme colour, spent = grey
    if(tr.st===2){C.copy(cols[i].dead).lerp(cols[i].cap,Math.max(0,(tr.age-(TRAP.rearm-2.5))/2.5))}else C.copy(cols[i].cap).lerp(cols[i].glow,tr.st===1?.6:.15+.12*Math.sin(t*2.2+i));
    pods.setColorAt(i,C);
    e.set(0,yaw[i],0);q.setFromEuler(e);p.set(sp.x,sp.y-.05,sp.z);s.set(sc,sc*sy,sc);m4.compose(p,q,s);pods.setMatrixAt(i,m4);
    p.set(sp.x,sp.y+.08,sp.z);const gs=gk>0?(1.6+gk*1.1)*(tr.st===1?1.8:1):0;s.set(gs,1,gs);m4.compose(p,q,s);glow.setMatrixAt(i,m4);
    C.copy(cols[i].glow).multiplyScalar(gk);glow.setColorAt(i,C);
   }
   pods.instanceMatrix.needsUpdate=true;glow.instanceMatrix.needsUpdate=true;
   if(pods.instanceColor)pods.instanceColor.needsUpdate=true;if(glow.instanceColor)glow.instanceColor.needsUpdate=true;
  }};
}

export const trapMethods={
 // match start, every machine: every trap armed
 resetSporeTraps(){this.sporeTraps=trapSpots().map(()=>({st:0,age:0,hit:null}));if(this.me)this.me.sporeT=0},
 // host: a trap goes off because a player came close
 burstTrap(i){
  const tr=this.sporeTraps[i],sp=trapSpots()[i];if(!tr||!sp||tr.st!==0)return;
  tr.st=1;tr.age=0;tr.hit=new Set();
  this.emit({k:'strap',n:i});
 },
 // every machine: draw the cloud and play the burst (the host's own emit runs this too)
 onTrapBurst(ev){
  const sp=trapSpots()[ev.n],tr=this.sporeTraps&&this.sporeTraps[ev.n];if(!sp||!tr)return;
  tr.st=1;tr.age=0;if(this.role==='client')tr.hit=null;
  const x=sp.x,y=sp.y+.7,z=sp.z,fx=this.fx;
  this.addCloudVis({x,y,z,r:TRAP.radius,life:TRAP.life});
  this.audio.play('strap',new THREE.Vector3(x,y,z),1);
  fx.burst(x,y,z,34,6,'#b6ff6a',.9,2);fx.burst(x,y,z,22,5,'#c58bff',.9,2);fx.ring({x,y:sp.y+.1,z},TRAP.radius*.8,'#b6ff9a',.7);
  for(let k=0;k<10;k++)fx.puff(x,y,z,(Math.random()-.5)*5,.6+Math.random()*1.4,(Math.random()-.5)*5,Math.random()<.5?'#a8ff7a':'#c9a8ff',1.4,1.4,1.8,.5,-.1,1.2);
 },
 // host + clients: timers. The host also decides who sets a trap off and who is caught in the cloud.
 updateSporeTraps(dt){
  const trs=this.sporeTraps;if(!trs)return;
  const host=this.role!=='client',spots=trapSpots();
  const r2=TRAP.trigger*TRAP.trigger,cr2=TRAP.radius*TRAP.radius;
  for(let i=0;i<trs.length;i++){
   const tr=trs[i],sp=spots[i];
   if(tr.st===0){
    if(!host)continue;
    for(const t of this.list){
     if(!t.alive||t.drop)continue;
     const dx=t.pos.x-sp.x,dz=t.pos.z-sp.z;if(dx*dx+dz*dz>r2||Math.abs(t.pos.y-sp.y)>3.2)continue;
     this.burstTrap(i);break}
    continue}
   tr.age+=dt;
   if(tr.st===1){
    if(host&&tr.hit&&tr.age<=TRAP.life){
     for(const t of this.list){
      if(!t.alive||t.drop||tr.hit.has(t.id))continue;
      const dx=t.pos.x-sp.x,dz=t.pos.z-sp.z,dy=t.pos.y+.9-(sp.y+.7);if(dx*dx+dz*dz+dy*dy*.5>cr2)continue;
      tr.hit.add(t.id);
      this.infect(t,null,TRAP.stacks,-26);
      this.emit({k:'strapfx',n:i},t.id)}}
    if(tr.age>=TRAP.life)tr.st=2}
   if(tr.st===2&&tr.age>=TRAP.rearm){tr.st=0;tr.age=0;tr.hit=null}
  }
 },
 updateSporeTrapVis(){const v=this.sporeTrapVis;if(v&&this.sporeTraps)v.update(this.t,this.sporeTraps,this.camera.position)}
};
