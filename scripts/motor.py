#!/usr/bin/env python3
"""Motor ICP: pergunta natural + UF -> oportunidades (licitação pública) ranqueadas."""
import json, re, sys, argparse, unicodedata, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASES = {"jp": ("PB", "data/jp/oportunidades.json"), "cg": ("PB", "data/cg/oportunidades.json"), "pe": ("PE", "data/pe/oportunidades.json")}
SIN = {  # termo natural -> termos técnicos de edital
 "ti": ["tecnologia da informacao","solucao de ti","servico de informatica","outsourcing de ti","sistema","software","licenca de software","infraestrutura de ti","suporte tecnico","help desk"],
 "software": ["software","sistema","licenca de software","desenvolvimento de sistema","plataforma","aplicativo","erp","crm","api","integracao"],
 "ia": ["inteligencia artificial","machine learning","chatbot","assistente virtual","ocr","analise de dados","business intelligence","rpa","automacao"],
 "nuvem": ["hospedagem","cloud","nuvem","datacenter","servidor"],
 "provas digitais": ["provas digitais","prova digital","evidencias digitais","ata notarial","cadeia de custodia","pericia digital","computacao forense","forense","captura de conteudo","preservacao de conteudo"],
}
GATILHOS = {"ti": ["ti","informatica","tecnologia"], "software": ["software","sistema","sistemas","app","aplicativo"],
 "ia": ["ia","inteligencia artificial","ai","chatbot","automacao"], "nuvem": ["nuvem","cloud","hospedagem","servidor"],
 "provas digitais": ["provas digitais","prova digital","verifact","ata notarial","evidencia","evidencias","forense","print","captura"]}
def norm(s): return unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii","ignore").decode()
def has(text, term): return re.search(r"\b"+re.escape(term)+r"\b", text) is not None
def expandir(q, extras=()):
    nq = norm(q); termos = {norm(e) for e in extras}
    for g, gats in GATILHOS.items():
        if any(has(nq, t) for t in gats): termos.update(SIN[g])
    if not termos: termos.update(w for w in re.findall(r"[a-z0-9]{4,}", nq))
    return sorted(termos)
def carregar(uf=None):
    out = []
    for nome, (u, p) in BASES.items():
        if uf and u != uf.upper(): continue
        fp = os.path.join(ROOT, p)
        if not os.path.exists(fp): continue
        for o in json.load(open(fp)).get("oportunidades", []): out.append({**o, "uf": u, "base": nome})
    return out
def buscar(q, uf=None, keywords=(), modalidade=None, limite=20):
    termos = expandir(q, keywords); res = []
    for o in carregar(uf):
        if o.get("modalidade_codigo") == 3: continue  # concurso ≠ licitação de compra
        if modalidade and norm(modalidade) not in norm(o.get("modalidade")): continue
        txt = norm(o.get("objeto"))
        hits = [t for t in termos if has(txt, t)]
        if not hits: continue
        score = sum(2 if " " in t else 1 for t in hits)
        if norm(q) in txt: score += 3
        res.append({"score": score, "termos": hits, **{k: o.get(k) for k in ("uf","municipio","orgao","modalidade","valor_estimado","data_publicacao","objeto","url")}})
    res.sort(key=lambda r: (-r["score"], -(r["valor_estimado"] or 0)))
    return termos, res[:limite]
if __name__ == "__main__":
    a = argparse.ArgumentParser(); a.add_argument("q"); a.add_argument("--uf"); a.add_argument("--kw", action="append", default=[])
    a.add_argument("--modalidade"); a.add_argument("-n", type=int, default=10); a.add_argument("--json", action="store_true")
    x = a.parse_args(); termos, r = buscar(x.q, x.uf, x.kw, x.modalidade, x.n)
    if x.json: print(json.dumps({"termos": termos, "resultados": r}, ensure_ascii=False, indent=1)); sys.exit()
    print("termos:", ", ".join(termos)); print(len(r), "resultado(s)")
    for i in r: print(f"[{i['score']}] {i['uf']}/{i['municipio']} | {i['modalidade']} | R$ {i['valor_estimado']} | {', '.join(i['termos'])}\n    {(i['objeto'] or '')[:140]}\n    {i['url']}")
