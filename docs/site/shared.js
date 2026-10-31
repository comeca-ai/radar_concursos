const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const brl=v=>v==null?"—":v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const dt=s=>s?s.slice(0,10).split("-").reverse().join("/"):"—";
function shell(active){
 const L=[["index.html","Início (João Pessoa)"],["campina.html","Campina Grande"],["recife.html","Recife (PE)"],["comparativo.html","Comparativo"],["pipeline.html","CRM"]];
 document.body.insertAdjacentHTML("afterbegin",`<header class="top"><div class="in"><a class="brand" href="index.html"><i></i>Radar Licitações</a><nav aria-label="Principal">${L.map(([h,t])=>`<a href="${h}"${h==active?' aria-current="page"':""}>${t}</a>`).join("")}<a href="https://pncp.gov.br/" target="_blank" rel="noopener">Fonte: PNCP ↗</a></nav></div></header>`);
 document.body.insertAdjacentHTML("beforeend",`<footer>Dados públicos do <a href="https://pncp.gov.br/" target="_blank" rel="noopener">Portal Nacional de Contratações Públicas (PNCP)</a>. Conteúdo informativo — não é parecer jurídico. Confira sempre o edital original.</footer>`);
}
const loading=()=>`<div class="state" role="status"><div class="skel"></div><div class="skel"></div><div class="skel"></div>Carregando licitações…</div>`;
const empty=msg=>`<div class="state">${msg}</div>`;
function fill(el,vals){[...new Set(vals)].filter(Boolean).sort().forEach(v=>el.insertAdjacentHTML("beforeend",`<option>${esc(v)}</option>`))}
function row(o,city){const ob=o.objeto||"";return `<tr>${selBox(o.url)}${city?`<td data-l="Cidade"><span class="pill ${o.cid}">${o.cid.toUpperCase()}</span></td>`:""}<td data-l="Órgão">${esc(o.orgao)}<br><small>${esc(o.unidade)}</small></td><td data-l="Modalidade"><span class="pill">${esc(o.modalidade)}</span></td><td data-l="Objeto" title="${esc(ob)}">${esc(ob.slice(0,160))}${ob.length>160?"…":""}</td><td data-l="Publicação">${dt(o.data_publicacao)}</td><td data-l="Encerramento">${dt(o.data_encerramento)}</td><td class="v" data-l="Valor estimado">${brl(o.valor_estimado)}</td><td><a class="open" href="${esc(o.url)}" target="_blank" rel="noopener">Ver no PNCP ↗</a></td></tr>`}
const CRM_SHEET={id:"1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik",url:"https://docs.google.com/spreadsheets/d/1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik/edit",title:"Radar Licitações — Pipeline CRM"};
const CRM_K="radar_crm_sel",CRM_WK="radar_crm_webhook";
const SEL=new Set(JSON.parse(localStorage.getItem(CRM_K)||localStorage.getItem("radar_pipeline_sel")||"[]"));
const saveSel=()=>localStorage.setItem(CRM_K,JSON.stringify([...SEL]));
const crmDest=()=>`<p class="count" id="crmDest">Destino CRM: <a href="${CRM_SHEET.url}" target="_blank" rel="noopener">${esc(CRM_SHEET.title)} ↗</a> · <span id="selCnt"></span></p><p class="count" id="msg" aria-live="polite"></p>`;
function selCount(){const e=$("selCnt");if(e)e.textContent=`${SEL.size} selecionado(s)`}
function say(t){const m=$("msg");if(m)m.textContent=t||""}
async function sendToCrm(urls){
 if(!urls.length){alert("Selecione ao menos um edital.");return false}
 let wh=localStorage.getItem(CRM_WK)||"";
 if(!wh&&!localStorage.getItem(CRM_WK+"_asked")){localStorage.setItem(CRM_WK+"_asked","1");wh=(prompt(`Enviar ${urls.length} edital(is) para «${CRM_SHEET.title}».\nCole a URL do webhook da rotina «CRM pipeline — adicionar editais» (só uma vez). Deixe vazio para copiar e colar no chat.`)||"").trim();if(wh)localStorage.setItem(CRM_WK,wh)}
 const fallback=async why=>{try{await navigator.clipboard.writeText("CRM adicionar\n"+urls.join("\n"))}catch(e){}say(`${why} Copiei ${urls.length} URL(s) para colar no chat do Grok Bot → ${CRM_SHEET.title}.`);return false};
 if(!wh)return fallback("Webhook não configurado.");
 say(`Enviando ${urls.length} para ${CRM_SHEET.title}…`);
 try{const r=await fetch(wh,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({urls,status:"Interessado",sheet_id:CRM_SHEET.id,source:location.pathname})});if(!r.ok)throw new Error("HTTP "+r.status);say(`Enviado ${urls.length} para ${CRM_SHEET.title}.`);return true}
 catch(e){return fallback(`Falha no webhook (${e.message}).`)}
}
function bindSel(root){root.querySelectorAll("input[data-u]").forEach(c=>c.onchange=()=>{c.checked?SEL.add(c.dataset.u):SEL.delete(c.dataset.u);saveSel();selCount()})}
const selBox=u=>`<td data-l="Selecionar"><input type="checkbox" aria-label="Selecionar para CRM" data-u="${esc(u)}"${SEL.has(u)?" checked":""}></td>`;
/* city page: cfg {file,cnpj,active} */
function cityPage(cfg){
 shell(cfg.active);const R=$("res");R.innerHTML=loading();let D=[],F=[];
 $("clr").insertAdjacentHTML("afterend",`<button id="sel" type="button">Selecionar todos</button><button id="clrSel" type="button">Limpar seleção</button><button id="crm" type="button" class="primary">Enviar ao CRM</button>`);
 $("cnt").insertAdjacentHTML("afterend",crmDest());selCount();
 $("sel").onclick=()=>{F.slice(0,500).forEach(o=>SEL.add(o.url));saveSel();draw();say(`Selecionados ${Math.min(F.length,500)} da lista atual.`)};
 $("clrSel").onclick=()=>{SEL.clear();saveSel();draw();say("Seleção limpa.")};
 $("crm").onclick=async()=>{$("crm").disabled=true;try{await sendToCrm([...SEL])}finally{$("crm").disabled=false}};
 fetch(cfg.file).then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>{
  D=j.oportunidades||[];D.forEach(o=>o.pref=(o.id||"").slice(0,14)===cfg.cnpj);
  $("meta").textContent=`Atualizado ${(j.atualizado_em||"").replace("T"," ").slice(0,16)} (horário de Brasília) · publicações de ${dt(j.periodo?.inicio)} a ${dt(j.periodo?.fim)}`;
  const tot=D.reduce((s,o)=>s+(o.valor_estimado||0),0),n=f=>D.filter(f).length;
  $("kpis").innerHTML=[[D.length,"licitações no período"],[n(o=>o.pref),"da Prefeitura"],[n(o=>o.esfera=="estadual"),"estaduais"],[n(o=>o.esfera=="federal"),"federais"],[brl(tot),"valor estimado total"]].map(([b,s])=>`<div class="kpi"><b>${b}</b><small>${s}</small></div>`).join("");
  fill($("fm"),D.map(o=>o.modalidade));fill($("fe"),D.map(o=>o.esfera));
  ["fq","fm","fe","fp"].forEach(i=>$(i).addEventListener("input",draw));$("clr").onclick=()=>{$("fq").value=$("fm").value=$("fe").value="";$("fp").checked=false;draw()};draw();
 }).catch(()=>R.innerHTML=empty("Não foi possível carregar os dados. Tente recarregar a página."));
 function draw(){const q=$("fq").value.toLowerCase().trim(),m=$("fm").value,e=$("fe").value,p=$("fp").checked;
  F=D.filter(o=>(!m||o.modalidade==m)&&(!e||o.esfera==e)&&(!p||o.pref)&&(!q||((o.objeto||"")+" "+(o.orgao||"")+" "+(o.unidade||"")).toLowerCase().includes(q))).sort((a,b)=>(b.data_publicacao||"").localeCompare(a.data_publicacao||""));
  $("cnt").textContent=`${F.length.toLocaleString("pt-BR")} licitações encontradas`+(F.length>500?" · mostrando as 500 mais recentes":"");
  R.innerHTML=F.length?`<div class="tw"><table><thead><tr><th><span class="sr">Selecionar</span></th><th>Órgão</th><th>Modalidade</th><th>Objeto</th><th>Publicação</th><th>Encerramento</th><th>Valor estimado</th><th><span class="sr">Link</span></th></tr></thead><tbody>${F.slice(0,500).map(o=>row(o)).join("")}</tbody></table></div>`:empty("Nenhuma licitação com esses filtros. Tente outra palavra-chave ou limpe os filtros.");bindSel(R);selCount();}
}
