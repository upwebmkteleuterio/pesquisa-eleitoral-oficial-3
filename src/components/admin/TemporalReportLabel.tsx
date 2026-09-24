import type { LabelListEntry, LabelProps as RechartsLabelProps } from 'recharts';
import type { TemporalDataPoint, TemporalReportFilters } from '../../types';
import { formatTemporalValue } from '../../utils/temporalReportUtils';

type TemporalChartDataPoint = TemporalDataPoint & Record<string, unknown>;
type TemporalReportPayload = LabelListEntry<Record<string, unknown>>['payload'] & { value?: unknown };

interface Props extends Omit<RechartsLabelProps, 'x' | 'y' | 'index' | 'value'> {
  x?: number;
  y?: number;
  index?: number;
  value?: unknown;
  payload?: TemporalReportPayload;
  data?: TemporalChartDataPoint[];
  color: string;
  optionValue: string;
  displayMode: TemporalReportFilters['displayMode'];
  collisionOffsets: Record<string, number>;
}

export function TemporalReportLabel({ x, y, index = 0, value, payload, data, color, optionValue, displayMode, collisionOffsets }: Props) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const offset = collisionOffsets[`${index}:${optionValue}`] ?? -14;
  const dataValue = index >= 0 ? data?.[index]?.[optionValue] : undefined;
  const resolvedValue = value ?? payload?.value ?? dataValue ?? 0;
  const formattedValue = formatTemporalValue(Number(resolvedValue), displayMode);
  return (
    <g>
      <text
        x={x}
        y={y + offset}
        textAnchor="middle"
        fill="white"
        stroke="white"
        strokeWidth={4}
        strokeLinejoin="round"
        fontSize={10}
        fontWeight={800}
      >
        {formattedValue}
      </text>
      <text
        x={x}
        y={y + offset}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontWeight={800}
      >
        {formattedValue}
      </text>
    </g>
  );
}
