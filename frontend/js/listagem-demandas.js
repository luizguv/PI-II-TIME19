/* Autor original: Leonardo Gambaroni Alves
 * Os filtros são enviados à API; nenhuma demanda é extraída de HTML fixo.
 */
const {request,element,message,date,ready} = PI2;
const feedback = document.getElementById('apiMessage');
const tbody = document.querySelector('.tabela-demandas tbody');
const search = document.getElementById('busca');
const controls = {status:'filtro-status',prioridade:'filtro-prioridade',tipo:'filtro-tipo',projetoId:'filtro-projeto',ordenarPor:'ordenarPor'};
let version = 0, timer;
async function load() {
  const current = ++version;
  if (search.value.length > 60) {message(feedback,'A busca deve ter no máximo 60 caracteres.'); return;}
  const params = new URLSearchParams();
  if (search.value.trim()) params.set('busca',search.value.trim());
  for (const [name,id] of Object.entries(controls)) if(document.getElementById(id).value) params.set(name,document.getElementById(id).value);
  message(feedback,'Carregando demandas…',false);
  try {
    const {demandas} = await request('/demandas?'+params);
    if (current !== version) return;
    tbody.replaceChildren();
    for(const d of demandas) {
      const row = element('tr');
      for(const value of [d.titulo,d.tipo,d.prioridade,d.status,d.projetoNome,d.responsavelNome || 'Não atribuído',date(d.prazoFinalizacao)]) row.append(element('td',value));
      const cell = element('td'), link = element('a','Ver','btn btn-secondary btn-acao');
      link.href = `detalhes-demanda.html?id=${d.id}`;cell.append(link);row.append(cell);tbody.append(row);
    }
    if(!demandas.length) { const row=element('tr'),cell=element('td','Nenhuma demanda encontrada.');cell.colSpan=8;row.append(cell);tbody.append(row); }
    message(feedback,`${demandas.length} demanda(s) encontrada(s).`,false);
  } catch(error) {if(current === version) {tbody.replaceChildren();message(feedback,error.message);}}
}
ready.then(async()=>{
  const {projetos} = await request('/projetos');
  projetos.forEach(p=>{const option=element('option',p.nome);option.value=p.id;document.getElementById('filtro-projeto').append(option);});
  await load();
  search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(load,250);});
  Object.values(controls).forEach(id=>document.getElementById(id).addEventListener('change',load));
}).catch(error=>message(feedback,error.message));
