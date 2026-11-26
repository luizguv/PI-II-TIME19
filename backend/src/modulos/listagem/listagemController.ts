/* Autor: Leonardo Gambaroni Alves */
import type { Request, Response } from 'express';
import type { SessionLocals } from '../../middleware/session';
import { connection, rows } from '../../data/database';
import { demandSelect } from '../../demand-service';
import { ADMIN, statuses, priorities, types } from '../../rules';
import { choice, fail, id, text } from '../../validation';

// Filtros por opção fixa: [parâmetro da query, coluna, valores aceitos].
const FILTROS_OPCAO = [
  ['status', 'd.status', statuses],
  ['prioridade', 'd.prioridade', priorities],
  ['tipo', 'd.tipo_demanda', types],
] as const;

// Filtros por ID: [parâmetro da query, coluna].
const FILTROS_ID = [
  ['projetoId', 'd.id_projeto'],
  ['responsavelId', 'd.id_responsavel'],
] as const;

// A chave recebida seleciona uma expressão SQL de uma lista fechada.
const ORDENACOES: Record<string, string> = {
  dataCriacao: 'd.data_criacao DESC',
  titulo: 'LOWER(d.titulo)',
  prazoFinalizacao: 'd.prazo_finalizacao NULLS LAST',
  prioridade: "CASE d.prioridade WHEN 'Crítica' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Média' THEN 3 ELSE 4 END",
  status: `CASE LOWER(d.status)
             WHEN 'aberta' THEN 1
             WHEN 'em andamento' THEN 2
             WHEN 'em revisão' THEN 3
             WHEN 'concluída' THEN 4
             ELSE 5
           END`,
};

export async function listDemands(req: Request, res: Response<unknown, SessionLocals>) {
  const { usuario } = res.locals;
  const where: string[] = [];
  const binds: Record<string, unknown> = {};

  // Os demais perfis só enxergam demandas dos projetos em que participam.
  if (usuario.perfil !== ADMIN) {
    where.push(
      'EXISTS (SELECT 1 FROM projeto_usuarios pu WHERE pu.id_projeto = d.id_projeto AND pu.id_usuario = :usuario)',
    );
    binds.usuario = usuario.id;
  }

  for (const [key, column, values] of FILTROS_OPCAO) {
    const value = req.query[key];
    if (value) {
      where.push(`LOWER(${column}) = LOWER(:${key})`);
      binds[key] = choice(value, [...values], key);
    }
  }

  for (const [key, column] of FILTROS_ID) {
    if (req.query[key]) {
      where.push(`${column} = :${key}`);
      binds[key] = id(req.query[key]);
    }
  }

  if (req.query.busca) {
    // Escapa os curingas do LIKE para buscar o texto literal.
    const search = text(req.query.busca, 'Busca', 1, 150)
      .toLowerCase()
      .replace(/[\\%_]/g, '\\$&');
    where.push("(LOWER(d.titulo) LIKE :busca ESCAPE '\\' OR LOWER(d.descricao) LIKE :busca ESCAPE '\\')");
    binds.busca = `%${search}%`;
  }

  const order = req.query.ordenarPor || 'dataCriacao';
  if (typeof order !== 'string' || !Object.prototype.hasOwnProperty.call(ORDENACOES, order)) {
    fail(400, 'Ordenação inválida.');
  }

  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const sql = `${demandSelect}${whereSql} ORDER BY ${ORDENACOES[order]}, d.id_demanda`;

  return connection(async c => {
    const result = await rows(c, sql, binds);
    return res.json({ sucesso: true, total: result.length, demandas: result });
  });
}
