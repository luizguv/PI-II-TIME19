/* Autor: Vinicius Zorzetto — RA:24008052
 * Regras transacionais compartilhadas entre cadastro e os detalhes de João Pedro.
 * Mantém feriados, bloqueio concorrente e histórico detalhado na mesma transação.
 */
import {Connection} from 'oracledb';
import {connection,rows} from './data/database';
import {fail,id,text,choice} from './validation';
import {User,ADMIN,MEMBER,transitions,validDate,today,types,priorities,statuses} from './rules';
import {holidays} from './holidays';
export async function projectAccess(c: Connection, projectId: number, user: User) {
  const [project] = await rows(c, 'SELECT id_projeto FROM projetos WHERE id_projeto = :id', {id: projectId});
  if (!project) fail(404, 'Projeto não encontrado.');
  if (user.perfil !== ADMIN) {
    const links = await rows(c, 'SELECT id_usuario FROM projeto_usuarios WHERE id_projeto = :projeto AND id_usuario = :usuario', {projeto: projectId, usuario: user.id});
    if (!links.length) fail(403, 'Você não participa deste projeto.');
  }
}
export const demandSelect = `SELECT d.id_demanda "id", d.titulo "titulo", d.descricao "descricao", d.tipo_demanda "tipo",
  d.prioridade "prioridade", CASE d.status WHEN 'Em Andamento' THEN 'Em andamento' WHEN 'Em Revisão' THEN 'Em revisão' ELSE d.status END "status",
  d.id_projeto "projetoId", p.nome "projetoNome", d.id_responsavel "responsavelId", u.nome "responsavelNome",
  TO_CHAR(d.data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z' "dataCriacao", TO_CHAR(d.data_atualizacao, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z' "dataUltimaAtualizacao",
  TO_CHAR(d.prazo_finalizacao, 'YYYY-MM-DD') "prazoFinalizacao"
  FROM demandas d JOIN projetos p ON p.id_projeto = d.id_projeto LEFT JOIN usuarios u ON u.id_usuario = d.id_responsavel`;
export async function demand(c: Connection, demandId: number, user: User, lock = false) {
  // A linha é bloqueada antes da leitura para impedir atualização perdida no histórico.
  if (lock) await rows(c, 'SELECT id_demanda FROM demandas WHERE id_demanda = :id FOR UPDATE WAIT 5', {id: demandId});
  const [d] = await rows(c, demandSelect + ' WHERE d.id_demanda = :id', {id: demandId});
  if (!d) fail(404, 'Demanda não encontrada.');
  await projectAccess(c, d.projetoId, user);
  return {...d, transicoesPermitidas: transitions(d.status, user, d.responsavelId),
    permissoes: {podeEditar: user.perfil !== MEMBER && !['Concluída','Cancelada'].includes(d.status), transicoesPermitidas: transitions(d.status,user,d.responsavelId)},
    podeEditar: !['Concluída','Cancelada'].includes(d.status) && (user.perfil !== MEMBER || user.id === d.responsavelId)};
}
export async function checkResponsible(c: Connection, responsible: number | null, project: number) {
  if (responsible === null) return;
  const links = await rows(c, 'SELECT id_usuario FROM projeto_usuarios WHERE id_projeto = :projeto AND id_usuario = :usuario', {projeto: project, usuario: responsible});
  if (!links.length) fail(400, 'O responsável precisa pertencer ao projeto.');
}
export async function checkDeadline(value: unknown) {
  if (!validDate(value)) fail(400, 'Informe um prazo válido (AAAA-MM-DD).');
  const date = value as string;
  if (date < today()) fail(400, 'O prazo não pode ser uma data passada.');
  const holiday = (await holidays(Number(date.slice(0, 4)))).find(h => h.date === date);
  if (holiday) fail(400, `O prazo não pode cair em feriado nacional: ${holiday.name}.`);
}
export async function audit(c: Connection, demandId: number, user: User, field: string, before: unknown, after: unknown) {
  await c.execute(`INSERT INTO historico_alteracoes (id_demanda, id_usuario, campo, valor_anterior, valor_novo, descricao)
    VALUES (:demanda, :usuario, :campo, :anterior, :novo, :descricao)`, {demanda: demandId, usuario: user.id, campo: field,
    descricao: `${field}: ${before ?? '—'} → ${after ?? '—'}`.slice(0,500),
    anterior: before == null ? null : String(before), novo: after == null ? null : String(after)});
}
export async function updateDemand(user: User, demandIdValue: unknown, body: any) {
  return connection(async c => {
    const demandId = id(demandIdValue), before = await demand(c, demandId, user, true), b = body || {};
    if (!before.podeEditar) fail(403, 'Você não pode editar esta demanda ou ela já está encerrada.');
    const after = {...before,
      titulo: b.titulo === undefined ? before.titulo : text(b.titulo,'Título',3,150),
      descricao: b.descricao === undefined ? before.descricao : text(b.descricao,'Descrição',10,2000),
      tipo: b.tipo === undefined ? before.tipo : choice(b.tipo,types,'Tipo'),
      prioridade: b.prioridade === undefined ? before.prioridade : choice(b.prioridade,priorities,'Prioridade'),
      status: b.status === undefined ? before.status : choice(b.status,statuses,'Status'),
      responsavelId: b.responsavelId === undefined ? before.responsavelId : b.responsavelId == null || b.responsavelId === '' ? null : id(b.responsavelId),
      prazoFinalizacao: b.prazoFinalizacao === undefined ? before.prazoFinalizacao : b.prazoFinalizacao};
    if (b.projetoId !== undefined && id(b.projetoId) !== before.projetoId) fail(400, 'O projeto não pode ser alterado após a criação.');
    if (after.status !== before.status && !transitions(before.status,user,before.responsavelId).includes(after.status)) fail(403, 'Transição de status não permitida para seu perfil.');
    if (user.perfil === MEMBER && ['titulo','descricao','tipo','prioridade','responsavelId','prazoFinalizacao'].some(f => after[f] !== before[f])) fail(403,'Membros podem alterar apenas o status das demandas atribuídas a eles.');
    await checkResponsible(c, after.responsavelId, before.projetoId);
    if (after.prazoFinalizacao !== before.prazoFinalizacao) await checkDeadline(after.prazoFinalizacao);
    const fields = ['titulo','descricao','tipo','prioridade','responsavelId','prazoFinalizacao','status'];
    const changed = fields.filter(f => after[f] !== before[f]);
    if (!changed.length) fail(400,'Nenhuma alteração foi informada.');
    await c.execute(`UPDATE demandas SET titulo=:titulo, descricao=:descricao, tipo_demanda=:tipo, prioridade=:prioridade,
      id_responsavel=:responsavel, status=:status, prazo_finalizacao=TO_DATE(:prazo,'YYYY-MM-DD'), data_atualizacao=CURRENT_TIMESTAMP WHERE id_demanda=:id`,
      {titulo: after.titulo, descricao: after.descricao, tipo: after.tipo, prioridade: after.prioridade, responsavel: after.responsavelId,
        status: after.status === 'Em andamento' ? 'Em Andamento' : after.status === 'Em revisão' ? 'Em Revisão' : after.status, prazo: after.prazoFinalizacao, id: demandId});
    for (const field of changed) await audit(c, demandId, user, field, before[field], after[field]);
    const result = await demand(c, demandId, user); await c.commit(); return result;
  });
}
