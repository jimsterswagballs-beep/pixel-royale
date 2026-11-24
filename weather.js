// Weather (v24): a full remake.
// Each match runs a schedule of weather periods drawn from the match seed, so every player sees the same
// sequence with no extra messages. Periods blend into each other over TRANS seconds: sky, clouds, sun, fog,
// wetness and wind all move together.
// v40: the wind is real. It pushes falling and gliding players (movement.js, windV) with gusts, bots see less far in bad weather
// (`see`, bots.js), and a forecast line on screen says what is coming next and how strong the wind is. Thunderstorms bring lightning. The host decides strikes and everyone sees them.
import * as THREE from 'three';
import * as W from './world.js';
import {mulberry32,clamp,lerp} from './data.js';

export const WEATHER_NAMES={clear:'Clear',cloudy:'Overcast',drizzle:'Drizzle',storm:'Thunderstorm',fog:'Coastal fog',night:'Night',sandstorm:'Sandstorm'};
export const WEATHER_NAME_NOW=k=>WEATHER_NAMES[k]||'';
export const TRANS=14;             // seconds to blend from one weather period into the next             // seconds to blend from one weather period into the next
const MATCH_SECS=1800;             // the schedule covers a long match
const FIRST_SECS=70;               // every match starts clear
const STRIKE_MIN=5,STRIKE_MAX=9;   // seconds between lightning strikes in a thunderstorm
const BOLT_TOP=190;                // height the lightning bolt starts from

const hex=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
const toHex=c=>'#'+c.map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,'0')).join('');

// the look of each weather period. Colours are sRGB values, as the sky shader expects.
const PROFILE={
 clear:{top:'#3377eb',mid:'#99ccf7',hz:'#b9dcf5',bot:'#bfe0f2',fog:'#b9dcf5',cloudCol:'#ffffff',fogFar:800,coast:0,sun:2,hemi:1.3,cloud:.15,stars:0,sand:0,wet:0,rain:0,wind:1,see:1},
 cloudy:{top:'#5d7593',mid:'#9aaebf',hz:'#c3ccd3',bot:'#b5bec6',fog:'#c3ccd3',cloudCol:'#c8d0d8',fogFar:640,coast:0,sun:.9,hemi:1.15,cloud:.85,stars:0,sand:0,wet:0,rain:0,wind:1.6,see:0.9},
 drizzle:{top:'#4f6480',mid:'#8795a6',hz:'#aeb9c4',bot:'#9ea9b3',fog:'#aeb9c4',cloudCol:'#8a96a3',fogFar:560,coast:0,sun:.6,hemi:1,cloud:1,stars:0,sand:0,wet:.45,rain:.45,wind:2.2,see:0.75},
 storm:{top:'#2a3340',mid:'#4a5563',hz:'#6b7785',bot:'#555f6b',fog:'#5d6876',cloudCol:'#4d5763',fogFar:420,coast:0,sun:.35,hemi:.85,cloud:1,stars:0,sand:0,wet:1,rain:1,wind:4.5,see:0.6},
 fog:{top:'#8e9ba6',mid:'#b7c0c8',hz:'#ccd3d9',bot:'#c0c8cf',fog:'#ccd3d9',cloudCol:'#dfe5ea',fogFar:520,coast:1,sun:.7,hemi:1.1,cloud:.4,stars:0,sand:0,wet:.1,rain:0,wind:.8,see:0.42},
 night:{top:'#050a1c',mid:'#0c1530',hz:'#15203f',bot:'#0a0f22',fog:'#101a36',cloudCol:'#1a2442',fogFar:620,coast:0,sun:.3,hemi:.55,cloud:.2,stars:1,sand:0,wet:0,rain:0,wind:.7,see:0.5},
 sandstorm:{top:'#9a7f4c',mid:'#c4a46a',hz:'#d9bd85',bot:'#b8975e',fog:'#d2b57c',cloudCol:'#d9bd85',fogFar:230,coast:0,sun:.55,hemi:1,cloud:.3,stars:0,sand:1,wet:0,rain:0,wind:4,see:0.45},
};
// the period look as blendable values (colours become [r,g,b] arrays)
function profileOf(k){const p=PROFILE[k],o={};for(const key in p)o[key]=typeof p[key]==='string'?hex(p[key]):p[key];return o}
function mixP(a,b,k){const o={};for(const key in a){const x=a[key],y=b[key];o[key]=Array.isArray(x)?x.map((v,i)=>v+(y[i]-v)*k):x+(y-x)*k}return o}
function smooth(t){return t*t*(3-2*t)}

// weather schedule: the first period is clear, then a random run of periods (never the same one twice in a row)
const POOL=[['clear',3],['cloudy',3],['drizzle',2],['storm',1.6],['fog',1.6],['night',1.2],['sandstorm',1]];
export function weatherSchedule(seed){
 const r=mulberry32((seed|0)+777);
 const segs=[{k:'clear',t0:0,t1:FIRST_SECS}];
 let t=FIRST_SECS,prev='clear';
 while(t<MATCH_SECS){
  let tot=0;for(const[k,w]of POOL)if(k!==prev)tot+=w;
  let x=r()*tot,k='cloudy';
  for(const[kk,w]of POOL){if(kk===prev)continue;x-=w;if(x<=0){k=kk;break}}
  const d=70+r()*90;segs.push({k,t0:t,t1:t+d});t+=d;prev=k;
 }
 return{segs,windA:r()*6.283};
}

// the sky: gradient, sun glow, procedural drifting clouds, stars at night, sand haze and lightning flash
const SKY_V=`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const SKY_F=`varying vec3 vP;
uniform vec3 uTop,uMid,uHz,uBot,uCloudCol;
uniform float uSun,uCloud,uStars,uSand,uFlash,uTime,uWind;
uniform vec2 uWindDir;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
 vec3 d=normalize(vP);float h=d.y;
 vec3 c=h>0.?mix(mix(uHz,uMid,smoothstep(0.,.22,h)),uTop,pow(h,.65)):mix(uHz,uBot,min(1.,-h*3.));
 vec3 sd=normalize(vec3(200.,300.,120.));float s=max(dot(d,sd),0.);
 c+=vec3(1.,.82,.5)*pow(s,8.)*.2*uSun+vec3(1.,.9,.7)*pow(s,64.)*.3*uSun+vec3(1.,.97,.9)*smoothstep(.9985,.9995,s)*uSun;
 if(h>0.){vec2 g=d.xz/(d.y+.2)*160.;c+=vec3(step(.996,hash(floor(g)))*smoothstep(.15,.8,h)*uStars);}
 if(h>.01){
  vec2 cp=d.xz/(h+.12)*1.4+uWindDir*uTime*.02*uWind;
  float n=fbm(cp);
  float cov=smoothstep(1.-uCloud*.8,1.-uCloud*.8+.3,n)*smoothstep(0.,.25,h);
  c=mix(c,uCloudCol,cov*.92);
 }
 c=mix(c,uHz,uSand*.45*(1.-smoothstep(0.,.5,h)*.3));
 c+=uFlash*.55;
 gl_FragColor=vec4(c,1.);
}`;
export function makeWeatherSky(){
 const u={uTop:{value:new THREE.Vector3()},uMid:{value:new THREE.Vector3()},uHz:{value:new THREE.Vector3()},uBot:{value:new THREE.Vector3()},uCloudCol:{value:new THREE.Vector3()},
  uSun:{value:2},uCloud:{value:.15},uStars:{value:0},uSand:{value:0},uFlash:{value:0},uTime:{value:0},uWind:{value:1},uWindDir:{value:new THREE.Vector2(1,0)}};
 return new THREE.Mesh(new THREE.SphereGeometry(1200,20,12),new THREE.ShaderMaterial({uniforms:u,vertexShader:SKY_V,fragmentShader:SKY_F,side:THREE.BackSide,depthWrite:false,fog:false}));
}

export const weatherMethods={
 // at match start (everyone): the schedule, the wind and the starting clear sky
 weatherSetup(){
  const sch=weatherSchedule(this.seed||0);
  this.wxSegs=sch.segs;this.wxWind=[Math.cos(sch.windA),Math.sin(sch.windA)];this.wxWindPh=sch.windA;this.windV={x:0,z:0};this.wxTagT=0;this.wxSpd=0;
  this.wxIdx=-1;this.weather='clear';this.wx=profileOf('clear');this.wxFrom=this.wx;this.wxTo=this.wx;this.wxK=1;
  this.wxFlash=0;this.wxBolts=[];this.wxStrikeT=STRIKE_MIN;this.inStormTint=false;this.fogFar=800;
 },
 wxSegAt(t){for(let i=0;i<this.wxSegs.length;i++)if(t<this.wxSegs[i].t1)return i;return this.wxSegs.length-1},
 // every frame, everyone: move to the scheduled period, blend the look, drop particles and bolts
 updateWeatherVis(dt){
  if(!this.wxSegs)return;
  const i=this.wxSegAt(this.t);
  if(i!==this.wxIdx){
   this.wxIdx=i;const k=this.wxSegs[i].k;
   this.wxFrom=this.wx;this.wxTo=profileOf(k);this.wxK=0;this.weather=k;
   if(i>0&&this.hud)this.hud.toast('Weather: '+WEATHER_NAMES[k],'#9be0ff');
  }
  this.wxK=Math.min(1,this.wxK+dt/TRANS);
  const p=this.wx=mixP(this.wxFrom,this.wxTo,smooth(this.wxK));
  this.wxFlash=Math.max(0,this.wxFlash-dt*2.8);
  // sky
  const u=this.sky.material.uniforms;
  u.uTop.value.set(...p.top);u.uMid.value.set(...p.mid);u.uHz.value.set(...p.hz);u.uBot.value.set(...p.bot);u.uCloudCol.value.set(...p.cloudCol);
  u.uSun.value=p.sun;u.uCloud.value=p.cloud;u.uStars.value=p.stars;u.uSand.value=p.sand;u.uFlash.value=this.wxFlash;
  u.uTime.value=this.t;u.uWind.value=p.wind;u.uWindDir.value.set(this.wxWind[0],this.wxWind[1]);
  // light and fog
  this.scene.background=null;
  if(this.sun)this.sun.intensity=p.sun;
  if(this.hemi)this.hemi.intensity=p.hemi+this.wxFlash*1.5;
  const cam=this.camera.position;
  // coastal fog closes in near the water; everything else sees far. Quality and view distance settings still apply.
  let nearWater=false;
  if(p.coast>.05){nearWater=W.H(cam.x,cam.z)<2.5;for(let k=0;k<8&&!nearWater;k++){const a=k/8*6.283;if(W.H(cam.x+Math.cos(a)*45,cam.z+Math.sin(a)*45)<0)nearWater=true}}
  let far=p.fogFar*(1-p.coast*(nearWater?.5:0));
  const s=this.app&&this.app.settings||{};
  far*=({Low:350,Medium:550,High:800}[s.quality]||800)/800*({Near:.55,Medium:.8,Far:1}[s.dist]||1);
  if(this.state==='bus')far=Math.max(far,1000);
  this.fogFar=(this.fogFar||800)+(far-(this.fogFar||800))*Math.min(1,dt*2);
  this.scene.fog.far=this.fogFar;
  this.scene.fog.color.set(this.inStormTint?'#7a4ab0':toHex(p.fog));
  // wind: speed from the period, with slow gusts. Nothing blows while you are on the bus.
  const gust=1+.35*Math.sin(this.t*.7+this.wxWindPh)+.2*Math.sin(this.t*1.9+1.3);
  const spd=p.wind*2.2*gust*(this.state==='bus'?0:1);
  this.windV={x:this.wxWind[0]*spd,z:this.wxWind[1]*spd};this.wxSpd=spd;
  this.updateWeatherTag(dt,i);
  // rain and sand, falling around the camera and driven by the wind
  const wx=this.wxWind[0],wz=this.wxWind[1];
  if(p.rain>.02){const n=Math.round(p.rain*10);for(let j=0;j<n;j++){const a=Math.random()*6.283,d=Math.random()*26;
   this.fx.emit(cam.x+Math.cos(a)*d,cam.y+8+Math.random()*10,cam.z+Math.sin(a)*d,wx*p.wind*1.6,-26,wz*p.wind*1.6,'#a9c8ff',.45,0,.12,0,0,.55)}}
  if(p.sand>.02){const n=Math.round(p.sand*16);for(let j=0;j<n;j++){const a=Math.random()*6.283,d=Math.random()*30;
   this.fx.emit(cam.x+Math.cos(a)*d,cam.y+Math.random()*7,cam.z+Math.sin(a)*d,wx*16,(Math.random()-.5)*2,wz*16,'#d8b878',.9,0,.16,0,.4,.6)}}
  // lightning bolts fade out
  for(let j=this.wxBolts.length-1;j>=0;j--){const b=this.wxBolts[j];b.t-=dt;if(b.t<=0){this.dynamic.remove(b.line);b.line.geometry.dispose();b.line.material.dispose();this.wxBolts.splice(j,1)}else b.line.material.opacity=b.t/.35}
 },
 // the forecast line: the current weather, the wind, and what comes next with a countdown
 updateWeatherTag(dt,i){
  this.wxTagT-=dt;if(this.wxTagT>0)return;this.wxTagT=.25;
  if(!this.wxTagEl){this.wxTagEl=document.createElement('div');this.wxTagEl.id='wxTag';document.body.appendChild(this.wxTagEl)}
  const el=this.wxTagEl;
  if(!this.running){el.style.display='none';return}
  el.style.display='block';
  const seg=this.wxSegs[i],nxt=this.wxSegs[i+1];
  const a=Math.atan2(this.windV.z,this.windV.x),arrows=['\u2192','\u2198','\u2193','\u2199','\u2190','\u2196','\u2191','\u2197'];
  const arrow=arrows[((Math.round(a/(Math.PI/4))%8)+8)%8];
  const spd=Math.round(this.wxSpd||0);
  const next=nxt?`Next: ${WEATHER_NAMES[nxt.k]} in ${Math.max(0,Math.ceil(seg.t1-this.t))}s`:'';
  const txt=`${WEATHER_NAME_NOW(this.weather)} \u00b7 Wind ${spd} m/s ${arrow}`+(next?` \u00b7 ${next}`:'');
  if(el.textContent!==txt)el.textContent=txt;
 },
 // host only: in a thunderstorm, a warning ring and then a bolt and blast on a spot near a player
 wxStrikes(dt){
  if(this.weather!=='storm'||this.t<12)return;
  this.wxStrikeT-=dt;if(this.wxStrikeT>0)return;
  this.wxStrikeT=STRIKE_MIN+Math.random()*(STRIKE_MAX-STRIKE_MIN);
  const p=this.spotNearPlayer();
  this.emit({k:'chaos',m:'',x:p.x,z:p.z,r:4,t:2.2});
  this.chaosQ.push({t:2.2,go:()=>{this.emit({k:'bolt',x:p.x,z:p.z});this.chaosBoom(p.x,p.z,4,55,-23)}});
 },
 // everyone: a lightning bolt from the sky, a flash and a thunderclap
 onBolt(ev){
  this.wxFlash=1;
  this.audio.play('thunder',new THREE.Vector3(ev.x,W.H(ev.x,ev.z),ev.z));
  const y0=W.H(ev.x,ev.z);const pts=[];const sx=ev.x+(Math.random()-.5)*14,sz=ev.z+(Math.random()-.5)*14;
  for(let i=0;i<=16;i++){const f=i/16,jit=i&&i<16?(1-f)*6:0;
   pts.push(new THREE.Vector3(lerp(sx,ev.x,f)+(Math.random()-.5)*jit,lerp(BOLT_TOP,y0,f),lerp(sz,ev.z,f)+(Math.random()-.5)*jit))}
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#eef5ff',transparent:true,opacity:1,fog:false}));
  this.dynamic.add(line);this.wxBolts.push({line,t:.35});
 },
};
