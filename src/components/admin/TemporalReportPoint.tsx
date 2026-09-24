import type { SurveyOptionImage } from '../../types';
import { ReportOptionImageMarker } from './ReportOptionImageMarker';

interface Props {
  cx?: number;
  cy?: number;
  index?: number;
  color: string;
  label: string;
  image?: SurveyOptionImage;
}

export function TemporalReportPoint({ cx, cy, index, color, label, image }: Props) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const hasImage = Boolean(image && index === 0);
  return (
    <g>
      {hasImage ? (
        <>
          <circle cx={cx} cy={cy} r={16} fill="white" stroke={color} strokeWidth={2} />
          <ReportOptionImageMarker image={image} alt={`Imagem de ${label}`} centerX={cx} top={cy - 14} size={28} />
        </>
      ) : <circle cx={cx} cy={cy} r={5} fill="white" stroke={color} strokeWidth={2} />}
    </g>
  );
}
