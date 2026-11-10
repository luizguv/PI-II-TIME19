/* Autor: Vinicius Zorzetto — RA:24008052
 * Cada operação usa conexão própria; erros revertem a transação antes de devolver ao pool.
 */
import oracledb, { Connection } from 'oracledb';
import { getConn } from './conexao';
export async function connection<T>(work: (c: Connection) => Promise<T>): Promise<T> {
  const c = await getConn();
  c.callTimeout = 15000;
  try { return await work(c); }
  catch (error) { await c.rollback(); throw error; }
  finally { await c.close(); }
}
export async function rows<T = any>(c: Connection, sql: string, binds: any = {}): Promise<T[]> {
  const r = await c.execute<T>(sql, binds, {outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0});
  return r.rows || [];
}
export async function insertId(c: Connection, sql: string, binds: any): Promise<number> {
  const r = await c.execute(sql, {...binds, newId: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER}});
  return (r.outBinds as {newId: number[]}).newId[0];
}
