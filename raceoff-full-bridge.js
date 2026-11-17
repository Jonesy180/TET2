(()=>{'use strict';
const ID='race-off-full',LEGACY='TET2__RACEOFF_FULL_V010', $=id=>document.getElementById(id);
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let garage=[],lookup=new Map(),state=null,ready=false;
const CATEGORIES=['ROAD','OFFROAD','RALLY','HOT_WHEELS'];
function routePool(category){const tax=globalThis.rhFH5TrackTaxonomy8067;
 if(!tax||!tax.standardPool)throw Error('Original FH5 taxonomy unavailable');
 if(!CATEGORIES.includes(category))throw Error('Unsupported Race Off category');
 const pool=tax.standardPool(category);if(!Array.isArray(pool)||!pool.length)throw Error('Empty FH5 category');
 return pool;}
// Stable per-match pick, favouring unused tracks and avoiding the six most recent when possible.
// Deliberately self-contained; OTG! smart track selector requires the original OTG! application state.
function nextRoute(s){const pool=routePool(s.category||'ROAD'),used=(s.results||[]).map(x=>x.route).filter(Boolean),latest=new Set(used.slice(-6));
 const unseen=pool.filter(n=>!used.includes(n)&&!latest.has(n));
 const notRecent=pool.filter(n=>!latest.has(n));const choices=unseen.length?unseen:notRecent.length?notRecent:pool;
 let hash=(0x811c9dc5^(s.size*151)^(s.results.length*1009))>>>0;
 for(const c of String(s.category||'ROAD'))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 return choices[hash%choices.length];}

function seededField(size){const arr=garage.filter(c=>c?.id&&c?.name).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));let x=0x20ae2026;for(let i=arr.length-1;i>0;i--){x^=x<<13;x^=x>>>17;x^=x<<5;const j=(x>>>0)%(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];}return arr.slice(0,size).map(c=>c.id);}
function initial(size=32){return{app:'TET2',schema:1,kind:ID,size,category:'ROAD',field:seededField(size),results:[]};}
function replay(s){let round=s.field.slice(),cursor=0,semifinalLosers=[];let roundNumber=1;
 while(round.length>2){const next=[];for(let i=0;i<round.length;i+=2){const pair=[round[i],round[i+1]],entry=s.results[cursor];const stage=round.length===4?'SEMIFINAL':`ROUND ${roundNumber}`;
 if(!entry)return{next:{pair,stage},cursor};if(!pair.includes(entry.winner)||!pair.includes(entry.loser)||entry.winner===entry.loser||!pair.includes(entry.loser))throw Error('Invalid '+stage+' result '+(cursor+1));next.push(entry.winner);if(round.length===4)semifinalLosers.push(entry.loser);cursor++;}round=next;roundNumber++;}
 for(const [stage,pair] of [['BRONZE MEDAL DUEL',semifinalLosers],['FINAL',round]]){const entry=s.results[cursor];if(!entry)return{next:{stage,pair},cursor};if(!pair.includes(entry.winner)||!pair.includes(entry.loser)||entry.winner===entry.loser)throw Error('Invalid '+stage+' result');cursor++;}
 return{next:null,cursor,podium:[s.results[cursor-1].winner,s.results[cursor-1].loser,s.results[cursor-2].winner]};}
function parseTime(raw){
 const text=String(raw||'').trim();
 if(!/^\d{1,3}:[0-5]\d\.\d{3}$/.test(text))throw Error('Enter MM:SS.mmm for BOTH cars (example 03:36.784)');
 const [minutes,seconds,millis]=text.replace(':','.').split('.').map(Number);
 const ms=minutes*60000+seconds*1000+millis;
 if(ms<1000||ms>=86400000)throw Error('Race time must be at least 1 second and below 24 hours');
 return ms;
}
function fmt(ms){const m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),frac=ms%1000;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(frac).padStart(3,'0');}
function validate(s){if(!s||s.app!=='TET2'||s.schema!==1||s.kind!==ID||![32,64].includes(s.size)||!Array.isArray(s.field)||s.field.length!==s.size||new Set(s.field).size!==s.size||!s.field.every((id,i)=>id===seededField(s.size)[i])||!Array.isArray(s.results)||s.results.length>s.size)throw Error('Race Off bracket does not match Garage, size or schema');if(s.category!==undefined&&!CATEGORIES.includes(s.category))throw Error('Unknown FH5 track category');for(let i=0;i<s.results.length;i++){const r=s.results[i];if(r.route!==undefined){if(typeof r.route!=='string'||r.route!==nextRoute({...s,results:s.results.slice(0,i)}))throw Error('Incorrect or invalid saved FH5 route at match '+(i+1));}}for(const r of s.results)if(!r||typeof r.winner!=='string'||typeof r.loser!=='string')throw Error('Invalid results data');
 else if('times' in r){if(!r.times||typeof r.times!=='object'||Object.keys(r.times).length!==2||!Object.hasOwn(r.times,r.winner)||!Object.hasOwn(r.times,r.loser)||!Object.values(r.times).every(n=>Number.isInteger(n)&&n>=1000&&n<86400000)||r.times[r.winner]>=r.times[r.loser])throw Error('Invalid or tied head-to-head times');}const walked=replay(s);if(walked.cursor!==s.results.length)throw Error('Unreachable or extraneous match records');return s;}
function podium(s){try{if(!s)return null;return replay(validate(s)).podium||null;}catch{return null;}}
function status(m){$('bigNotice').textContent=m;}
function name(id){return lookup.get(id)||id;}
function render(){if(!ready||!state)return;const r=replay(state),done=!!r.podium,total=state.size;
 $('bigTitle').textContent=done?'🏆 BRACKET COMPLETE':r.next.stage+' READY';$('bigCategory').value=state.category||'ROAD';$('bigCategory').disabled=state.results.length>0;
 $('bigProgress').textContent=`${state.results.length}/${total} matches · ${total} unique entrants · bronze duel before final`;
 if(done){$('bigPanel').innerHTML=`<p class="live-big">🥇 ${escape(name(r.podium[0]))}</p><p>🥈 ${escape(name(r.podium[1]))}</p><p>🥉 ${escape(name(r.podium[2]))}</p><p class="flag">🛑 STOP HERE, YOU FUCKWIT!</p>`;}
 else{const [a,b]=r.next.pair;const track=nextRoute(state);$('bigPanel').innerHTML=`${state.results.length===0?'<p class="dim">Choose field size before recording the first match.</p><div class="lab-actions"><button id="size32">32 cars</button><button id="size64">64 cars</button></div>':''}<div class="route-feature"><small>🏁 THIS MATCH · ${escape(state.category||'ROAD')}</small><strong>${escape(track)}</strong><span class="dim">Canonical FH5 course · saved with result</span></div><p class="live-big">${escape(name(a))} <span class="dim">VS</span> ${escape(name(b))}</p><div class="time-duel"><label><span>${escape(name(a))}</span><input id="bigTimeA" type="text" inputmode="decimal" autocomplete="off" placeholder="03:36.784" aria-label="Time for ${escape(name(a))}"></label><label><span>${escape(name(b))}</span><input id="bigTimeB" type="text" inputmode="decimal" autocomplete="off" placeholder="03:37.210" aria-label="Time for ${escape(name(b))}"></label></div><button id="bigTimedBank" class="action">⏱️ BANK BOTH TIMES · FASTEST ADVANCES</button><details class="winner-only"><summary>Engineering fallback: winner only (no recorded times)</summary><div class="lab-actions"><button id="bigA" class="action">🏁 ${escape(name(a))} WINS</button><button id="bigB" class="action">🏁 ${escape(name(b))} WINS</button></div></details>`;
 $('bigTimedBank').onclick=()=>bankTimed(a,b);$('bigTimeB').addEventListener('keydown',e=>{if(e.key==='Enter')bankTimed(a,b)});
 $('bigA').onclick=()=>bank(a,b);$('bigB').onclick=()=>bank(b,a);
 if($('size32'))$('size32').onclick=()=>resize(32);if($('size64'))$('size64').onclick=()=>resize(64);
 }
 const last=state.results.slice(-16),start=state.results.length-last.length;
 $('bigHistory').innerHTML=`<p class="dim">Latest ${last.length} saved matches · full round structure is calculated from saved outcomes.</p>`+(last.length?'<table class="mini-table"><thead><tr><th>Match</th><th>Winner</th><th>Loser</th><th>Times</th><th>Track</th></tr></thead><tbody>'+last.map((m,i)=>`<tr><td>${start+i+1}</td><td>${escape(name(m.winner))}</td><td>${escape(name(m.loser))}</td><td>${m.times?escape(fmt(m.times[m.winner])+' / '+fmt(m.times[m.loser])):'Winner only'}</td><td>${escape(m.route||'Legacy · not recorded')}</td></tr>`).join('')+'</tbody></table>':'<p class="dim">No results yet.</p>');
 $('bigUndo').disabled=!state.results.length;$('bigReset').disabled=!state.results.length&&state.size===32;
}
function persist(s){globalThis.TET2Registry.save(ID,validate(s));}
function bankTimed(a,b){try{
 const ta=parseTime($('bigTimeA').value),tb=parseTime($('bigTimeB').value);
 if(ta===tb)throw Error('Identical times: resolve the tie before advancing');
 const winner=ta<tb?a:b,loser=ta<tb?b:a;
 bank(winner,loser,{times:{[a]:ta,[b]:tb}});
 }catch(e){status('Timed result refused: '+e.message);}}
function bank(winner,loser,extra={}){try{if(replay(state).podium)throw Error('Bracket complete');persist({...state,results:[...state.results,{winner,loser,route:nextRoute(state),...extra}]});status('Result banked. '+(podium(state)?'All medals awarded.':'Next match ready.'));}catch(e){status('Save refused: '+e.message);}}
function categoryChange(category){try{if(state.results.length)throw Error('Category locked after first match');if(!CATEGORIES.includes(category))throw Error('Unsupported category');persist({...state,category});status('Category selected: '+category+'. The next match track is ready.');}catch(e){status(e.message);render();}}
function resize(size){try{if(state.results.length)throw Error('Reset results before changing size');persist(initial(size));status(size+'-car field selected.');}catch(e){status(e.message);}}
function init(){try{garage=globalThis.tet2Garage||[];if(garage.length!==704)throw Error('Garage unavailable: expected 704 cars');lookup=new Map(garage.map(c=>[c.id,c.name]));ready=true;globalThis.TET2Registry.register(ID,{legacyKey:LEGACY,blank:initial,validate,apply(s){state=s;render();}});status('Independent full-size bracket connected.');}catch(e){$('bigTitle').textContent='BRACKET UNAVAILABLE';status(e.message);}}
$('bigCategory').onchange=e=>categoryChange(e.target.value);
$('bigUndo').onclick=()=>{if(state.results.length&&confirm('Undo latest full-size Race Off result?')){try{persist({...state,results:state.results.slice(0,-1)});status('Latest result undone.');}catch(e){status(e.message);}}};
$('bigReset').onclick=()=>{if(prompt('Type RESET to erase only this engineering bracket')==='RESET'){try{persist(initial());status('Full-size bracket reset. Other competitions unchanged.');}catch(e){status(e.message);}}};
globalThis.TET2BigRaceOff={podium,validate,replay,initial,parseTime,fmt,nextRoute,routePool};
let tries=0,timer=setInterval(()=>{if((globalThis.tet2Garage||[]).length){clearInterval(timer);init();}else if(++tries>120){clearInterval(timer);status('Garage did not load.');}},50);
})();
