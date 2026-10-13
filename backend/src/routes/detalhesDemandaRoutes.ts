/**
 * Autor: João Pedro Silveira de Souza
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Registro das rotas da tela de Detalhes de Demanda
 */

import { Router } from "express";
import {
    getDemandaPorId,
    listarComentarios,
    criarComentario,
} from "../controllers/detalhesDemandaController";

const router = Router();

router.get("/demandas/:id", getDemandaPorId);
router.get("/demandas/:id/comentarios", listarComentarios);
router.post("/demandas/:id/comentarios", criarComentario);

export default router;
