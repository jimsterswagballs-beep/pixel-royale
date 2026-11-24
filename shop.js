// Item Shop (characters, emotes, cosmetics), Swag Token balance, and the locker's emote picker.
// v39: the shop sells nameplates, gliders, backpacks, hats, landing and elimination effects and sprint trails (see shopcos.js),
// has a daily Featured row at 20% off, and a filter bar so each kind can be found fast.
import {CHARS,RARITY,keyLabel} from './data.js';
import {IMG} from './shared.js';
import {charArt} from './icons.js';
import {EMOTE_LIST,EMOTE_BY,CHAR_PRICES,TOKENS} from './emote.js';
import {SHOP_BY,SHOP_COS,SHOP_SECTIONS,featuredIds,priceOf,featuredResetIn,FEATURED_OFF,npStyle,npChip} from './shopcos.js';

const $=id=>document.getElementById(id);
const h=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
const VICTORY_POSES=[['Flip-Flop','&#128378;'],['Victory Hop','&#127942;'],['Spin Cycle','&#127744;']];
const FILTERS=[['all','All'],['feat','Featured'],['chars','Characters'],['emotes','Emotes'],...SHOP_SECTIONS.map(x=>[x.key,x.title])];
const fmtLeft=sec=>{const hh=Math.floor(sec/3600),mm=Math.floor(sec%3600/60);return hh?hh+'h '+mm+'m':mm+'m'};

export const shopMethods={
 owns(kind,id){const P=this.profile;
  if(kind==='char')return !CHAR_PRICES[id]||P.ownedChars.includes(id);
  if(kind==='cos')return (P.ownedCos||[]).includes(id);
  return P.ownedEmotes.includes(id)},
 addTokens(n,why){
  const P=this.profile;P.tokens=(P.tokens||0)+n;this.lastReward={total:n,why:why||''};this.saveProfile();this.updateNav(this.screen);
  setTimeout(()=>this.toast('+'+n+' Swag Tokens'+(why?' · '+why:'')),1400)},
 buy(kind,id){
  const price=kind==='char'?CHAR_PRICES[id]:kind==='cos'?priceOf(id):(EMOTE_BY[id]||{}).price;const P=this.profile;
  if(!price||this.owns(kind,id))return;
  if(kind==='cos'&&!SHOP_BY[id])return;
  if((P.tokens||0)<price){this.toast('Not enough Swag Tokens ('+(price-(P.tokens||0))+' short)');this.sfx('empty');return}
  P.tokens-=price;
  if(kind==='cos')(P.ownedCos||(P.ownedCos=[])).push(id);else(kind==='char'?P.ownedChars:P.ownedEmotes).push(id);
  this.saveProfile();this.sfx('chest');this.toast(kind==='cos'?'Unlocked '+SHOP_BY[id].name+'! Equip it here or in the Locker':'Unlocked!');this.enter_shop();this.updateNav(this.screen)},
 // is a shop cosmetic the one currently worn?
 shopEquipped(id){const c=SHOP_BY[id];if(!c)return false;return c.slot==='tr'?this.profile.trail===id:(this.profile.eq||{})[c.slot]===id},
 equipShop(id){
  const c=SHOP_BY[id];if(!c||!this.owns('cos',id))return;
  const on=this.shopEquipped(id);
  if(c.slot==='tr')this.equipTrail(on?'':id);else this.equipCos(c.slot,on?'':id);
  this.sfx('ui');this.enter_shop();this.updateNav(this.screen)},
 // the picture on a shop card for a cosmetic
 shopPic(c){
  if(npStyle(c.id))return `<span class="sh-np">${npChip(c.id,this.profile.name||'Player')}</span>`;
  if(c.slot==='tr')return `<span class="bp-trl" style="--c1:${c.c1};--c2:${c.c2}"><i></i><i></i><i></i><i></i></span>`;
  return `<span class="sh-ico">${c.icon}</span>`},
 shopCard(id,featured){
  const c=SHOP_BY[id],owned=this.owns('cos',id),rar=RARITY[Math.min(5,c.rar)],price=priceOf(id),on=this.shopEquipped(id);
  let act;
  if(owned)act=`<button class="btn ${on?'sec':'play'} sm sh-eq${on?' on':''}" data-equip="${id}">${on?'Equipped &#10003;':'Equip'}</button>`;
  else act=`<button class="btn play sm" data-buy="cos:${id}">${price<c.price?`<s>&#9670; ${c.price}</s> `:''}&#9670; ${price}</button>`;
  return `<div class="sh-card cos${owned?' owned':''}" style="--rc:${rar.c}">
   <div class="sh-pic cos-pic">${featured&&!owned?`<i class="sh-off">-${Math.round(FEATURED_OFF*100)}%</i>`:''}${this.shopPic(c)}</div>
   <div class="sh-info"><b>${c.name}</b><em class="sh-rar" style="color:${rar.c}">${rar.n}</em><small>${c.desc}</small></div>${act}</div>`},
 buildShop(){
  const p=$('shop');
  const secs=SHOP_SECTIONS.map(x=>`<div class="sh-sec" data-sec="${x.key}"><div class="sh-sech"><div class="k">${x.title}</div><span class="sh-sub">${x.sub}</span><span class="lk-count" data-cnt="${x.key}"></span></div><div class="sh-grid" id="shS_${x.key}"></div></div>`).join('');
  p.innerHTML=`<div class="pg"><div class="pg-head"><h2>Item Shop</h2><div id="shBack"></div></div>
  <div class="sh-top"><div class="sh-bal"><span class="sh-coin">&#9670;</span><div><small>Swag Tokens</small><b id="shBal">0</b></div></div>
   <p class="sh-how">Earn tokens from eliminations, surviving longer, placing in the top 10 and winning.</p></div>
  <div class="sh-filters" id="shFilters">${FILTERS.map(([k,l])=>`<button type="button" class="sh-f" data-filter="${k}">${l}</button>`).join('')}</div>
  <div class="sh-sec feat" data-sec="feat"><div class="sh-sech"><div class="k">Featured</div><span class="sh-sub">Today only: ${Math.round(FEATURED_OFF*100)}% off</span><span class="sh-timer" id="shTimer"></span></div><div class="sh-grid" id="shFeat"></div></div>
  <div class="sh-sec" data-sec="chars"><div class="sh-sech"><div class="k">Characters</div></div><div class="sh-grid" id="shChars"></div></div>
  <div class="sh-sec" data-sec="emotes"><div class="sh-sech"><div class="k">Emotes</div></div><div class="sh-grid" id="shEmotes"></div></div>
  ${secs}
  <div class="sh-sec" data-sec="skins"><div class="sh-sech"><div class="k">Skins</div></div><div class="sh-empty">None at the moment. Fungus skins come from the Battle Pass.</div></div>
  <div class="tip">Emotes are played with ${keyLabel(this.input.binds.emote)} (change it in Settings). Everything you buy can be equipped here or in the Locker.</div></div>`;
  $('shBack').appendChild(this.back());
  p.addEventListener('click',e=>{
   const f=e.target.closest('[data-filter]');if(f){this.shopFilter=f.dataset.filter;this.sfx('ui');this.applyShopFilter();return}
   const q=e.target.closest('[data-equip]');if(q){this.equipShop(q.dataset.equip);return}
   const b=e.target.closest('[data-buy]');if(!b)return;const[k,id]=b.dataset.buy.split(':');this.buy(k,id)});
 },
 applyShopFilter(){
  const f=this.shopFilter||'all';
  for(const b of $('shFilters').children)b.classList.toggle('on',b.dataset.filter===f);
  for(const el of $('shop').querySelectorAll('.sh-sec'))el.style.display=(f==='all'||el.dataset.sec===f)?'':'none'},
 enter_shop(){
  const P=this.profile;
  $('shBal').textContent=P.tokens||0;
  // coming from a locker "Item Shop" button: open on that kind of item
  if(this.shopFocus){this.shopFilter=this.shopFocus;this.shopFocus=null}
  // Featured: the same 4 items for everyone today
  $('shFeat').innerHTML=featuredIds().map(id=>this.shopCard(id,true)).join('');
  $('shTimer').textContent='New items in '+fmtLeft(featuredResetIn());
  // characters and emotes, as before
  $('shChars').innerHTML=Object.keys(CHAR_PRICES).map(id=>{
   const c=CHARS.find(x=>x.id===id),owned=this.owns('char',id);
   return `<div class="sh-card${owned?' owned':''}"><div class="sh-pic" style="background-image:url('${charArt(id)}')"><img src="${IMG[id].front}" alt=""></div>
    <div class="sh-info"><b>${c.name}</b><small>${c.role}</small></div>
    ${owned?'<div class="sh-own">Owned</div>':`<button class="btn play sm" data-buy="char:${id}">&#9670; ${CHAR_PRICES[id]}</button>`}</div>`}).join('');
  $('shEmotes').innerHTML=EMOTE_LIST.filter(d=>!d.bp).map(d=>{
   const owned=this.owns('emote',d.id);
   const pic=d.img?`<img src="${d.img}" alt="">`:`<span class="sh-ico">${d.icon}</span>`;
   return `<div class="sh-card${owned?' owned':''}"><div class="sh-pic emo-pic">${pic}</div>
    <div class="sh-info"><b>${d.name}</b><small>${d.desc}</small></div>
    ${owned?'<div class="sh-own">Owned</div>':`<button class="btn play sm" data-buy="emote:${d.id}">&#9670; ${d.price}</button>`}</div>`}).join('');
  // cosmetics: what you can still buy first (cheapest first), then what you own
  for(const x of SHOP_SECTIONS){
   const all=SHOP_COS.filter(c=>c.slot===x.key),have=all.filter(c=>this.owns('cos',c.id)),todo=all.filter(c=>!this.owns('cos',c.id)).sort((a,b)=>priceOf(a.id)-priceOf(b.id));
   const feat=new Set(featuredIds());
   $('shS_'+x.key).innerHTML=[...todo,...have].map(c=>this.shopCard(c.id,feat.has(c.id))).join('');
   const cnt=$('shop').querySelector(`[data-cnt="${x.key}"]`);if(cnt)cnt.textContent=have.length+' / '+all.length+' owned'}
  this.applyShopFilter();
 },
 // locker > Emote: the equipped emote (played with the emote key) plus the free victory-screen poses
 emotePicker(){
  const P=this.profile,wrap=document.createElement('div');
  wrap.appendChild(h(`<div class="k lk-sub">Emote · press ${keyLabel(this.input.binds.emote)} to play, press again to cancel</div>`));
  const box=h(`<div class="tiles"></div>`);
  const rc=i=>RARITY[Math.min(5,i+1)].c;
  EMOTE_LIST.forEach((d,i)=>{
   const owned=this.owns('emote',d.id);
   const pic=d.img?`<img src="${d.img}" alt="" style="height:88%;image-rendering:auto">`:`<span class="emo">${d.icon}</span>`;
   box.appendChild(this.mkTile({rc:rc(i),pic,label:d.name+(owned?'':' &#128274;'),sel:P.equipEmote===d.id,fn:()=>{
    if(!owned){this.toast(d.bp?'Unlock it in the Battle Pass (level '+d.lvl+')':'Unlock it in the Shop first');this.sfx('empty');return}
    P.equipEmote=d.id;this.saveProfile();this.enter_locker()}}));
  });
  wrap.appendChild(box);
  wrap.appendChild(h(`<div class="k lk-sub" style="margin-top:22px">Victory pose · shown on the win screen</div>`));
  const pose=h(`<div class="tiles small"></div>`);
  VICTORY_POSES.forEach(([name,ic],i)=>pose.appendChild(this.mkTile({rc:rc(i+2),pic:`<span class="emo">${ic}</span>`,label:name,sel:P.emote===i,fn:()=>{P.emote=i;this.saveProfile();this.enter_locker()}})));
  wrap.appendChild(pose);
  return wrap;
 }
};
