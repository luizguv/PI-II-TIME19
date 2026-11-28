/*
 * Autor: Leonardo Gambaroni Alves
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Roteiro de testes de integração contra a API e o banco Oracle.
 *            Executar com servidor e VPN ativos. Grava duas demandas fictícias identificadas,
 *            um comentário e histórico, preservando tudo no banco como evidência.
 */

const assert = require('node:assert/strict');
const base = process.env.PI2_TEST_URL || 'http://localhost:3000';

// 1. Funções auxiliares para enviar requisições HTTP e autenticar os perfis de demonstração.
async function call(path, { cookie, method = 'GET', body, origin } = {}) {
  const response = await fetch(base + '/api' + path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(origin ? { origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie'),
  };
}

async function login(email) {
  const r = await call('/login', {
    method: 'POST',
    body: { email, senha: 'Pi2@2026Demo!' },
  });

  // Garante criação de cookie HttpOnly e ausência da senha na resposta JSON.
  assert.equal(r.status, 200, 'Login de demonstração');
  assert.match(r.cookie, /HttpOnly/i);
  assert(!('senha' in r.data.usuario));

  return {
    cookie: r.cookie.split(';')[0],
    user: r.data.usuario,
  };
}

(async () => {
  // 2. Bloqueio de rotas protegidas sem sessão e rejeição de credenciais/campos inválidos no login.
  assert.equal((await call('/dashboard')).status, 401);
  assert.equal(
    (await call('/login', { method: 'POST', body: { email: 'admin@pi2.local', senha: 'incorreta' } })).status,
    401
  );
  assert.equal((await call('/login', { method: 'POST', body: {} })).status, 400);

  // 3. Autentica os três perfis e valida o isolamento de projetos restritos.
  const admin = await login('admin@pi2.local');
  const leader = await login('lider@pi2.local');
  const member = await login('membro@pi2.local');
  assert.equal((await call('/sessao', admin)).data.usuario.perfil, 'Administrador');

  const projects = (await call('/projetos', admin)).data.projetos;
  const project = projects.find(p => p.nome === 'PI2 — Demonstração').id;
  const restricted = projects.find(p => p.nome === 'PI2 — Projeto restrito').id;
  assert.equal((await call('/usuarios?projetoId=' + restricted, member)).status, 403);

  // 4. Valida erros de ID inválido/inexistente, dashboard, ordenação inválida e proteção contra SQL injection na busca.
  assert.equal((await call('/demandas/abc', admin)).status, 400);
  assert.equal((await call('/demandas/999999999', admin)).status, 404);
  assert.equal((await call('/dashboard', admin)).status, 200);
  assert.equal((await call('/demandas?ordenarPor=naoexiste', admin)).status, 400);
  assert.equal((await call('/demandas?busca=' + encodeURIComponent("' OR 1=1 --"), admin)).status, 200);

  // 5. Consulta feriados nacionais na API externa e escolhe uma data futura que não seja feriado.
  const future = new Date();
  future.setUTCFullYear(future.getUTCFullYear() + 1);
  future.setUTCMonth(5, 10);
  const year = future.getUTCFullYear();

  const holidayResponse = await call('/feriados/' + year, admin);
  assert.equal(holidayResponse.status, 200, 'API externa de feriados');
  const holidays = holidayResponse.data.feriados;
  while (holidays.some(h => h.date === future.toISOString().slice(0, 10))) {
    future.setUTCDate(future.getUTCDate() + 1);
  }

  const payload = {
    titulo: 'Teste de integração ' + Date.now(),
    descricao: 'Demanda criada para validar API, permissões e persistência.',
    tipo: 'Tarefa',
    prioridade: 'Alta',
    projetoId: project,
    responsavelId: member.user.id,
    prazoFinalizacao: future.toISOString().slice(0, 10),
  };

  // Bloqueia cadastro com prazo em feriado nacional (25/12) e bloqueia origem externa não autorizada.
  assert.equal(
    (await call('/demandas', { ...admin, method: 'POST', body: { ...payload, prazoFinalizacao: year + '-12-25' } })).status,
    400,
    'Bloqueio de feriado no cadastro'
  );
  assert.equal(
    (await call('/demandas', { ...admin, method: 'POST', body: payload, origin: 'http://site-invalido.example' })).status,
    403,
    'Bloqueio de origem'
  );

  // 6. Impede membro de autoatribuir demanda na criação, mas permite cadastrar sem prazo e sem responsável.
  assert.equal(
    (await call('/demandas', { ...member, method: 'POST', body: payload })).status,
    403,
    'Membro não pode se atribuir uma demanda'
  );
  const { responsavelId, prazoFinalizacao, ...withoutDeadlineOrOwner } = payload;

  const created = await call('/demandas', { ...member, method: 'POST', body: withoutDeadlineOrOwner });
  assert.equal(created.status, 201, 'Cadastro sem prazo e sem responsável no Oracle');
  assert.equal(created.data.prazoFinalizacao, null);
  assert.equal(created.data.responsavelId, null);

  // 7. Valida bloqueio de feriado na edição, atribuição pelo líder e todas as regras do ciclo de vida.
  const route = '/demandas/' + created.data.id;
  const update = (session, body) => call(route, { ...session, method: 'PUT', body });

  assert.equal((await update(admin, { prazoFinalizacao: year + '-12-25' })).status, 400, 'Bloqueio de feriado na atualização');

  const scheduled = await update(leader, { prioridade: 'Crítica', responsavelId, prazoFinalizacao });
  assert.equal(scheduled.status, 200);
  assert.equal(scheduled.data.prazoFinalizacao, prazoFinalizacao);
  assert.equal(scheduled.data.responsavelId, responsavelId);

  // Membro tenta alterar prioridade (negado), avança até Em revisão, mas não conclui nem volta para Aberta.
  assert.equal((await update(member, { prioridade: 'Alta' })).status, 403);
  assert.equal((await update(member, { status: 'Em andamento' })).status, 200);
  assert.equal((await update(member, { status: 'Concluída' })).status, 403);
  assert.equal((await update(member, { status: 'Aberta' })).status, 403);
  assert.equal((await update(member, { status: 'Em revisão' })).status, 200);
  assert.equal((await update(member, { status: 'Concluída' })).status, 403);

  // Líder devolve para Em andamento, avança novamente e conclui; depois nem o Admin pode cancelar.
  assert.equal((await update(leader, { status: 'Em andamento' })).status, 200);
  assert.equal((await update(leader, { status: 'Em revisão' })).status, 200);
  assert.equal((await update(leader, { status: 'Concluída' })).status, 200);
  assert.equal((await update(admin, { status: 'Cancelada' })).status, 403);
  assert.equal((await call(route, member)).data.status, 'Concluída');

  // 8. Registra comentário garantindo que o autor vem da sessão (ignora usuarioId forjado) e confere histórico.
  const comment = 'Teste de persistência <script>texto sem execução</script>';
  assert.equal(
    (await call(route + '/comentarios', { ...member, method: 'POST', body: { texto: comment, usuarioId: admin.user.id } })).status,
    201
  );
  const comments = (await call(route + '/comentarios', admin)).data.comentarios;
  assert(
    comments.some(c => c.texto === comment && c.usuarioId === member.user.id),
    'Autor do comentário obtido da sessão'
  );

  const history = (await call(route + '/historico', admin)).data.historico;
  assert(history.length >= 7);
  assert(history.some(h => h.campo === 'prioridade' && h.valorNovo === 'Crítica'));
  assert.equal(history.filter(h => h.campo === 'status').length, 5);

  // 9. Testa cancelamento lógico em segunda demanda, bloqueio de exclusão física (DELETE) e filtros da listagem.
  const second = await call('/demandas', {
    ...admin,
    method: 'POST',
    body: { ...payload, titulo: payload.titulo + ' — cancelamento' },
  });
  assert.equal(second.status, 201);
  assert.equal((await call('/demandas/' + second.data.id, { ...leader, method: 'PUT', body: { status: 'Cancelada' } })).status, 200);
  assert.equal((await call('/demandas/' + second.data.id, admin)).data.status, 'Cancelada');
  assert.equal((await call(route, { ...admin, method: 'DELETE' })).status, 404);

  const filtered = await call(
    '/demandas?status=Concluída&prioridade=Crítica&busca=' + encodeURIComponent(payload.titulo) + '&ordenarPor=prioridade',
    admin
  );
  assert.equal(filtered.status, 200);
  assert.equal(filtered.data.total, 1);

  // 10. Encerra as sessões e confirma que o cookie deixa de autenticar após o logout.
  assert.equal((await call('/logout', { ...member, method: 'POST', body: {} })).status, 200);
  assert.equal((await call('/sessao', member)).status, 401);
  await call('/logout', { ...leader, method: 'POST', body: {} });
  await call('/logout', { ...admin, method: 'POST', body: {} });

  console.log('INTEGRACAO_OK: login, sessão, autorização, feriados, CRUD, filtros, status, comentários, histórico e logout.');
  console.log('Demandas de evidência: ' + created.data.id + ' (concluída), ' + second.data.id + ' (cancelada).');
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
