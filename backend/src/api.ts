/* Autor: Luiz Gustavo Urias Vieira */
import { Router } from 'express';
import { loginRoutes, sessionRoutes } from './modulos/auth/authRoutes';
import { requireSession } from './middleware/session';
import cadastroRoutes from './modulos/cadastro/cadastroRoutes';
import dashboardRoutes from './modulos/dashboard/dashboardRoutes';
import detalhesRoutes from './modulos/detalhes/detalhesDemandaRoutes';
import listagemRoutes from './modulos/listagem/listagemRoutes';

export const api = Router();

// O login vem antes do middleware. As demais rotas exigem uma sessão válida.
api.use(loginRoutes);
api.use(requireSession);
api.use(sessionRoutes);
api.use(cadastroRoutes);
api.use(listagemRoutes);
api.use(dashboardRoutes);
api.use(detalhesRoutes);
