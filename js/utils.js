/* ---------- utilitários compartilhados ---------- */
window.PT = (() => {
  const loc = d3.formatLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['R$ ', '']});
  const F = {
    int: loc.format(',.0f'),
    dec1: loc.format(',.1f'),
    pct: (v) => loc.format(',.1f')(v * 100) + '%',
    pct2: (v) => loc.format(',.2f')(v * 100) + '%',
    pct3: (v) => loc.format(',.3f')(v * 100) + '%',
    brl: (v) => 'R$ ' + loc.format(',.2f')(v),
    brl0: (v) => 'R$ ' + loc.format(',.0f')(v),
  };
  const fmt = (v, k) => (v == null || v === '' || Number.isNaN(Number(v))) ? '—' : (F[k] || F.int)(Number(v));
  const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
  const CORES = ['var(--pt-c1)', 'var(--pt-c2)', 'var(--pt-c3)'];
  const cor = (dc) => CORES[Math.max(0, DCS.indexOf(dc))];
  const parse = d3.utcParse('%Y-%m-%d');
  const dm = d3.utcFormat('%d/%m');
  const dmy = d3.utcFormat('%d/%m/%Y');
  const dData = (s) => { const t = parse(String(s).slice(0, 10)); return t ? dm(t) : String(s); };
  const dDataAno = (s) => { const t = parse(String(s).slice(0, 10)); return t ? dmy(t) : String(s); };
  const enc = (v) => String(v).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
  const ok = (id) => dash.data(id).status === 'ok';
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const mark = (e, src, field, where) => { e.dataset.source = src; e.dataset.field = field; if (where) e.dataset.where = where; return e; };
  const stClass = (s) => s === 'Desafio atingido' ? 'st-desafio' : s === 'Dentro da meta' ? 'st-meta' : s === 'Fora da meta' ? 'st-fora' : 'st-sem';
  const pill = (s) => el('span', 'pt-pill ' + stClass(s), s || 'Sem dados');
  const reduce = () => !window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  // linhas de tabela: cols = [{f, fmt, cls, txt(row)}]
  function rows(tbody, data, cols, keyFn) {
    tbody.replaceChildren(...data.map((r) => {
      const tr = document.createElement('tr');
      if (keyFn) tr.dataset.key = keyFn(r);
      for (const c of cols) {
        const td = el('td', c.cls || '');
        if (c.node) td.append(c.node(r));
        else td.textContent = c.txt ? c.txt(r) : (c.fmt ? fmt(r[c.f], c.fmt) : (r[c.f] ?? '—'));
        tr.append(td);
      }
      return tr;
    }));
  }

  function legend(items, square) {
    const lg = el('div', 'pt-legend');
    for (const it of items) {
      const s = el('span');
      const i = el('i', square ? 'sq' : '');
      i.style.background = it.color;
      s.append(i, document.createTextNode(it.name));
      lg.append(s);
    }
    return lg;
  }

  function tipFor(box) {
    const tip = el('div', 'pt-tip');
    tip.hidden = true;
    box.append(tip);
    return {
      show(x, y, title, lines) {
        tip.replaceChildren(el('div', 't', title), ...lines.map((l) => {
          const d = el('div');
          if (l.color) { const i = el('i'); i.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:' + l.color; d.append(i); }
          d.append(document.createTextNode(l.text));
          return d;
        }));
        tip.hidden = false;
        const bw = box.clientWidth, tw = tip.offsetWidth;
        tip.style.left = Math.max(0, Math.min(bw - tw, x + 12)) + 'px';
        tip.style.top = Math.max(0, y - 10) + 'px';
      },
      hide() { tip.hidden = true; },
    };
  }

  function axisW(svg, ticks, fmtFn) {
    const t = svg.append('g').attr('class', 'axis');
    let w = 0;
    for (const v of ticks) { const n = t.append('text').text(fmtFn(v)); w = Math.max(w, n.node().getComputedTextLength()); }
    t.remove();
    return w;
  }

  /* Linhas por série. opts: {series:[{name,color,pts:[{x:Date,y}]}], yFmt, refs:[{y,label}], clip, h} */
  function line(box, opts) {
    box.replaceChildren();
    const series = opts.series.filter((s) => s.pts.length);
    if (!series.length) { box.append(el('p', 'pt-note', 'Sem dados no período.')); return; }
    box.append(legend(series.map((s) => ({name: s.name, color: s.color}))));
    const W = Math.max(280, box.clientWidth || 600), H = opts.h || 220;
    const all = series.flatMap((s) => s.pts.map((p) => p.y));
    let yMax = d3.max([...all, ...(opts.refs || []).map((r) => r.y)]) * 1.12 || 1;
    if (opts.clip != null) yMax = Math.min(yMax, opts.clip);
    const y = d3.scaleLinear().domain([0, yMax]).nice(4);
    const yt = y.ticks(4);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img').attr('aria-label', opts.aria || 'Gráfico de linhas');
    const ml = axisW(svg, yt, opts.yFmt) + 10, mr = 12, mt = 8, mb = 24;
    y.range([H - mb, mt]);
    const dates = [...new Set(series.flatMap((s) => s.pts.map((p) => +p.x)))].sort((a, b) => a - b).map((t) => new Date(t));
    const x = d3.scaleUtc().domain(d3.extent(dates)).range([ml, W - mr]);
    if (dates.length === 1) x.domain([d3.utcDay.offset(dates[0], -1), d3.utcDay.offset(dates[0], 1)]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).tickValues(yt).tickSize(-(W - ml - mr)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).tickValues(yt).tickFormat(opts.yFmt).tickSize(0)).call((g) => g.select('.domain').remove());
    const nT = Math.max(2, Math.floor((W - ml - mr) / 48));
    const step = Math.max(1, Math.ceil(dates.length / nT));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - mb})`).call(d3.axisBottom(x).tickValues(dates.filter((_, i) => i % step === 0)).tickFormat(dm).tickSizeOuter(0));
    const refs = (opts.refs || []).filter((r) => r.y <= yMax).sort((a, b) => b.y - a.y);
    refs.forEach((r, k) => {
      const g = svg.append('g').attr('class', 'ref');
      g.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(r.y)).attr('y2', y(r.y));
      const perto = k > 0 && Math.abs(y(r.y) - y(refs[k - 1].y)) < 16;
      g.append('text').attr('x', ml + 6).attr('y', perto ? y(r.y) + 13 : y(r.y) - 4).text(r.label);
    });
    const cy = (v) => y(Math.min(v, yMax));
    for (const s of series) {
      const p = svg.append('path').datum(s.pts).attr('fill', 'none').style('stroke', s.color).attr('stroke-width', 2)
        .attr('d', d3.line().x((d) => x(d.x)).y((d) => cy(d.y)));
      svg.append('g').selectAll('circle').data(s.pts).join('circle').attr('cx', (d) => x(d.x)).attr('cy', (d) => cy(d.y)).attr('r', 3).style('fill', s.color);
      svg.append('g').selectAll('path').data(s.pts.filter((d) => d.y > yMax)).join('path')
        .attr('d', d3.symbol(d3.symbolTriangle, 50)).attr('transform', (d) => `translate(${x(d.x)},${y(yMax) + 2})`).style('fill', s.color);
      if (!reduce() && !box.dataset.animado) {
        const L = p.node().getTotalLength();
        p.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().duration(700).attr('stroke-dashoffset', 0).on('end', () => p.attr('stroke-dasharray', null));
      }
    }
    box.dataset.animado = '1';
    const tip = tipFor(box);
    const guide = svg.append('line').attr('y1', mt).attr('y2', H - mb).style('stroke', 'var(--cds-chart-reference)').attr('opacity', 0);
    svg.append('rect').attr('x', ml).attr('y', mt).attr('width', W - ml - mr).attr('height', H - mt - mb).attr('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [mx] = d3.pointer(ev);
        const t = x.invert(mx);
        const d = dates.reduce((a, b) => Math.abs(b - t) < Math.abs(a - t) ? b : a);
        guide.attr('x1', x(d)).attr('x2', x(d)).attr('opacity', 1);
        const lines = series.map((s) => { const pt = s.pts.find((q) => +q.x === +d); return {color: s.color, text: `${s.name}: ${pt ? opts.yFmt(pt.y) : '—'}${pt && pt.extra ? ' · ' + pt.extra : ''}`}; });
        const [bx, by] = d3.pointer(ev, box);
        tip.show(bx, by, d3.utcFormat('%d/%m/%Y')(d), lines);
      })
      .on('pointerleave', () => { tip.hide(); guide.attr('opacity', 0); });
  }

  /* Barras por categoria. opts: {cats:[str], series:[{name,color,vals:[n]}], stacked, yFmt, h, catLabel(i)} */
  function bars(box, opts) {
    box.replaceChildren();
    if (!opts.cats.length) { box.append(el('p', 'pt-note', 'Sem dados no período.')); return; }
    if (opts.series.length > 1) box.append(legend(opts.series.map((s) => ({name: s.name, color: s.color})), true));
    const W = Math.max(280, box.clientWidth || 600), H = opts.h || 220;
    const tot = opts.cats.map((_, i) => opts.stacked ? d3.sum(opts.series, (s) => s.vals[i] || 0) : d3.max(opts.series, (s) => s.vals[i] || 0));
    const y = d3.scaleLinear().domain([0, (d3.max(tot) || 1) * 1.12]).nice(4);
    const yt = y.ticks(4).filter((v) => opts.integer ? Number.isInteger(v) : true);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img').attr('aria-label', opts.aria || 'Gráfico de barras');
    const ml = axisW(svg, yt, opts.yFmt) + 10, mr = 8, mt = 16, mb = 24;
    y.range([H - mb, mt]);
    const x0 = d3.scaleBand().domain(opts.cats.map((_, i) => i)).range([ml, W - mr]).paddingInner(0.25).paddingOuter(0.1);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).tickValues(yt).tickSize(-(W - ml - mr)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).tickValues(yt).tickFormat(opts.yFmt).tickSize(0)).call((g) => g.select('.domain').remove());
    const nT = Math.max(2, Math.floor((W - ml - mr) / 52));
    const step = Math.max(1, Math.ceil(opts.cats.length / nT));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - mb})`)
      .call(d3.axisBottom(x0).tickValues(opts.cats.map((_, i) => i).filter((i) => i % step === 0)).tickFormat((i) => opts.cats[i]).tickSizeOuter(0));
    const x1 = d3.scaleBand().domain(opts.series.map((_, j) => j)).range([0, x0.bandwidth()]).padding(0.08);
    const tip = tipFor(box);
    opts.cats.forEach((c, i) => {
      let acc = 0;
      const g = svg.append('g');
      opts.series.forEach((s, j) => {
        const v = s.vals[i] || 0;
        const bx = opts.stacked ? x0(i) : x0(i) + x1(j), bw = opts.stacked ? x0.bandwidth() : x1.bandwidth();
        const y0 = opts.stacked ? acc : 0;
        acc += v;
        g.append('rect').attr('x', bx).attr('width', bw).attr('y', y(y0 + v)).attr('height', Math.max(0, y(y0) - y(y0 + v))).attr('rx', 2).style('fill', s.color).attr('opacity', opts.fade && opts.fade(i) ? 0.55 : 1);
      });
      if (opts.stacked && opts.showTotal && x0.bandwidth() > 18) svg.append('text').attr('x', x0(i) + x0.bandwidth() / 2).attr('y', y(acc) - 4).attr('text-anchor', 'middle')
        .style('fill', 'var(--cds-text-secondary)').style('font-size', 'var(--cds-font-size-caption)').text(opts.yFmt(acc));
      g.append('rect').attr('x', x0(i)).attr('width', x0.bandwidth()).attr('y', mt).attr('height', H - mt - mb).attr('fill', 'transparent')
        .on('pointermove', (ev) => {
          const [bx, by] = d3.pointer(ev, box);
          const lines = opts.series.map((s) => ({color: s.color, text: `${s.name}: ${opts.yFmt(s.vals[i] || 0)}`}));
          if (opts.stacked && opts.series.length > 1) lines.push({text: `Total: ${opts.yFmt(d3.sum(opts.series, (s) => s.vals[i] || 0))}`});
          tip.show(bx, by, opts.catTitle ? opts.catTitle(i) : c, lines);
        })
        .on('pointerleave', () => tip.hide());
    });
  }

  /* Barras horizontais em HTML. items: [{label, value, text, color}] */
  function hbars(box, items, color) {
    const max = d3.max(items, (d) => d.value) || 1;
    box.replaceChildren(...items.map((d) => {
      const r = el('div', 'pt-hbar');
      const lab = el('span', 'lab', d.label); lab.title = d.label;
      const v = el('span', 'v', d.text);
      if (d.mark) mark(v, ...d.mark);
      const tr = el('div', 'track'); const f = el('div', 'fill');
      f.style.width = (100 * d.value / max) + '%'; f.style.background = d.color || color || 'var(--imile-azul)';
      tr.append(f); r.append(lab, v, tr);
      return r;
    }));
    if (!items.length) box.append(el('p', 'pt-note', 'Sem dados.'));
  }

  return {fmt, F, DCS, CORES, cor, parse, dData, dDataAno, enc, ok, el, mark, pill, stClass, rows, legend, line, bars, hbars};
})();
