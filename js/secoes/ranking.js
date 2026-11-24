/* ---------- Ranking ---------- */
(() => {
  const per = () => dash.params().periodo || 'Semanal';
  const IND = [
    ['Produtividade por pessoa', 'int'], ['Taxa de No Scan', 'pct2'], ['Taxa de Erro de Triagem', 'pct3'],
    ['No Tracking 4+ dias', 'int'], ['Taxa de Consolidação', 'pct'], ['Pontualidade de Transporte', 'pct'],
  ];
  document.querySelectorAll('#ranking-seg button').forEach((b) => b.addEventListener('click', () => dash.setParams({periodo: b.dataset.periodo})));
  dash.onData(() => document.querySelectorAll('#ranking-seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.periodo === per()))));
  dash.draw('ranking-periodo', (p) => {
    const g = dash.data('ranking_total');
    if (g.status !== 'ok') { p.textContent = '—'; return; }
    const r = g.data.find((x) => x.periodo === per());
    p.textContent = r ? r.periodo_txt.replace(/\s+·\s+/, ' · ') + '. Pontos somados pelos pesos de cada indicador.' : '—';
  });
  dash.draw('ranking-podio', (box) => {
    const g = dash.data('ranking_total');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    const rows = g.data.filter((x) => x.periodo === per()).sort((a, b) => a.posicao - b.posicao);
    const medalha = {1: '🥇 1º lugar', 2: '🥈 2º lugar', 3: '🥉 3º lugar'};
    box.replaceChildren(...rows.map((r) => {
      const where = 'chave=' + PT.enc(r.chave);
      const c = PT.el('div', 'pt-card' + (r.posicao === 1 ? ' first' : ''));
      c.id = 'podio-' + r.dc;
      c.append(PT.el('span', 'pos', medalha[r.posicao] || r.posicao + 'º'));
      const dc = PT.el('span', 'pt-dc'); const i = PT.el('i'); i.style.background = PT.cor(r.dc); dc.append(i, document.createTextNode(r.dc)); c.append(dc);
      const big = PT.el('div', 'pt-big'); big.append(PT.mark(PT.el('span', '', PT.fmt(r.total, 'int')), 'ranking_total', 'total', where), document.createTextNode(' pts'));
      c.append(big);
      const sub = PT.el('p', 'pt-sub'); sub.append(document.createTextNode('de 130 possíveis · '), PT.mark(PT.el('span', '', PT.fmt(r.pct, 'pct')), 'ranking_total', 'pct', where));
      c.append(sub);
      const st = PT.el('p', 'pt-sub');
      st.append(document.createTextNode('★ '), PT.mark(PT.el('span', '', String(r.desafios)), 'ranking_total', 'desafios', where), document.createTextNode(' desafio · ✔ '),
        PT.mark(PT.el('span', '', String(r.metas)), 'ranking_total', 'metas', where), document.createTextNode(' meta · ✖ '),
        PT.mark(PT.el('span', '', String(r.falhas)), 'ranking_total', 'falhas', where), document.createTextNode(' fora'));
      c.append(st);
      return c;
    }));
  });
  dash.draw('ranking-linhas', (tb) => {
    const g = dash.data('ranking');
    if (g.status !== 'ok') { tb.replaceChildren(); return; }
    const rows = g.data.filter((x) => x.periodo === per());
    tb.replaceChildren(...IND.map(([ind, f]) => {
      const tr = document.createElement('tr');
      const any = rows.find((x) => x.indicador === ind) || {};
      tr.append(PT.el('td', '', ind));
      const sameMeta = PT.DCS.every((dc) => { const r = rows.find((x) => x.indicador === ind && x.dc === dc); return r && r.meta === any.meta && r.desafio === any.desafio; });
      tr.append(PT.el('td', 'muted', sameMeta ? `${PT.fmt(any.meta, f)} · ${PT.fmt(any.desafio, f)}` : 'varia por DC'));
      for (const dc of PT.DCS) {
        const r = rows.find((x) => x.indicador === ind && x.dc === dc);
        const td = PT.el('td', 'num');
        if (r) {
          const where = 'chave=' + PT.enc(r.chave);
          const ic = r.pontos > r.peso * 100 ? '★' : r.pontos > 0 ? '✔' : '✖';
          const top = PT.el('div'); top.append(PT.el('span', r.pontos > 0 ? 'pt-good' : 'pt-bad', ic + ' '), PT.mark(PT.el('b', '', PT.fmt(r.pontos, 'int')), 'ranking', 'pontos', where), document.createTextNode(' pts'));
          const sub = PT.el('div', 'muted'); sub.append(PT.mark(PT.el('span', '', PT.fmt(r.atingido, f)), 'ranking', 'atingido', where));
          td.append(top, sub);
        } else td.textContent = '—';
        tr.append(td);
      }
      return tr;
    }));
  });
})();
