import { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown } from 'lucide-react';
import type { Submission, Survey, SurveyOptionImage, TemporalQuestionDefinition, TemporalReportFilters } from '../../types';
import { buildTemporalReport, getTemporalQuestionOptions, getTemporalQuestions } from '../../utils/temporalReportUtils';
import { captureTemporalChart } from '../../utils/temporalPdfCapture';
import { generateTemporalReportPDF } from '../../utils/pdfUtils';
import { TemporalGroupedBarChart } from './TemporalGroupedBarChart';
import { TemporalHeatmap } from './TemporalHeatmap';
import { TemporalReportChart } from './TemporalReportChart';
import { TemporalReportFilters as TemporalFilters } from './TemporalReportFilters';
import { TemporalReportTable } from './TemporalReportTable';

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
  const chartCaptureRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const hasInvalidDateRange = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);
  const canExport = !!survey && !!selectedQuestion && !hasInvalidDateRange && report.points.length > 0 && report.answerOptions.length > 0;
  const exportChartWidth = 1400;
  const exportChartHeight = filters.chartType === 'line' ? 576 : 448;

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

  const handleExport = async () => {
    if (!canExport || !survey || !selectedQuestion || isExporting) return;
    setIsExporting(true);
    try {
      let chartCapture = null;
      try {
        chartCapture = await captureTemporalChart(chartCaptureRef.current);
      } catch {
        chartCapture = null;
      }
      generateTemporalReportPDF(survey, selectedQuestion.label, filters, report, chartCapture || undefined);
    } finally {
      setIsExporting(false);
    }
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
      {!isLoading && !error && !hasInvalidDateRange && report.points.length > 0 && report.answerOptions.length > 0 && <section className="space-y-8 rounded-[2rem] border border-outline bg-white p-6 shadow-sm dark:bg-slate-900" aria-label="Gráfico de evolução no tempo">
        <div className="relative flex flex-col gap-4 sm:block">
          <div className="order-first flex items-center justify-end gap-2 sm:absolute sm:right-0 sm:top-0"><span className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-black text-primary">{filters.grouping === 'day' ? 'Por dia' : filters.grouping === 'week' ? 'Por semana' : 'Por mês'}</span><button type="button" onClick={handleExport} disabled={!canExport || isExporting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40" title="Imprimir relatório temporal em PDF"><FileDown size={16} />{isExporting ? 'Gerando...' : 'Imprimir PDF'}</button></div>
          <div className="order-last min-w-0 rounded-2xl bg-white">
            <div className="sm:pr-56"><h2 className="text-xl font-black text-on-surface">Evolução no tempo</h2><p className="text-sm font-bold text-on-surface-variant">{report.totalResponses.toLocaleString('pt-BR')} respostas válidas no período</p></div>
            <TemporalReportChart points={report.points} answerOptions={report.answerOptions} optionImages={optionImages} questionId={selectedQuestion?.id} displayMode={filters.displayMode} chartType={filters.chartType} />
          </div>
          <div
            ref={chartCaptureRef}
            data-temporal-pdf-export="true"
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: '-10000px',
              top: 0,
              width: `${exportChartWidth}px`,
              height: `${exportChartHeight + 56}px`,
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              pointerEvents: 'none',
            }}
          >
            <div>
              <h2 className="text-xl font-black text-on-surface">Evolução no tempo</h2>
              <p className="text-sm font-bold text-on-surface-variant">{report.totalResponses.toLocaleString('pt-BR')} respostas válidas no período</p>
            </div>
            <TemporalReportChart
              points={report.points}
              answerOptions={report.answerOptions}
              optionImages={optionImages}
              questionId={selectedQuestion?.id}
              displayMode={filters.displayMode}
              chartType={filters.chartType}
              fixedDimensions={{ width: exportChartWidth, height: exportChartHeight }}
            />
          </div>
        </div>
        <TemporalGroupedBarChart points={report.points} answerOptions={report.answerOptions} displayMode={filters.displayMode} />
        <TemporalHeatmap points={report.points} answerOptions={report.answerOptions} displayMode={filters.displayMode} />
        <TemporalReportTable points={report.points} answerOptions={report.answerOptions} optionImages={optionImages} questionId={selectedQuestion?.id} />
      </section>}
    </div>
  );
}
