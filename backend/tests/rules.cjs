/* Autor: Leonardo Gambaroni Alves
 * Verificações de senha, datas e limites do ciclo de vida, independentes do banco.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, hashToken, newToken } = require('../dist/security');
const { transitions, validDate, ADMIN, LEADER, MEMBER } = require('../dist/rules');

// senha usada nos testes
const SENHA = 'Pi2@2026Demo!';
// funcao que cria um usuario de teste
const user = perfil => ({ id: 3, nome: 'Teste', email: 'teste@pi2.local', perfil });

test('senha é verificada sem armazenar texto puro e salts são distintos', () => {
  const a = hashPassword(SENHA);
  const b = hashPassword(SENHA);

  assert.notEqual(a, b);
  assert(!a.includes(SENHA));
  assert(verifyPassword(SENHA, a));
  assert(!verifyPassword('errada', a));
  assert(!verifyPassword('x', 'texto-puro'));
  assert(!verifyPassword('x', 'scrypt$salt$zz'));
});

test('token aleatório e digest de sessão não revelam o token', () => {
  const token = newToken();

  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(token, newToken());
  assert.notEqual(hashToken(token), token);
});

test('não concluir diretamente nem reabrir demandas encerradas', () => {
  for (const perfil of [ADMIN, LEADER, MEMBER]) {
    assert(!transitions('Em andamento', user(perfil), 3).includes('Concluída'));
    assert(!transitions('Em revisão', user(perfil), 3).includes('Aberta'));
    assert.deepEqual(transitions('Concluída', user(perfil), 3), []);
    assert.deepEqual(transitions('Cancelada', user(perfil), 3), []);
  }
});

test('membro só avança trabalho atribuído; aprovação e cancelamento são gerenciais', () => {
  assert.deepEqual(transitions('Aberta', user(MEMBER), 4), []);
  assert.deepEqual(transitions('Aberta', user(MEMBER), 3), ['Em andamento']);
  assert.deepEqual(transitions('Em andamento', user(MEMBER), 3), ['Em revisão']);
  assert.deepEqual(transitions('Em revisão', user(MEMBER), 3), []);
  assert(transitions('Em revisão', user(LEADER), 4).includes('Concluída'));
  assert(transitions('Em revisão', user(ADMIN), null).includes('Cancelada'));
});

test('rejeita datas inexistentes e aceita ano bissexto correto', () => {
  assert(validDate('2028-02-29'));
  assert(!validDate('2026-02-29'));
  assert(!validDate('2026-13-01'));
  assert(!validDate('10/11/2026'));
  assert(!validDate(null));
});
