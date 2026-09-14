import { Fragment } from "react";
import { motion } from "motion/react";
import { Pencil, Trash2 } from "lucide-react";
import type { ReportMergeAnswer, ReportMergeCardData, ReportMergeConfig } from "../../types";

interface ReportMergeCardProps {
  card: ReportMergeCardData;
  isAdmin: boolean;
  onEdit: (config: ReportMergeConfig) => void;
  onDelete: (config: ReportMergeConfig) => void;
}

export function ReportMergeCard({ card, isAdmin, onEdit, onDelete }: ReportMergeCardProps) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-[2.5rem] border border-outline bg-white p-7 shadow-sm dark:bg-slate-900"
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-outline pb-5">
        <div>
          <h3 className="text-xl font-black leading-tight text-on-surface">
            {card.demographicLabel} - {card.questionLabel}
          </h3>
          <p className="mt-2 text-xs font-bold text-on-surface-variant">
            {card.totalResponses} respostas válidas · {card.totalAnswers} respostas agregadas
          </p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => onEdit(card.config)} className="rounded-xl p-2 text-primary hover:bg-primary/10" aria-label="Editar mesclagem">
              <Pencil size={18} />
            </button>
            <button type="button" onClick={() => onDelete(card.config)} className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label="Excluir mesclagem">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
      {card.answers.length > 0 ? (
        <div className="space-y-6">
          {card.answers.map((answer, index) => <Fragment key={answer.label}><AnswerRow answer={answer} index={index} demographicLabel={card.demographicLabel} /></Fragment>)}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">
          Nenhuma resposta válida para esta pergunta.
        </p>
      )}
    </motion.section>
  );
}

interface AnswerRowProps {
  answer: ReportMergeAnswer;
  index: number;
  demographicLabel: string;
}

function AnswerRow({ answer, index, demographicLabel }: AnswerRowProps) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm font-black">
        <span className="truncate text-on-surface" title={answer.label}>{answer.label}</span>
        <span className="shrink-0 text-primary">{answer.total} · {answer.percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div initial={{ width: 0 }} animate={{ width: `${answer.percentage}%` }} transition={{ duration: 0.7, delay: index * 0.03 }} className="h-full rounded-full bg-primary" />
      </div>
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Composição por {demographicLabel}</p>
        {answer.breakdown.map(item => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs font-bold">
              <span className="truncate text-on-surface-variant" title={item.label}>{item.label}</span>
              <span className="shrink-0 text-primary">{item.total} · {item.percentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-primary/60" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
