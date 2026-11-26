/* Autor original: Caio Peccinato
 * Consulta Oracle movida da integração original em api.ts.
 */
import type { Request, Response } from 'express';
import type { SessionLocals } from '../../middleware/session';
import { connection, rows } from '../../data/database';
import { demandSelect } from '../../demand-service';
import { ADMIN, statuses, priorities, types, today } from '../../rules';

export async function getDashboard(_req: Request, res: Response<unknown, SessionLocals>) {
  const {usuario} = res.locals;
  return connection(async c => {
    const data = await rows(c, demandSelect + (usuario.perfil === ADMIN ? '' : ' WHERE EXISTS (SELECT 1 FROM projeto_usuarios pu WHERE pu.id_projeto = d.id_projeto AND pu.id_usuario = :usuario)'), usuario.perfil === ADMIN ? {} : {usuario: usuario.id});
    // A lista de categorias inclui contagens zeradas para os gráficos.
    const count = (field: string, values: string[]) => Object.fromEntries(values.map(v => [v, data.filter(d => d[field] === v).length]));
    const open = data.filter(d => !['Concluída','Cancelada'].includes(d.status));
    const limit = new Date(today() + 'T12:00:00Z'); limit.setUTCDate(limit.getUTCDate() + 7);
    return res.json({totalDemandas: data.length, porStatus: count('status',statuses), porTipo: count('tipo',types), porPrioridade: count('prioridade',priorities),
      criticasEmAberto: open.filter(d => d.prioridade === 'Crítica'),
      proximasDoPrazo: open.filter(d => d.prazoFinalizacao && d.prazoFinalizacao >= today() && d.prazoFinalizacao <= limit.toISOString().slice(0,10))});
  });
}
