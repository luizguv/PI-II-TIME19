/*
  Autor: Luiz Gustavo Urias Vieira
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Tela de Edição de Demandas (Corrigido)
*/

const demandForm = document.getElementById("demandForm");
const pageTitle = document.getElementById("pageTitle");
const submitText = document.getElementById("submitText");
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
let prazoOriginal = "";

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

// Corrigido para validar os IDs numéricos em formato String do HTML de Edição
const allowedProjectIds = ["1", "2", "3"];
const allowedResponsibleIds = ["1", "2", "3", "4", "5"];

const allowedStatuses = [
    "Aberta",
    "Em andamento",
    "Em revisão",
    "Concluída",
    "Cancelada"
];

pageTitle.textContent = "Editar demanda";
submitText.textContent = "Salvar alterações";
document.title = "Gestão de Demandas | Editar Demanda";

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

async function carregarDemanda() {
    try {
        const response = await fetch(
            `http://localhost:3000/api/demandas/${demandId}`
        );

        const data = await response.json();

        if (!response.ok) {
            showMessage(
                data.mensagem || "Não foi possível carregar a demanda.",
                "error"
            );
            return;
        }

        titleInput.value = data.titulo || "";
        descriptionInput.value = data.descricao || "";
        typeInput.value = data.tipo || "";
        priorityInput.value = data.prioridade || "";
        projectInput.value = String(data.projetoId ?? "");
        responsibleInput.value = data.responsavelId
            ? String(data.responsavelId)
            : "";
        status.value = data.status || "Aberta";
        deadline.value = data.prazoFinalizacao
            ? data.prazoFinalizacao.slice(0, 10)
            : "";

        prazoOriginal = deadline.value;

    } catch (error) {
        console.error("Erro ao carregar demanda:", error);
        showMessage("Não foi possível conectar ao servidor.", "error");
    }
}

const cancelLink = document.getElementById("cancelarLink");
if (demandId && cancelLink) {
    cancelLink.href = `detalhes-demanda.html?id=${demandId}`;
}

if (!demandId || isNaN(Number(demandId))) {
    showMessage("ID da demanda inválido.", "error");
} else {
    carregarDemanda();
}

demandForm.addEventListener("submit", async function (event) {
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

    if (!titulo || !descricao || !tipo || !prioridade || !projeto || !prazo) {
        showMessage("Preencha todos os campos obrigatórios.", "error");
        return;
    }

    if (titulo.length < 3 || titulo.length > 150) {
        focusField(titleInput, "O título deve ter entre 3 e 150 caracteres.");
        return;
    }

    if (descricao.length < 10 || descricao.length > 2000) {
        focusField(descriptionInput, "A descrição deve ter entre 10 e 2000 caracteres.");
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

    if (!allowedProjectIds.includes(projeto)) {
        focusField(projectInput, "Selecione um projeto válido.");
        return;
    }

    if (responsavel && !allowedResponsibleIds.includes(responsavel)) {
        focusField(responsibleInput, "Selecione um responsável válido.");
        return;
    }

    if (!allowedStatuses.includes(status.value)) {
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

    if (prazo !== prazoOriginal && selectedDate < today) {
        focusField(deadline, "O prazo não pode ser uma data passada.");
        return;
    }

    const demand = {
        titulo: titulo,
        descricao: descricao,
        tipo: tipo,
        prioridade: prioridade,
        projetoId: Number(projeto),
        responsavelId: responsavel ? Number(responsavel) : null,
        status: status.value,
        prazoFinalizacao: prazo
    };

    try {
        const response = await fetch(
            `http://localhost:3000/api/demandas/${demandId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(demand)
            }
        );

        let data;
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            showMessage(
                data.mensagem || "Não foi possível atualizar a demanda.",
                "error"
            );
            return;
        }

        showMessage("Demanda atualizada com sucesso.", "success");

    } catch (error) {
        console.error("Erro ao atualizar demanda:", error);
        showMessage("Não foi possível conectar ao servidor.", "error");
    }
});

demandForm.addEventListener("input", clearMessage);
demandForm.addEventListener("change", clearMessage);

deadline.addEventListener("change", function () {
    holidayMessage.textContent = "";
});
