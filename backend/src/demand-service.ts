/* Autor: João Pedro Silveira de Souza
 * Regras transacionais compartilhadas entre cadastro e os detalhes de João Pedro.
 * Mantém feriados, bloqueio concorrente e histórico detalhado na mesma transação.
 */
import { Connection } from 'oracledb';
import { connection, rows } from './data/database';
import { fail, id, text, choice } from './validation';
import {
  User,
  ADMIN,
  MEMBER,
  isClosed,
  transitions,
  validDate,
  today,
  types,
  priorities,
  statuses,
} from './rules';
import { holidays } from './holidays';

// Campos que um membro da equipe não pode alterar.
const CAMPOS_GERENCIAIS = ['titulo', 'descricao', 'tipo', 'prioridade', 'responsavelId', 'prazoFinalizacao'];
const CAMPOS_ATUALIZAVEIS = [...CAMPOS_GERENCIAIS, 'status'];

// O banco grava "Em Andamento"/"Em Revisão"; a interface usa minúsculas.
function statusBanco(status: string): string {
  if (status === 'Em andamento') return 'Em Andamento';
  if (status === 'Em revisão') return 'Em Revisão';
  return status;
}

async function participaDoProjeto(c: Connection, projectId: number, userId: number): Promise<boolean> {
  const links = await rows(
    c,
    'SELECT id_usuario FROM projeto_usuarios WHERE id_projeto = :projeto AND id_usuario = :usuario',
    { projeto: projectId, usuario: userId },
  );
  return links.length > 0;
}

// Confere se o projeto existe e se o usuário pode acessá-lo.
export async function projectAccess(c: Connection, projectId: number, user: User) {
  const [project] = await rows(c, 'SELECT id_projeto FROM projetos WHERE id_projeto = :id', { id: projectId });
  if (!project) fail(404, 'Projeto não encontrado.');

  if (user.perfil !== ADMIN && !(await participaDoProjeto(c, projectId, user.id))) {
    fail(403, 'Você não participa deste projeto.');
  }
}

// Padroniza nomes de campos, datas e status para o frontend.
export const demandSelect = `
  SELECT d.id_demanda "id",
         d.titulo "titulo",
         d.descricao "descricao",
         d.tipo_demanda "tipo",
         d.prioridade "prioridade",
         CASE d.status
           WHEN 'Em Andamento' THEN 'Em andamento'
           WHEN 'Em Revisão' THEN 'Em revisão'
           ELSE d.status
         END "status",
         d.id_projeto "projetoId",
         p.nome "projetoNome",
         d.id_responsavel "responsavelId",
         u.nome "responsavelNome",
         TO_CHAR(d.data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z' "dataCriacao",
         TO_CHAR(d.data_atualizacao, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z' "dataUltimaAtualizacao",
         TO_CHAR(d.prazo_finalizacao, 'YYYY-MM-DD') "prazoFinalizacao"
    FROM demandas d
    JOIN projetos p ON p.id_projeto = d.id_projeto
    LEFT JOIN usuarios u ON u.id_usuario = d.id_responsavel`;

export async function demand(c: Connection, demandId: number, user: User, lock = false) {
  // A linha é bloqueada antes da leitura para impedir atualização perdida no histórico.
  if (lock) {
    await rows(c, 'SELECT id_demanda FROM demandas WHERE id_demanda = :id FOR UPDATE WAIT 5', { id: demandId });
  }

  const [d] = await rows(c, demandSelect + ' WHERE d.id_demanda = :id', { id: demandId });
  if (!d) fail(404, 'Demanda não encontrada.');
  await projectAccess(c, d.projetoId, user);

  const encerrada = isClosed(d.status);
  const transicoesPermitidas = transitions(d.status, user, d.responsavelId);

  return {
    ...d,
    transicoesPermitidas,
    permissoes: {
      podeEditar: user.perfil !== MEMBER && !encerrada,
      transicoesPermitidas,
    },
    podeEditar: !encerrada && (user.perfil !== MEMBER || user.id === d.responsavelId),
  };
}

export async function checkResponsible(c: Connection, responsible: number | null, project: number) {
  if (responsible === null) return;
  if (!(await participaDoProjeto(c, project, responsible))) {
    fail(400, 'O responsável precisa pertencer ao projeto.');
  }
}

// Valida a data e consulta feriados quando o prazo é informado.
export async function checkDeadline(value: unknown) { // FLUXO:CADASTRAR-DEMANDA 6/6 valida prazo e feriado
  if (value === null) return;
  if (!validDate(value)) fail(400, 'Informe um prazo válido (AAAA-MM-DD).');
  if (value < today()) fail(400, 'O prazo não pode ser uma data passada.');

  const feriados = await holidays(Number(value.slice(0, 4)));
  const holiday = feriados.find(h => h.date === value);
  if (holiday) fail(400, `O prazo não pode cair em feriado nacional: ${holiday.name}.`);
}

export async function audit(
  c: Connection,
  demandId: number,
  user: User,
  field: string,
  before: unknown,
  after: unknown,
) {
  await c.execute(
    `INSERT INTO historico_alteracoes (id_demanda, id_usuario, campo, valor_anterior, valor_novo, descricao)
     VALUES (:demanda, :usuario, :campo, :anterior, :novo, :descricao)`,
    {
      demanda: demandId,
      usuario: user.id,
      campo: field,
      descricao: `${field}: ${before ?? '—'} → ${after ?? '—'}`.slice(0, 500),
      anterior: before == null ? null : String(before),
      novo: after == null ? null : String(after),
    },
  );
}

// Campos omitidos mantêm o valor atual; null pode limpar o prazo e o responsável.
function mergeChanges(before: any, b: any) {
  const keep = (key: string, parse: (value: any) => unknown) =>
    b[key] === undefined ? before[key] : parse(b[key]);

  return {
    ...before,
    titulo: keep('titulo', v => text(v, 'Título', 3, 150)),
    descricao: keep('descricao', v => text(v, 'Descrição', 10, 2000)),
    tipo: keep('tipo', v => choice(v, types, 'Tipo')),
    prioridade: keep('prioridade', v => choice(v, priorities, 'Prioridade')),
    status: keep('status', v => choice(v, statuses, 'Status')),
    responsavelId: keep('responsavelId', v => (v == null || v === '' ? null : id(v))),
    prazoFinalizacao: keep('prazoFinalizacao', v => v),
  };
}

export async function updateDemand(user: User, demandIdValue: unknown, body: any) { // FLUXO:SALVAR-ALTERACOES 6/6 regras, UPDATE e historico // FLUXO:ATUALIZAR-STATUS 6/7 mesma funcao do Salvar
  return connection(async c => {
    const demandId = id(demandIdValue);
    const before = await demand(c, demandId, user, true);
    const b = body || {};

    if (!before.podeEditar) fail(403, 'Você não pode editar esta demanda ou ela já está encerrada.');

    const after = mergeChanges(before, b);

    if (b.projetoId !== undefined && id(b.projetoId) !== before.projetoId) {
      fail(400, 'O projeto não pode ser alterado após a criação.');
    }

    const statusMudou = after.status !== before.status;
    if (statusMudou && !transitions(before.status, user, before.responsavelId).includes(after.status)) {
      fail(403, 'Transição de status não permitida para seu perfil.');
    }

    if (user.perfil === MEMBER && CAMPOS_GERENCIAIS.some(f => after[f] !== before[f])) {
      fail(403, 'Membros podem alterar apenas o status das demandas atribuídas a eles.');
    }

    await checkResponsible(c, after.responsavelId, before.projetoId);
    if (after.prazoFinalizacao !== before.prazoFinalizacao) {
      await checkDeadline(after.prazoFinalizacao);
    }

    const changed = CAMPOS_ATUALIZAVEIS.filter(f => after[f] !== before[f]);
    if (!changed.length) fail(400, 'Nenhuma alteração foi informada.');

    await c.execute(
      `UPDATE demandas
          SET titulo = :titulo,
              descricao = :descricao,
              tipo_demanda = :tipo,
              prioridade = :prioridade,
              id_responsavel = :responsavel,
              status = :status,
              prazo_finalizacao = TO_DATE(:prazo, 'YYYY-MM-DD'),
              data_atualizacao = CURRENT_TIMESTAMP
        WHERE id_demanda = :id`,
      {
        titulo: after.titulo,
        descricao: after.descricao,
        tipo: after.tipo,
        prioridade: after.prioridade,
        responsavel: after.responsavelId,
        status: statusBanco(after.status),
        prazo: after.prazoFinalizacao,
        id: demandId,
      },
    );

    // Registra o histórico por campo na mesma transação da atualização.
    for (const field of changed) {
      await audit(c, demandId, user, field, before[field], after[field]);
    }

    const result = await demand(c, demandId, user);
    await c.commit();
    return result;
  });
}
