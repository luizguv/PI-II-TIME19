/* Autor: Luiz Gustavo Urias Vieira
 * Senhas com scrypt e sessões opacas: nunca enviar senhas ou hashes ao navegador.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

// funcao que gera o hash da senha
export function hashPassword(password: string): string {
  // salt aleatorio + scrypt
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
// funcao que confere a senha com o hash salvo
export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, salt, key] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(key || '')) return false;
  // compara em tempo constante
  const calculated = scryptSync(password, salt, 64);
  return timingSafeEqual(calculated, Buffer.from(key, 'hex'));
}
// funcao que gera o hash do token da sessao
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
// funcao que gera um token aleatorio
export const newToken = (): string => randomBytes(32).toString('hex');
