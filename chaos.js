// Chaos Rising (gamemode, v48): ten kinds of chaos event that come faster as the match goes on, and sometimes two at once,
// plus flare guns that light up an area. The host decides events and damage. Warnings and events are sent so guests see them too.
// Weather lives in weather.js.
import * as THREE from 'three';
import * as W from './world.js';

export const CHAOS_T=12;       // seconds before the first Chaos Rising event (later gaps shrink, see chaosGap)
const FLARE_T=25, FLARE_SLOTS=3;
const CHAOS_N=10;              // number of event kinds in chaosEvent

export const chaosMethods={
 // at match start (everyone): weather, timers, flare lights and the night look
 chaosSetup(){
  this.weatherSetup();
  this.chaosT=CHAOS_T;this.chaosQ=[];this.warns=[];this.chaosLast=-1;this.quakeT=0;this.chaosFogT=0;
  if(!this.flareSlots){this.flareSlots=[];for(let i=0;i<FLARE_SLOTS;i++){const light=new THREE.PointLight('#ff8a3d',0,70,1.6);light.visible=false;this.scene.add(light);
   const sp=new THREE.Sprite(new THREE.SpriteMaterial({color:'#ff9a4a',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));sp.scale.set(6,6,1);sp.visible=false;this.scene.add(sp);
   this.flareSlots.push({light,sp,t:0})}}
  for(const f of this.flareSlots){f.t=0;f.light.intensity=0;f.light.visible=false;f.sp.visible=false}
 },
 // seconds until the next event: 15 s at the start, down to 8 s after about six minutes
 chaosGap(){return Math.max(8,Math.min(15,15-this.t/50))},
 // host: the timers and the queue of delayed hits (warning first, then the hit)
 updateChaos(dt){
  if(!this.running||this.over||!this.chaosQ)return;
  for(let i=this.chaosQ.length-1;i>=0;i--){const q=this.chaosQ[i];q.t-=dt;if(q.t<=0){this.chaosQ.splice(i,1);q.go()}}
  if(this.gm==='chaos'){this.chaosT-=dt;if(this.chaosT<=0){this.chaosT=this.chaosGap();this.chaosEvent();
   // after two minutes, a second event sometimes lands on top of the first
   if(this.t>120&&Math.random()<Math.min(.6,(this.t-120)/360))this.chaosEvent()}}
  this.wxStrikes(dt);
 },
 // a land spot 8 to 40 m from a random living player (or near the middle of the map)
 spotNearPlayer(){
  const alive=this.list.filter(e=>e.alive&&e.drop!=='bus'&&!e.knocked);
  for(let k=0;k<12&&alive.length;k++){const e=alive[Math.floor(Math.random()*alive.length)];const a=Math.random()*6.283,d=8+Math.random()*32;const x=e.pos.x+Math.cos(a)*d,z=e.pos.z+Math.sin(a)*d;if(W.H(x,z)>2&&Math.hypot(x,z)<W.ISL*.95)return{x,z}}
  return{x:(Math.random()-.5)*W.ISL,z:(Math.random()-.5)*W.ISL};
 },
 // everyone on the island who is not on the bus or riding a car (the targets of knockback-style events)
 chaosTargets(){return this.list.filter(e=>e.alive&&e.drop!=='bus'&&!e.knocked&&!(e.car>=0))},
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
 // one supply drop somewhere in the storm circle
 chaosSupply(){
  const id=this.nextLootId++;const a=Math.random()*6.283,d=Math.random()*Math.max(30,this.storm.r*.6);
  let x=this.storm.cx+Math.cos(a)*d,z=this.storm.cz+Math.sin(a)*d;if(W.H(x,z)<2.5){x=this.storm.cx*.5;z=this.storm.cz*.5}
  this.supplies.push({id,x,z,t0:this.t,y0:160,landed:false,host:true});this.emit({k:'sd',id,x,z,y0:160});
 },
 // one of ten events. The pick never repeats the last one.
 // 0 meteor shower, 1 gale, 2 supply drops, 3 car frenzy, 4 earthquake, 5 trampoline, 6 slippery, 7 dance party, 8 lightning storm, 9 fog bank
 chaosEvent(force){
  let pick=force===undefined?Math.floor(Math.random()*CHAOS_N):force;
  if(force===undefined&&pick===this.chaosLast)pick=(pick+1+Math.floor(Math.random()*(CHAOS_N-1)))%CHAOS_N;
  this.chaosLast=pick;
  switch(pick){
   case 0:{ // three meteors, each with its own red warning ring
    this.emit({k:'chaos',m:'METEOR SHOWER!'});
    for(let i=0;i<3;i++){const p=this.spotNearPlayer();this.queueHit(p.x,p.z,3+i*.8,7,75,-24,'')}
    break}
   case 1:{ // gale: everyone is blown away at once
    this.emit({k:'chaos',m:'Gale force winds!'});
    for(const e of this.chaosTargets()){const a=Math.random()*6.283;this.emit({k:'st',i:e.id,s:'kb',vx:Math.cos(a)*17,vy:6,vz:Math.sin(a)*17},e.id)}
    break}
   case 2:{ // two supply drops
    this.emit({k:'chaos',m:'Surprise supply drops!'});
    this.chaosSupply();this.chaosSupply();
    break}
   case 3:{ // five cars
    this.emit({k:'chaos',m:'Car frenzy!'});
    for(let i=0;i<5;i++)this.spawnRoadCar();
    break}
   case 4:{ // earthquake: the ground shakes for 4 s and throws everyone about
    this.emit({k:'chaos',m:'EARTHQUAKE!',quake:4});
    for(let i=1;i<=8;i++)this.chaosQ.push({t:i*.5,go:()=>{for(const e of this.chaosTargets()){const a=Math.random()*6.283;this.emit({k:'st',i:e.id,s:'kb',vx:Math.cos(a)*4,vy:2.5,vz:Math.sin(a)*4},e.id)}}});
    break}
   case 5:{ // trampoline: everyone is thrown up
    this.emit({k:'chaos',m:'Trampoline day!'});
    for(const e of this.chaosTargets())this.emit({k:'st',i:e.id,s:'kb',vx:0,vy:10,vz:0},e.id);
    break}
   case 6:{ // slippery: everyone slides for 4 s
    this.emit({k:'chaos',m:'Everything is slippery!'});
    for(const e of this.chaosTargets())this.emit({k:'st',i:e.id,s:'slip',t:4},e.id);
    break}
   case 7:{ // dance party: everyone is made to dance for 3 s
    this.emit({k:'chaos',m:'Dance party!'});
    for(const e of this.chaosTargets())this.emit({k:'st',i:e.id,s:'dance',t:3},e.id);
    break}
   case 8:{ // lightning storm: four bolts near players, each with a warning ring
    this.emit({k:'chaos',m:'LIGHTNING STORM!'});
    for(let i=0;i<4;i++){const p=this.spotNearPlayer();const warn=2+i*.7;
     this.emit({k:'chaos',m:'',x:p.x,z:p.z,r:3.5,t:warn});
     this.chaosQ.push({t:warn,go:()=>{this.emit({k:'bolt',x:p.x,z:p.z});this.chaosBoom(p.x,p.z,3.5,45,-23)}})}
    break}
   case 9:{ // fog bank: the view closes in for 9 s, for everyone
    this.emit({k:'chaos',m:'Fog bank rolling in!',fog:9});
    break}
  }
 },
 // flare guns: the flare lands and lights its spot for a while (host sends it, everyone lights it)
 spawnFlare(x,y,z){this.emit({k:'flare',x,y,z})},
 onFlare(ev){
  if(!this.flareSlots)return;
  let s=this.flareSlots.find(f=>f.t<=0)||this.flareSlots.reduce((a,b)=>a.t<b.t?a:b);
  s.t=FLARE_T;s.light.position.set(ev.x,ev.y+1.5,ev.z);s.sp.position.set(ev.x,ev.y+2.5,ev.z);
  s.light.visible=true;s.sp.visible=true;
 },
 // everyone: the announcement, a sky flash, and the side effects of quakes and fog banks
 onChaos(ev){
  if(ev.m){this.hud.announce(ev.m,'#ff7ad9');this.audio.play('storm');this.wxFlash=Math.max(this.wxFlash||0,.45)}
  if(ev.quake)this.quakeT=ev.quake;
  if(ev.fog)this.chaosFogT=ev.fog;
  if(ev.r&&ev.t)this.addWarn(ev.x,ev.z,ev.r,ev.t);
 },
 addWarn(x,z,r,t){
  const m=new THREE.Mesh(new THREE.RingGeometry(r-.35,r,48),new THREE.MeshBasicMaterial({color:'#ff4d3d',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(x,W.H(x,z)+.15,z);this.dynamic.add(m);this.warns=this.warns||[];this.warns.push({m,t,T:t,r});
 },
 // every frame, everywhere: warning rings, flare lights, the earthquake tremble and the fog timer
 updateChaosVis(dt){
  if(this.warns){for(let i=this.warns.length-1;i>=0;i--){const w=this.warns[i];w.t-=dt;const k=1-Math.max(0,w.t)/w.T;w.m.material.opacity=.35+.5*Math.sin(this.t*10)**2*k;
    if(w.t<=0){this.dynamic.remove(w.m);w.m.geometry.dispose();w.m.material.dispose();this.warns.splice(i,1)}}}
  if(this.flareSlots)for(const f of this.flareSlots){if(f.t>0){f.t-=dt;f.light.intensity=3+Math.sin(this.t*17)*.4;if(f.t<=0){f.light.visible=false;f.sp.visible=false;f.light.intensity=0}}}
  if(this.quakeT>0){this.quakeT-=dt;this.view.shake=Math.max(this.view.shake,.7)}
  if(this.chaosFogT>0)this.chaosFogT-=dt;
 },
};

function clamp(v,a,b){return v<a?a:v>b?b:v}
