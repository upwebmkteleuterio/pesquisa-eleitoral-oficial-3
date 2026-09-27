import { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown } from 'lucide-react';
import type { Submission, Survey, SurveyOptionImage, TemporalQuestionDefinition, TemporalReportFilters, TemporalReportSource } from '../../types';
import { buildCombinedTemporalReport, getTemporalQuestionGroups, getTemporalQuestionGroupOptions } from '../../utils/temporalReportUtils';
import { captureTemporalChart } from '../../utils/temporalPdfCapture';
import { generateTemporalReportPDF } from '../../utils/pdfUtils';
import { TemporalGroupedBarChart } from './TemporalGroupedBarChart';
import { TemporalHeatmap } from './TemporalHeatmap';
import { TemporalReportChart } from './TemporalReportChart';
import { TemporalReportFilters as TemporalFilters } from './TemporalReportFilters';
import { TemporalReportTable } from './TemporalReportTable';
import { TemporalRegionalDonut } from './TemporalRegionalDonut';

interface Props {
  surveys: Survey[];
  selectedSurveyIds: string[];
  pendingSurveyIds: string[];
  surveySelectorOpen: boolean;
  submissionsBySurvey: Record<string, Submission[]>;
  optionImages: SurveyOptionImage[];
  isLoading: boolean;
  error: string | null;
  onSurveyOpen: () => void;
  onSurveyToggle: (surveyId: string) => void;
  onSurveyCancel: () => void;
  onSurveyConfirm: () => void;
}

const initialFilters: TemporalReportFilters = { questionId: '', answerValues: [], startDate: '', endDate: '', grouping: 'day', displayMode: 'percentage', chartType: 'line' };

export function TemporalReport({ surveys, selectedSurveyIds, pendingSurveyIds, surveySelectorOpen, submissionsBySurvey, optionImages, isLoading, error, onSurveyOpen, onSurveyToggle, onSurveyCancel, onSurveyConfirm }: Props) {
  const [filters, setFilters] = useState<TemporalReportFilters>(initialFilters);
  const selectedSurveys = useMemo(() => selectedSurveyIds.flatMap(id => { const survey = surveys.find(item => item.id === id); return survey ? [survey] : []; }), [selectedSurveyIds, surveys]);
  const questions = useMemo(() => getTemporalQuestionGroups(selectedSurveys.map(survey => ({ surveyId: survey.id, questions: (survey.schema_dinamico?.questions || []) as TemporalQuestionDefinition[] }))), [selectedSurveys]);
  const selectedQuestion = questions.find(question => question.id === filters.questionId);
  const availableOptions = useMemo(() => selectedQuestion ? getTemporalQuestionGroupOptions(selectedQuestion, submissionsBySurvey) : [], [selectedQuestion, submissionsBySurvey]);
  const optionValues = useMemo(() => availableOptions.map(option => option.value), [availableOptions]);
  const optionValuesKey = JSON.stringify(optionValues);
  const questionIdsKey = JSON.stringify(questions.map(question => question.id));
  const reportSources = useMemo<TemporalReportSource[]>(() => selectedQuestion?.sources.flatMap(source => {
    const survey = selectedSurveys.find(item => item.id === source.surveyId);
    return survey ? [{ surveyId: survey.id, surveyName: survey.nome, submissions: submissionsBySurvey[survey.id] || [], question: source.question }] : [];
  }) || [], [selectedSurveys, submissionsBySurvey, selectedQuestion]);
  const report = useMemo(() => selectedQuestion
    ? buildCombinedTemporalReport(reportSources, selectedQuestion, filters)
    : { answerOptions: [], points: [], totalResponses: 0 }, [filters, reportSources, selectedQuestion]);
  const chartCaptureRef = useRef<HTMLDivElement>(null);
  const previousQuestionIdRef = useRef('');
  const previousOptionValuesRef = useRef<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const hasInvalidDateRange = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);
  const selectedSurvey = selectedSurveys[0];
  const pdfSurvey = selectedSurvey ? { ...selectedSurvey, nome: selectedSurveys.map(survey => survey.nome).join(' + ') } : undefined;
  const canExport = !!pdfSurvey && !!selectedQuestion && !hasInvalidDateRange && report.points.length > 0 && report.answerOptions.length > 0;
  const exportChartWidth = 1400;
  const exportChartHeight = filters.chartType === 'line' ? 576 : 448;

  useEffect(() => {
    const nextQuestion = questions.find(question => question.id === filters.questionId);
    const nextQuestionId = nextQuestion?.id || '';
    const previousOptionValues = previousOptionValuesRef.current;
    const optionsChanged = previousOptionValues.length !== optionValues.length
      || previousOptionValues.some((value, index) => value !== optionValues[index]);
    const questionChanged = previousQuestionIdRef.current !== nextQuestionId;
    previousQuestionIdRef.current = nextQuestionId;
    previousOptionValuesRef.current = optionValues;
    if (!questionChanged && !optionsChanged) return;

    setFilters(current => {
      const nextAnswerValues = questionChanged
        ? optionValues
        : Array.from(new Set([
          ...current.answerValues.filter(value => optionValues.includes(value)),
          ...optionValues.filter(value => !previousOptionValues.includes(value)),
        ]));
      const sameAnswers = current.answerValues.length === nextAnswerValues.length
        && current.answerValues.every((value, index) => value === nextAnswerValues[index]);
      if (current.questionId === nextQuestionId && sameAnswers) return current;
      return { ...current, questionId: nextQuestionId, answerValues: nextAnswerValues };
    });
  }, [filters.questionId, optionValuesKey, questionIdsKey, questions, optionValues]);

  useEffect(() => {
    if (!isPreparingReport) return;
    const timeoutId = window.setTimeout(() => setIsPreparingReport(false), 180);
    return () => window.clearTimeout(timeoutId);
  }, [isPreparingReport, filters.questionId, report]);

  const handleFiltersChange = (next: TemporalReportFilters) => {
    if (next.questionId !== filters.questionId) {
      setIsPreparingReport(true);
      const question = questions.find(item => item.id === next.questionId);
      setFilters({ ...next, answerValues: question ? getTemporalQuestionGroupOptions(question, submissionsBySurvey).map(option => option.value) : [] });
      return;
    }
    setFilters(next);
  };
  const handleExport = async () => {
    if (!canExport || !pdfSurvey || !selectedQuestion || isExporting) return;
    setIsExporting(true);
    try {
      let chartCapture = null;
      try { chartCapture = await captureTemporalChart(chartCaptureRef.current, '#temporal-chart-pdf-export'); } catch { chartCapture = null; }
      await generateTemporalReportPDF(pdfSurvey, selectedQuestion.label, filters, report, chartCapture || undefined);
    } finally { setIsExporting(false); }
  };

  return <div className="space-y-6">
    <TemporalFilters surveys={surveys} selectedSurveyIds={selectedSurveyIds} pendingSurveyIds={pendingSurveyIds} surveySelectorOpen={surveySelectorOpen} questions={questions} filters={filters} answerOptions={availableOptions} onSurveyOpen={onSurveyOpen} onSurveyToggle={onSurveyToggle} onSurveyCancel={onSurveyCancel} onSurveyConfirm={onSurveyConfirm} onChange={handleFiltersChange} />
    {(isLoading || isPreparingReport) && <div className="rounded-[2rem] border border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900" role="status">Carregando respostas válidas<span className="inline-flex w-6 justify-start" aria-hidden="true"><span className="animate-pulse">.</span><span className="animate-pulse [animation-delay:150ms]">.</span><span className="animate-pulse [animation-delay:300ms]">.</span></span></div>}
    {error && <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" role="alert">{error}</div>}
    {!isLoading && !isPreparingReport && !error && !selectedSurveyIds.length && <div className="rounded-[2rem] border border-dashed border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900">Selecione uma pesquisa para começar.</div>}
    {!isLoading && !isPreparingReport && !error && selectedSurveyIds.length > 0 && !questions.length && <div className="rounded-[2rem] border border-dashed border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900">{selectedSurveyIds.length > 1 ? 'Não há perguntas temporais comuns entre as pesquisas selecionadas.' : 'Esta pesquisa não possui perguntas com alternativas ou escala.'}</div>}
    {!isLoading && !isPreparingReport && !error && hasInvalidDateRange && <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-center font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" role="alert">A data final deve ser igual ou posterior à data inicial.</div>}
    {!isLoading && !isPreparingReport && !error && !filters.questionId && selectedSurveyIds.length > 0 && questions.length > 0 && <div className="rounded-[2rem] border border-dashed border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900">Selecione uma pergunta para visualizar o relatório.</div>}
    {!isLoading && !isPreparingReport && !error && filters.questionId && !hasInvalidDateRange && (!filters.answerValues.length || !report.points.length) && <div className="rounded-[2rem] border border-dashed border-outline bg-white p-12 text-center font-bold text-on-surface-variant dark:bg-slate-900">Nenhum dado encontrado para os filtros selecionados.</div>}
    {!isLoading && !isPreparingReport && !error && !hasInvalidDateRange && filters.questionId && report.points.length > 0 && report.answerOptions.length > 0 && <>
      <section className="space-y-8 rounded-[2rem] border border-outline bg-white p-6 shadow-sm dark:bg-slate-900" aria-label="Gráfico de evolução no tempo">
        <div className="relative flex flex-col gap-4 sm:block"><div className="order-first flex items-center justify-end gap-2 sm:absolute sm:right-0 sm:top-0"><span className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-black text-primary">{filters.grouping === 'day' ? 'Por dia' : filters.grouping === 'week' ? 'Por semana' : 'Por mês'}</span><button type="button" onClick={handleExport} disabled={!canExport || isExporting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40" title="Imprimir relatório temporal em PDF"><FileDown size={16} />{isExporting ? 'Gerando...' : 'Imprimir PDF'}</button></div><div className="order-last min-w-0 rounded-2xl bg-white"><div className="sm:pr-56"><h2 className="text-xl font-black text-on-surface">Evolução no tempo</h2><p className="text-sm font-bold text-on-surface-variant">{report.totalResponses.toLocaleString('pt-BR')} respostas válidas no período</p></div><TemporalReportChart points={report.points} answerOptions={report.answerOptions} optionImages={optionImages} questionId={selectedQuestion?.id} displayMode={filters.displayMode} chartType={filters.chartType} /></div><div id="temporal-chart-pdf-export" ref={chartCaptureRef} data-temporal-pdf-export="true" aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0, width: `${exportChartWidth}px`, height: `${exportChartHeight + 56}px`, overflow: 'hidden', backgroundColor: '#ffffff', pointerEvents: 'none' }}><div><h2 className="text-xl font-black text-on-surface">Evolução no tempo</h2><p className="text-sm font-bold text-on-surface-variant">{report.totalResponses.toLocaleString('pt-BR')} respostas válidas no período</p></div><TemporalReportChart points={report.points} answerOptions={report.answerOptions} optionImages={optionImages} questionId={selectedQuestion?.id} displayMode={filters.displayMode} chartType={filters.chartType} fixedDimensions={{ width: exportChartWidth, height: exportChartHeight }} /></div></div>
        <TemporalGroupedBarChart points={report.points} answerOptions={report.answerOptions} displayMode={filters.displayMode} /><TemporalHeatmap points={report.points} answerOptions={report.answerOptions} displayMode={filters.displayMode} /><TemporalReportTable points={report.points} answerOptions={report.answerOptions} optionImages={optionImages} questionId={selectedQuestion?.id} />
      </section>
      {selectedSurveyIds.length > 1 && report.regionalBreakdowns && <TemporalRegionalDonut answerOptions={report.answerOptions} regionalBreakdowns={report.regionalBreakdowns} />}
    </>}
  </div>;
}
