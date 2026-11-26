/* Rotas extraídas da integração original da API de Vinicius Zorzetto. */
import { Router } from 'express';
import { createDemand, listHolidays, listProjects, listProjectUsers } from './cadastroController';

const router = Router();
// Opções do formulário, aviso de feriado e gravação da nova demanda.
router.get('/projetos', listProjects);
router.get('/usuarios', listProjectUsers);
router.get('/feriados/:ano', listHolidays);
router.post('/demandas', createDemand);
export default router;
