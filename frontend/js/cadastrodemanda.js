/* Autor: Vinicius Zorzetto — RA:24008052
 * Cadastro e edição persistentes. Opções, permissões e status vêm da API autenticada.
 */
const MEMBRO = 'Membro da Equipe';

const field = id => document.getElementById(id);
const form = field('demandForm');
const feedback = field('formMessage');
const submit = form.querySelector('button[type=submit]');
const demandId = new URLSearchParams(location.search).get('id');

let current = null;
let user = null;
let holidayVersion = 0;

// Campos do formulário ligados às propriedades da demanda na API.
const CAMPOS_EDITAVEIS = [
  ['title', 'titulo'],
  ['description', 'descricao'],
  ['type', 'tipo'],
  ['priority', 'prioridade'],
  ['responsible', 'responsavelId'],
  ['deadline', 'prazoFinalizacao'],
];

function showError(text) {
  PI2.message(feedback, text);
}

// Preenche um <select> com um placeholder seguido dos itens.
function options(select, items, label, placeholder) {
  select.replaceChildren(new Option(placeholder, ''));
  items.forEach(item => select.add(new Option(item[label], item.id)));
}

// Carrega responsáveis do projeto selecionado; membros não fazem atribuição.
async function responsible() {
  const projectId = field('project').value;
  let usuarios = [];

  if (user.perfil !== MEMBRO && projectId) {
    ({ usuarios } = await PI2.request('/usuarios?projetoId=' + projectId)); // FLUXO:ESCOLHER-PROJETO 3/5 GET /api/usuarios
  }

  options(field('responsible'), usuarios, 'nome', 'Não atribuído');
}

// Ignora respostas de consultas anteriores à última troca de prazo.
async function checkHoliday() {
  const version = ++holidayVersion;
  const date = field('deadline').value;
  const holidayMessage = field('holidayMessage');

  holidayMessage.textContent = '';
  if (!date) return;

  try {
    const { feriados } = await PI2.request('/feriados/' + date.slice(0, 4)); // FLUXO:FERIADOS 3/6 GET /api/feriados/:ano
    if (version !== holidayVersion) return;

    const holiday = feriados.find(h => h.date === date);
    holidayMessage.textContent = holiday
      ? `Escolha outra data: ${holiday.name} é feriado nacional.`
      : '';
  } catch (error) {
    if (version === holidayVersion) holidayMessage.textContent = error.message;
  }
}

// Abre o formulário no modo de edição com os dados da demanda.
async function loadForEdit() {
  current = await PI2.request('/demandas/' + encodeURIComponent(demandId));
  if (!current.podeEditar) {
    throw new Error('Você não pode editar esta demanda ou ela já está encerrada.');
  }

  field('pageTitle').textContent = 'Editar demanda';
  field('submitText').textContent = 'Salvar alterações';
  document.title = 'Gestão de Demandas | Editar Demanda';

  field('project').value = current.projetoId;
  field('project').disabled = true;
  await responsible();

  for (const [input, key] of CAMPOS_EDITAVEIS) {
    field(input).value = current[key] ?? '';
  }

  const statusOptions = [current.status, ...current.transicoesPermitidas];
  field('status').replaceChildren(...statusOptions.map(s => new Option(s, s)));

  if (user.perfil === MEMBRO) {
    CAMPOS_EDITAVEIS.forEach(([input]) => (field(input).disabled = true));
  }
}

// Valida os campos e monta o corpo da requisição; retorna null se algo for inválido.
function buildPayload() {
  const title = field('title').value.trim();
  const description = field('description').value.trim();

  if (title.length < 3 || title.length > 150) {
    showError('O título deve ter entre 3 e 150 caracteres.');
    return null;
  }
  if (description.length < 10 || description.length > 2000) {
    showError('A descrição deve ter entre 10 e 2000 caracteres.');
    return null;
  }

  const responsibleId = field('responsible').value;
  const payload = {
    titulo: title,
    descricao: description,
    tipo: field('type').value,
    prioridade: field('priority').value,
    projetoId: Number(field('project').value),
    responsavelId: responsibleId ? Number(responsibleId) : null,
    prazoFinalizacao: field('deadline').value || null,
  };

  if (current) payload.status = field('status').value;
  if (current && user.perfil === MEMBRO) delete payload.responsavelId;

  if (!payload.projetoId) {
    showError('Selecione um projeto.');
    return null;
  }

  // Não impede salvar uma mudança de status mantendo um prazo antigo já existente.
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const deadline = payload.prazoFinalizacao;
  const deadlineChanged = !current || deadline !== current.prazoFinalizacao;
  if (deadline && deadlineChanged && deadline < today) {
    showError('O prazo não pode ser uma data passada.');
    return null;
  }

  return payload;
}

// Inicialização: o botão só é liberado depois que a sessão e as opções carregam.
submit.disabled = true;

PI2.ready
  .then(async usuario => {
    user = usuario;
    field('responsible').disabled = user.perfil === MEMBRO;

    const { projetos } = await PI2.request('/projetos'); // FLUXO:CARREGAR-PROJETOS 1/4 GET /api/projetos (cadastro)
    options(field('project'), projetos, 'nome', 'Selecione o projeto');

    // O ID na URL abre o formulário no modo de edição.
    if (demandId) {
      await loadForEdit();
    } else {
      field('statusGroup').hidden = true;
    }

    submit.disabled = false;
  })
  .catch(error => showError(error.message));

field('project').addEventListener('change', () => { // FLUXO:ESCOLHER-PROJETO 2/5 evento change
  responsible().catch(error => showError(error.message));
});

field('deadline').addEventListener('change', checkHoliday); // FLUXO:FERIADOS 2/6 evento change

// Salva com POST no cadastro ou PUT na edição.
form.addEventListener('submit', async event => { // FLUXO:CADASTRAR-DEMANDA 2/6 evento submit
  event.preventDefault();
  PI2.message(feedback, '');

  if (!form.reportValidity()) return;

  const payload = buildPayload();
  if (!payload) return;

  submit.disabled = true;
  try {
    const path = '/demandas' + (demandId ? '/' + encodeURIComponent(demandId) : '');
    const saved = await PI2.request(path, { // FLUXO:CADASTRAR-DEMANDA 3/6 POST /api/demandas
      method: demandId ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    location.assign('detalhes-demanda.html?id=' + saved.id);
  } catch (error) {
    showError(error.message);
  } finally {
    submit.disabled = false;
  }
});
