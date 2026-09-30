import { Pencil, Trash2 } from "lucide-react";
import { SurveyOptionImage } from "../SurveyOptionImage";
import type { SurveyOptionImage as SurveyOptionImageMetadata, ReportQuestionMergeCardData, ReportQuestionMergeConfig } from "../../types";
import { findSurveyOptionImage } from "../../utils/surveyOptionImageUtils";

interface Props {
  card: ReportQuestionMergeCardData;
  optionImages: SurveyOptionImageMetadata[];
  isAdmin: boolean;
  onEdit: (config: ReportQuestionMergeConfig) => void;
  onDelete: (config: ReportQuestionMergeConfig) => void;
}

const COLORS = ["#10b981", "#3b82f6", "#f43f5e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#475569"];

export function ReportQuestionMergeCard({ card, optionImages, isAdmin, onEdit, onDelete }: Props) {
  return (
    <section className="rounded-[2.5rem] border border-outline bg-white p-7 shadow-sm dark:bg-slate-900">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-outline pb-5">
        <div>
          <h3 className="text-xl font-black leading-tight text-on-surface">{card.config.nome}</h3>
          <p className="mt-2 text-xs font-bold text-on-surface-variant">Perguntas: {card.questionLabels.join(" · ")}</p>
          <p className="mt-1 text-xs font-bold text-on-surface-variant">{card.totalAnswers} marcações somadas</p>
        </div>
        {isAdmin && <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => onEdit(card.config)} className="rounded-xl p-2 text-primary hover:bg-primary/10" aria-label={`Editar ${card.config.nome}`}><Pencil size={18} /></button>
          <button type="button" onClick={() => onDelete(card.config)} className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label={`Excluir ${card.config.nome}`}><Trash2 size={18} /></button>
        </div>}
      </div>
      {card.answers.length ? <div className="space-y-4">
        {card.answers.map((answer, index) => {
          const image = card.config.pergunta_ids
            .map(questionId => findSurveyOptionImage(optionImages, questionId, [answer.label]))
            .find(Boolean);
          const color = COLORS[index % COLORS.length];

          return <div key={`${answer.label}-${index}`} className="space-y-3 rounded-[1.5rem] border border-transparent bg-slate-50 p-5 hover:border-primary/20 dark:bg-slate-800/40">
            <div className="flex items-center justify-between gap-3 text-xs font-black">
              <span className="flex min-w-0 items-center gap-3 text-on-surface-variant">
                {image && <SurveyOptionImage image={image} alt={`Imagem de ${answer.label}`} className="h-10 w-10 shrink-0 rounded-xl border border-outline object-cover" />}
                <span className="max-w-[200px] truncate" title={answer.label}>{answer.label}</span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-on-surface">{answer.total}</span>
                <span className="rounded-lg px-2.5 py-0.5 text-white" style={{ backgroundColor: color }}>{answer.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-outline bg-slate-200 dark:bg-slate-900">
              <div className="h-full rounded-full" style={{ width: `${answer.percentage}%`, backgroundColor: color }} />
            </div>
          </div>;
        })}
      </div> : <p className="rounded-2xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">Nenhuma resposta válida nas perguntas selecionadas.</p>}
    </section>
  );
}
