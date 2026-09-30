/*
  Autor: Leonardo Gambaroni Alves
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Implementação do backend e validações da tela de listagem de demandas.
*/

document.addEventListener("DOMContentLoaded", () => {
  const campoBusca = document.getElementById("busca");
  const mensagemErroBusca = document.getElementById("buscaErro");
  const listaSugestoes = document.getElementById("sugestoes-demandas");
  const campoStatus = document.getElementById("filtro-status");
  const tabela = document.querySelector(".tabela-demandas");
  const corpoTabela = tabela.querySelector("tbody");

  // Guarda as linhas originais da tabela para poder filtrar sem perder dados
  const linhasOriginais = Array.from(corpoTabela.querySelectorAll("tr"));

  // Extrai todos os títulos possíveis das linhas da tabela para usar como sugestões
  const titulosDisponiveis = linhasOriginais.map(linha => linha.children[0].textContent.trim());

  // Valores de status aceitos pelo sistema
  const STATUS_VALIDOS = ["", "aberta", "andamento", "revisao", "concluida"];
  const TAMANHO_MAXIMO_BUSCA = 100;

  function normalizarStatus(textoStatus) {
    const texto = textoStatus.trim().toLowerCase();
    if (texto === "aberta") return "aberta";
    if (texto === "em andamento") return "andamento";
    if (texto === "em revisão" || texto === "em revisao") return "revisao";
    if (texto === "concluída" || texto === "concluida") return "concluida";
    return texto;
  }

  function validarBusca(valor) {
    if (valor.length > TAMANHO_MAXIMO_BUSCA) {
      return {
        valido: false,
        mensagem: `A busca deve ter no máximo ${TAMANHO_MAXIMO_BUSCA} caracteres.`,
      };
    }
    return { valido: true };
  }

  function validarStatus(valor) {
    return STATUS_VALIDOS.includes(valor);
  }

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

  function removerLinhaVazia() {
    const linhaVazia = corpoTabela.querySelector("[data-linha-vazia]");
    if (linhaVazia) linhaVazia.remove();
  }

  function exibirMensagemSemResultados() {
    removerLinhaVazia();
    const linha = document.createElement("tr");
    linha.setAttribute("data-linha-vazia", "true");
    linha.innerHTML = `<td colspan="8" style="text-align:center;">Nenhuma demanda encontrada para os filtros aplicados.</td>`;
    corpoTabela.appendChild(linha);
  }

  // Atualiza as opções do datalist baseado no que foi digitado (mínimo de 3 letras)
  function atualizarSugestoes(termo) {
    listaSugestoes.innerHTML = ""; // Limpa sugestões anteriores

    if (termo.length >= 3) {
      const sugestoesFiltradas = titulosDisponiveis.filter(titulo => 
        titulo.toLowerCase().includes(termo)
      );

      sugestoesFiltradas.forEach(titulo => {
        const option = document.createElement("option");
        option.value = titulo;
        listaSugestoes.appendChild(option);
      });
    }
  }

  function filtrarTabela() {
    const valorBuscaBruto = campoBusca.value;
    const resultadoBusca = validarBusca(valorBuscaBruto);

    if (!resultadoBusca.valido) {
      exibirErroBusca(resultadoBusca.mensagem);
      return;
    }
    exibirErroBusca(null); // Limpa qualquer erro anterior de tamanho máximo

    const termoBusca = valorBuscaBruto.trim().toLowerCase();

    // Atualiza o autocompletar conforme o utilizador digita
    atualizarSugestoes(termoBusca);

    const statusSelecionado = campoStatus.value;
    if (!validarStatus(statusSelecionado)) {
      campoStatus.value = "";
    }

    removerLinhaVazia();
    let algumaLinhaVisivel = false;

    linhasOriginais.forEach((linha) => {
      const titulo = linha.children[0].textContent.trim().toLowerCase();
      const statusTexto = linha.children[3].textContent;
      const statusLinha = normalizarStatus(statusTexto);

      // O filtro de texto só é aplicado de verdade se o utilizador digitar 3 ou mais letras
      const atendeBusca = termoBusca.length < 3 || titulo.includes(termoBusca);
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

  // Estado inicial
  filtrarTabela();
});