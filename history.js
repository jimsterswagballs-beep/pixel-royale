// Match history (v49): every match you finish is kept in your profile (the last 40). It is saved at the same moment
// the tokens are paid: when you are eliminated or win. The Stats tab shows a summary and the list.
import {MODES,GM} from './teams.js';
import {CHARS} from './data.js';

const KEEP=40;

export const historyMethods={
 // one finished match: place, kills, damage dealt, seconds alive, mode, game mode and character
 recordMatch(m){
  const P=this.profile;P.history=P.history||[];
  P.history.unshift(Object.assign({d:Date.now()},m));if(P.history.length>KEEP)P.history.length=KEEP;
  this.saveProfile();
 },
 historyStats(){
  const H=this.profile.history||[];const placed=H.filter(x=>x.place>0);
  return{
   n:H.length,wins:H.filter(x=>x.won).length,top10:H.filter(x=>x.place>0&&x.place<=10).length,
   kills:H.reduce((a,x)=>a+(x.kills||0),0),dmg:H.reduce((a,x)=>a+(x.dmg||0),0),secs:H.reduce((a,x)=>a+(x.secs||0),0),
   best:placed.length?Math.min(...placed.map(x=>x.place)):0,
   avg:placed.length?placed.reduce((a,x)=>a+x.place,0)/placed.length:0};
 },
 enter_history(){this.renderHistory()},
 renderHistory(){
  const root=document.getElementById('history');if(!root)return;
  const H=this.profile.history||[],S=this.historyStats();
  const card=(v,l)=>`<div class="hist-card"><b>${v}</b><span>${l}</span></div>`;
  const fmtT=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+'h '+m+'m':m+'m '+(s%60)+'s'};
  const rows=H.map(x=>{
   const dt=new Date(x.d);
   const when=dt.toLocaleDateString('en-AU',{day:'numeric',month:'short'})+' '+dt.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
   const md=(MODES[x.mode]||MODES.solo).name,gm=(GM[x.gm]||GM.br).name;
   const ch=(CHARS.find(c=>c.id===x.char)||{name:'-'}).name;
   const pl=x.won?'Winner':x.place?'#'+x.place:'-';
   return `<tr class="${x.won?'win':''}"><td>${when}</td><td>${md} · ${gm}</td><td>${ch}</td><td class="pl">${pl}</td><td>${x.kills||0}</td><td>${x.dmg||0}</td><td>${fmtT(x.secs||0)}</td></tr>`;
  }).join('');
  root.innerHTML=`<div class="panel"><div class="head"><h2>Match History</h2></div>`+
   (S.n?`<div class="hist-grid">${card(S.n,'Matches')}${card(S.wins,'Wins')}${card(S.top10,'Top 10')}${card(S.kills,'Eliminations')}${card(S.best?'#'+S.best:'-','Best place')}${card(S.avg?'#'+S.avg.toFixed(1):'-','Avg place')}${card(S.dmg,'Damage dealt')}${card(fmtT(S.secs),'Time alive')}</div>`+
   `<div class="hist-wrap"><table class="hist"><thead><tr><th>When</th><th>Mode</th><th>Character</th><th>Place</th><th>Kills</th><th>Damage</th><th>Alive</th></tr></thead><tbody>${rows}</tbody></table></div>`
   :`<p class="hist-empty">No matches yet. Finish a match and it shows up here.</p>`)+`</div>`;
 }
};
