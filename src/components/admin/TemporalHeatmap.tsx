import type { CSSProperties } from 'react';
import type { TemporalAnswerOption, TemporalDataPoint, TemporalReportFilters } from '../../types';
import { formatTemporalValue } from '../../utils/temporalReportUtils';

interface Props {
  points: TemporalDataPoint[];
  answerOptions: TemporalAnswerOption[];
  displayMode: TemporalReportFilters['displayMode'];
}

const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16)) as [number, number, number];
};

const cellColor = (option: TemporalAnswerOption, value: number, maximum: number) => {
  const [red, green, blue] = hexToRgb(option.color);
  const intensity = maximum ? value / maximum : 0;
  const mix = 0.08 + intensity * 0.92;
  const color = [red, green, blue].map(channel => Math.round(255 + (channel - 255) * mix));
  const brightness = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
  return { backgroundColor: `rgb(${color.join(', ')})`, color: brightness < 155 ? '#ffffff' : '#0f172a' };
};

export function TemporalHeatmap({ points, answerOptions, displayMode }: Props) {
  const maximum = Math.max(1, ...points.flatMap(point => answerOptions.map(option => (
    displayMode === 'percentage' ? point.percentages[option.value] : point.values[option.value]
  ))));
  const minWidth = Math.max(760, 210 + points.length * 112);
  const gridColumns = `minmax(12rem,1.3fr) repeat(${points.length}, minmax(6rem,1fr))`;

  return (
    <section className="space-y-3" aria-labelledby="temporal-heatmap-title">
      <div>
        <h3 id="temporal-heatmap-title" className="text-lg font-black text-on-surface">Mapa de intensidade por período</h3>
        <p className="text-xs font-bold text-on-surface-variant">Células mais intensas representam valores maiores em {displayMode === 'percentage' ? 'percentual' : 'quantidade'}.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-outline p-2">
        <div style={{ minWidth }} className="grid gap-px overflow-hidden rounded-xl bg-outline" role="table" aria-label="Mapa de calor da evolução temporal">
          <div className="gap-px" style={{ display: 'grid', gridTemplateColumns: gridColumns } as CSSProperties} role="row">
            <div className="bg-slate-100 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-on-surface-variant dark:bg-slate-800" role="columnheader">Resultado</div>
            {points.map(point => <div key={point.period} className="bg-slate-100 px-2 py-3 text-center text-[11px] font-black text-on-surface-variant dark:bg-slate-800" role="columnheader">{point.label}</div>)}
          </div>
          {answerOptions.map(option => (
            <div key={option.value} className="gap-px" style={{ display: 'grid', gridTemplateColumns: gridColumns } as CSSProperties} role="row">
              <div className="flex items-center gap-2 bg-white px-3 py-3 text-xs font-black text-on-surface dark:bg-slate-900" role="rowheader">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: option.color }} aria-hidden="true" />
                <span className="truncate">{option.label}</span>
              </div>
              {points.map(point => {
                const value = displayMode === 'percentage' ? point.percentages[option.value] : point.values[option.value];
                return <div key={`${option.value}-${point.period}`} className="flex min-h-14 items-center justify-center px-2 py-2 text-center text-xs font-black" style={cellColor(option, value || 0, maximum)} role="cell" aria-label={`${option.label}, ${point.label}: ${formatTemporalValue(value || 0, displayMode)}`}>{formatTemporalValue(value || 0, displayMode)}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
