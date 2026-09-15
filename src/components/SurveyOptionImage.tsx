import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { surveyOptionImageService } from "../services/surveyOptionImageService";
import type { SurveyOptionImage as SurveyOptionImageMetadata } from "../types";

interface SurveyOptionImageProps {
  image?: SurveyOptionImageMetadata;
  alt: string;
  className?: string;
}

export function SurveyOptionImage({ image, alt, className = "" }: SurveyOptionImageProps) {
  const [source, setSource] = useState<string | null>(null);
  const { data: blob } = useQuery({
    queryKey: ["survey-option-image-bytes", image?.storage_path],
    queryFn: () => surveyOptionImageService.getImageBlob(image!),
    enabled: !!image,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!blob) {
      setSource(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setSource(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!source) return null;
  return <img src={source} alt={alt} className={className} />;
}
