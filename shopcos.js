// v39: Item Shop cosmetics. Everything here is bought with Swag Tokens and is looks only (never stats, hit boxes or abilities).
// No imports on purpose, like season2.js: cosmetics.js, shop.js, pass.js and the locker all read from here.
//
// slot: the key the item travels under in `cos.fx` (fr nameplate, ht hat, pk backpack, gl glider, ld landing, el elimination)
//       or 'tr' for a sprint trail (stored in profile.trail with an `sh:` id, like Battle Pass trails use `bp:`).
// rar:  index into RARITY (data.js): 1 Uncommon, 2 Rare, 3 Epic, 4 Legendary
export const SHOP_COS=[
 // ---- nameplates
 {id:'np_pixel',slot:'fr',name:'Pixel Block',price:300,rar:1,icon:'\u{1F9F1}',desc:'A chunky stone-brick plate behind your name.'},
 {id:'np_neon',slot:'fr',name:'Neon Sign',price:400,rar:2,icon:'\u{1F4A1}',desc:'A glowing cyan and magenta sign.'},
 {id:'np_toxic',slot:'fr',name:'Toxic Waste',price:400,rar:2,icon:'\u2622\uFE0F',desc:'Bubbling green slime.'},
 {id:'np_ember',slot:'fr',name:'Ember Plate',price:500,rar:2,icon:'\u{1F525}',desc:'A hot plate with glowing embers.'},
 {id:'np_frost',slot:'fr',name:'Frostbite',price:500,rar:2,icon:'\u2744\uFE0F',desc:'Icy blue with frozen studs.'},
 {id:'np_gold',slot:'fr',name:'Gold Leaf',price:800,rar:3,icon:'\u{1F947}',desc:'A shiny gold plate with a white shine.'},
 {id:'np_royal',slot:'fr',name:'Royal Crest',price:1000,rar:4,icon:'\u{1F451}',desc:'Deep purple and gold. Fit for a champion.'},
 // ---- gliders
 {id:'gl_paper',slot:'gl',name:'Paper Plane',price:500,rar:1,icon:'\u2708\uFE0F',desc:'A folded paper plane. Simple. Classic.',part:['#ffffff','#cfe3ff']},
 {id:'gl_pixel',slot:'gl',name:'Pixel Wing',price:600,rar:2,icon:'\u{1F7E6}',desc:'A blocky retro wing in rainbow stripes.',part:['#ff5a5a','#ffd84a','#5aff8a','#5ab8ff']},
 {id:'gl_neon',slot:'gl',name:'Neon Wing',price:800,rar:3,icon:'\u{1F308}',desc:'A dark wing with glowing neon edges.',part:['#33f0ff','#ff4ad8']},
 {id:'gl_flame',slot:'gl',name:'Flame Glider',price:900,rar:3,icon:'\u{1F525}',desc:'Layers of flame. Sheds embers as you glide.',part:['#ff8a3a','#ffd060','#ff5a2a']},
 {id:'gl_frost',slot:'gl',name:'Frostwing',price:900,rar:3,icon:'\u{1F9CA}',desc:'A pale icy canopy with crystal spikes.',part:['#dff4ff','#9ad0ff']},
 {id:'gl_gold',slot:'gl',name:'Golden Parachute',price:1200,rar:4,icon:'\u{1F31F}',desc:'Solid gold, white stripes, golden sparkles.',part:['#ffd84a','#fff2b0']},
 // ---- backpacks
 {id:'pk_bear',slot:'pk',name:'Teddy Pack',price:400,rar:1,icon:'\u{1F9F8}',desc:'A soft little bear on your back.'},
 {id:'pk_cell',slot:'pk',name:'Power Cell',price:500,rar:2,icon:'\u{1F50B}',desc:'A glowing battery. Crackles with sparks.',part:['#7fff6a','#e0ff8a']},
 {id:'pk_chest',slot:'pk',name:'Treasure Chest',price:800,rar:3,icon:'\u{1F4B0}',desc:'A little gold-trimmed chest.'},
 {id:'pk_jet',slot:'pk',name:'Jet Pack',price:700,rar:3,icon:'\u{1F680}',desc:'Twin boosters with a flickering flame.',part:['#ffb050','#ff6a2a']},
 {id:'pk_wings',slot:'pk',name:'Angel Wings',price:1000,rar:4,icon:'\u{1FABD}',desc:'A pair of white wings and a soft glow.',part:['#ffffff','#fff2b0']},
 // ---- hats
 {id:'ht_cone',slot:'ht',name:'Traffic Cone',price:300,rar:1,icon:'\u{1F6A7}',desc:'Safety first.'},
 {id:'ht_cowboy',slot:'ht',name:'Cowboy Hat',price:500,rar:2,icon:'\u{1F920}',desc:'Wide brim, big attitude.'},
 {id:'ht_horns',slot:'ht',name:'Devil Horns',price:500,rar:2,icon:'\u{1F608}',desc:'Two little red horns.'},
 {id:'ht_halo',slot:'ht',name:'Halo',price:600,rar:3,icon:'\u{1F607}',desc:'A glowing ring that floats above your head.'},
 {id:'ht_wizard',slot:'ht',name:'Wizard Hat',price:700,rar:3,icon:'\u{1F9D9}',desc:'A tall starry hat.'},
 {id:'ht_crown',slot:'ht',name:'Gold Crown',price:1000,rar:4,icon:'\u{1F451}',desc:'For royalty only.'},
 // ---- landing effects
 {id:'ld_shock',slot:'ld',name:'Shockwave',price:500,rar:2,icon:'\u{1F4A5}',desc:'A big white shockwave and a cloud of dust.'},
 {id:'ld_confetti',slot:'ld',name:'Confetti Pop',price:600,rar:2,icon:'\u{1F389}',desc:'Confetti shoots up when you land.'},
 {id:'ld_snow',slot:'ld',name:'Snowburst',price:700,rar:3,icon:'\u2744\uFE0F',desc:'A burst of snow and frost.'},
 {id:'ld_flame',slot:'ld',name:'Flame Ring',price:800,rar:3,icon:'\u{1F525}',desc:'A ring of fire on touchdown.'},
 // ---- elimination effects (shown where the player you eliminated fell)
 {id:'el_confetti',slot:'el',name:'Confetti Cannon',price:500,rar:2,icon:'\u{1F38A}',desc:'Opponents you eliminate pop into confetti.'},
 {id:'el_shatter',slot:'el',name:'Shatter',price:700,rar:3,icon:'\u{1F48E}',desc:'Opponents shatter into icy shards.'},
 {id:'el_fire',slot:'el',name:'Inferno',price:800,rar:3,icon:'\u{1F525}',desc:'Opponents go up in flames.'},
 {id:'el_gold',slot:'el',name:'Gold Rush',price:900,rar:4,icon:'\u{1FA99}',desc:'Opponents burst into golden sparkles.'},
 // ---- sprint trails (equipped through profile.trail)
 {id:'sh:bubble',slot:'tr',name:'Bubble Trail',price:350,rar:1,icon:'\u{1FAE7}',desc:'Floating bubbles follow your sprint.',c1:'#bff4ff',c2:'#7ac8ff'},
 {id:'sh:ember',slot:'tr',name:'Ember Trail',price:400,rar:2,icon:'\u{1F525}',desc:'Glowing embers drift behind you.',c1:'#ff8a3a',c2:'#ffd060'},
 {id:'sh:frost',slot:'tr',name:'Frost Trail',price:400,rar:2,icon:'\u2744\uFE0F',desc:'Icy flakes sparkle behind you.',c1:'#dff4ff',c2:'#7ab8ff'},
 {id:'sh:gold',slot:'tr',name:'Gold Dust',price:600,rar:3,icon:'\u2728',desc:'A trail of golden sparkles.',c1:'#ffd84a',c2:'#fff2b0'},
 {id:'sh:rainbow',slot:'tr',name:'Rainbow Trail',price:700,rar:4,icon:'\u{1F308}',desc:'Every colour at once.',c1:'#ff5a8a',c2:'#5ab8ff'}
];
export const SHOP_BY=Object.fromEntries(SHOP_COS.map(c=>[c.id,c]));
// fx slot of every shop item that travels in cos.fx (trails are not part of it)
export const SHOP_FX_SLOT=Object.fromEntries(SHOP_COS.filter(c=>c.slot!=='tr').map(c=>[c.id,c.slot]));
export const SHOP_TRAILS=SHOP_COS.filter(c=>c.slot==='tr');

// shop sections, in the order the Item Shop shows them
export const SHOP_SECTIONS=[
 {key:'fr',title:'Nameplates',sub:'The plate behind your name, in the lobby and in the match'},
 {key:'gl',title:'Gliders',sub:'What you ride down from the bus'},
 {key:'pk',title:'Backpacks',sub:'Worn on your back'},
 {key:'ht',title:'Hats',sub:'Worn on your head'},
 {key:'ld',title:'Landing Effects',sub:'Play when you touch down'},
 {key:'el',title:'Elimination Effects',sub:'Play where your eliminations fall'},
 {key:'tr',title:'Sprint Trails',sub:'Leave a trail while you sprint'}
];

// ---------- the daily Featured row: 4 items, 20% off, picked from the date so it changes at midnight and everyone sees the same row
export const FEATURED_COUNT=4,FEATURED_OFF=.2;
export function dayKey(d=new Date()){return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
export function featuredIds(day=dayKey()){
 // small seeded shuffle (mulberry32) so the same day always gives the same row
 let s=day>>>0;const rnd=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
 const a=SHOP_COS.map(c=>c.id);
 for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
 // never two of the same slot in one row, so it always looks varied
 const out=[],used=new Set();
 for(const id of a){const sl=SHOP_BY[id].slot;if(used.has(sl))continue;used.add(sl);out.push(id);if(out.length>=FEATURED_COUNT)break}
 return out}
export function priceOf(id,day=dayKey()){
 const c=SHOP_BY[id];if(!c)return 0;
 return featuredIds(day).includes(id)?Math.max(1,Math.round(c.price*(1-FEATURED_OFF))):c.price}
// seconds until the Featured row changes (for the countdown in the shop)
export function featuredResetIn(now=new Date()){const n=new Date(now);n.setHours(24,0,0,0);return Math.max(0,Math.floor((n-now)/1000))}

// ---------- nameplates: the look of each plate. a/b = gradient top/bottom, bd = border, gl = glow, deco = little extras on the canvas plate
export const NAMEPLATES={
 frame_spore:{a:'rgba(120,170,60,.85)',b:'rgba(50,90,40,.85)',bd:'rgba(190,255,140,.9)',gl:'rgba(150,255,110,.35)',deco:'caps'},
 np_pixel:{a:'rgba(150,150,160,.95)',b:'rgba(80,80,92,.95)',bd:'rgba(230,230,240,.9)',gl:'rgba(200,200,220,.2)',deco:'studs',sq:1},
 np_neon:{a:'rgba(30,10,60,.92)',b:'rgba(10,6,40,.92)',bd:'rgba(60,240,255,.95)',gl:'rgba(255,70,220,.55)',deco:'spark'},
 np_toxic:{a:'rgba(120,230,40,.85)',b:'rgba(30,110,30,.9)',bd:'rgba(210,255,90,.95)',gl:'rgba(150,255,60,.45)',deco:'bubbles'},
 np_ember:{a:'rgba(255,150,40,.88)',b:'rgba(130,30,20,.92)',bd:'rgba(255,220,120,.95)',gl:'rgba(255,110,30,.5)',deco:'embers'},
 np_frost:{a:'rgba(190,235,255,.9)',b:'rgba(60,110,200,.9)',bd:'rgba(240,252,255,.95)',gl:'rgba(150,215,255,.5)',deco:'flakes'},
 np_gold:{a:'rgba(255,220,100,.95)',b:'rgba(170,110,20,.95)',bd:'rgba(255,248,200,.98)',gl:'rgba(255,200,60,.5)',deco:'shine'},
 np_royal:{a:'rgba(110,50,190,.95)',b:'rgba(40,14,90,.95)',bd:'rgba(255,214,90,.98)',gl:'rgba(190,120,255,.5)',deco:'crown'}
};
export const npStyle=id=>(id&&NAMEPLATES[id])||null;
// Menus: the look of a plate comes from CSS variables, see .npl in style.css. npVars gives them as one style string.
export const npVars=id=>{const s=npStyle(id);return s?`--na:${s.a};--nb:${s.b};--nbd:${s.bd};--ngl:${s.gl};--nr:${s.sq?'3px':'9px'};`:''};
export const npCls=id=>npStyle(id)?' npl':'';
const escH=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const npChip=(id,text)=>`<span class="npc${npCls(id)}" style="${npVars(id)}">${escH(text)}</span>`;
// DOM: put a nameplate (or remove it) on a text element in the menus
export function applyNp(el,id){
 const s=npStyle(id);el.classList.toggle('npl',!!s);el.classList.remove('np-spore');
 for(const k of['--na','--nb','--nbd','--ngl','--nr'])el.style.removeProperty(k);
 if(!s)return;
 el.style.setProperty('--na',s.a);el.style.setProperty('--nb',s.b);el.style.setProperty('--nbd',s.bd);el.style.setProperty('--ngl',s.gl);el.style.setProperty('--nr',s.sq?'3px':'9px')}
// canvas: paint a nameplate on the 256x64 name-tag context (text goes on top at y=24)
export function paintNameplate(x,id){
 const s=npStyle(id);if(!s)return false;
 x.save();
 const g=x.createLinearGradient(0,4,0,34);g.addColorStop(0,s.a);g.addColorStop(1,s.b);
 x.fillStyle=g;x.strokeStyle=s.bd;x.lineWidth=2;
 x.shadowColor=s.gl;x.shadowBlur=s.deco==='spark'||s.deco==='embers'?8:0;
 x.beginPath();
 if(s.sq)x.rect(22,4,212,32);else if(x.roundRect)x.roundRect(22,4,212,32,10);else x.rect(22,4,212,32);
 x.fill();x.stroke();x.shadowBlur=0;
 const dot=(px,py,r,col)=>{x.fillStyle=col;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill()};
 switch(s.deco){
  case'caps':for(const[px,r,col]of[[30,6,'#c58bff'],[226,6,'#7ff0ff'],[42,4,'#ffd84a'],[214,4,'#c58bff']]){x.fillStyle=col;x.beginPath();x.arc(px,6,r,Math.PI,0);x.fill()}break;
  case'studs':for(const px of[30,226])for(const py of[11,29])dot(px,py,2.4,'rgba(255,255,255,.85)');break;
  case'spark':x.fillStyle='rgba(60,240,255,.9)';x.fillRect(28,19,6,2);x.fillRect(222,19,6,2);dot(30,10,2,'#ff4ad8');dot(226,28,2,'#ff4ad8');break;
  case'bubbles':for(const[px,py,r]of[[32,28,3],[40,14,2],[220,26,3],[212,12,2]])dot(px,py,r,'rgba(230,255,170,.85)');break;
  case'embers':for(const[px,py,r]of[[32,28,2.5],[44,12,2],[216,26,2.5],[226,12,2]])dot(px,py,r,'#ffd060');break;
  case'flakes':for(const[px,py,r]of[[30,10,2.5],[42,28,2],[214,12,2],[226,28,2.5]])dot(px,py,r,'#ffffff');break;
  case'shine':x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.moveTo(60,4);x.lineTo(78,4);x.lineTo(68,36);x.lineTo(50,36);x.fill();break;
  case'crown':for(const px of[32,224]){x.fillStyle='#ffd65a';x.beginPath();x.moveTo(px-8,16);x.lineTo(px-5,8);x.lineTo(px-2,14);x.lineTo(px,6);x.lineTo(px+2,14);x.lineTo(px+5,8);x.lineTo(px+8,16);x.closePath();x.fill()}break;
 }
 x.restore();return true}

// ---------- sprint trails bought in the shop (one burst per call; `fx` is the particle system in fx.js)
export function shopTrailEmit(fx,pos,id){
 const r=Math.random,x=pos.x+(r()-.5)*.45,y=pos.y+.25+r()*.4,z=pos.z+(r()-.5)*.45;
 if(id==='sh:ember')fx.emit(x,y,z,(r()-.5)*.6,.6+r()*.8,(r()-.5)*.6,r()<.5?'#ff8a3a':'#ffd060',.8,-.2,.28,-.4,.3);
 else if(id==='sh:frost')fx.emit(x,y,z,(r()-.5)*.8,.3+r()*.5,(r()-.5)*.8,r()<.5?'#dff4ff':'#7ab8ff',.9,.3,.3,-.2,.2);
 else if(id==='sh:gold')fx.emit(x,y,z,(r()-.5)*.7,.4+r()*.7,(r()-.5)*.7,r()<.6?'#ffd84a':'#fff2b0',.8,.4,.26,-.4,.2);
 else if(id==='sh:bubble')fx.puff(x,y,z,(r()-.5)*.4,.6+r()*.5,(r()-.5)*.4,r()<.5?'#bff4ff':'#7ac8ff',1,.55,.5,.4,-.1,.4);
 else if(id==='sh:rainbow'){const cols=['#ff5a5a','#ffa83a','#ffe04a','#5aff8a','#5ab8ff','#b07aff'];fx.emit(x,y,z,(r()-.5)*.3,.2+r()*.3,(r()-.5)*.3,cols[(r()*cols.length)|0],.9,0,.3,-.2,.1)}
}
