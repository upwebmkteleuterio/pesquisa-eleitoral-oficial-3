import type { SurveyOptionImage, TemporalAnswerOption } from '../../types';
import { findSurveyOptionImage } from '../../utils/surveyOptionImageUtils';
import { SurveyOptionImage as SurveyOptionImageView } from '../SurveyOptionImage';

interface Props {
  answerOptions: TemporalAnswerOption[];
  optionImages: SurveyOptionImage[];
  questionId?: string;
}

export function TemporalReportLegend({ answerOptions, optionImages, questionId }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 pt-12 text-[11px] font-extrabold text-on-surface-variant" aria-label="Alternativas do gráfico">
      {answerOptions.map(option => {
        const image = option.aggregated ? undefined : findSurveyOptionImage(optionImages, questionId, [option.value, option.label]);
        return (
          <span key={option.value} className="inline-flex items-center gap-1.5">
            {image
              ? <SurveyOptionImageView image={image} alt={`Imagem de ${option.label}`} className="h-7 w-7 rounded-full border border-outline object-cover" />
              : <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color }} aria-hidden="true" />}
            <span>{option.label}</span>
          </span>
        );
      })}
    </div>
  );
}
