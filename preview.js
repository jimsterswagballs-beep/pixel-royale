// Previews for cosmetics and emotes, so you can see what you are getting before you buy or equip it.
// Looks only: nothing here touches stats, hit boxes, abilities or anything the server decides.
//  - Hats, backpacks, gliders and weapon finishes: a small 3D picture of the real model. It is drawn once in an
//    offscreen WebGL canvas and kept as an image (thumb). Without WebGL the caller falls back to the emoji.
//  - Landing and elimination effects: a looping mini scene made of CSS (fxPreview), in the effect's own colours.
//  - Emotes: your own character doing the emote's motion (emotePreview). Best Weapon plays its video while you
//    hover over it, and Bart shows its art.
import * as THREE from 'three';

const SIZE=192;
let rnd=null,scene=null,cam=null,broken=false;
const cache=new Map();

// one small renderer for every picture, made the first time a picture is needed
function renderer(){
 if(rnd||broken)return rnd;
 try{
  const cv=document.createElement('canvas');cv.width=SIZE;cv.height=SIZE;
  rnd=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
  rnd.setPixelRatio(1);rnd.setSize(SIZE,SIZE,false);rnd.setClearColor(0x000000,0);
  scene=new THREE.Scene();
  cam=new THREE.PerspectiveCamera(28,1,.05,400);
  scene.add(new THREE.HemisphereLight(0xffffff,0x3a3050,1.45));
  const key=new THREE.DirectionalLight(0xffffff,1.9);key.position.set(2.5,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0xbfd8ff,.7);rim.position.set(-4,1.5,-3);scene.add(rim);
 }catch(e){broken=true;rnd=null}
 return rnd}

// Picture of one 3D object as a PNG data URL. It is drawn once per key and cached. build() returns the object, or null.
// The object is centred and framed from a three-quarter view, so every item fits the same square.
export function thumb(key,build){
 if(cache.has(key))return cache.get(key);
 let url='';const r=renderer();
 if(r){
  let obj=null;try{obj=build()}catch(e){obj=null}
  if(obj){
   const holder=new THREE.Group();holder.add(obj);scene.add(holder);
   try{
    const box=new THREE.Box3().setFromObject(holder);
    const c=box.getCenter(new THREE.Vector3());
    const rad=Math.max(.2,box.getSize(new THREE.Vector3()).length()/2);
    holder.position.copy(c).negate();
    const dist=rad/Math.sin(14*Math.PI/180)*1.1;
    cam.position.set(.5,.38,1).normalize().multiplyScalar(dist);
    cam.lookAt(0,0,0);
    r.render(scene,cam);
    url=r.domElement.toDataURL('image/png');
   }catch(e){url=''}
   scene.remove(holder);
   holder.traverse(o=>{if(o.geometry)o.geometry.dispose()});
  }
 }
 cache.set(key,url);
 return url}

// Landing (ld) and elimination (el) effects, drawn as a short loop.
// ring: two ring colours. c: particle colours. n: number of particles. spread: how far they fly (px).
// up: how far a landing burst rises (px). fig: a little player who pops. chip / shard: particle shape.
const FX={
 ld_shock:{ring:['#ffffff','#cfe3ff'],c:['#d8d8e0','#ffffff'],n:12,spread:54,up:12},
 ld_confetti:{c:['#ff5a8a','#ffd84a','#5aff8a','#5ab8ff','#b07aff','#ff9a3c'],n:18,spread:60,up:44,chip:1},
 ld_snow:{ring:['#dff4ff','#7ab8ff'],c:['#ffffff','#bfe4ff'],n:14,spread:50,up:18},
 ld_flame:{ring:['#ff9a3c','#ffd060'],c:['#ff7a1e','#ffb83a'],n:14,spread:46,up:22},
 land_ring:{ring:['#b6ff9a','#c9a8ff'],c:['#b6ff6a','#7ff0ff'],n:12,spread:50,up:16},
 land_burst:{c:['#c9a8ff','#a8ff7a'],n:14,spread:56,up:20},
 el_confetti:{fig:1,c:['#ff5a8a','#ffd84a','#5aff8a','#5ab8ff','#b07aff','#ff9a3c'],n:18,spread:60,chip:1},
 el_shatter:{fig:1,ring:['#bff0ff','#7ab8ff'],c:['#dff4ff','#7ab8ff'],n:14,spread:56,shard:1},
 el_fire:{fig:1,ring:['#ff9a3c','#ff5a2a'],c:['#ffb83a','#ff5a2a','#3a2a2a'],n:14,spread:50},
 el_gold:{fig:1,ring:['#ffd84a','#fff2b0'],c:['#ffd84a','#fff2b0'],n:14,spread:50},
 el_burst:{fig:1,ring:['#b6ff9a','#c58bff'],c:['#b6ff6a','#c58bff','#7ff0ff'],n:14,spread:50},
 el_bloom:{fig:1,ring:['#ffb0e0','#d84a8a'],c:['#ff8ad0','#ffb0e0','#d8a8ff'],n:12,spread:44}
};

// HTML for a landing or elimination effect preview ('' if the id has no look)
export function fxPreview(id){
 const f=FX[id];if(!f)return '';
 const oy=f.fig?'64px':'80px';
 let s=`<span class="pv-fx" style="--oy:${oy}"><i class="pv-gnd"></i>`;
 if(f.ring){const a=f.ring;s+=`<i class="pv-rg" style="--c1:${a[0]};--c2:${a[1]}"></i><i class="pv-rg b" style="--c1:${a[0]};--c2:${a[1]}"></i>`}
 if(f.fig)s+='<i class="pv-fig"></i>';
 const cols=f.c,n=f.n;
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2+i*.41,k=.62+.38*(((i*5)%4)/3);
  const dx=Math.round(Math.cos(a)*f.spread*k);
  const dy=Math.round(f.fig?Math.sin(a)*f.spread*k*.9:-Math.abs(Math.sin(a))*f.spread*k*.6-(f.up||0));
  const cls=`pv-sp${f.chip?' chip':''}${f.shard?' shard':''}`;
  s+=`<i class="${cls}" style="--dx:${dx}px;--dy:${dy}px;--d:${(((i*3)%5)*.12).toFixed(2)}s;--rot:${(i*67)%360}deg;--c:${cols[i%cols.length]}"></i>`;
 }
 return s+'</span>'}

// emote kind -> the motion class in style.css. vflip / vhop / vspin are the three victory poses.
const POSE={hop:'hop',sdance:'sdance',dab:'dab',floss:'floss',rise:'rise',vflip:'flip',vhop:'hop',vspin:'spin'};
function spores(n,col){
 let s='';
 for(let i=0;i<n;i++){
  const x=10+((i*37)%80),y=40+((i*23)%50),dl=(((i*7)%10)/10)*1.4;
  s+=`<i class="pv-spore" style="--x:${x}%;--y:${y}%;--d:${dl.toFixed(2)}s;--c:${i%2?col:'#7ff0ff'}"></i>`;
 }
 return s}

// HTML for an emote preview. d is an EMOTE_LIST entry (or a victory pose: {kind}). hero is the player's front image.
export function emotePreview(d,hero){
 if(!d)return '';
 if(d.kind==='video')return `<span class="pv-box pv-vid pv-hov"><i class="pv-ico">${d.icon||'\u25B6'}</i><video data-src="${d.video}" muted loop playsinline preload="none"></video></span>`;
 if(d.kind==='bart')return `<span class="pv-box"><img class="pv-bart" src="${d.img}" alt=""></span>`;
 const pose=POSE[d.kind];
 if(!pose||!hero)return d.icon?`<span class="emo">${d.icon}</span>`:'';
 const extra=d.kind==='sdance'?spores(12,'#c9a8ff'):d.kind==='rise'?spores(10,'#b6ff6a'):'';
 return `<span class="pv-box pv-hero pv-${pose}"><img src="${hero}" alt="">${extra}</span>`;
}

// hover previews: a video plays while the pointer is over its box. The src is set on the first hover, so nothing
// loads up front. One listener on the document covers every shop card, locker tile and Battle Pass reward.
if(typeof document!=='undefined'){
 document.addEventListener('mouseover',e=>{
  const box=e.target.closest&&e.target.closest('.pv-hov');
  if(!box||(e.relatedTarget&&box.contains(e.relatedTarget)))return;
  const v=box.querySelector('video');if(!v)return;
  if(!v.getAttribute('src'))v.src=v.dataset.src;
  const p=v.play();if(p&&p.catch)p.catch(()=>{});
 });
 document.addEventListener('mouseout',e=>{
  const box=e.target.closest&&e.target.closest('.pv-hov');
  if(!box||(e.relatedTarget&&box.contains(e.relatedTarget)))return;
  const v=box.querySelector('video');if(v)v.pause();
 });
}
