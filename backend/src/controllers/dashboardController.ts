/**
 * Autor: Caio Peccinato
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Controller da rota GET /dashboard
 *
 * Critérios adotados:
 *   "Em aberto": status diferente de "Concluída" e "Cancelada"
 *   "Críticas em aberto": prioridade "Crítica" e em aberto
 *   "Próximas do prazo": prazo de finalização nos próximos 7 dias e em aberto
 */

import { Request, Response } from "express";
import { demandas, StatusDemanda, PrioridadeDemanda, TipoDemanda } from "../data/dados";

const DIAS_PROXIMO_PRAZO = 7;

const STATUS_VALIDOS: StatusDemanda[] = ["Aberta", "Em andamento", "Em revisão", "Concluída", "Cancelada"];
const PRIORIDADES_VALIDAS: PrioridadeDemanda[] = ["Crítica", "Alta", "Média", "Baixa"];
const TIPOS_VALIDOS: TipoDemanda[] = ["Tarefa", "Defeito", "Melhoria", "Documentação"];

export function getDashboard(req: Request, res: Response) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const prazoLimite = new Date(hoje);
    prazoLimite.setDate(prazoLimite.getDate() + DIAS_PROXIMO_PRAZO);

    const porStatus = STATUS_VALIDOS.reduce((acc, status) => {
        acc[status] = demandas.filter((d) => d.status === status).length;
        return acc;
    }, {} as Record<StatusDemanda, number>);

    const porPrioridade = PRIORIDADES_VALIDAS.reduce((acc, prioridade) => {
        acc[prioridade] = demandas.filter((d) => d.prioridade === prioridade).length;
        return acc;
    }, {} as Record<PrioridadeDemanda, number>);

    const porTipo = TIPOS_VALIDOS.reduce((acc, tipo) => {
        acc[tipo] = demandas.filter((d) => d.tipo === tipo).length;
        return acc;
    }, {} as Record<TipoDemanda, number>);

    const emAberto = demandas.filter(
        (d) => d.status !== "Concluída" && d.status !== "Cancelada"
    );

    const criticasEmAberto = emAberto
        .filter((d) => d.prioridade === "Crítica")
        .map(({ id, titulo, status, prioridade, tipo, prazoFinalizacao }) => ({
            id, titulo, status, prioridade, tipo,
            prazoFinalizacao: prazoFinalizacao ?? null,
        }));

    const proximasDoProazo = emAberto
        .filter((d) => {
            if (!d.prazoFinalizacao) return false;
            const prazo = new Date(d.prazoFinalizacao);
            prazo.setHours(0, 0, 0, 0);
            return prazo >= hoje && prazo <= prazoLimite;
        })
        .map(({ id, titulo, status, prioridade, tipo, prazoFinalizacao }) => ({
            id, titulo, status, prioridade, tipo, prazoFinalizacao,
        }));

    return res.status(200).json({
        totalDemandas: demandas.length,
        porStatus,
        porPrioridade,
        porTipo,
        criticasEmAberto,
        proximasDoProazo,
        criterios: {
            emAberto: 'Status diferente de "Concluída" e "Cancelada"',
            proximasDoProazo: `Prazo de finalização nos próximos ${DIAS_PROXIMO_PRAZO} dias e em aberto`,
        },
    });
}
