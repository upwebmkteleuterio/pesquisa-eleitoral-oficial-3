import type { TemporalDataPoint, TemporalReportFilters } from '../../types';
import { formatTemporalValue } from '../../utils/temporalReportUtils';

interface TooltipPayloadItem {
  dataKey?: string;
  name?: string;
  value?: number;
  color?: string;
  payload?: TemporalDataPoint;
}

interface Props {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  displayMode: TemporalReportFilters['displayMode'];
}

export function TemporalReportTooltip({ active, payload, label, displayMode }: Props) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-outline bg-white p-3 text-xs shadow-xl dark:bg-slate-900">
      <p className="font-black text-on-surface">{label}</p>
      <p className="mt-1 font-bold text-primary">Total do período: {point?.total.toLocaleString('pt-BR')}</p>
      {payload.filter(item => item.dataKey !== 'total').map(item => {
        const seriesTotal = item.dataKey ? point?.seriesTotals?.[item.dataKey] : undefined;
        return <p key={item.dataKey} className="font-bold text-on-surface-variant" style={{ color: item.color }}>
          {item.name || item.dataKey}: {formatTemporalValue(Number(item.value || 0), displayMode)}{seriesTotal === undefined ? '' : ` · n=${seriesTotal.toLocaleString('pt-BR')}`}
        </p>;
      })}
    </div>
  );
}
