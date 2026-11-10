/* Autor: Vinicius Zorzetto — RA:24008052
 * Cadastro e edição persistentes. Opções, permissões e status vêm da API autenticada.
 */
const form=document.getElementById('demandForm'),feedback=document.getElementById('formMessage');
const field=id=>document.getElementById(id);
const demandId=new URLSearchParams(location.search).get('id');
let current=null,user=null,holidayVersion=0;
function options(select,items,label,placeholder) {
  select.replaceChildren(new Option(placeholder,''));
  items.forEach(item=>select.add(new Option(item[label],item.id)));
}
async function responsible() {
  if(!field('project').value) {options(field('responsible'),[],'nome','Não atribuído'); return;}
  const {usuarios}=await PI2.request('/usuarios?projetoId='+field('project').value);
  options(field('responsible'),user.perfil==='Membro da Equipe'?usuarios.filter(u=>u.id===user.id):usuarios,'nome','Não atribuído');
}
async function checkHoliday() {
  const version=++holidayVersion,date=field('deadline').value;
  field('holidayMessage').textContent='';
  if(!date) return;
  try {
    const {feriados}=await PI2.request('/feriados/'+date.slice(0,4));
    if(version!==holidayVersion) return;
    const holiday=feriados.find(h=>h.date===date);
    field('holidayMessage').textContent=holiday?`Escolha outra data: ${holiday.name} é feriado nacional.`:'';
  }catch(error){if(version===holidayVersion) field('holidayMessage').textContent=error.message;}
}
const submit=form.querySelector('button[type=submit]');submit.disabled=true;
PI2.ready.then(async usuario=>{
  user=usuario;
  const {projetos}=await PI2.request('/projetos');options(field('project'),projetos,'nome','Selecione o projeto');
  if(demandId) {
    current=await PI2.request('/demandas/'+encodeURIComponent(demandId));
    if(!current.podeEditar) throw new Error('Você não pode editar esta demanda ou ela já está encerrada.');
    field('pageTitle').textContent='Editar demanda';field('submitText').textContent='Salvar alterações';document.title='Gestão de Demandas | Editar Demanda';
    field('project').value=current.projetoId;field('project').disabled=true;await responsible();
    for(const [input,key] of [['title','titulo'],['description','descricao'],['type','tipo'],['priority','prioridade'],['responsible','responsavelId'],['deadline','prazoFinalizacao']]) field(input).value=current[key]??'';
    field('status').replaceChildren(...[current.status,...current.transicoesPermitidas].map(s=>new Option(s,s)));
    if(user.perfil==='Membro da Equipe') ['title','description','type','priority','responsible','deadline'].forEach(id=>field(id).disabled=true);
  } else {field('statusGroup').hidden=true;}
  submit.disabled=false;
}).catch(error=>PI2.message(feedback,error.message));
field('project').addEventListener('change',()=>responsible().catch(error=>PI2.message(feedback,error.message)));
field('deadline').addEventListener('change',checkHoliday);
form.addEventListener('submit',async event=>{
  event.preventDefault();PI2.message(feedback,'');
  if(!form.reportValidity()) return;
  const title=field('title').value.trim(),description=field('description').value.trim();
  if(title.length<3 || title.length>150) {PI2.message(feedback,'O título deve ter entre 3 e 150 caracteres.');return;}
  if(description.length<10 || description.length>2000) {PI2.message(feedback,'A descrição deve ter entre 10 e 2000 caracteres.');return;}
  const payload={titulo:title,descricao:description,tipo:field('type').value,prioridade:field('priority').value,
    projetoId:Number(field('project').value),responsavelId:field('responsible').value?Number(field('responsible').value):null,prazoFinalizacao:field('deadline').value};
  if(current) payload.status=field('status').value;
  if(!payload.projetoId || !payload.prazoFinalizacao) {PI2.message(feedback,'Selecione projeto e prazo.');return;}
  // Não impede salvar uma mudança de status mantendo um prazo antigo já existente.
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
  if((!current || payload.prazoFinalizacao!==current.prazoFinalizacao) && payload.prazoFinalizacao<today) {PI2.message(feedback,'O prazo não pode ser uma data passada.');return;}
  submit.disabled=true;
  try {
    const saved=await PI2.request('/demandas'+(demandId?'/'+encodeURIComponent(demandId):''),{method:demandId?'PUT':'POST',body:JSON.stringify(payload)});
    location.assign('detalhes-demanda.html?id='+saved.id);
  }catch(error){PI2.message(feedback,error.message);}finally{submit.disabled=false;}
});
