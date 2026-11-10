import express from "express";
import cors from "cors";
import "dotenv/config";
import {initPool, getConn, closePool} from "./data/conexao";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import listagemRoutes from "./routes/listagemRoutes";
import detalhesDemandaRoutes from "./routes/detalhesDemandaRoutes";

const app = express();
app.use(cors());
app.use(express.json());
iniciarServidor();

const PORT = Number(process.env.PORT ?? 3000);

async function iniciarServidor() {
    try {
        await initPool();

        app.listen(PORT, () => {
            console.log(`Servidor ativo na porta ${PORT}`);
        });

        process.on("SIGINT", encerrarServidor);

        process.on("SIGTERM", encerrarServidor);
    } catch (erro) {
        console.error("Falha ao iniciar o servidor:", erro);
        process.exit(1);
    }
}

async function encerrarServidor() {
    try {
        await closePool();

        console.log("Pool de conexões encerrado.");
        process.exit(0);
    } catch (erro){
        console.error("Falha ao encerrar o pool:", erro);
        process.exit(1);
    }
}

app.use("/api", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", listagemRoutes);
app.use("/api", detalhesDemandaRoutes);

app.get("/", (req, res) => {
    res.send("Servidor do Projeto Integrador II funcionando!");
});
