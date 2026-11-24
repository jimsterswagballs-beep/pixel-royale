// Season 2 (v38): the Battle Pass cosmetics that were "coming soon": nameplate, hat, landing effects, emotes, weapon finishes,
// gliders, backpacks and elimination effects. Everything here is looks only. Nothing changes stats, hit boxes or abilities.
//
// How it travels: the equipped ids go out as `cos.fx` (short keys, see FX_KEYS) with the rest of the player's cosmetics, so every
// machine draws what each player picked. Unknown ids are ignored, so a modified client cannot make anyone load anything odd.
import * as THREE from 'three';
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
// the bots wear some of it too, so a solo match shows it off
export const BOT_FX=[['ht','hat_puffcap'],['pk','pk_root'],['pk','pk_glow'],['gl','gl_cloud'],['gl','gl_mushroom'],['gl','gl_roots'],['ld','land_ring'],['ld','land_burst'],['el','el_burst'],['el','el_bloom'],['fr','frame_spore']];
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

// ---------- gliders: same size and strings as the standard one (see makeGliderModel in game.js), different canopy
function strings(g,col='#222'){
 const pts=[[-2.3,0],[2.3,0],[-1.63,1.63],[1.63,1.63]],v=[];
 for(const[x,y]of pts)v.push(x,y,0,x>0?.2:-.2,-1.4,0);
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
 g.add(new THREE.LineSegments(sg,new THREE.LineBasicMaterial({color:col})))}
export function fungalGlider(id){
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

// ---------- nameplate: the mossy plate behind a player's name
export const NAMEPLATE_CLS='np-spore';
export function drawNameplate(c){ // c: the 256x64 name-tag canvas context, name text at y=24
 const x=c;x.save();
 const g=x.createLinearGradient(0,4,0,34);g.addColorStop(0,'rgba(120,170,60,.85)');g.addColorStop(1,'rgba(50,90,40,.85)');
 x.fillStyle=g;x.strokeStyle='rgba(190,255,140,.9)';x.lineWidth=2;
 x.beginPath();if(x.roundRect)x.roundRect(22,4,212,32,10);else x.rect(22,4,212,32);x.fill();x.stroke();
 for(const[px,r,col]of[[30,6,'#c58bff'],[226,6,'#7ff0ff'],[42,4,'#ffd84a'],[214,4,'#c58bff']]){x.fillStyle=col;x.beginPath();x.arc(px,6,r,Math.PI,0);x.fill()}
 x.restore()}

// ========================= Game side (mixed into Game)
export const cosGameMethods={
 // build a player's hat and backpack on their sprite (makeSprite calls this)
 attachCosSprite(e){
  const s=e.spr,f=fxOf(e.cos);if(!s)return;
  s.cosG=null;
  if(known('ht',f.ht)){const hat=makePuffcap();hat.position.y=1.74;hat.scale.setScalar(.95);s.pivot.add(hat);s.cosHat=hat}
  if(known('pk',f.pk)){const p=f.pk==='pk_glow'?makeGlowPack():makeRootPack();p.visible=false;s.pivot.add(p);s.cosPack=p;s.cosPackGlow=f.pk==='pk_glow'}
  s.cosG=!!(s.cosHat||s.cosPack)||known('gl',f.gl)
 },
 // every frame for a visible sprite: the pack hangs on the back, so it shows from behind and the side and hides from the front
 updateCosSprite(e,s,view,dt){
  const p=s.cosPack;
  if(p){
   if(view==='front')p.visible=false;
   else{p.visible=true;if(view==='back')p.position.set(0,.98,.2);else p.position.set(-.34,.98,.02)}
   if(s.cosPackGlow&&p.visible&&e.alive){s.cosT=(s.cosT||0)-dt;if(s.cosT<=0){s.cosT=.35;const P=e.rpos;this.fx.emit(P.x+(Math.random()-.5)*.5,P.y+1.5+Math.random()*.4,P.z+(Math.random()-.5)*.5,(Math.random()-.5)*.3,.4+Math.random()*.4,(Math.random()-.5)*.3,Math.random()<.5?'#b6ff6a':'#c9a8ff',1.2,-.05,.12,.4,0,.5)}}
  }
  if(e.drop==='glide'&&e.alive){ // cloud and root gliders shed a few spores while you glide
   const gl=fxOf(e.cos).gl;if(gl){s.cosT2=(s.cosT2||0)-dt;if(s.cosT2<=0){s.cosT2=.08;const P=e.rpos,r=Math.random;
    if(gl==='gl_cloud')this.fx.puff(P.x+(r()-.5)*3,P.y+2.9+r()*.6,P.z+(r()-.5)*3,0,-.3,0,r()<.5?'#e6ffd0':'#bff0ff',1.3,.7,.8,.35,0,.6);
    else if(gl==='gl_mushroom')this.fx.emit(P.x+(r()-.5)*4,P.y+2.6,P.z+(r()-.5)*4,0,-.6,0,'#e0a0ff',1.4,-.05,.16,.4,0,.5);
    else if(gl==='gl_roots')this.fx.emit(P.x+(r()-.5)*4,P.y+3.2+r()*.6,P.z+(r()-.5)*4,0,-1.2,0,'#8aff6a',1.2,.2,.12,.4,0,.6)}}}
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
 if(d.kind==='sdance'){R.py=Math.abs(Math.sin(t*6))*.45;R.rz=Math.sin(t*6)*.2;R.px=Math.sin(t*3)*.25;R.sx=1+Math.sin(t*12)*.04}
 else if(d.kind==='rise'){
  if(t<3){const k=Math.min(1,t/.6);R.sy=1-.2*k;R.sx=1+.1*k;R.rz=Math.sin(t*14)*.03}
  else if(t<7){const k=Math.min(1,(t-3)/3);R.py=k*.85;R.sy=.8+.2*k;R.sx=1.1-.1*k;R.rz=Math.sin(t*3)*.06}
  else if(t<11){R.py=.85+Math.sin(t*2)*.12;R.rz=(t-7)*3.2}
  else{const k=Math.min(1,(t-11)/1.2);R.py=.85*(1-k)+Math.abs(Math.sin((t-11)*5))*.3*k;R.rz=Math.sin(t*10)*.14}}
}

// ========================= App side (mixed into App): equipping and the locker tab
export const cosAppMethods={
 // the equipped ids that travel with the player (also the local view of what is worn)
 cosFx(){
  const E=this.profile.eq||{},out={};
  for(const k of Object.keys(E)){const id=E[k];if(id&&FX_SLOT[id]===k&&this.cosOwned(id))out[k]=id}
  return out},
 cosOwned(id){const r=REWARD_BY_ID[id];return !!r&&this.profile.bp.claimed.includes(r.lvl)},
 equipCos(slot,id){
  const P=this.profile;P.eq=P.eq||{};
  if(id&&(FX_SLOT[id]!==slot||!this.cosOwned(id)))return;
  if(id)P.eq[slot]=id;else delete P.eq[slot];this.saveProfile();
 },
 nameplateOn(){return !!this.cosFx().fr},
 // locker > Cosmetics: one row of tiles per kind
 cosmeticsPicker(){
  const P=this.profile,wrap=document.createElement('div');
  wrap.appendChild(h(`<div class="k lk-sub">Battle Pass cosmetics · look only, never abilities or stats</div>`));
  for(const[title,slot,ids]of COS_GROUPS){
   wrap.appendChild(h(`<div class="k lk-sub" style="margin-top:14px">${title}</div>`));
   const box=h(`<div class="tiles"></div>`);
   box.appendChild(this.mkTile({rc:'#9aa6c8',pic:`<span class="swb none">&#8709;</span>`,label:'None',sel:!(P.eq||{})[slot],fn:()=>{this.equipCos(slot,'');this.enter_locker()}}));
   for(const id of ids){
    const r=REWARD_BY_ID[id],owned=this.cosOwned(id);
    const t=this.mkTile({rc:'#8cff6a',pic:`<span class="emo">${r.icon}</span>`,label:r.name+(owned?'':' &#128274;'),sel:(P.eq||{})[slot]===id,fn:()=>{
     if(!owned){this.toast('Unlock it in the Battle Pass (level '+r.lvl+')');this.sfx('empty');return}
     this.equipCos(slot,(P.eq||{})[slot]===id?'':id);this.sfx('ui');this.enter_locker()}});
    if(!owned)t.classList.add('locked');
    box.appendChild(t)}
   wrap.appendChild(box)}
  wrap.appendChild(h(`<div class="tip" style="margin-top:14px">Emotes from the Battle Pass are in the Emote tab. Skins are under Outfit and trails under Sprint Trail.</div>`));
  return wrap;
 }
};
