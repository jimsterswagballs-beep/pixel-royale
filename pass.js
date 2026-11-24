// Season 2 menus: the Battle Pass screen, XP and claiming, skin and trail equipping, the first-join summary
// and the cycling banner in the lobby. App methods (mixed into App in main.js).
import {SEASON,BP_LEVELS,xpFor,xpTotal,levelOf,REWARDS,SKINS,TRAILS,TYPE_LABEL,SLIDES} from './season2.js';
import {IMG} from './shared.js';
import {FX_SLOT} from './cosmetics.js';
import {SHOP_BY} from './shopcos.js';
import imgPass from './s2_pass.png';
import imgSkins from './s2_skins.png';
import imgCorrupt from './s2_corrupt.png';

const $=id=>document.getElementById(id);
const h=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
const SLIDE_IMG={pass:imgPass,skins:imgSkins,corrupt:imgCorrupt};
const mush=(c1,c2,s)=>`<svg viewBox="0 0 40 40" width="${s}" height="${s}" aria-hidden="true"><path d="M4 22C4 11 12 4 20 4s16 7 16 18z" fill="${c1}"/><circle cx="13" cy="14" r="3" fill="#fff" opacity=".55"/><circle cx="25" cy="11" r="2.2" fill="#fff" opacity=".55"/><circle cx="27" cy="18" r="2.6" fill="#fff" opacity=".5"/><rect x="15" y="21" width="10" height="14" rx="4" fill="${c2}"/></svg>`;

export const passMethods={
 // ---------- saving: add the Season 2 fields to a profile, and repair them if they are damaged
 s2Migrate(){
  const P=this.profile;
  if(!P.bp||typeof P.bp!=='object')P.bp={xp:0,claimed:[]};
  P.bp.xp=Math.min(xpTotal(BP_LEVELS),Math.max(0,Math.floor(+P.bp.xp||0)));
  P.bp.claimed=[...new Set((Array.isArray(P.bp.claimed)?P.bp.claimed:[]).map(Number).filter(n=>n>=1&&n<=BP_LEVELS))];
  P.ownedSkins=(Array.isArray(P.ownedSkins)?P.ownedSkins:[]).filter(id=>SKINS[id]);
  P.ownedTrails=(Array.isArray(P.ownedTrails)?P.ownedTrails:[]).filter(id=>TRAILS[id]);
  // anything claimed is owned (this also repairs a profile whose lists were lost)
  for(const r of REWARDS)if(P.bp.claimed.includes(r.lvl)){
   if(r.type==='skin'&&!P.ownedSkins.includes(r.skin))P.ownedSkins.push(r.skin);
   if(r.type==='trail'&&!P.ownedTrails.includes(r.id))P.ownedTrails.push(r.id);
   if(r.type==='emote'&&!(P.ownedEmotes||(P.ownedEmotes=[])).includes(r.id))P.ownedEmotes.push(r.id)}
  // v38: equipped Battle Pass cosmetics (hat, backpack, glider, effects, finishes, nameplate) must be claimed and sit in the right slot
  // v39: things bought in the Item Shop live in ownedCos (only real shop ids are kept)
  P.ownedCos=[...new Set(Array.isArray(P.ownedCos)?P.ownedCos:[])].filter(id=>SHOP_BY[id]);
  P.eq=(P.eq&&typeof P.eq==='object')?P.eq:{};
  for(const k of Object.keys(P.eq)){const id=P.eq[k],r=REWARDS.find(x=>x.id===id);
   const okPass=!!r&&FX_SLOT[id]===k&&P.bp.claimed.includes(r.lvl),okShop=!!SHOP_BY[id]&&FX_SLOT[id]===k&&P.ownedCos.includes(id);
   if(!okPass&&!okShop)delete P.eq[k]}
  P.skin=(P.skin&&typeof P.skin==='object')?P.skin:{};
  for(const c of Object.keys(P.skin)){const s=SKINS[P.skin[c]];if(!s||s.char!==c||!P.ownedSkins.includes(s.id))delete P.skin[c]}
  if(P.trail&&String(P.trail).startsWith('bp:')&&!P.ownedTrails.includes(P.trail))P.trail='';
  if(P.trail&&String(P.trail).startsWith('sh:')&&!P.ownedCos.includes(P.trail))P.trail='';
  P.s2seen=+P.s2seen||0;
 },
 bpInfo(){return levelOf(this.profile.bp.xp)},
 // rewards that are reached, can be claimed now, and have not been claimed
 claimable(){const L=this.bpInfo().lvl,C=this.profile.bp.claimed;return REWARDS.filter(r=>r.lvl<=L&&r.live&&!C.includes(r.lvl))},
 // Battle Pass XP, paid together with the Swag Tokens at the end of a match
 addXp(n,why){
  const P=this.profile;n=Math.max(0,Math.floor(n||0));if(!n)return;
  const before=levelOf(P.bp.xp).lvl;
  P.bp.xp=Math.min(xpTotal(BP_LEVELS),P.bp.xp+n);
  const after=levelOf(P.bp.xp).lvl;
  if(this.lastReward)this.lastReward.xp=n;else this.lastReward={total:0,why:'',xp:n};
  this.saveProfile();this.updatePassDot();
  if(after>before)setTimeout(()=>this.toast('Battle Pass level '+after+' reached'+(this.claimable().length?' · rewards ready':'')),3600);
 },
 claim(lvl){
  const P=this.profile,r=REWARDS.find(x=>x.lvl===lvl);
  if(!r||!r.live||P.bp.claimed.includes(lvl)||this.bpInfo().lvl<lvl)return false;
  P.bp.claimed.push(lvl);
  if(r.type==='skin'&&!P.ownedSkins.includes(r.skin))P.ownedSkins.push(r.skin);
  if(r.type==='trail'&&!P.ownedTrails.includes(r.id))P.ownedTrails.push(r.id);
  if(r.type==='emote'&&!P.ownedEmotes.includes(r.id))P.ownedEmotes.push(r.id);
  this.saveProfile();this.updatePassDot();return true;
 },
 claimAll(){let n=0;for(const r of this.claimable())if(this.claim(r.lvl))n++;if(n){this.sfx('chest');this.toast('Claimed '+n+' reward'+(n>1?'s':''))}this.passRender()},
 equipSkin(char,id){const P=this.profile;if(id&&(!SKINS[id]||SKINS[id].char!==char||!P.ownedSkins.includes(id)))return;if(id)P.skin[char]=id;else delete P.skin[char];this.saveProfile()},
 equipTrail(id){const P=this.profile;if(id&&String(id).startsWith('sh:')){if(!P.ownedCos.includes(id))return}else if(id&&!P.ownedTrails.includes(id))return;P.trail=id;this.saveProfile()},
 updatePassDot(){const b=document.querySelector('#navTabs button[data-go="pass"]');if(b)b.classList.toggle('dot',this.claimable().length>0)},

 // ---------- the Battle Pass screen
 rewardPic(r,big){
  if(r.type==='skin')return `<img class="bp-sk" src="${IMG[r.skin].front}" alt="">`;
  if(r.type==='trail'){const t=TRAILS[r.id];return `<span class="bp-trl" style="--c1:${t.c1};--c2:${t.c2}"><i></i><i></i><i></i><i></i></span>`}
  return `<span class="bp-ico${big?' lg':''}">${r.icon}</span>`;
 },
 buildPass(){
  const p=$('pass');
  p.innerHTML=`<div class="pg bp"><div class="pg-head"><h2>Battle Pass</h2><div id="bpBack"></div></div>
  <div class="bp-hero">
   <div class="bp-deco">${mush('#b46bff','#e9d9ff',54)}${mush('#8cff6a','#e6ffd2',38)}${mush('#ff9a3c','#ffe9c8',46)}</div>
   <div class="bp-title"><small>${SEASON.short} &middot; Free</small><b>${SEASON.name}</b></div>
   <div class="bp-lvl"><small>Level</small><b id="bpLvl">0</b></div>
   <div class="bp-xp"><div class="bp-xpt"><span id="bpXpT"></span><span id="bpXpN"></span></div><div class="bp-bar"><i id="bpBar"></i></div><small id="bpXpS"></small></div>
   <button class="btn play sm" id="bpClaimAll">Claim all</button>
  </div>
  <div class="bp-body"><div class="bp-prev" id="bpPrev"></div>
   <div class="bp-trackw"><button class="bp-arr l" id="bpL" aria-label="Scroll left">&#9664;</button><div class="bp-track" id="bpTrack"></div><button class="bp-arr r" id="bpR" aria-label="Scroll right">&#9654;</button></div></div>
  <div class="tip">XP comes from eliminations, time survived, the top 10 and wins. Swag Tokens are separate and still buy things in the Shop.</div></div>`;
  $('bpBack').appendChild(this.back());
  $('bpClaimAll').onclick=()=>{this.sfx('ui');this.claimAll()};
  $('bpL').onclick=()=>{this.sfx('click');$('bpTrack').scrollBy({left:-520,behavior:'smooth'})};
  $('bpR').onclick=()=>{this.sfx('click');$('bpTrack').scrollBy({left:520,behavior:'smooth'})};
  $('bpTrack').addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();e.currentTarget.scrollLeft+=e.deltaY}},{passive:false});
 },
 enter_pass(){
  const I=this.bpInfo(),next=REWARDS.find(r=>r.lvl>I.lvl);
  this.bpSel=this.claimable()[0]?this.claimable()[0].lvl:(next?next.lvl:BP_LEVELS);
  this.passRender(true);
 },
 passRender(center){
  const P=this.profile,I=this.bpInfo(),C=P.bp.claimed;
  $('bpLvl').textContent=I.lvl;
  $('bpBar').style.width=Math.round(I.pct*100)+'%';
  $('bpXpT').textContent=I.max?'Max level':'Level '+(I.lvl+1);
  $('bpXpN').textContent=I.max?'':I.into+' / '+I.need+' XP';
  $('bpXpS').textContent=I.max?'You have finished the Battle Pass':(I.need-I.into)+' XP to level '+(I.lvl+1)+' · '+I.xp+' / '+xpTotal(BP_LEVELS)+' XP in total';
  const n=this.claimable().length;const ca=$('bpClaimAll');ca.classList.toggle('dis',!n);ca.textContent=n?'Claim all ('+n+')':'Nothing to claim';
  const tr=$('bpTrack'),keep=tr.scrollLeft;tr.innerHTML='';
  for(const r of REWARDS){
   const reached=r.lvl<=I.lvl,claimed=C.includes(r.lvl);
   const st=claimed?'claimed':!reached?'locked':r.live?'ready':'soon';
   const c=h(`<div class="bp-card ${st}${r.big?' big':''}${r.lvl===this.bpSel?' sel':''}" data-l="${r.lvl}"><div class="bp-n">${r.lvl}</div><div class="bp-pic">${this.rewardPic(r)}</div><div class="bp-nm">${r.name}</div><div class="bp-st">${claimed?'Claimed':!reached?'Locked':r.live?'Ready':'Coming soon'}</div></div>`);
   c.onclick=()=>{this.sfx('click');this.bpSel=r.lvl;this.passRender()};
   tr.appendChild(c)}
  if(center){const sel=tr.querySelector('.sel');if(sel)tr.scrollLeft=Math.max(0,sel.offsetLeft-tr.clientWidth/2+sel.offsetWidth/2)}else tr.scrollLeft=keep;
  this.passPreview();
 },
 passPreview(){
  const P=this.profile,I=this.bpInfo(),r=REWARDS.find(x=>x.lvl===this.bpSel)||REWARDS[0];
  const reached=r.lvl<=I.lvl,claimed=P.bp.claimed.includes(r.lvl);
  const el=$('bpPrev');
  let act='';
  if(claimed&&r.type==='skin'){const on=P.skin[SKINS[r.skin].char]===r.skin;act=`<button class="btn sec sm" data-act="skin">${on?'Unequip':'Equip'}</button>`}
  else if(claimed&&r.type==='trail'){const on=P.trail===r.id;act=`<button class="btn sec sm" data-act="trail">${on?'Unequip':'Equip'}</button>`}
  else if(claimed&&FX_SLOT[r.id]){const on=(P.eq||{})[FX_SLOT[r.id]]===r.id;act=`<button class="btn sec sm" data-act="cos">${on?'Unequip':'Equip'}</button>`}
  else if(claimed&&r.type==='emote'){const on=P.equipEmote===r.id;act=`<button class="btn sec sm" data-act="emote">${on?'Unequip':'Equip'}</button>`}
  else if(claimed)act=`<div class="bp-note">Claimed</div>`;
  else if(!reached)act=`<div class="bp-note">Reach level ${r.lvl} · ${xpTotal(r.lvl)-I.xp} XP to go</div>`;
  else if(!r.live)act=`<div class="bp-note">Reached. It can be claimed once this reward is released.</div>`;
  else act=`<button class="btn play sm" data-act="claim">Claim</button>`;
  const who=r.type==='skin'?` for ${SKINS[r.skin].char==='jay'?'Jay':'Zach'}`:'';
  el.className='bp-prev'+(r.big?' big':'');
  el.innerHTML=`<div class="bp-stage">${this.rewardPic(r,true)}</div><div class="bp-info"><small>Level ${r.lvl} · ${TYPE_LABEL[r.type]}${who}</small><b>${r.name}</b><p>${r.desc}</p>${act}</div>`;
  const b=el.querySelector('[data-act]');
  if(b)b.onclick=()=>{
   const a=b.dataset.act;
   if(a==='claim'){if(this.claim(r.lvl)){this.sfx('chest');this.toast('Claimed '+r.name)}}
   else if(a==='skin'){const c=SKINS[r.skin].char;this.equipSkin(c,this.profile.skin[c]===r.skin?'':r.skin);this.sfx('ui');this.updateNav('pass')}
   else if(a==='trail'){this.equipTrail(this.profile.trail===r.id?'':r.id);this.sfx('ui')}
   else if(a==='cos'){const k=FX_SLOT[r.id];this.equipCos(k,(this.profile.eq||{})[k]===r.id?'':r.id);this.sfx('ui');this.updateNav('pass')}
   else if(a==='emote'){this.profile.equipEmote=this.profile.equipEmote===r.id?'':r.id;this.saveProfile();this.sfx('ui')}
   this.passRender()};
 },

 // ---------- the locker: skins under the character picker, battle pass trails with the colour trails
 skinPicker(){
  const P=this.profile,ch=P.char,wrap=document.createElement('div');
  const list=Object.values(SKINS).filter(s=>s.char===ch);
  if(!list.length)return wrap;
  wrap.appendChild(h(`<div class="k lk-sub">Skins</div>`));
  const box=h(`<div class="tiles"></div>`);
  box.appendChild(this.mkTile({rc:'#9aa6c8',pic:`<img src="${IMG[ch].front}" alt="">`,label:'Default',sel:!P.skin[ch],fn:()=>{this.equipSkin(ch,'');this.enter_locker()}}));
  for(const s of list){
   const owned=P.ownedSkins.includes(s.id);
   const t=this.mkTile({rc:'#8cff6a',pic:`<img src="${IMG[s.id].front}" alt="">`,label:s.name+(owned?'':' &#128274;'),sel:P.skin[ch]===s.id,fn:()=>{
    if(!owned){this.toast('Unlock it in the Battle Pass (level '+s.lvl+')');this.sfx('empty');return}
    this.equipSkin(ch,s.id);this.enter_locker()}});
   if(!owned)t.classList.add('locked');
   box.appendChild(t)}
  wrap.appendChild(box);return wrap;
 },
 trailTiles(box){
  const P=this.profile;
  for(const t of Object.values(TRAILS)){
   const owned=P.ownedTrails.includes(t.id);
   const tile=this.mkTile({rc:'#8cff6a',pic:`<span class="bp-trl sm" style="--c1:${t.c1};--c2:${t.c2}"><i></i><i></i><i></i><i></i></span>`,label:t.name+(owned?'':' &#128274;'),sel:P.trail===t.id,fn:()=>{
    if(!owned){this.toast('Unlock it in the Battle Pass (level '+t.lvl+')');this.sfx('empty');return}
    this.equipTrail(t.id);this.enter_locker()}});
   if(!owned)tile.classList.add('locked');
   box.appendChild(tile)}
 },

 // ---------- first-join summary
 maybeSeasonSummary(){if((this.profile.s2seen|0)<SEASON.id)this.showSeasonSummary()},
 showSeasonSummary(){
  if($('s2sum'))return;
  const P=this.profile;P.s2seen=SEASON.id;this.saveProfile();
  const rows=SLIDES.map(s=>`<li class="${s.live?'live':'soon'}"><span class="s2-ic">${s.icon}</span><div><b>${s.title}</b><small>${s.text}</small></div><i>${s.live?'NEW':'COMING SOON'}</i></li>`).join('');
  const ov=h(`<div class="s2-ov" id="s2sum"><div class="s2-card" role="dialog" aria-label="Season 2 summary">
   <div class="s2-top"><div class="s2-deco">${mush('#b46bff','#e9d9ff',64)}${mush('#8cff6a','#e6ffd2',44)}${mush('#ff9a3c','#ffe9c8',54)}</div><small>Welcome to</small><h2>${SEASON.short}: ${SEASON.name}</h2></div>
   <p class="s2-p">A strange fungus has started spreading across the island. Here is what is new:</p>
   <div class="s2-shots"><img src="${imgPass}" alt="The Battle Pass"><img src="${imgSkins}" alt="A fungus skin in the lobby"><img src="${imgCorrupt}" alt="Old Keep, overgrown by the fungus"></div>
   <ul class="s2-list">${rows}</ul>
   <div class="s2-btns"><button class="btn sec sm" id="s2Go">See the Battle Pass</button><button class="btn play sm" id="s2Ok">Continue</button></div></div></div>`);
  $('ui').appendChild(ov);
  const close=go=>{ov.remove();this.sfx('ui');if(go)this.go('pass')};
  $('s2Ok').onclick=()=>close(false);$('s2Go').onclick=()=>close(true);
  ov.addEventListener('click',e=>{if(e.target===ov)close(false)});
 },

 // ---------- the lobby banner: cycles through what is new this season
 initBanner(){
  const box=$('s2Banner');if(!box)return;
  box.innerHTML=SLIDES.map((s,i)=>`<div class="s2-sl${i?'':' on'} ${s.live?'live':'soon'}" data-i="${i}">
    <div class="s2-img"${SLIDE_IMG[s.id]?` style="background-image:url('${SLIDE_IMG[s.id]}')"`:''}>${SLIDE_IMG[s.id]?'':`<span>${s.icon}</span>`}</div>
    <div class="s2-tx"><i>${s.live?'NEW':'COMING SOON'}</i><b>${s.title}</b><small>${s.text}</small></div></div>`).join('')+
   `<div class="s2-dots">${SLIDES.map((s,i)=>`<button data-i="${i}" aria-label="${s.title}"${i?'':' class="on"'}></button>`).join('')}</div><div class="s2-prog"><i></i></div>`;
  let cur=0,hover=false,t0=performance.now();const MS=5500;
  const show=i=>{cur=(i+SLIDES.length)%SLIDES.length;t0=performance.now();
   box.querySelectorAll('.s2-sl').forEach((e,k)=>e.classList.toggle('on',k===cur));
   box.querySelectorAll('.s2-dots button').forEach((e,k)=>e.classList.toggle('on',k===cur))};
  box.querySelectorAll('.s2-dots button').forEach(b=>b.onclick=e=>{e.stopPropagation();this.sfx('click');show(+b.dataset.i)});
  box.onclick=()=>{const s=SLIDES[cur];this.sfx('ui');if(s.live&&s.go)this.go(s.go);else this.showSeasonSummary(true)};
  box.onmouseenter=()=>{hover=true};box.onmouseleave=()=>{hover=false;t0=performance.now()};
  const bar=box.querySelector('.s2-prog i');
  this.bannerTimer=setInterval(()=>{
   if(this.screen!=='title'||this.playing)return;
   if(hover){t0=performance.now();bar.style.width='0%';return}
   const k=(performance.now()-t0)/MS;bar.style.width=Math.min(100,k*100)+'%';
   if(k>=1)show(cur+1)},100);
  this.bannerShow=show;
 }
};
