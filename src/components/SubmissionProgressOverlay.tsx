import { CheckCircle2, LoaderCircle, Mic2 } from "lucide-react";
import { SubmissionProgress } from "../types";

type SubmissionProgressOverlayProps = {
  progress: SubmissionProgress;
};

export function SubmissionProgressOverlay({ progress }: SubmissionProgressOverlayProps) {
  const isComplete = progress.stage === "complete";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={`${progress.label} — ${progress.percentage}%`}
    >
      <div className="w-full max-w-sm rounded-3xl border border-outline bg-surface p-7 text-on-surface shadow-2xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {isComplete ? <CheckCircle2 size={24} /> : <Mic2 size={24} />}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Finalizando pesquisa</p>
            <h2 className="mt-1 text-lg font-bold">{progress.label}</h2>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-sm font-bold">
          <span className="text-on-surface-variant">Processamento</span>
          <span className="text-primary">{progress.percentage}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        {!isComplete && (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-on-surface-variant">
            <LoaderCircle size={16} className="animate-spin" />
            Não feche esta tela enquanto concluímos o processamento.
          </div>
        )}
      </div>
    </div>
  );
}
