/* Rotas extraídas da integração original da API de Vinicius Zorzetto. */
import { Router } from 'express';
import { createDemand, listHolidays, listProjects, listProjectUsers } from './cadastroController';

const router = Router();
// rotas da tela de cadastro
router.get('/projetos', listProjects); // FLUXO:CARREGAR-PROJETOS 3/4 rota
router.get('/usuarios', listProjectUsers); // FLUXO:ESCOLHER-PROJETO 4/5 rota
router.get('/feriados/:ano', listHolidays); // FLUXO:FERIADOS 4/6 rota
router.post('/demandas', createDemand); // FLUXO:CADASTRAR-DEMANDA 4/6 rota
export default router;
