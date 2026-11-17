/* TET2 v0.20 — safe local browser diagnostics.
 * IMPORTANT: test database TET2_DIAGNOSTIC_SANDBOX_020 is separate from live
 * TET2_PRIVATE_DATA_V1, all tests create/delete only disposable probe records.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const DB='TET2_DIAGNOSTIC_SANDBOX_020';
function reqResult(request,description){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error(description+' failed'));});}
function openSandbox(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('probe'))r.result.createObjectStore('probe');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Sandbox database open failed'));r.onblocked=()=>reject(Error('Sandbox database blocked'));});}
function transaction(db,mode,fn){return new Promise((resolve,reject)=>{const tx=db.transaction('probe',mode);let data;tx.oncomplete=()=>resolve(data);tx.onerror=()=>reject(tx.error||Error('Sandbox transaction failed'));tx.onabort=()=>reject(tx.error||Error('Sandbox transaction aborted'));try{fn(tx.objectStore('probe'),x=>data=x);}catch(e){tx.abort();reject(e);}});}
async function exercise(){const lines=[];function put(ok,detail){lines.push(`${ok?'✅ PASS':'⛔ FAIL'} — ${detail}`);}
 const result=$('deviceReport');result.textContent='Running checks on THIS browser…';result.className='car';let db;
 try{
  const secure=Boolean(isSecureContext);put(secure,'Secure origin: '+location.protocol+'//'+location.host);if(!secure)throw Error('Use a private HTTPS or localhost origin. file:// cannot run the production app.');
  const cryptoOK=Boolean(crypto?.subtle&&crypto.getRandomValues);put(cryptoOK,'Web Crypto + secure random numbers');if(!cryptoOK)throw Error('Web Crypto unavailable.');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('TET2-v0.20')))).map(n=>n.toString(16).padStart(2,'0')).join('');put(digest.length===64,'SHA-256 computation');
  const idbOK=Boolean(globalThis.indexedDB);put(idbOK,'Native IndexedDB API');if(!idbOK)throw Error('IndexedDB unavailable.');
  db=await openSandbox();put(true,'Open isolated diagnostic IndexedDB');
  const value={probe:'TET2-v0.20',stamp:Date.now()};await transaction(db,'readwrite',(store,set)=>{store.put(value,'selftest');set(null);});put(true,'Write disposable probe record');
  const got=await transaction(db,'readonly',(store,set)=>{const r=store.get('selftest');r.onsuccess=()=>set(r.result);});put(JSON.stringify(got)===JSON.stringify(value),'Readback matches written probe');
  await transaction(db,'readwrite',(store,set)=>{store.delete('selftest');set(null);});
  const cleared=await transaction(db,'readonly',(store,set)=>{const r=store.get('selftest');r.onsuccess=()=>set(r.result);});put(cleared===undefined,'Disposable probe deleted');
  const estimate=await navigator.storage?.estimate?.();if(estimate){lines.push(`ℹ️ Storage quota approximately ${Math.round((estimate.quota||0)/1048576)} MiB (browser estimate, not a guarantee).`);}
  const p=window.TET2Persistence?.status();put(p?.ready&&!p?.blocked,'TET2 primary database online at revision '+(p?.revision??'?'));
  const pass=lines.every(x=>!x.startsWith('⛔'));result.textContent=lines.join('\n')+'\n'+(pass?'✅ LOCAL DEVICE CHECK COMPLETE. Private backup and real phone workflow QA still required.':'⛔ DEVICE CHECK INCOMPLETE.');result.className=pass?'car status-ok':'car status-warn';result.style.whiteSpace='pre-wrap';
 }catch(e){result.textContent=lines.join('\n')+'\n⛔ INCOMPLETE: '+e.message;result.className='car status-warn';result.style.whiteSpace='pre-wrap';}
 finally{try{db?.close();}catch(_){};try{indexedDB.deleteDatabase(DB);}catch(_){} }
}
async function verifyPrimary(){const el=$('deviceVerifyReport');el.textContent='Verifying real TET2 database readback…';el.className='car';try{const r=await window.TET2Persistence.verify();el.textContent=`✅ PRIMARY READBACK PASS — revision ${r.revision}, ${r.instances} independent events, ${r.slots} draft rows, ${r.records} verified records. Digest ${r.sha256.slice(0,20)}…`;el.className='car status-ok';}catch(e){el.textContent='⛔ PRIMARY READBACK FAILED — '+e.message+'. Do not race. Use Recovery to export available data.';el.className='car status-warn';}}
$('deviceRun').onclick=exercise;$('deviceVerify').onclick=verifyPrimary;$('deviceToRecovery').onclick=()=>globalThis.tet2Navigate('recovery');
})();
