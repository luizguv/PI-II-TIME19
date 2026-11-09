/* Autor: Vinicius Zorzetto — RA:24008052
 * Frontend e API na mesma origem para cookies HttpOnly; origem de escrita validada.
 */
import express, {Request, Response, NextFunction} from 'express';
import path from 'node:path';
import {api} from './api';
export const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'16kb'}));
app.use('/api', (req,res,next) => {
  res.setHeader('Cache-Control','no-store');
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
      res.status(403).json({mensagem:'Abra o sistema pelo endereço do backend para enviar os dados.'}); return;
    }
  }
  next();
}, api);
app.use('/api', (_req,res) => {res.status(404).json({mensagem:'Rota não encontrada.'});});
app.get('/', (_req,res) => {res.redirect('/html/login.html');});
app.use(express.static(path.resolve(__dirname,'../../frontend'), {index:false}));
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = error.type === 'entity.parse.failed' ? 400 : error.status || 500;
  if (status >= 500) console.error('Falha na operação:', error.code || error.name || 'ERRO');
  res.status(status).json({mensagem: status === 500 ? 'Não foi possível concluir a operação. Verifique a conexão com o banco.' : error.type === 'entity.parse.failed' ? 'JSON inválido.' : error.message});
});
