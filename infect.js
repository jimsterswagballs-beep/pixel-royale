// Season 2: fungal infection. Fungal weapons and spore clouds put stacks on a player; each stack deals damage over time.
// The host does all of it (stacks, timers, damage), so everyone sees the same numbers. Clients only get the stack count
// ({k:'inf'}) to tint the sprite and, for the infected player's own screen, to grow the fungal overlay (overlay.js).
import * as THREE from 'three';
import {SporeOverlay,LEVELS} from './overlay.js';
import {TRAP} from './season2.js';

export const INF={
 perStack:1.5,    // HP per second for each stack
 max:4,           // most stacks on one player
 dur:5,           // seconds a fresh hit keeps the infection going
 linger:2,        // each stack that is left after that fades out one at a time, this many seconds apart
 tick:1,          // seconds between damage ticks
 budget:3,        // stacks one shooter can add in a burst (a shotgun blast) ...
 refill:.25       // ... and one more stack every 0.25 s after that, so nobody can stack faster than 4 per second
};

export const infectMethods={
 // host: put up to `n` stacks on `t` from `by` (null for traps). Returns how many went on.
 infect(t,by,n,wi){
  if(this.role==='client'||!t.alive||t.drop||t.knocked)return 0;
  if(by&&(by===t||this.isAlly(by,t)))return 0;
  const st=t.inf||(t.inf={n:0,t:0,tick:0,bk:{},by:-1,wi:-1});
  const key=by?by.id:-1;let b=st.bk[key];if(!b)b=st.bk[key]={b:INF.budget,t:this.t};
  b.b=Math.min(INF.budget,b.b+(this.t-b.t)/INF.refill);b.t=this.t;
  const allowed=Math.floor(b.b+1e-6);if(allowed<=0)return 0;     // this shooter is hitting too fast: no new stack, no refresh
  const k=Math.min(n,allowed,INF.max-st.n);
  b.b-=Math.max(1,k);                                             // a hit on a full infection still costs budget and refreshes it
  st.t=INF.dur;st.by=key;if(wi!==undefined)st.wi=wi;
  if(k>0){st.n+=k;this.emit({k:'inf',i:t.id,n:st.n})}
  return k;
 },
 // host: a lingering cloud of spores. Everyone inside gets a stack every `every` seconds until it thins out.
 addZone(x,y,z,r,life,owner,every,wi){
  const zs=this.spZones||(this.spZones=[]);if(zs.length>24)zs.shift();
  zs.push({x,y,z,r,t:life,acc:every,every:every||.6,owner:owner?owner.id:-1,wi});
  this.emit({k:'vfx',t:'sporecloud',x,y,z,r,life});
 },
 // host, every frame
 updateInfection(dt){
  if(this.role==='client')return;
  const zs=this.spZones;
  if(zs&&zs.length){
   for(let i=zs.length-1;i>=0;i--){const z=zs[i];z.t-=dt;z.acc+=dt;
    if(z.acc>=z.every){z.acc=0;const owner=z.owner>=0?this.ents.get(z.owner):null;
     for(const t of this.list){if(!t.alive||t.drop||t.id===z.owner)continue;
      const dx=t.pos.x-z.x,dy=t.pos.y+.9-z.y,dz=t.pos.z-z.z;if(dx*dx+dy*dy+dz*dz>z.r*z.r)continue;
      this.infect(t,owner,1,z.wi)}}
    if(z.t<=0)zs.splice(i,1)}}
  for(const t of this.list){
   const st=t.inf;if(!st||!st.n&&!st.t)continue;
   if(!t.alive||t.knocked||t.drop){if(st.n){st.n=0;st.t=0;this.emit({k:'inf',i:t.id,n:0})}continue}
   st.tick+=dt;
   while(st.tick>=INF.tick){st.tick-=INF.tick;
    if(st.n>0){const by=st.by>=0?this.ents.get(st.by):null;this.damage(t,st.n*INF.perStack,by&&by.alive?by:null,st.wi,false,[t.pos.x,t.pos.y+1.1,t.pos.z],true)}}
   if(!t.alive)continue;
   st.t-=dt;
   if(st.t<=0&&st.n>0){st.n--;st.t=st.n>0?INF.linger:0;this.emit({k:'inf',i:t.id,n:st.n})}
  }
 },
 // host: a fungal projectile hit player `t`
 fungalHit(p,t){
  const owner=this.ents.get(p.owner);
  this.damage(t,p.dmg,owner,p.wi,false,[p.x,p.y,p.z]);
  if(p.cloud)this.addZone(p.x,p.y+.2,p.z,p.splash,p.cloud,owner,.6,p.wi);
  else this.infect(t,owner,p.stk,p.wi);
  this.emit({k:'vfx',t:'sporehit',x:p.x,y:p.y,z:p.z,c:p.col});
  this.emit({k:'snd',n:'infect',p:[p.x,p.y,p.z],g:.7});
 },
 // host: a fungal projectile hit the ground or a wall (or ran out of range)
 fungalBoom(p){
  const owner=this.ents.get(p.owner);
  if(p.cloud){this.addZone(p.x,p.y+.3,p.z,p.splash,p.cloud,owner,.6,p.wi);this.emit({k:'snd',n:'infect',p:[p.x,p.y,p.z],g:.8})}
  this.emit({k:'vfx',t:'sporehit',x:p.x,y:p.y,z:p.z,c:p.col});
 },
 // every machine, every frame: the cloud visuals and the fungal screen overlay
 updateInfectVis(dt){
  if(!this.sporeFx)this.sporeFx=new SporeOverlay();
  const me=this.me,n=me&&me.alive?Math.min(4,me.infN|0):0;
  // a spore trap cloud: the fungus grows in over about a second, then fades out over the rest of the TRAP.overlay seconds (never past .8, so the middle of the view stays clear)
  let trap=0;if(me&&me.sporeT>0){const T=TRAP.overlay,e=T-me.sporeT;trap=.8*Math.min(1,e/1.1)*Math.min(1,me.sporeT/(T*.75));me.sporeT-=dt}
  this.sporeFx.update(dt,Math.max(LEVELS[n],trap));
  const cv=this.cloudVis;if(!cv||!cv.length)return;
  for(let i=cv.length-1;i>=0;i--){const c=cv[i];c.t-=dt;c.acc+=dt;
   if(c.acc>.09){c.acc=0;const a=Math.random()*6.283,b=Math.acos(2*Math.random()-1),r=c.r*.85*Math.cbrt(Math.random());
    this.fx.puff(c.x+Math.sin(b)*Math.cos(a)*r,c.y+Math.cos(b)*r*.6,c.z+Math.sin(b)*Math.sin(a)*r,(Math.random()-.5)*.6,.15+Math.random()*.4,(Math.random()-.5)*.6,Math.random()<.5?'#a8ff7a':'#c9a8ff',1.3,c.r*.35,.8,.32*Math.min(1,c.t),-.05,.6)}
   if(c.t<=0)cv.splice(i,1)}
 },
 addCloudVis(ev){const cv=this.cloudVis||(this.cloudVis=[]);if(cv.length>14)cv.shift();cv.push({x:ev.x,y:ev.y,z:ev.z,r:ev.r,t:ev.life,acc:0})}
};
