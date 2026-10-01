import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AiChatTrace } from "../../types";

interface AiExecutionTraceProps {
  trace: AiChatTrace;
}

const statusLabels = { completed: "Concluída", failed: "Falhou", skipped: "Ignorada" };
const statusStyles = {
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  skipped: "bg-slate-500/10 text-slate-500",
};

export function AiExecutionTrace({ trace }: AiExecutionTraceProps) {
  const [isExpanded, setExpanded] = useState(false);

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-outline bg-slate-50 dark:bg-slate-950/60">
      <button
        type="button"
        onClick={() => setExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold text-on-surface hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-800"
      >
        <span>Diagnóstico da execução</span>
        <span className="flex items-center gap-2 text-[10px] font-medium text-on-surface-variant">
          {trace.totalDurationMs} ms
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {isExpanded && (
        <ol className="space-y-2 border-t border-outline p-3">
          {trace.steps.map((step, index) => (
            <li key={`${step.step}-${index}`} className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-on-surface">{step.step}</span>
              <span className="flex flex-wrap items-center gap-2 text-on-surface-variant">
                <span className={`rounded-full px-2 py-0.5 ${statusStyles[step.status]}`}>{statusLabels[step.status]}</span>
                <span>{step.durationMs} ms</span>
                {step.toolNames?.map((tool) => <span key={tool} className="rounded bg-slate-200 px-1.5 py-0.5 dark:bg-slate-800">{tool}</span>)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
