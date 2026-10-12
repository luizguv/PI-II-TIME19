
/*
  Autor: Vinicius Zorzetto
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Validação da tela de Cadastro e Edição de Demandas.
*/

const demandForm = document.getElementById("demandForm");
const pageTitle = document.getElementById("pageTitle");
const submitText = document.getElementById("submitText");
const statusGroup = document.getElementById("statusGroup");
const status = document.getElementById("status");
const formMessage = document.getElementById("formMessage");
const deadline = document.getElementById("deadline");
const holidayMessage = document.getElementById("holidayMessage");

const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const typeInput = document.getElementById("type");
const priorityInput = document.getElementById("priority");
const projectInput = document.getElementById("project");
const responsibleInput = document.getElementById("responsible");

const params = new URLSearchParams(window.location.search);
const demandId = params.get("id");
const isEditing = Boolean(demandId);

const allowedTypes = [
    "Tarefa",
    "Defeito",
    "Melhoria",
    "Documentação"
];

const allowedPriorities = [
    "Crítica",
    "Alta",
    "Média",
    "Baixa"
];

const allowedProjects = [
    "Projeto A",
    "Projeto B",
    "Projeto C"
];

const allowedResponsibilities = [
    "Usuário 1",
    "Usuário 2",
    "Usuário 3"
];

const allowedStatuses = [
    "Aberta",
    "Em andamento",
    "Em revisão",
    "Concluída",
    "Cancelada"
];

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

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message active ${type}`;
}

function clearMessage() {
    formMessage.textContent = "";
    formMessage.className = "form-message";
}

function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00`);

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function focusField(field, message) {
    showMessage(message, "error");
    field.focus();
}

demandForm.addEventListener("submit", function (event) {
    event.preventDefault();

    clearMessage();
    holidayMessage.textContent = "";

    const titulo = titleInput.value.trim();
    const descricao = descriptionInput.value.trim();
    const tipo = typeInput.value;
    const prioridade = priorityInput.value;
    const projeto = projectInput.value;
    const responsavel = responsibleInput.value;
    const prazo = deadline.value;

    if (
        !titulo ||
        !descricao ||
        !tipo ||
        !prioridade ||
        !projeto ||
        !prazo
    ) {
        showMessage("Preencha todos os campos obrigatórios.", "error");
        return;
    }

    if (titulo.length < 3 || titulo.length > 150) {
        focusField(
            titleInput,
            "O título deve ter entre 3 e 150 caracteres."
        );
        return;
    }

    if (descricao.length < 10 || descricao.length > 2000) {
        focusField(
            descriptionInput,
            "A descrição deve ter entre 10 e 2000 caracteres."
        );
        return;
    }

    if (!allowedTypes.includes(tipo)) {
        focusField(typeInput, "Selecione um tipo de demanda válido.");
        return;
    }

    if (!allowedPriorities.includes(prioridade)) {
        focusField(priorityInput, "Selecione uma prioridade válida.");
        return;
    }

    if (!allowedProjects.includes(projeto)) {
        focusField(projectInput, "Selecione um projeto válido.");
        return;
    }

    if (
        responsavel &&
        !allowedResponsibilities.includes(responsavel)
    ) {
        focusField(responsibleInput, "Selecione um responsável válido.");
        return;
    }

    if (isEditing && !allowedStatuses.includes(status.value)) {
        focusField(status, "Selecione um status válido.");
        return;
    }

    if (!isValidDate(prazo)) {
        focusField(deadline, "Informe uma data de prazo válida.");
        return;
    }

    const selectedDate = new Date(`${prazo}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        focusField(deadline, "O prazo não pode ser uma data passada.");
        return;
    }

    const demand = {
        titulo: titulo,
        descricao: descricao,
        tipo: tipo,
        prioridade: prioridade,
        projeto: projeto,
        responsavel: responsavel || null,
        status: isEditing ? status.value : "Aberta",
        prazoFinalizacao: prazo
    };

    console.log(
        isEditing ? "Atualização da demanda:" : "Cadastro da demanda:",
        demand
    );

    showMessage(
        isEditing
            ? "Validações concluídas. A integração com a API ainda será realizada."
            : "Validações concluídas. A integração com a API ainda será realizada.",
        "success"
    );
});

demandForm.addEventListener("input", clearMessage);
demandForm.addEventListener("change", clearMessage);

deadline.addEventListener("change", function () {
    holidayMessage.textContent = "";
});
