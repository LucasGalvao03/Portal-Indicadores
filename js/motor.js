/* ===== motor do site: carrega os dados e desenha as seções ===== */
window.dash = (() => {
  const loaders = {}, calcs = {}, draws = {}, onDatas = [], state = {};
  let params = {};
  const colors = ['var(--pt-c1)', 'var(--pt-c2)', 'var(--pt-c3)', '#8a94a6'];
  function data(id) {
    if (calcs[id]) {
      const ins = calcs[id].inputs.map(data);
      const bad = ins.find((x) => x.status !== 'ok');
      if (bad) return {status: bad.status, data: null};
      try { return {status: 'ok', data: calcs[id].fn(...ins.map((x) => x.data))}; } catch (e) { console.error(id, e); return {status: 'error', data: null}; }
    }
    return state[id] || {status: 'loading', data: []};
  }
  let pend = false;
  function render() {
    if (pend) return; pend = true;
    requestAnimationFrame(() => {
      pend = false;
      onDatas.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
      for (const [n, fn] of Object.entries(draws)) document.querySelectorAll(`[data-draw="${n}"]`).forEach((el) => {
        if (el.closest('[hidden]')) return;
        try { fn(el); } catch (e) { console.error(n, e); }
      });
    });
  }
  return {
    colors, data, render,
    loader: (id, o) => { loaders[id] = o; },
    calc: (id, o) => { calcs[id] = o; },
    draw: (n, fn) => { draws[n] = fn; },
    onData: (fn) => { onDatas.push(fn); },
    params: () => params,
    setParams: (p) => { params = {...params, ...p}; Object.keys(p).forEach((k) => { if (p[k] == null) delete params[k]; }); render(); },
    resetParams: () => { params = {}; render(); },
    setLink: (id) => { try { history.replaceState(null, '', '#' + id); } catch (e) {} },
    refresh: () => {},
    _loaders: loaders, _state: state,
  };
})();
