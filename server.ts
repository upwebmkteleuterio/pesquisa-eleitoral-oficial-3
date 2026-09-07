import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Multer setup for PDF upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Gemini AI setup
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada. Por favor, adicione sua chave de API nas configurações do projeto.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

app.use(express.json());

// API route for AI Survey Processing
app.post("/api/ai/process-survey", upload.single('file'), async (req, res) => {
  try {
    const ai = getAIClient();
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: "Only PDF files are supported" });
    }

    const base64Pdf = req.file.buffer.toString('base64');

    const prompt = `
      Você é um especialista em estruturação de pesquisas eleitorais e de satisfação.
      Analise o arquivo PDF anexo e extraia todas as perguntas.
      
      Converta-as para o seguinte esquema JSON, compatível com o nosso sistema:
      
      Tipos de perguntas suportados:
      - 'text': Resposta em texto curto.
      - 'radio': Única escolha (deve ter a lista de 'options').
      - 'checkbox': Múltipla escolha (deve ter a lista de 'options').
      - 'select': Menu suspenso (deve ter a lista de 'options').
      - 'scale': Escala de 1 a 5 (ou conforme identificado no texto).
      
      Para escalas: Se a pergunta pedir uma nota ou avaliação (ex: 1 a 5), use o tipo 'radio' com options ["1", "2", "3", "4", "5"] em vez do tipo scale, para garantir compatibilidade total com o coletor.
      
      Retorne APENAS um array JSON de objetos com esta estrutura:
      {
        "id": "string único",
        "type": "text" | "radio" | "checkbox" | "select",
        "label": "O texto da pergunta",
        "required": true,
        "options": ["Opção 1", "Opção 2", ...] (apenas para radio, checkbox, select)
      }
      
      Ignore cabeçalhos informativos que não sejam perguntas, mas capture os dados do respondente (como nome, telefone, bairro) se estiverem no formulário como campos a serem preenchidos.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Pdf,
                mimeType: "application/pdf"
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              label: { type: Type.STRING },
              required: { type: Type.BOOLEAN },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["id", "type", "label", "required"]
          }
        }
      }
    });

    const resultText = response.text;
    res.json(JSON.parse(resultText));

  } catch (error: any) {
    console.error("AI processing error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
