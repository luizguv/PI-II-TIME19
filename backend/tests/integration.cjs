/* Autor: Leonardo Gambaroni Alves
 * Executar com servidor/VPN ativos. Grava duas demandas de teste identificadas,
 * um comentário e histórico; preserva tudo no banco como evidência de integração.
 */
const assert = require('node:assert/strict');

const base = process.env.PI2_TEST_URL || 'http://localhost:3000';
const SENHA_DEMO = 'Pi2@2026Demo!';

// Faz uma requisição à API e devolve status, corpo JSON e cookie recebido.
async function call(path, { cookie, method = 'GET', body, origin } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body) headers['Content-Type'] = 'application/json';
  if (origin) headers.origin = origin;

  const response = await fetch(base + '/api' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie'),
  };
}

const post = (path, session, body) => call(path, { ...session, method: 'POST', body });

async function login(email) {
  const r = await post('/login', {}, { email, senha: SENHA_DEMO });

  assert.equal(r.status, 200, 'Login de demonstração');
  assert.match(r.cookie, /HttpOnly/i);
  assert(!('senha' in r.data.usuario));

  return { cookie: r.cookie.split(';')[0], user: r.data.usuario };
}

(async () => {
  // Sem sessão e com credenciais inválidas.
  assert.equal((await call('/dashboard')).status, 401);
  assert.equal((await post('/login', {}, { email: 'admin@pi2.local', senha: 'incorreta' })).status, 401);
  assert.equal((await post('/login', {}, {})).status, 400);

  // Usa sessões dos três perfis para verificar permissões diferentes.
  const admin = await login('admin@pi2.local');
  const leader = await login('lider@pi2.local');
  const member = await login('membro@pi2.local');
  assert.equal((await call('/sessao', admin)).data.usuario.perfil, 'Administrador');

  const projects = (await call('/projetos', admin)).data.projetos;
  const project = projects.find(p => p.nome === 'PI2 — Demonstração').id;
  const restricted = projects.find(p => p.nome === 'PI2 — Projeto restrito').id;

  // Acesso, validação de IDs, ordenação e busca com SQL malicioso.
  assert.equal((await call('/usuarios?projetoId=' + restricted, member)).status, 403);
  assert.equal((await call('/demandas/abc', admin)).status, 400);
  assert.equal((await call('/demandas/999999999', admin)).status, 404);
  assert.equal((await call('/dashboard', admin)).status, 200);
  assert.equal((await call('/demandas?ordenarPor=naoexiste', admin)).status, 400);
  assert.equal((await call('/demandas?busca=' + encodeURIComponent("' OR 1=1 --"), admin)).status, 200);

  // Escolhe um prazo futuro que não caia em feriado.
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

  const natal = year + '-12-25';
  const payload = {
    titulo: 'Teste de integração ' + Date.now(),
    descricao: 'Demanda criada para validar API, permissões e persistência.',
    tipo: 'Tarefa',
    prioridade: 'Alta',
    projetoId: project,
    responsavelId: member.user.id,
    prazoFinalizacao: future.toISOString().slice(0, 10),
  };

  // Bloqueios no cadastro.
  assert.equal(
    (await post('/demandas', admin, { ...payload, prazoFinalizacao: natal })).status,
    400,
    'Bloqueio de feriado no cadastro',
  );
  assert.equal(
    (await call('/demandas', { ...admin, method: 'POST', body: payload, origin: 'http://site-invalido.example' })).status,
    403,
    'Bloqueio de origem',
  );
  assert.equal(
    (await post('/demandas', member, payload)).status,
    403,
    'Membro não pode se atribuir uma demanda',
  );

  // Comprova que o cadastro sem prazo e sem responsável chega ao Oracle.
  const { responsavelId, prazoFinalizacao, ...withoutDeadlineOrOwner } = payload;
  const created = await post('/demandas', member, withoutDeadlineOrOwner);
  assert.equal(created.status, 201, 'Cadastro sem prazo e sem responsável no Oracle');
  assert.equal(created.data.prazoFinalizacao, null);
  assert.equal(created.data.responsavelId, null);

  const route = '/demandas/' + created.data.id;
  const update = (session, body) => call(route, { ...session, method: 'PUT', body });

  // Edição pelo líder.
  assert.equal((await update(admin, { prazoFinalizacao: natal })).status, 400, 'Bloqueio de feriado na atualização');
  const scheduled = await update(leader, { prioridade: 'Crítica', responsavelId, prazoFinalizacao });
  assert.equal(scheduled.status, 200);
  assert.equal(scheduled.data.prazoFinalizacao, prazoFinalizacao);
  assert.equal(scheduled.data.responsavelId, responsavelId);

  // Ciclo de vida: membro avança, líder revisa e conclui.
  assert.equal((await update(member, { prioridade: 'Alta' })).status, 403);
  assert.equal((await update(member, { status: 'Em andamento' })).status, 200);
  assert.equal((await update(member, { status: 'Concluída' })).status, 403);
  assert.equal((await update(member, { status: 'Aberta' })).status, 403);
  assert.equal((await update(member, { status: 'Em revisão' })).status, 200);
  assert.equal((await update(member, { status: 'Concluída' })).status, 403);
  assert.equal((await update(leader, { status: 'Em andamento' })).status, 200);
  assert.equal((await update(leader, { status: 'Em revisão' })).status, 200);
  assert.equal((await update(leader, { status: 'Concluída' })).status, 200);
  assert.equal((await update(admin, { status: 'Cancelada' })).status, 403);
  assert.equal((await call(route, member)).data.status, 'Concluída');

  // O autor do comentário vem da sessão, não do corpo da requisição.
  const comment = 'Teste de persistência <script>texto sem execução</script>';
  assert.equal(
    (await post(route + '/comentarios', member, { texto: comment, usuarioId: admin.user.id })).status,
    201,
  );
  const comments = (await call(route + '/comentarios', admin)).data.comentarios;
  assert(
    comments.some(c => c.texto === comment && c.usuarioId === member.user.id),
    'Autor do comentário obtido da sessão',
  );

  // Confere o que ficou gravado depois das transições e comentários.
  const history = (await call(route + '/historico', admin)).data.historico;
  assert(history.length >= 7);
  assert(history.some(h => h.campo === 'prioridade' && h.valorNovo === 'Crítica'));
  assert.equal(history.filter(h => h.campo === 'status').length, 5);

  // Cancelamento pelo líder.
  const second = await post('/demandas', admin, { ...payload, titulo: payload.titulo + ' — cancelamento' });
  assert.equal(second.status, 201);
  const secondRoute = '/demandas/' + second.data.id;
  assert.equal((await call(secondRoute, { ...leader, method: 'PUT', body: { status: 'Cancelada' } })).status, 200);
  assert.equal((await call(secondRoute, admin)).data.status, 'Cancelada');

  // Não existe rota de exclusão.
  assert.equal((await call(route, { ...admin, method: 'DELETE' })).status, 404);

  const filtered = await call(
    '/demandas?status=Concluída&prioridade=Crítica&busca=' + encodeURIComponent(payload.titulo) + '&ordenarPor=prioridade',
    admin,
  );
  assert.equal(filtered.status, 200);
  assert.equal(filtered.data.total, 1);

  // Logout invalida a sessão.
  assert.equal((await post('/logout', member, {})).status, 200);
  assert.equal((await call('/sessao', member)).status, 401);
  await post('/logout', leader, {});
  await post('/logout', admin, {});

  console.log('INTEGRACAO_OK: login, sessão, autorização, feriados, CRUD, filtros, status, comentários, histórico e logout.');
  console.log('Demandas de evidência: ' + created.data.id + ' (concluída), ' + second.data.id + ' (cancelada).');
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
