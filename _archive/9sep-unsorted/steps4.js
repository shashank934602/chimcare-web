const s = ms => 'await new Promise(r=>setTimeout(r,' + ms + '));';
module.exports = `(async()=>{
  const $=s=>document.querySelector(s);
  ${s(2200)}
  const hdr=$('header .btn'); if(hdr){hdr.click(); ${s(900)}}
  $('.svc-opt[data-svc="sweep"]').click(); ${s(700)}
  const day=[...document.querySelectorAll('#book-dates .date')].find(b=>!b.disabled);
  day.click(); ${s(900)}
  let t=document.querySelector('#book-times .time');
  if(!t){const a=[...document.querySelectorAll('#book-dates .date')].filter(b=>!b.disabled)[1];
         if(a){a.click(); ${s(900)}} t=document.querySelector('#book-times .time');}
  t.click(); ${s(200)} $('[data-panel="2"] [data-next]').click(); ${s(500)}
  $('#bf-first').value='Alex'; $('#bf-last').value='Rivera'; $('#bf-email').value='a@b.com';
  $('#bf-phone').value='5092672691'; $('#bf-address').value='120 W Riverside';
  $('#bf-city').value='Spokane'; $('#bf-state').value='WA'; $('#bf-zip').value='99201';
  $('#book-submit').click(); ${s(1600)}
  const r=$('#book-steps').getBoundingClientRect();
  window.scrollTo({top:r.top+window.pageYOffset-60,behavior:'auto'}); ${s(400)}
  return 'step='+$('#book-steps').getAttribute('data-step');
})()`;
