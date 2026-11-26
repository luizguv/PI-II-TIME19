/*
  Autor: João Pedro Silveira de Souza
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: JavaScript da tela de Detalhes de Demanda (validações + integração com a API)
*/

// endereco base da api
const URL_API = "/api";

// id da demanda na url (ex: detalhes-demanda.html?id=1)
const parametrosUrl = new URLSearchParams(window.location.search);
const idDemanda = parametrosUrl.get("id");


// elementos da tela
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

// demanda carregada na tela
let demandaAtual = null;

// funcao que mostra uma mensagem de erro
function mostrarErro(elemento, texto) {
  elemento.innerText = texto;
  elemento.classList.remove("oculto");
}

// funcao que esconde uma mensagem de erro
function limparErro(elemento) {
  elemento.innerText = "";
  elemento.classList.add("oculto");
}

// funcao que mostra mensagem de sucesso por 4 segundos
function mostrarSucesso(texto) {
  mensagemSucesso.innerText = texto;
  mensagemSucesso.classList.remove("oculto");

  setTimeout(function () {
    mensagemSucesso.classList.add("oculto");
  }, 4000);
}

// funcao que converte AAAA-MM-DD para DD/MM/AAAA
function formatarData(iso) {
  if (!iso) {
    return "Sem prazo";
  }
  const partes = iso.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// funcao que formata data e hora
function formatarDataHora(iso) {
  return PI2.date(iso);
}

// funcao que retorna a data de hoje (AAAA-MM-DD)
function obterDataDeHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return ano + "-" + mes + "-" + dia;
}

// funcao que preenche a tela com os dados da demanda
function mostrarDemandaNaTela(demanda) {
  demandaAtual = demanda;

  tituloDemanda.innerText = "Demanda #" + demanda.id + " - " + demanda.titulo;
  valorClassificacao.innerText = demanda.tipo;
  valorPrioridade.innerText = demanda.prioridade;
  valorStatus.innerText = demanda.status;
  valorDescricao.innerText = demanda.descricao;
  valorProjeto.innerText = demanda.projetoNome;
  valorResponsavel.innerText = demanda.responsavelNome || "Sem responsável";
  valorCriadoEm.innerText = formatarDataHora(demanda.dataCriacao);
  valorPrazo.innerText = formatarData(demanda.prazoFinalizacao);
  valorAtualizacao.innerText = formatarDataHora(demanda.dataUltimaAtualizacao);

  // mostra o botao editar so se a api permitir
  if (demanda.permissoes && demanda.permissoes.podeEditar) {
    editarDemanda.classList.remove("oculto");
  } else {
    editarDemanda.classList.add("oculto");
    campoFormEdicao.classList.add("oculto");
  }

  // preenche a lista de novos status
  campoNovoStatus.innerHTML = "";
  limparErro(erroStatus);

  const opcoesStatus = demanda.permissoes ? demanda.permissoes.transicoesPermitidas : [];

  if (opcoesStatus.length === 0) {
    secaoStatus.classList.add("oculto");
  } else {
    for (let i = 0; i < opcoesStatus.length; i++) {
      const statusOpcao = opcoesStatus[i];
      const option = document.createElement("option");
      option.value = statusOpcao;
      option.innerText = statusOpcao === "Cancelada" ? "Cancelar demanda" : statusOpcao;
      campoNovoStatus.appendChild(option);
    }
    secaoStatus.classList.remove("oculto");
  }
}

// funcao que carrega a lista de comentarios
async function carregarComentarios() {
  try {
    const resposta = await apiFetch(URL_API + "/demandas/" + idDemanda + "/comentarios"); // FLUXO:LISTAR-COMENTARIOS 1/3 GET /api/demandas/:id/comentarios
    const dados = await resposta.json();

    listaComentarios.innerHTML = "";

    if (!resposta.ok) {
      const pErro = document.createElement("p");
      pErro.innerText = dados.mensagem || "Erro ao carregar comentários.";
      listaComentarios.appendChild(pErro);
      return;
    }

    // sem comentarios
    if (dados.comentarios.length === 0) {
      const pVazio = document.createElement("p");
      pVazio.innerText = "Nenhum comentário ainda.";
      listaComentarios.appendChild(pVazio);
      return;
    }

    // monta cada comentario
    for (let i = 0; i < dados.comentarios.length; i++) {
      const c = dados.comentarios[i];

      const item = document.createElement("div");
      item.className = "comentario-item";

      const autor = document.createElement("p");
      autor.className = "comentario-autor";
      autor.innerText = c.usuarioNome;

      const data = document.createElement("span");
      data.className = "comentario-data";
      data.innerText = formatarDataHora(c.dataCriacao);
      autor.appendChild(data);

      const texto = document.createElement("p");
      texto.className = "comentario-texto";
      texto.innerText = c.texto;

      item.appendChild(autor);
      item.appendChild(texto);
      listaComentarios.appendChild(item);
    }
  } catch (erro) {
    listaComentarios.innerHTML = "<p>Não foi possível carregar os comentários.</p>";
  }
}

// funcao que carrega o historico de alteracoes
async function carregarHistorico() {
  try {
    const resposta = await apiFetch(URL_API + "/demandas/" + idDemanda + "/historico"); // FLUXO:HISTORICO 1/3 GET /api/demandas/:id/historico
    const dados = await resposta.json();

    listaHistorico.innerHTML = "";

    if (resposta.ok && dados.historico) {
      for (let i = 0; i < dados.historico.length; i++) {
        const h = dados.historico[i];
        const p = document.createElement("p");
        p.innerText = formatarDataHora(h.dataAlteracao) + " - " + h.usuarioNome + " - " + h.descricao;
        listaHistorico.appendChild(p);
      }
    }

    // ultima linha: criacao da demanda
    if (demandaAtual) {
      const pCriacao = document.createElement("p");
      pCriacao.innerText = formatarDataHora(demandaAtual.dataCriacao) + " - Demanda criada.";
      listaHistorico.appendChild(pCriacao);
    }
  } catch (erro) {
    listaHistorico.innerHTML = "<p>Não foi possível carregar o histórico.</p>";
  }
}

// funcao que chama a api com o cookie da sessao
async function apiFetch(url, options = {}) {
  await PI2.ready;
  return fetch(url, {
    ...options,
    credentials: "same-origin",
    signal: AbortSignal.timeout(25000),
  });
}

// funcao que carrega a demanda, os comentarios e o historico
async function iniciarTela() { // FLUXO:VER-DETALHES 2/5 roda ao abrir a pagina
  if (!/^\d+$/.test(idDemanda || "")) {
    mostrarErro(erroGeral, "Selecione uma demanda na listagem.");
    return;
  }
  limparErro(erroGeral);

  try {
    const resposta = await apiFetch(URL_API + "/demandas/" + idDemanda); // FLUXO:VER-DETALHES 3/5 GET /api/demandas/:id
    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarErro(erroGeral, dados.mensagem || "Erro ao carregar a demanda.");
      return;
    }

    mostrarDemandaNaTela(dados);
    conteudoDemanda.classList.remove("oculto");

    await carregarComentarios();
    await carregarHistorico();
  } catch (erro) {
    mostrarErro(
      erroGeral,
      "Não foi possível conectar ao servidor. Verifique se o backend está rodando."
    );
  }
}

// contador de caracteres do comentario
comentario.addEventListener("input", function somarCaractere() {
  const tamanho = comentario.value.length;
  contador.innerText = tamanho + "/300";
});

// envio do comentario
formComentario.addEventListener("submit", async function validador(event) { // FLUXO:ENVIAR-COMENTARIO 2/5 evento submit
  event.preventDefault();
  limparErro(erroComentario);

  const texto = comentario.value.trim();
  const tamanho = comentario.value.length;

  // validacoes do comentario
  if (texto === "") {
    mostrarErro(erroComentario, "ERRO! Digite um comentário antes de enviar.");
    return;
  }

  if (tamanho > 300) {
    mostrarErro(erroComentario, "ERRO! O comentário não pode ter mais que 300 caracteres.");
    return;
  }

  botaoComentario.disabled = true;

  try {
    const resposta = await apiFetch(URL_API + "/demandas/" + idDemanda + "/comentarios", { // FLUXO:ENVIAR-COMENTARIO 3/5 POST /api/demandas/:id/comentarios
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texto: texto })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarErro(erroComentario, "ERRO! " + (dados.mensagem || "Falha ao salvar comentário."));
      return;
    }

    comentario.value = "";
    contador.innerText = "0/300";
    await carregarComentarios();
  } catch (erro) {
    mostrarErro(erroComentario, "ERRO! Não foi possível conectar ao servidor.");
  } finally {
    botaoComentario.disabled = false;
  }
});

// botao atualizar status (cancelar pede confirmacao)
botaoAtualizarStatus.addEventListener("click", async function () { // FLUXO:ATUALIZAR-STATUS 2/7 evento click
  limparErro(erroStatus);

  const novoStatus = campoNovoStatus.value;

  if (novoStatus === "") {
    mostrarErro(erroStatus, "ERRO! Escolha o novo status.");
    return;
  }

  // confirma antes de cancelar
  if (novoStatus === "Cancelada") {
    const confirmou = confirm("Deseja realmente cancelar esta demanda?");
    if (!confirmou) {
      return;
    }
  }

  botaoAtualizarStatus.disabled = true;

  try {
    const resposta = await apiFetch(URL_API + "/demandas/" + idDemanda + "/status", { // FLUXO:ATUALIZAR-STATUS 3/7 PATCH /api/demandas/:id/status
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: novoStatus })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarErro(erroStatus, "ERRO! " + (dados.mensagem || "Não foi possível alterar o status."));
      return;
    }

    mostrarDemandaNaTela(dados.demanda);
    mostrarSucesso(dados.mensagem);
    await carregarHistorico();
  } catch (erro) {
    mostrarErro(erroStatus, "ERRO! Falha de conexão com o servidor.");
  } finally {
    botaoAtualizarStatus.disabled = false;
  }
});

// funcao que carrega os responsaveis do projeto
async function carregarResponsaveis() {
  try {
    const resposta = await apiFetch(URL_API + "/demandas/" + idDemanda + "/responsaveis"); // FLUXO:EDITAR-ABRIR 3/5 GET /api/demandas/:id/responsaveis
    const dados = await resposta.json();

    campoResponsavel.innerHTML = "";

    const opcaoSemResponsavel = document.createElement("option");
    opcaoSemResponsavel.value = "";
    opcaoSemResponsavel.innerText = "Sem responsável";
    campoResponsavel.appendChild(opcaoSemResponsavel);

    if (resposta.ok && dados.responsaveis) {
      for (let i = 0; i < dados.responsaveis.length; i++) {
        const u = dados.responsaveis[i];
        const opcao = document.createElement("option");
        opcao.value = String(u.id);
        opcao.innerText = u.nome + " (" + u.perfil + ")";
        campoResponsavel.appendChild(opcao);
      }
    }
  } catch (erro) {
    mostrarErro(erroEdicao, "ERRO! Não foi possível carregar a lista de responsáveis.");
  }
}

// botao editar abre o formulario preenchido
editarDemanda.addEventListener("click", async function () { // FLUXO:EDITAR-ABRIR 2/5 evento click
  limparErro(erroEdicao);

  await carregarResponsaveis();

  campoTitulo.value = demandaAtual.titulo;
  campoDescricao.value = demandaAtual.descricao;
  campoClassificacao.value = demandaAtual.tipo;
  campoPrioridade.value = demandaAtual.prioridade;
  campoResponsavel.value = demandaAtual.responsavelId ? String(demandaAtual.responsavelId) : "";
  campoPrazo.value = demandaAtual.prazoFinalizacao || "";

  campoFormEdicao.classList.remove("oculto");
});

// botao cancelar fecha o formulario
cancelarEdicao.addEventListener("click", function () {
  campoFormEdicao.classList.add("oculto");
  limparErro(erroEdicao);
});

// envio do formulario de edicao
formEdicao.addEventListener("submit", async function (event) { // FLUXO:SALVAR-ALTERACOES 2/6 evento submit
  event.preventDefault();
  limparErro(erroEdicao);

  const titulo = campoTitulo.value.trim();
  const descricao = campoDescricao.value.trim();
  const classificacao = campoClassificacao.value;
  const prioridade = campoPrioridade.value;
  const responsavel = campoResponsavel.value;
  const prazo = campoPrazo.value || null;

  // validacoes dos campos
  if (titulo === "") {
    mostrarErro(erroEdicao, "ERRO! O título não pode ficar vazio.");
    return;
  }

  if (descricao === "") {
    mostrarErro(erroEdicao, "ERRO! A descrição não pode ficar vazia.");
    return;
  }

  if (prazo && prazo !== demandaAtual.prazoFinalizacao && prazo < obterDataDeHoje()) {
    mostrarErro(erroEdicao, "ERRO! O novo prazo não pode ser anterior à data atual.");
    return;
  }

  // bloqueia salvar sem nenhuma alteracao
  const responsavelAtual = demandaAtual.responsavelId ? String(demandaAtual.responsavelId) : "";

  if (
    titulo === demandaAtual.titulo &&
    descricao === demandaAtual.descricao &&
    classificacao === demandaAtual.tipo &&
    prioridade === demandaAtual.prioridade &&
    responsavel === responsavelAtual &&
    prazo === demandaAtual.prazoFinalizacao
  ) {
    mostrarErro(erroEdicao, "ERRO! Altere pelo menos um campo antes de salvar.");
    return;
  }

  salvarEdicao.disabled = true;

  try {
    const resposta = await apiFetch(URL_API + "/demandas/" + idDemanda, { // FLUXO:SALVAR-ALTERACOES 3/6 PUT /api/demandas/:id
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titulo: titulo,
        descricao: descricao,
        tipo: classificacao,
        prioridade: prioridade,
        responsavelId: responsavel === "" ? null : Number(responsavel),
        prazoFinalizacao: prazo
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarErro(erroEdicao, "ERRO! " + (dados.mensagem || "Erro ao salvar alterações."));
      return;
    }

    mostrarDemandaNaTela(dados.demanda);
    campoFormEdicao.classList.add("oculto");
    mostrarSucesso(dados.mensagem);

    await carregarHistorico();
  } catch (erro) {
    mostrarErro(erroEdicao, "ERRO! Falha ao conectar com o servidor.");
  } finally {
    salvarEdicao.disabled = false;
  }
});

// carrega a demanda ao abrir a pagina
iniciarTela();
