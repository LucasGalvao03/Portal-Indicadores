/* Rastreio de uso (para o painel do desenvolvedor): registra qual aba cada pessoa abre.
   Roda pra todo mundo; dispara e esquece (não atrapalha nada se falhar). */
(async () => {
  await window.PORTAL_LOGIN;
  const envia = (aba) => {
    if (!aba) return;
    try { window.portalApi('evento', {metodo: 'POST', corpo: {tipo: 'aba', aba}}).catch(() => {}); } catch (e) { /* nada */ }
  };
  // cada clique numa aba
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.pt-tab');
    if (b && b.dataset && b.dataset.tab) envia(b.dataset.tab);
  });
  // a aba que já está aberta ao carregar
  const inicial = document.querySelector('.pt-tab[aria-selected="true"]');
  envia(inicial && inicial.dataset ? inicial.dataset.tab : 'inicio');
})();
