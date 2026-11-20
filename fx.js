import * as THREE from 'three';
const MAXP=1800;
function softTex(){const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');const g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,32,32);return new THREE.CanvasTexture(c)}
export class FX{
 constructor(scene){
  this.scene=scene;this.density=1;
  const g=new THREE.BufferGeometry();this.pp=new Float32Array(MAXP*3);this.pc=new Float32Array(MAXP*3);
  g.setAttribute('position',new THREE.BufferAttribute(this.pp,3));g.setAttribute('color',new THREE.BufferAttribute(this.pc,3));
  this.vel=new Float32Array(MAXP*3);this.life=new Float32Array(MAXP);this.maxLife=new Float32Array(MAXP);this.base=new Float32Array(MAXP*3);this.grav=new Float32Array(MAXP);this.n=0;
  this.pts=new THREE.Points(g,new THREE.PointsMaterial({size:.45,map:softTex(),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));this.pts.frustumCulled=false;scene.add(this.pts);
  this.tr=[];this.trGeo=new THREE.BoxGeometry(1,1,1);
  this.blasts=[];this.rings=[];
 }
 emit(x,y,z,vx,vy,vz,color,life,grav=0){
  let i=this.n<MAXP?this.n++:Math.floor(Math.random()*MAXP);
  this.pp[i*3]=x;this.pp[i*3+1]=y;this.pp[i*3+2]=z;this.vel[i*3]=vx;this.vel[i*3+1]=vy;this.vel[i*3+2]=vz;
  const c=color instanceof THREE.Color?color:new THREE.Color(color);this.base[i*3]=c.r;this.base[i*3+1]=c.g;this.base[i*3+2]=c.b;this.life[i]=this.maxLife[i]=life;this.grav[i]=grav}
 burst(x,y,z,n,speed,color,life=.6,grav=0,spreadY=1){n=Math.max(1,Math.floor(n*this.density));for(let i=0;i<n;i++){const a=Math.random()*6.283,b=(Math.random()*2-1)*spreadY,r=Math.sqrt(1-b*b);const s=speed*(.3+Math.random()*.7);this.emit(x,y,z,Math.cos(a)*r*s,b*s,Math.sin(a)*r*s,color,life*(.6+Math.random()*.6),grav)}}
 spark(x,y,z,nx,ny,nz,color='#ffd070'){const n=Math.max(2,Math.floor(6*this.density));for(let i=0;i<n;i++){this.emit(x,y,z,nx*4+(Math.random()-.5)*5,ny*4+Math.random()*3,nz*4+(Math.random()-.5)*5,color,.35,14)}}
 tracer(a,b,color='#ffe9a0',w=.035,life=.07){
  const m=new THREE.Mesh(this.trGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,fog:false}));
  const len=a.distanceTo(b);m.position.copy(a).lerp(b,.5);m.scale.set(w,w,len);m.lookAt(b);this.scene.add(m);this.tr.push({m,t:life,l:life})}
 explosion(p,r,color='#ff9a3c'){
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,fog:false}));m.position.copy(p);this.scene.add(m);this.blasts.push({m,t:.45,l:.45,r});
  this.ring(p,r,'#ffe0a0');
  this.burst(p.x,p.y,p.z,70,r*2.8,'#ff8a2a',.8,2);this.burst(p.x,p.y,p.z,40,r*1.6,'#ffd060',.5,0);this.burst(p.x,p.y+.5,p.z,30,r*1.2,'#555',1.2,-1,.4)}
 ring(p,r,color='#6ec6ff',t=.5){const m=new THREE.Mesh(new THREE.RingGeometry(.85,1,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide,fog:false,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.copy(p);m.position.y+=.1;this.scene.add(m);this.rings.push({m,t,l:t,r})}
 update(dt){
  const P=this.pp,C=this.pc;
  for(let i=0;i<this.n;i++){
   if(this.life[i]<=0){ // swap-remove
    const j=this.n-1;if(i!==j){for(let k=0;k<3;k++){P[i*3+k]=P[j*3+k];this.vel[i*3+k]=this.vel[j*3+k];this.base[i*3+k]=this.base[j*3+k]}this.life[i]=this.life[j];this.maxLife[i]=this.maxLife[j];this.grav[i]=this.grav[j]}this.n--;i--;continue}
   this.life[i]-=dt;this.vel[i*3+1]-=this.grav[i]*dt;P[i*3]+=this.vel[i*3]*dt;P[i*3+1]+=this.vel[i*3+1]*dt;P[i*3+2]+=this.vel[i*3+2]*dt;
   const f=Math.max(0,this.life[i]/this.maxLife[i]);C[i*3]=this.base[i*3]*f;C[i*3+1]=this.base[i*3+1]*f;C[i*3+2]=this.base[i*3+2]*f}
  for(let i=this.n;i<Math.min(MAXP,this.n+30);i++){C[i*3]=C[i*3+1]=C[i*3+2]=0}
  this.pts.geometry.setDrawRange(0,this.n);this.pts.geometry.attributes.position.needsUpdate=true;this.pts.geometry.attributes.color.needsUpdate=true;
  for(let i=this.tr.length-1;i>=0;i--){const t=this.tr[i];t.t-=dt;t.m.material.opacity=Math.max(0,t.t/t.l);if(t.t<=0){this.scene.remove(t.m);t.m.material.dispose();this.tr.splice(i,1)}}
  for(let i=this.blasts.length-1;i>=0;i--){const b=this.blasts[i];b.t-=dt;const k=1-b.t/b.l;b.m.scale.setScalar(b.r*(.3+k*.9));b.m.material.opacity=.9*(1-k);if(b.t<=0){this.scene.remove(b.m);b.m.geometry.dispose();b.m.material.dispose();this.blasts.splice(i,1)}}
  for(let i=this.rings.length-1;i>=0;i--){const b=this.rings[i];b.t-=dt;const k=1-b.t/b.l;b.m.scale.setScalar(Math.max(.1,b.r*k));b.m.material.opacity=.9*(1-k);if(b.t<=0){this.scene.remove(b.m);b.m.geometry.dispose();b.m.material.dispose();this.rings.splice(i,1)}}
 }
}
