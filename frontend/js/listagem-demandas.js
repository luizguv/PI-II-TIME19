/*
 * Autor: Leonardo Gambaroni Alves
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Validações, filtros, autocompletar e integração da tela de Listagem de Demandas com a API.
 */

const { request, element, message, date, ready } = PI2;

// Referências principais dos elementos da interface
const feedback = document.getElementById('apiMessage');
const tbody = document.querySelector('.tabela-demandas tbody');
const search = document.getElementById('busca');
const searchError = document.getElementById('buscaErro');
const datalistSugestoes = document.getElementById('sugestoes-demandas');
const filtroProjeto = document.getElementById('filtro-projeto');
const filtroMinhas = document.getElementById('filtro-minhas');
const btnLimparFiltros = document.getElementById('btnLimparFiltros');

// Regras de validação do lado do cliente (Reunião 3)
const TAMANHO_MINIMO_BUSCA = 3;
const TAMANHO_MAXIMO_BUSCA = 60;
const STATUS_VALIDOS = ['', 'Aberta', 'Em andamento', 'Em revisão', 'Concluída', 'Cancelada'];
const PRIORIDADES_VALIDAS = ['', 'Crítica', 'Alta', 'Média', 'Baixa'];
const TIPOS_VALIDOS = ['', 'Tarefa', 'Defeito', 'Melhoria', 'Documentação'];
const ORDENACOES_VALIDAS = ['dataCriacao', 'titulo', 'prioridade', 'status', 'prazoFinalizacao'];

// Mapeamento dos controles de filtro para os nomes de parâmetros esperados pela API
const controls = {
  status: 'filtro-status',
  prioridade: 'filtro-prioridade',
  tipo: 'filtro-tipo',
  projetoId: 'filtro-projeto',
  ordenarPor: 'ordenarPor',
};

// Mapeamento dos textos exibidos para as classes de badge definidas no CSS
const BADGE_PRIORIDADE = {
  'Crítica': 'critica',
  'Alta': 'alta',
  'Média': 'media',
  'Baixa': 'baixa',
};

const BADGE_STATUS = {
  'Aberta': 'aberta',
  'Em andamento': 'andamento',
  'Em revisão': 'revisao',
  'Concluída': 'concluida',
  'Cancelada': 'cancelada',
};

// Controle de estado da sessão, títulos para autocompletar e concorrência de requisições
let usuarioAtual = null;
let titulosDisponiveis = [];
let versaoRequisicao = 0;
let timerBusca = null;

/**
 * Exibe ou oculta a mensagem de validação específica do campo de busca.
 */
function exibirErroBusca(texto) {
  searchError.textContent = texto || '';
  searchError.hidden = !texto;
}

/**
 * Atualiza as sugestões do datalist com os títulos já carregados da API.
 */
function atualizarSugestoes(termoNormalizado) {
  datalistSugestoes.replaceChildren();

  const sugestoes =
    termoNormalizado.length >= TAMANHO_MINIMO_BUSCA
      ? titulosDisponiveis.filter(titulo => titulo.toLowerCase().includes(termoNormalizado))
      : titulosDisponiveis;

  for (const titulo of sugestoes) {
    const option = document.createElement('option');
    option.value = titulo;
    datalistSugestoes.append(option);
  }
}

/**
 * Cria um badge visual seguro (textContent) para prioridade ou status.
 */
function criarBadge(texto, mapaClasses) {
  const classe = mapaClasses[texto] || '';
  return element('span', texto, classe ? `badge ${classe}` : 'badge');
}

/**
 * Valida o campo de busca textual quanto ao limite máximo e mínimo de caracteres.
 */
function validarBusca(valorBruto) {
  if (valorBruto.length > TAMANHO_MAXIMO_BUSCA) {
    exibirErroBusca(`A busca deve ter no máximo ${TAMANHO_MAXIMO_BUSCA} caracteres.`);
    return { valido: false, consultar: false };
  }

  const termoLimpo = valorBruto.trim();
  if (termoLimpo.length > 0 && termoLimpo.length < TAMANHO_MINIMO_BUSCA) {
    exibirErroBusca(`Digite ao menos ${TAMANHO_MINIMO_BUSCA} caracteres para pesquisar.`);
    return { valido: true, consultar: false };
  }

  exibirErroBusca('');
  return { valido: true, consultar: true };
}

/**
 * Garante que os selects mantenham apenas valores aceitos pelo escopo do sistema.
 */
function validarControles() {
  const campoStatus = document.getElementById(controls.status);
  const campoPrioridade = document.getElementById(controls.prioridade);
  const campoTipo = document.getElementById(controls.tipo);
  const campoOrdenar = document.getElementById(controls.ordenarPor);

  if (!STATUS_VALIDOS.includes(campoStatus.value)) campoStatus.value = '';
  if (!PRIORIDADES_VALIDAS.includes(campoPrioridade.value)) campoPrioridade.value = '';
  if (!TIPOS_VALIDOS.includes(campoTipo.value)) campoTipo.value = '';
  if (!ORDENACOES_VALIDAS.includes(campoOrdenar.value)) campoOrdenar.value = 'dataCriacao';
}

/**
 * Consulta a rota GET /api/demandas com os filtros ativos e renderiza as linhas da tabela.
 */
async function carregarDemandas() {
  const validacao = validarBusca(search.value);
  if (!validacao.valido || !validacao.consultar) return;

  validarControles();

  const current = ++versaoRequisicao;
  const params = new URLSearchParams();
  const termo = search.value.trim();

  if (termo) params.set('busca', termo);

  // Adiciona os filtros selecionados e o critério de ordenação na querystring
  for (const [name, id] of Object.entries(controls)) {
    const valor = document.getElementById(id).value;
    if (valor) params.set(name, valor);
  }

  // Envia o identificador do usuário logado quando o filtro "Apenas atribuídas a mim" está ativo
  if (filtroMinhas.checked && usuarioAtual) {
    params.set('responsavelId', String(usuarioAtual.id));
  }

  message(feedback, 'Carregando demandas…', false);

  try {
    const { demandas } = await request('/demandas?' + params.toString());
    if (current !== versaoRequisicao) return;

    // Atualiza o cache local de títulos para alimentar o autocompletar do campo de busca
    const novosTitulos = demandas.map(d => d.titulo).filter(Boolean);
    titulosDisponiveis = Array.from(new Set([...titulosDisponiveis, ...novosTitulos]));
    atualizarSugestoes(termo.toLowerCase());

    tbody.replaceChildren();

    // Renderiza as 9 colunas obrigatórias (título, tipo, prioridade, status, projeto, responsável, criação, prazo e ação)
    for (const d of demandas) {
      const row = element('tr');

      const celulaPrioridade = element('td');
      celulaPrioridade.append(criarBadge(d.prioridade, BADGE_PRIORIDADE));

      const celulaStatus = element('td');
      celulaStatus.append(criarBadge(d.status, BADGE_STATUS));

      const celulaAcoes = element('td');
      const link = element('a', 'Ver', 'btn btn-secondary btn-acao');
      link.href = `detalhes-demanda.html?id=${d.id}`;
      celulaAcoes.append(link);

      row.append(
        element('td', d.titulo),
        element('td', d.tipo),
        celulaPrioridade,
        celulaStatus,
        element('td', d.projetoNome),
        element('td', d.responsavelNome || 'Não atribuído'),
        element('td', date(d.dataCriacao)),
        element('td', date(d.prazoFinalizacao)),
        celulaAcoes
      );

      tbody.append(row);
    }

    // Exibe mensagem informativa quando nenhum registro corresponde aos filtros
    if (!demandas.length) {
      const row = element('tr');
      const cell = element('td', 'Nenhuma demanda encontrada.');
      cell.colSpan = 9;
      row.append(cell);
      tbody.append(row);
    }

    message(feedback, `${demandas.length} demanda(s) encontrada(s).`, false);
  } catch (error) {
    if (current === versaoRequisicao) {
      tbody.replaceChildren();
      message(feedback, error.message);
    }
  }
}

/**
 * Restaura todos os filtros para o estado inicial e recarrega a listagem.
 */
function limparFiltros() {
  clearTimeout(timerBusca);
  search.value = '';
  exibirErroBusca('');

  document.getElementById(controls.status).value = '';
  document.getElementById(controls.prioridade).value = '';
  document.getElementById(controls.tipo).value = '';
  document.getElementById(controls.projetoId).value = '';
  document.getElementById(controls.ordenarPor).value = 'dataCriacao';
  filtroMinhas.checked = false;

  atualizarSugestoes('');
  carregarDemandas();
}

// Inicializa a página após validar a sessão autenticada do usuário
ready
  .then(async usuario => {
    usuarioAtual = usuario;

    // Preenche o select de projetos dinamicamente a partir dos projetos acessíveis na API
    const { projetos } = await request('/projetos');
    for (const p of projetos) {
      const option = element('option', p.nome);
      option.value = p.id;
      filtroProjeto.append(option);
    }

    await carregarDemandas();

    // Debounce e validação instantânea durante a digitação na busca
    search.addEventListener('input', () => {
      clearTimeout(timerBusca);
      const validacao = validarBusca(search.value);
      atualizarSugestoes(search.value.trim().toLowerCase());

      if (validacao.valido && validacao.consultar) {
        timerBusca = setTimeout(carregarDemandas, 250);
      }
    });

    // Dispara nova consulta imediatamente ao alterar qualquer filtro ou ordenação
    for (const id of Object.values(controls)) {
      document.getElementById(id).addEventListener('change', carregarDemandas);
    }
    filtroMinhas.addEventListener('change', carregarDemandas);
    btnLimparFiltros.addEventListener('click', limparFiltros);
  })
  .catch(error => message(feedback, error.message));
