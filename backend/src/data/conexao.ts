/*
 * Autor: João Pedro Silveira de Souza
 * Componente: Projeto Integrador II - PUC-Campinas
 * Descrição: Conexão com o banco de dados
*/

import oracledb from "oracledb";
import "dotenv/config";

// lê as credenciais do banco
const {
    ORACLE_HOST, ORACLE_PORT, ORACLE_SERVICE, ORACLE_USER, ORACLE_PASSWORD
} = process.env;

// Essa string é usada pelo driver para estabelecer a conexão.
const connectString = `${ORACLE_HOST}:${ORACLE_PORT}/${ORACLE_SERVICE}`;

// faz o oracle retornar cada linha como objeto JS, isso facilita o uso e integração com APIs e front-ends.
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

export async function initPool(){
    await oracledb.createPool({
        user: ORACLE_USER,
        password: ORACLE_PASSWORD,
        connectString,
        poolMin: 1,
        poolMax: 20,
        poolIncrement: 1
    });
}

export async function getConn(){
    return oracledb.getPool().getConnection();
}

export async function closePool(){
    try{
        await oracledb.getPool().close(10);
    } catch {
        
    }
}