-- Autor: João Pedro Silveira de Souza
-- Componente: Projeto Integrador II - Engenharia de Software (2026)
-- Descrição: Banco de Dados para o projeto

CREATE TABLE usuarios (
    id_usuario NUMBER(1,0) PRIMARY KEY CHECK (id_usuario > 0),
    nome VARCHAR2(100) NOT NULL,
    email VARCHAR2(150) NOT NULL UNIQUE,
    senha VARCHAR2(255) NOT NULL,
    perfil VARCHAR2(30) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT check_usuario_perfil CHECK (
        perfil IN ('Administrador', 'Líder de Projeto', 'Membro da Equipe')
    )
);
