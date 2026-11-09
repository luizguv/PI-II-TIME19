/* Autor: Vinicius Zorzetto — RA:24008052
 * Regras compartilhadas pela API e testes de autorização e ciclo de vida.
 */
export const statuses = ['Aberta', 'Em andamento', 'Em revisão', 'Concluída', 'Cancelada'];
export const priorities = ['Crítica', 'Alta', 'Média', 'Baixa'];
export const types = ['Tarefa', 'Defeito', 'Melhoria', 'Documentação'];
export const ADMIN = 'Administrador';
export const LEADER = 'Líder de Projeto';
export const MEMBER = 'Membro da Equipe';
export interface User { id: number; nome: string; email: string; perfil: string; }
export function transitions(status: string, user: User, responsibleId: number | null): string[] {
  if (status === 'Concluída' || status === 'Cancelada') return [];
  const manager = user.perfil === ADMIN || user.perfil === LEADER;
  if (!manager && responsibleId !== user.id) return [];
  const result: string[] = [];
  if (status === 'Aberta') result.push('Em andamento');
  if (status === 'Em andamento') result.push('Em revisão');
  if (status === 'Em revisão' && manager) result.push('Em andamento', 'Concluída');
  if (manager) result.push('Cancelada');
  return result;
}
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export const today = (): string => new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Sao_Paulo'}).format(new Date());
