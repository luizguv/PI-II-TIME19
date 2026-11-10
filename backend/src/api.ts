/* Autor: Vinicius Zorzetto — RA:24008052
 * Integração das rotas originais com Oracle, sessão, permissões e histórico transacional.
 * As consultas usam binds; nomes de colunas de ordenação vêm de lista fechada.
 */
import {Router, Request, Response, NextFunction} from 'express';
import {connection, rows, insertId} from './data/database';
import {hashToken, newToken, verifyPassword} from './security';
import {ADMIN, LEADER, MEMBER, User, transitions, statuses, priorities, types, validDate, today} from './rules';
import {holidays} from './holidays';
import detailsRoutes from './routes/detalhesDemandaRoutes';
import {fail,id,text,choice} from './validation';
import {projectAccess,demandSelect,demand,checkResponsible,checkDeadline,audit} from './demand-service';

export const api = Router();
interface AuthRequest extends Request { usuario: User; sessionHash: string; }
export const run = (fn: (req: any, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};
function token(req: Request): string {
  const cookies = (req.headers.cookie || '').split(';').map(s => s.trim());
  return cookies.find(s => s.startsWith('pi2_session='))?.slice('pi2_session='.length) || '';
}
const cookieOptions = {httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/'};
// Tentativas limitadas por endereço e e-mail; entradas antigas são removidas para limitar memória.
const attempts = new Map<string, {count: number; until: number}>();
export async function login(req: Request, res: Response) {
  const email = text(req.body?.email, 'E-mail', 3, 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'E-mail inválido.');
  const password = typeof req.body?.senha === 'string' ? req.body.senha : '';
  if (!password || password.length > 256) fail(400, 'Informe a senha (até 256 caracteres).');
  if (req.body?.lembrar !== undefined && typeof req.body.lembrar !== 'boolean') fail(400, 'Opção lembrar inválida.');
  for (const [k,v] of attempts) if (v.until < Date.now()) attempts.delete(k);
  const key = `${req.ip}:${email}`;
  const attempt = attempts.get(key) || {count: 0, until: Date.now() + 60000};
  if (attempt.count >= 10) fail(429, 'Muitas tentativas. Aguarde um minuto.');
  attempt.count++; attempts.set(key, attempt);
  return connection(async c => {
    const [user] = await rows(c, 'SELECT id_usuario "id", nome "nome", email "email", perfil "perfil", senha "senha" FROM usuarios WHERE LOWER(email) = :email', {email});
    if (!user || !verifyPassword(password, user.senha)) fail(401, 'E-mail ou senha inválidos.');
    const raw = newToken();
    const hours = req.body.lembrar ? 168 : 12;
    await c.execute('DELETE FROM sessoes WHERE expira_em < CURRENT_TIMESTAMP');
    const previous = token(req);
    if (previous) await c.execute('DELETE FROM sessoes WHERE token_hash = :token', {token: hashToken(previous)});
    await c.execute('INSERT INTO sessoes (token_hash, id_usuario, expira_em) VALUES (:token, :usuario, CURRENT_TIMESTAMP + NUMTODSINTERVAL(:horas, \'HOUR\'))', {token: hashToken(raw), usuario: user.id, horas: hours});
    await c.commit(); attempts.delete(key);
    res.cookie('pi2_session', raw, {...cookieOptions, ...(req.body.lembrar ? {maxAge: hours * 3600000} : {})});
    const {senha, ...publicUser} = user;
    return res.json({mensagem: 'Login realizado com sucesso.', usuario: publicUser});
  });
}
api.post('/login', run(login));
api.use((req, res, next) => {
  const raw = token(req);
  if (!/^[a-f0-9]{64}$/.test(raw)) { res.status(401).json({mensagem: 'Entre no sistema para continuar.'}); return; }
  connection(async c => {
    const [user] = await rows<User>(c, `SELECT u.id_usuario "id", u.nome "nome", u.email "email", u.perfil "perfil"
      FROM sessoes s JOIN usuarios u ON u.id_usuario = s.id_usuario
      WHERE s.token_hash = :token AND s.expira_em > CURRENT_TIMESTAMP`, {token: hashToken(raw)});
    if (!user) fail(401, 'Sessão expirada. Entre novamente.');
    (req as AuthRequest).usuario = user;
    res.locals.usuario = user; // Contrato de autenticação esperado pelo controller de detalhes.
    (req as AuthRequest).sessionHash = hashToken(raw);
  }).then(() => next()).catch(next);
});
api.get('/sessao', run(async (req: AuthRequest, res) => res.json({usuario: req.usuario})));
api.post('/logout', run(async (req: AuthRequest, res) => {
  await connection(async c => { await c.execute('DELETE FROM sessoes WHERE token_hash = :token', {token: req.sessionHash}); await c.commit(); });
  res.clearCookie('pi2_session', cookieOptions);
  return res.json({mensagem: 'Sessão encerrada.'});
}));

api.get('/projetos', run(async (req: AuthRequest, res) => connection(async c => {
  const data = await rows(c, `SELECT p.id_projeto "id", p.nome "nome" FROM projetos p
    ${req.usuario.perfil === ADMIN ? '' : 'WHERE EXISTS (SELECT 1 FROM projeto_usuarios pu WHERE pu.id_projeto = p.id_projeto AND pu.id_usuario = :usuario)'} ORDER BY p.nome`,
    req.usuario.perfil === ADMIN ? {} : {usuario: req.usuario.id});
  return res.json({projetos: data});
})));
api.get('/usuarios', run(async (req: AuthRequest, res) => connection(async c => {
  const project = id(req.query.projetoId);
  await projectAccess(c, project, req.usuario);
  const data = await rows(c, `SELECT u.id_usuario "id", u.nome "nome", u.perfil "perfil" FROM usuarios u
    JOIN projeto_usuarios pu ON pu.id_usuario = u.id_usuario WHERE pu.id_projeto = :projeto ORDER BY u.nome`, {projeto: project});
  return res.json({usuarios: data});
})));
api.get('/feriados/:ano', run(async (req: AuthRequest, res) => res.json({feriados: await holidays(Number(req.params.ano))})));

export async function listDemands(req: AuthRequest, res: Response) {
  return connection(async c => {
    const where: string[] = []; const binds: any = {};
    if (req.usuario.perfil !== ADMIN) {
      where.push('EXISTS (SELECT 1 FROM projeto_usuarios pu WHERE pu.id_projeto = d.id_projeto AND pu.id_usuario = :usuario)'); binds.usuario = req.usuario.id;
    }
    for (const [key, column, values] of [['status', 'd.status', statuses], ['prioridade','d.prioridade', priorities], ['tipo','d.tipo_demanda',types]] as const) {
      const value = req.query[key];
      if (value) {
        const normalized = choice(value, [...values], key);
        where.push(`LOWER(${column}) = LOWER(:${key})`); binds[key] = normalized;
      }
    }
    for (const [key, column] of [['projetoId', 'd.id_projeto'], ['responsavelId','d.id_responsavel']]) {
      if (req.query[key]) {where.push(`${column} = :${key}`); binds[key] = id(req.query[key]);}
    }
    if (req.query.busca) {
      const search = text(req.query.busca, 'Busca', 1, 150).toLowerCase().replace(/[\\%_]/g, '\\$&');
      where.push("(LOWER(d.titulo) LIKE :busca ESCAPE '\\' OR LOWER(d.descricao) LIKE :busca ESCAPE '\\')"); binds.busca = `%${search}%`;
    }
    const orders: Record<string, string> = {
      dataCriacao: 'd.data_criacao DESC', titulo: 'LOWER(d.titulo)', prazoFinalizacao: 'd.prazo_finalizacao NULLS LAST',
      prioridade: "CASE d.prioridade WHEN 'Crítica' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Média' THEN 3 ELSE 4 END",
      status: "CASE LOWER(d.status) WHEN 'aberta' THEN 1 WHEN 'em andamento' THEN 2 WHEN 'em revisão' THEN 3 WHEN 'concluída' THEN 4 ELSE 5 END"
    };
    const order = req.query.ordenarPor || 'dataCriacao';
    if (typeof order !== 'string' || !Object.prototype.hasOwnProperty.call(orders, order)) fail(400, 'Ordenação inválida.');
    const result = await rows(c, demandSelect + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ` ORDER BY ${orders[order as string]}, d.id_demanda` , binds);
    return res.json({sucesso: true, total: result.length, demandas: result});
  });
}
api.get('/demandas', run(listDemands));
export async function getDashboard(req: AuthRequest, res: Response) {
  return connection(async c => {
    const data = await rows(c, demandSelect + (req.usuario.perfil === ADMIN ? '' : ' WHERE EXISTS (SELECT 1 FROM projeto_usuarios pu WHERE pu.id_projeto = d.id_projeto AND pu.id_usuario = :usuario)'), req.usuario.perfil === ADMIN ? {} : {usuario: req.usuario.id});
    const count = (field: string, values: string[]) => Object.fromEntries(values.map(v => [v, data.filter(d => d[field] === v).length]));
    const open = data.filter(d => !['Concluída','Cancelada'].includes(d.status));
    const limit = new Date(today() + 'T12:00:00Z'); limit.setUTCDate(limit.getUTCDate() + 7);
    return res.json({totalDemandas: data.length, porStatus: count('status',statuses), porTipo: count('tipo',types), porPrioridade: count('prioridade',priorities),
      criticasEmAberto: open.filter(d => d.prioridade === 'Crítica'),
      proximasDoPrazo: open.filter(d => d.prazoFinalizacao && d.prazoFinalizacao >= today() && d.prazoFinalizacao <= limit.toISOString().slice(0,10))});
  });
}
api.get('/dashboard', run(getDashboard));
api.post('/demandas', run(async (req: AuthRequest, res) => {
  const b = req.body || {};
  const title = text(b.titulo, 'Título', 3, 150), description = text(b.descricao, 'Descrição', 10, 2000);
  const type = choice(b.tipo, types, 'Tipo'), priority = choice(b.prioridade, priorities, 'Prioridade');
  const project = id(b.projetoId), responsible = b.responsavelId == null || b.responsavelId === '' ? null : id(b.responsavelId);
  if (b.status !== undefined && b.status !== 'Aberta') fail(400, 'Novas demandas devem ter status Aberta.');
  if (req.usuario.perfil === MEMBER && responsible !== null && responsible !== req.usuario.id) fail(403, 'Membros só podem atribuir demandas a si mesmos.');
  await checkDeadline(b.prazoFinalizacao);
  return connection(async c => {
    await projectAccess(c, project, req.usuario); await checkResponsible(c, responsible, project);
    const newId = await insertId(c, `INSERT INTO demandas (titulo, descricao, tipo_demanda, prioridade, id_projeto, id_responsavel, prazo_finalizacao)
      VALUES (:titulo, :descricao, :tipo, :prioridade, :projeto, :responsavel, TO_DATE(:prazo, 'YYYY-MM-DD')) RETURNING id_demanda INTO :newId`,
      {titulo: title, descricao: description, tipo: type, prioridade: priority, projeto: project, responsavel: responsible, prazo: b.prazoFinalizacao});
    await audit(c, newId, req.usuario, 'criação', null, 'Aberta');
    const result = await demand(c, newId, req.usuario); await c.commit();
    return res.status(201).json(result);
  });
}));

// Rotas de detalhes, comentários e histórico recebidas da main (João Pedro).
api.use(detailsRoutes);
