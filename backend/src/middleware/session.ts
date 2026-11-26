/* Integração original da API: Vinicius Zorzetto.
 * Responsável pela apresentação: Luiz Gustavo Urias Vieira.
 */

import type { NextFunction, Request, Response } from 'express';
import { connection, rows } from '../data/database';
import type { User } from '../rules';
import { hashToken } from '../security';
import { fail } from '../validation';

export interface SessionLocals {
  usuario: User;
  sessionHash: string;
}

export function token(req: Request): string {
  const cookies = (req.headers.cookie || '').split(';').map(s => s.trim());
  return cookies.find(s => s.startsWith('pi2_session='))?.slice('pi2_session='.length) || '';
}
export const cookieOptions = {httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/'};

// Consulta o hash do cookie no Oracle e entrega o usuário aos controladores.
export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const raw = token(req);
  if (!/^[a-f0-9]{64}$/.test(raw)) { res.status(401).json({mensagem: 'Entre no sistema para continuar.'}); return; }
  const sessionHash = hashToken(raw);
  await connection(async c => {
    const [user] = await rows<User>(c, `SELECT u.id_usuario "id", u.nome "nome", u.email "email", u.perfil "perfil"
      FROM sessoes s JOIN usuarios u ON u.id_usuario = s.id_usuario
      WHERE s.token_hash = :token AND s.expira_em > CURRENT_TIMESTAMP`, {token: sessionHash});
    if (!user) fail(401, 'Sessão expirada. Entre novamente.');
    res.locals.usuario = user;
    res.locals.sessionHash = sessionHash;
  });
  next();
}
