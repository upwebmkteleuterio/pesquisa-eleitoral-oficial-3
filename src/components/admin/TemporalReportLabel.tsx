import type { TemporalReportFilters } from '../../types';
import { formatTemporalValue } from '../../utils/temporalReportUtils';

interface Props {
  x?: number;
  y?: number;
  index?: number;
  value?: unknown;
  color: string;
  optionValue: string;
  displayMode: TemporalReportFilters['displayMode'];
  collisionOffsets: Record<string, number>;
}

export function TemporalReportLabel({ x, y, index = 0, value, color, optionValue, displayMode, collisionOffsets }: Props) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const offset = collisionOffsets[`${index}:${optionValue}`] ?? -14;
  const formattedValue = formatTemporalValue(Number(value ?? 0), displayMode);
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
