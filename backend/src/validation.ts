/* Autor: Vinicius Zorzetto — RA:24008052
 * Validações compartilhadas de entrada. */
export function fail(status: number, message: string): never { throw Object.assign(new Error(message), {status}); }
export function id(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) fail(400, 'Identificador inválido.');
  return n;
}
export function text(value: unknown, name: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(400, `${name} deve ter entre ${min} e ${max} caracteres.`);
  return (value as string).trim();
}
export function choice(value: unknown, options: string[], name: string): string {
  if (typeof value !== 'string' || !options.includes(value)) fail(400, `${name} inválido.`);
  return value as string;
}
