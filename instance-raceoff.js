(()=>{'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATEGORIES=['ROAD','OFFROAD','RALLY','HOT_WHEELS'],reg=globalThis.TET2Registry;
let garage=[],names=new Map(),activeId=null,ready=false;
function throwIf(condition,msg){if(condition)throw Error(msg);}
function shuffle(size,seed){const arr=garage.slice().sort((a,b)=>a.id.localeCompare(b.id));let x=seed>>>0;for(let i=arr.length-1;i>0;i--){x^=x<<13;x^=x>>>17;x^=x<<5;let j=(x>>>0)%(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];}return arr.slice(0,size).map(c=>c.id);}
function routePool(cat){const pool=globalThis.rhFH5TrackTaxonomy8067?.standardPool(cat);throwIf(!Array.isArray(pool)||pool.length===0,'Donor FH5 route catalogue unavailable');return pool;}
function nextRoute(s){const pool=routePool(s.category),previous=s.results.map(r=>r.route),recent=new Set(previous.slice(-6));let available=pool.filter(x=>!previous.includes(x)&&!recent.has(x));if(!available.length)available=pool.filter(x=>!recent.has(x));if(!available.length)available=pool;
 let h=(s.seed^Math.imul(s.results.length+1,2654435761))>>>0;for(const c of s.category)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return available[h%available.length];}
function replay(s){let field=s.field.slice(),cursor=0,roundNo=1,losers=[];
 while(field.length>2){const win=[];for(let i=0;i<field.length;i+=2){const pair=[field[i],field[i+1]],record=s.results[cursor],stage=field.length===4?'SEMIFINAL':`ROUND ${roundNo}`;
  if(!record)return{next:{pair,stage},cursor};if(!pair.includes(record.winner)||!pair.includes(record.loser)||record.winner===record.loser)throw Error('Match does not belong to '+stage);win.push(record.winner);if(field.length===4)losers.push(record.loser);cursor++;}
  field=win;roundNo++;
 }
 for(const [stage,pair]of [['BRONZE MEDAL DUEL',losers],['FINAL',field]]){const result=s.results[cursor];if(!result)return{next:{stage,pair},cursor};if(!pair.includes(result.winner)||!pair.includes(result.loser)||result.winner===result.loser)throw Error('Invalid '+stage);cursor++;}
 return{next:null,cursor,podium:[s.results[cursor-1].winner,s.results[cursor-1].loser,s.results[cursor-2].winner]};
}
function validate(s){throwIf(!s||s.format!=='TET2_INSTANCE'||s.schema!==1||s.kind!=='race-off-full'||!/^ro-[a-z0-9-]{5,70}$/.test(s.id)||![32,64].includes(s.size)||!CATEGORIES.includes(s.category)||!Number.isInteger(s.seed)||s.seed<1||s.seed>0xffffffff||typeof s.createdAt!=='string','Invalid Race Off instance header');
 throwIf(!Array.isArray(s.field)||s.field.length!==s.size||s.field.some((x,i)=>x!==shuffle(s.size,s.seed)[i]),'Car draw differs from locked field');
 throwIf(!Array.isArray(s.results)||s.results.length>s.size,'Unexpected match records');
 for(let i=0;i<s.results.length;i++){const rec=s.results[i];throwIf(!rec||typeof rec.winner!=='string'||typeof rec.loser!=='string'||typeof rec.route!=='string'||rec.route!==nextRoute({...s,results:s.results.slice(0,i)}),'Incorrect track at match '+(i+1));
  const times=rec.times;throwIf(!times||typeof times!=='object'||Object.keys(times).length!==2||!Object.hasOwn(times,rec.winner)||!Object.hasOwn(times,rec.loser)||!Object.values(times).every(v=>Number.isInteger(v)&&v>=1000&&v<86400000)||times[rec.winner]>=times[rec.loser],'Invalid timed result at match '+(i+1));
 }
 throwIf(replay(s).cursor!==s.results.length,'Extra match records');return s;
}
function parseTime(text){text=String(text||'').trim();throwIf(!/^\d{1,3}:[0-5]\d\.\d{3}$/.test(text),'Use MM:SS.mmm, e.g. 03:36.784');const [m,ss,ms]=text.replace(':','.').split('.').map(Number);let t=m*60000+ss*1000+ms;throwIf(t<1000||t>=86400000,'Race time out of range');return t;}
function fmt(ms){return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms%60000/1000)).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
function newId(){const b=new Uint32Array(2);crypto.getRandomValues(b);return 'ro-'+b[0].toString(36)+'-'+b[1].toString(36);}
function create(size=32,category='ROAD'){throwIf(!ready,'Garage / instance engine not available');throwIf(![32,64].includes(Number(size))||!CATEGORIES.includes(category),'Invalid Race Off options');const seed=new Uint32Array(1);crypto.getRandomValues(seed);if(!seed[0])seed[0]=1;const s={format:'TET2_INSTANCE',schema:1,kind:'race-off-full',id:newId(),size:Number(size),category,seed:seed[0],createdAt:new Date().toISOString(),field:shuffle(Number(size),seed[0]),results:[]};reg.addInstance(s);return s.id;}
function status(s){if(!s)return{done:false,progress:'Unknown event'};try{const r=replay(s);return{done:!!r.podium,podium:r.podium||null,progress:`${s.results.length}/${s.size} matches`,stage:r.next?.stage||'COMPLETE'};}catch(e){return{done:false,progress:'INVALID RECORD: '+e.message};}}
function open(id){if(!ready)throw Error('Racing engine not ready');if(!reg.getInstance(id))throw Error('Competition not found');activeId=id;globalThis.tet2Navigate("instance-raceoff");render();}
function notify(msg,bad=false){$('instNotice').textContent=msg;$('instNotice').className=bad?'status-warn':'status-ok';}
function render(){if(!activeId)return;const s=reg.getInstance(activeId);if(!s)return notify('Competition not found',true);try{validate(s);const r=replay(s);$('instTitle').textContent=r.podium?'🏆 BRACKET COMPLETE':r.next.stage+' — READY';$('instMeta').textContent=`${s.size}-car ${s.category} · ${s.results.length}/${s.size} matches · ID ${s.id}`;
  if(r.podium){$('instPanel').innerHTML=`<p class="live-big">🥇 ${esc(names.get(r.podium[0])||r.podium[0])}</p><p>🥈 ${esc(names.get(r.podium[1])||r.podium[1])}</p><p>🥉 ${esc(names.get(r.podium[2])||r.podium[2])}</p><div class="flag">🛑 STOP HERE, YOU FUCKWIT!</div>`;}
  else{const [a,b]=r.next.pair,route=nextRoute(s);$('instPanel').innerHTML=`<div class="route-feature"><small>🏁 ${esc(s.category)} · ${esc(r.next.stage)}</small><strong>${esc(route)}</strong></div><p class="live-big">${esc(names.get(a)||a)} <span class="dim">VS</span> ${esc(names.get(b)||b)}</p><div class="time-duel"><label><span>${esc(names.get(a)||a)}</span><input id="instTimeA" type="text" inputmode="decimal" autocomplete="off" placeholder="03:36.784" /></label><label><span>${esc(names.get(b)||b)}</span><input id="instTimeB" type="text" inputmode="decimal" autocomplete="off" placeholder="03:37.210" /></label></div><button id="instBank" class="action">BANK BOTH TIMES → NEXT MATCH</button>`;
   $('instBank').onclick=()=>bank(a,b);$('instTimeB').onkeydown=e=>{if(e.key==='Enter')bank(a,b)};
  }
  $('instHistory').innerHTML=s.results.length?`<table class="mini-table"><thead><tr><th>#</th><th>Winner</th><th>Loser</th><th>Track</th></tr></thead><tbody>${s.results.slice(-16).map((v,i)=>`<tr><td>${s.results.length-Math.min(s.results.length,16)+i+1}</td><td>${esc(names.get(v.winner)||v.winner)}</td><td>${esc(names.get(v.loser)||v.loser)}</td><td>${esc(v.route)}</td></tr>`).join('')}</tbody></table>`:'<p class="dim">No matches recorded.</p>';
  $('instUndo').disabled=!s.results.length;
 }catch(e){notify('Invalid competition: '+e.message,true);}}
function bank(a,b){try{const ta=parseTime($('instTimeA').value),tb=parseTime($('instTimeB').value);throwIf(ta===tb,'Tied times cannot advance; rerun the race.');const winner=ta<tb?a:b,loser=ta<tb?b:a;const s=reg.getInstance(activeId),route=nextRoute(s);reg.saveInstance(activeId,{...s,results:[...s.results,{winner,loser,route,times:{[a]:ta,[b]:tb}}]});notify(`Result saved: ${names.get(winner)||winner} wins. Next match ready.`);render();}catch(e){notify('Save refused: '+e.message,true);}}
function undo(){const s=reg.getInstance(activeId);if(!s?.results?.length)return;if(!confirm('Undo only the latest match in THIS independent competition?'))return;try{reg.saveInstance(activeId,{...s,results:s.results.slice(0,-1)});notify('Last match undone.');render();}catch(e){notify(e.message,true);}}
$('instUndo').onclick=undo;$('instBack').onclick=()=>document.querySelector('[data-go="list"]')?.click();
let tries=0,timer=setInterval(()=>{if((globalThis.tet2Garage||[]).length){clearInterval(timer);try{garage=globalThis.tet2Garage;names=new Map(garage.map(x=>[x.id,x.name]));reg.registerInstanceValidator(validate);ready=true;reg.subscribe(()=>{if(activeId)render()});notify('Independent Race Off instances ready.');}catch(e){notify('Instance engine failed: '+e.message,true);}}else if(++tries>120){clearInterval(timer);notify('Garage was not available',true);}},50);
globalThis.TET2Instances={create,open,status,replay,validate,parseTime,fmt,get ready(){return ready;}};
})();