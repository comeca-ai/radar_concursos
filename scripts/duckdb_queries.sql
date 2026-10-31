-- Rodar: duckdb data/radar.duckdb < scripts/duckdb_queries.sql   (ou python3 scripts/duckdb_queries.py)
-- Fonte: PNCP (pncp.gov.br). Sem campo de fornecedor nos JSON atuais (só contratações publicadas).

-- 1) Volume por cidade/fonte
SELECT fonte, uf, municipio, count(*) n, round(sum(valor_estimado)/1e6,1) AS valor_mi
FROM oportunidades GROUP BY ALL ORDER BY n DESC;

-- 2) ICP TI/IA por cidade
SELECT fonte, count(*) n_icp, round(sum(valor_estimado)/1e6,2) valor_mi FROM oportunidades_icp GROUP BY ALL ORDER BY 1;

-- 3) ICP abertas (encerramento futuro), mais recentes
SELECT fonte, data_publicacao::DATE pub, data_encerramento::DATE enc, valor_estimado, left(objeto,90) objeto, url_pncp
FROM oportunidades_icp WHERE data_encerramento >= current_date ORDER BY data_publicacao DESC LIMIT 10;

-- 4) Top órgãos por nº de oportunidades
SELECT cnpj, left(razao_social,50) orgao, ufs, n_oportunidades, round(valor_estimado_total/1e6,1) valor_mi
FROM orgaos ORDER BY n_oportunidades DESC LIMIT 10;

-- 5) Busca textual livre (troque o termo)
SELECT fonte, modalidade, valor_estimado, left(objeto,90) objeto, url_pncp
FROM oportunidades WHERE objeto ILIKE '%software%' ORDER BY data_publicacao DESC LIMIT 10;
