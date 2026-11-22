import * as THREE from 'three';
import {mulberry32,clamp,lerp} from './data.js';
import {MATS} from './materials.js';
export const ISL=380,HALF=520,WATER=0;
// v23: no cliff walls. Hills, dips, the lake and the road cuts shape the ground instead.
export const CLIFFS=[];
const TREE_HP=100;const rockHp=sc=>Math.round(130+50*sc);

// Districts (v28: spaced out by a relaxation pass so every district has room for its own ring road). Size tier comes from r: large 50+, medium 30-49, small under 30.
// Every district has a clear pad (flattened ground) and keeps off the lake and the sea.
export const POIS=[
 {n:'Downtown Dunk',x:-3,z:-13,r:58,type:'city'},
 {n:'Stack Street',x:-146,z:82,r:40,type:'apartments'},
 {n:'Salty Shores Hotel',x:166,z:112,r:34,type:'hotel'},
 {n:'Lonely Lodge',x:-137,z:-165,r:36,type:'cabins'},
 {n:'Retail Rodeo',x:165,z:-158,r:44,type:'mall'},
 {n:'Misty Mill',x:35,z:201,r:34,type:'town'},
 {n:'Radar Ridge',x:-229,z:-16,r:32,type:'base'},
 {n:'Frosty Fort',x:20,z:-263,r:36,type:'fort'},
 {n:"Mc Dongal's",x:-52,z:-198,r:27,type:'diner'},
 {n:'Sunny Sands',x:207,z:26,r:32,type:'resort'},
 {n:"Farmer's Folly",x:-120,z:-12,r:30,type:'farm'},
 {n:'Tomato Town',x:-200,z:-99,r:28,type:'suburb'},
 {n:'Dusty Depot',x:191,z:-59,r:26,type:'town'},
 {n:'Sandy Cove',x:248,z:155,r:34,type:'resort'},
 {n:'Pier Point',x:262,z:-109,r:30,type:'town'},
 {n:'Harbor Heights',x:-282,z:63,r:32,type:'warehouse'},
 {n:'Gas and Go',x:117,z:-251,r:28,type:'gas'},
 {n:'Sawmill Creek',x:-230,z:-188,r:30,type:'farm'},
 {n:'Sunset Cabins',x:106,z:266,r:34,type:'cabins'},
 {n:'Quarry Rock',x:-65,z:279,r:32,type:'warehouse'},
 {n:'Skyline Point',x:117,z:-15,r:30,type:'tower'},
 {n:'Pleasant Pickle',x:-218,z:147,r:28,type:'suburb'},
 {n:'Fuel Stop 9',x:-3,z:-138,r:22,type:'gas'},
 {n:'Brick Row',x:73,z:-102,r:30,type:'town'},
 {n:'Thunder Dome',x:-72,z:171,r:38,type:'stadium'},
 {n:'Lakeside Docks',x:-10,z:96,r:24,type:'lake'},
 {n:'Old Keep',x:-278,z:-121,r:24,type:'ruins'},
 {n:'Camp Pinecone',x:68,z:-183,r:22,type:'camp'},
];

// Lakes: a bowl that the sea plane fills. `bed` is the depth at the centre (below 0 is under water).
export const LAKES=[{n:'Lake Muffin',x:75,z:85,r:30,bed:-3.5}];

// Hills and ridges: [x, z, height, radius]. Negative height would be a dip.
export const TERRAIN=[
 [-72,-112,44,28],   // Mount Muffin
 [-150,190,26,34],   // Radio Hill
 [175,215,22,42],    // south-east ridge (windfarm)
 [-20,-290,20,40],   // north ridge behind the fort
 [290,-40,18,30],    // coastal headland
 [-250,-15,15,40],   // western hills under Radar Ridge
];

const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function hash(ix,iz){let h=Math.imul(ix,374761393)^Math.imul(iz,668265263);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967295}
function vnoise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,z){return vnoise(x,z)*.5+vnoise(x*2.1+7,z*2.1+3)*.25+vnoise(x*4.3+1,z*4.3+9)*.125+vnoise(x*8.7,z*8.7)*.0625}

export function rawH(x,z){
 const r=Math.hypot(x,z),ang=Math.atan2(z,x);
 const edge=ISL*(.8+.22*vnoise(Math.cos(ang)*1.7+10,Math.sin(ang)*1.7+10)+.08*vnoise(ang*4+50,3));
 const L=clamp((edge-r)/60,-1,1);
 let h;
 if(L>0){
  const s=sstep(0,1,L);
  h=s*(2+fbm(x*.009,z*.009)*11);           // gentle rolling ground, low at the coast
  for(const[cx,cz,A,R]of TERRAIN)h+=A*Math.exp(-((x-cx)**2+(z-cz)**2)/(2*R*R))*s;
  // east coast dunes: low, sandy ripples
  const dn=sstep(170,240,x)*s*(1-sstep(.6*ISL,.85*ISL,r));
  h+=dn*.9*Math.sin(x*.21+z*.09)*(.5+.5*Math.sin(z*.05));
 }else h=L*14;
 return h;
}
const poiY=POIS.map(p=>{let s=0,n=0;for(let a=0;a<6.283;a+=.785)for(let r=0;r<=p.r*.9;r+=p.r*.3){s+=rawH(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r);n++}return clamp(s/n,3.4,28)});
export function H(x,z){
 let h=rawH(x,z);
 for(let i=0;i<POIS.length;i++){const p=POIS[i];const dx=x-p.x,dz=z-p.z;if(dx>p.r*1.75||dx<-p.r*1.75||dz>p.r*1.75||dz<-p.r*1.75)continue;
  const d=Math.hypot(dx,dz);const w=sstep(p.r*1.7,p.r*.92,d);if(w>0)h=lerp(h,poiY[i],w);}
 for(const L of LAKES){const d=Math.hypot(x-L.x,z-L.z);const w=sstep(L.r*1.7,L.r*.95,d);if(w>0){const t=Math.min(1,d/L.r);h=lerp(h,L.bed+4.6*t*t,w)}}
 return h;
}
export function slope(x,z){const e=1.2;return [(H(x+e,z)-H(x-e,z))/(2*e),(H(x,z+e)-H(x,z-e))/(2*e)]}
export function poiAt(x,z){for(const p of POIS)if(Math.hypot(x-p.x,z-p.z)<p.r*1.1)return p;return null}

// ---- road network (v28) ------------------------------------------------------------------------------------
// Roads are routed with A* over a 6 m height grid and end at a gate on the edge of each district (never in the
// middle of its buildings). Later roads prefer to follow earlier ones, so they merge into real junctions instead
// of running side by side. Each stretch between two junctions is smoothed into a curve. The network is built once,
// at the start of buildMap(), before any building is placed, so buildings and scenery are placed around the roads.
export const ROADS=[];            // [a,b,k]: node ids (see ROAD_NODES) and the index of the stretch
export const ROAD_NODES=[];       // {id,x,z,deg,gate}: gates (district edge) and junctions
const GS=6,GMIN=-ISL-40,GN=Math.ceil((2*ISL+80)/GS);
const GH=new Float32Array(GN*GN);
for(let j=0;j<GN;j++)for(let i=0;i<GN;i++)GH[j*GN+i]=H(GMIN+i*GS,GMIN+j*GS);
const POI_EXT={stadium:12,fort:6,mall:4};
const keepOut=p=>p.r*1.06+(POI_EXT[p.type]||0);   // roads never enter this circle
export const ringR=p=>keepOut(p)+4.5;               // the ring road around a district
const RINGS=false;                                   // true: a full ring road around every district
function heapOps(){
 const hk=[],hv=[];
 const push=(k,v)=>{hk.push(k);hv.push(v);let i=hk.length-1;while(i>0){const p=(i-1)>>1;if(hk[p]<=hk[i])break;[hk[p],hk[i]]=[hk[i],hk[p]];[hv[p],hv[i]]=[hv[i],hv[p]];i=p}};
 const pop=()=>{const v=hv[0];const lk=hk.pop(),lv=hv.pop();if(hk.length){hk[0]=lk;hv[0]=lv;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<hk.length&&hk[l]<hk[m])m=l;if(r<hk.length&&hk[r]<hk[m])m=r;if(m===i)break;[hk[m],hk[i]]=[hk[i],hk[m]];[hv[m],hv[i]]=[hv[i],hv[m]];i=m}}return v};
 return {push,pop,size:()=>hk.length};
}
const cellX=i=>GMIN+(i%GN)*GS,cellZ=i=>GMIN+Math.floor(i/GN)*GS;
const cellOfXZ=(x,z)=>Math.round((z-GMIN)/GS)*GN+Math.round((x-GMIN)/GS);
function roadGraph(){   // candidate links: a minimum spanning tree plus each district's two nearest neighbours, shortest first
 const n=POIS.length,E=new Map();
 const d=(a,b)=>Math.hypot(POIS[a].x-POIS[b].x,POIS[a].z-POIS[b].z);
 const add=(a,b,mst)=>{if(a===b)return;const lo=Math.min(a,b),hi=Math.max(a,b);const k=lo*1000+hi;if(!E.has(k))E.set(k,{a:lo,b:hi,mst,len:d(lo,hi)})};
 const used=new Set([0]);
 while(used.size<n){let best=null,bd=1e9;for(const a of used)for(let b=0;b<n;b++){if(used.has(b))continue;const dd=d(a,b);if(dd<bd){bd=dd;best=[a,b]}}used.add(best[1]);add(best[0],best[1],true)}
 for(let a=0;a<n;a++){const near=[...Array(n).keys()].filter(b=>b!==a).sort((x,y)=>d(a,x)-d(a,y)).slice(0,2);for(const b of near)if(d(a,b)<170)add(a,b,false)}
 return [...E.values()].sort((p,q)=>(q.mst-p.mst)||(p.len-q.len));
}
function buildRoadNetwork(){
 ROADS.length=0;ROAD_NODES.length=0;PATH.clear();RD.fill(1e9);
 const N=GN*GN,BLK=new Uint8Array(N),PEN=new Float32Array(N),RC=new Uint8Array(N);   // RC: 1 road cell, 2 beside a road
 for(let c=0;c<N;c++){
  const x=cellX(c),z=cellZ(c),h=GH[c],i=c%GN,j=(c/GN)|0;
  if(h<1.9){BLK[c]=1;continue}
  if(i>0&&j>0&&i<GN-1&&j<GN-1){const s=Math.max(Math.abs(GH[c+1]-h),Math.abs(GH[c-1]-h),Math.abs(GH[c+GN]-h),Math.abs(GH[c-GN]-h))/GS;if(s>.4){BLK[c]=1;continue}}
  let blocked=false;
  for(const L of LAKES)if(Math.hypot(x-L.x,z-L.z)<L.r*1.45+6){blocked=true;break}
  if(!blocked)for(const p of POIS){const d=Math.hypot(x-p.x,z-p.z);if(d<keepOut(p)){blocked=true;break}if(d<keepOut(p)*1.3)PEN[c]=Math.max(PEN[c],(1.3-d/keepOut(p))*3)}
  if(blocked){BLK[c]=1;continue}
  if(h<3.4)PEN[c]+=1.2;if(h>32)PEN[c]+=2;
 }
 void 0;
 const D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],DK=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
 const sweep=(dx,dy)=>{ // cells a move passes through besides its ends
  if(Math.abs(dx)===1&&Math.abs(dy)===1)return[[dx,0],[0,dy]];
  if(Math.abs(dx)===2)return[[dx/2,0],[dx/2,dy]];return[[0,dy/2],[dx,dy/2]]};
 function route(s,t){
  const g=new Float32Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N);const hp=heapOps();
  const tx=t%GN,ty=(t/GN)|0;
  const hh=i=>{const x=i%GN,y=(i/GN)|0;const dx=Math.abs(x-tx),dy=Math.abs(y-ty);return GS*(Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy))*.7};
  g[s]=0;hp.push(hh(s),s);
  while(hp.size()){const c=hp.pop();if(done[c])continue;done[c]=1;if(c===t)break;
   const cx=c%GN,cy=(c/GN)|0,hc=GH[c];
   for(const mv of D8.concat(DK)){const nx=cx+mv[0],ny=cy+mv[1];if(nx<0||ny<0||nx>=GN||ny>=GN)continue;const n=ny*GN+nx;if(done[n])continue;
    if(BLK[n]&&n!==t)continue;
    const sw=(mv[0]!==0&&mv[1]!==0)?sweep(mv[0],mv[1]):null;let okm=true;
    if(sw){let allRoad=true;for(const[ox,oy]of sw){const q=(cy+oy)*GN+cx+ox;if(BLK[q]){okm=false;break}if(RC[q]!==1)allRoad=false}
     if(okm&&RC[c]!==1&&RC[n]!==1){for(const[ox,oy]of sw)if(RC[(cy+oy)*GN+cx+ox]===1){okm=false;break}}   // never cut across another road's cell without joining it
     if(okm&&Math.abs(mv[0])===1&&Math.abs(mv[1])===1&&allRoad&&!(RC[c]===1&&RC[n]===1))okm=false}
    if(!okm)continue;
    const len=Math.hypot(mv[0],mv[1])*GS,hn=GH[n],sl=Math.abs(hn-hc)/len;
    let cost=len*(1+36*Math.max(0,sl-.05))+PEN[n]*len*.5;
    cost*=RC[n]===1?.3:RC[n]===2?3:1;
    // a little extra for turning keeps the road from zig-zagging
    if(prev[c]>=0){const px=c%GN-prev[c]%GN,py=((c/GN)|0)-((prev[c]/GN)|0);const dot=(px*mv[0]+py*mv[1])/(Math.hypot(px,py)*Math.hypot(mv[0],mv[1]));if(dot<.9)cost+=GS*(dot<.5?1.2:.35)}
    const ng=g[c]+cost;if(ng<g[n]){g[n]=ng;prev[n]=c;hp.push(ng+hh(n),n)}}}
  if(s!==t&&prev[t]<0)return null;
  const out=[];for(let c=t;c!==-1;c=prev[c]){out.push(c);if(c===s)break}return out.reverse();
 }
 function markPath(P){
  for(let k=0;k<P.length;k++){const c=P[k];RC[c]=1;
   if(k>0){const a=P[k-1],ax=a%GN,ay=(a/GN)|0,cx=c%GN,cy=(c/GN)|0;const dx=cx-ax,dy=cy-ay;
    if(Math.abs(dx)+Math.abs(dy)>2||(Math.abs(dx)===2||Math.abs(dy)===2)){ // knight move: mark the cell nearest the line
     const mx=Math.abs(dx)===2?ax+dx/2:ax+(Math.abs(dx)?dx:0),my=Math.abs(dy)===2?ay+dy/2:ay+(Math.abs(dy)?dy:0);RC[my*GN+mx]=1}}}
  for(const c of P){const cx=c%GN,cy=(c/GN)|0;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const q=(cy+oy)*GN+cx+ox;if(q>=0&&q<N&&RC[q]===0)RC[q]=2}}
 }
 // every district gets a ring road just outside its keep-out circle; links then join the rings, so the roads wrap around
 // the districts instead of running through them. Where a ring would cross water, a steep slope or another district it is left open.
 const owner=new Int16Array(N).fill(-1);
 for(let c=0;c<N;c++){if(!BLK[c])continue;const x=cellX(c),z=cellZ(c);for(let k=0;k<POIS.length;k++)if(Math.hypot(x-POIS[k].x,z-POIS[k].z)<keepOut(POIS[k])){owner[c]=k;break}}
 // Links are routed from a gate on one district's edge to a gate on the next one. Where a district has two or more gates,
 // a short arc of road along its edge joins them, so a road that comes in on one side carries on round the district's edge
 // and leaves on the other side, like a bypass, instead of ending in a field.
 const ringSeq=POIS.map(()=>[]);const gateIdx=POIS.map(()=>[]);const paths=[];
 POIS.forEach((p,pi)=>{
  const R=ringR(p),steps=Math.max(24,Math.ceil(2*Math.PI*R/2.4));const seq=ringSeq[pi];
  for(let k=0;k<steps;k++){const a=k/steps*6.2832;const c=cellOfXZ(p.x+Math.cos(a)*R,p.z+Math.sin(a)*R);
   const ok=c>=0&&c<N&&(!BLK[c]||owner[c]===pi||(owner[c]<0&&GH[c]>=1.9));
   if(!ok){if(seq.length&&seq[seq.length-1]!==-1)seq.push(-1);continue}
   if(seq.length&&seq[seq.length-1]===c)continue;
   if(seq.length&&seq[seq.length-1]>=0){const q=seq[seq.length-1];if(Math.abs(q%GN-c%GN)>1||Math.abs(((q/GN)|0)-((c/GN)|0))>1)seq.push(-1)}
   seq.push(c);BLK[c]=0}
 });
 const gateAt=(pi,tx,tz)=>{ // index in the ring of the cell nearest to (tx,tz); reuses a gate that is already close
  const seq=ringSeq[pi];let best=-1,bd=1e9;
  for(let k=0;k<seq.length;k++){const c=seq[k];if(c<0)continue;const d=(cellX(c)-tx)**2+(cellZ(c)-tz)**2;if(d<bd){bd=d;best=k}}
  if(best<0)return -1;
  for(const g of gateIdx[pi]){const c1=seq[g],c2=seq[best];if(Math.hypot(cellX(c1)-cellX(c2),cellZ(c1)-cellZ(c2))<20)return g}
  gateIdx[pi].push(best);return best};
 for(const e of roadGraph()){
  const A=POIS[e.a],B=POIS[e.b];
  const gi=gateAt(e.a,B.x,B.z),gj=gateAt(e.b,A.x,A.z);if(gi<0||gj<0){if(globalThis.__dbg)console.log('no gate',A.n,B.n,gi,gj);continue}
  const s=ringSeq[e.a][gi],t=ringSeq[e.b][gj];if(s===t)continue;
  const P=route(s,t);if(!P||P.length<2){if(globalThis.__dbg)console.log('no route',A.n,B.n,e.mst);continue}
  if(!e.mst&&P.every(c=>RC[c]===1))continue;   // it would only follow roads that are already there
  markPath(P);paths.push(P);if(globalThis.__dbg)console.log('link',A.n,B.n,P.length);
 }
 POIS.forEach((p,pi)=>{
  const seq=ringSeq[pi],G=gateIdx[pi].slice();if(G.length<2)return;const n=seq.length;
  const ang=g=>Math.atan2(cellZ(seq[g])-p.z,cellX(seq[g])-p.x);
  G.sort((x,y)=>ang(x)-ang(y));
  const pairs=[];
  if(G.length===2)pairs.push([G[0],G[1]]);
  else{let gap=-1,gk=0;for(let k=0;k<G.length;k++){const a0=ang(G[k]),a1=ang(G[(k+1)%G.length])+(k===G.length-1?6.2832:0);if(a1-a0>gap){gap=a1-a0;gk=k}}
   for(let k=0;k<G.length;k++)if(k!==gk)pairs.push([G[k],G[(k+1)%G.length]])}
  for(const[g0,g1]of pairs){
   const walk=dir=>{const out=[seq[g0]];let k=g0;while(k!==g1){k=(k+dir+n)%n;if(seq[k]<0)return null;out.push(seq[k]);if(out.length>n)return null}return out};
   const f=walk(1),b=walk(-1);let arc=f&&b?(f.length<=b.length?f:b):(f||b);
   if(arc&&arc.length>1){markPath(arc);paths.push(arc)}}
 });
 // ---- cell graph -> junctions and stretches
 const adj=new Map();const link=(a,b)=>{if(a===b)return;if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a)};
 for(const P of paths)for(let k=1;k<P.length;k++)link(P[k-1],P[k]);
 const isNode=c=>adj.get(c).size!==2;
 const nodeId=new Map();const nodeOf=c=>{let id=nodeId.get(c);if(id===undefined){id=ROAD_NODES.length;nodeId.set(c,id);ROAD_NODES.push({id,x:cellX(c),z:cellZ(c),deg:adj.get(c).size,gate:false})}return id};
 const seen=new Set();const ek=(a,b)=>a<b?a*N+b:b*N+a;
 const chains=[];
 for(const [c0,nb] of adj){if(!isNode(c0))continue;
  for(const n0 of nb){if(seen.has(ek(c0,n0)))continue;
   const cells=[c0];let prevC=c0,cur=n0;seen.add(ek(c0,n0));
   while(true){cells.push(cur);if(isNode(cur))break;let nx=-1;for(const q of adj.get(cur))if(q!==prevC){nx=q;break}if(nx<0)break;seen.add(ek(cur,nx));prevC=cur;cur=nx}
   chains.push(cells)}}
 const resample=(pts,step)=>{const out=[pts[0]];let acc=0;for(let i=1;i<pts.length;i++){let a=pts[i-1],b=pts[i];let L=Math.hypot(b.x-a.x,b.z-a.z);let t=0;while(L-t>=step-acc){t+=step-acc;acc=0;out.push({x:a.x+(b.x-a.x)*t/L,z:a.z+(b.z-a.z)*t/L})}acc+=L-t}
  const last=pts[pts.length-1],lo=out[out.length-1];if(Math.hypot(last.x-lo.x,last.z-lo.z)>.5)out.push({x:last.x,z:last.z});else out[out.length-1]={x:last.x,z:last.z};return out};
 const smooth=(P,passes)=>{for(let k=0;k<passes;k++){const Q=P.map(p=>({...p}));for(let i=1;i<P.length-1;i++)Q[i]={x:(P[i-1].x+2*P[i].x+P[i+1].x)/4,z:(P[i-1].z+2*P[i].z+P[i+1].z)/4};P=Q}return P};
 chains.forEach((cells,k)=>{
  let pts=cells.map(c=>({x:cellX(c),z:cellZ(c)}));
  pts=resample(pts,GS*.8);pts=smooth(pts,12);pts=resample(pts,2.4);
  const a=nodeOf(cells[0]),b=nodeOf(cells[cells.length-1]);
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));
  const idx=ROADS.length;ROADS.push([a,b,idx]);PATH.set(idx,{pts,cum,len:cum[cum.length-1],a,b});
 });
 // distance field to the nearest road, 2 m cells, out to 24 m
 const mark=(x,z)=>{const ci=Math.round((x-RMIN)/RSTEP),cj=Math.round((z-RMIN)/RSTEP),R=12;
  for(let j=cj-R;j<=cj+R;j++)for(let i=ci-R;i<=ci+R;i++){if(i<0||j<0||i>=RN||j>=RN)continue;const cx=RMIN+i*RSTEP,cz=RMIN+j*RSTEP,d=Math.hypot(cx-x,cz-z);const q=j*RN+i;if(d<RD[q])RD[q]=d}};
 for(const P of PATH.values())for(let i=1;i<P.pts.length;i++){const a=P.pts[i-1],b=P.pts[i];const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)));for(let k=0;k<=n;k++)mark(a.x+(b.x-a.x)*k/n,a.z+(b.z-a.z)*k/n)}
}
const PATH=new Map();   // stretch index -> {pts, cum, len, a, b}
const RSTEP=2,RMIN=-ISL-40,RN=Math.ceil((2*ISL+80)/RSTEP);
const RD=new Float32Array(RN*RN).fill(1e9);
// point on stretch i of the network at t (0..1): arc length along the smoothed polyline, with the unit direction of travel
export function roadPointAt(i,t){
 const P=PATH.get(i);if(!P)return{x:0,z:0,dx:0,dz:1};
 const s=clamp(t,0,1)*P.len;let k=1;while(k<P.cum.length-1&&P.cum[k]<s)k++;
 const p0=P.pts[k-1],p1=P.pts[k],seg=(P.cum[k]-P.cum[k-1])||1;const f=clamp((s-P.cum[k-1])/seg,0,1);
 const dx=p1.x-p0.x,dz=p1.z-p0.z,l=Math.hypot(dx,dz)||1;
 return{x:p0.x+dx*f,z:p0.z+dz*f,dx:dx/l,dz:dz/l};
}
export function roadPoint(a,b,t){for(const r of ROADS){if(r[0]===a&&r[1]===b)return roadPointAt(r[2],t);if(r[0]===b&&r[1]===a){const p=roadPointAt(r[2],1-t);return{x:p.x,z:p.z,dx:-p.dx,dz:-p.dz}}}return{x:0,z:0,dx:0,dz:1}}
export function roadDist(x,z){
 const fx=(x-RMIN)/RSTEP-.5,fz=(z-RMIN)/RSTEP-.5;
 if(fx<0||fz<0||fx>=RN-1||fz>=RN-1)return 1e9;
 const i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;
 const a=RD[j*RN+i],b=RD[j*RN+i+1],c=RD[(j+1)*RN+i],d=RD[(j+1)*RN+i+1];
 return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
// unit vector from (x, z) towards the nearest road (null if none within 26 m)
export function roadToward(x,z){
 const d0=roadDist(x,z);if(d0>26)return null;
 const gx=roadDist(x+2,z)-roadDist(x-2,z),gz=roadDist(x,z+2)-roadDist(x,z-2);const l=Math.hypot(gx,gz);if(l<.01)return null;return[-gx/l,-gz/l,d0];
}
// the car park bays (x, z, yaw) that cars spawn in; filled by the district builders
export const parking=[];

export const boxes=[],circles=[],lootSpots=[],boxVis=[];
const CELL=16;let grid=new Map();let stamp=0;
const gk=(ix,iz)=>ix*8192+iz;
function gadd(ix,iz,o){const k=gk(ix,iz);let a=grid.get(k);if(!a){a=[];grid.set(k,a)}a.push(o)}
function insertBox(b){const x0=Math.floor(b.x0/CELL),x1=Math.floor(b.x1/CELL),z0=Math.floor(b.z0/CELL),z1=Math.floor(b.z1/CELL);for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++)gadd(i,j,b)}
function insertCircle(c){const x0=Math.floor((c.x-c.r)/CELL),x1=Math.floor((c.x+c.r)/CELL),z0=Math.floor((c.z-c.r)/CELL),z1=Math.floor((c.z+c.r)/CELL);for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++)gadd(i,j,c)}
export function query(x,z,r,out){out.length=0;stamp++;const x0=Math.floor((x-r)/CELL),x1=Math.floor((x+r)/CELL),z0=Math.floor((z-r)/CELL),z1=Math.floor((z+r)/CELL);
 for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++){const a=grid.get(gk(i,j));if(!a)continue;for(let k=0;k<a.length;k++){const o=a[k];if(o._q!==stamp){o._q=stamp;if(!o.gone)out.push(o)}}}return out}
// Destructible parts: every box added while `partMat` is set (building walls, roofs, props, boulders) gets hp.
// Thin ground slabs (floors, paving) are shorter than .2 m and are never destructible.
export const wparts=[];let partMat=null;
const poiMat=t=>(t==='city'||t==='fort'||t==='diner'||t==='apartments'||t==='tower'||t==='hotel'||t==='mall'||t==='stadium'||t==='ruins')?'stone':(t==='base'||t==='warehouse')?'metal':'wood';
export let boxInst=null; // instanced mesh of all visible static boxes, so a destroyed box can be hidden
function addBox(x0,y0,z0,x1,y1,z1,color,vis=true){
 const b={x0,y0,z0,x1,y1,z1,c:color,circ:false};
 if(partMat&&y1-y0>=.2){b.pk='box';b.mat=partMat;b.hp=MATS[partMat].hp;b.maxHp=b.hp;b.wi=wparts.length;wparts.push(b)}
 boxes.push(b);insertBox(b);if(vis){b.vi=boxVis.length;boxVis.push(b)}return b}
function wallX(x0,x1,z,y0,H_,openings,color,th=.4){ // wall along x at z (thickness th)
 openings=openings.slice().sort((a,b)=>a.s-b.s);let cur=x0;
 for(const o of openings){if(o.s>cur)addBox(cur,y0,z-th/2,o.s,y0+H_,z+th/2,color);if(o.y0>0)addBox(o.s,y0,z-th/2,o.e,y0+o.y0,z+th/2,color);if(o.y1<H_)addBox(o.s,y0+o.y1,z-th/2,o.e,y0+H_,z+th/2,color);cur=o.e}
 if(cur<x1)addBox(cur,y0,z-th/2,x1,y0+H_,z+th/2,color)}
function wallZ(z0,z1,x,y0,H_,openings,color,th=.4){
 openings=openings.slice().sort((a,b)=>a.s-b.s);let cur=z0;
 for(const o of openings){if(o.s>cur)addBox(x-th/2,y0,cur,x+th/2,y0+H_,o.s,color);if(o.y0>0)addBox(x-th/2,y0,o.s,x+th/2,y0+o.y0,o.e,color);if(o.y1<H_)addBox(x-th/2,y0+o.y1,o.s,x+th/2,y0+H_,o.e,color);cur=o.e}
 if(cur<z1)addBox(x-th/2,y0,cur,x+th/2,y0+H_,z1,color)}
const PAL={wall:['#e8d9b8','#d9c7a0','#cfd8dc','#e6b8a2','#b8c9a8','#d8c0d0','#c9b79c','#aebfd0'],roof:['#8a4b3a','#5b6b7a','#7a5b3a','#4f5f4f','#6a4a5a'],conc:['#9aa0a6','#8b9096','#a7adb3']};
// ---- collapsible buildings (v28): every house, block and tower is held up by support pillars. Break all of them and
// the whole building comes down. BLD[id] = {id, parts:[every box of the building], supports:[the pillars], ...}
export const BLD=[];
const SUP_HP={wood:110,stone:200,metal:300};
function addFixed(x0,y0,z0,x1,y1,z1,c){const pm=partMat;partMat=null;try{return addBox(x0,y0,z0,x1,y1,z1,c)}finally{partMat=pm}}
function registerBuilding(b,p0,x0,z0,x1,z1,y0,top,wallColor){
 // a plinth down to the lowest corner so a house on a slope never floats
 let mn=1e9;for(const[sx,sz]of[[x0,z0],[x1,z0],[x0,z1],[x1,z1],[(x0+x1)/2,(z0+z1)/2]])mn=Math.min(mn,H(sx,sz));
 if(y0-mn>.05)addFixed(x0-.05,mn-.5,z0-.05,x1+.05,y0+.02,z1+.05,'#6e6a62');
 const dark=partMat==='wood'?'#5a3d22':partMat==='metal'?'#4d5560':'#6c6f74';
 const pts=[[x0,z0],[x1,z0],[x0,z1],[x1,z1]];
 for(const f of[1/3,2/3]){if(x1-x0>16)pts.push([x0+(x1-x0)*f,z0],[x0+(x1-x0)*f,z1]);if(z1-z0>16)pts.push([x0,z0+(z1-z0)*f],[x1,z0+(z1-z0)*f])}
 b.supports=[];
 for(const[px,pz]of pts){const q=addBox(px-.55,y0,pz-.55,px+.55,top,pz+.55,dark);
  if(q.hp!==undefined){q.hp=q.maxHp=SUP_HP[q.mat]||150}q.sup=true;q.bid=BLD.length;b.supports.push(q)}
 b.id=BLD.length;b.parts=boxes.slice(p0);b.collapsed=false;b.supLeft=b.supports.length;b.top=top;
 b.x0=x0;b.x1=x1;b.z0=z0;b.z1=z1;
 for(const q of b.parts)q.bid=b.id;
 BLD.push(b);return b}
function makeBuilding(rng,cx,cz,w,d,h,doorSide,opts={}){
 const p0=boxes.length;
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
 return registerBuilding({x:cx,z:cz,w,d,y0,h,door:dd},p0,x0,z0,x1,z1,y0,y0+h+.35);
}
export const buildings=[];
// ---- building kit v2: multi-storey stacks with a stair core, and the rest of the new districts
function sideWins(c,len,skipDoor){const out=[];const n=Math.max(1,Math.floor((len-2.5)/3.2));for(let i=0;i<n;i++){const o=-((n-1)*3.2)/2+i*3.2;if(skipDoor&&Math.abs(o)<2.2)continue;out.push({s:c+o-.8,e:c+o+.8,y0:1,y1:2.4})}return out}
// A multi-storey block. Every floor has windows on all four sides; the ground floor has the door.
// A stair core sits in the corner next to the west wall: two flights go up through a hole in every floor,
// alternating columns and direction, so each floor can be climbed. Upper floors get loot and sometimes a chest.
function makeStack(rng,cx,cz,w,d,floors,doorSide,opts={}){
 const p0=boxes.length;
 const y0=H(cx,cz),FH=opts.fh||3.4,F=floors;
 const wc=opts.color||PAL.wall[Math.floor(rng()*PAL.wall.length)],rc=opts.roof||PAL.roof[Math.floor(rng()*PAL.roof.length)];
 const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2,th=.4;
 const S=k=>y0+k*FH+.08;                                   // walking surface of floor k
 const RUN=4,hx0=x0+1,hx1=x0+4.2,hz0=z0+1,hz1=hz0+RUN;    // stair hole
 const dc={n:cx,s:cx,e:cz,w:cz};
 for(let k=0;k<F;k++){
  const sides={n:[],s:[],e:[],w:[]};
  for(const sd of['n','s','e','w']){const len=(sd==='n'||sd==='s')?w:d;const c=dc[sd];const door=k===0&&sd===doorSide;
   if(door)sides[sd].push({s:c-.95,e:c+.95,y0:0,y1:2.5});
   sides[sd].push(...sideWins(c,len,door))}
  wallX(x0,x1,z0,S(k),FH-.08,sides.n,wc,th);wallX(x0,x1,z1,S(k),FH-.08,sides.s,wc,th);
  wallZ(z0,z1,x0,S(k),FH-.08,sides.w,wc,th);wallZ(z0,z1,x1,S(k),FH-.08,sides.e,wc,th);
 }
 addBox(x0,y0,z0,x1,y0+.08,z1,'#7b7468',true);           // ground floor
 for(let k=1;k<F;k++){const yb=S(k)-.08,yt=S(k);          // upper floors: slabs around the stair hole
  addBox(x0,yb,z0,hx0,yt,z1,'#9a9184');addBox(hx1,yb,z0,x1,yt,z1,'#9a9184');
  addBox(hx0,yb,z0,hx1,yt,hz0,'#9a9184');addBox(hx0,yb,hz1,hx1,yt,z1,'#9a9184')}
 const rise=FH/8,run=RUN/8;                                // flights: 8 steps each, climbing the core
 for(let k=1;k<F;k++){const base=S(k-1);const odd=k%2===1;
  const cols=odd?[hx0+.05,hx0+1.55]:[hx0+1.65,hx1-.05];
  for(let i=0;i<8;i++){const top=base+(i+1)*rise;let za,zb;
   if(odd){za=hz0+i*run;zb=hz0+(i+1)*run}else{za=hz1-(i+1)*run;zb=hz1-i*run}
   addBox(cols[0],top-.5,za,cols[1],top,zb,'#b5ab9b')}}
 const top=y0+F*FH;addBox(x0-.3,top,z0-.3,x1+.3,top+.35,z1+.3,rc);
 const dd={n:[cx,z0-2.5],s:[cx,z1+2.5],w:[x0-2.5,cz],e:[x1+2.5,cz]}[doorSide];
 const q=opts.q||1;
 const spots=Math.max(2,Math.floor(w*d/45));
 for(let i=0;i<spots;i++)lootSpots.push({x:lerp(x0+1.2,x1-1.2,rng()),z:lerp(z0+1.2,z1-1.2,rng()),y:y0+.1,door:dd,inside:true,chest:false,q});
 if(rng()<(opts.chest??.6))lootSpots.push({x:lerp(hx1+1,x1-1.5,rng()),z:rng()<.5?z0+1.1:z1-1.1,y:y0+.1,door:dd,inside:true,chest:true,q});
 for(let k=1;k<F;k++){
  for(let i=0;i<(opts.upperLoot??1);i++)lootSpots.push({x:lerp(hx1+.9,x1-.9,rng()),z:lerp(z0+1,z1-1,rng()),y:S(k)+.1,door:dd,inside:true,chest:false,q});
  if(rng()<(opts.upperChest??.45))lootSpots.push({x:lerp(hx1+1,x1-1,rng()),z:rng()<.5?z0+1.1:z1-1.1,y:S(k)+.1,door:dd,inside:true,chest:true,q});
 }
 const b={x:cx,z:cz,w,d,y0,h:F*FH,door:dd,kind:opts.kind||'apartments',floors:F,top};
 registerBuilding(b,p0,x0,z0,x1,z1,y0,top+.35);buildings.push(b);return b;
}
function gasStation(rng,x,z){
 const yy=H(x,z);
 addBox(x-8,yy+4.6,z-6,x+8,yy+4.9,z+6,'#f5f5f5');
 for(const[px,pz]of[[-7,-5],[7,-5],[-7,5],[7,5]])addBox(px+x-.35,yy,z+pz-.35,px+x+.35,yy+4.6,z+pz+.35,'#8aa3b8');
 for(const pz of[-2,2]){addBox(x-3,yy,z+pz-.5,x-2,yy+1.6,z+pz+.5,'#d33');addBox(x+2,yy,z+pz-.5,x+3,yy+1.6,z+pz+.5,'#d33')}
 buildings.push(makeBuilding(rng,x-14,z,10,8,3.6,'e',{color:'#f0e6d2',q:1.8,props:2,chest:.9}));
 standSign('FUEL & GO',x,z-10,0,12,2.4,'#e74c3c','#fff');
 lootSpots.push({x:x+4,z:z+8,y:yy+.2,inside:false,chest:false,q:1.4});
}
// a building site is free when it is dry, off the roads (with room for a door and a pavement) and clear of other buildings
function siteFree(x,z,w,d,margin){
 for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]])if(roadDist(x+sx*(w/2+.3),z+sz*(d/2+.3))<5.5+margin*.25)return false;   // pavement and a door's worth of room
 for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1],[0,0]])if(H(x+sx*w/2,z+sz*d/2)<2.2)return false;
 for(const L of LAKES)if(Math.hypot(x-L.x,z-L.z)<L.r*1.45+Math.max(w,d)/2)return false;
 for(const q of buildings)if(Math.abs(x-q.x)<(w+q.w)/2+margin&&Math.abs(z-q.z)<(d+q.d)/2+margin)return false;
 return true}
// which wall a door should go in: the one facing the nearest road when there is one close by, else `fallback`
function faceRoad(x,z,fallback){const t=roadToward(x,z);if(!t||t[2]>24)return fallback;return Math.abs(t[0])>Math.abs(t[1])?(t[0]>0?'e':'w'):(t[1]>0?'s':'n')}
function genPOI(rng,p,idx){partMat=poiMat(p.type);try{genPOI_(rng,p,idx)}finally{partMat=null}}
function genPOI_(rng,p,idx){
 const S={city:21,suburb:26,town:24,cabins:28,warehouse:32,base:30,fort:40}[p.type]||24;
 const dirTo=(bx,bz)=>{const dx=p.x-bx,dz=p.z-bz;if(Math.abs(dx)>Math.abs(dz))return dx>0?'e':'w';return dz>0?'s':'n'};
 if(p.type==='fort'){
  const R=24,wh=7,th=1.2,yy=H(p.x,p.z);
  const gap=[{s:p.x-3,e:p.x+3,y0:0,y1:4.5}];
  wallX(p.x-R,p.x+R,p.z-R,yy,wh,gap,PAL.conc[0],th);wallX(p.x-R,p.x+R,p.z+R,yy,wh,gap,PAL.conc[0],th);
  const gz=[{s:p.z-3,e:p.z+3,y0:0,y1:4.5}];wallZ(p.z-R,p.z+R,p.x-R,yy,wh,gz,PAL.conc[1],th);wallZ(p.z-R,p.z+R,p.x+R,yy,wh,gz,PAL.conc[1],th);
  for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1]])addBox(p.x+sx*R-4,yy,p.z+sz*R-4,p.x+sx*R+4,yy+11,p.z+sz*R+4,'#7e858c');
  buildings.push(makeBuilding(rng,p.x,p.z,16,14,5,'s',{color:'#cfd8dc',props:3,chest:1,q:1.6,}));
  buildings.push(makeBuilding(rng,p.x-15,p.z+15,8,8,3.6,'e',{q:1.2}));buildings.push(makeBuilding(rng,p.x+15,p.z-15,8,8,3.6,'w',{q:1.2}));
  return}

 const yy0=H(p.x,p.z);
 {const lot={city:[p.x+4,p.z+36,6],hotel:[p.x+8,p.z+20,4],mall:[p.x,p.z+31,7],resort:[p.x,p.z-24,4],diner:[p.x+26,p.z+18,4],gas:[p.x,p.z+14,4],town:[p.x,p.z-22,3],apartments:[p.x,p.z+26,4],tower:[p.x-6,p.z-24,4]}[p.type];if(lot)parkRow(lot[0],lot[1],lot[2])}
 if(p.type==='diner'){
  const yy=yy0;
  buildings.push(makeBuilding(rng,p.x,p.z,22,13,5,'s',{color:'#f0cf2e',q:2.4,props:4,chest:1}));
  SIGN("MC DONGAL'S",p.x,yy+6.4,p.z+6.75,0,14,2.8,'#d92b2b','#ffd23d');
  addBox(p.x-17,yy,p.z+8.5,p.x+17,yy+.06,p.z+23,'#4a4e55',true);
  for(let i=0;i<6;i++){if(i===3)continue;const cx=p.x-13+i*5.2;const col=['#d33','#37c','#3a5','#ec3','#a4c'][i%5];addBox(cx-.9,yy+.06,p.z+12,cx+.9,yy+1.4,p.z+16.2,col);addBox(cx-.75,yy+1.4,p.z+13,cx+.75,yy+2,p.z+15.2,'#bfe8ff')}
  addBox(p.x+11,yy+3.4,p.z-6,p.x+17,yy+3.7,p.z+7,'#c0392b');for(const[px,pz]of[[11.2,-5.8],[16.6,-5.8],[11.2,6.6],[16.6,6.6]])addBox(p.x+px-.2,yy,p.z+pz-.2,p.x+px+.2,yy+3.4,p.z+pz+.2,'#888');
  addBox(p.x-19.4,yy,p.z+8.6,p.x-18.6,yy+13,p.z+9.4,'#9aa0a6');landmarks.push({k:'burger',x:p.x-19,y:yy+15.2,z:p.z+9});
  for(let i=0;i<3;i++){const tx=p.x-8+i*5;addBox(tx-.7,yy,p.z-9.4,tx+.7,yy+.9,p.z-8.2,'#d33');addBox(tx-.5,yy+.9,p.z-9.2,tx+.5,yy+1.05,p.z-8.4,'#fff')}
  buildings.push(makeBuilding(rng,p.x-19,p.z-11,8,7,3.4,'e',{q:1.4}));
  for(let i=0;i<5;i++)lootSpots.push({x:p.x-14+i*7,z:p.z+19.5,y:yy+.2,inside:false,chest:false,q:1.6});
  return}
 if(p.type==='resort'){
  const yy=yy0;
  const pastel=['#ffb3c7','#b3e5ff','#fff0a8','#c7f0b0'];
  [[-19,-17,'e'],[19,-17,'w'],[-19,17,'e'],[19,17,'w']].forEach((q,i)=>buildings.push(makeBuilding(rng,p.x+q[0],p.z+q[1],10,9,3.8,q[2],{color:pastel[i],q:1.5,props:1,chest:.8})));
  addBox(p.x-6.5,yy,p.z-.7,p.x-5.5,yy+10.5,p.z+.7,'#d8dde2');addBox(p.x+5.5,yy,p.z-.7,p.x+6.5,yy+10.5,p.z+.7,'#d8dde2');addBox(p.x-6.5,yy,p.z-.9,p.x+6.5,yy+.5,p.z+.9,'#c0392b');
  landmarks.push({k:'wheel',x:p.x,y:yy+11,z:p.z});
  standSign('SUNNY SANDS',p.x,p.z+14,0,9,2.2,'#2bb6e0','#fff');
  for(let i=0;i<6;i++){const a=i/6*6.283;addBox(p.x+Math.cos(a)*11-.5,yy,p.z+Math.sin(a)*11-.5,p.x+Math.cos(a)*11+.5,yy+1,p.z+Math.sin(a)*11+.5,i%2?'#ffd23d':'#ff6b9a')}
  return}
 if(p.type==='farm'){
  const yy=yy0;
  buildings.push(makeBuilding(rng,p.x+2,p.z+4,18,12,6,'w',{color:'#b03a2e',q:2.1,props:5,chest:1}));
  buildings.push(makeBuilding(rng,p.x-12,p.z+18,9,8,3.6,'n',{color:'#e8d9b8',q:1.3}));
  addCyl(p.x+16,p.z-8,2.6,yy,yy+11);landmarks.push({k:'silo',x:p.x+16,y:yy,z:p.z-8});addCyl(p.x+16,p.z-2,2.6,yy,yy+11);landmarks.push({k:'silo',x:p.x+16,y:yy,z:p.z-2});
  addCyl(p.x-14,p.z-10,1.9,yy,yy+13);landmarks.push({k:'windmill',x:p.x-14,y:yy,z:p.z-10});
  for(let i=0;i<6;i++)addBox(p.x-4+i*2.4,yy,p.z-16,p.x-2.6+i*2.4,yy+1.3,p.z-14.6,'#d9b84a');
  standSign("FARMER'S FOLLY",p.x+2,p.z+16,0,10,2.2,'#7a4a2a','#ffe9b0');
  return}
 // ---- v2 districts
 if(p.type==='city'){
  const a=makeStack(rng,p.x-14,p.z-14,14,14,12,'s',{kind:'tower',fh:3.4,upperLoot:2,upperChest:.6,q:1.5});
  makeStack(rng,p.x+16,p.z+8,14,14,9,'w',{kind:'tower',fh:3.4,upperLoot:2,q:1.5});
  addBox(p.x-15,a.top,p.z-15,p.x-13,a.top+9,p.z-13,'#c9c0b0');addBox(p.x-14.5,a.top+9,p.z-14.5,p.x-13.5,a.top+12,p.z-13.5,'#7a3b2e');
  makeStack(rng,p.x-18,p.z+16,14,12,6,'n',{kind:'apartments',q:1.3,fh:3.2});
  makeStack(rng,p.x+20,p.z-22,14,12,6,'s',{kind:'apartments',q:1.3,fh:3.2});
  makeStack(rng,p.x-38,p.z-10,12,12,5,'e',{kind:'apartments',q:1.2,fh:3.2});
  makeStack(rng,p.x+40,p.z+18,12,12,5,'w',{kind:'apartments',q:1.2,fh:3.2});
  buildings.push(makeBuilding(rng,p.x-1,p.z+24,9,8,3.6,'n',{q:1.4,props:1,chest:.7}));
  buildings.push(makeBuilding(rng,p.x+6,p.z-38,10,8,3.6,'s',{color:'#ffd27a',q:1.4,props:2}));
  buildings.push(makeBuilding(rng,p.x+36,p.z-6,9,8,3.6,'w',{q:1.4,props:1}));
  standSign('DOWNTOWN DUNK',p.x,p.z-5,0,12,2.4,'#2c3e50','#fff');
  return}
 if(p.type==='apartments'){
  for(const[dx,dz,dir]of[[-15,-14,'e'],[15,-14,'w'],[-15,13,'e'],[15,13,'w']])makeStack(rng,p.x+dx,p.z+dz,14,11,4+Math.floor(rng()*3),dir,{kind:'apartments',q:1.3,fh:3.2,upperChest:.5});
  const yy=H(p.x,p.z);
  addBox(p.x-2.5,yy,p.z+1,p.x+2.5,yy+.3,p.z+3,'#ffd23d');addBox(p.x-2.5,yy+.3,p.z+2.8,p.x+2.5,yy+1.4,p.z+3,'#ff6b6b');  // slide and climbing frame
  addBox(p.x-6,yy,p.z-2,p.x-4.5,yy+2.4,p.z-.5,'#8aa3b8');addBox(p.x+4.5,yy,p.z-2,p.x+6,yy+2.4,p.z-.5,'#8aa3b8');addBox(p.x-6,yy+2.2,p.z-2,p.x+6,yy+2.5,p.z-.5,'#8aa3b8');   // swings
  standSign('STACK STREET',p.x,p.z-6,0,10,2.2,'#3498db','#fff');
  return}
 if(p.type==='tower'){
  const r=makeStack(rng,p.x,p.z,14,14,14,'s',{kind:'tower',fh:3.4,upperLoot:2,upperChest:.6,q:1.6});
  addBox(p.x-.9,r.top,p.z-.9,p.x+.9,r.top+7,p.z+.9,'#c9c0b0');
  const yy=H(p.x,p.z);
  for(const[bx,bz]of[[-10,-10],[10,-10]])addBox(p.x+bx-1.4,yy,p.z+bz+9,p.x+bx+1.4,yy+.6,p.z+bz+10,'#8b6b3e');   // plaza benches
  return}
 if(p.type==='hotel'){
  makeStack(rng,p.x-4,p.z,16,14,6,'w',{kind:'hotel',fh:3.5,color:'#f3e9d2',q:1.8,upperLoot:2,upperChest:.5});
  const yy=H(p.x,p.z);
  addBox(p.x+6,yy,p.z-5,p.x+13,yy+.12,p.z+5,'#4fc3f7');
  standSign('GRAND VISTA',p.x-4,p.z+10,0,12,2.4,'#7b3fbf','#fff');
  return}
 if(p.type==='mall'){
  makeStack(rng,p.x,p.z,40,22,2,'s',{kind:'mall',fh:4.6,color:'#e8e0d0',q:1.7,upperLoot:3,upperChest:.8,chest:.9});
  const yy=H(p.x,p.z);
  for(let i=0;i<7;i++){const bx=p.x-15+i*5;addBox(bx-.1,yy,p.z+15,bx+.1,yy+.05,p.z+24,'#f2f2f2')}   // car park bays
  standSign('RETAIL RODEO',p.x,p.z+27,0,16,2.6,'#e67e22','#fff');
  return}
 if(p.type==='gas'){gasStation(rng,p.x,p.z);return}
 if(p.type==='stadium'){stadium(rng,p);return}
 if(p.type==='ruins'){ruins(rng,p);return}
 if(p.type==='camp'){camp(rng,p);return}
 if(p.type==='lake'){lakeside(rng,p);return}
 if(p.type==='town')church(rng,p);
 const target={suburb:9,town:9,cabins:7,warehouse:5,base:6}[p.type]||7;
 let placed=0;
 for(let t=0;t<400&&placed<target;t++){
  const a=rng()*6.283,rad=Math.sqrt(rng())*p.r*.84;
  const bx=p.x+Math.cos(a)*rad,bz=p.z+Math.sin(a)*rad;
  let w,d,h,o={};
  if(p.type==='warehouse'){w=18+rng()*6;d=12+rng()*5;h=5.5;o={q:1.3,props:3}}
  else if(p.type==='base'){w=12+rng()*6;d=10+rng()*5;h=4.2;o={q:1.4,color:'#9aa6a0',props:2}}
  else if(p.type==='cabins'){w=8+rng()*3;d=7+rng()*3;h=3.4;o={q:1.1,color:'#9b7653'}}
  else if(p.type==='suburb'){w=9+rng()*3;d=8+rng()*3;h=3.5;o={q:1}}
  else {w=10+rng()*4;d=8+rng()*3;h=3.6+(rng()<.3?3:0);o={q:1.1}}
  if(!siteFree(bx,bz,w,d,5))continue;
  // a tower in the middle of a base keeps its own spot clear
  if(p.type==='base'&&Math.hypot(bx-p.x,bz-p.z)<w/2+d/2+3)continue;
  buildings.push(makeBuilding(rng,bx,bz,w,d,h,faceRoad(bx,bz,dirTo(bx,bz)),o));placed++;
 }
 if(p.type==='base'){const yy=H(p.x,p.z);addBox(p.x-3,yy,p.z-3,p.x+3,yy+16,p.z+3,'#c0c4c8');addBox(p.x-6,yy+16,p.z-.5,p.x+6,yy+17,p.z+.5,'#e04a4a')}
}

// ---- v23 districts and landmarks
function parkRow(cx,cz,n){for(let i=0;i<n;i++)parking.push({x:cx+(i-(n-1)/2)*3.4,z:cz,yaw:0})}
function gateAngle(a){const m=a%(Math.PI/2);return m<.16||m>Math.PI/2-.16}   // four walkable gaps through the stands
// Thunder Dome: a stadium bowl with five tiers of stands, four gates, a pitch and floodlight masts
function stadium(rng,p){
 const rx=24,rz=18,Y=H(p.x,p.z);
 for(let k=0;k<5;k++){
  const ax=rx+3+k*2.4,az=rz+3+k*2.4,top=Y+(k+1)*.6;
  const n=Math.round(2*Math.PI*Math.sqrt((ax*ax+az*az)/2)/2.4);
  for(let i=0;i<n;i++){const a=i/n*6.283;if(gateAngle(a))continue;
   const x=p.x+Math.cos(a)*ax,z=p.z+Math.sin(a)*az;
   addBox(x-1.3,Y,z-1.3,x+1.3,top,z+1.3,k%2?'#4f5b6b':'#c9d1da')}
 }
 addBox(p.x-rx+2,Y,p.z-rz+2,p.x+rx-2,Y+.05,p.z+rz-2,'#3fa34d');     // the pitch
 addBox(p.x-.15,Y+.05,p.z-rz+2,p.x+.15,Y+.05,p.z+rz-2,'#ffffff');  // halfway line
 for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1]]){                    // floodlight masts
  const mx=p.x+sx*(rx+14),mz=p.z+sz*(rz+12);
  addBox(mx-.5,Y,mz-.5,mx+.5,Y+22,mz+.5,'#8e96a0');addBox(mx-1.6,Y+22,mz-.5,mx+1.6,Y+23,mz+.5,'#fff6c8')}
 standSign('THUNDER DOME',p.x,p.z-rz-14,0,16,3,'#1d2b4a','#ffd23d');
 for(const a of[.8,2.4,4.0]){lootSpots.push({x:p.x+Math.cos(a)*(rx-4),z:p.z+Math.sin(a)*(rz-4),y:Y+.1,inside:false,chest:true,q:1.6})}
}
// Old Keep: a broken castle with holed walls, four towers, a half-fallen keep and rubble
function ruins(rng,p){
 const R=20,Y=H(p.x,p.z),wc='#b3aa98',th=1.2;
 const holes=(len,n)=>{const o=[];for(let k=0;k<n;k++){const s=-len/2+len*(.15+k*.3)+(rng()-.5)*3;o.push({s,e:s+2.5+rng()*2.5,y0:0,y1:9})}return o};
 wallX(p.x-R,p.x+R,p.z-R,Y,7,holes(2*R,3),wc,th);
 wallX(p.x-R,p.x+R,p.z+R,Y,4.5,holes(2*R,4),wc,th);
 wallZ(p.z-R,p.z+R,p.x-R,Y,6,holes(2*R,2),wc,th);
 wallZ(p.z-R,p.z+R,p.x+R,Y,5,[{s:p.z-3,e:p.z+3,y0:0,y1:9}],wc,th);   // the gate on the east side
 for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const tall=sx<0?11:7;
  addBox(p.x+sx*R-2.6,Y,p.z+sz*R-2.6,p.x+sx*R+2.6,Y+tall,p.z+sz*R+2.6,'#a39a86');
  addBox(p.x+sx*R-2.9,Y+tall,p.z+sz*R-2.9,p.x+sx*R+2.9,Y+tall+.5,p.z+sz*R+2.9,'#8f8778')}
 addBox(p.x-4,Y,p.z-4,p.x+4,Y+6,p.z+4,'#9a9284');                 // the keep
 addBox(p.x-4,Y+6,p.z-4,p.x-1,Y+10,p.z+4,'#9a9284');              // half-fallen top
 for(let i=0;i<7;i++){const a=i*2.1+.5,d=8+rng()*8,s=.8+rng()*1.4;const x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;const y=H(x,z);
  addBox(x-s/2,y,z-s/2,x+s/2,y+s*.8,z+s/2,['#8e8778','#a39a86','#7b7467'][i%3])}
 lootSpots.push({x:p.x-R+4,z:p.z,y:Y+.1,inside:false,chest:true,q:1.8});
 lootSpots.push({x:p.x+4,z:p.z-R+5,y:Y+.1,inside:false,chest:true,q:1.8});
 lootSpots.push({x:p.x+R-5,z:p.z+R-5,y:Y+.1,inside:false,chest:true,q:1.8});
}
// Camp Pinecone: a clearing with tents, picnic tables and a stone fire ring
function camp(rng,p){
 const Y=H(p.x,p.z);
 for(let i=0;i<7;i++){const a=i/7*6.283+.4,d=9+rng()*4;const x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;const y=H(x,z);
  const col=['#e4572e','#f3a712','#2e86ab','#7a9e7e'][i%4];
  addBox(x-1.6,y,z-1.2,x+1.6,y+1.2,z+1.2,col);addBox(x-1.1,y+1.2,z-.9,x+1.1,y+2.2,z+.9,col);addBox(x-.5,y+2.2,z-.4,x+.5,y+2.9,z+.4,'#f4f1de')}
 for(let k=0;k<8;k++){const a=k/8*6.283;addBox(p.x+Math.cos(a)*1.6-.4,Y,p.z+Math.sin(a)*1.6-.4,p.x+Math.cos(a)*1.6+.4,Y+.5,p.z+Math.sin(a)*1.6+.4,'#7b7468')}
 for(let i=0;i<2;i++){const tx=p.x-6+i*12;addBox(tx-1.2,Y,p.z+6,tx+1.2,Y+.9,p.z+7.4,'#a0703e');addBox(tx-1.2,Y+.9,p.z+6,tx+1.2,Y+1.1,p.z+7.4,'#c98a4a')}
 lootSpots.push({x:p.x-6,z:p.z+8.5,y:Y+.1,inside:false,chest:true,q:1.3});
 lootSpots.push({x:p.x+7,z:p.z+6,y:Y+.1,inside:false,chest:true,q:1.3});
 for(let i=0;i<3;i++)lootSpots.push({x:p.x+(rng()-.5)*16,z:p.z+(rng()-.5)*16,y:0,inside:false,chest:false,q:1});
}
// Lakeside Docks: houses on the shore, a long pier into Lake Muffin, a boathouse and canoes
function lakeside(rng,p){
 const L=LAKES[0];let dx=L.x-p.x,dz=L.z-p.z;const l=Math.hypot(dx,dz);dx/=l;dz/=l;
 const alongX=Math.abs(dx)>=Math.abs(dz);
 let t=p.r*.6,x=0,z=0;
 for(;t<l;t+=2){x=p.x+dx*t;z=p.z+dz*t;if(H(x,z)<.3)break}
 const shoreT=t;const end=shoreT+9;
 const deck=1.1;
 for(let u=p.r*.6;u<end;u+=2.6){
  const px=p.x+dx*u,pz=p.z+dz*u,ground=Math.max(H(px,pz),0);const top=Math.max(deck,ground+.4);
  if(alongX)addBox(px-1.3,top-.35,pz-1.4,px+1.3,top,pz+1.4,'#9b7653');
  else addBox(px-1.4,top-.35,pz-1.3,px+1.4,top,pz+1.3,'#9b7653');
  if(u%5.2<2.6)addBox(px-.3,-2,pz-.3,px+.3,top-.35,pz+.3,'#5b4530');   // pilings
 }
 const ex=p.x+dx*end,ez=p.z+dz*end;
 const bhx=p.x-dx*6+(-dz)*14,bhz=p.z-dz*6+dx*14;
 if(H(bhx,bhz)>1.2&&!POIS.some(q=>q!==p&&Math.hypot(q.x-bhx,q.z-bhz)<q.r))
  buildings.push(makeBuilding(rng,bhx,bhz,10,8,3.6,dx>0?'w':'e',{color:'#c0392b',q:1.5,props:1,chest:.9}));
 for(let i=0;i<3;i++){const cx=p.x+(-dz)*(-6-i*2.6)+dx*(p.r*.2),cz=p.z+dx*(-6-i*2.6)+dz*(p.r*.2);const y=H(cx,cz);
  if(alongX)addBox(cx-1.5,y,cz-.45,cx+1.5,y+.5,cz+.45,['#ff8a3d','#2f7de1','#f2c230'][i]);
  else addBox(cx-.45,y,cz-1.5,cx+.45,y+.5,cz+1.5,['#ff8a3d','#2f7de1','#f2c230'][i])}
 lootSpots.push({x:p.x+dx*(shoreT-3)+(-dz)*3,z:p.z+dz*(shoreT-3)+dx*3,y:H(p.x,p.z)+.1,inside:false,chest:true,q:1.5});
 lootSpots.push({x:ex-dz*3,z:ez+dx*3,y:deck+.1,inside:false,chest:true,q:1.7});
 standSign('LAKE MUFFIN',p.x+dx*(p.r*.4)+(-dz)*-4,p.z+dz*(p.r*.4)+dx*-4,0,11,2.2,'#2a7fb8','#fff');
}
// Church (in the town districts): a nave with a steeple
function church(rng,p){
 const x=p.x-12,z=p.z+10,Y=H(x,z);
 if(H(x,z)<2.4||roadDist(x,z)<6)return;
 buildings.push(makeBuilding(rng,x,z,10,16,5,'s',{color:'#f1ece0',q:1.6,props:0,chest:.9}));
 addBox(x-1.6,Y,z-9.2,x+1.6,Y+12,z-6.8,'#e9e2d2');addBox(x-1.1,Y+12,z-8.4,x+1.1,Y+15.5,z-7.6,'#c9c0b0');addBox(x-.2,Y+15.5,z-8,x+.2,Y+19.5,z-8,'#8a3b2e');
 standSign('CHAPEL',x,z-13.5,0,8,1.8,'#7b5a3a','#fff');
}
// nearest flat, dry, empty ground with height in [lo, hi] from (x0, z0)
function findSpot(x0,z0,maxR,lo,hi){
 for(let r=0;r<=maxR;r+=4){const n=Math.max(1,Math.round(r/2));for(let k=0;k<n;k++){const a=k/n*6.283;const x=x0+Math.cos(a)*r,z=z0+Math.sin(a)*r;const h=H(x,z);if(h<lo||h>hi)continue;
  const[gx,gz]=slope(x,z);if(Math.hypot(gx,gz)>.45)continue;if(roadDist(x,z)<8)continue;if(POIS.some(p=>Math.hypot(x-p.x,z-p.z)<p.r*1.1))continue;
  if(LAKES.some(L=>Math.hypot(x-L.x,z-L.z)<L.r+8))continue;return{x,z,y:h}}}
 return null;
}
// highest ground within R of (x0, z0)
function findPeak(x0,z0,R){let best={x:x0,z:z0,y:-1e9};for(let x=x0-R;x<=x0+R;x+=3)for(let z=z0-R;z<=z0+R;z+=3){if(Math.hypot(x-x0,z-z0)>R)continue;const h=H(x,z);if(h>best.y)best={x,z,y:h}}return best}
// a lattice radio tower on a hill
function latticeTower(x,z,y,h){
 for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1]])addBox(x+sx*1.6-.3,y,z+sz*1.6-.3,x+sx*1.6+.3,y+h,z+sz*1.6+.3,'#c9d1da');
 for(let yy=y+4;yy<y+h-2;yy+=5){addBox(x-1.6,yy,z-.12,x+1.6,yy+.25,z+.12,'#8e96a0');addBox(x-.12,yy,z-1.6,x+.12,yy+.25,z+1.6,'#8e96a0')}
 addBox(x-.1,y+h,z-.1,x+.1,y+h+9,z+.1,'#dfe5ea');addBox(x-.25,y+h+9,z-.25,x+.25,y+h+9.5,z+.25,'#ff3d3d');
}
// Pyramid: stepped sandstone pyramid near the dunes
function pyramid(x,z,y){
 for(let k=0;k<6;k++){const h=7*(1-k/6)+.8;addBox(x-h,y+k*1.2,z-h,x+h,y+(k+1)*1.2,z+h,k%2?'#e8c77c':'#dcb865')}
}
// Shipwreck on the beach: a broken hull and a mast
function shipwreck(x,z,y){
 for(let i=0;i<5;i++){const hx=x-4+i*1.9;addBox(hx-.9,y+(i===0||i===4?.2:0),z-2.4,hx+.9,y+1.6-(i===0||i===4?.6:0),z+2.4,'#7a4a2a')}
 addBox(x-.2,y+1.6,z-.2,x+.2,y+8,z+.2,'#5a3a22');addBox(x+.2,y+5,z-.1,x+3.6,y+7.8,z+.1,'#f4f1de');
}
// Arch: two pillars and a lintel on the beach
function arch(x,z,y){
 addBox(x-5,y,z-1.2,x-3,y+9,z+1.2,'#d8d2c4');addBox(x+3,y,z-1.2,x+5,y+9,z+1.2,'#d8d2c4');addBox(x-6,y+9,z-1.5,x+6,y+10.8,z+1.5,'#cfc7b6');
}
// Windfarm and water tower landmarks
function turbine(x,z,y){addCyl(x,z,1.1,y,y+26);landmarks.push({k:'turbine',x,y,z})}
function watertower(x,z,y){addCyl(x,z,3.4,y,y+17);landmarks.push({k:'tank',x,y,z,r:3.4,h:6})}

function buildLandmarks(rng){
 // lighthouse on the coast
 {let lx=0,lz=0;const a=1.9;for(let r=340;r>120;r-=3){const x=Math.cos(a)*r,z=Math.sin(a)*r;if(H(x,z)>3.4){lx=x;lz=z;break}}const yy=H(lx,lz);addCyl(lx,lz,2.6,yy,yy+24);landmarks.push({k:'lighthouse',x:lx,y:yy,z:lz});lootSpots.push({x:lx+3.5,z:lz,y:yy+.1,inside:false,chest:true,q:1.8})}
 // Mount Muffin summit flag
 {const s=findPeak(-72,-112,40);landmarks.push({k:'flag',x:s.x,y:s.y,z:s.z});standSign('MOUNT MUFFIN',s.x+3,s.z+3,0.6,8,1.8,'#6a5acd','#fff');lootSpots.push({x:s.x-2,z:s.z+1.5,y:s.y+.1,inside:false,chest:true,q:2.4});lootSpots.push({x:s.x+1,z:s.z-2,y:s.y+.1,inside:false,chest:false,q:2})}
 // Radio Hill: a lattice tower on the highest ground of the south-west hills
 {const s=findPeak(-150,190,40);latticeTower(s.x,s.z,s.y,30);lootSpots.push({x:s.x+4,z:s.z+4,y:s.y+.1,inside:false,chest:true,q:2})}
 // windfarm on the south-east ridge
 for(const[x0,z0]of[[160,205],[185,225],[150,235]]){const s=findSpot(x0,z0,40,2,34);if(s){turbine(s.x,s.z,s.y);lootSpots.push({x:s.x+3,z:s.z,y:s.y+.1,inside:false,chest:true,q:1.4})}}
 // water tower beside Dusty Depot
 {const s=findSpot(195,-45,20,2,20);if(s){watertower(s.x,s.z,s.y);lootSpots.push({x:s.x+4,z:s.z+3,y:s.y+.1,inside:false,chest:true,q:1.3})}}
 // shipwreck on the beach near Pier Point
 {const s=findSpot(300,-110,70,.9,2.6);if(s){shipwreck(s.x,s.z,s.y);lootSpots.push({x:s.x+1,z:s.z,y:s.y+.1,inside:false,chest:true,q:1.9})}}
 // arch on the beach near Sandy Cove
 {const s=findSpot(235,205,60,2,8);if(s){arch(s.x,s.z,s.y);lootSpots.push({x:s.x,z:s.z+3,y:s.y+.1,inside:false,chest:true,q:1.6})}}
 // sand pyramid in the dunes east of Sunny Sands
 {const s=findSpot(245,-30,50,2,8);if(s){pyramid(s.x,s.z,s.y);lootSpots.push({x:s.x+8,z:s.z+8,y:s.y+.1,inside:false,chest:true,q:1.7})}}
 // lake sign on the far shore
 {const s=findSpot(LAKES[0].x-34,LAKES[0].z-22,16,1.2,8);if(s)standSign('LAKE MUFFIN',s.x,s.z,0.3,10,2,'#2a7fb8','#fff')}
}

export function buildMap(){
 if(built)return;built=true;const rng=mulberry32(1337);
 buildRoadNetwork();
 POIS.forEach((p,i)=>genPOI(rng,p,i));
 // rubble piles around each district (not in forts)
 POIS.forEach(p=>{if(p.type==='fort')return; for(let i=0;i<10;i++){const a=rng()*6.283,r=p.r*(.25+rng()*.7);const cx=p.x+Math.cos(a)*r,cz=p.z+Math.sin(a)*r;if(buildings.some(b=>Math.abs(cx-b.x)<b.w/2+2.5&&Math.abs(cz-b.z)<b.d/2+2.5))continue;const y=H(cx,cz);const sz=1.1+rng()*.9;const col=['#9b6a3a','#7a8a9a','#c0463a','#4a8a5a'][Math.floor(rng()*4)];partMat='stone';addBox(cx-sz/2,y,cz-sz/2,cx+sz/2,y+sz,cz+sz/2,col);if(rng()<.4)addBox(cx-sz/3,y+sz,cz-sz/3,cx+sz/3,y+sz*1.6,cz+sz/3,col);partMat=null}});
 buildLandmarks(rng);
 // trees: not in districts, not on roads, not on beaches or the lake shore
 for(let x=-ISL-20;x<ISL+20;x+=8)for(let z=-ISL-20;z<ISL+20;z+=8){
  const tx=x+(rng()-.5)*7,tz=z+(rng()-.5)*7;const h=H(tx,tz);if(h<2.6||h>34)continue;
  const f=fbm(tx*.03+40,tz*.03+40);if(f<.46&&rng()<.85)continue;if(f<.52&&rng()<.5)continue;
  if(roadDist(tx,tz)<5)continue;
  let bad=false;for(const p of POIS)if(Math.hypot(tx-p.x,tz-p.z)<p.r*(p.type==='cabins'?.55:1.12)){bad=true;break}if(bad)continue;
  if(LAKES.some(L=>Math.hypot(tx-L.x,tz-L.z)<L.r+6))continue;
  const[gx,gz]=slope(tx,tz);if(Math.hypot(gx,gz)>.7)continue;
  const sc=.8+rng()*.8;const c={x:tx,z:tz,r:.55*sc,y0:h,y1:h+9*sc,tree:true,sc,kind:rng()<.25?1:0,pk:'tree',mat:'tree',hp:TREE_HP,maxHp:TREE_HP,idx:treeList.length};treeList.push(c);insertCircle(c);circles.push(c)}
 // rocks
 for(let i=0;i<160;i++){const a=rng()*6.283,r=Math.sqrt(rng())*ISL*.9;const x=Math.cos(a)*r,z=Math.sin(a)*r;const h=H(x,z);if(h<2.4)continue;let bad=false;for(const p of POIS)if(Math.hypot(x-p.x,z-p.z)<p.r*.9){bad=true;break}if(bad)continue;if(roadDist(x,z)<4)continue;
  const sc=1+rng()*2.2;const c={x,z,r:1.1*sc,y0:h-1,y1:h+1.3*sc,rock:true,sc,rot:rng()*6,pk:'rock',mat:'rock',hp:rockHp(sc),maxHp:rockHp(sc),idx:rockList.length};rockList.push(c);insertCircle(c);circles.push(c)}
 // outdoor loot spots
 for(const p of POIS){const cnt=p.r>=50?16:p.r>=30?12:8;for(let i=0;i<cnt;i++){const a=rng()*6.283,r=Math.sqrt(rng())*p.r*.9;lootSpots.push({x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r,y:0,inside:false,chest:false,q:.7})}}
 for(let i=0;i<70;i++){const a=rng()*6.283,r=Math.sqrt(rng())*ISL*.85;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(H(x,z)<2.4)continue;lootSpots.push({x,z,y:0,inside:false,chest:false,q:.5})}
 for(const s of lootSpots)if(!s.inside)s.y=H(s.x,s.z)+.1;
 fixLootSpots();
}

export const landmarks=[];
function addCyl(x,z,r,y0,y1){const c={x,z,r,y0,y1};insertCircle(c);circles.push(c);return c}
const SIGN=(text,x,y,z,rot,w,h,bg,fg)=>landmarks.push({k:'sign',text,x,y,z,rot:rot||0,w,h,bg:bg||'#c0392b',fg:fg||'#fff'});
function standSign(text,x,z,rot,w,h,bg,fg){const pm=partMat;partMat=null;try{standSign_(text,x,z,rot,w,h,bg,fg)}finally{partMat=pm}}
function standSign_(text,x,z,rot,w,h,bg,fg){const y=H(x,z);const c=Math.cos(rot),sn=Math.sin(rot);for(const o of[-w/2+.4,w/2-.4]){addBox(x+c*o-.2,y,z-sn*o-.2,x+c*o+.2,y+h+1.6,z-sn*o+.2,'#6b5a45')}SIGN(text,x,y+1.6+h/2,z,rot,w,h,bg,fg)}
let built=false,treeList=[],rockList=[];
export const decorInst={tree:[],rock:[]}; // instanced meshes + pristine matrices, so felled trees/rocks can be hidden and restored

function spotBlocked(x,y,z,r){return blocked(x,y,z,r,1.2,.05)}
function nudgeSpot(s,r){ // find a nearby clear position, return true if found
 if(!spotBlocked(s.x,s.y,s.z,r))return true;
 for(let k=1;k<=14;k++){const rad=.6+k*.45;for(let j=0;j<8;j++){const a=j/8*6.283+k;const x=s.x+Math.cos(a)*rad,z=s.z+Math.sin(a)*rad;
  const y=s.inside?s.y:H(x,z)+.1;if(!s.inside&&H(x,z)<2.4)continue;
  if(s.inside&&!insideAnyBuilding(x,z))continue;
  if(!spotBlocked(x,y,z,r)){s.x=x;s.z=z;s.y=y;return true}}}
 return false}
function insideAnyBuilding(x,z){for(const b of buildings)if(Math.abs(x-b.x)<b.w/2-.9&&Math.abs(z-b.z)<b.d/2-.9)return true;return false}
function fixLootSpots(){
 const keep=[];
 for(const s of lootSpots){
  if(!s.inside){ // outdoor: not in water, not on steep cliffs, not inside walls/trees/rocks
   s.y=H(s.x,s.z)+.1;if(s.y<2.4)continue;
   const[gx,gz]=slope(s.x,s.z);if(Math.hypot(gx,gz)>.9)continue}
  if(!nudgeSpot(s,s.chest?.75:.4))continue; // drop spots that are buried in a wall/prop and can't be moved
  keep.push(s)}
 lootSpots.length=0;for(const s of keep)lootSpots.push(s);
 const r2=mulberry32(4242);
 // inside buildings: one extra chest in most buildings that have none
 for(const b of buildings){
  if(lootSpots.some(s=>s.chest&&s.inside&&Math.abs(s.x-b.x)<b.w/2&&Math.abs(s.z-b.z)<b.d/2))continue;
  if(r2()<.55){const s={x:b.x+(r2()-.5)*(b.w-4),z:b.z+(r2()<.5?-1:1)*(b.d/2-1.1),y:b.y0+.1,door:b.door,inside:true,chest:true,q:1.3};if(nudgeSpot(s,.75))lootSpots.push(s)}}
 // outdoor chests in each district: two (three in the fort), kept apart
 for(const p of POIS){
  const n=p.type==='fort'?3:2;let made=0;
  for(let t=0;t<40&&made<n;t++){const a=r2()*6.283,r=p.r*(.3+r2()*.7);const s={x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r,y:0,inside:false,chest:true,q:1.4};
   s.y=H(s.x,s.z)+.1;if(s.y<2.6)continue;const[gx,gz]=slope(s.x,s.z);if(Math.hypot(gx,gz)>.6)continue;
   if(!nudgeSpot(s,.75))continue;if(lootSpots.some(o=>o.chest&&Math.hypot(o.x-s.x,o.z-s.z)<14))continue;lootSpots.push(s);made++}}
 // scenic chests replace the old random wilderness chests: on hilltops, along the lake and the coast, spread out
 const spread=lootSpots.filter(s=>s.chest).map(s=>[s.x,s.z]);
 let w=0;
 for(let t=0;t<900&&w<12;t++){
  const a=r2()*6.283,r=Math.sqrt(r2())*ISL*.82;const x=Math.cos(a)*r,z=Math.sin(a)*r;const h=H(x,z);
  const dl=LAKES.reduce((m,L)=>Math.min(m,Math.hypot(x-L.x,z-L.z)-L.r),1e9);
  const hill=h>14,shore=h>.8&&h<2.4&&r>ISL*.7,lake=dl>-2&&dl<10&&h>.9&&h<3;
  if(!(hill||shore||lake))continue;
  const[gx,gz]=slope(x,z);if(Math.hypot(gx,gz)>.6)continue;
  if(spread.some(([sx,sz])=>Math.hypot(sx-x,sz-z)<50))continue;
  const s={x,z,y:h+.1,inside:false,chest:true,q:1};
  if(!nudgeSpot(s,.75))continue;
  lootSpots.push(s);spread.push([s.x,s.z]);w++}
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
// the surface a body at (x, y, z) stands on: terrain, or the top of a solid it is resting on (own buffer, safe inside blocked())
const _sb=[];
function supportUnder(x,z,y,r){let g=H(x,z);query(x,z,r+1,_sb);
 for(let i=0;i<_sb.length;i++){const b=_sb[i];if(b.circ!==false)continue;if(x+r>b.x0&&x-r<b.x1&&z+r>b.z0&&z-r<b.z1&&b.y1<=y+.05&&b.y1>g)g=b.y1}return g}
// v28: a box is only a step to climb if its top is within `step` of the ground under the body, not of its feet. A body
// that is airborne (jumping, falling, stuck recovery) can no longer slide sideways through a window sill or a low wall.
export function blocked(x,y,z,r,h,step=.65){query(x,z,r+1,_b);let sup=null;
 for(let i=0;i<_b.length;i++){const b=_b[i];
  if(b.circ===false){if(x+r>b.x0&&x-r<b.x1&&z+r>b.z0&&z-r<b.z1&&y+h>b.y0&&y<b.y1-.02){if(y<b.y1-step)return true;if(sup===null)sup=supportUnder(x,z,y,r);if(b.y1>sup+step)return true}}
  else{const dx=x-b.x,dz=z-b.z,rr=b.r+r;if(dx*dx+dz*dz<rr*rr&&y<b.y1&&y+h>b.y0)return true}}return false}
export function pushOutCircles(e,r,h){query(e.pos.x,e.pos.z,r+3,_b);for(let i=0;i<_b.length;i++){const b=_b[i];if(b.circ===false)continue;const dx=e.pos.x-b.x,dz=e.pos.z-b.z,rr=b.r+r,d2=dx*dx+dz*dz;if(d2<rr*rr&&e.pos.y<b.y1&&e.pos.y+h>b.y0){const d=Math.sqrt(d2)||.001;e.pos.x=b.x+dx/d*rr;e.pos.z=b.z+dz/d*rr}}}
// ---------------- meshes
// ---- roads: real road surfaces that follow the hills (asphalt, edge lines, a dashed centre line and kerbs)
function roadSamples(i,step){
 const P=PATH.get(i);const n=Math.max(2,Math.ceil(P.len/step));const out=[];
 for(let k=0;k<=n;k++){
  const t=k/n,p=roadPointAt(i,t),e=.006;
  const q1=roadPointAt(i,Math.max(0,t-e)),q2=roadPointAt(i,Math.min(1,t+e));
  let tx=q2.x-q1.x,tz=q2.z-q1.z;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
  out.push({x:p.x,z:p.z,nx:-tz,nz:tx,s:t*P.len});
 }
 return out;
}
// a band across the road from offset lo to offset hi (metres to the side), on top of the ground
function roadBand(arr,S,lo,hi,lift,onlyIf){
 const put=(x,z)=>[x,H(x,z)+lift,z];
 for(let i=0;i<S.length-1;i++){
  const A=S[i],B=S[i+1];if(onlyIf&&!(onlyIf(A)&&onlyIf(B)))continue;
  const v=[put(A.x+A.nx*hi,A.z+A.nz*hi),put(A.x+A.nx*lo,A.z+A.nz*lo),put(B.x+B.nx*lo,B.z+B.nz*lo),put(B.x+B.nx*hi,B.z+B.nz*hi)];
  if(v.some(q=>q[1]-lift<.6))continue;      // not on land (water or the very edge of the beach)
  for(const k of[0,1,2,0,2,3])arr.push(v[k][0],v[k][1],v[k][2]);
 }
}
// a round patch of road: fills the corners where roads meet and rounds off the end of a road at a district gate
function roadDisc(arr,x,z,r,lift){
 const n=16;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832;
  for(const[px,pz]of[[x,z],[x+Math.cos(a0)*r,z+Math.sin(a0)*r],[x+Math.cos(a1)*r,z+Math.sin(a1)*r]])arr.push(px,H(px,pz)+lift,pz)}
}
function buildRoads(){
 const grp=new THREE.Group();
 const bands={asph:[],edge:[],dash:[],kerb:[]};
 const juncs=ROAD_NODES.filter(n=>n.deg>=3),ends=ROAD_NODES;
 const nearJ=(x,z,r)=>{for(const j of juncs)if((x-j.x)**2+(z-j.z)**2<r*r)return true;return false};
 const nearN=(x,z,r)=>{for(const j of ends)if((x-j.x)**2+(z-j.z)**2<r*r)return true;return false};
 for(const[a,b,idx]of ROADS){
  const S=roadSamples(idx,1.2);
  roadBand(bands.asph,S,-3.4,3.4,.12);                              // the road surface
  roadBand(bands.edge,S,3.05,3.3,.14,A=>!nearJ(A.x,A.z,6.8));        // white edge lines (not across a junction)
  roadBand(bands.edge,S,-3.3,-3.05,.14,A=>!nearJ(A.x,A.z,6.8));
  roadBand(bands.dash,S,-.14,.14,.15,A=>A.s%7.2<3.6&&!nearN(A.x,A.z,6.5));   // dashed centre line
  roadBand(bands.kerb,S,3.4,4.0,.2,A=>!nearJ(A.x,A.z,6.4));           // kerbs on both sides
  roadBand(bands.kerb,S,-4.0,-3.4,.2,A=>!nearJ(A.x,A.z,6.4));
 }
 for(const n of ROAD_NODES)roadDisc(bands.asph,n.x,n.z,n.deg>=3?5.6:3.5,.12);
 const mats={asph:'#4a4d54',edge:'#eef0f2',dash:'#f2c94c',kerb:'#c9bd9c'};
 for(const k in bands){
  if(!bands[k].length)continue;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(bands[k],3));geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:mats[k],side:THREE.DoubleSide}));m.receiveShadow=true;grp.add(m);
 }
 return grp;
}

export function buildMeshes(scene,quality={}){
 const g=new THREE.Group();scene.add(g);
 const N=380,size=HALF*2;
 const geo=new THREE.PlaneGeometry(size,size,N,N);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position,col=new Float32Array(pos.count*3);const c=new THREE.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const h=H(x,z);pos.setY(i,h);
  const[gx,gz]=slope(x,z);const sl=Math.hypot(gx,gz);const n=fbm(x*.08,z*.08);
  if(h<-.2)c.set('#2d6a8a').lerp(new THREE.Color('#14304a'),clamp(-h/14,0,1));
  else if(h<1.8)c.set('#e3d39a').lerp(new THREE.Color('#d6c283'),n);
  else if(h>34)c.set('#f2f5f7').lerp(new THREE.Color('#cfd8de'),n*.5);
  else if(sl>.75||h>26)c.set('#8b8579').lerp(new THREE.Color('#6f6a60'),n);
  else{const pn=vnoise(x*.035+9,z*.035+4);c.set('#6fc04a').lerp(new THREE.Color('#4a9a38'),n*1.3).lerp(new THREE.Color('#9ad45a'),clamp(.5-n,0,.5)).lerp(new THREE.Color('#3f8a42'),clamp((pn-.5)*2,0,.7)).lerp(new THREE.Color('#b8d860'),clamp((.35-pn)*2,0,.5))}
  if(h>1.8&&h<34){const rd=roadDist(x,z);if(rd<4.2)c.lerp(new THREE.Color(rd<2.6?'#4b4e55':'#c4b89a'),clamp((4.2-rd)/1.2,0,1)*.95)}
  for(const p of POIS){const d=Math.hypot(x-p.x,z-p.z);if(d<ringR(p)-3&&h>1.8){c.lerp(new THREE.Color(p.type==='suburb'?'#7bb85a':'#9a9a96'),sstep(ringR(p)-3,p.r*.5,d)*.75)}}
  for(const nd of ROAD_NODES){if(!nd.gate)continue;const d=Math.hypot(x-nd.x,z-nd.z);if(d<11&&h>1.8)c.lerp(new THREE.Color('#9a9a96'),sstep(11,5,d)*.8)}
  col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
 const terrain=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true}));terrain.receiveShadow=true;g.add(terrain);
 g.add(buildRoads());
 const water=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshPhongMaterial({color:'#2f86c8',transparent:true,opacity:.82,shininess:90,specular:'#aee'}));water.rotation.x=-Math.PI/2;water.position.y=WATER;g.add(water);
 // boxes
 const bg=new THREE.BoxGeometry(1,1,1),bm=new THREE.MeshLambertMaterial({color:0xffffff});
 const im=new THREE.InstancedMesh(bg,bm,boxVis.length);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3();
 boxVis.forEach((b,i)=>{ps.set((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.z0+b.z1)/2);sc.set(b.x1-b.x0,b.y1-b.y0,b.z1-b.z0);m4.compose(ps,q,sc);im.setMatrixAt(i,m4);im.setColorAt(i,c.set(b.c))});
 im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;im.castShadow=im.receiveShadow=true;g.add(im);
 boxInst={im,orig:im.instanceMatrix.array.slice()};
 // trees
 const trunkG=new THREE.CylinderGeometry(.22,.32,3,6);trunkG.translate(0,1.5,0);const crownG=new THREE.ConeGeometry(1.7,4.2,7);crownG.translate(0,5,0);const crown2=new THREE.ConeGeometry(1.2,3.2,7);crown2.translate(0,7.2,0);
 const tm=new THREE.InstancedMesh(trunkG,new THREE.MeshLambertMaterial({color:'#6b4a2b'}),treeList.length);
 const cm=new THREE.InstancedMesh(crownG,new THREE.MeshLambertMaterial({color:0xffffff}),treeList.length);
 const cm2=new THREE.InstancedMesh(crown2,new THREE.MeshLambertMaterial({color:0xffffff}),treeList.length);
 treeList.forEach((t,i)=>{ps.set(t.x,t.y0-.2,t.z);sc.set(t.sc,t.sc,t.sc);m4.compose(ps,q,sc);tm.setMatrixAt(i,m4);cm.setMatrixAt(i,m4);cm2.setMatrixAt(i,m4);const cc=t.kind?c.set('#3d7a44').offsetHSL(0,0,hash(i,5)*.06):c.set('#4f9a3a').offsetHSL(0,0,hash(i,9)*.08);cm.setColorAt(i,cc);cm2.setColorAt(i,cc)});
 [tm,cm,cm2].forEach(m=>{m.instanceMatrix.needsUpdate=true;m.castShadow=m.receiveShadow=true;g.add(m)});cm.instanceColor.needsUpdate=true;cm2.instanceColor.needsUpdate=true;
 decorInst.tree=[tm,cm,cm2].map(m=>({m,orig:m.instanceMatrix.array.slice()}));
 const rm=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshLambertMaterial({color:'#8a8a85',flatShading:true}),rockList.length);
 rockList.forEach((r,i)=>{ps.set(r.x,r.y0+r.sc*.4,r.z);q.setFromEuler(new THREE.Euler(r.rot,r.rot*2,0));sc.set(r.r*1.05,r.sc*.8,r.r*1.05);m4.compose(ps,q,sc);rm.setMatrixAt(i,m4)});q.identity();rm.castShadow=rm.receiveShadow=true;g.add(rm);
 decorInst.rock=[{m:rm,orig:rm.instanceMatrix.array.slice()}];
 // clouds
 const cg=new THREE.BoxGeometry(1,1,1),cmat=new THREE.MeshBasicMaterial({color:'#fff',transparent:true,opacity:.85,fog:false});const clouds=new THREE.InstancedMesh(cg,cmat,24);
 const r2=mulberry32(5);for(let i=0;i<24;i++){ps.set((r2()-.5)*1400,170+r2()*60,(r2()-.5)*1400);sc.set(60+r2()*80,10+r2()*8,30+r2()*40);m4.compose(ps,q,sc);clouds.setMatrixAt(i,m4)}g.add(clouds);
 return {group:g,water,terrain};
}
export {treeList,rockList};
// v28 scenery: street lamps every ~42 m along each road (on the verge, never in the carriageway), and grass tufts in open ground
export function lampSpots(){
 const out=[];
 for(const [a,b,idx] of ROADS){const P=PATH.get(idx);if(!P)continue;
  for(let s=14;s<P.len-10;s+=42){const t=s/P.len;const p=roadPointAt(idx,t);const side=((idx*7)%2?1:-1);
   const x=p.x-p.dz*5.2*side,z=p.z+p.dx*5.2*side;
   if(H(x,z)<2.2||roadDist(x,z)>7)continue;
   if(buildings.some(q=>Math.abs(x-q.x)<q.w/2+1.5&&Math.abs(z-q.z)<q.d/2+1.5))continue;
   out.push({x,z,y:H(x,z)})}}
 return out}
export function addDecor(scene){
 const rng=mulberry32(77),pts=[];
 for(let i=0;i<1400;i++){const a=rng()*6.283,r=Math.sqrt(rng())*ISL*.92;const x=Math.cos(a)*r,z=Math.sin(a)*r;const h=H(x,z);if(h<2.2||h>30)continue;if(roadDist(x,z)<4)continue;let bad=false;for(const p of POIS)if(Math.hypot(x-p.x,z-p.z)<p.r*.8){bad=true;break}if(bad)continue;pts.push([x,h,z,.6+rng()*.9,rng()])}
 const g=new THREE.IcosahedronGeometry(1,0),m=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true}),pts.length);
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3(),c=new THREE.Color();
 pts.forEach((p,i)=>{ps.set(p[0],p[1]+p[3]*.35,p[2]);sc.set(p[3],p[3]*.7,p[3]);m4.compose(ps,q,sc);m.setMatrixAt(i,m4);m.setColorAt(i,p[4]<.12?c.set('#ff7ab8'):p[4]<.2?c.set('#ffd84a'):c.set('#3f9a3a').offsetHSL(0,0,(p[4]-.5)*.12))});
 m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;scene.add(m);

 const anim=[];const mk=(g,c,x,y,z,sx,sy,sz,rx,ry,rz,em)=>{const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial(Object.assign({color:c,flatShading:true},em?{emissive:em,emissiveIntensity:.8}:{})));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx||0,ry||0,rz||0);return m};
 const BX=new THREE.BoxGeometry(1,1,1),CY=new THREE.CylinderGeometry(.5,.5,1,18),SP=new THREE.SphereGeometry(.5,16,12),TO=new THREE.TorusGeometry(1,.04,6,40);
 const signTex=(text,bg,fg)=>{const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,512,128);x.strokeStyle=fg;x.lineWidth=8;x.strokeRect(6,6,500,116);x.fillStyle=fg;x.font='900 64px Arial Black,Impact,sans-serif';x.textAlign='center';x.textBaseline='middle';let fs=64;while(x.measureText(text).width>470&&fs>20){fs-=4;x.font='900 '+fs+'px Arial Black,Impact,sans-serif'}x.fillText(text,256,68);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t};
 const clockTex=()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#f5efe0';x.beginPath();x.arc(128,128,124,0,6.283);x.fill();x.strokeStyle='#222';x.lineWidth=8;x.stroke();x.fillStyle='#222';for(let i=0;i<12;i++){const a=i/12*6.283;x.fillRect(128+Math.sin(a)*100-4,128-Math.cos(a)*100-4,8,8)}x.lineWidth=10;x.lineCap='round';x.beginPath();x.moveTo(128,128);x.lineTo(128,60);x.stroke();x.beginPath();x.moveTo(128,128);x.lineTo(176,150);x.stroke();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t};
 for(const l of landmarks){
  const g=new THREE.Group();g.position.set(l.x,l.y,l.z);
  if(l.k==='sign'){const m=new THREE.Mesh(new THREE.PlaneGeometry(l.w,l.h),new THREE.MeshBasicMaterial({map:signTex(l.text,l.bg,l.fg),side:THREE.DoubleSide}));m.rotation.y=l.rot;m.position.set(l.x,l.y,l.z);scene.add(m);continue}
  if(l.k==='clock'){const tex=clockTex();for(const[ox,oz,ry]of[[0,3.25,0],[0,-3.25,Math.PI],[3.25,0,Math.PI/2],[-3.25,0,-Math.PI/2]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(l.h*1.6,l.h*1.6),new THREE.MeshBasicMaterial({map:tex,transparent:true}));m.position.set(ox,0,oz);m.rotation.y=ry;g.add(m)}scene.add(g);continue}
  if(l.k==='burger'){const bg=new THREE.Group();bg.add(mk(CY,'#e0a050',0,0,0,4.6,1,4.6));bg.add(mk(CY,'#5a3418',0,.85,0,4.8,.8,4.8));bg.add(mk(BX,'#ffd23d',0,1.35,0,4.9,.22,4.9));bg.add(mk(CY,'#58c04a',0,1.6,0,5.2,.4,5.2));bg.add(mk(CY,'#e03a2a',0,2,0,4.8,.35,4.8));bg.add(mk(SP,'#e8a04a',0,2.5,0,4.9,3.4,4.9));for(let i=0;i<7;i++){const a=i*.9;bg.add(mk(SP,'#fff3d0',Math.cos(a)*1.4,3.5+Math.sin(i*2)*.15,Math.sin(a)*1.4,.35,.2,.35))}g.add(bg);scene.add(g);anim.push(t=>{bg.rotation.y=t*.9;bg.position.y=Math.sin(t*1.6)*.25});continue}
  if(l.k==='wheel'){const w=new THREE.Group();w.add(mk(TO,'#ffffff',0,0,0,8,8,8,0,0,0));w.children[0].scale.set(8,8,8);const gl=[];for(let i=0;i<8;i++){const sp=mk(BX,'#e0e6ee',0,0,0,.15,16,.15,0,0,i/8*Math.PI);w.add(sp)}for(let i=0;i<12;i++){const a=i/12*6.283;const gd=new THREE.Group();gd.position.set(Math.cos(a)*8,Math.sin(a)*8,0);gd.add(mk(BX,['#ff4a8a','#ffd23d','#3dd0ff','#6aff8a'][i%4],0,-.8,0,1.6,1.1,1.4));w.add(gd);gl.push(gd)}g.add(w);scene.add(g);anim.push(t=>{w.rotation.z=t*.22;for(const d of gl)d.rotation.z=-w.rotation.z});continue}
  if(l.k==='windmill'){g.add(mk(CY,'#e8dcc0',0,6.5,0,3.4,13,3.4));g.children[0].scale.set(3.4,13,3.4);g.add(mk(SP,'#8a3a2a',0,13.2,0,3.2,2.4,3.2));const bl=new THREE.Group();bl.position.set(0,13,2);for(let i=0;i<4;i++){const b=mk(BX,'#f4f0e6',0,0,0,1.1,7.5,.15,0,0,i*Math.PI/2);b.position.set(-Math.sin(i*Math.PI/2)*3.9,Math.cos(i*Math.PI/2)*3.9,0);bl.add(b)}g.add(bl);scene.add(g);anim.push(t=>{bl.rotation.z=t*.7});continue}
  if(l.k==='silo'){g.add(mk(CY,'#d5dadf',0,5.5,0,5.2,11,5.2));g.add(mk(SP,'#c0392b',0,11,0,5.2,2.6,5.2));scene.add(g);continue}
  if(l.k==='lighthouse'){for(let i=0;i<4;i++){const r=4.8-i*.55;g.add(mk(CY,i%2?'#d93a3a':'#f6f6f6',0,i*5.5+2.75,0,r,5.5,r))}g.add(mk(CY,'#333',0,22.2,0,5,.5,5));g.add(mk(CY,'#fff7a0',0,23.4,0,2.2,2,2.2,0,0,0,'#ffe066'));g.add(mk(SP,'#d93a3a',0,25,0,3,2.4,3));const beam=new THREE.Mesh(new THREE.BoxGeometry(60,1.2,2.6),new THREE.MeshBasicMaterial({color:'#fff3a0',transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));beam.position.set(0,23.4,0);g.add(beam);scene.add(g);anim.push(t=>{beam.rotation.y=t*1.2});continue}
  if(l.k==='turbine'){g.add(mk(CY,'#f4f6f8',0,13,0,1.1,26,1.1));const hub=new THREE.Group();hub.position.set(0,26,.6);for(let i=0;i<3;i++){const th=i*2.094;const b=mk(BX,'#fbfdff',0,0,0,.6,12,.12,0,0,-th);b.position.set(Math.sin(th)*6,Math.cos(th)*6,0);hub.add(b)}g.add(hub);scene.add(g);anim.push(t=>{hub.rotation.z=t*.9});continue}
  if(l.k==='tank'){g.add(mk(CY,'#e9edf1',0,10+l.h/2,0,l.r*2,l.h,l.r*2));g.add(mk(SP,'#e9edf1',0,10+l.h,0,l.r*2,l.r*.9,l.r*2));for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1]])g.add(mk(BX,'#8e96a0',sx*l.r*.7,5,sz*l.r*.7,.5,10,.5));scene.add(g);continue}
  if(l.k==='flag'){g.add(mk(CY,'#cfcfcf',0,5,0,.25,10,.25));const cl=mk(BX,'#ff3d6a',1.4,9,0,2.8,1.8,.08);g.add(cl);scene.add(g);anim.push(t=>{cl.rotation.y=Math.sin(t*3)*.25;cl.scale.x=2.8+Math.sin(t*5)*.15});continue}
 }
  // ---- v28 scenery: street lamps, grass tufts and a flock of birds
  {const lamps=lampSpots();const pole=new THREE.CylinderGeometry(.09,.12,4.6,7),head=new THREE.BoxGeometry(.5,.22,.5);
   const pm=new THREE.InstancedMesh(pole,new THREE.MeshLambertMaterial({color:'#3f4650'}),Math.max(1,lamps.length));
   const hm=new THREE.InstancedMesh(head,new THREE.MeshLambertMaterial({color:'#fff3c0',emissive:'#ffcc66',emissiveIntensity:.9}),Math.max(1,lamps.length));
   lamps.forEach((l,i)=>{m4.compose(ps.set(l.x,l.y+2.3,l.z),q.identity(),sc.set(1,1,1));pm.setMatrixAt(i,m4);m4.compose(ps.set(l.x,l.y+4.7,l.z),q.identity(),sc.set(1,1,1));hm.setMatrixAt(i,m4)});
   pm.count=lamps.length;hm.count=lamps.length;pm.castShadow=true;scene.add(pm);scene.add(hm);}
  {const gp=[];const gr=mulberry32(91);
   for(let i=0;i<2400;i++){const a=gr()*6.283,r=Math.sqrt(gr())*ISL*.9;const x=Math.cos(a)*r,z=Math.sin(a)*r;const h=H(x,z);
    if(h<2.4||h>22||roadDist(x,z)<5||POIS.some(p=>Math.hypot(x-p.x,z-p.z)<p.r*1.05))continue;
    if(LAKES.some(L=>Math.hypot(x-L.x,z-L.z)<L.r+4))continue;gp.push([x,h,z,.35+gr()*.4])}
   const tuft=new THREE.ConeGeometry(.18,.7,4);tuft.translate(0,.35,0);
   const gm=new THREE.InstancedMesh(tuft,new THREE.MeshLambertMaterial({color:0xffffff}),Math.max(1,gp.length));
   gp.forEach((g,i)=>{m4.compose(ps.set(g[0],g[1],g[2]),q.identity(),sc.set(g[3],g[3],g[3]));gm.setMatrixAt(i,m4);gm.setColorAt(i,c.set(gr()<.2?'#d9c24a':gr()<.15?'#e87ab0':'#5fae45'))});
   gm.count=gp.length;gm.instanceColor.needsUpdate=true;gm.instanceMatrix.needsUpdate=true;scene.add(gm);}
  {const flock=[];const br=mulberry32(33);
   const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-1.2,.25,.2,0,0,.5,0,0,0,0,0,.5,1.2,.25,.2],3));bg.computeVertexNormals();
   const flockM=new THREE.InstancedMesh(bg,new THREE.MeshLambertMaterial({color:'#2a2a33',side:THREE.DoubleSide}),14);
   for(let i=0;i<14;i++)flock.push({cx:br()*600-300,cz:br()*600-300,r:60+br()*120,sp:.05+br()*.05,ph:br()*6.283,y:70+br()*40});
   scene.add(flockM);
   anim.push(t=>{for(let i=0;i<flock.length;i++){const f=flock[i];const a=f.ph+t*f.sp;const x=f.cx+Math.cos(a)*f.r,z=f.cz+Math.sin(a)*f.r;
    const yaw=-a+Math.PI/2;const flap=Math.sin(t*6+i)*.25;
    q.setFromEuler(new THREE.Euler(0,yaw,0));m4.compose(ps.set(x,f.y+Math.sin(t*.7+i)*2,z),q,sc.set(2.2,1+flap,2.2));flockM.setMatrixAt(i,m4)}flockM.instanceMatrix.needsUpdate=true})}
 return {update(t){for(const a of anim)a(t)}}
}

// ---------------- building support
// runtime solids (player-built pieces). Removed boxes keep a `gone` flag so grid cells that still list them skip them.
export function addSolid(b){b.circ=false;b.gone=false;boxes.push(b);insertBox(b);return b}
export function removeSolid(b){b.gone=true;const i=boxes.indexOf(b);if(i>=0)boxes.splice(i,1)}
// hide a destroyed static box's instance (zero matrix)
export function hideBox(b){if(!boxInst||b.vi===undefined)return;boxInst.im.instanceMatrix.array.fill(0,b.vi*16,b.vi*16+16);boxInst.im.instanceMatrix.needsUpdate=true}
// true if the axis-aligned box overlaps any solid (static boxes, cylinders, pieces)
export function overlapsSolid(x0,y0,z0,x1,y1,z1){
 const cx=(x0+x1)/2,cz=(z0+z1)/2,r=Math.max(x1-x0,z1-z0)/2+1;query(cx,cz,r,_b);
 for(let i=0;i<_b.length;i++){const b=_b[i];
  if(b.circ===false){if(x1>b.x0&&x0<b.x1&&z1>b.z0&&z0<b.z1&&y1>b.y0&&y0<b.y1)return true}
  else{const nx=Math.max(x0,Math.min(b.x,x1)),nz=Math.max(z0,Math.min(b.z,z1));if((nx-b.x)**2+(nz-b.z)**2<b.r*b.r&&y1>b.y0&&y0<b.y1)return true}}
 return false}
// hide a tree or rock: zero its instance matrices and drop its collider
export function removeDecor(kind,c){
 if(!c||c.gone)return;c.gone=true;const arr=kind==='tree'?treeList:rockList;const i=arr.indexOf(c);if(i<0)return;
 for(const d of decorInst[kind]){d.m.instanceMatrix.array.fill(0,i*16,i*16+16);d.m.instanceMatrix.needsUpdate=true}}
// put every felled tree and rock back (between matches)
export function restoreDecor(){
 for(const kind of['tree','rock'])for(const d of decorInst[kind]){d.m.instanceMatrix.array.set(d.orig);d.m.instanceMatrix.needsUpdate=true}
 for(const c of[...treeList,...rockList]){c.gone=false;c.dead=false;c.hp=c.maxHp}
 for(const b of wparts){if(b.gone){b.gone=false;boxes.push(b)}b.dead=false;b.hp=b.maxHp}
 for(const bl of BLD){for(const q of bl.parts){if(q.gone){q.gone=false;boxes.push(q)}}bl.collapsed=false;bl.collapsing=false;bl.fallT=0;bl.hurtDone=false;bl.restT=undefined;bl.supLeft=bl.supports.length}
 if(boxInst){boxInst.im.instanceMatrix.array.set(boxInst.orig);boxInst.im.instanceMatrix.needsUpdate=true}}
