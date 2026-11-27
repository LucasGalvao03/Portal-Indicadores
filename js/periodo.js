/* Controle de período compartilhado entre os indicadores.
   Acrescenta dois modos aos que já existem (Dia/Semana/Mês), SEM mexer neles:
     • "Intervalo"  → escolher De/Até (faixa contínua)
     • "Datas"      → marcar vários dias avulsos (não seguidos)
   Em ambos o resultado é a SOMA de tudo que foi escolhido (igual Semana/Mês já fazem).
   Uso no indicador:
     const perSt = PERIODO.estado();                        // guardar no módulo
     const {de, ate} = PERIODO.deAte(periodo, datas, perSt) || {de: ..., ate: ...};
     const cobre = PERIODO.cobre(periodo, perSt, de, ate);  // troca "r.data>=de && r.data<=ate" por cobre(r.data)
     PERIODO.segExtra(periodo, (v) => { periodo = v; dash.render(); }).forEach((b) => seg.append(b));
     const pnl = PERIODO.painel(periodo, datas, perSt, () => dash.render()); if (pnl) ctl.append(pnl); */
(() => {
  const el = (t, c, x) => PT.el(t, c, x);
  const br = (d) => (PT.dDataAno ? PT.dDataAno(d) : d);

  // botões extras (Intervalo / Datas) para colocar no .pt-seg que o indicador já monta
  function segExtra(periodo, escolher) {
    return [['intervalo', 'Intervalo'], ['datas', 'Datas']].map(([v, t]) => {
      const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(periodo === v));
      b.addEventListener('click', () => escolher(v));
      return b;
    });
  }

  // painel do modo ativo (ou null para os modos nativos). st = {intDe, intAte, dias:Set}
  function painel(periodo, datas, st, aoMudar) {
    const min = datas[0], max = datas[datas.length - 1];
    if (periodo === 'intervalo') {
      if (!st.intDe || st.intDe < min || st.intDe > max) st.intDe = datas[Math.max(0, datas.length - 7)];
      if (!st.intAte || st.intAte < min || st.intAte > max) st.intAte = max;
      const wrap = el('div', 'per-cx');
      const campo = (rot, val, set) => {
        const l = el('label', 'per-cmp'); const i = el('input', 'dash-select'); i.type = 'date';
        i.value = val; i.min = min; i.max = max;
        i.addEventListener('change', () => { if (i.value) { set(i.value); aoMudar(); } });
        l.append(el('span', '', rot), i); return l;
      };
      wrap.append(campo('De', st.intDe, (v) => (st.intDe = v)), campo('Até', st.intAte, (v) => (st.intAte = v)));
      return wrap;
    }
    if (periodo === 'datas') {
      const wrap = el('div', 'per-datas'); // bloco inline (linha inteira), sempre visível
      const acoes = el('div', 'per-acoes');
      const bTudo = el('button', '', 'Marcar todas'); bTudo.type = 'button';
      const bLim = el('button', '', 'Limpar'); bLim.type = 'button';
      bTudo.addEventListener('click', () => { datas.forEach((d) => st.dias.add(d)); aoMudar(); });
      bLim.addEventListener('click', () => { st.dias.clear(); aoMudar(); });
      acoes.append(el('span', 'per-tit', 'Escolha os dias:'), bTudo, bLim,
        el('span', 'per-conta', st.dias.size ? `${st.dias.size} selecionada(s)` : 'nenhuma selecionada'));
      const grid = el('div', 'per-grid');
      [...datas].reverse().forEach((d) => {
        const lb = el('label', 'per-chip' + (st.dias.has(d) ? ' on' : '')); const c = el('input'); c.type = 'checkbox'; c.checked = st.dias.has(d);
        c.addEventListener('change', () => { c.checked ? st.dias.add(d) : st.dias.delete(d); aoMudar(); });
        lb.append(c, el('span', '', br(d))); grid.append(lb);
      });
      wrap.append(acoes, grid);
      return wrap;
    }
    return null;
  }

  // predicado de pertencimento: substitui "r.data >= de && r.data <= ate"
  function cobre(periodo, st, de, ate) {
    if (periodo === 'datas') { const s = st.dias; return (d) => s.has(d); }
    return (d) => d >= de && d <= ate;
  }

  // de/ate (menor/maior data) dos modos extras — para rótulos, CSV e "período anterior".
  // Retorna null nos modos nativos (o indicador calcula de/ate como já fazia).
  function deAte(periodo, datas, st) {
    const u = datas[datas.length - 1];
    if (periodo === 'intervalo') {
      let de = st.intDe || datas[Math.max(0, datas.length - 7)], ate = st.intAte || u;
      if (de > ate) [de, ate] = [ate, de];
      return {de, ate};
    }
    if (periodo === 'datas') {
      const arr = [...st.dias].filter((d) => datas.includes(d)).sort();
      return {de: arr[0] || u, ate: arr[arr.length - 1] || u, vazio: arr.length === 0};
    }
    return null;
  }

  window.PERIODO = {segExtra, painel, cobre, deAte, estado: () => ({intDe: null, intAte: null, dias: new Set()})};
})();
