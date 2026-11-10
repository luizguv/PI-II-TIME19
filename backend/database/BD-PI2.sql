-- Autor: João Pedro Silveira de Souza
-- Componente: Projeto Integrador II - Engenharia de Software (2026)
-- Descrição: Banco de Dados para o projeto

-- Criação da tabela Usuários
-- Armazena os usuários e seus respectivos perfis de acesso
CREATE TABLE usuarios (
    id_usuario NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR2(180) NOT NULL,
    email VARCHAR2(150) NOT NULL UNIQUE,
    senha VARCHAR2(255) NOT NULL,
    perfil VARCHAR2(30) NOT NULL,
    
    -- Checa se o tipo do perfil está entre Administrador, Lider de projeto ou Membro da Equipe
    CONSTRAINT check_usuario_perfil CHECK (
        perfil IN ('Administrador', 'Líder de Projeto', 'Membro da Equipe')
    )
);

-- criação da tabela projetos
-- armazena os projetos nos quais as demandas serão vinculadas
CREATE TABLE projetos(
    id_projeto NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR2(100) NOT NULL
);

-- criação da tabela associativa necessária para atender às permissões de Líder de Projeto e Membro da Equipe 
-- que só podem visualizar projetos aos quais estão vinculados
CREATE TABLE projeto_usuarios (
    id_projeto NUMBER NOT NULL,
    id_usuario NUMBER NOT NULL,
    data_vinculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT pk_projeto_usuarios PRIMARY KEY (id_projeto, id_usuario),
    CONSTRAINT fk_pu_projeto FOREIGN KEY (id_projeto) REFERENCES projetos (id_projeto),
    CONSTRAINT fk_pu_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
);

-- Criação da tabela Demandas
-- Armazena as demandas e suas respectivas informações
CREATE TABLE demandas (
    id_demanda NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR2(150) NOT NULL,
    descricao VARCHAR2(500) NOT NULL,
    tipo_demanda VARCHAR2(30) NOT NULL,
    id_responsavel NUMBER DEFAULT NULL,
    id_projeto NUMBER NOT NULL,
    prioridade VARCHAR2(20) NOT NULL,
    status VARCHAR2(50) DEFAULT 'Aberta' NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    prazo_finalizacao DATE,
    
    -- chaves estrangeiras
    CONSTRAINT fk_projeto_demanda FOREIGN KEY (id_projeto) REFERENCES
    projetos (id_projeto),
    CONSTRAINT fk_responsavel_demanda FOREIGN KEY (id_responsavel) REFERENCES
    usuarios (id_usuario),
    
    -- Checa se o tipo da demanda está entre tarefa, defeito, melhoria ou documentação
    CONSTRAINT check_tipo_demanda CHECK (
        tipo_demanda IN ('Tarefa', 'Defeito', 'Melhoria', 'Documentação')
    ),
    -- Checa se a prioridade da demanda está entre crítica, alta, média ou baixa
    CONSTRAINT check_prioridade CHECK (
        prioridade IN ('Crítica', 'Alta', 'Média', 'Baixa')
    ),
    -- Checa se o status da demanda está entre aberta, em andamento, em revisao, concluida ou cancelada
    CONSTRAINT check_status CHECK (
        status IN ('Aberta', 'Em Andamento', 'Em Revisão', 'Concluída', 'Cancelada')
    )
);

-- Criação da tabela Comentarios
-- Armazena os comentário vinculadas a uma demanda e um usuário
CREATE TABLE comentarios (
    id_comentario NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_demanda NUMBER NOT NULL,
    id_usuario NUMBER NOT NULL,
    texto VARCHAR2(300) NOT NULL,
    data_comentario TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- chaves estrangeiras
    CONSTRAINT fk_comentario_demanda FOREIGN KEY (id_demanda) REFERENCES
    demandas (id_demanda),
    CONSTRAINT fk_comentario_usuario FOREIGN KEY (id_usuario) REFERENCES
    usuarios (id_usuario)
);

-- Criação da tabela de historico de alterações
-- armazena o histórico da alteração de uma demanda e qual usuário que alterou
CREATE TABLE historico_alteracoes (
    id_historico NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_demanda NUMBER NOT NULL,
    id_usuario NUMBER NOT NULL,
    descricao VARCHAR2(500) NOT NULL,
    data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_historico_demanda FOREIGN KEY (id_demanda) REFERENCES demandas (id_demanda),
    CONSTRAINT fk_historico_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
);