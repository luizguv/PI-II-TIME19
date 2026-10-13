/**
 * Autor: João Pedro Silveira de Souza
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Controllers das rotas da tela de Detalhes de Demanda
 *
 * Rotas:
 *   GET  /demandas/:id              -> mostra os dados de uma demanda
 *   GET  /demandas/:id/comentarios  -> lista os comentários da demanda
 *   POST /demandas/:id/comentarios  -> cadastra um comentário (usuarioId e texto)
 */

import { Request, Response } from "express";
import { demandas, projetos, usuarios, comentarios } from "../data/dados";

export function getDemandaPorId(req: Request, res: Response) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ mensagem: "O id da demanda deve ser um número." });
    }

    const demanda = demandas.find((d) => d.id === id);

    if (!demanda) {
        return res.status(404).json({ mensagem: "Demanda não encontrada." });
    }

    const projeto = projetos.find((p) => p.id === demanda.projetoId);
    const responsavel = usuarios.find((u) => u.id === demanda.responsavelId);

    return res.status(200).json({
        id: demanda.id,
        titulo: demanda.titulo,
        descricao: demanda.descricao,
        tipo: demanda.tipo,
        prioridade: demanda.prioridade,
        status: demanda.status,
        projetoId: demanda.projetoId,
        projetoNome: projeto ? projeto.nome : null,
        responsavelId: demanda.responsavelId,
        responsavelNome: responsavel ? responsavel.nome : null,
        dataCriacao: demanda.dataCriacao,
        prazoFinalizacao: demanda.prazoFinalizacao,
        dataUltimaAtualizacao: demanda.dataUltimaAtualizacao
    });
}

export function listarComentarios(req: Request, res: Response) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ mensagem: "O id da demanda deve ser um número." });
    }

    const demanda = demandas.find((d) => d.id === id);

    if (!demanda) {
        return res.status(404).json({ mensagem: "Demanda não encontrada." });
    }

    const comentariosDaDemanda = comentarios.filter((c) => c.demandaId === id);

    const lista = [];

    for (const c of comentariosDaDemanda) {
        const usuario = usuarios.find((u) => u.id === c.usuarioId);

        lista.push({
            id: c.id,
            demandaId: c.demandaId,
            usuarioId: c.usuarioId,
            usuarioNome: usuario ? usuario.nome : null,
            texto: c.texto,
            dataCriacao: c.dataCriacao
        });
    }

    return res.status(200).json({
        demandaId: id,
        total: lista.length,
        comentarios: lista
    });
}

export function criarComentario(req: Request, res: Response) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ mensagem: "O id da demanda deve ser um número." });
    }

    const demanda = demandas.find((d) => d.id === id);

    if (!demanda) {
        return res.status(404).json({ mensagem: "Demanda não encontrada." });
    }

    const body = req.body || {};
    const texto = body.texto;
    const usuarioId = body.usuarioId;

    if (typeof texto !== "string" || texto.trim() === "") {
        return res.status(400).json({ mensagem: "O texto do comentário é obrigatório." });
    }

    if (texto.trim().length > 300) {
        return res.status(400).json({ mensagem: "O comentário não pode ter mais que 300 caracteres." });
    }

    if (!usuarioId) {
        return res.status(400).json({ mensagem: "O usuário (usuarioId) é obrigatório." });
    }

    const usuario = usuarios.find((u) => u.id === Number(usuarioId));

    if (!usuario) {
        return res.status(400).json({ mensagem: "O usuário informado não existe." });
    }

    const novoComentario = {
        id: comentarios.length + 1,
        demandaId: id,
        usuarioId: usuario.id,
        texto: texto.trim(),
        dataCriacao: new Date().toISOString()
    };

    comentarios.push(novoComentario);

    return res.status(201).json({
        id: novoComentario.id,
        demandaId: novoComentario.demandaId,
        usuarioId: novoComentario.usuarioId,
        usuarioNome: usuario.nome,
        texto: novoComentario.texto,
        dataCriacao: novoComentario.dataCriacao
    });
}