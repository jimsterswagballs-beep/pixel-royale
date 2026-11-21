// Chaos Rising (gamemode): random chaos events every 30 s, plus flare guns that light up an area.
// The host decides events and damage. Warnings and flares are sent as events so guests see them too.
// Weather lives in weather.js.
import * as THREE from 'three';
import * as W from './world.js';
import {mulberry32} from './data.js';

export const CHAOS_T=30;       // seconds between Chaos Rising events
const FLARE_T=25, FLARE_SLOTS=3;

export const chaosMethods={
 // at match start (everyone): weather, timers, flare lights and the night look
 chaosSetup(){
  this.weatherSetup();
  this.chaosT=CHAOS_T;this.chaosQ=[];this.warns=[];
  if(!this.flareSlots){this.flareSlots=[];for(let i=0;i<FLARE_SLOTS;i++){const light=new THREE.PointLight('#ff8a3d',0,70,1.6);light.visible=false;this.scene.add(light);
   const sp=new THREE.Sprite(new THREE.SpriteMaterial({color:'#ff9a4a',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));sp.scale.set(6,6,1);sp.visible=false;this.scene.add(sp);
   this.flareSlots.push({light,sp,t:0})}}
  for(const f of this.flareSlots){f.t=0;f.light.intensity=0;f.light.visible=false;f.sp.visible=false}
 },
 // host: the timers and the queue of delayed hits (warning first, then the hit)
 updateChaos(dt){
  if(!this.running||this.over||!this.chaosQ)return;
  for(let i=this.chaosQ.length-1;i>=0;i--){const q=this.chaosQ[i];q.t-=dt;if(q.t<=0){this.chaosQ.splice(i,1);q.go()}}
  if(this.gm==='chaos'){this.chaosT-=dt;if(this.chaosT<=0){this.chaosT=CHAOS_T;this.chaosEvent()}}
  this.wxStrikes(dt);
 },
 // a land spot 8 to 40 m from a random living player (or near the middle of the map)
 spotNearPlayer(){
  const alive=this.list.filter(e=>e.alive&&e.drop!=='bus'&&!e.knocked);
  for(let k=0;k<12&&alive.length;k++){const e=alive[Math.floor(Math.random()*alive.length)];const a=Math.random()*6.283,d=8+Math.random()*32;const x=e.pos.x+Math.cos(a)*d,z=e.pos.z+Math.sin(a)*d;if(W.H(x,z)>2&&Math.hypot(x,z)<W.ISL*.95)return{x,z}}
  return{x:(Math.random()-.5)*W.ISL,z:(Math.random()-.5)*W.ISL};
 },
 // warn everyone now, hit after `warn` seconds
 queueHit(x,z,warn,r,dmg,wid,msg){
  this.emit({k:'chaos',m:msg||'',x,z,r,t:warn});
  this.chaosQ.push({t:warn,go:()=>this.chaosBoom(x,z,r,dmg,wid)});
 },
 chaosBoom(x,z,r,dmg,wid){
  const y=W.H(x,z);
  this.emit({k:'ex',x,y:y+1,z,r,c:wid===-24?'#ff9a3c':'#fff3a0'});
  this.structBlast(x,y,z,r,dmg*.6);this.carBlast(x,y+1,z,r,dmg);
  for(const t of this.list){
   if(!t.alive||t.drop==='bus')continue;
   const d=Math.hypot(t.pos.x-x,t.pos.z-z);if(d>r+1)continue;
   this.damage(t,clamp(dmg*(1-d/(r+1))+dmg*.15,10,dmg),null,wid);
  }
 },
 // one of four events: meteor, gale, supply drop, car frenzy
 chaosEvent(){
  const pick=Math.floor(Math.random()*4);
  if(pick===0){const p=this.spotNearPlayer();this.queueHit(p.x,p.z,3,7,75,-24,'METEOR incoming!')}
  else if(pick===1){this.emit({k:'chaos',m:'Gale force winds!'});
   for(const e of this.list){if(!e.alive||e.drop==='bus'||e.knocked||e.car>=0)continue;const a=Math.random()*6.283;this.emit({k:'st',i:e.id,s:'kb',vx:Math.cos(a)*11,vy:3,vz:Math.sin(a)*11},e.id)}}
  else if(pick===2){this.emit({k:'chaos',m:'Surprise supply drop!'});const id=this.nextLootId++;const a=Math.random()*6.283,d=Math.random()*Math.max(30,this.storm.r*.6);let x=this.storm.cx+Math.cos(a)*d,z=this.storm.cz+Math.sin(a)*d;if(W.H(x,z)<2.5){x=this.storm.cx*.5;z=this.storm.cz*.5}this.supplies.push({id,x,z,t0:this.t,y0:160,landed:false,host:true});this.emit({k:'sd',id,x,z,y0:160})}
  else{this.emit({k:'chaos',m:'Car frenzy!'});for(let i=0;i<3;i++)this.spawnRoadCar()}
 },
 // flare guns: the flare lands and lights its spot for a while (host sends it, everyone lights it)
 spawnFlare(x,y,z){this.emit({k:'flare',x,y,z})},
 onFlare(ev){
  if(!this.flareSlots)return;
  let s=this.flareSlots.find(f=>f.t<=0)||this.flareSlots.reduce((a,b)=>a.t<b.t?a:b);
  s.t=FLARE_T;s.light.position.set(ev.x,ev.y+1.5,ev.z);s.sp.position.set(ev.x,ev.y+2.5,ev.z);
  s.light.visible=true;s.sp.visible=true;
 },
 onChaos(ev){
  if(ev.m){this.hud.announce(ev.m,'#ff7ad9');this.audio.play('storm')}
  if(ev.r&&ev.t)this.addWarn(ev.x,ev.z,ev.r,ev.t);
 },
 addWarn(x,z,r,t){
  const m=new THREE.Mesh(new THREE.RingGeometry(r-.35,r,48),new THREE.MeshBasicMaterial({color:'#ff4d3d',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(x,W.H(x,z)+.15,z);this.dynamic.add(m);this.warns=this.warns||[];this.warns.push({m,t,T:t,r});
 },
 // every frame, everywhere: warning rings and flare lights
 updateChaosVis(dt){
  if(this.warns){for(let i=this.warns.length-1;i>=0;i--){const w=this.warns[i];w.t-=dt;const k=1-Math.max(0,w.t)/w.T;w.m.material.opacity=.35+.5*Math.sin(this.t*10)**2*k;
    if(w.t<=0){this.dynamic.remove(w.m);w.m.geometry.dispose();w.m.material.dispose();this.warns.splice(i,1)}}}
  if(this.flareSlots)for(const f of this.flareSlots){if(f.t>0){f.t-=dt;f.light.intensity=3+Math.sin(this.t*17)*.4;if(f.t<=0){f.light.visible=false;f.sp.visible=false;f.light.intensity=0}}}
 },
};

function clamp(v,a,b){return v<a?a:v>b?b:v}
