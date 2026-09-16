import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Check, GitMerge, X } from "lucide-react";

export interface ResponseMergeOption {
  value: string;
  count: number;
}

interface ResponseMergeModalProps {
  isOpen: boolean;
  questionLabel: string;
  options: ResponseMergeOption[];
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (newResponse: string, oldValues: string[]) => void;
}

export function ResponseMergeModal({
  isOpen,
  questionLabel,
  options,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ResponseMergeModalProps) {
  const [newResponse, setNewResponse] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNewResponse("");
      setSelectedValues([]);
    }
  }, [isOpen, questionLabel]);

  const toggleValue = (value: string) => {
    setSelectedValues((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const selectedResponseCount = options
    .filter((option) => selectedValues.includes(option.value))
    .reduce((total, option) => total + option.count, 0);
  const canConfirm = newResponse.trim().length > 0 && selectedValues.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canConfirm || isSubmitting) return;
    onConfirm(newResponse.trim(), selectedValues);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-outline bg-white shadow-2xl dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="response-merge-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GitMerge size={22} />
            </div>
            <div>
              <h2 id="response-merge-title" className="text-xl font-black text-on-surface">Padronizar respostas</h2>
              <p className="mt-1 text-xs font-bold text-on-surface-variant">{questionLabel}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Nova resposta</span>
            <input
              value={newResponse}
              onChange={(event) => setNewResponse(event.target.value)}
              placeholder="Digite o texto que substituirá as respostas"
              disabled={isSubmitting}
              className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 font-bold text-on-surface outline-none transition focus:border-primary dark:bg-slate-800"
              autoFocus
            />
          </label>

          <fieldset className="space-y-3">
            <legend className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Respostas existentes</legend>
            {options.length > 0 ? (
              <div className="space-y-2">
                {options.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-outline p-4 transition hover:border-primary/50">
                    <span className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(option.value)}
                        onChange={() => toggleValue(option.value)}
                        disabled={isSubmitting}
                        className="h-5 w-5 accent-primary"
                      />
                      <span className="truncate font-bold text-on-surface" title={option.value}>{option.value.trim()}</span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-on-surface-variant dark:bg-slate-800">
                      {option.count}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">Nenhuma resposta textual existente.</p>
            )}
          </fieldset>

          {selectedValues.length > 0 && newResponse.trim().length > 0 && (
            <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100" role="status">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <p>Todas as <strong>{selectedResponseCount} respostas selecionadas</strong> serão alteradas para <strong>“{newResponse}”</strong>.</p>
            </div>
          )}

          {error && <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-outline p-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-2xl border border-outline px-5 py-3 font-black text-on-surface-variant transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={!canConfirm || isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            <Check size={18} />
            {isSubmitting ? "Mesclando..." : "Confirmar mesclagem"}
          </button>
        </div>
      </form>
    </div>
  );
}
