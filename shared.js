import * as THREE from 'three';
import {WEAPONS,RARITY} from './data.js';
import zf from '../assets/zach_front.png';import zs from '../assets/zach_side.png';import zb from '../assets/zach_back.png';
import cf from '../assets/coolguy15_front.png';import cs from '../assets/coolguy15_side.png';import cb from '../assets/coolguy15_back.png';
export const IMG={zach:{front:zf,side:zs,back:zb},coolguy15:{front:cf,side:cs,back:cb}};
export const R=.42,HSTAND=1.8,HCROUCH=1.3,EYE=1.65,EYEC=1.1,EYES=.85,GRAV=23,JUMP=7.8,WALK=5.8,SPRINT=9.4,CROUCH=3;
export const texCache={};
export function charTex(ch,view){const k=ch+view;if(texCache[k])return texCache[k];const t=new THREE.TextureLoader().load(IMG[ch][view]);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=4;return texCache[k]=t}
const sc={};
export function wstat(w,r){const k=w*10+r;if(sc[k])return sc[k];const d=WEAPONS[w],R_=RARITY[r];return sc[k]=Object.assign({},d,{dmg:d.dmg*R_.dm,rps:d.rps*(r===5?1.12:1),mag:Math.round(d.mag*R_.mm),splash:d.splash*(r>=4?1.1:1),mythic:r===5})}
const mats={};
export function mat(c,emi){const k=c+(emi||'');return mats[k]||(mats[k]=new THREE.MeshLambertMaterial(Object.assign({color:c},emi?{emissive:emi,emissiveIntensity:.5}:{})))}
const bx=new THREE.BoxGeometry(1,1,1),cy=new THREE.CylinderGeometry(.5,.5,1,10),sp=new THREE.SphereGeometry(.5,10,8);
function B(g,c,x,y,z,sx,sy,sz,rx=0,emi){const m=new THREE.Mesh(g,mat(c,emi));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.x=rx;return m}
export function makeWeaponModel(w,r){
 const d=WEAPONS[w],g=new THREE.Group(),col=d.col,rc=RARITY[r].c,dark='#202228';
 const t=d.t;
 if(d.n==='Frying Pan'){g.add(B(cy,'#2b2b2b',0,0,-.4,.34,.04,.34,Math.PI/2));g.add(B(bx,'#8a5a2a',0,0,-.05,.06,.05,.5));}
 else if(d.n==='Fish Slapper'){g.add(B(bx,'#5ab0d0',0,0,-.35,.12,.2,.6));g.add(B(bx,'#3a80a0',0,0,-.7,.04,.3,.2));g.add(B(sp,'#fff',.07,.06,-.15,.06,.06,.06))}
 else if(d.n==='Pickaxe'){g.add(B(bx,'#8a6b3b',0,0,-.25,.05,.05,.7));g.add(B(bx,'#9aa0a6',0,0,-.6,.04,.04,.38));g.add(B(bx,'#9aa0a6',0,.02,-.6,.04,.28,.04))}
 else if(d.n==='Banana Blaster'){g.add(B(bx,'#ffe14a',0,0,-.25,.1,.12,.55));g.add(B(bx,'#ffe14a',0,.08,-.55,.1,.1,.3,-.4));g.add(B(bx,'#6a4a1a',0,-.1,-.05,.06,.18,.08))}
 else if(d.n==='Rubber Chicken Cannon'){g.add(B(cy,'#fff08a',0,0,-.35,.2,.7,.2,Math.PI/2));g.add(B(sp,'#ff5a3a',0,.15,-.7,.18,.18,.18));g.add(B(bx,'#ff9a2a',0,0,-.78,.06,.05,.12));g.add(B(bx,'#444',0,-.12,-.05,.06,.18,.08))}
 else if(d.n==='Confetti Cannon'){g.add(B(cy,'#ff6bd6',0,0,-.35,.2,.7,.2,Math.PI/2));g.add(B(cy,'#6bd6ff',0,0,-.75,.26,.12,.26,Math.PI/2));g.add(B(bx,'#444',0,-.12,-.05,.06,.18,.08))}
 else if(d.n==='Bouncy Ball Gun'){g.add(B(bx,'#3cd0ff',0,0,-.25,.1,.12,.5));g.add(B(sp,'#ff4a8a',0,.12,-.2,.16,.16,.16));g.add(B(cy,'#222',0,0,-.55,.06,.3,.06,Math.PI/2))}
 else if(d.n==='Disco Laser'){g.add(B(bx,'#ff3dff',0,0,-.25,.1,.12,.55));g.add(B(sp,'#ffffff',0,.1,-.5,.1,.1,.1,0,'#ff3dff'));g.add(B(cy,'#222',0,0,-.65,.05,.25,.05,Math.PI/2))}
 else if(d.n==='Potato Cannon'){g.add(B(cy,'#b08a55',0,0,-.35,.16,.7,.16,Math.PI/2));g.add(B(bx,'#555',0,-.12,-.05,.06,.18,.08))}
 else if(t==='ar'||t==='smg'){const L=t==='ar'?.7:.5;g.add(B(bx,col,0,0,-L/2+.1,.08,.1,L));g.add(B(bx,dark,0,0,-L-.1,.03,.03,.3));g.add(B(bx,dark,0,-.12,-L*.4,.05,.18,.07,.15));g.add(B(bx,col,0,-.02,.3,.07,.12,.25));if(d.zoom>1)g.add(B(bx,dark,0,.09,-L*.4,.05,.05,.2))}
 else if(t==='sg'){g.add(B(bx,col,0,0,-.4,.09,.1,.75));g.add(B(bx,dark,0,.01,-.78,.05,.05,.3));g.add(B(bx,'#6b4a2a',0,-.02,.2,.08,.14,.35));if(d.mag===2)g.add(B(bx,dark,0,.05,-.45,.05,.05,.6))}
 else if(t==='sn'){g.add(B(bx,col,0,0,-.45,.07,.09,.95));g.add(B(bx,dark,0,0,-1,.03,.03,.4));g.add(B(cy,dark,0,.09,-.4,.07,.4,.07,Math.PI/2));g.add(B(bx,col,0,-.02,.25,.07,.13,.3))}
 else if(t==='pi'){g.add(B(bx,col,0,0,-.18,.07,.09,.36));g.add(B(bx,dark,0,-.1,-.03,.06,.16,.08,.2))}
 else if(t==='ex'){g.add(B(cy,col,0,0,-.4,.2,.9,.2,Math.PI/2));g.add(B(cy,dark,0,0,-.88,.26,.12,.26,Math.PI/2));g.add(B(bx,dark,0,-.14,-.1,.06,.2,.08));g.add(B(bx,'#888',0,.13,-.3,.04,.08,.2))}
 else g.add(B(bx,col,0,0,-.3,.1,.1,.6));
 if(r>=2){const gl=B(bx,rc,0,.07,-.2,.025,.025,.3,0,rc);g.add(gl)}
 return g}
export function rarityGlow(r){return RARITY[r].c}
export const V=()=>new THREE.Vector3();
export function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;return d}
export function lerpAng(a,b,t){return a+angDiff(a,b)*t}
