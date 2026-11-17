(()=>{'use strict';
const KEY='TET2__REGISTRY_V05',FORMAT='TET2_UNIFIED_PRIVATE_BACKUP',SLOT_IDS=['long-jump','race-off','festival','swiss','relay-maker','race-off-full'];
const handlers=new Map(),subscribers=new Set();let database=null,issue='',instanceValidators=new Map();
function copy(x){return JSON.parse(JSON.stringify(x));}
const PLAN_FORMAT='TET2_EVIL_LIST_DRAFT',MAX_SLOTS=6000,MAX_INSTANCES=6000;
function blankPlan(){return{format:PLAN_FORMAT,schema:2,slots:[]};}
function validatePlan(p,instances={}){
 if(!p||p.format!==PLAN_FORMAT||!Array.isArray(p.slots))throw Error('Unsupported Evil List draft');
 // Transparent migration of v0.13 plan: older six single-instance demo rows stay intact.
 if(p.schema===1){if(p.slots.length>SLOT_IDS.length||p.slots.some(x=>typeof x!=='string'||!SLOT_IDS.includes(x))||new Set(p.slots).size!==p.slots.length)throw Error('Invalid legacy draft');p={format:PLAN_FORMAT,schema:2,slots:p.slots.map(ref=>({id:'legacy-'+ref,kind:'legacy',ref}))};}
 if(p.schema!==2||p.slots.length>MAX_SLOTS)throw Error('Unsupported plan schema or oversized running order');
 const seen=new Set(),legacy=new Set(),refs=new Set(),batches=[];
 const slots=p.slots.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||!/^[a-z0-9-]{1,85}$/.test(row.id)||seen.has(row.id))throw Error('Duplicate or malformed slot ID');seen.add(row.id);
  if(row.kind==='legacy'){
   if(!SLOT_IDS.includes(row.ref)||legacy.has(row.ref)||row.id!=='legacy-'+row.ref)throw Error('Duplicate or unknown legacy engine');legacy.add(row.ref);return{id:row.id,kind:'legacy',ref:row.ref};}
  if(row.kind==='instance'){
   if(typeof row.ref!=='string'||!Object.hasOwn(instances,row.ref)||refs.has(row.ref)||row.id!=='slot-'+row.ref)throw Error('Unknown or duplicate independent competition instance');refs.add(row.ref);return{id:row.id,kind:'instance',ref:row.ref};}
  if(row.kind==='jump-batch'){
   if(!Number.isInteger(row.start)||!Number.isInteger(row.end)||row.start<0||row.end>704||row.start>=row.end||row.id!==`jump-${row.start}-${row.end}`)throw Error('Invalid Long Jump group');
   batches.push([row.start,row.end]);return{id:row.id,kind:'jump-batch',start:row.start,end:row.end};}
  throw Error('Unknown Evil List slot type');
 });
 // Global Long Jump is one sequential field. Batches must not overlap or reverse its field order.
 for(let i=1;i<batches.length;i++)if(batches[i-1][1]>batches[i][0])throw Error('Long Jump batches must remain in car order without overlap');
 return{format:PLAN_FORMAT,schema:2,slots};
}
function empty(){return{format:'TET2_REGISTRY',schema:1,events:{},instances:{},plan:blankPlan()};}
function checkHeader(x){
 if(!x||x.format!=='TET2_REGISTRY'||x.schema!==1||!x.events||typeof x.events!=='object'||Array.isArray(x.events))throw Error('Unsupported registry version');
 if(Object.keys(x.events).some(k=>!SLOT_IDS.includes(k)))throw Error('Unexpected competition ID');
 if(x.instances!==undefined&&(typeof x.instances!=='object'||!x.instances||Array.isArray(x.instances)||Object.keys(x.instances).length>MAX_INSTANCES))throw Error('Invalid instance registry');
 if(x.instances&&Object.keys(x.instances).some(k=>!/^(ro|fe|sw|rm|rx|gm|gt|ds|dk|dg)-[a-z0-9-]{5,70}$/.test(k)))throw Error('Malformed competition instance ID');
 if(x.plan!==undefined)validatePlan(x.plan,x.instances||{});
}
function read(){const result=window.TET2Persistence.load();checkHeader(result);if(!result.instances)result.instances={};result.plan=validatePlan(result.plan||blankPlan(),result.instances);return result;}
function write(next,hints){checkHeader(next);const normalized=copy(next);if(!normalized.instances)normalized.instances={};normalized.plan=validatePlan(normalized.plan||blankPlan(),normalized.instances);window.TET2Persistence.set(normalized,hints);database=copy(normalized);refresh();}
function validateInstances(d){for(const [id,item]of Object.entries(d.instances||{})){if(item?.id!==id)throw Error('Instance ID mismatch');const validator=instanceValidators.get(item.kind);if(!validator)throw Error('Engine not registered for '+String(item.kind));validator(item);}}
function registerInstanceValidator(kind,fn){if(typeof kind==='function'){fn=kind;kind='race-off-full';}if(typeof kind!=='string'||typeof fn!=='function'||instanceValidators.has(kind))throw Error('Invalid or duplicate instance validator');instanceValidators.set(kind,fn);for(const item of Object.values(read().instances||{}))if(item.kind===kind)fn(item);refresh();}
function validateOne(item){const validator=instanceValidators.get(item?.kind);if(!validator)throw Error('Independent engine not ready for '+String(item?.kind));return validator(item);}
function addInstance(item){if(!instanceValidators.size)throw Error('Independent competition engines not ready');const d=read();if(d.instances[item.id])throw Error('Competition ID already exists');if(Object.keys(d.instances).length>=MAX_INSTANCES)throw Error('Too many competition instances');validateOne(item);d.instances[item.id]=copy(item);d.plan.slots.push({id:'slot-'+item.id,kind:'instance',ref:item.id});write(d,['i:'+item.id,'p:plan']);return item.id;}
function saveInstance(id,item){if(!instanceValidators.size)throw Error('Instance engine not ready');const d=read();if(!d.instances[id]||item.id!==id)throw Error('Unknown competition instance');validateOne(item);d.instances[id]=copy(item);write(d,['i:'+id]);}
function getInstance(id){return copy(read().instances[id]||null);}
function getInstances(){return copy(read().instances);}
function addJumpBatches(batchSize){if(![16,32,64].includes(batchSize))throw Error('Invalid batch size');const d=read();if(d.plan.slots.some(s=>s.kind==='jump-batch'))throw Error('Long Jump groups are already in your draft; remove those rows first to reconfigure');const rows=[];for(let start=0;start<704;start+=batchSize){const end=Math.min(704,start+batchSize);rows.push({id:`jump-${start}-${end}`,kind:'jump-batch',start,end});}d.plan.slots.push(...rows);write(d,['p:plan']);return rows.length;}
function register(id,config){if(!SLOT_IDS.includes(id)||handlers.has(id))throw Error('Duplicate or unknown event '+id);const {legacyKey,validate,blank,apply}=config;handlers.set(id,{validate,apply});
try{let d=read(),value=d.events[id];if(value===undefined){const legacy=localStorage.getItem(legacyKey);value=legacy?JSON.parse(legacy):blank();value=copy(validate(value));d.events[id]=value;write(d,['e:'+id]);}else value=copy(validate(value));database=d;apply(copy(value));refresh();return true;}
catch(e){issue=id+': '+e.message;refresh();throw e;}}
function save(id,value){const h=handlers.get(id);if(!h)throw Error('Event not initialised');const valid=copy(h.validate(value));const d=read();d.events[id]=valid;write(d,['e:'+id]);h.apply(copy(valid));refresh();}
function getPlan(){return copy(read().plan);}
function setPlan(plan){const d=read();const p=validatePlan(plan,d.instances);d.plan=p;write(d,['p:plan']);return copy(p);}
function subscribe(cb){if(typeof cb!=='function')throw Error('Subscriber must be a function');subscribers.add(cb);try{cb(copy(database||read()));}catch(e){console.error('TET2 list subscriber',e);}return ()=>subscribers.delete(cb);}
function snapshot(){const d=read();validateInstances(d);for(const id of SLOT_IDS){if(!handlers.has(id))throw Error('Please allow all competition engines to load');if(!d.events[id])throw Error('Missing '+id);handlers.get(id).validate(d.events[id]);}return d;}
async function exportAll(){try{await window.TET2Persistence.flush();const data=snapshot();const checksum=await window.TET2Persistence.sha(JSON.stringify(data));const wrap={format:FORMAT,version:2,exportedAt:new Date().toISOString(),storageBackend:'TET2_PRIVATE_DATA_V1',sha256:checksum,registry:data};const url=URL.createObjectURL(new Blob([JSON.stringify(wrap,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='TET2_UNIFIED_PRIVATE_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);message('Unified backup downloaded. Store it privately.');}catch(e){message('Export blocked: '+e.message,true);}}
async function importAll(file){try{if(file.size>30000000)throw Error('File exceeds 30 MB');const wrap=JSON.parse(await file.text());if(wrap.format!==FORMAT||![1,2].includes(wrap.version))throw Error('Wrong unified backup');const d=wrap.registry;checkHeader(d);if(wrap.version===2){if(!/^[0-9a-f]{64}$/.test(wrap.sha256||'')||await window.TET2Persistence.sha(JSON.stringify(d))!==wrap.sha256)throw Error('Backup checksum mismatch');}await window.TET2Persistence.flush();const current=read();if(d.instances===undefined)d.instances=copy(current.instances);if(d.plan===undefined)d.plan=copy(current.plan);d.plan=validatePlan(d.plan,d.instances);validateInstances(d);const keys=Object.keys(d.events).sort().join(',');const full=SLOT_IDS.slice().sort().join(',');const old=['long-jump','race-off'].sort().join(',');const previous=['long-jump','race-off','festival'].sort().join(',');const four=['long-jump','race-off','festival','swiss'].sort().join(',');const five=['long-jump','race-off','festival','swiss','relay-maker'].sort().join(',');if(keys!==full&&keys!==old&&keys!==previous&&keys!==four&&keys!==five)throw Error('Unexpected set of competition records');if(keys!==full){for(const id of SLOT_IDS)if(!d.events[id]){d.events[id]=current.events[id];if(!d.events[id])throw Error(id+' controller not ready for legacy restore');}}for(const id of SLOT_IDS)handlers.get(id)?.validate(d.events[id]);if(handlers.size!==SLOT_IDS.length)throw Error('All competition engines must be ready');if(!confirm('Replace TET2 engineering competitions from this backup? This does not affect OTG!. Export your current TET2 data first.'))return;
// Single write: either the entire registry is replaced, or none of it is.
write(d);await window.TET2Persistence.flush();for(const id of SLOT_IDS)handlers.get(id).apply(copy(d.events[id]));refresh();message('Verified IndexedDB restore committed. Six legacy engineering areas, independent competitions and Evil List updated.');}
catch(e){message('Import rejected: '+e.message,true);}finally{const el=document.getElementById('unifiedFile');if(el)el.value='';}}
function details(){const data=database?.events||{},lj=data['long-jump'],ro=data['race-off'];const doneL=lj?.attempts?.length===lj?.garageCount&&lj?.attempts?.length>0;const doneR=ro?.matches?.length===4;const fe=data['festival'],sw=data['swiss'],re=data['relay-maker'];return{relay:re?.results?.length??0,relayTotal:(re?.teamIds?.length??0)*3,swiss:sw?.swiss?.length??0,swissKnockout:sw?.playoffs?.length??0,festival:fe?.results?.length??0,festivalTotal:9,jump:lj?.attempts?.length??0,jumpTotal:lj?.garageCount??704,race:ro?.matches?.length??0,completed: +(!!doneL)+ +(!!doneR)+ +(!!fe&&fe.results.length===9)+ +(!!sw&&sw.playoffs.length===4)+ +(!!re&&re.results.length>0&&re.results.length===re.teamIds.length*3),bigRace:data['race-off-full']?.results?.length??0,bigTotal:data['race-off-full']?.size??0,ready:handlers.size,doneL,doneR};}
function refresh(){const p=details();const node=document.getElementById('unifiedSummary');if(node)node.innerHTML=`<b>${p.ready}/6 engines connected</b> · Long Jump ${p.jump}/${p.jumpTotal} · Race Off ${p.race}/4 · Festival ${p.festival}/9 · Swiss ${p.swiss}/32 + ${p.swissKnockout}/4 · Relay ${p.relay}/${p.relayTotal} · Race Off 32/64 ${p.bigRace} results`+(issue?`<br><span class="status-warn">${safeText(issue)}</span>`:'');const hero=document.getElementById('registryHealth');if(hero)hero.textContent=p.ready===6?'SHARED REGISTRY ONLINE — SIX COMPETITION AREAS':`REGISTRY: ${p.ready}/6 AREAS READY`;if(window.TET2Operations)window.TET2Operations.render(database);
 for(const cb of subscribers){try{cb(copy(database||read()));}catch(e){console.error('TET2 list subscriber',e);}}
}
function message(s,bad=false){const el=document.getElementById('unifiedNotice');if(el){el.textContent=s;el.className=bad?'status-warn':'status-ok';}}
window.TET2Registry={register,save,details,refresh,exportAll,importAll,getPlan,setPlan,subscribe,registerInstanceValidator,addInstance,saveInstance,getInstance,getInstances,addJumpBatches};document.getElementById('unifiedExport')?.addEventListener('click',exportAll);document.getElementById('unifiedImport')?.addEventListener('click',()=>document.getElementById('unifiedFile').click());document.getElementById('unifiedFile')?.addEventListener('change',e=>e.target.files?.[0]&&importAll(e.target.files[0]));
})();
