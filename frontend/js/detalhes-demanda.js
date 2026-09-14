/*
  Autor: João Pedro Silveira de Souza
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: JavaScript da tela de Detalhes de Demanda
*/
const formComentario = document.getElementById("formComentarios");
const contador = document.getElementById("contador");
const comentario = document.getElementById("comentario");
const erroComentario = document.getElementById("erroComentario");



comentario.addEventListener("input", function somarCaractere(){
  let tamanho = comentario.value.length;
  contador.innerText = tamanho + "/300";
});

formComentario.addEventListener("submit", function validador(event){
  event.preventDefault();
  erroComentario.innerText = "";
  erroComentario.classList.add("oculto");

  let coment = comentario.value.trim();
  let tamanho = comentario.value.length;

  if (coment === ""){
    erroComentario.innerText = "ERRO! Digite um comentário antes de enviar.";
    erroComentario.classList.remove("oculto");
  }
  if (tamanho > 300){
    erroComentario.innerText = "ERRO! O comentário não pode ter mais que 300 caracteres.";
    erroComentario.classList.remove("oculto");
  }
});

