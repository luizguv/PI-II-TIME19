/* Autor: Vinicius Zorzetto — RA:24008052
 * Responsável pela apresentação: Luiz Gustavo Urias Vieira.
 * Senhas com scrypt e sessões opacas: nunca enviar senhas ou hashes ao navegador.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function hashPassword(password: string): string {
  // Cada senha recebe um salt aleatório antes de passar pelo scrypt.
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, salt, key] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(key || '')) return false;
  // Recalcula o hash com o salt salvo e compara sem sair no primeiro byte diferente.
  const calculated = scryptSync(password, salt, 64);
  return timingSafeEqual(calculated, Buffer.from(key, 'hex'));
}
// O token é aleatório; o Oracle recebe o resumo SHA-256 para procurar a sessão.
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const newToken = (): string => randomBytes(32).toString('hex');
