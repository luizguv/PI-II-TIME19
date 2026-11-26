/* Inicialização e integração compartilhadas — equipe PI-II-TIME19.
 * Inicialização original do pool: João Pedro Silveira de Souza.
 * A API só aceita requisições após validar a conexão com o Oracle.
 */
import { initPool, closePool } from './data/conexao';
import { app } from './app';

// funcao que inicia o servidor
async function start() {
  // abre o pool do oracle antes de tudo
  await initPool();

  // porta e inicio do servidor http
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Sistema disponível em http://localhost:${port}`);
  });

  // encerramento: fecha o http e depois o pool
  const stop = () => {
    server.close(() => {
      closePool()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // erro ao abrir a porta
  server.on('error', () => {
    console.error('Não foi possível abrir a porta do servidor.');
    closePool().finally(() => process.exit(1));
  });
}

// inicia e mostra erro se falhar
start().catch(error => {
  console.error('Falha ao iniciar. Verifique VPN, backend/.env e banco:', error.code || error.message);
  process.exit(1);
});
