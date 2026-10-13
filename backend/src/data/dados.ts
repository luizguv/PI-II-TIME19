/**
 * Dados de teste em memória — compartilhados por todas as rotas da API.
 * Substitua o acesso a estes arrays pela consulta ao banco quando a integração for feita.
 */

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

export const usuarios: Usuario[] = [
  { id: 1, nome: "Admin Geral", email: "admin@empresa.com", senha: "admin123", perfil: "Administrador" },
  { id: 2, nome: "Caio Peccinato", email: "caio@empresa.com", senha: "lider123", perfil: "Líder de Projeto" },
  { id: 3, nome: "Leonardo Alves", email: "leo@empresa.com", senha: "membro123", perfil: "Membro da Equipe" },
  { id: 4, nome: "Luiz Urias", email: "luiz@empresa.com", senha: "membro123", perfil: "Membro da Equipe" },
  { id: 5, nome: "Vinicius Matos", email: "vini@empresa.com", senha: "membro123", perfil: "Membro da Equipe" },
];

export const projetos: Projeto[] = [
  { id: 1, nome: "Portal do Cliente", descricao: "Desenvolvimento do portal web para clientes." },
  { id: 2, nome: "App Mobile", descricao: "Aplicativo para dispositivos móveis." },
  { id: 3, nome: "API de Integração", descricao: "API REST para integração com sistemas externos." },
];

export const demandas: Demanda[] = [
  {
    id: 1, titulo: "Corrigir bug no login", descricao: "Usuários não conseguem autenticar com e-mail maiúsculo.",
    tipo: "Defeito", prioridade: "Crítica", status: "Aberta",
    projetoId: 1, responsavelId: 3,
    dataCriacao: "2026-10-01T08:00:00Z", prazoFinalizacao: "2026-10-14T23:59:00Z",
    dataUltimaAtualizacao: "2026-10-01T08:00:00Z",
  },
  {
    id: 2, titulo: "Implementar dashboard", descricao: "Criar tela de dashboard com indicadores gerais.",
    tipo: "Tarefa", prioridade: "Alta", status: "Em andamento",
    projetoId: 1, responsavelId: 2,
    dataCriacao: "2026-10-02T09:00:00Z", prazoFinalizacao: "2026-10-16T23:59:00Z",
    dataUltimaAtualizacao: "2026-10-05T14:00:00Z",
  },
  {
    id: 3, titulo: "Melhorar performance da listagem", descricao: "Otimizar queries da tela de listagem de demandas.",
    tipo: "Melhoria", prioridade: "Média", status: "Em revisão",
    projetoId: 1, responsavelId: 4,
    dataCriacao: "2026-10-03T10:00:00Z", prazoFinalizacao: "2026-10-20T23:59:00Z",
    dataUltimaAtualizacao: "2026-10-08T11:00:00Z",
  },
  {
    id: 4, titulo: "Documentar endpoints da API", descricao: "Escrever documentação técnica de todos os endpoints.",
    tipo: "Documentação", prioridade: "Baixa", status: "Aberta",
    projetoId: 3, responsavelId: 5,
    dataCriacao: "2026-10-04T11:00:00Z",
    dataUltimaAtualizacao: "2026-10-04T11:00:00Z",
  },
  {
    id: 5, titulo: "Tela de cadastro de usuário", descricao: "Criar formulário de cadastro de novos usuários.",
    tipo: "Tarefa", prioridade: "Alta", status: "Concluída",
    projetoId: 1, responsavelId: 3,
    dataCriacao: "2026-09-20T08:00:00Z", prazoFinalizacao: "2026-09-30T23:59:00Z",
    dataUltimaAtualizacao: "2026-09-29T17:00:00Z",
  },
  {
    id: 6, titulo: "Erro ao salvar demanda sem responsável", descricao: "Sistema retorna erro 500 em vez de 400 quando responsável não é informado.",
    tipo: "Defeito", prioridade: "Crítica", status: "Aberta",
    projetoId: 3, responsavelId: 4,
    dataCriacao: "2026-10-06T13:00:00Z", prazoFinalizacao: "2026-10-13T23:59:00Z",
    dataUltimaAtualizacao: "2026-10-06T13:00:00Z",
  },
  {
    id: 7, titulo: "Adicionar filtro por responsável", descricao: "Permitir filtrar demandas pelo responsável na listagem.",
    tipo: "Melhoria", prioridade: "Média", status: "Em andamento",
    projetoId: 1,
    dataCriacao: "2026-10-07T09:00:00Z", prazoFinalizacao: "2026-10-18T23:59:00Z",
    dataUltimaAtualizacao: "2026-10-07T09:00:00Z",
  },
  {
    id: 8, titulo: "Configurar CI/CD", descricao: "Configurar pipeline de integração e entrega contínua.",
    tipo: "Tarefa", prioridade: "Alta", status: "Cancelada",
    projetoId: 2,
    dataCriacao: "2026-09-25T10:00:00Z",
    dataUltimaAtualizacao: "2026-10-01T16:00:00Z",
  },
  {
    id: 9, titulo: "Validar campos obrigatórios no servidor", descricao: "Garantir que todas as rotas POST validam campos obrigatórios.",
    tipo: "Tarefa", prioridade: "Alta", status: "Em revisão",
    projetoId: 3, responsavelId: 2,
    dataCriacao: "2026-10-08T08:00:00Z", prazoFinalizacao: "2026-10-15T23:59:00Z",
    dataUltimaAtualizacao: "2026-10-10T10:00:00Z",
  },
  {
    id: 10, titulo: "Atualizar README com instruções de execução", descricao: "Adicionar passos para instalar dependências e rodar o servidor.",
    tipo: "Documentação", prioridade: "Baixa", status: "Concluída",
    projetoId: 1, responsavelId: 5,
    dataCriacao: "2026-10-05T14:00:00Z", prazoFinalizacao: "2026-10-10T23:59:00Z",
    dataUltimaAtualizacao: "2026-10-09T18:00:00Z",
  },
];

export const comentarios: Comentario[] = [
  { id: 1, demandaId: 1, usuarioId: 3, texto: "Reproduzido. Causa identificada no middleware de autenticação.", dataCriacao: "2026-10-02T10:00:00Z" },
  { id: 2, demandaId: 1, usuarioId: 2, texto: "Prioridade elevada. Resolver antes do deploy de sexta.", dataCriacao: "2026-10-02T11:30:00Z" },
  { id: 3, demandaId: 3, usuarioId: 4, texto: "Índice criado no banco, aguardando revisão de código.", dataCriacao: "2026-10-08T09:00:00Z" },
];
