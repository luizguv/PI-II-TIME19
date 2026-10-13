/**
 * Autor: Caio Peccinato
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Rota GET /dashboard — retorna indicadores gerais do sistema
 *
 * Critérios adotados:
 *   - "Em aberto": status diferente de "Concluída" e "Cancelada"
 *   - "Críticas em aberto": prioridade "Crítica" e em aberto
 *   - "Próximas do prazo": prazo de finalização nos próximos 7 dias e em aberto
 */

import { Router, Request, Response } from "express";
import { demandas } from "../data/dados";

const router = Router();

const DIAS_PROXIMO_PRAZO = 7;

// Status e prioridades válidos conforme escopo do PI2
const STATUS_VALIDOS = [
  "Aberta",
  "Em andamento",
  "Em revisão",
  "Concluída",
  "Cancelada",
] as const;

const PRIORIDADES_VALIDAS = ["Crítica", "Alta", "Média", "Baixa"] as const;
const TIPOS_VALIDOS = ["Tarefa", "Defeito", "Melhoria", "Documentação"] as const;

// GET /dashboard
router.get("/", (req: Request, res: Response) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const prazoLimite = new Date(hoje);
  prazoLimite.setDate(prazoLimite.getDate() + DIAS_PROXIMO_PRAZO);

  // Contagem por status
  const porStatus = STATUS_VALIDOS.reduce(
    (acc, status) => {
      acc[status] = demandas.filter((d) => d.status === status).length;
      return acc;
    },
    {} as Record<(typeof STATUS_VALIDOS)[number], number>
  );

  // Contagem por prioridade
  const porPrioridade = PRIORIDADES_VALIDAS.reduce(
    (acc, prioridade) => {
      acc[prioridade] = demandas.filter((d) => d.prioridade === prioridade).length;
      return acc;
    },
    {} as Record<(typeof PRIORIDADES_VALIDAS)[number], number>
  );

  // Contagem por tipo
  const porTipo = TIPOS_VALIDOS.reduce(
    (acc, tipo) => {
      acc[tipo] = demandas.filter((d) => d.tipo === tipo).length;
      return acc;
    },
    {} as Record<(typeof TIPOS_VALIDOS)[number], number>
  );

  // Demandas em aberto: não Concluídas nem Canceladas
  const emAberto = demandas.filter(
    (d) => d.status !== "Concluída" && d.status !== "Cancelada"
  );

  // Demandas críticas em aberto
  const criticasEmAberto = emAberto
    .filter((d) => d.prioridade === "Crítica")
    .map(({ id, titulo, status, prioridade, tipo, prazoFinalizacao }) => ({
      id,
      titulo,
      status,
      prioridade,
      tipo,
      prazoFinalizacao: prazoFinalizacao ?? null,
    }));

  // Demandas próximas do prazo: prazo nos próximos 7 dias e em aberto
  const proximasDoProazo = emAberto
    .filter((d) => {
      if (!d.prazoFinalizacao) return false;
      const prazo = new Date(d.prazoFinalizacao);
      prazo.setHours(0, 0, 0, 0);
      return prazo >= hoje && prazo <= prazoLimite;
    })
    .map(({ id, titulo, status, prioridade, tipo, prazoFinalizacao }) => ({
      id,
      titulo,
      status,
      prioridade,
      tipo,
      prazoFinalizacao,
    }));

  res.status(200).json({
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
});

export default router;
