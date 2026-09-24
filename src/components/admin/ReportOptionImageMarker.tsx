import type { SurveyOptionImage as SurveyOptionImageMetadata } from '../../types';
import { SurveyOptionImage } from '../SurveyOptionImage';

interface Props {
  image?: SurveyOptionImageMetadata;
  alt: string;
  centerX: number;
  top: number;
  availableWidth?: number;
  size?: number;
}

export function ReportOptionImageMarker({ image, alt, centerX, top, availableWidth = 36, size }: Props) {
  if (!image || !Number.isFinite(centerX) || !Number.isFinite(top)) return null;
  const markerSize = size ?? Math.min(42, Math.max(22, availableWidth * 0.8));
  return (
    <foreignObject
      x={centerX - markerSize / 2}
      y={top}
      width={markerSize}
      height={markerSize}
      pointerEvents="none"
      role="img"
      aria-label={alt}
    >
      <div className="h-full w-full overflow-hidden rounded-full border-2 border-white bg-white shadow-md dark:border-slate-700 dark:bg-slate-800">
        <SurveyOptionImage image={image} alt={alt} className="h-full w-full object-cover" />
      </div>
    </foreignObject>
  );
}
