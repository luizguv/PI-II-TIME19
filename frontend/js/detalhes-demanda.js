/*
  Autor: João Pedro Silveira de Souza
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: JavaScript da tela de Detalhes de Demanda (validações + integração com a API)
*/

const URL_API = "http://localhost:3000/api";

// Pega o id da demanda na URL (ex: detalhes-demanda.html?id=1). Se não tiver, usa "1" para facilitar testes.
const parametrosUrl = new URLSearchParams(window.location.search);
const idDemanda = parametrosUrl.get("id") || "1";

// Sem localStorage: usa o usuarioId da URL (se os colegas enviarem) ou 1 (Administrador) por padrão.
const idUsuarioLogado = parametrosUrl.get("usuarioId") || "1";

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

// Guarda os dados atuais da demanda carregada
let demandaAtual = null;

function mostrarErro(elemento, texto) {
  elemento.innerText = texto;
  elemento.classList.remove("oculto");
}

function limparErro(elemento) {
  elemento.innerText = "";
  elemento.classList.add("oculto");
}

function mostrarSucesso(texto) {
  mensagemSucesso.innerText = texto;
  mensagemSucesso.classList.remove("oculto");

  setTimeout(function () {
    mensagemSucesso.classList.add("oculto");
  }, 4000);
}

// Converte "AAAA-MM-DD" para "DD/MM/AAAA"
function formatarData(iso) {
  if (!iso) {
    return "Sem prazo";
  }
  const partes = iso.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// Converte "AAAA-MM-DDTHH:MM:SS" para "DD/MM/AAAA HH:MM"
function formatarDataHora(iso) {
  if (!iso) {
    return "-";
  }
  const partes = iso.split("T");
  const data = formatarData(partes[0]);
  const hora = partes[1] ? partes[1].slice(0, 5) : "";
  return data + " " + hora;
}

// Retorna a data de hoje no formato "AAAA-MM-DD"
function obterDataDeHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return ano + "-" + mes + "-" + dia;
}

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

  // Mostra ou esconde o botão de editar conforme a permissão retornada pela API
  if (demanda.permissoes && demanda.permissoes.podeEditar) {
    editarDemanda.classList.remove("oculto");
  } else {
    editarDemanda.classList.add("oculto");
    campoFormEdicao.classList.add("oculto");
  }

  // Preenche o select de mudança de status
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

async function carregarComentarios() {
  try {
    const resposta = await fetch(URL_API + "/demandas/" + idDemanda + "/comentarios", {
      headers: { "X-Usuario-Id": idUsuarioLogado }
    });
    const dados = await resposta.json();

    listaComentarios.innerHTML = "";

    if (!resposta.ok) {
      const pErro = document.createElement("p");
      pErro.innerText = dados.mensagem || "Erro ao carregar comentários.";
      listaComentarios.appendChild(pErro);
      return;
    }

    if (dados.comentarios.length === 0) {
      const pVazio = document.createElement("p");
      pVazio.innerText = "Nenhum comentário ainda.";
      listaComentarios.appendChild(pVazio);
      return;
    }

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

async function carregarHistorico() {
  try {
    const resposta = await fetch(URL_API + "/demandas/" + idDemanda + "/historico", {
      headers: { "X-Usuario-Id": idUsuarioLogado }
    });
    const dados = await resposta.json();

    listaHistorico.innerHTML = "";

    if (resposta.ok && dados.historico) {
      for (let i = 0; i < dados.historico.length; i++) {
        const h = dados.historico[i];
        const p = document.createElement("p");
        p.innerText = formatarDataHora(h.dataAlteracao) + " - " + h.descricao;
        listaHistorico.appendChild(p);
      }
    }

    if (demandaAtual) {
      const pCriacao = document.createElement("p");
      pCriacao.innerText = formatarDataHora(demandaAtual.dataCriacao) + " - Demanda criada.";
      listaHistorico.appendChild(pCriacao);
    }
  } catch (erro) {
    listaHistorico.innerHTML = "<p>Não foi possível carregar o histórico.</p>";
  }
}

async function iniciarTela() {
  limparErro(erroGeral);

  try {
    const resposta = await fetch(URL_API + "/demandas/" + idDemanda, {
      headers: { "X-Usuario-Id": idUsuarioLogado }
    });
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

comentario.addEventListener("input", function somarCaractere() {
  const tamanho = comentario.value.length;
  contador.innerText = tamanho + "/300";
});

formComentario.addEventListener("submit", async function validador(event) {
  event.preventDefault();
  limparErro(erroComentario);

  const texto = comentario.value.trim();
  const tamanho = comentario.value.length;

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
    const resposta = await fetch(URL_API + "/demandas/" + idDemanda + "/comentarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Usuario-Id": idUsuarioLogado
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

botaoAtualizarStatus.addEventListener("click", async function () {
  limparErro(erroStatus);

  const novoStatus = campoNovoStatus.value;

  if (novoStatus === "") {
    mostrarErro(erroStatus, "ERRO! Escolha o novo status.");
    return;
  }

  if (novoStatus === "Cancelada") {
    const confirmou = confirm("Deseja realmente cancelar esta demanda?");
    if (!confirmou) {
      return;
    }
  }

  botaoAtualizarStatus.disabled = true;

  try {
    const resposta = await fetch(URL_API + "/demandas/" + idDemanda + "/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Usuario-Id": idUsuarioLogado
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

async function carregarResponsaveis() {
  try {
    const resposta = await fetch(URL_API + "/demandas/" + idDemanda + "/responsaveis", {
      headers: { "X-Usuario-Id": idUsuarioLogado }
    });
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

editarDemanda.addEventListener("click", async function () {
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

  if (titulo === "") {
    mostrarErro(erroEdicao, "ERRO! O título não pode ficar vazio.");
    return;
  }

  if (descricao === "") {
    mostrarErro(erroEdicao, "ERRO! A descrição não pode ficar vazia.");
    return;
  }

  if (prazo === "") {
    mostrarErro(erroEdicao, "ERRO! Escolha um prazo para a demanda.");
    return;
  }

  if (prazo !== demandaAtual.prazoFinalizacao && prazo <= obterDataDeHoje()) {
    mostrarErro(erroEdicao, "ERRO! O novo prazo deve ser maior que a data atual.");
    return;
  }

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
    const resposta = await fetch(URL_API + "/demandas/" + idDemanda, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Usuario-Id": idUsuarioLogado
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

// Inicializa a página carregando a demanda
iniciarTela();