/*
 * Autor: Leonardo Gambaroni Alves
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Rota GET /demandas da Listagem de Demandas integrada ao Oracle,
 *            com filtros, busca textual, ordenação inteligente e controle de acesso por projeto.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { connection, rows } from '../data/database';
import { ADMIN, User, statuses, priorities, types } from '../rules';
import { fail, id, text, choice } from '../validation';
import { demandSelect } from '../demand-service';

const router = Router();

/**
 * Lista as demandas acessíveis ao usuário autenticado com suporte a
 * filtros (status, prioridade, tipo, projetoId, responsavelId),
 * busca textual em título/descrição e ordenação segura.
 */
export async function listDemands(req: Request, res: Response) {
  // Recupera o usuário autenticado preenchido pelo middleware de sessão.
  const usuario =
    (req as Request & { usuario?: User }).usuario ??
    (res.locals.usuario as User | undefined);

  if (!usuario) {
    return fail(401, 'Entre no sistema para continuar.');
  }

  return connection(async c => {
    const where: string[] = [];
    const binds: Record<string, string | number> = {};

    // Perfis diferentes de Administrador visualizam apenas demandas dos projetos vinculados.
    if (usuario.perfil !== ADMIN) {
      where.push(
        'EXISTS (SELECT 1 FROM projeto_usuarios pu WHERE pu.id_projeto = d.id_projeto AND pu.id_usuario = :usuario)'
      );
      binds.usuario = usuario.id;
    }

    // Valida e aplica os filtros de domínio fechado (status, prioridade e tipo).
    const filtrosDominio = [
      ['status', 'd.status', statuses],
      ['prioridade', 'd.prioridade', priorities],
      ['tipo', 'd.tipo_demanda', types],
    ] as const;

    for (const [key, column, values] of filtrosDominio) {
      const value = req.query[key];
      if (value) {
        const normalized = choice(value, [...values], key);
        where.push(`LOWER(${column}) = LOWER(:${key})`);
        binds[key] = normalized;
      }
    }

    // Valida e aplica os filtros numéricos por projeto e por responsável.
    const filtrosNumericos = [
      ['projetoId', 'd.id_projeto'],
      ['responsavelId', 'd.id_responsavel'],
    ] as const;

    for (const [key, column] of filtrosNumericos) {
      if (req.query[key]) {
        where.push(`${column} = :${key}`);
        binds[key] = id(req.query[key]);
      }
    }

    // Aplica busca textual case-insensitive em título ou descrição com escape de curingas LIKE.
    if (req.query.busca) {
      const search = text(req.query.busca, 'Busca', 1, 150)
        .toLowerCase()
        .replace(/[\\%_]/g, '\\$&');
      where.push(
        "(LOWER(d.titulo) LIKE :busca ESCAPE '\\' OR LOWER(d.descricao) LIKE :busca ESCAPE '\\')"
      );
      binds.busca = `%${search}%`;
    }

    // Mapeia a ordenação permitida por lista fechada para evitar injeção em ORDER BY.
    const orders: Record<string, string> = {
      dataCriacao: 'd.data_criacao DESC',
      titulo: 'LOWER(d.titulo)',
      prazoFinalizacao: 'd.prazo_finalizacao NULLS LAST',
      prioridade:
        "CASE d.prioridade WHEN 'Crítica' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Média' THEN 3 ELSE 4 END",
      status:
        "CASE LOWER(d.status) WHEN 'aberta' THEN 1 WHEN 'em andamento' THEN 2 WHEN 'em revisão' THEN 3 WHEN 'concluída' THEN 4 ELSE 5 END",
    };

    const order = req.query.ordenarPor || 'dataCriacao';
    if (
      typeof order !== 'string' ||
      !Object.prototype.hasOwnProperty.call(orders, order)
    ) {
      return fail(400, 'Ordenação inválida.');
    }

    // Monta a consulta final com binds parametrizados e executa no Oracle.
    const sql =
      demandSelect +
      (where.length ? ' WHERE ' + where.join(' AND ') : '') +
      ` ORDER BY ${orders[order]}, d.id_demanda`;

    const result = await rows(c, sql, binds);

    return res.json({
      sucesso: true,
      total: result.length,
      demandas: result,
    });
  });
}

// Registra a rota GET /demandas encaminhando eventuais erros para o middleware global do Express.
router.get('/demandas', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(listDemands(req, res)).catch(next);
});

export default router;
