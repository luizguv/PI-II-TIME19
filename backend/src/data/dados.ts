/* Tipos originais da equipe PI-II-TIME19.
 * Os registros agora são consultados no Oracle, sem arrays de teste. */

export type PerfilUsuario = "Administrador" | "Líder de Projeto" | "Membro da Equipe";
export type StatusDemanda = "Aberta" | "Em andamento" | "Em revisão" | "Concluída" | "Cancelada";
export type PrioridadeDemanda = "Crítica" | "Alta" | "Média" | "Baixa";
export type TipoDemanda = "Tarefa" | "Defeito" | "Melhoria" | "Documentação";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
}

export interface Projeto {
  id: number;
  nome: string;
  descricao: string;
}

export interface Demanda {
  id: number;
  titulo: string;
  descricao: string;
  tipo: TipoDemanda;
  prioridade: PrioridadeDemanda;
  status: StatusDemanda;
  projetoId: number;
  responsavelId?: number;
  dataCriacao: string;
  prazoFinalizacao?: string;
  dataUltimaAtualizacao: string;
}

export interface Comentario {
  id: number;
  demandaId: number;
  usuarioId: number;
  texto: string;
  dataCriacao: string;
}
