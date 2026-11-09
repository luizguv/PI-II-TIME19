/* Autoria do controller original: Caio Peccinato
 * Integração compartilhada documentada em docs/autoria-integracao.md.
 * Indicadores e distribuição usam exclusivamente a resposta da API.
 */
PI2.ready.then(async()=>{
  const d=await PI2.request('/dashboard');
  const cards=document.querySelectorAll('.kpi-valor');
  [d.totalDemandas,d.porStatus.Aberta,d.porStatus['Em andamento'],d.porTipo.Defeito].forEach((v,i)=>cards[i].textContent=v);
  const chart=document.querySelector('.grafico-container'); chart.replaceChildren();
  for(const [status,count] of Object.entries(d.porStatus)) {
    const item=PI2.element('div',`${status}: ${count}`,'status-chart-row');
    const bar=PI2.element('progress');bar.max=d.totalDemandas || 1;bar.value=count;bar.setAttribute('aria-label',status);item.append(bar);chart.append(item);
  }
  for(const [id,data] of [['criticalList',d.criticasEmAberto],['deadlineList',d.proximasDoPrazo]]) {
    const list=document.getElementById(id);list.replaceChildren();
    if(!data.length) list.append(PI2.element('li','Nenhuma demanda nesta condição.'));
    data.forEach(item=>{const li=PI2.element('li'),link=PI2.element('a',`${item.titulo} — ${PI2.date(item.prazoFinalizacao)}`);link.href=`detalhes-demanda.html?id=${item.id}`;li.append(link);list.append(li);});
  }
  PI2.message(document.getElementById('apiMessage'),'Indicadores atualizados a partir do banco.',false);
}).catch(error=>PI2.message(document.getElementById('apiMessage'),error.message));
