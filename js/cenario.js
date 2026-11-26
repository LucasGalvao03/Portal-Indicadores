/* Cenário logístico de fundo — SVG leve (rotas fluindo + pacotes em movimento), bem discreto.
   Fica atrás de todo o conteúdo e não captura cliques. Para quem prefere menos animação, fica estático. */
(function () {
  if (document.querySelector('.cenario')) return;
  const A = '#0033A0', O = '#FFC000';
  // pacote desenhado em volta de x=0, no y pedido — só o translateX do CSS o move (sem conflito de transform)
  const pacote = (y, w, cls, delay) => {
    const h = w * 0.72;
    return `<g class="cen-pac ${cls}" opacity="0.14" style="animation-delay:${delay}s">
      <rect x="${-w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3" fill="${A}"/>
      <path d="M${-w / 2},${y} H${w / 2} M0,${y - h / 2} V${y + h / 2}" stroke="${O}" stroke-width="2"/>
    </g>`;
  };
  const no = (x, y, delay) => `<g class="cen-no" transform="translate(${x} ${y})">
      <circle r="18" fill="none" stroke="${A}" stroke-width="1.5" class="cen-anel" style="animation-delay:${delay}s"/>
      <circle r="5.5" fill="${O}" opacity="0.5"/></g>`;
  const svg = `
  <svg class="cen-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="none" stroke="${A}" stroke-width="2" stroke-linecap="round" opacity="0.11">
      <path class="cen-rota"        d="M160,720 C430,560 560,520 780,470 S1150,350 1320,190"/>
      <path class="cen-rota cen-r2" d="M110,300 C380,360 580,300 840,370 S1190,520 1360,560"/>
      <path class="cen-rota cen-r3" d="M240,860 C520,820 720,700 940,720 S1250,770 1400,690"/>
    </g>
    ${no(780, 470, 0)}${no(840, 370, 1.5)}${no(940, 720, 3)}${no(160, 720, 0.8)}${no(1360, 560, 2.2)}
    ${pacote(470, 28, '', 0)}
    ${pacote(300, 22, 'cen-p2', -8)}
    ${pacote(700, 32, 'cen-p3', -16)}
  </svg>`;
  const div = document.createElement('div');
  div.className = 'cenario'; div.setAttribute('aria-hidden', 'true');
  div.innerHTML = svg;
  document.body.prepend(div);
})();
