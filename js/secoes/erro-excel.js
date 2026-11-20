/* ---------- Erro de Triagem no layout do Excel (painel de acompanhamento dos erros de triagem) ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
  const COR = {'DC-PI2': '#0f7b6c', 'DC-CE1': '#d84315', 'DC-PI3': '#5e35b1'};
  const el = (t, c, x) => PT.el(t, c, x);
  const ISO = (d) => d.toISOString().slice(0, 10);
  const soma = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return ISO(t); };
  const terca = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 5) % 7)); return ISO(t); };
  let diaEscolhido = null, periodo = 'dia';

  const somaErros = (E, de, ate, dc) => E.reduce((s, r) => s + (r.data >= de && r.data <= ate && (!dc || r.dc === dc) ? r.n : 0), 0);
  const somaReceb = (R, de, ate, dc) => R.reduce((s, r) => s + (r.data >= de && r.data <= ate && (!dc || r.dc === dc) ? r.n : 0), 0);

  function baixar(E, de, ate) {
    const P = window.PORTAL_ERRO.pacotes;
    let cab, linhas;
    if (P && P.length) { // um pacote por linha, com o waybill
      cab = ['Data', 'DC', 'Waybill', 'DS que recebeu', 'DS correta', 'Cliente'];
      linhas = P.filter((r) => r.data >= de && r.data <= ate).map((r) => [PT.dDataAno(r.data), r.dc, r.waybill ? `="${r.waybill}"` : '', r.ds_recebeu, r.ds_destino, r.cliente]);
    } else { // enquanto a lista não existir: o resumo por DS
      cab = ['Data', 'DC', 'DS que recebeu', 'DS correta', 'Erros'];
      linhas = E.filter((r) => r.data >= de && r.data <= ate).map((r) => [PT.dDataAno(r.data), r.dc, r.ds_recebeu, r.ds_destino, r.n]);
    }
    const q = (v) => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const csv = '﻿' + [cab, ...linhas].map((l) => l.map(q).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    a.download = `erro_triagem_${de}${de === ate ? '' : '_a_' + ate}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // tabela de um DC: DS que recebeu (agrupada) × DS correta × erros
  function painelDC(E, R, dc, de, ate, totalErros) {
    const n = somaErros(E, de, ate, dc), rec = somaReceb(R, de, ate, dc);
    const p = el('div', 'er-dc'); p.style.setProperty('--cor', COR[dc]);
    const h = el('div', 'er-dc-h');
    const l1 = el('div', 'er-dc-l1'); l1.append(el('b', '', dc), el('b', 'er-dc-n', PT.fmt(n, 'int')));
    h.append(l1, el('div', 'er-dc-l2', `Rate ${PT.fmt(rec ? n / rec : 0, 'pct2')}   ·   ${PT.fmt(totalErros ? n / totalErros : 0, 'pct')} dos erros`));
    p.append(h);
    const m = new Map();
    E.filter((r) => r.dc === dc && r.data >= de && r.data <= ate).forEach((r) => { const k = r.ds_recebeu + '|' + r.ds_destino; m.set(k, (m.get(k) || 0) + r.n); });
    const grupos = new Map();
    [...m].forEach(([k, v]) => { const [a, b] = k.split('|'); if (!grupos.has(a)) grupos.set(a, []); grupos.get(a).push([b, v]); });
    const ordem = [...grupos].sort((a, b) => d3.sum(b[1], (x) => x[1]) - d3.sum(a[1], (x) => x[1]));
    const t = el('table', 'er-tbl');
    t.innerHTML = '<thead><tr><th>Station Received</th><th>DS Delivery Station</th><th class="num">Total Erros</th></tr></thead>';
    const tb = el('tbody', '');
    ordem.forEach(([a, lista]) => {
      lista.sort((x, y) => y[1] - x[1]).forEach(([b, v], i) => {
        const tr = el('tr', i === 0 ? 'er-g' : '');
        if (i === 0) { const td = el('td', 'er-rec', a); td.rowSpan = lista.length; tr.append(td); }
        tr.append(el('td', '', b || '—'), el('td', 'num', PT.fmt(v, 'int')));
        tb.append(tr);
      });
    });
    const tf = el('tr', 'er-total'); const td = el('td', '', 'Total Geral'); td.colSpan = 2; tf.append(td, el('td', 'num', PT.fmt(n, 'int'))); tb.append(tf);
    t.append(tb);
    p.append(t);
    return p;
  }

  dash.draw('erro-painel', (box) => {
    const D = window.PORTAL_ERRO;
    if (!D) { box.replaceChildren(el('p', 'pt-note', dash.data('diario').status === 'ok' ? 'Sem dados do Erro de Triagem.' : 'Carregando…')); return; }
    const E = D.erros.filter((r) => DCS.includes(r.dc)), R = D.receb.filter((r) => DCS.includes(r.dc));
    const datas = [...new Set([...E.map((r) => r.data), ...R.map((r) => r.data)])].sort();
    if (!datas.length) { box.replaceChildren(el('p', 'pt-note', 'Sem dados.')); return; }
    const dia = datas.includes(diaEscolhido) ? diaEscolhido : datas[datas.length - 1];
    const de = periodo === 'semana' ? terca(dia) : dia, ate = dia;

    // filtros
    const ctl = el('div', 'pt-controls');
    const lab = el('label', '', 'Dia ');
    const sel = el('select', 'dash-select');
    [...datas].reverse().forEach((d) => { const o = el('option', '', PT.dDataAno(d)); o.value = d; if (d === dia) o.selected = true; sel.append(o); });
    sel.addEventListener('change', () => { diaEscolhido = sel.value; dash.render(); });
    lab.append(sel);
    const seg = el('div', 'pt-seg');
    [['dia', 'Só o dia'], ['semana', 'Semana até o dia']].forEach(([v, t]) => {
      const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(periodo === v));
      b.addEventListener('click', () => { periodo = v; dash.render(); });
      seg.append(b);
    });
    const total = somaErros(E, de, ate);
    const bt = el('button', 'nt-baixar', `⬇ Baixar base (${PT.fmt(total, 'int')} erros)`);
    bt.type = 'button';
    bt.addEventListener('click', () => baixar(E, de, ate));
    ctl.append(lab, seg, bt);

    // indicadores (coluna da esquerda, como no Excel)
    const n = de === ate ? 1 : Math.round((Date.parse(ate) - Date.parse(de)) / 864e5) + 1;
    const antDe = soma(de, -n), antAte = soma(ate, -n);
    const totalAnt = somaErros(E, antDe, antAte), rec = somaReceb(R, de, ate);
    const evol = total - totalAnt;
    const ind = el('div', 'er-ind');
    const kpi = (tit, v, cor, cls) => { const k = el('div', 'er-kpi'); k.style.setProperty('--cor', cor); k.append(el('div', 'er-kpi-h', tit), el('div', 'er-kpi-v ' + (cls || ''), v)); return k; };
    ind.append(
      el('div', 'er-ind-t', 'Indicadores'),
      kpi('Total erros', PT.fmt(total, 'int'), '#2d9cdb'),
      kpi(de === ate ? 'Total D-1' : 'Período anterior', PT.fmt(totalAnt, 'int'), '#9aa5b1'),
      kpi('Evolução', (evol > 0 ? '+' : '') + PT.fmt(evol, 'int'), '#eb5757', evol > 0 ? 'pt-bad' : evol < 0 ? 'pt-good' : ''),
      kpi('Taxa de erro (rate)', PT.fmt(rec ? total / rec : 0, 'pct2'), '#f2c94c', 'er-amarelo'),
    );

    const dcs = el('div', 'er-dcs');
    DCS.forEach((dc) => dcs.append(painelDC(E, R, dc, de, ate, total)));
    const corpo = el('div', 'er-corpo');
    corpo.append(ind, dcs);
    box.replaceChildren(ctl, corpo);
  });
})();
