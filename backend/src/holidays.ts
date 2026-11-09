/* Autor: Vinicius Zorzetto — RA:24008052
 * Consulta externa com prazo limite e cache; indisponibilidade não libera datas sem validação.
 */
export interface Holiday { date: string; name: string; type: string; }
const cache = new Map<number, {until: number; data: Holiday[]}>();
export async function holidays(year: number): Promise<Holiday[]> {
  if (!Number.isInteger(year) || year < 1900 || year > 2199) throw Object.assign(new Error('Ano inválido.'), {status: 400});
  const hit = cache.get(year);
  if (hit && hit.until > Date.now()) return hit.data;
  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Falha externa');
    const data = await response.json() as Holiday[];
    if (!Array.isArray(data) || data.some(h => !/^\d{4}-\d{2}-\d{2}$/.test(h.date) || typeof h.name !== 'string')) throw new Error('Resposta inválida');
    const national = data.filter(h => h.type === 'national');
    cache.set(year, {until: Date.now() + 86400000, data: national});
    return national;
  } catch {
    throw Object.assign(new Error('Não foi possível consultar os feriados. Tente novamente antes de salvar o prazo.'), {status: 503});
  }
}
