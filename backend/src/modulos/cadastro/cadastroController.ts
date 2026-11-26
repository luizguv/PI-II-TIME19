/* Cadastro extraído da integração original da API de Vinicius Zorzetto. */
import type { Request, Response } from 'express';
import type { SessionLocals } from '../../middleware/session';
import { connection, rows, insertId } from '../../data/database';
import { audit, checkDeadline, checkResponsible, demand, projectAccess } from '../../demand-service';
import { holidays } from '../../holidays';
import { ADMIN, MEMBER, priorities, types } from '../../rules';
import { choice, fail, id, text } from '../../validation';

// funcao que lista os projetos do usuario
export async function listProjects(_req: Request, res: Response<unknown, SessionLocals>) { // FLUXO:CARREGAR-PROJETOS 4/4 funcao
  const { usuario } = res.locals;
  const isAdmin = usuario.perfil === ADMIN;

  // admin ve todos; os outros so os seus
  const filtro = isAdmin
    ? ''
    : `WHERE EXISTS (SELECT 1 FROM projeto_usuarios pu
                      WHERE pu.id_projeto = p.id_projeto AND pu.id_usuario = :usuario)`;

  return connection(async c => {
    const data = await rows(
      c,
      `SELECT p.id_projeto "id", p.nome "nome" FROM projetos p ${filtro} ORDER BY p.nome`,
      isAdmin ? {} : { usuario: usuario.id },
    );
    return res.json({ projetos: data });
  });
}

// funcao que lista os usuarios de um projeto
export async function listProjectUsers(req: Request, res: Response<unknown, SessionLocals>) { // FLUXO:ESCOLHER-PROJETO 5/5 funcao
  const { usuario } = res.locals;

  return connection(async c => {
    const project = id(req.query.projetoId);
    await projectAccess(c, project, usuario);

    const data = await rows(
      c,
      `SELECT u.id_usuario "id", u.nome "nome", u.perfil "perfil"
         FROM usuarios u
         JOIN projeto_usuarios pu ON pu.id_usuario = u.id_usuario
        WHERE pu.id_projeto = :projeto
        ORDER BY u.nome`,
      { projeto: project },
    );
    return res.json({ usuarios: data });
  });
}

// funcao que lista os feriados do ano
export async function listHolidays(req: Request, res: Response) { // FLUXO:FERIADOS 5/6 funcao
  return res.json({ feriados: await holidays(Number(req.params.ano)) });
}

// funcao que cadastra uma demanda
export async function createDemand(req: Request, res: Response<unknown, SessionLocals>) { // FLUXO:CADASTRAR-DEMANDA 5/6 funcao
  const { usuario } = res.locals;
  const b = req.body || {};

  // valida os campos
  const title = text(b.titulo, 'Título', 3, 150);
  const description = text(b.descricao, 'Descrição', 10, 2000);
  const type = choice(b.tipo, types, 'Tipo');
  const priority = choice(b.prioridade, priorities, 'Prioridade');
  const project = id(b.projetoId);
  const responsible = b.responsavelId == null || b.responsavelId === '' ? null : id(b.responsavelId);

  // regras do cadastro
  if (b.status !== undefined && b.status !== 'Aberta') {
    fail(400, 'Novas demandas devem ter status Aberta.');
  }
  if (usuario.perfil === MEMBER && responsible !== null) {
    fail(403, 'Membros não podem atribuir responsáveis.');
  }

  // valida o prazo
  const deadline = b.prazoFinalizacao ?? null;
  await checkDeadline(deadline);

  return connection(async c => {
    await projectAccess(c, project, usuario);
    await checkResponsible(c, responsible, project);

    // grava a demanda
    const newId = await insertId(
      c,
      `INSERT INTO demandas (titulo, descricao, tipo_demanda, prioridade, id_projeto, id_responsavel, prazo_finalizacao)
       VALUES (:titulo, :descricao, :tipo, :prioridade, :projeto, :responsavel, TO_DATE(:prazo, 'YYYY-MM-DD'))
       RETURNING id_demanda INTO :newId`,
      {
        titulo: title,
        descricao: description,
        tipo: type,
        prioridade: priority,
        projeto: project,
        responsavel: responsible,
        prazo: deadline,
      },
    );

    // grava o historico e confirma
    await audit(c, newId, usuario, 'criação', null, 'Aberta');
    const result = await demand(c, newId, usuario);
    await c.commit();

    return res.status(201).json(result);
  });
}
