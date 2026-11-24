// Previews (v39): pictures of what a cosmetic or emote really looks like, for the Locker, the Item Shop and the Battle Pass.
//  - 3D things (hats, backpacks, gliders, weapon finishes) are drawn once with the game's own models into a small picture.
//  - Nameplates are drawn with the same code the game uses for names.
//  - Effects (landing, elimination), sprint trails and emotes are small looping animations.
// Put `<span class="pv" data-pv="cos:hat_crown"></span>` (see pvSpan) in a tile, then call mountPreviews(root) after it is on the page.
// The animations stop by themselves when a screen is hidden, and nothing here touches the game scene.
import * as THREE from 'three';
import {WEAPONS} from './data.js';
import {makeWeaponModel} from './shared.js';
import {TRAILS} from './season2.js';
import {EMOTE_BY,emoteRig} from './emote.js';
import {FX_SLOT,makeHat,makePack,fungalGlider,finishWeapon,drawNameplate,cosInfo} from './cosmetics.js';

const ctx={img:'',name:'Player',color:'#ffffff'};
// the preview character: the player's own current look
export function setPreviewChar(img,name,color){ctx.img=img||ctx.img;ctx.name=name||ctx.name;ctx.color=color||ctx.color}
export const pvSpan=(key,cls='')=>`<span class="pv ${cls}" data-pv="${key}"></span>`;

const TAU=Math.PI*2;
const imgCache=new Map();
function charImg(){const src=ctx.img;if(!src)return null;let i=imgCache.get(src);if(!i){i=new Image();i.src=src;imgCache.set(src,i)}return i.complete&&i.naturalWidth?i:null}
const rngOf=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
const hashOf=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0};

// ------------------------------------------------ 3D thumbnails
let RIG=null;
function rig(){
 if(RIG!==null)return RIG;
 try{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(256,256,false);renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8a94b8',1.7));
  const sun=new THREE.DirectionalLight('#fff4e0',2.3);sun.position.set(3,5,4);scene.add(sun);
  RIG={renderer,scene,cam:new THREE.PerspectiveCamera(28,1,.05,300)}}
 catch(e){RIG=false}
 return RIG}
const shots=new Map();
function shot(key,build,dir){
 if(shots.has(key))return shots.get(key);
 const R=rig();if(!R){shots.set(key,'');return ''}
 let url='';
 try{
  const obj=build();const holder=new THREE.Group();holder.add(obj);
  const box=new THREE.Box3().setFromObject(holder),c=box.getCenter(new THREE.Vector3()),r=box.getSize(new THREE.Vector3()).length()/2||1;
  obj.position.sub(c);R.scene.add(holder);
  const d=new THREE.Vector3(...dir).normalize().multiplyScalar(r/Math.sin(R.cam.fov*Math.PI/360)*1.04);
  R.cam.position.copy(d);R.cam.lookAt(0,0,0);R.cam.updateProjectionMatrix();
  R.renderer.render(R.scene,R.cam);url=R.renderer.domElement.toDataURL('image/png');
  R.scene.remove(holder)}
 catch(e){url=''}
 shots.set(key,url);return url}
function weaponFor(id){
 const slot=FX_SLOT[id];let i=-1;
 if(slot==='wb')i=WEAPONS.findIndex(w=>w.n==='Fungal Blaster');
 else if(slot==='wr')i=WEAPONS.findIndex(w=>w.n==='Root Shooter');
 else i=WEAPONS.findIndex(w=>w.t==='ar');
 return Math.max(1,i)}
function staticUrl(id){
 const slot=FX_SLOT[id];
 if(slot==='ht')return shot(id,()=>makeHat(id),[.7,.5,1]);
 if(slot==='pk')return shot(id,()=>makePack(id),[.8,.25,1]);
 if(slot==='gl')return shot(id,()=>{const g=fungalGlider(id);g.position.y=0;return g},[.25,.3,1]);
 if(slot==='wa'||slot==='wb'||slot==='wr')return shot(id,()=>{const w=weaponFor(id),m=makeWeaponModel(w,3);return finishWeapon(m,w,{fx:{[slot]:id}})},[1,.35,.25]);
 return ''}

// ------------------------------------------------ the animation clock (only canvases that can be seen are drawn)
const live=new Set();let raf=0,last=0;
function tick(ts){
 raf=0;const dt=Math.min(.05,(ts-last)/1000||.016);last=ts;
 for(const a of live){
  if(!a.el.isConnected){live.delete(a);continue}
  if(a.el.offsetParent===null)continue;
  a.t+=dt;a.draw(a.t,dt)}
 if(live.size)raf=requestAnimationFrame(tick)}
function addLive(el,draw){live.add({el,draw,t:0});if(!raf){last=performance.now();raf=requestAnimationFrame(tick)}}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.className='pv-c';return c}

// the little stage the effect plays on: a soft ground ellipse and the player's character standing on it
function stage(g,W,H,cx=W/2,groundY=H*.82,ch=H*.5){
 g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(cx,groundY,ch*.34,ch*.09,0,0,TAU);g.fill();
 const im=charImg();if(im){const k=ch/im.naturalHeight;g.drawImage(im,cx-im.naturalWidth*k/2,groundY-ch+ch*.04,im.naturalWidth*k,ch)}
 else{g.fillStyle='#e8eefc';g.beginPath();g.ellipse(cx,groundY-ch*.5,ch*.2,ch*.4,0,0,TAU);g.fill()}}
const star=(g,x,y,r)=>{g.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rr=k%2?r*.45:r;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}g.closePath();g.fill()};
const mush=(g,x,y,s,col)=>{g.fillStyle='#efe2c8';g.fillRect(x-s*.12,y-s*.55,s*.24,s*.55);g.fillStyle=col;g.beginPath();g.ellipse(x,y-s*.55,s*.5,s*.36,0,Math.PI,0);g.fill();g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(x-s*.15,y-s*.7,s*.07,0,TAU);g.fill()};

// effect id -> how it looks. type: ring, burst, sprout, confetti, ghost, coins, bolt
const FXP={
 land_ring:{k:'ring',cols:['#b6ff9a','#c9a8ff','#7ff0ff']},land_shock:{k:'ring',cols:['#ffffff','#8fd8ff','#4a9aff'],fat:1},
 land_burst:{k:'sprout',cols:['#c46bff','#3fe0c0','#c8ff5a','#ff7ab8']},land_stars:{k:'burst',cols:['#ffd23d','#ffffff'],star:1,low:1},land_confetti:{k:'confetti',up:1},
 el_burst:{k:'burst',cols:['#b6ff6a','#c58bff','#7ff0ff']},el_bloom:{k:'sprout',cols:['#ff7ab8','#ffb0e0','#d84a8a'],glow:1},
 el_confetti:{k:'confetti'},el_coins:{k:'coins'},el_ghost:{k:'ghost'},el_bolt:{k:'bolt'}};
function fxCanvas(id,size){
 const W=size,H=size,cv=mkCanvas(W,H),g=cv.getContext('2d'),P=FXP[id]||FXP.land_ring,L=2.8;
 const cx=W/2,gy=H*.82,ch=H*.46;let rnd=rngOf(hashOf(id)),parts=[],spawnU=-1;
 const spawn=()=>{
  parts=[];const n=P.k==='burst'?34:P.k==='confetti'?42:P.k==='coins'?26:P.k==='ring'?20:0;
  for(let i=0;i<n;i++){const a=rnd()*TAU,s=(P.k==='ring'?.9:.45+rnd()*.7)*W*.3;
   parts.push({a,s,x:cx,y:P.k==='burst'||P.k==='coins'?gy-ch*.5:P.k==='confetti'&&!P.up?gy-ch*.6:gy,vx:Math.cos(a)*s*(P.k==='ring'?1:.7),vy:P.k==='ring'?-Math.abs(Math.sin(a))*s*.15-6:-(rnd()*.7+.3)*W*.45,c:P.cols?P.cols[(rnd()*P.cols.length)|0]:['#ff4a6a','#ffd23d','#4adf7a','#4a9aff','#c05aff'][(rnd()*5)|0],r:rnd()*TAU,w:2+rnd()*3})}}
 const draw=(t)=>{
  const u=t%L;if(spawnU<0||u<spawnU){rnd=rngOf(hashOf(id)+((t/L)|0));spawn()}spawnU=u;
  g.clearRect(0,0,W,H);stage(g,W,H,cx,gy,ch);
  const e=Math.max(0,u-.25);
  if(P.k==='ring'){
   for(let k=0;k<3;k++){const q=e-k*.14;if(q<=0||q>1.3)continue;const r=q*W*.5*(1+k*.15);g.globalAlpha=Math.max(0,1-q/1.3);g.strokeStyle=P.cols[k%P.cols.length];g.lineWidth=P.fat?5-k:3;g.beginPath();g.ellipse(cx,gy,r,r*.3,0,0,TAU);g.stroke()}
   g.globalAlpha=1;for(const p of parts){const x=p.x+p.vx*e,y=p.y+p.vy*e+W*.35*e*e;if(e<=0||e>1.1)continue;g.globalAlpha=Math.max(0,1-e/1.1);g.fillStyle=p.c;g.fillRect(x-1.5,y-1.5,3,3)}}
  else if(P.k==='burst'||P.k==='coins'){
   if(e>0&&e<1.5){const gv=W*(P.k==='coins'?1.3:.9);
    for(const p of parts){const x=p.x+p.vx*e,y=p.y+p.vy*e*(P.low?.7:1)+gv*e*e*.5;g.globalAlpha=Math.max(0,1-e/1.5);g.fillStyle=p.c;
     if(P.star)star(g,x,y,4.5);else if(P.k==='coins'){const w=Math.abs(Math.cos(e*9+p.r))*4+.8;g.beginPath();g.ellipse(x,y,w,4,0,0,TAU);g.fill();g.strokeStyle='#a86a00';g.lineWidth=1;g.stroke()}
     else{g.beginPath();g.arc(x,y,2.4,0,TAU);g.fill()}}
    if(P.k==='burst'||P.star){g.globalAlpha=Math.max(0,1-e*1.6);g.strokeStyle=P.cols[0];g.lineWidth=3;g.beginPath();g.ellipse(cx,gy,e*W*.4,e*W*.12,0,0,TAU);g.stroke()}}}
  else if(P.k==='confetti'){
   if(e>0&&e<1.8){for(const p of parts){const x=p.x+p.vx*e*.8+Math.sin(e*5+p.r)*5,y=p.y+(P.up?p.vy*e*.9+W*.55*e*e:-W*.1*e+W*.5*e*e*(1)+p.vy*e*.4);
     g.globalAlpha=Math.max(0,1-e/1.8);g.fillStyle=p.c;g.save();g.translate(x,y);g.rotate(p.r+e*8);g.fillRect(-p.w,-1.5,p.w*2,3);g.restore()}}}
  else if(P.k==='sprout'){
   for(let i=0;i<7;i++){const a=i/7*TAU+.4,x=cx+Math.cos(a)*W*.3,y=gy+Math.sin(a)*W*.06;const q=Math.min(1,Math.max(0,(e-i*.05)/.4)),sh=e>2?Math.max(0,1-(e-2)/.5):1;
    if(q<=0)continue;g.globalAlpha=1;if(P.glow){g.shadowColor=P.cols[i%P.cols.length];g.shadowBlur=8}mush(g,x,y,W*.2*q*sh*(.8+(i%3)*.2),P.cols[i%P.cols.length]);g.shadowBlur=0}
   g.globalAlpha=Math.max(0,1-e*1.2);g.fillStyle=P.cols[0];for(let i=0;i<8;i++){const a=i*.8;g.fillRect(cx+Math.cos(a)*e*W*.3,gy-e*W*.2-Math.sin(a*3)*8,3,3)}}
  else if(P.k==='ghost'){
   if(e>0&&e<2.2){const q=e/2.2,y=gy-ch*.7-q*H*.35,a=Math.sin(Math.min(1,q)*Math.PI)*.85;g.globalAlpha=a;g.fillStyle='#f4f8ff';g.beginPath();g.arc(cx,y,W*.1,Math.PI,0);g.lineTo(cx+W*.1,y+W*.14);
    for(let k=3;k>=-3;k--)g.lineTo(cx+k*W*.033,y+W*.14+(k%2?W*.03:0));g.closePath();g.fill();g.fillStyle='#1a2040';g.beginPath();g.arc(cx-W*.035,y,W*.014,0,TAU);g.arc(cx+W*.035,y,W*.014,0,TAU);g.fill();g.beginPath();g.ellipse(cx,y+W*.05,W*.015,W*.022,0,0,TAU);g.fill()}}
  else if(P.k==='bolt'){
   if(e>.1&&e<.9){const fl=e<.3;g.globalAlpha=fl?1:Math.max(0,1-(e-.3)/.6);if(fl){g.fillStyle='rgba(200,230,255,.35)';g.fillRect(0,0,W,H)}
    g.strokeStyle=fl?'#ffffff':'#bfe6ff';g.lineWidth=fl?4:2;g.shadowColor='#8fd8ff';g.shadowBlur=14;g.beginPath();let x=cx+8,y=0;g.moveTo(x,y);const r2=rngOf(7);while(y<gy-4){y+=H*.11;x+=(r2()-.5)*W*.14;g.lineTo(x,y)}g.lineTo(cx,gy);g.stroke();g.shadowBlur=0;
    g.fillStyle='#fff6a0';for(let i=0;i<10;i++){const a=i/10*TAU,d=e*W*.25;g.fillRect(cx+Math.cos(a)*d,gy-4+Math.sin(a)*d*.3-e*10,2.5,2.5)}}}
  g.globalAlpha=1};
 draw(0.01);addLive(cv,draw);return cv}

// sprint trails: the character jogs on the spot, the trail streams out behind
function trailCanvas(tr,size){
 const W=size,H=size,cv=mkCanvas(W,H),g=cv.getContext('2d');let ps=[],acc=0;
 const kind=tr.kind,cols=tr.cols;
 const draw=(t,dt)=>{
  g.clearRect(0,0,W,H);const gy=H*.8,ch=H*.5,cx=W*.68;
  acc+=dt;while(acc>.035){acc-=.035;const y=gy-ch*.08;
   const base={x:cx-W*.1,y,vx:-W*.35*(.6+Math.random()*.5),vy:-6,life:0,max:.9,c:cols[(Math.random()*cols.length)|0],s:3};
   if(kind==='rise'){base.vy=-W*.18*(.5+Math.random());base.vx*=.35}
   else if(kind==='cloud'){base.s=9;base.max=1.2;base.vy=-W*.05;base.vx*=.45}
   else if(kind==='star'){base.s=4;base.vy=-W*.15*(.5+Math.random());base.vx*=.4}
   else if(kind==='bubble'){base.s=5;base.vy=-W*.16;base.vx*=.3;base.max=1.2}
   else if(kind==='rainbow'){base.c=['#ff4a6a','#ff9a3a','#ffd23d','#4adf7a','#4a9aff','#a05aff'][(t*8|0)%6];base.s=4;base.vy=0}
   else if(kind==='root'){base.vy=-W*.1;base.s=2.5}
   ps.push(base)}
  for(let i=ps.length-1;i>=0;i--){const p=ps[i];p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life>p.max){ps.splice(i,1);continue}
   const a=1-p.life/p.max;g.globalAlpha=a*(kind==='cloud'?.5:1);g.fillStyle=p.c;
   if(kind==='star')star(g,p.x,p.y,p.s+1);else if(kind==='bubble'){g.strokeStyle=p.c;g.lineWidth=1.5;g.beginPath();g.arc(p.x,p.y,p.s,0,TAU);g.stroke()}
   else if(kind==='cloud'){g.beginPath();g.arc(p.x,p.y,p.s*(1+p.life),0,TAU);g.fill()}
   else{g.beginPath();g.arc(p.x,p.y,p.s*(kind==='ember'?a+.3:1),0,TAU);g.fill()}}
  g.globalAlpha=1;
  const bob=Math.abs(Math.sin(t*9))*H*.03,im=charImg();
  g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(cx,gy,ch*.3,ch*.07,0,0,TAU);g.fill();
  if(im){const k=ch/im.naturalHeight;g.save();g.translate(cx,gy-bob);g.rotate(.08);g.drawImage(im,-im.naturalWidth*k/2,-ch,im.naturalWidth*k,ch);g.restore()}};
 draw(0,.016);addLive(cv,draw);return cv}
const TRAIL_LOOK={
 'bp:spore':{kind:'rise',cols:['#b6ff6a','#5fe0a0']},'bp:root':{kind:'root',cols:['#b07a3c','#5a8a3a']},'bp:cloud':{kind:'cloud',cols:['#e6ffb8','#9be8ff']},
 'sh:rainbow':{kind:'rainbow',cols:['#ff4a6a']},'sh:star':{kind:'star',cols:['#ffe27a','#ffffff']},'sh:ember':{kind:'ember',cols:['#ff9a1a','#ff3a00']},'sh:bubble':{kind:'bubble',cols:['#bfeaff','#6ac8ff']}};

// emotes: the character moves the way it does in the game (video emotes loop their clip, Bart shows Bart)
function emoteEl(id,size){
 const d=EMOTE_BY[id];const box=document.createElement('div');box.className='pv-emo';
 if(!d)return box;
 if(d.kind==='video'){const v=document.createElement('video');v.src=d.video;v.muted=true;v.loop=true;v.playsInline=true;v.autoplay=true;v.preload='metadata';v.className='pv-vid';box.appendChild(v);v.play().catch(()=>{});return box}
 const im=document.createElement('img');im.alt='';im.draggable=false;
 if(d.kind==='bart'){im.src=d.img;im.className='pv-bart'}else{im.src=ctx.img;im.className='pv-char'}
 box.appendChild(im);
 const draw=t=>{const R=emoteRig(d,t%(d.kind==='rise'?14:d.kind==='hop'?5.2:6));const k=size*.5;
  im.style.transform=`translate(${R.px*k}px,${-R.py*k}px) rotate(${-R.rz}rad) scale(${R.sx},${R.sy})`};
 draw(0);addLive(box,draw);return box}

// nameplate: drawn with the same code as the name tags in the game
function plateEl(id){
 const cv=mkCanvas(256,64),g=cv.getContext('2d');drawNameplate(g,id);
 g.font='bold 24px Arial Black, Arial';g.textAlign='center';g.lineWidth=5;g.strokeStyle='rgba(0,0,0,.8)';g.strokeText(ctx.name,128,24);g.fillStyle=ctx.color||'#fff';g.fillText(ctx.name,128,24);
 cv.className='pv-plate';return cv}

// ------------------------------------------------ mounting
// key: 'cos:ID' (any cosmetic), 'trail:ID' (battle pass or shop trail), 'ctrail:#hex' (colour trail), 'emote:ID'
export function previewEl(key,size=140){
 const[kind,id]=[key.slice(0,key.indexOf(':')),key.slice(key.indexOf(':')+1)];
 if(kind==='trail'){const L=TRAIL_LOOK[id];return L?trailCanvas(L,size):document.createElement('span')}
 if(kind==='ctrail')return trailCanvas({kind:'dots',cols:[id]},size);
 if(kind==='emote')return emoteEl(id,size);
 if(kind==='cos'){
  const slot=FX_SLOT[id];
  if(slot==='fr')return plateEl(id);
  if(slot==='ld'||slot==='el')return fxCanvas(id,size);
  const url=staticUrl(id);
  if(url){const im=document.createElement('img');im.src=url;im.alt='';im.className='pv-img';im.draggable=false;return im}
  const s=document.createElement('span');s.className='emo';s.textContent=(cosInfo(id)||{}).icon||'';return s}
 return document.createElement('span')}
export function mountPreviews(root,size=140){
 if(!root)return;
 for(const el of root.querySelectorAll('.pv:not(.on)')){el.classList.add('on');el.appendChild(previewEl(el.dataset.pv,el.classList.contains('big')?190:size))}}
