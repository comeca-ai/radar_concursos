#!/usr/bin/env python3
"""Adiciona editais PNCP ao CRM (Google Sheet). Uso:
  python3 scripts/crm_add.py URL_PNCP|numero_controle [...] [--notas "..."] [--status Interessado]
Busca no DuckDB (fallback JSON do site), deduplica por url_pncp, grava data/crm_queue.csv
(fila p/ o bot fazer append na planilha ou colar manualmente) e imprime as linhas CSV."""
import sys, csv, json, re, os, io, argparse, datetime, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
COLS = "status,marcado_em,fonte,municipio,orgao,objeto,valor_estimado,data_encerramento,modalidade,url_pncp,id_controle,notas,cnpj_orgao,ano,sequencial,prazo,vencedor,valor_homologado,data_resultado,fim_contrato".split(",")
STATUS = ["Interessado", "Em proposta", "Enviado", "Descartado"]
Q = R / "data/crm_queue.csv"

def key(s):
    s = s.strip()
    m = re.search(r"editais/(\d{14})/(\d{4})/(\d+)", s)
    if m: return ("url", f"https://pncp.gov.br/app/editais/{m[1]}/{m[2]}/{int(m[3])}")
    m = re.match(r"(\d{14})-\d-0*(\d+)/(\d{4})$", s)
    if m: return ("url", f"https://pncp.gov.br/app/editais/{m[1]}/{m[3]}/{int(m[2])}")
    return ("id", s)

def lookup(k):
    try:
        import duckdb
        c = duckdb.connect(str(R / "data/radar.duckdb"), read_only=True)
        col = "url_pncp" if k[0] == "url" else "numero_controle_pncp"
        r = c.execute(f"select fonte,municipio,orgao,objeto,valor_estimado,data_encerramento,modalidade,url_pncp,numero_controle_pncp from oportunidades where {col}=? limit 1", [k[1]]).fetchone()
        if r: return dict(zip(["fonte","municipio","orgao","objeto","valor_estimado","data_encerramento","modalidade","url_pncp","id_controle"], r))
    except Exception as e: print("duckdb indisponível:", e, file=sys.stderr)
    for f, fonte in [("oportunidades.json","jp"),("oportunidades-cg.json","cg"),("oportunidades-pe.json","pe")]:
        p = R / "docs/site" / f
        if not p.exists(): continue
        for o in json.load(open(p)).get("oportunidades", []):
            if (k[0]=="url" and o.get("url")==k[1]) or o.get("id")==k[1]:
                return dict(fonte=fonte, municipio=o.get("municipio"), orgao=o.get("orgao"), objeto=o.get("objeto"), valor_estimado=o.get("valor_estimado"), data_encerramento=o.get("data_encerramento"), modalidade=o.get("modalidade"), url_pncp=o.get("url"), id_controle=o.get("id"))

UF = {"jp": "PB", "cg": "PB", "pe": "PE"}
def _n(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", (s or "").lower()) if unicodedata.category(c) != "Mn")
ICP = re.compile(r"\b(software|sistemas?|plataforma|ia|inteligencia artificial|chatbot|cloud|nuvem|licen[cs]as?|desenvolvimento|saas|aplicativo|data ?center|ciberseguranca|seguranca da informacao|tecnologia da informacao|banco de dados|solucao tecnologica|informatica)\b")
BLOCK = re.compile(r"\b(obras?|engenharia|pavimenta|reforma|constru|limpeza|conservacao|combustive|gasolina|diesel|alimenta|merenda|genero alimenticio)")

def check(d):
    """Checklist docs/CRM.md: identidade PNCP, PB/PE, ICP TI/IA, prazo+modalidade."""
    e = []
    if not d.get("url_pncp") or not (d.get("id_controle") or d.get("cnpj_orgao")): e.append("sem identidade PNCP")
    if UF.get(d.get("fonte")) not in ("PB", "PE"): e.append("fora de PB/PE")
    if not d.get("orgao"): e.append("sem orgao")
    t = re.sub(r"sistema de registro de precos|portal de compras publicas|\bsrp\b", "", _n(d.get("objeto")))
    if not ICP.search(t) or BLOCK.search(t): e.append("objeto fora do ICP TI/IA")
    if not d.get("data_encerramento"): e.append("sem data_encerramento")
    if not d.get("modalidade"): e.append("sem modalidade")
    return e

def get(url):
    import urllib.request
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "radar-licitacoes"}), timeout=20) as r:
            return json.load(r) if r.status == 200 else None
    except Exception: return None

def enrich(d):
    m = re.search(r"editais/(\d{14})/(\d{4})/(\d+)", d.get("url_pncp") or "")
    if not m: return d
    d.update(cnpj_orgao=m[1], ano=m[2], sequencial=str(int(m[3])))
    c = get(f"https://pncp.gov.br/api/consulta/v1/orgaos/{m[1]}/compras/{m[2]}/{int(m[3])}")
    if c:
        for k, src in [("orgao", c.get("orgaoEntidade", {}).get("razaoSocial")), ("objeto", c.get("objetoCompra")), ("valor_estimado", c.get("valorTotalEstimado")),
                       ("data_encerramento", c.get("dataEncerramentoProposta")), ("modalidade", c.get("modalidadeNome")), ("id_controle", c.get("numeroControlePNCP")),
                       ("municipio", c.get("unidadeOrgao", {}).get("municipioNome"))]:
            if not d.get(k) and src is not None: d[k] = src
        if c.get("valorTotalHomologado"): d["valor_homologado"] = c["valorTotalHomologado"]
    its = get(f"https://pncp.gov.br/api/pncp/v1/orgaos/{m[1]}/compras/{m[2]}/{int(m[3])}/itens") or []
    venc, dres = set(), ""
    for it in its[:30]:
        if not it.get("temResultado"): continue
        for r in get(f"https://pncp.gov.br/api/pncp/v1/orgaos/{m[1]}/compras/{m[2]}/{int(m[3])}/itens/{it['numeroItem']}/resultados") or []:
            venc.add(r.get("nomeRazaoSocialFornecedor") or ""); dres = max(dres, r.get("dataResultado") or "")
    if venc: d["vencedor"] = "; ".join(sorted(v for v in venc if v))[:300]; d["data_resultado"] = dres[:10]
    return d

def main():
    a = argparse.ArgumentParser(); a.add_argument("refs", nargs="+"); a.add_argument("--notas", default=""); a.add_argument("--status", default="Interessado", choices=STATUS); a.add_argument("--force", action="store_true", help="ignora checklist"); a.add_argument("--no-enrich", action="store_true")
    a = a.parse_args()
    seen = set()
    if Q.exists():
        old = list(csv.DictReader(open(Q))); seen = {r["url_pncp"] for r in old}
        if old and list(old[0].keys()) != COLS:  # migra cabeçalho antigo (12 col) p/ 20 col
            with open(Q, "w", newline="") as f:
                w = csv.DictWriter(f, COLS, extrasaction="ignore"); w.writeheader(); w.writerows(old)
    rows, now = [], datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    for ref in a.refs:
        d = lookup(key(ref))
        if not d: print("não encontrado:", ref, file=sys.stderr); continue
        if d["url_pncp"] in seen: print("já no CRM:", d["url_pncp"], file=sys.stderr); continue
        if not a.no_enrich: d = enrich(d)
        err = check(d)
        if err and not a.force: print("reprovado no checklist:", d["url_pncp"], "-", ", ".join(err), file=sys.stderr); continue
        seen.add(d["url_pncp"])
        d["prazo"] = d.get("data_encerramento")
        notas = a.notas + (" valor sigiloso/não informado" if d.get("valor_estimado") in (None, "") else "")
        d = {k: ("" if v is None else str(v)[:19] if k in ("data_encerramento",) else " ".join(str(v).split())) for k, v in d.items()}
        rows.append({**{c: "" for c in COLS}, **d, "status": a.status, "marcado_em": now, "notas": notas.strip(), "fonte": "PNCP/" + d.get("fonte", "")})
    new = not Q.exists()
    with open(Q, "a", newline="") as f:
        w = csv.DictWriter(f, COLS, extrasaction="ignore"); new and w.writeheader(); w.writerows(rows)
    sheet = json.load(open(R / "data/crm_sheet.json"))
    out = io.StringIO(); csv.DictWriter(out, COLS, extrasaction="ignore").writerows(rows)
    print(out.getvalue(), end="")
    print(f"# {len(rows)} nova(s) linha(s) em {Q.relative_to(R)} → planilha {sheet['url']}", file=sys.stderr)
    print("# JSON p/ append:", json.dumps([[r[c] for c in COLS] for r in rows], ensure_ascii=False), file=sys.stderr)
main()
