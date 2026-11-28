/* Autor original: João Pedro Silveira de Souza
 * Configuração central do pool Oracle, sem registrar credenciais.
 */
import oracledb from 'oracledb';
import dotenv from 'dotenv';
import path from 'node:path';
// Carrega a configuração a partir de backend/.env, inclusive ao rodar o JS compilado.
dotenv.config({path: path.resolve(__dirname, '../../.env'), quiet: true});
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
export async function initPool() {
  const keys = ['ORACLE_HOST','ORACLE_PORT','ORACLE_SERVICE','ORACLE_USER','ORACLE_PASSWORD'];
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Configure backend/.env: ${missing.join(', ')}`);
  // Host, porta e serviço compõem o endereço do Oracle usado pelo pool.
  await oracledb.createPool({user: process.env.ORACLE_USER, password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE}?connect_timeout=10&transport_connect_timeout=5&retry_count=0`,
    poolMin: 1, poolMax: 5, poolIncrement: 1, queueTimeout: 10000});
}
export async function getConn() {
  const c = await oracledb.getPool().getConnection();
  // TIMESTAMP sem fuso é armazenado em UTC e enviado com Z à interface.
  try { await c.execute("ALTER SESSION SET TIME_ZONE = '+00:00'"); return c; }
  catch(error) { await c.close(); throw error; }
}
export const closePool = () => oracledb.getPool().close(5);
