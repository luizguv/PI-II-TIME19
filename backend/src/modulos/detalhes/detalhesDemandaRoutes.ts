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
} from "./detalhesDemandaController";

const router = Router();

// As leituras usam o ID recebido no link da listagem.
router.get("/demandas/:id", getDemandaPorId); // FLUXO:VER-DETALHES 4/5 rota
router.get("/demandas/:id/comentarios", listarComentarios); // FLUXO:LISTAR-COMENTARIOS 2/3 rota
router.get("/demandas/:id/historico", listarHistorico); // FLUXO:HISTORICO 2/3 rota
router.get("/demandas/:id/responsaveis", listarResponsaveis); // FLUXO:EDITAR-ABRIR 4/5 rota

// A tela pode comentar, editar campos ou enviar só o novo status.
router.post("/demandas/:id/comentarios", criarComentario); // FLUXO:ENVIAR-COMENTARIO 4/5 rota
router.put("/demandas/:id", atualizarDemanda); // FLUXO:SALVAR-ALTERACOES 4/6 rota
router.patch("/demandas/:id/status", atualizarStatus); // FLUXO:ATUALIZAR-STATUS 4/7 rota

export default router;