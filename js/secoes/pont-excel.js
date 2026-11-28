/* ---------- Pontualidade de Transferência no layout do Excel (Expedição DC → DS) ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-PI3', 'DC-CE1']; // mesma ordem do Excel
  const el = (t, c, x) => PT.el(t, c, x);
  const ISO = (d) => d.toISOString().slice(0, 10);
  const soma = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return ISO(t); };
  const terca = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 5) % 7)); return ISO(t); };
  const br = (d) => d.split('-').reverse().join('/');
  const dm = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
  const min = (t) => (t ? Date.parse(t.replace(' ', 'T') + (t.length === 16 ? ':00' : '') + 'Z') / 60000 : null); // 'aaaa-mm-dd hh:mm[:ss]' → minutos
  const hm = (m) => { if (m == null) return '—'; const t = Math.floor(Math.abs(m)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }; // h:mm (minutos inteiros, como no Excel)
  const hora = (t) => (t ? t.slice(11, 16) : '—');
  const META_PRAZO = 0.93; // até 7% de rotas atrasadas
  let diaEscolhido = null, periodo = 'dia', visao = 'dc', dcRotas = 'DC-PI2', ordem = 'inicio', metaMin = 60, tolerancia = 0;
  const perSt = PERIODO.estado();

  // dados de um DC num período (dentro = predicado de data)
  function doPeriodo(C, dc, dentro) {
    const rotas = C.rotas.filter((r) => r.dc === dc && dentro(r.data));
    const dias = C.dia.filter((r) => r.dc === dc && dentro(r.data));
    const pac = d3.sum(rotas, (r) => r.pacotes), sac = d3.sum(rotas, (r) => r.sacas);
    const ini = d3.min(rotas, (r) => r.primeiro), fim = d3.max(rotas, (r) => r.ultimo);
    // duração da expedição: do 1º ao último bipe de cada dia, somando os dias
    const porDia = d3.rollups(rotas, (v) => min(d3.max(v, (r) => r.ultimo)) - min(d3.min(v, (r) => r.primeiro)), (r) => r.data);
    const dur = rotas.length ? d3.sum(porDia, (x) => x[1]) : null;
    const ativos = d3.sum(dias, (r) => r.ativos), horas = d3.sum(dias, (r) => r.horas);
    const durs = rotas.map((r) => min(r.ultimo) - min(r.primeiro));
    const comSaida = rotas.filter((r) => r.prevista && r.real);
    const noPrazo = comSaida.filter((r) => min(r.real) - min(r.prevista) <= tolerancia).length;
    return {rotas, pac, sac, n: rotas.length, ini, fim, dur, ativos, parado: dur ? Math.max(0, 1 - ativos / dur) : null,
      pacHora: horas ? pac / horas : null, media: durs.length ? d3.mean(durs) : null, maior: durs.length ? d3.max(durs) : null,
      noPrazo, comSaida: comSaida.length};
  }

  // ▲▼ contra o período anterior (para cima é bom, menos na duração)
  const varia = (atual, ant, menorMelhor, fmt) => {
    if (ant == null || !ant) return el('div', 'pd-var', '— sem base anterior');
    const d = (atual || 0) - ant, p = d / ant, bom = menorMelhor ? d < 0 : d > 0;
    const v = el('div', 'pd-var ' + (d === 0 ? '' : bom ? 'pt-good' : 'pt-bad'));
    v.textContent = fmt ? `${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${fmt(Math.abs(d))}  ·  ant. ${fmt(ant)}` : `${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${PT.fmt(Math.abs(p), 'pct')}  ·  ant. ${PT.fmt(ant, 'int')}`;
    return v;
  };

  function painelDC(C, dc, cobre, cobreAnt, de, ate) {
    const a = doPeriodo(C, dc, cobre), b = doPeriodo(C, dc, cobreAnt);
    const p = el('div', 'pd-dc ' + (a.n ? '' : 'vazio'));
    const tit = de === ate ? `Dia ref. ${dm(ate)}` : `${dm(de)} a ${dm(ate)}`;
    p.append(el('div', 'pd-dc-h', `${dc}  ·  ${tit}:  ${a.n ? `${hora(a.ini)} → ${hora(a.fim)}  (${hm(a.dur)})` : 'sem expedição'}`));
    const k4 = el('div', 'pd-k4');
    const kpi = (t, v, sub, cls) => { const k = el('div', 'pd-kpi'); k.append(el('div', 'pd-kpi-h', t), el('div', 'pd-kpi-v ' + (cls || ''), v), sub || el('div', 'pd-var', '')); return k; };
    k4.append(
      kpi('Pacotes', PT.fmt(a.pac, 'int'), varia(a.pac, b.pac)),
      kpi('Sacas', PT.fmt(a.sac, 'int'), varia(a.sac, b.sac)),
      kpi('Rotas', PT.fmt(a.n, 'int'), varia(a.n, b.n)),
      kpi('Pac/hora', PT.fmt(a.pacHora || 0, 'int'), varia(a.pacHora || 0, b.pacHora)),
    );
    const k3 = el('div', 'pd-k3');
    const taxa = a.comSaida ? a.noPrazo / a.comSaida : null;
    k3.append(
      kpi('Duração exped.', hm(a.dur ?? 0), varia(a.dur ?? 0, b.dur, true, hm), 'grande'),
      kpi('Média por rota', hm(a.media ?? 0), varia(a.media ?? 0, b.media, true, hm), 'grande'),
      kpi('Saiu no prazo', taxa == null ? '—' : PT.fmt(taxa, 'pct0'), el('div', 'pd-var', a.comSaida ? `${a.noPrazo} / ${a.comSaida} rotas` : 'sem dados'), 'grande ' + (taxa == null ? '' : taxa >= META_PRAZO ? 'pt-good' : 'pt-bad')),
    );
    const k4b = el('div', 'pd-k4 pd-rod');
    [['1º bipe', a.n ? hora(a.ini) : '—'], ['Último bipe', a.n ? hora(a.fim) : '—'], ['Parado', PT.fmt(a.parado || 0, 'pct0')], ['Maior rota', a.n ? hm(a.maior) : '—']]
      .forEach(([t, v]) => { const k = el('div', 'pd-kpi'); k.append(el('div', 'pd-kpi-h', t), el('div', 'pd-kpi-m', v)); k4b.append(k); });
    p.append(k4, k3, k4b);
    return p;
  }

  // visão "Rotas e DS" de um DC
  function rotasEDs(C, dc, cobre, de, ate) {
    const a = doPeriodo(C, dc, cobre);
    const linhas = a.rotas.map((r) => {
      const dur = min(r.ultimo) - min(r.primeiro);
      const atraso = r.prevista && r.real ? min(r.real) - min(r.prevista) - tolerancia : null;
      const st = !r.veiculo ? ['⚠ sem ID', 'pd-aguard'] : !r.real ? ['⏳ Aguard.', 'pd-aguard'] : !r.prevista ? ['—', ''] : atraso <= 0 ? ['✓ No prazo', 'pd-ok'] : [`✗ +${PT.fmt(atraso, 'int')} min`, 'pd-atraso'];
      return {...r, dur, atraso, st};
    });
    const ord = {inicio: (x, y) => (x.primeiro || '').localeCompare(y.primeiro || ''), pacotes: (x, y) => y.pacotes - x.pacotes, status: (x, y) => (y.atraso ?? -1e9) - (x.atraso ?? -1e9)};
    linhas.sort(ord[ordem]);
    const atrasadas = linhas.filter((l) => l.atraso != null && l.atraso > 0);
    const aguard = linhas.filter((l) => l.veiculo && !l.real).length, semId = linhas.filter((l) => !l.veiculo).length;
    const dss = C.ds.filter((r) => r.dc === dc && cobre(r.data));
    const porDs = d3.rollups(dss, (v) => ({pacotes: d3.sum(v, (r) => r.pacotes), sacas: d3.sum(v, (r) => r.sacas), rotas: d3.sum(v, (r) => r.rotas), dur: d3.sum(v, (r) => min(r.ultimo) - min(r.primeiro))}), (r) => r.ds)
      .map(([ds, v]) => ({ds, ...v})).sort((x, y) => y.pacotes - x.pacotes);

    const out = el('div', 'pd-rotas');
    const kp = el('div', 'pd-rk');
    const card = (t, v, s, cls) => { const c = el('div', 'pd-rk-c'); c.append(el('div', 'pd-kpi-h', t), el('div', 'pd-rk-v ' + (cls || ''), v), el('div', 'pd-rk-s', s)); return c; };
    const taxa = a.comSaida ? a.noPrazo / a.comSaida : null;
    kp.append(
      card('Rotas', PT.fmt(a.n, 'int'), `${PT.fmt(a.pac, 'int')} pacotes`),
      card('Saiu no prazo', taxa == null ? '—' : PT.fmt(taxa, 'pct0'), `${a.noPrazo} / ${a.comSaida}`, taxa == null ? '' : taxa >= META_PRAZO ? 'pt-good' : 'pt-bad'),
      card('Atraso médio na saída', atrasadas.length ? `+${PT.fmt(d3.mean(atrasadas, (l) => l.atraso), 'int')} min` : '0 min', `${atrasadas.length} atrasadas`),
      card('Pendências', PT.fmt(aguard + semId, 'int'), `⏳ ${aguard} aguard.  ·  ⚠ ${semId} sem ID`, aguard + semId ? 'pd-laranja' : ''),
      card('Pacotes do DC', PT.fmt(a.pac, 'int'), 'pacotes'),
      card('DS atendidas', PT.fmt(porDs.length, 'int'), porDs.length ? `≈ ${PT.fmt(a.pac / porDs.length, 'dec1')} pac/DS` : ''),
    );

    // tabela de rotas
    const maxPac = d3.max(linhas, (l) => l.pacotes) || 1, maxDur = d3.max(linhas, (l) => l.dur) || 1;
    const t = el('table', 'pd-tbl');
    t.innerHTML = '<thead><tr><th colspan="6">Rota</th><th colspan="3" class="pd-car">Carregamento</th><th colspan="3" class="pd-sai">Saída</th></tr>' +
      '<tr><th>#</th><th>Data</th><th>DS destino</th><th>Vehicle ID</th><th>Pacotes</th><th>Sacas</th><th>Bipes</th><th>Duração</th><th>Meta</th><th>Prevista</th><th>Real</th><th>Status</th></tr></thead>';
    const tb = el('tbody', '');
    const barra = (v, max, txt, cls) => { const td = el('td', 'pd-barra ' + cls); const s = el('span', ''); s.style.width = `${Math.round((v / max) * 100)}%`; td.append(s, el('b', '', txt)); return td; };
    linhas.forEach((l, i) => {
      const tr = el('tr', '');
      tr.append(el('td', '', String(i + 1)), el('td', '', dm(l.data)), el('td', 'pd-ds', l.ds), el('td', 'pd-vid', l.veiculo || '—'),
        barra(l.pacotes, maxPac, PT.fmt(l.pacotes, 'int'), 'azul'), el('td', 'num', PT.fmt(l.sacas, 'int')),
        el('td', 'pd-bipes', `${dm(l.primeiro)} ${hora(l.primeiro)} → ${hora(l.ultimo)}`), barra(l.dur, maxDur, hm(l.dur), 'laranja'),
        el('td', l.dur <= metaMin ? 'pd-ok' : 'pd-atraso', l.dur <= metaMin ? '✓' : '✗'),
        el('td', '', l.prevista ? hora(l.prevista) : '—'), el('td', '', l.real ? hora(l.real) : ''), el('td', 'pd-st ' + l.st[1], l.st[0]));
      tb.append(tr);
    });
    if (!linhas.length) { const tr = el('tr', ''); const td = el('td', 'pt-note', 'Sem rotas nesse período.'); td.colSpan = 12; tr.append(td); tb.append(tr); }
    t.append(tb);
    const cr = el('div', 'pt-card pd-c-rotas');
    cr.append(el('h3', '', `Rotas — ${dc}`), (() => { const w = el('div', 'pt-tbl-wrap'); w.append(t); return w; })());

    // ranking de DS
    const maxDs = d3.max(porDs, (d) => d.pacotes) || 1;
    const td = el('table', 'pd-tbl');
    td.innerHTML = '<thead><tr><th colspan="7">Ranking DS</th></tr><tr><th>#</th><th>DS</th><th>Pacotes</th><th>% do DC</th><th>Sacas</th><th>Rotas</th><th>Duração</th></tr></thead>';
    const tbd = el('tbody', '');
    porDs.forEach((d, i) => {
      const tr = el('tr', '');
      tr.append(el('td', '', String(i + 1)), el('td', 'pd-ds b', d.ds), barra(d.pacotes, maxDs, PT.fmt(d.pacotes, 'int'), 'azul'),
        el('td', 'num', PT.fmt(a.pac ? d.pacotes / a.pac : 0, 'pct')), el('td', 'num', PT.fmt(d.sacas, 'int')), el('td', 'num', PT.fmt(d.rotas, 'int')), el('td', 'num', hm(d.dur)));
      tbd.append(tr);
    });
    td.append(tbd);
    const cd = el('div', 'pt-card pd-c-ds');
    cd.append(el('h3', '', `DS — ${dc}`), (() => { const w = el('div', 'pt-tbl-wrap'); w.append(td); return w; })());

    const corpo = el('div', 'pd-rotas-corpo'); corpo.append(cr, cd);
    out.append(kp, corpo);
    return out;
  }

  dash.draw('pont-painel', (box) => {
    const C = window.PORTAL_CARGA;
    if (!C || !C.rotas.length) { box.replaceChildren(el('p', 'pt-note', dash.data('diario').status === 'ok' ? 'O detalhe do carregamento ainda está sendo carregado no banco.' : 'Carregando…')); return; }
    const datas = [...new Set(C.rotas.map((r) => r.data))].sort();
    const dia = datas.includes(diaEscolhido) ? diaEscolhido : datas[datas.length - 1];
    let de, ate;
    if (periodo === 'intervalo' || periodo === 'datas') { const rr = PERIODO.deAte(periodo, datas, perSt); de = rr.de; ate = rr.ate; }
    else { de = periodo === 'dia' ? dia : periodo === 'semana' ? terca(dia) : window.PORTAL_MES.ini(dia); ate = dia; }
    const n = Math.round((Date.parse(ate) - Date.parse(de)) / 864e5) + 1;
    const antDe = soma(de, -n), antAte = soma(de, -1);
    const cobre = PERIODO.cobre(periodo, perSt, de, ate);
    const cobreAnt = (d) => d >= antDe && d <= antAte;

    // filtros
    const ctl = el('div', 'pt-controls pd-filtros');
    const lab = el('label', '', 'Dia de referência ');
    const sel = el('select', 'dash-select');
    [...datas].reverse().forEach((d) => { const o = el('option', '', br(d)); o.value = d; if (d === dia) o.selected = true; sel.append(o); });
    sel.addEventListener('change', () => { diaEscolhido = sel.value; dash.render(); });
    lab.append(sel);
    const seg = (opcoes, atual, set) => { const s = el('div', 'pt-seg'); opcoes.forEach(([v, t]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(atual === v)); b.addEventListener('click', () => { set(v); dash.render(); }); s.append(b); }); return s; };
    const segPer = seg([['dia', 'Dia'], ['semana', 'Semana (ter→seg)'], ['mes', 'Mês']], periodo, (v) => { periodo = v; });
    PERIODO.segExtra(periodo, (v) => { periodo = v; dash.render(); }).forEach((b) => segPer.append(b));
    ctl.append(lab, segPer, seg([['dc', 'Por DC'], ['rotas', 'Rotas e DS']], visao, (v) => { visao = v; }));
    const pnl = PERIODO.painel(periodo, datas, perSt, () => dash.render()); if (pnl) ctl.append(pnl);
    const bBase = el('button', 'nt-baixar', '⬇ Baixar base'); bBase.type = 'button';
    bBase.addEventListener('click', () => PT.baixaCSV('pontualidade_base.csv', ['Data', 'DC', 'Rota', 'Pacotes', 'Sacas', '1º bipe', 'Último bipe', 'Prevista', 'Real', 'Veículo'],
      C.rotas.filter((r) => DCS.includes(r.dc) && cobre(r.data)).map((r) => [br(r.data), r.dc, r.rota, r.pacotes || 0, r.sacas || 0, r.primeiro || '', r.ultimo || '', r.prevista || '', r.real || '', r.veiculo || ''])));
    ctl.append(bBase);
    const info = el('p', 'pd-info', `Período: ${br(de)}${de === ate ? ' (1 dia)' : ` a ${br(ate)} (${n} dias)`}  ·  ▲▼ comparado com o período anterior  ·  Parado = pausas de mais de 30 min`);

    if (visao === 'rotas') {
      const ctl2 = el('div', 'pt-controls pd-filtros2');
      const sDc = el('select', 'dash-select'); DCS.forEach((d) => { const o = el('option', '', d); o.value = d; if (d === dcRotas) o.selected = true; sDc.append(o); });
      sDc.addEventListener('change', () => { dcRotas = sDc.value; dash.render(); });
      const sOrd = el('select', 'dash-select'); [['inicio', 'Início'], ['pacotes', 'Pacotes'], ['status', 'Atraso']].forEach(([v, t]) => { const o = el('option', '', t); o.value = v; if (v === ordem) o.selected = true; sOrd.append(o); });
      sOrd.addEventListener('change', () => { ordem = sOrd.value; dash.render(); });
      const num = (v, set) => { const i = el('input', 'dash-select pd-num'); i.type = 'number'; i.min = 0; i.value = v; i.addEventListener('change', () => { set(Number(i.value) || 0); dash.render(); }); return i; };
      const rot = (t, c) => { const l = el('label', '', t + ' '); l.append(c); return l; };
      ctl2.append(rot('DC', sDc), rot('Ordenar', sOrd), rot('Meta (min)', num(metaMin, (v) => { metaMin = v; })), rot('Tolerância (min)', num(tolerancia, (v) => { tolerancia = v; })));
      box.replaceChildren(ctl, info, ctl2, rotasEDs(C, dcRotas, cobre, de, ate));
      return;
    }
    const dcs = el('div', 'pd-dcs');
    DCS.forEach((dc) => dcs.append(painelDC(C, dc, cobre, cobreAnt, de, ate)));
    box.replaceChildren(ctl, info, dcs);
  });
})();
