-- Autor original: João Pedro Silveira de Souza
-- Sessões e compatibilidade entre versões: consultar docs/autoria-integracao.md
-- Oracle: executar cada comando separado por uma linha contendo /.
-- O inicializador ignora somente objetos já existentes; não apaga tabelas nem registros.
CREATE TABLE usuarios (
  id_usuario NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR2(180) NOT NULL,
  email VARCHAR2(150) NOT NULL UNIQUE,
  senha VARCHAR2(255) NOT NULL,
  perfil VARCHAR2(30) NOT NULL,
  CONSTRAINT check_usuario_perfil CHECK (perfil IN ('Administrador','Líder de Projeto','Membro da Equipe'))
)
/
CREATE TABLE projetos (
  id_projeto NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR2(100) NOT NULL
)
/
CREATE TABLE projeto_usuarios (
  id_projeto NUMBER NOT NULL REFERENCES projetos(id_projeto),
  id_usuario NUMBER NOT NULL REFERENCES usuarios(id_usuario),
  data_vinculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_projeto_usuarios PRIMARY KEY (id_projeto,id_usuario)
)
/
CREATE TABLE demandas (
  id_demanda NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo VARCHAR2(150) NOT NULL,
  descricao VARCHAR2(2000) NOT NULL,
  tipo_demanda VARCHAR2(30) NOT NULL,
  id_responsavel NUMBER REFERENCES usuarios(id_usuario),
  id_projeto NUMBER NOT NULL REFERENCES projetos(id_projeto),
  prioridade VARCHAR2(20) NOT NULL,
  status VARCHAR2(50) DEFAULT 'Aberta' NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  prazo_finalizacao DATE,
  CONSTRAINT check_tipo_demanda CHECK (tipo_demanda IN ('Tarefa','Defeito','Melhoria','Documentação')),
  CONSTRAINT check_prioridade CHECK (prioridade IN ('Crítica','Alta','Média','Baixa')),
  CONSTRAINT check_status CHECK (status IN ('Aberta','Em Andamento','Em Revisão','Concluída','Cancelada'))
)
/
CREATE TABLE comentarios (
  id_comentario NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_demanda NUMBER NOT NULL REFERENCES demandas(id_demanda),
  id_usuario NUMBER NOT NULL REFERENCES usuarios(id_usuario),
  texto VARCHAR2(300) NOT NULL,
  data_comentario TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)
/
CREATE TABLE sessoes (
  token_hash VARCHAR2(64) PRIMARY KEY,
  id_usuario NUMBER NOT NULL REFERENCES usuarios(id_usuario),
  expira_em TIMESTAMP NOT NULL
)
/
CREATE TABLE historico_alteracoes (
  id_historico NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_demanda NUMBER NOT NULL REFERENCES demandas(id_demanda),
  id_usuario NUMBER NOT NULL REFERENCES usuarios(id_usuario),
  descricao VARCHAR2(500),
  campo VARCHAR2(50),
  valor_anterior VARCHAR2(2000),
  valor_novo VARCHAR2(2000),
  data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)
/
-- O histórico é acrescentado na mesma transação da alteração, nunca reescrito.
CREATE OR REPLACE TRIGGER pi2_historico_imutavel
BEFORE UPDATE OR DELETE ON historico_alteracoes
BEGIN
  RAISE_APPLICATION_ERROR(-20001, 'O histórico não pode ser alterado ou apagado.');
END;
/
-- Cancelamento preserva os dados e o histórico para auditoria.
CREATE OR REPLACE TRIGGER pi2_demanda_sem_exclusao
BEFORE DELETE ON demandas
BEGIN
  RAISE_APPLICATION_ERROR(-20002, 'Use cancelamento; demandas não podem ser excluídas.');
END;
/
