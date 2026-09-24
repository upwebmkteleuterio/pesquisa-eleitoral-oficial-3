import type { SurveyOptionImage, TemporalReportFilters } from '../../types';
import { formatTemporalValue } from '../../utils/temporalReportUtils';
import { ReportOptionImageMarker } from './ReportOptionImageMarker';

interface Props {
  cx?: number;
  cy?: number;
  value?: number;
  index?: number;
  color: string;
  label: string;
  image?: SurveyOptionImage;
  optionValue: string;
  displayMode: TemporalReportFilters['displayMode'];
  collisionOffsets: Record<string, number>;
}

export function TemporalReportPoint({ cx, cy, value, index, color, label, image, optionValue, displayMode, collisionOffsets }: Props) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const offset = collisionOffsets[`${index ?? 0}:${optionValue}`] || 0;
  const shiftedCy = cy + offset;
  const hasImage = Boolean(image && index === 0);
  return (
    <g>
      {offset !== 0 && <line x1={cx} y1={cy} x2={cx} y2={shiftedCy} stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />}
      {hasImage ? (
        <>
          <circle cx={cx} cy={shiftedCy} r={16} fill="white" stroke={color} strokeWidth={2} />
          <ReportOptionImageMarker image={image} alt={`Imagem de ${label}`} centerX={cx} top={shiftedCy - 14} size={28} />
        </>
      ) : <circle cx={cx} cy={shiftedCy} r={5} fill="white" stroke={color} strokeWidth={2} />}
      <text x={cx} y={shiftedCy - (hasImage ? 21 : 11)} textAnchor="middle" fill="#0f172a" fontSize={10} fontWeight={800}>
        {formatTemporalValue(Number(value || 0), displayMode)}
      </text>
    </g>
  );
}
