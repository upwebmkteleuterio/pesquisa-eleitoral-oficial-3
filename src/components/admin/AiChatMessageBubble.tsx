import { useState } from "react";
import { Bot, Download, LoaderCircle, UserRound } from "lucide-react";
import type { AiAnalysisBlock, AiChatMessageRole, AiChatTrace } from "../../types";
import { sanitizeAiAnalysisBlocks } from "../../utils/aiAnalysisBlocks";
import { AiAnalysisBlocksView } from "./AiAnalysisBlocksView";
import { AiExecutionTrace } from "./AiExecutionTrace";
import { AiMarkdownContent } from "./AiMarkdownContent";

interface AiChatMessageBubbleProps {
  role: AiChatMessageRole;
  content: string;
  createdAt: string;
  trace?: AiChatTrace;
  blocks?: AiAnalysisBlock[];
  onExport?: () => void;
}

export function AiChatMessageBubble({ role, content, createdAt, trace, blocks, onExport }: AiChatMessageBubbleProps) {
  const [isExporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const isUser = role === "user";
  const timestamp = new Date(createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const safeBlocks = role === "assistant" ? sanitizeAiAnalysisBlocks(blocks) : [];
  const hasBlocks = safeBlocks.length > 0;
  const exportPdf = async () => {
    if (!onExport || isExporting) return;
    setExporting(true); setExportError(false);
    try { await onExport(); } catch { setExportError(true); } finally { setExporting(false); }
  };

  return (
    <article className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
        {isUser ? <UserRound size={16} /> : <Bot size={16} />}
      </div>
      <div className={`min-w-0 max-w-[88%] ${isUser ? "text-right" : ""}`}>
        <div className={`${isUser ? "inline-block max-w-full" : "block w-full"} rounded-2xl px-4 py-3 text-left text-sm leading-relaxed ${isUser ? "rounded-tr-sm bg-primary text-white" : "rounded-tl-sm border border-outline bg-white text-on-surface dark:bg-slate-900"}`}>
          {hasBlocks ? <AiAnalysisBlocksView blocks={safeBlocks} /> : isUser ? <p className="whitespace-pre-wrap break-words">{content}</p> : <AiMarkdownContent content={content} />}
        </div>
        <p className="mt-1 px-1 text-[10px] text-on-surface-variant">{timestamp}</p>
        {hasBlocks && onExport && <div className="mt-2"><button type="button" onClick={exportPdf} disabled={isExporting} aria-label="Exportar análise desta resposta em PDF" title="Exportar análise em PDF" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline bg-white px-3 py-2 text-xs font-bold text-on-surface hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-slate-800">{isExporting ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}{isExporting ? "Gerando PDF..." : "Exportar PDF"}</button>{exportError && <p role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-300">Não foi possível gerar o PDF. Tente novamente.</p>}</div>}
        {trace && <AiExecutionTrace trace={trace} />}
      </div>
    </article>
  );
}
