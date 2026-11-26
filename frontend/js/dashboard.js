/*
  Autor: Caio Peccinato
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Indicadores e distribuição usam exclusivamente a resposta da API.
 */
// area de mensagem da tela
const apiMessage = document.getElementById('apiMessage');

// funcao que preenche os cards de totais
function renderKpis(d) {
  const cards = document.querySelectorAll('.kpi-valor');
  const valores = [
    d.totalDemandas,
    d.porStatus.Aberta,
    d.porStatus['Em andamento'],
    d.porTipo.Defeito,
  ];
  valores.forEach((valor, i) => (cards[i].textContent = valor));
}

// funcao que desenha as barras de um grafico (inclui categorias com zero)
function renderChart(id, counts, total) {
  const chart = document.getElementById(id);
  chart.replaceChildren();

  for (const [label, count] of Object.entries(counts)) {
    const item = PI2.element('div', `${label}: ${count}`, 'status-chart-row');
    // barra com o total como maximo
    const bar = PI2.element('progress');
    bar.max = total || 1;
    bar.value = count;
    bar.setAttribute('aria-label', label);

    item.append(bar);
    chart.append(item);
  }
}

// funcao que monta uma lista de demandas com link
function renderList(id, demandas) {
  const list = document.getElementById(id);
  list.replaceChildren();

  // lista vazia
  if (!demandas.length) {
    list.append(PI2.element('li', 'Nenhuma demanda nesta condição.'));
    return;
  }

  for (const item of demandas) {
    const li = PI2.element('li');
    const link = PI2.element('a', `${item.titulo} — ${PI2.date(item.prazoFinalizacao)}`);
    link.href = `detalhes-demanda.html?id=${item.id}`;
    li.append(link);
    list.append(li);
  }
}

// inicio da tela
PI2.ready // FLUXO:DASHBOARD 1/4 roda ao abrir a pagina
  .then(async () => {
    // busca os dados do dashboard na api
    const d = await PI2.request('/dashboard'); // FLUXO:DASHBOARD 2/4 GET /api/dashboard

    // preenche cards, graficos e listas
    renderKpis(d);

    renderChart('statusChart', d.porStatus, d.totalDemandas);
    renderChart('priorityChart', d.porPrioridade, d.totalDemandas);
    renderChart('typeChart', d.porTipo, d.totalDemandas);

    renderList('criticalList', d.criticasEmAberto);
    renderList('deadlineList', d.proximasDoPrazo);

    // mensagem de sucesso
    PI2.message(apiMessage, 'Indicadores atualizados a partir do banco.', false);
  })
  // mostra erro se falhar
  .catch(error => PI2.message(apiMessage, error.message));
