/* Autor original: Leonardo Gambaroni Alves */
import { Router } from 'express';
import { listDemands } from './listagemController';

const router = Router();
// Filtros e ordenação chegam pela query de GET /demandas.
router.get('/demandas', listDemands); // FLUXO:LISTAGEM 4/5 rota
export default router;
