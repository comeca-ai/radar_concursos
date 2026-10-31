# Pipeline CRM (Google Sheets)

- Planilha: **Radar Licitações — Pipeline CRM** · ID `1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik`
- URL: https://docs.google.com/spreadsheets/d/1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik/edit · config `data/crm_sheet.json`
- Mercado: só PB/PE (JP, Campina Grande, Recife), ICP TI/IA. Sem robô de lances.

Colunas (A1:T1): status, marcado_em, fonte, municipio, orgao, objeto, valor_estimado, data_encerramento, modalidade, url_pncp, id_controle, notas, cnpj_orgao, ano, sequencial, prazo, vencedor, valor_homologado, data_resultado, fim_contrato
Status: Interessado | Em proposta | Enviado | Descartado

## Checklist antes de gravar (site ⭐ e crm_add.py)
1. Identidade PNCP: url_pncp + id_controle (ou cnpj+ano+sequencial)
2. Escopo: PB ou PE + órgão
3. Fit ICP TI/IA (software, sistema, plataforma, IA, nuvem, licença, desenvolvimento…); bloqueia obra/engenharia/limpeza/combustível/alimentação
4. data_encerramento + modalidade obrigatórios
5. valor_estimado (vazio → notas "valor sigiloso"), status válido, fonte=PNCP/<cidade>, marcado_em

## Fluxo (zero configuração no navegador)
1. Páginas de cidade / `pipeline.html`: clique ☆ → grava local (otimista) e faz `POST /api/crm` (mesma origem). Sucesso: toast "Salvo no CRM" + links kanban/planilha. Falha: toast "falha ao gravar" + botão "copiar para o chat".
2. `pipeline.html`: kanban Interessado | Em proposta | Enviado | Descartado (arrastar ou seletor). Ao abrir, `GET /api/crm` traz as linhas da planilha (modo sheets) e mescla com o local.
3. `docs/site/api/crm.js` (Vercel serverless, Hobby/grátis, sem dependências). Root do projeto Vercel = `docs/site`.
   - `GET /api/crm` → `{ok, mode: "webhook"|"sheets"|"none", rows:[...]}` (rows só se houver credencial Google)
   - `POST /api/crm` `{action:"upsert"|"update_status"|"remove", rows:[{<colunas>}], source}` → 200 `{ok}` / 503 `{error:"crm_not_configured"}` / 502 `crm_write_failed`
   - Ordem: webhook (se `GROK_CRM_WEBHOOK_URL`) > Sheets direto (service account) > none.
   - Sheets direto: upsert por `url_pncp` (atualiza A:T ou faz append); update_status muda coluna A; remove marca "Descartado".

### Variáveis de ambiente no Vercel (projeto `radar-concursos`, Production) — configurar uma vez
| Var | Uso |
|---|---|
| `GROK_CRM_WEBHOOK_URL` | URL do webhook da rotina Grok Bot `crm-pipeline-adicionar-editais` (encaminha o payload + `sheet_id` + `columns`) |
| `GROK_CRM_WEBHOOK_KEY` | opcional → `Authorization: Bearer <key>` |
| `GROK_CRM_WEBHOOK_HEADER` | opcional, header inteiro `Nome: valor` (tem prioridade sobre KEY) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | alternativa: JSON da service account (compartilhe a planilha com o `client_email` como Editor) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` | alternativa ao JSON (`\n` na chave é aceito) |
| `CRM_SHEET_ID` | opcional; padrão `1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik` |

Depois de setar, redeploy (ou próximo push). Webhook da rotina (payload recebido):
   - upsert: se url_pncp não existe → append; senão atualiza · update_status: muda coluna A · remove: marca Descartado
   - opcional: `python3 scripts/crm_add.py <url> --no-enrich` p/ validar
4. `scripts/crm_add.py <urls|numero_controle> [--status] [--notas] [--force] [--no-enrich]`: DuckDB/JSON → enriquece via API pública PNCP (`/api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{seq}` + `/api/pncp/v1/.../itens/{n}/resultados` p/ vencedor) → checklist → `data/crm_queue.csv` + JSON p/ append.
5. Próximo: rotina diária relendo linhas com cnpj/ano/sequencial para preencher vencedor/valor_homologado/data_resultado; fim_contrato via contratos/atas PNCP.
