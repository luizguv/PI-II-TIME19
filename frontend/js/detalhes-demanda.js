/*
  Autor: João Pedro Silveira de Souza
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: JavaScript da tela de Detalhes de Demanda
*/

const formComentario = document.getElementById("formComentarios");

const contador = document.getElementById("contador");

const comentario = document.getElementById("comentario");

const erroComentario = document.getElementById("erroComentario");

const editarDemanda = document.getElementById("editarDemanda");

const formEdicao = document.getElementById("formEditarDemanda");

const campoFormEdicao = document.getElementById(
  "secao-formulario-edicao-demanda"
);

const campoClassificacao = document.getElementById("classificacao");

const campoPrioridade = document.getElementById("prioridade");

const campoStatus = document.getElementById("status");

const campoPrazo = document.getElementById("prazoEdicao");

const valorClassificacao = document.getElementById("valorClassificacao");

const valorPrioridade = document.getElementById("valorPrioridade");

const valorStatus = document.getElementById("valorStatus");

const valorPrazo = document.getElementById("valorPrazo");

const cancelarEdicao = document.getElementById("cancelarEdicao");

const erroEdicao = document.getElementById("erroEdicao");


comentario.addEventListener("input", function somarCaractere() {

  let tamanho = comentario.value.length;

  contador.innerText = tamanho + "/300";

});


formComentario.addEventListener("submit", function validador(event) {

  event.preventDefault();

  erroComentario.innerText = "";

  erroComentario.classList.add("oculto");

  let coment = comentario.value.trim();

  let tamanho = comentario.value.length;

  if (coment === "") {

    erroComentario.innerText =
      "ERRO! Digite um comentário antes de enviar.";

    erroComentario.classList.remove("oculto");

  }

  if (tamanho > 300) {

    erroComentario.innerText =
      "ERRO! O comentário não pode ter mais que 300 caracteres.";

    erroComentario.classList.remove("oculto");

  }

});


editarDemanda.addEventListener("click", function () {

  campoFormEdicao.classList.remove("oculto");

});


cancelarEdicao.addEventListener("click", function () {

  campoFormEdicao.classList.add("oculto");

  erroEdicao.innerText = "";

  erroEdicao.classList.add("oculto");

});


formEdicao.addEventListener("submit", function (event) {

  event.preventDefault();

  erroEdicao.innerText = "";

  erroEdicao.classList.add("oculto");

  const classificacao = campoClassificacao.value;

  const prioridade = campoPrioridade.value;

  const status = campoStatus.value;

  const prazo = campoPrazo.value;


  const classificacaoAtual = valorClassificacao.innerText;

  const prioridadeAtual = valorPrioridade.innerText;

  const statusAtual = valorStatus.innerText;


  const hoje = new Date();

  const anoAtual = hoje.getFullYear();

  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");

  const diaAtual = String(hoje.getDate()).padStart(2, "0");

  const dataAtual = anoAtual + "-" + mesAtual + "-" + diaAtual;


  if (classificacao === classificacaoAtual) {

    erroEdicao.innerText =
      "ERRO! A nova classificação deve ser diferente da classificação atual.";

    erroEdicao.classList.remove("oculto");

    return;

  }


  if (prioridade === prioridadeAtual) {

    erroEdicao.innerText =
      "ERRO! A nova prioridade deve ser diferente da prioridade atual.";

    erroEdicao.classList.remove("oculto");

    return;

  }


  if (status === statusAtual) {

    erroEdicao.innerText =
      "ERRO! O novo status deve ser diferente do status atual.";

    erroEdicao.classList.remove("oculto");

    return;

  }


  if (prazo === "") {

    erroEdicao.innerText =
      "ERRO! Escolha um prazo para a demanda.";

    erroEdicao.classList.remove("oculto");

    return;

  }


  if (prazo === dataAtual) {

    erroEdicao.innerText =
      "ERRO! O novo prazo não pode ser igual à data atual.";

    erroEdicao.classList.remove("oculto");

    return;

  }


  const dataPrazo = new Date(prazo + "T00:00:00");


  valorClassificacao.innerText = classificacao;

  valorPrioridade.innerText = prioridade;

  valorStatus.innerText = status;

  valorPrazo.innerText = dataPrazo.toLocaleDateString("pt-BR");


  campoFormEdicao.classList.add("oculto");

});