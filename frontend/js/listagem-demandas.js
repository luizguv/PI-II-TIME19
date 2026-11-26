/* Autor original: Leonardo Gambaroni Alves
 * Os filtros são enviados à API; nenhuma demanda é extraída de HTML fixo.
 */
const { request, element, message, date, ready } = PI2;

const feedback = document.getElementById('apiMessage');
const tbody = document.querySelector('.tabela-demandas tbody');
const search = document.getElementById('busca');

// Parâmetro da API -> id do <select> correspondente na tela.
const controls = {
  status: 'filtro-status',
  prioridade: 'filtro-prioridade',
  tipo: 'filtro-tipo',
  projetoId: 'filtro-projeto',
  ordenarPor: 'ordenarPor',
};

const TOTAL_COLUNAS = 9;
const DEBOUNCE_MS = 250;

let version = 0;
let timer;

function buildParams() {
  const params = new URLSearchParams();
  const busca = search.value.trim();
  if (busca) params.set('busca', busca);

  for (const [name, id] of Object.entries(controls)) {
    const value = document.getElementById(id).value;
    if (value) params.set(name, value);
  }
  return params;
}

function createRow(d) {
  const row = element('tr');
  const values = [
    d.titulo,
    d.tipo,
    d.prioridade,
    d.status,
    d.projetoNome,
    d.responsavelNome || 'Não atribuído',
    date(d.dataCriacao),
    date(d.prazoFinalizacao),
  ];
  for (const value of values) row.append(element('td', value));

  // O botão Ver leva o ID para a tela de detalhes.
  const cell = element('td');
  const link = element('a', 'Ver', 'btn btn-secondary btn-acao');
  link.href = `detalhes-demanda.html?id=${d.id}`; // FLUXO:VER-DETALHES 1/5 link Ver
  cell.append(link);
  row.append(cell);

  return row;
}

function createEmptyRow() {
  const row = element('tr');
  const cell = element('td', 'Nenhuma demanda encontrada.');
  cell.colSpan = TOTAL_COLUNAS;
  row.append(cell);
  return row;
}

// Envia filtros à API; só a resposta mais recente atualiza a tabela.
async function load() {
  const current = ++version;

  if (search.value.length > 60) {
    message(feedback, 'A busca deve ter no máximo 60 caracteres.');
    return;
  }

  message(feedback, 'Carregando demandas…', false);

  try {
    const { demandas } = await request('/demandas?' + buildParams()); // FLUXO:LISTAGEM 3/5 GET /api/demandas
    if (current !== version) return;

    tbody.replaceChildren(...demandas.map(createRow));
    if (!demandas.length) tbody.append(createEmptyRow());

    message(feedback, `${demandas.length} demanda(s) encontrada(s).`, false);
  } catch (error) {
    if (current === version) {
      tbody.replaceChildren();
      message(feedback, error.message);
    }
  }
}

ready
  .then(async () => {
    const { projetos } = await request('/projetos'); // FLUXO:CARREGAR-PROJETOS 2/4 GET /api/projetos (listagem)
    const filtroProjeto = document.getElementById('filtro-projeto');
    for (const p of projetos) {
      const option = element('option', p.nome);
      option.value = p.id;
      filtroProjeto.append(option);
    }

    await load();

    // Espera um pouco após digitar antes de consultar a API.
    search.addEventListener('input', () => { // FLUXO:LISTAGEM 1/5 evento da busca
      clearTimeout(timer);
      timer = setTimeout(load, DEBOUNCE_MS);
    });

    Object.values(controls).forEach(id => {
      document.getElementById(id).addEventListener('change', load); // FLUXO:LISTAGEM 2/5 evento dos filtros
    });
  })
  .catch(error => message(feedback, error.message));
