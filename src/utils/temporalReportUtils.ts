import type {
  Submission,
  TemporalAnswerOption,
  TemporalDataPoint,
  TemporalQuestionDefinition,
  TemporalReportData,
  TemporalReportFilters,
} from '../types';

const TIME_ZONE = 'America/Sao_Paulo';
const COLORS = ['#059669', '#2563eb', '#e11d48', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#475569'];

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
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const result = { year: get('year'), month: get('month'), day: get('day') };
  return Object.values(result).every(Number.isFinite) ? result : null;
};

const dayKey = ({ year, month, day }: LocalDateParts) => `${year}-${pad(month)}-${pad(day)}`;

const dateFromParts = ({ year, month, day }: LocalDateParts) => new Date(Date.UTC(year, month - 1, day));

const startOfWeek = (parts: LocalDateParts): LocalDateParts => {
  const date = dateFromParts(parts);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

const formatDateLabel = (parts: LocalDateParts) => `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;

const periodFor = (parts: LocalDateParts, grouping: TemporalReportFilters['grouping']) => {
  if (grouping === 'month') {
    const period = `${parts.year}-${pad(parts.month)}`;
    return { period, label: `${pad(parts.month)}/${parts.year}` };
  }
  if (grouping === 'week') {
    const week = startOfWeek(parts);
    return { period: dayKey(week), label: `Semana de ${formatDateLabel(week)}` };
  }
  return { period: dayKey(parts), label: formatDateLabel(parts) };
};

const responseValues = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter(item => item !== null && item !== undefined && String(item).trim().length > 0)
    .map(item => String(item));
};

export const isTemporalQuestion = (question: TemporalQuestionDefinition): boolean => {
  if (question.type === 'scale') return true;
  return ['radio', 'checkbox', 'select'].includes(question.type) && Boolean(question.options?.length);
};

export const getTemporalQuestionOptions = (question: TemporalQuestionDefinition): TemporalAnswerOption[] => {
  const values = question.type === 'scale'
    ? Array.from({ length: Math.max(0, (question.max ?? 5) - (question.min ?? 1) + 1) }, (_, index) => String((question.min ?? 1) + index))
    : (question.options || []).map(option => String(option));
  return values.map((value, index) => ({
    value,
    label: question.labels?.[value] || value,
    color: COLORS[index % COLORS.length],
  }));
};

export const getTemporalQuestions = (questions: TemporalQuestionDefinition[]): TemporalQuestionDefinition[] => questions.filter(isTemporalQuestion);

export const buildTemporalReport = (
  submissions: Submission[],
  question: TemporalQuestionDefinition | undefined,
  filters: TemporalReportFilters,
): TemporalReportData => {
  if (!question) return { answerOptions: [], points: [], totalResponses: 0 };
  const answerOptions = getTemporalQuestionOptions(question).filter(option => filters.answerValues.includes(option.value));
  const optionValues = new Set(answerOptions.map(option => option.value));
  const pointMap = new Map<string, TemporalDataPoint>();
  let totalResponses = 0;

  submissions.forEach(submission => {
    if (submission.valida !== true) return;
    const localDate = localDateParts(submission.data_coleta);
    if (!localDate) return;
    const date = dayKey(localDate);
    if ((filters.startDate && date < filters.startDate) || (filters.endDate && date > filters.endDate)) return;
    const values = responseValues(submission.respostas_dinamicas?.[question.id]);
    if (!values.length) return;
    const period = periodFor(localDate, filters.grouping);
    const point = pointMap.get(period.period) || {
      period: period.period,
      label: period.label,
      total: 0,
      values: Object.fromEntries(answerOptions.map(option => [option.value, 0])),
      percentages: Object.fromEntries(answerOptions.map(option => [option.value, 0])),
    };
    point.total += 1;
    values.forEach(value => {
      if (optionValues.has(value)) point.values[value] += 1;
    });
    pointMap.set(period.period, point);
    totalResponses += 1;
  });

  const points = Array.from(pointMap.values()).sort((left, right) => left.period.localeCompare(right.period));
  points.forEach(point => {
    answerOptions.forEach(option => {
      point.percentages[option.value] = point.total ? (point.values[option.value] / point.total) * 100 : 0;
    });
  });
  return { answerOptions, points, totalResponses };
};

export const formatTemporalValue = (value: number, mode: TemporalReportFilters['displayMode']) =>
  mode === 'percentage' ? `${value.toFixed(1)}%` : value.toLocaleString('pt-BR');

export const temporalDateToday = () => {
  const parts = localDateParts(new Date().toISOString());
  return parts ? dayKey(parts) : new Date().toISOString().slice(0, 10);
};

export const temporalDateDaysAgo = (days: number) => {
  const parts = localDateParts(new Date().toISOString());
  if (!parts) return '';
  const date = dateFromParts(parts);
  date.setUTCDate(date.getUTCDate() - days);
  return dayKey({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
};