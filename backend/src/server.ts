/* Inicialização e integração compartilhadas — equipe PI-II-TIME19.
 * Inicialização original do pool: João Pedro Silveira de Souza.
 * A API só aceita requisições após validar a conexão com o Oracle.
 */
import {initPool,closePool} from './data/conexao';
import {app} from './app';
async function start() {
  await initPool();
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, '127.0.0.1', () => console.log(`Sistema disponível em http://localhost:${port}`));
  const stop = () => server.close(() => {closePool().then(()=>process.exit(0)).catch(()=>process.exit(1));});
  process.on('SIGINT',stop); process.on('SIGTERM',stop);
  server.on('error', () => {console.error('Não foi possível abrir a porta do servidor.'); closePool().finally(()=>process.exit(1));});
}
start().catch(error => {console.error('Falha ao iniciar. Verifique VPN, backend/.env e banco:', error.code || error.message); process.exit(1);});
