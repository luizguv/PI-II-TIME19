
/*
  Autor: Luiz Gustavo Urias Vieira
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Controller de Edição de Demanda
*/

import { Request, Response } from "express";
import { demandas, projetos, usuarios } from "../data/dados";

export function atualizarDemanda(req: Request, res: Response) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            mensagem: "O id da demanda deve ser um número."
        });
    }

    const demanda = demandas.find((d) => d.id === id);

    if (!demanda) {
        return res.status(404).json({
            mensagem: "Demanda não encontrada."
        });
    }

    const body = req.body || {};
    const titulo = body.titulo;
    const descricao = body.descricao;
    const tipo = body.tipo;
    const prioridade = body.prioridade;
    const projetoId = Number(body.projetoId);
    const responsavelId = body.responsavelId
        ? Number(body.responsavelId)
        : undefined;
    const status = body.status;
    const prazoFinalizacao = body.prazoFinalizacao;

    if (
        typeof titulo !== "string" ||
        typeof descricao !== "string" ||
        !tipo ||
        !prioridade ||
        !body.projetoId ||
        !status ||
        !prazoFinalizacao
    ) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos obrigatórios."
        });
    }

    if (titulo.trim().length < 3 || titulo.trim().length > 150) {
        return res.status(400).json({
            mensagem: "O título deve ter entre 3 e 150 caracteres."
        });
    }

    if (descricao.trim().length < 10 || descricao.trim().length > 2000) {
        return res.status(400).json({
            mensagem: "A descrição deve ter entre 10 e 2000 caracteres."
        });
    }

    const tiposPermitidos = [
        "Tarefa",
        "Defeito",
        "Melhoria",
        "Documentação"
    ];

    const prioridadesPermitidas = [
        "Crítica",
        "Alta",
        "Média",
        "Baixa"
    ];

    const statusPermitidos = [
        "Aberta",
        "Em andamento",
        "Em revisão",
        "Concluída",
        "Cancelada"
    ];

    if (!tiposPermitidos.includes(tipo)) {
        return res.status(400).json({
            mensagem: "Tipo de demanda inválido."
        });
    }

    if (!prioridadesPermitidas.includes(prioridade)) {
        return res.status(400).json({
            mensagem: "Prioridade inválida."
        });
    }

    if (!Number.isInteger(projetoId)) {
        return res.status(400).json({
            mensagem: "Projeto inválido."
        });
    }

    const projeto = projetos.find((p) => p.id === projetoId);

    if (!projeto) {
        return res.status(400).json({
            mensagem: "Projeto inválido."
        });
    }

    if (responsavelId !== undefined) {
        if (!Number.isInteger(responsavelId)) {
            return res.status(400).json({
                mensagem: "Responsável inválido."
            });
        }

        const responsavel = usuarios.find((u) => u.id === responsavelId);

        if (!responsavel) {
            return res.status(400).json({
                mensagem: "Responsável inválido."
            });
        }
    }

    if (!statusPermitidos.includes(status)) {
        return res.status(400).json({
            mensagem: "Status inválido."
        });
    }

    if (
        typeof prazoFinalizacao !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(prazoFinalizacao)
    ) {
        return res.status(400).json({
            mensagem: "Informe uma data de prazo válida."
        });
    }

    const dataPrazo = new Date(`${prazoFinalizacao}T00:00:00`);

    if (
        isNaN(dataPrazo.getTime()) ||
        dataPrazo.toISOString().slice(0, 10) !== prazoFinalizacao
    ) {
        return res.status(400).json({
            mensagem: "Informe uma data de prazo válida."
        });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const prazoOriginal = demanda.prazoFinalizacao
        ? demanda.prazoFinalizacao.slice(0, 10)
        : "";

    if (prazoFinalizacao !== prazoOriginal && dataPrazo < hoje) {
        return res.status(400).json({
            mensagem: "O prazo não pode ser uma data passada."
        });
    }

    demanda.titulo = titulo.trim();
    demanda.descricao = descricao.trim();
    demanda.tipo = tipo;
    demanda.prioridade = prioridade;
    demanda.projetoId = projetoId;
    demanda.responsavelId = responsavelId;
    demanda.status = status;
    demanda.prazoFinalizacao = prazoFinalizacao;
    demanda.dataUltimaAtualizacao = new Date().toISOString();

    return res.status(200).json({
        mensagem: "Demanda atualizada com sucesso."
    });
}