import type {
  Submission,
  TemporalAnswerOption,
  TemporalDataPoint,
  TemporalQuestionDefinition,
  TemporalQuestionGroup,
  TemporalReportData,
  TemporalReportFilters,
  TemporalReportSource,
} from '../types';
import { normalizeSurveyOptionLabel } from './surveyOptionImageUtils';

const TIME_ZONE = 'America/Sao_Paulo';
const OTHERS_VALUE = '__others__';
const OTHERS_LABEL = 'Outros / NS / NR';
const OTHERS_COLOR = '#cbd5e1';
const GOLDEN_ANGLE = 137.50776405003785;
type LocalDateParts = { year: number; month: number; day: number };
const pad = (value: number) => String(value).padStart(2, '0');

const localDateParts = (value: string): LocalDateParts | null => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const result = { year: Number(dateOnly[1]), month: Number(dateOnly[2]), day: Number(dateOnly[3]) };
    return Object.values(result).every(Number.isFinite) ? result : null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const result = { year: get('year'), month: get('month'), day: get('day') };
  return Object.values(result).every(Number.isFinite) ? result : null;
};
const dayKey = ({ year, month, day }: LocalDateParts) => `${year}-${pad(month)}-${pad(day)}`;
const dateFromParts = ({ year, month, day }: LocalDateParts) => new Date(Date.UTC(year, month - 1, day));
const startOfWeek = (parts: LocalDateParts): LocalDateParts => {
  const date = dateFromParts(parts);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};
const formatDateLabel = (parts: LocalDateParts) => `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
const periodFor = (parts: LocalDateParts, grouping: TemporalReportFilters['grouping']) => {
  if (grouping === 'month') return { period: `${parts.year}-${pad(parts.month)}`, label: `${pad(parts.month)}/${parts.year}` };
  if (grouping === 'week') {
    const week = startOfWeek(parts);
    return { period: dayKey(week), label: `Semana de ${formatDateLabel(week)}` };
  }
  return { period: dayKey(parts), label: formatDateLabel(parts) };
};
const responseValues = (value: unknown): string[] => (Array.isArray(value) ? value : [value])
  .filter(item => item !== null && item !== undefined && String(item).trim().length > 0).map(item => String(item));

export const isTemporalQuestion = (question: TemporalQuestionDefinition): boolean => question.type === 'scale'
  || ['radio', 'checkbox', 'select'].includes(question.type) && Boolean(question.options?.length);
const normalizeHue = (value: number) => value - Math.floor(value / 360) * 360;
const temporalOptionColor = (index: number, attempt = 0): string => {
  const hue = normalizeHue(index * GOLDEN_ANGLE + attempt * 29.73);
  const saturation = 68; const lightness = 43;
  const chroma = (1 - Math.abs((2 * lightness) / 100 - 1)) * (saturation / 100);
  const hueSegment = hue / 60; const pair = hueSegment - Math.floor(hueSegment / 2) * 2;
  const second = chroma * (1 - Math.abs(pair - 1));
  const [red, green, blue] = hueSegment < 1 ? [chroma, second, 0] : hueSegment < 2 ? [second, chroma, 0]
    : hueSegment < 3 ? [0, chroma, second] : hueSegment < 4 ? [0, second, chroma]
      : hueSegment < 5 ? [second, 0, chroma] : [chroma, 0, second];
  const match = lightness / 100 - chroma / 2;
  return `#${[red, green, blue].map(channel => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`;
};

const questionOptionEntries = (question: TemporalQuestionDefinition): Array<[string, string]> => {
  const values = question.type === 'scale'
    ? Array.from({ length: Math.max(0, (question.max ?? 5) - (question.min ?? 1) + 1) }, (_, index) => String((question.min ?? 1) + index))
    : (question.options || []).map(option => String(option));
  return values.map(value => [value, question.labels?.[value] || value]);
};

export const getTemporalQuestionOptions = (question: TemporalQuestionDefinition): TemporalAnswerOption[] => {
  const usedColors = new Set<string>();
  return questionOptionEntries(question).map(([value, label], index) => {
    let attempt = 0; let color = temporalOptionColor(index, attempt);
    while (usedColors.has(color) || color === OTHERS_COLOR) color = temporalOptionColor(index, ++attempt);
    usedColors.add(color); return { value, label, color };
  });
};

export const getTemporalQuestions = (questions: TemporalQuestionDefinition[]) => questions.filter(isTemporalQuestion);

export const getTemporalQuestionGroups = (
  questionsBySurvey: Array<{ surveyId: string; questions: TemporalQuestionDefinition[] }>,
): TemporalQuestionGroup[] => {
  const groups = new Map<string, TemporalQuestionGroup>();
  questionsBySurvey.forEach(({ surveyId, questions }) => {
    const seenInSurvey = new Set<string>();
    questions.filter(isTemporalQuestion).forEach(question => {
      const key = normalizeSurveyOptionLabel(question.label);
      if (seenInSurvey.has(key)) return;
      seenInSurvey.add(key);
      const group = groups.get(key) || { id: question.id, key, label: question.label, sources: [] };
      group.sources.push({ surveyId, question }); groups.set(key, group);
    });
  });
  const multiple = questionsBySurvey.length > 1;
  return Array.from(groups.values()).filter(group => !multiple || new Set(group.sources.map(source => source.surveyId)).size >= 2);
};

export const getTemporalQuestionGroupOptions = (group: TemporalQuestionGroup, submissionsBySurvey: Record<string, Submission[]> = {}): TemporalAnswerOption[] => {
  const options: TemporalAnswerOption[] = [];
  const addOption = (value: string, label: string) => {
    const keys = [normalizeSurveyOptionLabel(value), normalizeSurveyOptionLabel(label)];
    if (options.some(option => keys.some(key => key === normalizeSurveyOptionLabel(option.value) || key === normalizeSurveyOptionLabel(option.label)))) return;
    options.push({ value, label, color: temporalOptionColor(options.length) });
  };
  group.sources.forEach(source => {
    const definedEntries = questionOptionEntries(source.question);
    const definedKeys = new Set(definedEntries.flatMap(([value, label]) => [normalizeSurveyOptionLabel(value), normalizeSurveyOptionLabel(label)]));
    definedEntries.forEach(([value, label]) => addOption(value, label));
    (submissionsBySurvey[source.surveyId] || []).filter(submission => submission.valida === true).forEach(submission => responseValues(submission.respostas_dinamicas?.[source.question.id]).forEach(value => {
      if (!definedKeys.has(normalizeSurveyOptionLabel(value))) addOption(value, value);
    }));
  });
  return options.map((option, index) => ({ ...option, color: temporalOptionColor(index) }));
};
export const getTemporalBarOptions = (answerOptions: TemporalAnswerOption[]) => [
  ...answerOptions.filter(option => !option.aggregated), ...answerOptions.filter(option => option.aggregated),
];

const canonicalResponseValues = (value: unknown, question: TemporalQuestionDefinition, options: TemporalAnswerOption[]): string[] => {
  const byKey = new Map<string, string>();
  const addMapping = (valueToMap: string, canonical: string) => byKey.set(normalizeSurveyOptionLabel(valueToMap), canonical);
  options.forEach(option => {
    addMapping(option.value, option.value);
    addMapping(option.label, option.value);
  });
  questionOptionEntries(question).forEach(([raw, label]) => {
    const rawKey = normalizeSurveyOptionLabel(raw);
    const labelKey = normalizeSurveyOptionLabel(label);
    const canonical = options.find(option => normalizeSurveyOptionLabel(option.value) === rawKey || normalizeSurveyOptionLabel(option.label) === rawKey
      || normalizeSurveyOptionLabel(option.value) === labelKey || normalizeSurveyOptionLabel(option.label) === labelKey)?.value;
    if (!canonical) return;
    addMapping(raw, canonical);
    addMapping(label, canonical);
  });
  return Array.from(new Set(responseValues(value).map(response => byKey.get(normalizeSurveyOptionLabel(response)))
    .filter((response): response is string => Boolean(response))));
};

const buildTemporalReportFromSources = (sources: TemporalReportSource[], options: TemporalAnswerOption[], filters: TemporalReportFilters, regionalSources = sources): TemporalReportData => {
  const selectedOptions = options.filter(option => filters.answerValues.includes(option.value));
  const selectedValues = new Set(selectedOptions.map(option => option.value));
  const pointMap = new Map<string, TemporalDataPoint>(); const optionTotals = new Map(selectedOptions.map(option => [option.value, 0]));
  const regionalTotals = new Map<string, { count: number; total: number }>(); let totalResponses = 0;
  sources.forEach(source => source.submissions.forEach(submission => {
    if (submission.valida !== true) return;
    const localDate = localDateParts(submission.data_coleta); if (!localDate) return;
    const date = dayKey(localDate); if ((filters.startDate && date < filters.startDate) || (filters.endDate && date > filters.endDate)) return;
    const values = canonicalResponseValues(submission.respostas_dinamicas?.[source.question.id], source.question, options); if (!values.length) return;
    const period = periodFor(localDate, filters.grouping);
    const point = pointMap.get(period.period) || { period: period.period, label: period.label, total: 0,
      values: Object.fromEntries(selectedOptions.map(option => [option.value, 0])), percentages: Object.fromEntries(selectedOptions.map(option => [option.value, 0])), variations: {} };
    point.total += 1; totalResponses += 1;
    const regional = regionalTotals.get(source.surveyId) || { count: 0, total: 0 }; regional.total += 1;
    values.forEach(value => {
      if (!selectedValues.has(value)) return;
      point.values[value] += 1; optionTotals.set(value, (optionTotals.get(value) || 0) + 1);
      const optionRegionalKey = `${source.surveyId}:${value}`; const optionRegional = regionalTotals.get(optionRegionalKey) || { count: 0, total: 0 };
      optionRegional.count += 1; regionalTotals.set(optionRegionalKey, optionRegional);
    });
    regionalTotals.set(source.surveyId, regional); pointMap.set(period.period, point);
  }));
  const rankedOptions = selectedOptions.map((option, index) => ({ option, index, total: optionTotals.get(option.value) || 0 }))
    .sort((left, right) => right.total - left.total || left.index - right.index);
  const mainOptions = rankedOptions.slice(0, 3).map(item => item.option); const shouldAggregate = selectedOptions.length > 3;
  const answerOptions = shouldAggregate ? [...mainOptions, { value: OTHERS_VALUE, label: OTHERS_LABEL, color: OTHERS_COLOR, aggregated: true }] : selectedOptions;
  const mainValues = new Set(mainOptions.map(option => option.value));
  const points = Array.from(pointMap.values()).sort((left, right) => left.period.localeCompare(right.period));
  points.forEach((point, pointIndex) => {
    const originalValues = { ...point.values }; point.values = Object.fromEntries(answerOptions.map(option => [option.value, 0]));
    mainOptions.forEach(option => { point.values[option.value] = originalValues[option.value] || 0; });
    if (shouldAggregate) point.values[OTHERS_VALUE] = selectedOptions.filter(option => !mainValues.has(option.value)).reduce((sum, option) => sum + (originalValues[option.value] || 0), 0);
    point.percentages = Object.fromEntries(answerOptions.map(option => [option.value, point.total ? (point.values[option.value] / point.total) * 100 : 0]));
    point.variations = Object.fromEntries(answerOptions.map(option => {
      const value = point.percentages[option.value] - (points[pointIndex - 1]?.percentages[option.value] ?? 0);
      return [option.value, { value, direction: Math.abs(value) < 0.05 ? 'stable' : value > 0 ? 'up' : 'down' }];
    }));
  });
  const regionalBreakdowns: TemporalReportData['regionalBreakdowns'] = {};
  answerOptions.forEach(option => {
    regionalBreakdowns[option.value] = regionalSources.map(source => {
      const base = regionalTotals.get(source.surveyId) || { total: 0, count: 0 }; let count = 0;
      if (option.aggregated) count = selectedOptions.filter(candidate => !mainValues.has(candidate.value)).reduce((sum, candidate) => sum + (regionalTotals.get(`${source.surveyId}:${candidate.value}`)?.count || 0), 0);
      else count = regionalTotals.get(`${source.surveyId}:${option.value}`)?.count || 0;
      return { surveyId: source.surveyId, surveyName: source.surveyName, regionLabel: source.regionLabel, count, total: base.total, percentage: base.total ? (count / base.total) * 100 : 0 };
    });
  });
  return { answerOptions, points, totalResponses, regionalBreakdowns };
};

export const buildTemporalReport = (submissions: Submission[], question: TemporalQuestionDefinition | undefined, filters: TemporalReportFilters): TemporalReportData => question
  ? buildTemporalReportFromSources([{ surveyId: '', surveyName: '', submissions, question }], getTemporalQuestionOptions(question), filters)
  : { answerOptions: [], points: [], totalResponses: 0 };

export const buildCombinedTemporalReport = (sources: TemporalReportSource[], question: TemporalQuestionGroup | undefined, filters: TemporalReportFilters): TemporalReportData => {
  if (!question) return { answerOptions: [], points: [], totalResponses: 0 };
  const sourceBySurvey = new Map(sources.map(source => [source.surveyId, source]));
  const mergedSources = question.sources.flatMap(questionSource => {
    const source = sourceBySurvey.get(questionSource.surveyId); return source ? [{ ...source, question: questionSource.question }] : [];
  });
  return buildTemporalReportFromSources(mergedSources, getTemporalQuestionGroupOptions(question, Object.fromEntries(sources.map(source => [source.surveyId, source.submissions]))), filters, sources);
};

export const formatTemporalValue = (value: number, mode: TemporalReportFilters['displayMode']) => mode === 'percentage' ? `${value.toFixed(1)}%` : value.toLocaleString('pt-BR');
export const temporalDateToday = () => { const parts = localDateParts(new Date().toISOString()); return parts ? dayKey(parts) : new Date().toISOString().slice(0, 10); };
export const temporalDateDaysAgo = (days: number) => { const parts = localDateParts(new Date().toISOString()); if (!parts) return ''; const date = dateFromParts(parts); date.setUTCDate(date.getUTCDate() - days); return dayKey({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }); };
export const getTemporalPointOffsets = (points: TemporalDataPoint[], answerOptions: TemporalAnswerOption[], displayMode: TemporalReportFilters['displayMode']): Record<string, number> => {
  const offsets: Record<string, number> = {}; const upperLabelOffset = -14; const labelStep = 20;
  points.forEach((point, pointIndex) => {
    const proximity = displayMode === 'percentage' ? 4.5 : Math.max(1, point.total * 0.045);
    const sorted = answerOptions.map((option, optionIndex) => ({ option, optionIndex, value: (displayMode === 'percentage' ? point.percentages[option.value] : point.values[option.value]) ?? 0 })).sort((left, right) => right.value - left.value || left.optionIndex - right.optionIndex);
    let previousValue: number | undefined; let previousOffset = upperLabelOffset;
    sorted.forEach((item, sortedIndex) => { const collides = sortedIndex > 0 && previousValue !== undefined && previousValue - item.value <= proximity; const offset = collides ? previousOffset + labelStep : upperLabelOffset; offsets[`${pointIndex}:${item.option.value}`] = offset; previousValue = item.value; previousOffset = offset; });
  });
  return offsets;
};
