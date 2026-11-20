import * as THREE from 'three';
import {mulberry32,clamp,lerp} from './data.js';
export const ISL=300,HALF=430,WATER=0;
export const POIS=[
 {n:'Downtown Dunk',x:0,z:0,r:58,type:'city'},
 {n:'Pleasant Pickle',x:-150,z:95,r:44,type:'suburb'},
 {n:'Salty Shores',x:150,z:115,r:42,type:'town'},
 {n:'Lonely Lodge',x:-125,z:-150,r:36,type:'cabins'},
 {n:'Retail Rodeo',x:135,z:-140,r:44,type:'warehouse'},
 {n:'Misty Mill',x:15,z:190,r:34,type:'town'},
 {n:'Radar Ridge',x:-215,z:-25,r:32,type:'base'},
 {n:'Frosty Fort',x:30,z:-218,r:36,type:'fort'},
];
function hash(ix,iz){let h=Math.imul(ix,374761393)^Math.imul(iz,668265263);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967295}
function vnoise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,z){return vnoise(x,z)*.5+vnoise(x*2.1+7,z*2.1+3)*.25+vnoise(x*4.3+1,z*4.3+9)*.125+vnoise(x*8.7,z*8.7)*.0625}
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function rawH(x,z){
 const r=Math.hypot(x,z),ang=Math.atan2(z,x);
 const edge=ISL*(.8+.22*vnoise(Math.cos(ang)*1.7+10,Math.sin(ang)*1.7+10)+.08*vnoise(ang*4+50,3));
 const L=clamp((edge-r)/60,-1,1);
 let h;
 if(L>0){const s=sstep(0,1,L);h=s*(3+fbm(x*.011,z*.011)*22);
  h+=38*Math.exp(-(((x+75)**2+(z+95)**2)/(2*38*38)))*s;
  h+=18*Math.exp(-(((x+215)**2+(z+25)**2)/(2*34*34)))*s;
  h+=14*Math.exp(-(((x-80)**2+(z-30)**2)/(2*45*45)))*s;}
 else h=L*14;
 return h;
}
const poiY=POIS.map(p=>clamp(rawH(p.x,p.z),3,30));
export function H(x,z){
 let h=rawH(x,z);
 for(let i=0;i<POIS.length;i++){const p=POIS[i];const dx=x-p.x,dz=z-p.z;if(dx>p.r*1.3||dx<-p.r*1.3||dz>p.r*1.3||dz<-p.r*1.3)continue;
  const d=Math.hypot(dx,dz);const w=sstep(p.r*1.25,p.r*.85,d);if(w>0)h=lerp(h,poiY[i],w);}
 return h;
}
export function slope(x,z){const e=1.2;return [(H(x+e,z)-H(x-e,z))/(2*e),(H(x,z+e)-H(x,z-e))/(2*e)]}
export function poiAt(x,z){for(const p of POIS)if(Math.hypot(x-p.x,z-p.z)<p.r*1.1)return p;return null}
// ---------------- colliders
export const boxes=[],circles=[],lootSpots=[],boxVis=[];
const CELL=16;let grid=new Map();let stamp=0;
const gk=(ix,iz)=>ix*8192+iz;
function gadd(ix,iz,o){const k=gk(ix,iz);let a=grid.get(k);if(!a){a=[];grid.set(k,a)}a.push(o)}
function insertBox(b){const x0=Math.floor(b.x0/CELL),x1=Math.floor(b.x1/CELL),z0=Math.floor(b.z0/CELL),z1=Math.floor(b.z1/CELL);for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++)gadd(i,j,b)}
function insertCircle(c){const x0=Math.floor((c.x-c.r)/CELL),x1=Math.floor((c.x+c.r)/CELL),z0=Math.floor((c.z-c.r)/CELL),z1=Math.floor((c.z+c.r)/CELL);for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++)gadd(i,j,c)}
export function query(x,z,r,out){out.length=0;stamp++;const x0=Math.floor((x-r)/CELL),x1=Math.floor((x+r)/CELL),z0=Math.floor((z-r)/CELL),z1=Math.floor((z+r)/CELL);
 for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++){const a=grid.get(gk(i,j));if(!a)continue;for(let k=0;k<a.length;k++){const o=a[k];if(o._q!==stamp){o._q=stamp;out.push(o)}}}return out}
function addBox(x0,y0,z0,x1,y1,z1,color,vis=true){const b={x0,y0,z0,x1,y1,z1,c:color,circ:false};boxes.push(b);insertBox(b);if(vis)boxVis.push(b);return b}
function wallX(x0,x1,z,y0,H_,openings,color,th=.4){ // wall along x at z (thickness th)
 openings=openings.slice().sort((a,b)=>a.s-b.s);let cur=x0;
 for(const o of openings){if(o.s>cur)addBox(cur,y0,z-th/2,o.s,y0+H_,z+th/2,color);if(o.y0>0)addBox(o.s,y0,z-th/2,o.e,y0+o.y0,z+th/2,color);if(o.y1<H_)addBox(o.s,y0+o.y1,z-th/2,o.e,y0+H_,z+th/2,color);cur=o.e}
 if(cur<x1)addBox(cur,y0,z-th/2,x1,y0+H_,z+th/2,color)}
function wallZ(z0,z1,x,y0,H_,openings,color,th=.4){
 openings=openings.slice().sort((a,b)=>a.s-b.s);let cur=z0;
 for(const o of openings){if(o.s>cur)addBox(x-th/2,y0,cur,x+th/2,y0+H_,o.s,color);if(o.y0>0)addBox(x-th/2,y0,o.s,x+th/2,y0+o.y0,o.e,color);if(o.y1<H_)addBox(x-th/2,y0+o.y1,o.s,x+th/2,y0+H_,o.e,color);cur=o.e}
 if(cur<z1)addBox(x-th/2,y0,cur,x+th/2,y0+H_,z1,color)}
const PAL={wall:['#e8d9b8','#d9c7a0','#cfd8dc','#e6b8a2','#b8c9a8','#d8c0d0','#c9b79c','#aebfd0'],roof:['#8a4b3a','#5b6b7a','#7a5b3a','#4f5f4f','#6a4a5a'],conc:['#9aa0a6','#8b9096','#a7adb3']};
function makeBuilding(rng,cx,cz,w,d,h,doorSide,opts={}){
 const y0=H(cx,cz),wc=opts.color||PAL.wall[Math.floor(rng()*PAL.wall.length)],rc=PAL.roof[Math.floor(rng()*PAL.roof.length)];
 const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2,th=.4;
 const door=(len,c)=>({s:c-.95,e:c+.95,y0:0,y1:2.7});
 const win=(c)=>({s:c-.8,e:c+.8,y0:1,y1:2.3});
 const sides={n:[],s:[],e:[],w:[]};
 const dc={n:cx,s:cx,e:cz,w:cz};
 sides[doorSide].push(door(0,dc[doorSide]));
 for(const k of ['n','s','e','w']){const len=(k==='n'||k==='s')?w:d;const c=dc[k];if(k!==doorSide){if(len>9&&rng()<.9){sides[k].push(win(c-len*.22));sides[k].push(win(c+len*.22))}else if(rng()<.6)sides[k].push(win(c))}else if(len>12){sides[k].push(win(c-len*.3));sides[k].push(win(c+len*.3))}}
 wallX(x0,x1,z0,y0,h,sides.n,wc,th);wallX(x0,x1,z1,y0,h,sides.s,wc,th);wallZ(z0,z1,x0,y0,h,sides.w,wc,th);wallZ(z0,z1,x1,y0,h,sides.e,wc,th);
 addBox(x0-.3,y0+h,z0-.3,x1+.3,y0+h+.35,z1+.3,rc);
 addBox(x0,y0,z0,x1,y0+.08,z1,'#7b7468',true);
 // props
 const np=Math.floor(rng()*3)+(opts.props||0);
 for(let i=0;i<np;i++){const px=lerp(x0+1.5,x1-1.5,rng()),pz=lerp(z0+1.5,z1-1.5,rng());const s=.7+rng()*.6;addBox(px-s/2,y0,pz-s/2,px+s/2,y0+s,pz+s/2,['#8b6b3e','#6b7a8b','#a05a3c'][i%3])}
 // door outside point
 const dd={n:[cx,z0-2.5],s:[cx,z1+2.5],w:[x0-2.5,cz],e:[x1+2.5,cz]}[doorSide];
 const spots=Math.max(1,Math.floor(w*d/55)+Math.floor(rng()*2));
 for(let i=0;i<spots;i++){lootSpots.push({x:lerp(x0+1.2,x1-1.2,rng()),z:lerp(z0+1.2,z1-1.2,rng()),y:y0+.1,door:dd,inside:true,chest:false,q:opts.q||1})}
 if(rng()<(opts.chest??.65)){const bx=lerp(x0+1.5,x1-1.5,rng());const bz=rng()<.5?z0+1.1:z1-1.1;lootSpots.push({x:bx,z:bz,y:y0+.1,door:dd,inside:true,chest:true,q:opts.q||1})}
 return {x:cx,z:cz,w,d,y0,h,door:dd};
}
export const buildings=[];
function genPOI(rng,p,idx){
 const S={city:21,suburb:26,town:24,cabins:28,warehouse:32,base:30,fort:40}[p.type]||24;
 const dirTo=(bx,bz)=>{const dx=p.x-bx,dz=p.z-bz;if(Math.abs(dx)>Math.abs(dz))return dx>0?'e':'w';return dz>0?'s':'n'};
 if(p.type==='fort'){
  const R=24,wh=7,th=1.2,yy=H(p.x,p.z);
  const gap=[{s:p.x-3,e:p.x+3,y0:0,y1:4.5}];
  wallX(p.x-R,p.x+R,p.z-R,yy,wh,gap,PAL.conc[0],th);wallX(p.x-R,p.x+R,p.z+R,yy,wh,gap,PAL.conc[0],th);
  const gz=[{s:p.z-3,e:p.z+3,y0:0,y1:4.5}];wallZ(p.z-R,p.z+R,p.x-R,yy,wh,gz,PAL.conc[1],th);wallZ(p.z-R,p.z+R,p.x+R,yy,wh,gz,PAL.conc[1],th);
  for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1]])addBox(p.x+sx*R-4,yy,p.z+sz*R-4,p.x+sx*R+4,yy+11,p.z+sz*R+4,'#7e858c');
  buildings.push(makeBuilding(rng,p.x,p.z,16,14,5,'s',{color:'#cfd8dc',props:3,chest:1,q:1.6,}));
  buildings.push(makeBuilding(rng,p.x-12,p.z+10,8,8,3.6,'e',{q:1.2}));buildings.push(makeBuilding(rng,p.x+12,p.z-10,8,8,3.6,'w',{q:1.2}));
  return}
 const n=p.type==='cabins'?2:3;
 for(let gx=-n;gx<=n;gx++)for(let gz=-n;gz<=n;gz++){
  const bx=p.x+gx*S+(rng()-.5)*S*.25,bz=p.z+gz*S+(rng()-.5)*S*.25;
  if(Math.hypot(bx-p.x,bz-p.z)>p.r*.88)continue;if(gx===0&&gz===0&&p.type!=='city'&&rng()<.5)continue;if(rng()<.12)continue;
  let w,d,h,o={};
  if(p.type==='city'){w=11+rng()*7;d=11+rng()*6;h=rng()<.4?9:4.2;o={q:1.5,props:1};}
  else if(p.type==='warehouse'){w=18+rng()*6;d=12+rng()*5;h=5.5;o={q:1.3,props:3};}
  else if(p.type==='base'){w=12+rng()*6;d=10+rng()*5;h=4.2;o={q:1.4,color:'#9aa6a0',props:2};}
  else if(p.type==='cabins'){w=8+rng()*3;d=7+rng()*3;h=3.4;o={q:1.1,color:'#9b7653'};}
  else if(p.type==='suburb'){w=9+rng()*3;d=8+rng()*3;h=3.5;o={q:1};}
  else {w=9+rng()*4;d=8+rng()*4;h=3.6+(rng()<.2?3:0);o={q:1.1};}
  buildings.push(makeBuilding(rng,bx,bz,w,d,h,dirTo(bx,bz),o));
 }
 if(p.type==='base'){const yy=H(p.x,p.z);addBox(p.x-3,yy,p.z-3,p.x+3,yy+16,p.z+3,'#c0c4c8');addBox(p.x-6,yy+16,p.z-.5,p.x+6,yy+17,p.z+.5,'#e04a4a')}
}
let built=false,treeList=[],rockList=[];
export function buildMap(){
 if(built)return;built=true;const rng=mulberry32(1337);
 POIS.forEach((p,i)=>genPOI(rng,p,i));
 // trees
 for(let x=-ISL-20;x<ISL+20;x+=8)for(let z=-ISL-20;z<ISL+20;z+=8){
  const tx=x+(rng()-.5)*7,tz=z+(rng()-.5)*7;const h=H(tx,tz);if(h<2.6||h>34)continue;
  const f=fbm(tx*.03+40,tz*.03+40);if(f<.46&&rng()<.85)continue;if(f<.52&&rng()<.5)continue;
  let bad=false;for(const p of POIS)if(Math.hypot(tx-p.x,tz-p.z)<p.r*(p.type==='cabins'?.55:1.12)){bad=true;break}if(bad)continue;
  const[gx,gz]=slope(tx,tz);if(Math.hypot(gx,gz)>.7)continue;
  const sc=.8+rng()*.8;const c={x:tx,z:tz,r:.55*sc,y0:h,y1:h+9*sc,tree:true,sc,kind:rng()<.25?1:0};treeList.push(c);insertCircle(c);circles.push(c)}
 for(let i=0;i<160;i++){const a=rng()*6.283,r=Math.sqrt(rng())*ISL*.9;const x=Math.cos(a)*r,z=Math.sin(a)*r;const h=H(x,z);if(h<2.4)continue;let bad=false;for(const p of POIS)if(Math.hypot(x-p.x,z-p.z)<p.r*.9){bad=true;break}if(bad)continue;
  const sc=1+rng()*2.2;const c={x,z,r:1.1*sc,y0:h-1,y1:h+1.3*sc,rock:true,sc,rot:rng()*6};rockList.push(c);insertCircle(c);circles.push(c)}
 // outdoor loot spots
 for(const p of POIS){for(let i=0;i<10;i++){const a=rng()*6.283,r=Math.sqrt(rng())*p.r*.9;lootSpots.push({x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r,y:0,inside:false,chest:false,q:.7})}}
 for(let i=0;i<70;i++){const a=rng()*6.283,r=Math.sqrt(rng())*ISL*.85;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(H(x,z)<2.4)continue;lootSpots.push({x,z,y:0,inside:false,chest:false,q:.5})}
 for(const s of lootSpots)if(!s.inside)s.y=H(s.x,s.z)+.1;
}
// ---------------- rays
const _q=[];
export function rayBoxT(b,ox,oy,oz,dx,dy,dz,maxT){let t0=0,t1=maxT;
 const sl=(o,d,mn,mx)=>{if(Math.abs(d)<1e-9){return o>=mn&&o<=mx}let a=(mn-o)/d,c=(mx-o)/d;if(a>c){const t=a;a=c;c=t}if(a>t0)t0=a;if(c<t1)t1=c;return t0<=t1};
 if(!sl(ox,dx,b.x0,b.x1)||!sl(oy,dy,b.y0,b.y1)||!sl(oz,dz,b.z0,b.z1))return Infinity;return t0}
export function rayCircleT(c,ox,oy,oz,dx,dy,dz,maxT){const fx=ox-c.x,fz=oz-c.z;const a=dx*dx+dz*dz;if(a<1e-9)return Infinity;const bb=2*(fx*dx+fz*dz),cc=fx*fx+fz*fz-c.r*c.r;const disc=bb*bb-4*a*cc;if(disc<0)return Infinity;const s=Math.sqrt(disc);let t=(-bb-s)/(2*a);if(t<0)t=(-bb+s)/(2*a);if(t<0||t>maxT)return Infinity;const y=oy+dy*t;if(y<c.y0||y>c.y1)return Infinity;return t}
// returns {t,kind} or null ; kind: 'box','tree','rock','ground'
export function rayWorld(ox,oy,oz,dx,dy,dz,maxT){
 let best=maxT,kind=null,bobj=null;const step=10;
 for(let t=0;t<=maxT+step;t+=step){const px=ox+dx*Math.min(t,maxT),pz=oz+dz*Math.min(t,maxT);query(px,pz,step*.8,_q);
  for(let i=0;i<_q.length;i++){const o=_q[i];const tt=o.circ===false?rayBoxT(o,ox,oy,oz,dx,dy,dz,best):rayCircleT(o,ox,oy,oz,dx,dy,dz,best);if(tt<best){best=tt;bobj=o;kind=o.circ===false?'box':(o.tree?'tree':'rock')}}}
 // terrain
 let prev=0;const st=best>80?2:1;
 for(let t=st;t<=best+st;t+=st){const tt=Math.min(t,best);const y=oy+dy*tt;const h=H(ox+dx*tt,oz+dz*tt);
  if(y<h){let a=prev,b=tt;for(let k=0;k<5;k++){const m=(a+b)/2;if(oy+dy*m<H(ox+dx*m,oz+dz*m))b=m;else a=m}if(b<best){best=b;kind='ground'}break}prev=tt;if(tt>=best)break}
 return kind?{t:best,kind,obj:bobj}:null;
}
export function losClear(ax,ay,az,bx,by,bz){const dx=bx-ax,dy=by-ay,dz=bz-az;const d=Math.hypot(dx,dy,dz);if(d<.01)return true;return !rayWorld(ax,ay,az,dx/d,dy/d,dz/d,d-.3)}
// ---------------- movement collision
const _b=[];
export function groundAt(x,z,feet,r,step=.65){let g=H(x,z);query(x,z,r+1,_b);
 for(let i=0;i<_b.length;i++){const b=_b[i];if(b.circ!==false)continue;if(x+r>b.x0&&x-r<b.x1&&z+r>b.z0&&z-r<b.z1&&b.y1<=feet+step&&b.y1>g)g=b.y1}return g}
export function ceilingAt(x,z,head,r){query(x,z,r+1,_b);let c=Infinity;for(let i=0;i<_b.length;i++){const b=_b[i];if(b.circ!==false)continue;if(x+r>b.x0&&x-r<b.x1&&z+r>b.z0&&z-r<b.z1&&b.y0>=head-.3&&b.y0<c)c=b.y0}return c}
// does cylinder at (x,y,z) radius r height h collide horizontally?
export function blocked(x,y,z,r,h,step=.65){query(x,z,r+1,_b);
 for(let i=0;i<_b.length;i++){const b=_b[i];
  if(b.circ===false){if(x+r>b.x0&&x-r<b.x1&&z+r>b.z0&&z-r<b.z1&&y<b.y1-step&&y+h>b.y0)return true}
  else{const dx=x-b.x,dz=z-b.z,rr=b.r+r;if(dx*dx+dz*dz<rr*rr&&y<b.y1&&y+h>b.y0)return true}}return false}
export function pushOutCircles(e,r,h){query(e.pos.x,e.pos.z,r+3,_b);for(let i=0;i<_b.length;i++){const b=_b[i];if(b.circ===false)continue;const dx=e.pos.x-b.x,dz=e.pos.z-b.z,rr=b.r+r,d2=dx*dx+dz*dz;if(d2<rr*rr&&e.pos.y<b.y1&&e.pos.y+h>b.y0){const d=Math.sqrt(d2)||.001;e.pos.x=b.x+dx/d*rr;e.pos.z=b.z+dz/d*rr}}}
// ---------------- meshes
export function buildMeshes(scene,quality={}){
 const g=new THREE.Group();scene.add(g);
 const N=210,size=HALF*2;
 const geo=new THREE.PlaneGeometry(size,size,N,N);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position,col=new Float32Array(pos.count*3);const c=new THREE.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const h=H(x,z);pos.setY(i,h);
  const[gx,gz]=slope(x,z);const sl=Math.hypot(gx,gz);const n=fbm(x*.08,z*.08);
  if(h<-.2)c.set('#2d6a8a').lerp(new THREE.Color('#14304a'),clamp(-h/14,0,1));
  else if(h<1.8)c.set('#e3d39a').lerp(new THREE.Color('#d6c283'),n);
  else if(h>34)c.set('#f2f5f7').lerp(new THREE.Color('#cfd8de'),n*.5);
  else if(sl>.75||h>26)c.set('#8b8579').lerp(new THREE.Color('#6f6a60'),n);
  else c.set('#6fae4a').lerp(new THREE.Color('#4f8f3a'),n*1.2).lerp(new THREE.Color('#8abf55'),clamp(.5-n,0,.5));
  for(const p of POIS){const d=Math.hypot(x-p.x,z-p.z);if(d<p.r*.92&&h>1.8){c.lerp(new THREE.Color(p.type==='suburb'?'#7bb85a':'#9a9a96'),sstep(p.r*.92,p.r*.5,d)*.75)}}
  col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
 const terrain=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true}));g.add(terrain);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshPhongMaterial({color:'#2f86c8',transparent:true,opacity:.82,shininess:90,specular:'#aee'}));water.rotation.x=-Math.PI/2;water.position.y=WATER;g.add(water);
 // boxes
 const bg=new THREE.BoxGeometry(1,1,1),bm=new THREE.MeshLambertMaterial({color:0xffffff});
 const im=new THREE.InstancedMesh(bg,bm,boxVis.length);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3();
 boxVis.forEach((b,i)=>{ps.set((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.z0+b.z1)/2);sc.set(b.x1-b.x0,b.y1-b.y0,b.z1-b.z0);m4.compose(ps,q,sc);im.setMatrixAt(i,m4);im.setColorAt(i,c.set(b.c))});
 im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;g.add(im);
 // trees
 const trunkG=new THREE.CylinderGeometry(.22,.32,3,6);trunkG.translate(0,1.5,0);const crownG=new THREE.ConeGeometry(1.7,4.2,7);crownG.translate(0,5,0);const crown2=new THREE.ConeGeometry(1.2,3.2,7);crown2.translate(0,7.2,0);
 const tm=new THREE.InstancedMesh(trunkG,new THREE.MeshLambertMaterial({color:'#6b4a2b'}),treeList.length);
 const cm=new THREE.InstancedMesh(crownG,new THREE.MeshLambertMaterial({color:0xffffff}),treeList.length);
 const cm2=new THREE.InstancedMesh(crown2,new THREE.MeshLambertMaterial({color:0xffffff}),treeList.length);
 treeList.forEach((t,i)=>{ps.set(t.x,t.y0-.2,t.z);sc.set(t.sc,t.sc,t.sc);m4.compose(ps,q,sc);tm.setMatrixAt(i,m4);cm.setMatrixAt(i,m4);cm2.setMatrixAt(i,m4);const cc=t.kind?c.set('#3d7a44').offsetHSL(0,0,hash(i,5)*.06):c.set('#4f9a3a').offsetHSL(0,0,hash(i,9)*.08);cm.setColorAt(i,cc);cm2.setColorAt(i,cc)});
 [tm,cm,cm2].forEach(m=>{m.instanceMatrix.needsUpdate=true;g.add(m)});cm.instanceColor.needsUpdate=true;cm2.instanceColor.needsUpdate=true;
 const rm=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshLambertMaterial({color:'#8a8a85',flatShading:true}),rockList.length);
 rockList.forEach((r,i)=>{ps.set(r.x,r.y0+r.sc*.4,r.z);q.setFromEuler(new THREE.Euler(r.rot,r.rot*2,0));sc.set(r.r*1.05,r.sc*.8,r.r*1.05);m4.compose(ps,q,sc);rm.setMatrixAt(i,m4)});q.identity();g.add(rm);
 // clouds
 const cg=new THREE.BoxGeometry(1,1,1),cmat=new THREE.MeshBasicMaterial({color:'#fff',transparent:true,opacity:.85,fog:false});const clouds=new THREE.InstancedMesh(cg,cmat,40);
 const r2=mulberry32(5);for(let i=0;i<40;i++){ps.set((r2()-.5)*1400,170+r2()*60,(r2()-.5)*1400);sc.set(60+r2()*80,10+r2()*8,30+r2()*40);m4.compose(ps,q,sc);clouds.setMatrixAt(i,m4)}g.add(clouds);
 return {group:g,water,terrain};
}
export {treeList,rockList};
