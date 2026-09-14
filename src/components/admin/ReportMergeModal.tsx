import { useEffect, useState, type FormEvent } from "react";
import { Check, GitMerge, X } from "lucide-react";
import type { ReportDemographicField, ReportMergeConfig } from "../../types";
import { DEMOGRAPHIC_FIELD_LABELS } from "../../utils/reportMergeUtils";

interface ReportMergeModalProps {
  isOpen: boolean;
  questions: any[];
  existingMerge?: ReportMergeConfig | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (field: ReportDemographicField, questionId: string) => void;
}

const fields = Object.entries(DEMOGRAPHIC_FIELD_LABELS) as [ReportDemographicField, string][];

export function ReportMergeModal({
  isOpen,
  questions,
  existingMerge,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ReportMergeModalProps) {
  const [field, setField] = useState<ReportDemographicField>("sexo");
  const [questionId, setQuestionId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setField(existingMerge?.campo_demografico || "sexo");
    setQuestionId(existingMerge?.pergunta_id || questions[0]?.id || "");
  }, [existingMerge, isOpen, questions]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (questionId && !isSubmitting) onConfirm(field, questionId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar modal" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-outline bg-white shadow-2xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="report-merge-title">
        <div className="flex items-start justify-between gap-4 border-b border-outline p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GitMerge size={22} /></div>
            <div><h2 id="report-merge-title" className="text-xl font-black text-on-surface">Mesclar dados</h2><p className="mt-1 text-xs font-bold text-on-surface-variant">Cruze uma pergunta com um dado demográfico</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar"><X size={22} /></button>
        </div>
        <div className="space-y-5 p-6">
          <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Campo demográfico</span>
            <select value={field} onChange={event => setField(event.target.value as ReportDemographicField)} disabled={isSubmitting} className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800">
              {fields.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Pergunta</span>
            <select value={questionId} onChange={event => setQuestionId(event.target.value)} disabled={isSubmitting || questions.length === 0} className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800">
              {questions.map(question => <option key={question.id} value={question.id}>{question.label || question.id}</option>)}
            </select>
          </label>
          {questions.length === 0 && <p className="rounded-2xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">Esta pesquisa não possui perguntas dinâmicas.</p>}
          {error && <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{error}</p>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-outline p-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-2xl border border-outline px-5 py-3 font-black text-on-surface-variant hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={!questionId || isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Check size={18} />{isSubmitting ? "Salvando..." : "Confirmar mesclagem"}</button>
        </div>
      </form>
    </div>
  );
}
