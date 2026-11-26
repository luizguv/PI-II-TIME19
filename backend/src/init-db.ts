/* Autor: João Pedro Silveira de Souza
 * Criação e carga inicial reproduzível. Não exclui registros nem troca senhas existentes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Connection } from 'oracledb';
import { initPool, closePool } from './data/conexao';
import { connection, rows, insertId } from './data/database';
import { hashPassword } from './security';
import { ADMIN, LEADER, MEMBER } from './rules';

// senha das contas de demonstracao
const SENHA_DEMO = 'Pi2@2026Demo!';
// erro do oracle para objeto que ja existe
const ORA_OBJETO_JA_EXISTE = 955;

// contas de demonstracao
const CONTAS_DEMO = [
  { nome: 'Administrador demonstração', email: 'admin@pi2.local', perfil: ADMIN },
  { nome: 'Líder demonstração', email: 'lider@pi2.local', perfil: LEADER },
  { nome: 'Membro demonstração', email: 'membro@pi2.local', perfil: MEMBER },
];

// projetos de demonstracao
const PROJETOS_DEMO = ['PI2 — Demonstração', 'PI2 — Projeto restrito'];

// demandas de demonstracao: [titulo, tipo, prioridade, status]
const DEMANDAS_DEMO = [
  ['Validar autenticação integrada', 'Defeito', 'Crítica', 'Aberta'],
  ['Integrar indicadores do dashboard', 'Tarefa', 'Alta', 'Em Andamento'],
  ['Revisar filtros da listagem', 'Melhoria', 'Média', 'Em Revisão'],
  ['Documentar execução do projeto', 'Documentação', 'Baixa', 'Concluída'],
  ['Preservar histórico de cancelamento', 'Tarefa', 'Alta', 'Cancelada'],
  ['Revisar permissões de acesso', 'Defeito', 'Crítica', 'Aberta'],
];

// funcao que executa o script sql do banco
async function criarEstrutura(c: Connection) {
  const sql = fs.readFileSync(path.resolve(__dirname, '../database/BD-PI2.sql'), 'utf8');

  // separa os comandos pela barra /
  const statements = sql
    .split(/^\/\s*$/m)
    .map(s => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await c.execute(statement);
    } catch (error: any) {
      if (error.errorNum !== ORA_OBJETO_JA_EXISTE) throw error;
    }
  }
}

// funcao que acrescenta colunas que faltam
async function migrarColunas(c: Connection) {
  // colunas do historico
  // so acrescenta, nao apaga nada
  const historyColumns = await rows(
    c,
    "SELECT column_name FROM user_tab_columns WHERE table_name = 'HISTORICO_ALTERACOES'",
  );
  const novasColunas = [
    ['DESCRICAO', 'VARCHAR2(500)'],
    ['CAMPO', 'VARCHAR2(50)'],
    ['VALOR_ANTERIOR', 'VARCHAR2(2000)'],
    ['VALOR_NOVO', 'VARCHAR2(2000)'],
  ];
  for (const [name, type] of novasColunas) {
    if (!historyColumns.some(row => row.COLUMN_NAME === name)) {
      await c.execute(`ALTER TABLE historico_alteracoes ADD ${name} ${type}`);
    }
  }

  // descricao com 2000 caracteres
  const [column] = await rows(
    c,
    "SELECT data_length FROM user_tab_columns WHERE table_name = 'DEMANDAS' AND column_name = 'DESCRICAO'",
  );
  if (!column) {
    await c.execute('ALTER TABLE demandas ADD descricao VARCHAR2(2000)');
  } else if (column.DATA_LENGTH < 2000) {
    await c.execute('ALTER TABLE demandas MODIFY descricao VARCHAR2(2000)');
  }
}

// funcao que cria as contas de demonstracao
async function criarContas(c: Connection): Promise<number[]> {
  const ids: number[] = [];
  for (const account of CONTAS_DEMO) {
    const [existing] = await rows(c, 'SELECT id_usuario "id" FROM usuarios WHERE LOWER(email) = :email', {
      email: account.email,
    });
    ids.push(
      existing?.id ||
        (await insertId(
          c,
          `INSERT INTO usuarios (nome, email, perfil, senha)
           VALUES (:nome, :email, :perfil, :senha)
           RETURNING id_usuario INTO :newId`,
          { ...account, senha: hashPassword(SENHA_DEMO) },
        )),
    );
  }
  return ids;
}

// funcao que cria os projetos de demonstracao
async function criarProjetos(c: Connection): Promise<number[]> {
  const projects: number[] = [];
  for (const name of PROJETOS_DEMO) {
    const [existing] = await rows(c, 'SELECT id_projeto "id" FROM projetos WHERE nome = :nome', { nome: name });
    projects.push(
      existing?.id ||
        (await insertId(c, 'INSERT INTO projetos (nome) VALUES (:nome) RETURNING id_projeto INTO :newId', {
          nome: name,
        })),
    );
  }
  return projects;
}

// funcao que liga usuarios aos projetos (admin em todos)
async function vincularUsuarios(c: Connection, ids: number[], projects: number[]) {
  for (const [index, user] of ids.entries()) {
    const projetosDoUsuario = index === 0 ? projects : [projects[0]];
    for (const project of projetosDoUsuario) {
      await c.execute(
        `MERGE INTO projeto_usuarios pu
         USING (SELECT :projeto p, :usuario u FROM dual) src
            ON (pu.id_projeto = src.p AND pu.id_usuario = src.u)
          WHEN NOT MATCHED THEN INSERT (id_projeto, id_usuario) VALUES (src.p, src.u)`,
        { projeto: project, usuario: user },
      );
    }
  }
}

// funcao que cria as demandas de demonstracao
async function criarDemandas(c: Connection, ids: number[], projeto: number) {
  const [adminId, liderId, membroId] = ids;

  for (const [title, type, priority, status] of DEMANDAS_DEMO) {
    const [existing] = await rows(
      c,
      'SELECT id_demanda "id" FROM demandas WHERE titulo = :titulo AND id_projeto = :projeto',
      { titulo: title, projeto },
    );
    if (existing) continue;

    const demandId = await insertId(
      c,
      `INSERT INTO demandas (titulo, descricao, tipo_demanda, prioridade, status, id_projeto, id_responsavel, prazo_finalizacao)
       VALUES (:titulo, :descricao, :tipo, :prioridade, :status, :projeto, :responsavel, TRUNC(CURRENT_DATE) + 5)
       RETURNING id_demanda INTO :newId`,
      {
        titulo: title,
        descricao: `Demanda de carga inicial para demonstrar: ${title}.`,
        tipo: type,
        prioridade: priority,
        status,
        projeto,
        responsavel: membroId,
      },
    );

    await c.execute(
      `INSERT INTO historico_alteracoes (id_demanda, id_usuario, campo, valor_novo, descricao)
       VALUES (:demanda, :usuario, 'carga inicial', :status, 'Carga inicial de demonstração')`,
      { demanda: demandId, usuario: adminId, status },
    );

    await c.execute(
      `INSERT INTO comentarios (id_demanda, id_usuario, texto)
       VALUES (:demanda, :usuario, 'Dados preparados para a demonstração da Reunião 5.')`,
      { demanda: demandId, usuario: liderId },
    );
  }
}

// funcao principal: cria estrutura e dados
async function main() {
  await initPool();
  try {
    await connection(async c => {
      await criarEstrutura(c);
      await migrarColunas(c);

      const ids = await criarContas(c);
      const projects = await criarProjetos(c);
      await vincularUsuarios(c, ids, projects);
      await criarDemandas(c, ids, projects[0]);

      await c.commit();
      console.log('Estrutura e carga inicial prontas. Nenhum dado existente foi apagado.');
    });
  } finally {
    await closePool();
  }
}

// executa e mostra erro se falhar
main().catch(error => {
  console.error('Falha na preparação:', error.code || error.message);
  process.exitCode = 1;
});
