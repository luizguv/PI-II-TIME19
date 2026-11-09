/* Autor: Vinicius Zorzetto — RA:24008052
 * Executar com servidor/VPN ativos. Grava duas demandas de teste identificadas,
 * um comentário e histórico; preserva tudo no banco como evidência de integração.
 */
const assert=require('node:assert/strict');
const base=process.env.PI2_TEST_URL || 'http://localhost:3000';
async function call(path,{cookie,method='GET',body,origin}={}) {
  const response=await fetch(base+'/api'+path,{method,headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(origin?{origin}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')};
}
async function login(email) {
  const r=await call('/login',{method:'POST',body:{email,senha:'Pi2@2026Demo!'}});
  assert.equal(r.status,200,'Login de demonstração');assert.match(r.cookie,/HttpOnly/i);assert(!('senha' in r.data.usuario));
  return {cookie:r.cookie.split(';')[0],user:r.data.usuario};
}
(async()=>{
  assert.equal((await call('/dashboard')).status,401);
  assert.equal((await call('/login',{method:'POST',body:{email:'admin@pi2.local',senha:'incorreta'}})).status,401);
  assert.equal((await call('/login',{method:'POST',body:{}})).status,400);
  const admin=await login('admin@pi2.local'),leader=await login('lider@pi2.local'),member=await login('membro@pi2.local');
  assert.equal((await call('/sessao',admin)).data.usuario.perfil,'Administrador');
  const projects=(await call('/projetos',admin)).data.projetos;
  const project=projects.find(p=>p.nome==='PI2 — Demonstração').id;
  const restricted=projects.find(p=>p.nome==='PI2 — Projeto restrito').id;
  assert.equal((await call('/usuarios?projetoId='+restricted,member)).status,403);
  assert.equal((await call('/demandas/abc',admin)).status,400);
  assert.equal((await call('/demandas/999999999',admin)).status,404);
  assert.equal((await call('/dashboard',admin)).status,200);
  assert.equal((await call('/demandas?ordenarPor=naoexiste',admin)).status,400);
  assert.equal((await call('/demandas?busca='+encodeURIComponent("' OR 1=1 --"),admin)).status,200);
  const future=new Date();future.setUTCFullYear(future.getUTCFullYear()+1);future.setUTCMonth(5,10);
  const year=future.getUTCFullYear();
  const holidayResponse=await call('/feriados/'+year,admin);assert.equal(holidayResponse.status,200,'API externa de feriados');
  const holidays=holidayResponse.data.feriados;
  while(holidays.some(h=>h.date===future.toISOString().slice(0,10))) future.setUTCDate(future.getUTCDate()+1);
  const payload={titulo:'Teste de integração '+Date.now(),descricao:'Demanda criada para validar API, permissões e persistência.',tipo:'Tarefa',prioridade:'Alta',projetoId:project,responsavelId:member.user.id,prazoFinalizacao:future.toISOString().slice(0,10)};
  assert.equal((await call('/demandas',{...admin,method:'POST',body:{...payload,prazoFinalizacao:year+'-12-25'}})).status,400,'Bloqueio de feriado no cadastro');
  assert.equal((await call('/demandas',{...admin,method:'POST',body:payload,origin:'http://site-invalido.example'})).status,403,'Bloqueio de origem');
  const created=await call('/demandas',{...member,method:'POST',body:payload});assert.equal(created.status,201,'Cadastro no Oracle');
  const route='/demandas/'+created.data.id;
  const update=(session,body)=>call(route,{...session,method:'PUT',body});
  assert.equal((await update(member,{prioridade:'Crítica'})).status,403);
  assert.equal((await update(admin,{prazoFinalizacao:year+'-12-25'})).status,400,'Bloqueio de feriado na atualização');
  assert.equal((await update(leader,{prioridade:'Crítica'})).status,200);
  assert.equal((await update(member,{status:'Em andamento'})).status,200);
  assert.equal((await update(member,{status:'Concluída'})).status,403);
  assert.equal((await update(member,{status:'Aberta'})).status,403);
  assert.equal((await update(member,{status:'Em revisão'})).status,200);
  assert.equal((await update(member,{status:'Concluída'})).status,403);
  assert.equal((await update(leader,{status:'Em andamento'})).status,200);
  assert.equal((await update(leader,{status:'Em revisão'})).status,200);
  assert.equal((await update(leader,{status:'Concluída'})).status,200);
  assert.equal((await update(admin,{status:'Cancelada'})).status,403);
  assert.equal((await call(route,member)).data.status,'Concluída');
  const comment='Teste de persistência <script>texto sem execução</script>';
  assert.equal((await call(route+'/comentarios',{...member,method:'POST',body:{texto:comment,usuarioId:admin.user.id}})).status,201);
  const comments=(await call(route+'/comentarios',admin)).data.comentarios;
  assert(comments.some(c=>c.texto===comment&&c.usuarioId===member.user.id),'Autor do comentário obtido da sessão');
  const history=(await call(route+'/historico',admin)).data.historico;
  assert(history.length>=7);assert(history.some(h=>h.campo==='prioridade'&&h.valorNovo==='Crítica'));
  assert.equal(history.filter(h=>h.campo==='status').length,5);
  const second=await call('/demandas',{...admin,method:'POST',body:{...payload,titulo:payload.titulo+' — cancelamento'}});assert.equal(second.status,201);
  assert.equal((await call('/demandas/'+second.data.id,{...leader,method:'PUT',body:{status:'Cancelada'}})).status,200);
  assert.equal((await call('/demandas/'+second.data.id,admin)).data.status,'Cancelada');
  assert.equal((await call(route,{...admin,method:'DELETE'})).status,404);
  const filtered=await call('/demandas?status=Concluída&prioridade=Crítica&busca='+encodeURIComponent(payload.titulo)+'&ordenarPor=prioridade',admin);
  assert.equal(filtered.status,200);assert.equal(filtered.data.total,1);
  assert.equal((await call('/logout',{...member,method:'POST',body:{}})).status,200);
  assert.equal((await call('/sessao',member)).status,401);
  await call('/logout',{...leader,method:'POST',body:{}});await call('/logout',{...admin,method:'POST',body:{}});
  console.log('INTEGRACAO_OK: login, sessão, autorização, feriados, CRUD, filtros, status, comentários, histórico e logout.');
  console.log('Demandas de evidência: '+created.data.id+' (concluída), '+second.data.id+' (cancelada).');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
