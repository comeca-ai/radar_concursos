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

## Fluxo
1. Páginas de cidade / `pipeline.html`: clique ☆ → grava localmente e faz POST no webhook; toast com **Desfazer** + link da planilha. Filtro "Só interessados ⭐" e "Só TI/IA".
2. `pipeline.html`: kanban por status (arrastar ou seletor) + selo de prazo (⏰ <48h). "Configurar webhook" salva a URL no navegador. Sem webhook, o payload é copiado para colar no chat do bot.
3. Webhook (rotina `crm-pipeline-adicionar-editais`) recebe JSON:
   `{action: "upsert"|"update_status"|"remove", rows:[{<colunas acima>}], sheet_id, columns, source}`
   - upsert: se url_pncp não existe → append da linha; senão atualiza
   - update_status: localizar linha por url_pncp e mudar coluna A
   - remove: marcar Descartado (ou apagar linha) por url_pncp
   - opcional: `python3 scripts/crm_add.py <url> --no-enrich` p/ validar, ou sem flag p/ enriquecer
4. `scripts/crm_add.py <urls|numero_controle> [--status] [--notas] [--force] [--no-enrich]`: DuckDB/JSON → enriquece via API pública PNCP (`/api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{seq}` + `/api/pncp/v1/.../itens/{n}/resultados` p/ vencedor) → checklist → `data/crm_queue.csv` + JSON p/ append.
5. Próximo: rotina diária relendo linhas com cnpj/ano/sequencial para preencher vencedor/valor_homologado/data_resultado; fim_contrato via contratos/atas PNCP.
