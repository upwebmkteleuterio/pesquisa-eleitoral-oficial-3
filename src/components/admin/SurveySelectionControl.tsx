import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import type { Survey } from "../../types";

interface Props {
  surveys: Survey[];
  selectedSurveyIds: string[];
  pendingSurveyIds: string[];
  isOpen: boolean;
  onOpen: () => void;
  onToggle: (surveyId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  label?: string;
  emptySelectionLabel?: string;
  className?: string;
}

export function SurveySelectionControl({
  surveys,
  selectedSurveyIds,
  pendingSurveyIds,
  isOpen,
  onOpen,
  onToggle,
  onCancel,
  onConfirm,
  label = "Pesquisas do resultado",
  emptySelectionLabel = "Nenhuma selecionada",
  className = "",
}: Props) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const [position, setPosition] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const selectionLabel = selectedSurveyIds.length
    ? `${selectedSurveyIds.length} selecionada${selectedSurveyIds.length === 1 ? "" : "s"}`
    : emptySelectionLabel;

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const width = Math.min(352, window.innerWidth - 32);
      const desiredHeight = 112 + Math.min(surveys.length, 5) * 48;
      const below = window.innerHeight - bounds.bottom - 8;
      const above = bounds.top - 8;
      const placeBelow = below >= desiredHeight || below >= above;
      const available = Math.max(120, placeBelow ? below : above);
      const height = Math.min(desiredHeight, available);
      setPosition({
        left: Math.max(16, Math.min(bounds.left, window.innerWidth - width - 16)),
        top: placeBelow ? bounds.bottom + 8 : bounds.top - height - 8,
        width,
        height,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target) && !menuRef.current?.contains(target)) onCancelRef.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancelRef.current();
      triggerRef.current?.focus();
    };

    updatePosition();
    const focusFrame = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("input, button")?.focus());
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, surveys.length]);

  const closeAndFocusTrigger = (close: () => void) => {
    close();
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={id}
        className={`inline-flex min-h-12 items-center gap-3 rounded-2xl border border-outline bg-white px-4 py-3 text-left text-sm font-black text-on-surface shadow-sm transition hover:border-primary dark:bg-slate-900 ${className ? "w-full max-w-full" : ""}`}
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-widest text-primary">{label}</span>
          <span className="mt-1 block truncate text-xs text-on-surface-variant">{selectionLabel}</span>
        </span>
        <ChevronDown size={18} className={isOpen ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden="true" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          id={id}
          role="dialog"
          aria-label="Selecionar pesquisas"
          className="fixed z-[100] flex flex-col rounded-2xl border border-outline bg-white p-3 shadow-2xl dark:bg-slate-900"
          style={position}
        >
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3 px-1">
            <p className="text-xs font-black text-on-surface">{label}</p>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{pendingSurveyIds.length} selecionadas</span>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto" role="group" aria-label="Pesquisas disponíveis">
            {surveys.map(survey => {
              const selected = pendingSurveyIds.includes(survey.id);
              return (
                <label key={survey.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-3 text-sm font-bold text-on-surface transition hover:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(survey.id)}
                    className="sr-only"
                  />
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? "border-primary bg-primary text-white" : "border-outline text-transparent"}`} aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="min-w-0 truncate" title={survey.nome}>{survey.nome}</span>
                </label>
              );
            })}
            {!surveys.length && <p className="px-2 py-3 text-xs font-bold text-on-surface-variant">Nenhuma pesquisa disponível.</p>}
          </div>
          <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-outline pt-3">
            <button type="button" onClick={() => closeAndFocusTrigger(onCancel)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={16} />Cancelar
            </button>
            <button type="button" onClick={() => closeAndFocusTrigger(onConfirm)} className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-white shadow-sm hover:opacity-90">Confirmar</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
