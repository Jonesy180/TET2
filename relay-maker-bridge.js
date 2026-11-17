(()=>{'use strict';
const $=s=>document.querySelector(s), K='TET2__RELAY_MAKER_V09', ID='tet2-maker-relay-005', SEED=20261117;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=globalThis.rhEvil2Rules181;
let entries=[],state=null,ready=false;
function blank(){return {schema:1,app:'TET2',eventId:ID,seed:SEED,teamIds:entries.map(e=>e.id),results:[]};}
function expected(n){const team=entries[Math.floor(n/3)];return {entryId:team.id,stage:n%3+1,carId:team.cars[n%3].id};}
function validate(s){if(!s||s.schema!==1||s.app!=='TET2'||s.eventId!==ID||s.seed!==SEED||JSON.stringify(s.teamIds)!==JSON.stringify(entries.map(e=>e.id))||!Array.isArray(s.results)||s.results.length>entries.length*3)throw Error('Relay save does not match selected donor draw');
const clean=[];for(let i=0;i<s.results.length;i++){const r=s.results[i],ex=expected(i);if(!r||r.entryId!==ex.entryId||r.stage!==ex.stage||r.carId!==ex.carId||!Number.isInteger(r.timeMs)||r.timeMs<1000||r.timeMs>=86400000)throw Error('Invalid Relay result #'+(i+1));clean.push({...ex,timeMs:r.timeMs});}
api.scoreThreeStages(entries,clean);return {...blank(),results:clean};}
function parse(v){if(!/^\d{1,3}:[0-5]\d\.\d{3}$/.test(v))throw Error('Enter MM:SS.mmm (e.g. 03:36.784)');const [m,s,ms]=v.replace(':','.').split('.').map(Number),n=m*60000+s*1000+ms;if(n<1000||n>=86400000)throw Error('Invalid racing time');return n;}
function format(ms){const m=Math.floor(ms/60000),s=Math.floor(ms/1000)%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');}
function table(){return api.scoreThreeStages(entries,state.results);}
function medals(){if(!state||state.results.length!==entries.length*3)return null;const t=table();return t.length>=3&&t[0].total!==t[1].total&&t[1].total!==t[2].total&&t[2].total!==t[3]?.total?t.slice(0,3):null;}
function save(s){globalThis.TET2Registry.save('relay-maker',validate(s));}
function notice(msg,bad=false){const el=$('#relayNotice');el.textContent=msg;el.className=bad?'status-warn':'status-ok';}
function render(){if(!ready||!state)return;const n=state.results.length,max=entries.length*3,done=n===max,team=done?null:entries[Math.floor(n/3)],leg=n%3,med=medals(),rows=table();
$('#relayTitle').textContent=done?(med?'MANUFACTURER RELAY COMPLETE':'ALL RESULTS ENTERED — PODIUM TIE'):`TEAM ${Math.floor(n/3)+1} OF ${entries.length} · LEG ${leg+1} OF 3`;
$('#relayProgress').textContent=`${n}/${max} race times banked · ${entries.length} manufacturers · one car per leg · donor scoring engine`;
if(!done){const car=team.cars[leg];$('#relayPanel').innerHTML=`<p class="live-big">${esc(team.make)} — ${esc(car.name)}</p><p class="dim">Leg ${leg+1} of 3. Original Evil 2.0 manufacturer selection and three-stage scoring rules.</p><div class="live-flex"><input id="relayTime" inputmode="decimal" placeholder="03:36.784" aria-label="Race time MM:SS.mmm"><button class="action" id="relaySave">BANK TIME</button></div>`;$('#relaySave').onclick=record;$('#relayTime').onkeydown=e=>{if(e.key==='Enter')record();};}
else $('#relayPanel').innerHTML=med?`<p class="live-big">🏆 ${esc(entries.find(e=>e.id===med[0].entryId)?.make)}</p><p class="flag">🛑 STOP HERE, YOU FUCKWIT!</p><p>All relay times saved. Trophies derive from the saved standings.</p>`:'<p class="status-warn">Podium tied. Medals withheld pending resolution; undo a result to correct errors.</p>';
$('#relayStandings').innerHTML='<table class="mini-table"><thead><tr><th>Pos</th><th>Manufacturer</th><th>Legs</th><th>Total</th></tr></thead><tbody>'+rows.slice(0,25).map(r=>`<tr><td>${r.place||'—'}</td><td>${esc(entries.find(e=>e.id===r.entryId)?.make||r.entryId)}</td><td>${r.stages.filter(x=>x!==null).length}/3</td><td>${r.total===null?'—':format(r.total)}</td></tr>`).join('')+'</tbody></table>'+(rows.length>25?`<p class="dim">Top 25 of ${rows.length} manufacturers shown. Incomplete teams follow completed teams.</p>`:'');
$('#relayHistory').innerHTML=state.results.slice(-9).map(r=>`<div class="car"><small>${esc(entries.find(e=>e.id===r.entryId)?.make)} · LEG ${r.stage}</small><strong>${format(r.timeMs)}</strong></div>`).join('')||'<p class="dim">No times banked.</p>';
$('#relayListState').textContent=done?(med?'Complete — final podium awarded':'All results banked; podium tie unresolved'):`${n}/${max} times · next: ${team.make} leg ${leg+1}`;
$('#relayUndo').disabled=!n;$('#relayReset').disabled=!n;}
function record(){try{const n=state.results.length;if(n>=entries.length*3)throw Error('Relay complete');const timeMs=parse($('#relayTime').value.trim());save({...state,results:[...state.results,{...expected(n),timeMs}]});notice('Time banked. Next car ready.');}catch(e){notice('Result not saved: '+e.message,true);}}
function init(){try{const g=globalThis.tet2Garage||[];if(g.length!==704)throw Error('Garage not ready');if(!api?.drawMakerRelay||!api?.scoreThreeStages)throw Error('Original donor relay engine unavailable');entries=api.drawMakerRelay(g.map(c=>({id:c.id,name:c.name,make:c.make,type:c.classType})),SEED);
if(entries.length<3||new Set(entries.map(e=>e.make)).size!==entries.length||entries.some(e=>e.cars.length!==3||new Set(e.cars.map(c=>c.id)).size!==3))throw Error('Relay entrant invariants failed');ready=true;
window.TET2RelayMaker={getPodium:medals,getState:()=>state,getEntries:()=>entries};
globalThis.TET2Registry.register('relay-maker',{legacyKey:K,validate,blank,apply(s){state=s;render();}});notice('Real Evil 2.0 maker Relay draw/scoring engine connected.');}
catch(e){$('#relayTitle').textContent='RELAY UNAVAILABLE';notice(e.message,true);}}
$('#relayUndo').onclick=()=>{if(!state?.results.length||!confirm('Undo the latest Relay time?'))return;try{save({...state,results:state.results.slice(0,-1)});notice('Last time removed.');}catch(e){notice(e.message,true);}};
$('#relayReset').onclick=()=>{if(!state?.results.length||prompt('Type RESET to erase ONLY this Relay competition')!=='RESET')return;try{save(blank());notice('Relay results reset. Other competitions unchanged.');}catch(e){notice(e.message,true);}};
let tries=0;const t=setInterval(()=>{if((globalThis.tet2Garage||[]).length){clearInterval(t);init();}else if(++tries>100){clearInterval(t);notice('Garage timed out',true);}},50);
})();
