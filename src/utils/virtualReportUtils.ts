import type {
  Submission,
  Survey,
  VirtualReportAnswer,
  VirtualReportAnswerOption,
  VirtualReportAnswerSource,
  VirtualReportCardConfig,
  VirtualReportCardData,
  VirtualReportMergeConfig,
  VirtualReportOptionGroup,
  VirtualReportOptionRef,
  VirtualReportQuestionRef,
} from "../types";

export const virtualQuestionKey = ({ pesquisa_id, pergunta_id }: VirtualReportQuestionRef) =>
  `${pesquisa_id}:${pergunta_id}`;

export const virtualOptionKey = ({ pesquisa_id, pergunta_id, valor }: VirtualReportOptionRef) =>
  `${virtualQuestionKey({ pesquisa_id, pergunta_id })}:${valor}`;

const questionLabel = (survey: Survey | undefined, questionId: string) =>
  survey?.schema_dinamico?.questions?.find((question: any) => question.id === questionId)?.label || questionId;

const questionsFor = (survey: Survey): any[] => survey.schema_dinamico?.questions || [];

const normalizeCards = (cards: VirtualReportCardConfig[]) => cards.map((card, index) => ({
  ...card,
  position: index,
  sources: card.sources || [],
  option_groups: (card.option_groups || []).filter(group => group.label?.trim() && group.options?.length),
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
          option_groups: [],
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
  const groups = [
    ...(target.option_groups || []),
    ...(sourceCard && sourceCard.id !== cardId ? sourceCard.option_groups || [] : []),
  ];

  return normalizeCards(
    cards
      .filter(card => card.id === cardId || !card.sources.some(source => virtualQuestionKey(source) === joinedKey))
      .map(card => card.id === cardId
        ? { ...card, sources: [...card.sources, ...sourcesToAdd], option_groups: groups }
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
    .map(card => ({ ...card, option_groups: [] })) as VirtualReportCardConfig[];
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

const legacyGroups = (card: VirtualReportCardConfig): VirtualReportOptionGroup[] =>
  Object.entries(card.response_mappings || {}).map(([value, label], index) => ({
    id: `legacy:${card.id}:${index}`,
    label,
    options: card.sources.map(source => ({ ...source, valor: value })),
  }));

const cardGroups = (card: VirtualReportCardConfig) => [
  ...(card.option_groups || []),
  ...legacyGroups(card),
];

export const buildVirtualReportCard = (
  card: VirtualReportCardConfig,
  surveys: Survey[],
  submissionsBySurvey: Record<string, Submission[] | undefined>,
): VirtualReportCardData => {
  const sources = card.sources || [];
  const groups = cardGroups(card);
  const groupLabels = new Map<string, string>();
  const groupSources = new Map<string, VirtualReportQuestionRef[]>();
  groups.forEach(group => group.options.forEach(option => {
    const key = virtualOptionKey(option);
    groupLabels.set(key, group.label);
    groupSources.set(key, group.options);
  }));
  const counts = new Map<string, number>();
  const answerLabels = new Map<string, string>();
  const answerSources = new Map<string, VirtualReportAnswerSource[]>();
  const optionKeysByValue = new Map<string, Set<string>>();
  const sourceSurveyNames = new Set<string>();

  const sourceMetadata = (refs: VirtualReportQuestionRef[], includeQuestions: boolean) => {
    const seen = new Set<string>();
    return refs.reduce<VirtualReportAnswerSource[]>((metadata, ref) => {
      const survey = surveys.find(item => item.id === ref.pesquisa_id);
      const surveyName = survey?.nome || ref.pesquisa_id;
      const question = questionLabel(survey, ref.pergunta_id);
      const key = includeQuestions ? `${surveyName}:${question}` : surveyName;
      if (!seen.has(key)) {
        seen.add(key);
        metadata.push(includeQuestions ? { surveyName, questionLabel: question } : { surveyName });
      }
      return metadata;
    }, []);
  };

  sources.forEach(ref => {
    const survey = surveys.find(item => item.id === ref.pesquisa_id);
    if (survey) sourceSurveyNames.add(survey.nome);
    valuesFor(ref, submissionsBySurvey[ref.pesquisa_id]).forEach(value => {
      const key = virtualOptionKey({ ...ref, valor: value });
      const keys = optionKeysByValue.get(value) || new Set<string>();
      keys.add(key);
      optionKeysByValue.set(value, keys);
    });
  });

  sources.forEach(ref => {
    const survey = surveys.find(item => item.id === ref.pesquisa_id);
    valuesFor(ref, submissionsBySurvey[ref.pesquisa_id]).forEach(value => {
      const optionKey = virtualOptionKey({ ...ref, valor: value });
      const groupLabel = groupLabels.get(optionKey);
      const hasCollision = (optionKeysByValue.get(value)?.size || 0) > 1;
      const label = groupLabel || (hasCollision
        ? `${survey?.nome || ref.pesquisa_id} · ${questionLabel(survey, ref.pergunta_id)}: ${value}`
        : value);
      counts.set(label, (counts.get(label) || 0) + 1);
      if (!answerLabels.has(label)) answerLabels.set(label, groupLabel || value);
      if (!answerSources.has(label)) {
        const refsForSource = groupLabel ? groupSources.get(optionKey) || [ref] : [ref];
        answerSources.set(label, sourceMetadata(refsForSource, !groupLabel && hasCollision));
      }
    });
  });

  const totalAnswers = Array.from(counts.values()).reduce((sum, total) => sum + total, 0);
  const answers: VirtualReportAnswer[] = Array.from(counts.entries())
    .map(([label, total]) => ({
      label,
      total,
      percentage: totalAnswers ? (total / totalAnswers) * 100 : 0,
      displayLabel: answerLabels.get(label),
      sources: answerSources.get(label),
    }))
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
): VirtualReportAnswerOption[] => {
  const options = new Map<string, VirtualReportAnswerOption>();
  card.sources.forEach(ref => {
    const survey = surveys.find(item => item.id === ref.pesquisa_id);
    const question = questionLabel(survey, ref.pergunta_id);
    valuesFor(ref, submissionsBySurvey[ref.pesquisa_id]).forEach(value => {
      const key = virtualOptionKey({ ...ref, valor: value });
      const current = options.get(key);
      options.set(key, {
        key,
        value,
        count: (current?.count || 0) + 1,
        sourceLabel: survey?.nome || ref.pesquisa_id,
        questionLabel: question,
        ref: { ...ref, valor: value },
      });
    });
  });
  return Array.from(options.values()).sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "pt-BR"));
};

export const applyVirtualAnswerGroup = (
  cards: VirtualReportCardConfig[],
  cardId: string,
  group: VirtualReportOptionGroup,
) => cards.map(card => {
  if (card.id !== cardId) return card;
  const selectedKeys = new Set(group.options.map(option => virtualOptionKey(option)));
  const optionGroups = (cardGroups(card) || [])
    .map(existing => ({ ...existing, options: existing.options.filter(option => !selectedKeys.has(virtualOptionKey(option))) }))
    .filter(existing => existing.options.length);
  return { ...card, option_groups: [...optionGroups, group], response_mappings: undefined };
});

export const configToVirtualCards = (config: VirtualReportMergeConfig) =>
  normalizeCards(config.cards).map(card => ({
    ...card,
    option_groups: cardGroups(card),
    response_mappings: undefined,
  }));