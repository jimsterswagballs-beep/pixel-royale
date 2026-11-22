// Static batching: merges the many small opaque meshes of a model into one mesh with per-vertex colours.
// The model keeps its transform (the merged mesh sits inside the same group), so a boat or a car still moves as one.
// Only plain lit meshes are merged (no textures, no transparency, no emissive). Anything else stays as it is,
// and so does anything named in `keep` (e.g. a wheel that spins on its own pivot).
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const matCache=new Map();
function sharedMaterial(kind,opts){
 const key=kind+'|'+opts.roughness+'|'+opts.metalness+'|'+opts.flatShading+'|'+opts.side;
 let m=matCache.get(key);
 if(!m){
  const base={vertexColors:true,flatShading:opts.flatShading,side:opts.side};
  m=kind==='standard'?new THREE.MeshStandardMaterial(Object.assign(base,{roughness:opts.roughness,metalness:opts.metalness})):new THREE.MeshLambertMaterial(base);
  matCache.set(key,m);
 }
 return m;
}

export function bakeGroup(group,opts={}){
 const o={keep:()=>false,standard:false,roughness:.6,metalness:0,flatShading:false,castShadow:true,...opts};
 group.updateMatrixWorld(true);
 const inv=new THREE.Matrix4().copy(group.matrixWorld).invert();
 const geos=[],took=[];let doubleSide=false,kind=o.standard?'standard':'lambert';
 group.traverse(m=>{
  if(!m.isMesh||m.isInstancedMesh||m.isSkinnedMesh||!m.geometry||o.keep(m))return;
  const mt=m.material;
  if(Array.isArray(mt)||!mt||mt.transparent||mt.map||mt.emissive&&mt.emissive.getHex()!==0)return;
  const lit=o.standard?mt.isMeshStandardMaterial:mt.isMeshLambertMaterial;
  if(!lit)return;
  if(mt.side===THREE.DoubleSide)doubleSide=true;
  const ge=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
  ge.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld));
  for(const k of Object.keys(ge.attributes))if(k!=='position'&&k!=='normal')ge.deleteAttribute(k);
  if(!ge.attributes.normal)ge.computeVertexNormals();
  const n=ge.attributes.position.count,col=new Float32Array(n*3),c=mt.color;
  for(let i=0;i<n;i++){col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
  ge.setAttribute('color',new THREE.BufferAttribute(col,3));
  geos.push(ge);took.push(m);
 });
 if(!geos.length)return null;
 const merged=mergeGeometries(geos,false);
 if(!merged)return null;
 for(const m of took)m.removeFromParent();
 const mesh=new THREE.Mesh(merged,sharedMaterial(kind,{roughness:o.roughness,metalness:o.metalness,flatShading:o.flatShading,side:doubleSide?THREE.DoubleSide:THREE.FrontSide}));
 mesh.castShadow=o.castShadow;mesh.receiveShadow=true;
 group.add(mesh);
 return mesh;
}
