import * as THREE from 'three';
import {WEAPONS,ITEMS,RARITY,AMMO,clamp,lerp,mulberry32} from './data.js';
import * as W from './world.js';
import {wstat,makeWeaponModel,mat} from './shared.js';
const NW=WEAPONS.length;
const WEAPON_W=WEAPONS.map((w,i)=>i===0?0:(w.t==='ar'?10:w.t==='smg'?8:w.t==='sg'?8:w.t==='sn'?4:w.t==='pi'?7:w.t==='ex'?3.5:w.t==='melee'?1.5:5));
function pick(rng,ws){let t=0;for(const w of ws)t+=w;let r=rng()*t;for(let i=0;i<ws.length;i++){r-=ws[i];if(r<=0)return i}return ws.length-1}
export function rollRarity(rng,boost=1,min=0){const ws=RARITY.map((r,i)=>i<min?0:r.w*(i>=2?boost:1));return pick(rng,ws)}
export function rollItem(rng,q=1,min=0){
 const k=rng();
 if(k<.42||min>0&&k<.8){const w=pick(rng,WEAPON_W);const r=rollRarity(rng,q,min);return{k:'w',w,r,mag:wstat(w,r).mag}}
 if(k<.62){const types=Object.keys(AMMO);const t=types[pick(rng,[10,8,6,3,1.5])];return{k:'a',t,n:AMMO[t].box}}
 const its=['bandage','minishield','medkit','bigshield','chug','grapple','pad','frag','boogie','banana'];const ws=[9,8,3.5,2.5,.7,2.2,2,2.8,1.4,1.6];const id=its[pick(rng,ws)];return{k:'i',id,n:ITEMS[id].give}}
export function itemName(it){if(it.k==='w')return RARITY[it.r].n+' '+WEAPONS[it.w].n;if(it.k==='i')return ITEMS[it.id].n+(it.n>1?' x'+it.n:'');return AMMO[it.t].n+' Ammo x'+it.n}
export function itemColor(it){if(it.k==='w')return RARITY[it.r].c;if(it.k==='i')return ITEMS[it.id].col;return AMMO[it.t].c}
export const lootMethods={
 genLoot(rng){let id=1;this.loot.clear();
  for(const s of W.lootSpots){
   if(s.chest){this.addLootObj({id:id++,x:s.x,y:s.y,z:s.z,chest:1,q:s.q})}
   else{const n=s.inside?(rng()<.55?2:1):1;if(!s.inside&&rng()<.45)continue;for(let i=0;i<n;i++){const it=rollItem(rng,s.q);this.addLootObj({id:id++,x:s.x+(i?.9:0),y:s.y,z:s.z+(i?.5:0),item:it})}}
   if(s.inside&&!s.chest&&rng()<.15){this.addLootObj({id:id++,x:s.x+.5,y:s.y,z:s.z-.6,item:{k:'a',t:['light','med','shells'][Math.floor(rng()*3)],n:20}})}
  }
  // ammo boxes
  for(let i=0;i<40;i++){const a=rng()*6.283,r=Math.sqrt(rng())*W.ISL*.8;const x=Math.cos(a)*r,z=Math.sin(a)*r;const y=W.H(x,z);if(y<2.5)continue;this.addLootObj({id:id++,x,y:y+.1,z,ammobox:1})}
 },
 addLootObj(l,fromEv){if(l.item&&l.item.k==='a'&&!l.chest){}this.loot.set(l.id,Object.assign(l,{mesh:null}))},
 removeLoot(id){const l=this.loot.get(id);if(!l)return;if(l.mesh)this.dynamic.remove(l.mesh);this.loot.delete(id)},
 spawnLoot(item,x,z,y){ // host only
  const id=this.nextLootId++;const l={id,x,y:y===undefined?W.H(x,z)+.1:y,z,item};this.loot.set(id,Object.assign(l,{mesh:null}));
  this.outEvents.push({k:'lt+',l:{id,x:l.x,y:l.y,z:l.z,item}});return l},
 spawnChest(x,y,z,supply,id){const l={id:id||this.nextLootId++,x,y,z,chest:1,supply:supply?1:0,q:2};this.loot.set(l.id,Object.assign(l,{mesh:null}));this.outEvents.push({k:'lt+',l:{id:l.id,x,y,z,chest:1,supply:l.supply,q:2}});return l},
 openChest(l){ // host
  this.emit({k:'cho',id:l.id});const rng=Math.random;const items=[];
  if(l.supply){items.push(rollItem(rng,3,3));items.push(rollItem(rng,3,2));items.push({k:'i',id:'bigshield',n:2});items.push({k:'i',id:'medkit',n:2});items.push({k:'a',t:['med','light','heavy'][Math.floor(rng()*3)],n:60})}
  else{let w=rollItem(rng,1.6,1);while(w.k!=='w')w=rollItem(rng,1.6,1);items.push(w);items.push(rollItem(rng,1.4));items.push({k:'a',t:WEAPONS[w.w].ammo||'light',n:AMMO[WEAPONS[w.w].ammo||'light'].box});if(rng()<.6)items.push(rollItem(rng,1.2))}
  items.forEach((it,i)=>{const a=i/items.length*6.283+Math.random()*.5;this.spawnLoot(it,l.x+Math.cos(a)*1.6,l.z+Math.sin(a)*1.6,l.y+.2)});
  this.loot.delete(l.id)},
 openAmmoBox(l){this.emit({k:'cho',id:l.id});for(const t of ['light','med','shells','heavy'])if(Math.random()<.8||t==='light')this.spawnLoot({k:'a',t,n:Math.ceil(AMMO[t].box*.7)},l.x+(Math.random()-.5)*2.5,l.z+(Math.random()-.5)*2.5,l.y+.2);this.loot.delete(l.id)},
 // ---- picking up
 updateNearLoot(me){
  let best=null,bd=3.4;const fx=-Math.sin(me.yaw),fz=-Math.cos(me.yaw);
  for(const l of this.loot.values()){const dx=l.x-me.pos.x,dz=l.z-me.pos.z;if(dx*dx+dz*dz>bd*bd||Math.abs(l.y-me.pos.y)>3)continue;const d=Math.hypot(dx,dz);if(l.item&&l.item.k==='a')continue;
   const dot=d<.01?1:(dx*fx+dz*fz)/d;const score=d-dot*1.2;if(dot>-.2&&score<bd){bd=score;best=l}}
  this.near=best;this.hud.setPrompt(best?this.lootLabel(best):null,best)},
 lootLabel(l){if(l.chest)return l.supply?'Open Supply Drop':'Open Chest';if(l.ammobox)return 'Open Ammo Box';return itemName(l.item)},
 pickupLocal(me,l){
  if(this.role==='client'){this.net.toHost({t:'pick',id:l.id});this.audio.play('click');return}
  this.hostPick(me,l)},
 hostPick(e,l){
  if(!this.loot.has(l.id)||!e.alive||e.drop)return;
  if(Math.hypot(l.x-e.pos.x,l.z-e.pos.z)>4.8||Math.abs(l.y-e.pos.y)>4)return;
  if(l.chest){this.openChest(l);return}
  if(l.ammobox){this.openAmmoBox(l);return}
  this.loot.delete(l.id);this.emit({k:'lt-',id:l.id});
  if(e.peer!==undefined&&!e.local)this.emit({k:'grant',g:l.item},e.id);else this.applyGrantLocal(e,l.item)},
 applyGrantLocal(e,it){
  if(it.k==='a'){const m=AMMO[it.t].max;const before=e.ammo[it.t];e.ammo[it.t]=Math.min(m,before+it.n);const left=it.n-(e.ammo[it.t]-before);if(left>0&&e.ammo[it.t]>=m&&e.local&&left===it.n)this.hud.toast(AMMO[it.t].n+' ammo full');else if(e.local)this.audio.play('pick');return}
  if(it.k==='i'){
   const d=ITEMS[it.id];let s=e.inv.find(x=>x&&x.k==='i'&&x.id===it.id);
   if(s){const add=Math.min(d.stack-s.n,it.n);s.n+=add;const left=it.n-add;if(left>0)this.dropItem(e,{k:'i',id:it.id,n:left})}
   else{let i=e.inv.findIndex((x,k)=>k>0&&!x);if(i<0){if(e.cur>0){this.dropSlot(e,e.cur);i=e.cur}else{this.dropItem(e,it);return}}e.inv[i]={k:'i',id:it.id,n:Math.min(it.n,d.stack)};if(it.n>d.stack)this.dropItem(e,{k:'i',id:it.id,n:it.n-d.stack})}
   if(e.local)this.audio.play('pick');return}
  if(it.k==='w'){
   const wd=wstat(it.w,it.r);
   let i=e.inv.findIndex((x,k)=>k>0&&!x);
   if(i<0){i=e.cur>0&&e.inv[e.cur]&&e.inv[e.cur].k==='w'?e.cur:(()=>{let b=-1;for(let k=1;k<6;k++)if(e.inv[k]&&e.inv[k].k==='w'){b=k;break}return b>0?b:1})();this.dropSlot(e,i)}
   e.inv[i]={k:'w',w:it.w,r:it.r,mag:it.mag===undefined?wd.mag:it.mag};
   if(!it.d&&wd.ammo){const A=AMMO[wd.ammo];e.ammo[wd.ammo]=Math.min(A.max,e.ammo[wd.ammo]+Math.round(wd.mag*1.6))}
   const cur=e.inv[e.cur];if(!cur||cur.w===0&&cur.k==='w'||cur.k==='i'||e.cur===i||true){this.swapTo(e,i)}
   if(e.local){this.audio.play('pick');if(it.r>=4)this.hud.toast(RARITY[it.r].n+' '+WEAPONS[it.w].n+'!',RARITY[it.r].c)}}
 },
 dropSlot(e,i){const s=e.inv[i];if(!s)return;e.inv[i]=null;if(s.k==='w'&&s.w===0){e.inv[i]=s;return}
  this.dropItem(e,s.k==='w'?{k:'w',w:s.w,r:s.r,mag:s.mag,d:1}:{k:'i',id:s.id,n:s.n});if(e.cur===i){e.cur=this.firstWeaponSlot(e);e.equipT=.3}},
 dropCurrent(e){if(e.cur>0&&e.inv[e.cur])this.dropSlot(e,e.cur)},
 dropItem(e,item){const x=e.pos.x-Math.sin(e.yaw)*1.8,z=e.pos.z-Math.cos(e.yaw)*1.8;const y=W.groundAt(x,z,e.pos.y+1,.3,2)+.1;
  if(this.role==='client'&&e.local)this.net.toHost({t:'drop',item,x,y,z});else this.spawnLoot(item,x,z,y)},
 // host: auto pickup ammo + proximity
 updateLootHost(dt){
  this.accum.loot+=dt;if(this.accum.loot<.2)return;this.accum.loot=0;
  for(const e of this.list){if(!e.alive||e.drop)continue;
   for(const l of this.loot.values()){if(!l.item||l.item.k!=='a')continue;const dx=l.x-e.pos.x,dz=l.z-e.pos.z;if(dx*dx+dz*dz>3.2||Math.abs(l.y-e.pos.y)>2.5)continue;
    const it=l.item;if(e.ammo[it.t]>=AMMO[it.t].max)continue;
    // bots/humans only want ammo they can use or always accept
    this.loot.delete(l.id);this.emit({k:'lt-',id:l.id});if(e.peer!==undefined&&!e.local)this.emit({k:'grant',g:it},e.id);else this.applyGrantLocal(e,it)}}},
 // ---- visuals
 makeLootMesh(l){
  const g=new THREE.Group();
  if(l.chest||l.ammobox){const gold=l.chest;const col=l.supply?'#ff3d3d':l.chest?'#e0a020':'#4a6a3a';
   const b=new THREE.Mesh(new THREE.BoxGeometry(1.1,.6,.7),mat(col));b.position.y=.3;g.add(b);const lid=new THREE.Mesh(new THREE.BoxGeometry(1.14,.25,.74),mat(l.chest?'#ffd23d':'#6a8a4a',l.chest?'#aa7a00':null));lid.position.y=.72;g.add(lid);
   if(l.supply)g.scale.setScalar(1.8);
   const beam=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,26,8,1,true),new THREE.MeshBasicMaterial({color:l.chest?'#ffd23d':'#8aff6a',transparent:true,opacity:.25,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));beam.position.y=13;g.add(beam);g.userData.chest=true}
  else{const it=l.item,c=itemColor(it);let m;
   if(it.k==='w'){m=makeWeaponModel(it.w,it.r);m.scale.setScalar(1.15);m.rotation.y=Math.PI/2;const bb=new THREE.Box3().setFromObject(m),ctr=bb.getCenter(new THREE.Vector3());m.position.sub(ctr)}
   else if(it.k==='i'){const d=ITEMS[it.id];m=new THREE.Mesh(d.kind==='throw'?new THREE.SphereGeometry(.2,10,8):d.kind==='heal'||d.kind==='chug'?new THREE.BoxGeometry(.3,.3,.3):d.kind==='shield'?new THREE.CylinderGeometry(.14,.18,.4,10):d.kind==='grapple'?new THREE.TorusGeometry(.2,.06,6,10):new THREE.BoxGeometry(.5,.12,.5),mat(c,c))}
   else{m=new THREE.Group();for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.16,.3,.16),mat(c,c));b.position.x=(i-1)*.2;m.add(b)}}
   const inner=new THREE.Group();inner.add(m);inner.position.y=.7;g.add(inner);g.userData.spin=inner;
   const beam=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,it.k==='w'?(5+it.r*2):2.5,8,1,true),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.28,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));beam.position.y=(it.k==='w'?(5+it.r*2):2.5)/2;g.add(beam);
   const disc=new THREE.Mesh(new THREE.CircleGeometry(.55,16),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.4,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.04;g.add(disc)}
  g.position.set(l.x,l.y,l.z);return g},
 updateLootVis(dt){
  this.accum.lv=(this.accum.lv||0)+dt;const cam=this.camera.position;
  if(this.accum.lv>.25){this.accum.lv=0;const R2=(this.settings.dist==='Far'?85:this.settings.dist==='Medium'?65:45)**2;
   for(const l of this.loot.values()){const dx=l.x-cam.x,dz=l.z-cam.z;const near=dx*dx+dz*dz<R2||(l.chest&&dx*dx+dz*dz<(l.supply?40000:3600));
    if(near&&!l.mesh){l.mesh=this.makeLootMesh(l);this.dynamic.add(l.mesh)}else if(!near&&l.mesh){this.dynamic.remove(l.mesh);l.mesh=null}}}
  for(const l of this.loot.values()){const m=l.mesh;if(!m)continue;const sp=m.userData.spin;if(sp){sp.rotation.y+=dt*1.6;sp.position.y=.75+Math.sin(this.t*2+l.id)*.1}}
  // supply drop visuals
  for(const s of this.supplies){const k=clamp((this.t-s.t0)/9,0,1);
   if(!s.mesh&&k<1){const g=new THREE.Group();const c=new THREE.Mesh(new THREE.BoxGeometry(2,1.4,2),mat('#ff3d3d'));g.add(c);const p=new THREE.Mesh(new THREE.SphereGeometry(3.2,14,8,0,6.283,0,1.6),new THREE.MeshLambertMaterial({color:'#ffd23d',side:THREE.DoubleSide}));p.position.y=4.2;g.add(p);for(const[sx,sz]of[[1,1],[-1,1],[1,-1],[-1,-1]]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,4.4,4),mat('#fff'));r.position.set(sx*1.4,2.2,sz*1.4);r.rotation.z=-sx*.35;r.rotation.x=sz*.35;g.add(r)}
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,300,8,1,true),new THREE.MeshBasicMaterial({color:'#ff5a3d',transparent:true,opacity:.3,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));b.position.y=150;g.add(b);s.mesh=g;this.dynamic.add(g)}
   if(s.mesh){const gy=W.H(s.x,s.z);s.mesh.position.set(s.x+Math.sin(this.t)*.6,lerp(s.y0,gy+.7,k),s.z);if(k>=1){this.dynamic.remove(s.mesh);s.mesh=null;s.landed=true}}}
 },
};
