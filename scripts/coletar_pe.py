import json,urllib.request,urllib.error,datetime,time,os,sys
B="https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao"
fim=datetime.date.today(); ini=fim-datetime.timedelta(days=int(os.environ.get("DIAS","60")))
MOD={1:"Leilão Eletrônico",2:"Diálogo Competitivo",3:"Concurso",4:"Concorrência Eletrônica",5:"Concorrência Presencial",6:"Pregão Eletrônico",7:"Pregão Presencial",8:"Dispensa",9:"Inexigibilidade",10:"Manifestação de Interesse",11:"Pré-qualificação",12:"Credenciamento",13:"Leilão Presencial"}
ESF={"F":"federal","E":"estadual","M":"municipal","D":"distrital"}
out="data/pe/bruto"; erros=[]; itens={}
for m in MOD:
  p=1
  while True:
    u=f"{B}?dataInicial={ini:%Y%m%d}&dataFinal={fim:%Y%m%d}&codigoModalidadeContratacao={m}&uf=PE&codigoMunicipioIbge=2611606&pagina={p}&tamanhoPagina=50"
    for t in range(3):
      try:
        r=urllib.request.urlopen(u,timeout=60); code=r.status; body=r.read(); break
      except Exception as e: code=None; err=str(e); time.sleep(2)
    if code is None: erros.append(f"mod {m} pag {p}: {err}"); break
    if code==204 or not body: break
    open(f"{out}/mod{m:02d}_p{p:03d}.json","wb").write(body)
    d=json.loads(body)
    for x in d.get("data",[]):
      o=x.get("orgaoEntidade") or {}; un=x.get("unidadeOrgao") or {}
      cid=x.get("numeroControlePNCP")
      cn,ano,seq=o.get("cnpj"),x.get("anoCompra"),x.get("sequencialCompra")
      itens[cid]={"id":cid,"objeto":x.get("objetoCompra"),"orgao":o.get("razaoSocial"),"unidade":un.get("nomeUnidade"),
        "municipio":un.get("municipioNome"),"modalidade":x.get("modalidadeNome") or MOD[m],"modalidade_codigo":m,
        "situacao":x.get("situacaoCompraNome"),"valor_estimado":x.get("valorTotalEstimado"),"valor_homologado":x.get("valorTotalHomologado"),
        "data_publicacao":x.get("dataPublicacaoPncp"),"data_abertura":x.get("dataAberturaProposta"),"data_encerramento":x.get("dataEncerramentoProposta"),
        "esfera":ESF.get(o.get("esferaId")),"url":f"https://pncp.gov.br/app/editais/{cn}/{ano}/{seq}","link_origem":x.get("linkSistemaOrigem")}
    if p>=d.get("totalPaginas",1): break
    p+=1
now=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
res={"atualizado_em":now.isoformat(timespec="seconds"),"periodo":{"inicio":ini.isoformat(),"fim":fim.isoformat()},"fonte":B,"municipio_ibge":"2611606","total":len(itens),"erros":erros,
 "oportunidades":sorted(itens.values(),key=lambda i:i["data_publicacao"] or "",reverse=True)}
json.dump(res,open("data/pe/oportunidades.json","w"),ensure_ascii=False,indent=1)
json.dump(res,open("docs/site/oportunidades-pe.json","w"),ensure_ascii=False)
print(len(itens),erros)
