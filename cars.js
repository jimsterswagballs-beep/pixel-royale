// Cars (v24): six kinds of car in 16 paints, with a few paint styles (solid, two-tone roof, racing stripe, taxi).
// Cars spawn in district car parks and on quiet roads, seat up to four players and burn when low, then explode at 0 hp.
// Tyres have grip: a car slides when it turns fast, brakes hard or drives on a wet road, and grip pulls it back in line.
// Getting in and out is an animation: the character walks to a door and climbs in, or steps out to a clear spot.
// The host simulates everything (driving, damage, seats, bumps, explosions) and sends the cars in the snapshot ('cr').
// Guests send their drive input ('carin') and seat requests ('car'). Clients only draw the cars they are sent.
// The person getting in or out runs the animation on their own screen too, so their body moves smoothly.
import * as THREE from 'three';
import {bakeGroup} from './bake.js';
import * as W from './world.js';
import {clamp,lerp,mulberry32} from './data.js';

export const CAR_HP=250;          // sedan health (the reference for the burn point)
export const CAR_BURN=90;         // the sedan burns at or below this (other cars burn at the same share of their health)
export const CAR_MAX=14;          // cars on the map at once
export const ACCEL_BOOST=1.8;      // engines pull harder: the throttle's acceleration is multiplied by this
export const CRASH_SPEED=10;       // a car only crashes (takes damage) when it hits something at this speed (m/s) or faster
export const RUN_OVER_SPEED=5;     // a car knocks people into the air when it is moving at least this fast (m/s)
export const CAR_RESPAWN_T=7;     // seconds between new cars appearing
const ENTER_T=.5, EXIT_T=.6;      // seconds to climb in / step out
const ENTER_RANGE=3.4;            // how close you must be to a door to get in
const ENTER_MAX_SPEED=5;          // m/s: no jumping into a moving car
const GRAV=24;                    // m/s^2: a car that drives off a drop falls at this rate
const LAND_SAFE=9;                // m/s: landing slower than this does no damage
const LAND_DMG=5;                 // damage per m/s of landing speed above LAND_SAFE
const SEATS=[[-.5,.45],[.5,.45],[-.5,-1],[.5,-1]];   // [right, forward] offsets from the car centre (seat 0 is the driver)
export const SEAT_NAMES=['driver seat','front passenger','back left','back right'];
const GLASS='#2b3a4a',TYRE='#1b1b1f',TRIM='#2a2d33';
const r2=v=>Math.round(v*100)/100;
// car frame: forward is (-sin yaw, -cos yaw), right is (cos yaw, -sin yaw); the mesh is built facing -z so rotation.y = yaw
const fwd=yaw=>[-Math.sin(yaw),-Math.cos(yaw)];
const right=yaw=>[Math.cos(yaw),-Math.sin(yaw)];

// paints (name, colour). The light ones get a dark racing stripe, the dark ones a white one.
export const PAINTS=[['Red','#e8453c'],['Blue','#2f7de1'],['Yellow','#f2c230'],['White','#f4f4f4'],['Green','#3ab56b'],['Purple','#8d5bd6'],
 ['Orange','#ff8a3d'],['Black','#2a2d33'],['Silver','#b8bfc8'],['Teal','#1fb5b0'],['Pink','#ff6fb1'],['Navy','#1c2f5c'],['Lime','#a6d82e'],
 ['Maroon','#7a1f2b'],['Gold','#c99a2e'],['Grey','#6b7480']];
const LIGHT=new Set(['#f4f4f4','#f2c230','#b8bfc8','#a6d82e','#c99a2e','#ff6fb1','#ff8a3d']);

// the six kinds of car. hw/L = half width / half length, by/bh = body centre height / height, cy/ch/cz/cl = cabin,
// wr = wheel radius, ly = headlight height. hp, vmax (top speed), acc (pull), turn (steer rate), brake, grip (tyre grip).
// body = the body style (see makeCarGroup).
export const CAR_TYPES=[
 {name:'Hatch', body:'hatch', hp:220,vmax:27,acc:14,turn:1.55,brake:4.2,grip:9, hw:.95, L:1.85,by:.72, bh:.7, cy:1.35,ch:.6, cz:-.1, cl:1.7, wr:.4, ly:.82},
 {name:'Sedan', body:'sedan', hp:250,vmax:28,acc:13,turn:1.4, brake:4,  grip:9, hw:1.05,L:2.15,by:.78, bh:.72,cy:1.42,ch:.62,cz:-.2, cl:2.2, wr:.42,ly:.86},
 {name:'Pickup',body:'pickup',hp:300,vmax:26,acc:11,turn:1.2, brake:3.6,grip:8.5,hw:1.07,L:2.35,by:.8,  bh:.7, cy:1.45,ch:.6, cz:-.75,cl:1.7, wr:.44,ly:.9},
 {name:'Van',   body:'van',   hp:330,vmax:22,acc:8.5,turn:1.0, brake:3.2,grip:8,   hw:1.15,L:2.45,by:1.15,bh:1.5, cy:1.75,ch:.5, cz:0,   cl:3.0, wr:.42,ly:.95},
 {name:'Sports',body:'sports',hp:180,vmax:36,acc:18,turn:1.8, brake:5,  grip:10, hw:.98, L:2.05,by:.62, bh:.5, cy:1.05,ch:.42,cz:.1,  cl:1.5, wr:.36,ly:.62},
 {name:'Jeep',  body:'jeep',  hp:290,vmax:24,acc:11,turn:1.3, brake:4.2,grip:10.5,hw:1.12,L:2.1, by:.95,bh:.8, cy:1.7, ch:.6, cz:-.1, cl:1.9, wr:.5, ly:1.0},
];

// shared geometry and materials (one per size and colour, not one per part)
const GEO=new Map(),CMAT=new Map();
const geo=(w,h,d)=>{const k=w.toFixed(3)+'x'+h.toFixed(3)+'x'+d.toFixed(3);let g=GEO.get(k);if(!g){g=new THREE.BoxGeometry(w,h,d);GEO.set(k,g)}return g};
const cmat=c=>{let m=CMAT.get(c);if(!m){m=new THREE.MeshLambertMaterial({color:c});CMAT.set(c,m)}return m};
function box(w,h,d,c,x,y,z,parent){const m=new THREE.Mesh(geo(w,h,d),cmat(c));m.position.set(x,y,z);m.castShadow=true;if(parent)parent.add(m);return m}
const tyreMat=cmat(TYRE);

// the look of one car, the same on every screen (it only depends on the car's id)
export function carLook(id,body){
 const h=Math.abs(Math.sin(id*12.9898)*43758.5453)%1;
 const paint=PAINTS[Math.floor(h*PAINTS.length)];
 const r=Math.abs(Math.sin(id*78.233)*43758.5453)%1;
 let style=r<.4?'solid':r<.6?'roof':r<.8?'stripe':'taxi';
 if(style==='taxi'&&body!=='sedan')style='solid';
 return{name:paint[0],color:style==='taxi'?'#f2c230':paint[1],style};
}

function makeCarGroup(id,t){
 const {color:P,style}=carLook(id,t.body);
 const hw=t.hw,L=t.L,g=new THREE.Group();
 const roof=style==='roof'?'#f4f4f4':P;                 // two-tone cars get a white roof
 const stripeC=LIGHT.has(P)?'#1d2024':'#f4f4f4';
 // body shell, cabin and roof
 box(hw*2,t.bh,L*2,P,0,t.by,0,g);
 box(hw*2*.86,t.ch,t.cl,GLASS,0,t.cy,t.cz,g);
 box(hw*2*.9,.08,t.cl*.96,roof,0,t.cy+t.ch/2+.04,t.cz,g);
 for(const x of[-1,1])for(const z of[-1,1])box(.08,t.ch+.02,.08,TRIM,x*hw*.86/2,t.cy,t.cz+z*t.cl/2,g);   // window pillars
 // bumpers, grille, plates, door seams and mirrors
 box(hw*2*1.02,.2,.22,TRIM,0,t.by-t.bh/2+.1,-(L+.08),g);
 box(hw*2*1.02,.2,.22,TRIM,0,t.by-t.bh/2+.1,L+.08,g);
 if(t.body!=='sports')box(hw*1.3,.18,.05,'#1d2024',0,t.by+.02,-(L+.03),g);
 box(.5,.16,.03,'#f4f4f4',0,t.by-.12,L+.05,g);
 for(const x of[-1,1]){
  box(.03,t.bh*.7,.04,TRIM,x*(hw+.01),t.by,-L*.3,g);box(.03,t.bh*.7,.04,TRIM,x*(hw+.01),t.by,L*.25,g);
  box(.2,.14,.22,P,x*(hw+.12),t.cy-.05,t.cz-t.cl/2+.1,g);
 }
 // lights: headlights are fixed, tail lights get brighter when the car brakes
 const tails=[];
 for(const x of[-1,1]){
  box(.42,.22,.1,'#fff6c8',x*hw*.62,t.ly,-(L+.02),g);
  const tm=new THREE.MeshBasicMaterial({color:'#7a1c1c'});tails.push(tm);
  const tl=new THREE.Mesh(geo(.42,.2,.1),tm);tl.position.set(x*hw*.62,t.ly,L+.03);g.add(tl);
 }
 // body style details
 if(t.body==='sedan')box(hw*2*.96,.2,.6,P,0,t.by+t.bh/2+.02,L*.72,g);                 // boot lip
 if(style==='taxi'){                                                                   // taxi: roof sign and a checker band
  box(.6,.32,.5,'#fff7b0',0,t.cy+t.ch/2+.25,t.cz,g);
  for(const x of[-1,1])for(let k=0;k<6;k++)box(.04,.12,.12,k%2?'#1d2024':'#f4f4f4',x*(hw+.01),t.by-.05,-L*.8+k*L*.32,g);
 }
 if(t.body==='pickup'){                                                                // pickup: open bed behind the cab
  const bz=.25+(L-.25)/2,bl=L-.25;
  box(hw*2-.12,.03,bl,'#5b6069',0,t.by+t.bh/2+.02,bz,g);
  for(const x of[-1,1])box(.1,.4,bl,P,x*(hw-.05),t.by+t.bh/2+.2,bz,g);
  box(hw*2,.4,.1,P,0,t.by+t.bh/2+.2,L-.05,g);
 }
 if(t.body==='van'){                                                                   // van: roof rack and a tall rear
  box(hw*2*.9,.06,t.cl*.95,TRIM,0,t.cy+t.ch/2+.14,t.cz,g);
  box(hw*2*.96,.3,.12,TRIM,0,t.by+t.bh/2-.2,-(L+.1),g);
 }
 if(t.body==='sports'){                                                                // sports: rear wing and side intakes
  for(const x of[-.7,.7])box(.08,.4,.08,TRIM,x*hw,t.by+t.bh/2+.2,L-.3,g);
  box(hw*2*.9,.06,.35,P,0,t.by+t.bh/2+.42,L-.25,g);
  for(const x of[-1,1])box(.3,.2,.5,'#1d2024',x*(hw+.01),t.by,-L*.25,g);
 }
 if(t.body==='jeep'){                                                                  // jeep: roof rack, roof lights, spare wheel
  box(hw*2*.9,.05,t.cl*.9,TRIM,0,t.cy+t.ch/2+.14,t.cz,g);
  for(const x of[-1,1])box(.22,.14,.16,'#ffe066',x*hw*.5,t.cy+t.ch/2+.2,-t.cl*.45,g);
  const sw=new THREE.Mesh(new THREE.CylinderGeometry(t.wr,t.wr,.3,10),tyreMat);sw.rotation.z=Math.PI/2;sw.position.set(0,t.by,L+.25);g.add(sw);
 }
 if(style==='stripe')box(.34,.03,L*1.9,stripeC,0,t.by+t.bh/2+.02,0,g);                 // racing stripe along the bonnet and boot
 // wheels: each sits on a pivot that spins (and steers, at the front)
 const wheels=[];
 for(const x of[-1,1])for(const z of[-1,1]){
  const pivot=new THREE.Group();pivot.rotation.order='YXZ';pivot.position.set(x*(hw-.02),t.wr,z*L*.62);
  const w=new THREE.Mesh(new THREE.CylinderGeometry(t.wr,t.wr,.32,10),tyreMat);w.rotation.z=Math.PI/2;w.castShadow=true;pivot.add(w);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(t.wr*.55,t.wr*.55,.34,8),cmat('#c9ced6'));hub.rotation.z=Math.PI/2;pivot.add(hub);
  g.add(pivot);wheels.push({pivot,front:z<0});
 }
 // flames for a burning car: three flickering cones
 const flame=new THREE.Group();flame.visible=false;
 for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(.55,1.6,6),new THREE.MeshBasicMaterial({color:i===1?'#ffd23d':'#ff7a2b',transparent:true,opacity:.9}));f.position.set((i-1)*.6,t.by+t.bh/2+1.2,(i%2?.4:-.4));flame.add(f)}
 g.add(flame);
 // headlight beams: only visible at night
 const beams=new THREE.Group();beams.visible=false;const bm=new THREE.MeshBasicMaterial({color:'#fff6c8',transparent:true,opacity:.16,depthWrite:false});
 for(const x of[-.67,.67]){const cone=new THREE.Mesh(new THREE.ConeGeometry(1.5,9,12,1,true),bm);cone.rotation.x=-Math.PI/2;cone.position.set(x*hw,t.ly,-(L+4.6));beams.add(cone)}
 g.add(beams);
 // the static body parts become one mesh; wheels spin on their own pivots, and the glowing parts are not lit, so they stay
 const spinning=new Set();for(const w of wheels)w.pivot.traverse(o=>spinning.add(o));
 bakeGroup(g,{keep:o=>spinning.has(o)});
 return{g,flame,beams,wheels,tails,style,color:P};
}

// seat by seat: which door it is (left or right) and the spot a car door opens to
const sideOf=i=>Math.sign(SEATS[i][0]);
function doorPos(c,i){const r=right(c.yaw),f=fwd(c.yaw),s=sideOf(i),d=c.spec.hw+.45;
 return{x:c.x+r[0]*s*d+f[0]*SEATS[i][1],y:c.y+.05,z:c.z+r[1]*s*d+f[1]*SEATS[i][1]}}
// a clear spot beside or behind the car to step out to (the door side first, then the other side, then behind)
function exitPoint(c,i){
 const r=right(c.yaw),f=fwd(c.yaw),hw=c.spec.hw,L=c.spec.L,s=sideOf(i);
 const tries=[[s,SEATS[i][1]],[-s,SEATS[i][1]],[s,-L-1.2],[-s,-L-1.2]];
 for(const[sd,fo]of tries){const x=c.x+r[0]*sd*(hw+1.1)+f[0]*fo,z=c.z+r[1]*sd*(hw+1.1)+f[1]*fo;
  if(!W.blocked(x,W.H(x,z)+.2,z,.35,1.4,.3))return{x,y:W.H(x,z)+.05,z}}
 const x=c.x+r[0]*s*(hw+1.4),z=c.z+r[1]*s*(hw+1.4);return{x,y:W.H(x,z)+.05,z};
}

export const carMethods={
 // ---- setup: host spawns, everyone clears
 clearCars(){
  if(this.cars)for(const c of this.cars.values())this.dynamic.remove(c.group);
  this.cars=new Map();this.carRespawnT=2;
 },
 spawnCar(id,x,z,yaw,type=0){
  const ti=CAR_TYPES[type]?type:0,spec=CAR_TYPES[ti];
  const built=makeCarGroup(id,spec);
  const c={id,x,y:W.H(x,z),z,yaw,v:0,lat:0,yr:0,type:ti,spec,hp:spec.hp,maxHp:spec.hp,seats:[-1,-1,-1,-1],resv:[-1,-1,-1,-1],inp:{th:0,st:0,br:0},hitT:new Map(),
   tx:x,ty:W.H(x,z),tz:z,tyaw:yaw,burn:false,group:built.g,flame:built.flame,beams:built.beams,wheels:built.wheels,tails:built.tails,braking:false,
   dustT:0,fireT:0,lights:false,pitch:0,roll:0,spin:0,sw:0,vyaw:yaw,vv:0};
  built.g.position.set(c.x,c.y,c.z);built.g.rotation.y=yaw;this.dynamic.add(built.g);
  this.cars.set(id,c);return c;
 },
 // host: put a car where cars belong. Most spawn in district car parks; the rest sit on quiet roads
 // between districts (never on district streets). Nothing spawns near a player, or on top of another car.
 spawnRoadCar(){
  const rng=this.carRng||(this.carRng=mulberry32((this.seed||7)+4242));
  for(let tries=0;tries<50;tries++){
   let x,z,yaw,onLot=false;
   if(W.parking.length&&rng()<.7){
    const b=W.parking[Math.floor(rng()*W.parking.length)];x=b.x;z=b.z;yaw=b.yaw+(rng()<.5?0:Math.PI);onLot=true;
   }else{
    const r=W.ROADS[Math.floor(rng()*W.ROADS.length)];const t=.1+rng()*.8;
    const p=W.roadPointAt(r[2],t);if(W.poiAt(p.x,p.z))continue;
    x=p.x;z=p.z;const dir=rng()<.5?1:-1;yaw=Math.atan2(-p.dx*dir,-p.dz*dir);
   }
   if(W.H(x,z)<2.2)continue;
   let near=false;for(const e of this.list)if(e.alive&&Math.hypot(e.pos.x-x,e.pos.z-z)<55){near=true;break}
   if(near)continue;
   let crowded=false;for(const c of this.cars.values())if(Math.hypot(c.x-x,c.z-z)<6){crowded=true;break}
   if(crowded)continue;
   // the car fits and there is a clear stretch ahead (no trees, rocks or props in the way)
   const [fx,fz]=fwd(yaw);let clear=!W.blocked(x,W.H(x,z)+.2,z,1.3,1.3,.6);
   for(let d=2;d<=(onLot?6:12)&&clear;d+=2){const px=x+fx*d,pz=z+fz*d;if(W.blocked(px,W.H(px,pz)+.2,pz,1.3,1.3,.6))clear=false}
   if(!clear)continue;
   const type=Math.floor(rng()*CAR_TYPES.length);
   this.spawnCar(this.carSeq=(this.carSeq||0)+1,x,z,yaw,type);return true}
  return false;
 },
 // host: the first cars at the start of a match
 seedCars(n){this.clearCars();this.carSeq=0;for(let i=0;i<n;i++)this.spawnRoadCar()},

 // ---- seats: the host decides; guests ask. A seat is reserved while its person climbs in.
 carOf(e){return e&&e.car>=0&&this.cars?this.cars.get(e.car):null},
 // the free seat whose door is nearest to (x, z), with the distance to that door
 pickSeat(c,x,z){
  let best=null;
  for(let i=0;i<4;i++){if(c.seats[i]!==-1||c.resv[i]!==-1)continue;const d=doorPos(c,i);const dist=Math.hypot(d.x-x,d.z-z);if(!best||dist<best.d)best={s:i,d:dist}}
  return best;
 },
 // the car a person can climb into right now (for the prompt and for interact)
 enterCandidate(e){
  if(!this.cars||!e||e.car>=0||e.carAnim)return null;
  let best=null;
  for(const c of this.cars.values()){if(Math.abs(c.v)>ENTER_MAX_SPEED)continue;const p=this.pickSeat(c,e.pos.x,e.pos.z);if(!p||p.d>ENTER_RANGE)continue;if(!best||p.d<best.p.d)best={c,p}}
  return best?{c:best.c,s:best.p.s,seat:SEAT_NAMES[best.p.s]}:null;
 },
 // host: start climbing in (the seat is taken when the climb ends)
 carEnter(e,id){
  const c=this.cars&&this.cars.get(id);
  if(!c||e.car>=0||e.carAnim||!e.alive||e.knocked||e.drop||e.use||e.emote)return;
  if(Math.abs(c.v)>ENTER_MAX_SPEED)return;
  const p=this.pickSeat(c,e.pos.x,e.pos.z);if(!p||p.d>ENTER_RANGE)return;
  c.resv[p.s]=e.id;
  e.carAnim={k:'in',t:0,d:ENTER_T,from:{x:e.pos.x,y:e.pos.y,z:e.pos.z},car:c.id,seat:p.s};
  e.vel.set(0,0,0);
 },
 // host: step out. The seat is freed at once and the person walks to a clear spot beside the car.
 carExit(e){
  const c=this.carOf(e);if(!c||e.carAnim)return;
  const i=e.seat;c.seats[i]=-1;if(i===0)c.inp={th:0,st:0,br:0};
  const to=exitPoint(c,i);
  e.car=-1;e.seat=-1;e.vel.set(0,0,0);
  this.emit({k:'vfx',t:'poof',i:e.id,x:e.pos.x,y:e.pos.y+1,z:e.pos.z});   // and reappear when they step out
  e.carAnim={k:'out',t:0,d:EXIT_T,from:{x:e.pos.x,y:e.pos.y,z:e.pos.z},to};
 },
 carSwap(e){
  const c=this.carOf(e);if(!c||e.carAnim)return;
  for(let k=1;k<4;k++){const s=(e.seat+k)%4;if(c.seats[s]===-1&&c.resv[s]===-1){c.seats[e.seat]=-1;c.seats[s]=e.id;e.seat=s;return}}
 },
 // one entry point for the local player and for requests from guests (host side)
 carReq(e,kind,id){
  if(this.role==='client'){if(e===this.me)this.guestCarAnim(kind,id);this.net.toHost({t:'car',k:kind,id});return}
  if(kind==='enter')this.carEnter(e,id);else if(kind==='exit')this.carExit(e);else if(kind==='seat')this.carSwap(e);
 },
 // a guest starts the climb or the step out at once, so its own body moves without waiting for the host.
 // Climbing in ends at the door; the seat comes with the next snapshot.
 guestCarAnim(kind,id){
  const me=this.me;if(!me||me.carAnim)return;
  const from={x:me.pos.x,y:me.pos.y,z:me.pos.z};
  if(kind==='enter'){
   const c=this.cars&&this.cars.get(id);if(!c||me.car>=0||Math.abs(c.v)>ENTER_MAX_SPEED)return;
   const p=this.pickSeat(c,me.pos.x,me.pos.z);if(!p||p.d>ENTER_RANGE)return;
   me.carAnim={k:'in',t:0,d:ENTER_T,from,to:doorPos(c,p.s),car:id,seat:-1,guest:true};
  }else if(kind==='exit'){
   const c=this.carOf(me);if(!c)return;
   me.carAnim={k:'out',t:0,d:EXIT_T,from,to:exitPoint(c,me.seat),car:-1,guest:true};
  }
 },
 // interact gets out of a car (returns true when it used the press, so it does not also pick anything up).
 // swap seat is its own key (rebindable in Controls).
 carInCarKeys(){
  const me=this.me,I=this.input;if(!me||me.car<0||!this.app.inputActive())return false;
  if(I.pressed('interact')){if(!me.carAnim)this.carReq(me,'exit');return true}
  if(I.pressed('carSeat'))this.carReq(me,'seat');
  return false;
 },
 // interact outside a car: climb into the nearest door that is free (loot on the ground comes first, see movement)
 carEnterNearby(){
  const n=this.enterCandidate(this.me);if(n)this.carReq(this.me,'enter',n.c.id);
 },
 carLocalInput(){
  const I=this.input;if(!this.app.inputActive())return{th:0,st:0,br:0};
  return{th:(I.down('fwd')?1:0)-(I.down('back')?1:0),st:(I.down('right')?1:0)-(I.down('left')?1:0),br:I.down('jump')?1:0};
 },

 // ---- climbing in and out (every screen runs this for its own person; the host runs it for everyone)
 stepCarAnim(e,dt){
  const a=e.carAnim;if(!a)return;
  a.t+=dt;
  let to=a.to;
  if(a.k==='in'&&!a.guest){
   const c=this.cars&&this.cars.get(a.car);
   if(!c||!e.alive||e.knocked||e.drop){this.cancelEnter(e);return}
   const[px,pz]=this.seatPos(c,a.seat);to={x:px,y:c.y+.05,z:pz};
  }
  const k=clamp(a.t/a.d,0,1),s=k*k*(3-2*k);
  e.pos.set(lerp(a.from.x,to.x,s),lerp(a.from.y,to.y,s)+Math.sin(Math.PI*k)*(a.k==='in'?.55:.35),lerp(a.from.z,to.z,s));
  e.vel.set(0,0,0);
  if(e.tgt){e.tgt.x=e.pos.x;e.tgt.y=e.pos.y;e.tgt.z=e.pos.z}
  if(a.t>=a.d){
   if(a.guest){a.done=true;return}      // guestCarTick finishes this one
   if(a.k==='in')this.finishEnter(e);else e.carAnim=null;
  }
 },
 cancelEnter(e){
  const a=e.carAnim;e.carAnim=null;if(!a)return;
  const c=this.cars&&this.cars.get(a.car);if(c&&c.resv[a.seat]===e.id)c.resv[a.seat]=-1;
 },
 finishEnter(e){
  const a=e.carAnim;e.carAnim=null;const c=this.cars&&this.cars.get(a.car);if(!c)return;
  if(c.resv[a.seat]===e.id)c.resv[a.seat]=-1;
  if(c.seats[a.seat]!==-1||!e.alive||e.knocked||e.drop)return;
  c.seats[a.seat]=e.id;e.car=c.id;e.seat=a.seat;
  this.emit({k:'vfx',t:'poof',i:e.id,x:e.pos.x,y:e.pos.y+1,z:e.pos.z});   // they vanish into the car
 },
 // on a guest's own screen: the climb ends when the snapshot seats them (or after a timeout if the host said no),
 // and the step out ends with them on foot
 guestCarTick(me){
  const a=me.carAnim;if(!a||!a.guest)return;
  if(a.k==='in'){if(me.car>=0){me.carAnim=null;return}if(a.t>a.d+1.5)me.carAnim=null}
  else if(a.t>=a.d){me.carAnim=null;me.car=-1;me.seat=-1}
 },

 // ---- host simulation
 updateCars(dt){
  if(!this.cars)return;
  this.carRespawnT-=dt;
  if(this.carRespawnT<=0){this.carRespawnT=CAR_RESPAWN_T;if(this.cars.size<CAR_MAX)this.spawnRoadCar()}
  for(const e of this.list)if(e.carAnim)this.stepCarAnim(e,dt);
  for(const c of [...this.cars.values()])this.driveCar(c,dt);
  this.carBumps();
 },
 driveCar(c,dt){
  const spec=c.spec;
  const driver=this.ents.get(c.seats[0]);
  let inp=c.inp;if(driver&&driver===this.me&&this.role!=='client')inp=this.carLocalInput();
  const th=clamp(inp.th||0,-1,1),st=clamp(inp.st||0,-1,1),br=!!inp.br;
  c.lights=th<0||br;
  // rain takes away grip: slower to speed up, lower top speed, weaker brakes and steering that is harder to hold
  const wetK=this.wx?this.wx.wet:0,grip=1-.4*wetK;
  let v=c.v;
  // engine: pulls hard from a stop and tapers off near the top speed; reverse is slow
  if(th>0)v+=th*spec.acc*ACCEL_BOOST*grip*(1-.35*clamp(v/spec.vmax,0,1))*dt;
  else if(th<0)v+=th*(v>0?spec.brake*3.2:spec.acc*.5)*dt;
  else v*=(1-.5*dt);                                              // coasting slows down a little
  if(br)v*=(1-spec.brake*grip*dt);
  // hills: going uphill slows the car, going downhill speeds it up
  const [sx,sz]=W.slope(c.x,c.z);const [fx0,fz0]=fwd(c.yaw);
  v-=(sx*fx0+sz*fz0)*4.5*dt;
  v*=(1-.12*dt);v=clamp(v,-spec.vmax*.3,spec.vmax*(1-.28*wetK));
  // steering: the turn builds up and fades (inertia), and only turns the car once it is moving
  const sp=Math.abs(v);
  const tyr=sp>.5?-st*Math.sign(v)*Math.min(1,sp/10)*spec.turn*(1+.3*wetK):0;
  c.yr=(c.yr||0)+(tyr-(c.yr||0))*Math.min(1,dt*(wetK>.5?3.5:6));
  c.yaw+=c.yr*dt;
  // tyres: turning fast pushes the car sideways (the body turns faster than the velocity), and grip pulls it back.
  // Braking hard at speed lets the back end go, so grip drops while the brake is held.
  c.lat=(c.lat||0)-c.yr*v*.3*dt;
  let g=spec.grip*grip;if(br&&sp>6)g*=.3;
  c.lat-=c.lat*Math.min(1,g*dt);
  c.lat=clamp(c.lat,-spec.vmax*.6,spec.vmax*.6);
  const [fx,fz]=fwd(c.yaw),[rx,rz]=right(c.yaw);
  const nx=c.x+(fx*v+rx*c.lat)*dt,nz=c.z+(fz*v+rz*c.lat)*dt;
  const gnd=W.H(nx,nz),dist=Math.hypot(nx-c.x,nz-c.z),drop=c.y-gnd;
  const [gx,gz]=W.slope(nx,nz),steep=Math.hypot(gx,gz)>1.2;
  // the car sits on the ground unless it has left it: a drop the wheels cannot follow (a cliff edge, or a drop
  // steeper than the slope limit) sends it over the edge, and it falls under gravity until it lands
  let air=!!c.air,vy=c.vy||0,ny=gnd,impact=0,splash=false;
  if(!air&&drop>.6&&(steep||drop>1.2*dist)&&gnd>-.3){air=true;vy=0}
  if(air){
    vy-=GRAV*dt;ny=c.y+vy*dt;
    if(ny<=gnd){                       // touched down
      impact=-vy;ny=gnd;air=false;vy=0;
      if(gnd<-.3)splash=true;          // landed in the lake
    }
  }
  // walls and water stop a car on the ground (steep uphill, or the lake); buildings stop it in the air too
  const hit=(!air&&(gnd<-.3||(steep&&gnd>c.y)))||W.blocked(nx,ny+.2,nz,1.3,1.3,.6);
  const speed=Math.hypot(v,c.lat);
  if(hit&&speed>=CRASH_SPEED){
   // a real crash: the car is wrecked and bounces back, with sparks, smoke and a clang
   c.hp-=speed*2.4;v=-v*.2;c.lat*=.2;
   this.emit({k:'vfx',t:'carcrash',x:c.x,y:c.y+.6,z:c.z});this.emit({k:'snd',n:'clang',p:[c.x,c.y,c.z]});
  }else if(hit){
   // a slow bump just stops the car: no damage
   if(speed>2)this.emit({k:'vfx',t:'carbump',x:c.x,y:c.y+.5,z:c.z});
   v=0;c.lat=0}
  else{c.x=nx;c.z=nz}
  if(hit&&!air)ny=c.y;                 // a grounded car that is stopped keeps its height
  c.y=ny;c.air=air;c.vy=vy;
  if(splash){c.hp=0;this.emit({k:'ex',x:c.x,y:-.2,z:c.z,r:2.5,c:'#9fd6ff'})}
  else if(impact>LAND_SAFE){
   c.hp-=(impact-LAND_SAFE)*LAND_DMG;this.emit({k:'ex',x:c.x,y:c.y+.8,z:c.z,r:1.4,c:'#cfd6de'});
  }
  c.v=v;
  c.group.position.set(c.x,c.y,c.z);
  // run over people on foot, push people on foot out of a parked car
  for(const t of this.list){
   if(!t.alive||t.knocked||t.drop||t.car>=0||t.carAnim)continue;
   const dx=t.pos.x-c.x,dz=t.pos.z-c.z,d=Math.hypot(dx,dz);
   if(d<1.9&&Math.abs(c.v)>RUN_OVER_SPEED){
    if((c.hitT.get(t.id)||0)>this.t)continue;c.hitT.set(t.id,this.t+.8);
    const s=Math.abs(c.v),dmg=clamp(s*3.2,25,140);this.damage(t,dmg,driver||null,-20);
    // thrown into the air by the bonnet: a high launch that carries them on, and a ragdoll tumble while they fly
    this.emit({k:'st',i:t.id,s:'rag',vx:fx*s*.8,vy:Math.min(16,6+s*.4),vz:fz*s*.8,w:(Math.random()<.5?-1:1)*(9+s*.5)},t.id);
    this.emit({k:'vfx',t:'carhit',x:t.pos.x,y:t.pos.y+1,z:t.pos.z});this.emit({k:'snd',n:'clang',p:[t.pos.x,t.pos.y,t.pos.z]});
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
 // cars bump each other: they push apart, and a hard bump hurts both
 carBumps(){
  const cs=[...this.cars.values()];
  for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){
   const a=cs[i],b=cs[j];const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
   if(d>=2.5||d<.01||Math.abs(a.y-b.y)>2)continue;
   const rel=Math.abs(a.v-b.v)+Math.abs(a.lat-b.lat)*.5,ov=(2.5-d)/2,nx=dx/d,nz=dz/d;
   a.x-=nx*ov;a.z-=nz*ov;b.x+=nx*ov;b.z+=nz*ov;a.v*=.6;b.v*=.6;
   if(rel>CRASH_SPEED*.8){const dmg=Math.min(60,rel*2);a.hp-=dmg;b.hp-=dmg;this.emit({k:'vfx',t:'carcrash',x:(a.x+b.x)/2,y:a.y+.8,z:(a.z+b.z)/2});this.emit({k:'snd',n:'clang',p:[(a.x+b.x)/2,a.y,(a.z+b.z)/2]})}
  }
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
   const fx=ox-c.x,fy=oy-(c.y+1),fz=oz-c.z;const R=1.9;
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
    c.seats.forEach((sid,i)=>{const e=this.ents.get(sid);if(!e||e.carAnim)return;const[px,pz]=this.seatPos(c,i);e.pos.set(px,c.y+.05,pz);if(e.tgt){e.tgt.x=px;e.tgt.y=c.y+.05;e.tgt.z=pz}})
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
   // brake lights glow while the car slows hard
   c.braking=acc<-2.5;for(const m of c.tails)m.color.set(c.braking?'#ff4a3a':'#7a1c1c');
   c.group.visible=true;     // the car body is always drawn (you are in third person while driving)
   c.flame.visible=c.burn;
   if(c.beams)c.beams.visible=this.weather==='night';
   if(c.burn){c.flame.scale.set(1,.7+Math.random()*.6,1);c.flame.rotation.y+=dt*3}
   c.dustT-=dt;if(Math.abs(c.v)>8&&c.dustT<=0){c.dustT=.09;const r=right(c.yaw);this.fx.emit(c.x-r[0]*1.1,c.y+.2,c.z-r[1]*1.1,(Math.random()-.5)*2,.6,(Math.random()-.5)*2,'#cfc3a4',.8,0,.4,1.4,.6,.5)}
   // ---- car effects: exhaust while the engine works, tyre smoke when the car slides or brakes hard, smoke from a wrecked car
   const [cfx,cfz]=fwd(c.yaw),[crx,crz]=right(c.yaw),cl=c.spec.L;
   c.exT=(c.exT||0)-dt;
   if(c.exT<=0&&Math.abs(c.v)>1.5&&c.group.visible){c.exT=acc>2?.07:.16;const ex=c.x-cfx*cl,ez=c.z-cfz*cl;this.fx.puff(ex,c.y+.55,ez,-cfx*.9+(Math.random()-.5)*.4,.7+Math.random()*.4,-cfz*.9+(Math.random()-.5)*.4,'#9d9a94',.8,.22,1.1,.5)}
   c.skidT=(c.skidT||0)-dt;
   const sliding=Math.abs(c.lat)>1.6&&Math.abs(c.v)>5,braking=c.braking&&Math.abs(c.v)>7;
   if(c.skidT<=0&&(sliding||braking)){c.skidT=.05;for(const s of[-1,1]){const wx=c.x-cfx*cl*.6+crx*s*(c.spec.hw-.1),wz=c.z-cfz*cl*.6+crz*s*(c.spec.hw-.1);this.fx.puff(wx,c.y+.2,wz,(Math.random()-.5)*.6,.5,(Math.random()-.5)*.6,'#d8d2c4',.9,.3,1.3,.45)}}
   if(c.hp<c.maxHp*.5&&!c.burn){c.smokeT=(c.smokeT||0)-dt;if(c.smokeT<=0){c.smokeT=.22;this.fx.puff(c.x+cfx*cl*.4,c.y+1.2,c.z+cfz*cl*.4,0,.9,0,'#3a3a3e',1.2,.35,1.5,.5)}}
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
