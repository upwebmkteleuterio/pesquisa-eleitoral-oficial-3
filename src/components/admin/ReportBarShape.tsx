import type { SurveyOptionImage as SurveyOptionImageMetadata } from '../../types';
import { ReportOptionImageMarker } from './ReportOptionImageMarker';

interface Props {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  radius?: number;
  image?: SurveyOptionImageMetadata;
  alt?: string;
  payload?: { name?: string; image?: SurveyOptionImageMetadata };
}

export function ReportBarShape({ x = 0, y = 0, width = 0, height = 0, fill, radius = 10, image, alt, payload }: Props) {
  const markerImage = image || payload?.image;
  const markerSize = Math.min(42, width * 0.8);
  const corner = Math.min(radius, width / 2, height);
  const path = `M ${x} ${y + corner} Q ${x} ${y} ${x + corner} ${y} H ${x + width - corner} Q ${x + width} ${y} ${x + width} ${y + corner} V ${y + height} H ${x} Z`;
  return (
    <g>
      <path d={path} fill={fill} />
      {markerImage && (
        <ReportOptionImageMarker
          image={markerImage}
          alt={alt || `Imagem de ${payload?.name || 'alternativa'}`}
          centerX={x + width / 2}
          top={y - markerSize - 8}
          availableWidth={width}
          size={markerSize}
        />
      )}
    </g>
  );
}
