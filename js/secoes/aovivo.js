/* ---------- Ao vivo: descarregamento e consolidação por DC, em qualquer intervalo de ontem e hoje ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
  const el = (t, c, x) => PT.el(t, c, x);
  const int = (n) => PT.fmt(n || 0, 'int');
  const p2 = (n) => String(n).padStart(2, '0');
  const fmtL = (d) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
  const agoraL = () => fmtL(new Date(Date.now() - 3 * 3600e3)); // hora de Fortaleza, 'aaaa-mm-dd hh:mm'
  const ms = (s) => Date.parse(s.slice(0, 16).replace(' ', 'T') + ':00Z');
  const soma = (s, min) => fmtL(new Date(ms(s) + min * 60e3));
  const hhmm = (min) => { min = Math.max(0, Math.round(min)); return `${Math.floor(min / 60)}h${p2(min % 60)}`; };
  const dm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  const quando = (s) => (s ? `${s.slice(0, 10) === agoraL().slice(0, 10) ? '' : dm(s) + ' '}${s.slice(11, 16)}` : '—');

  // cada DC guarda o seu próprio intervalo (fim = null → até agora, ao vivo)
  // duas abas usam este painel: Ao vivo (receb = descarga e consolidação) e Expedição ao vivo (exped = carregamento);
  // cada aba guarda o seu DC e, em cada DC, o seu intervalo
  let dcSel = 'DC-PI2', modo = 'receb';
  const dcPor = {receb: 'DC-PI2', exped: 'DC-PI2'};
  const filtro = Object.fromEntries(DCS.map((d) => [d, {preset: 'hoje', ini: null, fim: null}]));
  const dados = {}, erros = {};
  let atualizando = false;
  const aba = (dc) => 'AoVivo_' + dc.replace('DC-', '');
  async function carregar(dc) {
    atualizando = true;
    try { dados[dc] = JSON.parse(await window.portalLer(aba(dc))); erros[dc] = null; } catch (e) { erros[dc] = e.message; if (!dados[dc]) dados[dc] = null; }
    atualizando = false;
    dash.render();
  }
  // ---- usado pelo Modo TV: quais DCs estão EM ANDAMENTO agora, por seção ----
  function sitClasse(A, t, agora) {
    if (!A) return null;
    const m = (A.marcas || []).find((x) => x.tipo === t) || {};
    const L = (A.minutos && A.minutos[t]) || [], ult = L.length ? L[L.length - 1][0] : null;
    const atras = m.ate ? (ms(agora) - ms(m.ate)) / 60000 : null;
    const semBipe = ult ? (ms(m.ate || agora) - ms(ult)) / 60000 : null;
    if (m.erro && !/^(processando|ok)\|/.test(String(m.erro))) return 'erro';
    if (atras == null || atras > 15) return 'cinza';
    if (semBipe == null || semBipe > 10) return 'vermelho';
    return 'verde';
  }
  window.aovivoAtivos = async function () {
    await Promise.all(DCS.map(async (d) => { try { dados[d] = JSON.parse(await window.portalLer(aba(d))); } catch (e) { /* mantém o que já tem */ } }));
    const agora = agoraL(), ativo = {aovivo: [], expedicao: []};
    DCS.forEach((d) => {
      const A = dados[d];
      if (sitClasse(A, 'descarga', agora) === 'verde' || sitClasse(A, 'consolida', agora) === 'verde') ativo.aovivo.push(d);
      if (sitClasse(A, 'carga', agora) === 'verde') ativo.expedicao.push(d);
    });
    return ativo;
  };
  (async () => {
    await window.PORTAL_LOGIN;
    carregar(dcSel);
    setInterval(() => { if (!document.hidden && (!document.getElementById('aovivo').hidden || !document.getElementById('expedicao').hidden)) carregar(dcSel); }, 60000);
  })();

  const presets = () => {
    const a = agoraL(), hoje = a.slice(0, 10), ontem = soma(hoje + ' 00:00', -1440).slice(0, 10);
    return {
      hoje: ['Hoje', hoje + ' 00:00', null],
      virada: ['Ontem 18h → agora', ontem + ' 18:00', null],
      ult3: ['Últimas 3 h', soma(a, -180), null],
      ontem: ['Ontem', ontem + ' 00:00', ontem + ' 23:59'],
    };
  };

  // números do intervalo a partir dos bipes por minuto
  function calcula(lista, de, ate, paradoMin) {
    const L = (lista || []).filter(([m]) => m >= de && m <= ate);
    const n = d3.sum(L, (x) => x[1]);
    if (!L.length) return {n: 0, L, ini: null, fim: null, total: 0, parado: 0, ult30: 0};
    let parado = 0;
    for (let i = 1; i < L.length; i++) { const g = (ms(L[i][0]) - ms(L[i - 1][0])) / 60000; if (g > paradoMin) parado += g; }
    const ref = ate < agoraL() ? ate : agoraL();
    const ult30 = d3.sum(L.filter(([m]) => m > soma(ref, -30)), (x) => x[1]);
    return {n, L, ini: L[0][0], fim: L[L.length - 1][0], total: (ms(L[L.length - 1][0]) - ms(L[0][0])) / 60000, parado, ult30};
  }

  // gráfico de LINHA estiloso (linha suave + área com degradê + pontos); mesma assinatura de antes
  function grafico(box, des, con, de, ate, um) {
    box.replaceChildren();
    const span = (ms(ate) - ms(de)) / 60000, passo = span <= 240 ? 15 : 60;
    const balde = (m) => { const t = ms(m), b = passo * 60e3; return fmtL(new Date(Math.floor(t / b) * b)); };
    const mp = new Map();
    const add = (L, k) => L.forEach(([m, n]) => { const b = balde(m); const r = mp.get(b) || {b, d: 0, c: 0}; r[k] += n; mp.set(b, r); });
    add(des.L, 'd'); add(con.L, 'c');
    if (!mp.size) { box.append(el('p', 'pt-note', 'Sem bipes neste intervalo.')); return; }
    const ks = [...mp.keys()].sort(), pts = [];
    for (let b = ks[0]; b <= ks[ks.length - 1]; b = soma(b, passo)) pts.push(mp.get(b) || {b, d: 0, c: 0});
    const W = Math.max(320, box.clientWidth || 700), H = um ? 160 : 208, ml = 16, mr = 16, mt = 26, mb = 30;
    const x = d3.scalePoint().domain(pts.map((p) => p.b)).range([ml, W - mr]).padding(0.5);
    const y = d3.scaleLinear().domain([0, (d3.max(pts, (p) => Math.max(p.d, p.c)) || 1) * 1.2]).range([H - mb, mt]);
    const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('role', 'img').attr('aria-label', 'Pacotes por período');
    const uid = 'av' + Math.random().toString(36).slice(2, 8), defs = svg.append('defs');
    const k = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + 'k' : String(n));
    const xx = (p) => x(p.b);
    // virada do dia
    pts.forEach((p, i) => { if (i && p.b.slice(0, 10) !== pts[i - 1].b.slice(0, 10)) {
      const vx = (x(p.b) + x(pts[i - 1].b)) / 2;
      svg.append('line').attr('x1', vx).attr('x2', vx).attr('y1', mt - 12).attr('y2', H - mb).style('stroke', 'var(--color-fg-muted)').attr('stroke-dasharray', '3 4');
      svg.append('text').attr('x', vx + 4).attr('y', mt - 4).style('fill', 'var(--color-fg-muted)').style('font-size', '10px').text(dm(p.b));
    } });
    const area = (key) => d3.area().x(xx).y0(y(0)).y1((p) => y(p[key])).curve(d3.curveMonotoneX);
    const linha = (key) => d3.line().x(xx).y((p) => y(p[key])).curve(d3.curveMonotoneX);
    const serie = (key, cor, nome) => {
      const gid = uid + key, g = defs.append('linearGradient').attr('id', gid).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
      g.append('stop').attr('offset', '0%').attr('stop-color', cor).attr('stop-opacity', 0.33);
      g.append('stop').attr('offset', '100%').attr('stop-color', cor).attr('stop-opacity', 0);
      svg.append('path').datum(pts).attr('d', area(key)).attr('fill', `url(#${gid})`);
      svg.append('path').datum(pts).attr('d', linha(key)).attr('fill', 'none').attr('stroke', cor).attr('stroke-width', 2.4).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
      const pontos = svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', xx).attr('cy', (p) => y(p[key])).attr('r', 2.9).attr('fill', 'var(--color-panel)').attr('stroke', cor).attr('stroke-width', 1.8);
      pontos.append('title').text((p) => um ? `${dm(p.b)} ${p.b.slice(11, 16)} · carregados ${int(p.d)}` : `${dm(p.b)} ${p.b.slice(11, 16)} · descarregados ${int(p.d)} · consolidados ${int(p.c)}`);
    };
    if (!um) serie('c', 'var(--pt-c2)');
    serie('d', 'var(--pt-c1)');
    // rótulos de valor da série principal, quando há espaço
    const passoPx = pts.length > 1 ? (x(pts[1].b) - x(pts[0].b)) : (W - ml - mr);
    if (passoPx >= 34) svg.append('g').selectAll('text').data(pts.filter((p) => p.d)).join('text')
      .attr('x', xx).attr('y', (p) => y(p.d) - 9).attr('text-anchor', 'middle').attr('class', 'off-rot').style('fill', 'var(--color-fg)').style('font-size', '10px').text((p) => k(p.d));
    // eixo x
    const cada = Math.max(1, Math.ceil(pts.length / Math.floor((W - ml - mr) / 40)));
    svg.append('g').selectAll('text').data(pts.filter((p, i) => i % cada === 0)).join('text')
      .attr('x', xx).attr('y', H - 10).attr('text-anchor', 'middle').style('fill', 'var(--color-fg-muted)').style('font-size', '10px')
      .text((p) => (passo === 60 ? p.b.slice(11, 13) + 'h' : p.b.slice(11, 16)));
  }

  function ranking(titulo, linhas, total) {
    const c = el('div', 'pt-card av-rank');
    c.append(el('h3', '', titulo));
    if (!linhas.length) { c.append(el('p', 'pt-note', 'Sem dados neste intervalo.')); return c; }
    const max = linhas[0][1], ol = el('ol', 'av-lista');
    linhas.forEach(([nome, n], i) => {
      const li = el('li'), b = el('span', 'av-barra'); b.style.width = (n / max * 100).toFixed(1) + '%';
      li.append(el('span', 'av-pos', String(i + 1)), el('span', 'av-nome', nome), el('span', 'av-n', int(n) + (total ? ` · ${PT.fmt(n / total, 'pct0')}` : '')), b);
      ol.append(li);
    });
    c.append(ol);
    return c;
  }
  const rank = (lista, de, ate) => {
    const b0 = fmtL(new Date(Math.floor(ms(de) / 9e5) * 9e5)), m = new Map();
    (lista || []).forEach(([b, nome, n]) => { if (b >= b0 && b <= ate) m.set(nome, (m.get(nome) || 0) + n); });
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 12);
  };

  // ---------- expedição (carregamento) ----------
  function expedicao(A, de, ate, fim, agora, sit) {
    const out = [], pm = A.parado_min || 10;
    if (!(A.marcas || []).some((m) => m.tipo === 'carga')) {
      out.push(el('div', 'av-aviso', 'A expedição ainda não está ligada no robô. Assim que ele começar a puxar o LoadingScan, os dados aparecem aqui.'));
      return out;
    }
    const car = calcula(A.minutos && A.minutos.carga, de, ate, pm);
    const liquido = Math.max(0, car.total - car.parado);
    // pacotes de cada rota no intervalo (blocos de 15 min) + dados da rota
    const b0 = fmtL(new Date(Math.floor(ms(de) / 9e5) * 9e5)), porRota = new Map();
    (A.rotas_15 || []).forEach(([b, rota, n]) => { if (b >= b0 && b <= ate) porRota.set(rota, (porRota.get(rota) || 0) + n); });
    const info = new Map((A.rotas || []).map((r) => [r.rota, r]));
    const rotas = [...porRota].map(([rota, n]) => ({...(info.get(rota) || {rota}), nInt: n})).sort((a, b) => String(b.fim).localeCompare(String(a.fim)));
    const placas = new Set(rotas.flatMap((r) => String(r.placas || '').split(', ').filter(Boolean)));
    const sacas = d3.sum(rotas, (r) => r.sacas || 0);
    const estado = (r) => {
      if (fim) return {cls: 'fim', txt: 'no período'};
      const min = (ms(agora) - ms(r.fim)) / 60000;
      return min <= 10 ? {cls: 'agora', txt: 'carregando agora'} : min <= 30 ? {cls: 'pausa', txt: `parada há ${Math.round(min)} min`} : {cls: 'fim', txt: 'finalizada'};
    };
    const c = el('div', 'av-dc av-exp');
    const h = el('div', 'av-dc-h');
    h.append(el('span', '', `🚚 ${dcSel} · Expedição · ${dm(de)} ${de.slice(11, 16)} → ${fim ? `${dm(ate)} ${ate.slice(11, 16)}` : 'agora'}`), el('span', 'av-ult ' + (fim ? '' : sit.cls), fim ? (car.fim ? `último bipe ${quando(car.fim)}` : 'sem bipes no intervalo') : sit.txt));
    const kpi = (t, v, sub, cls) => { const x = el('div', 'av-kpi ' + (cls || '')); x.append(el('div', 'av-kpi-h', t), el('div', 'av-kpi-v', v)); if (sub) x.append(el('div', 'av-kpi-s', sub)); return x; };
    const k = el('div', 'av-kpis');
    k.append(
      kpi('Pacotes carregados', int(car.n), car.ini ? `${quando(car.ini)} → ${quando(car.fim)}` : '', 'des'),
      kpi('Sacas', int(sacas), 'das rotas do período', 'con'),
      kpi('Rotas', int(rotas.length), fim ? '' : `${rotas.filter((r) => estado(r).cls === 'agora').length} carregando agora`),
      kpi('Tempo total', hhmm(car.total), '1º ao último bipe'),
      kpi('Tempo parado', hhmm(car.parado), `pausas > ${pm} min`),
      kpi('Pacotes/hora', liquido > 0 ? int(car.n / (liquido / 60)) : '—', 'no tempo líquido'),
    );
    c.append(h, k);
    // rotas carregando agora
    const agoraR = fim ? [] : rotas.filter((r) => estado(r).cls !== 'fim');
    if (!fim) {
      c.append(el('div', 'av-sub', 'Rotas no pátio agora'));
      if (!agoraR.length) c.append(el('p', 'pt-note av-patio-vazio', sit.cls === 'cinza'
        ? 'O robô ainda está alcançando o horário atual — as rotas em carregamento aparecem aqui assim que ele chegar em agora.'
        : 'Nenhuma rota sendo carregada agora (sem bipe de carregamento nos últimos 30 min).'));
    }
    if (agoraR.length) {
      const g = el('div', 'av-patio');
      agoraR.forEach((r) => {
        const e = estado(r), x = el('div', 'av-rota ' + e.cls);
        const topo = el('div', 'av-rota-h'); const nr = el('b', '', r.rota); nr.title = r.rota; topo.append(nr, el('span', 'av-rota-st', e.txt));
        const pl = el('div', 'av-rota-pl'); pl.append(el('span', 'av-placa', r.placas || 'sem placa'), document.createTextNode(r.motoristas ? ` · ${r.motoristas}` : ''));
        const nums = el('div', 'av-rota-n');
        nums.append(el('span', '', `📦 ${int(r.nInt)}`), el('span', '', `🎒 ${int(r.sacas || 0)} sacas`), el('span', '', `⏱ ${hhmm((ms(r.fim) - ms(r.ini)) / 60000)}`));
        x.append(topo, pl, el('div', 'av-rota-ds', '→ ' + (r.ds || '—')), nums, el('div', 'av-rota-op', '👷 ' + (r.operadores || '—')));
        g.append(x);
      });
      c.append(g);
    }
    // veículos já finalizados passando na tela (faixa deslizante)
    const fins = fim ? rotas : rotas.filter((r) => estado(r).cls === 'fim');
    if (fins.length) {
      c.append(el('div', 'av-sub', `Veículos finalizados (${fins.length})`));
      const fx = el('div', 'av-marquee'), trilho = el('div', 'av-marq-trilho');
      const fchip = (r) => { const z = el('div', 'av-fchip');
        z.append(el('span', 'av-fplaca', r.placas || 'sem placa'), el('span', 'av-frota', r.rota), el('span', 'av-fn', `📦 ${int(r.nInt)}`));
        z.title = `${r.rota} · ${r.placas || 'sem placa'} · ${int(r.nInt)} pacotes · ${int(r.sacas || 0)} sacas`;
        return z; };
      [...fins, ...fins].forEach((r) => trilho.append(fchip(r))); // dobrado = rolagem contínua
      fx.append(trilho); c.append(fx);
    }
    const gr = el('div', 'pt-chart av-graf');
    const leg = el('div', 'av-leg'); leg.append(el('span', 'l1', 'Pacotes carregados'));
    c.append(el('div', 'av-sub', (ms(ate) - ms(de)) / 60000 <= 240 ? 'Pacotes a cada 15 min' : 'Pacotes por hora'), gr, leg);
    out.push(c);
    requestAnimationFrame(() => grafico(gr, car, {L: []}, de, ate, true));
    // tabela de rotas
    const t = el('div', 'pt-card av-tab');
    t.append(el('h3', '', `Rotas do período (${rotas.length})`));
    if (!rotas.length) t.append(el('p', 'pt-note', 'Sem rotas neste intervalo.'));
    else {
      const w = el('div', 'pt-tbl-wrap'), tb = el('table', 'av-tbl'), th = el('tr');
      ['Rota', 'Placa', 'Motorista', 'Destino', 'Pacotes', 'Sacas', 'Início', 'Último bipe', 'Duração', 'Situação'].forEach((x) => th.append(el('th', '', x)));
      const thead = el('thead'); thead.append(th); tb.append(thead);
      const tbody = el('tbody');
      rotas.forEach((r) => {
        const e = estado(r), tr = el('tr');
        [r.rota, r.placas || '—', r.motoristas || '—', r.ds || '—', int(r.nInt), int(r.sacas || 0), quando(r.ini), quando(r.fim), hhmm((ms(r.fim) - ms(r.ini)) / 60000)].forEach((v, i) => tr.append(el('td', i >= 4 && i <= 5 ? 'n' : '', v)));
        const s = el('td'); s.append(el('span', 'av-tag ' + e.cls, e.txt)); tr.append(s);
        tbody.append(tr);
      });
      tb.append(tbody); w.append(tb); t.append(w);
    }
    out.push(t);
    const rk = el('div', 'av-ranks dois');
    rk.append(ranking('Carregamento por operador', rank(A.operadores && A.operadores.carga, de, ate), car.n),
      ranking('Carregamento por destino', rank(A.destinos && A.destinos.carga, de, ate), car.n));
    out.push(rk, el('p', 'pt-note', 'Rotas, pacotes e rankings somam blocos de 15 minutos; sacas são o total de cada rota. "Carregando agora" = bipe nos últimos 10 min.'));
    return out;
  }

  const desenhar = (m) => (box) => {
    modo = m; dcSel = dcPor[m];
    const A = dados[dcSel], agora = agoraL();
    const dormindo = !A || !A.gerado || (ms(agora) - ms(A.gerado)) / 60000 > 10;  // robô parado/em soneca → mostra "Acordar"
    // topo: DC e intervalo
    const seg = el('div', 'pt-seg');
    DCS.forEach((d) => { const b = el('button', '', d); b.type = 'button'; b.setAttribute('aria-pressed', String(d === dcSel)); b.addEventListener('click', () => { dcPor[m] = dcSel = d; if (!dados[d]) carregar(d); dash.render(); }); seg.append(b); });
    const F = filtro[m + dcSel] || (filtro[m + dcSel] = {preset: 'hoje', ini: null, fim: null});
    const P = presets();
    if (F.preset && P[F.preset]) { F.ini = P[F.preset][1]; F.fim = P[F.preset][2]; }
    const {ini, fim, preset} = F;
    const de = ini || P.hoje[1], ate = fim || agora;
    const pseg = el('div', 'pt-seg');
    Object.entries(P).forEach(([k, [t]]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(preset === k)); b.addEventListener('click', () => { F.preset = k; dash.render(); }); pseg.append(b); });
    const minimo = (A && A.desde) || P.ontem[1];
    const campo = (rot, v, set) => {
      const l = el('label', 'hc-data'), i = el('input', 'dash-select'); i.type = 'datetime-local'; i.step = 60;
      i.value = v ? v.replace(' ', 'T') : ''; i.min = minimo.replace(' ', 'T'); i.max = agora.replace(' ', 'T');
      i.addEventListener('change', () => { F.preset = null; set(i.value ? i.value.replace('T', ' ').slice(0, 16) : null); dash.render(); });
      l.append(el('span', '', rot), i); return l;
    };
    const filtros = el('div', 'av-filtros');
    filtros.append(seg, pseg, campo('De', de, (v) => { F.ini = v; }), campo('Até', fim, (v) => { F.fim = v; }));
    if (!fim) filtros.append(el('span', 'av-agora', 'até agora (ao vivo)'));
    const rf = el('button', 'av-refresh', atualizando ? '⟳ Atualizando…' : '⟳ Atualizar');
    rf.type = 'button'; rf.disabled = atualizando;
    rf.addEventListener('click', () => { carregar(dcSel); dash.render(); });
    filtros.append(rf);
    if (dormindo) {
      const ac = el('button', 'av-acordar', '⏰ Acordar robô');
      ac.type = 'button';
      ac.title = 'O robô parece parado (soneca) — avisa ele para voltar a puxar na hora';
      ac.addEventListener('click', async () => {
        const txt = ac.textContent; ac.disabled = true; ac.textContent = '⏰ Acordando…';
        try {
          await window.portalApi('acordar', {metodo: 'POST'});
          window.portalToast && window.portalToast({icone: '⏰', titulo: 'Robô avisado', texto: 'Se estava em soneca, volta a puxar em até ~15s.'});
        } catch (e) {
          window.portalToast && window.portalToast({icone: '⚠️', titulo: 'Não consegui avisar o robô', texto: String((e && e.message) || e).slice(0, 120)});
        } finally {
          setTimeout(() => { ac.disabled = false; ac.textContent = txt; }, 3000);
        }
      });
      filtros.append(ac);
    }
    const out = [filtros];

    if (!A) {
      out.push(el('p', 'pt-note', erros[dcSel] ? (/404/.test(erros[dcSel]) ? `O robô do ${dcSel} ainda não gravou dados.` : 'Não foi possível ler o painel ao vivo agora.') : 'Carregando…'));
      box.replaceChildren(...out); return;
    }
    const velho = A.gerado ? (ms(agora) - ms(A.gerado)) / 60000 : 999;
    const st = el('div', 'av-status');
    const viv = el('div', 'av-vivo ' + (velho <= 10 ? '' : 'off'));
    viv.append(el('i'), el('b', '', velho <= 10 ? 'AO VIVO' : 'PARADO'));
    st.append(viv, el('span', 'av-quando', `${dcSel} · robô atualizou às ${quando(A.gerado)}${velho > 10 ? ` (há ${hhmm(velho)})` : ''} · a tela atualiza sozinha a cada minuto`));
    // situação de cada relatório: verde = operação em andamento · cinza = robô ainda alcançando o horário atual
    // vermelho = robô em dia, mas as últimas puxadas vieram sem bipe (operação encerrada)
    const situacao = (t) => {
      const m = (A.marcas || []).find((x) => x.tipo === t) || {};
      const L = (A.minutos && A.minutos[t]) || [], ult = L.length ? L[L.length - 1][0] : null;
      const atras = m.ate ? (ms(agora) - ms(m.ate)) / 60000 : null;
      const semBipe = ult ? (ms(m.ate || agora) - ms(ult)) / 60000 : null;
      if (m.erro && !/^(processando|ok)\|/.test(String(m.erro))) return {cls: 'erro', txt: 'robô com erro, tentando de novo', ult, m};
      if (atras == null || atras > 15) return {cls: 'cinza', txt: m.ate ? `atualizando · puxou até ${quando(m.ate)}` : 'atualizando', ult, m};
      if (semBipe == null || semBipe > 10) return {cls: 'vermelho', txt: ult ? `operação encerrada · último bipe ${quando(ult)}` : 'sem operação hoje', ult, m};
      return {cls: 'verde', txt: `em andamento · último bipe ${quando(ult)}`, ult, m};
    };
    const sit = {descarga: situacao('descarga'), consolida: situacao('consolida'), carga: situacao('carga')};
    const lido = el('div', 'av-lido');
    (modo === 'exped' ? [['carga', 'Expedição']] : [['descarga', 'Descarregamento'], ['consolida', 'Consolidação']]).forEach(([t, nome]) => {
      const x = sit[t], chip = el('span', 'av-chip ' + x.cls);
      chip.title = x.m.ate ? `Puxou até ${quando(x.m.ate)} · última rodada ${quando(x.m.quando)}` : '';
      chip.append(el('b', '', nome + ': '), document.createTextNode(x.txt));
      lido.append(chip);
    });
    out.push(st, lido);
    const errs = (A.marcas || []).filter((m) => m.erro && !/^(processando|ok)\|/.test(String(m.erro)));
    if (errs.some((m) => m.erro === 'TOKEN EXPIRADO')) out.push(el('div', 'av-aviso', 'O token do sistema iMile expirou: o robô parou de puxar dados. Atualize o TOKEN no config.py do robô e reinicie.'));
    else if (errs.length) out.push(el('div', 'av-aviso', 'O robô teve erro em: ' + errs.map((m) => ({descarga: 'descarregamento', consolida: 'consolidação', carga: 'expedição'})[m.tipo] || m.tipo).join(', ') + '. Ele tenta de novo a cada 3 min.'));
    // (o atraso do robô aparece em cinza nos quadros de situação)
    if (modo === 'exped') { out.push(...expedicao(A, de, ate, fim, agora, sit.carga)); box.replaceChildren(...out); return; }

    const pm = A.parado_min || 10;
    const des = calcula(A.minutos && A.minutos.descarga, de, ate, pm), con = calcula(A.minutos && A.minutos.consolida, de, ate, pm);
    const liquido = Math.max(0, des.total - des.parado);
    const c = el('div', 'av-dc');
    const h = el('div', 'av-dc-h');
    const ultimo = [des.fim, con.fim].filter(Boolean).sort().pop(), minSem = ultimo ? (ms(agora) - ms(ultimo)) / 60000 : null;
    h.append(el('span', '', `${dcSel} · ${dm(de)} ${de.slice(11, 16)} → ${fim ? `${dm(ate)} ${ate.slice(11, 16)}` : 'agora'}`),
      (() => {
        const cs = [sit.descarga.cls, sit.consolida.cls];
        const cls = fim ? '' : cs.includes('verde') ? 'verde' : cs.includes('cinza') ? 'cinza' : cs.every((c) => c === 'vermelho') ? 'vermelho' : '';
        const txt = minSem == null ? 'sem bipes no intervalo' : fim ? `último bipe ${quando(ultimo)}` : cls === 'verde' ? (minSem <= 2 ? 'em andamento · bipando agora' : `em andamento · último bipe ${quando(ultimo)}`) : cls === 'cinza' ? 'atualizando…' : `operação encerrada · último bipe ${quando(ultimo)}`;
        return el('span', 'av-ult ' + cls, txt);
      })());
    const kpi = (t, v, sub, cls) => { const x = el('div', 'av-kpi ' + (cls || '')); x.append(el('div', 'av-kpi-h', t), el('div', 'av-kpi-v', v)); if (sub) x.append(el('div', 'av-kpi-s', sub)); return x; };
    const taxa = des.n ? con.n / des.n : null;
    const k = el('div', 'av-kpis');
    k.append(
      kpi('Descarregados', int(des.n), des.ini ? `${quando(des.ini)} → ${quando(des.fim)}` : '', 'des'),
      kpi('Consolidados', int(con.n), con.ini ? `${quando(con.ini)} → ${quando(con.fim)}` : '', 'con'),
      kpi('Consolidado x Descarregado', taxa == null ? '—' : PT.fmt(taxa, 'pct0'), '', taxa == null ? '' : taxa >= 0.9 ? 'bom' : taxa >= 0.8 ? 'meio' : 'ruim'),
      kpi('Tempo total', hhmm(des.total), 'descarga · 1º ao último bipe'),
      kpi('Tempo parado', hhmm(des.parado), `pausas > ${pm} min`),
      kpi('Tempo líquido', hhmm(liquido), ''),
      kpi('Pacotes/hora', liquido > 0 ? int(des.n / (liquido / 60)) : '—', 'no tempo líquido'),
    );
    const span = (ms(ate) - ms(de)) / 60000;
    const gr = el('div', 'pt-chart av-graf');
    const leg = el('div', 'av-leg'); leg.append(el('span', 'l1', 'Descarregados'), el('span', 'l2', 'Consolidados'));
    c.append(h, k, el('div', 'av-sub', span <= 240 ? 'Pacotes a cada 15 min' : 'Pacotes por hora'), gr, leg);
    out.push(c);
    requestAnimationFrame(() => grafico(gr, des, con, de, ate));

    const rk = el('div', 'av-ranks');
    rk.append(
      ranking('Descarregamento por operador', rank(A.operadores && A.operadores.descarga, de, ate), des.n),
      ranking('Consolidação por operador', rank(A.operadores && A.operadores.consolida, de, ate), con.n),
      ranking('Consolidação por destino', rank(A.destinos && A.destinos.consolida, de, ate), con.n));
    out.push(rk, el('p', 'pt-note', 'Os rankings somam blocos de 15 minutos; os totais e tempos são minuto a minuto. O painel guarda ontem e hoje.'));
    box.replaceChildren(...out);
  };
  dash.draw('aovivo-painel', desenhar('receb'));
  dash.draw('expedicao-painel', desenhar('exped'));
})();
