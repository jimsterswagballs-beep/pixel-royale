// Item Shop (characters, emotes, skins), Swag Token balance, and the locker's emote picker.
import {CHARS,RARITY,keyLabel} from './data.js';
import {IMG} from './shared.js';
import {charArt} from './icons.js';
import {EMOTE_LIST,EMOTE_BY,CHAR_PRICES,TOKENS} from './emote.js';
import {SHOP_ITEMS} from './cosmetics.js';
import {TRAILS} from './season2.js';
import {pvSpan} from './previews.js';

const $=id=>document.getElementById(id);
const h=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
// shop sections, in order: [title, filter chip, kind]. kind 'char', 'emote', 'trail' or a cosmetic slot key (see cosmetics.js)
const SECTIONS=[['Characters','Characters','char'],['Emotes','Emotes','emote'],['Gliders','Gliders','gl'],['Nameplates','Nameplates','fr'],['Hats','Hats','ht'],['Backpacks','Backpacks','pk'],['Sprint Trails','Trails','trail'],['Landing Effects','Landing','ld'],['Elimination Effects','Eliminations','el'],['Weapon Finishes','Weapons','wa']];
const VICTORY_POSES=[['Flip-Flop','&#128378;'],['Victory Hop','&#127942;'],['Spin Cycle','&#127744;']];

export const shopMethods={
 owns(kind,id){const P=this.profile;
  if(kind==='char')return !CHAR_PRICES[id]||P.ownedChars.includes(id);
  return P.ownedEmotes.includes(id)},
 addTokens(n,why){
  const P=this.profile;P.tokens=(P.tokens||0)+n;this.lastReward={total:n,why:why||''};this.saveProfile();this.updateNav(this.screen);
  setTimeout(()=>this.toast('+'+n+' Swag Tokens'+(why?' · '+why:'')),1400)},
 buy(kind,id){
  if(kind==='cos')return this.buyCos(id);if(kind==='trail')return this.buyTrail(id);
  const price=kind==='char'?CHAR_PRICES[id]:(EMOTE_BY[id]||{}).price;const P=this.profile;
  if(!price||this.owns(kind,id))return;
  if((P.tokens||0)<price){this.toast('Not enough Swag Tokens ('+(price-(P.tokens||0))+' short)');this.sfx('empty');return}
  P.tokens-=price;(kind==='char'?P.ownedChars:P.ownedEmotes).push(id);
  this.saveProfile();this.sfx('ui');this.toast('Unlocked!');this.enter_shop();this.updateNav(this.screen)},
 buildShop(){
  const p=$('shop');
  p.innerHTML=`<div class="pg"><div class="pg-head"><h2>Item Shop</h2><div id="shBack"></div></div>
  <div class="sh-top"><div class="sh-bal"><span class="sh-coin">&#9670;</span><div><small>Swag Tokens</small><b id="shBal">0</b></div></div>
   <p class="sh-how">Earn tokens from eliminations, surviving longer, placing in the top 10 and winning. Everything here changes looks only, never abilities or stats.</p></div>
  <div class="sh-chips" id="shChips"></div><div id="shSecs"></div>
  <div class="tip">Emotes are played with ${keyLabel(this.input.binds.emote)} (change it in Settings). Equip what you buy in the Locker.</div></div>`;
  $('shBack').appendChild(this.back());
  const chips=$('shChips');this.shopFilter=this.shopFilter||'All';
  for(const c of ['All',...SECTIONS.map(x=>x[1])]){const b=h(`<button class="chip">${c}</button>`);b.onclick=()=>{this.shopFilter=c;this.sfx('ui');this.enter_shop()};chips.appendChild(b)}
  p.addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(!b)return;const[k,id]=b.dataset.buy.split(':');this.buy(k,id)});
 },
 // one shop card: a preview, the name and what it is, then a price button or "Owned"
 shopCard(o){
  return `<div class="sh-card${o.owned?' owned':''}" data-item="${o.key}"><div class="sh-pic ${o.picCls||''}">${o.pic}</div>
   <div class="sh-info"><b>${o.name}</b><small>${o.desc||''}</small></div>
   ${o.owned?'<div class="sh-own">Owned</div>':`<button class="btn play sm" data-buy="${o.key}">&#9670; ${o.price}</button>`}</div>`},
 enter_shop(){
  const P=this.profile;$('shBal').textContent=P.tokens||0;
  for(const b of $('shChips').children)b.classList.toggle('sel',b.textContent===this.shopFilter);
  const html=[];
  for(const[title,chip,kind]of SECTIONS){
   if(this.shopFilter!=='All'&&this.shopFilter!==chip)continue;
   let cards=[];
   if(kind==='char')cards=Object.keys(CHAR_PRICES).map(id=>{const c=CHARS.find(x=>x.id===id),owned=this.owns('char',id);
    return this.shopCard({key:'char:'+id,owned,price:CHAR_PRICES[id],name:c.name,desc:c.role,picCls:'char',pic:`<div class="cart" style="background-image:url('${charArt(id)}')"></div><img src="${IMG[id].front}" alt="">`})});
   else if(kind==='emote')cards=EMOTE_LIST.filter(d=>!d.bp).map(d=>this.shopCard({key:'emote:'+d.id,owned:this.owns('emote',d.id),price:d.price,name:d.name,desc:d.desc,picCls:'emo-pic',pic:pvSpan('emote:'+d.id)}));
   else if(kind==='trail')cards=Object.values(TRAILS).filter(t=>t.price).map(t=>this.shopCard({key:'trail:'+t.id,owned:P.ownedTrails.includes(t.id),price:t.price,name:t.name,desc:t.desc,pic:pvSpan('trail:'+t.id)}));
   else cards=Object.entries(SHOP_ITEMS).filter(([,d])=>d.slot===kind).map(([id,d])=>this.shopCard({key:'cos:'+id,owned:this.cosOwned(id),price:d.price,name:d.name,desc:d.desc,pic:pvSpan('cos:'+id)}));
   const own=cards.filter(c=>c.includes('class="sh-card owned"')).length;
   html.push(`<div class="sh-sec"><div class="k">${title}<span class="cnt">${own}/${cards.length} owned</span></div><div class="sh-grid">${cards.join('')}</div></div>`)}
  $('shSecs').innerHTML=html.join('');
  this.pvMount($('shSecs'),150);
  if(this.shopFocus){const f=this.shopFocus;this.shopFocus=null;const el=$('shSecs').querySelector(`[data-item="${f}"]`);if(el){el.classList.add('focus');setTimeout(()=>el.scrollIntoView({block:'center',behavior:'smooth'}),60)}}
 },
 // locker > Emote: the equipped emote (played with the emote key) plus the free victory-screen poses
 emotePicker(){
  const P=this.profile,wrap=document.createElement('div');
  wrap.appendChild(h(`<div class="k lk-sub">Emote · press ${keyLabel(this.input.binds.emote)} to play, press again to cancel</div>`));
  const box=h(`<div class="tiles"></div>`);
  const rc=i=>RARITY[Math.min(5,i+1)].c;
  EMOTE_LIST.forEach((d,i)=>{
   const owned=this.owns('emote',d.id);
   box.appendChild(this.mkTile({rc:rc(i),pic:pvSpan('emote:'+d.id),label:d.name+(owned?'':`<small class="tl">&#128274; ${d.bp?'Lv '+d.lvl:'&#9670; '+d.price}</small>`),sel:P.equipEmote===d.id,fn:()=>{
    if(!owned){if(d.bp){this.toast('Unlock it in the Battle Pass (level '+d.lvl+')');this.sfx('empty')}else{this.shopFocus='emote:'+d.id;this.go('shop')}return}
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
