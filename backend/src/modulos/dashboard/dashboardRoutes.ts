/* Autor original: Caio Peccinato */
import { Router } from 'express';
import { getDashboard } from './dashboardController';

const router = Router();
// rota do dashboard
router.get('/dashboard', getDashboard); // FLUXO:DASHBOARD 3/4 rota
export default router;
