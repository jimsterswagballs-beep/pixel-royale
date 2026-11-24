// Starter Island (v41 remake): a floating, Fortnite-style island in the sky above the sea.
// The plaza has a sign arch, a dance stage, bunting, lamp posts, a campfire, shop huts and training dummies.
// The party's Battle Bus is parked on a runway at the north edge. "Play" flies it north towards the real map,
// which is drawn as a distant floating island so the flight has a destination (see App.boardThen).
import * as THREE from 'three';
import {charTex,artKey,makeBusModel} from './shared.js';

const ISLAND_R=50;               // walkable radius (the land and its floating base reach a little further)
const SEA_Y=-24;                 // the sea sits well below, so the island floats above it
const PLAZA_H=3.2;               // height of the flat plaza
const BUS_Z=-33;                 // the bus waits on the runway at the north edge
const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const hash=(i,j)=>{let h=Math.imul(i,374761393)^Math.imul(j,668265263);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967295};
const vnoise=(x,z)=>{const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
 const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v};

// the land height: a flat plaza, a round hill to the west, a dune to the south-east, sandy beaches sinking into the sea
export function islandH(x,z){
 const r=Math.hypot(x,z);
 let h=PLAZA_H-3.6*sstep(38,54,r);
 h+=4.2*(1-sstep(7,19,Math.hypot(x+20,z-6)));       // hill
 h+=1.6*(1-sstep(4,14,Math.hypot(x-24,z+18)));      // dune
 h+=(vnoise(x*.09+3,z*.09+7)-.5)*.9*sstep(10,22,r)*(1-sstep(40,50,r));
 return h}

// ---------- materials and little textures
const matCache={};
const P=(c,emi)=>{const k=c+'|'+(emi||'');return matCache[k]||(matCache[k]=new THREE.MeshLambertMaterial(Object.assign({color:c,flatShading:true},emi?{emissive:emi,emissiveIntensity:.7}:{})))};
function canvasTex(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t}
function rrect(x,X,Y,W,H,R){x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath()}
function labelTex(text,w,h,c1,c2,fg){return canvasTex(w,h,(x)=>{
 const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,c1);g.addColorStop(1,c2);x.fillStyle=g;rrect(x,8,8,w-16,h-16,h*.22);x.fill();
 x.lineWidth=h*.06;x.strokeStyle='#ffffff';x.stroke();
 x.font=`bold ${Math.round(h*.46)}px Arial Black, Arial`;x.textAlign='center';x.textBaseline='middle';
 x.lineWidth=h*.09;x.strokeStyle='rgba(0,0,0,.65)';x.strokeText(text,w/2,h/2+2);x.fillStyle=fg;x.fillText(text,w/2,h/2+2)})}
function stoneTex(){const t=canvasTex(128,128,(x)=>{x.fillStyle='#cdd2d8';x.fillRect(0,0,128,128);
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){const v=hash(i,j)*16-8;x.fillStyle=`rgb(${200+v},${206+v},${214+v})`;x.fillRect(i*32+2,j*32+2,28,28)}});
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t}
// a name label that always faces the camera (canvas texture on a sprite)
function nameTag(name,col){
 const cv=document.createElement('canvas');cv.width=256;cv.height=64;const x=cv.getContext('2d');
 const label=String(name||'Player').slice(0,16);
 x.font='bold 26px Arial Black, Arial';x.textAlign='center';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle='rgba(0,0,0,.85)';
 x.strokeText(label,128,34);x.fillStyle=col||'#ffffff';x.fillText(label,128,34);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));
 s.scale.set(3,.75,1);s.position.y=2.45;return s}
const mesh=(geo,m,x,y,z,sc)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(sc)o.scale.set(sc[0],sc[1],sc[2]);o.castShadow=o.receiveShadow=true;return o};

// shared geometry
const G={
 trunk:new THREE.CylinderGeometry(.2,.3,1,7),
 canopy:new THREE.IcosahedronGeometry(1,1),
 bush:new THREE.IcosahedronGeometry(1,0),
 leaf:(()=>{const g=new THREE.ConeGeometry(.55,3.2,4);g.rotateX(Math.PI/2);return g})(),
 rock:new THREE.DodecahedronGeometry(1,0),
 flame:new THREE.ConeGeometry(.32,1.1,6),
 cone:new THREE.ConeGeometry(1,1,16),
 box:new THREE.BoxGeometry(1,1,1),
 pole:new THREE.CylinderGeometry(.08,.08,1,6),
 flag:new THREE.PlaneGeometry(.5,.6),
};
const GREENS=['#4fb63f','#5cc84a','#3f9f36','#79d65a'];

export class StarterIsland{
 constructor(renderer,input){
  this.renderer=renderer;this.input=input;
  this.scene=new THREE.Scene();
  this.scene.fog=new THREE.Fog('#b9dcf5',120,760);
  this.camera=new THREE.PerspectiveCamera(50,1,.1,1400);
  this.camYaw=0;this.camPos=new THREE.Vector3(0,6,12);
  this.t=0;this.heroYaw=Math.PI;this.dance=0;this.char=null;this.view='front';this.boardT=null;this.onBoard=null;
  this.crowd=[];this.flames=[];this.lamps=[];this.flags=[];this.hero=new THREE.Group();this.scene.add(this.hero);
  this.buildLights();this.buildSky();this.buildIsland();this.buildPlaza();this.buildTrees();this.buildDecor();this.buildBus();this.buildBackdrop();this.buildHero();
  this.reset();
 }

 buildLights(){
  this.scene.add(new THREE.HemisphereLight('#dcecff','#76865c',1.25));
  const sun=new THREE.DirectionalLight('#ffeac4',2);sun.position.set(60,90,40);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-60;sc.right=60;sc.top=60;sc.bottom=-60;sc.near=1;sc.far=400;sc.updateProjectionMatrix();
  sun.shadow.bias=-5e-4;sun.shadow.normalBias=.4;this.scene.add(sun);this.scene.add(sun.target);
 }

 buildSky(){
  const mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
   vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec3 vP;void main(){vec3 d=normalize(vP);float h=d.y;vec3 top=vec3(.2,.48,.92),hz=vec3(.725,.863,.961),bot=vec3(.75,.88,.95);vec3 c=h>0.?mix(hz,top,pow(h,.6)):mix(hz,bot,min(1.,-h*3.));gl_FragColor=vec4(c,1.);}'});
  this.sky=new THREE.Mesh(new THREE.SphereGeometry(1000,24,16),mat);this.scene.add(this.sky);
  // a sun disc and a few slow clouds
  const sunDisc=new THREE.Mesh(new THREE.CircleGeometry(60,32),new THREE.MeshBasicMaterial({color:'#fff6d8',fog:false,transparent:true,opacity:.9}));
  sunDisc.position.set(-300,380,-620);sunDisc.lookAt(0,0,0);this.scene.add(sunDisc);
  this.clouds=[];const cm=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.85,fog:false});
  for(let i=0;i<12;i++){const c=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),cm);
   const a=i/12*6.283+hash(i,3),d=240+hash(i,5)*240;c.position.set(Math.cos(a)*d,-30+hash(i,9)*70,Math.sin(a)*d);
   c.scale.set(60+hash(i,1)*90,10+hash(i,2)*8,30+hash(i,4)*40);this.scene.add(c);this.clouds.push(c)}
 }

 // the ground: a grass-and-sand disc, and a stone-coloured floating base hanging underneath
 buildIsland(){
  const seg=120,size=124;const geo=new THREE.PlaneGeometry(size,size,seg,seg);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,col=new Float32Array(pos.count*3),c=new THREE.Color();
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),z=pos.getZ(i),h=islandH(x,z);pos.setY(i,h);
   const sl=Math.hypot(islandH(x+.6,z)-islandH(x-.6,z),islandH(x,z+.6)-islandH(x,z-.6))/1.2;
   if(h<.7)c.set('#f0dca0').lerp(new THREE.Color('#dcc27e'),vnoise(x*.3,z*.3));
   else if(sl>.6)c.set('#948e82').lerp(new THREE.Color('#6f6a60'),vnoise(x*.3,z*.3));
   else c.set(GREENS[0]).lerp(new THREE.Color('#3f9a36'),vnoise(x*.15+4,z*.15)).lerp(new THREE.Color('#a6dd62'),vnoise(x*.4,z*.4+9)*.5);
   col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
  const land=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));land.receiveShadow=true;this.scene.add(land);
  // floating base: a big inverted rock cone with a darker lower cone, and stalactites
  // the main base: a cone 27 high, its flat top at y = -1.5 and its tip at y = -28.5
  const base=new THREE.Mesh(new THREE.ConeGeometry(53,27,18),P('#7a6650'));base.rotation.x=Math.PI;base.position.set(0,-15,0);base.castShadow=true;this.scene.add(base);
  const under=new THREE.Mesh(new THREE.ConeGeometry(18,14,12),P('#5a4a3a'));under.rotation.x=Math.PI;under.position.set(4,-19,-3);this.scene.add(under);
  for(let i=0;i<12;i++){const a=hash(i,21)*6.283,d=22+hash(i,22)*18;const s=2+hash(i,23)*4;
   const st=new THREE.Mesh(new THREE.ConeGeometry(1.4,s,6),P('#6b5a44'));st.rotation.x=Math.PI;st.position.set(Math.cos(a)*d,-16-hash(i,24)*5,Math.sin(a)*d);this.scene.add(st)}
  // the sea (far below the island)
  const water=new THREE.Mesh(new THREE.CircleGeometry(700,48),new THREE.MeshPhongMaterial({color:'#2f86c8',transparent:true,opacity:.9,shininess:90,specular:'#aee'}));
  water.rotation.x=-Math.PI/2;water.position.y=SEA_Y;this.scene.add(water);this.water=water;
  // the pad under the hero
  const ring=new THREE.Mesh(new THREE.RingGeometry(3.4,4.1,48),new THREE.MeshBasicMaterial({color:'#2ad4ff',transparent:true,opacity:.8,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=islandH(0,0)+.06;this.scene.add(ring);this.padRing=ring;
 }

 // the plaza: stone tiles, the sign arch, the dance stage, bunting and lamp posts
 buildPlaza(){
  const tex=stoneTex();
  const plaza=new THREE.Mesh(new THREE.CircleGeometry(14,40),new THREE.MeshLambertMaterial({map:tex}));
  plaza.rotation.x=-Math.PI/2;plaza.position.y=PLAZA_H+.05;plaza.receiveShadow=true;this.scene.add(plaza);
  // sign arch to the north, facing the player and the bus
  const signX=0,signZ=-11,gy=PLAZA_H;
  for(const sx of[-5.2,5.2]){const p=mesh(G.box,P('#5a4a6a'),sx,gy+2.2,signZ,[.5,4.4,.5]);this.scene.add(p)}
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(11,2.9),new THREE.MeshBasicMaterial({map:labelTex('PIXEL ROYALE',1024,270,'#7b3fe4','#2a7fe0','#ffffff'),transparent:true,side:THREE.DoubleSide}));
  sign.position.set(signX,gy+4.5,signZ);this.scene.add(sign);
  // the dance stage east of the spawn, with a glowing front strip
  const stage=mesh(G.box,P('#e8e0d0'),12,gy+.45,8,[9,.9,6]);this.scene.add(stage);
  const strip=mesh(G.box,P('#ff5ad6','#ff3dc8'),12,gy+.5,4.95,[8.6,.18,.12]);this.scene.add(strip);this.stageStrip=strip;
  for(const[sx,sz]of[[8.4,5.4],[15.6,5.4],[8.4,10.6],[15.6,10.6]]){const p=mesh(G.box,P('#5a4a6a'),sx,gy+.4,sz,[.35,.8,.35]);this.scene.add(p)}
  // bunting strung between poles around the plaza
  const poles=[];for(let k=0;k<6;k++){const a=k/6*6.283+.3;const x=Math.cos(a)*13,z=Math.sin(a)*13;const y=islandH(x,z);
   const p=mesh(G.pole,P('#5a4a6a'),x,y+1.9,z,[1,3.8,1]);this.scene.add(p);poles.push({x,y,z})}
  const flagCols=['#ff5a5f','#ffd23d','#4adf7a','#4a9aff','#c05aff','#ff9a3a'];
  for(let k=0;k<6;k++){const a=poles[k],b=poles[(k+1)%6];
   for(let u=0;u<=1.001;u+=1/7){const x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;const y=(a.y+(b.y-a.y)*u)+3.5-Math.sin(u*Math.PI)*.9;
    const f=new THREE.Mesh(G.flag,new THREE.MeshBasicMaterial({color:flagCols[(k+Math.round(u*7))%flagCols.length],side:THREE.DoubleSide}));
    f.position.set(x,y,z);f.rotation.y=Math.atan2(b.x-a.x,b.z-a.z)+Math.PI/2;this.scene.add(f);this.flags.push(f)}}
  // lamp posts around the plaza
  for(let k=0;k<8;k++){const a=k/8*6.283+.2;const x=Math.cos(a)*11.5,z=Math.sin(a)*11.5;const y=islandH(x,z);
   this.scene.add(mesh(G.pole,P('#3a3a44'),x,y+1.6,z,[1,3.2,1]));
   const lamp=new THREE.Mesh(new THREE.SphereGeometry(.34,8,6),P('#ffe9a0','#ffd060'));lamp.position.set(x,y+3.3,z);this.scene.add(lamp);this.lamps.push(lamp)}
  // benches
  for(let k=0;k<4;k++){const a=k/4*6.283+.8;const x=Math.cos(a)*9,z=Math.sin(a)*9;const y=islandH(x,z);
   const b=new THREE.Group();b.position.set(x,y,z);b.rotation.y=-a+Math.PI/2;this.scene.add(b);
   const seat=mesh(G.box,P('#a8713a'),0,.55,0,[2.4,.2,.8]);b.add(seat);
   for(const lx of[-1,1])b.add(mesh(G.box,P('#5a3a1e'),lx*1,.25,0,[.2,.5,.7]));
   const back=mesh(G.box,P('#a8713a'),0,.95,-.35,[2.4,.6,.15]);b.add(back)}
 }

 // round, bright trees and palms like the Battle Bus island, and bushes and flowers
 buildTrees(){
  const trunkMat=P('#8a5a2b');
  for(let i=0;i<46;i++){
   const a=hash(i,1)*6.283,r=20+hash(i,2)*27;const x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(r<18||islandH(x,z)<1.2||(Math.abs(x)<7&&z<-24)||(Math.abs(x-12)<9&&Math.abs(z-6)<9))continue;
   const s=.8+hash(i,3)*.6,y=islandH(x,z),g=new THREE.Group();g.position.set(x,y,z);this.scene.add(g);
   const th=3.2*s;g.add(mesh(G.trunk,trunkMat,0,th/2,0,[s,th,s]));
   const cm=P(GREENS[(hash(i,4)*GREENS.length)|0]);
   for(let k=0;k<3;k++){const o=new THREE.Vector3(hash(i,10+k)-.5,0,hash(i,20+k)-.5).multiplyScalar(1.3*s);
    g.add(mesh(G.canopy,cm,o.x,th+1.2*s+hash(i,30+k)*.6*s,o.z,[2.1*s,1.8*s,2.1*s]))}
  }
  // palms along the beach
  const palmLeaf=P('#3f9a3a');
  for(let i=0;i<10;i++){const a=i/10*6.283+.3,r=44+hash(i,40)*4;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(z<-44&&Math.abs(x)<8)continue;
   const s=.9+hash(i,41)*.3,g=new THREE.Group();g.position.set(x,islandH(x,z),z);this.scene.add(g);
   const lean=(hash(i,42)-.5)*.35;
   g.add(mesh(G.trunk,P('#8a5a2b'),lean,2.75*s,0,[.8*s,5.5*s,.8*s]));
   const top=new THREE.Group();top.position.set(lean*2*s,5.5*s,0);g.add(top);
   for(let k=0;k<6;k++){const piv=new THREE.Group();piv.rotation.y=k/6*6.283;piv.rotation.x=-.35;
    const lf=mesh(G.leaf,palmLeaf,0,0,1.6*s,[s,s,s]);piv.add(lf);top.add(piv)}}
  // rocks on the shore
  for(let i=0;i<22;i++){const a=i/22*6.283+hash(i,7)*.4,d=46+hash(i,8)*6;const x=Math.cos(a)*d,z=Math.sin(a)*d;
   const s=.9+hash(i,11)*1.5;const m=mesh(G.rock,P('#8a8a85'),x,islandH(x,z)+s*.15,z,[s,s*.7,s]);m.rotation.set(hash(i,2)*3,hash(i,4)*3,0);this.scene.add(m)}
  // bushes and flower patches
  for(let i=0;i<26;i++){const a=hash(i,50)*6.283,r=16+hash(i,51)*32;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(islandH(x,z)<1||(Math.abs(x)<7&&z<-24))continue;
   const s=.8+hash(i,52)*.8;this.scene.add(mesh(G.bush,P(GREENS[(hash(i,53)*GREENS.length)|0]),x,islandH(x,z)+.5*s,z,[1.3*s,.9*s,1.3*s]))}
  const petals=['#ff6ea8','#ffd23d','#ffffff','#8ab4ff'];
  for(let i=0;i<30;i++){const a=hash(i,60)*6.283,r=18+hash(i,61)*28;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(islandH(x,z)<1||(Math.abs(x)<7&&z<-24))continue;
   for(let k=0;k<3;k++){const fx=x+(hash(i,62+k)-.5)*1.2,fz=z+(hash(i,70+k)-.5)*1.2;this.scene.add(mesh(G.bush,P(petals[(i+k)%petals.length]),fx,islandH(fx,fz)+.2,fz,[.3,.3,.3]))}}
 }

 // campfire, shop huts, crates and the training dummies
 buildDecor(){
  // campfire with logs and three flickering flames
  const fx=-6,fz=10,fy=islandH(fx,fz);const fire=new THREE.Group();fire.position.set(fx,fy,fz);this.scene.add(fire);
  for(let k=0;k<4;k++){const a=k/4*6.283;const log=mesh(G.box,P('#6a4226'),Math.cos(a)*.5,.15,Math.sin(a)*.5,[.9,.25,.25]);log.rotation.y=a;fire.add(log)}
  for(let k=0;k<3;k++){const f=mesh(G.flame,P(k%2?'#ffd23d':'#ff7a1a','#ff8a00'),(k-1)*.2,.6,(k%2)*.15-.05,[1,1,1]);fire.add(f);this.flames.push({m:f,k})}
  // shop huts with striped awnings and signs
  this.hut(26,8,-Math.PI/2,'#e8d9b8','#8a4b3a','ITEM SHOP','#ffd23d');
  this.hut(26,-3,-Math.PI/2,'#d9e4ee','#3f5f8a','LOCKERS','#7fe0ff');
  // crates and barrels by the runway
  for(const[x,z]of[[-6,-27],[-5,-24.5],[5.5,-27],[6,-22]]){const y=islandH(x,z);this.scene.add(mesh(G.box,P('#b7874e'),x,y+.5,z,[1.2,1.0,1.2]))}
  for(const[x,z]of[[-5.8,-25.8]])this.scene.add(mesh(G.box,P('#b7874e'),x,islandH(x,z)+1.5,z,[1.1,1,1.1]));
  // training dummies, with targets
  for(const[x,z]of[[12,-14],[14.5,-12],[16.5,-16]]){const y=islandH(x,z);
   this.scene.add(mesh(new THREE.CylinderGeometry(.4,.4,1.7,10),P('#e8d9b8'),x,y+.85,z));
   const tg=new THREE.Mesh(new THREE.CircleGeometry(.36,24),new THREE.MeshBasicMaterial({color:'#e2432b'}));tg.position.set(x,y+1.3,z+.41);this.scene.add(tg)}
 }

 // a shop hut: walls, a pyramid roof, a striped awning and a sign. rot turns its front to the plaza.
 hut(x,z,rot,wall,roof,label,signCol){
  const y=islandH(x,z),g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;this.scene.add(g);
  g.add(mesh(G.box,P(wall),0,1.5,0,[5,3,4.4]));
  const r=new THREE.Mesh(new THREE.ConeGeometry(4.2,2.3,4),P(roof));r.rotation.y=Math.PI/4;r.position.y=4.1;r.castShadow=true;g.add(r);
  g.add(mesh(G.box,P('#5a3418'),0,1,2.22,[1,2,.12]));
  g.add(mesh(G.box,P('#bfe8ff'),-1.9,1.9,2.22,[1.2,1,.12]));g.add(mesh(G.box,P('#bfe8ff'),1.9,1.9,2.22,[1.2,1,.12]));
  for(let k=0;k<6;k++)g.add(mesh(G.box,P(k%2?'#ffffff':'#ff5a5f'),-2.5+k*1,3.2,2.7,[1,.4,.9]));
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.9),new THREE.MeshBasicMaterial({map:labelTex(label,512,128,signCol,'#2a2a3a','#1b1b26'),transparent:true,side:THREE.DoubleSide}));
  sign.position.set(0,3.8,2.5);g.add(sign);
  return g}

 buildBus(){
  this.bus=makeBusModel();this.busGroup=this.bus.group;this.busProp=this.bus.prop;
  this.busGroup.scale.setScalar(1.05);this.scene.add(this.busGroup);
  // parked on the north runway, nose towards the sea
  this.busHome=new THREE.Vector3(0,islandH(0,BUS_Z)+1.9,BUS_Z);
  this.busGroup.rotation.y=Math.PI;
  // runway with white lane markings and a few chevrons
  const strip=new THREE.Mesh(G.box,P('#4b4f58'));strip.scale.set(6,.3,18);strip.position.set(0,islandH(0,BUS_Z)+.02,BUS_Z);strip.receiveShadow=true;this.scene.add(strip);
  for(let k=0;k<5;k++){const d=mesh(G.box,P('#f2f2f2'),0,islandH(0,BUS_Z)+.2,BUS_Z-7.5+k*3.6,[.25,.05,1.4]);this.scene.add(d)}
  for(const sx of[-3.2,3.2]){const e=mesh(G.box,P('#ffd23d'),sx,islandH(0,BUS_Z)+.2,BUS_Z,[.2,.06,17]);this.scene.add(e)}
 }

 // the real map, far away on the flight path: a floating island of green hills and a city with a red tower.
 // The bus flies at it when Play is pressed, so the trip has a destination.
 buildBackdrop(){
  const g=new THREE.Group();g.position.set(0,0,-420);this.scene.add(g);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(120,118,3,40),P('#6cc24a'));top.position.y=1.5;top.receiveShadow=true;g.add(top);
  const ring=new THREE.Mesh(new THREE.RingGeometry(60,66,48),P('#4b4f58'));ring.rotation.x=-Math.PI/2;ring.position.y=3.05;g.add(ring);
  const base=new THREE.Mesh(new THREE.ConeGeometry(118,60,24),P('#7a6650'));base.rotation.x=Math.PI;base.position.y=3-30;g.add(base);
  for(let i=0;i<16;i++){const a=hash(i,80)*6.283,d=30+hash(i,81)*70;const h=new THREE.Mesh(G.canopy,P(GREENS[i%GREENS.length]));h.scale.set(18,8,18);h.position.set(Math.cos(a)*d,3,Math.sin(a)*d);g.add(h)}
  const cols=['#e9e4d6','#cfd6dd','#9aa6b2','#f2c46b','#ffffff'];
  for(let i=0;i<70;i++){const a=hash(i,90)*6.283,d=hash(i,91)*60;const w=4+hash(i,92)*4,hh=6+hash(i,93)*20;
   const b=new THREE.Mesh(G.box,P(cols[i%cols.length]));b.scale.set(w,hh,w);b.position.set(Math.cos(a)*d,3+hh/2,Math.sin(a)*d);b.castShadow=true;g.add(b)}
  const tower=new THREE.Mesh(G.box,P('#ff5a5f','#ff2a3a'));tower.scale.set(12,64,12);tower.position.set(0,35,0);tower.castShadow=true;g.add(tower);
  // two small islands further out
  for(const[x,z,s]of[[-200,-120,1],[150,-170,.7]]){const m=new THREE.Group();m.position.set(x,0,z);m.scale.setScalar(s);this.scene.add(m);
   const t=new THREE.Mesh(new THREE.CylinderGeometry(40,38,3,24),P('#6cc24a'));t.position.y=1.5;m.add(t);
   const b=new THREE.Mesh(new THREE.ConeGeometry(38,22,16),P('#7a6650'));b.rotation.x=Math.PI;b.position.y=3-11;m.add(b)}
 }

 buildHero(){
  this.heroSprite=new THREE.Group();this.hero.add(this.heroSprite);
  this.heroMat=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.35,side:THREE.DoubleSide});
  this.heroPlane=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),this.heroMat);this.heroPlane.position.y=.88;this.heroSprite.add(this.heroPlane);
  this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.6,20),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.32,depthWrite:false}));
  this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.04;this.scene.add(this.shadow);
 }

 setChar(id){
  this.char=id;this.heroMat.map=charTex(id,this.view);this.heroMat.needsUpdate=true;
 }
 setView(v){
  if(v===this.view)return;this.view=v;this.heroMat.map=charTex(this.char,v);this.heroMat.needsUpdate=true;
 }

 reset(){
  this.boardT=null;this.onBoard=null;this.hero.visible=true;this.busGroup.visible=true;
  this.busGroup.position.copy(this.busHome);this.busGroup.position.y=this.busHome.y;
  this.hero.position.set(0,islandH(0,0),0);this.heroYaw=Math.PI;
 }

 // Play pressed: the bus drives off with the hero aboard; onDone runs when the animation is over
 board(onDone){
  this.boardT=0;this.onBoard=onDone;this.busGroup.position.copy(this.busHome);this.busGroup.visible=true;
 }

 update(dt,charId){
  if(charId!==this.char)this.setChar(charId);
  this.t+=dt;
  const keys=this.input.keys,pr=this.input.pr;
  // mouse turns the camera: moving the mouse (pointer locked) or dragging across the island
  const look=this.input.takeLook(),drag=this.input.takeDrag();
  const sens=(this.input.app&&this.input.app.settings&&this.input.app.settings.sens)||1;
  this.camYaw-=(look.dx+drag)*.0022*sens;
  // boarding animation (unchanged): the bus runs north along the runway, lifts off and flies towards the real map
  if(this.boardT!==null){
   this.boardT+=dt;const p=this.boardT;
   const v=4+p*p*16;
   this.busGroup.position.z-=v*dt;this.busGroup.position.y+=dt*p*1.2;
   if(p>.9)this.hero.visible=false;
   const bp=this.busGroup.position;
   this.camPos.lerp(new THREE.Vector3(bp.x,bp.y+6,bp.z+18),Math.min(1,dt*3));
   this.camera.position.copy(this.camPos);this.camera.lookAt(bp.x,bp.y+1.5,bp.z);
   this.sky.position.copy(this.camera.position);
   if(p>2.4){const cb=this.onBoard;this.boardT=null;this.onBoard=null;if(cb)cb()}
   this.animateWorld(dt);return;
  }
  // walk relative to the camera
  const f=(this.input.down('fwd')?1:0)-(this.input.down('back')?1:0);
  const s=(this.input.down('right')?1:0)-(this.input.down('left')?1:0);
  let dx=-Math.sin(this.camYaw)*f+Math.cos(this.camYaw)*s,dz=-Math.cos(this.camYaw)*f-Math.sin(this.camYaw)*s;
  const len=Math.hypot(dx,dz);
  if(len>.01){
   dx/=len;dz/=len;
   const sp=5.8*(this.input.down('sprint')?1.6:1)*(this.dance>0?0:1);
   this.hero.position.x+=dx*sp*dt;this.hero.position.z+=dz*sp*dt;
   const target=Math.atan2(-dx,-dz);let d=target-this.heroYaw;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;
   this.heroYaw+=d*Math.min(1,dt*12);
  }
  if(pr.has('KeyG')&&this.dance<=0)this.dance=1.6;
  if(this.dance>0)this.dance-=dt;
  // stay on the island
  const hr=Math.hypot(this.hero.position.x,this.hero.position.z);
  if(hr>ISLAND_R){const k=ISLAND_R/hr;this.hero.position.x*=k;this.hero.position.z*=k}
  const hx=this.hero.position.x,hz=this.hero.position.z;
  const groundY=islandH(hx,hz);
  const bob=len>.01?Math.abs(Math.sin(this.t*9))*.12:Math.sin(this.t*2)*.03;
  const hop=this.dance>0?Math.abs(Math.sin(this.t*9))*.6:0;
  this.hero.position.y=groundY+hop;
  this.heroSprite.position.y=bob;
  this.hero.rotation.y=0;
  this.shadow.position.set(hx,groundY+.04,hz);
  // the sprite faces the camera; its view (front / side / back) follows where the hero is facing
  const cx=this.camera.position.x,cz=this.camera.position.z;
  const toCam=Math.atan2(cx-hx,cz-hz);
  this.heroSprite.rotation.y=toCam;
  const fx=-Math.sin(this.heroYaw),fz=-Math.cos(this.heroYaw);
  const tcx=Math.sin(toCam),tcz=Math.cos(toCam);
  const facing=fx*tcx+fz*tcz;
  const view=facing>.55?'front':facing<-.55?'back':'side';
  this.setView(view);
  this.heroPlane.scale.x=(view==='side'&&fx*tcz-fz*tcx<0)?-1:1;
  // third-person camera behind the hero
  const want=new THREE.Vector3(hx+Math.sin(this.camYaw)*7,groundY+3.2,hz+Math.cos(this.camYaw)*7);
  this.camPos.lerp(want,Math.min(1,dt*8));
  this.camera.position.copy(this.camPos);
  this.camera.lookAt(hx,groundY+1.5,hz);
  this.sky.position.copy(this.camera.position);
  this.animateWorld(dt);
 }

 // ---- crowd: the other players, standing and wandering on the island during the intermission
 setCrowd(list){
  this.clearCrowd();
  const geo=this.crowdGeo||(this.crowdGeo=new THREE.PlaneGeometry(2.1,2.1));
  for(const p of list){
   const g=new THREE.Group();
   const mat=new THREE.MeshBasicMaterial({map:charTex(artKey(p.char,p.cos),'front'),transparent:true,alphaTest:.35,side:THREE.DoubleSide});
   const plane=new THREE.Mesh(geo,mat);plane.position.y=.88;g.add(plane);
   const tag=nameTag(p.name,p.nameColor||(p.cos&&p.cos.nameColor));g.add(tag);
   const s=this.spot();g.position.set(s.x,islandH(s.x,s.z),s.z);this.scene.add(g);
   this.crowd.push({g,plane,tag,mat,x:s.x,z:s.z,tx:s.x,tz:s.z,wait:Math.random()*2,speed:1.6+Math.random()*1.2,ph:Math.random()*6.28})}
 }
 clearCrowd(){
  for(const c of this.crowd){this.scene.remove(c.g);c.mat.dispose();c.tag.material.map.dispose();c.tag.material.dispose()}
  this.crowd=[];
 }
 // a random spot on the plateau, away from the sea
 spot(){
  for(let i=0;i<30;i++){const a=Math.random()*6.2832,r=8+Math.sqrt(Math.random())*36,x=Math.cos(a)*r,z=Math.sin(a)*r;if(islandH(x,z)>1)return{x,z}}
  return{x:0,z:-8}
 }
 updateCrowd(dt){
  if(!this.crowd.length)return;
  const cam=this.camera.position;
  for(const c of this.crowd){
   if(c.wait>0)c.wait-=dt;
   else{const dx=c.tx-c.x,dz=c.tz-c.z,d=Math.hypot(dx,dz);
    if(d<.3){c.wait=1+Math.random()*3;const s=this.spot();c.tx=s.x;c.tz=s.z}
    else{const st=Math.min(d,c.speed*dt);c.x+=dx/d*st;c.z+=dz/d*st}}
   const walking=c.wait<=0;
   c.g.position.set(c.x,islandH(c.x,c.z),c.z);
   c.plane.position.y=.88+(walking?Math.abs(Math.sin(this.t*9+c.ph))*.12:Math.sin(this.t*2+c.ph)*.03);
   c.plane.rotation.y=Math.atan2(cam.x-c.x,cam.z-c.z);
  }
 }
 animateWorld(dt){
  this.updateCrowd(dt);
  this.water.position.y=SEA_Y+Math.sin(this.t*.8)*.05;
  this.padRing.material.opacity=.55+.25*Math.sin(this.t*3);
  for(const c of this.clouds){c.position.x+=dt*2.5;if(c.position.x>700)c.position.x=-700}
  // campfire flicker, lamp glow, bunting and the stage strip
  for(const f of this.flames)f.m.scale.set(1,.85+.35*Math.sin(this.t*11+f.k*2)+.1*Math.sin(this.t*23+f.k),1);
  const glow=.9+.1*Math.sin(this.t*2);for(const l of this.lamps)l.material.emissiveIntensity=.7*glow;
  for(let i=0;i<this.flags.length;i++)this.flags[i].rotation.z=Math.sin(this.t*3+i*.7)*.18;
  if(this.stageStrip)this.stageStrip.material.emissiveIntensity=.5+.4*Math.sin(this.t*6);
 }

 render(){
  const c=this.renderer.domElement;const w=c.clientWidth||innerWidth,h=c.clientHeight||innerHeight;
  if(this.camera.aspect!==w/h){this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
  this.renderer.render(this.scene,this.camera);
 }
}
