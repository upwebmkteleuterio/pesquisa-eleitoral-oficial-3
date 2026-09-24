import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TemporalAnswerOption, TemporalDataPoint, TemporalReportFilters } from '../../types';
import { formatTemporalValue, getTemporalBarOptions } from '../../utils/temporalReportUtils';
import { TemporalReportLegend } from './TemporalReportLegend';
import { TemporalReportTooltip } from './TemporalReportTooltip';

interface Props {
  points: TemporalDataPoint[];
  answerOptions: TemporalAnswerOption[];
  displayMode: TemporalReportFilters['displayMode'];
}

interface BarLabelProps {
  x?: number;
  y?: number;
  value?: number | string;
  color: string;
  displayMode: TemporalReportFilters['displayMode'];
}

function TemporalBarValueLabel({ x, y, value, color, displayMode }: BarLabelProps) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return (
    <text x={x} y={(y || 0) - 7} textAnchor="middle" fill={color} fontSize={9} fontWeight={800} stroke="white" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke">
      {formatTemporalValue(Number(value || 0), displayMode)}
    </text>
  );
}

export function TemporalGroupedBarChart({ points, answerOptions, displayMode }: Props) {
  const data = points.map(point => ({
    ...point,
    ...Object.fromEntries(answerOptions.map(option => [
      option.value,
      displayMode === 'percentage' ? point.percentages[option.value] : point.values[option.value],
    ])),
  }));
  const chartWidth = Math.max(760, points.length * 150);
  const chartOptions = [...getTemporalBarOptions(answerOptions)].reverse();

  return (
    <section className="space-y-3" aria-labelledby="temporal-grouped-bars-title">
      <div>
        <h3 id="temporal-grouped-bars-title" className="text-lg font-black text-on-surface">Comparação por período</h3>
        <p className="text-xs font-bold text-on-surface-variant">Uma barra por alternativa em cada período, usando {displayMode === 'percentage' ? 'percentual' : 'quantidade'}.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-outline bg-slate-50/50 p-2 dark:bg-slate-800/30">
        <div className="h-[30rem]" style={{ minWidth: chartWidth }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 48, right: 18, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} interval={0} />
              <YAxis width={62} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={value => formatTemporalValue(Number(value), displayMode)} />
              <Tooltip content={<TemporalReportTooltip displayMode={displayMode} />} />
              <Legend content={<TemporalReportLegend answerOptions={answerOptions} optionImages={[]} />} />
              {chartOptions.map(option => (
                <Bar key={option.value} dataKey={option.value} name={option.label} fill={option.color} radius={[5, 5, 0, 0]}>
                  <LabelList content={<TemporalBarValueLabel color={option.aggregated ? '#64748b' : option.color} displayMode={displayMode} />} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
