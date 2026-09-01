/*
  Autor: Vinicius Zorzetto
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Lógica da tela de Cadastro e Edição de Demandas
*/

const demandForm = document.getElementById("demandForm");
const pageTitle = document.getElementById("pageTitle");
const submitText = document.getElementById("submitText");
const statusGroup = document.getElementById("statusGroup");
const status = document.getElementById("status");
const formMessage = document.getElementById("formMessage");
const deadline = document.getElementById("deadline");
const holidayMessage = document.getElementById("holidayMessage");

const params = new URLSearchParams(window.location.search);

const demandId = params.get("id");

const isEditing = Boolean(demandId);


/* Configuração da tela */

if (isEditing) {

    pageTitle.textContent = "Editar demanda";

    submitText.textContent = "Salvar alterações";

    document.title = "Gestão de Demandas | Editar Demanda";

} else {

    pageTitle.textContent = "Nova demanda";

    submitText.textContent = "Cadastrar demanda";

    status.value = "Aberta";

    statusGroup.style.display = "none";

}


/* Validação do formulário */

demandForm.addEventListener("submit", function (event) {

    event.preventDefault();

    clearMessage();

    const formData = new FormData(demandForm);

    const demand = {

        titulo: formData.get("title"),
        descricao: formData.get("description"),
        tipo: formData.get("type"),
        prioridade: formData.get("priority"),
        projeto: formData.get("project"),
        responsavel: formData.get("responsible"),
        status: isEditing
            ? formData.get("status")
            : "Aberta",
        prazoFinalizacao: formData.get("deadline")

    };


    if (!demand.titulo ||
        !demand.descricao ||
        !demand.tipo ||
        !demand.prioridade ||
        !demand.projeto ||
        !demand.prazoFinalizacao) {

        showMessage(
            "Preencha todos os campos obrigatórios.",
            "error"
        );

        return;
    }


    if (!isEditing) {

        demand.status = "Aberta";

    }


    /*
      A integração com a API será realizada posteriormente.
      Neste ponto, os dados estão preparados para serem
      enviados ao backend.
    */

    console.log(
        isEditing
            ? "Atualização da demanda:"
            : "Cadastro da demanda:",
        demand
    );

    showMessage(
        isEditing
            ? "Alterações validadas. A integração com a API será realizada posteriormente."
            : "Demanda validada. A integração com a API será realizada posteriormente.",
        "success"
    );

});


/* Mensagens */

function showMessage(message, type) {

    formMessage.textContent = message;

    formMessage.className =
        `form-message active ${type}`;

}

function clearMessage() {

    formMessage.textContent = "";

    formMessage.className = "form-message";

}


/* Validação inicial do prazo */

deadline.addEventListener("change", function () {

    holidayMessage.textContent = "";

    /*
      A consulta de feriados deverá utilizar uma API externa
      quando o backend estiver integrado.

      O requisito do projeto determina que o prazo não possa
      ser cadastrado ou atualizado quando cair em feriado
      nacional.
    */

    console.log(
        "Data selecionada:",
        deadline.value
    );

});