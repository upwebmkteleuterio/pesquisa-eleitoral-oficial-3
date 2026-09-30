import { useEffect, useState, type FormEvent } from "react";
import { Check, GitMerge, X } from "lucide-react";
import type { ReportQuestionMergeConfig } from "../../types";
import { isEligibleReportQuestion } from "../../utils/reportQuestionMergeUtils";

interface ReportQuestionMergeModalProps {
  isOpen: boolean;
  questions: any[];
  initialQuestionId?: string | null;
  existingMerge?: ReportQuestionMergeConfig | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (name: string, questionIds: string[]) => void;
}

export function ReportQuestionMergeModal({ isOpen, questions, initialQuestionId, existingMerge, isSubmitting, error, onClose, onConfirm }: ReportQuestionMergeModalProps) {
  const [name, setName] = useState("");
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const eligibleQuestions = questions.filter(isEligibleReportQuestion);

  useEffect(() => {
    if (!isOpen) return;
    setName(existingMerge?.nome || "");
    setQuestionIds(existingMerge?.pergunta_ids || (initialQuestionId ? [initialQuestionId] : []));
  }, [existingMerge, initialQuestionId, isOpen]);

  const toggleQuestion = (questionId: string) => setQuestionIds(current => current.includes(questionId)
    ? current.filter(id => id !== questionId)
    : [...current, questionId]);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const uniqueIds = [...new Set<string>(questionIds)];
    if (name.trim() && uniqueIds.length >= 2 && !isSubmitting) onConfirm(name.trim(), uniqueIds);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar modal" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-outline bg-white shadow-2xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="report-question-merge-title">
        <div className="flex items-start justify-between gap-4 border-b border-outline p-6">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GitMerge size={22} /></div><div><h2 id="report-question-merge-title" className="text-xl font-black text-on-surface">Mesclar perguntas</h2><p className="mt-1 text-xs font-bold text-on-surface-variant">Consolide alternativas sem alterar as respostas salvas.</p></div></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar"><X size={22} /></button>
        </div>
        <div className="space-y-5 p-6">
          <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Nome da mesclagem</span><input autoFocus value={name} onChange={event => setName(event.target.value)} disabled={isSubmitting} className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800" required /></label>
          <fieldset className="space-y-2"><legend className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Perguntas (selecione pelo menos duas)</legend><div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-outline p-3">{eligibleQuestions.map(question => <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 hover:bg-primary/5"><input type="checkbox" checked={questionIds.includes(question.id)} onChange={() => toggleQuestion(question.id)} disabled={isSubmitting} className="mt-1 accent-primary" /><span className="text-sm font-bold text-on-surface">{question.label || question.id}</span></label>)}{eligibleQuestions.length === 0 && <p className="p-3 text-sm font-bold text-on-surface-variant">Não há perguntas elegíveis com alternativas nesta pesquisa.</p>}</div></fieldset>
          {questionIds.length < 2 && <p className="text-xs font-bold text-on-surface-variant" aria-live="polite">Selecione mais uma pergunta para confirmar.</p>}
          {error && <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{error}</p>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-outline p-6 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-2xl border border-outline px-5 py-3 font-black text-on-surface-variant hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">Cancelar</button><button type="submit" disabled={!name.trim() || new Set(questionIds).size < 2 || isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Check size={18} />{isSubmitting ? "Salvando..." : "Confirmar mesclagem"}</button></div>
      </form>
    </div>
  );
}
