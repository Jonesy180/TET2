"use strict";
let garage=[];
const pages=[...document.querySelectorAll('.page')];
function tet2Navigate(id){
 if(!pages.some(p=>p.id===id))throw Error('Unknown TET2 page '+id);
 pages.forEach(p=>p.classList.toggle('active',p.id===id));
 document.querySelectorAll('nav [data-go]').forEach(n=>n.classList.toggle('selected',n.dataset.go===id));
 window.scrollTo(0,0);
}
globalThis.tet2Navigate=tet2Navigate;
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>tet2Navigate(b.dataset.go)));
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function draw(){
 const q=document.querySelector('#search').value.toLowerCase().trim();
 const m=document.querySelector('#make').value;
 const found=garage.filter(c=>(!m||c.make===m)&&(!q||[c.make,c.model,c.year,c.classType,c.name].some(v=>String(v||'').toLowerCase().includes(q))));
 document.querySelector('#matchcount').textContent=found.length+' shown';
 document.querySelector('#cars').innerHTML=found.slice(0,180).map(c=>'<div class="car"><strong>'+esc(c.name||[c.make,c.model,c.year].join(' '))+'</strong><small>'+esc(c.classType||'Unclassified')+' · '+esc(c.catalogueId||'Unlinked')+'</small></div>').join('')+(found.length>180?'<p class="muted">Showing first 180. Narrow search to see more.</p>':'');
}
document.querySelector('#search').addEventListener('input',draw);
document.querySelector('#make').addEventListener('change',draw);
function tet2SetGarage(cars){
 garage=cars;
 globalThis.tet2Garage=garage;
 const makes=[...new Set(garage.map(c=>c.make))].sort();
 for(const id of ['homeCars','garageCars'])document.getElementById(id).textContent=String(garage.length);
 for(const id of ['homeMakes','garageMakes'])document.getElementById(id).textContent=String(makes.length);
 document.querySelector('#make').replaceChildren();
 const opt=document.createElement('option');opt.value='';opt.textContent='All manufacturers';document.querySelector('#make').append(opt);
 for(const maker of makes){const o=document.createElement('option');o.value=maker;o.textContent=maker;document.querySelector('#make').append(o);}
 draw();
}
globalThis.tet2SetGarage=tet2SetGarage;
