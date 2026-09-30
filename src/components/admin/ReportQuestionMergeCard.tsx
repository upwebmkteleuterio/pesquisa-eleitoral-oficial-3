import { Pencil, Trash2 } from "lucide-react";
import type { ReportQuestionMergeCardData, ReportQuestionMergeConfig } from "../../types";

interface Props {
  card: ReportQuestionMergeCardData;
  isAdmin: boolean;
  onEdit: (config: ReportQuestionMergeConfig) => void;
  onDelete: (config: ReportQuestionMergeConfig) => void;
}

export function ReportQuestionMergeCard({ card, isAdmin, onEdit, onDelete }: Props) {
  return <section className="rounded-[2.5rem] border border-outline bg-white p-7 shadow-sm dark:bg-slate-900">
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-outline pb-5"><div><h3 className="text-xl font-black leading-tight text-on-surface">{card.config.nome}</h3><p className="mt-2 text-xs font-bold text-on-surface-variant">Perguntas: {card.questionLabels.join(" · ")}</p><p className="mt-1 text-xs font-bold text-on-surface-variant">{card.totalAnswers} marcações somadas</p></div>{isAdmin && <div className="flex shrink-0 gap-2"><button type="button" onClick={() => onEdit(card.config)} className="rounded-xl p-2 text-primary hover:bg-primary/10" aria-label={`Editar ${card.config.nome}`}><Pencil size={18} /></button><button type="button" onClick={() => onDelete(card.config)} className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label={`Excluir ${card.config.nome}`}><Trash2 size={18} /></button></div>}</div>
    {card.answers.length ? <div className="space-y-5">{card.answers.map((answer, index) => <div key={`${answer.label}-${index}`} className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm font-black"><span className="truncate text-on-surface" title={answer.label}>{answer.label}</span><span className="shrink-0 text-on-surface">{answer.total} · {answer.percentage.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-primary" style={{ width: `${answer.percentage}%` }} /></div></div>)}</div> : <p className="rounded-2xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">Nenhuma resposta válida nas perguntas selecionadas.</p>}
  </section>;
}
