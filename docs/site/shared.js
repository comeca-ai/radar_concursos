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
function row(o,city){const ob=o.objeto||"";return `<tr>${starCell(o)}${city?`<td data-l="Cidade"><span class="pill ${o.cid}">${o.cid.toUpperCase()}</span></td>`:""}<td data-l="Órgão">${esc(o.orgao)}<br><small>${esc(o.unidade)}</small></td><td data-l="Modalidade"><span class="pill">${esc(o.modalidade)}</span></td><td data-l="Objeto" title="${esc(ob)}">${esc(ob.slice(0,160))}${ob.length>160?"…":""}</td><td data-l="Publicação">${dt(o.data_publicacao)}</td><td data-l="Encerramento">${dt(o.data_encerramento)} ${prazoBadge(o.data_encerramento)}</td><td class="v" data-l="Valor estimado">${brl(o.valor_estimado)}</td><td><a class="open" href="${esc(o.url)}" target="_blank" rel="noopener">Ver no PNCP ↗</a></td></tr>`}
const CRM_SHEET={id:"1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik",url:"https://docs.google.com/spreadsheets/d/1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik/edit",title:"Radar Licitações — Pipeline CRM"};
const CRM_DB="radar_crm_items",STATUS=["Interessado","Em proposta","Enviado","Descartado"];
const CRM_COLS="status,marcado_em,fonte,municipio,orgao,objeto,valor_estimado,data_encerramento,modalidade,url_pncp,id_controle,notas,cnpj_orgao,ano,sequencial,prazo,vencedor,valor_homologado,data_resultado,fim_contrato".split(",");
const UF={jp:"PB",cg:"PB",pe:"PE"};
const norm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/sistema de registro de precos|portal de compras publicas|\bsrp\b/g,"");
const ICP=/\b(software|sistemas?|plataforma|ia|inteligencia artificial|chatbot|cloud|nuvem|licen[cs]as?|desenvolvimento|saas|aplicativo|data ?center|ciberseguranca|seguranca da informacao|tecnologia da informacao|banco de dados|solucao tecnologica|informatica)\b/;
const BLOCK=/\b(obras?|engenharia|pavimenta|reforma|constru|limpeza|conservacao|combustive|gasolina|diesel|alimenta|merenda|genero alimenticio)/;
const isIcp=o=>{const t=norm(o.objeto);return ICP.test(t)&&!BLOCK.test(t)};
let CRM=JSON.parse(localStorage.getItem(CRM_DB)||"{}");const crmSave=()=>localStorage.setItem(CRM_DB,JSON.stringify(CRM));
function pkeys(o){const m=(o.url||"").match(/editais\/(\d{14})\/(\d{4})\/(\d+)/)||(o.id||"").match(/^(\d{14})-\d-0*(\d+)\/(\d{4})$/);if(!m)return{};return /editais/.test(m[0])?{cnpj_orgao:m[1],ano:m[2],sequencial:String(+m[3])}:{cnpj_orgao:m[1],ano:m[3],sequencial:String(+m[2])}}
/* checklist docs/CRM.md: identidade, PB/PE, ICP TI/IA, prazo+modalidade */
function crmCheck(o){const k=pkeys(o),e=[];
 if(!o.url||!(o.id||k.cnpj_orgao))e.push("sem identidade PNCP");
 if(!["PB","PE"].includes(UF[o.cid]))e.push("fora de PB/PE");
 if(!o.orgao)e.push("sem órgão");
 if(!isIcp(o))e.push("objeto fora do ICP TI/IA");
 if(!o.data_encerramento)e.push("sem data de encerramento");
 if(!o.modalidade)e.push("sem modalidade");return e}
function crmRow(o,status){const k=pkeys(o),enc=(o.data_encerramento||"").replace("T"," ").slice(0,19);
 return{status:status||"Interessado",marcado_em:new Date().toLocaleString("sv-SE",{timeZone:"America/Sao_Paulo"}).slice(0,16),fonte:"PNCP/"+o.cid,municipio:o.municipio||"",uf:UF[o.cid],orgao:o.orgao||"",objeto:(o.objeto||"").replace(/\s+/g," "),valor_estimado:o.valor_estimado??"",data_encerramento:enc,modalidade:o.modalidade||"",url_pncp:o.url,id_controle:o.id||"",notas:o.valor_estimado==null?"valor sigiloso/não informado":"",...k,prazo:enc,vencedor:"",valor_homologado:"",data_resultado:"",fim_contrato:""}}
async function crmPost(body){/* sempre same-origin /api/crm; falha → oferece copiar p/ chat */
 try{const r=await fetch("/api/crm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,source:location.pathname})});if(!r.ok)throw 0;return"ok"}catch(e){return"falha"}}
async function crmCopy(body){try{await navigator.clipboard.writeText("CRM "+body.action+"\n"+JSON.stringify(body.rows));toast("Copiado — cole no chat do Grok Bot.")}catch(e){toast("Não consegui copiar.")}}
function crmToast(ok,msg,body,undo){if(ok=="ok")return toast(`${msg} · Salvo no CRM · <a href="pipeline.html">ver kanban</a> · ${sheetLink}`,undo);
 toast(`${msg} (só neste navegador — falha ao gravar na planilha) <button type="button" id="cpy">copiar para o chat</button>`,undo);const c=$("cpy");if(c)c.onclick=()=>crmCopy(body)}
function toast(html,undo){let t=$("toast");if(!t){document.body.insertAdjacentHTML("beforeend",`<div id="toast" class="toast" role="status" aria-live="polite"></div>`);t=$("toast")}
 t.innerHTML=html+(undo?` <button type="button" id="undo">Desfazer</button>`:"");t.classList.add("on");if(undo)$("undo").onclick=()=>{undo();t.classList.remove("on")};clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),7000)}
const sheetLink=`<a href="${CRM_SHEET.url}" target="_blank" rel="noopener">abrir planilha ↗</a>`;
async function crmMark(o,status,onChange){const u=o.url,prev=CRM[u];
 if(!status&&prev){delete CRM[u];crmSave();onChange&&onChange();const body={action:"remove",rows:[{url_pncp:u}]};crmToast(await crmPost(body),"Removido",body,()=>{CRM[u]=prev;crmSave();crmPost({action:"upsert",rows:[prev]});onChange&&onChange()});return}
 const err=crmCheck(o);if(err.length&&!prev){toast(`Não marcado: ${esc(err.join(", "))}.`);return}
 const row=prev?{...prev,status:status||"Interessado"}:crmRow(o,status);CRM[u]=row;crmSave();onChange&&onChange();
 const body={action:prev?"update_status":"upsert",rows:[row]};
 crmToast(await crmPost(body),prev?"Status → "+esc(row.status):"⭐ Interessado",body,()=>{prev?CRM[u]=prev:delete CRM[u];crmSave();crmPost(prev?{action:"update_status",rows:[prev]}:{action:"remove",rows:[{url_pncp:u}]});onChange&&onChange()})}
/* puxa linhas da planilha (se o servidor tiver credencial Sheets) e mescla no local */
async function crmSync(){try{const j=await (await fetch("/api/crm")).json();(j.rows||[]).forEach(r=>{if(r.url_pncp)CRM[r.url_pncp]={...CRM[r.url_pncp],...r}});crmSave();return j.mode}catch(e){return"offline"}}
const starCell=o=>{const on=!!CRM[o.url],bad=!on&&crmCheck(o).length;return `<td data-l="CRM"><button type="button" class="star${on?" on":""}${bad?" off":""}" data-u="${esc(o.url)}" aria-pressed="${on}" title="${on?"No CRM ("+esc(CRM[o.url].status)+") — clique p/ remover":bad?"Fora do checklist: "+esc(crmCheck(o).join(", ")):"Marcar Interessado"}">${on?"★":"☆"}</button></td>`};
function bindStars(root,list,redraw){const by=Object.fromEntries(list.map(o=>[o.url,o]));root.querySelectorAll("button.star").forEach(b=>b.onclick=()=>crmMark(by[b.dataset.u],null,redraw))}
function prazoBadge(d){if(!d)return"";const h=(new Date(d.replace(" ","T"))-new Date())/36e5;if(isNaN(h))return"";const c=h<0?"late":h<48?"hot":h<168?"warm":"";return `<span class="prazo ${c}">${h<0?"encerrado":h<48?"⏰ "+Math.max(1,Math.round(h))+"h":"em "+Math.round(h/24)+"d"}</span>`}
/* city page: cfg {file,cnpj,active} */
function cityPage(cfg){
 shell(cfg.active);const R=$("res");R.innerHTML=loading();let D=[],F=[];
 $("clr").insertAdjacentHTML("afterend",`<label class="chk"><input type="checkbox" id="fi"> Só interessados ⭐</label><label class="chk"><input type="checkbox" id="ft"> Só TI/IA</label>`);
 $("cnt").insertAdjacentHTML("afterend",`<p class="count">Clique ☆ para marcar <b>Interessado</b> — salva em <a href="${CRM_SHEET.url}" target="_blank" rel="noopener">${esc(CRM_SHEET.title)} ↗</a> · <a href="pipeline.html">ver kanban</a></p>`);
 fetch(cfg.file).then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>{
  D=j.oportunidades||[];D.forEach(o=>{o.cid=cfg.cid;o.pref=(o.id||"").slice(0,14)===cfg.cnpj});
  $("meta").textContent=`Atualizado ${(j.atualizado_em||"").replace("T"," ").slice(0,16)} (horário de Brasília) · publicações de ${dt(j.periodo?.inicio)} a ${dt(j.periodo?.fim)}`;
  const tot=D.reduce((s,o)=>s+(o.valor_estimado||0),0),n=f=>D.filter(f).length;
  $("kpis").innerHTML=[[D.length,"licitações no período"],[n(o=>o.pref),"da Prefeitura"],[n(o=>o.esfera=="estadual"),"estaduais"],[n(o=>o.esfera=="federal"),"federais"],[brl(tot),"valor estimado total"]].map(([b,s])=>`<div class="kpi"><b>${b}</b><small>${s}</small></div>`).join("");
  fill($("fm"),D.map(o=>o.modalidade));fill($("fe"),D.map(o=>o.esfera));
  ["fq","fm","fe","fp","fi","ft"].forEach(i=>$(i).addEventListener("input",draw));$("clr").onclick=()=>{$("fq").value=$("fm").value=$("fe").value="";$("fp").checked=false;draw()};draw();
 }).catch(()=>R.innerHTML=empty("Não foi possível carregar os dados. Tente recarregar a página."));
 function draw(){const q=$("fq").value.toLowerCase().trim(),m=$("fm").value,e=$("fe").value,p=$("fp").checked,fi=$("fi").checked,ft=$("ft").checked;
  F=D.filter(o=>(!fi||CRM[o.url])&&(!ft||isIcp(o))&&(!m||o.modalidade==m)&&(!e||o.esfera==e)&&(!p||o.pref)&&(!q||((o.objeto||"")+" "+(o.orgao||"")+" "+(o.unidade||"")).toLowerCase().includes(q))).sort((a,b)=>(b.data_publicacao||"").localeCompare(a.data_publicacao||""));
  $("cnt").textContent=`${F.length.toLocaleString("pt-BR")} licitações encontradas`+(F.length>500?" · mostrando as 500 mais recentes":"");
  R.innerHTML=F.length?`<div class="tw"><table><thead><tr><th>⭐</th><th>Órgão</th><th>Modalidade</th><th>Objeto</th><th>Publicação</th><th>Encerramento</th><th>Valor estimado</th><th><span class="sr">Link</span></th></tr></thead><tbody>${F.slice(0,500).map(o=>row(o)).join("")}</tbody></table></div>`:empty("Nenhuma licitação com esses filtros. Tente outra palavra-chave ou limpe os filtros.");bindStars(R,F.slice(0,500),draw);}
}
