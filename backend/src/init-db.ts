/* Autor: Vinicius Zorzetto — RA:24008052
 * Criação e carga inicial reproduzível. Não exclui registros nem troca senhas existentes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {initPool,closePool} from './data/conexao';
import {connection,rows,insertId} from './data/database';
import {hashPassword} from './security';
import {ADMIN,LEADER,MEMBER} from './rules';
async function main() {
  await initPool();
  try { await connection(async c => {
    const sql = fs.readFileSync(path.resolve(__dirname,'../database/BD-PI2.sql'),'utf8');
    for (const statement of sql.split(/^\/\s*$/m).map(s=>s.trim()).filter(Boolean)) {
      try { await c.execute(statement); }
      catch (error: any) { if (error.errorNum !== 955) throw error; }
    }
    // Histórico da main usa descricao; versão local usa os campos estruturados.
    // Apenas acrescenta colunas ausentes, sem reescrever o histórico existente.
    const historyColumns = await rows(c,"SELECT column_name FROM user_tab_columns WHERE table_name='HISTORICO_ALTERACOES'");
    for (const [name,type] of [['DESCRICAO','VARCHAR2(500)'],['CAMPO','VARCHAR2(50)'],['VALOR_ANTERIOR','VARCHAR2(2000)'],['VALOR_NOVO','VARCHAR2(2000)']]) {
      if (!historyColumns.some(row=>row.COLUMN_NAME===name)) await c.execute(`ALTER TABLE historico_alteracoes ADD ${name} ${type}`);
    }
    // Compatibilidade com o primeiro script do grupo, cujo campo tinha 500 caracteres.
    const [column] = await rows(c,"SELECT data_length FROM user_tab_columns WHERE table_name='DEMANDAS' AND column_name='DESCRICAO'");
    if (!column) await c.execute('ALTER TABLE demandas ADD descricao VARCHAR2(2000)');
    else if (column.DATA_LENGTH < 2000) await c.execute('ALTER TABLE demandas MODIFY descricao VARCHAR2(2000)');
    const accounts = [
      {nome:'Administrador demonstração',email:'admin@pi2.local',perfil:ADMIN},
      {nome:'Líder demonstração',email:'lider@pi2.local',perfil:LEADER},
      {nome:'Membro demonstração',email:'membro@pi2.local',perfil:MEMBER}
    ];
    const ids: number[] = [];
    for (const account of accounts) {
      const [existing] = await rows(c,'SELECT id_usuario "id" FROM usuarios WHERE LOWER(email)=:email',{email:account.email});
      ids.push(existing?.id || await insertId(c,'INSERT INTO usuarios(nome,email,perfil,senha) VALUES(:nome,:email,:perfil,:senha) RETURNING id_usuario INTO :newId', {...account,senha:hashPassword('Pi2@2026Demo!')}));
    }
    const projects: number[] = [];
    for (const name of ['PI2 — Demonstração','PI2 — Projeto restrito']) {
      const [existing] = await rows(c,'SELECT id_projeto "id" FROM projetos WHERE nome=:nome',{nome:name});
      projects.push(existing?.id || await insertId(c,'INSERT INTO projetos(nome) VALUES(:nome) RETURNING id_projeto INTO :newId',{nome:name}));
    }
    for (const [index,user] of ids.entries()) {
      for (const project of index === 0 ? projects : [projects[0]]) {
        await c.execute(`MERGE INTO projeto_usuarios pu USING (SELECT :projeto p,:usuario u FROM dual) src
          ON (pu.id_projeto=src.p AND pu.id_usuario=src.u) WHEN NOT MATCHED THEN INSERT(id_projeto,id_usuario) VALUES(src.p,src.u)`,{projeto:project,usuario:user});
      }
    }
    const examples = [
      ['Validar autenticação integrada','Defeito','Crítica','Aberta'],
      ['Integrar indicadores do dashboard','Tarefa','Alta','Em Andamento'],
      ['Revisar filtros da listagem','Melhoria','Média','Em Revisão'],
      ['Documentar execução do projeto','Documentação','Baixa','Concluída'],
      ['Preservar histórico de cancelamento','Tarefa','Alta','Cancelada'],
      ['Revisar permissões de acesso','Defeito','Crítica','Aberta']
    ];
    for (const [title,type,priority,status] of examples) {
      const [existing] = await rows(c,'SELECT id_demanda "id" FROM demandas WHERE titulo=:titulo AND id_projeto=:projeto',{titulo:title,projeto:projects[0]});
      if (existing) continue;
      const demandId = await insertId(c,`INSERT INTO demandas(titulo,descricao,tipo_demanda,prioridade,status,id_projeto,id_responsavel,prazo_finalizacao)
        VALUES(:titulo,:descricao,:tipo,:prioridade,:status,:projeto,:responsavel,TRUNC(CURRENT_DATE)+5) RETURNING id_demanda INTO :newId`,
        {titulo:title,descricao:`Demanda de carga inicial para demonstrar: ${title}.`,tipo:type,prioridade:priority,status,projeto:projects[0],responsavel:ids[2]});
      await c.execute("INSERT INTO historico_alteracoes(id_demanda,id_usuario,campo,valor_novo,descricao) VALUES(:demanda,:usuario,'carga inicial',:status,'Carga inicial de demonstração')",{demanda:demandId,usuario:ids[0],status});
      await c.execute("INSERT INTO comentarios(id_demanda,id_usuario,texto) VALUES(:demanda,:usuario,'Dados preparados para a demonstração da Reunião 5.')",{demanda:demandId,usuario:ids[1]});
    }
    await c.commit();
    console.log('Estrutura e carga inicial prontas. Nenhum dado existente foi apagado.');
  }); } finally { await closePool(); }
}
main().catch(error=>{console.error('Falha na preparação:',error.code||error.message);process.exitCode=1;});
