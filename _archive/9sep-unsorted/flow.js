const sleep = ms => 'await new Promise(r=>setTimeout(r,' + ms + '));';
module.exports = `(async()=>{
  const $=s=>document.querySelector(s), log=[];
  const step=()=>$('#book-steps').getAttribute('data-step');
  // 1. service
  $('.svc-opt[data-svc="sweep"]').click(); ${sleep(600)}
  log.push('afterService=' + step());
  // 2. schedule — pick the first enabled date, then the first offered time
  const day=[...document.querySelectorAll('#book-dates .date')].find(b=>!b.disabled);
  if(!day) return 'NO ENABLED DATE';
  day.click(); ${sleep(900)}
  const times=[...document.querySelectorAll('#book-times .time')];
  log.push('timeCount=' + times.length);
  if(!times.length){ // that day was full — try the next open one
    const alt=[...document.querySelectorAll('#book-dates .date')].filter(b=>!b.disabled)[1];
    if(alt){alt.click(); ${sleep(900)}}
  }
  const t=document.querySelector('#book-times .time'); if(!t) return 'NO TIMES ' + log.join(' ');
  t.click(); ${sleep(200)}
  log.push('nextDisabled=' + $('[data-panel="2"] [data-next]').disabled);
  $('[data-panel="2"] [data-next]').click(); ${sleep(400)}
  log.push('afterSchedule=' + step());
  // 3. details — submit empty first to confirm validation fires
  $('#book-submit').click(); ${sleep(300)}
  log.push('errorsOnEmpty=' + document.querySelectorAll('#book-form .field.is-error').length);
  $('#bf-first').value='Alex'; $('#bf-last').value='Rivera';
  $('#bf-email').value='alex@example.com'; $('#bf-phone').value='5092672691';
  $('#bf-address').value='120 W Riverside Ave'; $('#bf-city').value='Spokane';
  $('#bf-state').value='WA'; $('#bf-zip').value='99201';
  $('#book-submit').click(); ${sleep(1400)}
  log.push('afterSubmit=' + step());
  log.push('summaryRows=' + document.querySelectorAll('#book-summary div').length);
  log.push('summary=' + ($('#book-summary').textContent||'').replace(/\\s+/g,' ').slice(0,150));
  return log.join(' | ');
})()`;
