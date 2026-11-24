/* ===== Login com Feishu: o portal só carrega os dados com uma sessão válida ===== */
(() => {
  const APP_ID = 'cli_ab88bade7538dd19';
  const FUNCAO = 'https://iemdlzzzynzmmbnczjwk.supabase.co/functions/v1/portal';
  const VOLTA = 'https://lucasgalvao03.github.io/Portal-Indicadores/';
  const CHAVE = 'portal_sessao';
  const guardar = (s) => { try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch (e) { /* sem armazenamento */ } };
  const lerSessao = () => { try { const s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } };
  const sair = () => { try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ } location.replace(VOLTA); };

  function tela(msg, erro) {
    let t = document.getElementById('login-tela');
    if (!t) {
      t = document.createElement('div'); t.id = 'login-tela'; t.className = 'login-tela';
      // pacote com a fita amarela da iMile
      const caixa = (x, y, w, h, c) => `<g><g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="2" fill="${c || '#c8955a'}"/><rect y="${h * 0.38}" width="${w}" height="${h * 0.22}" fill="#FFC000"/><rect x="${w * 0.12}" y="${h * 0.12}" width="${w * 0.3}" height="${h * 0.16}" rx="1" fill="#fff" opacity=".85"/><rect width="${w}" height="${h}" rx="2" fill="none" stroke="rgba(0,0,0,.18)"/></g></g>`;
      const roda = (cx) => `<g class="lg-roda" style="transform-origin:${cx}px 128px"><circle cx="${cx}" cy="128" r="17" fill="#141a2b"/><circle cx="${cx}" cy="128" r="9" fill="#9aa6c0"/><path d="M${cx - 9} 128h18M${cx} 119v18" stroke="#141a2b" stroke-width="3"/><circle cx="${cx}" cy="128" r="3" fill="#141a2b"/></g>`;
      const caminhao = `<svg class="lg-caminhao" viewBox="0 0 340 150" aria-hidden="true">
        <ellipse cx="170" cy="146" rx="150" ry="5" fill="rgba(0,0,0,.35)"/>
        <g class="lg-corpo">
          <rect x="8" y="12" width="222" height="104" rx="9" fill="#0033A0"/>
          <rect x="8" y="98" width="222" height="10" fill="#FFC000"/>
          <rect x="16" y="20" width="62" height="70" rx="5" fill="#00143f"/>
          <g class="lg-carga">${caixa(20, 58, 26, 28)}${caixa(48, 62, 26, 24, '#b98549')}${caixa(26, 32, 22, 24, '#b98549')}${caixa(50, 38, 22, 22)}</g>
          <image href="img/logo-imile.png" x="98" y="28" width="118" height="63"/>
          <path d="M234 40h50c8 0 13 4 17 11l20 32c3 5 4 9 4 15v14c0 4-3 6-6 6H234z" fill="#0a2a86"/>
          <path d="M246 50h36c5 0 8 2 11 7l13 22h-60z" fill="#9fd0ff" opacity=".9"/>
          <rect x="300" y="96" width="24" height="8" rx="3" fill="#FFC000"/>
          <rect x="226" y="112" width="104" height="8" rx="3" fill="#0a2a86"/>
        </g>
        ${roda(60)}${roda(190)}${roda(286)}
      </svg>`;
      t.innerHTML = `
        <div class="lg-ceu" aria-hidden="true"><span class="lg-cidade lg-c1"></span><span class="lg-cidade lg-c2"></span>
          <svg class="lg-flutua lg-f1" viewBox="0 0 40 40">${caixa(2, 4, 36, 32)}</svg><svg class="lg-flutua lg-f2" viewBox="0 0 40 40">${caixa(2, 4, 36, 32, '#b98549')}</svg><svg class="lg-flutua lg-f3" viewBox="0 0 40 40">${caixa(2, 4, 36, 32)}</svg></div>
        <div class="lg-estrada" aria-hidden="true"><span class="lg-faixa"></span><div class="lg-vento"><i></i><i></i><i></i></div>${caminhao}</div>
        <div class="login-box">
          <img src="img/logo-imile.png" alt="iMile Delivery" class="login-logo">
          <h1>Portal de Indicadores</h1>
          <p class="login-sub">Nordeste II</p>
          <div class="lg-rota" aria-label="DC-PI3, DC-PI2 e DC-CE1"><span>DC-PI3</span><i></i><span>DC-PI2</span><i></i><span>DC-CE1</span><b class="lg-ponto"></b></div>
          <p class="login-msg"></p>
          <button type="button" class="login-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Entrar com Feishu</button>
          <p class="lg-rodape">Acesso restrito à equipe iMile</p>
        </div>`;
      t.querySelector('.login-btn').addEventListener('click', entrar);
      if (window.PORTAL_IDIOMA) { const s = window.PORTAL_IDIOMA.seletor(); s.classList.add('idi-login'); t.append(s); }
      document.body.append(t);
    }
    t.querySelector('.login-msg').textContent = msg || 'Use sua conta Feishu da iMile para ver os indicadores.';
    t.querySelector('.login-msg').classList.toggle('erro', !!erro);
    t.querySelector('.login-btn').style.display = msg && !erro && msg.startsWith('Entrando') ? 'none' : '';
  }
  function entrar() {
    const estado = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { sessionStorage.setItem('portal_estado', estado); } catch (e) { /* nada */ }
    location.href = 'https://accounts.feishu.cn/open-apis/authen/v1/authorize?client_id=' + APP_ID +
      '&redirect_uri=' + encodeURIComponent(VOLTA) + '&state=' + estado;
  }
  function barra(s) {
    const b = document.createElement('div'); b.className = 'login-usuario';
    b.append(Object.assign(document.createElement('span'), {textContent: s.nome}));
    const x = Object.assign(document.createElement('button'), {type: 'button', textContent: 'Sair'});
    x.addEventListener('click', sair); b.append(x);
    (document.querySelector('.pt-side-foot') || document.body).before(b);
  }

  window.PORTAL_LOGIN = (async () => {
    const q = new URLSearchParams(location.search), code = q.get('code');
    if (code) {
      history.replaceState(null, '', location.pathname + location.hash);
      let esperado = null; try { esperado = sessionStorage.getItem('portal_estado'); } catch (e) { /* nada */ }
      if (esperado && q.get('state') !== esperado) { tela('Login não confirmado. Tente de novo.', true); return new Promise(() => {}); }
      tela('Entrando…');
      try {
        const r = await fetch(FUNCAO + '?acao=login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code})});
        const j = await r.json();
        if (!r.ok) throw new Error(j.erro + (j.detalhe ? ' (' + j.detalhe + ')' : ''));
        guardar({token: j.token, nome: j.nome, exp: j.exp});
      } catch (e) { tela('Não foi possível entrar: ' + e.message, true); return new Promise(() => {}); }
    }
    const s = lerSessao();
    if (!s) { tela(); return new Promise(() => {}); } // fica esperando o login
    const t = document.getElementById('login-tela'); if (t) t.remove();
    barra(s);
    return s;
  })();

  // chamadas da função com a sessão (online, chat): devolve o JSON
  window.portalApi = async (acao, {metodo = 'GET', corpo = null, params = ''} = {}) => {
    const s = await window.PORTAL_LOGIN;
    const r = await fetch(FUNCAO + '?acao=' + acao + (params ? '&' + params : ''), {method: metodo, cache: 'no-store',
      headers: Object.assign({'x-sessao': s.token}, corpo ? {'Content-Type': 'application/json'} : {}), body: corpo ? JSON.stringify(corpo) : undefined});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || ('erro ' + r.status));
    return j;
  };

  // lê uma aba da Portal_Dados pela função (com a sessão); devolve o texto CSV
  window.portalLer = async (aba) => {
    const s = await window.PORTAL_LOGIN;
    const r = await fetch(FUNCAO + '?acao=dados&aba=' + encodeURIComponent(aba), {headers: {'x-sessao': s.token}, cache: 'no-store'});
    if (r.status === 401) { try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ } tela('Sua sessão expirou. Entre de novo.', true); throw new Error('sessão expirada'); }
    if (!r.ok) throw new Error('aba ' + aba + ': ' + r.status);
    return r.text();
  };
})();
