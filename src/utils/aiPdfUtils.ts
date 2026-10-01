import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AiAnalysisBlock } from "../types";
import { cleanAiExportText, sanitizeAiAnalysisBlocks } from "./aiAnalysisBlocks";

export interface AiAnalysisPdfSnapshot {
  messageId: string;
  question?: string;
  content: string;
  blocks: AiAnalysisBlock[];
}

const blue: [number, number, number] = [37, 99, 235];
const margin = 14;

function cleanInline(value: string, limit = 600) {
  return cleanAiExportText(value, limit)
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\|/g, " · ")
    .trim();
}

function markdownCells(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = markdownCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

async function loadCoverImage() {
  const response = await fetch("/assets/veraxus-pesquisas-capa.jpeg");
  if (!response.ok) throw new Error("Não foi possível carregar a capa do relatório.");
  const image = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Capa inválida."));
    reader.onerror = () => reject(new Error("Não foi possível ler a capa do relatório."));
    reader.readAsDataURL(image);
  });
}

export async function exportAiAnalysisPdf(snapshot: AiAnalysisPdfSnapshot) {
  const cover = await loadCoverImage();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - margin * 2;
  doc.addImage(cover, "JPEG", 0, 0, pageWidth, pageHeight);
  doc.addPage();

  let y = 30;
  const drawPageHeader = () => {
    doc.setTextColor(...blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("VERAXUS PESQUISAS", margin, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Análise do Assistente de IA", margin, 18);
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.7);
    doc.line(margin, 22, pageWidth - margin, 22);
  };
  drawPageHeader();

  const addPage = () => {
    doc.addPage();
    drawPageHeader();
    y = 30;
  };
  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 14) addPage();
  };
  const addParagraph = (value: string, size = 10, bold = false) => {
    const text = cleanInline(value, 6000);
    if (!text) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width) as string[];
    const lineHeight = size * 0.48;
    ensureSpace(lines.length * lineHeight + 3);
    doc.setTextColor(35, 45, 60);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 3;
  };
  const addSection = (title: string, level = 2) => {
    const text = cleanInline(title, 180);
    if (!text) return;
    ensureSpace(12);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(level === 1 ? 14 : 11);
    doc.setTextColor(...blue);
    doc.text(text, margin, y);
    y += level === 1 ? 8 : 7;
    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(0.35);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  };
  const addTable = (title: string, head: string[], body: string[][]) => {
    if (title) addSection(title, 2);
    ensureSpace(16);
    autoTable(doc, {
      startY: y,
      head: [head.map((cell) => cleanInline(cell, 100))],
      body: body.slice(0, 40).map((row) => row.map((cell) => cleanInline(cell, 180))),
      margin: { left: margin, right: margin, bottom: 14, top: 28 },
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, overflow: "linebreak", textColor: [35, 45, 60] },
      headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      didDrawPage: drawPageHeader,
    });
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    y = finalY ? finalY + 7 : y + 12;
  };
  const addRichText = (value: string) => {
    const lines = cleanAiExportText(value, 6000).split("\n");
    let index = 0;
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) { index += 1; continue; }
      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) {
        addSection(heading[2], heading[1].length);
        index += 1;
        continue;
      }
      if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
        const headers = markdownCells(line);
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
          rows.push(markdownCells(lines[index]));
          index += 1;
        }
        addTable("", headers, rows);
        continue;
      }
      if (/^[-*+]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
        addParagraph(`• ${line.replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, "")}`);
        index += 1;
        continue;
      }
      const paragraph: string[] = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+/.test(lines[index].trim()) && !/^[-*+]\s+/.test(lines[index].trim()) && !/^\d+[.)]\s+/.test(lines[index].trim()) && !(lines[index].includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]))) {
        paragraph.push(lines[index].trim());
        index += 1;
      }
      addParagraph(paragraph.join(" "));
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...blue);
  doc.text("Relatório de análise", margin, y);
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 115);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, y);
  y += 8;
  if (snapshot.question?.trim()) {
    addSection("Pergunta anterior");
    addRichText(snapshot.question);
  }

  const safeBlocks = sanitizeAiAnalysisBlocks(snapshot.blocks);
  const textBlock = safeBlocks.find((block) => block.type === "text");
  addSection("Resposta e resumo");
  addRichText(textBlock?.type === "text" ? textBlock.text : snapshot.content);

  for (const block of safeBlocks) {
    if (block.type === "text") continue;
    if (block.type === "metric") {
      const detail = block.detail ? ` · ${block.detail}` : "";
      const label = cleanInline(block.label, 100);
      const value = cleanInline(`${block.value}${detail}`, 250);
      const lines = doc.splitTextToSize(value, width - 12) as string[];
      ensureSpace(Math.max(20, lines.length * 5 + 12));
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(margin, y, width, Math.max(17, lines.length * 5 + 10), 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...blue);
      doc.text(label, margin + 4, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(35, 45, 60);
      doc.text(lines, margin + 4, y + 12);
      y += Math.max(17, lines.length * 5 + 10) + 5;
    } else if (block.type === "table") {
      addTable(block.title, block.columns, block.rows);
    } else if (block.type === "alert") {
      const title = cleanInline(block.title, 120);
      const text = cleanInline(block.text, 400);
      const lines = doc.splitTextToSize(text, width - 12) as string[];
      ensureSpace(lines.length * 4.8 + 20);
      doc.setFillColor(block.severity === "warning" ? 255 : 239, block.severity === "warning" ? 247 : 246, block.severity === "warning" ? 237 : 255);
      doc.setDrawColor(...blue);
      doc.roundedRect(margin, y, width, lines.length * 4.8 + 15, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...blue);
      doc.text(title, margin + 4, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(35, 45, 60);
      doc.text(lines, margin + 4, y + 12);
      y += lines.length * 4.8 + 20;
    } else if (block.type === "comparative_summary") {
      addSection(block.title);
      addRichText(block.metric);
      addTable("Grupos comparados", ["Grupo", "Métrica", "Respostas"], block.groups.map((group) => [group.label, String(group.value), String(group.total)]));
    } else {
      addTable(`${block.title} — dados do gráfico`, ["Categoria", "Valor"], block.data.map((point) => [point.label, String(point.value)]));
    }
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  const safeId = snapshot.messageId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 12) || "resposta";
  doc.save(`analise-ia-${fileDate}-${safeId}.pdf`);
}
