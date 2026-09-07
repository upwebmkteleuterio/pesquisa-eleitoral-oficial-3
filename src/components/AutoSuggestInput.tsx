"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface AutoSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function AutoSuggestInput({ value, onChange, suggestions, placeholder, className }: AutoSuggestInputProps) {
  const [filtered, setFiltered] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 2) {
      const normalizedValue = value.toLowerCase().trim();
      const matches = suggestions.filter(s => 
        s.toLowerCase().includes(normalizedValue) && 
        s.toLowerCase() !== normalizedValue
      ).slice(0, 5); // Limitar a 5 sugestões para UX móvel
      
      setFiltered(matches);
      setIsOpen(matches.length > 0);
    } else {
      setIsOpen(false);
    }
  }, [value, suggestions]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input 
        type="text"
        className={cn(
          "w-full h-14 px-6 rounded-2xl border border-outline bg-surface text-on-surface font-bold focus:ring-2 focus:ring-primary outline-none shadow-sm transition-all placeholder:text-on-surface-variant/30",
          className
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.length >= 2 && filtered.length > 0 && setIsOpen(true)}
      />
      
      {isOpen && (
        <div className="absolute z-[70] left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-outline rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-outline bg-slate-50 dark:bg-slate-900/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <Search size={12} className="text-primary" />
              Sugestões encontradas
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onChange(suggestion);
                  setIsOpen(false);
                }}
                className="w-full px-5 py-4 text-left text-sm font-bold text-on-surface hover:bg-primary/5 active:bg-primary/10 flex items-center justify-between border-b border-outline/50 last:border-0"
              >
                {suggestion}
                <ChevronRight size={16} className="text-primary opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}