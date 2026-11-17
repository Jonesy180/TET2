/* TET2 v0.21 — PRIVATE engineering adapters for original OTG! Drift Knockout and Drag Shootout.
 * SOURCE: otg-evil2-specialist-v8259.js. Pure concepts ONLY: Drift knockout
 * uses SAME ZONE for two scores, higher score advances, tie means rerun both;
 * Drag uses ONE verified Festival Drag Strip and ONE timed attempt per car.
 * TET2 introduces 8/16-car test sizes, deterministic frozen fields, bronze duel,
 * one independent TET2 result ledger per competition. These are NOT the complete
 * OTG-native specialist event controllers. No OTG read/write hooks are used.
 */
(()=>{'use strict';
const reg=globalThis.TET2Registry,$=id=>document.getElementById(id),ZONES=globalThis.TET2DriftZones;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const req=(b,msg)=>{if(!b)throw Error(msg);};
const MAX_SCORE=9999999999;
let ready=false,active=null,garage=[],byId=new Map();
const code=k=>k==='drift-knockout'?'dk':k==='drag-shootout'?'dg':null;
function randomSeed(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]||1;}
function newId(k){const a=new Uint32Array(2);crypto.getRandomValues(a);return code(k)+'-'+a[0].toString(36)+'-'+a[1].toString(36);}
function shuffle(source,seed){let n=seed>>>0;function rand(){n=(n+0x6D2B79F5)|0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}const a=source.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const expectedField=(size,seed)=>shuffle(garage.map(c=>c.id),seed).slice(0,size);
const expectedZones=seed=>shuffle(ZONES,seed^0x259D800).slice(0,16);
const name=id=>byId.get(id)?.name||id;
function parseScore(raw){const s=String(raw??'').trim();req(/^\d{1,10}$/.test(s),'Use a whole, non-negative Drift score, up to ten digits');const n=Number(s);req(Number.isSafeInteger(n)&&n<=MAX_SCORE,'Drift score out of range');return n;}
function parseTime(raw){const s=String(raw??'').trim();req(/^\d{1,3}:[0-5]\d\.\d{3}$/.test(s),'Use MM:SS.mmm (example: 00:12.345)');const [m,ss,ms]=s.replace(':','.').split('.').map(Number),n=m*60000+ss*1000+ms;req(Number.isSafeInteger(n)&&n>=1000&&n<86400000,'Invalid Drag time');return n;}
function formatTime(n){return String(Math.floor(n/60000)).padStart(2,'0')+':'+String(Math.floor(n/1000)%60).padStart(2,'0')+'.'+String(n%1000).padStart(3,'0');}
// Reconstruct the entire match tree from each sequential result. Semifinal losers
// must meet BEFORE the finalists, yielding exactly one bronze medallist.
function nextDrift(s){let ids=s.field.slice(),pos=0,semis=[];const all=s.results;
 while(ids.length>2){const winners=[];const round=ids.length===4?'SEMIFINAL':ids.length===8?'QUARTERFINAL':`ROUND OF ${ids.length}`;
  for(let i=0;i<ids.length;i+=2){if(pos===all.length)return{index:pos,a:ids[i],b:ids[i+1],stage:round,zone:s.zones[pos]};
   const r=all[pos];req(r&&r.a===ids[i]&&r.b===ids[i+1]&&[r.a,r.b].includes(r.winner),'Existing Drift bracket progression corrupted');
   winners.push(r.winner);if(ids.length===4)semis.push(r.loser);pos++;}ids=winners;}
 req(semis.length===2,'Missing semifinal losers');
 if(pos===all.length)return{index:pos,a:semis[0],b:semis[1],stage:'BRONZE DUEL',zone:s.zones[pos]};pos++;
 if(pos===all.length)return{index:pos,a:ids[0],b:ids[1],stage:'FINAL',zone:s.zones[pos]};return null;
}
function driftPodium(s){if(s.results.length!==s.size)return null;const fin=s.results[s.size-1],bronze=s.results[s.size-2];return[fin.winner,fin.loser,bronze.winner];}
function nextDrag(s){const n=s.results.length;return n<s.size?{carId:s.field[n],carNumber:n+1}:null;}
function dragRanking(s){const by=new Map(s.results.map(x=>[x.carId,x.timeMs]));return s.field.map(id=>({carId:id,timeMs:by.has(id)?by.get(id):null})).sort((a,b)=>a.timeMs===null&&b.timeMs===null?a.carId.localeCompare(b.carId):a.timeMs===null?1:b.timeMs===null?-1:a.timeMs-b.timeMs||a.carId.localeCompare(b.carId));}
function dragPodium(s){if(s.results.length!==s.size)return null;const a=dragRanking(s);for(let i=1;i<3;i++)if(a[i].timeMs===a[i-1].timeMs)return null;if(a.length>3&&a[2].timeMs===a[3].timeMs)return null;return a.slice(0,3).map(x=>x.carId);}
function podium(s){return s.kind==='drift-knockout'?driftPodium(s):dragPodium(s);}
function next(s){return s.kind==='drift-knockout'?nextDrift(s):nextDrag(s);}
function validate(s){req(ready&&ZONES?.length===20,'Specialist Garage or original Drift Zones unavailable');
 req(s?.format==='TET2_INSTANCE'&&s.schema===1&&!!code(s.kind)&&typeof s.id==='string'&&new RegExp('^'+code(s.kind)+'-[a-z0-9-]{5,70}$').test(s.id),'Invalid specialist instance identity');
 req([8,16].includes(s.size)&&Number.isInteger(s.seed)&&s.seed>0&&s.seed<=0xffffffff&&typeof s.createdAt==='string','Specialist header invalid');
 req(s.category===(s.kind==='drift-knockout'?'DRIFT':'DRAG'),'Specialist category mismatch');
 req(Array.isArray(s.field)&&JSON.stringify(s.field)===JSON.stringify(expectedField(s.size,s.seed)),'Specialist field changed');
 req(Array.isArray(s.results)&&s.results.length<=s.size,'Invalid specialist results count');
 if(s.kind==='drift-knockout'){
  req(JSON.stringify(s.zones)===JSON.stringify(expectedZones(s.seed)),'Frozen Drift zones changed');
  const history={...s,results:[]};for(let i=0;i<s.results.length;i++){
   const exp=nextDrift(history),r=s.results[i];req(exp&&r&&r.index===i&&r.stage===exp.stage&&r.a===exp.a&&r.b===exp.b&&r.zone===exp.zone,'Invalid Drift match or round order '+(i+1));
   req(Number.isSafeInteger(r.scoreA)&&Number.isSafeInteger(r.scoreB)&&r.scoreA>=0&&r.scoreA<=MAX_SCORE&&r.scoreB>=0&&r.scoreB<=MAX_SCORE&&r.scoreA!==r.scoreB,'Invalid/tied Drift scores');
   req(r.winner===(r.scoreA>r.scoreB?r.a:r.b)&&r.loser===(r.scoreA>r.scoreB?r.b:r.a),'Drift winner does not match scores');history.results.push(r);}
 }else{
  req(s.route==='Festival Drag Strip','Source Drag Strip identity changed');req(s.zones===undefined,'Drag record contains Drift-zone data');
  for(let i=0;i<s.results.length;i++){const r=s.results[i];req(r&&r.carId===s.field[i]&&Number.isInteger(r.timeMs)&&r.timeMs>=1000&&r.timeMs<86400000,'Invalid / out-of-order Drag time '+(i+1));}
 }return s;}
function create(kind,size){req(ready&&code(kind)&&[8,16].includes(size),'Specialist kind/size unavailable');const seed=randomSeed();const record={format:'TET2_INSTANCE',schema:1,id:newId(kind),kind,category:kind==='drift-knockout'?'DRIFT':'DRAG',size,seed,createdAt:new Date().toISOString(),field:expectedField(size,seed),results:[]};
 if(kind==='drift-knockout')record.zones=expectedZones(seed);else record.route='Festival Drag Strip';reg.addInstance(record);return record.id;}
function status(s){if(!s)return{done:false,progress:'Missing specialist event'};const medals=podium(s),total=s.size;return{done:!!medals,podium:medals,progress:`${s.results.length}/${total} ${s.kind==='drift-knockout'?'knockout matches':'Drag times'}${s.kind==='drag-shootout'&&s.results.length===total&&!medals?' · podium tie unresolved':''}`,label:s.kind==='drift-knockout'?'Drift Knockout':'Drag Shootout'};}
function notify(text,bad=false){const n=$('specialistNotice');if(n){n.textContent=text;n.className=bad?'status-warn':'status-ok';}}
function show(){if(!active)return;try{const s=reg.getInstance(active),what=next(s),medals=podium(s),isDrift=s.kind==='drift-knockout';
 $('specialistTitle').textContent=(isDrift?'💨 DRIFT KNOCKOUT':'🏎️ DRAG SHOOTOUT')+' · '+(what?(what.stage||`CAR ${what.carNumber}/${s.size}`):medals?'🏆 COMPLETE':'PODIUM TIE');
 $('specialistMeta').textContent=`${s.results.length}/${s.size} ${isDrift?'matches':'car times'} · ${s.id} · ${s.size} eligible cars`;
 if(what){$('specialistEntry').innerHTML=isDrift?`<div class="route-feature"><small>${esc(what.stage)} · SAME ZONE FOR BOTH CARS</small><strong>${esc(what.zone)}</strong></div><p class="live-big">${esc(name(what.a))} <span class="dim">VS</span> ${esc(name(what.b))}</p><div class="time-duel"><label><span>${esc(name(what.a))}</span><input id="spScoreA" type="text" inputmode="numeric" placeholder="Score A"></label><label><span>${esc(name(what.b))}</span><input id="spScoreB" type="text" inputmode="numeric" placeholder="Score B"></label></div><button class="action" id="spBank">BANK BOTH SCORES → NEXT MATCH</button><p class="dim">Equal scores: rerun BOTH cars on this SAME zone, no result saved.</p>`:
 `<div class="route-feature"><small>FH5 · VERIFIED ORIGINAL DRAG ROUTE</small><strong>${esc(s.route)}</strong></div><p class="live-big">${esc(name(what.carId))}</p><div class="live-flex"><input id="spTime" type="text" inputmode="decimal" placeholder="00:12.345"><button class="action" id="spBank">BANK DRAG TIME → NEXT CAR</button></div>`;
 $('spBank').onclick=bank;
 }else if(medals){$('specialistEntry').innerHTML=medals.map((id,i)=>`<p class="live-big">${['🥇','🥈','🥉'][i]} ${esc(name(id))}</p>`).join('')+'<p class="flag">🛑 STOP HERE, YOU FUCKWIT!</p>';}else{$('specialistEntry').innerHTML='<p class="status-warn">All Drag times saved, but a podium position is tied. Correct a time; honours withheld until resolved.</p>';}
 $('specialistResults').innerHTML=isDrift?`<div class="car"><strong>BRACKET</strong><small>${s.results.length}/${s.size} matches complete · bronze duel before final</small></div>`+s.results.slice(-10).map(r=>`<div class="car"><small>${esc(r.stage)} · ${esc(r.zone)} · ${r.scoreA.toLocaleString()} vs ${r.scoreB.toLocaleString()}</small><strong>${esc(name(r.winner))} advances${r.stage==='BRONZE DUEL'?' · BRONZE':''}</strong></div>`).join(''):
 '<table class="mini-table"><thead><tr><th>Rank</th><th>Car</th><th>Drag time</th></tr></thead><tbody>'+dragRanking(s).map((r,i)=>`<tr><td>${r.timeMs===null?'—':i+1}</td><td>${esc(name(r.carId))}</td><td>${r.timeMs===null?'—':formatTime(r.timeMs)}</td></tr>`).join('')+'</tbody></table>';
 $('specialistHistory').innerHTML=s.results.slice(-8).map(r=>`<div class="car"><small>${esc(isDrift?r.stage:s.route)}</small><strong>${esc(isDrift?name(r.winner)+' wins':name(r.carId)+' · '+formatTime(r.timeMs))}</strong></div>`).join('')||'<p class="dim">No results recorded.</p>';
 $('specialistUndo').disabled=!s.results.length;$('spCorrectionPanel').hidden=isDrift;
 if(!isDrift){$('spCorrectChoice').innerHTML='<option value="">Choose saved time…</option>'+s.results.map((r,i)=>`<option value="${i}">${i+1}. ${esc(name(r.carId))} · ${formatTime(r.timeMs)}</option>`).join('');$('spCorrectButton').disabled=!s.results.length;}
 }catch(e){notify('Specialist screen refused to render: '+e.message,true);}}
function open(id){const s=reg.getInstance(id);req(ready&&s&&code(s.kind),'Unknown specialist event');active=id;globalThis.tet2Navigate('instance-specialist');show();}
function bank(){try{const s=reg.getInstance(active),n=next(s);req(n,'Competition already complete');let result;
 if(s.kind==='drift-knockout'){const scoreA=parseScore($('spScoreA').value),scoreB=parseScore($('spScoreB').value);req(scoreA!==scoreB,'TIE — rerun BOTH cars on the SAME Drift Zone; no match saved');const winner=scoreA>scoreB?n.a:n.b;result={index:n.index,stage:n.stage,a:n.a,b:n.b,zone:n.zone,scoreA,scoreB,winner,loser:winner===n.a?n.b:n.a};}
 else result={carId:n.carId,timeMs:parseTime($('spTime').value)};
 reg.saveInstance(s.id,{...s,results:[...s.results,result]});notify('Result banked ✓ Next competitor ready.');}
 catch(e){notify('NOT SAVED — '+e.message,true);}}
function correction(){try{const s=reg.getInstance(active);req(s?.kind==='drag-shootout','Only Drag times can be individually corrected');const v=$('spCorrectChoice').value,i=Number(v);req(v!==''&&Number.isInteger(i)&&i>=0&&i<s.results.length,'Select a saved Drag time');const timeMs=parseTime($('spCorrectTime').value);reg.saveInstance(s.id,{...s,results:s.results.map((r,j)=>j===i?{...r,timeMs}:r)});notify('Drag time corrected. Standings and trophies recalculated.');}catch(e){notify('Correction rejected: '+e.message,true);}}
function undo(){const s=reg.getInstance(active);if(!s?.results?.length)return;if(!confirm('Undo the last result in THIS specialist competition?'))return;try{reg.saveInstance(s.id,{...s,results:s.results.slice(0,-1)});notify('Last result undone; other competitions unaffected.');}catch(e){notify('Undo refused: '+e.message,true);}}
$('specialistUndo').onclick=undo;$('spCorrectButton').onclick=correction;$('specialistBack').onclick=()=>globalThis.tet2Navigate('list');
const timer=setInterval(()=>{if(globalThis.tet2Garage?.length){clearInterval(timer);try{garage=globalThis.tet2Garage;byId=new Map(garage.map(c=>[c.id,c]));req(garage.length===704&&byId.size===704&&Array.isArray(ZONES)&&ZONES.length===20,'Frozen FH5 Garage or original 20 zones missing');ready=true;reg.registerInstanceValidator('drift-knockout',validate);reg.registerInstanceValidator('drag-shootout',validate);reg.subscribe(()=>{if(active)show();});notify('Both independent specialist engineering engines ready.');}catch(e){notify('Specialist engine unavailable: '+e.message,true);}}},50);
globalThis.TET2Specialists={create,open,status,next,validate,driftPodium,dragPodium,dragRanking,parseScore,parseTime,formatTime,get ready(){return ready;}};
})();
