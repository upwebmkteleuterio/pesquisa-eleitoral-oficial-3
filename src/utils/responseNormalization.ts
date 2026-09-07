export interface AggregatedResponse {
  name: string;
  value: number;
}

const NO_CANDIDATE_LABEL = 'Sem candidato';

const normalizeKey = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const noCandidateAliases = new Set([
  'nao tem',
  'nao tem candidato',
  'nao tem nao ten',
  'nao tem ainda',
  'nao tem opcao',
  'ainda nao tem',
  'nao',
  'ainda nao tem candidato',
  'sem candidato',
  'nenhum',
  'nenhum candidato',
  'nem um',
  'em nem um',
  'nulo',
  'nao sabe',
  'nao sabe ainda',
  'nao sei',
  'nao soube informar',
  'nao souber informar',
  'ainda nao sabe',
  'indesiso',
  'indesisa',
  'sem opcao',
  'naoctem',
  'nao rem',
  'nao ha',
  'nao ha candidato',
  'nao existe',
  'nao existe candidato',
  'nao foi definido candidato',
  'nao sabe informar',
  'nao decidiu',
  'sem candidato definido',
  'nenhuma opcao',
  'sem opcoes',
  'sem nome',
  'sem escolha',
  'nao informou',
  'nao indicou',
  'ainda nao decidiu',
].map(normalizeKey));

const knownCandidateAliases: Record<string, string> = {
  'dudao': 'dudao',
  'dudao costa': 'dudao',
  'ofirney': 'ofirney',
  'orfiney': 'ofirney',
  'ofiney': 'ofirney',
  'raissa': 'raissa',
  'rayssa': 'raissa',
  'raisa': 'raissa',
};

const preferredCandidateLabels: Record<string, string> = {
  dudao: 'Dudão',
  ofirney: 'Ofirney',
  raissa: 'Raissa',
};

const candidateQuestionTerms = [
  'em quem voce votaria',
  'em quem voce pretende votar',
  'intencao de voto',
  'intencao do voto',
  'qual candidato',
  'quem sera o proximo',
  'melhor vice',
  'qual vereador',
  'qual senador',
  'qual deputado',
  'qual governador',
  'qual presidente',
  'votaria em quem',
];

export const isCandidateQuestion = (questionLabel: unknown): boolean => {
  if (typeof questionLabel !== 'string') return false;
  const label = normalizeKey(questionLabel);
  return candidateQuestionTerms.some(term => label.includes(normalizeKey(term)));
};

const readableValue = (value: string, candidateQuestion: boolean): string => {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!candidateQuestion || !/[A-Za-zÀ-ÖØ-öø-ÿ]/u.test(trimmed)) return trimmed;

  return trimmed
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[\s-])([\p{L}])/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase('pt-BR')}`);
};

const valueToText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() ? value : null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized !== '{}' ? serialized : null;
  } catch {
    return null;
  }
};

const optionToText = (option: unknown): string | null => {
  if (typeof option === 'object' && option !== null) {
    const configured = option as { label?: unknown; value?: unknown; name?: unknown };
    return valueToText(configured.label ?? configured.value ?? configured.name);
  }
  return valueToText(option);
};

const damerauDistance = (left: string, right: string): number => {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > 1) return 2;

  const previousPrevious = Array.from({ length: right.length + 1 }, (_, index) => index);
  let previous = previousPrevious.slice();
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++) {
      const substitution = previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
      const insertion = current[column - 1] + 1;
      const deletion = previous[column] + 1;
      let distance = Math.min(substitution, insertion, deletion);
      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) {
        distance = Math.min(distance, previousPrevious[column - 2] + 1);
      }
      current.push(distance);
    }
    previousPrevious.splice(0, previousPrevious.length, ...previous);
    previous = current;
  }
  return previous[right.length];
};

const conservativeCandidateMatch = (key: string, existingKeys: string[]): string | undefined => {
  const compactKey = key.replace(/\s/g, '');
  if (compactKey.length < 6) return undefined;

  return existingKeys.find(existingKey => {
    const compactExisting = existingKey.replace(/\s/g, '');
    return compactExisting.length >= 6
      && compactExisting.slice(0, 2) === compactKey.slice(0, 2)
      && damerauDistance(compactKey, compactExisting) <= 1;
  });
};

const canonicalKeyFor = (value: string, candidateQuestion: boolean): string => {
  const key = normalizeKey(value);
  if (!candidateQuestion) return key;
  return knownCandidateAliases[key] || key;
};

export const normalizeResponse = (value: unknown, questionLabel?: unknown): string | null => {
  const text = valueToText(value);
  if (!text) return null;

  const candidateQuestion = isCandidateQuestion(questionLabel);
  const key = normalizeKey(text);
  if (candidateQuestion && noCandidateAliases.has(key)) return NO_CANDIDATE_LABEL;
  const canonicalKey = canonicalKeyFor(text, candidateQuestion);
  return preferredCandidateLabels[canonicalKey] || readableValue(text, candidateQuestion);
};

export const aggregateQuestionResponses = (
  questionLabel: unknown,
  responses: unknown[],
  configuredOptions: unknown[] = [],
): AggregatedResponse[] => {
  const candidateQuestion = isCandidateQuestion(questionLabel);
  const counts = new Map<string, AggregatedResponse>();
  const keys: string[] = [];

  const add = (value: unknown, increment: number) => {
    const text = valueToText(value);
    if (!text) return;
    const exactKey = canonicalKeyFor(text, candidateQuestion);
    const normalizedKey = candidateQuestion && noCandidateAliases.has(normalizeKey(text))
      ? normalizeKey(NO_CANDIDATE_LABEL)
      : exactKey;
    const fuzzyKey = candidateQuestion && normalizedKey !== normalizeKey(NO_CANDIDATE_LABEL)
      ? conservativeCandidateMatch(normalizedKey, keys)
      : undefined;
    const key = fuzzyKey || normalizedKey;
    const existing = counts.get(key);
    if (existing) {
      existing.value += increment;
      return;
    }

    const normalizedLabel = normalizeResponse(text, questionLabel) || text;
    counts.set(key, { name: normalizedLabel, value: increment });
    keys.push(key);
  };

  configuredOptions.forEach(option => add(optionToText(option), 0));
  responses.forEach(response => {
    if (Array.isArray(response)) response.flat(Infinity).forEach(item => add(item, 1));
    else add(response, 1);
  });

  return Array.from(counts.values()).sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'pt-BR'));
};
