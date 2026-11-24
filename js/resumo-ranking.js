/* ===== Resumo semanal e Ranking calculados no site =====
 * Usa os indicadores diários (já com os dados ao vivo do Sheets) e as mesmas regras do Excel:
 *  - semana operacional de terça a segunda; mês a partir da 1ª terça
 *  - resultado da semana/mês = soma do numerador ÷ soma do denominador dos dias
 *  - No Tracking = pacotes parados há 4+ dias na posição mais recente
 *  - status: bateu o desafio → "Desafio atingido"; bateu a meta → "Dentro da meta"; senão "Fora da meta"
 *  - pontos do ranking: meta = peso; desafio = peso + 5 (total possível 130)
 * Metas, desafios, pesos e as explicações/planos de ação vêm do Excel (dados/novembro.js).
 */
window.PORTAL_RECALCULA = (st, SNAP) => {
  const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
  // indicador do resumo → [nome no ranking, formato, melhor, unidade da evolução]
  const IND = {
    'OffLoading': ['Taxa de Consolidação', 'pct', 'maior', 'pp'],
    'No Scan': ['Taxa de No Scan', 'pct', 'menor', 'pp'],
    'No Tracking': ['No Tracking 4+ dias', 'int', 'menor', 'pedidos'],
    'Erro de Triagem': ['Taxa de Erro de Triagem', 'pct3', 'menor', 'pp'],
    'Eficiência HC': ['Produtividade por pessoa', 'int', 'maior', 'pac/pessoa'],
    'Pontualidade de Transporte': ['Pontualidade de Transporte', 'pct', 'menor', 'pp'],
  };
  const diario = (st.diario && st.diario.data) || [];
  const nt = (st.notracking && st.notracking.data) || [];
  const ntHist = (st.nt_hist && st.nt_hist.data) || [];
  const snapResumo = SNAP.tables.resumo || [];
  const snapRank = SNAP.tables.ranking || [];

  // ---------- datas ----------
  const D = (s) => new Date(s + 'T00:00:00Z');
  const S = (d) => d.toISOString().slice(0, 10);
  const soma = (d, n) => { const x = D(d); x.setUTCDate(x.getUTCDate() + n); return S(x); };
  const terca = (d) => soma(d, -((D(d).getUTCDay() - 2 + 7) % 7));
  const br = (d, ano) => d.slice(8, 10) + '/' + d.slice(5, 7) + (ano ? '/' + d.slice(0, 4) : '');

  const temDado = window.PORTAL_MES.temDado;
  const datas = diario.filter(temDado).map((r) => r.data).sort();
  if (!datas.length) return;
  const ultimo = datas[datas.length - 1];
  const iniMes = window.PORTAL_MES.ini(ultimo);
  const semanaAtual = terca(ultimo);

  // ---------- resultado de um indicador num intervalo de dias ----------
  const ntAtual = {};
  DCS.forEach((dc) => { ntAtual[dc] = nt.filter((r) => r.dc === dc && Number(r.dias) >= 4).length; });
  const ntRef = nt.length ? nt.map((r) => r.data_ref).sort().pop() : null;

  function calcula(ind, dc, ini, fim) {
    const dias = diario.filter((r) => r.dc === dc && r.data >= ini && r.data <= fim);
    const sum = (rows, f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);
    const razao = (rows, a, b) => { const den = sum(rows, b); return den ? sum(rows, a) / den : null; };
    const pior = (rows, f, maior) => {
      let best = null;
      for (const r of rows) { const v = Number(r[f]); if (best == null || (maior ? v > best.v : v < best.v)) best = {v, d: r.data}; }
      return best || {v: null, d: null};
    };
    if (ind === 'OffLoading') {
      const rows = dias.filter((r) => Number(r.recebido_off) > 0);
      const p = pior(rows.map((r) => ({...r, t: r.consolidado / r.recebido_off})), 't', false);
      return {v: razao(rows, 'consolidado', 'recebido_off'), pior: p.v, dia: p.d};
    }
    if (ind === 'No Scan') {
      const rows = dias.filter((r) => r.recebidos_scan != null);
      const p = pior(rows, 'sem_registro', true);
      return {v: razao(rows, 'sem_registro', 'recebidos_scan'), pior: p.v, dia: p.d};
    }
    if (ind === 'Erro de Triagem') {
      const rows = dias.filter((r) => r.recebidos_erro != null);
      const p = pior(rows, 'erros', true);
      return {v: razao(rows, 'erros', 'recebidos_erro'), pior: p.v, dia: p.d};
    }
    if (ind === 'Eficiência HC') {
      const rows = dias.filter((r) => Number(r.volume_hc) > 0 && Number(r.pessoas) > 0);
      const p = pior(rows.map((r) => ({...r, t: r.volume_hc / r.pessoas})), 't', false);
      return {v: razao(rows, 'volume_hc', 'pessoas'), pior: p.v, dia: p.d};
    }
    if (ind === 'Pontualidade de Transporte') {
      const rows = dias.filter((r) => r.rotas != null);
      const p = pior(rows, 'atrasadas', true);
      return {v: razao(rows, 'atrasadas', 'rotas'), pior: p.v, dia: p.d};
    }
    return {v: null, pior: null, dia: null};
  }

  const status = (v, meta, desafio, melhor) => {
    if (v == null || meta == null) return null;
    const ok = (lim) => (melhor === 'maior' ? v >= lim - 1e-12 : v <= lim + 1e-12);
    return ok(desafio) ? 'Desafio atingido' : ok(meta) ? 'Dentro da meta' : 'Fora da meta';
  };
  const fmtNum = (x, casas) => x.toLocaleString('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas});
  const evolucao = (v, ant, melhor, uni) => {
    if (v == null || ant == null) return null;
    const d = uni === 'pp' ? (v - ant) * 100 : v - ant;
    const casas = uni === 'pp' ? 2 : 0;
    if (Math.abs(d) < 0.5 * Math.pow(10, -casas)) return '= Igual';
    const melhorou = melhor === 'maior' ? d > 0 : d < 0;
    return `${melhorou ? '▲' : '▼'} ${d > 0 ? '+' : '-'}${fmtNum(Math.abs(d), casas)} ${uni === 'pp' ? 'p.p.' : uni}`;
  };

  // metas/desafios e textos do Excel
  const metaDe = (ind, dc) => {
    const r = snapResumo.find((x) => x.atual === 1 && x.indicador === ind && x.dc === dc) || snapResumo.find((x) => x.indicador === ind && x.dc === dc);
    return r ? {meta: r.meta, desafio: r.desafio} : {meta: null, desafio: null};
  };
  const textos = new Map(snapResumo.map((r) => [r.chave, r]));

  // ---------- resumo semanal: recalcula as semanas cobertas pelos dados do mês ----------
  const semanas = [];
  for (let s = terca(datas[0]); s <= semanaAtual; s = soma(s, 7)) semanas.push(s);
  const novos = [];
  const anterior = new Map(snapResumo.map((r) => [r.semana + '|' + r.indicador + '|' + r.dc, r]));
  for (const sem of semanas) {
    const fim = soma(sem, 6), ini = sem;
    for (const [ind, [, formato, melhor, uni]] of Object.entries(IND)) {
      for (const dc of DCS) {
        const chave = `${sem}|${ind}|${dc}`;
        let res;
        if (ind === 'No Tracking') {
          // só existe a posição atual; semanas passadas mantêm o valor do Excel
          // semanas passadas: última posição guardada no histórico; senão, o valor do Excel
          const hist = ntHist.filter((r) => r.dc === dc && r.data >= sem && r.data <= fim);
          const ultDia = hist.map((r) => r.data).sort().pop();
          const vHist = ultDia ? hist.filter((r) => r.data === ultDia && r.faixa !== '1. 2-3d').reduce((s, r) => s + r.qtd, 0) : null;
          res = sem === semanaAtual ? {v: ntAtual[dc], pior: null, dia: ntRef} : {v: vHist ?? (anterior.get(chave) || {}).resultado ?? null, pior: null, dia: ultDia || null};
        } else res = calcula(ind, dc, ini, fim);
        // sem dado ao vivo nessa semana: fica o valor do Excel, se houver
        if (res.v == null && anterior.has(chave)) { const a = anterior.get(chave); res = {v: a.resultado, pior: a.pior_valor, dia: a.pior_dia}; }
        const {meta, desafio} = metaDe(ind, dc);
        const semAnt = soma(sem, -7);
        const ant = novos.find((x) => x.semana === semAnt && x.indicador === ind && x.dc === dc) || anterior.get(`${semAnt}|${ind}|${dc}`);
        const t = textos.get(chave) || {};
        novos.push({
          semana: sem, semana_fim: fim, atual: sem === semanaAtual ? 1 : 0, indicador: ind, dc,
          resultado: res.v, formato, melhor, meta, desafio, status: status(res.v, meta, desafio, melhor),
          evolucao: evolucao(res.v, ant ? ant.resultado : null, melhor, uni),
          pior_valor: res.pior, pior_dia: res.dia,
          explicacao: t.explicacao || null, solucao: t.solucao || null, responsavel: t.responsavel || null, chave,
        });
      }
    }
  }
  const semNovas = new Set(semanas);
  const resumo = [...novos, ...snapResumo.filter((r) => !semNovas.has(r.semana)).map((r) => ({...r, atual: 0}))];
  st.resumo = {status: 'ok', data: resumo};

  // ---------- ranking semanal e mensal ----------
  const ranking = [], total = [];
  const periodos = [
    ['Semanal', `Semana operacional  ·  ${br(semanaAtual)} a ${br(soma(semanaAtual, 6), true)}`, (ind, dc) => novos.find((x) => x.semana === semanaAtual && x.indicador === ind && x.dc === dc).resultado],
    ['Mensal', `Mês de operação  ·  ${br(iniMes)} a ${br(ultimo, true)}  (parcial)`, (ind, dc) => (ind === 'No Tracking' ? ntAtual[dc] : calcula(ind, dc, iniMes, ultimo).v)],
  ];
  for (const [periodo, txt, valor] of periodos) {
    const linhas = [];
    for (const dc of DCS) {
      let pts = 0, des = 0, met = 0, fal = 0;
      for (const [ind, [nome, , melhor]] of Object.entries(IND)) {
        const cfg = snapRank.find((r) => r.periodo === periodo && r.dc === dc && r.indicador === nome) || snapRank.find((r) => r.dc === dc && r.indicador === nome);
        if (!cfg) continue;
        const v = valor(ind, dc);
        const stt = status(v, cfg.meta, cfg.desafio, melhor);
        const p = stt === 'Desafio atingido' ? Math.round(cfg.peso * 100) + 5 : stt === 'Dentro da meta' ? Math.round(cfg.peso * 100) : 0;
        if (stt === 'Desafio atingido') des++; else if (stt === 'Dentro da meta') met++; else if (stt === 'Fora da meta') fal++; // sem dados: não conta
        pts += p;
        ranking.push({periodo, dc, indicador: nome, atingido: v, peso: cfg.peso, meta: cfg.meta, desafio: cfg.desafio, pontos: p, chave: `${periodo}|${dc}|${nome}`});
      }
      linhas.push({periodo, periodo_txt: txt, dc, total: pts, possiveis: 130, pct: pts / 130, desafios: des, metas: met, falhas: fal, chave: `${periodo}|${dc}`});
    }
    linhas.sort((a, b) => b.total - a.total || b.desafios - a.desafios || a.falhas - b.falhas).forEach((r, i) => { r.posicao = i + 1; total.push(r); });
  }
  st.ranking = {status: 'ok', data: ranking};
  st.ranking_total = {status: 'ok', data: total};
  window.PORTAL_ORIGEM = window.PORTAL_ORIGEM || {};
  window.PORTAL_ORIGEM.resumo = 'calculado';
};
