/* Autor original: Equipe
 * Integração: Vinicius Zorzetto — RA:24008052
 */
import type { Request, Response } from 'express';
import { connection, rows } from '../../data/database';
import { cookieOptions, token, type SessionLocals } from '../../middleware/session';
import { hashToken, newToken, verifyPassword } from '../../security';
import { fail, text } from '../../validation';

const COOKIE = 'pi2_session';
const MAX_TENTATIVAS = 10;
const JANELA_TENTATIVAS_MS = 60_000;
const HORAS_SESSAO = 12;
const HORAS_SESSAO_LEMBRAR = 168; // 7 dias

// Tentativas limitadas por endereço e e-mail; entradas antigas são removidas para limitar memória.
const attempts = new Map<string, { count: number; until: number }>();

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

// Conta a tentativa e bloqueia após o limite. Retorna a chave para limpar em caso de sucesso.
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

export async function login(req: Request, res: Response) {
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

    // O navegador recebe o token bruto; o Oracle guarda apenas seu hash.
    const raw = newToken();
    const hours = lembrar ? HORAS_SESSAO_LEMBRAR : HORAS_SESSAO;

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

    // Sem "lembrar", o cookie é de sessão e some ao fechar o navegador.
    res.cookie(COOKIE, raw, {
      ...cookieOptions,
      ...(lembrar ? { maxAge: hours * 3_600_000 } : {}),
    });

    const { senha, ...publicUser } = user;
    return res.json({ mensagem: 'Login realizado com sucesso.', usuario: publicUser });
  });
}

export function getSession(_req: Request, res: Response<unknown, SessionLocals>) {
  return res.json({ usuario: res.locals.usuario });
}

export async function logout(_req: Request, res: Response<unknown, SessionLocals>) {
  // Apaga a sessão no Oracle para invalidar o token mesmo se o cookie for reapresentado.
  await connection(async c => {
    await c.execute('DELETE FROM sessoes WHERE token_hash = :token', { token: res.locals.sessionHash });
    await c.commit();
  });

  res.clearCookie(COOKIE, cookieOptions);
  return res.json({ mensagem: 'Sessão encerrada.' });
}
