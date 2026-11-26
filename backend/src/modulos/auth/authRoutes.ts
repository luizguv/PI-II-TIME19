/* Autor original: Equipe
 * Integração: Vinicius Zorzetto — RA:24008052
 */
import { Router } from 'express';
import { login, getSession, logout } from './authController';

export const loginRoutes = Router();
loginRoutes.post('/login', login); // FLUXO:ENTRAR 4/5 rota

// Montadas após a validação do cookie em api.ts.
export const sessionRoutes = Router();
sessionRoutes.get('/sessao', getSession); // FLUXO:SESSAO 3/4 rota
sessionRoutes.post('/logout', logout); // FLUXO:SAIR 4/5 rota
