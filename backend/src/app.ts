/* Autor: Caio Peccinato
 * Frontend e API na mesma origem para cookies HttpOnly; origem de escrita validada.
 */
import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { api } from './api';

export const app = express();

const METODOS_LEITURA = ['GET', 'HEAD', 'OPTIONS'];

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

// API e páginas usam a mesma origem. Escritas de outra origem são recusadas.
function mesmaOrigem(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');

  if (!METODOS_LEITURA.includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
      res.status(403).json({ mensagem: 'Abra o sistema pelo endereço do backend para enviar os dados.' });
      return;
    }
  }

  next();
}

app.use('/api', mesmaOrigem, api);

app.use('/api', (_req, res) => {
  res.status(404).json({ mensagem: 'Rota não encontrada.' });
});

// A raiz abre o login; os demais arquivos estáticos vêm da pasta frontend.
app.get('/', (_req, res) => {
  res.redirect('/html/login.html');
});

app.use(express.static(path.resolve(__dirname, '../../frontend'), { index: false }));

// Converte os erros dos controladores em mensagens JSON para as telas.
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  const jsonInvalido = error.type === 'entity.parse.failed';
  const status = jsonInvalido ? 400 : error.status || 500;

  if (status >= 500) {
    console.error('Falha na operação:', error.code || error.name || 'ERRO');
  }

  let mensagem: string;
  if (status === 500) {
    mensagem = 'Não foi possível concluir a operação. Verifique a conexão com o banco.';
  } else if (jsonInvalido) {
    mensagem = 'JSON inválido.';
  } else {
    mensagem = error.message;
  }

  res.status(status).json({ mensagem });
});
