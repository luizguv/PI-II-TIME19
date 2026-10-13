import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import listagemRoutes from "./routes/listagemRoutes";
import detalhesDemandaRoutes from "./routes/detalhesDemandaRoutes";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", listagemRoutes);
app.use("/api", detalhesDemandaRoutes);

app.get("/", (req, res) => {
    res.send("Servidor do Projeto Integrador II funcionando!");
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});