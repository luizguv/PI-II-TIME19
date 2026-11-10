# Sistema de Acompanhamento de Demandas — PI-II-TIME19

Projeto Integrador II, Engenharia de Software, PUC-Campinas — 2º semestre de 2026.

Equipe: Caio Peccinato, João Pedro Silveira de Souza, Leonardo Gambaroni Alves,
Luiz Gustavo Urias Vieira e Vinicius Davi Zorzetto de Matos. Professora: Renata Arantes.

Login e sessão: **Vinicius Zorzetto — RA:24008052**.
Detalhes, comentários e histórico: **João Pedro Silveira de Souza** (atualização da main).
Dashboard: **Caio Peccinato**. Listagem: **Leonardo Gambaroni Alves**.
A contribuição adicional desta branch e os ajustes de compatibilidade estão em `docs/autoria-integracao.md`.
Os cabeçalhos mantêm a autoria original dos componentes compartilhados.

## Requisitos e execução

- Node.js 22 ou 24 LTS, npm e acesso ao Oracle da equipe.
- FortiClient conectado à VPN acadêmica da PUC quando estiver fora da rede da faculdade.
- Abra um terminal na pasta `backend` e execute `npm install`.
- Copie `backend/.env.example` para `backend/.env` e preencha os dados fornecidos pelo grupo.
  As variáveis são `ORACLE_HOST`, `ORACLE_PORT`, `ORACLE_SERVICE`, `ORACLE_USER`,
  `ORACLE_PASSWORD` e `PORT` (padrão 3000). Nunca envie `.env` ao GitHub.
- Execute `npm run db:init` para criar as tabelas e inserir a carga inicial.
  O script versionado é `backend/database/BD-PI2.sql`; o carregador está em
  `backend/src/init-db.ts`. Não há DROP, TRUNCATE nem exclusão dos dados existentes.
  DDL Oracle faz commit implícito: em caso de falha, corrija a causa e execute novamente.
- Execute `npm run dev` e abra **http://localhost:3000**.
  O Express serve o frontend e a API na mesma origem. Use esse endereço para as sessões;
  não abra os HTMLs por `file://` ou por uma porta diferente do Live Server.
- Para compilar: `npm run build`. Para executar compilado: `npm start`.
- Para validar regras e segurança: `npm test`.
- Com servidor e VPN ativos: `npm run test:integration`. Esse teste grava demandas
  fictícias identificadas, comentário e histórico; preserva esses registros como evidência.

## Contas de demonstração

| Perfil | E-mail | Senha de demonstração |
|---|---|---|
| Administrador | admin@pi2.local | Pi2@2026Demo! |
| Líder de Projeto | lider@pi2.local | Pi2@2026Demo! |
| Membro da Equipe | membro@pi2.local | Pi2@2026Demo! |

São contas fictícias para apresentação, distintas do RA/VPN e do usuário Oracle.
As senhas ficam no banco como hashes scrypt com salt aleatório. O inicializador não
troca senhas de contas existentes. Não use essas contas em uma publicação na internet.

## Integração e API

Todas as rotas abaixo recebem o prefixo `/api`. O login cria um cookie HttpOnly;
requisições sem sessão recebem 401. Sessão normal: 12 horas e cookie da sessão do
navegador. “Lembrar de mim”: até sete dias. Sair invalida a sessão no banco.

| Método | Rota | Operação |
|---|---|---|
| POST | /login | Recebe `email`, `senha` e `lembrar` opcional |
| GET / POST | /sessao / /logout | Consulta usuário / encerra sessão |
| GET | /dashboard | Indicadores dos projetos acessíveis |
| GET | /projetos | Projetos acessíveis ao usuário |
| GET | /usuarios?projetoId=ID | Responsáveis vinculados ao projeto |
| GET | /demandas | Filtros `status`, `prioridade`, `tipo`, `projetoId`, `responsavelId`, `busca`, `ordenarPor` |
| POST | /demandas | Cadastra demanda com status Aberta |
| GET / PUT | /demandas/:id | Consulta / atualiza demanda |
| GET / POST | /demandas/:id/comentarios | Lista / registra comentário do usuário autenticado |
| GET | /demandas/:id/historico | Histórico imutável, com autor e data |
| GET | /feriados/:ano | Feriados nacionais obtidos da BrasilAPI |

Cadastro recebe `titulo`, `descricao`, `tipo`, `prioridade`, `projetoId`,
`responsavelId` (ou null) e `prazoFinalizacao` no formato AAAA-MM-DD.
Atualização permite os mesmos campos e `status`, preservando o projeto original.
Ordenações aceitas: `dataCriacao`, `titulo`, `prioridade`, `status`, `prazoFinalizacao`.
Erros de validação: 400; sessão inválida: 401; permissão: 403; inexistente: 404;
limite de login: 429; API de feriados indisponível: 503. As telas mostram as mensagens.

## Perfis e ciclo de vida

**Conferir esta matriz com o Documento de Visão antes da entrega final.**
O PDF da Reunião 5 remete ao item 2.1, mas não enumera as permissões completas.
A implementação inicial usa a seguinte distribuição conservadora:

| Ação | Administrador | Líder vinculado | Membro vinculado |
|---|---|---|---|
| Visualizar | Todos os projetos | Seus projetos | Seus projetos |
| Cadastrar | Sim | Sim | Sim; atribuição apenas a si ou não atribuída |
| Editar dados, responsável, prioridade e prazo | Sim | Sim | Não |
| Iniciar / enviar para revisão | Sim | Sim | Apenas quando responsável |
| Aprovar conclusão / devolver revisão | Sim | Sim | Não |
| Cancelar | Sim | Sim | Não |
| Comentar | Projetos acessíveis | Seus projetos | Seus projetos |

Fluxo: Aberta → Em andamento → Em revisão → Concluída.
Em revisão pode voltar a Em andamento. Não há retorno a Aberta nem conclusão direta
de Em andamento. Estados finais não são reabertos. Cancelamento preserva a linha.
Todas as alterações são gravadas com autor, valores anterior/novo e data na mesma
transação; triggers impedem UPDATE/DELETE do histórico e DELETE de demandas.

A BrasilAPI é consultada no servidor para prazo novo ou alterado; a tela também avisa
sobre feriados. Se a consulta falhar, salvar um prazo novo fica bloqueado com mensagem.
Datas anteriores são rejeitadas no cadastro e na mudança de prazo. Manter o prazo
existente não impede uma transição de status de demanda atrasada.

## Roteiro da apresentação

1. Conectar VPN, iniciar API e entrar com senha inválida para demonstrar o erro.
2. Entrar com cada perfil; navegar e recarregar para demonstrar sessão.
3. Mostrar indicadores, filtros, busca e ordenação, com dados da carga inicial.
4. Cadastrar uma demanda com prazo em dia comum; abrir seus detalhes.
5. Tentar prazo em 25/12 de um ano futuro e mostrar o bloqueio de feriado.
6. Comentar, atualizar e recarregar para demonstrar persistência.
7. Percorrer os status; mostrar bloqueio de conclusão direta e permissão do membro.
8. Cancelar uma demanda não concluída e consultar seu histórico.
9. Sair; conferir que as rotas deixam de aceitar a sessão.

## Organização e entrega

Desenvolver em branches e integrar por revisão. Esta integração usa
`codex/integracao-reuniao-5`. Não atribuir trabalho dos colegas a outro autor.
O checklist `docs/reuniao-5.md` separa evidências técnicas dos registros que cada
integrante deve preencher no GitHub Projects com estimativa e esforço **real**.
Não inventar horas. Após revisão do grupo e validação da versão final, criar a tag
`1.0.0-final` no commit entregue e publicar a branch/tag conforme o fluxo da equipe.

O repositório antigo rastreia arquivos em `backend/node_modules`: o `.gitignore`
impede novos arquivos locais, mas não remove os que já fazem parte do histórico.
A retirada desses arquivos do índice deve ser combinada com a equipe separadamente.
