// Season 2: the fungal screen effect. Fungus spreads in from the edges of the screen: blotches, little mushrooms, creeping
// roots and drifting spores. How much of it shows depends on one number (0..1): the infection stacks of the player,
// or the cloud of a spore trap. It eases in, and eases out slowly as the infection wears off.
// The middle of the screen stays clear, and nothing is drawn (the canvas is hidden) when the player is healthy.
export const LEVELS=[0,.3,.55,.78,1];   // overlay strength for 0..4 stacks

const rngOf=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
const W=960,H=540;
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

function makeBlob(r,seed){
 const c=mk(128,128),x=c.getContext('2d');const pal=['#5b2d8f','#2f8f7a','#7a3fc0','#3f6f3a'];
 for(let i=0;i<11;i++){const a=r()*6.283,d=r()*34,px=64+Math.cos(a)*d,py=64+Math.sin(a)*d,rad=16+r()*22,g=x.createRadialGradient(px,py,0,px,py,rad);
  const col=pal[(r()*pal.length)|0];g.addColorStop(0,col);g.addColorStop(.7,col+'cc');g.addColorStop(1,col+'00');x.fillStyle=g;x.fillRect(0,0,128,128)}
 for(let i=0;i<14;i++){const a=r()*6.283,d=r()*40,px=64+Math.cos(a)*d,py=64+Math.sin(a)*d;x.fillStyle=r()<.5?'rgba(190,255,150,.8)':'rgba(190,160,255,.8)';x.beginPath();x.arc(px,py,1+r()*2.4,0,6.283);x.fill()}
 return c;
}
function makeMush(r,seed){
 const c=mk(72,104),x=c.getContext('2d');const caps=[['#b46bff','#6a2fb8'],['#3fe0c0','#1f8f80'],['#c8ff5a','#6aa82a'],['#ff7ab8','#b83a7a']],cp=caps[seed%caps.length];
 const sw=10+r()*6;x.fillStyle='#e9dcc0';x.beginPath();x.moveTo(36-sw/2,100);x.lineTo(36-sw/3,50);x.lineTo(36+sw/3,50);x.lineTo(36+sw/2,100);x.closePath();x.fill();
 x.fillStyle='rgba(120,90,60,.35)';x.fillRect(36,52,sw/3,46);
 const g=x.createRadialGradient(36,34,4,36,40,34);g.addColorStop(0,cp[0]);g.addColorStop(1,cp[1]);
 x.shadowColor=cp[0];x.shadowBlur=10;x.fillStyle=g;x.beginPath();x.ellipse(36,44,31,26,0,Math.PI,0);x.lineTo(67,46);x.quadraticCurveTo(36,60,5,46);x.closePath();x.fill();
 x.shadowBlur=0;x.fillStyle='rgba(255,255,255,.75)';for(let i=0;i<5;i++){x.beginPath();x.arc(14+r()*44,20+r()*16,2+r()*3.4,0,6.283);x.fill()}
 return c;
}
function makeDot(){
 const c=mk(24,24),x=c.getContext('2d'),g=x.createRadialGradient(12,12,0,12,12,12);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,24,24);return c;
}
function makeVignette(){
 const c=mk(480,270),x=c.getContext('2d');
 const g=x.createRadialGradient(240,135,60,240,135,290);g.addColorStop(0,'rgba(40,10,70,0)');g.addColorStop(.55,'rgba(60,24,100,.28)');g.addColorStop(1,'rgba(40,10,70,.9)');
 x.fillStyle=g;x.fillRect(0,0,480,270);
 const g2=x.createRadialGradient(240,135,100,240,135,300);g2.addColorStop(0,'rgba(80,255,170,0)');g2.addColorStop(1,'rgba(80,255,170,.22)');x.fillStyle=g2;x.fillRect(0,0,480,270);
 return c;
}

export class SporeOverlay{
 constructor(){
  const c=document.createElement('canvas');c.id='sporeFx';c.width=W;c.height=H;
  c.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;display:none';
  const gl=document.getElementById('gl');if(gl)gl.after(c);else document.body.appendChild(c);
  this.c=c;this.x=c.getContext('2d');this.cur=0;this.t=0;this.shown=false;
  const r=rngOf(20262);
  this.blobs=[makeBlob(r,0),makeBlob(r,1),makeBlob(r,2)];this.mush=[0,1,2,3].map(i=>makeMush(r,i));this.dot=makeDot();this.vig=makeVignette();
  // where things grow: near the edges first (low threshold), towards the middle only at high strength
  this.sites=[];
  const add=(type,n,lo,hi)=>{for(let i=0;i<n;i++){
   const side=r(),edge=r()**1.6*.5;let px,py;
   if(side<.5){px=r();py=r()<.5?edge*.62:1-edge*.62}else{py=r();px=r()<.5?edge:1-edge}
   const d=Math.min(px,1-px,py,1-py)*2,th=Math.min(.97,lo+(hi-lo)*Math.min(1,d*1.1)+r()*.12);
   this.sites.push({type,x:px,y:py,s:.7+r()*.9,rot:(r()-.5)*(type===1?.5:6.28),ph:r()*6.28,v:(r()*(type===0?3:4))|0,th,
    ex:(.5-px)*.5,ey:(.5-py)*.5})}};
  add(0,30,.05,.7);add(1,40,.1,.9);add(2,18,.12,.8);
  this.sites.sort((a,b)=>a.th-b.th);
  this.sp=[];for(let i=0;i<48;i++)this.sp.push({x:r()*W,y:r()*H,vx:(r()-.5)*14,vy:-6-r()*16,ph:r()*6.28,s:.5+r()*1.2,hue:r()});
 }
 update(dt,target){
  this.t+=dt;
  const k=target>this.cur?4:.55;                       // grows quickly, fades slowly
  this.cur+=(target-this.cur)*Math.min(1,dt*k);
  if(Math.abs(target-this.cur)<.004)this.cur=target;
  const L=this.cur;
  if(L<.01){if(this.shown){this.c.style.display='none';this.shown=false}return}
  if(!this.shown){this.c.style.display='block';this.shown=true}
  const x=this.x,t=this.t;x.clearRect(0,0,W,H);
  x.globalAlpha=Math.min(.6,.62*Math.pow(L,.85));x.drawImage(this.vig,0,0,W,H);
  for(const s of this.sites){
   const a=smooth(s.th,s.th+.14,L);if(a<=.01)continue;
   const px=s.x*W,py=s.y*H,wob=Math.sin(t*1.3+s.ph);
   x.save();x.translate(px,py);
   if(s.type===0){x.globalAlpha=a*.8;x.rotate(s.rot);const z=(.5+.5*a)*s.s*(1+.03*wob),b=this.blobs[s.v%3];x.drawImage(b,-64*z,-64*z,128*z,128*z)}
   else if(s.type===1){x.globalAlpha=a;const grow=.25+.75*a,z=s.s*grow*.85;x.rotate(Math.atan2(s.ey,s.ex)+Math.PI/2+s.rot*.6+wob*.04);const m=this.mush[s.v];x.drawImage(m,-36*z,-100*z,72*z,104*z)}
   else{ // a root creeping in from the edge, drawn as a curve that gets longer
    x.globalAlpha=a*.9;const len=(60+80*a)*s.s,ang=Math.atan2(s.ey,s.ex);
    const ex=Math.cos(ang)*len,ey=Math.sin(ang)*len,cx=Math.cos(ang+1.2)*len*.5+wob*6,cy=Math.sin(ang+1.2)*len*.5;
    x.lineCap='round';x.strokeStyle='#2a1640';x.lineWidth=7*s.s;x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(cx,cy,ex,ey);x.stroke();
    x.strokeStyle='#8a4fd0';x.lineWidth=2.4*s.s;x.stroke();
    x.fillStyle='#9bff78';x.beginPath();x.arc(ex,ey,3*s.s,0,6.283);x.fill()}
   x.restore()}
  // spores drifting across the view
  x.globalCompositeOperation='lighter';
  const n=Math.round(10+38*L);
  for(let i=0;i<n;i++){const p=this.sp[i];
   p.x+=(p.vx+Math.sin(t*.8+p.ph)*10)*dt;p.y+=p.vy*dt;
   if(p.y<-10){p.y=H+10;p.x=Math.random()*W}if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;
   x.globalAlpha=Math.min(1,L*1.2)*(.35+.4*Math.sin(t*2+p.ph)**2);
   x.fillStyle=p.hue<.34?'#9bff78':p.hue<.67?'#7ff0ff':'#e0a0ff';
   const d=10*p.s;x.drawImage(this.dot,p.x-d/2,p.y-d/2,d,d)}
  x.globalCompositeOperation='source-over';x.globalAlpha=1;
 }
}
