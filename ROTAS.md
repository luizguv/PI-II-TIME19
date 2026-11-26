# Rotas da API

Todas as rotas ficam sob o prefixo `/api` (`backend/src/app.ts:11`) e são montadas em `backend/src/api.ts:13-19`.
`/login` é registrada antes do `requireSession` (`api.ts:14`); todas as demais exigem sessão válida.

Caminhos abaixo relativos a `backend/src/modulos/` (backend) e `frontend/` (frontend).

## auth

| Método | Endereço | Arquivo da rota:linha | Função (controller):linhas | Quem chama no frontend (arquivo:linha) | Botão na tela |
|---|---|---|---|---|---|
| POST | /api/login | auth/authRoutes.ts:8 | `login` — auth/authController.ts:12-38 | js/login.js:17 | "Entrar" (login.html:112) |
| GET | /api/sessao | auth/authRoutes.ts:12 | `getSession` — auth/authController.ts:40-42 | js/api.js:34 | Nenhum: automático ao abrir qualquer tela interna |
| POST | /api/logout | auth/authRoutes.ts:13 | `logout` — auth/authController.ts:44-52 | js/api.js:43 | Link "Sair" do menu (ex.: dashboard.html:28) |

## dashboard

| Método | Endereço | Arquivo da rota:linha | Função (controller):linhas | Quem chama no frontend (arquivo:linha) | Botão na tela |
|---|---|---|---|---|---|
| GET | /api/dashboard | dashboard/dashboardRoutes.ts:7 | `getDashboard` — dashboard/dashboardController.ts:10-22 | js/dashboard.js:8 | Nenhum: automático ao abrir dashboard.html |

## listagem

| Método | Endereço | Arquivo da rota:linha | Função (controller):linhas | Quem chama no frontend (arquivo:linha) | Botão na tela |
|---|---|---|---|---|---|
| GET | /api/demandas | listagem/listagemRoutes.ts:7 | `listDemands` — listagem/listagemController.ts:9-42 | js/listagem-demandas.js:19 | Automático ao abrir; repete ao digitar na busca (`busca`) ou trocar filtros/ordenação (listagem-demandas.js:38-39) |

## cadastro

| Método | Endereço | Arquivo da rota:linha | Função (controller):linhas | Quem chama no frontend (arquivo:linha) | Botão na tela |
|---|---|---|---|---|---|
| GET | /api/projetos | cadastro/cadastroRoutes.ts:7 | `listProjects` — cadastro/cadastroController.ts:10-18 | js/cadastrodemanda.js:34; js/listagem-demandas.js:34 | Nenhum: automático ao abrir (preenche os selects de projeto) |
| GET | /api/usuarios?projetoId= | cadastro/cadastroRoutes.ts:8 | `listProjectUsers` — cadastro/cadastroController.ts:20-29 | js/cadastrodemanda.js:15 | Ao trocar o select "Projeto" (cadastrodemanda.js:47) |
| GET | /api/feriados/:ano | cadastro/cadastroRoutes.ts:9 | `listHolidays` — cadastro/cadastroController.ts:31-33 | js/cadastrodemanda.js:24 | Ao trocar o campo de prazo `deadline` (cadastrodemanda.js:48) |
| POST | /api/demandas | cadastro/cadastroRoutes.ts:10 | `createDemand` — cadastro/cadastroController.ts:35-55 | js/cadastrodemanda.js:66 (sem ID na URL) | "Cadastrar demanda" (cadastrodemanda.html:173) |

## detalhes

| Método | Endereço | Arquivo da rota:linha | Função (controller):linhas | Quem chama no frontend (arquivo:linha) | Botão na tela |
|---|---|---|---|---|---|
| GET | /api/demandas/:id | detalhes/detalhesDemandaRoutes.ts:21 | `getDemandaPorId` — detalhes/detalhesDemandaController.ts:142-152 | js/detalhes-demanda.js:233; js/cadastrodemanda.js:37 (modo edição) | Nenhum: automático ao abrir a tela (vem do link "Ver" da listagem) |
| GET | /api/demandas/:id/comentarios | detalhes/detalhesDemandaRoutes.ts:22 | `listarComentarios` — detalhes/detalhesDemandaController.ts:154-173 | js/detalhes-demanda.js:145 | Automático ao abrir; recarrega após "Enviar Comentário" |
| GET | /api/demandas/:id/historico | detalhes/detalhesDemandaRoutes.ts:23 | `listarHistorico` — detalhes/detalhesDemandaController.ts:200-220 | js/detalhes-demanda.js:196 | Automático ao abrir; recarrega após "Atualizar status" e "Salvar alterações" |
| GET | /api/demandas/:id/responsaveis | detalhes/detalhesDemandaRoutes.ts:24 | `listarResponsaveis` — detalhes/detalhesDemandaController.ts:223-245 | js/detalhes-demanda.js:355 | "Editar demanda" (detalhes-demanda.html:129) |
| POST | /api/demandas/:id/comentarios | detalhes/detalhesDemandaRoutes.ts:27 | `criarComentario` — detalhes/detalhesDemandaController.ts:176-197 | js/detalhes-demanda.js:282 | "Enviar Comentário" (detalhes-demanda.html:245) |
| PUT | /api/demandas/:id | detalhes/detalhesDemandaRoutes.ts:28 | `atualizarDemanda` — detalhes/detalhesDemandaController.ts:248-253 | js/detalhes-demanda.js:447; js/cadastrodemanda.js:66 (com ID na URL) | "Salvar alterações" (detalhes-demanda.html:210; no cadastro, o mesmo botão de envio com texto trocado) |
| PATCH | /api/demandas/:id/status | detalhes/detalhesDemandaRoutes.ts:29 | `atualizarStatus` — detalhes/detalhesDemandaController.ts:256-261 | js/detalhes-demanda.js:328 | "Atualizar status" (detalhes-demanda.html:119) |

## Chamada externa: BrasilAPI

| Método | Endereço | Arquivo:linha | Função:linhas | Quem usa no backend | Origem na tela |
|---|---|---|---|---|---|
| GET | https://brasilapi.com.br/api/feriados/v1/{ano} | backend/src/holidays.ts:12 | `holidays` — holidays.ts:6-23 | modulos/cadastro/cadastroController.ts:32 (`listHolidays`); demand-service.ts:47 (`checkDeadline`, validação de prazo ao salvar) | Troca do prazo no cadastro (via `/api/feriados/:ano`) e envio do formulário |
