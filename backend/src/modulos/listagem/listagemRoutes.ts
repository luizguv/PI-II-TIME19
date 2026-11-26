/* Autor original: Leonardo Gambaroni Alves */
import { Router } from 'express';
import { listDemands } from './listagemController';

const router = Router();
// rota da listagem (filtros na query)
router.get('/demandas', listDemands); // FLUXO:LISTAGEM 4/5 rota
export default router;
