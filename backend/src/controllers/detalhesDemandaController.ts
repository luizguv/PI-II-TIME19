/*
 * Autor: João Pedro Silveira de Souza
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Controllers simples da tela de detalhes de demanda.
 * A API externa de feriados será adicionada depois. A autenticação deve preencher res.locals.usuario.
 */

import { Request, Response } from "express";
import oracledb from "oracledb";
import { getConn } from "../data/conexao";

type Perfil = "Administrador" | "Líder de Projeto" | "Membro da Equipe";
type Status = "Aberta" | "Em andamento" | "Em revisão" | "Concluída" | "Cancelada";

const STATUS: Status[] = ["Aberta", "Em andamento", "Em revisão", "Concluída", "Cancelada"];
const TIPOS = ["Tarefa", "Defeito", "Melhoria", "Documentação"];
const PRIORIDADES = ["Crítica", "Alta", "Média", "Baixa"];
const FORMATO_DATA = `'YYYY-MM-DD"T"HH24:MI:SS'`;

type Usuario = { id: number; nome: string; perfil: Perfil };

function responderErro(res: Response, status: number, mensagem: string) {
  return res.status(status).json({ mensagem });
}

function idValido(valor: string) {
  return /^\d+$/.test(valor) && Number(valor) > 0;
}

function usuarioAtual(res: Response): Usuario | null {
  const usuario = res.locals.usuario as Usuario | undefined;
  if (!usuario || !usuario.id || !usuario.nome || !usuario.perfil) return null;
  return usuario;
}

function normalizarStatus(valor: unknown): Status | null {
  if (typeof valor !== "string") return null;
  return STATUS.find((status) => status.toLowerCase() === valor.trim().toLowerCase()) || null;
}

function statusBanco(status: Status) {
  if (status === "Em andamento") return "Em Andamento";
  if (status === "Em revisão") return "Em Revisão";
  return status;
}

function statusTela(status: string): Status {
  if (status === "Em Andamento") return "Em andamento";
  if (status === "Em Revisão") return "Em revisão";
  return status as Status;
}

function transicoes(perfil: Perfil, atual: Status, responsavel: boolean): Status[] {
  if (atual === "Concluída" || atual === "Cancelada") return [];
  if (perfil === "Membro da Equipe") {
    if (!responsavel) return [];
    if (atual === "Aberta") return ["Em andamento"];
    if (atual === "Em andamento") return ["Em revisão"];
    return [];
  }
  if (atual === "Aberta") return ["Em andamento", "Cancelada"];
  if (atual === "Em andamento") return ["Em revisão", "Cancelada"];
  return ["Em andamento", "Concluída", "Cancelada"];
}

async function demandaPorId(conn: oracledb.Connection, id: number) {
  const resultado = await conn.execute<any>(
    `SELECT d.id_demanda, d.titulo, d.descricao, d.tipo_demanda, d.prioridade, d.status,
            d.id_projeto, p.nome projeto_nome, d.id_responsavel, u.nome responsavel_nome,
            TO_CHAR(d.data_criacao, ${FORMATO_DATA}) data_criacao,
            TO_CHAR(d.data_atualizacao, ${FORMATO_DATA}) data_atualizacao,
            TO_CHAR(d.prazo_finalizacao, 'YYYY-MM-DD') prazo_finalizacao
       FROM demandas d
       JOIN projetos p ON p.id_projeto = d.id_projeto
       LEFT JOIN usuarios u ON u.id_usuario = d.id_responsavel
      WHERE d.id_demanda = :id`,
    { id }
  );
  return resultado.rows?.[0] || null;
}

async function podeAcessar(conn: oracledb.Connection, usuario: Usuario, projetoId: number) {
  if (usuario.perfil === "Administrador") return true;
  const resultado = await conn.execute(
    `SELECT 1 FROM projeto_usuarios WHERE id_projeto = :projeto AND id_usuario = :usuario`,
    { projeto: projetoId, usuario: usuario.id }
  );
  return (resultado.rows?.length || 0) > 0;
}

function respostaDemanda(linha: any, usuario: Usuario) {
  const status = statusTela(linha.STATUS);
  const ehResponsavel = linha.ID_RESPONSAVEL === usuario.id;
  return {
    id: linha.ID_DEMANDA,
    titulo: linha.TITULO,
    descricao: linha.DESCRICAO,
    tipo: linha.TIPO_DEMANDA,
    prioridade: linha.PRIORIDADE,
    status,
    projetoId: linha.ID_PROJETO,
    projetoNome: linha.PROJETO_NOME,
    responsavelId: linha.ID_RESPONSAVEL,
    responsavelNome: linha.RESPONSAVEL_NOME,
    dataCriacao: linha.DATA_CRIACAO,
    dataUltimaAtualizacao: linha.DATA_ATUALIZACAO,
    prazoFinalizacao: linha.PRAZO_FINALIZACAO,
    permissoes: {
      podeEditar: usuario.perfil !== "Membro da Equipe" && status !== "Concluída" && status !== "Cancelada",
      transicoesPermitidas: transicoes(usuario.perfil, status, ehResponsavel)
    }
  };
}

async function registrarHistorico(conn: oracledb.Connection, demanda: number, usuario: number, descricao: string) {
  await conn.execute(
    `INSERT INTO historico_alteracoes (id_demanda, id_usuario, descricao)
     VALUES (:demanda, :usuario, :descricao)`,
    { demanda, usuario, descricao: descricao.slice(0, 500) }
  );
}

async function contexto(req: Request, res: Response) {
  const usuario = usuarioAtual(res);
  const idTexto = String(req.params.id);
  const id = Number(idTexto);
  if (!usuario) return { erro: [401, "Usuário não autenticado."] as const };
  if (!idValido(idTexto)) return { erro: [400, "Id da demanda inválido."] as const };

  const conn = await getConn();
  const demanda = await demandaPorId(conn, id);
  if (!demanda) {
    await conn.close();
    return { erro: [404, "Demanda não encontrada."] as const };
  }
  if (!(await podeAcessar(conn, usuario, demanda.ID_PROJETO))) {
    await conn.close();
    return { erro: [403, "Você não tem acesso a esta demanda."] as const };
  }
  return { conn, id, usuario, demanda };
}

export async function getDemandaPorId(req: Request, res: Response) {
  const dados = await contexto(req, res);
  if (dados.erro) return responderErro(res, dados.erro[0], dados.erro[1]);
  try {
    return res.json(respostaDemanda(dados.demanda, dados.usuario));
  } catch (erro) {
    return responderErro(res, 500, "Não foi possível buscar a demanda.");
  } finally {
    await dados.conn.close();
  }
}

export async function listarComentarios(req: Request, res: Response) {
  const dados = await contexto(req, res);
  if (dados.erro) return responderErro(res, dados.erro[0], dados.erro[1]);
  try {
    const resultado = await dados.conn.execute<any>(
      `SELECT c.id_comentario, c.texto, u.nome usuario_nome,
              TO_CHAR(c.data_comentario, ${FORMATO_DATA}) data_criacao
         FROM comentarios c JOIN usuarios u ON u.id_usuario = c.id_usuario
        WHERE c.id_demanda = :id ORDER BY c.data_comentario DESC`,
      { id: dados.id }
    );
    return res.json({ comentarios: (resultado.rows || []).map((linha: any) => ({
      id: linha.ID_COMENTARIO, texto: linha.TEXTO, usuarioNome: linha.USUARIO_NOME, dataCriacao: linha.DATA_CRIACAO
    })) });
  } catch (erro) {
    return responderErro(res, 500, "Não foi possível listar os comentários.");
  } finally {
    await dados.conn.close();
  }
}

export async function criarComentario(req: Request, res: Response) {
  const dados = await contexto(req, res);
  if (dados.erro) return responderErro(res, dados.erro[0], dados.erro[1]);
  const texto = req.body?.texto?.trim();
  if (!texto || texto.length > 300) {
    await dados.conn.close();
    return responderErro(res, 400, "O comentário deve ter entre 1 e 300 caracteres.");
  }
  try {
    await dados.conn.execute(
      `INSERT INTO comentarios (id_demanda, id_usuario, texto) VALUES (:demanda, :usuario, :texto)`,
      { demanda: dados.id, usuario: dados.usuario.id, texto }
    );
    await dados.conn.commit();
    return res.status(201).json({ mensagem: "Comentário registrado." });
  } catch (erro) {
    await dados.conn.rollback();
    return responderErro(res, 500, "Não foi possível registrar o comentário.");
  } finally {
    await dados.conn.close();
  }
}

export async function listarHistorico(req: Request, res: Response) {
  const dados = await contexto(req, res);
  if (dados.erro) return responderErro(res, dados.erro[0], dados.erro[1]);
  try {
    const resultado = await dados.conn.execute<any>(
      `SELECT h.id_historico, h.descricao, u.nome usuario_nome,
              TO_CHAR(h.data_alteracao, ${FORMATO_DATA}) data_alteracao
         FROM historico_alteracoes h JOIN usuarios u ON u.id_usuario = h.id_usuario
        WHERE h.id_demanda = :id ORDER BY h.data_alteracao DESC`,
      { id: dados.id }
    );
    return res.json({ historico: (resultado.rows || []).map((linha: any) => ({
      id: linha.ID_HISTORICO, descricao: linha.DESCRICAO, usuarioNome: linha.USUARIO_NOME, dataAlteracao: linha.DATA_ALTERACAO
    })) });
  } catch (erro) {
    return responderErro(res, 500, "Não foi possível listar o histórico.");
  } finally {
    await dados.conn.close();
  }
}

export async function listarResponsaveis(req: Request, res: Response) {
  const dados = await contexto(req, res);
  if (dados.erro) return responderErro(res, dados.erro[0], dados.erro[1]);
  if (dados.usuario.perfil === "Membro da Equipe") {
    await dados.conn.close();
    return responderErro(res, 403, "Você não pode alterar o responsável.");
  }
  try {
    const resultado = await dados.conn.execute<any>(
      `SELECT u.id_usuario, u.nome
         FROM usuarios u JOIN projeto_usuarios pu ON pu.id_usuario = u.id_usuario
        WHERE pu.id_projeto = :projeto ORDER BY u.nome`,
      { projeto: dados.demanda.ID_PROJETO }
    );
    return res.json({ responsaveis: (resultado.rows || []).map((linha: any) => ({
      id: linha.ID_USUARIO, nome: linha.NOME
    })) });
  } catch (erro) {
    return responderErro(res, 500, "Não foi possível listar os responsáveis.");
  } finally {
    await dados.conn.close();
  }
}

export async function atualizarDemanda(req: Request, res: Response) {
  const dados = await contexto(req, res);
  if (dados.erro) return responderErro(res, dados.erro[0], dados.erro[1]);
  const corpo = req.body || {};
  const podeEditar = dados.usuario.perfil !== "Membro da Equipe" && !["Concluída", "Cancelada"].includes(statusTela(dados.demanda.STATUS));
  if (!podeEditar) {
    await dados.conn.close();
    return responderErro(res, 403, "Você não pode editar esta demanda.");
  }
  if (!corpo.titulo?.trim() || corpo.titulo.trim().length > 150 || !corpo.descricao?.trim() || corpo.descricao.trim().length > 500) {
    await dados.conn.close();
    return responderErro(res, 400, "Título ou descrição inválidos.");
  }
  if (!TIPOS.includes(corpo.tipo) || !PRIORIDADES.includes(corpo.prioridade) || !/^\d{4}-\d{2}-\d{2}$/.test(corpo.prazoFinalizacao || "")) {
    await dados.conn.close();
    return responderErro(res, 400, "Tipo, prioridade ou prazo inválidos.");
  }

  try {
    const responsavel = corpo.responsavelId ? Number(corpo.responsavelId) : null;
    if (responsavel) {
      const vinculo = await dados.conn.execute(
        `SELECT 1 FROM projeto_usuarios WHERE id_projeto = :projeto AND id_usuario = :usuario`,
        { projeto: dados.demanda.ID_PROJETO, usuario: responsavel }
      );
      if (!(vinculo.rows?.length || 0)) {
        return responderErro(res, 400, "O responsável precisa pertencer ao projeto.");
      }
    }
    await dados.conn.execute(
      `UPDATE demandas SET titulo = :titulo, descricao = :descricao, tipo_demanda = :tipo,
              prioridade = :prioridade, id_responsavel = :responsavel,
              prazo_finalizacao = TO_DATE(:prazo, 'YYYY-MM-DD'), data_atualizacao = CURRENT_TIMESTAMP
        WHERE id_demanda = :id`,
      { titulo: corpo.titulo.trim(), descricao: corpo.descricao.trim(), tipo: corpo.tipo, prioridade: corpo.prioridade, responsavel, prazo: corpo.prazoFinalizacao, id: dados.id }
    );
    await registrarHistorico(dados.conn, dados.id, dados.usuario.id, `${dados.usuario.nome} editou a demanda.`);
    await dados.conn.commit();
    return res.json({ mensagem: "Demanda atualizada com sucesso." });
  } catch (erro) {
    await dados.conn.rollback();
    return responderErro(res, 500, "Não foi possível atualizar a demanda.");
  } finally {
    await dados.conn.close();
  }
}

export async function atualizarStatus(req: Request, res: Response) {
  const dados = await contexto(req, res);
  if (dados.erro) return responderErro(res, dados.erro[0], dados.erro[1]);
  const atual = statusTela(dados.demanda.STATUS);
  const novo = normalizarStatus(req.body?.status);
  const permitidas = transicoes(dados.usuario.perfil, atual, dados.demanda.ID_RESPONSAVEL === dados.usuario.id);
  if (!novo || !permitidas.includes(novo)) {
    await dados.conn.close();
    return responderErro(res, 400, "Mudança de status não permitida.");
  }
  try {
    await dados.conn.execute(
      `UPDATE demandas SET status = :status, data_atualizacao = CURRENT_TIMESTAMP WHERE id_demanda = :id`,
      { status: statusBanco(novo), id: dados.id }
    );
    await registrarHistorico(dados.conn, dados.id, dados.usuario.id, `${dados.usuario.nome} alterou o status de ${atual} para ${novo}.`);
    await dados.conn.commit();
    return res.json({ mensagem: novo === "Cancelada" ? "Demanda cancelada." : "Status atualizado com sucesso." });
  } catch (erro) {
    await dados.conn.rollback();
    return responderErro(res, 500, "Não foi possível atualizar o status.");
  } finally {
    await dados.conn.close();
  }
}
