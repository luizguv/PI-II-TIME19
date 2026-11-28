/*
 * Autor: Leonardo Gambaroni Alves
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Regras de negócio compartilhadas pela API e pelos testes
 *            (domínios fechados, perfis de acesso, ciclo de vida e datas).
 */

// Valores válidos definidos no Documento de Visão para status, prioridade e tipo.
export const statuses = ['Aberta', 'Em andamento', 'Em revisão', 'Concluída', 'Cancelada'];
export const priorities = ['Crítica', 'Alta', 'Média', 'Baixa'];
export const types = ['Tarefa', 'Defeito', 'Melhoria', 'Documentação'];

// Perfis de acesso suportados pelo sistema.
export const ADMIN = 'Administrador';
export const LEADER = 'Líder de Projeto';
export const MEMBER = 'Membro da Equipe';

// Estrutura mínima do usuário autenticado usada na verificação de permissões.
export interface User {
  id: number;
  nome: string;
  email: string;
  perfil: string;
}

/**
 * Calcula as transições de status permitidas a partir do status atual,
 * do perfil do usuário autenticado e de quem é o responsável pela demanda.
 */
export function transitions(status: string, user: User, responsibleId: number | null): string[] {
  // Demandas já concluídas ou canceladas não podem ser reabertas nem alteradas.
  if (status === 'Concluída' || status === 'Cancelada') {
    return [];
  }

  // Apenas Administrador e Líder de Projeto possuem papel gerencial no fluxo.
  const manager = user.perfil === ADMIN || user.perfil === LEADER;

  // Membro da Equipe só pode movimentar demandas atribuídas a ele mesmo.
  if (!manager && responsibleId !== user.id) {
    return [];
  }

  const result: string[] = [];

  // Fluxo progressivo: Aberta -> Em andamento -> Em revisão.
  if (status === 'Aberta') {
    result.push('Em andamento');
  }

  // De Em andamento não é permitido voltar para Aberta nem concluir diretamente.
  if (status === 'Em andamento') {
    result.push('Em revisão');
  }

  // A partir de Em revisão, apenas gestores podem aprovar (Concluída) ou devolver (Em andamento).
  if (status === 'Em revisão' && manager) {
    result.push('Em andamento', 'Concluída');
  }

  // Cancelamento é restrito a Administrador e Líder em demandas ainda não encerradas.
  if (manager) {
    result.push('Cancelada');
  }

  return result;
}

/**
 * Valida se o valor informado representa uma data real no formato ISO (AAAA-MM-DD).
 */
export function validDate(value: unknown): value is string {
  // A reconversão para ISO impede datas inexistentes que o Date ajustaria sozinho (ex.: 2026-02-29).
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

/**
 * Retorna a data atual no fuso de São Paulo no formato AAAA-MM-DD (locale sv-SE).
 */
export const today = (): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
