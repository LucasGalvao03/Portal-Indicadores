# Portal de Indicadores · iMile Nordeste II

Site com os indicadores dos DCs PI2, CE1 e PI3. Publicado no Netlify a partir deste repositório: cada mudança na branch `main` atualiza o site sozinha.

## Onde mexer

| Quero mudar… | Arquivo |
|---|---|
| Links do Google Sheets (Publicar na Web → CSV) | `js/config.js` |
| Textos, títulos e a ordem das seções | `index.html` |
| Cores, fontes e espaçamentos | `css/estilo.css` |
| Gráficos e tabelas de cada relatório | `js/secoes/*.js` |
| Como os dados do Sheets são lidos | `js/inicio.js` |
| Cálculos (acumulados, taxas) | `js/fontes-e-calculos.js` |
| Regras do resumo semanal e do ranking (status, pontos) | `js/resumo-ranking.js` |
| Números de novembro (usados enquanto a seção não está ao vivo) | `dados/novembro.js` |

Não editar: `vendor/d3.min.js` (biblioteca dos gráficos).

## De onde vêm os dados

Cada planilha-base no Google Sheets tem uma aba `Resumo_Portal` com uma fórmula que resume os dados por dia e DC. Essa aba é publicada na web como CSV e o link vai em `js/config.js`. Quando a base é atualizada no Sheets, o site mostra o número novo em poucos minutos.

| Seção | Situação |
|---|---|
| OffLoading | ao vivo (script `apps-script/resumos_portal.gs`) |
| Eficiência HC | ao vivo |
| No Tracking | ao vivo |
| Erro de Triagem | ao vivo (erros + Taxas) |
| No Scan | ao vivo (script `apps-script/resumos_portal.gs`) |
| Visão geral e Ranking | calculados no site com os indicadores acima (`js/resumo-ranking.js`) |
| Pontualidade de Transporte | ao vivo (script `apps-script/resumos_portal.gs`) |
| Lost e Controle de Sacas | números de novembro |

No fim da página, em "Sobre os dados", aparece de onde cada seção está lendo.

## Testar no computador

Basta abrir o `index.html` no navegador (dois cliques).

## Scripts do Google (apps-script/)

Alguns cruzamentos são grandes demais para fórmula. Para esses, um script roda no próprio Google Sheets a cada hora e grava o resumo na aba `Resumo_Portal`.

- `resumos_portal.gs`: No Scan, OffLoading e Pontualidade de Transporte. Fica na planilha Leitura_de_Recebimento (Extensões → Apps Script); depois de colar, executar `configurar` uma vez.
