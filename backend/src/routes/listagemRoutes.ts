/* Autor original: Leonardo Gambaroni Alves */
import { Router } from 'express';
import { listDemands } from '../controllers/listagemController';

const router = Router();
// Filtros e ordenação chegam pela query de GET /demandas.
router.get('/demandas', listDemands);
export default router;
