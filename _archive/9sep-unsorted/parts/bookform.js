  /* ---------- Booking form: the Service step is the only live one ---------- */
  $$('#booking .svc-opt').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#booking .svc-opt').forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
    });
  });
