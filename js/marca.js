/* Marca/visual logístico: ícones nas abas + banner com caminhão animado na Visão Geral. */
(function () {
  // ---- ícones das abas (linha, herdam a cor do texto) ----
  const ICO = {
    visao: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    ranking: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M5 6H3v1a3 3 0 0 0 3 3M19 6h2v1a3 3 0 0 1-3 3"/>',
    aovivo: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7"/>',
    expedicao: '<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="17.5" cy="17" r="1.6"/>',
    offloading: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v9"/>',
    noscan: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    notracking: '<path d="M12 20v-7M5.5 20a7 7 0 0 1 13 0M8.5 20a3.5 3.5 0 0 1 7 0"/>',
    erro: '<path d="M12 3L2 20h20L12 3zM12 10v4M12 17h.01"/>',
    eficiencia: '<path d="M4 19a8 8 0 1 1 16 0M12 12l4-3"/><circle cx="12" cy="12" r="1"/>',
    pontualidade: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    lost: '<rect x="4" y="7" width="16" height="12" rx="1"/><path d="M9 11l6 6M15 11l-6 6"/>',
    sacas: '<path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2"/>',
  };
  const NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.pt-tab').forEach((b) => {
    const k = b.dataset && b.dataset.tab;
    if (!k || !ICO[k] || b.querySelector('.pt-ico')) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'pt-ico'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICO[k];
    b.insertBefore(svg, b.firstChild);
  });

  // ---- banner com caminhão na Visão Geral ----
  const sec = document.getElementById('visao');
  if (sec && !sec.querySelector('.hero')) {
    const hero = document.createElement('div');
    hero.className = 'hero'; hero.setAttribute('data-sem-traducao', '');
    hero.innerHTML = `
      <svg class="hero-bg" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g opacity="0.10" fill="#ffffff">
          <rect x="930" y="70" width="70" height="110"/><rect x="1010" y="40" width="60" height="140"/><rect x="1080" y="90" width="80" height="90"/>
          <rect x="945" y="86" width="14" height="14"/><rect x="972" y="86" width="14" height="14"/><rect x="1024" y="60" width="14" height="14"/><rect x="1024" y="92" width="14" height="14"/>
        </g>
        <line class="hero-road" x1="0" y1="186" x2="1200" y2="186"/>
        <g opacity="0.14" fill="#FFC000"><rect x="250" y="150" width="26" height="20" rx="3"/><rect x="520" y="156" width="20" height="15" rx="3"/></g>
        <g class="hero-truck">
          <rect x="40" y="118" width="150" height="58" rx="7" fill="#ffffff"/>
          <text x="58" y="156" font-family="var(--font-anthropic-sans, sans-serif)" font-size="30" font-weight="800" fill="#0033A0">iMile</text>
          <path d="M190 176 V134 h32 l22 24 v18 Z" fill="#FFC000"/>
          <rect x="196" y="138" width="22" height="17" rx="2" fill="#001A5E" opacity="0.55"/>
          <circle cx="80" cy="180" r="12" fill="#101828"/><circle cx="80" cy="180" r="4" fill="#5b6478"/>
          <circle cx="158" cy="180" r="12" fill="#101828"/><circle cx="158" cy="180" r="4" fill="#5b6478"/>
          <circle cx="214" cy="180" r="12" fill="#101828"/><circle cx="214" cy="180" r="4" fill="#5b6478"/>
        </g>
      </svg>
      <div class="hero-txt">
        <span class="hero-chip">iMile · Nordeste II</span>
        <div class="hero-tit">Painel de Indicadores</div>
        <div class="hero-sub">Operação em tempo real — DC-PI2 · DC-CE1 · DC-PI3</div>
      </div>`;
    sec.insertBefore(hero, sec.firstChild);
  }
})();
