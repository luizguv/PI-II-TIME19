/*
  Autor: Caio Peccinato
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Indicadores e distribuição usam exclusivamente a resposta da API.
 */
const apiMessage = document.getElementById('apiMessage');

// Preenche os cartões de indicadores, na ordem em que aparecem no HTML.
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

// As barras usam o total como escala e incluem categorias com zero.
function renderChart(id, counts, total) {
  const chart = document.getElementById(id);
  chart.replaceChildren();

  for (const [label, count] of Object.entries(counts)) {
    const item = PI2.element('div', `${label}: ${count}`, 'status-chart-row');
    const bar = PI2.element('progress');
    bar.max = total || 1;
    bar.value = count;
    bar.setAttribute('aria-label', label);

    item.append(bar);
    chart.append(item);
  }
}

// Lista demandas com link para a tela de detalhes.
function renderList(id, demandas) {
  const list = document.getElementById(id);
  list.replaceChildren();

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

PI2.ready // FLUXO:DASHBOARD 1/4 roda ao abrir a pagina
  .then(async () => {
    // Busca indicadores dos projetos acessíveis ao perfil da sessão.
    const d = await PI2.request('/dashboard'); // FLUXO:DASHBOARD 2/4 GET /api/dashboard

    renderKpis(d);

    renderChart('statusChart', d.porStatus, d.totalDemandas);
    renderChart('priorityChart', d.porPrioridade, d.totalDemandas);
    renderChart('typeChart', d.porTipo, d.totalDemandas);

    renderList('criticalList', d.criticasEmAberto);
    renderList('deadlineList', d.proximasDoPrazo);

    PI2.message(apiMessage, 'Indicadores atualizados a partir do banco.', false);
  })
  .catch(error => PI2.message(apiMessage, error.message));
