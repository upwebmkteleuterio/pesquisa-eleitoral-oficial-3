import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TemporalAnswerOption, TemporalRegionalSlice } from '../../types';

interface Props {
  answerOptions: TemporalAnswerOption[];
  regionalBreakdowns: Record<string, TemporalRegionalSlice[]>;
}

const COLORS = ['#0f766e', '#2563eb', '#db2777', '#d97706', '#7c3aed', '#0891b2', '#65a30d', '#475569'];

export function TemporalRegionalDonut({ answerOptions, regionalBreakdowns }: Props) {
  return <section className="space-y-5 rounded-[2rem] border border-outline bg-white p-6 shadow-sm dark:bg-slate-900" aria-label="Distribuição por pesquisa e região">
    <div><h2 className="text-xl font-black text-on-surface">Por pesquisa / região</h2><p className="text-sm font-bold text-on-surface-variant">Percentual de cada pesquisa no período filtrado</p></div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {answerOptions.slice(0, 4).map(option => {
        const data = (regionalBreakdowns[option.value] || []).map((slice, index) => ({ ...slice, name: slice.regionLabel ? `${slice.surveyName} · ${slice.regionLabel}` : slice.surveyName, color: COLORS[index % COLORS.length] }));
        return <div key={option.value} className="min-w-0 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50"><h3 className="truncate px-2 text-center text-sm font-black text-on-surface" title={option.label}>{option.label}</h3><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 280, height: 256 }}><PieChart><Pie data={data} dataKey="count" nameKey="name" innerRadius="48%" outerRadius="72%" paddingAngle={2} strokeWidth={1} stroke="#fff" label={false}>{data.map(item => <Cell key={item.surveyId} fill={item.color} />)}</Pie><Tooltip content={({ active, payload }) => active && payload?.length ? <div className="rounded-xl border border-outline bg-white p-3 text-xs shadow-xl dark:bg-slate-900"><p className="font-black text-on-surface">{payload[0].payload.name}</p><p className="font-bold text-on-surface-variant">{payload[0].payload.count.toLocaleString('pt-BR')} ({payload[0].payload.percentage.toFixed(1)}%)</p></div> : null} /><Legend verticalAlign="bottom" height={42} iconType="circle" iconSize={8} formatter={value => <span className="text-[10px] font-bold text-on-surface-variant">{value}</span>} /></PieChart></ResponsiveContainer></div></div>;
      })}
    </div>
  </section>;
}
