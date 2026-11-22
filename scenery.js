// Scenery and ambience. Everything here is visual only: no collision, no gameplay.
//  - the island: bushes, flowers, palms on the beaches, boats beached on the sand, a surf line along the coast
//  - outside the island: a shimmering sea, distant islets, boats sailing the open water
//  - the sky above the island: flocks of birds circling
import * as THREE from 'three';
import * as W from './world.js';
import {mulberry32,clamp} from './data.js';
import {TIME} from './water.js';
import {bakeGroup} from './bake.js';

const rnd=mulberry32(4242);
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3();
const col=new THREE.Color();
const TAU=Math.PI*2;

// is (x, z) a place for a decoration on land: in the height band, away from districts, lakes, roads, buildings and steep ground
function landSpot(x,z,hMin,hMax,roadClear){
 const h=W.H(x,z);if(h<hMin||h>hMax)return false;
 for(const p of W.POIS)if(Math.hypot(x-p.x,z-p.z)<p.r*1.1)return false;
 for(const L of W.LAKES)if(Math.hypot(x-L.x,z-L.z)<L.r+3)return false;
 if(W.roadDist(x,z)<roadClear)return false;
 if(W.riverDist(x,z)<W.RIVER.ribbon+3)return false;
 for(const b of W.buildings)if(Math.abs(x-b.x)<b.w/2+2&&Math.abs(z-b.z)<b.d/2+2)return false;
 const[gx,gz]=W.slope(x,z);if(Math.hypot(gx,gz)>.6)return false;
 return true;
}
// random land spots inside the island, up to `count` of them
function scatter(count,hMin,hMax,roadClear,maxTries){
 const out=[];
 for(let t=0;t<maxTries&&out.length<count;t++){
  const a=rnd()*TAU,r=Math.sqrt(rnd())*W.ISL*.92,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(landSpot(x,z,hMin,hMax,roadClear))out.push({x,z,y:W.H(x,z),k:rnd()});
 }
 return out;
}

// a simple boat: hull, cabin, mast and sail. The bow is at +z.
function makeBoat(hullCol,sailCol){
 const g=new THREE.Group();
 const hull=new THREE.Mesh(new THREE.BoxGeometry(2.4,.9,6.4),new THREE.MeshLambertMaterial({color:hullCol}));hull.position.y=.2;g.add(hull);
 const trim=new THREE.Mesh(new THREE.BoxGeometry(2.46,.14,6.46),new THREE.MeshLambertMaterial({color:'#f2f2ee'}));trim.position.y=.62;g.add(trim);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,2.4),new THREE.MeshLambertMaterial({color:'#f4f1ea'}));cabin.position.set(0,1.2,-.6);g.add(cabin);
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,6,5),new THREE.MeshLambertMaterial({color:'#ddd'}));mast.position.set(0,3.4,.8);g.add(mast);
 const sailG=new THREE.BufferGeometry();sailG.setAttribute('position',new THREE.Float32BufferAttribute([0,6.2,.8, 0,.9,.8, 0,.9,-2.6],3));sailG.computeVertexNormals();
 const sail=new THREE.Mesh(sailG,new THREE.MeshLambertMaterial({color:sailCol,side:THREE.DoubleSide}));g.add(sail);
 bakeGroup(g);   // the hull, cabin, mast and sail become one mesh; the wake stays separate
 const wake=new THREE.Mesh(new THREE.PlaneGeometry(3.2,13),new THREE.MeshBasicMaterial({color:'#e8f6ff',transparent:true,opacity:.28,depthWrite:false}));
 wake.rotation.x=-Math.PI/2;wake.position.set(0,.06,-9.5);g.add(wake);
 return g;
}

// builds the scenery under `scene`. `water` is the sea plane from world.buildMeshes (its texture is animated).
// ---- the beach landmark: a small sandy cove on the north shore, with a beach bar, a lifeguard tower,
// umbrellas with sunbeds and palms. Decoration only (no collision), built on the flattened sand from world.js.
const frondGeo=new THREE.BoxGeometry(.26,.07,3.2);frondGeo.translate(0,0,1.6);
function makePalm(g,x,y,z){
 const lam=c=>new THREE.MeshLambertMaterial({color:c});
 const t=new THREE.Mesh(new THREE.CylinderGeometry(.16,.26,7,6),lam('#8a6a46'));
 t.position.set(x,y+3.5,z);t.rotation.set((rnd()-.5)*.2,0,(rnd()-.5)*.2);t.castShadow=true;g.add(t);
 const fm=new THREE.MeshLambertMaterial({color:'#3c9a3c',flatShading:true,side:THREE.DoubleSide});
 for(let k=0;k<7;k++){const f=new THREE.Mesh(frondGeo,fm);f.position.set(x,y+6.9,z);f.rotation.set(.5+rnd()*.2,k*TAU/7+rnd()*.4,0,'YXZ');f.castShadow=true;g.add(f)}
}
function buildBeach(parent){
 const g=new THREE.Group();parent.add(g);
 const B=W.BEACH,rb=mulberry32(77);
 const at=(dx,dz)=>{const x=B.x+dx,z=B.z+dz;return{x,z,y:W.H(x,z)}};
 const lam=c=>new THREE.MeshLambertMaterial({color:c});
 // the beach bar: a sandy hut with a thatched roof, facing the sea, with a painted sign
 const bar=at(-10,-6);
 const hut=new THREE.Mesh(new THREE.BoxGeometry(9,3.2,6),lam('#d9b27c'));hut.position.set(bar.x,bar.y+1.6,bar.z);hut.castShadow=hut.receiveShadow=true;g.add(hut);
 const thatch=new THREE.Mesh(new THREE.ConeGeometry(6.4,3.6,4),new THREE.MeshLambertMaterial({color:'#b8863e',flatShading:true}));
 thatch.rotation.y=Math.PI/4;thatch.scale.set(1,1,.72);thatch.position.set(bar.x,bar.y+5,bar.z);thatch.castShadow=true;g.add(thatch);
 const cv=document.createElement('canvas');cv.width=512;cv.height=128;const cx=cv.getContext('2d');
 cx.fillStyle='#e74c3c';cx.fillRect(0,0,512,128);cx.fillStyle='#fff';cx.font='bold 64px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('SUNSET BEACH',256,68);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));
 sign.position.set(bar.x,bar.y+2.3,bar.z+3.06);g.add(sign);
 // a lifeguard tower on the landward side
 const lg=at(20,-4);
 for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,4.2,5),lam('#f2f2f2'));leg.position.set(lg.x+sx*.9,lg.y+2.1,lg.z+sz*.9);g.add(leg)}
 const deck=new THREE.Mesh(new THREE.BoxGeometry(2.6,.25,2.6),lam('#e74c3c'));deck.position.set(lg.x,lg.y+4.3,lg.z);g.add(deck);
 const cab=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.2,1.8),lam('#f5f5f5'));cab.position.set(lg.x,lg.y+5,lg.z);g.add(cab);
 const lgRoof=new THREE.Mesh(new THREE.ConeGeometry(1.8,.9,4),lam('#e74c3c'));lgRoof.rotation.y=Math.PI/4;lgRoof.position.set(lg.x,lg.y+6,lg.z);g.add(lgRoof);
 // umbrellas with two sunbeds each, scattered over the sand
 const umb=['#e74c3c','#fafafa','#f1c40f','#2bb6e0'];
 for(let i=0;i<7;i++){
  const a=rb()*TAU,r=6+rb()*13;const p=at(Math.cos(a)*r,Math.sin(a)*r);
  if(Math.hypot(p.x-bar.x,p.z-bar.z)<8||Math.hypot(p.x-lg.x,p.z-lg.z)<6||p.y<.6)continue;
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.6,5),lam('#e8e0d0'));pole.position.set(p.x,p.y+1.3,p.z);g.add(pole);
  const canopy=new THREE.Mesh(new THREE.ConeGeometry(1.9,.9,8),lam(umb[i%umb.length]));canopy.position.set(p.x,p.y+2.75,p.z);canopy.castShadow=true;g.add(canopy);
  for(const s of[-1,1]){const bed=new THREE.Mesh(new THREE.BoxGeometry(.9,.22,2),lam('#f4f4f4'));bed.position.set(p.x+s*.95,p.y+.25,p.z);g.add(bed)}
 }
 // palms around the cove
 for(let i=0;i<6;i++){const a=rb()*TAU,r=12+rb()*12;const p=at(Math.cos(a)*r,Math.sin(a)*r);if(p.y<.6||Math.hypot(p.x-bar.x,p.z-bar.z)<8)continue;makePalm(g,p.x,p.y-.2,p.z)}
 bakeGroup(g);
}

export function buildScenery(scene,water){
 const g=new THREE.Group();scene.add(g);
 const flowersCol=['#ff6fa1','#ffd23d','#ffffff','#b59cff','#ff8a4c'];

 // ---- island decoration
 const bushes=scatter(520,2.2,26,5,14000);
 const bg=new THREE.IcosahedronGeometry(1,0);
 const bm=new THREE.InstancedMesh(bg,new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true}),bushes.length);
 bushes.forEach((b,i)=>{const s=.7+b.k*.9;ps.set(b.x,b.y+.5*s,b.z);q.identity();sc.set(s*1.2,s*.75,s*1.2);m4.compose(ps,q,sc);bm.setMatrixAt(i,m4);
  bm.setColorAt(i,col.set(i%3?'#3f8a3a':'#4d9a44').offsetHSL((b.k-.5)*.03,0,(b.k-.5)*.08))});
 bm.receiveShadow=true;bm.instanceMatrix.needsUpdate=true;bm.instanceColor.needsUpdate=true;g.add(bm);

 const flowers=scatter(1100,2.2,14,3,20000);
 const fm=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.17,0),new THREE.MeshLambertMaterial({color:0xffffff}),flowers.length);
 flowers.forEach((f,i)=>{ps.set(f.x,f.y+.22,f.z);q.identity();sc.set(1,1,1);m4.compose(ps,q,sc);fm.setMatrixAt(i,m4);fm.setColorAt(i,col.set(flowersCol[(f.k*flowersCol.length)|0]))});
 fm.instanceMatrix.needsUpdate=true;fm.instanceColor.needsUpdate=true;g.add(fm);

 // palms on the beaches: a leaning trunk and a crown of drooping fronds
 const palms=scatter(70,.9,2.4,6,12000);
 const trunkG=new THREE.CylinderGeometry(.16,.26,7,6);trunkG.translate(0,3.5,0);
 const tm=new THREE.InstancedMesh(trunkG,new THREE.MeshLambertMaterial({color:'#8a6a46'}),palms.length);
 const frondG=new THREE.BoxGeometry(.26,.07,3.2);frondG.translate(0,0,1.6);
 const fr=new THREE.InstancedMesh(frondG,new THREE.MeshLambertMaterial({color:'#3c9a3c',flatShading:true,side:THREE.DoubleSide}),palms.length*7);
 let fi=0;
 palms.forEach((p,i)=>{
  const tiltX=(rnd()-.5)*.22,tiltZ=(rnd()-.5)*.22,yaw=rnd()*TAU;
  q.setFromEuler(new THREE.Euler(tiltX,yaw,tiltZ,'YXZ'));sc.set(1,1,1);ps.set(p.x,p.y-.2,p.z);m4.compose(ps,q,sc);tm.setMatrixAt(i,m4);
  // crown position: the top of the trunk, following the tilt
  const top=new THREE.Vector3(0,6.8,0).applyQuaternion(q).add(ps);
  for(let k=0;k<7;k++){
   const fy=k*TAU/7+rnd()*.4;
   q.setFromEuler(new THREE.Euler(.5+rnd()*.2,fy,0,'YXZ'));sc.set(1,1,1);ps.copy(top);m4.compose(ps,q,sc);fr.setMatrixAt(fi++,m4);
  }
 });
 tm.instanceMatrix.needsUpdate=true;fr.instanceMatrix.needsUpdate=true;tm.castShadow=fr.castShadow=true;g.add(tm,fr);

 // boats beached on the sand
 const beached=scatter(5,1.0,2.0,8,6000);
 const beachCols=['#e2573a','#3a7bd5','#f2b632','#2fa37a','#c2466e'];
 beached.forEach((b,i)=>{const boat=makeBoat(beachCols[i%beachCols.length],'#f4f4f4');boat.remove(boat.children[boat.children.length-1]);
  boat.position.set(b.x,b.y-.2,b.z);boat.rotation.set(.1,rnd()*TAU,.12);g.add(boat)});

 // ---- the open sea: boats sailing in circles outside the island
 const boats=[];
 const boatCols=['#c03b3b','#2e6fb8','#e8e8e8','#3c8f5a','#d88a2a','#6a4fb0'];
 for(let i=0;i<7;i++){
  const boat=makeBoat(boatCols[i%boatCols.length],i%2?'#fbfbf7':'#f1e6c8');
  g.add(boat);
  boats.push({boat,R:640+rnd()*170,ang:rnd()*TAU,spd:(2.6+rnd()*2.2),dir:rnd()<.5?1:-1,ph:rnd()*TAU});
 }

 // ---- birds circling the island
 const flocks=[];let NB=0;
 for(let f=0;f<5;f++){
  const n=4+(rnd()*5|0);const birds=[];
  for(let i=0;i<n;i++){birds.push({i,ph:rnd()*TAU,idx:NB++})}
  flocks.push({birds,R:110+rnd()*210,cy:48+rnd()*34,ang:rnd()*TAU,spd:(.05+rnd()*.05)*(rnd()<.5?1:-1)});
 }
 // every bird shares three instanced meshes (body, left wing, right wing), so flying birds cost three draw calls
 const birdBody=new THREE.InstancedMesh(new THREE.BoxGeometry(.28,.22,1),new THREE.MeshBasicMaterial({color:'#2a2a30'}),NB);
 const wingG=new THREE.PlaneGeometry(1.5,.38);wingG.rotateX(-Math.PI/2);wingG.translate(.75,0,0);   // flat, pivoting at the body
 const wingMat=new THREE.MeshBasicMaterial({color:'#34343c',side:THREE.DoubleSide});
 const wingR=new THREE.InstancedMesh(wingG,wingMat,NB),wingL=new THREE.InstancedMesh(wingG,wingMat,NB);
 for(const m of[birdBody,wingR,wingL]){m.frustumCulled=false;g.add(m)}
 const _b=new THREE.Matrix4(),_w=new THREE.Matrix4(),_m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_wq=new THREE.Quaternion(),_e=new THREE.Euler(),_we=new THREE.Euler(),_p=new THREE.Vector3(),_one=new THREE.Vector3(1,1,1),_mir=new THREE.Vector3(-1,1,1),_wp=new THREE.Vector3(0,0,.1);
 // a bird's pose: its body at (x,y,z) turned by pitch and yaw, its wings flapping by `flap` about the body
 function birdPose(i,x,y,z,pitch,yaw,flap){
  _p.set(x,y,z);_q.setFromEuler(_e.set(pitch,yaw,0,'XYZ'));_b.compose(_p,_q,_one);birdBody.setMatrixAt(i,_b);
  _wq.setFromEuler(_we.set(0,0,flap));
  _w.compose(_wp,_wq,_one);wingR.setMatrixAt(i,_m.multiplyMatrices(_b,_w));
  _w.compose(_wp,_wq,_mir);wingL.setMatrixAt(i,_m.multiplyMatrices(_b,_w));
  birdBody.instanceMatrix.needsUpdate=wingR.instanceMatrix.needsUpdate=wingL.instanceMatrix.needsUpdate=true;
 }

 // ---- the beach landmark
 buildBeach(g);

 return{
  update(dt,t){
   // sea: the texture drifts, and the surf line breathes
   TIME.value=t;
   // boats: sail around the island, bobbing on the swell
   for(const b of boats){
    b.ang+=dt*b.spd/b.R*b.dir;
    const x=Math.cos(b.ang)*b.R,z=Math.sin(b.ang)*b.R;
    b.boat.position.set(x,Math.sin(t*1.1+b.ph)*.18,z);
    // heading: along the tangent of the circle
    const dx=-Math.sin(b.ang)*b.dir,dz=Math.cos(b.ang)*b.dir;
    b.boat.rotation.set(Math.sin(t*.9+b.ph)*.03,Math.atan2(dx,dz),Math.sin(t*1.3+b.ph)*.04);
   }
   // birds: each flock circles above the island, the birds in a loose V, flapping
   for(const f of flocks){
    f.ang+=dt*f.spd;
    for(const b of f.birds){
     const a=f.ang-b.i*.045,rr=f.R+(b.i%2?4:-4)*(1+b.i*.2);
     const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
     const y=f.cy+Math.sin(t*1.6+b.ph)*1.1-b.i%3*1.4;
     const dx=-Math.sin(a)*f.spd,dz=Math.cos(a)*f.spd;
     birdPose(b.idx,x,y,z,Math.sin(t*2+b.ph)*.05,Math.atan2(dx,dz),Math.sin(t*11+b.ph)*.7);
    }
   }
  }
 };
}
