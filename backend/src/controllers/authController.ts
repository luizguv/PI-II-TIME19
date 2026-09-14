import { Request, Response } from "express";

export function login(req: Request, res: Response) {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            mensagem: "E-mail e senha são obrigatórios."
        });
    }

    // Temporariamente, vamos apenas validar se os dados foram enviados.
    // A consulta ao banco de dados será adicionada depois.

    return res.status(200).json({
        mensagem: "Login recebido com sucesso.",
        email
    });
}