import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Check, SlidersHorizontal, X } from "lucide-react";
import type { VirtualReportAnswerOption, VirtualReportOptionGroup, VirtualReportOptionRef } from "../../types";

interface Props {
  isOpen: boolean;
  card: { id: string } | null;
  options: VirtualReportAnswerOption[];
  onClose: () => void;
  onConfirm: (group: VirtualReportOptionGroup) => void;
}

export function VirtualReportNormalizeModal({ isOpen, card, options, onClose, onConfirm }: Props) {
  const [label, setLabel] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  useEffect(() => {
    if (isOpen) {
      setLabel("");
      setSelectedKeys([]);
    }
  }, [isOpen, card?.id]);

  if (!isOpen || !card) return null;
  const selectedOptions = options.filter(option => selectedKeys.includes(option.key));
  const selectedResponseCount = selectedOptions.reduce((total, option) => total + option.count, 0);
  const canConfirm = label.trim().length > 0 && selectedKeys.length > 0;
  const toggleOption = (key: string) => setSelectedKeys(current => current.includes(key)
    ? current.filter(item => item !== key)
    : [...current, key]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canConfirm) return;
    const optionRefs: VirtualReportOptionRef[] = selectedOptions.map(option => option.ref);
    onConfirm({ id: `group:${card.id}:${Date.now()}`, label: label.trim(), options: optionRefs });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" aria-label="Fechar modal" />
      <form onSubmit={submit} className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-outline bg-white shadow-2xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="virtual-normalize-title">
        <div className="flex items-start justify-between border-b border-outline p-6">
          <div className="flex items-center gap-3"><SlidersHorizontal className="text-primary" size={24} /><div><h2 id="virtual-normalize-title" className="text-xl font-black text-on-surface">Padronizar respostas</h2><p className="text-xs font-bold text-on-surface-variant">Agrupe alternativas somente neste card virtual.</p></div></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100" aria-label="Cancelar"><X size={20} /></button>
        </div>
        <div className="space-y-6 overflow-y-auto p-6">
          <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Nova resposta/categoria final</span><input value={label} onChange={event => setLabel(event.target.value)} placeholder="Digite o nome da categoria agrupada" className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800" autoFocus /></label>
          <fieldset className="space-y-3"><legend className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Opções disponíveis</legend>{options.length ? <div className="space-y-2">{options.map(option => <label key={option.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-outline p-4 transition hover:border-primary/50"><span className="flex min-w-0 items-center gap-3"><input type="checkbox" checked={selectedKeys.includes(option.key)} onChange={() => toggleOption(option.key)} className="h-5 w-5 accent-primary" /><span className="min-w-0"><span className="block truncate font-bold text-on-surface" title={option.value}>{option.value}</span><span className="block truncate text-xs font-bold text-on-surface-variant" title={`${option.sourceLabel} · ${option.questionLabel}`}>{option.sourceLabel} · {option.questionLabel}</span></span></span><span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-on-surface-variant dark:bg-slate-800">{option.count}</span></label>)}</div> : <p className="rounded-2xl border border-dashed border-outline p-4 text-sm font-bold text-on-surface-variant">Nenhuma resposta válida para agrupar.</p>}</fieldset>
          {selectedKeys.length > 0 && label.trim() && <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100" role="status"><AlertTriangle size={20} className="mt-0.5 shrink-0" /><p>As <strong>{selectedResponseCount} respostas selecionadas</strong> serão exibidas como <strong>“{label}”</strong>.</p></div>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-outline p-6 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-2xl border border-outline px-5 py-3 font-black text-on-surface-variant">Cancelar</button><button type="submit" disabled={!canConfirm} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Check size={18} />Confirmar agrupamento</button></div>
      </form>
    </div>
  );
}
