#!/usr/bin/env python3
"""Carrega data/{jp,cg,pe}/oportunidades.json (+ bruto PNCP) em data/radar.duckdb.

Uso:  python3 scripts/duckdb_load.py            # local
      MOTHERDUCK_TOKEN=... python3 scripts/duckdb_load.py --md   # também sincroniza md:radar_licitacoes
Fonte dos dados: PNCP — https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao
"""
import os, sys, duckdb
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DB = DATA / "radar.duckdb"
FONTES = {"jp": ("PB", "João Pessoa"), "cg": ("PB", "Campina Grande"), "pe": ("PE", "Recife")}

con = duckdb.connect(str(DB))
con.execute("DROP TABLE IF EXISTS oportunidades; DROP TABLE IF EXISTS orgaos; DROP TABLE IF EXISTS bruto_pncp")

# 1) bruto PNCP (todas as páginas) -> 1 linha por contratação, dedup por numeroControlePNCP
parts = []
for f in FONTES:
    g = DATA / f / "bruto" / "*.json"
    if list((DATA / f / "bruto").glob("*.json")):
        parts.append(f"SELECT '{f}' AS fonte, unnest(data, max_depth := 2) FROM read_json_auto('{g}', union_by_name=true, maximum_object_size=67108864)")
con.execute("CREATE TABLE bruto_pncp AS SELECT * FROM (" + " UNION ALL BY NAME ".join(parts) + ") "
            "QUALIFY row_number() OVER (PARTITION BY numeroControlePNCP ORDER BY dataAtualizacaoGlobal DESC) = 1")

# 2) oportunidades tratadas (saída dos coletores)
sel = []
for f, (uf, mun) in FONTES.items():
    p = DATA / f / "oportunidades.json"
    sel.append(f"""SELECT '{f}' AS fonte, '{uf}' AS uf, o.* FROM
      (SELECT unnest(oportunidades, max_depth := 2) FROM read_json_auto('{p}', maximum_object_size=67108864)) o""")
con.execute(f"""CREATE TABLE oportunidades AS
SELECT o.id AS numero_controle_pncp, o.fonte, o.uf, o.municipio,
       split_part(o.id, '-', 1) AS orgao_cnpj, o.orgao, o.unidade,
       regexp_replace(o.objeto, '\\s+', ' ', 'g') AS objeto,
       o.modalidade, o.modalidade_codigo, o.situacao, o.esfera,
       o.valor_estimado::DECIMAL(18,2) AS valor_estimado, o.valor_homologado::DECIMAL(18,2) AS valor_homologado,
       o.data_publicacao::TIMESTAMP AS data_publicacao, o.data_abertura::TIMESTAMP AS data_abertura,
       o.data_encerramento::TIMESTAMP AS data_encerramento,
       o.url AS url_pncp, o.link_origem,
       b.processo, b.srp, b.informacaoComplementar AS informacao_complementar,
       b.amparoLegal.nome AS amparo_legal, b.modoDisputaNome AS modo_disputa, b.unidadeOrgao.codigoIbge AS municipio_ibge
FROM ({' UNION ALL BY NAME '.join(sel)}) o
LEFT JOIN bruto_pncp b ON b.numeroControlePNCP = o.id
QUALIFY row_number() OVER (PARTITION BY o.id, o.fonte ORDER BY o.data_publicacao DESC) = 1""")

con.execute("""CREATE TABLE orgaos AS
SELECT orgao_cnpj AS cnpj, any_value(orgao) AS razao_social, any_value(esfera) AS esfera,
       list_distinct(list(uf)) AS ufs, count(*) AS n_oportunidades, sum(valor_estimado) AS valor_estimado_total
FROM oportunidades GROUP BY 1""")

# Visão ICP (TI/IA)
con.execute(r"""CREATE OR REPLACE VIEW oportunidades_icp AS SELECT * FROM oportunidades WHERE regexp_matches(regexp_replace(lower(strip_accents(objeto)), 'sistema de registro de precos|portal de compras publicas|\bsrp\b', '', 'g'),
 '\b(software|inteligencia artificial|chatbot|cloud|nuvem|computacao em nuvem|tecnologia da informacao|licen[cs]as? de (uso|software)|saas|aplicativo|data ?center|ciberseguranca|seguranca da informacao|sistemas? (de gestao|de informac|web|informatizad|integrad)|desenvolvimento de sistemas|banco de dados|solucao tecnologica|informatica)\b')""")

print(con.sql("SELECT fonte, count(*) n FROM oportunidades GROUP BY ALL ORDER BY 1"))
print(con.sql("SELECT count(*) bruto_pncp FROM bruto_pncp"), con.sql("SELECT count(*) orgaos FROM orgaos"))

if "--md" in sys.argv:
    if not os.environ.get("MOTHERDUCK_TOKEN"):
        sys.exit("MOTHERDUCK_TOKEN ausente — pulando MotherDuck.")
    con.execute("ATTACH 'md:'")
    con.execute("CREATE DATABASE IF NOT EXISTS radar_licitacoes FROM CURRENT_DATABASE()")
    print("Sincronizado em md:radar_licitacoes")
con.close()
