# Pipeline CRM (Google Sheets)

- Planilha: **Radar Licitações — Pipeline CRM** (privada, não compartilhada)
- ID: `1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik`
- URL: https://docs.google.com/spreadsheets/d/1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik/edit
- Config: `data/crm_sheet.json`

Colunas: status, marcado_em, fonte, municipio, orgao, objeto, valor_estimado, data_encerramento, modalidade, url_pncp, id_controle, notas
Status: Interessado | Em proposta | Enviado | Descartado

## Fluxo
1. Abrir `docs/site/pipeline.html` (editais abertos TI/IA), marcar, "Copiar URLs" → colar no chat; ou "Baixar CSV seleção".
2. Bot roda `python3 scripts/crm_add.py <urls ou numero_controle> [--notas ..] [--status ..]`
   - busca no DuckDB (fallback JSON do site), deduplica por url_pncp via `data/crm_queue.csv`
   - imprime linhas CSV + JSON para append; o bot faz append na planilha (Sheets MCP) ou cola manualmente.
Fonte: PNCP (https://pncp.gov.br).
