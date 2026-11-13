/* ---------- abas ---------- */
(() => {
  const ABAS = ['visao', 'ranking', 'offloading', 'noscan', 'notracking', 'erro', 'eficiencia', 'pontualidade', 'lost', 'sacas'];
  function abrir(id, link) {
    if (!ABAS.includes(id)) id = 'visao';
    document.querySelectorAll('.pt-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    ABAS.forEach((a) => { const s = document.getElementById(a); if (s) s.hidden = a !== id; });
    if (link) dash.setLink(id);
  }
  document.querySelectorAll('.pt-tab').forEach((b) => b.addEventListener('click', () => abrir(b.dataset.tab, true)));
  const h = (location.hash || '').replace('#', '');
  if (h) abrir(h, false);
  window.addEventListener('hashchange', () => abrir((location.hash || '').replace('#', ''), false));
})();
