import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AiAnalysisBlock } from "../types";
import { cleanAiExportText } from "./aiAnalysisBlocks";

export interface AiAnalysisPdfSnapshot {
  messageId: string;
  question?: string;
  content: string;
  blocks: AiAnalysisBlock[];
}

export function exportAiAnalysisPdf(snapshot: AiAnalysisPdfSnapshot) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = 18;
  const addText = (text: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(cleanAiExportText(text, 6000), width);
    const height = lines.length * (size * 0.48) + 2;
    if (y + height > 280) { doc.addPage(); y = 18; }
    doc.text(lines, margin, y);
    y += height;
  };
  const addTable = (title: string, head: string[], body: string[][]) => {
    addText(title, 12, true);
    autoTable(doc, { startY: y, head: [head.map((cell) => cleanAiExportText(cell, 100))], body: body.slice(0, 40).map((row) => row.map((cell) => cleanAiExportText(cell, 180))), margin: { left: margin, right: margin }, styles: { fontSize: 8, overflow: "linebreak" }, headStyles: { fillColor: [37, 99, 235] } });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8 : y + 12;
  };

  addText("Análise do Assistente de IA", 17, true);
  addText(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
  if (snapshot.question?.trim()) { addText("Pergunta anterior", 12, true); addText(snapshot.question); }
  addText("Resposta e resumo", 12, true);
  const textBlock = snapshot.blocks.find((block) => block.type === "text");
  addText(textBlock?.type === "text" ? textBlock.text : snapshot.content);
  for (const block of snapshot.blocks) {
    if (block.type === "text") continue;
    if (block.type === "metric") {
      addText(block.label, 12, true); addText(`${block.value}${block.detail ? ` — ${block.detail}` : ""}`);
    } else if (block.type === "table") {
      addTable(block.title, block.columns, block.rows);
    } else if (block.type === "alert") {
      addText(block.title, 12, true); addText(block.text);
    } else if (block.type === "comparative_summary") {
      addText(block.title, 12, true); addText(block.metric);
      addTable("Grupos comparados", ["Grupo", "Métrica", "Respostas"], block.groups.map((group) => [group.label, String(group.value), String(group.total)]));
    } else {
      addTable(`${block.title} — dados do gráfico`, ["Categoria", "Valor"], block.data.map((point) => [point.label, String(point.value)]));
    }
  }
  const fileDate = new Date().toISOString().slice(0, 10);
  const safeId = snapshot.messageId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 12) || "resposta";
  doc.save(`analise-ia-${fileDate}-${safeId}.pdf`);
}
