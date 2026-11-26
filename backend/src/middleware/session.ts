/* Autor: Luiz Gustavo Urias Vieira */

import type { NextFunction, Request, Response } from 'express';
import { connection, rows } from '../data/database';
import type { User } from '../rules';
import { hashToken } from '../security';
import { fail } from '../validation';

// nome do cookie da sessao
const COOKIE = 'pi2_session';

// dados da sessao guardados em res.locals
export interface SessionLocals {
  usuario: User;
  sessionHash: string;
}

// funcao que le o token do cookie
export function token(req: Request): string {
  const cookies = (req.headers.cookie || '').split(';').map(s => s.trim());
  const prefixo = `${COOKIE}=`;
  return cookies.find(s => s.startsWith(prefixo))?.slice(prefixo.length) || '';
}

// opcoes do cookie da sessao
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

// funcao que confere a sessao e carrega o usuario
export async function requireSession(req: Request, res: Response, next: NextFunction) { // FLUXO:SESSAO 2/4 confere o cookie
  const raw = token(req);
  // token em formato invalido
  if (!/^[a-f0-9]{64}$/.test(raw)) {
    res.status(401).json({ mensagem: 'Entre no sistema para continuar.' });
    return;
  }

  // busca a sessao pelo hash do token
  const sessionHash = hashToken(raw);

  await connection(async c => {
    const [user] = await rows<User>(
      c,
      `SELECT u.id_usuario "id", u.nome "nome", u.email "email", u.perfil "perfil"
         FROM sessoes s
         JOIN usuarios u ON u.id_usuario = s.id_usuario
        WHERE s.token_hash = :token
          AND s.expira_em > CURRENT_TIMESTAMP`,
      { token: sessionHash },
    );
    if (!user) fail(401, 'Sessão expirada. Entre novamente.');

    res.locals.usuario = user;
    res.locals.sessionHash = sessionHash;
  });

  next();
}
