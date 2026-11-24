// Gliders (v40). A glider is a real dome canopy made of coloured panels, on strings to the player's shoulders.
// It inflates when you deploy it, folds up when you dive, and banks into sideways movement.
// One glider is one mesh for the canopy (vertex colours) plus a few small decorations, so 100 bots gliding stay cheap.
import * as THREE from 'three';

export const GLIDER_R=2.3;           // canopy radius at the rim, same size as the original glider
const DOME_Y=.72;                    // how tall the dome is compared with its width when fully open
const PANELS=8, SEG=2, RINGS=6;      // 8 panels, 2 columns each, 6 rows from apex to rim

// per-style palette: panel colours (cycled) and extras
const STYLE={
 default:{panels:c=>c?[c,'#ffffff']:['#6ec6ff','#ffffff']},
 gl_cloud:{panels:()=>['#f2fff0','#d8f7e6']},
 gl_mushroom:{panels:()=>['#7a3fd0','#5a2aa8']},
 gl_roots:{panels:()=>['#5a3d22','#6e4c2a']},
 gl_stripes:{panels:()=>['#ff4a6a','#ffd23d','#4adf7a','#4a9aff','#c05aff','#ff9a3a','#ff4a6a','#ffd23d']},
 gl_stars:{panels:()=>['#16204a','#1c2a5e']},
 gl_flame:{panels:()=>['#d02a00','#ff9a1a','#ffd23d','#ff7a1a']},
 gl_gold:{panels:()=>['#ffcf3a','#d8a01e']},
 gl_legacy:{panels:()=>['#d8372e','#f4ead2']}
};

// a dome of PANELS coloured sectors as ONE geometry. Columns run round the dome; the apex is at the top, the rim at y=0.
function buildDome(colsOf){
 const cols=PANELS*SEG,pos=[],col=[],idx=[];
 for(let r=0;r<=RINGS;r++){
  const th=r/RINGS*Math.PI/2;                       // 0 = apex, PI/2 = rim
  for(let c=0;c<=cols;c++){
   const ph=c/cols*Math.PI*2;
   pos.push(GLIDER_R*Math.sin(th)*Math.cos(ph),GLIDER_R*Math.cos(th)*DOME_Y,GLIDER_R*Math.sin(th)*Math.sin(ph));
   const cc=new THREE.Color(colsOf(Math.min(PANELS-1,Math.floor(c/SEG))));col.push(cc.r,cc.g,cc.b)}}
 for(let r=0;r<RINGS;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1)}
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 g.setIndex(idx);g.computeVertexNormals();return g}

// a point on the dome surface (th: 0 apex .. PI/2 rim)
const onDome=(th,ph,k=1)=>[GLIDER_R*k*Math.sin(th)*Math.cos(ph),GLIDER_R*k*Math.cos(th)*DOME_Y,GLIDER_R*k*Math.sin(th)*Math.sin(ph)];
const mat=(c,e)=>new THREE.MeshLambertMaterial(Object.assign({color:c},e?{emissive:e,emissiveIntensity:.6}:{}));

export function makeGlider(col,id){
 const st=STYLE[id]||STYLE.default;
 const root=new THREE.Group();
 const canopy=new THREE.Group();root.add(canopy);
 const colors=st.panels(col);
 const dome=new THREE.Mesh(buildDome(i=>colors[i%colors.length]),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
 dome.castShadow=true;canopy.add(dome);
 // rim trim
 const trim=new THREE.Mesh(new THREE.TorusGeometry(GLIDER_R,.06,6,36),mat(id==='gl_gold'?'#fff0a0':id==='gl_mushroom'?'#e9dcc0':'#222222'));trim.rotation.x=Math.PI/2;canopy.add(trim);
 // decorations per style, placed on the dome surface
 const deco=(th,ph,geo,m)=>{const[x,y,z]=onDome(th,ph,1.02);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);canopy.add(o);return o};
 if(id==='gl_mushroom'){
  for(let i=0;i<9;i++)deco(.35+(i%3)*.3,i*2.1,new THREE.SphereGeometry(.13+(i%2)*.05,6,5),mat('#ffffff','#bbbbff'));
  for(let i=0;i<8;i++){const ph=i/8*6.283+.2;const gill=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.9),mat('#e9dcc0'));gill.position.set(Math.cos(ph)*GLIDER_R*.82,.02,Math.sin(ph)*GLIDER_R*.82);gill.rotation.y=-ph;canopy.add(gill)}
 }else if(id==='gl_cloud'){
  for(let i=0;i<10;i++){const ph=i/10*6.283;const s=new THREE.Mesh(new THREE.SphereGeometry(.42,8,6),mat('#f6fffb','#9be8c0'));s.position.set(Math.cos(ph)*GLIDER_R*1.02,-.05,Math.sin(ph)*GLIDER_R*1.02);s.scale.set(1,.7,1);canopy.add(s)}
 }else if(id==='gl_roots'){
  for(let i=0;i<6;i++){const ph=i/6*6.283;const tip=new THREE.Mesh(new THREE.SphereGeometry(.12,6,5),mat('#9bff78','#4fbf3a'));tip.position.set(Math.cos(ph)*GLIDER_R,.05,Math.sin(ph)*GLIDER_R);canopy.add(tip);
   const v=new THREE.Mesh(new THREE.TorusGeometry(1.5,.05,4,16,Math.PI*.6),mat('#8a5a2a'));v.position.set(0,.8,0);v.rotation.set(Math.PI/2,ph,0);canopy.add(v)}
 }else if(id==='gl_stars'){
  for(let i=0;i<14;i++){const th=.25+(i*37%100)/100*.95,ph=i*2.399;deco(th,ph,new THREE.OctahedronGeometry(.13),mat('#ffe27a','#ffd23d'))}
 }else if(id==='gl_flame'){
  for(let i=0;i<10;i++){const ph=i/10*6.283+.15;const f=new THREE.Mesh(new THREE.ConeGeometry(.2,.7,5),mat(i%2?'#ffd23d':'#ff7a1a','#ff9a00'));const[x,,z]=onDome(Math.PI/2,ph,1.02);f.position.set(x,.25,z);f.rotation.z=0;f.rotation.x=0;f.userData.flame=true;canopy.add(f)}
 }else if(id==='gl_gold'){
  for(let i=0;i<8;i++){const ph=i/8*6.283+.4;const j=new THREE.Mesh(new THREE.SphereGeometry(.14,6,5),mat(['#ff4a6a','#4ad0ff','#6aff8a'][i%3],'#552200'));j.position.set(Math.cos(ph)*GLIDER_R*1.02,.02,Math.sin(ph)*GLIDER_R*1.02);canopy.add(j)}
 }
 // strings from the rim to the player's shoulders
 const anchors=[[-.25,-1.4,0],[.25,-1.4,0]],v=[];
 for(let i=0;i<8;i++){const ph=i/8*6.283+Math.PI/8,a=anchors[i%2>0?1:0];v.push(Math.cos(ph)*GLIDER_R,0,Math.sin(ph)*GLIDER_R,a[0],a[1],a[2])}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
 root.add(new THREE.LineSegments(sg,new THREE.LineBasicMaterial({color:id==='gl_roots'?'#5a3d22':id==='gl_cloud'?'#cfe8d8':'#2a2a3a'})));
 root.position.y=3.1;
 root.userData={canopy,inf:0,dv:0,bank:0};
 return root}

// every frame while the glider is on: st = {dive, lat (sideways speed), t (clock)}
export function updateGlider(g,dt,st){
 const u=g.userData;
 const tI=st.dive?0:1,tD=st.dive?1:0;
 u.inf+=(tI-u.inf)*Math.min(1,dt*(tI>u.inf?4.5:7));   // inflates quicker than it folds
 u.dv+=(tD-u.dv)*Math.min(1,dt*6);
 const f=u.inf,d=u.dv,cn=u.canopy;
 cn.scale.set(1,.3+.42*f-.12*d,1);
 cn.rotation.x=-.8*d;
 for(const c of cn.children)if(c.userData.flame){c.scale.y=.8+.5*Math.sin((st.t||0)*18+c.position.x)*.5*(1-d)}
 const bankT=Math.max(-.35,Math.min(.35,-(st.lat||0)*.05))*(1-d);
 u.bank+=(bankT-u.bank)*Math.min(1,dt*3);
 g.rotation.z=u.bank+Math.sin((st.t||0)*6)*.03*(1-d);
}
