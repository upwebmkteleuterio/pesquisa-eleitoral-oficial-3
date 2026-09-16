import type {
  Submission,
  Survey,
  VirtualReportAnswer,
  VirtualReportCardConfig,
  VirtualReportCardData,
  VirtualReportMergeConfig,
  VirtualReportQuestionRef,
} from "../types";

export const virtualQuestionKey = ({ pesquisa_id, pergunta_id }: VirtualReportQuestionRef) =>
  `${pesquisa_id}:${pergunta_id}`;

const questionLabel = (survey: Survey | undefined, questionId: string) =>
  survey?.schema_dinamico?.questions?.find((question: any) => question.id === questionId)?.label || questionId;

const questionsFor = (survey: Survey): any[] => survey.schema_dinamico?.questions || [];

const normalizeCards = (cards: VirtualReportCardConfig[]) => cards.map((card, index) => ({
  ...card,
  position: index,
  sources: card.sources || [],
  response_mappings: card.response_mappings || {},
}));

export const buildInitialVirtualCards = (surveys: Survey[]): VirtualReportCardConfig[] => {
  const maxQuestions = Math.max(0, ...surveys.map(survey => questionsFor(survey).length));
  const cards: VirtualReportCardConfig[] = [];
  for (let position = 0; position < maxQuestions; position += 1) {
    surveys.forEach(survey => {
      const question = questionsFor(survey)[position];
      if (question?.id) {
        cards.push({
          id: `virtual:${survey.id}:${question.id}`,
          position: cards.length,
          sources: [{ pesquisa_id: survey.id, pergunta_id: question.id }],
          response_mappings: {},
        });
      }
    });
  }
  return cards;
};

export const mergeVirtualCard = (
  cards: VirtualReportCardConfig[],
  cardId: string,
  joined: VirtualReportQuestionRef,
): VirtualReportCardConfig[] => {
  const joinedKey = virtualQuestionKey(joined);
  const target = cards.find(card => card.id === cardId);
  const sourceCard = cards.find(card => card.sources.some(source => virtualQuestionKey(source) === joinedKey));
  if (!target || target.sources.some(source => virtualQuestionKey(source) === joinedKey)) return cards;

  const targetKeys = new Set(target.sources.map(source => virtualQuestionKey(source)));
  const sourcesToAdd = sourceCard && sourceCard.id !== cardId
    ? sourceCard.sources.filter(source => !targetKeys.has(virtualQuestionKey(source)))
    : [joined];

  return normalizeCards(
    cards
      .filter(card => card.id === cardId || !card.sources.some(source => virtualQuestionKey(source) === joinedKey))
      .map(card => card.id === cardId
        ? { ...card, sources: [...card.sources, ...sourcesToAdd], response_mappings: { ...(sourceCard?.response_mappings || {}), ...(card.response_mappings || {}) } }
        : card),
  );
};

export const unmergeVirtualCard = (
  cards: VirtualReportCardConfig[],
  cardId: string,
  surveys: Survey[],
): VirtualReportCardConfig[] => {
  const target = cards.find(card => card.id === cardId);
  if (!target || target.sources.length < 2) return cards;

  const base = buildInitialVirtualCards(surveys);
  const baseByKey = new Map(base.map(card => [virtualQuestionKey(card.sources[0]), card]));
  const restored = target.sources
    .map(source => baseByKey.get(virtualQuestionKey(source)))
    .filter(Boolean)
    .map(card => ({ ...card, response_mappings: {} })) as VirtualReportCardConfig[];
  const withoutTarget = cards.filter(card => card.id !== cardId);
  const combined = [...withoutTarget, ...restored];
  const positions = new Map(base.map(card => [virtualQuestionKey(card.sources[0]), card.position]));

  return normalizeCards(
    combined.sort((left, right) => {
      const leftPosition = positions.get(virtualQuestionKey(left.sources[0])) ?? left.position;
      const rightPosition = positions.get(virtualQuestionKey(right.sources[0])) ?? right.position;
      return leftPosition - rightPosition;
    }),
  );
};

const rawValues = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(rawValues);
  if (value === null || value === undefined || value === "") return [];
  return [String(value).trim()].filter(Boolean);
};

const valuesFor = (ref: VirtualReportQuestionRef, submissions: Submission[] | undefined) =>
  (submissions || []).flatMap(submission => rawValues(submission.respostas_dinamicas?.[ref.pergunta_id]));

export const buildVirtualReportCard = (
  card: VirtualReportCardConfig,
  surveys: Survey[],
  submissionsBySurvey: Record<string, Submission[] | undefined>,
): VirtualReportCardData => {
  const sources = card.sources || [];
  const mappings = card.response_mappings || {};
  const counts = new Map<string, number>();
  const sourceSurveyNames = new Set<string>();

  sources.forEach(ref => {
    const survey = surveys.find(item => item.id === ref.pesquisa_id);
    if (survey) sourceSurveyNames.add(survey.nome);
    valuesFor(ref, submissionsBySurvey[ref.pesquisa_id]).forEach(raw => {
      const label = mappings[raw] || raw;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });

  const totalAnswers = Array.from(counts.values()).reduce((sum, total) => sum + total, 0);
  const answers: VirtualReportAnswer[] = Array.from(counts.entries())
    .map(([label, total]) => ({ label, total, percentage: totalAnswers ? (total / totalAnswers) * 100 : 0 }))
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "pt-BR"));

  return {
    config: card,
    questionLabels: sources.map(ref => questionLabel(surveys.find(item => item.id === ref.pesquisa_id), ref.pergunta_id)),
    surveyNames: Array.from(sourceSurveyNames),
    totalResponses: sources.reduce((sum, ref) => sum + (submissionsBySurvey[ref.pesquisa_id] || []).length, 0),
    totalAnswers,
    answers,
  };
};

export const buildVirtualReportData = (
  cards: VirtualReportCardConfig[],
  surveys: Survey[],
  submissionsBySurvey: Record<string, Submission[] | undefined>,
): VirtualReportCardData[] => cards.map(card => buildVirtualReportCard(card, surveys, submissionsBySurvey));

export const getVirtualAnswerOptions = (
  card: VirtualReportCardConfig,
  surveys: Survey[],
  submissionsBySurvey: Record<string, Submission[] | undefined>,
): string[] => {
  const options = card.sources.flatMap(ref => valuesFor(ref, submissionsBySurvey[ref.pesquisa_id]));
  return Array.from(new Set(options)).sort((left, right) => left.localeCompare(right, "pt-BR"));
};

export const applyVirtualAnswerMappings = (
  cards: VirtualReportCardConfig[],
  cardId: string,
  mappings: Record<string, string>,
) => cards.map(card => card.id === cardId ? { ...card, response_mappings: mappings } : card);

export const configToVirtualCards = (config: VirtualReportMergeConfig) =>
  normalizeCards(config.cards);
