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
    listarHistorico,
    listarResponsaveis,
    atualizarDemanda,
    atualizarStatus,
} from "../controllers/detalhesDemandaController";

const router = Router();

router.get("/demandas/:id", getDemandaPorId);
router.get("/demandas/:id/comentarios", listarComentarios);
router.get("/demandas/:id/historico", listarHistorico);
router.get("/demandas/:id/responsaveis", listarResponsaveis);

router.post("/demandas/:id/comentarios", criarComentario);
router.put("/demandas/:id", atualizarDemanda);
router.patch("/demandas/:id/status", atualizarStatus);

export default router;