/* Autor: Luiz Gustavo Urias Vieira */
import { Router } from 'express';
import { loginRoutes, sessionRoutes } from './modulos/auth/authRoutes';
import { requireSession } from './middleware/session';
import cadastroRoutes from './modulos/cadastro/cadastroRoutes';
import dashboardRoutes from './modulos/dashboard/dashboardRoutes';
import detalhesRoutes from './modulos/detalhes/detalhesDemandaRoutes';
import listagemRoutes from './modulos/listagem/listagemRoutes';

// roteador principal da api
export const api = Router();

// login fica antes da conferencia de sessao; as outras rotas exigem sessao
api.use(loginRoutes);
api.use(requireSession);
api.use(sessionRoutes);
api.use(cadastroRoutes);
api.use(listagemRoutes);
api.use(dashboardRoutes);
api.use(detalhesRoutes);
