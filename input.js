import {ACTIONS} from './data.js';
export class Input{
 constructor(el,app){this.el=el;this.app=app;this.keys=new Set();this.pr=new Set();this.rel=new Set();this.dx=0;this.dy=0;this.binds={};this.rev={};this.capture=null;this.locked=false;this.touch=false;this.stick={x:0,y:0};this.wheel=0;this.drag=false;this.drx=0;
  this.loadBinds();
  addEventListener('keydown',e=>{if(this.capture){e.preventDefault();this.capture(e.code,e);return}if(e.repeat)return;if(this.app.typing())return;
   this.keys.add(e.code);this.pr.add(e.code);if(this.app.gameActive()&&(e.code==='Tab'||e.code==='Space'||e.code.startsWith('Arrow')||e.code==='F3'))e.preventDefault();this.app.onKey(e)});
  addEventListener('keyup',e=>{this.keys.delete(e.code);this.rel.add(e.code)});
  el.addEventListener('mousedown',e=>{if(this.capture){e.preventDefault();this.capture('Mouse'+e.button,e);return}if(!this.locked||this.touch)return;e.preventDefault();const k='Mouse'+e.button;this.keys.add(k);this.pr.add(k)});
  addEventListener('mouseup',e=>{const k='Mouse'+e.button;this.keys.delete(k);this.rel.add(k);this.endDrag()});
  // click-and-drag on menu backgrounds (not buttons or fields) turns the starter island camera
  addEventListener('mousedown',e=>{if(e.button!==0||this.locked||this.capture)return;if(e.target.closest&&e.target.closest('button,input,select,textarea,label,a,[contenteditable]'))return;this.drag=true;document.body.classList.add('look-drag')});
  addEventListener('mousemove',e=>{if(this.locked){this.dx+=e.movementX;this.dy+=e.movementY}else if(this.drag)this.drx+=e.movementX});
  addEventListener('wheel',e=>{if(this.capture){this.capture(e.deltaY>0?'WheelDown':'WheelUp',e);return}if(!this.locked)return;this.pr.add(e.deltaY>0?'WheelDown':'WheelUp')},{passive:true});
  addEventListener('contextmenu',e=>{if(this.locked||this.capture)e.preventDefault()});
  addEventListener('blur',()=>{this.keys.clear();this.endDrag()});
  document.addEventListener('pointerlockchange',()=>{this.locked=document.pointerLockElement===el;this.keys.clear();this.app.onLockChange(this.locked)});
 }
 loadBinds(){let s={};try{s=JSON.parse(localStorage.getItem('brg_binds')||'{}')}catch(e){}this.binds={};for(const[a,,d]of ACTIONS)this.binds[a]=s[a]!==undefined?s[a]:d;this.rebuild()}
 saveBinds(){try{localStorage.setItem('brg_binds',JSON.stringify(this.binds))}catch(e){}}
 rebuild(){this.rev={};for(const a in this.binds){const k=this.binds[a];if(!k)continue;(this.rev[k]=this.rev[k]||[]).push(a)}}
 defaults(){this.binds={};for(const[a,,d]of ACTIONS)this.binds[a]=d;this.rebuild();this.saveBinds()}
 // conflicts: action pairs sharing a key (spec shares with fire intentionally – only used when dead)
 conflicts(act,key){const out=[];for(const a in this.binds){if(a!==act&&this.binds[a]===key&&!((a==='spec'&&act==='fire')||(a==='fire'&&act==='spec')))out.push(a)}return out}
 down(a){const k=this.binds[a];return !!k&&this.keys.has(k)}
 pressed(a){const k=this.binds[a];return !!k&&this.pr.has(k)}
 // touch buttons drive the same action binds as the keyboard, so remapped keys still work
 press(a){const k=this.binds[a];if(!k)return;this.keys.add(k);this.pr.add(k)}
 release(a){const k=this.binds[a];if(!k)return;this.keys.delete(k);this.rel.add(k)}
 released(a){const k=this.binds[a];return !!k&&this.rel.has(k)}
 takeLook(){const r={dx:this.dx,dy:this.dy};this.dx=this.dy=0;return r}
 // horizontal mouse-drag distance since the last frame (menus only; cleared every frame)
 takeDrag(){const r=this.drx;this.drx=0;return r}
 endDrag(){this.drag=false;this.drx=0;document.body.classList.remove('look-drag')}
 endFrame(){this.pr.clear();this.rel.clear();this.drx=0}
}
