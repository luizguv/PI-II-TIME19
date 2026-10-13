/**
 * Tipos esperados pela rota GET /dashboard.
 * Este arquivo é apenas para referência — os tipos reais devem
 * ser definidos em dados.ts pela equipe.
 *
 * Autor: Caio Peccinato
 */

export type Status = "Aberta" | "Em andamento" | "Em revisão" | "Concluída" | "Cancelada";
export type Prioridade = "Crítica" | "Alta" | "Média" | "Baixa";
export type Tipo = "Tarefa" | "Defeito" | "Melhoria" | "Documentação";

export interface Demanda {
  id: number;
  titulo: string;
  descricao: string;
  tipo: Tipo;
  prioridade: Prioridade;
  status: Status;
  projetoId: number;
  responsavelId?: number;
  dataCriacao: string;        // ISO 8601: "2025-10-01T10:00:00Z"
  prazoFinalizacao?: string;  // ISO 8601: "2025-10-20T23:59:00Z"
  dataUltimaAtualizacao: string;
}
