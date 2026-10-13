/**
 * Autor: Caio Peccinato
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Registro das rotas do dashboard
 */

import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController";

const router = Router();

router.get("/dashboard", getDashboard);

export default router;
