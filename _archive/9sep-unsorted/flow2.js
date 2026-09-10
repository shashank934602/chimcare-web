const s = ms => 'await new Promise(r=>setTimeout(r,' + ms + '));';
module.exports = `(async()=>{
  const $=s=>document.querySelector(s), log=[];
  ${s(2200)}
  const step=()=>$('#book-steps').getAttribute('data-step');
  log.push('mounted='+!!$('[data-book-slot] #booking, #book-mount-sheet #booking')+' start='+step());
  $('.svc-opt[data-svc="sweep"]').click(); ${s(700)}
  log.push('svc='+step());
  const day=[...document.querySelectorAll('#book-dates .date')].find(b=>!b.disabled);
  day.click(); ${s(1000)}
  let t=document.querySelector('#book-times .time');
  if(!t){const alt=[...document.querySelectorAll('#book-dates .date')].filter(b=>!b.disabled)[1];
         if(alt){alt.click(); ${s(1000)}} t=document.querySelector('#book-times .time');}
  if(!t) return 'NO TIMES';
  t.click(); ${s(250)}
  $('[data-panel="2"] [data-next]').click(); ${s(400)}
  log.push('sched='+step());
  $('#book-submit').click(); ${s(350)}
  log.push('errEmpty='+document.querySelectorAll('#book-form .field.is-error').length);
  $('#bf-first').value='Alex'; $('#bf-last').value='Rivera'; $('#bf-email').value='a@b.com';
  $('#bf-phone').value='5092672691'; $('#bf-address').value='120 W Riverside';
  $('#bf-city').value='Spokane'; $('#bf-state').value='WA'; $('#bf-zip').value='99201';
  $('#book-submit').click(); ${s(1500)}
  log.push('done='+step()+' rows='+document.querySelectorAll('#book-summary div').length);
  return log.join(' | ');
})()`;
