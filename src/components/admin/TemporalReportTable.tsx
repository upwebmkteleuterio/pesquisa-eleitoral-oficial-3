import type { SurveyOptionImage, TemporalAnswerOption, TemporalDataPoint } from '../../types';
import { findSurveyOptionImage } from '../../utils/surveyOptionImageUtils';
import { SurveyOptionImage as SurveyOptionImageView } from '../SurveyOptionImage';

interface Props {
  points: TemporalDataPoint[];
  answerOptions: TemporalAnswerOption[];
  optionImages: SurveyOptionImage[];
  questionId?: string;
}

const formatPercentage = (value: number) => `${Math.round(value)}%`;

const variationLabel = (point: TemporalDataPoint, optionValue: string, index: number) => {
  if (index === 0) return { label: '—', className: 'text-slate-400' };
  const variation = point.variations[optionValue];
  if (!variation || variation.direction === 'stable') return { label: '—', className: 'text-slate-400' };
  return variation.direction === 'up'
    ? { label: `▲ ${Math.abs(variation.value).toFixed(0)}%`, className: 'text-emerald-600' }
    : { label: `▼ ${Math.abs(variation.value).toFixed(0)}%`, className: 'text-rose-600' };
};

export function TemporalReportTable({ points, answerOptions, optionImages, questionId }: Props) {
  return (
    <section className="space-y-4" aria-label="Tabela de evolução por período">
      <div>
        <h3 className="text-lg font-black text-on-surface">Resumo por período</h3>
        <p className="text-xs font-bold text-on-surface-variant">Percentual e variação em relação ao período anterior.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-outline">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/70">
            <tr className="border-b border-outline">
              <th className="sticky left-0 min-w-[13rem] bg-slate-50 px-4 py-3 font-black uppercase tracking-wider text-on-surface-variant dark:bg-slate-800">Resultado</th>
              {points.map(point => <th key={point.period} className="min-w-[6rem] px-4 py-3 text-center font-black text-on-surface-variant">{point.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {answerOptions.map(option => {
              const image = findSurveyOptionImage(optionImages, questionId, [option.value, option.label]);
              return (
                <tr key={option.value} className="border-b border-outline/70 last:border-b-0">
                  <th scope="row" className="sticky left-0 bg-white px-4 py-3 font-black text-on-surface dark:bg-slate-900">
                    <span className="flex items-center gap-2">
                      {image
                        ? <SurveyOptionImageView image={image} alt={`Imagem de ${option.label}`} className="h-8 w-8 shrink-0 rounded-full border border-outline object-cover" />
                        : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: option.color }}>{option.aggregated ? 'OU' : option.label.slice(0, 2).toUpperCase()}</span>}
                      <span className="max-w-[12rem] truncate">{option.label}</span>
                    </span>
                  </th>
                  {points.map((point, index) => {
                    const variation = variationLabel(point, option.value, index);
                    return (
                      <td key={`${option.value}-${point.period}`} className="px-4 py-3 text-center align-middle">
                        <div className="font-black text-on-surface">{formatPercentage(point.percentages[option.value] || 0)}</div>
                        <div className={`mt-1 text-[10px] font-black ${variation.className}`}>{variation.label}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
