/* ---------- desenhos genéricos ---------- */
dash.draw('val', (e) => {
  const src = e.dataset.source, f = e.dataset.field, w = e.dataset.where || '';
  const g = dash.data(src);
  if (g.status !== 'ok') { e.textContent = '—'; return; }
  const [k, v] = w.split('=');
  const row = (g.data || []).find((r) => String(r[k]) === decodeURIComponent(v || ''));
  e.textContent = row ? PT.fmt(row[f], e.dataset.fmt) : '—';
});
dash.draw('dc-dot', (e) => {
  const dc = e.dataset.dc;
  const i = PT.el('i'); i.style.background = PT.cor(dc);
  e.replaceChildren(i, document.createTextNode(dc));
});
