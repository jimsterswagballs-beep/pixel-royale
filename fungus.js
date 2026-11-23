// Season 2: the fungus itself. Builds the props that make the corrupted places look overgrown:
// mushrooms (giant, medium, small, glowing), shelf fungi on walls and roofs, roots on the ground, glowing patches,
// rubble, mushroom rings round the loot, and drifting spores. Everything is a handful of instanced or merged meshes
// (about a dozen draw calls in all), with no lights and no per-frame allocation.
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as W from './world.js';

const TAU=Math.PI*2;
const rngOf=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};

// ---------- geometry pieces (flat shaded, painted with vertex colours: spots are lighter, undersides darker)
const prep=g=>{g=g.index?g.toNonIndexed():g;if(g.attributes.uv)g.deleteAttribute('uv');return g};
const paint=(g,v)=>{const n=g.attributes.position.count,a=new Float32Array(n*3).fill(v);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g};
function domeGeo(rad,hgt,spots){
 const top=prep(new THREE.SphereGeometry(1,8,3,0,TAU,0,Math.PI/2));top.scale(rad,hgt,rad);paint(top,.72);
 const under=prep(new THREE.CircleGeometry(rad*.98,8));under.rotateX(Math.PI/2);paint(under,.42);
 const parts=[top,under];
 for(let i=0;i<spots;i++){const a=i*2.4,rr=rad*(.22+.42*((i*37)%10)/10),y=hgt*Math.sqrt(Math.max(0,1-(rr/rad)**2))+.01;
  const s=prep(new THREE.SphereGeometry(1,5,3));s.scale(rad*.14,hgt*.08,rad*.14);s.translate(Math.cos(a)*rr,y,Math.sin(a)*rr);paint(s,1);parts.push(s)}
 return mergeGeometries(parts);
}
const stemGeo=(rt,rb,h)=>{const g=prep(new THREE.CylinderGeometry(rt,rb,h,6,1));g.translate(0,h/2,0);return g};

// an instanced set: add() writes one instance, done() fixes the count
function iset(geo,mat,max,{cast=false,color=true}={}){
 const m=new THREE.InstancedMesh(geo,mat,Math.max(1,max)),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3();
 let n=0;m.castShadow=cast;m.receiveShadow=false;
 return{mesh:m,get n(){return n},
  add(x,y,z,sc,yaw,col,tilt=0,sy=1){if(n>=max)return -1;e.set(tilt,yaw,0);q.setFromEuler(e);p.set(x,y,z);s.set(sc,sc*sy,sc);m4.compose(p,q,s);m.setMatrixAt(n,m4);if(color&&col)m.setColorAt(n,col);return n++},
  done(){m.count=n;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere()}}
}

// soft round glow, used by the ground patches
function glowTexture(){
 const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.45,'rgba(255,255,255,.4)');g.addColorStop(1,'rgba(255,255,255,0)');
 x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function buildFungus(scene){
 const sites=W.SITES;if(!sites.length)return null;
 const root=new THREE.Group();root.name='fungus';scene.add(root);
 const C=new THREE.Color(),T={value:0};

 // ---------- materials
 const stemMat=new THREE.MeshLambertMaterial({color:'#e8dcc4',flatShading:true});
 const capMat=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide});
 const glowMat=new THREE.MeshBasicMaterial({vertexColors:true});

 // ---------- the mushroom sets: 4 kinds, 7 draw calls
 const MAXG=sites.reduce((a,s)=>a+s.T.giants+2,0),MAXM=sites.reduce((a,s)=>a+s.T.mush+s.T.roof*3,0)+200,MAXS=sites.reduce((a,s)=>a+s.T.small,0)+900,MAXL=sites.reduce((a,s)=>a+s.T.glow*3,0)+200;
 const giantStem=iset(stemGeo(.6,.95,6.5),stemMat,MAXG,{cast:true,color:false}),giantCap=iset(domeGeo(3.6,2.3,7),capMat,MAXG,{cast:true});
 const midStem=iset(stemGeo(.14,.2,1.5),stemMat,MAXM,{color:false}),midCap=iset(domeGeo(.85,.55,2),capMat,MAXM);
 const smallStem=iset(stemGeo(.07,.1,.5),stemMat,MAXS+MAXL,{color:false}),smallCap=iset(domeGeo(.34,.24,0),capMat,MAXS);
 const glowCap=iset(domeGeo(.3,.26,0),glowMat,MAXL);
 [giantStem,giantCap,midStem,midCap,smallStem,smallCap,glowCap].forEach(s=>root.add(s.mesh));

 const emit=[]; // giant and medium mushrooms that let off spores now and then
 const buildingsOf=s=>W.buildings.filter(b=>Math.hypot(b.x-s.x,b.z-s.z)<s.r*1.25);
 const nearBuilding=(x,z,list,pad)=>list.some(b=>Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad);
 const capCol=(s,r)=>{C.set(s.theme.caps[(r()*3)|0]);C.offsetHSL((r()-.5)*.05+(s.hue||0),0,(r()-.5)*.1);return C};
 const glowCol=(s,r)=>{C.set(s.theme.glow[(r()*2)|0]);C.offsetHSL((r()-.5)*.04+(s.hue||0),0,0);return C};

 // a ground spot inside a site: not on a road, in a building, in water or on a cliff
 function spot(s,r,rmin,rmax,blds,pad){
  for(let t=0;t<16;t++){
   const a=r()*TAU,d=s.r*(rmin+(rmax-rmin)*Math.sqrt(r())),x=s.x+Math.cos(a)*d,z=s.z+Math.sin(a)*d,h=W.H(x,z);
   if(h<2.1||h>30||W.roadDist(x,z)<2.8||W.riverDist(x,z)<8||nearBuilding(x,z,blds,pad))continue;
   if(W.LAKES.some(L=>Math.hypot(x-L.x,z-L.z)<L.r+3))continue;
   return{x,z,y:h}}
  return null}

 const roots=[],rubble=[],patches=[],motes=[],shelves=[];

 sites.forEach((s,si)=>{
  const r=rngOf(1000+si*77),T=s.T,th=s.theme,blds=buildingsOf(s);

  // giant mushrooms: next to the buildings so their caps hang over the roofs, and some out in the open
  for(let i=0;i<T.giants;i++){
   let x,z,y;
   if(blds.length&&i%3!==2){
    const b=blds[(r()*blds.length)|0],side=(r()*4)|0,t=(r()-.5)*.8,off=2.2+r()*1.6;
    x=b.x+(side<2?(side?1:-1)*(b.w/2+off):t*b.w);z=b.z+(side>=2?(side===3?1:-1)*(b.d/2+off):t*b.d);
    y=W.H(x,z);if(y<2.1||W.roadDist(x,z)<3.2)continue}
   else{const p=spot(s,r,.15,.95,blds,3);if(!p)continue;({x,z,y}=p)}
   const sc=(.75+r()*.75)*(th.stemH>1.3?1.15:1),i1=giantStem.add(x,y-.2,z,sc,r()*TAU,null,0,th.stemH);
   giantCap.add(x,y-.2+6.5*sc*th.stemH,z,sc*th.capW,r()*TAU,capCol(s,r));
   emit.push({x,y:y+6.5*sc*th.stemH+2.3*sc,z,big:true})}

  // medium and small mushrooms scattered through the site, in clumps
  const clumps=Math.round(T.mush/4);
  for(let i=0;i<clumps;i++){
   const p=spot(s,r,.05,1,blds,1.6);if(!p)continue;
   const n=2+((r()*4)|0);
   for(let k=0;k<n;k++){
    const x=p.x+(r()-.5)*3.2,z=p.z+(r()-.5)*3.2,y=W.H(x,z);if(y<2.1||W.roadDist(x,z)<2.6||nearBuilding(x,z,blds,1.2))continue;
    const sc=.6+r()*.9,yaw=r()*TAU;
    if(r()<.45){midStem.add(x,y-.05,z,sc,yaw,null,0,th.stemH);midCap.add(x,y-.05+1.5*sc*th.stemH,z,sc*th.capW,yaw,capCol(s,r));if(k===0)emit.push({x,y:y+1.8*sc,z,big:false})}
    else{smallStem.add(x,y-.03,z,sc,yaw);smallCap.add(x,y-.03+.5*sc,z,sc,yaw,capCol(s,r))}}}
  for(let i=0;i<T.small;i++){
   const p=spot(s,r,.05,1.05,blds,1.2);if(!p)continue;const sc=.6+r()*.7,yaw=r()*TAU;
   smallStem.add(p.x,p.y-.03,p.z,sc,yaw);smallCap.add(p.x,p.y-.03+.5*sc,p.z,sc,yaw,capCol(s,r))}

  // glowing mushrooms: small clusters that shine without any light source
  for(let i=0;i<Math.round(T.glow*th.glowMul);i++){
   const p=spot(s,r,.05,1.1,blds,1.2);if(!p)continue;
   const n=3+((r()*3)|0);const col=glowCol(s,r).clone();
   for(let k=0;k<n;k++){const x=p.x+(r()-.5)*1.8,z=p.z+(r()-.5)*1.8,y=W.H(x,z),sc=.6+r()*.8,yaw=r()*TAU;
    smallStem.add(x,y-.03,z,sc,yaw);glowCap.add(x,y-.03+.5*sc,z,sc,yaw,col)}
   patches.push({x:p.x,z:p.z,y:p.y,s:2.2+r()*2.6,c:col})}

  // mushrooms on the roofs and shelf fungi on the walls
  for(const b of blds){
   const roofY=(b.top!==undefined?b.top:b.y0+b.h)+.05;
   for(let i=0;i<T.roof;i++){const x=b.x+(r()-.5)*(b.w-1.4),z=b.z+(r()-.5)*(b.d-1.4),sc=.7+r()*.9,yaw=r()*TAU;
    if(r()<.55){midStem.add(x,roofY,z,sc,yaw,null,0,th.stemH);midCap.add(x,roofY+1.5*sc*th.stemH,z,sc*th.capW,yaw,capCol(s,r))}
    else{smallStem.add(x,roofY,z,sc*1.2,yaw);smallCap.add(x,roofY+.5*sc*1.2,z,sc*1.2,yaw,capCol(s,r))}}
   const nSh=Math.round(T.shelf*th.shelf+r()*2);
   for(let i=0;i<nSh;i++){
    const side=(r()*4)|0,t=(r()-.5)*.8,y=b.y0+1.7+r()*Math.max(.5,b.h-2.6);
    let x,z,nx=0,nz=0;
    if(side<2){nx=side?1:-1;x=b.x+nx*(b.w/2+.04);z=b.z+t*b.d}else{nz=side===3?1:-1;x=b.x+t*b.w;z=b.z+nz*(b.d/2+.04)}
    if(b.door&&Math.hypot(x-b.door[0],z-b.door[1])<3.4)continue;
    shelves.push({x,y,z,nx,nz,sc:.45+r()*.8,col:capCol(s,r).clone()})}
  }

  // rings of small mushrooms round the loot spots
  for(const l of W.lootSpots){
   if(Math.hypot(l.x-s.x,l.z-s.z)>s.r*1.05||!l.chest&&r()>.35)continue;
   const n=l.chest?6:3,rad=l.inside?.9:1.7;
   for(let k=0;k<n;k++){const a=k/n*TAU+r()*.5,x=l.x+Math.cos(a)*rad*(.85+r()*.3),z=l.z+Math.sin(a)*rad*(.85+r()*.3),y=l.inside?l.y:W.H(x,z),sc=.55+r()*.6;
    if(!l.inside&&(W.roadDist(x,z)<2.4||nearBuilding(x,z,blds,.8)))continue;
    smallStem.add(x,y-.03,z,sc,r()*TAU);smallCap.add(x,y-.03+.5*sc,z,sc,r()*TAU,capCol(s,r))}}

  // roots: grow out from the buildings and the middle of the site and creep over the ground
  const nRoots=Math.round(T.roots*th.roots);
  for(let i=0;i<nRoots;i++){
   let x,z,ang=r()*TAU;
   if(blds.length&&r()<.7){const b=blds[(r()*blds.length)|0],a=r()*TAU;x=b.x+Math.cos(a)*(b.w/2+1.2);z=b.z+Math.sin(a)*(b.d/2+1.2)}
   else{const p=spot(s,r,0,.6,[],0);if(!p)continue;x=p.x;z=p.z}
   const pts=[],len=7+((r()*16)|0);let px=x,pz=z;
   for(let k=0;k<len;k++){
    const y=W.H(px,pz);if(y<2.1||W.roadDist(px,pz)<2.2||nearBuilding(px,pz,blds,.6)&&k>0)break;
    pts.push(new THREE.Vector3(px,y+.1,pz));ang+=(r()-.5)*.9;px+=Math.cos(ang)*1.7;pz+=Math.sin(ang)*1.7}
   if(pts.length>=4)roots.push({pts,rad:.2+r()*.22,tip:glowCol(s,r).clone(),base:new THREE.Color(r()<.5?'#4a2f3a':'#3a2a4a')})}

  // rubble: broken slabs of wall and floor lying round the buildings
  const nRub=Math.round(T.rubble*th.rubble);
  for(let i=0;i<nRub&&blds.length;i++){
   const b=blds[(r()*blds.length)|0],a=r()*TAU,d=1.5+r()*3.5,x=b.x+Math.cos(a)*(b.w/2+d),z=b.z+Math.sin(a)*(b.d/2+d),y=W.H(x,z);
   if(y<2.1||W.roadDist(x,z)<3)continue;
   rubble.push({x,y,z,w:1.6+r()*3.4,h:.3+r()*.6,d:.9+r()*2,rx:(r()-.5)*.9,ry:r()*TAU,rz:(r()-.5)*.9,v:.45+r()*.3})}

  // drifting spores
  for(let i=0;i<T.motes;i++){const a=r()*TAU,d=s.r*s.T.reach*.8*Math.sqrt(r()),x=s.x+Math.cos(a)*d,z=s.z+Math.sin(a)*d,h=W.H(x,z);if(h<1.8)continue;
   motes.push({x,y:h,z,ph:r(),sp:.25+r()*.5,sz:.8+r()*1.3,hue:r()});}
 });

 // finish the mushroom sets
 [giantStem,giantCap,midStem,midCap,smallStem,smallCap,glowCap].forEach(s=>s.done());

 // ---------- shelf fungi (half discs standing out of the walls)
 {
  const g=prep(new THREE.CylinderGeometry(1,1,.16,8,1,false,0,Math.PI));paint(g,1);
  const sh=iset(g,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}),Math.max(1,shelves.length));
  for(const e of shelves)sh.add(e.x,e.y,e.z,e.sc,Math.atan2(-e.nz,e.nx),e.col);
  sh.done();root.add(sh.mesh);
 }

 // ---------- roots: tubes that taper to a glowing tip and sway a little
 if(roots.length){
  const geos=[];
  for(const rt of roots){
   const curve=new THREE.CatmullRomCurve3(rt.pts,false,'catmullrom',.5),segs=rt.pts.length*2,radial=4;
   const tg=new THREE.TubeGeometry(curve,segs,rt.rad,radial,false),pos=tg.attributes.position,n=pos.count;
   const col=new Float32Array(n*3),sw=new Float32Array(n),pt=new THREE.Vector3();
   for(let i=0;i<n;i++){
    const ring=Math.floor(i/(radial+1)),u=ring/segs;curve.getPointAt(Math.min(1,u),pt);
    const k=1-.78*u;pos.setXYZ(i,pt.x+(pos.getX(i)-pt.x)*k,pt.y+(pos.getY(i)-pt.y)*k,pt.z+(pos.getZ(i)-pt.z)*k);
    C.copy(rt.base).lerp(rt.tip,Math.max(0,(u-.72)/.28));col[i*3]=C.r;col[i*3+1]=C.g;col[i*3+2]=C.b;sw[i]=u*u}
   tg.setAttribute('color',new THREE.BufferAttribute(col,3));tg.setAttribute('aSw',new THREE.BufferAttribute(sw,1));
   if(tg.attributes.uv)tg.deleteAttribute('uv');geos.push(tg)}
  const rm=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
  rm.onBeforeCompile=sh=>{sh.uniforms.uT=T;
   sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aSw;\nuniform float uT;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.xz+=vec2(sin(uT*1.3+position.x*.5+position.z*.4),cos(uT*1.1+position.z*.5-position.x*.3))*aSw*.16;transformed.y+=sin(uT*1.7+position.x*.6)*aSw*.05;')};
  const mesh=new THREE.Mesh(mergeGeometries(geos),rm);mesh.frustumCulled=false;mesh.receiveShadow=false;root.add(mesh);
 }

 // ---------- rubble (static, one mesh)
 if(rubble.length){
  const geos=rubble.map(e=>{const g=prep(new THREE.BoxGeometry(e.w,e.h,e.d));paint(g,e.v);g.rotateX(e.rx);g.rotateZ(e.rz);g.rotateY(e.ry);g.translate(e.x,e.y+e.h*.4,e.z);return g});
  const m=new THREE.Mesh(mergeGeometries(geos),new THREE.MeshLambertMaterial({color:'#9a90a8',vertexColors:true,flatShading:true}));m.castShadow=true;m.receiveShadow=true;root.add(m);
 }

 // ---------- glowing patches on the ground
 const patchMat=new THREE.MeshBasicMaterial({map:glowTexture(),transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending});
 if(patches.length){
  const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
  const pm=iset(g,patchMat,patches.length);
  for(const p of patches)pm.add(p.x,p.y+.09,p.z,p.s,0,p.c);
  pm.done();pm.mesh.renderOrder=3;root.add(pm.mesh);
 }

 // ---------- spores: one Points object, moved entirely on the GPU
 let sporeMat=null;
 if(motes.length){
  const n=motes.length,pos=new Float32Array(n*3),att=new Float32Array(n*4);
  motes.forEach((m,i)=>{pos.set([m.x,m.y,m.z],i*3);att.set([m.ph,m.sp,m.sz,m.hue],i*4)});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aS',new THREE.BufferAttribute(att,4));
  sporeMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uT:T},
   vertexShader:`uniform float uT;attribute vec4 aS;varying vec3 vC;varying float vA;
    void main(){
     vec3 p=position;float ph=aS.x*6.2831;
     float h=mod(uT*aS.y+aS.x*9.0,9.0);p.y+=h+.3;p.x+=sin(uT*.4+ph)*1.3;p.z+=cos(uT*.33+ph*1.3)*1.3;
     vec4 mv=modelViewMatrix*vec4(p,1.0);float d=-mv.z;
     float life=smoothstep(0.0,1.2,h)*(1.0-smoothstep(6.5,9.0,h));
     vA=life*(1.0-smoothstep(55.0,110.0,d))*step(0.0,d);
     vC=aS.w<.34?vec3(.55,1.,.45):aS.w<.67?vec3(.4,.95,1.):vec3(.95,.55,1.);
     gl_PointSize=clamp(aS.z*210.0/max(d,1.0),1.5,26.0);gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`varying vec3 vC;varying float vA;void main(){float r=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,.15,r)*vA*.75;if(a<.01)discard;gl_FragColor=vec4(vC,a);}`});
  const pts=new THREE.Points(g,sporeMat);pts.frustumCulled=false;pts.renderOrder=4;root.add(pts);
 }

 // ---------- per-frame
 let acc=0;
 const api={
  boost:0,root,count:{giants:giantCap.n,mid:midCap.n,small:smallCap.n,glow:glowCap.n,shelves:shelves.length,roots:roots.length,rubble:rubble.length,patches:patches.length,motes:motes.length},
  update(dt,t,cam,fx){
   T.value=t;
   const bo=api.boost||0;   // ambience.js: the gloomier it gets, the brighter the glowing mushrooms shine
   glowMat.color.setScalar((.88+.12*Math.sin(t*2.1))*(1+.55*bo));
   patchMat.opacity=(.5+.18*Math.sin(t*1.4))*(1+.6*bo);
   if(fx&&emit.length){acc+=dt;
    if(acc>.6){acc=0;
     for(let k=0;k<8;k++){const e=emit[(Math.random()*emit.length)|0];
      if(Math.abs(e.x-cam.x)+Math.abs(e.z-cam.z)>85)continue;
      const n=e.big?4:2;
      for(let i=0;i<n;i++)fx.puff(e.x+(Math.random()-.5)*(e.big?4:1),e.y,e.z+(Math.random()-.5)*(e.big?4:1),(Math.random()-.5)*.8,.6+Math.random()*.8,(Math.random()-.5)*.8,Math.random()<.5?'#dfffb0':'#c8f0ff',2.4,e.big?1.5:.8,1.4,.4,-.05,.9);
      break}}}
  }
 };
 return api;
}
