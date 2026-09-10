<script>
window.addEventListener('load', () => {
  const sel = 'h1,h2,h3,p,.box,.flow,.rec,li,table tr';
  const out = [];
  document.querySelectorAll(sel).forEach(el => {
    if (el.closest('.box') && el.tagName !== 'DIV') return; // boxes measured as a whole
    if (el.closest('.rec') && el.tagName !== 'DIV') return;
    const r = el.getBoundingClientRect();
    out.push([el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''), Math.round(r.height), (el.innerText || '').replace(/\s+/g, ' ').slice(0, 70)]);
  });
  const pre = document.createElement('pre'); pre.id = 'PROBE'; pre.textContent = JSON.stringify({total: Math.round(document.body.getBoundingClientRect().height), blocks: out});
  document.body.appendChild(pre);
});
</script>
