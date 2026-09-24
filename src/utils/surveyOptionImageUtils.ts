import type { SurveyOptionImage } from '../types';

export const normalizeSurveyOptionLabel = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/\s+/g, ' ')
  .trim();

export const findSurveyOptionImage = (
  images: SurveyOptionImage[],
  questionId: string | undefined,
  alternatives: string[],
): SurveyOptionImage | undefined => {
  if (!questionId) return undefined;
  const normalizedAlternatives = new Set(alternatives.map(normalizeSurveyOptionLabel));
  return images.find(image => image.pergunta_id === questionId && normalizedAlternatives.has(normalizeSurveyOptionLabel(image.alternativa)));
};
