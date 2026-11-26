/* Autor original: Equipe
 * Integração: Vinicius Zorzetto — RA:24008052
 */
import { Router } from 'express';
import { login, getSession, logout } from './authController';

// rota de login (sem sessao)
export const loginRoutes = Router();
loginRoutes.post('/login', login); // FLUXO:ENTRAR 4/5 rota

// rotas que exigem sessao
export const sessionRoutes = Router();
sessionRoutes.get('/sessao', getSession); // FLUXO:SESSAO 3/4 rota
sessionRoutes.post('/logout', logout); // FLUXO:SAIR 4/5 rota
