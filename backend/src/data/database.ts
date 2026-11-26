/* Autor: João Pedro Silveira de Souza
 * Cada operação usa conexão própria; erros revertem a transação antes de devolver ao pool.
 */
import oracledb, { Connection } from 'oracledb';
import { getConn } from './conexao';

// funcao que executa um trabalho com uma conexao (rollback se der erro)
export async function connection<T>(work: (c: Connection) => Promise<T>): Promise<T> {
  // pega a conexao e sempre devolve no fim
  const c = await getConn();
  c.callTimeout = 15000;

  try {
    return await work(c);
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    await c.close();
  }
}

// funcao que executa um select e retorna as linhas
export async function rows<T = any>(c: Connection, sql: string, binds: any = {}): Promise<T[]> {
  const r = await c.execute<T>(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 });
  return r.rows || [];
}

// funcao que executa um insert e retorna o id gerado
export async function insertId(c: Connection, sql: string, binds: any): Promise<number> {
  const r = await c.execute(sql, {
    ...binds,
    newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  });
  return (r.outBinds as { newId: number[] }).newId[0];
}
