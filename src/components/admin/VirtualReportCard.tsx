import { Link2, MoreVertical, SlidersHorizontal, Undo2 } from "lucide-react";
import type { VirtualReportCardConfig, VirtualReportCardData } from "../../types";

interface Props {
  card: VirtualReportCardData;
  isAdmin: boolean;
  onJoin: (card: VirtualReportCardConfig) => void;
  onNormalize: (card: VirtualReportCardConfig) => void;
  onUndo: (card: VirtualReportCardConfig) => void;
}

export function VirtualReportCard({ card, isAdmin, onJoin, onNormalize, onUndo }: Props) {
  const title = card.questionLabels.join(" + ");
  const sourceLabel = card.surveyNames.join(" · ");
  const isJoined = card.config.sources.length > 1;

  return (
    <section className="rounded-[2rem] border border-primary/20 bg-white p-6 shadow-sm dark:bg-slate-900" aria-label={`Card virtual ${title}`}>
      <div className="flex items-start justify-between gap-4 border-b border-outline pb-5">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-primary">Card virtual</span>
            {isJoined && <span className="rounded-lg bg-violet-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{card.config.sources.length} fontes unificadas</span>}
          </div>
          <h3 className="truncate text-lg font-black text-on-surface" title={title}>{title}</h3>
          <p className="mt-1 truncate text-xs font-bold text-on-surface-variant" title={sourceLabel}>{sourceLabel} · {card.totalResponses} entrevistas · {card.totalAnswers} respostas somadas</p>
        </div>
        {isAdmin && <div className="group relative shrink-0">
          <button type="button" className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Ações do card" title="Ações do card"><MoreVertical size={20} /></button>
          <div className="invisible absolute right-0 top-11 z-10 w-64 rounded-2xl border border-outline bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:bg-slate-900">
            <button type="button" onClick={() => onJoin(card.config)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-on-surface hover:bg-primary/10"><Link2 size={18} />Juntar pergunta de outra pesquisa</button>
            <button type="button" onClick={() => onNormalize(card.config)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-on-surface hover:bg-primary/10"><SlidersHorizontal size={18} />Padronizar respostas</button>
            {isJoined && <button type="button" onClick={() => onUndo(card.config)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"><Undo2 size={18} />Desfazer juntada</button>}
          </div>
        </div>}
      </div>
      <div className="mt-6 space-y-4">
        {card.answers.length ? card.answers.map((answer, index) => <div key={answer.label} className="space-y-2"><div className="flex justify-between gap-3 text-sm font-black"><span className="truncate text-on-surface" title={answer.label}>{answer.label}</span><span className="shrink-0 text-on-surface">{answer.total} · {answer.percentage.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${answer.percentage}%`, opacity: 1 - index * 0.08 }} /></div></div>) : <p className="rounded-xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">Nenhuma resposta válida para este card.</p>}
      </div>
      <p className="mt-6 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Resultado somente virtual: as respostas são somadas sem deduplicação e nada é alterado fisicamente.</p>
    </section>
  );
}
