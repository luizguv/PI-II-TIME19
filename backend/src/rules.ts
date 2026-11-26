/* Autor: Leonardo Gambaroni Alves
 * Regras compartilhadas pela API e testes de autorização e ciclo de vida.
 */
// opcoes de status, prioridade e tipo
export const statuses = ['Aberta', 'Em andamento', 'Em revisão', 'Concluída', 'Cancelada'];
export const priorities = ['Crítica', 'Alta', 'Média', 'Baixa'];
export const types = ['Tarefa', 'Defeito', 'Melhoria', 'Documentação'];

// nomes dos perfis
export const ADMIN = 'Administrador';
export const LEADER = 'Líder de Projeto';
export const MEMBER = 'Membro da Equipe';

// usuario logado
export interface User {
  id: number;
  nome: string;
  email: string;
  perfil: string;
}

// funcao que diz se a demanda esta encerrada
export const isClosed = (status: string): boolean => status === 'Concluída' || status === 'Cancelada';

// funcao que lista os status permitidos para o usuario
export function transitions(status: string, user: User, responsibleId: number | null): string[] { // FLUXO:ATUALIZAR-STATUS 7/7 regra de quem muda para qual status
  // encerrada nao muda mais
  if (isClosed(status)) return [];

  // membro so mexe na demanda dele
  const manager = user.perfil === ADMIN || user.perfil === LEADER;
  if (!manager && responsibleId !== user.id) return [];

  // proximos status possiveis
  const result: string[] = [];
  if (status === 'Aberta') result.push('Em andamento');
  if (status === 'Em andamento') result.push('Em revisão');
  if (status === 'Em revisão' && manager) result.push('Em andamento', 'Concluída');
  if (manager) result.push('Cancelada');
  return result;
}

// funcao que valida data AAAA-MM-DD
export function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

// funcao que retorna a data de hoje em sao paulo
export const today = (): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
