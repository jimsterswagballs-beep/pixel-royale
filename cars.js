// Cars (Season 1): they spawn on the roads, seat up to four players and burn when low, then explode at 0 hp.
// There are five kinds of car (sedan, pickup, van, sports, jeep). Each has its own health, top speed, acceleration and turning.
// The host simulates everything (driving, damage, seats, explosions) and sends the cars in the snapshot ('cr').
// Guests send their drive input ('carin') and seat requests ('car'). Clients only draw the cars they are sent.
import * as THREE from 'three';
import * as W from './world.js';
import {clamp,mulberry32} from './data.js';

export const CAR_HP=250;          // sedan health (the reference for the burn point)
export const CAR_BURN=90;         // the sedan burns at or below this (other cars burn at the same share of their health)
export const CAR_MAX=14;          // cars on the map at once
export const CAR_RESPAWN_T=7;     // seconds between new cars appearing
const SEATS=[[-.5,.45],[.5,.45],[-.5,-1],[.5,-1]];   // [right, forward] offsets from the car centre (seat 0 is the driver)
const CAR_COLS=['#e8453c','#2f7de1','#f2c230','#f4f4f4','#3ab56b','#8d5bd6','#ff8a3d'];
const GLASS='#2b3a4a',TYRE='#1b1b1f',TRIM='#2a2d33';
const r2=v=>Math.round(v*100)/100;
// car frame: forward is (-sin yaw, -cos yaw), right is (cos yaw, -sin yaw); the mesh is built facing -z so rotation.y = yaw
const fwd=yaw=>[-Math.sin(yaw),-Math.cos(yaw)];
const right=yaw=>[Math.cos(yaw),-Math.sin(yaw)];

// the five car kinds. hw/L = half width / half length, by/bh = body centre height / height, cy/ch/cz/cl = cabin,
// wr = wheel radius, ly = headlight height. hp, vmax (top speed), acc (pull), turn (steer rate), brake.
export const CAR_TYPES=[
 {name:'Sedan', hp:250,vmax:28,acc:13,turn:1.4,brake:4,  hw:1.05,L:2.1, by:.8, bh:.75,cy:1.5, ch:.62,cz:-.15,cl:2.2, wr:.42,ly:.86,extra:null},
 {name:'Pickup',hp:300,vmax:26,acc:11,turn:1.2,brake:3.6,hw:1.05,L:2.3, by:.8, bh:.7, cy:1.45,ch:.6, cz:-.7, cl:1.7, wr:.44,ly:.9, extra:'bed'},
 {name:'Van',   hp:330,vmax:22,acc:8.5,turn:1.0,brake:3.2,hw:1.15,L:2.4, by:1.15,bh:1.5,cy:1.7, ch:.45,cz:0,   cl:3.0, wr:.42,ly:.95,extra:null},
 {name:'Sports',hp:180,vmax:36,acc:18,turn:1.8,brake:5,  hw:.98, L:2.05,by:.65,bh:.5, cy:1.05,ch:.42,cz:.1,  cl:1.5, wr:.36,ly:.62,extra:'spoiler'},
 {name:'Jeep',  hp:290,vmax:24,acc:11,turn:1.3,brake:4.2,hw:1.1, L:2.1, by:.95,bh:.8, cy:1.7, ch:.6, cz:-.1, cl:1.9, wr:.5, ly:1.0,extra:'rack'},
];

function box(w,h,d,c,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));m.position.set(x,y,z);m.castShadow=true;return m}
const tyreMat=new THREE.MeshLambertMaterial({color:TYRE});
function makeCarGroup(col,t){
 const g=new THREE.Group();const hw=t.hw,L=t.L;
 g.add(box(hw*2,t.bh,L*2,col,0,t.by,0));                                   // body
 g.add(box(hw*2*.86,t.ch,t.cl,GLASS,0,t.cy,t.cz));                          // glass cabin
 g.add(box(hw*2*.9,.08,t.cl*.96,col,0,t.cy+t.ch/2+.04,t.cz));              // roof
 if(t.extra==='bed'){                                                         // pickup: open bed behind the cab
  const bz=.25+(L-.25)/2,bl=L-.25;
  g.add(box(hw*2-.12,.03,bl,'#5b6069',0,t.by+t.bh/2+.02,bz));
  g.add(box(.1,.4,bl,col,-(hw-.05),t.by+t.bh/2+.2,bz));g.add(box(.1,.4,bl,col,hw-.05,t.by+t.bh/2+.2,bz));
  g.add(box(hw*2,.4,.1,col,0,t.by+t.bh/2+.2,L-.05));
 }
 if(t.extra==='spoiler'){                                                     // sports: rear wing
  for(const x of[-.7,.7])g.add(box(.08,.4,.08,TRIM,x*hw,t.by+t.bh/2+.2,L-.3));
  g.add(box(hw*2*.9,.06,.35,col,0,t.by+t.bh/2+.42,L-.25));
 }
 if(t.extra==='rack'){                                                        // jeep: roof rack and spare wheel
  g.add(box(hw*2*.9,.05,t.cl*.9,TRIM,0,t.cy+t.ch/2+.14,t.cz));
  g.add(box(.24,.5,.5,TRIM,0,t.by,L+.22));
 }
 // wheels: each sits on a pivot that spins (and steers, at the front)
 const wheels=[];
 for(const x of[-1,1])for(const z of[-1,1]){
  const pivot=new THREE.Group();pivot.rotation.order='YXZ';pivot.position.set(x*(hw-.02),t.wr,z*L*.62);
  const w=new THREE.Mesh(new THREE.CylinderGeometry(t.wr,t.wr,.32,10),tyreMat);w.rotation.z=Math.PI/2;w.castShadow=true;pivot.add(w);
  const stripe=box(.03,t.wr*1.5,.12,'#c9ced6',x*.17,0,0);pivot.add(stripe);     // a stripe so the spin shows
  g.add(pivot);wheels.push({pivot,front:z<0});
 }
 // headlights and tail lights
 for(const x of[-.67,.67]){g.add(box(.42,.22,.1,'#fff6c8',x*hw,t.ly,-L-.01));g.add(box(.42,.22,.1,'#ff3b3b',x*hw,t.ly,L+.01))}
 // flames for a burning car: three flickering cones
 const flame=new THREE.Group();flame.visible=false;
 for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(.55,1.6,6),new THREE.MeshBasicMaterial({color:i===1?'#ffd23d':'#ff7a2b',transparent:true,opacity:.9}));f.position.set((i-1)*.6,t.by+t.bh/2+1.2,(i%2?.4:-.4));flame.add(f)}
 g.add(flame);
 // headlight beams: only visible at night
 const beams=new THREE.Group();beams.visible=false;const bm=new THREE.MeshBasicMaterial({color:'#fff6c8',transparent:true,opacity:.16,depthWrite:false});
 for(const x of[-.67,.67]){const cone=new THREE.Mesh(new THREE.ConeGeometry(1.5,9,12,1,true),bm);cone.rotation.x=-Math.PI/2;cone.position.set(x*hw,t.ly,-(L+4.6));beams.add(cone)}
 g.add(beams);
 return{g,flame,beams,wheels}
}

export const carMethods={
 // ---- setup: host spawns, everyone clears
 clearCars(){
  if(this.cars)for(const c of this.cars.values())this.dynamic.remove(c.group);
  this.cars=new Map();this.carRespawnT=2;
 },
 spawnCar(id,x,z,yaw,type=0){
  const ti=CAR_TYPES[type]?type:0,spec=CAR_TYPES[ti];
  const cols=CAR_COLS[(id*7)%CAR_COLS.length];const built=makeCarGroup(cols,spec);
  const c={id,x,y:W.H(x,z),z,yaw,v:0,yr:0,type:ti,spec,hp:spec.hp,maxHp:spec.hp,seats:[-1,-1,-1,-1],inp:{th:0,st:0,br:0},hitT:new Map(),
   tx:x,ty:W.H(x,z),tz:z,tyaw:yaw,burn:false,group:built.g,flame:built.flame,beams:built.beams,wheels:built.wheels,dustT:0,fireT:0,lights:false,
   pitch:0,roll:0,spin:0,sw:0,vyaw:yaw,vv:0};
  built.g.position.set(c.x,c.y,c.z);built.g.rotation.y=yaw;this.dynamic.add(built.g);
  this.cars.set(id,c);return c;
 },
 // host: put a car on a random road (away from people)
 spawnRoadCar(){
  const rng=this.carRng||(this.carRng=mulberry32((this.seed||7)+4242));
  for(let tries=0;tries<40;tries++){
   const [a,b]=W.ROADS[Math.floor(rng()*W.ROADS.length)];const t=.1+rng()*.8;
   const p=W.roadPoint(a,b,t);if(W.H(p.x,p.z)<2.2)continue;
   let near=false;for(const e of this.list)if(e.alive&&Math.hypot(e.pos.x-p.x,e.pos.z-p.z)<40){near=true;break}
   if(near)continue;
   const dir=rng()<.5?1:-1;const yaw=Math.atan2(-p.dx*dir,-p.dz*dir);
   // only where the car fits and there is a clear stretch of road ahead (no trees or props in the way)
   const [fx,fz]=fwd(yaw);let clear=!W.blocked(p.x,W.H(p.x,p.z)+.2,p.z,1.3,1.3,.6);
   for(let d=2;d<=12&&clear;d+=2){const x=p.x+fx*d,z=p.z+fz*d;if(W.blocked(x,W.H(x,z)+.2,z,1.3,1.3,.6))clear=false}
   if(!clear)continue;
   const type=Math.floor(rng()*CAR_TYPES.length);
   this.spawnCar(this.carSeq=(this.carSeq||0)+1,p.x,p.z,yaw,type);return true}
  return false;
 },
 // host: the first cars at the start of a match
 seedCars(n){this.clearCars();this.carSeq=0;for(let i=0;i<n;i++)this.spawnRoadCar()},

 // ---- seats (host decides; guests ask)
 carOf(e){return e&&e.car>=0&&this.cars?this.cars.get(e.car):null},
 freeSeat(c,prefer){
  if(prefer!==undefined&&c.seats[prefer]===-1)return prefer;
  for(let i=0;i<4;i++)if(c.seats[i]===-1)return i;
  return -1;
 },
 nearestCar(e,range){
  let best=null,bd=range;if(!this.cars)return null;
  for(const c of this.cars.values()){if(c.seats.every(s=>s!==-1))continue;const d=Math.hypot(c.x-e.pos.x,c.z-e.pos.z);if(d<bd){bd=d;best=c}}
  return best;
 },
 carEnter(e,id){
  const c=this.cars&&this.cars.get(id);if(!c||e.car>=0||!e.alive||e.knocked||e.drop||e.use||e.emote)return;
  if(Math.hypot(c.x-e.pos.x,c.z-e.pos.z)>5.5)return;
  const s=this.freeSeat(c);if(s<0)return;
  c.seats[s]=e.id;e.car=c.id;e.seat=s;e.vel.set(0,0,0);
 },
 carExit(e){
  const c=this.carOf(e);if(!c)return;
  c.seats[e.seat]=-1;
  if(e.seat===0)c.inp={th:0,st:0,br:0};
  const r=right(c.yaw),side=-1;                       // step out on the left
  e.pos.set(c.x+r[0]*2.2*side,c.y+.05,c.z+r[1]*2.2*side);if(e.tgt){e.tgt.x=e.pos.x;e.tgt.y=e.pos.y;e.tgt.z=e.pos.z}
  e.car=-1;e.seat=-1;e.vel.set(0,0,0);
 },
 carSwap(e){
  const c=this.carOf(e);if(!c)return;
  for(let k=1;k<4;k++){const s=(e.seat+k)%4;if(c.seats[s]===-1){c.seats[e.seat]=-1;c.seats[s]=e.id;e.seat=s;return}}
 },
 // one entry point for the local player and for requests from guests (host side)
 carReq(e,kind,id){
  if(this.role==='client'){this.net.toHost({t:'car',k:kind,id});return}
  if(kind==='enter')this.carEnter(e,id);else if(kind==='exit')this.carExit(e);else if(kind==='seat')this.carSwap(e);
 },
 // interact gets out of a car (returns true when it used the press, so it does not also pick anything up).
 // swap seat is its own key (rebindable in Controls).
 carInCarKeys(){
  const me=this.me,I=this.input;if(!me||me.car<0||!this.app.inputActive())return false;
  if(I.pressed('interact')){this.carReq(me,'exit');return true}
  if(I.pressed('carSeat'))this.carReq(me,'seat');
  return false;
 },
 // interact outside a car: get in the nearest car within reach (loot on the ground comes first, see movement)
 carEnterNearby(){
  const c=this.nearestCar(this.me,5);if(c)this.carReq(this.me,'enter',c.id);
 },
 carLocalInput(){
  const I=this.input;if(!this.app.inputActive())return{th:0,st:0,br:0};
  return{th:(I.down('fwd')?1:0)-(I.down('back')?1:0),st:(I.down('right')?1:0)-(I.down('left')?1:0),br:I.down('jump')?1:0};
 },

 // ---- host simulation
 updateCars(dt){
  if(!this.cars)return;
  this.carRespawnT-=dt;
  if(this.carRespawnT<=0){this.carRespawnT=CAR_RESPAWN_T;if(this.cars.size<CAR_MAX)this.spawnRoadCar()}
  for(const c of [...this.cars.values()])this.driveCar(c,dt);
 },
 driveCar(c,dt){
  const spec=c.spec;
  const driver=this.ents.get(c.seats[0]);
  let inp=c.inp;if(driver&&driver===this.me&&this.role!=='client')inp=this.carLocalInput();
  const th=clamp(inp.th||0,-1,1),st=clamp(inp.st||0,-1,1),br=!!inp.br;
  c.lights=th<0||br;
  // rain: less grip, so slower to speed up, lower top speed, weaker brakes and sharper steering
  const wet=this.weather==='rain',grip=wet?.6:1;
  let v=c.v;
  // engine: pulls hard from a stop and tapers off near the top speed; reverse is slow
  if(th>0)v+=th*spec.acc*grip*(1-.5*clamp(v/spec.vmax,0,1))*dt;
  else if(th<0)v+=th*(v>0?spec.brake*3.2:spec.acc*.5)*dt;
  else v*=(1-.5*dt);                                              // coasting slows down a little
  if(br)v*=(1-spec.brake*grip*dt);
  // hills: going uphill slows the car, going downhill speeds it up
  const [sx,sz]=W.slope(c.x,c.z);const [fx0,fz0]=fwd(c.yaw);
  v-=(sx*fx0+sz*fz0)*4.5*dt;
  v*=(1-.12*dt);v=clamp(v,-spec.vmax*.3,spec.vmax*(wet?.72:1));
  // steering: the turn builds up and fades (inertia), and only turns the car once it is moving
  const sp=Math.abs(v);
  const tyr=sp>.5?-st*Math.sign(v)*Math.min(1,sp/10)*spec.turn*(wet?1.3:1):0;
  c.yr=(c.yr||0)+(tyr-(c.yr||0))*Math.min(1,dt*(wet?3.5:6));
  c.yaw+=c.yr*dt;
  const [fx,fz]=fwd(c.yaw);
  const nx=c.x+fx*v*dt,nz=c.z+fz*v*dt,ny=W.H(nx,nz);
  const [gx,gz]=W.slope(nx,nz);
  const hit=ny<-.3||Math.hypot(gx,gz)>1.2||W.blocked(nx,ny+.2,nz,1.3,1.3,.6);
  if(hit&&sp>2.5){
   c.hp-=sp*2.4;c.v=-v*.2;this.emit({k:'ex',x:c.x,y:c.y+.8,z:c.z,r:1.2,c:'#cfd6de'});
  }else if(hit){c.v=0}
  else{c.x=nx;c.z=nz;c.y=ny;c.v=v}
  c.group.position.set(c.x,c.y,c.z);
  // run over people on foot, push people on foot out of a parked car
  for(const t of this.list){
   if(!t.alive||t.knocked||t.drop||t.car>=0)continue;
   const dx=t.pos.x-c.x,dz=t.pos.z-c.z,d=Math.hypot(dx,dz);
   if(d<1.9&&Math.abs(c.v)>4){
    if((c.hitT.get(t.id)||0)>this.t)continue;c.hitT.set(t.id,this.t+.8);
    const dmg=clamp(Math.abs(c.v)*3.2,25,140);this.damage(t,dmg,driver||null,-20);
    this.emit({k:'st',i:t.id,s:'kb',vx:fx*Math.abs(c.v)*.7,vy:4,vz:fz*Math.abs(c.v)*.7},t.id);
   }else if(d<1.7&&Math.abs(c.v)<.5){const k=(1.7-d)/Math.max(d,.01);t.pos.x+=dx*k;t.pos.z+=dz*k;if(t.tgt){t.tgt.x=t.pos.x;t.tgt.z=t.pos.z}}
  }
  // seats: people in a seat stay with the car (dead or knocked people are thrown out)
  c.seats.forEach((sid,i)=>{
   if(sid===-1)return;const e=this.ents.get(sid);
   if(!e||!e.alive||e.knocked||e.drop){c.seats[i]=-1;if(e){e.car=-1;e.seat=-1}return}
   e.car=c.id;e.seat=i;const [px,pz]=this.seatPos(c,i);
   e.pos.set(px,c.y+.05,pz);e.vel.set(0,0,0);if(e.tgt){e.tgt.x=px;e.tgt.y=c.y+.05;e.tgt.z=pz}
  });
  // burning (at the same share of health for every kind of car), then explode at 0 hp
  if(c.hp<=c.maxHp*CAR_BURN/CAR_HP){c.burn=true}
  if(c.hp<=0){this.carExplode(c,driver);return}
  if(c.burn){this.fx.emit(c.x+(Math.random()-.5)*1.4,c.y+1.8,c.z+(Math.random()-.5)*1.4,0,1.6,0,'#5a5a60',1.1,0,.6,1.6,.4,.7)}
 },
 seatPos(c,i){const r=right(c.yaw),f=fwd(c.yaw),s=SEATS[i];return[c.x+r[0]*s[0]+f[0]*s[1],c.z+r[1]*s[0]+f[1]*s[1]]},
 carExplode(c,driver){
  this.emit({k:'ex',x:c.x,y:c.y+1,z:c.z,r:7,c:'#ff7a2b'});
  for(const t of this.list){
   if(!t.alive||t.drop==='bus')continue;
   const d=Math.hypot(t.pos.x-c.x,t.pos.y-c.y,t.pos.z-c.z);if(d>7.5)continue;
   this.damage(t,clamp(110*(1-d/7.5),20,110),driver||null,-22);
  }
  for(const sid of c.seats){const e=this.ents.get(sid);if(e){e.car=-1;e.seat=-1}}
  this.dynamic.remove(c.group);this.cars.delete(c.id);
 },
 // bullets hit cars: returns the distance to the car (or Infinity), and damages it
 carShot(ox,oy,oz,dx,dy,dz,maxT,wd){
  if(!this.cars)return Infinity;let best=Infinity,hitC=null;
  for(const c of this.cars.values()){
   const fx=ox-c.x,fy=oy-(c.y+1),fz=oz-c.z;const cy=c.y+1;const R=1.9;
   const b=fx*dx+fy*dy+fz*dz,cc=fx*fx+fy*fy+fz*fz-R*R,disc=b*b-cc;if(disc<0)continue;
   const t=-b-Math.sqrt(disc);if(t>0&&t<maxT&&t<best){best=t;hitC=c}
  }
  if(hitC){hitC.hp-=wd.dmg*.45;hitC.v*=.9;this.emit({k:'ex',x:ox+dx*best,y:oy+dy*best,z:oz+dz*best,r:.25,c:'#ffe9a8'});}
  return best;
 },
 // explosions damage cars (a car in a blast takes the blast damage)
 carBlast(x,y,z,r,dmg){
  if(!this.cars)return;
  for(const c of this.cars.values()){const d=Math.hypot(c.x-x,c.y+1-y,c.z-z);if(d<r+1.5)c.hp-=dmg*clamp(1-d/(r+1.5)+.2,.2,1)}
 },

 // ---- snapshot (host -> guests) and applying it on guests
 carSnap(){
  if(!this.cars)return[];
  return[...this.cars.values()].map(c=>[c.id,r2(c.x),r2(c.y),r2(c.z),r2(c.yaw),Math.round(c.hp),c.burn?1:0,r2(c.v),c.seats[0],c.seats[1],c.seats[2],c.seats[3],c.type]);
 },
 applyCarSnap(list){
  if(!this.cars)this.cars=new Map();
  const seen=new Set();
  for(const a of list){
   const id=a[0];seen.add(id);
   let c=this.cars.get(id);if(!c)c=this.spawnCar(id,a[1],a[3],a[4],a[12]||0);
   c.tx=a[1];c.ty=a[2];c.tz=a[3];c.tyaw=a[4];c.hp=a[5];c.burn=!!a[6];c.v=a[7];c.seats=[a[8],a[9],a[10],a[11]];
  }
  for(const [id,c] of [...this.cars]){if(!seen.has(id)){this.dynamic.remove(c.group);this.cars.delete(id)}}
  for(const e of this.list)e.car=-1;
  for(const c of this.cars.values())c.seats.forEach((sid,i)=>{const e=this.ents.get(sid);if(e){e.car=c.id;e.seat=i}});
 },
 // every frame, everywhere: move the drawn cars toward their state, tilt them over the ground and turn the wheels
 updateCarVis(dt){
  if(!this.cars)return;
  for(const c of this.cars.values()){
   if(this.role==='client'){
    const k=Math.min(1,dt*14);c.x+=(c.tx-c.x)*k;c.z+=(c.tz-c.z)*k;c.y+=(c.ty-c.y)*k;let dy=c.tyaw-c.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));c.yaw+=dy*k;
    c.seats.forEach((sid,i)=>{const e=this.ents.get(sid);if(!e)return;const[px,pz]=this.seatPos(c,i);e.pos.set(px,c.y+.05,pz);if(e.tgt){e.tgt.x=px;e.tgt.y=c.y+.05;e.tgt.z=pz}})
   }
   // how fast it is turning and accelerating (measured, so guests see the same lean)
   let dyw=c.yaw-c.vyaw;dyw=Math.atan2(Math.sin(dyw),Math.cos(dyw));
   const yr=dt>0?clamp(dyw/dt,-2,2):0;c.vyaw=c.yaw;
   const acc=dt>0?clamp((c.v-c.vv)/dt,-12,12):0;c.vv=c.v;
   // tilt: follow the ground (nose up going uphill, right side up on a side slope), plus squat/dip and lean in a turn
   const [gx,gz]=W.slope(c.x,c.z);const [fx,fz]=fwd(c.yaw),[rx,rz]=right(c.yaw);
   const tp=clamp(Math.atan(gx*fx+gz*fz)*.6+acc*.008,-.22,.22);
   const tr=clamp(Math.atan(gx*rx+gz*rz)*.6-yr*c.v*.006,-.14,.14);
   const k2=Math.min(1,dt*8);c.pitch+=(tp-c.pitch)*k2;c.roll+=(tr-c.roll)*k2;
   c.group.position.set(c.x,c.y,c.z);
   c.group.rotation.set(c.pitch,c.yaw,c.roll,'YXZ');
   // wheels spin with the speed; the front ones turn with the steering
   c.spin+=c.v*dt/c.spec.wr;
   c.sw+=(clamp(yr/c.spec.turn,-1,1)*.5-c.sw)*Math.min(1,dt*10);
   for(const w of c.wheels)w.pivot.rotation.set(c.spin,w.front?c.sw:0,0,'YXZ');
   c.group.visible=true;     // the car body is always drawn (you are in third person while driving)
   c.flame.visible=c.burn;
   if(c.beams)c.beams.visible=this.weather==='night';
   if(c.burn){c.flame.scale.set(1,.7+Math.random()*.6,1);c.flame.rotation.y+=dt*3}
   c.dustT-=dt;if(Math.abs(c.v)>8&&c.dustT<=0){c.dustT=.09;const r=right(c.yaw);this.fx.emit(c.x-r[0]*1.1,c.y+.2,c.z-r[1]*1.1,(Math.random()-.5)*2,.6,(Math.random()-.5)*2,'#cfc3a4',.8,0,.4,1.4,.6,.5)}
   if(c.burn){c.fireT-=dt;if(c.fireT<=0){c.fireT=.06;this.fx.emit(c.x+(Math.random()-.5)*1.6,c.y+1.6,c.z+(Math.random()-.5)*1.6,0,2.2,0,'#ff8a2b',.6,0,.35,1,.3,1)}}
  }
 },
 // item use: sparkles spin up around the player while a heal, shield or throwable is being used
 updateUseFx(dt){
  const me=this.me;if(!me||!me.use||!me.alive||me.knocked)return;
  this.useFxT=(this.useFxT||0)-dt;if(this.useFxT>0)return;this.useFxT=.07;
  const a=this.t*7,col=me.use.id&&/shield/i.test(me.use.id)?'#7fd4ff':'#8dffb0';
  for(let k=0;k<2;k++){const ang=a+k*Math.PI;this.fx.emit(me.pos.x+Math.cos(ang)*.8,me.pos.y+.9,me.pos.z+Math.sin(ang)*.8,0,1.6,0,col,.55,0,.28,-.5,.25,1)}
 },
};
