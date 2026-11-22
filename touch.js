// Platform choice (PC or mobile), the touch control layer and the floating joystick.
// Touch buttons press the same action binds as the keyboard (Input.press/release), so every
// action keeps working and remapped keys still apply.
const $=id=>document.getElementById(id);
const KEY='brg_platform';
const STICK_R=60;   // px from the touch origin to full stick deflection
const SPRINT_EDGE=.92;

export function savedPlatform(){try{const v=localStorage.getItem(KEY);return v==='pc'||v==='mobile'?v:null}catch(e){return null}}
export function storePlatform(p){try{localStorage.setItem(KEY,p)}catch(e){}}
export function suggestPlatform(){
  try{if(matchMedia('(pointer:coarse)').matches)return 'mobile'}catch(e){}
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent||'')?'mobile':'pc';
}

const SVG_PC=`<svg viewBox="0 0 240 150" aria-hidden="true">
<defs><linearGradient id="pfScrA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f4a9c"/><stop offset="1" stop-color="#0a1a44"/></linearGradient></defs>
<rect x="40" y="8" width="160" height="98" rx="9" fill="#16204a" stroke="#6fb8ff" stroke-width="2"/>
<rect x="49" y="17" width="142" height="80" rx="4" fill="url(#pfScrA)"/>
<path d="M58 84 L96 46 L122 68 L150 40 L184 74 L184 90 L58 90Z" fill="#2ad4ff" opacity=".3"/>
<rect x="109" y="106" width="22" height="8" fill="#16204a"/>
<rect x="78" y="113" width="84" height="5" rx="2.5" fill="#16204a" stroke="#6fb8ff"/>
<rect x="18" y="122" width="132" height="24" rx="5" fill="#101a3e" stroke="#6fb8ff" stroke-width="1.5"/>
<rect x="46" y="124" width="12" height="9" rx="2" fill="#ffd84a"/>
<rect x="32" y="134" width="12" height="9" rx="2" fill="#ffd84a"/>
<rect x="46" y="134" width="12" height="9" rx="2" fill="#ffd84a"/>
<rect x="60" y="134" width="12" height="9" rx="2" fill="#ffd84a"/>
<rect x="76" y="126" width="62" height="6" rx="2" fill="#2a3a78"/>
<rect x="170" y="112" width="30" height="36" rx="14" fill="#101a3e" stroke="#6fb8ff" stroke-width="1.5"/>
<path d="M170 126 H200" stroke="#6fb8ff" stroke-width="1.2"/>
<path d="M185 112 V126 H170 V124 Z" fill="#ffd84a" opacity=".9"/>
</svg>`;

const SVG_MOBILE=`<svg viewBox="0 0 240 150" aria-hidden="true">
<defs><linearGradient id="pfScrB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f4a9c"/><stop offset="1" stop-color="#0a1a44"/></linearGradient></defs>
<rect x="62" y="8" width="116" height="134" rx="18" fill="#0d1638" stroke="#6fb8ff" stroke-width="2"/>
<rect x="69" y="16" width="102" height="118" rx="10" fill="url(#pfScrB)"/>
<circle cx="93" cy="104" r="25" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.45)" stroke-width="1.5"/>
<circle cx="100" cy="97" r="10" fill="#2ad4ff" stroke="#fff" stroke-width="1.5"/>
<circle cx="146" cy="104" r="14" fill="#ffd84a" opacity=".92"/>
<circle cx="130" cy="82" r="8" fill="rgba(10,18,44,.7)" stroke="rgba(255,255,255,.5)"/>
<circle cx="150" cy="74" r="8" fill="rgba(10,18,44,.7)" stroke="rgba(255,255,255,.5)"/>
<path d="M92 40 L106 40 M99 33 L99 47" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
</svg>`;

function opt(p,title,sub,svg,suggested){
  return `<button class="pf-opt" data-p="${p}">${suggested?'<em>Suggested</em>':''}${svg}<b>${title}</b><span>${sub}</span></button>`;
}

// Shows the choice card. onPick(p) receives 'pc' or 'mobile'.
export function askPlatform(onPick){
  const sug=suggestPlatform();
  const o=document.createElement('div');o.id='platform';
  o.innerHTML=`<div class="pf-card"><div class="pf-kick">Pixel Royale</div><h1>How are you playing?</h1>
   <p class="pf-sub">We'll set up the controls for your device. You can switch any time in Settings &gt; Controls.</p>
   <div class="pf-opts">${opt('pc','PC','Keyboard &amp; mouse',SVG_PC,sug==='pc')}${opt('mobile','Mobile','Touch screen &amp; joystick',SVG_MOBILE,sug==='mobile')}</div></div>`;
  document.body.appendChild(o);
  o.querySelectorAll('.pf-opt').forEach(b=>b.addEventListener('click',()=>{
    o.classList.add('out');setTimeout(()=>o.remove(),300);onPick(b.dataset.p);
  }));
}

export class TouchUI{
  constructor(app){
    this.app=app;this.input=app.input;this.on=false;this.sid=null;this.lid=null;this.md=null;this.sprintEdge=false;
    this.root=document.createElement('div');this.root.id='touchUI';
    this.root.innerHTML=`
     <div id="tzLook"></div>
     <div id="tzStick"><div class="tz-hint">MOVE</div></div>
     <div id="tzRing"><i></i></div>
     <div id="tzRight">
       <button class="tb" data-a="ab1">Q</button><button class="tb" data-a="ab2">F</button><button class="tb" data-a="ab3">V</button>
       <button class="tb" data-a="reload">Reload</button><button class="tb" data-a="interact">E</button><button class="tb" data-a="crouch">Crouch</button>
       <button class="tb" data-a="aim">Aim</button><button class="tb" data-a="jump">Jump</button><button class="tb" data-a="sprint">Sprint</button>
     </div>
     <button class="tb tb-fire" data-a="fire">Fire</button>
     <div id="tzTop">
       <button class="tb tb-sm" data-a="map">Map</button>
       <button class="tb tb-sm" data-x="more">More</button>
       <button class="tb tb-sm" data-x="menu">Menu</button>
     </div>
     <div id="tzSheet">
       <button class="tb tb-sm" data-a="emote">Emote</button><button class="tb tb-sm" data-a="drop">Drop</button>
       <button class="tb tb-sm" data-a="build">Build</button><button class="tb tb-sm" data-a="rotate">Rotate</button>
       <button class="tb tb-sm" data-a="matcycle">Mat</button><button class="tb tb-sm" data-a="roll">Roll</button>
       <button class="tb tb-sm" data-a="carSeat">Swap seat</button><button class="tb tb-sm" data-a="prev">Prev</button>
       <button class="tb tb-sm" data-a="next">Next</button>
     </div>
     <div id="tzRot">Turn your phone sideways to play</div>`;
    document.body.appendChild(this.root);
    this.ring=this.root.querySelector('#tzRing');

    // buttons: press on down, release on up (pointer capture keeps the release on this button)
    this.root.addEventListener('pointerdown',e=>{
      const b=e.target.closest&&e.target.closest('.tb');if(!b)return;
      e.preventDefault();e.stopPropagation();
      try{b.setPointerCapture(e.pointerId)}catch(_){}
      b.classList.add('on');
      if(b.dataset.x==='more'){this.root.querySelector('#tzSheet').classList.toggle('open');return}
      if(b.dataset.x==='menu'){this.app.setPause(true);return}
      if(b.dataset.a)this.hold(b.dataset.a,true);
    });
    const up=e=>{const b=e.target.closest&&e.target.closest('.tb[data-a]');
      if(b&&b.classList.contains('on')){b.classList.remove('on');this.hold(b.dataset.a,false)}};
    this.root.addEventListener('pointerup',up);this.root.addEventListener('pointercancel',up);

    // floating joystick: the stick origin is wherever the thumb lands on the left side
    const zs=this.root.querySelector('#tzStick');
    zs.addEventListener('pointerdown',e=>{
      if(this.slotTap(e)||this.sid!==null)return;this.sid=e.pointerId;this.ox=e.clientX;this.oy=e.clientY;
      try{zs.setPointerCapture(e.pointerId)}catch(_){}
      this.ring.style.left=e.clientX+'px';this.ring.style.top=e.clientY+'px';
      this.ring.style.setProperty('--kx','0px');this.ring.style.setProperty('--ky','0px');
      this.ring.classList.add('show');this.moveStick(e);
    });
    zs.addEventListener('pointermove',e=>{if(e.pointerId===this.sid)this.moveStick(e)});
    const endStick=e=>{if(e.pointerId!==this.sid)return;this.sid=null;this.input.stick={x:0,y:0};this.ring.classList.remove('show');this.setSprintEdge(false)};
    zs.addEventListener('pointerup',endStick);zs.addEventListener('pointercancel',endStick);

    // right side drags turn the camera
    const zl=this.root.querySelector('#tzLook');
    zl.addEventListener('pointerdown',e=>{
      if(this.slotTap(e)||this.lid!==null)return;this.lid=e.pointerId;this.lx=e.clientX;this.ly=e.clientY;
      try{zl.setPointerCapture(e.pointerId)}catch(_){}
    });
    zl.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.lid)return;const k=this.app.settings.touchSens||1.2;
      this.input.dx+=(e.clientX-this.lx)*k;this.input.dy+=(e.clientY-this.ly)*k;this.lx=e.clientX;this.ly=e.clientY;
    });
    const endLook=e=>{if(e.pointerId===this.lid)this.lid=null};
    zl.addEventListener('pointerup',endLook);zl.addEventListener('pointercancel',endLook);

    // menus on touch: a drag on a background turns the starter island camera (mouse does this via mousedown)
    document.addEventListener('pointerdown',e=>{
      if(!this.app.mobile||this.on)return;
      if(e.target.closest&&e.target.closest('button,input,select,textarea,label,a,[contenteditable],#platform'))return;
      this.md=e.pointerId;this.mx=e.clientX;this.input.drag=true;document.body.classList.add('look-drag');
    },true);
    document.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.md)return;this.input.drx+=e.clientX-this.mx;this.mx=e.clientX;
    });
    const endMenuDrag=e=>{if(e.pointerId===this.md){this.md=null;this.input.endDrag()}};
    document.addEventListener('pointerup',endMenuDrag);document.addEventListener('pointercancel',endMenuDrag);

  }

  // the touch zones cover the whole screen, so a touch that lands on a hotbar slot selects it here
  slotTap(e){
    const sl=[...$('slots').children];
    for(let i=0;i<sl.length&&i<6;i++){
      const r=sl[i].getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
        const a='s'+(i+1);this.input.press(a);this.input.release(a);return true}
    }
    return false;
  }

  hold(a,on){
    if(on){this.input.press(a);if(a==='map')this.app.onKey({code:'Touch'})}
    else this.input.release(a);
  }

  moveStick(e){
    const kx=e.clientX-this.ox,ky=e.clientY-this.oy;
    let x=kx/STICK_R,y=-ky/STICK_R;const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}
    const mag=Math.min(1,Math.hypot(x,y));const dead=mag<.12;
    this.input.stick={x:dead?0:x,y:dead?0:y};
    const kl=Math.hypot(kx,ky),k=kl>STICK_R?STICK_R/kl:1;
    this.ring.style.setProperty('--kx',(kx*k)+'px');this.ring.style.setProperty('--ky',(ky*k)+'px');
    this.setSprintEdge(mag>=SPRINT_EDGE);
  }

  setSprintEdge(on){
    if(on===this.sprintEdge)return;this.sprintEdge=on;
    if(on)this.input.press('sprint');else this.input.release('sprint');
  }

  // called every frame: the controls only show while a match is running and not paused
  sync(active){
    if(active===this.on)return;this.on=active;
    document.body.classList.toggle('tp',active);
    if(!active){
      this.input.stick={x:0,y:0};this.setSprintEdge(false);this.sid=null;this.lid=null;
      this.ring.classList.remove('show');this.root.querySelector('#tzSheet').classList.remove('open');
      this.root.querySelectorAll('.tb.on').forEach(b=>{b.classList.remove('on');if(b.dataset.a)this.input.release(b.dataset.a)});
    }
  }
}
