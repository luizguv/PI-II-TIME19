/* Autor original: Equipe
 * Integração: Vinicius Zorzetto — RA:24008052
 */
import { Router } from 'express';
import { login, getSession, logout } from '../controllers/authController';

export const loginRoutes = Router();
loginRoutes.post('/login', login);

// Montadas após a validação do cookie em api.ts.
export const sessionRoutes = Router();
sessionRoutes.get('/sessao', getSession);
sessionRoutes.post('/logout', logout);
