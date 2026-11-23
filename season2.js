// Season 2: The Fungus. Data for the free Battle Pass (20 levels), XP rates, the fungus skins and trails.
// No imports on purpose: shared.js, movement.js and the menus all read from here.
export const SEASON={id:2,name:'The Fungus',short:'Season 2'};

// Battle Pass XP comes from the same things that pay Swag Tokens (see emote.js awardTokens). It is a separate number.
export const XP={played:25,perMinute:12,kill:50,top10:75,win:300};
export const BP_LEVELS=20;
export const xpFor=n=>200+25*(n-1);                       // XP to go from level n-1 to level n
export const xpTotal=n=>{let t=0;for(let i=1;i<=n;i++)t+=xpFor(i);return t};
// where a given amount of XP puts the player: lvl reached (0..20), XP into the next level and what that level needs
export function levelOf(xp){
 xp=Math.max(0,Math.floor(xp||0));let lvl=0,left=xp;
 while(lvl<BP_LEVELS&&left>=xpFor(lvl+1)){left-=xpFor(lvl+1);lvl++}
 const max=lvl>=BP_LEVELS;
 return{lvl,max,into:max?0:left,need:max?0:xpFor(lvl+1),pct:max?1:left/xpFor(lvl+1),xp}
}
// XP for one finished match, as parts for the end screen
export function matchXp({kills,minutes,won,place}){
 const parts=[['Played',XP.played],['Eliminations',kills*XP.kill],['Survival',minutes*XP.perMinute]];
 if(won)parts.push(['Victory',XP.win]);else if(place&&place<=10)parts.push(['Top 10',XP.top10]);
 return{parts:parts.filter(p=>p[1]>0),total:parts.reduce((a,p)=>a+p[1],0)}
}

// skins: the art is front/side/back PNGs (see shared.js). A skin only ever replaces the picture, never the stats or abilities.
export const SKINS={
 jay_fungus:{id:'jay_fungus',char:'jay',name:'Fungus Jay',lvl:10},
 zach_mycelium:{id:'zach_mycelium',char:'zach',name:'Mycelium Zach',lvl:20}
};

// sprint trails earned in the Battle Pass (the locker stores their id in profile.trail)
export const TRAILS={
 'bp:spore':{id:'bp:spore',name:'Spore Trail',c1:'#b6ff6a',c2:'#5fe0a0',lvl:2},
 'bp:root':{id:'bp:root',name:'Root Trail',c1:'#b07a3c',c2:'#5a8a3a',lvl:11},
 'bp:cloud':{id:'bp:cloud',name:'Spore Cloud Trail',c1:'#e6ffb8',c2:'#9be8ff',lvl:17}
};
// one burst of a trail behind a sprinting player; `fx` is the game's particle system (fx.js)
export function trailEmit(fx,pos,id){
 const r=Math.random;
 if(id==='bp:spore'){
  const c=r()<.5?'#b6ff6a':'#5fe0a0';
  fx.emit(pos.x+(r()-.5)*.5,pos.y+.3+r()*.5,pos.z+(r()-.5)*.5,(r()-.5)*.5,.5+r()*.7,(r()-.5)*.5,c,.9,-.1,.3,.6,.4)
 }else if(id==='bp:root'){
  const c=r()<.6?'#8a5a2a':'#4f8a3a';
  fx.emit(pos.x+(r()-.5)*.35,pos.y+.12,pos.z+(r()-.5)*.35,(r()-.5)*1.1,.2+r()*.5,(r()-.5)*1.1,c,.55,2.4,.2,0,0)
 }else if(id==='bp:cloud'){
  fx.puff(pos.x+(r()-.5)*.4,pos.y+.25,pos.z+(r()-.5)*.4,(r()-.5)*.5,.35+r()*.4,(r()-.5)*.5,r()<.5?'#e6ffb8':'#bff0ff',.9,.9,1.5,.5,0,1.1)
 }
}

// the Battle Pass track. `live:false` rewards are shown on the track but cannot be claimed until the feature they unlock ships.
// type: skin, trail, frame, hat, landing, emote, weapon, glider, pack, elim
export const REWARDS=[
 {lvl:1,id:'frame_spore',name:'Spore Nameplate',type:'frame',icon:'\u{1F344}',desc:'A mossy nameplate for your profile.',live:true},
 {lvl:2,id:'bp:spore',name:'Spore Trail',type:'trail',desc:'Glowing spores drift behind you while you sprint.',live:true},
 {lvl:3,id:'hat_puffcap',name:'Puffcap',type:'hat',icon:'\u{1F9E2}',desc:'A soft mushroom cap for your character.',live:true},
 {lvl:4,id:'land_ring',name:'Spore Ring',type:'landing',icon:'\u{1F4AB}',desc:'A ring of spores bursts out when you land.',live:true},
 {lvl:5,id:'emote_dance',name:'Spore Dance',type:'emote',icon:'\u{1F483}',desc:'A fungus-themed emote.',live:true},
 {lvl:6,id:'wp_blaster',name:'Fungal Blaster Finish',type:'weapon',icon:'\u{1F52B}',desc:'A mossy finish for the Fungal Blaster.',live:true},
 {lvl:7,id:'gl_cloud',name:'Spore Cloud Glider',type:'glider',icon:'☁️',desc:'Glide on a glowing cloud of spores.',live:true},
 {lvl:8,id:'pk_root',name:'Root Backpack',type:'pack',icon:'\u{1F392}',desc:'A backpack woven from fungal roots.',live:true},
 {lvl:9,id:'el_burst',name:'Spore Burst',type:'elim',icon:'\u{1F4A5}',desc:'Opponents you eliminate burst into spores.',live:true},
 {lvl:10,id:'jay_fungus',name:'Fungus Jay',type:'skin',skin:'jay_fungus',desc:'A full Jay skin overgrown with fungus. Skins change looks only, never abilities or stats.',live:true,big:true},
 {lvl:11,id:'bp:root',name:'Root Trail',type:'trail',desc:'Thin roots snap out of the ground behind you.',live:true},
 {lvl:12,id:'gl_mushroom',name:'Giant Mushroom Glider',type:'glider',icon:'\u{1F344}',desc:'Glide under a giant mushroom cap.',live:true},
 {lvl:13,id:'wp_root',name:'Root Shooter Finish',type:'weapon',icon:'\u{1F33F}',desc:'A woven-root finish for the Root Shooter.',live:true},
 {lvl:14,id:'land_burst',name:'Mushroom Burst',type:'landing',icon:'\u{1F344}',desc:'Mushrooms sprout where you land.',live:true},
 {lvl:15,id:'emote_rise',name:'Mycelium Rise',type:'emote',icon:'\u{1F331}',desc:'A longer emote in several stages.',live:true},
 {lvl:16,id:'pk_glow',name:'Glowing Spore Pack',type:'pack',icon:'✨',desc:'A backpack that glows and sheds spores.',live:true},
 {lvl:17,id:'bp:cloud',name:'Spore Cloud Trail',type:'trail',desc:'Big pale clouds of spores follow your sprint.',live:true},
 {lvl:18,id:'gl_roots',name:'Woven Roots Glider',type:'glider',icon:'\u{1F9F6}',desc:'A glider made from twisting roots.',live:true},
 {lvl:19,id:'el_bloom',name:'Infection Bloom',type:'elim',icon:'\u{1F33A}',desc:'Opponents you eliminate bloom into mushrooms.',live:true},
 {lvl:20,id:'zach_mycelium',name:'Mycelium Zach',type:'skin',skin:'zach_mycelium',desc:'The premium reward: a full Zach skin grown from mycelium.',live:true,big:true}
];
export const TYPE_LABEL={skin:'Character skin',trail:'Sprint trail',frame:'Nameplate',hat:'Accessory',landing:'Landing effect',emote:'Emote',weapon:'Weapon finish',glider:'Glider',pack:'Backpack',elim:'Elimination effect'};

// ---- map corruption: which named locations the fungus has taken, and how far it has gone
export const TIERS={
 heavy:{reach:1.7,power:1,giants:9,mush:80,small:50,roots:46,glow:26,shelf:6,rubble:30,motes:260,roof:6},
 medium:{reach:1.4,power:.7,giants:3,mush:34,small:26,roots:18,glow:12,shelf:3,rubble:8,motes:110,roof:3},
 light:{reach:1.2,power:.4,giants:0,mush:12,small:12,roots:6,glow:5,shelf:1,rubble:0,motes:36,roof:1}
};
// themes give each place its own colours and habits (taller caps, more shelf fungi, more rubble, more roots)
export const THEMES={
 ruin:{caps:['#6f4bd8','#9b6bff','#4fb8d8'],ground:'#4a3a78',glow:['#7df9ff','#c58bff'],capW:1.25,stemH:1,shelf:1,rubble:1.6,roots:1,glowMul:1},
 forest:{caps:['#2fb38a','#58e0a8','#9bff6a'],ground:'#2b6a5a',glow:['#9bff6a','#58e0ff'],capW:.8,stemH:1.55,shelf:1,rubble:.4,roots:1.5,glowMul:1.3},
 rot:{caps:['#c97a2a','#e0a040','#a64a8a'],ground:'#6a5a2a',glow:['#ffd060','#ff8ad0'],capW:1,stemH:.8,shelf:2.6,rubble:1,roots:.8,glowMul:.8},
 bloom:{caps:['#d84a8a','#ff7ab8','#b45bd8'],ground:'#7a3a6a',glow:['#ff8ad0','#ffd0f0'],capW:1.1,stemH:.9,shelf:.8,rubble:.6,roots:.9,glowMul:1.4},
 moss:{caps:['#8ab82a','#c0e04a','#4aa860'],ground:'#5a6a2a',glow:['#d8ff5a','#7affc0'],capW:.95,stemH:1.1,shelf:1.4,rubble:.7,roots:1.2,glowMul:1},
  // v38: the three new sites each get a palette of their own (fog is the tint this place gives the purple ambience fog)
  ember:{caps:['#e0502a','#ff8a3a','#8a2a4a'],ground:'#4a2a2a',glow:['#ffb050','#ff5a6a'],capW:1.15,stemH:.85,shelf:1.8,rubble:2,roots:.9,glowMul:1.1,fog:'#5a2a38'},
  frost:{caps:['#9ad0ff','#dff4ff','#7a8aff'],ground:'#4a5a7a',glow:['#bff4ff','#a8b8ff'],capW:.9,stemH:1.3,shelf:.9,rubble:.5,roots:1.1,glowMul:1.5,fog:'#4a5a8a'},
  tide:{caps:['#1fc8c0','#3a8aff','#9a5aff'],ground:'#2a4a5a',glow:['#5affe0','#5ab0ff'],capW:1,stemH:1.15,shelf:1.2,rubble:.8,roots:1.7,glowMul:1.6,fog:'#2a5a6a'}
};
export const CORRUPT={
 // heavy: buildings fused with mushrooms and roots, dense spores, most of the pods, about 10 traps each
 'Old Keep':{tier:'heavy',theme:'ruin'},
 'Lonely Lodge':{tier:'heavy',theme:'forest'},
 'Quarry Rock':{tier:'heavy',theme:'ember'},                    // v38
 // medium: fungal growth on walls and ground, some pods, about 5 traps each
 'Sawmill Creek':{tier:'medium',theme:'rot'},
 'Tomato Town':{tier:'medium',theme:'bloom'},
 'Camp Pinecone':{tier:'medium',theme:'moss',hue:.05},
 'Misty Mill':{tier:'medium',theme:'frost'},                    // v38
 'Harbor Heights':{tier:'medium',theme:'tide'},                 // v38
 // light: small clusters and glowing patches around landmarks, no pods, about 2 traps each. `hue` nudges a shared theme so no two sites match
 "Mc Dongal's":{tier:'light',theme:'bloom',hue:.07},
 "Farmer's Folly":{tier:'light',theme:'moss',hue:-.06},
 'Radar Ridge':{tier:'light',theme:'ruin',hue:-.08},
 'Fuel Stop 9':{tier:'light',theme:'rot',hue:.06}
};
// Spore traps (v38). The host runs them; every machine builds the same traps from the map (traps.js).
export const TRAP={trigger:4,radius:6,life:5,rearm:20,count:{heavy:10,medium:5,light:2},gap:9,overlay:6,stacks:1};
// Fungal ambience (v38): inside a corrupted place the fog turns purple and thick, the sky and light go cold and violet, and a low hum rises.
export const AMBIENCE={fogNear:.55,fogFar:.62,sky:.55,light:.4,hum:.5,rate:1.6};


// the lobby banner and the first-join summary. `live` ones work now; the rest are shown as "coming soon" until they ship.
export const SLIDES=[
 {id:'pass',live:true,icon:'\u{1F344}',title:'Season 2 Battle Pass',text:'20 free levels. Earn XP from the same things that earn Swag Tokens.',go:'pass'},
 {id:'skins',live:true,icon:'\u{1F9EA}',title:'Fungus Skins',text:'Fungus Jay at level 10 and Mycelium Zach at level 20.',go:'pass'},
 {id:'weapons',live:true,icon:'\u{1F52B}',title:'Fungal Weapons',text:'Four spore weapons with infinite ammo. Stack infections for damage over time. Open Spore Pods in corrupted places to find them.'},
 {id:'corrupt',live:true,icon:'\u{1F9A0}',title:'Map Corruption',text:'The fungus has overgrown twelve places, from the ruins at Old Keep to the pits at Quarry Rock. Purple fog hangs over them and Spore Pods grow in the worst of it.'},
 {id:'traps',live:true,icon:'\u{1F4A8}',title:'Spore Traps',text:'Hidden pods in corrupted places burst into a spore cloud when you get close. One infection stack for anyone inside, then they re-arm.'},
 {id:'gliders',live:true,icon:'\u{1FA82}',title:'Fungal Gliders and Cosmetics',text:'Three Battle Pass gliders, plus a hat, backpacks, landing and elimination effects, weapon finishes, emotes and a nameplate.',go:'pass'}
];
