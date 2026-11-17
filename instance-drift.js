/* TET2 v0.20 — DRIFT FESTIVAL SCORE engineering pilot, ANDY ONLY.
 * Reproduces scoring semantics from the genuine OTG! v8.0.259 R1 Drift Festival
 * adapter: integer nonnegative scores on frozen zones, highest SUM wins.
 * Original 20 zones imported unchanged. Three zones & 8/16 entrants are TET2
 * engineering sizes, NOT an assertion about the forthcoming final tournament.
 */
(()=>{'use strict';
const reg=globalThis.TET2Registry,$=id=>document.getElementById(id),zones=globalThis.TET2DriftZones;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const req=(c,m)=>{if(!c)throw Error(m);};
let garage=[],byId=new Map(),ready=false,active=null;
const newseed=()=>{const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]||1;};
const newid=()=>{const v=new Uint32Array(2);crypto.getRandomValues(v);return 'ds-'+v[0].toString(36)+'-'+v[1].toString(36);};
// Fixed seeded shuffle to keep frozen records verifiable against owned Garage.
function shuffle(source,seed){let n=seed>>>0;function rand(){n=(n+0x6D2B79F5)|0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
 const a=source.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const field=(size,seed)=>shuffle(garage.map(x=>x.id),seed).slice(0,size);
const zoneSelection=seed=>shuffle(zones,seed^0xF095259).slice(0,3);
function parseScore(raw){const s=String(raw??'').trim();req(/^\d{1,10}$/.test(s),'Enter a whole non-negative zone score (up to 10 digits)');const n=Number(s);req(Number.isSafeInteger(n),'Score out of range');return n;}
function next(s){const i=s.results.length;if(i>=s.size*3)return null;return{zoneIndex:Math.floor(i/s.size),carIndex:i%s.size,zone:s.zones[Math.floor(i/s.size)],carId:s.field[i%s.size]};}
function standings(s){const total=new Map(s.field.map(id=>[id,0])),count=new Map(s.field.map(id=>[id,0]));for(const r of s.results){total.set(r.carId,total.get(r.carId)+r.score);count.set(r.carId,count.get(r.carId)+1);}
 const rows=s.field.map(id=>({carId:id,total:total.get(id),count:count.get(id)}));rows.sort((a,b)=>b.total-a.total||a.carId.localeCompare(b.carId));let prev=null,place=0;return rows.map((r,i)=>{if(r.total!==prev){place=i+1;prev=r.total;}return{...r,place};});}
function podium(s){if(s.results.length!==s.size*3)return null;const a=standings(s),count=Math.min(3,a.length);for(let i=1;i<count;i++)if(a[i].total===a[i-1].total)return null;if(a.length>count&&a[count-1].total===a[count].total)return null;return a.slice(0,count).map(r=>r.carId);}
function validate(s){req(ready,'Drift Score Garage not ready');req(s?.format==='TET2_INSTANCE'&&s.schema===1&&s.kind==='drift-score'&&/^ds-[a-z0-9-]{5,70}$/.test(s.id),'Drift instance identity invalid');
 req((s.size===8||s.size===16)&&Number.isInteger(s.seed)&&s.seed>0&&s.seed<=0xffffffff&&typeof s.createdAt==='string','Drift event header invalid');
 req(s.category==='DRIFT'&&JSON.stringify(s.field)===JSON.stringify(field(s.size,s.seed)),'Drift entrant field changed');
 req(Array.isArray(zones)&&zones.length===20&&JSON.stringify(s.zones)===JSON.stringify(zoneSelection(s.seed)),'Drift zone assignments changed');
 req(Array.isArray(s.results)&&s.results.length<=s.size*3,'Drift result count invalid');
 for(let i=0;i<s.results.length;i++){const r=s.results[i],zi=Math.floor(i/s.size);req(r?.zoneIndex===zi&&r.carId===s.field[i%s.size]&&r.zone===s.zones[zi]&&Number.isSafeInteger(r.score)&&r.score>=0&&r.score<=9999999999,'Invalid or out-of-order Drift result '+(i+1));}return s;}
function create(size){req(ready&&[8,16].includes(size),'Drift engine unavailable or invalid size');const seed=newseed(),s={format:'TET2_INSTANCE',schema:1,id:newid(),kind:'drift-score',category:'DRIFT',size,seed,createdAt:new Date().toISOString(),field:field(size,seed),zones:zoneSelection(seed),results:[]};reg.addInstance(s);return s.id;}
function status(s){if(!s)return{done:false,progress:'Missing Drift Score event'};const p=podium(s),max=s.size*3;return{done:!!p,podium:p,progress:`${s.results.length}/${max} Drift Zone scores · ${s.size} cars${s.results.length===max&&!p?' · podium tie (unresolved)':''}`,label:`Drift Score · ${s.size} cars`};}
function message(x,bad=false){const n=$('driftNotice');if(n){n.textContent=x;n.className=bad?'status-warn':'status-ok';}}
function render(){if(!active||!ready)return;const s=reg.getInstance(active);if(!s)return;try{
 const n=next(s),p=podium(s),a=standings(s),max=s.size*3;
 $('driftTitle').textContent=n?`DRIFT SCORE · ZONE ${n.zoneIndex+1}/3 · CAR ${n.carIndex+1}/${s.size}`:p?'🏆 DRIFT ZONE CHAMPIONSHIP COMPLETE':'ALL SCORES BANKED — PODIUM TIE';
 $('driftMeta').textContent=`${s.results.length}/${max} saved scores · ${s.size} entrants · ${s.id}`;
 $('driftZones').innerHTML=s.zones.map((z,i)=>`<div class="car"><small>ZONE ${i+1} · SAME ZONE FOR ALL CARS</small><strong>${esc(z)}</strong></div>`).join('');
 if(n){const c=byId.get(n.carId);$('driftEntry').innerHTML=`<div class="route-feature"><small>💨 DRIFT ZONE ${n.zoneIndex+1} / 3</small><strong>${esc(n.zone)}</strong></div><p class="live-big">${esc(c?.name||n.carId)}</p><div class="live-flex"><input type="text" id="driftScore" inputmode="numeric" autocomplete="off" pattern="[0-9]*" placeholder="Whole-number score" aria-label="Drift Zone score"><button class="action" id="driftBank">BANK SCORE → NEXT CAR</button></div>`;$('driftBank').onclick=bank;$('driftScore').onkeydown=e=>{if(e.key==='Enter')bank();};}
 else if(p){$('driftEntry').innerHTML=p.map((id,i)=>`<p class="live-big">${['🥇','🥈','🥉'][i]} ${esc(byId.get(id)?.name||id)}</p>`).join('')+'<p class="flag">🛑 STOP HERE, YOU FUCKWIT!</p>';}
 else $('driftEntry').innerHTML='<p class="status-warn">Scores complete, but a medal position is tied. Correct a score below to settle the podium. No medals have been awarded.</p>';
 $('driftStandings').innerHTML='<table class="mini-table"><thead><tr><th>Place</th><th>Car</th><th>Zones</th><th>Points</th></tr></thead><tbody>'+a.map(x=>`<tr><td>${x.place}</td><td>${esc(byId.get(x.carId)?.name||x.carId)}</td><td>${x.count}/3</td><td>${x.total.toLocaleString()}</td></tr>`).join('')+'</tbody></table>';
 $('driftHistory').innerHTML=s.results.slice(-8).map(r=>`<div class="car"><small>${esc(r.zone)}</small><strong>${esc(byId.get(r.carId)?.name||r.carId)} · ${r.score.toLocaleString()}</strong></div>`).join('')||'<p class="dim">No scores yet.</p>';
 $('driftCorrection').innerHTML='<option value="">Choose saved score…</option>'+s.results.map((r,i)=>`<option value="${i}">${i+1}. ${esc(byId.get(r.carId)?.name||r.carId)} · ${esc(r.zone)} · ${r.score}</option>`).join('');
 $('driftUndo').disabled=!s.results.length;$('driftCorrectBtn').disabled=!s.results.length;
 }catch(e){message('Drift display error: '+e.message,true);}}
function open(id){req(ready&&reg.getInstance(id)?.kind==='drift-score','Unknown Drift Score competition');active=id;globalThis.tet2Navigate('instance-drift');render();}
function bank(){try{const s=reg.getInstance(active),n=next(s);req(n,'No further score required');const score=parseScore($('driftScore').value);reg.saveInstance(s.id,{...s,results:[...s.results,{carId:n.carId,zoneIndex:n.zoneIndex,zone:n.zone,score}]});message('Score banked — next car ready.');}catch(e){message('Score rejected: '+e.message,true);}}
function correct(){try{const s=reg.getInstance(active),v=$('driftCorrection').value,i=Number(v);req(v!==''&&Number.isInteger(i)&&i>=0&&i<s.results.length,'Choose saved score to correct');const score=parseScore($('driftCorrectScore').value);reg.saveInstance(s.id,{...s,results:s.results.map((r,j)=>j===i?{...r,score}:r)});message('Score corrected and standings recalculated.');}catch(e){message('Correction refused: '+e.message,true);}}
function undo(){const s=reg.getInstance(active);if(!s?.results?.length)return;if(!confirm('Undo ONLY the most recent Drift score in this competition?'))return;try{reg.saveInstance(s.id,{...s,results:s.results.slice(0,-1)});message('Latest Drift score undone.');}catch(e){message('Undo refused: '+e.message,true);}}
$('driftUndo').onclick=undo;$('driftCorrectBtn').onclick=correct;$('driftBack').onclick=()=>globalThis.tet2Navigate('list');
const timer=setInterval(()=>{if(globalThis.tet2Garage?.length){clearInterval(timer);try{garage=globalThis.tet2Garage;byId=new Map(garage.map(c=>[c.id,c]));req(garage.length===704&&byId.size===704,'Frozen Garage has changed; Drift pilot stopped');req(Array.isArray(zones)&&zones.length===20,'Exact source Drift Zone list unavailable');ready=true;reg.registerInstanceValidator('drift-score',validate);reg.subscribe(()=>{if(active)render();});message('Drift Score engineering pilot ready.');}catch(e){message('Drift engine unavailable: '+e.message,true);}}},50);
globalThis.TET2Drift={create,open,validate,status,standings,podium,parseScore,next,get ready(){return ready;}};
})();
