import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

interface ResearcherAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  textClassName?: string;
  alt?: string;
}

export function ResearcherAvatar({ name, src, className, textClassName, alt }: ResearcherAvatarProps) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => setHasError(false), [src]);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const showImage = Boolean(src) && !hasError;

  if (showImage) {
    return <img src={src || undefined} alt={alt || name} onError={() => setHasError(true)} className={cn("object-cover", className)} />;
  }

  return <div aria-label={alt || name} className={cn("flex items-center justify-center bg-primary/10 font-black uppercase text-primary", className, textClassName)}>{initial}</div>;
}
