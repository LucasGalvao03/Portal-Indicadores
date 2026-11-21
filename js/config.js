/* ===== CONFIGURAÇÃO: cole aqui os links "Publicar na Web" (CSV) de cada aba Resumo_Portal ===== */
window.PORTAL_FONTES = {
  off_rec: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=1906441046&single=true&output=csv', // Portal_Dados → aba OffLoading_Recebido
  off_con: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=762659921&single=true&output=csv', // Portal_Dados → aba OffLoading_Consolidado
  off_hora: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=628049580&single=true&output=csv', // Portal_Dados → aba OffLoading_Hora
  hc: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=1853941927&single=true&output=csv', // Portal_Dados → aba HC
  notracking: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=1930732591&single=true&output=csv', // Portal_Dados → aba NoTracking
  erro_erros: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=227314504&single=true&output=csv', // Portal_Dados → aba Erro
  erro_receb: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=2090136329&single=true&output=csv', // Portal_Dados → aba Erro_Recebidos
  erro_pacotes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=88349230&single=true&output=csv', // Portal_Dados → aba Erro_Lista (um pacote por linha, para baixar)
  carga_rotas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=1890500560&single=true&output=csv', // Portal_Dados → aba Carga_Rotas (Pontualidade: rotas)
  carga_ds: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=591003508&single=true&output=csv', // Portal_Dados → aba Carga_DS (Pontualidade: DSs)
  carga_dia: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=383723306&single=true&output=csv', // Portal_Dados → aba Carga_Dia (Pontualidade: tempo ativo)
  lost_lista: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=1546260941&single=true&output=csv', // Portal_Dados → aba Lost_Lista (um pacote por linha)
  noscan: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=1465477867&single=true&output=csv', // Portal_Dados → aba NoScan
  pontualidade: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=563249035&single=true&output=csv', // Portal_Dados → aba Pontualidade
  sacas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=1259433191&single=true&output=csv', // Portal_Dados → aba Sacas
  lost: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=1120359276&single=true&output=csv', // Portal_Dados → aba Lost
  nt_hist: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rSKM17RwR_x3qPHML-wpvV5aS6ck3dgr_B0HEYB8kfYmBDmXXPupcX6gpn_-1sUTIlXtKdGlwioO/pub?gid=656099243&single=true&output=csv', // Portal_Dados → aba NoTracking_Historico
};
