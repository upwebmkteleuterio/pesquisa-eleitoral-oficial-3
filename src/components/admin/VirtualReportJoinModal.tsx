import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Link2, X } from "lucide-react";
import type { Survey, VirtualReportCardConfig, VirtualReportQuestionRef } from "../../types";

interface Props {
  isOpen: boolean;
  card: VirtualReportCardConfig | null;
  surveys: Survey[];
  excludedQuestionKeys?: string[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (ref: VirtualReportQuestionRef) => void;
}

export function VirtualReportJoinModal({ isOpen, card, surveys, excludedQuestionKeys = [], isSubmitting = false, onClose, onConfirm }: Props) {
  const [surveyId, setSurveyId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const sourceSurveyIds = useMemo(() => new Set((card?.sources || []).map(source => source.pesquisa_id)), [card]);
  const otherSurveys = surveys.filter(survey => !sourceSurveyIds.has(survey.id));
  const selectedSurvey = otherSurveys.find(survey => survey.id === surveyId);
  const questions = (selectedSurvey?.schema_dinamico?.questions || []).filter((question: any) => !excludedQuestionKeys.includes(`${surveyId}:${question.id}`));

  useEffect(() => {
    if (!isOpen) return;
    const firstSurvey = otherSurveys[0];
    const firstQuestion = (firstSurvey?.schema_dinamico?.questions || []).find((question: any) => !excludedQuestionKeys.includes(`${firstSurvey.id}:${question.id}`));
    setSurveyId(firstSurvey?.id || "");
    setQuestionId(firstQuestion?.id || "");
  }, [isOpen, card?.id, surveys, excludedQuestionKeys]);

  const handleSurveyChange = (nextSurveyId: string) => {
    const nextQuestion = (surveys.find(survey => survey.id === nextSurveyId)?.schema_dinamico?.questions || [])
      .find((question: any) => !excludedQuestionKeys.includes(`${nextSurveyId}:${question.id}`));
    setSurveyId(nextSurveyId);
    setQuestionId(nextQuestion?.id || "");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (surveyId && questionId && !isSubmitting) onConfirm({ pesquisa_id: surveyId, pergunta_id: questionId });
  };

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" aria-label="Fechar modal" />
      <form onSubmit={submit} className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-outline bg-white shadow-2xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="virtual-join-title">
        <div className="flex items-start justify-between border-b border-outline p-6">
          <div className="flex items-center gap-3"><Link2 className="text-primary" size={24} /><div><h2 id="virtual-join-title" className="text-xl font-black text-on-surface">Juntar pergunta de outra pesquisa</h2><p className="text-xs font-bold text-on-surface-variant">A nova pergunta ocupará a posição deste card virtual.</p></div></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100" aria-label="Cancelar"><X size={20} /></button>
        </div>
        <div className="space-y-5 p-6">
          <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Outra pesquisa selecionada</span><select value={surveyId} onChange={event => handleSurveyChange(event.target.value)} disabled={!otherSurveys.length || isSubmitting} className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 font-bold dark:bg-slate-800"><option value="">Selecione uma pesquisa</option>{otherSurveys.map(survey => <option key={survey.id} value={survey.id}>{survey.nome}</option>)}</select></label>
          <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Pergunta</span><select value={questionId} onChange={event => setQuestionId(event.target.value)} disabled={!questions.length || isSubmitting} className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 font-bold dark:bg-slate-800"><option value="">Selecione uma pergunta</option>{questions.map((question: any) => <option key={question.id} value={question.id}>{question.label || question.id}</option>)}</select></label>
          {!otherSurveys.length && <p className="rounded-xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">Não há outra pesquisa selecionada disponível para este card.</p>}
          {otherSurveys.length > 0 && !questions.length && <p className="rounded-xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">Todas as perguntas disponíveis desta pesquisa já estão em outros cards.</p>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-outline p-6 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-2xl border border-outline px-5 py-3 font-black text-on-surface-variant">Cancelar</button><button type="submit" disabled={!surveyId || !questionId || isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-white disabled:opacity-40"><Check size={18} />{isSubmitting ? "Aplicando..." : "Confirmar juntada"}</button></div>
      </form>
    </div>
  );
}
