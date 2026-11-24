import * as THREE from 'three';
import {WEAPONS,ITEMS,RARITY,AMMO,CHARS,FOOD_ICON,KILL_NAMES,keyLabel,clamp,lerp} from './data.js';
import {abilityIcon} from './icons.js';
import * as W from './world.js';
import {wstat,IMG} from './shared.js';
import {MATS,MAT_KEYS} from './materials.js';
import {REVIVE_T,REVIVE_RANGE,KNOCK_HP,CARD_T,VAN_T,VAN_READY,VAN_ACTIVE} from './knock.js';

// one glyph per weapon type and per ability, used in the loadout and ability cards
const WICON={melee:'⛏',ar:'🔫',smg:'🔫',sg:'💥',sn:'🎯',pi:'🔫',ex:'🚀'};
const ABIL_ICON={'Ground Slam':'💥','Overdrive Aura':'⚡','Energy Dodge':'💨','Burger Break':'🍔','Chomp Lunge':'🦷','Sugar Rush':'🍬','Honk Blast':'📣','Snack Break':'🥪','Scoot':'🛴','Brace':'🛡️','Stomp Shock':'🦶','Rage':'😤'};
const $=id=>document.getElementById(id);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e};
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// colour of a reboot van on the map: ready, in use, or cooling down
// you are carrying a reboot card (the reboot vans only show then)
const holdsCard=g=>!!g.cards&&[...g.cards.values()].some(c=>c.carrier===g.me.id);
const vanCol=s=>s===VAN_READY?'#4dfcff':s===VAN_ACTIVE?'#6dff7a':'#7a7f8c';
export class HUD{
 constructor(app){this.app=app;this.root=$('hud');this.scope=false;this.toastT=0;this.build();this.mapImg=null;this.dmgNums=[];this.lastSlotKey='';this.matLast={};this.matEls=null;
  this.scale=1;this.fit();window.addEventListener('resize',()=>this.fit());}
 // The HUD is laid out for a 1280x720 screen and scaled to fit the actual window.
 // The layer is made 1/scale times bigger in CSS pixels and scaled back down, so it fills the window at any size.
 fit(){const vw=innerWidth,vh=innerHeight;const s=Math.max(.7,Math.min(1.6,Math.min(vw/1280,vh/720)));this.scale=s;
  for(const el of [this.root,$('ui')]){if(!el)continue;const st=el.style;st.width=(vw/s)+'px';st.height=(vh/s)+'px';st.transform=`scale(${s})`;st.transformOrigin='0 0'}}
 build(){
  this.root.innerHTML=`
  <div id="vig"></div><div id="scope"></div><div id="dmgdir"></div>
  <div id="cross"><i></i><i></i><i></i><i></i><b></b></div><div id="hitm"><i></i><i></i><i></i><i></i></div>
  <div id="topr"><div class="pill" id="alive"><span>👥</span><b id="aliveN">100</b></div><div class="pill" id="kills"><span>☠</span><b id="killN">0</b></div><div class="pill" id="fps" style="display:none"></div></div>
  <div id="mmwrap"><canvas id="mm" width="340" height="340"></canvas><div id="stormbox"><div id="stormlbl">Storm</div><div id="stormtime">--</div></div><div id="locname"></div></div>
  <div id="wmarks"></div><div id="team"></div><div id="knock"></div><div id="killfeed"></div><div id="toasts"></div><div id="announce"></div>
  <div id="carhud"></div><div id="rbwait"></div><div id="chaoslbl"></div><div id="prompt"><span class="k"></span><span class="t"></span></div>
  <div id="usebar"><div><i></i></div><span></span></div>
  <div id="busHint"></div>
  <div id="bottom">
   <div id="bl"><div id="mats"></div><div id="buffs"></div><div id="abil"></div></div>
   <div id="bc"><div id="barwrap"><div id="shbar"><i></i><b></b></div><div id="hpbar"><i></i><b></b></div></div><div id="slots"></div></div>
   <div id="br"><div id="ammoBox"><b id="magN">0</b><span id="resN">/ 0</span><em id="ammoT"></em></div></div>
  </div>
  <div id="board"></div>
  <div id="dmgnums"></div><div id="stealth"></div>`;
  this.q=s=>this.root.querySelector(s);
  this.mm=$('mm');this.mx=this.mm.getContext('2d');
  this.abilEls=[];this.slotEls=[];
 }
 makeMapImage(){
  const S=700,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const id=x.createImageData(S,S);const d=id.data;const k=W.HALF*2/S;
  const col=(h,sl)=>h<-4?[24,70,110]:h<-.2?[40,105,150]:h<1.8?[226,212,150]:h>34?[240,244,248]:(sl>.75||h>26)?[140,134,122]:[96+(h*.6|0),160+(h*.5|0),74];
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){const wx=(i+.5)*k-W.HALF,wz=(j+.5)*k-W.HALF;const h=W.H(wx,wz);const[gx,gz]=W.slope(wx,wz);const sl=Math.hypot(gx,gz);const c2=col(h,sl);const sh=1+clamp((gx+gz)*-.25,-.2,.2);const p=(j*S+i)*4;d[p]=c2[0]*sh;d[p+1]=c2[1]*sh;d[p+2]=c2[2]*sh;d[p+3]=255}
  x.putImageData(id,0,0);x.fillStyle='rgba(60,60,60,.9)';
  for(const b of W.buildings){x.fillRect((b.x-b.w/2+W.HALF)/k,(b.z-b.d/2+W.HALF)/k,b.w/k,b.d/k)}
  this.mapImg=c;this.mapK=k;this.mapS=S}
 onStart(g){
  this.g=g;if(!this.mapImg)this.makeMapImage();
  this.q('#killfeed').innerHTML='';this.q('#toasts').innerHTML='';this.clearStormFx();this.q('#dmgnums').innerHTML='';this.dmgNums=[];
  this.root.style.display='block';this.q('#fps').style.display=g.settings.fps?'block':'none';
  const me=g.me;this.abilEls=[];const ab=this.q('#abil');ab.innerHTML='';
  me.cdef.ab.forEach((a,i)=>{const d=el('div','abil',`<div class="kk"></div><div class="ico">${a.ic?'<img alt="" src="'+abilityIcon(a)+'">':(ABIL_ICON[a.n]||['①','②','③'][i]||'✦')}</div><div class="nx"></div><div class="an">${a.n}</div><div class="cdo"></div><div class="cdt"></div>`);ab.appendChild(d);this.abilEls.push(d)});
  this.slotsKey='';this.announce('Battle Bus is launching – press SPACE to jump!','#ffd23d');this.board=false;
  this.finished=false;this.pendingElim=null;this.elimShown=false;$('elim').style.display='none';$('victory').style.display='none';
 }
 hide(){this.root.style.display='none';this.clearStormFx()}
 // drop last match's storm warnings: the purple storm vignette and the centre-screen storm banner
 clearStormFx(){this.q('#vig').classList.remove('storm');const a=this.q('#announce');a.classList.remove('show');a.textContent=''}
 toast(m,c){const t=el('div','toast',m);if(c)t.style.color=c;const box=this.q('#toasts');box.appendChild(t);while(box.children.length>3)box.removeChild(box.firstChild);setTimeout(()=>t.remove(),2200)}
 announce(m,c='#fff'){const a=this.q('#announce');a.textContent=m;a.style.color=c;a.classList.remove('show');void a.offsetWidth;a.classList.add('show')}
 killfeed(k){
  // k: {code, head, mine, died, killer: null | {name,col,me} | {gone:true}, victim: {name,col,me}}
  // Weapon kills carry weapon*10+rarity; abilities and projectiles carry negative codes (KILL_NAMES).
  const kf=this.q('#killfeed');if(!kf)return;
  const code=k.code,isW=code>=0&&!!WEAPONS[Math.floor(code/10)];
  const wd=isW?WEAPONS[Math.floor(code/10)]:null,rar=isW?RARITY[code%10]:null;
  const storm=code===-9&&!k.killer,self=!k.killer&&!storm;
  const d=document.createElement('div');d.className='kf'+(k.mine?' mine':k.died?' died':'');
  const who=(n,col,me,cls)=>{const s=document.createElement('b');s.textContent=me?'You':n;if(cls)s.className=cls;if(col)s.style.color=col;return s};
  if(storm)d.appendChild(who('The Storm',null,false,'storm'));
  else if(k.killer)d.appendChild(k.killer.gone?who('Player who left',null,false,'gone'):who(k.killer.name,k.killer.col,k.killer.me));
  else d.appendChild(who(k.victim.name,k.victim.col,k.victim.me));
  if(!storm){const w=document.createElement('i');w.textContent=wd?wd.n:(KILL_NAMES[code]||'Ability');if(rar&&rar.c)w.style.color=rar.c;d.appendChild(w)}
  if(k.head){const h=document.createElement('em');h.className='hs';h.textContent='Headshot';d.appendChild(h)}
  if(self){const o=document.createElement('em');o.className='own';o.textContent='own goal';d.appendChild(o)}
  else d.appendChild(who(k.victim.name,k.victim.col,k.victim.me));
  kf.appendChild(d);while(kf.children.length>6)kf.removeChild(kf.firstChild);setTimeout(()=>d.remove(),6000)}
 critPop(){const n=el('div','crit','CRITICAL');this.root.appendChild(n);setTimeout(()=>n.remove(),800)}
 hitmarker(kill,head,sh){const h=this.q('#hitm');h.className=(kill?'kill ':'')+(head?'head ':'')+(sh?'sh ':'');void h.offsetWidth;h.className+='show'}
 healNumber(pos,a){const n=el('div','dn hl','+'+Math.round(a));this.q('#dmgnums').appendChild(n);this.dmgNums.push({n,p:pos.clone(),t:0,dx:(Math.random()-.5)*40});setTimeout(()=>{n.remove();this.dmgNums=this.dmgNums.filter(x=>x.n!==n)},900)}
 dmgNumber(pos,d,head,g){const n=el('div','dn'+(head?' hd':''),d);this.q('#dmgnums').appendChild(n);this.dmgNums.push({n,p:pos.clone(),t:0,dx:(Math.random()-.5)*40});setTimeout(()=>{n.remove();this.dmgNums=this.dmgNums.filter(x=>x.n!==n)},900)}
 flashDamage(from,g){const v=this.q('#vig');v.classList.remove('hurt');void v.offsetWidth;v.classList.add('hurt');
  const dd=this.q('#dmgdir');if(from){const me=g.me;const dx=from.x-me.pos.x,dz=from.z-me.pos.z;const ang=Math.atan2(dx,-dz)+me.yaw;dd.style.transform=`rotate(${ang*57.3}deg)`;dd.classList.remove('show');void dd.offsetWidth;dd.classList.add('show')}}
 setPrompt(label,l){const p=this.q('#prompt');if(!label){p.style.display='none';return}p.style.display='flex';p.querySelector('.k').textContent=keyLabel(this.app.input.binds.interact);const t=p.querySelector('.t');t.textContent=label;t.style.color=l.item?(l.item.k==='w'?RARITY[l.item.r].c:'#fff'):(l.supply?'#ff8a8a':'#ffd23d')}
 useBar(u){const b=this.q('#usebar');b.style.display='block';b.querySelector('i').style.width=((1-u.t/u.dur)*100)+'%';b.querySelector('span').textContent=ITEMS[u.id]?ITEMS[u.id].n:''}
 abilityUsed(i){}
 // materials panel (top of the bottom-left stack). Counts flash when they change.
 showMats(m){const box=this.q('#mats');if(!box)return;if(!m){box.style.display='none';return}
  if(!this.matEls){box.innerHTML=MAT_KEYS.map(k=>`<div class="mat" data-k="${k}"><i style="background:${MATS[k].c}"></i><span>${MATS[k].n}</span><b>0</b></div>`).join('');this.matEls={};box.querySelectorAll('.mat').forEach(d=>{this.matEls[d.dataset.k]=d})}
  box.style.display='flex';
  for(const k of MAT_KEYS){const v=m[k]||0,d=this.matEls[k];if(this.matLast[k]===v)continue;
   if(this.matLast[k]!==undefined){d.classList.remove('bump');void d.offsetWidth;d.classList.add('bump')}
   d.querySelector('b').textContent=v;this.matLast[k]=v}}
 markSupply(){}

 fmtTime(sec){sec=Math.max(0,Math.floor(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}
 statTiles(rows){return rows.map(([k,v])=>`<div class="es-st"><small>${k}</small><b>${v}</b></div>`).join('')}
 showElim(place,by,kills,g){this.pendingElim={place,by,kills,g,at:performance.now()}}
 // the elimination card (Play Again, Spectate, Lobby)
 elimCard(p){const g=p.g;if(g.over)return;const e=$('elim');e.style.display='flex';const r=this.app.lastReward||{total:0,why:''};
   $('elimPlace').textContent='#'+p.place;$('elimOf').textContent='of '+g.list.length+' players';$('elimBy').textContent=p.by?'Eliminated by '+p.by:'Eliminated';
   $('elimStats').innerHTML=this.statTiles([['Eliminations',p.kills],['Survived',this.fmtTime(g.deathT||g.t)],['Players left',g.aliveCount()]]);
   $('elimTok').textContent=this.rewardText(r);this.app.showCursor(true)}
 rewardText(r){const a=r.total?`+${r.total} Swag Tokens · ${r.why}`:'',b=r.xp?`+${r.xp} Battle Pass XP`:'';return [a,b].filter(Boolean).join('   |   ')}
 showVictory(g){}

 onEnd(g,ev){this.finished=true;$('elim').style.display='none';const won=g.me.team===ev.tm;const v=$('victory');v.classList.toggle('lose',!won);v.style.display='flex';
  const r=this.app.lastReward||{total:0,why:''};
  if(won){$('vicTitle').textContent='Victory Royale';$('vicSub').textContent=g.teamMode?'#1 · Your team is last standing':'#1 · Last one standing'}
  else{const w=g.ents.get(ev.win);$('vicTitle').textContent=(w?w.name:'Nobody')+' wins';$('vicSub').textContent='You placed #'+g.me.place}
  $('vicStats').innerHTML=this.statTiles([['Eliminations',g.me.kills],['Survived',this.fmtTime(g.me.alive?g.t:(g.deathT||g.t))],['Placed','#'+(won?1:(g.me.place||'-'))]]);
  $('vicTok').textContent=this.rewardText(r);
  if(won)this.confetti();setTimeout(()=>this.app.showCursor(true),800)}
 confetti(){const c=$('confetti');c.innerHTML='';for(let i=0;i<90;i++){const p=el('i');p.style.left=Math.random()*100+'%';p.style.background=`hsl(${Math.random()*360},90%,60%)`;p.style.animationDelay=Math.random()*2+'s';p.style.animationDuration=2.5+Math.random()*2.5+'s';c.appendChild(p)}}
 update(g,dt){
  const me=g.me,tgt=g.viewEnt(),I=this.app.input,B=I.binds;
  // bars
  const hp=tgt.hp,sh=tgt.sh+(tgt.ts||0);
  this.q('#hpbar i').style.width=clamp(hp/tgt.maxHp*100,0,100)+'%';this.q('#hpbar b').textContent=Math.ceil(hp)+' / '+tgt.maxHp;
  this.q('#shbar i').style.width=clamp(sh,0,100)+'%';this.q('#shbar b').textContent=Math.ceil(sh);this.q('#shbar').classList.toggle('temp',(tgt.ts||0)>0);
  this.q('#aliveN').textContent=g.aliveCount();this.q('#killN').textContent=me.kills;
  this.updateTeam(g,me);this.updateKnock(g,me);
  // storm
  const s=g.storm;let lbl='Storm approaching',tm=s.t;
  if(s.state==='idle'){lbl='Storm forming';tm=Math.max(0,10-g.t)+0}else if(s.state==='wait')lbl='Storm shrinks in';else if(s.state==='shrink')lbl='Storm closing';else lbl='Final circle';
  if(s.state==='idle')tm=Math.max(0,10-g.t);
  this.q('#stormlbl').textContent=lbl+(s.phase>=0?'  •  '+(s.phase+1):'');this.q('#stormtime').textContent=s.state==='done'?'--':Math.floor(Math.max(0,tm)/60)+':'+String(Math.floor(Math.max(0,tm)%60)).padStart(2,'0');
  const poi=W.poiAt(tgt.pos.x,tgt.pos.z);this.q('#locname').textContent=poi?poi.n:'';
  // loadout: six slots. Weapons show their rarity and icon; items show their stack count.
  const key=me.inv.map(s=>s?(s.k==='w'?s.w+'.'+s.r:s.id+s.n):'-').join(',')+me.cur;
  if(key!==this.slotsKey){this.slotsKey=key;const sl=this.q('#slots');sl.innerHTML='';
   me.inv.forEach((s,i)=>{const d=el('div','slot'+(i===me.cur?' cur':'')+(s?'':' empty'));d.innerHTML=`<em>${i+1}</em>`;
    if(s&&s.k==='w'){const w=WEAPONS[s.w],rc=RARITY[s.r].c;d.style.setProperty('--rc',rc);
     d.innerHTML+=`<div class="wi">${WICON[w.t]||'🎉'}</div><div class="wn" style="color:${rc}">${w.n}</div><div class="sub" style="color:${rc}">${RARITY[s.r].n}</div>`}
    else if(s){const it=ITEMS[s.id];d.style.setProperty('--rc',it.col);
     d.innerHTML+=`<div class="wi">${it.ic}</div><div class="wn">${it.n}</div><b>x${s.n}</b>`}
    else d.innerHTML+=`<div class="sub">Empty</div>`;
    sl.appendChild(d)})}
  // ammo
  const cur=me.inv[me.cur];const ab=this.q('#ammoBox');
  if(cur&&cur.k==='w'&&cur.w!==0){const wd=wstat(cur.w,cur.r);ab.style.display='flex';this.q('#magN').textContent=cur.mag;this.q('#resN').textContent='/ '+me.ammo[wd.ammo];this.q('#ammoT').textContent=me.reload>0?'RELOADING':AMMO[wd.ammo].n;this.q('#ammoT').style.color=me.reload>0?'#ffd23d':'#aab';this.q('#magN').style.color=cur.mag<=Math.ceil(wd.mag*.25)?'#ff6b6b':'#fff'}
  else if(cur&&cur.k==='i'){ab.style.display='flex';this.q('#magN').textContent=cur.n;this.q('#resN').textContent='';this.q('#ammoT').textContent=ITEMS[cur.id].n}
  else ab.style.display='none';
  if(cur&&cur.k==='w'&&cur.w!==0&&wstat(cur.w,cur.r).fungal){this.q('#magN').textContent='\u221E';this.q('#resN').textContent='';this.q('#ammoT').textContent='SPORES';this.q('#ammoT').style.color='#b6ff8a';this.q('#magN').style.color='#b6ff8a'}
  if(!me.use)this.q('#usebar').style.display='none';
  // abilities: a radial sweep shows the remaining cooldown
  me.cdef.ab.forEach((a,i)=>{const d=this.abilEls[i];if(!d)return;const cd=me.cd[i];const f=cd>0?Math.min(100,cd/a.cd*100):0;
   d.querySelector('.cdo').style.background=`conic-gradient(rgba(0,0,0,.72) 0 ${f}%,transparent ${f}% 100%)`;
   d.querySelector('.cdt').textContent=cd>0?Math.ceil(cd):'';d.querySelector('.kk').textContent=keyLabel(B['ab'+(i+1)]);d.classList.toggle('ready',cd<=0);
   const id=me.cdef.id,act=(i===1&&me.auraT>0&&id==='coolguy15')||(i===2&&me.buffT>0&&id==='zach')||(id==='chillguy'&&((i===0&&me.cloakT>0)||(i===1&&me.coldT>0)))||(id==='jay'&&i===2&&me.cookT>0);d.classList.toggle('active',!!act);
   if(id==='jay'&&i===1&&me.foodBag)d.querySelector('.nx').textContent=FOOD_ICON[me.foodBag[0]]||''});
  {const b=[];if(me.cloakT>0)b.push(['Cloaked '+me.cloakT.toFixed(1)+'s','#9be0ff']);if(me.coldT>0)b.push(['Cold Blooded '+me.coldT.toFixed(1)+'s','#7fe0ff']);if(me.slowT>0)b.push(['Slowed','#8ab4ff']);if(me.cookT>0)b.push(['Cooking','#ffb347']);if(me.energyT>0)b.push(['Energy '+me.energyT.toFixed(1)+'s','#c6ff3d']);if(me.spicyT>0)b.push(['Spicy '+me.spicyT.toFixed(1)+'s','#ff7a4a']);if(me.jetFuel>0)b.push(['Jet '+me.jetFuel.toFixed(1)+'s','#9be0ff']);
   const k=b.map(x=>x[0]).join('|');const bf=this.q('#buffs');if(bf.dataset.k!==k||me.cloakT>0||me.coldT>0){bf.dataset.k=k;bf.innerHTML=b.map(x=>`<span class="bf" style="color:${x[1]}">${x[0]}</span>`).join('')}this.q('#stealth').classList.toggle('on',me.cloakT>0&&me.alive)}
  // crosshair
  const wd=g.curWeapon(me);const c=this.q('#cross');const sp=Math.hypot(me.vel.x,me.vel.z);
  // crosshair bloom (v40): the cross opens to the real spread of your next shot (moving, in the air, firing bloom, recoil),
  // then springs shut. Same spread formula as combat.js fireWeapon, so what you see is what the bullet does.
  const spread=wd?wd.sp*(me.aiming?.3:1)*(1+Math.min(sp,9)*.05)*(me.grounded?1:2)*(me.crouch?.75:1)+me.bloom*.5:0;
  const target=6+spread*600+(me.grounded?0:5)+g.view.recoilP*220;
  this.xg=this.xg==null?target:this.xg+(target-this.xg)*Math.min(1,dt*(target>this.xg?20:7));
  const gap=this.xg;c.style.setProperty('--g',gap+'px');c.classList.toggle('ads',g.view.adsK>.5&&!!wd);c.style.opacity=(me.alive&&me.drop===null&&!(wd&&wd.zoom>=3&&g.view.adsK>.3)&&cur&&!(cur.k==='i'))?'1':(cur&&cur.k==='i'&&me.drop===null?'.8':'0');
  this.q('#scope').style.display=this.scope?'block':'none';
  // vignette storm
  const inS=g.insideStorm(tgt.pos.x,tgt.pos.z);this.q('#vig').classList.toggle('storm',!inS);
  this.carHud(g,me,B);
  this.chaosHud(g);
  // bus hint
  const bh=this.q('#busHint');const alt=g.dropAlt|0,J=keyLabel(B.jump),C=keyLabel(B.crouch);if(me.drop==='bus'&&me.alive){bh.style.display='block';bh.innerHTML=`Press <b>${J}</b> to jump from the Battle Bus · the gold ring is where you land`}else if(me.drop==='free'||me.drop==='glide'){bh.style.display='block';bh.innerHTML=me.drop==='free'?`Altitude <b>${alt} m</b> · <b>${J}</b> opens your glider early · it opens by itself below 95 m`:me.dive?`Diving <b>${alt} m</b> · press <b>${J}</b> to redeploy the glider`:`Gliding <b>${alt} m</b> · <b>${C}</b> to dive · <b>${J}</b> to redeploy after a dive`;if(me.drop==='free'&&performance.now()%1e9<1e12)bh.innerHTML+=` · <b>${keyLabel(B.jump)}</b> deploys early`}else bh.style.display='none';
  if(!me.alive&&!g.over){bh.style.display='block';bh.innerHTML=`Spectating <b>${tgt.name}</b> · <b>${keyLabel(B.spec)}</b> next player`}
  // damage numbers
  const cam=g.camera;for(const d of this.dmgNums){d.t+=dt;const v=d.p.clone().project(cam);if(v.z>1){d.n.style.display='none';continue}d.n.style.display='block';const S=this.scale;d.n.style.left=((v.x*.5+.5)*innerWidth+d.dx*d.t)/S+'px';d.n.style.top=((-v.y*.5+.5)*innerHeight-d.t*60)/S+'px';d.n.style.opacity=Math.max(0,1-d.t/.9)}
  // fps
  if(g.settings.fps){this.fpsAcc=(this.fpsAcc||0)+dt;this.fpsN=(this.fpsN||0)+1;if(this.fpsAcc>.5){this.q('#fps').textContent=Math.round(this.fpsN/this.fpsAcc)+' FPS';this.fpsAcc=0;this.fpsN=0}}
  // the minimap redraws about 11 times a second: it is a small picture, and redrawing it every frame is wasted work
  if(!this.mmT||performance.now()-this.mmT>90){this.mmT=performance.now();this.drawMinimap(g,tgt)}if($('bigmap').style.display==='flex')this.drawMinimap(g,tgt,$('bm'));this.drawWorldMarks(g,me);this.drawStructBar(g,dt);
  // scoreboard
  const bd=this.q('#board');if(I.down('score')){bd.style.display='block';if(!this.bt||performance.now()-this.bt>300){this.bt=performance.now();const l=g.list.slice().sort((a,b)=>b.kills-a.kills||(b.alive-a.alive));bd.innerHTML='<h3>Players</h3>'+l.slice(0,16).map(e=>`<div class="${e.alive?'':'dead'}"><span>${e.name}${e.bot?' 🤖':''}</span><b>${e.kills}</b></div>`).join('')}}else bd.style.display='none';
 }
 // health bar over the player-built structure you last hit; hidden 2 seconds after the last hit
 drawStructBar(g,dt){
  let bar=this.root.querySelector('#strbar');
  if(!bar){bar=el('div','strbar','<i></i>');bar.id='strbar';this.root.appendChild(bar)}
  const sb=g.structBar;
  if(!sb){bar.style.display='none';return}
  sb.t+=dt;
  const p=g.pieces&&g.pieces.get(sb.id);
  if(sb.t>2||!p||p.dead){g.structBar=null;bar.style.display='none';return}
  const v=new THREE.Vector3(p.x,p.y+(p.ty==='floor'?.5:1.7),p.z).project(g.camera);
  if(v.z>1){bar.style.display='none';return}
  const S=this.scale;
  bar.style.display='block';
  bar.style.left=((v.x*.5+.5)*innerWidth)/S+'px';bar.style.top=((-v.y*.5+.5)*innerHeight)/S+'px';
  bar.firstChild.style.width=clamp(p.hp/p.maxHp,0,1)*100+'%';
 }
 // driving: a panel for the car you are in (speed, car health, the controls)
 carHud(g,me,B){
  const box=this.q('#carhud');
  const c=me.car>=0&&g.cars?g.cars.get(me.car):null;
  if(!c||!me.alive){box.style.display='none';box.dataset.k='';return}
  const drv=c.seats[0]===me.id;
  const kph=Math.round(Math.abs(c.v)*3.6),hpPct=clamp(c.hp/c.maxHp*100,0,100);
  const ctl=drv?`<kbd>${keyLabel(B.fwd)}</kbd><kbd>${keyLabel(B.back)}</kbd> drive / reverse · <kbd>${keyLabel(B.left)}</kbd><kbd>${keyLabel(B.right)}</kbd> steer · <kbd>${keyLabel(B.jump)}</kbd> brake · <kbd>${keyLabel(B.interact)}</kbd> get out`:`Passenger · <kbd>${keyLabel(B.interact)}</kbd> get out`;
  const html=`<div>${kph} km/h${c.burn?' · <span class="onfire">ON FIRE</span>':''}</div><div class="cbar"><i style="width:${hpPct}%"></i></div><div style="font-size:12px;font-weight:600;margin-top:5px">${ctl}</div>`;
  if(box.dataset.k!==html){box.dataset.k=html;box.innerHTML=html}
  box.style.display='block';
 }
 // Chaos Rising: the countdown to the next chaos event
 chaosHud(g){
  const el=this.q('#chaoslbl');
  const on=g.gm==='chaos'&&!g.over;
  el.style.display=on?'block':'none';
  if(on){const t=`CHAOS RISING · next event in ${Math.max(0,Math.ceil(g.chaosT||0))}s`;if(el.textContent!==t)el.textContent=t}
 }
 updateTeam(g,me){
  const box=this.q('#team');const now=performance.now();if(this.teamT&&now-this.teamT<200)return;this.teamT=now;
  const mates=g.list.filter(o=>o!==me&&o.team===me.team);
  if(!mates.length){if(box.dataset.k!=='')box.innerHTML='';box.dataset.k='';return}
  const rows=mates.map(o=>{
   const d=Math.round(Math.hypot(o.pos.x-me.pos.x,o.pos.z-me.pos.z));
   const card=[...g.cards.values()].find(c=>c.owner===o.id);
   let st;
   if(!o.alive)st=card?`<span class="card">REBOOT CARD ${card.carrier>=0?'· '+esc((g.ents.get(card.carrier)||{}).name||'carried'):'· on the ground'}</span>`:'<span class="ko">OUT</span>';
   else if(o.knocked)st=`<span class="kn">KNOCKED · ${Math.ceil(o.hp)} HP · ${d}m</span><i class="rv"><u style="width:${Math.min(100,o.reviveT/REVIVE_T*100)}%"></u></i>`;
   else st=`<i><u style="width:${clamp(o.hp/o.maxHp*100,0,100)}%"></u></i><span>${Math.ceil(o.hp)} HP · ${d}m</span>`;
   return `<div class="tm${o.alive?'':' out'}${o.knocked?' kn':''}"><b>${esc(o.name)}</b>${st}</div>`}).join('');
  if(box.dataset.k!==rows){box.dataset.k=rows;box.innerHTML=`<div class="tt">Team</div>${rows}`}
 }
  // ---- revive and reboot screens (team modes)
 // your own knock (the downed panel), the reboot screen after an elimination, or a card for the revive you are doing
 updateKnock(g,me){
  const box=this.q('#knock');let html='';
  const vig=this.q('#vig');if(vig)vig.classList.toggle('knocked',!!(me.alive&&me.knocked));
  const rb=this.q('#rbwait');
  if(me.alive&&me.knocked){this.renderDowned(g,me)}
  else if(this.rbWaiting(g,me)){this.renderReboot(g,me)}
  else{
   rb.style.display='none';rb.dataset.k='';
   const r=g.list.find(o=>o!==me&&o.alive&&o.knocked&&o.reviver===me.id);
   if(r)html=`<div class="kn-card rv"><div class="kn-top"><span class="kn-t">Reviving ${esc(r.name)}</span><span class="kn-n">${Math.ceil(Math.max(0,REVIVE_T-r.reviveT))}s</span></div><div class="kn-bar"><i style="width:${Math.min(100,r.reviveT/REVIVE_T*100)}%"></i></div></div>`;
  }
  if(box.dataset.k!==html){box.dataset.k=html;box.innerHTML=html}
  box.style.display=html?'flex':'none';
  this.updateAfterDeath(g,me);
 }
 // you are eliminated but a teammate can still reboot you
 rbWaiting(g,me){return !!(g.teamMode&&!g.over&&me&&!me.alive&&[...g.cards.values()].some(c=>c.owner===me.id))}
 // after an elimination: the reboot screen while a reboot is still possible, otherwise the elimination card
 updateAfterDeath(g,me){
  if(me.alive){this.pendingElim=null;this.elimShown=false;return}
  if(this.rbWaiting(g,me)){$('elim').style.display='none';return}
  // no reboot left: the elimination card (with what we know if the elimination record is missing)
  const p=this.pendingElim||{place:me.place||0,by:null,kills:me.kills||0,g,at:-1e9};
  if(!this.elimShown&&performance.now()-p.at>1500){this.elimShown=true;this.elimCard(p)}
  }
 setRb(box,html){if(box.dataset.k!==html){box.dataset.k=html;box.innerHTML=html}}
 // teammates as chips: up, down (bleeding out) or out
 mateChips(g,me){
  const mates=g.list.filter(o=>o!==me&&o.team===me.team);
  if(!mates.length)return '<span class="rb-m out">No teammates left</span>';
  return mates.map(o=>{const st=!o.alive?'out':o.knocked?'down':'up';return `<span class="rb-m ${st}">${esc(o.name)}${st==='down'?' (down)':st==='out'?' (out)':''}</span>`}).join('');
 }
 // the downed panel: bleed-out timer, the revive if a teammate is doing one, and what to do
 renderDowned(g,me){
  const box=this.q('#rbwait');box.className='rbs dn';box.style.display='flex';
  const left=Math.ceil(Math.max(0,me.hp));const keyI=keyLabel(this.app.input.binds.interact);
  const reviving=me.reviveT>0;
  const msg=reviving?'<b>A teammate is reviving you. Stay still.</b>':`Crawl to cover. Enemy shots take this down faster. A standing teammate can revive you if they stay within ${REVIVE_RANGE} m and hold <kbd>${keyI}</kbd>.`;
  const html=`<div class="rbs-head"><span class="rbs-tag dn">Downed</span><span class="rbs-time"><b>${left}</b> HP left</span></div>`+
   `<div class="rbs-bleed dn"><i style="width:${clamp(me.hp/KNOCK_HP,0,1)*100}%"></i></div>`+
   (reviving?`<div class="rbs-revbar"><i style="width:${Math.min(100,me.reviveT/REVIVE_T*100)}%"></i></div>`:'')+
   `<div class="rbs-msg">${msg}</div>`+
   `<div class="rbs-mates">${this.mateChips(g,me)}</div>`;
  this.setRb(box,html);
 }
 // the reboot screen: the three steps of getting you back, what is happening now, card and van times
 renderReboot(g,me){
  const box=this.q('#rbwait');box.className='rbs rb';box.style.display='flex';
  const card=[...g.cards.values()].find(c=>c.owner===me.id);
  const van=[...g.vans.values()].find(v=>v.state===VAN_ACTIVE&&v.card===card.id);
  const carrier=card.carrier>=0?g.ents.get(card.carrier):null;
  const stage=van?2:carrier?1:0;
  const steps=[['Teammate finds your card',stage>=1,stage===0],['Card carried to a reboot van',stage>=2,stage===1],['Rebooted',false,stage===2]];
  let line;
  if(stage===0)line='Your card is on the ground. A teammate has to pick it up.';
  else if(stage===1)line=`${esc(carrier?carrier.name:'A teammate')} is carrying your card to a reboot van.`;
  else{const rn=(g.ents.get(van.user)||{}).name||'A teammate';line=`${esc(rn)} is rebooting you.`}
  const vans=[...g.vans.values()];const ready=vans.filter(v=>v.state===VAN_READY).length;
  const timeTxt=stage===2?`Reboot in ${Math.ceil(Math.max(0,van.t))}s`:`Card lasts ${Math.ceil(Math.max(0,card.t))}s`;
  const html=`<div class="rbs-head"><span class="rbs-tag rb">Reboot pending</span><span class="rbs-time"><b>${Math.ceil(Math.max(0,card.t))}</b>s</span></div>`+
   `<div class="rbs-bleed rb"><i style="width:${clamp(card.t/CARD_T,0,1)*100}%"></i></div>`+
   `<div class="rbs-steps">${steps.map(([t,done,now])=>`<div class="rbs-step${done?' done':now?' now':''}">${done?'&#10003; ':''}${t}</div>`).join('')}</div>`+
   `<div class="rbs-msg">${line}</div>`+
   `<div class="rbs-foot"><span>${timeTxt}</span><span>Reboot vans ready: ${ready} of ${vans.length}</span></div>`+
   `<div class="rbs-mates">${this.mateChips(g,me)}</div>`;
  this.setRb(box,html);
 }
 hideElim(){$('elim').style.display='none'}
 // the reboot waypoint: a teammate's card on the ground, then a reboot van once you carry the card
 waypointTarget(g,me){
  if(!me||!me.alive||me.knocked)return null;
  if([...g.cards.values()].some(c=>c.carrier===me.id)){
   let best=null,bd=1e9;
   for(const v of g.vans.values()){const d=Math.hypot(v.x-me.pos.x,v.z-me.pos.z)+(v.state===VAN_READY?0:500);if(d<bd){bd=d;best=v}}
   return best?{x:best.x,y:W.H(best.x,best.z)+2,z:best.z,label:'Reboot van',cls:'van'}:null;
  }
  if(!g.teamMode)return null;
  let best=null,bd=1e9;
  for(const c of g.cards.values()){if(c.team!==me.team||c.carrier>=0)continue;const d=Math.hypot(c.x-me.pos.x,c.z-me.pos.z);if(d<bd){bd=d;best=c}}
  return best?{x:best.x,y:best.y+1.2,z:best.z,label:'Reboot card',cls:'rcard'}:null;
 }
 // teammates (visible through walls and across the map) and the waypoint, as markers at the screen edge when off screen
 drawWorldMarks(g,me){
  const box=this.q('#wmarks');if(!box||!g.camera)return;const cam=g.camera;const W0=innerWidth/this.scale,H0=innerHeight/this.scale;
  const items=[];
  if(g.teamMode)for(const o of g.list){if(o===me||o.team!==me.team||!o.alive)continue;items.push({key:'m'+o.id,cls:'mate'+(o.knocked?' kn':''),x:o.pos.x,y:o.pos.y+2.3,z:o.pos.z,name:o.name+(o.knocked?' · knocked':''),d:o.pos})}
  if(g.teamMode){
   if(holdsCard(g))for(const v of g.vans.values())items.push({key:'v'+v.id,cls:'vanm '+(v.state===VAN_READY?'ready':v.state===VAN_ACTIVE?'active':'cool'),x:v.x,y:v.y+4,z:v.z,name:'Reboot van',d:v});
   for(const cd of g.cards.values()){if(cd.team!==me.team)continue;const car=cd.carrier>=0?g.ents.get(cd.carrier):null;const px=car?car.pos.x:cd.x,py=car?car.pos.y:cd.y,pz=car?car.pos.z:cd.z;const ow=g.ents.get(cd.owner);
    items.push({key:'c'+cd.id,cls:'cardm',x:px,y:py+2.2,z:pz,name:'Reboot card'+(ow?' · '+ow.name:''),d:{x:px,z:pz}})}
  }
  const wp=this.waypointTarget(g,me);if(wp)items.push({key:'wp',cls:'wp '+wp.cls,x:wp.x,y:wp.y,z:wp.z,name:wp.label,d:wp});
  this.wmEls=this.wmEls||new Map();const used=new Set();
  for(const it of items){
   used.add(it.key);
   let el=this.wmEls.get(it.key);
   if(!el){el=document.createElement('div');el.innerHTML='<i></i><b></b><small></small>';box.appendChild(el);this.wmEls.set(it.key,el)}
   el.className='wmark '+it.cls;
   const v=new THREE.Vector3(it.x,it.y,it.z).project(cam);
   let sx=(v.x*.5+.5)*W0,sy=(-v.y*.5+.5)*H0;
   if(v.z>1){let dx=-v.x,dy=v.y;const l=Math.hypot(dx,dy)||1;sx=W0/2+dx/l*2000;sy=H0/2+dy/l*2000}  // behind the camera: point at the edge
   const M=60;const edge=sx<M||sx>W0-M||sy<M||sy>H0-M||v.z>1;
   sx=clamp(sx,M,W0-M);sy=clamp(sy,M,H0-M);
   if(sx<290&&sy<260)sx=290;   // keep edge markers clear of the team list in the top left
   if(sy<150&&sx>W0-340)sy=150;   // and clear of the counters in the top right
   el.style.transform=`translate(${sx}px,${sy}px) translate(-50%,-50%)`;
   el.classList.toggle('edge',edge);
   el.querySelector('b').textContent=it.name;
   el.querySelector('small').textContent=Math.round(Math.hypot(it.d.x-me.pos.x,it.d.z-me.pos.z))+'m';
  }
  for(const[k,el]of this.wmEls)if(!used.has(k)){el.remove();this.wmEls.delete(k)}
 }
 // minimap: rotating circle centred on the player; teammates, waypoint, supplies, storm and next zone
 drawMinimap(g,tgt,big){
  const cv=big||this.mm,x=cv.getContext('2d'),S=cv.width;x.clearRect(0,0,S,S);if(!this.mapImg)return;
  const st=g.storm,z=g.nextZone(),wp=this.waypointTarget(g,g.me);
  const teammates=g.teamMode?g.list.filter(o=>o!==g.me&&o.alive&&o.team===g.me.team):[];
  if(!big){
   const view=230,k=S/view;const rot=g.settings.mapRotate;
   // map->canvas transform for the minimap (player at the centre)
   const T=(px,pz)=>{let dx=(px-tgt.pos.x)*k,dz=(pz-tgt.pos.z)*k;if(rot){const c=Math.cos(tgt.yaw),s=Math.sin(tgt.yaw);const rx=dx*c-dz*s,rz=dx*s+dz*c;dx=rx;dz=rz}return [S/2+dx,S/2+dz]};
   x.save();x.beginPath();x.arc(S/2,S/2,S/2,0,6.283);x.clip();
   x.fillStyle='#0b1230';x.fillRect(0,0,S,S);
   x.translate(S/2,S/2);if(rot)x.rotate(tgt.yaw);x.scale(k,k);x.translate(-tgt.pos.x,-tgt.pos.z);
   x.drawImage(this.mapImg,-W.HALF,-W.HALF,W.HALF*2,W.HALF*2);
   x.setTransform(1,0,0,1,0,0);
   // storm: the outside of the circle is shaded
   x.save();x.translate(S/2,S/2);if(rot)x.rotate(tgt.yaw);x.scale(k,k);x.translate(-tgt.pos.x,-tgt.pos.z);
   x.fillStyle='rgba(150,70,255,.42)';x.beginPath();x.rect(tgt.pos.x-400,tgt.pos.z-400,800,800);x.arc(st.cx,st.cz,st.r,0,6.283,true);x.fill('evenodd');
   x.strokeStyle='#d7a6ff';x.lineWidth=2/k;x.beginPath();x.arc(st.cx,st.cz,st.r,0,6.283);x.stroke();
   if(z){x.setLineDash([6/k,5/k]);x.strokeStyle='#ffffff';x.beginPath();x.arc(z.x,z.z,z.r,0,6.283);x.stroke();x.setLineDash([])}
   for(const s of g.supplies)if(!s.landed||g.loot.has(s.id)){x.fillStyle='#ff5a5a';x.fillRect(s.x-6/k,s.z-6/k,12/k,12/k)}
   if(g.busMesh&&g.busMesh.visible){x.fillStyle='#ffd23d';x.beginPath();x.arc(g.bus.pos.x,g.bus.pos.z,7/k,0,6.283);x.fill()}
   x.restore();
   // teammates and the waypoint (clamped to the rim when they are off the minimap)
   const rim=S/2-14;
   const mark=(px,pz,col,shape)=>{let[a,c]=T(px,pz);let dx=a-S/2,dy=c-S/2;const d=Math.hypot(dx,dy);const out=d>rim;if(out){dx=dx/d*rim;dy=dy/d*rim;a=S/2+dx;c=S/2+dy}
    x.fillStyle=col;x.strokeStyle='#021';x.lineWidth=2;x.beginPath();
    if(shape==='diamond'){x.moveTo(a,c-9);x.lineTo(a+7,c);x.lineTo(a,c+9);x.lineTo(a-7,c)}else if(shape==='square'){x.rect(a-6,c-6,12,12)}else x.arc(a,c,6,0,6.283);
    x.closePath();x.fill();x.stroke()};
   if(g.teamMode){
    if(holdsCard(g))for(const v of g.vans.values())mark(v.x,v.z,vanCol(v.state),'square');
    for(const cd of g.cards.values()){if(cd.team!==g.me.team)continue;const car=cd.carrier>=0?g.ents.get(cd.carrier):null;mark(car?car.pos.x:cd.x,car?car.pos.z:cd.z,'#eafcff','square')}
   }
   for(const o of teammates)mark(o.pos.x,o.pos.z,o.knocked?'#ff6b6b':'#4dff8a','dot');
   if(wp)mark(wp.x,wp.z,'#ffd23d','diamond');
   x.restore();
   // player arrow in the centre (points up, or the way you face when the map is fixed)
   x.save();x.translate(S/2,S/2);if(!rot)x.rotate(-tgt.yaw);
   x.fillStyle='#ffffff';x.strokeStyle='#000';x.lineWidth=2;x.beginPath();x.moveTo(0,-11);x.lineTo(8,8);x.lineTo(0,4);x.lineTo(-8,8);x.closePath();x.fill();x.stroke();x.restore();
   x.strokeStyle='rgba(160,210,255,.7)';x.lineWidth=3;x.beginPath();x.arc(S/2,S/2,S/2-1.5,0,6.283);x.stroke();
   return
  }
  // world map
  const k=S/(W.HALF*2),P=(px,pz)=>[(px+W.HALF)*k,(pz+W.HALF)*k];
  x.drawImage(this.mapImg,0,0,S,S);
  const[c0,c1]=P(st.cx,st.cz);x.fillStyle='rgba(150,70,255,.42)';x.beginPath();x.rect(0,0,S,S);x.arc(c0,c1,st.r*k,0,6.283,true);x.fill('evenodd');
  x.strokeStyle='#d7a6ff';x.lineWidth=3;x.beginPath();x.arc(c0,c1,st.r*k,0,6.283);x.stroke();
  if(z){const[a,b]=P(z.x,z.z);x.setLineDash([12,9]);x.strokeStyle='#ffffff';x.lineWidth=3;x.beginPath();x.arc(a,b,z.r*k,0,6.283);x.stroke();x.setLineDash([])}
  x.font='700 17px Segoe UI,Arial,sans-serif';x.textAlign='center';x.lineWidth=5;x.strokeStyle='rgba(0,0,0,.75)';x.fillStyle='#ffffff';
  for(const p of W.POIS){const[a,b]=P(p.x,p.z);x.strokeText(p.n,a,b);x.fillText(p.n,a,b)}
  const b=g.bus;const[s0,s1]=P(b.sx,b.sz),[e0,e1]=P(b.sx+b.dx*b.len,b.sz+b.dz*b.len);
  x.strokeStyle='#ffd23d';x.setLineDash([10,8]);x.lineWidth=3;x.beginPath();x.moveTo(s0,s1);x.lineTo(e0,e1);x.stroke();x.setLineDash([]);
  const[bp0,bp1]=P(b.pos.x,b.pos.z);if(g.busMesh&&g.busMesh.visible){x.fillStyle='#ffd23d';x.beginPath();x.arc(bp0,bp1,9,0,6.283);x.fill()}
  for(const s of g.supplies){const[a,c]=P(s.x,s.z);x.fillStyle='#ff5a5a';x.fillRect(a-7,c-7,14,14)}
  if(g.teamMode){
   x.font='800 14px Segoe UI,Arial,sans-serif';x.textAlign='center';x.lineWidth=4;x.strokeStyle='rgba(0,0,0,.8)';
   if(holdsCard(g))for(const v of g.vans.values()){const[a,c]=P(v.x,v.z),col=vanCol(v.state);x.fillStyle=col;x.strokeStyle='#021';x.lineWidth=2;x.fillRect(a-8,c-8,16,16);x.strokeRect(a-8,c-8,16,16);
    x.strokeStyle='rgba(0,0,0,.8)';x.lineWidth=4;x.strokeText('Van',a,c-13);x.fillStyle=col;x.fillText('Van',a,c-13)}
   for(const cd of g.cards.values()){if(cd.team!==g.me.team)continue;const car=cd.carrier>=0?g.ents.get(cd.carrier):null;const[a,c]=P(car?car.pos.x:cd.x,car?car.pos.z:cd.z);
    x.fillStyle='#eafcff';x.strokeStyle='#021';x.lineWidth=2;x.fillRect(a-6,c-8,12,16);x.strokeRect(a-6,c-8,12,16);
    x.strokeStyle='rgba(0,0,0,.8)';x.lineWidth=4;x.strokeText('Card',a,c-13);x.fillStyle='#eafcff';x.fillText('Card',a,c-13)}
  }
  if(wp){const[a,c]=P(wp.x,wp.z);x.fillStyle='#ffd23d';x.strokeStyle='#000';x.lineWidth=3;x.beginPath();x.moveTo(a,c-16);x.lineTo(a+10,c);x.lineTo(a,c+16);x.lineTo(a-10,c);x.closePath();x.fill();x.stroke();
    x.font='800 15px Segoe UI,Arial,sans-serif';x.strokeText(wp.label,a,c-22);x.fillStyle='#ffd23d';x.fillText(wp.label,a,c-22);x.fillStyle='#ffffff'}
  for(const o of teammates){const[a,c]=P(o.pos.x,o.pos.z);x.fillStyle=o.knocked?'#ff6b6b':'#4dff8a';x.strokeStyle='#021';x.lineWidth=2;x.beginPath();x.arc(a,c,8,0,6.283);x.fill();x.stroke();
    x.font='800 15px Segoe UI,Arial,sans-serif';x.strokeStyle='rgba(0,0,0,.8)';x.lineWidth=4;x.strokeText(o.name,a,c-14);x.fillStyle='#e8fff0';x.fillText(o.name,a,c-14)}
  const[m0,m1]=P(tgt.pos.x,tgt.pos.z);x.save();x.translate(m0,m1);x.rotate(-tgt.yaw+Math.PI);x.fillStyle='#ffffff';x.strokeStyle='#000';x.lineWidth=2;x.beginPath();x.moveTo(0,12);x.lineTo(9,-10);x.lineTo(0,-5);x.lineTo(-9,-10);x.closePath();x.fill();x.stroke();x.restore();
 }
}
