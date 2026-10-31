# DuckDB + MotherDuck — tratamento de dados do Radar de Licitações

Fonte: PNCP (`https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao`), coletado por `scripts/coletar_{jp,cg,pe}.py`.

## Local
```bash
pip install -r requirements.txt        # duckdb
python3 scripts/duckdb_load.py         # gera data/radar.duckdb (ignorado no git)
duckdb data/radar.duckdb < scripts/duckdb_queries.sql   # ou via python
```

## Esquema
- `oportunidades` — 1 linha por contratação (chave `numero_controle_pncp` + `fonte`): fonte (jp|cg|pe), uf, municipio, municipio_ibge, orgao_cnpj, orgao, unidade, objeto, modalidade(_codigo), situacao, esfera, valor_estimado/homologado, data_publicacao/abertura/encerramento, url_pncp, link_origem, processo, srp, amparo_legal, modo_disputa, informacao_complementar (estes últimos vêm do JSON bruto).
- `orgaos` — agregado por CNPJ (razão social, esfera, UFs, nº e valor total).
- `bruto_pncp` — JSON bruto do PNCP achatado (1º nível), deduplicado.
- view `oportunidades_icp` — filtro TI/IA por regex sobre o objeto (sem acentos; ignora "sistema de registro de preços").

Sem tabela `itens`/fornecedores: a consulta de publicação do PNCP não traz itens nem vencedores. Próximo passo seria `/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{seq}/itens` e `/resultados`.

## MotherDuck
```bash
export MOTHERDUCK_TOKEN=...            # app.motherduck.com → Settings → Access Tokens
python3 scripts/duckdb_load.py --md    # cria/copia md:radar_licitacoes
duckdb "md:radar_licitacoes" -c "SELECT fonte, count(*) FROM oportunidades GROUP BY 1"
```
Em Node/Vercel: `@duckdb/node-api` com `md:radar_licitacoes?motherduck_token=${process.env.MOTHERDUCK_TOKEN}`. Sem token, tudo roda só local.
