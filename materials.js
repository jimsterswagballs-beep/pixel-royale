// Building materials and piece costs shared by loot, structures and the HUD.
export const MATS={
 wood:{n:'Wood',c:'#c98a4a',dark:'#7a4d24',hp:120},
 stone:{n:'Stone',c:'#b4b9be',dark:'#5f666c',hp:320},
 metal:{n:'Metal',c:'#8aa3b8',dark:'#4b5d6c',hp:640}};
export const MAT_KEYS=Object.keys(MATS);
export const PIECES={wall:{n:'Wall',cost:10},floor:{n:'Floor',cost:10},ramp:{n:'Ramp',cost:14}};
export const PIECE_KEYS=Object.keys(PIECES);
export const emptyMats=()=>({wood:0,stone:0,metal:0});
// a loot stack of building material (floor drops and chests)
export function rollMatItem(rng,q=1){
 const k=rng();const t=k<.4?'wood':k<.75?'stone':'metal';
 const[lo,span]=t==='wood'?[20,20]:t==='stone'?[14,16]:[8,8];
 return{k:'m',t,n:Math.round((lo+rng()*span)*(q>1.2?1.4:1))}}
