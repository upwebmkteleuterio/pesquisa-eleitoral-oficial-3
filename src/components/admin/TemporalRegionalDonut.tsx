import type { RefObject } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TemporalAnswerOption, TemporalRegionalSlice } from '../../types';

interface Props {
  answerOptions: TemporalAnswerOption[];
  regionalBreakdowns: Record<string, TemporalRegionalSlice[]>;
}

const COLORS = ['#0f766e', '#2563eb', '#db2777', '#d97706', '#7c3aed', '#0891b2', '#65a30d', '#475569'];

const formatPercentage = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function TemporalRegionalDonut({ answerOptions, regionalBreakdowns }: Props) {
  const surveyIds = Array.from(new Set(Object.values(regionalBreakdowns).flat().map(slice => slice.surveyId)));
  const colorBySurveyId = new Map(surveyIds.map((surveyId, index) => [surveyId, COLORS[index % COLORS.length]]));

  return <section className="space-y-5 rounded-[2rem] border border-outline bg-white p-6 shadow-sm dark:bg-slate-900" aria-label="Distribuição por pesquisa e região">
    <div><h2 className="text-xl font-black text-on-surface">Por pesquisa / região</h2><p className="text-sm font-bold text-on-surface-variant">Percentual de cada pesquisa no período filtrado</p></div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {answerOptions.slice(0, 4).map(option => {
        const data = (regionalBreakdowns[option.value] || []).map(slice => ({
          ...slice,
          name: slice.regionLabel ? `${slice.surveyName} · ${slice.regionLabel}` : slice.surveyName,
          color: colorBySurveyId.get(slice.surveyId) || COLORS[0],
        }));
        return <div key={option.value} className="min-w-0 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <h3 className="truncate px-2 text-center text-sm font-black text-on-surface" title={option.label}>{option.label}</h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 280, height: 208 }}>
              <PieChart>
                <Pie data={data} dataKey="percentage" nameKey="name" innerRadius="48%" outerRadius="72%" paddingAngle={2} strokeWidth={1} stroke="#fff" label={false}>
                  {data.map(item => <Cell key={item.surveyId} fill={item.color} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="rounded-xl border border-outline bg-white p-3 text-xs shadow-xl dark:bg-slate-900"><p className="break-words font-black text-on-surface">{payload[0].payload.name}</p><p className="font-bold text-on-surface-variant">{payload[0].payload.count.toLocaleString('pt-BR')} · {formatPercentage(payload[0].payload.percentage)}</p></div> : null} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2" aria-label={`Legenda de ${option.label}`}>
            {data.map(item => <li key={item.surveyId} className="flex min-w-0 items-start gap-2 text-[10px] font-bold text-on-surface-variant">
              <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 break-words">{item.name}</span>
              <span className="shrink-0 whitespace-nowrap text-right text-on-surface">{item.count.toLocaleString('pt-BR')} · {formatPercentage(item.percentage)}</span>
            </li>)}
          </ul>
        </div>;
      })}
    </div>
  </section>;
}

interface ExportProps extends Props {
  exportRef: RefObject<HTMLDivElement | null>;
}

export function TemporalRegionalDonutExport({ answerOptions, regionalBreakdowns, exportRef }: ExportProps) {
  const options = answerOptions.slice(0, 4);
  const surveyIds = Array.from(new Set(Object.values(regionalBreakdowns).flat().map(slice => slice.surveyId)));
  const colorBySurveyId = new Map(surveyIds.map((surveyId, index) => [surveyId, COLORS[index % COLORS.length]]));
  const entriesByOption = options.map(option => (regionalBreakdowns[option.value] || []).map(slice => ({
    ...slice,
    name: slice.regionLabel ? `${slice.surveyName} · ${slice.regionLabel}` : slice.surveyName,
    color: colorBySurveyId.get(slice.surveyId) || COLORS[0],
  })));
  const titleHeight = Math.max(36, ...options.map(option => Math.max(1, Math.ceil(option.label.length / 40)) * 18));
  const legendHeight = Math.max(24, ...entriesByOption.map(entries => entries.reduce((height, item, index) => height + Math.max(1, Math.ceil(item.name.length / 42)) * 22 + (index ? 4 : 0), 0)));
  const cardHeight = 24 + titleHeight + 232 + 12 + legendHeight + 20;
  const rowCount = Math.max(1, Math.ceil(options.length / 2));
  const exportHeight = 28 + 52 + 20 + rowCount * cardHeight + (rowCount - 1) * 20 + 28;

  return <div ref={exportRef} data-temporal-regional-pdf-export="true" aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 w-[1400px] overflow-hidden bg-white p-7 text-slate-900" style={{ height: `${exportHeight}px` }}>
    <div><h2 className="text-2xl font-black">Por pesquisa / região</h2><p className="text-sm font-bold text-slate-600">Distribuição dos resultados no período filtrado</p></div>
    <div className="mt-5 grid grid-cols-[660px_660px] gap-5">
      {options.map((option, optionIndex) => {
        const data = entriesByOption[optionIndex];
        return <div key={option.value} className="w-[660px] rounded-2xl bg-slate-50 p-3" style={{ height: `${cardHeight}px` }}>
          <h3 className="break-words px-2 text-center text-base font-black leading-[18px]" style={{ minHeight: `${titleHeight}px`, overflowWrap: 'anywhere' }}>{option.label}</h3>
          <div className="h-[232px] w-[630px]">
            <PieChart width={630} height={232}>
              <Pie data={data} dataKey="percentage" nameKey="name" innerRadius="48%" outerRadius="72%" paddingAngle={2} strokeWidth={1} stroke="#fff" label={false} isAnimationActive={false}>
                {data.map(item => <Cell key={item.surveyId} fill={item.color} />)}
              </Pie>
            </PieChart>
          </div>
          <ul className="mt-3 space-y-1" aria-label={`Legenda de ${option.label}`}>
            {data.map(item => <li key={item.surveyId} className="flex min-w-0 items-start gap-2 text-[11px] font-bold leading-[22px] text-slate-600">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 break-words" style={{ overflowWrap: 'anywhere' }}>{item.name}</span>
              <span className="shrink-0 whitespace-nowrap text-right text-slate-900">{item.count.toLocaleString('pt-BR')} · {formatPercentage(item.percentage)}</span>
            </li>)}
          </ul>
        </div>;
      })}
    </div>
  </div>;
}
