// Water: the sea and the river.
//  - the sea is a shader, not a flat tint: a swell of directional waves (normals computed per pixel, so it stays sharp
//    up close and calm on the horizon), Fresnel reflection of the sky, sun glitter, shallows that turn turquoise and
//    show the sand through, and white foam where the waves break on the shore. Depth comes from a height map of the ground.
//  - the river is a ribbon that follows the river's centreline, with a flowing shader: streaks, a glint pattern and foam at the banks.
import * as THREE from 'three';

// one clock for every water material (scenery.update sets it)
export const TIME={value:0};
// the sun's direction, the same as the game's directional light (game.js: position 200,300,120)
const SUN_DIR=new THREE.Vector3(200,300,120).normalize();

const SEA_VS=`
varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
 vec4 wp=modelMatrix*vec4(position,1.0);
 vWorld=wp.xyz;
 vec4 mvPosition=viewMatrix*wp;
 gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
}`;

const SEA_FS=`
uniform float uTime;
uniform vec3 uSun;
uniform sampler2D uDepth;
uniform float uHalf;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSkyTop;
uniform vec3 uSkyHor;
uniform vec3 uFoam;
varying vec3 vWorld;
#include <fog_pars_fragment>

// slope (dh/dx, dh/dz) of the swell: six directional waves, shorter and weaker each step.
// the short waves fade with distance so they never shimmer on the horizon.
vec2 swell(vec2 p,float dist){
 vec2 g=vec2(0.0);
 float fadeHi=1.0-0.8*smoothstep(90.0,420.0,dist);
 for(int i=0;i<6;i++){
  float fi=float(i);
  float ang=fi*2.39996+0.4;
  vec2 d=vec2(cos(ang),sin(ang));
  float k=0.05*pow(1.75,fi);
  float s=0.11*pow(0.72,fi)*(i<3?1.0:fadeHi);
  float ph=dot(d,p)*k+uTime*(0.6+0.22*fi)*sqrt(k)*2.4;
  g+=d*s*cos(ph);
 }
 return g;
}

void main(){
 vec2 p=vWorld.xz;
 vec3 V=normalize(cameraPosition-vWorld);
 float dist=length(cameraPosition-vWorld);

 vec2 g=swell(p,dist);
 vec3 n=normalize(vec3(-g.x,1.0,-g.y));

 // depth from the ground height map (encoded 0..1 over -20..40 m)
 float floorH=texture2D(uDepth,(p+uHalf)/(2.0*uHalf)).r*60.0-20.0;
 float depth=max(-floorH,0.0);
 float shallow=1.0-smoothstep(0.6,6.0,depth);
 vec3 body=mix(uDeep,uShallow,pow(shallow,1.6));

 // sky reflection (Fresnel) and sun glitter
 vec3 R=reflect(-V,n);
 vec3 sky=mix(uSkyHor,uSkyTop,smoothstep(0.0,0.5,R.y));
 float ndv=clamp(dot(n,V),0.0,1.0);
 float F=0.02+0.98*pow(1.0-ndv,5.0);
 vec3 col=mix(body,sky,clamp(F*1.25,0.0,0.9));
 vec3 Hv=normalize(uSun+V);
 float ndh=max(dot(n,Hv),0.0);
 col+=vec3(1.0,0.97,0.88)*(pow(ndh,380.0)*2.4+pow(ndh,40.0)*0.12);

 // shoreline foam: it breaks along the edge of the shallows and churns with the swell
 float wob=0.5+0.5*sin(p.x*0.7+uTime*1.1+sin(p.y*0.5+uTime*0.6)*2.0);
 float edge=1.0-smoothstep(0.0,1.8,depth);
 float churn=0.5+0.5*sin(depth*9.0-uTime*2.2+wob*2.0);
 float foam=edge*smoothstep(0.35,0.95,0.6*wob+0.4*churn);
 col=mix(col,uFoam,clamp(foam*0.9,0.0,0.9));

 float alpha=mix(0.97,0.7,shallow);
 alpha=max(alpha,foam);
 gl_FragColor=vec4(col,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;

const RIV_VS=`
varying vec2 vUv;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
 vUv=uv;
 vec4 wp=modelMatrix*vec4(position,1.0);
 vWorld=wp.xyz;
 vec4 mvPosition=viewMatrix*wp;
 gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
}`;

const RIV_FS=`
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
varying vec2 vUv;
varying vec3 vWorld;
#include <fog_pars_fragment>
void main(){
 float a=abs(vUv.y);                       // 0 in the middle of the river, 1 at its edge
 float s1=0.5+0.5*sin(vUv.x*0.9-uTime*2.2+vUv.y*3.0);
 float s2=0.5+0.5*sin(vUv.x*2.3-uTime*3.7-vUv.y*6.0+sin(vUv.x*0.4));
 vec3 col=mix(uDeep,uShallow,0.3+0.35*s1);
 col+=vec3(0.9)*smoothstep(0.85,1.0,s2)*0.22*(1.0-a);
 float bank=smoothstep(0.62,0.98,a)*(0.6+0.4*s2);
 col=mix(col,uFoam,clamp(bank,0.0,0.9));
 float alpha=0.92*smoothstep(1.0,0.9,a);
 gl_FragColor=vec4(col,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;

// the depth map: the ground height of every cell of the island (and the sea around it), read by the sea shader
export function buildSeaDepth(H,half,n){
 const data=new Uint8Array(n*n);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=-half+(i+.5)/n*2*half,z=-half+(j+.5)/n*2*half;
  data[j*n+i]=Math.round(Math.min(1,Math.max(0,(H(x,z)+20)/60))*255);
 }
 const tex=new THREE.DataTexture(data,n,n,THREE.RedFormat,THREE.UnsignedByteType);
 tex.magFilter=tex.minFilter=THREE.LinearFilter;
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.generateMipmaps=false;tex.needsUpdate=true;
 return tex;
}

export function makeSeaMaterial(depthTex,half){
 const uniforms=Object.assign({},THREE.UniformsLib.fog,{
  uSun:{value:SUN_DIR},uDepth:{value:depthTex},uHalf:{value:half},
  uDeep:{value:new THREE.Color('#0b4a72')},uShallow:{value:new THREE.Color('#5fd6c6')},
  uSkyTop:{value:new THREE.Color('#5a9ad4')},uSkyHor:{value:new THREE.Color('#d4ecf9')},uFoam:{value:new THREE.Color('#f5fbff')}});
 uniforms.uTime=TIME;
 return new THREE.ShaderMaterial({uniforms,vertexShader:SEA_VS,fragmentShader:SEA_FS,transparent:true,fog:true,depthWrite:false});
}

// the river: a ribbon along the centreline at the water level, with the sides on the banks
export function makeRiverMesh(path,ws,halfW){
 const n=path.length,pos=[],uvs=[],idx=[];let L=0;
 for(let i=0;i<n;i++){
  const a=path[Math.max(0,i-1)],b=path[Math.min(n-1,i+1)];
  let tx=b.x-a.x,tz=b.z-a.z;const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
  const nx=-tz,nz=tx;
  if(i>0)L+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);
  const y=ws[i]+.04,p=path[i];
  pos.push(p.x+nx*halfW,y,p.z+nz*halfW, p.x-nx*halfW,y,p.z-nz*halfW);
  uvs.push(L,1, L,-1);
 }
 for(let i=0;i<n-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,c,b, b,c,d)}
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geo.setIndex(idx);
 const uniforms=Object.assign({},THREE.UniformsLib.fog,{
  uDeep:{value:new THREE.Color('#1b6f9c')},uShallow:{value:new THREE.Color('#6fd0e8')},uFoam:{value:new THREE.Color('#eef8fb')}});
 uniforms.uTime=TIME;
 const mat=new THREE.ShaderMaterial({uniforms,vertexShader:RIV_VS,fragmentShader:RIV_FS,transparent:true,fog:true,depthWrite:false,side:THREE.DoubleSide});
 const m=new THREE.Mesh(geo,mat);m.renderOrder=2;return m;
}
