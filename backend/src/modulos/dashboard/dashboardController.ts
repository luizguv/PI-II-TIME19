/* Autor original: Caio Peccinato
 * Consulta Oracle movida da integração original em api.ts.
 */
import type { Request, Response } from 'express';
import type { SessionLocals } from '../../middleware/session';
import { connection, rows } from '../../data/database';
import { demandSelect } from '../../demand-service';
import { ADMIN, isClosed, statuses, priorities, types, today } from '../../rules';

// dias para considerar prazo proximo
const DIAS_PRAZO_PROXIMO = 7;

// funcao que retorna a data daqui a N dias
function daquiA(dias: number): string {
  const limit = new Date(today() + 'T12:00:00Z');
  limit.setUTCDate(limit.getUTCDate() + dias);
  return limit.toISOString().slice(0, 10);
}

// funcao que monta os dados do dashboard
export async function getDashboard(_req: Request, res: Response<unknown, SessionLocals>) { // FLUXO:DASHBOARD 4/4 funcao
  const { usuario } = res.locals;
  const isAdmin = usuario.perfil === ADMIN;

  // admin ve tudo; os outros so seus projetos
  const filtro = isAdmin
    ? ''
    : ` WHERE EXISTS (SELECT 1 FROM projeto_usuarios pu
                       WHERE pu.id_projeto = d.id_projeto AND pu.id_usuario = :usuario)`;

  return connection(async c => {
    const data = await rows(c, demandSelect + filtro, isAdmin ? {} : { usuario: usuario.id });

    // funcao que conta demandas por categoria (inclui zero)
    const count = (field: string, values: string[]) =>
      Object.fromEntries(values.map(v => [v, data.filter(d => d[field] === v).length]));

    // demandas abertas e limite de prazo
    const open = data.filter(d => !isClosed(d.status));
    const hoje = today();
    const limite = daquiA(DIAS_PRAZO_PROXIMO);

    return res.json({
      // totais, contagens e listas
      totalDemandas: data.length,
      porStatus: count('status', statuses),
      porTipo: count('tipo', types),
      porPrioridade: count('prioridade', priorities),
      criticasEmAberto: open.filter(d => d.prioridade === 'Crítica'),
      proximasDoPrazo: open.filter(
        d => d.prazoFinalizacao && d.prazoFinalizacao >= hoje && d.prazoFinalizacao <= limite,
      ),
    });
  });
}
