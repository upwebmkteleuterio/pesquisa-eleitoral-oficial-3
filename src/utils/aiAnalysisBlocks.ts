import type { AiAnalysisBlock } from "../types";

const cleanText = (value: unknown, limit: number) => {
  if (typeof value !== "string") return "";
  return value.slice(0, limit)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[dado removido]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[dado removido]")
    .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}\b/g, "[dado removido]");
};

export function sanitizeAiAnalysisBlocks(value: unknown): AiAnalysisBlock[] {
  if (!Array.isArray(value)) return [];
  const blocks: AiAnalysisBlock[] = [];
  for (const raw of value.slice(0, 12)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    if (item.type === "text") {
      const text = cleanText(item.text, 6000);
      if (text) blocks.push({ type: "text", text });
    } else if (item.type === "metric") {
      const label = cleanText(item.label, 100);
      const metricValue = cleanText(item.value, 80);
      if (label && metricValue) blocks.push({ type: "metric", label, value: metricValue, detail: cleanText(item.detail, 160) || undefined });
    } else if (item.type === "table" && Array.isArray(item.columns) && Array.isArray(item.rows)) {
      const columns = item.columns.slice(0, 8).map((entry) => cleanText(entry, 80));
      const rows = item.rows.slice(0, 30).filter(Array.isArray).map((row) => row.slice(0, columns.length).map((cell) => cleanText(cell, 180)));
      const title = cleanText(item.title, 120);
      if (title && columns.length) blocks.push({ type: "table", title, columns, rows });
    } else if (item.type === "alert" && (item.severity === "info" || item.severity === "warning")) {
      const title = cleanText(item.title, 120);
      const text = cleanText(item.text, 400);
      if (title && text) blocks.push({ type: "alert", severity: item.severity, title, text });
    } else if (["bar_chart", "pie_chart", "line_chart"].includes(String(item.type)) && Array.isArray(item.data)) {
      const data = item.data.slice(0, 30).flatMap((point) => {
        if (!point || typeof point !== "object" || Array.isArray(point)) return [];
        const entry = point as Record<string, unknown>;
        if (typeof entry.value !== "number" || !Number.isFinite(entry.value)) return [];
        const label = cleanText(entry.label, 100);
        return label ? [{ label, value: entry.value }] : [];
      });
      const title = cleanText(item.title, 120);
      if (title) blocks.push({ type: item.type as "bar_chart" | "pie_chart" | "line_chart", title, data });
    } else if (item.type === "comparative_summary" && Array.isArray(item.groups)) {
      const groups = item.groups.slice(0, 30).flatMap((group) => {
        if (!group || typeof group !== "object" || Array.isArray(group)) return [];
        const entry = group as Record<string, unknown>;
        if (typeof entry.value !== "number" || !Number.isFinite(entry.value) || typeof entry.total !== "number" || !Number.isFinite(entry.total)) return [];
        const label = cleanText(entry.label, 180);
        return label ? [{ label, value: entry.value, total: entry.total }] : [];
      });
      const title = cleanText(item.title, 120);
      const metric = cleanText(item.metric, 240);
      if (title && metric) blocks.push({ type: "comparative_summary", title, metric, groups });
    }
  }
  while (blocks.length && JSON.stringify(blocks).length > 14_000) blocks.pop();
  return blocks;
}

export function cleanAiExportText(value: string, limit = 4000) {
  return cleanText(value, limit);
}
