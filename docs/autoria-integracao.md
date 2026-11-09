# Contribuições e conciliação com a main

Este registro separa a responsabilidade das telas das adaptações compartilhadas.
Os comentários não substituem o histórico de commits nem os cards da equipe.

| Parte | Evidência de responsabilidade/autoria |
|---|---|
| Login, autenticação e sessão | Vinicius Zorzetto — RA:24008052; implementação local com apoio do Codex |
| Dashboard | Caio Peccinato nos componentes originais; a integração adicional ao Oracle foi preparada nesta branch com Vinicius/Codex |
| Listagem | Leonardo Gambaroni Alves nos componentes originais; a integração adicional ao Oracle foi preparada nesta branch com Vinicius/Codex |
| Detalhes, edição na tela, comentários, status e histórico | João Pedro Silveira de Souza; código recebido na main até `ac514b0`, PR #28 |
| Modelagem e conexão originais | João Pedro Silveira de Souza; integração local acrescenta sessões e compatibilidade |
| Cadastro separado de demanda | Arquivos anteriores já identificavam Vinicius; confirmar a divisão com o grupo |
| Serviços novos, feriados, sessão, carga inicial e testes locais | Vinicius/Codex nesta branch; não foram atribuídos a outros integrantes |

Na atualização foram aproveitados o HTML, CSS, JavaScript, controller e rotas de
detalhes do João Pedro. Havia sobreposição com a implementação local de detalhes,
comentários, edição, status e histórico. As adaptações conciliam a sessão real
(`res.locals.usuario`) e o contrato das respostas, retirando o usuário padrão da
URL, sem usar o cabeçalho `X-Usuario-Id` como autenticação.

As leituras e os comentários usam o controller recebido. As atualizações chamam o
serviço transacional compartilhado para preservar validação de feriados, bloqueio
concorrente e histórico com valores anterior/novo. A tabela de histórico aceita
tanto a descrição textual da main quanto os campos estruturados da branch local;
nenhum registro antigo é apagado ou reescrito.

Foram removidos os banners repetidos de Vinicius das telas de dashboard e listagem,
dos adaptadores dos colegas e dos componentes de conexão/SQL. Os responsáveis
originais permanecem identificados. Isso não significa atribuir aos colegas os
arquivos novos criados nesta branch: esses continuam identificados e descritos aqui.

A main não alterou o login nesta atualização. O trabalho local de autenticação,
sessões, hash de senha, logout e proteção das rotas foi preservado.

Validação após a conciliação: compilação e cinco testes unitários aprovados; teste
completo da API aprovado; teste no navegador da tela do João com edição inline,
comentários, histórico, sessão, transições via PATCH e cancelamento aprovado.
O parâmetro usuarioId da URL não muda o perfil autenticado. A verificação visual
também identificou e corrigiu uma regra de CSS que exibia a seção de status oculta.

Backup anterior à atualização preservado no stash
`backup-integracao-antes-main-ac514b0`. A branch de trabalho permanece
`codex/integracao-reuniao-5`; nenhuma alteração foi enviada ao GitHub nesta revisão.
