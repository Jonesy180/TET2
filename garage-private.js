/* TET2 0.23 GitHub-safe first-run Garage importer.
 * IMPORT ONLY: owner-supplied OTG portable backup or FH5 donor snapshot.
 * The published repository contains NO owned-car data. The local IndexedDB
 * garage is verified and frozen for this engineering test (704 IDs/123 makes).
 * Existing TET2 results are NOT changed by importing a Garage.
 */
(()=>{'use strict';
const DB='TET2_GARAGE_PRIVATE_V1', STORE='garage', KEY='fh5-2026-11', FORMAT='TET2_LOCAL_FH5_GARAGE_V1';
const $=id=>document.getElementById(id), clone=x=>JSON.parse(JSON.stringify(x));
let db=null,loaded=false,garagesha='',resolveGate=null,rejectGate=null;
const SAFE_KEYS=['id','make','model','year','name','classType','catalogueId','catalogueKey'];
function assert(test,message){if(!test)throw Error(message);}
async function digest(data){const b=new TextEncoder().encode(data);const hash=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(hash)].map(c=>c.toString(16).padStart(2,'0')).join('');}
function openDB(){return new Promise((yes,no)=>{
 const request=indexedDB.open(DB,1);
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
 request.onsuccess=()=>yes(request.result);
 request.onerror=()=>no(request.error||Error('Private Garage database failed to open'));
 request.onblocked=()=>no(Error('Garage database blocked. Close other TET2 tabs.'));
});}
function trans(mode,action){return new Promise((yes,no)=>{
 let result,tx;try{tx=db.transaction(STORE,mode);const r=action(tx.objectStore(STORE));
 r.onsuccess=()=>{result=r.result;};r.onerror=()=>no(r.error||Error('Garage storage request failed'));
 tx.oncomplete=()=>yes(result);tx.onerror=()=>no(tx.error||Error('Garage transaction failed'));
 tx.onabort=()=>no(tx.error||Error('Garage transaction aborted'));}catch(e){no(e);}
});}
function extract(value){
 if(value?.format==='OTG_PORTABLE_BACKUP'){
  const spaces=value?.data?.state?.spaces;
  assert(Array.isArray(spaces),'Portable backup lacks Spaces');
  const fh5=spaces.filter(s=>s.catalogueKey==='fh5-catalogue-v1'||s.name==='Forza 5');
  assert(fh5.length===1,'Cannot identify exactly one FH5 Space');
  return fh5[0].cars;
 }
 if(value&&Array.isArray(value.cars))return value.cars;
 throw Error('Use a complete OTG portable backup or the TET2 FH5 donor JSON.');
}
function normalise(cars){
 assert(Array.isArray(cars),'Missing FH5 car list');
 assert(cars.length===704,'This engineering build expects 704 FH5 cars, received '+cars.length+'. Do not alter your Garage; a newer build will handle an expanded collection.');
 const seen=new Set(),cats=new Set(),makes=new Set();
 const clean=cars.map((c,i)=>{
  assert(c&&typeof c==='object'&&!Array.isArray(c),'Invalid car record '+(i+1));
  const out={};
  for(const key of SAFE_KEYS){assert(typeof c[key]==='string'&&c[key].length>0&&c[key].length<=150,'Missing/invalid '+key+' on car '+(i+1));out[key]=c[key];}
  assert(out.catalogueKey==='fh5-catalogue-v1','Non-FH5 vehicle '+(i+1));
  assert(!seen.has(out.id),'Duplicate car identifier '+out.id);
  assert(!cats.has(out.catalogueId),'Duplicate FH5 catalogue identifier');
  seen.add(out.id);cats.add(out.catalogueId);makes.add(out.make);
  return out;
 });
 assert(makes.size===123,'Expected 123 manufacturers, found '+makes.size);
 return clean;
}
async function read(){const row=await trans('readonly',s=>s.get(KEY));if(!row)return null;
 assert(row.format===FORMAT&&Array.isArray(row.cars)&&/^[0-9a-f]{64}$/.test(row.sha256||''),'Invalid stored Garage record');
 const cars=normalise(row.cars);const h=await digest(JSON.stringify(cars));
 assert(h===row.sha256,'Private Garage checksum mismatch. Do not overwrite browser data.');
 return{cars,sha256:h};
}
function announce(t,bad=false){const n=$('garageImportStatus');n.textContent=t;n.className=bad?'status-warn':'status-ok';}
async function importFile(file){
 assert(file&&file.size>0&&file.size<10_000_000,'Use a JSON backup smaller than 10MB.');
 const json=JSON.parse(await file.text());
 const cars=normalise(extract(json)),hash=await digest(JSON.stringify(cars));
 const existing=await read();
 if(existing){
  if(existing.sha256!==hash)throw Error('A different Garage is already frozen on this device. Import blocked to protect saved competitions.');
  announce('✅ Identical FH5 Garage already loaded. No changes necessary.');
  return existing;
 }
 await trans('readwrite',s=>s.put({format:FORMAT,createdAt:new Date().toISOString(),sha256:hash,cars},KEY));
 const check=await read();
 assert(check&&check.sha256===hash,'Garage save/readback verification failed. Stop and do not race.');
 return check;
}
async function init(){
 if(loaded)return {cars:globalThis.tet2Garage,sha256:garagesha};
 if(!globalThis.isSecureContext||!globalThis.crypto?.subtle||!globalThis.indexedDB)throw Error('HTTPS with Web Crypto and IndexedDB required to store private Garage');
 db=await openDB();const found=await read();
 if(found){loaded=true;garagesha=found.sha256;globalThis.tet2SetGarage(found.cars);return found;}
 return new Promise((yes,no)=>{resolveGate=yes;rejectGate=no;
   $('garageImportGate').hidden=false;
   $('garageImportPicker').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    const b=$('garageImportButton');b.disabled=true;
    announce('Checking FH5 car records and saving privately…');
    try{const r=await importFile(file);garagesha=r.sha256;loaded=true;globalThis.tet2SetGarage(r.cars);announce('✅ 704 cars saved in PRIVATE IndexedDB; no Garage JSON uploaded to GitHub.');$('garageImportGate').hidden=true;yes(r);}
    catch(error){announce('⛔ '+error.message,true);}finally{b.disabled=false;e.target.value='';}
   });
   $('garageImportButton').addEventListener('click',()=>$('garageImportPicker').click());
 });
}
window.TET2Garage={init,get loaded(){return loaded;},get sha256(){return garagesha;},read};
})();
