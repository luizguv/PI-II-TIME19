/* Autor: Vinicius Zorzetto — RA:24008052
 * Responsável pela apresentação: João Pedro Silveira de Souza.
 * Cada operação usa conexão própria; erros revertem a transação antes de devolver ao pool.
 */
import oracledb, { Connection } from 'oracledb';
import { getConn } from './conexao';
export async function connection<T>(work: (c: Connection) => Promise<T>): Promise<T> {
  // Reutiliza uma conexão do pool e devolve no finally, mesmo após erro.
  const c = await getConn();
  c.callTimeout = 15000;
  try { return await work(c); }
  catch (error) { await c.rollback(); throw error; }
  finally { await c.close(); }
}
// Binds enviam os valores separadamente do texto da consulta SQL.
export async function rows<T = any>(c: Connection, sql: string, binds: any = {}): Promise<T[]> {
  const r = await c.execute<T>(sql, binds, {outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0});
  return r.rows || [];
}
// INSERT ... RETURNING preenche o parâmetro de saída com o ID gerado.
export async function insertId(c: Connection, sql: string, binds: any): Promise<number> {
  const r = await c.execute(sql, {...binds, newId: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER}});
  return (r.outBinds as {newId: number[]}).newId[0];
}
