import { cn } from "../../lib/utils";

interface AiLoaderProps {
  size?: number;
  className?: string;
  label?: string;
}

export function AiLoader({ size = 24, className, label }: AiLoaderProps) {
  return (
    <svg
      aria-label={label}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0 text-primary", className)}
    >
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" strokeDasharray="18 52" className="origin-center animate-spin" />
      <circle cx="16" cy="5" r="2.5" fill="currentColor" className="animate-pulse" />
      <circle cx="25.5" cy="21.5" r="2" fill="currentColor" className="animate-pulse [animation-delay:180ms]" />
      <circle cx="6.5" cy="21.5" r="2" fill="currentColor" className="animate-pulse [animation-delay:360ms]" />
    </svg>
  );
}
