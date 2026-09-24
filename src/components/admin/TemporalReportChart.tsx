import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SurveyOptionImage, TemporalAnswerOption, TemporalDataPoint, TemporalReportFilters } from '../../types';
import { findSurveyOptionImage } from '../../utils/surveyOptionImageUtils';
import { getTemporalPointOffsets } from '../../utils/temporalReportUtils';
import { ReportBarShape } from './ReportBarShape';
import { TemporalReportLegend } from './TemporalReportLegend';
import { TemporalReportPoint } from './TemporalReportPoint';
import { TemporalReportTooltip } from './TemporalReportTooltip';

interface Props {
  points: TemporalDataPoint[];
  answerOptions: TemporalAnswerOption[];
  optionImages: SurveyOptionImage[];
  questionId?: string;
  displayMode: TemporalReportFilters['displayMode'];
  chartType: TemporalReportFilters['chartType'];
}

export function TemporalReportChart({ points, answerOptions, optionImages, questionId, displayMode, chartType }: Props) {
  const data = points.map(point => ({
    ...point,
    ...Object.fromEntries(answerOptions.map(option => [
      option.value,
      displayMode === 'percentage' ? point.percentages[option.value] : point.values[option.value],
    ])),
  }));
  const collisionOffsets = getTemporalPointOffsets(points, answerOptions, displayMode);
  const Chart = chartType === 'bar' ? BarChart : LineChart;

  return (
    <div className={`${chartType === 'line' ? 'h-[36rem]' : 'h-[28rem]'} w-full min-w-0`}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: chartType === 'bar' ? 56 : 48, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" padding={chartType === 'line' ? { left: 40, right: 40 } : undefined} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} minTickGap={24} />
          <YAxis width={60} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={value => displayMode === 'percentage' ? `${value}%` : value.toLocaleString('pt-BR')} />
          <Tooltip content={<TemporalReportTooltip displayMode={displayMode} />} />
          <Legend content={<TemporalReportLegend answerOptions={answerOptions} optionImages={optionImages} questionId={questionId} />} />
          {answerOptions.map(option => {
            const image = option.aggregated ? undefined : findSurveyOptionImage(optionImages, questionId, [option.value, option.label]);
            return chartType === 'bar'
              ? <Bar key={option.value} dataKey={option.value} name={option.label} fill={option.color} radius={[6, 6, 0, 0]} shape={<ReportBarShape radius={6} image={image} alt={`Imagem de ${option.label}`} />} />
              : <Line key={option.value} type="monotone" dataKey={option.value} name={option.label} stroke={option.color} strokeDasharray={option.aggregated ? '6 5' : undefined} strokeWidth={3} dot={<TemporalReportPoint optionValue={option.value} label={option.label} color={option.color} image={image} displayMode={displayMode} collisionOffsets={collisionOffsets} />} activeDot={{ r: 5 }} />;
          })}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
