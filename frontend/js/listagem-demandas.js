/*
  Autor: Leonardo Gambaroni Alves
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Inicio da Implementação do backend da tela de listagem de demandas.
*/

document.addEventListener("DOMContentLoaded", () => {
  const campoBusca = document.getElementById("busca");
  const mensagemErroBusca = document.getElementById("buscaErro");
  const campoStatus = document.getElementById("filtro-status");
  const tabela = document.querySelector(".tabela-demandas");
  const corpoTabela = tabela.querySelector("tbody");

  // Guarda as linhas originais da tabela para poder filtrar sem perder dados
  const linhasOriginais = Array.from(corpoTabela.querySelectorAll("tr"));

  // Valores de status aceitos pelo sistema (mesmos do <select>)
  const STATUS_VALIDOS = ["", "aberta", "andamento", "revisao", "concluida"];

  const TAMANHO_MAXIMO_BUSCA = 100;

  
    //Converte o texto exibido no badge de status para a mesma "key" usada nas <option> do filtro 
   
  function normalizarStatus(textoStatus) {
    const texto = textoStatus.trim().toLowerCase();

    if (texto === "aberta") return "aberta";
    if (texto === "em andamento") return "andamento";
    if (texto === "em revisão" || texto === "em revisao") return "revisao";
    if (texto === "concluída" || texto === "concluida") return "concluida";

    return texto;
  }

  
    //Valida o texto digitado no campo de busca. 
    //Regra: não pode ultrapassar o tamanho máximo definido, evitando entradas de busca absurdamente longas.
   
  function validarBusca(valor) {
    if (valor.length > TAMANHO_MAXIMO_BUSCA) {
      return {
        valido: false,
        mensagem: `A busca deve ter no máximo ${TAMANHO_MAXIMO_BUSCA} caracteres.`,
      };
    }
    return { valido: true };
  }

  
    //Valida o status selecionado, garantindo que apenas um dos valores previstos no escopo do sistema seja utilizado no filtro.
   
  function validarStatus(valor) {
    return STATUS_VALIDOS.includes(valor);
  }

  
   //Mostra ou esconde a mensagem de erro do campo de busca.
   
  function exibirErroBusca(mensagem) {
    if (mensagem) {
      mensagemErroBusca.textContent = mensagem;
      mensagemErroBusca.style.display = "block";
      campoBusca.setAttribute("aria-invalid", "true");
    } else {
      mensagemErroBusca.textContent = "";
      mensagemErroBusca.style.display = "none";
      campoBusca.removeAttribute("aria-invalid");
    }
  }

  
    //Remove a linha de "nenhum resultado" caso já exista na tabela.
   
  function removerLinhaVazia() {
    const linhaVazia = corpoTabela.querySelector("[data-linha-vazia]");
    if (linhaVazia) linhaVazia.remove();
  }

  
   //Adiciona uma linha informando que não há demandas para os filtros aplicados, apenas se todas as linhas estiverem escondidas.
   
  function exibirMensagemSemResultados() {
    removerLinhaVazia();

    const linha = document.createElement("tr");
    linha.setAttribute("data-linha-vazia", "true");
    linha.innerHTML = `<td colspan="8" style="text-align:center;">Nenhuma demanda encontrada para os filtros aplicados.</td>`;
    corpoTabela.appendChild(linha);
  }

  
   //Aplica os filtros de busca (por título) e status nas linhas da tabela, mostrando apenas as que atendem aos critérios.
   
  function filtrarTabela() {
    const valorBuscaBruto = campoBusca.value;
    const resultadoBusca = validarBusca(valorBuscaBruto);

    if (!resultadoBusca.valido) {
      exibirErroBusca(resultadoBusca.mensagem);
      return; // não filtra enquanto o campo estiver inválido
    }
    exibirErroBusca(null);

    const termoBusca = valorBuscaBruto.trim().toLowerCase();

    const statusSelecionado = campoStatus.value;
    if (!validarStatus(statusSelecionado)) {
      // Situação defensiva: só ocorreria com manipulação indevida do <select>
      campoStatus.value = "";
    }

    removerLinhaVazia();

    let algumaLinhaVisivel = false;

    linhasOriginais.forEach((linha) => {
      const titulo = linha.children[0].textContent.trim().toLowerCase();
      const statusTexto = linha.children[3].textContent;
      const statusLinha = normalizarStatus(statusTexto);

      const atendeBusca = !termoBusca || titulo.includes(termoBusca);
      const atendeStatus = !statusSelecionado || statusLinha === statusSelecionado;
      const visivel = atendeBusca && atendeStatus;

      linha.style.display = visivel ? "" : "none";
      if (visivel) algumaLinhaVisivel = true;
    });

    if (!algumaLinhaVisivel) {
      exibirMensagemSemResultados();
    }
  }

  campoBusca.addEventListener("input", filtrarTabela);
  campoStatus.addEventListener("change", filtrarTabela);

  // Aplica o filtro uma vez ao carregar (garante estado inicial consistente)
  filtrarTabela();
});