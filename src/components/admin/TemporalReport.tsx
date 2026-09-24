import { useEffect, useMemo, useState } from 'react';
import type { Submission, Survey, SurveyOptionImage, TemporalQuestionDefinition, TemporalReportFilters } from '../../types';
import { buildTemporalReport, getTemporalQuestionOptions, getTemporalQuestions } from '../../utils/temporalReportUtils';
import { TemporalReportChart } from './TemporalReportChart';
import { TemporalReportFilters as TemporalFilters } from './TemporalReportFilters';

interface Props {
  surveys: Survey[];
  surveyId: string;
  survey: Survey | undefined;
  submissions: Submission[] | undefined;
  optionImages: SurveyOptionImage[];
  isLoading: boolean;
  error: string | null;
  onSurveyChange: (surveyId: string) => void;
}

const initialFilters: TemporalReportFilters = {
  questionId: '', answerValues: [], startDate: '', endDate: '', grouping: 'day', displayMode: 'percentage', chartType: 'line',
};

export function TemporalReport({ surveys, surveyId, survey, submissions, optionImages, isLoading, error, onSurveyChange }: Props) {
  const [filters, setFilters] = useState<TemporalReportFilters>(initialFilters);
  const questions = useMemo(() => getTemporalQuestions((survey?.schema_dinamico?.questions || []) as TemporalQuestionDefinition[]), [survey]);
  const selectedQuestion = questions.find(question => question.id === filters.questionId);
  const availableOptions = selectedQuestion ? getTemporalQuestionOptions(selectedQuestion) : [];
  const report = useMemo(() => buildTemporalReport(submissions || [], selectedQuestion, filters), [filters, selectedQuestion, submissions]);
  const hasInvalidDateRange = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);

  useEffect(() => {
    const nextQuestion = questions[0];
    setFilters(current => ({ ...current, questionId: nextQuestion?.id || '', answerValues: nextQuestion ? getTemporalQuestionOptions(nextQuestion).map(option => option.value) : [] }));
  }, [surveyId, questions]);

  const handleFiltersChange = (next: TemporalReportFilters) => {
    if (next.questionId !== filters.questionId) {
      const question = questions.find(item => item.id === next.questionId);
      setFilters({ ...next, answerValues: question ? getTemporalQuestionOptions(question).map(option => option.value) : [] });
      return;
    }
    setFilters(next);
  };

  return (
    <div className="space-y-6">
      <TemporalFilters surveys={surveys} surveyId={surveyId} questions={questions} filters={filters} answerOptions={availableOptions} onSurveyChange={onSurveyChange} onChange={handleFiltersChange} />
      {isLoading && <div className="rounded-[2rem] border border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900" role="status">Carregando respostas válidas...</div>}
      {error && <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" role="alert">{error}</div>}
      {!isLoading && !error && !surveyId && <div className="rounded-[2rem] border border-dashed border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900">Selecione uma pesquisa para começar.</div>}
      {!isLoading && !error && surveyId && !questions.length && <div className="rounded-[2rem] border border-dashed border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900">Esta pesquisa não possui perguntas com alternativas ou escala.</div>}
      {!isLoading && !error && hasInvalidDateRange && <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-center font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" role="alert">A data final deve ser igual ou posterior à data inicial.</div>}
      {!isLoading && !error && !hasInvalidDateRange && surveyId && questions.length > 0 && (!filters.answerValues.length || !report.points.length) && <div className="rounded-[2rem] border border-dashed border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900">Nenhum dado encontrado para os filtros selecionados.</div>}
      {!isLoading && !error && !hasInvalidDateRange && report.points.length > 0 && report.answerOptions.length > 0 && <section className="space-y-6 rounded-[2rem] border border-outline bg-white p-6 shadow-sm dark:bg-slate-900" aria-label="Gráfico de evolução no tempo"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-on-surface">Evolução no tempo</h2><p className="text-sm font-bold text-on-surface-variant">{report.totalResponses.toLocaleString('pt-BR')} respostas válidas no período</p></div><span className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-black text-primary">{filters.grouping === 'day' ? 'Por dia' : filters.grouping === 'week' ? 'Por semana' : 'Por mês'}</span></div><TemporalReportChart points={report.points} answerOptions={report.answerOptions} optionImages={optionImages} questionId={selectedQuestion?.id} displayMode={filters.displayMode} chartType={filters.chartType} /></section>}
    </div>
  );
}
