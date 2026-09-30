import type { Survey } from '../../types';
import type { TemporalAnswerOption, TemporalReportFilters as TemporalFilters, TemporalQuestionGroup } from '../../types';
import { SurveySelectionControl } from './SurveySelectionControl';

interface Props {
  surveys: Survey[];
  selectedSurveyIds: string[];
  pendingSurveyIds: string[];
  surveySelectorOpen: boolean;
  questions: TemporalQuestionGroup[];
  filters: TemporalFilters;
  answerOptions: TemporalAnswerOption[];
  onSurveyOpen: () => void;
  onSurveyToggle: (surveyId: string) => void;
  onSurveyCancel: () => void;
  onSurveyConfirm: () => void;
  onChange: (filters: TemporalFilters) => void;
}

export function TemporalReportFilters({ surveys, selectedSurveyIds, pendingSurveyIds, surveySelectorOpen, questions, filters, answerOptions, onSurveyOpen, onSurveyToggle, onSurveyCancel, onSurveyConfirm, onChange }: Props) {
  const update = (change: Partial<TemporalFilters>) => onChange({ ...filters, ...change });
  const toggleAnswer = (value: string) => update({ answerValues: filters.answerValues.includes(value) ? filters.answerValues.filter(item => item !== value) : [...filters.answerValues, value] });
  return (
    <section className="space-y-5 rounded-[2rem] border border-outline bg-white p-6 shadow-sm dark:bg-slate-900" aria-label="Filtros de evolução no tempo">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2 text-xs font-black text-on-surface"><span className="block uppercase tracking-widest text-primary">Pesquisa</span><SurveySelectionControl surveys={surveys} selectedSurveyIds={selectedSurveyIds} pendingSurveyIds={pendingSurveyIds} isOpen={surveySelectorOpen} onOpen={onSurveyOpen} onToggle={onSurveyToggle} onCancel={onSurveyCancel} onConfirm={onSurveyConfirm} label="Pesquisas temporais" emptySelectionLabel="Selecionar pesquisa" className="w-full max-w-full sm:w-72" /></div>
        <label className="space-y-2 text-xs font-black text-on-surface"><span className="uppercase tracking-widest text-primary">Pergunta para análise</span><select value={filters.questionId} onChange={event => update({ questionId: event.target.value, answerValues: [] })} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold dark:bg-slate-800" disabled={!questions.length}><option value="">Selecione uma pergunta</option>{questions.map(question => <option key={question.id} value={question.id}>{question.label}</option>)}</select></label>
        <label className="space-y-2 text-xs font-black text-on-surface"><span className="uppercase tracking-widest text-primary">Dado demográfico</span><select value={filters.demographicField} onChange={event => update({ demographicField: event.target.value as TemporalFilters['demographicField'] })} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold dark:bg-slate-800"><option value="none">Geral / Sem filtro</option><option value="bairro">Bairro</option><option value="sexo">Sexo</option><option value="faixa_etaria">Faixa etária</option><option value="renda">Renda</option><option value="escolaridade">Escolaridade</option><option value="religiao">Religião</option><option value="estado_civil">Estado civil</option></select></label>
        <label className="space-y-2 text-xs font-black text-on-surface"><span className="uppercase tracking-widest text-primary">Agrupar por</span><select value={filters.grouping} onChange={event => update({ grouping: event.target.value as TemporalFilters['grouping'] })} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold dark:bg-slate-800"><option value="day">Dia</option><option value="week">Semana</option><option value="month">Mês</option></select></label>
        <div className="space-y-2 text-xs font-black text-on-surface"><span className="block uppercase tracking-widest text-primary">Exibição</span><div className="flex rounded-xl border border-outline bg-slate-50 p-1 dark:bg-slate-800">{(['count', 'percentage'] as const).map(mode => <button key={mode} type="button" onClick={() => update({ displayMode: mode })} className={`flex-1 rounded-lg px-3 py-2 font-black ${filters.displayMode === mode ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>{mode === 'count' ? 'Quantidade' : 'Percentual'}</button>)}</div></div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-xs font-black text-on-surface"><span className="uppercase tracking-widest text-primary">Data inicial</span><input type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={event => update({ startDate: event.target.value })} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold dark:bg-slate-800" /></label>
        <label className="space-y-2 text-xs font-black text-on-surface"><span className="uppercase tracking-widest text-primary">Data final</span><input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={event => update({ endDate: event.target.value })} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold dark:bg-slate-800" /></label>
        <div className="space-y-2 text-xs font-black text-on-surface"><span className="block uppercase tracking-widest text-primary">Gráfico</span><div className="flex rounded-xl border border-outline bg-slate-50 p-1 dark:bg-slate-800">{(['line', 'bar'] as const).map(type => <button key={type} type="button" onClick={() => update({ chartType: type })} className={`flex-1 rounded-lg px-3 py-2 font-black ${filters.chartType === type ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>{type === 'line' ? 'Linhas' : 'Barras'}</button>)}</div></div>
        {filters.demographicField === 'none' ? <fieldset className="space-y-2 text-xs font-black text-on-surface"><legend className="uppercase tracking-widest text-primary">Respostas</legend><div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">{answerOptions.map(option => <label key={option.value} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline px-2 py-1.5"><input type="checkbox" checked={filters.answerValues.includes(option.value)} onChange={() => toggleAnswer(option.value)} className="accent-primary" />{option.label}</label>)}{!answerOptions.length && <span className="text-on-surface-variant">Selecione uma pergunta.</span>}</div></fieldset> : <fieldset className="space-y-2 text-xs font-black text-on-surface"><legend className="uppercase tracking-widest text-primary">Resposta</legend><div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">{answerOptions.map(option => <label key={option.value} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline px-2 py-1.5"><input type="radio" name="temporal-single-answer" checked={filters.answerValues[0] === option.value} onChange={() => update({ answerValues: [option.value] })} className="accent-primary" />{option.label}</label>)}{!answerOptions.length && <span className="text-on-surface-variant">Selecione uma pergunta.</span>}</div></fieldset>}
      </div>
    </section>
  );
}
