// Locker and cosmetics screens (v39). The Locker is split into seven tabs; every item has a real preview (previews.js),
// and an item that is not owned yet shows how to get it (a Battle Pass level or a price) and opens the Item Shop when clicked.
import {RARITY,keyLabel} from './data.js';
import {IMG,artKey} from './shared.js';
import {TRAILS} from './season2.js';
import {EMOTE_LIST} from './emote.js';
import {FX_SLOT,SHOP_ITEMS,REWARD_BY_ID,cosInfo} from './cosmetics.js';
import {pvSpan,mountPreviews,setPreviewChar} from './previews.js';

const h=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
export const LOCKER_TABS=['Outfit','Emotes','Gliders','Wearables','Name','Effects','Weapons'];
const COLORS_NAMES=['White','Gold','Sky','Pink','Mint','Orange','Violet','Red'];
const idsOf=slot=>Object.keys(FX_SLOT).filter(id=>FX_SLOT[id]===slot).sort((a,b)=>{const A=cosInfo(a),B=cosInfo(b);return (A.src===B.src?(A.lvl||A.price||0)-(B.lvl||B.price||0):A.src==='bp'?-1:1)});
const how=i=>i.src==='bp'?`Battle Pass level ${i.lvl}`:`${i.price} tokens`;
const lockLine=i=>`<small class="tl">&#128274; ${i.src==='bp'?'Lv '+i.lvl:'&#9670; '+i.price}</small>`;

export const lockerMethods={
 // ---- ownership and equipping
 cosOwned(id){const r=REWARD_BY_ID[id];if(r)return this.profile.bp.claimed.includes(r.lvl);return !!SHOP_ITEMS[id]&&(this.profile.ownedCos||[]).includes(id)},
 equipCos(slot,id){
  const P=this.profile;P.eq=P.eq||{};
  if(id&&(FX_SLOT[id]!==slot||!this.cosOwned(id)))return;
  if(id)P.eq[slot]=id;else delete P.eq[slot];this.saveProfile()},
 buyCos(id){
  const P=this.profile,d=SHOP_ITEMS[id];if(!d||this.cosOwned(id))return;
  if((P.tokens||0)<d.price){this.toast('Not enough Swag Tokens ('+(d.price-(P.tokens||0))+' short)');this.sfx('empty');return}
  P.tokens-=d.price;(P.ownedCos=P.ownedCos||[]).push(id);this.saveProfile();this.sfx('chest');this.toast(d.name+' unlocked. Equip it in the Locker.');this.enter_shop();this.updateNav(this.screen)},
 buyTrail(id){
  const P=this.profile,d=TRAILS[id];if(!d||!d.price||P.ownedTrails.includes(id))return;
  if((P.tokens||0)<d.price){this.toast('Not enough Swag Tokens ('+(d.price-(P.tokens||0))+' short)');this.sfx('empty');return}
  P.tokens-=d.price;P.ownedTrails.push(id);this.saveProfile();this.sfx('chest');this.toast(d.name+' unlocked. Equip it in the Locker.');this.enter_shop();this.updateNav(this.screen)},
 // show previews inside `root` with the player's own character
 pvMount(root,size){const P=this.profile;setPreviewChar(IMG[artKey(P.char,this.cos)].front,P.name,P.nameColor);mountPreviews(root,size)},
 // a locked item sends you to the shop (or says which level unlocks it)
 lockedHint(id,kind='cos'){
  const i=kind==='trail'?{src:TRAILS[id].price?'shop':'bp',lvl:TRAILS[id].lvl,price:TRAILS[id].price,name:TRAILS[id].name}:cosInfo(id);this.sfx('empty');
  if(i.src==='shop'){this.shopFocus=(kind==='trail'?'trail:':'cos:')+id;this.toast('Opening the Item Shop: '+i.name+' costs '+i.price+' tokens');this.go('shop')}
  else this.toast('Unlock '+i.name+' in the Battle Pass (level '+i.lvl+')')},

 // ---- one titled row of tiles. `slot` picks the equip slot, `ids` the items; a "None" tile takes it off.
 cosSection(title,slot,ids,noneLabel='None'){
  const P=this.profile,wrap=document.createElement('div');
  const owned=ids.filter(id=>this.cosOwned(id)).length;
  wrap.appendChild(h(`<div class="k lk-sub lk-sec">${title}<span class="cnt">${owned}/${ids.length} owned</span></div>`));
  const box=h(`<div class="tiles"></div>`);
  box.appendChild(this.mkTile({rc:'#9aa6c8',pic:`<span class="swb none">&#8709;</span>`,label:noneLabel,sel:!(P.eq||{})[slot],fn:()=>{this.equipCos(slot,'');this.enter_locker()}}));
  for(const id of ids){
   const i=cosInfo(id),own=this.cosOwned(id);
   const t=this.mkTile({rc:i.src==='bp'?'#8cff6a':'#ffd23d',pic:pvSpan('cos:'+id),label:i.name+(own?'':lockLine(i)),sel:(P.eq||{})[slot]===id,fn:()=>{
    if(!own){this.lockedHint(id);return}
    this.equipCos(slot,(P.eq||{})[slot]===id?'':id);this.enter_locker()}});
   t.title=i.desc+' ('+(own?'owned':how(i))+')';if(!own)t.classList.add('locked');
   box.appendChild(t)}
  wrap.appendChild(box);return wrap},
 trailSection(){
  const P=this.profile,wrap=document.createElement('div'),list=Object.values(TRAILS).sort((a,b)=>(a.price?1:0)-(b.price?1:0)||(a.lvl||a.price)-(b.lvl||b.price));
  const nfree=Math.max(0,(this.lockerColors||[]).length-1),owned=list.filter(t=>P.ownedTrails.includes(t.id)).length+nfree;
  wrap.appendChild(h(`<div class="k lk-sub lk-sec">Sprint trail<span class="cnt">${owned}/${list.length+nfree} owned</span></div>`));
  const box=h(`<div class="tiles"></div>`);
  const set=v=>{P.trail=v;this.saveProfile();this.enter_locker()};
  box.appendChild(this.mkTile({rc:'#9aa6c8',pic:`<span class="swb none">&#8709;</span>`,label:'None',sel:!P.trail,fn:()=>set('')}));
  (this.lockerColors||[]).slice(1).forEach((c,i)=>box.appendChild(this.mkTile({rc:RARITY[Math.min(5,(i+1)%6)].c,pic:pvSpan('ctrail:'+c),label:COLORS_NAMES[i+1],sel:P.trail===c,fn:()=>set(c)})));
  for(const t of list){const own=P.ownedTrails.includes(t.id);
   const tile=this.mkTile({rc:t.price?'#ffd23d':'#8cff6a',pic:pvSpan('trail:'+t.id),label:t.name+(own?'':lockLine({src:t.price?'shop':'bp',lvl:t.lvl,price:t.price})),sel:P.trail===t.id,fn:()=>{if(!own){this.lockedHint(t.id,'trail');return}set(P.trail===t.id?'':t.id)}});
   tile.title=(t.desc||'')+(own?'':' ('+(t.price?t.price+' tokens':'Battle Pass level '+t.lvl)+')');if(!own)tile.classList.add('locked');box.appendChild(tile)}
  wrap.appendChild(box);return wrap},
 // every tab of the Locker (Outfit keeps the character and skin pickers from main.js and pass.js)
 lockerContent(tab,COLORS){
  const P=this.profile,g=document.createElement('div');this.lockerColors=COLORS;
  const add=e=>g.appendChild(e);
  if(tab==='Outfit'){add(this.charPicker(()=>P.char,id=>{P.char=id;this.saveProfile();this.enter_locker()}));add(this.skinPicker())}
  else if(tab==='Emotes')add(this.emotePicker());
  else if(tab==='Gliders')add(this.cosSection('Glider','gl',idsOf('gl'),'Default'));
  else if(tab==='Wearables'){add(this.cosSection('Hat','ht',idsOf('ht')));add(this.cosSection('Backpack','pk',idsOf('pk')))}
  else if(tab==='Name'){
   const sw=h(`<div class="tiles"></div>`);
   COLORS.forEach((c,i)=>sw.appendChild(this.mkTile({rc:RARITY[Math.min(5,i%6)].c,pic:`<span class="swb" style="background:${c}"></span>`,label:COLORS_NAMES[i],sel:P.nameColor===c,fn:()=>{P.nameColor=c;this.saveProfile();this.enter_locker()}})));
   add(h(`<div class="k lk-sub lk-sec">Name colour</div>`));add(sw);add(this.cosSection('Nameplate','fr',idsOf('fr')))}
  else if(tab==='Effects'){add(this.trailSection());add(this.cosSection('Landing effect','ld',idsOf('ld')));add(this.cosSection('Elimination effect','el',idsOf('el')))}
  else if(tab==='Weapons'){
   add(this.cosSection('Finish for every weapon','wa',idsOf('wa')));add(this.cosSection('Fungal Blaster finish','wb',idsOf('wb')));add(this.cosSection('Root Shooter finish','wr',idsOf('wr')))}
  g.appendChild(h(`<div class="tip" style="margin-top:14px">Everything here changes looks only, never abilities or stats. Hover an item for its description.</div>`));
  return g}
};
