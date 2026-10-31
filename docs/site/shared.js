const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const brl=v=>v==null?"—":v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const dt=s=>s?s.slice(0,10).split("-").reverse().join("/"):"—";
function shell(active){
 const L=[["index.html","Início (João Pessoa)"],["campina.html","Campina Grande"],["recife.html","Recife (PE)"],["comparativo.html","Comparativo"]];
 document.body.insertAdjacentHTML("afterbegin",`<header class="top"><div class="in"><a class="brand" href="index.html"><i></i>Radar Licitações</a><nav aria-label="Principal">${L.map(([h,t])=>`<a href="${h}"${h==active?' aria-current="page"':""}>${t}</a>`).join("")}<a href="https://pncp.gov.br/" target="_blank" rel="noopener">Fonte: PNCP ↗</a></nav></div></header>`);
 document.body.insertAdjacentHTML("beforeend",`<footer>Dados públicos do <a href="https://pncp.gov.br/" target="_blank" rel="noopener">Portal Nacional de Contratações Públicas (PNCP)</a>. Conteúdo informativo — não é parecer jurídico. Confira sempre o edital original.</footer>`);
}
const loading=()=>`<div class="state" role="status"><div class="skel"></div><div class="skel"></div><div class="skel"></div>Carregando licitações…</div>`;
const empty=msg=>`<div class="state">${msg}</div>`;
function fill(el,vals){[...new Set(vals)].filter(Boolean).sort().forEach(v=>el.insertAdjacentHTML("beforeend",`<option>${esc(v)}</option>`))}
function row(o,city){const ob=o.objeto||"";return `<tr>${city?`<td data-l="Cidade"><span class="pill ${o.cid}">${o.cid.toUpperCase()}</span></td>`:""}<td data-l="Órgão">${esc(o.orgao)}<br><small>${esc(o.unidade)}</small></td><td data-l="Modalidade"><span class="pill">${esc(o.modalidade)}</span></td><td data-l="Objeto" title="${esc(ob)}">${esc(ob.slice(0,160))}${ob.length>160?"…":""}</td><td data-l="Publicação">${dt(o.data_publicacao)}</td><td data-l="Encerramento">${dt(o.data_encerramento)}</td><td class="v" data-l="Valor estimado">${brl(o.valor_estimado)}</td><td><a class="open" href="${esc(o.url)}" target="_blank" rel="noopener">Ver no PNCP ↗</a></td></tr>`}
/* city page: cfg {file,cnpj,active} */
function cityPage(cfg){
 shell(cfg.active);const R=$("res");R.innerHTML=loading();let D=[];
 fetch(cfg.file).then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>{
  D=j.oportunidades||[];D.forEach(o=>o.pref=(o.id||"").slice(0,14)===cfg.cnpj);
  $("meta").textContent=`Atualizado ${(j.atualizado_em||"").replace("T"," ").slice(0,16)} (horário de Brasília) · publicações de ${dt(j.periodo?.inicio)} a ${dt(j.periodo?.fim)}`;
  const tot=D.reduce((s,o)=>s+(o.valor_estimado||0),0),n=f=>D.filter(f).length;
  $("kpis").innerHTML=[[D.length,"licitações no período"],[n(o=>o.pref),"da Prefeitura"],[n(o=>o.esfera=="estadual"),"estaduais"],[n(o=>o.esfera=="federal"),"federais"],[brl(tot),"valor estimado total"]].map(([b,s])=>`<div class="kpi"><b>${b}</b><small>${s}</small></div>`).join("");
  fill($("fm"),D.map(o=>o.modalidade));fill($("fe"),D.map(o=>o.esfera));
  ["fq","fm","fe","fp"].forEach(i=>$(i).addEventListener("input",draw));$("clr").onclick=()=>{$("fq").value=$("fm").value=$("fe").value="";$("fp").checked=false;draw()};draw();
 }).catch(()=>R.innerHTML=empty("Não foi possível carregar os dados. Tente recarregar a página."));
 function draw(){const q=$("fq").value.toLowerCase().trim(),m=$("fm").value,e=$("fe").value,p=$("fp").checked;
  const F=D.filter(o=>(!m||o.modalidade==m)&&(!e||o.esfera==e)&&(!p||o.pref)&&(!q||((o.objeto||"")+" "+(o.orgao||"")+" "+(o.unidade||"")).toLowerCase().includes(q))).sort((a,b)=>(b.data_publicacao||"").localeCompare(a.data_publicacao||""));
  $("cnt").textContent=`${F.length.toLocaleString("pt-BR")} licitações encontradas`+(F.length>500?" · mostrando as 500 mais recentes":"");
  R.innerHTML=F.length?`<div class="tw"><table><thead><tr><th>Órgão</th><th>Modalidade</th><th>Objeto</th><th>Publicação</th><th>Encerramento</th><th>Valor estimado</th><th><span class="sr">Link</span></th></tr></thead><tbody>${F.slice(0,500).map(o=>row(o)).join("")}</tbody></table></div>`:empty("Nenhuma licitação com esses filtros. Tente outra palavra-chave ou limpe os filtros.");}
}
