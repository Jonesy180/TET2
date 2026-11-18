/* TET2 v0.24 — mobile-friendly race-time entry. No database changes. */
(()=>{'use strict';
  function normalize(raw){
    const source=String(raw??'').trim();
    // Phone number-only keyboard: 0336784 -> 03:36.784;
    // shorter examples: 336784 -> 03:36.784, 12345 -> 00:12.345.
    if(/^\d{4,8}$/.test(source)){
      const full=source.padStart(5,'0');
      const min=full.slice(0,-5)||'0';
      const seconds=full.slice(-5,-3);
      const ms=full.slice(-3);
      return `${min.padStart(2,'0')}:${seconds}.${ms}`;
    }
    return source; // Colon-and-dot input/paste still works as before.
  }
  const formatPattern=/^\d{1,3}:[0-5]\d\.\d{3}$/;
  function prettify(field){
    if(!field?.matches?.('input[data-tet2-time]'))return;
    const pretty=normalize(field.value);
    if(formatPattern.test(pretty))field.value=pretty;
  }
  globalThis.TET2Time=Object.freeze({normalize});
  document.addEventListener('focusout',e=>prettify(e.target),true);
  document.addEventListener('change',e=>prettify(e.target),true);
  // Dynamically created competition pages still show instructions before typing.
  function applyHints(){
    document.querySelectorAll('input[data-tet2-time]').forEach(input=>{
      const block=input.closest('.time-duel, .live-flex, .plan-controls')||input.parentElement;
      if(!block||block.dataset.tet2MobileTimeHint)return;
      block.dataset.tet2MobileTimeHint='yes';
      const hint=document.createElement('p');
      hint.className='time-entry-hint';
      hint.textContent='📱 Phone: enter digits only — 0336784 becomes 03:36.784. No : or . needed.';
      block.before(hint);
    });
  }
  const observer=new MutationObserver(applyHints);
  observer.observe(document.body,{subtree:true,childList:true});
  applyHints();
})();
