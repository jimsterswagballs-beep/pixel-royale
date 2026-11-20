// Building and destruction.
// The host is authoritative: it validates placements, applies damage and decides what is destroyed.
// It tells guests through events: 'bp' (piece placed), 'bh' (piece hp), 'bx' (piece destroyed),
// 'mats' (material counts), 'dec' (tree or rock removed) and 'hv' (harvest sparks).
import * as THREE from 'three';
import * as W from './world.js';
import * as NAV from './botnav.js';
import {MATS,PIECES,PIECE_KEYS,MAT_KEYS,emptyMats} from './materials.js';

const GRID=4,WALL_H=3,FLOOR_T=.35,REACH=16,MAX_DEBRIS=420,COLLAPSE_R=10;
const boxMats=new Map();
const boxMat=c=>{let m=boxMats.get(c);if(!m){m=new THREE.MeshLambertMaterial({color:c});boxMats.set(c,m)}return m};
const ghostMats={ok:new THREE.MeshBasicMaterial({color:'#7dff9e',transparent:true,opacity:.42,depthWrite:false}),
 bad:new THREE.MeshBasicMaterial({color:'#ff5a5a',transparent:true,opacity:.42,depthWrite:false})};

// Solid boxes for a piece. Pieces are centred on a 4 m grid (x, z), `y` is the base.
export function pieceBoxes(ty,x,y,z,rot){const out0=pieceBoxesRaw(ty,x,y,z,rot);for(const b of out0)b.circ=false;return out0}
function pieceBoxesRaw(ty,x,y,z,rot){
 if(ty==='wall')return rot?[{x0:x-.2,y0:y,z0:z-2,x1:x+.2,y1:y+WALL_H,z1:z+2}]:[{x0:x-2,y0:y,z0:z-.2,x1:x+2,y1:y+WALL_H,z1:z+.2}];
 if(ty==='floor')return[{x0:x-2,y0:y,z0:z-2,x1:x+2,y1:y+FLOOR_T,z1:z+2}];
 // ramp: six solid steps of 0.5 m rise, which the normal step-up rule lets players and bots climb
 const out=[],N=6,run=4/N,rise=WALL_H/N;
 for(let i=0;i<N;i++){const a=-2+i*run,b=a+run,top=y+(i+1)*rise;
  out.push(rot?{x0:x-2,y0:y,z0:z+a,x1:x+2,y1:top,z1:z+b}:{x0:x+a,y0:y,z0:z-2,x1:x+b,y1:top,z1:z+2})}
 return out}

export const structMethods={
 structEnsure(){if(!this.pieces)this.pieces=new Map();if(!this.debris)this.debris=[];if(!this.bstate)this.bstate={ty:'wall',mat:'wood',rot:0};if(this.building===undefined)this.building=false;return this},

 // ------------------------------------------------------------ shared piece state (host + clients)
 structAddPiece(d){
  this.structEnsure();if(this.pieces.has(d.id))return null;
  const boxes=pieceBoxes(d.ty,d.x,d.y,d.z,d.rot);
  const p={id:d.id,ty:d.ty,mat:d.mat,rot:d.rot,x:d.x,y:d.y,z:d.z,hp:MATS[d.mat].hp,maxHp:MATS[d.mat].hp,boxes,meshes:[],dead:false,flashT:0};
  const mat=new THREE.MeshLambertMaterial({color:MATS[d.mat].c});p.mat3=mat;
  for(const b of boxes){b.piece=p;W.addSolid(b);
   const m=new THREE.Mesh(new THREE.BoxGeometry(b.x1-b.x0,b.y1-b.y0,b.z1-b.z0),mat);
   m.position.set((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.z0+b.z1)/2);m.castShadow=m.receiveShadow=true;this.dynamic.add(m);p.meshes.push(m)}
  this.pieces.set(p.id,p);this.structNav(boxes);return p},
 structNav(boxes){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const b of boxes){x0=Math.min(x0,b.x0);x1=Math.max(x1,b.x1);z0=Math.min(z0,b.z0);z1=Math.max(z1,b.z1)}NAV.invalidateRect(x0-1.5,z0-1.5,x1+1.5,z1+1.5)},
 structDrop(p,big){
  if(!p||p.dead)return;p.dead=true;
  for(const b of p.boxes)W.removeSolid(b);
  for(const m of p.meshes){this.dynamic.remove(m);m.geometry.dispose()}
  this.pieces.delete(p.id);this.structNav(p.boxes);
  const col=MATS[p.mat].c;
  this.structDebris(p.x,p.y+(p.ty==='floor'?.3:1.5),p.z,col,big?16:9,p.ty==='floor'?.55:.4);
  this.fx.dust(p.x,p.y+1,p.z,big?18:10,4,MATS[p.mat].dark)},
 structDebris(x,y,z,color,n,size){const d=this.debris;
  for(let i=0;i<n;i++){const s=size*(.6+Math.random()*.8);const m=new THREE.Mesh(new THREE.BoxGeometry(s,s,s),boxMat(color));m.castShadow=true;
   m.position.set(x+(Math.random()-.5)*1.6,y+(Math.random()-.5)*1.2,z+(Math.random()-.5)*1.6);this.dynamic.add(m);
   const a=Math.random()*6.283,sp=1.5+Math.random()*4.5;
   d.push({m,h:s/2,vx:Math.cos(a)*sp,vy:3+Math.random()*6,vz:Math.sin(a)*sp,t:2.5+Math.random()*2,rx:(Math.random()-.5)*10,ry:(Math.random()-.5)*10})}
  while(d.length>MAX_DEBRIS){const o=d.shift();this.dynamic.remove(o.m);o.m.geometry.dispose()}},
 structUpdateDebris(dt){const d=this.debris;if(!d||!d.length)return;
  for(let i=d.length-1;i>=0;i--){const s=d[i],m=s.m;s.t-=dt;s.vy-=24*dt;
   m.position.x+=s.vx*dt;m.position.y+=s.vy*dt;m.position.z+=s.vz*dt;m.rotation.x+=s.rx*dt;m.rotation.y+=s.ry*dt;
   // land on terrain or on any solid below (other pieces, buildings) by testing the surface under the shard
   const g=W.groundAt(m.position.x,m.position.z,m.position.y-s.h,.12,.35)+s.h;
   if(m.position.y<g){m.position.y=g;if(s.vy<-2){s.vy=-s.vy*.3;s.vx*=.6;s.vz*=.6}else{s.vy=0;s.vx*=.85;s.vz*=.85}}
   if(s.t<=0||m.position.y<-40){this.dynamic.remove(m);m.geometry.dispose();d.splice(i,1);continue}
   if(s.t<.4)m.scale.setScalar(Math.max(.05,s.t/.4))}},
 // a piece stays up if its base sits on the ground or on the top of some solid under its footprint
 structSupported(q){
  if(q.y<=W.H(q.x,q.z)+.2)return true; // sits on the terrain (a floor's top is .35 m up, so it must not count as ground)
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const b of q.boxes){x0=Math.min(x0,b.x0);x1=Math.max(x1,b.x1);z0=Math.min(z0,b.z0);z1=Math.max(z1,b.z1)}
  const buf=[];W.query(q.x,q.z,3,buf);
  for(const b of buf){if(b.circ!==false||b.piece===q)continue;if(Math.abs(b.y1-q.y)>.3)continue;
   if(b.x1>x0+.05&&b.x0<x1-.05&&b.z1>z0+.05&&b.z0<z1-.05)return true}
  return false},
 // host only: destroy a piece and anything that loses its support
 structDestroy(p,depth=0){
  if(!p||p.dead)return;
  this.emit({k:'bx',id:p.id,big:p.ty==='floor'||depth>0?1:0});
  if(depth>=10)return;
  for(const q of [...this.pieces.values()]){
   if(q.dead||Math.abs(q.x-p.x)>COLLAPSE_R||Math.abs(q.z-p.z)>COLLAPSE_R)continue;
   if(!this.structSupported(q))this.structDestroy(q,depth+1)}},
 structHit(p,amt){
  if(!p||p.dead||this.role==='client')return;
  p.hp-=amt;
  if(p.hp<=0)this.structDestroy(p);else this.emit({k:'bh',id:p.id,hp:Math.round(p.hp)})},
 structBlast(x,y,z,r,dmg){
  if(this.role==='client')return;
  for(const p of [...this.pieces.values()]){if(p.dead)continue;
   const d=Math.hypot(p.x-x,p.y+1.5-y,p.z-z);if(d<r+3)this.structHit(p,dmg*Math.max(.2,1-d/(r+3)))}},

 // ------------------------------------------------------------ harvesting and damage from shots (host)
 onWorldHit(sh,wh,wd,ex,ey,ez){
  if(this.role==='client'||!wh||!wh.obj)return;
  if(wh.kind==='box'){if(wh.obj.piece)this.structHit(wh.obj.piece,(wd.dmg||20)*(wd.pellets>1?.45:.8));return}
  if(wh.kind!=='tree'&&wh.kind!=='rock')return;
  if(sh.bot)return;
  const c=wh.obj;if(c.gone)return;
  const tree=wh.kind==='tree';
  c.hits=(c.hits||0)+1;
  this.structAddMats(sh,tree?'wood':'stone',tree?3:2);
  this.emit({k:'hv',x:ex,y:ey,z:ez,c:tree?'#8a5a2b':'#b5b9bd'});
  if(c.hits>=(tree?4:6))this.emit({k:'dec',kind:wh.kind,i:(tree?W.treeList:W.rockList).indexOf(c)})},
 structAddMats(e,mat,n){if(!e.mats)e.mats=emptyMats();e.mats[mat]=Math.min(999,(e.mats[mat]||0)+n);this.emit({k:'mats',i:e.id,m:{...e.mats}})},
 structSpend(e,mat,n){e.mats[mat]=Math.max(0,(e.mats[mat]||0)-n);this.emit({k:'mats',i:e.id,m:{...e.mats}})},

 // ------------------------------------------------------------ placement
 structValidate(e,ty,mat,x,y,z,rot){
  const bad=why=>({ok:false,why});
  if(!PIECES[ty]||!MATS[mat])return bad('Invalid piece');
  if(![x,y,z].every(Number.isFinite))return bad('Invalid position');
  const cost=PIECES[ty].cost;
  if((e.mats&&e.mats[mat]||0)<cost)return bad('Not enough '+MATS[mat].n.toLowerCase());
  if(Math.hypot(x-e.pos.x,z-e.pos.z)>REACH)return bad('Too far away');
  if(!this.insideStorm(x,z))return bad('Outside the storm');
  if(W.H(x,z)<-.2)return bad('Cannot build on water');
  if(y<W.H(x,z)-.3)return bad('Blocked by terrain');
  const boxes=pieceBoxes(ty,x,y,z,rot);
  if(!this.structSupported({x,y,z,boxes}))return bad('Needs support below');
  for(const b of boxes){
   if(W.overlapsSolid(b.x0+.05,b.y0+.05,b.z0+.05,b.x1-.05,b.y1-.05,b.z1-.05))return bad('Blocked');
   for(const o of this.list){if(!o.alive||o.drop)continue;
    if(o.pos.x>b.x0-.35&&o.pos.x<b.x1+.35&&o.pos.z>b.z0-.35&&o.pos.z<b.z1+.35&&o.pos.y<b.y1-.05&&o.pos.y+1.5>b.y0+.05)return bad('Someone is in the way')}}
  return{ok:true,cost,ty,mat,x,y,z,rot}},
 // host: a client (or the host) asked to place a piece. Snap and recompute the base height ourselves.
 structHostBuild(e,m){
  if(this.role==='client'||!e||!e.alive||e.drop)return;this.structEnsure();
  const x=Math.round(m.x/GRID)*GRID,z=Math.round(m.z/GRID)*GRID;
  if(![m.x,m.y,m.z].every(Number.isFinite))return;
  const y=W.groundAt(x,z,m.y+.25,.1,.65);
  const r=this.structValidate(e,m.ty,m.mat,x,y,z,m.rot?1:0);
  if(!r.ok){if(e===this.me)this.hud.toast(r.why);return}
  const id=(this.pieceSeq=(this.pieceSeq||0)+1);
  this.structSpend(e,r.mat,r.cost);
  this.emit({k:'bp',p:{id,ty:r.ty,mat:r.mat,rot:r.rot,x:r.x,y:r.y,z:r.z}})},
 // local aim: where a piece would go if placed now (snapped to the 4 m grid)
 structAim(){
  const cam=this.camera,o=cam.position,dir=cam.getWorldDirection(this._aimDir||(this._aimDir=new THREE.Vector3()));
  const hit=W.rayWorld(o.x,o.y,o.z,dir.x,dir.y,dir.z,REACH+6);
  const t=hit?Math.max(.5,Math.min(REACH,hit.t-.3)):REACH;
  const px=o.x+dir.x*t,py=o.y+dir.y*t,pz=o.z+dir.z*t;
  const x=Math.round(px/GRID)*GRID,z=Math.round(pz/GRID)*GRID;
  return{x,y:W.groundAt(x,z,py+.25,.1,.65),z}},
 structPlan(){
  const s=this.structEnsure().bstate,a=this.structAim();
  const v=this.structValidate(this.me,s.ty,s.mat,a.x,a.y,a.z,s.rot);
  return v.ok?v:{ok:false,why:v.why,x:a.x,y:a.y,z:a.z,ty:s.ty,mat:s.mat,rot:s.rot}},
 structPlace(){
  const p=this.structPlan();if(!p.ok){this.hud.toast(p.why);return}
  const req={t:'build',ty:p.ty,mat:p.mat,x:p.x,y:p.y,z:p.z,rot:p.rot};
  if(this.role==='client')this.net.toHost(req);else this.structHostBuild(this.me,req);
  this.audio.play('step',null,.5)},
 structToggle(){
  const me=this.me;if(!me||!me.alive||me.drop)return;this.structEnsure();
  this.building=!this.building;
  this.hud.toast(this.building?'Build mode: wheel = piece, T = rotate, Y = material, click = place':'Build mode off')},
 structCyclePiece(d){const s=this.structEnsure().bstate;const i=PIECE_KEYS.indexOf(s.ty);s.ty=PIECE_KEYS[(i+d+PIECE_KEYS.length)%PIECE_KEYS.length]},
 structCycleMat(){const s=this.structEnsure().bstate;const i=MAT_KEYS.indexOf(s.mat);s.mat=MAT_KEYS[(i+1)%MAT_KEYS.length]},

 // ------------------------------------------------------------ events from the host
 onBuildEvent(ev){
  this.structEnsure();
  switch(ev.k){
   case'bp':{const p=this.structAddPiece(ev.p);if(p)this.fx.dust(p.x,p.y+.5,p.z,6,3,MATS[p.mat].dark);break}
   case'bh':{const p=this.pieces.get(ev.id);if(p){p.hp=ev.hp;p.mat3.emissive.setHex(0x402000);p.flashT=.09}break}
   case'bx':{const p=this.pieces.get(ev.id);if(p)this.structDrop(p,ev.big);break}
   case'mats':{const t=this.ents.get(ev.i);if(t)t.mats=ev.m;break}
   case'hv':{this.fx.burst(ev.x,ev.y,ev.z,5,3,ev.c,.3,8);break}
   case'dec':{const arr=ev.kind==='tree'?W.treeList:W.rockList;const c=arr[ev.i];if(!c||c.gone)break;
    W.removeDecor(ev.kind,c);NAV.invalidateRect(c.x-c.r-1.5,c.z-c.r-1.5,c.x+c.r+1.5,c.z+c.r+1.5);
    const tree=ev.kind==='tree';this.structDebris(c.x,c.y0+1.5,c.z,tree?'#6b4a2b':'#8a8a85',tree?8:10,tree?.4:.5);
    this.fx.dust(c.x,c.y0+1,c.z,12,3,'#a89a7c');break}
  }
 },
 structPieceEvent(ev){this.onBuildEvent(ev)},

 // ------------------------------------------------------------ per-frame: flashes, debris, HUD and ghost preview
 structUpdateUI(dt){
  this.structEnsure();
  for(const p of this.pieces.values()){if(p.flashT>0){p.flashT-=dt;if(p.flashT<=0)p.mat3.emissive.setHex(0)}}
  this.structUpdateDebris(dt);
  const ui=this.structDom();
  const me=this.me,alive=!!(this.running&&me&&me.alive&&!me.drop);
  if(this.building&&!alive)this.building=false;
  this.hud.showMats(alive?(me.mats||emptyMats()):null);
  ui.build.style.display=this.building&&alive?'block':'none';
  if(this.building&&alive){
   const s=this.bstate,p=this.structPlan();
   ui.build.innerHTML=`<b>BUILD</b> &middot; ${PIECES[s.ty].n} &middot; ${MATS[s.mat].n} (${PIECES[s.ty].cost}) <span style="opacity:.7">&middot; wheel piece &middot; T rotate &middot; Y material &middot; click place &middot; B exit</span><br><span style="color:${p.ok?'#7dff9e':'#ff7a7a'}">${p.ok?'Ready':p.why}</span>`;
   this.structGhost(s,p)}
  else if(this.ghost)this.ghost.visible=false},
 structGhost(s,p){
  if(!this.ghost){this.ghost=new THREE.Group();this.dynamic.add(this.ghost)}
  const g=this.ghost;g.visible=true;
  const key=[s.ty,p.x,p.y,p.z,p.rot].join('|');
  if(g.userData.key!==key){g.userData.key=key;for(const c of g.children)c.geometry.dispose();g.clear();
   for(const b of pieceBoxes(s.ty,p.x,p.y,p.z,p.rot)){const m=new THREE.Mesh(new THREE.BoxGeometry(b.x1-b.x0,b.y1-b.y0,b.z1-b.z0),p.ok?ghostMats.ok:ghostMats.bad);
    m.position.set((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.z0+b.z1)/2);g.add(m)}}
  for(const m of g.children)m.material=p.ok?ghostMats.ok:ghostMats.bad},
 structDom(){
  if(this._dom)return this._dom;
  const ui=document.getElementById('ui')||document.body;
  const build=document.createElement('div');
  build.style.cssText='position:absolute;left:50%;bottom:120px;transform:translateX(-50%);font:600 14px system-ui,sans-serif;color:#fff;text-align:center;background:rgba(5,8,30,.6);padding:8px 14px;border-radius:8px;pointer-events:none;display:none;z-index:4;white-space:nowrap';
  ui.appendChild(build);return this._dom={build}},

 // ------------------------------------------------------------ reset between matches
 clearStructures(){
  this.structEnsure();
  for(const p of this.pieces.values()){for(const b of p.boxes)W.removeSolid(b);for(const m of p.meshes){this.dynamic.remove(m);m.geometry.dispose()}}
  for(const p of this.pieces.values())p.mat3.dispose();
  this.pieces.clear();this.pieceSeq=0;
  for(const s of this.debris){this.dynamic.remove(s.m);s.m.geometry.dispose()}this.debris.length=0;
  if(this.ghost){this.dynamic.remove(this.ghost);this.ghost=null}
  W.restoreDecor();NAV.resetAll();
  this.building=false;
  if(this._dom){this._dom.build.style.display='none'}
  this.hud.showMats(null);
 }
};
