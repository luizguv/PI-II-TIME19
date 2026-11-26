/* Autor: Caio Peccinato
 * Consulta externa com prazo limite e cache; indisponibilidade não libera datas sem validação.
 */
import { fail } from './validation';

export interface Holiday {
  date: string;
  name: string;
  type: string;
}

const UM_DIA_MS = 86_400_000;
const TIMEOUT_MS = 8000;

const cache = new Map<number, { until: number; data: Holiday[] }>();

function respostaValida(data: unknown): data is Holiday[] {
  return (
    Array.isArray(data) &&
    data.every(h => /^\d{4}-\d{2}-\d{2}$/.test(h.date) && typeof h.name === 'string')
  );
}

export async function holidays(year: number): Promise<Holiday[]> {
  if (!Number.isInteger(year) || year < 1900 || year > 2199) fail(400, 'Ano inválido.');

  // Reutiliza os feriados já consultados para esse ano.
  const hit = cache.get(year);
  if (hit && hit.until > Date.now()) return hit.data;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error('Falha externa');

    const data = await response.json();
    if (!respostaValida(data)) throw new Error('Resposta inválida');

    // Só os feriados nacionais bloqueiam prazo no sistema.
    const national = data.filter(h => h.type === 'national');
    cache.set(year, { until: Date.now() + UM_DIA_MS, data: national });
    return national;
  } catch {
    fail(503, 'Não foi possível consultar os feriados. Tente novamente antes de salvar o prazo.');
  }
}
