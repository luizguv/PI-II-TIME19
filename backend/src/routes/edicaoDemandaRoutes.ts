/*
  Autor: Luiz Gustavo Urias Vieira
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Registro das rotas de Edição de Demanda
*/

import { Router } from "express";
import { atualizarDemanda } from "../controllers/edicaoDemandaController";

const router = Router();

router.put("/demandas/:id", atualizarDemanda);

export default router;