/* Autor original: Equipe
 * Integração: Vinicius Zorzetto — RA:24008052
 */
import type { Request, Response } from 'express';
import { connection, rows } from '../data/database';
import { cookieOptions, token, type SessionLocals } from '../middleware/session';
import { hashToken, newToken, verifyPassword } from '../security';
import { fail, text } from '../validation';

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
    // O navegador recebe o token bruto; o Oracle guarda apenas seu hash.
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

export function getSession(_req: Request, res: Response<unknown, SessionLocals>) {
  return res.json({usuario: res.locals.usuario});
}

export async function logout(_req: Request, res: Response<unknown, SessionLocals>) {
  // Apaga a sessão no Oracle para invalidar o token mesmo se o cookie for reapresentado.
  await connection(async c => {
    await c.execute('DELETE FROM sessoes WHERE token_hash = :token', {token: res.locals.sessionHash});
    await c.commit();
  });
  res.clearCookie('pi2_session', cookieOptions);
  return res.json({mensagem: 'Sessão encerrada.'});
}
