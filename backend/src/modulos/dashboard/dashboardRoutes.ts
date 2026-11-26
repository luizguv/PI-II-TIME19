/* Autor original: Caio Peccinato */
import { Router } from 'express';
import { getDashboard } from './dashboardController';

const router = Router();
// A tela usa esse resumo para preencher cartões e gráficos.
router.get('/dashboard', getDashboard);
export default router;
