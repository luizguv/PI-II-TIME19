/* Autor da integração original: Vinicius Zorzetto — RA:24008052
 * Responsável pela apresentação: Luiz Gustavo Urias Vieira.
 */
import { Router } from 'express';
import { loginRoutes, sessionRoutes } from './routes/authRoutes';
import { requireSession } from './middleware/session';
import cadastroRoutes from './routes/cadastroRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import detalhesRoutes from './routes/detalhesDemandaRoutes';
import listagemRoutes from './routes/listagemRoutes';

export const api = Router();

// O login vem antes do middleware. As demais rotas exigem uma sessão válida.
api.use(loginRoutes);
api.use(requireSession);
api.use(sessionRoutes);
api.use(cadastroRoutes);
api.use(listagemRoutes);
api.use(dashboardRoutes);
api.use(detalhesRoutes);
