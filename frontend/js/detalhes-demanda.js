/*
  Autor: João Pedro Silveira de Souza
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: JavaScript da tela de Detalhes de Demanda (validações + integração com a API)
*/

// Endereço da API (o mesmo usado pela tela de login).
const URL_API = "http://localhost:3000/api";

// O id da demanda vem na URL: detalhes-demanda.html?id=3
const idDemanda = new URLSearchParams(window.location.search).get("id");

// Elementos da tela
const erroGeral = document.getElementById("erroGeral");
const mensagemSucesso = document.getElementById("mensagemSucesso");
const conteudoDemanda = document.getElementById("conteudoDemanda");

const tituloDemanda = document.getElementById("tituloDemanda");
const valorClassificacao = document.getElementById("valorClassificacao");
const valorPrioridade = document.getElementById("valorPrioridade");
const valorStatus = document.getElementById("valorStatus");
const valorDescricao = document.getElementById("valorDescricao");
const valorProjeto = document.getElementById("valorProjeto");
const valorResponsavel = document.getElementById("valorResponsavel");
const valorCriadoEm = document.getElementById("valorCriadoEm");
const valorPrazo = document.getElementById("valorPrazo");
const valorAtualizacao = document.getElementById("valorAtualizacao");

const secaoStatus = document.getElementById("secaoStatus");
const campoNovoStatus = document.getElementById("novoStatus");
const botaoAtualizarStatus = document.getElementById("botaoAtualizarStatus");
const erroStatus = document.getElementById("erroStatus");

const editarDemanda = document.getElementById("editarDemanda");
const campoFormEdicao = document.getElementById("secao-formulario-edicao-demanda");
const formEdicao = document.getElementById("formEditarDemanda");
const campoTitulo = document.getElementById("tituloEdicao");
const campoDescricao = document.getElementById("descricaoEdicao");
const campoClassificacao = document.getElementById("classificacao");
const campoPrioridade = document.getElementById("prioridade");
const campoResponsavel = document.getElementById("responsavelEdicao");
const campoPrazo = document.getElementById("prazoEdicao");
const cancelarEdicao = document.getElementById("cancelarEdicao");
const salvarEdicao = document.getElementById("salvarEdicao");
const erroEdicao = document.getElementById("erroEdicao");

const formComentario = document.getElementById("formComentarios");
const comentario = document.getElementById("comentario");
const contador = document.getElementById("contador");
const erroComentario = document.getElementById("erroComentario");
const botaoComentario = document.getElementById("botaoComentario");
const listaComentarios = document.getElementById("listaComentarios");

const listaHistorico = document.getElementById("listaHistorico");

// Guarda a demanda que está na tela (resposta mais recente da API)
let demandaAtual = null;


/* ------------------------------------------------------------------ */
/* Funções de apoio                                                    */
/* ------------------------------------------------------------------ */

// Lê o usuário logado. A tela de login precisa gravar no navegador:
//   localStorage.setItem("usuarioLogado", JSON.stringify({ id: 1, nome: "Admin Geral" }))
// Só o "id" é usado: o perfil é sempre conferido pelo servidor, no banco.
function obterUsuarioLogado() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (usuario && Number(usuario.id) > 0) {
      return usuario;
    }
  } catch (erro) {
    // JSON inválido: tratamos como "ninguém logado"
  }

  return null;
}

// Faz a chamada à API, envia quem está logado e transforma erros em mensagens para o usuário.
async function chamarApi(caminho, opcoes = {}) {
  const usuario = obterUsuarioLogado();

  const cabecalhos = { "X-Usuario-Id": usuario ? String(usuario.id) : "" };

  if (opcoes.body) {
    cabecalhos["Content-Type"] = "application/json";
  }

  let resposta;

  try {
    resposta = await fetch(URL_API + caminho, { ...opcoes, headers: cabecalhos });
  } catch (erro) {
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique se o backend está rodando."
    );
  }

  let dados = {};

  try {
    dados = await resposta.json();
  } catch (erro) {
    // resposta sem JSON: seguimos com objeto vazio
  }

  if (!resposta.ok) {
    // Mostra a mensagem que a API mandou (400, 401, 403, 404, 409...)
    throw new Error(dados.mensagem || "Erro " + resposta.status + " ao falar com o servidor.");
  }

  return dados;
}

// Converte "AAAA-MM-DD" em "DD/MM/AAAA"
function formatarData(iso) {
  if (!iso) {
    return "Sem prazo";
  }

  const partes = iso.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// Converte "AAAA-MM-DDTHH:MM:SS" em "DD/MM/AAAA HH:MM"
function formatarDataHora(iso) {
  if (!iso) {
    return "-";
  }

  const [data, hora] = iso.split("T");
  return formatarData(data) + " " + hora.slice(0, 5);
}

// Data de hoje no mesmo formato do campo <input type="date"> (AAAA-MM-DD)
function dataDeHoje() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return hoje.getFullYear() + "-" + mes + "-" + dia;
}

function mostrarErro(elemento, texto) {
  elemento.textContent = texto;
  elemento.classList.remove("oculto");
}

function limparErro(elemento) {
  elemento.textContent = "";
  elemento.classList.add("oculto");
}

function mostrarSucesso(texto) {
  mensagemSucesso.textContent = texto;
  mensagemSucesso.classList.remove("oculto");

  setTimeout(function () {
    mensagemSucesso.classList.add("oculto");
  }, 5000);
}

// Cria um <p> com texto (textContent evita que um comentário com HTML quebre a página)
function criarParagrafo(texto) {
  const p = document.createElement("p");
  p.textContent = texto;
  return p;
}


/* ------------------------------------------------------------------ */
/* Carregar e mostrar a demanda                                        */
/* ------------------------------------------------------------------ */

function mostrarDemanda(demanda) {
  demandaAtual = demanda;

  tituloDemanda.textContent = "Demanda #" + demanda.id + " - " + demanda.titulo;
  valorClassificacao.textContent = demanda.tipo;
  valorPrioridade.textContent = demanda.prioridade;
  valorStatus.textContent = demanda.status;
  valorDescricao.textContent = demanda.descricao;
  valorProjeto.textContent = demanda.projetoNome;
  valorResponsavel.textContent = demanda.responsavelNome || "Sem responsável";
  valorCriadoEm.textContent = formatarDataHora(demanda.dataCriacao);
  valorPrazo.textContent = formatarData(demanda.prazoFinalizacao);
  valorAtualizacao.textContent = formatarDataHora(demanda.dataUltimaAtualizacao);

  // O botão de editar só aparece para quem tem permissão (a API decide)
  if (demanda.permissoes.podeEditar) {
    editarDemanda.classList.remove("oculto");
  } else {
    editarDemanda.classList.add("oculto");
    campoFormEdicao.classList.add("oculto");
  }

  montarOpcoesDeStatus(demanda.permissoes.transicoesPermitidas);
}

// Mostra só os status para os quais o usuário pode mover a demanda
function montarOpcoesDeStatus(opcoes) {
  campoNovoStatus.innerHTML = "";
  limparErro(erroStatus);

  if (opcoes.length === 0) {
    secaoStatus.classList.add("oculto");
    return;
  }

  for (const status of opcoes) {
    const opcao = document.createElement("option");
    opcao.value = status;
    opcao.textContent = status === "Cancelada" ? "Cancelar demanda" : status;
    campoNovoStatus.appendChild(opcao);
  }

  secaoStatus.classList.remove("oculto");
}

async function carregarComentarios() {
  try {
    const dados = await chamarApi("/demandas/" + idDemanda + "/comentarios");

    listaComentarios.innerHTML = "";

    if (dados.comentarios.length === 0) {
      listaComentarios.appendChild(criarParagrafo("Nenhum comentário ainda."));
      return;
    }

    for (const c of dados.comentarios) {
      const item = document.createElement("div");
      item.className = "comentario-item";

      const autor = document.createElement("p");
      autor.className = "comentario-autor";
      autor.textContent = c.usuarioNome;

      const data = document.createElement("span");
      data.className = "comentario-data";
      data.textContent = formatarDataHora(c.dataCriacao);
      autor.appendChild(data);

      const texto = criarParagrafo(c.texto);
      texto.className = "comentario-texto";

      item.appendChild(autor);
      item.appendChild(texto);
      listaComentarios.appendChild(item);
    }
  } catch (erro) {
    listaComentarios.innerHTML = "";
    listaComentarios.appendChild(criarParagrafo("Não foi possível carregar os comentários: " + erro.message));
  }
}

async function carregarHistorico() {
  try {
    const dados = await chamarApi("/demandas/" + idDemanda + "/historico");

    listaHistorico.innerHTML = "";

    for (const h of dados.historico) {
      listaHistorico.appendChild(criarParagrafo(formatarDataHora(h.dataAlteracao) + " - " + h.descricao));
    }

    // A criação da demanda não gera linha no histórico do banco, então mostramos a partir da data de criação.
    if (demandaAtual) {
      listaHistorico.appendChild(criarParagrafo(formatarDataHora(demandaAtual.dataCriacao) + " - Demanda criada."));
    }
  } catch (erro) {
    listaHistorico.innerHTML = "";
    listaHistorico.appendChild(criarParagrafo("Não foi possível carregar o histórico: " + erro.message));
  }
}

async function iniciarTela() {
  if (!idDemanda || !/^\d+$/.test(idDemanda)) {
    mostrarErro(erroGeral, "Nenhuma demanda foi selecionada. Abra os detalhes pela listagem de demandas.");
    return;
  }

  if (!obterUsuarioLogado()) {
    mostrarErro(erroGeral, "Você precisa estar logado para ver esta demanda. Volte para a tela de login.");
    return;
  }

  try {
    const demanda = await chamarApi("/demandas/" + idDemanda);

    mostrarDemanda(demanda);
    conteudoDemanda.classList.remove("oculto");

    await Promise.all([carregarComentarios(), carregarHistorico()]);
  } catch (erro) {
    mostrarErro(erroGeral, erro.message);
  }
}


/* ------------------------------------------------------------------ */
/* Comentários                                                         */
/* ------------------------------------------------------------------ */

comentario.addEventListener("input", function somarCaractere() {

  let tamanho = comentario.value.length;

  contador.textContent = tamanho + "/300";

});


formComentario.addEventListener("submit", async function validador(event) {

  event.preventDefault();

  limparErro(erroComentario);

  const texto = comentario.value.trim();

  // Validações do navegador (o servidor valida de novo)
  if (texto === "") {
    mostrarErro(erroComentario, "ERRO! Digite um comentário antes de enviar.");
    return;
  }

  if (texto.length > 300) {
    mostrarErro(erroComentario, "ERRO! O comentário não pode ter mais que 300 caracteres.");
    return;
  }

  botaoComentario.disabled = true;

  try {
    await chamarApi("/demandas/" + idDemanda + "/comentarios", {
      method: "POST",
      body: JSON.stringify({ texto: texto })
    });

    comentario.value = "";
    contador.textContent = "0/300";

    await carregarComentarios();
  } catch (erro) {
    mostrarErro(erroComentario, "ERRO! " + erro.message);
  } finally {
    botaoComentario.disabled = false;
  }

});


/* ------------------------------------------------------------------ */
/* Mudança de status e cancelamento                                    */
/* ------------------------------------------------------------------ */

botaoAtualizarStatus.addEventListener("click", async function () {

  limparErro(erroStatus);

  const novoStatus = campoNovoStatus.value;

  if (novoStatus === "") {
    mostrarErro(erroStatus, "ERRO! Escolha o novo status.");
    return;
  }

  // Cancelar não tem volta, então pedimos confirmação
  if (novoStatus === "Cancelada" && !confirm("Deseja realmente cancelar esta demanda? Essa ação não pode ser desfeita.")) {
    return;
  }

  botaoAtualizarStatus.disabled = true;

  try {
    const dados = await chamarApi("/demandas/" + idDemanda + "/status", {
      method: "PATCH",
      body: JSON.stringify({ status: novoStatus })
    });

    mostrarDemanda(dados.demanda);
    mostrarSucesso(dados.mensagem);

    await carregarHistorico();
  } catch (erro) {
    mostrarErro(erroStatus, "ERRO! " + erro.message);
  } finally {
    botaoAtualizarStatus.disabled = false;
  }

});


/* ------------------------------------------------------------------ */
/* Edição da demanda                                                   */
/* ------------------------------------------------------------------ */

// Busca os usuários vinculados ao projeto para preencher a lista de responsáveis
async function carregarResponsaveis() {
  const dados = await chamarApi("/demandas/" + idDemanda + "/responsaveis");

  campoResponsavel.innerHTML = "";

  const semResponsavel = document.createElement("option");
  semResponsavel.value = "";
  semResponsavel.textContent = "Sem responsável";
  campoResponsavel.appendChild(semResponsavel);

  for (const usuario of dados.responsaveis) {
    const opcao = document.createElement("option");
    opcao.value = String(usuario.id);
    opcao.textContent = usuario.nome + " (" + usuario.perfil + ")";
    campoResponsavel.appendChild(opcao);
  }
}

editarDemanda.addEventListener("click", async function () {

  limparErro(erroEdicao);

  try {
    await carregarResponsaveis();
  } catch (erro) {
    mostrarErro(erroEdicao, "ERRO! " + erro.message);
  }

  // Preenche o formulário com os valores atuais da demanda
  campoTitulo.value = demandaAtual.titulo;
  campoDescricao.value = demandaAtual.descricao;
  campoClassificacao.value = demandaAtual.tipo;
  campoPrioridade.value = demandaAtual.prioridade;
  campoResponsavel.value = demandaAtual.responsavelId ? String(demandaAtual.responsavelId) : "";
  campoPrazo.value = demandaAtual.prazoFinalizacao || "";

  campoFormEdicao.classList.remove("oculto");

});


cancelarEdicao.addEventListener("click", function () {

  campoFormEdicao.classList.add("oculto");

  limparErro(erroEdicao);

});


formEdicao.addEventListener("submit", async function (event) {

  event.preventDefault();

  limparErro(erroEdicao);

  const titulo = campoTitulo.value.trim();
  const descricao = campoDescricao.value.trim();
  const classificacao = campoClassificacao.value;
  const prioridade = campoPrioridade.value;
  const responsavel = campoResponsavel.value;
  const prazo = campoPrazo.value;

  // Validações do navegador (o servidor valida de novo)
  if (titulo === "") {
    mostrarErro(erroEdicao, "ERRO! O título não pode ficar vazio.");
    return;
  }

  if (titulo.length > 150) {
    mostrarErro(erroEdicao, "ERRO! O título pode ter no máximo 150 caracteres.");
    return;
  }

  if (descricao === "") {
    mostrarErro(erroEdicao, "ERRO! A descrição não pode ficar vazia.");
    return;
  }

  if (descricao.length > 500) {
    mostrarErro(erroEdicao, "ERRO! A descrição pode ter no máximo 500 caracteres.");
    return;
  }

  if (prazo === "") {
    mostrarErro(erroEdicao, "ERRO! Escolha um prazo para a demanda.");
    return;
  }

  // Só reclama de data passada se o prazo foi alterado
  if (prazo !== demandaAtual.prazoFinalizacao && prazo < dataDeHoje()) {
    mostrarErro(erroEdicao, "ERRO! O novo prazo não pode ser anterior à data atual.");
    return;
  }

  // Evita chamar a API quando nada mudou
  const responsavelAtual = demandaAtual.responsavelId ? String(demandaAtual.responsavelId) : "";

  const nadaMudou =
    titulo === demandaAtual.titulo &&
    descricao === demandaAtual.descricao &&
    classificacao === demandaAtual.tipo &&
    prioridade === demandaAtual.prioridade &&
    responsavel === responsavelAtual &&
    prazo === demandaAtual.prazoFinalizacao;

  if (nadaMudou) {
    mostrarErro(erroEdicao, "ERRO! Altere pelo menos um campo antes de salvar.");
    return;
  }

  salvarEdicao.disabled = true;

  try {
    // O servidor confere permissão, feriado nacional (API externa) e grava o histórico
    const dados = await chamarApi("/demandas/" + idDemanda, {
      method: "PUT",
      body: JSON.stringify({
        titulo: titulo,
        descricao: descricao,
        tipo: classificacao,
        prioridade: prioridade,
        responsavelId: responsavel === "" ? null : Number(responsavel),
        prazoFinalizacao: prazo
      })
    });

    mostrarDemanda(dados.demanda);
    campoFormEdicao.classList.add("oculto");
    mostrarSucesso(dados.mensagem);

    await carregarHistorico();
  } catch (erro) {
    mostrarErro(erroEdicao, "ERRO! " + erro.message);
  } finally {
    salvarEdicao.disabled = false;
  }

});


// Começa carregando os dados da demanda
iniciarTela();