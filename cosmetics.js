// Season 2 (v38): the Battle Pass cosmetics that were "coming soon": nameplate, hat, landing effects, emotes, weapon finishes,
// gliders, backpacks and elimination effects. Everything here is looks only. Nothing changes stats, hit boxes or abilities.
//
// How it travels: the equipped ids go out as `cos.fx` (short keys, see FX_KEYS) with the rest of the player's cosmetics, so every
// machine draws what each player picked. Unknown ids are ignored, so a modified client cannot make anyone load anything odd.
import * as THREE from 'three';
import {WEAPONS,RARITY} from './data.js';
import {REWARDS,TYPE_LABEL,TRAILS} from './season2.js';
import * as W from './world.js';
import {SHOP_COS,SHOP_BY,SHOP_FX_SLOT,paintNameplate,npStyle,npChip} from './shopcos.js';

const TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const h=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};

// reward id -> {key in cos.fx, what it is}
export const FX_SLOT={frame_spore:'fr',hat_puffcap:'ht',land_ring:'ld',land_burst:'ld',gl_cloud:'gl',gl_mushroom:'gl',gl_roots:'gl',pk_root:'pk',pk_glow:'pk',el_burst:'el',el_bloom:'el',wp_blaster:'wb',wp_root:'wr',...SHOP_FX_SLOT};
// the locker shows these groups, in this order: [title, slot key, ids]. Battle Pass items come first, then what the Item Shop sells.
const shopIds=slot=>SHOP_COS.filter(c=>c.slot===slot).map(c=>c.id);
export const COS_GROUPS=[
 ['Nameplate','fr',['frame_spore',...shopIds('fr')]],['Hat','ht',['hat_puffcap',...shopIds('ht')]],['Backpack','pk',['pk_root','pk_glow',...shopIds('pk')]],['Glider','gl',['gl_cloud','gl_mushroom','gl_roots',...shopIds('gl')]],
 ['Landing effect','ld',['land_ring','land_burst',...shopIds('ld')]],['Elimination effect','el',['el_burst','el_bloom',...shopIds('el')]],['Fungal Blaster finish','wb',['wp_blaster']],['Root Shooter finish','wr',['wp_root']]
];
// one place to look up an item's name, icon, rarity and where it comes from, whether it is a Battle Pass reward or a shop item
export function cosInfo(id){
 const sh=SHOP_BY[id];if(sh)return{id,name:sh.name,icon:sh.icon,desc:sh.desc,rar:sh.rar,from:'shop',price:sh.price};
 const r=REWARDS.find(x=>x.id===id);if(r)return{id,name:r.name,icon:r.icon,desc:r.desc,rar:3,from:'pass',lvl:r.lvl};
 return null}
export const REWARD_BY_ID=Object.fromEntries(REWARDS.map(r=>[r.id,r]));
// the bots wear some of it too, so a solo match shows it off
export const BOT_FX=[['ht','hat_puffcap'],['pk','pk_root'],['pk','pk_glow'],['gl','gl_cloud'],['gl','gl_mushroom'],['gl','gl_roots'],['ld','land_ring'],['ld','land_burst'],['el','el_burst'],['el','el_bloom'],['fr','frame_spore'],...SHOP_COS.filter(c=>c.slot!=='tr').map(c=>[c.slot,c.id])];
const known=(slot,id)=>!!id&&FX_SLOT[id]===slot;
export const fxOf=cos=>{const f=cos&&cos.fx;return f&&typeof f==='object'?f:{}};

// ---------- little building blocks
const M=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c,flatShading:true},o));
const GL=(c,o)=>new THREE.MeshBasicMaterial(Object.assign({color:c},o));
const sph=(r,w=8,hh=5)=>new THREE.SphereGeometry(r,w,hh),cyl=(a,b,l,s=6)=>new THREE.CylinderGeometry(a,b,l,s),dome=(r,hh)=>{const g=new THREE.SphereGeometry(1,10,5,0,TAU,0,Math.PI/2);g.scale(r,hh,r);return g};
const put=(g,geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);g.add(m);return m};
// a little mushroom: stem and a spotted cap
const SPOT=GL('#fff4e0');
function mushroom(cap,glow=false,s=1){
 const g=new THREE.Group();
 put(g,cyl(.05*s,.07*s,.3*s),M('#efe2c8'),0,.15*s,0);
 put(g,dome(.2*s,.15*s),glow?GL(cap):M(cap,{side:THREE.DoubleSide}),0,.3*s,0);
 for(let i=0;i<3;i++){const a=i*2.1;put(g,sph(.028*s,4,3),SPOT,Math.cos(a)*.1*s,.3*s+.12*s*Math.cos(a*.3),Math.sin(a)*.1*s)}
 return g}

// ---------- hat: Puffcap (a soft mushroom cap sitting on the head)
export function makePuffcap(){
 const g=new THREE.Group();
 put(g,dome(.52,.34),M('#c46bff',{side:THREE.DoubleSide}),0,.02,0);
 put(g,cyl(.46,.5,.07,10),M('#6a2fb8'),0,0,0);
 for(let i=0;i<6;i++){const a=i*1.05,r=.18+.16*(i%2);put(g,sph(.065,5,3),SPOT,Math.cos(a)*r,.04+.3*Math.sqrt(Math.max(0,1-(r/.52)**2)),Math.sin(a)*r)}
 return g}

// ---------- backpacks
export function makeRootPack(){
 const g=new THREE.Group();
 put(g,new THREE.BoxGeometry(.5,.62,.3),M('#7a5230'),0,0,0);
 const band=M('#4f8a3a');for(const y of[-.16,.12])put(g,new THREE.TorusGeometry(.3,.028,4,10),band,0,y,0,Math.PI/2,0,0).scale.set(.85,.62,1);
 put(g,cyl(.04,.06,.5,5),M('#5a3a1e'),-.2,.08,.12,0,0,.5);put(g,cyl(.04,.06,.45,5),M('#5a3a1e'),.2,.0,.12,0,0,-.5);
 for(let i=0;i<4;i++)put(g,sph(.07,5,3),M(i%2?'#6fae3a':'#4a8a2a'),-.18+i*.12,.34,.02);
 put(g,sph(.045,5,3),GL('#9bff78'),.08,.4,.05);
 return g}
export function makeGlowPack(){
 const g=new THREE.Group();
 put(g,new THREE.BoxGeometry(.5,.6,.3),M('#3a2a6a'),0,0,0);
 put(g,dome(.26,.12),M('#5a3a9a',{side:THREE.DoubleSide}),0,.3,0);
 const cols=['#b6ff6a','#7ff0ff','#e0a0ff'];
 for(let i=0;i<3;i++){const m=mushroom(cols[i],true,1.05);m.position.set(-.14+i*.14,.3,.02+.03*(i%2));g.add(m)}
 put(g,sph(.09,6,4),GL('#b6ff6a',{transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}),0,.2,.2);
 return g}

// ---------- v39 shop hats: each sits on the head with its base near y=0, like the Puffcap
const GOLD=()=>new THREE.MeshLambertMaterial({color:'#e8b020',emissive:'#6a4a00',emissiveIntensity:.55,flatShading:true});
export function makeShopHat(id){
 const g=new THREE.Group();
 if(id==='ht_crown'){
  const gold=GOLD();put(g,cyl(.4,.44,.22,10),gold,0,.11,0);
  for(let i=0;i<5;i++){const a=i/5*TAU;put(g,cyl(0,.09,.26,4),gold,Math.cos(a)*.36,.32,Math.sin(a)*.36);put(g,sph(.045,5,3),GL(i%2?'#ff4a6a':'#4ad8ff'),Math.cos(a)*.36,.47,Math.sin(a)*.36)}
  put(g,cyl(.405,.445,.05,10),M('#c0392b'),0,.06,0);
 }else if(id==='ht_wizard'){
  put(g,cyl(.64,.64,.05,12),M('#3a2a8a'),0,0,0);
  put(g,cyl(.04,.4,.95,8),M('#4a3aa8'),0,.5,0,0,0,.12);
  put(g,cyl(.405,.42,.09,8),M('#ffd84a'),0,.1,0);
  for(const[x,y,z]of[[.18,.4,.28],[-.2,.55,.2],[.05,.28,-.38]])put(g,sph(.05,4,3),GL('#fff2a0'),x,y,z);
 }else if(id==='ht_halo'){
  put(g,new THREE.TorusGeometry(.36,.045,5,16),GL('#ffe88a'),0,.42,0,Math.PI/2,0,0);
  put(g,new THREE.TorusGeometry(.36,.11,5,16),GL('#ffe070',{transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}),0,.42,0,Math.PI/2,0,0);
 }else if(id==='ht_cone'){
  put(g,new THREE.BoxGeometry(.62,.05,.62),M('#2a2a2a'),0,0,0);
  put(g,cyl(.07,.27,.6,8),M('#ff7a1a'),0,.32,0);
  put(g,cyl(.14,.2,.1,8),M('#ffffff'),0,.34,0);put(g,cyl(.1,.14,.08,8),M('#ffffff'),0,.5,0);
 }else if(id==='ht_cowboy'){
  const b=M('#8a5a2e');
  put(g,cyl(.72,.72,.04,12),b,0,0,0).scale.set(1,1,.82);
  put(g,cyl(.34,.4,.3,8),b,0,.17,0);put(g,cyl(.345,.405,.07,8),M('#3a2414'),0,.07,0);
  put(g,sph(.05,4,3),GL('#ffd84a'),0,.07,.4);
  put(g,cyl(.4,.34,.04,8),M('#6a4020'),0,.33,0);
 }else if(id==='ht_horns'){
  const red=M('#d8202a');
  for(const sx of[-1,1]){put(g,cyl(0,.1,.42,6),red,sx*.3,.24,0,0,0,-sx*.45);put(g,sph(.1,5,3),M('#a01018'),sx*.24,.04,0)}
 }
 return g}

// ---------- v39 shop backpacks: centred on the middle of the pack (see updateCosSprite for where they hang)
export function makeShopPack(id){
 const g=new THREE.Group();
 if(id==='pk_bear'){
  const fur=M('#a8703a'),dk=M('#6a4220');
  put(g,sph(.3,7,5),fur,0,-.04,0).scale.set(1,1.05,.8);
  put(g,sph(.2,7,5),fur,0,.34,0);
  for(const sx of[-1,1]){put(g,sph(.085,5,3),fur,sx*.14,.5,0);put(g,sph(.045,4,3),dk,sx*.14,.5,.04);put(g,sph(.1,5,3),fur,sx*.3,.1,.04);put(g,sph(.1,5,3),fur,sx*.16,-.3,.08)}
  put(g,sph(.1,5,3),M('#e8c89a'),0,-.04,.2).scale.set(1,1.1,.5);
  put(g,sph(.035,4,3),M('#222'),0,.32,.19);
 }else if(id==='pk_cell'){
  put(g,cyl(.17,.17,.62,8),GL('#6aff5a'),0,0,0);
  put(g,cyl(.18,.18,.07,8),M('#2a2a32'),0,.34,0);put(g,cyl(.18,.18,.07,8),M('#2a2a32'),0,-.34,0);put(g,cyl(.06,.06,.08,6),M('#c8c8d0'),0,.4,0);
  for(const y of[-.12,.12])put(g,new THREE.TorusGeometry(.18,.02,4,10),M('#2a2a32'),0,y,0,Math.PI/2,0,0);
  put(g,cyl(.3,.3,.7,8),GL('#9aff7a',{transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false}),0,0,0);
 }else if(id==='pk_chest'){
  const gold=GOLD();
  put(g,new THREE.BoxGeometry(.56,.34,.34),M('#7a4a22'),0,-.1,0);
  put(g,cyl(.17,.17,.56,8,1),M('#8a5a2e'),0,.07,0,0,0,Math.PI/2).scale.set(1,1,1);
  for(const x of[-.2,.2])put(g,new THREE.BoxGeometry(.05,.5,.37),gold,x,-.02,0);
  put(g,new THREE.BoxGeometry(.1,.12,.04),gold,0,-.04,.19);
 }else if(id==='pk_jet'){
  const grey=M('#8a929c');
  for(const sx of[-1,1]){put(g,cyl(.11,.12,.58,8),grey,sx*.15,.04,0);put(g,sph(.11,6,4),M('#d8d8e0'),sx*.15,.34,0);put(g,cyl(.1,.07,.1,8),M('#3a3a42'),sx*.15,-.28,0);put(g,cyl(.07,0,.42,6),GL('#ffa040',{transparent:true,opacity:.85}),sx*.15,-.52,0,Math.PI,0,0);put(g,cyl(.035,0,.3,5),GL('#fff2c0'),sx*.15,-.46,0,Math.PI,0,0)}
  put(g,new THREE.BoxGeometry(.3,.12,.16),M('#4a4a54'),0,.06,-.02);
 }else if(id==='pk_wings'){
  const w=M('#ffffff',{emissive:'#fff2c0',emissiveIntensity:.4,side:THREE.DoubleSide});
  for(const sx of[-1,1])for(let i=0;i<4;i++){const f=put(g,new THREE.BoxGeometry(.1,.62-i*.1,.03),w,sx*(.2+i*.15),.14-i*.08,0,0,0,-sx*(.7-i*.09));f.scale.x=1}
  put(g,sph(.1,6,4),GL('#fff2b0',{transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}),0,.1,0);
 }
 return g}

// ---------- gliders: same size and strings as the standard one (see makeGliderModel in game.js), different canopy
function strings(g,col='#222'){
 const pts=[[-2.3,0],[2.3,0],[-1.63,1.63],[1.63,1.63]],v=[];
 for(const[x,y]of pts)v.push(x,y,0,x>0?.2:-.2,-1.4,0);
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
 g.add(new THREE.LineSegments(sg,new THREE.LineBasicMaterial({color:col})))}
export function fungalGlider(id){
 if(SHOP_BY[id]&&SHOP_BY[id].slot==='gl')return shopGlider(id);
 if(id!=='gl_cloud'&&id!=='gl_mushroom'&&id!=='gl_roots')return null; // unknown ids fall back to the standard glider
 const g=new THREE.Group();
 if(id==='gl_mushroom'){
  put(g,dome(2.5,1.35),M('#b24bd8',{side:THREE.DoubleSide}),0,.12,0);
  put(g,cyl(2.5,2.55,.14,14),M('#6a2a8a'),0,.1,0);
  for(let i=0;i<9;i++){const a=i*2.4,r=.6+1.5*((i*37)%10)/10;put(g,sph(.24,5,3),SPOT,Math.cos(a)*r,.12+1.3*Math.sqrt(Math.max(0,1-(r/2.5)**2))*.97,Math.sin(a)*r*.5).scale.set(1,.4,1)}
  for(let i=0;i<10;i++){const a=i/10*TAU;put(g,new THREE.BoxGeometry(.04,.12,1.9),M('#e9a8ff'),Math.cos(a)*1.1,.04,Math.sin(a)*1.1,0,-a,0)}
 }else if(id==='gl_roots'){
  const bark=M('#6a4524'),leaf=M('#4a8a2a');
  for(let k=0;k<5;k++){const r=2.3-k*.05,t=new THREE.TorusGeometry(r,.075-.008*k,5,22,Math.PI);const m=put(g,t,bark,0,0,(k-2)*.07,0,0,0);m.rotation.z=(k-2)*.025;m.rotation.x=(k-2)*.05}
  for(let i=-3;i<=3;i++){const a=Math.PI/2+i*.4;put(g,cyl(.045,.07,2.3,5),bark,Math.cos(a)*1.15,Math.sin(a)*1.15,0,0,0,a-Math.PI/2)}
  for(let i=0;i<12;i++){const a=Math.PI*(i+.5)/12;put(g,sph(.1,5,3),i%3?leaf:GL('#9bff78'),Math.cos(a)*2.3,Math.sin(a)*2.3,0).scale.set(1.6,.7,.8)}
  const web=new THREE.Mesh(new THREE.CircleGeometry(2.28,22,0,Math.PI),new THREE.MeshLambertMaterial({color:'#8a5a2a',transparent:true,opacity:.38,side:THREE.DoubleSide}));g.add(web);
 }else{ // gl_cloud: a pale puffy cloud of spores
  const cm=new THREE.MeshLambertMaterial({color:'#e6ffd0',transparent:true,opacity:.9,emissive:'#6aa86a',emissiveIntensity:.35,flatShading:true});
  const pts=[[0,.5,1.1],[-1.3,.35,.95],[1.3,.35,.95],[-2.1,.15,.6],[2.1,.15,.6],[-.65,.75,.9],[.65,.75,.9],[0,.3,.75]];
  for(const[x,y,r]of pts)put(g,sph(r,8,6),cm,x,y,0).scale.set(1,.7,.8);
  put(g,sph(2.5,10,6),GL('#b6ffb0',{transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false}),0,.4,0).scale.set(1,.6,.5);
  for(let i=0;i<8;i++){const a=i*.79;put(g,sph(.06,4,3),GL(i%2?'#7ff0ff':'#b6ff6a'),Math.cos(a)*1.9,.2+.6*Math.sin(a*1.7),.5*Math.sin(a))}
 }
 strings(g,id==='gl_cloud'?'#6a9a6a':'#2a1a30');
 g.position.y=3.1;return g}


// v39 shop gliders: a half-disc canopy of radius 2.3 like the standard one, so every glider fits the same strings
function halfDisc(col,r=2.3,depth=.12,opts){
 const sh=new THREE.Shape();sh.moveTo(-r,0);sh.absarc(0,0,r,Math.PI,0,true);sh.lineTo(-r,0);
 const geo=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false,curveSegments:24});geo.translate(0,0,-depth/2);
 const o=Object.assign({side:THREE.DoubleSide},opts),basic=!!o.basic;delete o.basic;
 return new THREE.Mesh(geo,basic?GL(col,o):M(col,o))}
const addHD=(g,m,x=0,y=0,z=0)=>{m.position.set(x,y,z);g.add(m);return m};
export function shopGlider(id){
 const g=new THREE.Group();
 if(id==='gl_paper'){
  const mk=sx=>{const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(sx*2.4,0);sh.lineTo(0,2.7);sh.lineTo(0,0);
   const m=new THREE.Mesh(new THREE.ShapeGeometry(sh),M(sx>0?'#ffffff':'#e6eefc',{side:THREE.DoubleSide}));m.rotation.y=-sx*.22;return m};
  g.add(mk(1));g.add(mk(-1));
  put(g,new THREE.BoxGeometry(.05,2.6,.05),M('#aab6cc'),0,1.3,0);
  for(const sx of[-1,1])put(g,new THREE.BoxGeometry(.03,1.3,.03),M('#c8d4ea'),sx*.85,.55,0,0,0,sx*.55);
 }else if(id==='gl_pixel'){
  const cell=.46,cols=['#ff5a5a','#ffa83a','#ffe04a','#5aff8a','#5ab8ff','#b07aff'],geo=new THREE.BoxGeometry(cell*.94,cell*.94,.14);
  for(let ix=-5;ix<=4;ix++)for(let iy=0;iy<5;iy++){
   const x=(ix+.5)*cell,y=(iy+.5)*cell;if(Math.hypot(x,y)>2.38)continue;
   put(g,geo,M(cols[(iy+(ix+5>>1))%cols.length]),x,y,0)}
  put(g,new THREE.BoxGeometry(4.7,.1,.16),M('#2a2a3a'),0,0,0);
 }else if(id==='gl_neon'){
  addHD(g,halfDisc('#120c2a'));
  put(g,new THREE.TorusGeometry(2.3,.07,5,30,Math.PI),GL('#33f0ff'),0,0,0);
  put(g,new THREE.TorusGeometry(1.55,.05,5,26,Math.PI),GL('#ff4ad8'),0,0,.02);
  put(g,new THREE.TorusGeometry(.8,.05,5,20,Math.PI),GL('#33f0ff'),0,0,.02);
  put(g,new THREE.BoxGeometry(4.6,.07,.1),GL('#ff4ad8'),0,0,0);
  for(let i=1;i<6;i++){const a=Math.PI*i/6;const m=put(g,new THREE.BoxGeometry(.04,2.3,.06),GL('#33f0ff',{transparent:true,opacity:.75}),0,0,0.02);m.geometry.translate(0,1.15,0);m.rotation.z=a-Math.PI/2}
  addHD(g,halfDisc('#33f0ff',2.5,.02,{basic:1,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false}),0,0,-.05);
 }else if(id==='gl_flame'){
  addHD(g,halfDisc('#c4341a',2.3,.14));
  addHD(g,halfDisc('#ff7a22',1.8,.16),0,0,.01);addHD(g,halfDisc('#ffd040',1.15,.18),0,0,.02);
  for(let i=0;i<11;i++){const a=Math.PI*(i+.5)/11,r=2.3;const f=put(g,cyl(0,.2,.7,5),GL(i%2?'#ff9a2a':'#ffd060',{transparent:true,opacity:.9}),Math.cos(a)*r,Math.sin(a)*r,0,0,0,a-Math.PI/2);f.scale.set(1,1+(i%3)*.25,1)}
 }else if(id==='gl_frost'){
  addHD(g,halfDisc('#cfeaff',2.3,.1,{transparent:true,opacity:.88,emissive:'#7ab8ff',emissiveIntensity:.3}));
  addHD(g,halfDisc('#ffffff',1.5,.12,{transparent:true,opacity:.55}),0,0,.01);
  for(let i=0;i<9;i++){const a=Math.PI*(i+.5)/9;put(g,cyl(0,.14,.75+(i%3)*.2,4),M('#eaf8ff',{emissive:'#9ad0ff',emissiveIntensity:.5}),Math.cos(a)*2.3,Math.sin(a)*2.3,0,0,0,a-Math.PI/2)}
  for(let i=1;i<5;i++){const m=put(g,new THREE.BoxGeometry(.05,2.2,.14),M('#ffffff',{transparent:true,opacity:.7}),0,0,0);m.geometry.translate(0,1.1,0);m.rotation.z=Math.PI*i/5-Math.PI/2}
 }else{ // gl_gold
  const gold=new THREE.MeshLambertMaterial({color:'#f0b820',emissive:'#7a5000',emissiveIntensity:.6,side:THREE.DoubleSide});
  const c=halfDisc('#f0b820',2.3,.14);c.material=gold;g.add(c);
  for(let i=-3;i<=3;i++){const m=put(g,new THREE.BoxGeometry(.09,2.25,.18),M('#fff6d0',{emissive:'#fff2b0',emissiveIntensity:.4}),0,0,0);m.geometry.translate(0,1.12,0);m.rotation.z=i*.4}
  put(g,new THREE.TorusGeometry(2.3,.06,5,30,Math.PI),GL('#fff2b0'),0,0,0);
  put(g,sph(.16,6,4),M('#ff4a6a',{emissive:'#a01030',emissiveIntensity:.6}),0,2.25,0);
 }
 strings(g,id==='gl_neon'?'#33f0ff':id==='gl_gold'?'#8a6a10':'#2a2a30');
 g.position.y=3.1;return g}

// ---------- weapon finishes: the Fungal Blaster and the Root Shooter get a new coat. `cos` is the owner's cosmetics.
export function finishWeapon(model,w,cos){
 const wd=WEAPONS[w],f=fxOf(cos);if(!wd||!model)return model;
 const blaster=wd.n==='Fungal Blaster'&&known('wb',f.wb),root=wd.n==='Root Shooter'&&known('wr',f.wr);
 if(!blaster&&!root)return model;
 const tint=new THREE.Color(blaster?'#4d7a3a':'#7a5230');
 model.traverse(o=>{if(o.isMesh&&o.material&&o.material.color){o.material=o.material.clone();o.material.color.lerp(tint,.62)}});
 const bb=new THREE.Box3().setFromObject(model),sz=bb.getSize(new THREE.Vector3()),c=bb.getCenter(new THREE.Vector3());
 const top=bb.max.y,tip=bb.min.z,tail=bb.max.z,len=Math.max(.3,tail-tip);
 const add=new THREE.Group();
 if(blaster){ // moss on top and three little glowing mushrooms along the barrel
  for(let i=0;i<5;i++)put(add,sph(.05+.02*(i%2),5,3),M(i%2?'#6fae3a':'#4a8a2a'),c.x+(i%2?.02:-.02),top+.005,tip+len*(.15+i*.18));
  const cols=['#b6ff6a','#7ff0ff','#e0a0ff'];
  for(let i=0;i<3;i++){const m=mushroom(cols[i],true,.5);m.position.set(c.x+(i-1)*.012,top,tip+len*(.28+i*.22));add.add(m)}
 }else{ // woven roots: bark rings round the barrel, a root tail and a glowing tip
  const bark=M('#5a3a1e');
  for(let i=0;i<4;i++){const r=Math.max(.05,Math.min(sz.x,sz.y)*.62),t=put(add,new THREE.TorusGeometry(r,.014,4,9),bark,c.x,c.y,tip+len*(.18+i*.2),0,0,0);t.rotation.set(0,0,i*.4)}
  put(add,cyl(.012,.025,len*.5,4),bark,c.x+.02,top-.01,tip+len*.35,Math.PI/2,0,.1);
  put(add,sph(.03,5,3),GL('#9bff78'),c.x,c.y,tip-.01);
 }
 model.add(add);return model}

// ---------- nameplate: the plate behind a player's name (the looks live in shopcos.js: the Spore Nameplate plus the shop ones)
export const NAMEPLATE_CLS='npl';
export function drawNameplate(c,id){ // c: the 256x64 name-tag canvas context, name text at y=24
 return paintNameplate(c,id||'frame_spore')}

// ========================= Game side (mixed into Game)
const LAND_SND={ld_shock:'pod',ld_confetti:'fun',ld_snow:'bell',ld_flame:'pod'},ELIM_SND={el_confetti:'fun',el_shatter:'bell',el_fire:'pod',el_gold:'chest'};
export const cosGameMethods={
 // build a player's hat and backpack on their sprite (makeSprite calls this)
 attachCosSprite(e){
  const s=e.spr,f=fxOf(e.cos);if(!s)return;
  s.cosG=null;
  if(known('ht',f.ht)){const hat=f.ht==='hat_puffcap'?makePuffcap():makeShopHat(f.ht);hat.position.y=1.74;hat.scale.setScalar(.95);s.pivot.add(hat);s.cosHat=hat}
  if(known('pk',f.pk)){const p=f.pk==='pk_glow'?makeGlowPack():f.pk==='pk_root'?makeRootPack():makeShopPack(f.pk);p.visible=false;s.pivot.add(p);s.cosPack=p;s.cosPackPart=f.pk==='pk_glow'?['#b6ff6a','#c9a8ff']:(SHOP_BY[f.pk]||{}).part||null;s.cosPackDown=f.pk==='pk_jet'}
  s.cosG=!!(s.cosHat||s.cosPack)||known('gl',f.gl)
 },
 // every frame for a visible sprite: the pack hangs on the back, so it shows from behind and the side and hides from the front
 updateCosSprite(e,s,view,dt){
  const p=s.cosPack;
  if(p){
   if(view==='front')p.visible=false;
   else{p.visible=true;if(view==='back')p.position.set(0,.98,.2);else p.position.set(-.34,.98,.02)}
   if(s.cosPackPart&&p.visible&&e.alive){s.cosT=(s.cosT||0)-dt;if(s.cosT<=0){s.cosT=s.cosPackDown?.12:.35;const P=e.rpos,cs=s.cosPackPart;this.fx.emit(P.x+(Math.random()-.5)*.5,P.y+(s.cosPackDown?.9:1.5)+Math.random()*.4,P.z+(Math.random()-.5)*.5,(Math.random()-.5)*.3,s.cosPackDown?-.9-Math.random()*.5:.4+Math.random()*.4,(Math.random()-.5)*.3,cs[(Math.random()*cs.length)|0],s.cosPackDown?.5:1.2,s.cosPackDown?0:-.05,.12,.4,0,.5)}}
  }
  if(e.drop==='glide'&&e.alive){ // cloud and root gliders shed a few spores while you glide
   const gl=fxOf(e.cos).gl;if(gl){s.cosT2=(s.cosT2||0)-dt;if(s.cosT2<=0){s.cosT2=.08;const P=e.rpos,r=Math.random;
    if(gl==='gl_cloud')this.fx.puff(P.x+(r()-.5)*3,P.y+2.9+r()*.6,P.z+(r()-.5)*3,0,-.3,0,r()<.5?'#e6ffd0':'#bff0ff',1.3,.7,.8,.35,0,.6);
    else if(gl==='gl_mushroom')this.fx.emit(P.x+(r()-.5)*4,P.y+2.6,P.z+(r()-.5)*4,0,-.6,0,'#e0a0ff',1.4,-.05,.16,.4,0,.5);
    else if(gl==='gl_roots')this.fx.emit(P.x+(r()-.5)*4,P.y+3.2+r()*.6,P.z+(r()-.5)*4,0,-1.2,0,'#8aff6a',1.2,.2,.12,.4,0,.6);
    else{const sg=SHOP_BY[gl],cs=sg&&sg.part;if(cs)this.fx.emit(P.x+(r()-.5)*4,P.y+2.9+r()*.6,P.z+(r()-.5)*4,(r()-.5)*.4,-.9-r()*.4,(r()-.5)*.4,cs[(r()*cs.length)|0],1.1,.1,.14,.4,0,.6)}}}}
 },
 // every frame: landing effects (any player, any machine) and the mushrooms that sprout and fade
 updateCosFx(dt){
  for(const e of this.list){
   const ld=fxOf(e.cos).ld;if(!ld||!e.alive)continue;
   const air=!(e.grounded&&!e.drop)&&e.drop!=='bus';
   if(air)e.cosAir=(e.cosAir||0)+dt;
   else{if(e.cosAir>.45&&e.drop!=='bus')this.landFx(e,ld,e.cosAir);e.cosAir=0}}
  const sp=this.cosSprouts;if(!sp||!sp.length)return;
  for(let i=sp.length-1;i>=0;i--){const m=sp[i];m.t+=dt;
   const u=m.t/m.life,grow=Math.min(1,m.t/m.grow),shrink=u>.75?1-(u-.75)/.25:1,k=Math.max(.001,m.s*(1-Math.pow(1-grow,3))*Math.max(0,shrink));
   m.obj.scale.setScalar(k);m.obj.rotation.y+=dt*.2;
   if(m.t>=m.life){this.dynamic.remove(m.obj);sp.splice(i,1)}}
 },
 // a ring of mushrooms that grow out of the ground, hold, then shrink away
 sprout(x,y,z,n,rad,opts={}){
  const sp=this.cosSprouts||(this.cosSprouts=[]);
  const cols=opts.cols||['#c46bff','#3fe0c0','#c8ff5a','#ff7ab8'];
  for(let i=0;i<n;i++){
   if(sp.length>70){const o=sp.shift();this.dynamic.remove(o.obj)}
   const a=i/n*TAU+Math.random()*.5,r=rad*(.55+Math.random()*.55),px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
   const m=mushroom(cols[(Math.random()*cols.length)|0],!!opts.glow,1+Math.random()*(opts.tall||.6));
   const gy=W.H(px,pz);m.position.set(px,(Math.abs(gy-y)<1.3?gy:y)-.02,pz);m.scale.setScalar(.001);this.dynamic.add(m);
   sp.push({obj:m,t:-Math.random()*.25,life:opts.life||3.4,grow:.35,s:1})}
 },
 // landing effects: Spore Ring (a ring of spores) and Mushroom Burst (mushrooms sprout round you)
 landFx(e,id,airT){
  const P=e.pos,fx=this.fx,big=Math.min(1.4,.7+airT*.25);
  if(id==='land_ring'){
   fx.ring(P,3.2*big,'#b6ff9a',.6);fx.ring(P,2.2*big,'#c9a8ff',.45);
   for(let i=0;i<22;i++){const a=i/22*TAU,s=3.2*big;fx.emit(P.x+Math.cos(a)*.4,P.y+.15,P.z+Math.sin(a)*.4,Math.cos(a)*s,.5+Math.random()*.6,Math.sin(a)*s,i%2?'#b6ff6a':'#7ff0ff',.9,-.1,.22,.4,.9,.7)}
  }else if(id==='land_burst'){
   this.sprout(P.x,P.y,P.z,7,1.7*big,{life:3.2});
   for(let i=0;i<10;i++)fx.puff(P.x,P.y+.2,P.z,(Math.random()-.5)*3,.4+Math.random()*.9,(Math.random()-.5)*3,Math.random()<.5?'#c9a8ff':'#a8ff7a',.9,.7,1.4,.5,-.05,1.4)}
  else if(id==='ld_shock'){
   fx.ring(P,4.6*big,'#ffffff',.5);fx.ring(P,3*big,'#cfe3ff',.4);fx.dust(P.x,P.y+.1,P.z,18,5*big,'#d8d8e0');
  }else if(id==='ld_confetti'){
   const cols=['#ff5a8a','#ffd84a','#5aff8a','#5ab8ff','#b07aff','#ff9a3c'];
   for(let i=0;i<38;i++){const a=Math.random()*TAU,s=1+Math.random()*3;fx.emit(P.x,P.y+.2,P.z,Math.cos(a)*s,3+Math.random()*4,Math.sin(a)*s,cols[(Math.random()*cols.length)|0],1.5,9,.2,0,.3)}
   fx.ring(P,2*big,'#ffd84a',.4);
  }else if(id==='ld_snow'){
   fx.ring(P,3.2*big,'#dff4ff',.55);fx.ring(P,2*big,'#7ab8ff',.4);
   for(let i=0;i<20;i++)fx.puff(P.x,P.y+.2,P.z,(Math.random()-.5)*4,.5+Math.random()*1.4,(Math.random()-.5)*4,Math.random()<.5?'#ffffff':'#bfe4ff',1.2,.7,1.2,.6,-.05,1.4);
   fx.burst(P.x,P.y+.3,P.z,22,4,'#e8f8ff',1,2);
  }else if(id==='ld_flame'){
   fx.ring(P,3.2*big,'#ff9a3c',.5);fx.ring(P,2.1*big,'#ffd060',.4);
   for(let i=0;i<22;i++){const a=i/22*TAU;fx.puff(P.x+Math.cos(a)*.5,P.y+.2,P.z+Math.sin(a)*.5,Math.cos(a)*2.2,1+Math.random()*1.3,Math.sin(a)*2.2,i%2?'#ff7a1e':'#ffb83a',.9,.8,1.1,.8,-.4,1.2)}
  }
  this.audio.play(LAND_SND[id]||'spore',P,.7);
 },
 // elimination effects, drawn where the victim fell, for the player who got the kill
 elimFx(v,by){
  const id=by&&fxOf(by.cos).el;if(!id||!v)return;
  const P=v.pos,fx=this.fx;
  if(id==='el_burst'){
   fx.burst(P.x,P.y+1,P.z,46,7,'#b6ff6a',.9,2);fx.burst(P.x,P.y+1,P.z,30,5,'#c58bff',1,2);fx.burst(P.x,P.y+1,P.z,20,4,'#7ff0ff',1,1);fx.ring(P,3.4,'#b6ff9a',.6);
   for(let i=0;i<14;i++)fx.puff(P.x,P.y+1,P.z,(Math.random()-.5)*5,.4+Math.random()*1.6,(Math.random()-.5)*5,Math.random()<.5?'#a8ff7a':'#c9a8ff',1.5,1.1,1.6,.55,-.1,1.2);
   this.audio.play('pod',P,.8);
  }else if(id==='el_bloom'){
   this.sprout(P.x,P.y,P.z,11,2.1,{life:4.6,glow:true,tall:1.1,cols:['#ff7ab8','#ffb0e0','#d84a8a','#ffd0f0']});
   this.sprout(P.x,P.y,P.z,5,1,{life:4.6,tall:1.5});
   fx.burst(P.x,P.y+.8,P.z,30,5,'#ff8ad0',1,1);fx.ring(P,2.6,'#ffb0e0',.6);
   for(let i=0;i<8;i++)fx.puff(P.x,P.y+.6,P.z,(Math.random()-.5)*2.4,.6+Math.random(),(Math.random()-.5)*2.4,Math.random()<.5?'#ffb0e0':'#d8a8ff',1.4,.9,1.4,.5,-.05,1.2);
   this.audio.play('chest',P,.6);
  }else if(id==='el_confetti'){
   const cols=['#ff5a8a','#ffd84a','#5aff8a','#5ab8ff','#b07aff','#ff9a3c'];
   for(let i=0;i<54;i++){const a=Math.random()*TAU,s=1+Math.random()*4;fx.emit(P.x,P.y+1,P.z,Math.cos(a)*s,3+Math.random()*5,Math.sin(a)*s,cols[(Math.random()*cols.length)|0],1.6,9,.22,0,.3)}
   fx.ring(P,3,'#ffd84a',.5);
  }else if(id==='el_shatter'){
   fx.burst(P.x,P.y+1,P.z,50,8,'#dff4ff',.9,6);fx.burst(P.x,P.y+1,P.z,28,5,'#7ab8ff',1,5);fx.ring(P,3.2,'#bff0ff',.55);
   for(let i=0;i<8;i++)fx.puff(P.x,P.y+1,P.z,(Math.random()-.5)*3,.4+Math.random()*1.2,(Math.random()-.5)*3,'#eaf8ff',1.2,.9,1.2,.5,-.05,1.2);
  }else if(id==='el_fire'){
   fx.burst(P.x,P.y+.8,P.z,40,6,'#ffb83a',.9,-1);fx.burst(P.x,P.y+.8,P.z,24,4,'#ff5a2a',1,-1);fx.ring(P,3,'#ff9a3c',.5);
   for(let i=0;i<14;i++)fx.puff(P.x,P.y+.5,P.z,(Math.random()-.5)*2.4,1+Math.random()*2,(Math.random()-.5)*2.4,i%3?'#ff7a1e':'#3a2a2a',1.4,1,1.4,.7,-.3,1.2);
  }else if(id==='el_gold'){
   fx.burst(P.x,P.y+1,P.z,50,7,'#ffd84a',1,3);fx.burst(P.x,P.y+1,P.z,30,5,'#fff2b0',1.1,3);fx.ring(P,3.4,'#ffd84a',.6);fx.ring(P,2,'#fff2b0',.4);
   for(let i=0;i<14;i++)fx.emit(P.x,P.y+.6,P.z,(Math.random()-.5)*3,3+Math.random()*3,(Math.random()-.5)*3,'#ffe070',1.4,8,.24,0,.2);
  }
  if(ELIM_SND[id])this.audio.play(ELIM_SND[id],P,.7);
 },
 // the two Battle Pass emotes add particles and a few stages on top of the sprite animation. t = seconds into the emote.
 emoteExtra(e,em,t){
  const P=e.rpos,fx=this.fx,r=Math.random,d=em.d;
  const dt=this.t-(em.lastT===undefined?this.t:em.lastT);em.lastT=this.t;em.fxT=(em.fxT||0)-dt;
  if(em.fxT>0)return;
  if(d.kind==='sdance'){em.fxT=.09;fx.emit(P.x+(r()-.5)*1.2,P.y+.3+r()*1.6,P.z+(r()-.5)*1.2,(r()-.5)*.6,.5+r()*.6,(r()-.5)*.6,r()<.5?'#b6ff6a':r()<.5?'#c9a8ff':'#7ff0ff',1,-.1,.2,.4,0,.7)}
  else if(d.kind==='rise'){
   const st=t<3?0:t<7?1:t<11?2:3;
   if(em.stage!==st){em.stage=st;
    if(st===1){this.sprout(P.x,P.y,P.z,6,1.6,{life:11});this.audio.play('pod',P,.8)}
    else if(st===2){this.sprout(P.x,P.y,P.z,8,2.4,{life:7,glow:true,tall:1})}
    else if(st===3){fx.burst(P.x,P.y+1.4,P.z,50,8,'#b6ff6a',1,2);fx.burst(P.x,P.y+1.4,P.z,30,6,'#c58bff',1,2);fx.ring(P,4,'#b6ff9a',.7);this.audio.play('chest',P,.9)}}
   if(st===0){em.fxT=.08;const a=r()*TAU,rr=1.4*r();fx.emit(P.x+Math.cos(a)*rr,P.y+.05,P.z+Math.sin(a)*rr,-Math.cos(a)*.8,.3,-Math.sin(a)*.8,'#8a5a2a',.9,0,.18,.4,0,.7)}
   else if(st===1){em.fxT=.07;fx.emit(P.x+(r()-.5),P.y+.2,P.z+(r()-.5),0,.8+r(),0,'#b6ff6a',1.2,-.1,.2,.4,0,.7)}
   else if(st===2){em.fxT=.04;const a=t*5+r(),rr=.9+r()*.5;fx.emit(P.x+Math.cos(a)*rr,P.y+.5+r()*2,P.z+Math.sin(a)*rr,Math.cos(a+1.6)*1.4,.3,Math.sin(a+1.6)*1.4,r()<.5?'#c9a8ff':'#7ff0ff',.9,0,.18,.4,0,.8)}
  }
 }
};

// the sprite offsets for the new emote kinds (emote.js emoteAnim calls this for them)
export function cosEmoteAnim(d,t,R){
 if(d.kind==='sdance'){R.py=Math.abs(Math.sin(t*6))*.45;R.rz=Math.sin(t*6)*.2;R.px=Math.sin(t*3)*.25;R.sx=1+Math.sin(t*12)*.04}
 else if(d.kind==='rise'){
  if(t<3){const k=Math.min(1,t/.6);R.sy=1-.2*k;R.sx=1+.1*k;R.rz=Math.sin(t*14)*.03}
  else if(t<7){const k=Math.min(1,(t-3)/3);R.py=k*.85;R.sy=.8+.2*k;R.sx=1.1-.1*k;R.rz=Math.sin(t*3)*.06}
  else if(t<11){R.py=.85+Math.sin(t*2)*.12;R.rz=(t-7)*3.2}
  else{const k=Math.min(1,(t-11)/1.2);R.py=.85*(1-k)+Math.abs(Math.sin((t-11)*5))*.3*k;R.rz=Math.sin(t*10)*.14}}
}

// ========================= App side (mixed into App): equipping and the Locker
// The Locker tabs, in order. `groups` are the cosmetic slots a tab shows; `extra` is a picker main.js adds under them.
export const LOCKER_TABS=[
 {id:'Outfit',ic:'\u{1F9CD}'},
 {id:'Accessories',ic:'\u{1F3A9}',groups:['ht','pk']},
 {id:'Glider',ic:'\u{1FA82}',groups:['gl']},
 {id:'Nameplate',ic:'\u{1F3F7}\uFE0F',groups:['fr'],extra:'nameColorPicker'},
 {id:'Effects',ic:'\u2728',groups:['ld','el'],extra:'trailPicker'},
 {id:'Weapons',ic:'\u{1F52B}',groups:['wb','wr']},
 {id:'Emote',ic:'\u{1F483}'}
];
// which tab holds each slot (used by the "equipped" chips and by the shop's Equip button)
export const SLOT_TAB={ht:'Accessories',pk:'Accessories',gl:'Glider',fr:'Nameplate',ld:'Effects',el:'Effects',wb:'Weapons',wr:'Weapons',tr:'Effects'};
const SLOT_NAME={ht:'Hat',pk:'Backpack',gl:'Glider',fr:'Nameplate',ld:'Landing',el:'Elimination',wb:'Blaster finish',wr:'Root Shooter finish'};
export const cosAppMethods={
 // the equipped ids that travel with the player (also the local view of what is worn)
 cosFx(){
  const E=this.profile.eq||{},out={};
  for(const k of Object.keys(E)){const id=E[k];if(id&&FX_SLOT[id]===k&&this.cosOwned(id))out[k]=id}
  return out},
 // owned = a claimed Battle Pass reward, or something bought in the Item Shop
 cosOwned(id){
  const P=this.profile;
  if(SHOP_BY[id])return (P.ownedCos||[]).includes(id);
  const r=REWARD_BY_ID[id];return !!r&&P.bp.claimed.includes(r.lvl)},
 equipCos(slot,id){
  const P=this.profile;P.eq=P.eq||{};
  if(id&&(FX_SLOT[id]!==slot||!this.cosOwned(id)))return;
  if(id)P.eq[slot]=id;else delete P.eq[slot];this.saveProfile();
 },
 // the id of the equipped nameplate, or ''
 nameplateOn(){return this.cosFx().fr||''},
 // the picture on a locker tile
 cosPic(id){
  if(npStyle(id))return `<span class="npv">${npChip(id,this.profile.name||'Player')}</span>`;
  const i=cosInfo(id);return `<span class="emo">${i?i.icon:''}</span>`},
 // one group of tiles (a hat row, a glider row...): "None", then what you own, then what you don't
 cosSection(title,slot,ids){
  const P=this.profile,wrap=document.createElement('div');wrap.className='lk-sec';
  const owned=ids.filter(id=>this.cosOwned(id)),locked=ids.filter(id=>!this.cosOwned(id));
  const shopLeft=locked.some(id=>SHOP_BY[id]);
  const head=h(`<div class="lk-sech"><div class="k lk-sub">${title}</div><span class="lk-count">${owned.length} / ${ids.length}</span>${shopLeft?'<button class="lk-get" type="button">Item Shop &rsaquo;</button>':''}</div>`);
  if(shopLeft)head.querySelector('.lk-get').onclick=()=>{this.sfx('ui');this.shopFocus=slot;this.go('shop')};
  wrap.appendChild(head);
  const box=h(`<div class="tiles"></div>`);
  box.appendChild(this.mkTile({rc:'#9aa6c8',pic:`<span class="swb none">&#8709;</span>`,label:'None',sel:!(P.eq||{})[slot],fn:()=>{this.equipCos(slot,'');this.enter_locker()}}));
  for(const id of[...owned,...locked]){
   const i=cosInfo(id),have=this.cosOwned(id);if(!i)continue;
   const tag=have?'':`<small class="tg">${i.from==='shop'?'&#9670; '+i.price:'LV '+i.lvl}</small>`;
   const t=this.mkTile({rc:RARITY[Math.min(5,i.rar)].c,pic:this.cosPic(id),label:i.name+tag,sel:(P.eq||{})[slot]===id,fn:()=>{
    if(!have){this.toast(i.from==='shop'?'Buy it in the Item Shop (\u25C6 '+i.price+')':'Unlock it in the Battle Pass (level '+i.lvl+')');this.sfx('empty');return}
    this.equipCos(slot,(P.eq||{})[slot]===id?'':id);this.sfx('ui');this.enter_locker()}});
   if(!have)t.classList.add('locked');
   t.title=i.desc||'';box.appendChild(t)}
  wrap.appendChild(box);return{el:wrap,have:owned.length,all:ids.length}},
 // locker tabs that are made of cosmetic groups (every tab except Outfit and Emote)
 lockerTab(tab){
  const def=LOCKER_TABS.find(t=>t.id===tab),wrap=document.createElement('div');
  if(!def||!def.groups)return wrap;
  const secs=def.groups.map(slot=>{const g=COS_GROUPS.find(x=>x[1]===slot);return this.cosSection(g[0],slot,g[2])});
  const have=secs.reduce((a,x)=>a+x.have,0),all=secs.reduce((a,x)=>a+x.all,0);
  wrap.appendChild(h(`<div class="lk-sum"><b>${tab}</b><span>${have} of ${all} unlocked &middot; look only, never abilities or stats</span></div>`));
  for(const x of secs)wrap.appendChild(x.el);
  if(def.extra&&this[def.extra])wrap.appendChild(this[def.extra]());
  return wrap},
 // everything you have equipped, as chips under the preview. A chip jumps to its tab.
 lockerLoadout(box){
  const P=this.profile,E=this.cosFx(),chips=[];
  for(const slot of['fr','ht','pk','gl','ld','el','wb','wr']){const id=E[slot];if(!id)continue;const i=cosInfo(id);if(i)chips.push({tab:SLOT_TAB[slot],slot,ic:i.icon,name:i.name})}
  const tid=P.trail;if(tid){const t=TRAILS[tid]||SHOP_BY[tid];chips.push({tab:'Effects',slot:'tr',ic:t&&t.icon?t.icon:'\u{1F4A8}',name:t?t.name:'Colour trail'})}
  box.innerHTML='';
  box.appendChild(h(`<div class="lk-lh">Equipped</div>`));
  if(!chips.length){box.appendChild(h(`<div class="lk-none">Nothing yet. Pick items from the tabs.</div>`));return}
  const row=h(`<div class="lk-chips"></div>`);
  for(const c of chips){const b=h(`<button class="lk-chip" type="button" title="${SLOT_NAME[c.slot]||'Sprint trail'}"><i>${c.ic||''}</i><span>${c.name}</span></button>`);b.onclick=()=>{this.sfx('ui');this.lkTab=c.tab;this.enter_locker()};row.appendChild(b)}
  box.appendChild(row);
  const clr=h(`<button class="lk-clear" type="button">Unequip all</button>`);
  clr.onclick=()=>{P.eq={};P.trail='';this.saveProfile();this.sfx('ui');this.enter_locker()};
  box.appendChild(clr)}
};
