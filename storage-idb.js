/* TET2 v0.17 — PRIVATE GRANULAR IndexedDB save engine.
 *  - SAME private DB name as v0.16, database schema upgraded 1 -> 2.
 *  - Migrates/checks genuine v0.16 whole-registry primary without deleting it.
 *  - Atomic, per-record event/instance/plan updates (NOT a registry rewrite).
 *  - Serialized optimistic UI, revision CAS, readback verification, safe stop.
 *  - Previous-commit delta kept for downloadable checkpoint reconstruction.
 *  - IndexedDB is origin-bound: use a separate private HTTPS origin from OTG!.
 */
(()=>{'use strict';
const DB_NAME='TET2_PRIVATE_DATA_V1', SOURCE='TET2__REGISTRY_V05';
const LEGACY='snapshots',RECORDS='records',CONTROL='control',UNDO='undo';
const ROOT_FORMAT='TET2_REGISTRY',HEAD_FORMAT='TET2_GRANULAR_HEAD_V1',REC_FORMAT='TET2_GRANULAR_RECORD_V1',OLD_FORMAT='TET2_IDB_PRIMARY';
const encoder=new TextEncoder();
let db=null,cache=null,ready=false,blocked=null,revision=0,pending=0,tail=Promise.resolve(),migrated='';
let recordCount=0,lastCommitRecords=0,writeOps=0;
const byId=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const empty=()=>({format:ROOT_FORMAT,schema:1,events:{},instances:{},plan:{format:'TET2_EVIL_LIST_DRAFT',schema:2,slots:[]}});
function minimal(x){if(!x||x.format!==ROOT_FORMAT||x.schema!==1||!x.events||typeof x.events!=='object'||Array.isArray(x.events)||x.instances!==undefined&&(!x.instances||typeof x.instances!=='object'||Array.isArray(x.instances))||x.plan!==undefined&&(!x.plan||!Array.isArray(x.plan.slots)))throw Error('Unrecognised TET2 saved-data format');return x;}
function normal(x){minimal(x);const y=clone(x);if(!y.instances)y.instances={};if(!y.plan)y.plan=empty().plan;return y;}
function canonical(x){if(Array.isArray(x))return x.map(canonical);if(x&&typeof x==='object'){const o={};for(const k of Object.keys(x).sort())o[k]=canonical(x[k]);return o;}return x;}
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
async function sha(raw){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(raw))),x=>x.toString(16).padStart(2,'0')).join('');}
const isHex=x=>/^[0-9a-f]{64}$/.test(x||'');
function open(){return new Promise((ok,no)=>{const req=indexedDB.open(DB_NAME,2);req.onupgradeneeded=()=>{const b=req.result;for(const name of [LEGACY,RECORDS,CONTROL,UNDO])if(!b.objectStoreNames.contains(name))b.createObjectStore(name,{keyPath:'id'});};req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error||Error('Private IndexedDB open failed'));req.onblocked=()=>no(Error('Another tab blocks the private database upgrade. Close it and reopen TET2.'));});}
function get(store,id){return new Promise((ok,no)=>{const tx=db.transaction(store,'readonly'),q=tx.objectStore(store).get(id);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>no(q.error||Error(store+' read failed'));tx.onabort=()=>no(tx.error||Error(store+' read aborted'));});}
function all(store){return new Promise((ok,no)=>{const tx=db.transaction(store,'readonly'),q=tx.objectStore(store).getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error||Error(store+' list failed'));tx.onabort=()=>no(tx.error||Error(store+' list aborted'));});}
function transact(stores,callback){return new Promise((ok,no)=>{const tx=db.transaction(stores,'readwrite');let aborted=false;tx.oncomplete=()=>ok();tx.onerror=()=>{if(!aborted){aborted=true;no(tx.error||Error('IndexedDB transaction failed'));}};tx.onabort=()=>{if(!aborted){aborted=true;no(tx.error||Error('IndexedDB transaction aborted'));}};try{callback(tx,(message)=>{if(!aborted){aborted=true;no(Error(message));}try{tx.abort();}catch(_){}});}catch(e){if(!aborted){aborted=true;no(e);}try{tx.abort();}catch(_){}}});}
function rowId(kind,id){return kind+':'+id;}
function toMap(root){const d=normal(root),m=new Map();for(const [id,v] of Object.entries(d.events))m.set(rowId('e',id),JSON.stringify(v));for(const [id,v] of Object.entries(d.instances))m.set(rowId('i',id),JSON.stringify(v));m.set('p:plan',JSON.stringify(d.plan));return m;}
function recordFrom(id,raw){if(!/^(e|i):[a-z0-9-]{1,85}$/.test(id)&&id!=='p:plan')throw Error('Invalid granular record ID '+id);return{id,format:REC_FORMAT,raw};}
async function prepared(id,raw){const base=recordFrom(id,raw);return {...base,sha256:await sha(raw),updatedAt:new Date().toISOString()};}
async function verifyRow(row){if(!row||row.format!==REC_FORMAT||typeof row.raw!=='string'||!isHex(row.sha256)||!row.id)throw Error('Malformed private event record');recordFrom(row.id,row.raw);if(await sha(row.raw)!==row.sha256)throw Error('Private event record checksum mismatch: '+row.id);return JSON.parse(row.raw);}
async function verifyLegacy(row){if(!row||row.format!==OLD_FORMAT||typeof row.raw!=='string'||!isHex(row.sha256)||!Number.isInteger(row.revision)||row.revision<0)throw Error('v0.16 snapshot missing or malformed');if(await sha(row.raw)!==row.sha256)throw Error('Legacy primary checksum mismatch');return normal(JSON.parse(row.raw));}
function checkHead(head){if(!head||head.format!==HEAD_FORMAT||head.id!=='head'||!Number.isInteger(head.revision)||head.revision<0||!Number.isInteger(head.recordCount)||head.recordCount<1||!Number.isInteger(head.eventsCount)||head.eventsCount<0||!Number.isInteger(head.instancesCount)||head.instancesCount<0||head.recordCount!==head.eventsCount+head.instancesCount+1)throw Error('Private database head corrupt or incomplete');}
async function decodeRows(head,rows){checkHead(head);if(rows.length!==head.recordCount)throw Error('Database is missing event records; expected '+head.recordCount+', found '+rows.length);const x=empty(),seen=new Set();for(const row of rows){if(seen.has(row.id))throw Error('Duplicate private record '+row.id);seen.add(row.id);const value=await verifyRow(row);if(row.id==='p:plan')x.plan=value;else if(row.id.startsWith('e:'))x.events[row.id.slice(2)]=value;else if(row.id.startsWith('i:'))x.instances[row.id.slice(2)]=value;else throw Error('Unknown private record '+row.id);}if(!seen.has('p:plan')||Object.keys(x.events).length!==head.eventsCount||Object.keys(x.instances).length!==head.instancesCount)throw Error('Event/instance counts fail database integrity check');return normal(x);}
async function readPrimary(){
 // Read head + rows in ONE readonly transaction so another tab cannot splice two revisions.
 const pair=await new Promise((ok,no)=>{const tx=db.transaction([CONTROL,RECORDS],'readonly');let head=null,rows=null;const h=tx.objectStore(CONTROL).get('head'),r=tx.objectStore(RECORDS).getAll();h.onsuccess=()=>{head=h.result||null;};r.onsuccess=()=>{rows=r.result;};tx.oncomplete=()=>ok({head,rows});tx.onerror=()=>no(tx.error||Error('Private database read failed'));tx.onabort=()=>no(tx.error||Error('Private database read aborted'));});
 if(!pair.head)return null;return{head:pair.head,state:await decodeRows(pair.head,pair.rows)};
}
async function bootstrap(root,baseRevision){const x=normal(root),map=toMap(x),preparedRows=await Promise.all([...map].map(([k,v])=>prepared(k,v)));const head={id:'head',format:HEAD_FORMAT,revision:baseRevision,recordCount:map.size,eventsCount:Object.keys(x.events).length,instancesCount:Object.keys(x.instances).length,updatedAt:new Date().toISOString()};
 const orphaned=await all(RECORDS);if(orphaned.length)throw Error('Granular data exists but database head is missing; refusing destructive reinitialisation');
 await transact([RECORDS,CONTROL],tx=>{for(const row of preparedRows)tx.objectStore(RECORDS).put(row);tx.objectStore(CONTROL).put(head);});
 const read=await readPrimary();if(!read||!equal(read.state,x)||read.head.revision!==baseRevision)throw Error('Granular migration failed readback verification');return read;
}
function status(){return{ready,blocked:String(blocked?.message||''),pending,revision,migrated,backend:'IndexedDB granular',database:DB_NAME,recordCount,lastCommitRecords,writeOps};}
function paint(){const n=byId('storageIndicator'),full=byId('storageStatusFull');const title=blocked?'⛔ SAVE FAILURE — SAFE STOP':!ready?'💾 VERIFYING PRIVATE STORAGE':pending?`💾 SAVING ${pending} CHANGE${pending===1?'':'S'}…`:`✅ INDEXEDDB SAVED · REV ${revision}`;
 if(n){n.textContent=title;n.classList.toggle('storage-bad',!!blocked);n.classList.toggle('storage-pending',!!pending&&!blocked);}
 if(full)full.textContent=`Primary: granular IndexedDB (${DB_NAME}) · revision ${revision} · ${recordCount} stored records · ${pending} pending write(s) · ${blocked?'SAFE STOP: '+blocked.message:'database online'}${migrated?' · '+migrated:''}.`;
 const box=byId('storageFault');if(box){box.hidden=!blocked;if(blocked)box.textContent='⛔ SAVE FAILURE: '+blocked.message+'. Do not continue racing. Export the unsaved emergency copy. Existing OTG! data is untouched.';}
}
function stop(error){if(!blocked){blocked=error instanceof Error?error:Error(String(error));console.error('TET2 IDB SAFE STOP',blocked);}paint();if(!ready||byId('tet2SaveStopOverlay'))return;const cover=document.createElement('div');cover.id='tet2SaveStopOverlay';cover.className='storage-gate storage-gate-failed';cover.innerHTML='<div class="storage-gate-card"><h2>⛔ TET2 SAVE FAILURE — RACING STOPPED</h2><p id="tet2FailureText"></p><p>Some results may not have been durably committed. Export the current emergency state, and do not clear browser storage.</p><button type="button" id="tet2FailureEmergency">⬇ UNSAVED STATE</button> <button type="button" id="tet2FailurePrevious">⬇ PREVIOUS CHECKPOINT</button></div>';document.body.append(cover);byId('tet2FailureText').textContent=blocked.message;byId('tet2FailureEmergency').onclick=()=>{try{emergency();}catch(e){alert(e.message);}};byId('tet2FailurePrevious').onclick=async()=>{try{await previous();}catch(e){alert(e.message);}};}
async function init(){if(ready)return status();try{if(!globalThis.indexedDB||!globalThis.crypto?.subtle)throw Error('Private HTTPS/localhost origin plus IndexedDB and Web Crypto required; file:// is not supported');db=await open();db.onversionchange=()=>{stop(Error('A different tab upgraded the private database'));db.close();};
 let state=await readPrimary();if(state){migrated='Verified granular primary';}
 else {const older=await get(LEGACY,'primary');if(older){const original=await verifyLegacy(older);state=await bootstrap(original,older.revision);migrated='Verified v0.16 primary → granular records; old primary preserved';}
 else {const legacy=localStorage.getItem(SOURCE);const data=legacy?normal(JSON.parse(legacy)):empty();state=await bootstrap(data,0);migrated=legacy?'Verified TET2 localStorage → granular records; source preserved':'New empty granular private database';}}
 cache=state.state;revision=state.head.revision;recordCount=state.head.recordCount;ready=true;paint();return status();}catch(e){stop(e);throw e;}}
// One transaction updates *only* changed records, their one-revision undo delta and small revision head.
async function commit(delta,expected,counts){const rows=await Promise.all([...delta].map(async([id,raw])=>raw===null?[id,null]:[id,await prepared(id,raw)]));let conflict='';
 await new Promise((ok,no)=>{const tx=db.transaction([RECORDS,CONTROL,UNDO],'readwrite'),rec=tx.objectStore(RECORDS),ctl=tx.objectStore(CONTROL),undo=tx.objectStore(UNDO);let failed=false;tx.oncomplete=()=>ok();tx.onerror=()=>{if(!failed){failed=true;no(tx.error||Error('Granular save transaction failed'));}};tx.onabort=()=>{if(!failed){failed=true;no(Error(conflict||tx.error?.message||'Granular save transaction aborted'));}};
 const req=ctl.get('head');req.onerror=()=>{conflict='Cannot read current database revision';tx.abort();};req.onsuccess=()=>{const head=req.result;if(!head||head.revision!==expected){conflict='Another tab changed TET2 data. STOP: export current data and reload only after checking backups.';tx.abort();return;}try{checkHead(head);}catch(e){conflict=e.message;tx.abort();return;}
 // Clear last delta and save the original rows needed to reconstruct previous revision.
 undo.clear();undo.put({id:'checkpoint',previousRevision:expected,currentRevision:expected+1,changed:rows.map(([id])=>id)});
 for(const [id,next]of rows){const old=rec.get(id);old.onsuccess=()=>{undo.put({id,before:old.result||null});if(next===null)rec.delete(id);else rec.put(next);};}
 ctl.put({id:'head',format:HEAD_FORMAT,revision:expected+1,recordCount:counts.events+counts.instances+1,eventsCount:counts.events,instancesCount:counts.instances,updatedAt:new Date().toISOString()});};
 });
 const head=await get(CONTROL,'head');checkHead(head);if(head.revision!==expected+1)throw Error('Save readback revision mismatch');
 for(const [id,next]of rows){const actual=await get(RECORDS,id);if(next===null){if(actual)throw Error('Deleted event still exists after save: '+id);}else if(!actual||actual.raw!==next.raw||actual.sha256!==next.sha256||await sha(actual.raw)!==actual.sha256)throw Error('Event readback failed: '+id);}
 return head;
}
function set(next,hint){if(!ready)throw Error('Private IndexedDB still loading');if(blocked)throw Error('SAVE FAILURE: '+blocked.message);const incoming=normal(next);let before=cache;let oldMap,newMap;const delta=new Map();
 if(Array.isArray(hint)){
  const keySet=new Set(hint);if(keySet.size!==hint.length||hint.length>7000)throw Error('Invalid granular update hints');for(const id of keySet){recordFrom(id,'');let oldValue,newValue;
   if(id==='p:plan'){oldValue=before.plan;newValue=incoming.plan;}else{const prop=id.startsWith('e:')?'events':'instances',key=id.slice(2);oldValue=before[prop][key];newValue=incoming[prop][key];}
   if(!equal(oldValue,newValue))delta.set(id,newValue===undefined?null:JSON.stringify(newValue));}
  // Hints come from audited registry operations; don't let a changed record count go unreported.
  const expectedRecordCount=Object.keys(incoming.events).length+Object.keys(incoming.instances).length+1;
  if(recordCount>0&&expectedRecordCount!==Object.keys(before.events).length+Object.keys(before.instances).length+1+[...delta].reduce((n,[id,raw])=>{const prop=id.startsWith('e:')?'events':'instances';const key=id.slice(2);if(id==='p:plan')return n;return n+(before[prop][key]===undefined&&raw!==null?1:before[prop][key]!==undefined&&raw===null?-1:0);},0))throw Error('Granular save hint misses a created or deleted competition');
 }else{oldMap=toMap(before);newMap=toMap(incoming);for(const [id,raw]of newMap)if(oldMap.get(id)!==raw)delta.set(id,raw);for(const id of oldMap.keys())if(!newMap.has(id))delta.set(id,null);}
 cache=incoming;const counts={events:Object.keys(incoming.events).length,instances:Object.keys(incoming.instances).length};pending++;paint();
 tail=tail.then(async()=>{if(blocked)throw blocked;const saved=await commit(delta,revision,counts);revision=saved.revision;recordCount=saved.recordCount;lastCommitRecords=delta.size;writeOps+=delta.size;}).catch(e=>stop(e)).finally(()=>{pending=Math.max(0,pending-1);paint();});return true;
}
function load(){if(!ready)throw Error('TET2 storage is still starting');if(blocked)throw Error('Private save engine in SAFE STOP: '+blocked.message);return clone(cache);}
async function flush(){await tail;if(blocked)throw Error('Database NOT safely saved: '+blocked.message);if(!ready)throw Error('Private database not ready');return status();}
async function verify(){await flush();const saved=await readPrimary();if(!saved||saved.head.revision!==revision||!equal(saved.state,cache)){stop(Error('Full granular database verification failed: missing or changed data'));throw blocked;}const digest=await sha(JSON.stringify(canonical(saved.state)));return{revision,sha256:digest,instances:Object.keys(saved.state.instances).length,slots:saved.state.plan.slots.length,records:saved.head.recordCount};}
function download(raw,name){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function emergency(){const x=cache||(()=>{try{return JSON.parse(localStorage.getItem(SOURCE));}catch(_){return null;}})();if(!x)throw Error('No recoverable TET2 state');download(JSON.stringify({format:'TET2_EMERGENCY_STATE',exportedAt:new Date().toISOString(),warning:'Could contain unsaved results. Private recovery only.',registry:x},null,2),'TET2_PRIVATE_EMERGENCY_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');}
async function previous(){if(!db)throw Error('Private database unavailable');const checkpoint=await get(UNDO,'checkpoint');if(checkpoint){const saved=await readPrimary();if(!saved)throw Error('No current private state');if(saved.head.revision!==checkpoint.currentRevision)throw Error('Checkpoint does not match primary revision');const rows=await all(RECORDS),map=new Map(rows.map(r=>[r.id,r]));for(const id of checkpoint.changed){const undo=await get(UNDO,id);if(!undo)throw Error('Missing undo record '+id);if(undo.before===null)map.delete(id);else map.set(id,undo.before);}const earlier=await decodeRows({id:'head',format:HEAD_FORMAT,revision:checkpoint.previousRevision,recordCount:map.size,eventsCount:[...map.keys()].filter(k=>k.startsWith('e:')).length,instancesCount:[...map.keys()].filter(k=>k.startsWith('i:')).length},[...map.values()]);download(JSON.stringify({format:'TET2_EMERGENCY_STATE',exportedAt:new Date().toISOString(),warning:'Previous committed revision; downloaded for manual review, not restored.',registry:earlier},null,2),'TET2_PRIVATE_PREVIOUS_CHECKPOINT.json');return checkpoint.previousRevision;}
 const old=await get(LEGACY,'primary');if(!old)throw Error('No checkpoint exists yet');const data=await verifyLegacy(old);download(JSON.stringify({format:'TET2_EMERGENCY_STATE',exportedAt:new Date().toISOString(),warning:'Preserved v0.16 migration snapshot. Manual review only.',registry:data},null,2),'TET2_PRIVATE_PRE_MIGRATION.json');return old.revision;}
function bindControls(){byId('storageVerify')?.addEventListener('click',async()=>{const out=byId('storageActionNotice');try{const v=await verify();out.textContent=`PASS: revision ${v.revision}, ${v.instances} independent competitions, ${v.slots} List rows, ${v.records} verified granular records, SHA-256 ${v.sha256.slice(0,18)}…`;out.className='status-ok';}catch(e){out.textContent='Verification failed: '+e.message;out.className='status-warn';stop(e);}});
 byId('storagePersist')?.addEventListener('click',async()=>{const out=byId('storageActionNotice');try{const yes=await navigator.storage?.persist?.();out.textContent=yes?'Browser accepted persistent storage. Keep private backups.':'Persistent storage unavailable or not granted; keep regular private backups.';}catch(e){out.textContent='Persistent-storage request unavailable: '+e.message;}});
 byId('storageEmergency')?.addEventListener('click',()=>{try{emergency();}catch(e){alert(e.message);}});byId('storagePrevious')?.addEventListener('click',async()=>{try{await previous();}catch(e){alert(e.message);}});
}
window.addEventListener('beforeunload',e=>{if(pending>0||blocked){e.preventDefault();e.returnValue='TET2 has pending/failed saves. Export emergency state.';}});
window.TET2Persistence={init,load,set,flush,verify,status,emergency,previous,bindControls,sha,get ready(){return ready;}};paint();
})();
