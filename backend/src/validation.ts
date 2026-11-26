/* Autor: Vinicius Zorzetto — RA:24008052
 * Validações compartilhadas de entrada.
 */

// funcao que gera erro com status http
export function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

// funcao que valida id (inteiro positivo)
export function id(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) fail(400, 'Identificador inválido.');
  return n;
}

// funcao que valida texto e tamanho
export function text(value: unknown, name: string, min: number, max: number): string {
  const trimmed = typeof value === 'string' ? value.trim() : null;
  if (trimmed === null || trimmed.length < min || trimmed.length > max) {
    fail(400, `${name} deve ter entre ${min} e ${max} caracteres.`);
  }
  return trimmed;
}

// funcao que valida opcao de uma lista
export function choice(value: unknown, options: string[], name: string): string {
  if (typeof value !== 'string' || !options.includes(value)) fail(400, `${name} inválido.`);
  return value;
}
