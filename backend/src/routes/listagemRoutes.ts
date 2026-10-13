/*
  Autor: Leonardo Gambaroni Alves
  Componente: Projeto Integrador II - PUC-Campinas
  Descrição: Rotas da Listagem de Demandas (GET /demandas) com filtros, busca textual e ordenação inteligente.
*/

import { Router, Request, Response } from 'express';
import { demandas } from '../data/dados';

const router = Router();

router.get('/demandas', (req: Request, res: Response) => {
  try {
    const { status, prioridade, tipo, projetoId, responsavelId, busca, ordenarPor } = req.query;

    let resultado = [...demandas];

    // 1. Busca textual por título ou descrição
    if (busca && typeof busca === 'string') {
      const termo = busca.toLowerCase().trim();
      resultado = resultado.filter(d => 
        d.titulo.toLowerCase().includes(termo) || 
        d.descricao.toLowerCase().includes(termo)
      );
    }

    // 2. Filtros por parâmetros na URL (status, prioridade, tipo, projetoId, responsavelId)
    if (status && typeof status === 'string') {
      resultado = resultado.filter(d => d.status.toLowerCase() === status.toLowerCase());
    }

    if (prioridade && typeof prioridade === 'string') {
      resultado = resultado.filter(d => d.prioridade.toLowerCase() === prioridade.toLowerCase());
    }

    if (tipo && typeof tipo === 'string') {
      resultado = resultado.filter(d => d.tipo.toLowerCase() === tipo.toLowerCase());
    }

    if (projetoId && typeof projetoId === 'string') {
      resultado = resultado.filter(d => d.projetoId === Number(projetoId));
    }

    if (responsavelId && typeof responsavelId === 'string') {
      resultado = resultado.filter(d => d.responsavelId === Number(responsavelId));
    }

    // 3. Ordenação inteligente (com pesos lógicos para prioridade e status)
    if (ordenarPor && typeof ordenarPor === 'string') {
      const prioridadePeso: Record<string, number> = {
        "Crítica": 1,
        "Alta": 2,
        "Média": 3,
        "Baixa": 4
      };

      const statusPeso: Record<string, number> = {
        "Aberta": 1,
        "Em andamento": 2,
        "Em revisão": 3,
        "Concluída": 4,
        "Cancelada": 5
      };

      resultado.sort((a, b) => {
        let valA = a[ordenarPor as keyof typeof a];
        let valB = b[ordenarPor as keyof typeof b];

        // Aplica peso personalizado se ordenar por prioridade
        if (ordenarPor === 'prioridade') {
          valA = prioridadePeso[valA as string] || 99;
          valB = prioridadePeso[valB as string] || 99;
        }

        // Aplica peso personalizado se ordenar por status
        if (ordenarPor === 'status') {
          valA = statusPeso[valA as string] || 99;
          valB = statusPeso[valB as string] || 99;
        }

        if (valA !== undefined && valB !== undefined) {
          if (valA < valB) return -1;
          if (valA > valB) return 1;
        }
        return 0;
      });
    }

    // 4. Retorno de sucesso (Status 200) em formato JSON
    return res.status(200).json({
      sucesso: true,
      total: resultado.length,
      demandas: resultado
    });

  } catch (error) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao processar a listagem de demandas."
    });
  }
});

export default router;