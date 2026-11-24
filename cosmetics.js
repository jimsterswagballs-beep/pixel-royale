// Season 2 (v38): the Battle Pass cosmetics that were "coming soon": nameplate, hat, landing effects, emotes, weapon finishes,
// gliders, backpacks and elimination effects. Everything here is looks only. Nothing changes stats, hit boxes or abilities.
//
// How it travels: the equipped ids go out as `cos.fx` (short keys, see FX_KEYS) with the rest of the player's cosmetics, so every
// machine draws what each player picked. Unknown ids are ignored, so a modified client cannot make anyone load anything odd.
import * as THREE from 'three';
import {makeGlider} from './glider.js';
import {WEAPONS} from './data.js';
import {REWARDS,TYPE_LABEL} from './season2.js';
import * as W from './world.js';

const TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const h=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};

// reward id -> {key in cos.fx, what it is}
export const FX_SLOT={frame_spore:'fr',hat_puffcap:'ht',land_ring:'ld',land_burst:'ld',gl_cloud:'gl',gl_mushroom:'gl',gl_roots:'gl',pk_root:'pk',pk_glow:'pk',el_burst:'el',el_bloom:'el',wp_blaster:'wb',wp_root:'wr'};
// the locker shows these groups, in this order
export const COS_GROUPS=[
 ['Nameplate','fr',['frame_spore']],['Hat','ht',['hat_puffcap']],['Backpack','pk',['pk_root','pk_glow']],['Glider','gl',['gl_cloud','gl_mushroom','gl_roots']],
 ['Landing effect','ld',['land_ring','land_burst']],['Elimination effect','el',['el_burst','el_bloom']],['Weapon finish','wb',['wp_blaster']],['Weapon finish','wr',['wp_root']]
];
export const REWARD_BY_ID=Object.fromEntries(REWARDS.map(r=>[r.id,r]));

// ---------- Item Shop cosmetics (v39): bought with Swag Tokens, no level needed. id -> {slot,name,desc,price}
export const SHOP_ITEMS={
 np_gold:{slot:'fr',name:'Gold Banner',price:300,desc:'A shiny gold banner behind your name.'},
 np_neon:{slot:'fr',name:'Neon Sign',price:400,desc:'A glowing cyan and pink neon outline.'},
 np_pixel:{slot:'fr',name:'Pixel Frame',price:350,desc:'A chunky retro pixel border.'},
 np_flame:{slot:'fr',name:'Fire Plate',price:500,desc:'A hot plate with flames licking the top.'},
 np_ice:{slot:'fr',name:'Frost Plate',price:500,desc:'An icy plate with icicles and snowflakes.'},
 hat_party:{slot:'ht',name:'Party Hat',price:300,desc:'A stripy party hat with a pompom.'},
 hat_cowboy:{slot:'ht',name:'Cowboy Hat',price:450,desc:'A wide-brimmed leather hat.'},
 hat_tophat:{slot:'ht',name:'Top Hat',price:500,desc:'A tall black top hat with a red band.'},
 hat_halo:{slot:'ht',name:'Halo',price:700,desc:'A glowing ring floating above your head.'},
 hat_crown:{slot:'ht',name:'Royal Crown',price:900,desc:'A golden crown set with gems.'},
 pk_balloon:{slot:'pk',name:'Balloon',price:400,desc:'A red balloon on a string.'},
 pk_cape:{slot:'pk',name:'Hero Cape',price:500,desc:'A flowing red cape with a gold clasp.'},
 pk_wings:{slot:'pk',name:'Angel Wings',price:800,desc:'A pair of soft white wings.'},
 pk_jet:{slot:'pk',name:'Jetpack',price:900,desc:'Twin tanks with a flickering flame. Looks only, it does not fly.'},
 gl_stripes:{slot:'gl',name:'Candy Stripes Glider',price:400,desc:'A rainbow of candy stripes.'},
 gl_stars:{slot:'gl',name:'Night Sky Glider',price:600,desc:'A dark blue canopy dotted with stars.'},
 gl_flame:{slot:'gl',name:'Flame Glider',price:800,desc:'Fiery colours with flames along the edge. Sheds embers.'},
 gl_gold:{slot:'gl',name:'Royal Gold Glider',price:1000,desc:'A golden canopy with jewels.'},
 gl_legacy:{slot:'gl',name:'Legacy Glider',price:300,desc:'A classic red and cream canopy, from the first days of Pixel Royale.'},
 land_confetti:{slot:'ld',name:'Confetti Landing',price:350,desc:'Confetti pops out when you land.'},
 land_stars:{slot:'ld',name:'Star Burst',price:400,desc:'A burst of golden stars when you land.'},
 land_shock:{slot:'ld',name:'Shockwave',price:500,desc:'Rings of force ripple out from your landing.'},
 el_confetti:{slot:'el',name:'Confetti Pop',price:400,desc:'Opponents you eliminate pop into confetti.'},
 el_coins:{slot:'el',name:'Coin Shower',price:500,desc:'Opponents you eliminate burst into gold coins.'},
 el_ghost:{slot:'el',name:'Ghost Rise',price:600,desc:'A ghost floats up from each opponent you eliminate.'},
 el_bolt:{slot:'el',name:'Lightning Strike',price:700,desc:'A bolt of lightning strikes where they fell.'},
 wa_frost:{slot:'wa',name:'Frost Finish',price:600,desc:'An icy blue coat for every weapon you hold.'},
 wa_neon:{slot:'wa',name:'Neon Finish',price:600,desc:'A dark coat with glowing neon edges, on every weapon.'},
 wa_gold:{slot:'wa',name:'Gold Finish',price:800,desc:'A shiny gold coat for every weapon you hold.'}
};
for(const id in SHOP_ITEMS)FX_SLOT[id]=SHOP_ITEMS[id].slot;
// name, description and how to get it, for any cosmetic id (Battle Pass ones come from the reward list)
export function cosInfo(id){
 const s=SHOP_ITEMS[id];if(s)return{id,slot:s.slot,name:s.name,desc:s.desc,price:s.price,src:'shop'};
 const r=REWARD_BY_ID[id];if(r)return{id,slot:FX_SLOT[id],name:r.name,desc:r.desc,lvl:r.lvl,icon:r.icon,src:'bp'};
 return null}
// the bots wear some of it too, so a solo match shows it off
export const BOT_FX=[['ht','hat_puffcap'],['pk','pk_root'],['pk','pk_glow'],['gl','gl_cloud'],['gl','gl_mushroom'],['gl','gl_roots'],['ld','land_ring'],['ld','land_burst'],['el','el_burst'],['el','el_bloom'],['fr','frame_spore'],['fr','np_gold'],['fr','np_neon'],['fr','np_ice'],['ht','hat_crown'],['ht','hat_party'],['ht','hat_tophat'],['pk','pk_wings'],['pk','pk_jet'],['pk','pk_cape'],['gl','gl_stripes'],['gl','gl_flame'],['gl','gl_stars'],['gl','gl_gold'],['gl','gl_legacy'],['ld','land_stars'],['ld','land_confetti'],['el','el_confetti'],['el','el_coins']];
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


// ---------- v39 hats, backpacks and glider canopies from the Item Shop
const GOLD=()=>M('#ffcf3a',{emissive:'#5a3c00'});
export function makeHat(id){
 if(id==='hat_party'){const g=new THREE.Group();
  const c=put(g,new THREE.ConeGeometry(.3,.7,10),M('#ff4a8a'),0,.36,0);c.rotation.z=.1;
  for(let i=0;i<3;i++)put(g,new THREE.TorusGeometry(.26-i*.07,.025,4,10),M(i%2?'#ffd23d':'#4ad0ff'),.04*i,.14+i*.18,0,Math.PI/2,0,0).rotation.z=.1;
  put(g,sph(.09,6,4),M('#ffd23d',{emissive:'#6a5000'}),.07,.74,0);return g}
 if(id==='hat_cowboy'){const g=new THREE.Group();
  put(g,cyl(.64,.64,.05,14),M('#8a5a2a'),0,0,0);put(g,cyl(.3,.36,.3,10),M('#8a5a2a'),0,.17,0);put(g,cyl(.37,.37,.06,10),M('#3a2414'),0,.08,0);
  put(g,dome(.3,.1),M('#7a4a22',{side:THREE.DoubleSide}),0,.32,0);
  for(const s of[-1,1])put(g,new THREE.BoxGeometry(.16,.04,.3),M('#8a5a2a'),s*.6,.07,0,0,0,s*.35);return g}
 if(id==='hat_tophat'){const g=new THREE.Group();
  put(g,cyl(.5,.5,.05,14),M('#18181e'),0,0,0);put(g,cyl(.3,.32,.55,12),M('#18181e'),0,.3,0);put(g,cyl(.325,.325,.1,12),M('#d8322a'),0,.1,0);
  put(g,cyl(.28,.28,.01,12),M('#2a2a34'),0,.58,0);return g}
 if(id==='hat_halo'){const g=new THREE.Group();
  put(g,new THREE.TorusGeometry(.36,.055,6,18),GL('#fff2a0'),0,.62,0,Math.PI/2,0,0);
  put(g,new THREE.TorusGeometry(.36,.14,6,18),GL('#ffe27a',{transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}),0,.62,0,Math.PI/2,0,0);return g}
 if(id==='hat_crown'){const g=new THREE.Group(),gold=GOLD();
  put(g,new THREE.CylinderGeometry(.4,.34,.2,10,1,true),new THREE.MeshLambertMaterial({color:'#ffcf3a',emissive:'#5a3c00',flatShading:true,side:THREE.DoubleSide}),0,.1,0);
  put(g,new THREE.TorusGeometry(.37,.03,4,10),gold,0,.01,0,Math.PI/2,0,0);
  for(let i=0;i<5;i++){const a=i/5*TAU,x=Math.cos(a)*.37,z=Math.sin(a)*.37;put(g,new THREE.ConeGeometry(.09,.26,4),gold,x,.31,z);put(g,sph(.045,5,3),GL(['#ff4a6a','#4ad0ff','#6aff8a','#ff4a6a','#4ad0ff'][i]),x,.46,z)}
  return g}
 return makePuffcap()}
export function makePack(id){
 const g=new THREE.Group();
 if(id==='pk_balloon'){
  put(g,cyl(.008,.008,.8,3),M('#eeeeee'),0,.4,0);put(g,sph(.27,10,7),M('#e8322a',{emissive:'#400806'}),0,.98,0).scale.set(1,1.2,1);
  put(g,new THREE.ConeGeometry(.05,.07,5),M('#c0221a'),0,.68,0,Math.PI,0,0);put(g,sph(.05,4,3),GL('#ffffff'),-.1,1.08,.2);return g}
 if(id==='pk_cape'){
  const c=put(g,new THREE.BoxGeometry(.55,.82,.035),M('#d8322a',{emissive:'#300806'}),0,-.12,0);c.rotation.x=.14;
  put(g,new THREE.BoxGeometry(.58,.07,.045),M('#ffcf3a',{emissive:'#5a3c00'}),0,.3,.01);put(g,sph(.06,5,4),GL('#ffe27a'),0,.3,.05);return g}
 if(id==='pk_wings'){
  for(const s of[-1,1]){const w=new THREE.Group();
   for(let i=0;i<4;i++){const f=put(w,new THREE.BoxGeometry(.7-i*.1,.11,.025),M(i%2?'#f4f8ff':'#ffffff',{emissive:'#2a3040'}),(.35-i*.05)*s,.12-i*.12,0);f.rotation.z=s*(.45-i*.12)}
   w.position.set(s*.2,.1,0);w.rotation.y=s*.25;g.add(w)}
  return g}
 if(id==='pk_jet'){
  for(const s of[-1,1]){put(g,cyl(.1,.1,.55,8),M('#9aa4b8'),s*.14,0,0);put(g,cyl(.1,.1,.06,8),M('#d8322a'),s*.14,.2,0);put(g,cyl(.07,.1,.08,8),M('#4a4a54'),s*.14,-.3,0);
   put(g,new THREE.ConeGeometry(.07,.3,6),GL('#ffb02e'),s*.14,-.5,0,Math.PI,0,0);put(g,new THREE.ConeGeometry(.04,.2,6),GL('#fff2b0'),s*.14,-.45,0,Math.PI,0,0)}
  put(g,new THREE.BoxGeometry(.4,.1,.12),M('#4a4a54'),0,.1,-.03);return g}
 return makeRootPack()}
// Item Shop and Battle Pass gliders are built by glider.js (one dome shape for every style)
export function fungalGlider(id){return makeGlider(null,id)}

// ---------- weapon finishes: the Fungal Blaster and the Root Shooter get a new coat. `cos` is the owner's cosmetics.
export function finishWeapon(model,w,cos){
 const wd=WEAPONS[w],f=fxOf(cos);if(!wd||!model)return model;
 if(known('wa',f.wa)){ // v39: one coat for every weapon
  const P={wa_gold:['#ffcf3a',.85,'#5a3c00'],wa_frost:['#8fd8ff',.78,'#0c3a5a'],wa_neon:['#15152a',.8,'#00cfff']}[f.wa],tint=new THREE.Color(P[0]);
  model.traverse(o=>{if(o.isMesh&&o.material&&o.material.color){o.material=o.material.clone();o.material.color.lerp(tint,P[1]);if(o.material.emissive){o.material.emissive.set(P[2]);o.material.emissiveIntensity=f.wa==='wa_neon'?.9:.45}}});
  const bb=new THREE.Box3().setFromObject(model),tip=bb.min.z,len=Math.max(.3,bb.max.z-bb.min.z),c=bb.getCenter(new THREE.Vector3());
  const add=new THREE.Group();
  if(f.wa==='wa_neon'){for(const[y,col]of[[bb.max.y+.004,'#ff3ad0'],[bb.min.y-.004,'#00e5ff']])put(add,new THREE.BoxGeometry(.012,.012,len*.9),GL(col),c.x,y,c.z)}
  else if(f.wa==='wa_frost'){for(let i=0;i<4;i++)put(add,new THREE.ConeGeometry(.018,.07+.03*(i%2),4),GL('#e8f8ff'),c.x,bb.min.y-.02,tip+len*(.2+i*.2),Math.PI,0,0)}
  else{for(let i=0;i<3;i++)put(add,sph(.02,4,3),GL(['#ff4a6a','#4ad0ff','#6aff8a'][i]),c.x,bb.max.y+.01,tip+len*(.25+i*.25))}
  model.add(add);return model}
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

// ---------- nameplate: the mossy plate behind a player's name
export const NAMEPLATE_CLS='np-spore';
// css class for a nameplate id (the lobby and locker names use it)
export const npClass=id=>id?'np-'+id.replace(/^(frame|np)_/,''):'';
const rr=(x,a,b,w,hh,r)=>{x.beginPath();if(x.roundRect)x.roundRect(a,b,w,hh,r);else x.rect(a,b,w,hh)};
export function drawNameplate(x,id){ // x: the 256x64 name-tag canvas context, name text at y=24
 x.save();
 if(id==='np_gold'){
  const g=x.createLinearGradient(0,4,0,36);g.addColorStop(0,'#ffe27a');g.addColorStop(.5,'#e0a21e');g.addColorStop(1,'#a8700a');x.fillStyle=g;x.strokeStyle='#fff3b0';x.lineWidth=2;rr(x,22,4,212,32,6);x.fill();x.stroke();
  x.fillStyle='#fff3b0';for(const px of[30,226]){x.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,r=k%2?3:7;x.lineTo(px+Math.cos(a)*r,20+Math.sin(a)*r)}x.closePath();x.fill()}
 }else if(id==='np_neon'){
  x.fillStyle='rgba(8,6,30,.8)';rr(x,22,4,212,32,8);x.fill();x.shadowColor='#00e5ff';x.shadowBlur=10;x.strokeStyle='#00e5ff';x.lineWidth=3;rr(x,22,4,212,32,8);x.stroke();
  x.shadowColor='#ff3ad0';x.strokeStyle='#ff3ad0';x.lineWidth=1.5;rr(x,27,9,202,22,5);x.stroke();
 }else if(id==='np_pixel'){
  x.fillStyle='#10102a';x.fillRect(22,4,212,32);for(let px=22;px<234;px+=8){x.fillStyle=(px/8)%2?'#ffffff':'#ffd23d';x.fillRect(px,4,8,4);x.fillRect(px,32,8,4)}
  for(let py=4;py<36;py+=8){x.fillStyle=(py/8)%2?'#ffffff':'#ffd23d';x.fillRect(22,py,4,8);x.fillRect(230,py,4,8)}
 }else if(id==='np_flame'){
  const g=x.createLinearGradient(0,4,0,36);g.addColorStop(0,'#ff9a1a');g.addColorStop(1,'#a01800');x.fillStyle=g;x.strokeStyle='#ffd23d';x.lineWidth=2;rr(x,22,8,212,28,6);x.fill();x.stroke();
  for(let i=0;i<11;i++){const px=30+i*19.5,hh=8+(i%3)*4;x.fillStyle=i%2?'#ffd23d':'#ff7a1a';x.beginPath();x.moveTo(px-8,9);x.quadraticCurveTo(px-2,9-hh,px,3-hh*.3);x.quadraticCurveTo(px+3,9-hh*.5,px+8,9);x.fill()}
 }else if(id==='np_ice'){
  const g=x.createLinearGradient(0,4,0,36);g.addColorStop(0,'#e8f8ff');g.addColorStop(1,'#6ab8e8');x.fillStyle=g;x.strokeStyle='#ffffff';x.lineWidth=2;rr(x,22,4,212,28,6);x.fill();x.stroke();
  x.fillStyle='#cfeeff';for(let i=0;i<10;i++){const px=34+i*20.5,hh=6+(i%3)*4;x.beginPath();x.moveTo(px-5,31);x.lineTo(px,31+hh);x.lineTo(px+5,31);x.fill()}
  x.fillStyle='#ffffff';for(const[px,py]of[[34,12],[222,14],[60,28],[196,26]]){x.fillRect(px-1,py-4,2,8);x.fillRect(px-4,py-1,8,2)}
 }else{
  const g=x.createLinearGradient(0,4,0,34);g.addColorStop(0,'rgba(120,170,60,.85)');g.addColorStop(1,'rgba(50,90,40,.85)');
  x.fillStyle=g;x.strokeStyle='rgba(190,255,140,.9)';x.lineWidth=2;rr(x,22,4,212,32,10);x.fill();x.stroke();
  for(const[px,r,col]of[[30,6,'#c58bff'],[226,6,'#7ff0ff'],[42,4,'#ffd84a'],[214,4,'#c58bff']]){x.fillStyle=col;x.beginPath();x.arc(px,6,r,Math.PI,0);x.fill()}}
 x.restore()}

// ========================= Game side (mixed into Game)
export const cosGameMethods={
 // build a player's hat and backpack on their sprite (makeSprite calls this)
 attachCosSprite(e){
  const s=e.spr,f=fxOf(e.cos);if(!s)return;
  s.cosG=null;
  if(known('ht',f.ht)){const hat=makeHat(f.ht);hat.position.y=1.74;hat.scale.setScalar(.95);s.pivot.add(hat);s.cosHat=hat}
  if(known('pk',f.pk)){const p=f.pk==='pk_glow'?makeGlowPack():makePack(f.pk);p.visible=false;s.pivot.add(p);s.cosPack=p;s.cosPackGlow=f.pk==='pk_glow';s.cosPackId=f.pk}
  s.cosG=!!(s.cosHat||s.cosPack)||known('gl',f.gl)
 },
 // every frame for a visible sprite: the pack hangs on the back, so it shows from behind and the side and hides from the front
 updateCosSprite(e,s,view,dt){
  const p=s.cosPack;
  if(p){
   if(view==='front')p.visible=false;
   else{p.visible=true;if(view==='back')p.position.set(0,.98,.2);else p.position.set(-.34,.98,.02)}
   if(s.cosPackId==='pk_jet'&&p.visible&&e.alive){s.cosT=(s.cosT||0)-dt;if(s.cosT<=0){s.cosT=.07;const P=e.rpos;this.fx.emit(P.x+(Math.random()-.5)*.3,P.y+.85,P.z+(Math.random()-.5)*.3,(Math.random()-.5)*.3,-.6,(Math.random()-.5)*.3,Math.random()<.5?'#ffb02e':'#ff6a1a',.4,0,.16,0,0,.8)}}
   if(s.cosPackGlow&&p.visible&&e.alive){s.cosT=(s.cosT||0)-dt;if(s.cosT<=0){s.cosT=.35;const P=e.rpos;this.fx.emit(P.x+(Math.random()-.5)*.5,P.y+1.5+Math.random()*.4,P.z+(Math.random()-.5)*.5,(Math.random()-.5)*.3,.4+Math.random()*.4,(Math.random()-.5)*.3,Math.random()<.5?'#b6ff6a':'#c9a8ff',1.2,-.05,.12,.4,0,.5)}}
  }
  if(e.drop==='glide'&&e.alive){ // cloud and root gliders shed a few spores while you glide
   const gl=fxOf(e.cos).gl;if(gl){s.cosT2=(s.cosT2||0)-dt;if(s.cosT2<=0){s.cosT2=.08;const P=e.rpos,r=Math.random;
    if(gl==='gl_cloud')this.fx.puff(P.x+(r()-.5)*3,P.y+2.9+r()*.6,P.z+(r()-.5)*3,0,-.3,0,r()<.5?'#e6ffd0':'#bff0ff',1.3,.7,.8,.35,0,.6);
    else if(gl==='gl_mushroom')this.fx.emit(P.x+(r()-.5)*4,P.y+2.6,P.z+(r()-.5)*4,0,-.6,0,'#e0a0ff',1.4,-.05,.16,.4,0,.5);
    else if(gl==='gl_roots')this.fx.emit(P.x+(r()-.5)*4,P.y+3.2+r()*.6,P.z+(r()-.5)*4,0,-1.2,0,'#8aff6a',1.2,.2,.12,.4,0,.6);
    else if(gl==='gl_flame')this.fx.emit(P.x+(r()-.5)*4,P.y+3.1+r()*.5,P.z+(r()-.5)*4,0,-.8,0,r()<.5?'#ffb02e':'#ff5a14',.9,0,.14,0,0,.8);
    else if(gl==='gl_stars')this.fx.emit(P.x+(r()-.5)*4,P.y+3+r()*.8,P.z+(r()-.5)*4,0,-.9,0,r()<.5?'#ffe27a':'#ffffff',1,0,.12,0,0,.9);
    else if(gl==='gl_gold')this.fx.emit(P.x+(r()-.5)*4,P.y+3+r()*.8,P.z+(r()-.5)*4,0,-.5,0,'#ffe27a',1.1,0,.1,0,0,.9)}}}
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
  }else if(id==='land_stars'){
   fx.burst(P.x,P.y+.3,P.z,34,6,'#ffd23d',.9,5,.7);fx.burst(P.x,P.y+.3,P.z,18,5,'#ffffff',.8,5,.7);fx.ring(P,2.4*big,'#ffe27a',.5)
  }else if(id==='land_shock'){
   fx.ring(P,2.6*big,'#ffffff',.35);fx.ring(P,4.4*big,'#8fd8ff',.55);fx.ring(P,6.4*big,'#4a9aff',.75);
   for(let i=0;i<14;i++)fx.puff(P.x,P.y+.2,P.z,Math.cos(i*.45)*4,.3,Math.sin(i*.45)*4,'#dfe8f4',.7,.5,1.6,.5,0,1.8)
  }else if(id==='land_confetti'){
   const cs=['#ff4a6a','#ffd23d','#4adf7a','#4a9aff','#c05aff'];for(let i=0;i<5;i++)fx.burst(P.x,P.y+.4,P.z,9,6,cs[i],1.1,7,.9)
  }else if(id==='land_burst'){
   this.sprout(P.x,P.y,P.z,7,1.7*big,{life:3.2});
   for(let i=0;i<10;i++)fx.puff(P.x,P.y+.2,P.z,(Math.random()-.5)*3,.4+Math.random()*.9,(Math.random()-.5)*3,Math.random()<.5?'#c9a8ff':'#a8ff7a',.9,.7,1.4,.5,-.05,1.4)}
  this.audio.play('spore',P,.7);
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
   const cs=['#ff4a6a','#ffd23d','#4adf7a','#4a9aff','#c05aff'];for(let i=0;i<5;i++)fx.burst(P.x,P.y+1,P.z,12,7,cs[i],1.3,6);fx.ring(P,2.8,'#ffffff',.45);this.audio.play('chest',P,.6);
  }else if(id==='el_coins'){
   for(let i=0;i<4;i++)fx.burst(P.x,P.y+1+i*.15,P.z,12,6+i,'#ffd23d',1.2,9,.8);fx.burst(P.x,P.y+1.2,P.z,16,4,'#fff6c8',.8,6);fx.ring(P,2.6,'#ffe27a',.5);this.audio.play('pick',P,.8);
  }else if(id==='el_ghost'){
   for(let i=0;i<7;i++)fx.puff(P.x+(Math.random()-.5)*.4,P.y+.9+i*.28,P.z+(Math.random()-.5)*.4,(Math.random()-.5)*.3,1+Math.random()*.4,(Math.random()-.5)*.3,i<2?'#ffffff':'#dfe8ff',2.2,.9-i*.04,1.1,.5,-.05,.6);
   fx.puff(P.x,P.y+2.4,P.z,0,.9,0,'#ffffff',2.2,.7,1.2,.55,-.05,.6);fx.burst(P.x,P.y+1,P.z,14,3,'#cfd8ff',1.2,-1);this.audio.play('spore',P,.6);
  }else if(id==='el_bolt'){
   for(let h=0;h<=16;h+=.7)fx.emit(P.x+Math.sin(h*2.3)*.35,P.y+h,P.z+Math.cos(h*1.7)*.35,0,0,0,h%1.4<.7?'#ffffff':'#bfe6ff',.28,0,.7-h*.025,0,0,1);
   fx.burst(P.x,P.y+.4,P.z,34,8,'#fff6a0',.6,3);fx.ring(P,3.6,'#bfe6ff',.4);this.audio.play('shock',P,1);
  }
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
if(d.kind==='spin'){R.rz=t*9;R.py=Math.abs(Math.sin(t*3))*.18}
 else if(d.kind==='joy'){const p=t%1.1;R.py=p<.6?Math.sin(p/.6*Math.PI)*1.1:0;R.sy=p<.6?1.08:1-.18*Math.sin((p-.6)/.5*Math.PI);R.sx=2-R.sy;R.rz=Math.sin(t*4)*.1}
 else if(d.kind==='shake'){R.px=Math.sin(t*26)*.12;R.rz=Math.sin(t*22)*.16;R.sx=1+Math.sin(t*13)*.05}
 else if(d.kind==='sdance'){R.py=Math.abs(Math.sin(t*6))*.45;R.rz=Math.sin(t*6)*.2;R.px=Math.sin(t*3)*.25;R.sx=1+Math.sin(t*12)*.04}
 else if(d.kind==='rise'){
  if(t<3){const k=Math.min(1,t/.6);R.sy=1-.2*k;R.sx=1+.1*k;R.rz=Math.sin(t*14)*.03}
  else if(t<7){const k=Math.min(1,(t-3)/3);R.py=k*.85;R.sy=.8+.2*k;R.sx=1.1-.1*k;R.rz=Math.sin(t*3)*.06}
  else if(t<11){R.py=.85+Math.sin(t*2)*.12;R.rz=(t-7)*3.2}
  else{const k=Math.min(1,(t-11)/1.2);R.py=.85*(1-k)+Math.abs(Math.sin((t-11)*5))*.3*k;R.rz=Math.sin(t*10)*.14}}
}

// ========================= App side (mixed into App; the locker screens are in locker.js)
export const cosAppMethods={
 // the equipped ids that travel with the player (also the local view of what is worn)
 cosFx(){
  const E=this.profile.eq||{},out={};
  for(const k of Object.keys(E)){const id=E[k];if(id&&FX_SLOT[id]===k&&this.cosOwned(id))out[k]=id}
  return out},
 nameplateOn(){return !!this.cosFx().fr}
};
