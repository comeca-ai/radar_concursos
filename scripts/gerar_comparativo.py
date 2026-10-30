import json,datetime
C={"jp":("João Pessoa","2507507","08778326000156"),"cg":("Campina Grande","2504009","08993917000146")}
out={"atualizado_em":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).isoformat(timespec="seconds"),"cidades":{}}
for k,(n,i,c) in C.items():
  d=json.load(open(f"data/{k}/oportunidades.json"))
  out["cidades"][k]={"nome":n,"ibge":i,"cnpj_pref":c,"periodo":d["periodo"],"total":len(d["oportunidades"]),"oportunidades":d["oportunidades"]}
json.dump(out,open("docs/site/comparativo.json","w"),ensure_ascii=False)
print({k:v["total"] for k,v in out["cidades"].items()})
