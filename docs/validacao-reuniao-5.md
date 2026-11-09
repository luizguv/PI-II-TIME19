<!-- Autor: Vinicius Zorzetto — RA:24008052 -->
# Validação da integração — 09/11/2026

Base: main atualizada ao commit `f89b26e`; desenvolvimento em `codex/integracao-reuniao-5`.

Verificações executadas com VPN conectada e Oracle da equipe:

- `npm test`: compilação TypeScript e cinco testes de senha, tokens, datas, ciclo de vida e perfis aprovados.
- `npm run test:integration`: autenticação, 400/401/403/404, isolamento entre projetos,
  sessão, dados do dashboard, filtros, busca, ordenação, cadastro, atualização,
  feriado no cadastro e edição, transições, conclusão, cancelamento, comentários,
  autoria obtida da sessão, histórico e logout aprovados.
- Navegador Edge em modo de teste: erro de login, login válido, sessão após reload,
  dashboard, busca, detalhes, edição, cadastro, aviso de feriado, comentário,
  cancelamento, persistência após reload e logout aprovados, sem erros JavaScript.
- Inspeção visual do dashboard, detalhes e cadastro em viewport móvel.
- Triggers Oracle válidos; UPDATE/DELETE do histórico retornam ORA-20001 e DELETE
  de demandas retorna ORA-20002. Testes sem selecionar registros para alteração.
- `backend/.env` ignorado pelo Git; credenciais reais não fazem parte do diff.

Os testes de integração preservam demandas fictícias identificadas no banco. Não
foram apagados dados para limpar testes. As evidências incluem registros concluídos
e cancelados, úteis para demonstrar filtros e histórico.

Limites: o Documento de Visão não estava disponível para confirmar a matriz exata
de permissões. Não foram verificados os cards/horas no GitHub Projects, o cronograma
no Canvas nem alterações não integradas nas branches dos outros integrantes.
O código está na branch local; não foi enviado ao GitHub nem marcado como release final.
