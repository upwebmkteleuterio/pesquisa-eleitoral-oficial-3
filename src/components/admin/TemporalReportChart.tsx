import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SurveyOptionImage, TemporalAnswerOption, TemporalDataPoint, TemporalReportFilters } from '../../types';
import { findSurveyOptionImage } from '../../utils/surveyOptionImageUtils';
import { formatTemporalValue } from '../../utils/temporalReportUtils';
import { ReportBarShape } from './ReportBarShape';
import { ReportOptionImageMarker } from './ReportOptionImageMarker';
import { SurveyOptionImage as SurveyOptionImageView } from '../SurveyOptionImage';

interface Props {
  points: TemporalDataPoint[];
  answerOptions: TemporalAnswerOption[];
  optionImages: SurveyOptionImage[];
  questionId?: string;
  displayMode: TemporalReportFilters['displayMode'];
  chartType: TemporalReportFilters['chartType'];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value?: number; color?: string; payload?: TemporalDataPoint }>;
  label?: string;
  displayMode: TemporalReportFilters['displayMode'];
}

function TemporalTooltip({ active, payload, label, displayMode }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as TemporalDataPoint | undefined;
  return (
    <div className="rounded-xl border border-outline bg-white p-3 text-xs shadow-xl dark:bg-slate-900">
      <p className="font-black text-on-surface">{label}</p>
      <p className="mt-1 font-bold text-primary">Total do período: {point?.total.toLocaleString('pt-BR')}</p>
      {payload.filter(item => item.dataKey !== 'total').map(item => <p key={item.dataKey} className="font-bold text-on-surface-variant" style={{ color: item.color }}>{item.name || item.dataKey}: {formatTemporalValue(Number(item.value || 0), displayMode)}</p>)}
    </div>
  );
}

interface LegendProps {
  answerOptions: TemporalAnswerOption[];
  optionImages: SurveyOptionImage[];
  questionId?: string;
}

function TemporalLegend({ answerOptions, optionImages, questionId }: LegendProps) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 pt-2 text-[11px] font-extrabold text-on-surface-variant" aria-label="Alternativas do gráfico">
      {answerOptions.map(option => {
        const image = findSurveyOptionImage(optionImages, questionId, [option.value, option.label]);
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

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  color: string;
  image?: SurveyOptionImage;
  label: string;
}

function TemporalImageDot({ cx, cy, index, color, image, label }: DotProps) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  if (!image || index !== 0) return <circle cx={cx} cy={cy} r={3} fill={color} />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={16} fill="white" stroke={color} strokeWidth={2} />
      <ReportOptionImageMarker image={image} alt={`Imagem de ${label}`} centerX={cx} top={cy - 14} size={28} />
    </g>
  );
}

export function TemporalReportChart({ points, answerOptions, optionImages, questionId, displayMode, chartType }: Props) {
  const data = points.map(point => ({ ...point, ...Object.fromEntries(answerOptions.map(option => [option.value, displayMode === 'percentage' ? point.percentages[option.value] : point.values[option.value]])) }));
  const Chart = chartType === 'bar' ? BarChart : LineChart;
  return (
    <div className="h-[24rem] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: chartType === 'bar' ? 56 : 20, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} minTickGap={24} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={value => displayMode === 'percentage' ? `${value}%` : value.toLocaleString('pt-BR')} />
          <Tooltip content={<TemporalTooltip displayMode={displayMode} />} />
          <Legend content={<TemporalLegend answerOptions={answerOptions} optionImages={optionImages} questionId={questionId} />} />
          {answerOptions.map(option => {
            const image = findSurveyOptionImage(optionImages, questionId, [option.value, option.label]);
            return chartType === 'bar'
              ? <Bar key={option.value} dataKey={option.value} name={option.label} fill={option.color} radius={[6, 6, 0, 0]} shape={<ReportBarShape radius={6} image={image} alt={`Imagem de ${option.label}`} />} />
              : <Line key={option.value} type="monotone" dataKey={option.value} name={option.label} stroke={option.color} strokeWidth={3} dot={<TemporalImageDot color={option.color} image={image} label={option.label} />} activeDot={{ r: 5 }} />;
          })}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
