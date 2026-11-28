/*
 * Autor: Leonardo Gambaroni Alves
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Testes unitários de senha, tokens de sessão, datas e ciclo de vida,
 *            executados localmente sem dependência do banco Oracle.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, hashToken, newToken } = require('../dist/security');
const { transitions, validDate, ADMIN, LEADER, MEMBER } = require('../dist/rules');

// Cria um usuário fictício com ID fixo para simular os três perfis nos testes.
const user = perfil => ({ id: 3, nome: 'Teste', email: 'teste@pi2.local', perfil });

// 1. Garante que senhas sejam armazenadas com hash scrypt e salt aleatório diferente a cada geração.
test('senha é verificada sem armazenar texto puro e salts são distintos', () => {
  const a = hashPassword('Pi2@2026Demo!');
  const b = hashPassword('Pi2@2026Demo!');

  assert.notEqual(a, b);
  assert(!a.includes('Pi2@2026Demo!'));
  assert(verifyPassword('Pi2@2026Demo!', a));
  assert(!verifyPassword('errada', a));
  assert(!verifyPassword('x', 'texto-puro'));
  assert(!verifyPassword('x', 'scrypt$salt$zz'));
});

// 2. Garante geração de token opaco de 64 caracteres hexadecimais e digest distinto do token original.
test('token aleatório e digest de sessão não revelam o token', () => {
  const token = newToken();

  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(token, newToken());
  assert.notEqual(hashToken(token), token);
});

// 3. Impede pular a etapa de revisão para concluir e impede reabrir demandas já encerradas.
test('não concluir diretamente nem reabrir demandas encerradas', () => {
  for (const perfil of [ADMIN, LEADER, MEMBER]) {
    assert(!transitions('Em andamento', user(perfil), 3).includes('Concluída'));
    assert(!transitions('Em revisão', user(perfil), 3).includes('Aberta'));
    assert.deepEqual(transitions('Concluída', user(perfil), 3), []);
    assert.deepEqual(transitions('Cancelada', user(perfil), 3), []);
  }
});

// 4. Confirma que Membro só avança suas próprias demandas até Em revisão, sem aprovar nem cancelar.
test('membro só avança trabalho atribuído; aprovação e cancelamento são gerenciais', () => {
  assert.deepEqual(transitions('Aberta', user(MEMBER), 4), []);
  assert.deepEqual(transitions('Aberta', user(MEMBER), 3), ['Em andamento']);
  assert.deepEqual(transitions('Em andamento', user(MEMBER), 3), ['Em revisão']);
  assert.deepEqual(transitions('Em revisão', user(MEMBER), 3), []);
  assert(transitions('Em revisão', user(LEADER), 4).includes('Concluída'));
  assert(transitions('Em revisão', user(ADMIN), null).includes('Cancelada'));
});

// 5. Verifica validação de calendário real (bissexto válido vs. datas impossíveis ou fora do padrão ISO).
test('rejeita datas inexistentes e aceita ano bissexto correto', () => {
  assert(validDate('2028-02-29'));
  assert(!validDate('2026-02-29'));
  assert(!validDate('2026-13-01'));
  assert(!validDate('10/11/2026'));
  assert(!validDate(null));
});

// 6. Confirma que Em andamento não retorna para Aberta e que apenas gestores devolvem Em revisão para Em andamento.
test('em andamento não retorna para aberta e revisão só volta para em andamento com gestor', () => {
  for (const perfil of [ADMIN, LEADER, MEMBER]) {
    assert(!transitions('Em andamento', user(perfil), 3).includes('Aberta'));
  }

  assert(transitions('Em revisão', user(ADMIN), 3).includes('Em andamento'));
  assert(transitions('Em revisão', user(LEADER), 3).includes('Em andamento'));
  assert.deepEqual(transitions('Em revisão', user(MEMBER), 3), []);
});

// 7. Confirma que Membro nunca pode cancelar e que gestores só cancelam enquanto não estiver encerrada.
test('membro não pode cancelar demandas e gestores cancelam apenas demandas não encerradas', () => {
  for (const status of ['Aberta', 'Em andamento', 'Em revisão']) {
    assert(!transitions(status, user(MEMBER), 3).includes('Cancelada'));
    assert(transitions(status, user(ADMIN), null).includes('Cancelada'));
    assert(transitions(status, user(LEADER), null).includes('Cancelada'));
  }

  for (const statusFinal of ['Concluída', 'Cancelada']) {
    assert.deepEqual(transitions(statusFinal, user(ADMIN), 3), []);
    assert.deepEqual(transitions(statusFinal, user(LEADER), 3), []);
  }
});
