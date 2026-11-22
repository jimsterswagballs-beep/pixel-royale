// Finale: when five players are left, the match gets its last-act look.
//  1. "5 PEOPLE LEFT" flashes in red over the top of the screen, then fades away.
//  2. The screen slowly gains a red tint (over about 20 seconds).
//  3. The background music is swapped for the finale song, looping.
//  4. Fires ignite one by one across the island and burn for the rest of the match.
//  5. The song's bass is tracked and the screen reacts on every beat: a red flash, a small camera shake,
//     a stronger tint pulse and extra sparks from the fires near the player.
// Everything here is local to each player's screen. The host's alive count decides nothing new, so no network messages are needed.
import SONG from './3_PERSONS_LEFT.mp3';
import {H,LAKES,ISL} from './world.js';
import {mulberry32,clamp} from './data.js';

export const FIN_COUNT=5;          // the finale starts when this many players are still alive
const FIRE_N=28;                   // fire spots across the island
const FIRE_RANGE=240;              // fires only burn (and cost particles) within this distance of the camera
const TINT_TIME=20;                // seconds for the red tint to reach full strength

// Beat detector: the bass level is compared with a slow average. A beat is a clear jump above that average,
// with a short cooldown so one kick never counts twice. Pure function so it can be tested without a browser.
export function beatStep(st,e,dt){
 if(!st.init){st.avg=e;st.init=true}  // start the average at the first level, so the first frames are not a fake beat
 st.avg+=(e-st.avg)*Math.min(1,dt*1.2);     // slow average (about one second)
 st.cool-=dt;
 let hit=false,strength=0;
 if(st.cool<=0&&e>st.minLevel&&e>st.avg*1.28+8){hit=true;strength=clamp((e-st.avg)/60,.25,1);st.cool=.26}
 st.pulse=Math.max(st.pulse*Math.exp(-dt*7),hit?strength:0);
 return{hit,strength,pulse:st.pulse};
}

// Fire spots: on dry land, away from lakes, spread across the island. Deterministic so every match looks the same.
export function fireSpots(){
 const r=mulberry32(2026),out=[];let guard=0;
 while(out.length<FIRE_N&&guard++<6000){
  const a=r()*6.283,d=Math.sqrt(r())*ISL*.85,x=Math.cos(a)*d,z=Math.sin(a)*d,h=H(x,z);
  if(h<2.6)continue;
  if(LAKES.some(L=>Math.hypot(x-L.x,z-L.z)<L.r+5))continue;
  out.push({x,y:h,z,ign:out.length*.35,acc:0});
 }
 return out;
}

const CSS=`
#finTint,#finBeat{position:fixed;inset:0;pointer-events:none;opacity:0;z-index:1}
#finTint{background:radial-gradient(ellipse at center,rgba(255,30,30,.08) 30%,rgba(170,0,0,.8) 100%)}
#finBeat{background:radial-gradient(ellipse at center,rgba(255,70,70,.2) 20%,rgba(255,0,0,.6) 100%)}
#finAnn{position:fixed;left:0;right:0;top:22%;text-align:center;pointer-events:none;opacity:0;z-index:3;
 font:900 min(9vw,72px) Impact,"Arial Black",sans-serif;color:#ff2a2a;letter-spacing:4px;text-transform:uppercase;
 text-shadow:0 0 18px rgba(255,0,0,.9),0 4px 0 #3a0000}
#finAnn.go{animation:finAnn 3.8s ease-out forwards}
@keyframes finAnn{0%{opacity:0;transform:scale(1.7)}6%{opacity:1;transform:scale(1)}12%{opacity:.15}20%{opacity:1}28%{opacity:.2}36%{opacity:1}44%{opacity:.6}60%{opacity:1}100%{opacity:0;transform:scale(.96)}}
#hud,#ui,#elim,#victory,#bigmap{z-index:2}
`;

export const finaleMethods={
 // the DOM elements, created once. Tint and beat flash sit above the 3D view and under the HUD and menus.
 finaleDom(){
  if(this.finDom)return this.finDom;
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const mk=(id,text)=>{const d=document.createElement('div');d.id=id;if(text)d.textContent=text;document.body.appendChild(d);return d};
  this.finDom={tint:mk('finTint'),beat:mk('finBeat'),ann:mk('finAnn',FIN_COUNT+' people left')};
  return this.finDom;
 },
 finaleFires(){if(!this.finFires)this.finFires=fireSpots();return this.finFires},
 finaleAnalyser(){
  const a=this.audio;if(!a||!a.ctx||!a.musG)return null;
  if(!this.finAn){
   const an=a.ctx.createAnalyser();an.fftSize=512;an.smoothingTimeConstant=.5;
   a.musG.connect(an);                                     // a tap on the music bus only, nothing else is changed
   const mute=a.ctx.createGain();mute.gain.value=0;an.connect(mute);mute.connect(a.ctx.destination);
   this.finAn=an;this.finBuf=new Uint8Array(an.frequencyBinCount);
  }
  return this.finAn;
 },
 // bass level 0..255: the lowest few bins (kick drum and bass)
 finaleBass(){const an=this.finAn;if(!an)return 0;an.getByteFrequencyData(this.finBuf);let s=0;for(let i=0;i<5;i++)s+=this.finBuf[i];return s/5},
 finaleSongOn(){
  const a=this.audio;if(!a||!a.musicEl)return;
  a.musicEl.loop=true;a.musicEl.src=SONG;a.musicEl.play().catch(()=>{});a.songOn=true;
 },
 finaleSongOff(){
  const a=this.audio;if(!a||!a.songOn||!a.musicEl)return;
  a.songOn=false;a.musicEl.loop=false;a.musicEl.pause();a.nextTrack();  // back to the normal playlist
 },
 finaleStart(F){
  F.on=true;F.t=0;
  const d=this.finaleDom();d.ann.classList.remove('go');void d.ann.offsetWidth;d.ann.classList.add('go');
  d.tint.style.opacity=0;
  this.finaleSongOn();this.finaleAnalyser();this.finaleFires();
 },
 // every frame: decide when the finale starts, then run the tint, the beat reaction and the fires
 finaleUpdate(dt){
  const F=this.finState||(this.finState={on:false,done:false,prev:99,t:0,beat:{avg:0,cool:0,pulse:0,minLevel:30}});
  const n=this.aliveCount();
  if(!F.done&&F.prev>FIN_COUNT&&n===FIN_COUNT){F.done=true;this.finaleStart(F)}
  F.prev=n;
  if(!F.on)return;
  F.t+=dt;
  const d=this.finDom;
  const k=Math.min(1,F.t/TINT_TIME);
  const b=beatStep(F.beat,this.finaleBass(),dt);
  if(b.hit){                                                 // on each beat: a camera kick and a brief red flash
   this.view.shake=Math.min(1,this.view.shake+.12*b.strength);
   this.finaleBeatSparks(b.strength);
  }
  d.tint.style.opacity=clamp(k*(.55+.3*b.pulse),0,1).toFixed(3);
  d.beat.style.opacity=(b.pulse*b.pulse*.55*(.35+.65*k)).toFixed(3);
  // fires ignite one after another, then burn
  const cam=this.camera.position;
  for(const f of this.finFires){
   if(F.t<f.ign)continue;
   const dist=Math.hypot(f.x-cam.x,f.z-cam.z);if(dist>FIRE_RANGE)continue;
   const fade=Math.min(1,(F.t-f.ign)/3);
   f.acc+=dt*(14+38*b.pulse)*fade*(1-.5*dist/FIRE_RANGE);
   while(f.acc>=1){f.acc-=1;this.finaleSpark(f)}
  }
 },
 finaleSpark(f){
  const r=Math.random,cols=['#ff5a14','#ff8a1f','#ffc23d','#ffe27a'];
  this.fx.emit(f.x+(r()-.5)*1.4,f.y+.2+r()*.3,f.z+(r()-.5)*1.4,(r()-.5)*.8,2.4+r()*2.6,(r()-.5)*.8,cols[(r()*4)|0],.55+r()*.5,-2.2,.55+r()*.5,-.55,1.2,1);
  if(r()<.22)this.fx.puff(f.x,f.y+1.5,f.z,(r()-.5)*.6,1.8,(r()-.5)*.6,'#3a3430',1.8+r()*1.2,.9,1.6,.35,0,1);
 },
 // on a beat, the fires near the player throw extra sparks
 finaleBeatSparks(strength){
  const cam=this.camera.position;
  for(const f of this.finFires){
   if(this.finState.t<f.ign||Math.hypot(f.x-cam.x,f.z-cam.z)>150||Math.random()>.5)continue;
   for(let i=0;i<Math.round(2+3*strength);i++)this.finaleSpark(f);
  }
 },
 // match start (cleanup): the finale ends, the tint and fires go, and the normal music comes back
 finaleReset(){
  this.finState=null;this.finFires=null;
  if(this.finDom){this.finDom.tint.style.opacity=0;this.finDom.beat.style.opacity=0;this.finDom.ann.classList.remove('go')}
  this.finaleSongOff();
 },
};
