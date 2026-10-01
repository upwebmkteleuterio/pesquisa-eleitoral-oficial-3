import * as React from "react";
import { cn } from "../../lib/utils";

interface LoaderProps {
  size?: number;
  text?: string;
  className?: string;
  label?: string;
}

export const Component: React.FC<LoaderProps> = ({ size = 180, text = "Generating", className, label }) => {
  const letters = text.split("");

  return (
    <div
      aria-label={label}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      className={cn("relative flex select-none items-center justify-center font-sans", className)}
      style={{ width: size, height: size }}
    >
      {letters.map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="inline-block text-primary opacity-40 animate-ai-loader-letter"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {letter}
        </span>
      ))}
      <div className="absolute inset-0 rounded-full animate-ai-loader-circle" />
    </div>
  );
};

export function AiLoader({ size = 24, className, label }: Omit<LoaderProps, "text">) {
  return <Component size={size} text="" className={className} label={label} />;
}
