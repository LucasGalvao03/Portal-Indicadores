/* ===== Animações ao abrir cada aba: blocos entram em sequência, gráficos se desenham e os números contam até o valor =====
   Só mexe em classes e no texto dos números grandes; nunca no atributo "hidden" (o motor redesenha quando ele muda). */
(() => {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const NUM = /^([^\d-]*)(-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?)([^\d]*)$/;
  function contar(sec) {
    const alvos = [...sec.querySelectorAll('div, span, b, strong, td')].filter((e) => {
      if (e.children.length || e.closest('[data-sem-traducao], svg, .chat-painel')) return false;
      const t = e.textContent.trim();
      if (!NUM.test(t) || t.length > 14) return false;
      return parseFloat(getComputedStyle(e).fontSize) >= 20;
    }).slice(0, 40);
    alvos.forEach((e) => {
      const fim = e.textContent.trim(), m = fim.match(NUM);
      const dec = (m[2].split(',')[1] || '').length, milhar = m[2].includes('.');
      const alvo = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
      if (!isFinite(alvo) || alvo === 0) return;
      const fmt = (v) => {
        let s = Math.abs(v).toFixed(dec).replace('.', ',');
        if (milhar) s = s.replace(/^(\d+)/, (x) => x.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
        return (v < 0 ? '-' : '') + s;
      };
      const t0 = performance.now(), dur = 900;
      e.classList.add('contando');
      const passo = (agora) => {
        if (!e.isConnected || e.textContent.trim() !== e.dataset.contagem) return; // o painel redesenhou: para
        const p = Math.min(1, (agora - t0) / dur), k = 1 - Math.pow(1 - p, 3);
        e.textContent = m[1] + fmt(alvo * k) + m[3];
        e.dataset.contagem = e.textContent.trim();
        if (p < 1) requestAnimationFrame(passo); else { e.textContent = fim; delete e.dataset.contagem; }
      };
      e.textContent = m[1] + fmt(0) + m[3];
      e.dataset.contagem = e.textContent.trim();
      requestAnimationFrame(passo);
    });
  }
  let ultima = null;
  function abriu() {
    const sec = [...document.querySelectorAll('.pt-sec')].find((s) => !s.hidden);
    if (!sec || sec === ultima) return;
    ultima = sec;
    document.querySelectorAll('.pt-sec.anima').forEach((s) => s.classList.remove('anima'));
    void sec.offsetWidth; // reinicia as animações
    sec.classList.add('anima');
    setTimeout(() => contar(sec), 250);
    setTimeout(() => sec.classList.remove('anima'), 1600); // depois disso, redesenhos (filtros, ao vivo) não animam de novo
  }
  new MutationObserver(abriu).observe(document.querySelector('.pt-main') || document.body, {subtree: true, attributes: true, attributeFilter: ['hidden']});
  window.addEventListener('hashchange', () => setTimeout(abriu, 30));
  document.addEventListener('DOMContentLoaded', () => setTimeout(abriu, 400));
  setTimeout(abriu, 600);
})();
