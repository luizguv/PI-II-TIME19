/* Autor: Vinicius Zorzetto — RA:24008052
 * Cadastro e edição persistentes. Opções, permissões e status vêm da API autenticada.
 */
// nome do perfil membro da equipe
const MEMBRO = 'Membro da Equipe';

// funcao que pega um elemento pelo id
const field = id => document.getElementById(id);
// elementos da tela
const form = field('demandForm');
const feedback = field('formMessage');
const submit = form.querySelector('button[type=submit]');
// id da demanda na url (so na edicao)
const demandId = new URLSearchParams(location.search).get('id');

// demanda carregada, usuario logado e controle da consulta de feriado
let current = null;
let user = null;
let holidayVersion = 0;

// campos do formulario e nomes na api
const CAMPOS_EDITAVEIS = [
  ['title', 'titulo'],
  ['description', 'descricao'],
  ['type', 'tipo'],
  ['priority', 'prioridade'],
  ['responsible', 'responsavelId'],
  ['deadline', 'prazoFinalizacao'],
];

// funcao que mostra erro no formulario
function showError(text) {
  PI2.message(feedback, text);
}

// funcao que preenche um select com opcoes
function options(select, items, label, placeholder) {
  select.replaceChildren(new Option(placeholder, ''));
  items.forEach(item => select.add(new Option(item[label], item.id)));
}

// funcao que carrega os responsaveis do projeto escolhido
async function responsible() {
  const projectId = field('project').value;
  let usuarios = [];

  if (user.perfil !== MEMBRO && projectId) {
    ({ usuarios } = await PI2.request('/usuarios?projetoId=' + projectId)); // FLUXO:ESCOLHER-PROJETO 3/5 GET /api/usuarios
  }

  options(field('responsible'), usuarios, 'nome', 'Não atribuído');
}

// funcao que confere se o prazo cai em feriado
async function checkHoliday() {
  const version = ++holidayVersion;
  const date = field('deadline').value;
  const holidayMessage = field('holidayMessage');

  holidayMessage.textContent = '';
  if (!date) return;

  try {
    const { feriados } = await PI2.request('/feriados/' + date.slice(0, 4)); // FLUXO:FERIADOS 3/6 GET /api/feriados/:ano
    // ignora resposta de consulta antiga
    if (version !== holidayVersion) return;

    const holiday = feriados.find(h => h.date === date);
    holidayMessage.textContent = holiday
      ? `Escolha outra data: ${holiday.name} é feriado nacional.`
      : '';
  } catch (error) {
    if (version === holidayVersion) holidayMessage.textContent = error.message;
  }
}

// funcao que abre o formulario no modo edicao
async function loadForEdit() {
  current = await PI2.request('/demandas/' + encodeURIComponent(demandId));
  if (!current.podeEditar) {
    throw new Error('Você não pode editar esta demanda ou ela já está encerrada.');
  }

  // troca os textos da tela para edicao
  field('pageTitle').textContent = 'Editar demanda';
  field('submitText').textContent = 'Salvar alterações';
  document.title = 'Gestão de Demandas | Editar Demanda';

  field('project').value = current.projetoId;
  field('project').disabled = true;
  await responsible();

  // preenche os campos com a demanda
  for (const [input, key] of CAMPOS_EDITAVEIS) {
    field(input).value = current[key] ?? '';
  }

  // opcoes de status: o atual e os permitidos
  const statusOptions = [current.status, ...current.transicoesPermitidas];
  field('status').replaceChildren(...statusOptions.map(s => new Option(s, s)));

  // membro nao edita os campos
  if (user.perfil === MEMBRO) {
    CAMPOS_EDITAVEIS.forEach(([input]) => (field(input).disabled = true));
  }
}

// funcao que valida os campos e monta os dados para enviar
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

  // dados que vao para a api
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

  // na edicao envia o status; membro nao envia responsavel
  if (current) payload.status = field('status').value;
  if (current && user.perfil === MEMBRO) delete payload.responsavelId;

  // projeto obrigatorio
  if (!payload.projetoId) {
    showError('Selecione um projeto.');
    return null;
  }

  // bloqueia prazo no passado (so se o prazo mudou)
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const deadline = payload.prazoFinalizacao;
  const deadlineChanged = !current || deadline !== current.prazoFinalizacao;
  if (deadline && deadlineChanged && deadline < today) {
    showError('O prazo não pode ser uma data passada.');
    return null;
  }

  return payload;
}

// inicio da tela: botao travado ate carregar
submit.disabled = true;

PI2.ready
  .then(async usuario => {
    user = usuario;
    // membro nao escolhe responsavel
    field('responsible').disabled = user.perfil === MEMBRO;

    // carrega a lista de projetos
    const { projetos } = await PI2.request('/projetos'); // FLUXO:CARREGAR-PROJETOS 1/4 GET /api/projetos (cadastro)
    options(field('project'), projetos, 'nome', 'Selecione o projeto');

    // com id na url, abre em modo edicao
    if (demandId) {
      await loadForEdit();
    } else {
      field('statusGroup').hidden = true;
    }

    submit.disabled = false;
  })
  .catch(error => showError(error.message));

// trocar o projeto recarrega os responsaveis
field('project').addEventListener('change', () => { // FLUXO:ESCOLHER-PROJETO 2/5 evento change
  responsible().catch(error => showError(error.message));
});

// trocar o prazo confere feriado
field('deadline').addEventListener('change', checkHoliday); // FLUXO:FERIADOS 2/6 evento change

// envio do formulario: POST no cadastro, PUT na edicao
form.addEventListener('submit', async event => { // FLUXO:CADASTRAR-DEMANDA 2/6 evento submit
  event.preventDefault();
  PI2.message(feedback, '');

  if (!form.reportValidity()) return;

  // valida e monta os dados
  const payload = buildPayload();
  if (!payload) return;

  submit.disabled = true;
  try {
    // envia para a api e abre os detalhes da demanda salva
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
