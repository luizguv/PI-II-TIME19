/* Autor original: Equipe
 * Integração: Vinicius Zorzetto — RA:24008052
 */
import type { Request, Response } from 'express';
import { connection, rows } from '../../data/database';
import { cookieOptions, token, type SessionLocals } from '../../middleware/session';
import { hashToken, newToken, verifyPassword } from '../../security';
import { fail, text } from '../../validation';

// nome do cookie, limite de tentativas e duracao da sessao
const COOKIE = 'pi2_session';
const MAX_TENTATIVAS = 10;
const JANELA_TENTATIVAS_MS = 60_000;
const HORAS_SESSAO = 12;
const HORAS_SESSAO_LEMBRAR = 168; // 7 dias

// tentativas de login por ip e e-mail
const attempts = new Map<string, { count: number; until: number }>();

// funcao que valida e-mail, senha e lembrar
function validarCredenciais(body: any) {
  const email = text(body?.email, 'E-mail', 3, 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'E-mail inválido.');

  const password = typeof body?.senha === 'string' ? body.senha : '';
  if (!password || password.length > 256) fail(400, 'Informe a senha (até 256 caracteres).');

  if (body?.lembrar !== undefined && typeof body.lembrar !== 'boolean') {
    fail(400, 'Opção lembrar inválida.');
  }

  return { email, password, lembrar: Boolean(body.lembrar) };
}

// funcao que conta tentativas e bloqueia apos 10
function registrarTentativa(ip: string | undefined, email: string): string {
  const now = Date.now();
  for (const [k, v] of attempts) {
    if (v.until < now) attempts.delete(k);
  }

  const key = `${ip}:${email}`;
  const attempt = attempts.get(key) || { count: 0, until: now + JANELA_TENTATIVAS_MS };
  if (attempt.count >= MAX_TENTATIVAS) fail(429, 'Muitas tentativas. Aguarde um minuto.');

  attempt.count++;
  attempts.set(key, attempt);
  return key;
}

// funcao de login
export async function login(req: Request, res: Response) { // FLUXO:ENTRAR 5/5 funcao
  const { email, password, lembrar } = validarCredenciais(req.body);
  const key = registrarTentativa(req.ip, email);

  return connection(async c => {
    const [user] = await rows(
      c,
      `SELECT id_usuario "id", nome "nome", email "email", perfil "perfil", senha "senha"
         FROM usuarios
        WHERE LOWER(email) = :email`,
      { email },
    );
    if (!user || !verifyPassword(password, user.senha)) fail(401, 'E-mail ou senha inválidos.');

    // cria o token; o banco guarda so o hash
    const raw = newToken();
    const hours = lembrar ? HORAS_SESSAO_LEMBRAR : HORAS_SESSAO;

    // apaga sessoes vencidas e a sessao anterior
    await c.execute('DELETE FROM sessoes WHERE expira_em < CURRENT_TIMESTAMP');

    const previous = token(req);
    if (previous) {
      await c.execute('DELETE FROM sessoes WHERE token_hash = :token', { token: hashToken(previous) });
    }

    await c.execute(
      `INSERT INTO sessoes (token_hash, id_usuario, expira_em)
       VALUES (:token, :usuario, CURRENT_TIMESTAMP + NUMTODSINTERVAL(:horas, 'HOUR'))`,
      { token: hashToken(raw), usuario: user.id, horas: hours },
    );
    await c.commit();
    attempts.delete(key);

    // cookie da sessao (com lembrar dura 7 dias)
    res.cookie(COOKIE, raw, {
      ...cookieOptions,
      ...(lembrar ? { maxAge: hours * 3_600_000 } : {}),
    });

    // devolve o usuario sem a senha
    const { senha, ...publicUser } = user;
    return res.json({ mensagem: 'Login realizado com sucesso.', usuario: publicUser });
  });
}

// funcao que devolve o usuario da sessao
export function getSession(_req: Request, res: Response<unknown, SessionLocals>) { // FLUXO:SESSAO 4/4 funcao
  return res.json({ usuario: res.locals.usuario });
}

// funcao de logout
export async function logout(_req: Request, res: Response<unknown, SessionLocals>) { // FLUXO:SAIR 5/5 funcao
  // apaga a sessao no banco
  await connection(async c => {
    await c.execute('DELETE FROM sessoes WHERE token_hash = :token', { token: res.locals.sessionHash });
    await c.commit();
  });

  res.clearCookie(COOKIE, cookieOptions);
  return res.json({ mensagem: 'Sessão encerrada.' });
}
