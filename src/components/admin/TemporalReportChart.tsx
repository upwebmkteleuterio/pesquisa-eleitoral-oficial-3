import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TemporalAnswerOption, TemporalDataPoint, TemporalReportFilters } from '../../types';
import { formatTemporalValue } from '../../utils/temporalReportUtils';

interface Props {
  points: TemporalDataPoint[];
  answerOptions: TemporalAnswerOption[];
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

export function TemporalReportChart({ points, answerOptions, displayMode, chartType }: Props) {
  const data = points.map(point => ({ ...point, ...Object.fromEntries(answerOptions.map(option => [option.value, displayMode === 'percentage' ? point.percentages[option.value] : point.values[option.value]])) }));
  const Chart = chartType === 'bar' ? BarChart : LineChart;
  return (
    <div className="h-[24rem] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} minTickGap={24} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={value => displayMode === 'percentage' ? `${value}%` : value.toLocaleString('pt-BR')} />
          <Tooltip content={<TemporalTooltip displayMode={displayMode} />} />
          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 800 }} />
          {answerOptions.map(option => chartType === 'bar'
            ? <Bar key={option.value} dataKey={option.value} name={option.label} fill={option.color} radius={[6, 6, 0, 0]} />
            : <Line key={option.value} type="monotone" dataKey={option.value} name={option.label} stroke={option.color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
