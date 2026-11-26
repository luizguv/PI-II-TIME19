/* Autor original: João Pedro Silveira de Souza
 * Configuração central do pool Oracle, sem registrar credenciais.
 */
import oracledb from 'oracledb';
import dotenv from 'dotenv';
import path from 'node:path';

// carrega o backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// variaveis obrigatorias do .env
const VARIAVEIS_OBRIGATORIAS = ['ORACLE_HOST', 'ORACLE_PORT', 'ORACLE_SERVICE', 'ORACLE_USER', 'ORACLE_PASSWORD'];

// funcao que cria o pool de conexoes do oracle
export async function initPool() {
  const missing = VARIAVEIS_OBRIGATORIAS.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Configure backend/.env: ${missing.join(', ')}`);

  // endereco do oracle
  const { ORACLE_HOST, ORACLE_PORT, ORACLE_SERVICE, ORACLE_USER, ORACLE_PASSWORD } = process.env;
  const opcoes = 'connect_timeout=10&transport_connect_timeout=5&retry_count=0';

  await oracledb.createPool({
    user: ORACLE_USER,
    password: ORACLE_PASSWORD,
    connectString: `${ORACLE_HOST}:${ORACLE_PORT}/${ORACLE_SERVICE}?${opcoes}`,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
    queueTimeout: 10000,
  });
}

// funcao que pega uma conexao do pool
export async function getConn() {
  const c = await oracledb.getPool().getConnection();

  // sessao do banco em UTC
  try {
    await c.execute("ALTER SESSION SET TIME_ZONE = '+00:00'");
    return c;
  } catch (error) {
    await c.close();
    throw error;
  }
}

// funcao que fecha o pool
export const closePool = () => oracledb.getPool().close(5);
